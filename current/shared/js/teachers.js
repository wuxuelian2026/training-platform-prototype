import { relativePath } from './paths.js';
import { readAdminSession } from './admin-auth.js';
import { mountRichEditor } from './rich-editor.js';
import { readDemoState, writeDemoState } from './demo-store.js';
import { readXlsxSheetRows } from './xlsx-lite.js';
import { teacherFactsById } from './teacher-facts.js';
import { explainTeacherCapacity, summarizeTeacherCapacity } from './teacher-capacity.js';
import { machinesForPage, stateLabelsOf } from '../../spec/states/index.js';

const teacherRoot = document.querySelector('[data-teacher-page]');
const teacherPage = teacherRoot?.dataset.teacherPage;
let activeTeacherRow = null;
let activeContractRow = null;
let toastTimer;
let importedTeacherCount = 0;
let teacherImportBusy = false;
let teacherImportCommitted = false;
let teacherImportRequest = null;

const text = (id, value) => {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value || '—';
};

const dialog = (id) => document.querySelector(`#${id}`);
const openDialog = (id) => { const element = dialog(id); if (element && !element.open) element.showModal(); };
const closeDialog = (id) => { const element = dialog(id); if (element?.open) element.close(); };

function toast(message, kind = 'success') {
  const element = document.querySelector('[data-teacher-toast]');
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { element.hidden = true; }, 2800);
}

const tagClass = (value) => ({
  待完善: 'gray', 已建档: 'green', 在职: 'green', 离职: 'gray', 可申报: 'brand', 可排课: 'green', 暂停使用: 'gray',
  已签署: 'green', 待签署: 'amber', 待教师签署: 'amber', 待学校签署: 'brand', 签署中: 'brand',
  有效: 'green', 即将到期: 'amber', 已到期: 'red', 已终止: 'gray', 无合同: 'gray',
  未激活: 'gray', 正常: 'green', 冻结: 'gray', 草稿: 'gray'
}[value] || 'gray');

function statusTag(value) { return `<span class="tag ${tagClass(value)}">${value}</span>`; }

function confirmTeacherAction(row, action) {
  activeTeacherRow = row;
  const teacher = row.dataset.teacher;
  const copy = {
    freeze: ['冻结教师账号', '确认冻结该教师账号？仅账号状态变为冻结，资料、人员、证书、合同和历史记录不变。', '确认冻结'],
    unfreeze: ['解冻教师账号', '确认解冻该教师账号？', '确认解冻'],
    resign: ['办理教师离职', '确认将人员状态改为离职？教师将无法登录或新增未来排课，但账号及历史业务状态不被改写。', '确认离职']
  }[action];
  if (!copy) return;
  text('teacher-action-title', copy[0]);
  text('teacher-action-copy', copy[1]);
  text('teacher-action-teacher', `${teacher} · ${row.dataset.employeeNo}`);
  const confirm = document.querySelector('#teacher-action-confirm');
  if (confirm) { confirm.dataset.action = action; confirm.textContent = copy[2]; }
  openDialog('teacher-action-dialog');
}

function updateTeacherRow(row, action) {
  const actionCell = row.querySelector('[data-cell="actions"]');
  if (action === 'freeze') {
    row.dataset.accountStatus = 'frozen';
  }
  if (action === 'unfreeze') {
    row.dataset.accountStatus = 'active';
  }
  if (action === 'resign') {
    row.dataset.personnelStatus = '离职';
    row.dataset.todos = `${row.dataset.todos || ''},人员离职`;
  }
  renderTeacherCapability(row);
  renderTeacherActions(row, actionCell);
}

// 视图层：教师列表只回答「可授课几个专业、哪些专业有有效资质、档案与账号是否异常」，
// 不再输出教师级“可排课”结论——那个结论只在具体（专业 × 课次日期）下成立。
function renderTeacherCapability(row) {
  const cell = row.querySelector('[data-cell="capability"]');
  if (!cell) return;
  const facts = teacherFactsById(row.dataset.teacherId);
  if (!facts) return;
  const summary = summarizeTeacherCapacity(facts);
  const tags = [`<span class="tag brand">可授课 ${summary.majorCount} 个专业</span>`];
  const tone = summary.qualifiedCount === summary.majorCount ? 'green' : summary.qualifiedCount ? 'amber' : 'gray';
  tags.push(`<span class="tag ${tone}">${summary.qualifiedCount}/${summary.majorCount} 有有效资质</span>`);
  summary.issues.forEach((issue) => tags.push(`<span class="tag red">${issue.text}</span>`));
  cell.innerHTML = tags.join('');
  row.dataset.capabilities = summary.blocked ? '暂停使用' : '可授课';
}

function renderTeacherActions(row, cell) {
  if (!cell) return;
  const profile = row.dataset.profileStatus;
  const personnel = row.dataset.personnelStatus;
  const account = row.dataset.accountStatus;
  const id = encodeURIComponent(row.dataset.teacherId);
  const actions = [`<a class="link" href="/admin/pages/teachers/profile.html?teacher_id=${id}">查看</a>`, `<a class="link" href="/admin/pages/teachers/create.html?mode=edit&teacher_id=${id}">编辑</a>`];
  if (profile === '已建档' && account === 'inactive') actions.push('<button type="button" class="text-button" data-action="resend-invite">重新发送邀请</button>');
  if (account === 'frozen') actions.push('<button type="button" class="text-button" data-action="unfreeze">解冻</button>');
  else if (account === 'active' && personnel === '在职') actions.push('<button type="button" class="text-button danger-link" data-action="freeze">冻结</button>');
  if (personnel === '在职') actions.push('<button type="button" class="text-button danger-link" data-action="resign">办理离职</button>');
  actions.push(`<a class="link" href="/admin/pages/academic/timetable.html?view=teacher&teacher_id=${id}">查看课表</a>`);
  cell.innerHTML = actions.join('');
}

function renderFeaturedSwitch(row, canManage) {
  const cell = row.querySelector('[data-cell="featured"]');
  if (!cell) return;
  const checked = (readDemoState().featuredTeacherIds || []).includes(row.dataset.teacherId);
  cell.innerHTML = `<label class="teacher-featured-switch"><input type="checkbox" role="switch" data-action="toggle-featured"${checked ? ' checked' : ''}${canManage ? '' : ' disabled'} aria-label="将${row.dataset.teacher}设为名师推荐"><span class="teacher-featured-track" aria-hidden="true"></span><span data-featured-label>${checked ? '是' : '否'}</span></label>`;
}

function updateFeaturedTeacher(row, checked) {
  writeDemoState(next => {
    const ids = new Set(next.featuredTeacherIds || []);
    if (checked) ids.add(row.dataset.teacherId);
    else ids.delete(row.dataset.teacherId);
    next.featuredTeacherIds = [...ids];
    return next;
  });
  row.querySelector('[data-featured-label]').textContent = checked ? '是' : '否';
  toast(checked ? `${row.dataset.teacher}已加入名师推荐。` : `${row.dataset.teacher}已取消名师推荐。`);
}

function applyTeacherFilters() {
  const form = document.querySelector('#teacher-filter');
  const capability = form?.querySelector('[name="capability"]')?.value || '';
  const todo = form?.querySelector('[name="todo"]')?.value || '';
  const personnel = form?.querySelector('[name="personnel"]')?.value || '';
  const account = form?.querySelector('[name="account"]')?.value || '';
  const category = form?.querySelector('[name="category"]')?.value || '';
  const keyword = (form?.querySelector('[name="keyword"]')?.value || '').trim();
  const rows = [...document.querySelectorAll('tr[data-teacher-id]')];
  let visible = 0;
  rows.forEach((row) => {
    const matches = (!capability || row.dataset.capabilities.split(',').includes(capability))
      && (!todo || row.dataset.todos.includes(todo))
      && (!personnel || row.dataset.personnelStatus === personnel)
      && (!account || row.dataset.accountStatus === account)
      && (!category || row.dataset.category === category)
      && (!keyword || `${row.dataset.teacher}${row.dataset.employeeNo}${row.dataset.phone}`.includes(keyword));
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const empty = document.querySelector('.teacher-empty-row');
  if (empty) empty.hidden = visible !== 0;
  text('teacher-count', `共${28 + importedTeacherCount}名教师 · 当前筛选显示${visible}名 · 待处理事项优先`);
}

function resetTeacherImport() {
  teacherImportBusy = false;
  teacherImportCommitted = false;
  teacherImportValidation = null;
  teacherImportResultText = '';
  teacherImportRequest = {
    validateApi: 'API-TEACHER-17',
    commitApi: 'API-TEACHER-18',
    // CR009-QA-02：幂等键与导入任务绑定（同一 jobId + validationVersion 恒定），重开弹窗先置空，校验后再生成。
    importJobId: null,
    validationVersion: null,
    idempotencyKey: null
  };
  const file = document.querySelector('#teacher-import-file');
  if (file) file.value = '';
  text('teacher-import-file-name', '未选择文件');
  const error = document.querySelector('#teacher-import-error');
  if (error) { error.hidden = true; error.textContent = ''; }
  document.querySelector('[data-import-status]')?.setAttribute('hidden', '');
  document.querySelector('[data-import-upload]')?.removeAttribute('hidden');
  document.querySelector('[data-import-preview]')?.setAttribute('hidden', '');
  document.querySelector('[data-import-result]')?.setAttribute('hidden', '');
  document.querySelector('[data-action="teacher-import-validate"]')?.removeAttribute('hidden');
  document.querySelector('[data-action="teacher-import-commit"]')?.setAttribute('hidden', '');
  document.querySelector('[data-import-cancel]')?.removeAttribute('hidden');
  document.querySelector('[data-import-finish]')?.setAttribute('hidden', '');
  const validateButton = document.querySelector('[data-action="teacher-import-validate"]');
  const commitButton = document.querySelector('[data-action="teacher-import-commit"]');
  if (validateButton) { validateButton.disabled = false; validateButton.textContent = '开始校验'; }
  if (commitButton) { commitButton.disabled = false; commitButton.textContent = '确认导入并发送邀请'; }
}

function showTeacherImportStatus(kind, title, copy) {
  const status = document.querySelector('[data-import-status]');
  if (!status) return;
  status.dataset.kind = kind;
  status.querySelector('[data-import-status-title]').textContent = title;
  status.querySelector('[data-import-status-copy]').textContent = copy;
  status.hidden = false;
}

function setTeacherImportError(message) {
  const error = document.querySelector('#teacher-import-error');
  if (error) { error.textContent = message; error.hidden = false; }
  showTeacherImportStatus('error', '校验失败', message);
}

// CR009-QA-01 / I1-PM-D52：校验结果按「教师导入」表的数据行做最小计数，随文件内容变化。
const TEACHER_IMPORT_PERSONNEL_DICT = ['在编', '签约', '外聘'];
const TEACHER_IMPORT_MAJOR_DICT = ['舞蹈表演', '音乐表演', '声乐演唱', '钢琴', '古筝', '中国舞', '少儿绘画', '中国画', '书法'];
const TEACHER_IMPORT_KEYS = ['姓名', '人员类型', '身份证号', '手机号', '授课专业'];
let teacherImportValidation = null;
let teacherImportResultText = '';

const importEsc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const importMaskPhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? `${digits.slice(0, 3)}****${digits.slice(-4)}` : (digits || '—');
};
const importHeaderLabel = (value) => String(value ?? '').replace(/[（(][^）)]*[）)]/g, '').trim();

// 表头行＝首个含「姓名」的行；数据行＝表头以下、跳过空白行与填写说明行。
function extractTeacherImportSheet(rows) {
  const headerIndex = rows.findIndex((row) => row.cells.some((cell) => importHeaderLabel(cell).startsWith('姓名')));
  if (headerIndex < 0) return null;
  const header = rows[headerIndex].cells.map(importHeaderLabel);
  const columns = {};
  TEACHER_IMPORT_KEYS.forEach((key) => { columns[key] = header.indexOf(key); });
  const dataRows = rows.slice(headerIndex + 1).filter((row) => {
    const filled = row.cells.filter((cell) => String(cell ?? '').trim());
    return filled.length > 0 && !String(filled[0]).startsWith('填写说明');
  });
  return { columns, dataRows };
}

function teacherImportRecord(row, columns, line) {
  const value = (key) => (columns[key] >= 0 ? String(row.cells[columns[key]] ?? '').trim() : '');
  return { line, name: value('姓名'), personnel: value('人员类型'), idCard: value('身份证号'), phone: value('手机号'), major: value('授课专业'), valid: true, reason: '' };
}

// 行级校验分支：必填 → 格式 → 字典 → 文件内重复 → 已有教师重复。
function validateTeacherImportRecords(dataRows, columns) {
  const existingPhones = new Set([...document.querySelectorAll('tr[data-teacher-id][data-phone]')].map((row) => row.dataset.phone));
  const seenIdCards = new Set();
  const seenPhones = new Set();
  return dataRows.map((row) => {
    const record = teacherImportRecord(row, columns, row.rowNumber);
    const fail = (reason) => { record.valid = false; record.reason = record.reason || reason; };
    if (!record.name) fail('姓名不能为空');
    else if (record.name.length > 50) fail('姓名超过50字');
    if (!record.personnel) fail('人员类型不能为空');
    else if (!TEACHER_IMPORT_PERSONNEL_DICT.includes(record.personnel)) fail('人员类型不在字典内');
    if (!record.idCard) fail('身份证号不能为空');
    else if (!/^\d{17}[\dXx]$/.test(record.idCard)) fail('身份证号格式不正确');
    if (!record.phone) fail('手机号不能为空');
    else if (!/^1\d{10}$/.test(record.phone)) fail('手机号格式不正确');
    if (!record.major) fail('授课专业不能为空');
    else if (!TEACHER_IMPORT_MAJOR_DICT.includes(record.major)) fail('授课专业不存在或已停用');
    if (record.idCard && seenIdCards.has(record.idCard)) fail('身份证号在文件内重复');
    if (record.phone && seenPhones.has(record.phone)) fail('手机号在文件内重复');
    if (record.phone && existingPhones.has(record.phone)) fail('手机号已存在');
    if (record.idCard) seenIdCards.add(record.idCard);
    if (record.phone) seenPhones.add(record.phone);
    return record;
  });
}

function renderTeacherImportPreview(result) {
  const summaryCopy = document.querySelector('#teacher-import-summary-copy');
  if (summaryCopy) summaryCopy.textContent = `可导入 ${result.importable} 行，不可导入 ${result.invalid} 行`;
  text('teacher-import-total', String(result.total));
  text('teacher-import-importable', String(result.importable));
  text('teacher-import-invalid', String(result.invalid));
  const body = document.querySelector('#teacher-import-preview-body');
  if (body) {
    const shown = result.records.slice(0, 20);
    body.innerHTML = shown.length
      ? shown.map((record) => `<tr><td>${record.line}</td><td>${importEsc(record.name || '—')}</td><td>${importEsc(record.personnel || '—')}</td><td>${importEsc(record.major || '—')}</td><td>${record.valid ? '<span class="tag green">可导入</span>' : `<span class="tag red">${importEsc(record.reason)}</span>`}</td></tr>`).join('')
      : '<tr><td colspan="5"><div class="empty">文件里没有可导入的数据行，请填写后重新上传。</div></td></tr>';
    if (result.records.length > shown.length) body.insertAdjacentHTML('beforeend', `<tr><td colspan="5"><div class="empty">另有 ${result.records.length - shown.length} 行未在页面展示，可下载失败明细查看。</div></td></tr>`);
  }
  const note = document.querySelector('#teacher-import-parse-note');
  if (note) note.textContent = result.note;
}

function completeTeacherImportValidation(file, rows) {
  teacherImportBusy = false;
  const commitButton = document.querySelector('[data-action="teacher-import-commit"]');
  document.querySelector('[data-import-status]')?.setAttribute('hidden', '');
  document.querySelector('[data-action="teacher-import-validate"]')?.setAttribute('hidden', '');
  const parsed = rows ? extractTeacherImportSheet(rows) : null;
  if (parsed && parsed.dataRows.length > 500) {
    teacherImportValidation = null;
    document.querySelector('[data-import-preview]')?.setAttribute('hidden', '');
    setTeacherImportError('有效数据超过 500 行，请拆分文件后重新上传。');
    return;
  }
  const note = '校验口径：按「教师导入」表表头以下的数据行统计，已跳过空白行与填写说明行；原型只读取单元格文本，不解析样式与公式。';
  if (!parsed) {
    teacherImportValidation = { file: file?.name || '', total: 0, importable: 0, invalid: 0, records: [], note: `未识别到「姓名」表头或文件无法解析，按 0 行处理。${note}` };
  } else {
    const records = validateTeacherImportRecords(parsed.dataRows, parsed.columns);
    teacherImportValidation = { file: file?.name || '', total: records.length, importable: records.filter((record) => record.valid).length, invalid: records.filter((record) => !record.valid).length, records, note };
  }
  // CR009-QA-02：同一导入任务使用同一幂等键；重新校验同一文件沿用任务 ID、版本递增。
  const nextVersion = teacherImportRequest.validationVersion
    ? `v${Number(String(teacherImportRequest.validationVersion).replace('v', '')) + 1}`
    : 'v1';
  teacherImportRequest.importJobId = 'teacher-import-demo-20260915';
  teacherImportRequest.validationVersion = nextVersion;
  teacherImportRequest.idempotencyKey = `teacher-import-${teacherImportRequest.importJobId}-${nextVersion}`;
  teacherImportRequest.validatedRows = teacherImportValidation.records.filter((record) => record.valid).map((record) => ({ name: record.name, personnel: record.personnel, major: record.major, phone: record.phone }));
  document.querySelector('[data-import-preview]')?.removeAttribute('hidden');
  commitButton?.removeAttribute('hidden');
  if (commitButton) commitButton.disabled = teacherImportValidation.importable === 0;
  renderTeacherImportPreview(teacherImportValidation);
  if (teacherImportValidation.importable === 0) {
    toast('文件校验完成：没有可导入的数据行，确认导入已禁用。', 'error');
  } else {
    toast(`文件校验完成：${teacherImportValidation.importable} 行可导入，${teacherImportValidation.invalid} 行需修正。`);
  }
}

async function validateTeacherImport() {
  if (teacherImportBusy) return;
  const file = document.querySelector('#teacher-import-file')?.files?.[0];
  const error = document.querySelector('#teacher-import-error');
  if (!file) {
    setTeacherImportError('请先选择 .xlsx 文件。');
    return;
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    setTeacherImportError('文件格式不正确，请使用教师批量导入模板。');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setTeacherImportError('文件超过 5MB，请删减数据后重新上传。');
    return;
  }
  const demoFailure = [
    ['解析失败', '文件无法解析，请重新下载模板填写后上传。'],
    ['服务异常', '校验服务暂时不可用，请稍后重试。']
  ].find(([keyword]) => file.name.includes(keyword));
  if (demoFailure) { setTeacherImportError(demoFailure[1]); return; }
  if (error) error.hidden = true;
  teacherImportBusy = true;
  const validateButton = document.querySelector('[data-action="teacher-import-validate"]');
  if (validateButton) { validateButton.disabled = true; validateButton.textContent = '校验中'; }
  showTeacherImportStatus('loading', '正在校验文件', '正在读取「教师导入」表的数据行，并检查必填、字典与重复；请勿关闭页面。');
  let sheetRows = null;
  try { sheetRows = await readXlsxSheetRows(await file.arrayBuffer()); } catch { sheetRows = null; }
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  completeTeacherImportValidation(file, sheetRows);
  if (validateButton) { validateButton.disabled = false; validateButton.textContent = '重新校验'; }
  // 校验结果由 completeTeacherImportValidation() 按文件数据行产出（见 CR009-QA-01 / I1-PM-D52）。
}

function importCategory(major) {
  if (major.includes('舞蹈') || major.includes('中国舞')) return '舞蹈类';
  if (major.includes('声乐') || major.includes('音乐') || major.includes('钢琴') || major.includes('古筝')) return '音乐类';
  return '美术类';
}

// CR009-QA-01：建档行取本次校验通过的数据行，不再是固定样例。
function appendImportedTeachers(rows, results) {
  if (document.querySelector('[data-import-batch="CR-2026-009-demo"]')) return;
  const empty = document.querySelector('.teacher-empty-row');
  rows.forEach((item, index) => {
    const inviteFailed = Boolean(results?.[index]?.inviteFailed);
    const no = `JS2026${String(915 + index).padStart(4, '0')}`;
    const phone = importMaskPhone(item.phone);
    const todos = inviteFailed ? '账号未激活,邀请发送失败' : '账号未激活';
    const row = document.createElement('tr');
    row.dataset.importBatch = 'CR-2026-009-demo';
    row.dataset.teacherId = `teacher-import-${index + 1}`;
    row.dataset.teacher = item.name;
    row.dataset.employeeNo = no;
    row.dataset.phone = String(item.phone).replace(/\D/g, '');
    row.dataset.category = importCategory(item.major);
    row.dataset.profileStatus = '已建档';
    row.dataset.personnelStatus = '在职';
    row.dataset.accountStatus = 'inactive';
    row.dataset.capabilities = '暂停使用';
    row.dataset.todos = todos;
    row.innerHTML = `<td><a class="link teacher-name" href="profile.html?teacher_id=${encodeURIComponent(row.dataset.teacherId)}">${importEsc(item.name)}</a><span class="teacher-cell-sub">${no} · ${phone}</span></td><td>${importEsc(item.major)}<br /><span class="teacher-cell-sub">${importEsc(item.personnel)}</span></td><td data-cell="capability"><span class="tag gray">暂停使用</span></td><td><div class="teacher-todo-list"><span class="tag amber">账号未激活</span>${inviteFailed ? '<span class="tag red">邀请发送失败</span>' : ''}</div></td><td data-cell="featured"></td><td>暂无授课</td><td class="action-cell" data-cell="actions"></td>`;
    renderTeacherActions(row, row.querySelector('[data-cell="actions"]'));
    renderFeaturedSwitch(row, true);
    empty?.before(row);
  });
  importedTeacherCount += rows.length;
}

async function commitTeacherImport() {
  // CR009-QA-02：处理中重复确认给出反馈（不静默返回），已完成重复确认回显首次结果。
  if (teacherImportBusy) { toast('本次导入正在处理，请勿重复提交。'); return; }
  if (!teacherImportRequest?.importJobId || !teacherImportRequest?.validationVersion) return;
  // CR009-QA-02：重复确认返回首次结果，不重复建档、不重复发送邀请。
  if (teacherImportCommitted) {
    document.querySelector('[data-import-status]')?.setAttribute('hidden', '');
    document.querySelector('[data-import-result]')?.removeAttribute('hidden');
    toast(`本次导入已提交：${teacherImportResultText}`);
    return;
  }
  const importable = teacherImportRequest.validatedRows || [];
  if (!importable.length) { toast('没有可导入的数据行，请先校验文件并修正失败行。', 'error'); return; }
  teacherImportBusy = true;
  const commitButton = document.querySelector('[data-action="teacher-import-commit"]');
  if (commitButton) { commitButton.disabled = true; commitButton.textContent = '导入中'; }
  showTeacherImportStatus('loading', '正在导入并发送邀请', '请勿重复提交，系统正在处理本次导入。');
  await new Promise((resolve) => window.setTimeout(resolve, 750));
  // 原型演示口径：最后一个可导入行模拟邀请发送失败，其余邀请成功；失败不回滚已建档数据。
  const results = importable.map((item, index) => ({ ...item, inviteFailed: importable.length > 1 && index === importable.length - 1 }));
  teacherImportCommitted = true;
  teacherImportBusy = false;
  appendImportedTeachers(importable, results);
  document.querySelector('[data-import-status]')?.setAttribute('hidden', '');
  document.querySelector('[data-import-upload]')?.setAttribute('hidden', '');
  document.querySelector('[data-import-preview]')?.setAttribute('hidden', '');
  document.querySelector('[data-import-result]')?.removeAttribute('hidden');
  commitButton?.setAttribute('hidden', '');
  document.querySelector('[data-import-cancel]')?.setAttribute('hidden', '');
  document.querySelector('[data-import-finish]')?.removeAttribute('hidden');
  const created = importable.length;
  const inviteFailed = results.filter((item) => item.inviteFailed).length;
  const inviteOk = created - inviteFailed;
  const skipped = teacherImportValidation?.invalid || 0;
  text('teacher-import-result-total', String(teacherImportValidation?.total ?? created));
  text('teacher-import-result-created', String(created));
  text('teacher-import-result-invite-ok', String(inviteOk));
  text('teacher-import-result-invite-fail', String(inviteFailed));
  text('teacher-import-result-skipped', String(skipped));
  const resultCopy = document.querySelector('#teacher-import-result-copy');
  if (resultCopy) resultCopy.textContent = `已建档 ${created} 人，其中 ${inviteFailed} 人邀请发送失败`;
  const resultNote = document.querySelector('#teacher-import-result-note');
  if (resultNote) {
    const failedName = results.find((item) => item.inviteFailed)?.name;
    resultNote.textContent = `失败行未导入；邀请失败不回滚已建档数据。${failedName ? `请在教师列表对${failedName}执行“重新发送邀请”。` : ''}`;
  }
  teacherImportResultText = `已建档 ${created} 人；${inviteOk} 人邀请成功${inviteFailed ? `，${inviteFailed} 人请在列表中重新发送邀请` : ''}。`;
  applyTeacherFilters();
  toast(`导入完成：${teacherImportResultText}`);
}

function downloadTeacherImportErrors() {
  // CR009-QA-01：失败明细来自本次文件校验结果，而不是固定样例。
  const failed = (teacherImportValidation?.records || []).filter((record) => !record.valid);
  if (!failed.length) { toast('本次导入没有失败明细。'); return; }
  const csv = ['\uFEFF行号,姓名,脱敏手机号,失败原因', ...failed.map((record) => `${record.line},${record.name || '—'},${importMaskPhone(record.phone)},${record.reason}`)].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '教师导入失败明细.csv';
  anchor.click();
  URL.revokeObjectURL(url);
  toast('已下载本次导入失败明细。');
}

function initTeacherList() {
  const form = document.querySelector('#teacher-filter');
  const applyHashFilters = () => {
    const hashFilter = new URLSearchParams(location.hash.slice(1));
    ['capability', 'todo'].forEach((name) => {
      const control = form?.querySelector(`[name="${name}"]`);
      if (control) control.value = hashFilter.get(name) || '';
    });
  };
  form?.addEventListener('submit', (event) => { event.preventDefault(); applyTeacherFilters(); });
  form?.addEventListener('reset', () => window.setTimeout(applyTeacherFilters));
  document.querySelector('[data-action="teacher-import-open"]')?.addEventListener('click', () => { resetTeacherImport(); openDialog('teacher-import-dialog'); });
  document.querySelector('#teacher-import-file')?.addEventListener('change', (event) => {
    const file = event.currentTarget.files?.[0];
    text('teacher-import-file-name', file ? file.name : '未选择文件');
    const error = document.querySelector('#teacher-import-error');
    if (error) error.hidden = true;
    document.querySelector('[data-import-status]')?.setAttribute('hidden', '');
    document.querySelector('[data-import-preview]')?.setAttribute('hidden', '');
    document.querySelector('[data-action="teacher-import-validate"]')?.removeAttribute('hidden');
    document.querySelector('[data-action="teacher-import-commit"]')?.setAttribute('hidden', '');
  });
  document.querySelector('[data-action="teacher-import-validate"]')?.addEventListener('click', validateTeacherImport);
  document.querySelector('[data-action="teacher-import-commit"]')?.addEventListener('click', commitTeacherImport);
  document.querySelectorAll('[data-action="teacher-import-errors"]').forEach((button) => button.addEventListener('click', downloadTeacherImportErrors));
  const importOpen = document.querySelector('[data-action="teacher-import-open"]');
  // CR009-QA-04：角色与 admin-shell 同口径——URL 参数 > 登录会话 > 默认，权限不再只认 URL 参数。
  const currentRole = new URLSearchParams(location.search).get('role') || readAdminSession()?.role || 'academic_lead';
  const canManageFeatured = ['super_admin', 'academic_lead'].includes(currentRole);
  if (importOpen && !['super_admin', 'academic_lead'].includes(currentRole)) importOpen.remove();
  applyHashFilters();
  window.addEventListener('hashchange', () => { applyHashFilters(); applyTeacherFilters(); });
  document.querySelectorAll('tr[data-teacher-id]').forEach((row) => {
    renderTeacherActions(row, row.querySelector('[data-cell="actions"]'));
    renderFeaturedSwitch(row, canManageFeatured);
    renderTeacherCapability(row);
  });
  document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-action="toggle-featured"]') || !canManageFeatured) return;
    const row = event.target.closest('tr[data-teacher-id]');
    if (row) updateFeaturedTeacher(row, event.target.checked);
  });
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const row = event.target.closest('tr[data-teacher-id]');
    if (!action || !row) return;
    if (['freeze', 'unfreeze', 'resign'].includes(action)) confirmTeacherAction(row, action);
    if (action === 'resend-invite') toast(`已向${row.dataset.teacher}的建档手机号重新发送激活邀请。`);
  });
  document.querySelector('#teacher-action-confirm')?.addEventListener('click', (event) => {
    if (!activeTeacherRow) return;
    updateTeacherRow(activeTeacherRow, event.currentTarget.dataset.action);
    closeDialog('teacher-action-dialog');
    toast(event.currentTarget.dataset.action === 'resign' ? '人员状态已更新为离职；其他业务状态及历史记录保持不变。' : '教师账号状态已更新，其他业务状态保持不变。');
    applyTeacherFilters();
    activeTeacherRow = null;
  });
  applyTeacherFilters();
}

function initTeacherCreate() {
  const form = document.querySelector('#teacher-form');
  mountRichEditor(form?.querySelector('[data-rich-editor]'));
  form?.addEventListener('rich-editor:message', (event) => toast(event.detail.message, event.detail.kind));
  const professionalData = {
    音乐类: { 声乐: ['声乐演唱', '声乐基础'], 器乐: ['钢琴演奏', '器乐基础'] },
    舞蹈类: { 舞蹈表演: ['中国舞', '民族民间舞'], 舞蹈编导: ['舞蹈编导', '舞蹈创编'] },
    美术类: { 绘画: ['美术教育', '中国画基础', '油画基础'], 设计: ['视觉传达设计', '舞台美术设计'] },
    戏剧类: { 表演: ['戏剧表演', '影视表演'], 戏剧教育: ['戏剧教育', '台词训练'] }
  };
  const professionalPicker = form?.querySelector('[data-professional-picker]');
  const categorySelect = professionalPicker?.querySelector('[name="professional-category"]');
  const groupSelect = professionalPicker?.querySelector('[name="professional-group"]');
  const professionalSelect = professionalPicker?.querySelector('[name="professional"]');
  const selectedProfessionals = form?.querySelector('[data-selected-professionals]');
  const selected = [];
  const optionMarkup = (placeholder, values) => `<option value="">${placeholder}</option>${values.map((value) => `<option value="${value}">${value}</option>`).join('')}`;
  const renderProfessionalSelection = () => {
    if (!selectedProfessionals) return;
    selectedProfessionals.hidden = selected.length === 0;
    selectedProfessionals.innerHTML = selected.map((value) => `<span class="selected-professional"><span>${value}</span><button type="button" class="selected-professional-remove" data-remove-professional="${value}" aria-label="移除${value}">×</button><input type="hidden" name="professionals[]" value="${value}"></span>`).join('');
  };
  const refreshGroups = () => {
    const groups = Object.keys(professionalData[categorySelect?.value] || {});
    if (groupSelect) { groupSelect.disabled = groups.length === 0; groupSelect.innerHTML = optionMarkup(groups.length ? '选择分类' : '请先选择门类', groups); }
    if (professionalSelect) { professionalSelect.disabled = true; professionalSelect.innerHTML = optionMarkup('请先选择分类', []); }
  };
  const refreshProfessionals = () => {
    const professionals = professionalData[categorySelect?.value]?.[groupSelect?.value] || [];
    if (professionalSelect) { professionalSelect.disabled = professionals.length === 0; professionalSelect.innerHTML = optionMarkup(professionals.length ? '选择专业' : '请先选择分类', professionals); }
  };
  categorySelect?.addEventListener('change', refreshGroups);
  groupSelect?.addEventListener('change', refreshProfessionals);
  professionalPicker?.querySelector('[data-action="add-professional"]')?.addEventListener('click', () => {
    const value = professionalSelect?.value;
    if (!value) { toast('请依次选择门类、分类和专业。', 'error'); return; }
    if (selected.includes(value)) { toast('该专业已添加，请勿重复选择。', 'error'); return; }
    selected.push(value);
    renderProfessionalSelection();
    if (professionalSelect) professionalSelect.value = '';
    toast(`已添加授课专业：${value}`);
  });
  selectedProfessionals?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-professional]');
    if (!removeButton) return;
    const index = selected.indexOf(removeButton.dataset.removeProfessional);
    if (index >= 0) selected.splice(index, 1);
    renderProfessionalSelection();
  });
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (selected.length === 0) { toast('请至少添加一个授课专业。', 'error'); return; }
    const phone = form.querySelector('[name="phone"]')?.value || '';
    const idCard = form.querySelector('[name="idCard"]')?.value || '';
    if (!/^\d{11}$/.test(phone)) { toast('手机号必须为11位数字。', 'error'); return; }
    if (!/^\d{17}[\dXx]$/.test(idCard)) { toast('身份证号必须为18位有效格式。', 'error'); return; }
    const result = form.querySelector('[data-build-result]');
    if (result) result.hidden = false;
    toast('教师已建档；账号邀请发送失败，可重新发送。', 'error');
  });
  form?.querySelector('[data-action="save-draft"]')?.addEventListener('click', () => toast('教师档案草稿已保存。'));
  form?.querySelector('[data-action="retry-invite"]')?.addEventListener('click', (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = '邀请已发送';
    const result = form.querySelector('[data-build-result]');
    const title = result?.querySelector('strong');
    const copy = result?.querySelector('p');
    if (title) title.textContent = '已建档，邀请发送成功';
    if (copy) copy.textContent = '教师账号保持“未激活”，待教师验证建档手机号、设置本人密码并同意协议后变为“正常”。';
    result?.classList.add('success');
    toast('激活邀请已重新发送。');
  });
  form?.querySelector('[data-action="add-certificate"]')?.addEventListener('click', () => {
    const body = form.querySelector('[data-certificate-list]');
    if (!body) return;
    const row = body.querySelector('tr')?.cloneNode(true);
    if (!row) return;
    row.querySelectorAll('input, select').forEach((control) => { control.value = ''; if (control.type === 'checkbox') control.checked = false; });
    row.querySelector('[data-action="remove-certificate"]')?.removeAttribute('disabled');
    body.append(row);
    toast('已新增证书信息行。');
  });
  form?.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remove-certificate"]')) {
      const rows = form.querySelectorAll('[data-certificate-list] tr');
      if (rows.length > 1) event.target.closest('tr')?.remove();
      else toast('至少保留一行证书信息。', 'error');
    }
  });
}

let renewSourceRow = null;
// 9.2 可自动化复现：合同确认走标准 dialog，#contract-action-confirm 带 data-confirm-action；
// 已签署合同终止的二次确认用同一步骤计数，不再使用 window.confirm。
let terminateConfirmStep = 0;

function contractActionFieldsVisible(visible) {
  ['#contract-action-note', '#contract-action-date'].forEach((selector) => {
    const label = document.querySelector(selector)?.closest('label');
    if (label) label.hidden = !visible;
  });
}

function prepareContractAction(action, config) {
  openDialog('contract-action-dialog');
  text('contract-action-title', config.title);
  text('contract-action-copy', config.copy);
  contractActionConfirm().dataset.action = action;
  contractActionFieldsVisible(action === 'terminate');
  return contractActionConfirm();
}

function contractActionConfirm() {
  return document.querySelector('#contract-action-confirm');
}
function initContracts() {
  const form = document.querySelector('#contract-filter');
  const rows = [...document.querySelectorAll('tr[data-contract-id]')];
  // 签署状态页签：取值只读 spec/states 的 SM-TEACHER-CONTRACT，「全部」是不加状态过滤的默认项。
  const contractStateMachine = machinesForPage('teachers/contracts').find((machine) => machine.id === 'SM-TEACHER-CONTRACT');
  const contractTabs = [
    { value: '', label: '全部' },
    ...(contractStateMachine ? stateLabelsOf(contractStateMachine).map((label) => ({ value: label, label })) : [])
  ];
  const tabHost = document.querySelector('#contract-status-tabs');
  if (tabHost) {
    tabHost.innerHTML = contractTabs
      .map(({ value, label }) => `<button type="button" role="tab" class="status-tab" data-contract-status="${value}" aria-selected="false">${label}<span>0</span></button>`)
      .join('');
  }
  const statusTabs = [...document.querySelectorAll('[data-contract-status]')];
  let activeContractStatus = new URLSearchParams(location.search).get('status') || '';
  if (!contractTabs.some((tab) => tab.value === activeContractStatus)) activeContractStatus = '';

  // 合同期限状态是派生值：由合同起止日期按当天计算，不写入签署状态字段（05-状态字典 §4.2）。
  const today = new Date().toISOString().slice(0, 10);
  const termStatusOf = (row) => {
    const [startAt, endAt] = String(row.dataset.term || '').split('至').map((value) => value.trim());
    if (!endAt) return '有效';
    if (endAt < today) return '已到期';
    if (startAt && startAt > today) return '有效';
    return Math.round((new Date(`${endAt}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000) <= 30 ? '即将到期' : '有效';
  };
  rows.forEach((row) => {
    const cell = row.querySelector('[data-cell="term"]');
    if (!cell) return;
    const value = termStatusOf(row);
    cell.innerHTML = `<span class="tag ${tagClass(value)} contract-term-status">${value}</span>`;
  });
  const apply = () => {
    const status = activeContractStatus;
    const termStatus = form?.querySelector('[name="termStatus"]')?.value || '';
    const type = form?.querySelector('[name="type"]')?.value || '';
    const teacher = (form?.querySelector('[name="teacher"]')?.value || '').trim();
    let visible = 0;
    rows.forEach((row) => {
      const matches = (!status || row.dataset.status === status)
        && (!termStatus || termStatusOf(row) === termStatus)
        && (!type || row.dataset.type === type)
        && (!teacher || row.dataset.teacher.includes(teacher));
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    const empty = document.querySelector('.contract-empty-row');
    if (empty) empty.hidden = visible !== 0;
    text('contract-count', `共${rows.length}份合同 · 当前筛选显示${visible}份`);
    // 页签计数按全部存活行重算，不受其他筛选条件影响。
    const allCount = (predicate) => rows.filter((row) => row.isConnected && predicate(row)).length;
    statusTabs.forEach((tab) => {
      const value = tab.dataset.contractStatus || '';
      const selected = value === activeContractStatus;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      const badge = tab.querySelector('span');
      if (badge) badge.textContent = String(allCount((row) => !value || row.dataset.status === value));
    });
  };
  statusTabs.forEach((tab) => tab.addEventListener('click', () => {
    activeContractStatus = tab.dataset.contractStatus || '';
    apply();
  }));
  form?.addEventListener('submit', (event) => { event.preventDefault(); apply(); });
  form?.addEventListener('reset', () => window.setTimeout(apply));
  document.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-contract-action]');
    const row = event.target.closest('tr[data-contract-id]');
    if (!actionElement) return;
    const action = actionElement.dataset.contractAction;
    if (action === 'start') { activeContractRow = null; openDialog('contract-form-dialog'); return; }
    if (!row) return;
    activeContractRow = row;
    if (action === 'view') {
      const data = row.dataset;
      text('contract-detail-teacher', data.teacher); text('contract-detail-number', data.number); text('contract-detail-status', data.status); text('contract-detail-term', `${data.term}（${termStatusOf(row)}）`); text('contract-detail-rate', `¥${data.rate}  / 每次课（含税）`); text('contract-detail-note', data.note || '暂无备注。');
      const status = document.querySelector('#contract-detail-status'); if (status) status.className = `tag ${tagClass(data.status)}`;
      openDialog('contract-detail-dialog');
    }
    if (action === 'download') toast(`已准备下载合同：${row.dataset.number}`);
    if (action === 'remind') {
      const confirm = prepareContractAction('remind', { title: '发送催签提醒', copy: `确认向${row.dataset.teacher}发送合同催签提醒？` });
      if (confirm) { confirm.dataset.confirmAction = 'contract-remind'; confirm.textContent = '确认发送'; }
    }
    // 9.2：学校签署使用标准 dialog（data-confirm-action="contract-school-sign"），不再用 window.confirm。
    if (action === 'school-sign') {
      terminateConfirmStep = 0;
      const confirm = prepareContractAction('school-sign', { title: '学校签署确认', copy: '确认学校签署完成？签署证据齐全后合同转为已签署。' });
      if (confirm) { confirm.dataset.confirmAction = 'contract-school-sign'; confirm.textContent = '确认学校签署完成'; }
    }
    if (action === 'terminate') {
      terminateConfirmStep = 0;
      const confirm = prepareContractAction('terminate', { title: '终止合同', copy: '确认终止该合同？终止前必须填写原因与终止生效日期。' });
      if (confirm) { confirm.dataset.confirmAction = 'contract-terminate'; confirm.textContent = '确认终止'; }
    }
    if (action === 'renew') { renewSourceRow = row; openDialog('contract-form-dialog'); text('contract-form-title', '续签合同'); const teacher = document.querySelector('#contract-teacher'); if (teacher) teacher.value = row.dataset.teacher; }
    if (action === 'start') openDialog('contract-form-dialog');
  });
  document.querySelector('#contract-action-confirm')?.addEventListener('click', (event) => {
    if (!activeContractRow) return;
    // 9.2：学校签署提交效果可由测试直接命中（data-confirm-action="contract-school-sign"）。
    if (event.currentTarget.dataset.action === 'school-sign') {
      activeContractRow.dataset.status = '已签署';
      activeContractRow.dataset.schoolSignedAt = '2026-09-16';
      const signedCell = activeContractRow.querySelector('[data-cell="status"]');
      if (signedCell) signedCell.innerHTML = statusTag('已签署');
      closeDialog('contract-action-dialog');
      apply();
      toast('学校签署完成，合同已签署。');
      return;
    }
    if (event.currentTarget.dataset.action === 'terminate' && !document.querySelector('#contract-action-note')?.value.trim()) {
      toast('终止合同必须填写原因。', 'error');
      return;
    }
    if (event.currentTarget.dataset.action === 'terminate' && !document.querySelector('#contract-action-date')?.value) {
      toast('终止合同必须填写生效日期。', 'error');
      return;
    }
    // 9.2：已签署合同终止的二次确认改为同一步骤内再次点击确认（data-confirm-action="contract-terminate-confirmed"）。
    if (event.currentTarget.dataset.action === 'terminate' && activeContractRow.dataset.status === '已签署' && terminateConfirmStep === 0) {
      terminateConfirmStep = 1;
      text('contract-action-title', '终止已签署合同（二次确认）');
      text('contract-action-copy', `该合同已签署，确认终止？终止生效日期 ${document.querySelector('#contract-action-date')?.value || '—'}，终止后双端同步并保留历史计薪记录。`);
      event.currentTarget.dataset.confirmAction = 'contract-terminate-confirmed';
      event.currentTarget.textContent = '再次确认终止';
      return;
    }
    if (event.currentTarget.dataset.action === 'terminate') {
      activeContractRow.dataset.status = '已终止';
      const statusCell = activeContractRow.querySelector('[data-cell="status"]'); if (statusCell) statusCell.innerHTML = statusTag('已终止');
      activeContractRow.querySelector('[data-contract-action="terminate"]')?.remove();
      terminateConfirmStep = 0;
      closeDialog('contract-action-dialog'); apply(); toast('合同已终止，终止原因与生效日期已记录。');
    } else {
      closeDialog('contract-action-dialog'); toast('已发送催签提醒。');
    }
  });
  document.querySelector('#contract-form')?.addEventListener('submit', (event) => { event.preventDefault(); closeDialog('contract-form-dialog'); if (renewSourceRow) { const source = renewSourceRow; const nextNo = String(source.dataset.number || 'CT0000000000').replace(/^CT(\d{4})/, (m, y) => `CT${Number(y) + 1}`); const clone = source.cloneNode(true); clone.dataset.contractId = `${source.dataset.contractId}-renew`; clone.dataset.number = nextNo; clone.dataset.status = '待教师签署'; clone.dataset.version = 'v2'; source.dataset.version = source.dataset.version || 'v1'; const cell = clone.querySelector('[data-contract-cell="number"]'); if (cell) cell.textContent = nextNo; const statusCell = clone.lastElementChild; if (statusCell) statusCell.innerHTML = statusTag('待教师签署'); source.parentElement.insertBefore(clone, source); renewSourceRow = null; apply(); toast(`续签合同已生成（新编号 ${nextNo} · 版本 v2），原合同保留。`); return; } toast('合同已推送给教师签署。'); });
  apply();
}

function initSchedule() {
  const form = document.querySelector('#schedule-filter');
  const rows = [...document.querySelectorAll('tr[data-schedule-id]')];
  const apply = () => {
    const teacher = form?.querySelector('[name="teacher"]')?.value || '';
    const campus = form?.querySelector('[name="campus"]')?.value || '';
    const status = form?.querySelector('[name="status"]')?.value || '';
    let visible = 0;
    rows.forEach((row) => {
      const matches = (!teacher || row.dataset.teacher === teacher) && (!campus || row.dataset.campus === campus) && (!status || row.dataset.status === status);
      row.hidden = !matches; if (matches) visible += 1;
    });
    const empty = document.querySelector('.schedule-empty-row'); if (empty) empty.hidden = visible !== 0;
    text('schedule-count', `本月共${visible}个课次 · 冲突${rows.filter((row) => !row.hidden && row.dataset.conflict === 'true').length}个`);
  };
  form?.addEventListener('submit', (event) => { event.preventDefault(); apply(); });
  form?.addEventListener('reset', () => window.setTimeout(apply));
  document.querySelectorAll('[data-month-action]').forEach((button) => button.addEventListener('click', () => { text('schedule-month', button.dataset.monthAction === 'prev' ? '2026年8月' : '2026年10月'); toast(`已切换至${button.dataset.monthAction === 'prev' ? '2026年8月' : '2026年10月'}。`); }));
  apply();
}

function initProfile() {
  renderProfileCapacity();
  document.querySelectorAll('[data-profile-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.profileAction;
    if (action === 'freeze' || action === 'resign') toast(action === 'freeze' ? '已打开冻结确认。' : '已打开离职确认。');
  }));
}

// 教师详情：按专业逐条给出资质结论，并列出申报层面的准入阻断。
function renderProfileCapacity() {
  const container = document.querySelector('.teacher-capability-detail');
  const facts = teacherFactsById(new URLSearchParams(location.search).get('teacher_id') || 'teacher-wang');
  if (!container || !facts) return;
  const summary = summarizeTeacherCapacity(facts);
  const apply = explainTeacherCapacity(facts, { purpose: 'apply' });
  const withoutCertificate = summary.majors.filter((item) => !item.qualified).map((item) => item.major);
  const reasonRows = [
    ...apply.blocks.map((block) => `<div><span class="tag red">阻断</span><p>${block.text}</p></div>`),
    ...(withoutCertificate.length ? [`<div><span class="tag amber">排课提醒</span><p>${withoutCertificate.join('、')} 暂无有效资质，不影响申报，但发布与排课会按专业和课次日期校验。</p></div>`] : [])
  ].join('');
  container.innerHTML = `<div><span class="tag ${apply.status === 'available' ? 'brand' : 'gray'}">${apply.status === 'available' ? '可申报' : '暂不可申报'}</span><p>${apply.status === 'available' ? '资料已建档、人员在职、账号正常，且已配置授课专业。' : apply.reasons.join('；')}</p></div>${reasonRows}<div><span class="tag brand">授课专业 ${summary.majorCount} 个</span><p>${summary.majors.map((item) => `${item.major}：${item.qualified ? '有有效资质' : '缺有效资质'}`).join('；')}。</p></div>`;
  const summaryResult = document.querySelector('.teacher-summary-result');
  if (summaryResult) {
    const today = new Date().toISOString().slice(0, 10);
    const usable = (facts.certificates || []).filter((item) => item.status === '已通过' && (!item.expiresAt || item.expiresAt >= today)).length;
    const pending = (facts.certificates || []).length - usable;
    summaryResult.innerHTML = `<strong>可用 ${usable} 份 <span aria-hidden="true">|</span> 待处理 ${pending} 份</strong><p>${summary.majors.map((item) => `${item.major}：${item.qualified ? '资质满足' : '待补充专业资质'}`).join('；')}。</p>`;
  }
}

document.addEventListener('click', (event) => { if (event.target.closest('[data-dialog-close]')) event.target.closest('dialog')?.close(); });

if (teacherPage === 'list') initTeacherList();
if (teacherPage === 'create') initTeacherCreate();
if (teacherPage === 'contracts') initContracts();
if (teacherPage === 'schedule') initSchedule();
if (teacherPage === 'profile') initProfile();
