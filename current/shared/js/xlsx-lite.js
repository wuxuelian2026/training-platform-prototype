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

export default readXlsxSheetRows;
