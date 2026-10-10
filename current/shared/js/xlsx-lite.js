// CR009-QA-01：教师批量导入需要“校验结果随文件内容变化”的能力，原型层用最小实现读取
// .xlsx（ZIP 容器）中数据区的单元格文本，仅用于行级计数与必填/字典/重复校验。
// 边界：只读第一张工作表（或 xl/worksheets/sheet1.xml）的单元格文本，不解析样式、公式、
// 图表与合并区域，也不做真实业务落库。

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const EOCD_SCAN_LIMIT = 66000;

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function columnIndex(letters) {
  return [...String(letters || '')].reduce((total, char) => total * 26 + (char.charCodeAt(0) - 64), 0) - 1;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  const floor = Math.max(0, bytes.length - EOCD_SCAN_LIMIT);
  for (let index = bytes.length - EOCD_MIN_SIZE; index >= floor; index -= 1) {
    if (view.getUint32(index, true) === EOCD_SIGNATURE) { eocd = index; break; }
  }
  if (eocd < 0) return null;
  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map();
  for (let index = 0; index < total; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    entries.set(name, { method, compressedSize, dataStart: localOffset + 30 + localNameLength + localExtraLength });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { bytes, entries };
}

async function readZipText(zip, name) {
  const entry = zip?.entries?.get(name);
  if (!entry) return null;
  const raw = zip.bytes.subarray(entry.dataStart, entry.dataStart + entry.compressedSize);
  const data = entry.method === 8 ? await inflateRaw(raw) : raw;
  if (!data) return null;
  return new TextDecoder().decode(data);
}

function parseSheetRows(sheetXml, sharedStrings) {
  const rows = [];
  for (const rowMatch of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number((/r="(\d+)"/.exec(rowMatch[1]) || [])[1] || rows.length + 1);
    const cells = [];
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1] || '';
      const body = cellMatch[2] || '';
      const reference = (/r="([A-Z]+)\d+"/.exec(attrs) || [])[1] || '';
      const type = (/t="([^"]+)"/.exec(attrs) || [])[1] || '';
      let value = '';
      if (type === 'inlineStr') {
        value = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => decodeXmlEntities(item[1])).join('');
      } else {
        const raw = (/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1];
        if (raw !== undefined) value = type === 's' ? (sharedStrings[Number(raw)] || '') : decodeXmlEntities(raw);
      }
      const index = columnIndex(reference);
      if (index >= 0) cells[index] = value;
    }
    rows.push({ rowNumber, cells });
  }
  return rows;
}

/**
 * 读取 .xlsx 第一张工作表的数据行。
 * @param {ArrayBuffer} buffer 上传文件的二进制内容
 * @returns {Promise<{rowNumber:number, cells:string[]}[]|null>} 失败（非 ZIP 或无法解压）返回 null
 */
export async function readXlsxSheetRows(buffer) {
  if (!buffer || !(buffer instanceof ArrayBuffer) || buffer.byteLength < EOCD_MIN_SIZE) return null;
  const zip = readZipEntries(buffer);
  if (!zip || !zip.entries.size) return null;
  const sheetNames = [...zip.entries.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort();
  let sheetXml = await readZipText(zip, 'xl/worksheets/sheet1.xml');
  if (!sheetXml && sheetNames.length) sheetXml = await readZipText(zip, sheetNames[0]);
  if (!sheetXml && sheetNames.length) {
    for (const name of sheetNames) {
      sheetXml = await readZipText(zip, name);
      if (sheetXml) break;
    }
  }
  if (!sheetXml) return null;
  const sharedXml = await readZipText(zip, 'xl/sharedStrings.xml');
  const sharedStrings = sharedXml
    ? [...sharedXml.matchAll(/<si>[\s\S]*?<\/si>/g)].map((match) => [...match[0].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => decodeXmlEntities(item[1])).join(''))
    : [];
  const rows = parseSheetRows(sheetXml, sharedStrings);
  return rows.length ? rows : null;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStored(files) {
  const encoder = new TextEncoder(); const local = []; const central = []; let offset = 0;
  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name); const data = encoder.encode(content); const crc = crc32(data);
    const header = new ArrayBuffer(30 + nameBytes.length); const view = new DataView(header);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0, true); view.setUint16(8, 0, true); view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, nameBytes.length, true); view.setUint16(28, 0, true); new Uint8Array(header, 30).set(nameBytes);
    local.push(new Uint8Array(header), data);
    const entry = new ArrayBuffer(46 + nameBytes.length); const centralView = new DataView(entry);
    centralView.setUint32(0, 0x02014b50, true); centralView.setUint16(4, 20, true); centralView.setUint16(6, 20, true); centralView.setUint16(8, 0, true); centralView.setUint16(10, 0, true); centralView.setUint32(16, crc, true); centralView.setUint32(20, data.length, true); centralView.setUint32(24, data.length, true); centralView.setUint16(28, nameBytes.length, true); centralView.setUint32(42, offset, true); new Uint8Array(entry, 46).set(nameBytes);
    central.push(new Uint8Array(entry)); offset += header.byteLength + data.length;
  });
  const centralSize = central.reduce((sum, item) => sum + item.length, 0); const end = new ArrayBuffer(22); const endView = new DataView(end); endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, files.length, true); endView.setUint16(10, files.length, true); endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
  return new Blob([...local, ...central, new Uint8Array(end)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function writeXlsxSheetRows(rows) {
  const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cells = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`).join('')}</row>`).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cells}</sheetData></worksheet>`;
  return zipStored([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="物资台账" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: sheet }
  ]);
}

export default readXlsxSheetRows;
