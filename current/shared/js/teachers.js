import { relativePath } from './paths.js';
import { readAdminSession } from './admin-auth.js';
import { mountRichEditor } from './rich-editor.js';
import { demoId, demoTime, readDemoState, upsertDemoRecord, writeDemoState } from './demo-store.js';
import { readXlsxSheetRows } from './xlsx-lite.js';
import { toLocalDateString } from './date-utils.js';
import { teacherFactsById } from './teacher-facts.js';
import { certificateDedupKey, findDuplicateCertificate } from './certificate-source.js';
import { permissionsOfRole } from './permissions.js';
import { TEACHER_PROFILE_EDITABLE_FIELDS, TEACHER_PROFILE_LABELS, teacherProfileMask } from './teacher-profile-fields.js';
import { explainTeacherCapacity, summarizeTeacherCapacity } from './teacher-capacity.js';
import { machinesForPage, stateLabelsOf } from '../../spec/states/index.js';

const teacherRoot = document.querySelector('[data-teacher-page]');
const teacherPage = teacherRoot?.dataset.teacherPage;
// CR-2026-046 §4：合同域期限派生使用固定演示基准日，与教师端课表 `2026-09-12` 一致，避免 Mock 随时间漂移。
const CONTRACT_DEMO_TODAY = '2026-09-12';
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
  有效: 'green', 即将到期: 'amber', 已到期: 'red', 已终止: 'gray', 无合同: 'gray', 已驳回: 'red', 已撤销: 'gray',
  未激活: 'gray', 正常: 'green', 冻结: 'gray', 草稿: 'gray'
}[value] || 'gray');

function statusTag(value) { return `<span class="tag ${tagClass(value)}">${value}</span>`; }

function confirmTeacherAction(row, action) {
  activeTeacherRow = row;
  const teacher = row.dataset.teacher;
  const copy = {
    freeze: ['冻结教师账号', '确认冻结该教师账号？仅账号状态变为冻结，资料、人员、证书、合同和历史记录不变。', '确认冻结'],
    unfreeze: ['解冻教师账号', '确认解冻该教师账号？', '确认解冻'],
    resign: ['办理教师离职', '确认办理离职？离职日期必填，默认当天。办理后教师无法登录或新增未来排课，但账号、资料、证书、合同与历史记录不被改写。', '确认离职']
  }[action];
  if (!copy) return;
  text('teacher-action-title', copy[0]);
  text('teacher-action-copy', copy[1]);
  text('teacher-action-teacher', `${teacher} · ${row.dataset.employeeNo}`);
  const confirm = document.querySelector('#teacher-action-confirm');
  if (confirm) { confirm.dataset.action = action; confirm.textContent = copy[2]; }
  // 离职日期只在办理离职时出现，默认当天、允许改期（CR-2026-021）。
  const dateField = document.querySelector('#teacher-action-date-field');
  const dateInput = document.querySelector('#teacher-action-date');
  if (dateField && dateInput) {
    const needDate = action === 'resign';
    dateField.hidden = !needDate;
    dateInput.required = needDate;
    if (needDate) dateInput.value = new Date().toISOString().slice(0, 10);
  }
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
    row.dataset.departedAt = String(document.querySelector('#teacher-action-date')?.value || '').trim() || new Date().toISOString().slice(0, 10);
  }
  renderTeacherCapability(row);
  renderTeacherActions(row, actionCell);
}

// 视图层：教师列表只回答「可授课几个专业、哪些专业有有效资质、档案与账号是否异常」，
// 不再输出教师级“可排课”结论——那个结论只在具体（专业 × 课次日期）下成立。
// CR-2026-029／030：授课专业与有效资质合并为一列（专业方向 + 有效资质 x/y）；
// 当前能力独立成列，展示可申报／可排课／暂停使用，与教师详情页的能力结论同源。
function renderTeacherCredential(row, summary) {
  const cell = row.querySelector('[data-cell="credential"]');
  if (!cell) return;
  const tone = summary.qualifiedCount === summary.majorCount ? 'green' : summary.qualifiedCount ? 'amber' : 'red';
  cell.className = `teacher-credential is-${tone}`;
  // P2：结论标签开放「判定依据」，避免只有结论没有口径。
  cell.innerHTML = `有效资质 ${summary.qualifiedCount}/${summary.majorCount}<button type="button" class="text-button" data-capacity-evidence aria-label="查看有效资质判定依据">依据</button>`;
}
// P2：把「有效资质 x/y」与「当前能力」两个结论开放为可解释的判定依据
//（每个专业缺什么资质、命中哪份证书、合同是否覆盖、申报告知），调用方只展示校验器的输出。
function openTeacherCapacityEvidence(facts) {
  const summary = summarizeTeacherCapacity(facts);
  const today = toLocalDateString();
  const majorRows = summary.majors.map((item) => {
    const schedule = explainTeacherCapacity(facts, { purpose: 'schedule', major: item.major, date: today });
    const detail = schedule.status === 'available'
      ? '<span class="tag brand">可排课</span>'
      : `<span class="tag amber">暂不可排课</span><span class="sub-cell">${importEsc(schedule.reasons.join('；') || '—')}</span>`;
    return `<tr><td>${importEsc(item.major)}</td><td>${item.qualified ? '<span class="tag green">有有效资质</span>' : '<span class="tag red">缺有效资质</span>'}</td><td>${importEsc(item.certificate || '—')}</td><td>${detail}</td></tr>`;
  }).join('');
  const contracts = facts.contracts || [];
  const contractRows = contracts.length
    ? contracts.map((contract) => `<tr><td>${importEsc(contract.number)}</td><td>${statusTag(contract.status)}</td><td>${importEsc(`${contract.startAt || '—'} 至 ${contract.endAt || '长期有效'}`)}</td><td>${importEsc((contract.courses || []).join('、') || '—')}</td><td>${importEsc((contract.majors || []).join('、') || '—')}</td></tr>`).join('')
    : '<tr><td colspan="5">该教师暂无合同记录</td></tr>';
  const applyResult = explainTeacherCapacity(facts, { purpose: 'apply' });
  const dialog = document.createElement('dialog');
  dialog.className = 'modal-dialog';
  dialog.dataset.capacityEvidence = 'true';
  dialog.innerHTML = `<div class="modal-card"><div class="modal-header"><div><h2>当前能力判定依据</h2><p>${importEsc(facts.name)} · ${importEsc(facts.id)}</p></div><button type="button" class="icon-button modal-close" data-dialog-close title="关闭" aria-label="关闭">×</button></div><section class="form-section first-form-section"><h3>专业资质（基准日 ${today}）</h3><div class="table-wrap"><table><thead><tr><th>授课专业</th><th>资质结论</th><th>命中的有效证书</th><th>今日能否排课</th></tr></thead><tbody>${majorRows || '<tr><td colspan="4">未配置授课专业</td></tr>'}</tbody></table></div><p class="sub-cell">判定口径：证书需为「已通过」并覆盖该专业、且在课次日期仍有效；合同需为「已签署」并覆盖该专业／课程与日期。申报不校验证书与合同。</p></section><section class="form-section"><h3>合同覆盖</h3><div class="table-wrap"><table><thead><tr><th>合同编号</th><th>签署状态</th><th>合同有效期</th><th>覆盖课程</th><th>覆盖专业</th></tr></thead><tbody>${contractRows}</tbody></table></div><p class="sub-cell">${importEsc(applyResult.status === 'available' ? '当前资料与账号状态允许申报课程。' : `申报告知：${applyResult.reasons.join('；')}`)}</p></section><div class="modal-actions"><button type="button" class="button primary" data-dialog-close>关闭</button></div></div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-dialog-close]') || event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());
}

function renderTeacherCapability(row) {
  const cell = row.querySelector('[data-cell="capability"]');
  if (!cell) return;
  const facts = teacherFactsById(row.dataset.teacherId);
  if (!facts) return;
  const summary = summarizeTeacherCapacity(facts);
  renderTeacherCredential(row, summary);
  const applyResult = explainTeacherCapacity(facts, { purpose: 'apply' });
  const today = toLocalDateString();
  // 任一已配置专业在今天就绪即视为可排课；离职、冻结、资料未完善等阻断项统一显示暂停使用。
  const schedulable = !summary.blocked && summary.majors.some((item) => explainTeacherCapacity(facts, { purpose: 'schedule', major: item.major, date: today }).status === 'available');
  const tags = [];
  if (summary.blocked) {
    tags.push('<span class="tag gray">暂停使用</span>');
    (applyResult.blocks || []).slice(0, 1).forEach((block) => tags.push(`<span class="tag red">${block.text}</span>`));
  } else {
    tags.push(`<span class="tag ${applyResult.status === 'available' ? 'brand' : 'amber'}">${applyResult.status === 'available' ? '可申报' : '暂不可申报'}</span>`);
    tags.push(`<span class="tag ${schedulable ? 'green' : 'gray'}">${schedulable ? '可排课' : '暂不可排课'}</span>`);
  }
  cell.innerHTML = `${tags.join('')}<button type="button" class="text-button" data-capacity-evidence aria-label="查看当前能力判定依据">依据</button>`;
  row.dataset.capabilities = summary.blocked ? '暂停使用' : (applyResult.status === 'available' ? '可申报' : '暂不可申报');
  if (schedulable) row.dataset.capabilities += ',可排课';
}

function renderTeacherActions(row, cell) {
  if (!cell) return;
  const profile = row.dataset.profileStatus;
  const departedAt = row.dataset.departedAt;
  const account = row.dataset.accountStatus;
  const id = encodeURIComponent(row.dataset.teacherId);
  const actions = [`<a class="link" href="/admin/pages/teachers/profile.html?teacher_id=${id}">查看</a>`, `<a class="link" href="/admin/pages/teachers/create.html?mode=edit&teacher_id=${id}">编辑</a>`];
  if (profile === '已建档' && account === 'inactive') actions.push('<button type="button" class="text-button" data-action="resend-invite">重新发送邀请</button>');
  if (account === 'frozen') actions.push('<button type="button" class="text-button" data-action="unfreeze">解冻</button>');
  else if (account === 'active' && !departedAt) actions.push('<button type="button" class="text-button danger-link" data-action="freeze">冻结</button>');
  if (!departedAt) actions.push('<button type="button" class="text-button danger-link" data-action="resign">办理离职</button>');
  actions.push(`<a class="link" href="/admin/pages/academic/timetable.html?view=teacher&teacher_id=${id}">查看课表</a>`);
  cell.innerHTML = actions.join('');
}

function renderFeaturedSwitch(row, canManage) {
  const cell = row.querySelector('[data-cell="featured"]');
  if (!cell) return;
  const checked = (readDemoState().featuredTeacherIds || []).includes(row.dataset.teacherId);
  cell.innerHTML = `<label class="teacher-featured-switch" data-perm="PERM-TEACHER-007"><input type="checkbox" role="switch" data-action="toggle-featured"${checked ? ' checked' : ''}${canManage ? '' : ' disabled'} aria-label="将${row.dataset.teacher}设为名师推荐"><span class="teacher-featured-track" aria-hidden="true"></span><span data-featured-label>${checked ? '是' : '否'}</span></label>`;
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
  const capabilityFilter = form?.querySelector('[name="capability"]')?.value || '';
  const account = form?.querySelector('[name="account"]')?.value || '';
  const category = form?.querySelector('[name="category"]')?.value || '';
  const keyword = (form?.querySelector('[name="keyword"]')?.value || '').trim();
  const rows = [...document.querySelectorAll('tr[data-teacher-id]')];
  let visible = 0;
  rows.forEach((row) => {
    // CR-2026-030：教师列表不再以待办筛选；保留账号状态、授课专业、关键词与当前能力。
    const matches = (!capabilityFilter || row.dataset.capabilities.split(',').includes(capabilityFilter))
      && (!account || row.dataset.accountStatus === account)
      && (!category || row.dataset.category === category)
      && (!keyword || `${row.dataset.teacher}${row.dataset.employeeNo}${row.dataset.phone}`.includes(keyword));
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const empty = document.querySelector('.teacher-empty-row');
  if (empty) empty.hidden = visible !== 0;
  text('teacher-count', `共${38 + importedTeacherCount}名教师 · 当前筛选显示${visible}名 · 按最近授课时间倒序`);
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
    // CR-2026-030：待办标签列已下线，导入行只保留资料/账号状态；邀请发送结果通过提示与审计表达。

    const row = document.createElement('tr');
    row.dataset.importBatch = 'CR-2026-009-demo';
    row.dataset.teacherId = `teacher-import-${index + 1}`;
    row.dataset.teacher = item.name;
    row.dataset.employeeNo = no;
    row.dataset.phone = String(item.phone).replace(/\D/g, '');
    row.dataset.category = importCategory(item.major);
    row.dataset.profileStatus = '已建档';
    row.dataset.departedAt = '';
    row.dataset.accountStatus = 'inactive';
    row.dataset.capabilities = '暂停使用';
    // CR-2026-030：导入行按新列集合输出，能力列独立、不再有代办列；邀请结果由提示与审计表达。
    row.innerHTML = `<td><a class="link teacher-name" href="profile.html?teacher_id=${encodeURIComponent(row.dataset.teacherId)}">${importEsc(item.name)}</a><span class="teacher-cell-sub">${no} · ${phone}</span></td><td data-cell="major">${importEsc(item.major)}<br /><span class="teacher-cell-sub">${importEsc(item.personnel)}</span><br /><span class="teacher-credential" data-cell="credential"></span></td><td data-cell="capability"><span class="tag gray">暂停使用</span></td><td data-cell="featured"></td><td>暂无授课</td><td class="action-cell" data-cell="actions"></td>`;
    if (inviteFailed) toast(`${item.name} 邀请发送失败，可在操作列重新发送。`, 'error');
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
  // CR009-QA-04／CR-2026-027：角色口径与 admin-shell 同源（URL 参数 > 登录会话 > 默认），
  // 但可见性改为按权限点判定，不再按角色名；按钮本身由 data-perm 门禁统一隐藏。
  const currentRole = new URLSearchParams(location.search).get('role') || readAdminSession()?.role || 'academic_lead';
  const roleCan = (id) => (window.hbyxPermissions ? window.hbyxPermissions.can(id) : permissionsOfRole(currentRole).includes(id));
  const canManageFeatured = roleCan('PERM-TEACHER-007');
  document.querySelector('[data-action="teacher-import-open"]')?.addEventListener('click', (event) => { if (!roleCan('PERM-TEACHER-003')) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  applyHashFilters();
  window.addEventListener('hashchange', () => { applyHashFilters(); applyTeacherFilters(); });
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-capacity-evidence]');
    if (!trigger) return;
    const row = trigger.closest('tr[data-teacher-id]');
    const facts = row ? teacherFactsById(row.dataset.teacherId) : null;
    if (facts) openTeacherCapacityEvidence(facts);
  });
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
    if (event.currentTarget.dataset.action === 'resign' && !String(document.querySelector('#teacher-action-date')?.value || '').trim()) {
      const dateInput = document.querySelector('#teacher-action-date');
      dateInput?.focus();
      dateInput?.reportValidity?.();
      toast('请填写离职日期。', 'error');
      return;
    }
    updateTeacherRow(activeTeacherRow, event.currentTarget.dataset.action);
    closeDialog('teacher-action-dialog');
    toast(event.currentTarget.dataset.action === 'resign' ? `已办理离职，离职日期 ${activeTeacherRow?.dataset.departedAt}；其他业务状态及历史记录保持不变。` : '教师账号状态已更新，其他业务状态保持不变。');
    applyTeacherFilters();
    activeTeacherRow = null;
  });
  applyTeacherFilters();
}

function highlightCertificateRow(row) {
  if (!row) return;
  row.classList.add('certificate-duplicate-row');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  window.setTimeout(() => row.classList.remove('certificate-duplicate-row'), 2400);
}

// UI 复核 CR-2026-028（UI-028-01）：命中重复时给出「已存在 + 查看既有记录 + 返回修改」的明确路径，
// 而不是只用一行 toast；既有记录定位到表单内的既有行，返回修改聚焦到重复行证书编号。
// CR-2026-048 §3.2.2：第二步没有表单内既有行，命中时由 onView 定位到教师详情页「证书与账号」页签。
function openCertificateDuplicateDialog({ existingRow, conflictRow, item, teacherName, onView }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal-dialog small-dialog';
  dialog.dataset.certificateDuplicate = 'true';
  const hint = existingRow
    ? `既有记录在本表单的第 ${[...existingRow.parentElement.children].indexOf(existingRow) + 1} 行；如需更新材料，请对既有记录重新上传，而不是新增一行。`
    : '该教师的证书记录中已有同类型同编号的证书；如需更新材料，请对既有记录重新上传，而不是新增一行。';
  dialog.innerHTML = `<div class="modal-card"><div class="modal-header"><div><h2>该证书编号已存在</h2><p>同一教师下证书类型与证书编号同时相同即为重复，不能新增第二条记录。</p></div><button type="button" class="icon-button modal-close" data-dialog-close title="关闭" aria-label="关闭">×</button></div><dl class="info-grid"><div><dt>教师</dt><dd>${importEsc(teacherName || '本次建档教师')}</dd></div><div><dt>证书类型</dt><dd>${importEsc(item.type)}</dd></div><div><dt>证书编号</dt><dd>${importEsc(item.number)}</dd></div></dl><p class="form-error" role="alert">${hint}</p><div class="modal-actions"><button type="button" class="button" data-duplicate-action="back">返回修改</button><button type="button" class="button primary" data-duplicate-action="view">查看既有记录</button></div></div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-dialog-close]')) { dialog.close(); return; }
    const action = event.target.closest('[data-duplicate-action]')?.dataset.duplicateAction;
    if (!action) return;
    dialog.close();
    if (action === 'view') {
      if (onView) onView();
      else highlightCertificateRow(existingRow);
    }
    else {
      highlightCertificateRow(conflictRow);
      conflictRow?.querySelector('[data-certificate-number]')?.focus();
    }
  });
  dialog.addEventListener('close', () => dialog.remove());
}

// CR-2026-045：新增教师与教师详情共用同一套四页签分组与顺序。
// CR-2026-048 §3.1：新增页第 4 页签由「证书与账号」改为「账号」，证书子表整体移出建档表单。
const TEACHER_TABS = ['basic', 'contact', 'experience', 'account'];

// CR-2026-048 §3：两步向导共用同一路由，用 ?mode=wizard&step=profile|certificate&teacher_id= 表达步骤。
// 第一步建档只建主档；第二步证书录入可跳过、可中断、可再次进入；两步都不新增页面。
const CERTIFICATE_MAJOR_OPTIONS = ['中国舞', '民族民间舞', '芭蕾舞', '声乐演唱', '钢琴', '古筝', '中国画', '少儿绘画', '书法', '戏剧表演', '朗诵与主持'];
const CERTIFICATE_TYPE_OPTIONS = ['学历证书', '教师资格证', '艺术等级证', '其他'];
// 证书审核状态取值只读 spec/states 的 SM-TEACHER-CERTIFICATE（05-状态字典 §4），页面不新增状态取值。
const CERTIFICATE_STATUS_VALUES = (() => {
  const machine = machinesForPage('teachers/certificates').find((item) => item.id === 'SM-TEACHER-CERTIFICATE');
  return new Set(machine ? stateLabelsOf(machine) : []);
})();

const wizardCertificateLink = (teacherId) => `/admin/pages/teachers/create.html?mode=wizard&step=certificate&teacher_id=${encodeURIComponent(teacherId)}`;
const teacherProfileLink = (teacherId, query = '', hash = '') => `/admin/pages/teachers/profile.html?teacher_id=${encodeURIComponent(teacherId)}${query}${hash}`;

// CR-2026-048 §3.4：证书录入与证书审核保持两个独立权限点，不放宽也不合并。
// 取值顺序与系统管理「角色权限管理」一致：先读本地已保存的角色勾选，再回落到角色预置，便于复现无权限角色的降级路径。
function teacherRolePermissions() {
  const roleKey = window.hbyxPermissions?.roleKey || readAdminSession()?.role || 'academic_lead';
  try {
    const saved = JSON.parse(localStorage.getItem('hbyx-admin-role-permissions') || '[]');
    const row = Array.isArray(saved) ? saved.find((item) => item.key === roleKey) : null;
    if (row?.permissions?.length) return row.permissions;
  } catch { /* 本地勾选不可用时回落到角色预置 */ }
  return permissionsOfRole(roleKey);
}

function canManageTeacherCertificate() {
  return teacherRolePermissions().includes('PERM-TEACHER-004');
}

// 新建档教师不在静态事实层里：主档写入演示态，详情页与第二步都从同一处回读该教师对象。
function teacherRecordFromDemo(teacherId) {
  return (readDemoState().teacherRecords || []).find((item) => item.id === teacherId) || null;
}

function resolveTeacherFacts(teacherId) {
  return teacherFactsById(teacherId) || teacherRecordFromDemo(teacherId);
}

// §3.1：第一步只写主档；证书不进建档表单，表单字段按名收敛为教师对象。
function teacherRecordFromForm(form, id) {
  const value = (name) => String(form.querySelector(`[name="${name}"]`)?.value || '').trim();
  const checked = (name) => form.querySelector(`[name="${name}"]:checked`)?.value || '';
  return {
    id,
    name: value('name'),
    profileStatus: '已建档',
    accountStatus: 'inactive',
    departedAt: '',
    majors: [...form.querySelectorAll('input[name="professionals[]"]')].map((input) => input.value),
    teachingYears: Number(value('teachingYears')) || 0,
    professionalTitle: value('title'),
    tagline: value('tagline'),
    introduction: form.querySelector('[data-rich-editor][data-name="introduction"] [data-editor-value]')?.value || '',
    archive: {
      employeeNo: form.querySelector('.readonly-field')?.value || '', personnelType: checked('person-type'),
      gender: checked('gender'), birthMonth: value('birthday'), idCard: value('idCard'),
      politicalStatus: value('political'), ethnicity: value('ethnicity'), highestEducation: value('education'),
      carPlate: value('plateNumber'), mobile: value('phone'), email: value('email'),
      emergencyName: value('emergencyName'), emergencyMobile: value('emergencyPhone'),
      payeeName: value('payee'), bankCard: value('bankCard'), bankName: value('bank'),
      education: value('studyExperience'), employment: value('workExperience'), awards: value('awards'),
      remark: value('remark')
    },
    certificates: [],
    contracts: []
  };
}

// §3.2／§3.5：第二步与教师详情页共用的证书取值，含适用专业与文件来源两个维度。
function teacherCertificateRecords(teacherId) {
  const facts = resolveTeacherFacts(teacherId);
  const seeded = (facts?.certificates || []).map((item) => ({ ...item, number: item.number || item.id, source: item.source || '学校录入' }));
  const seededKeys = new Set(seeded.map((item) => certificateDedupKey(item)).filter(Boolean));
  const entered = (readDemoState().teacherCertificates || [])
    .filter((item) => item.teacherId === teacherId)
    .map((item) => ({ ...item, source: item.source || '学校录入' }))
    .filter((item) => !seededKeys.has(certificateDedupKey(item)));
  return [...seeded, ...entered];
}

// 有效性按有效期截止日期独立计算，与审核状态分列，不合成一个结论。
function certificateValidity(item) {
  if (item.status !== '已通过') return '—';
  if (!item.expiresAt) return '永久有效';
  return item.expiresAt < CONTRACT_DEMO_TODAY ? '已过期' : '有效';
}

function certificateReadonlyRows(records) {
  if (!records.length) return '<tr><td colspan="6">该教师暂无证书，可通过「录入证书」补充。</td></tr>';
  return records.map((item) => `<tr data-certificate-record="${importEsc(item.id)}"><td>${importEsc(item.name)}</td><td>${importEsc(item.type)}</td><td>${importEsc((item.majors || []).join('、') || '—')}</td><td>${CERTIFICATE_STATUS_VALUES.has(item.status) ? statusTag(item.status) : '—'}</td><td>${importEsc(certificateValidity(item))}</td><td>${importEsc(item.source)}</td></tr>`).join('');
}

// §3.3：历史 create.html?tab=certificate 深链重定向到第二步；缺少有效 teacher_id 时回退教师列表。
function wizardStepContext() {
  const params = new URLSearchParams(location.search);
  const step = params.get('mode') === 'wizard' ? (params.get('step') || 'profile') : 'profile';
  const teacherId = params.get('teacher_id') || '';
  // R49 后续修复：仅当未带 mode 参数时才把 tab=certificate 当作历史深链；
  // 编辑态（mode=edit）带入的 tab=certificate 应归一为第 4 页签「账号」，不能被重定向到第二步。
  if (!params.get('mode') && params.get('tab') === 'certificate') {
    const target = teacherId ? wizardCertificateLink(teacherId) : '/admin/pages/teachers/list.html';
    window.location.replace(relativePath(target));
    return { redirecting: true, step: 'profile', teacherId };
  }
  return { redirecting: false, step, teacherId };
}

// 第二步只认演示态里该教师的证书；不再有表单内既有行，因此按记录对象查重。
const wizardCertificatesOf = (teacherId) => teacherCertificateRecords(teacherId);

function wizardCertificateRows(records) {
  return certificateReadonlyRows(records);
}

function persistWizardCertificate(record) {
  return upsertDemoRecord('teacherCertificates', record);
}

function renderWizardCertificateStep(teacherId) {
  const container = document.querySelector('#teacher-wizard-certificate');
  const body = document.querySelector('[data-wizard-certificate-body]');
  if (!container || !body) return;
  // 第二步不重复展示主档必填字段，也不允许在第二步修改主档。
  document.querySelector('#teacher-form')?.setAttribute('hidden', '');
  document.querySelector('.teacher-tabbar')?.setAttribute('hidden', '');
  const stepHeading = document.querySelector('#page-content .page-head h1');
  if (stepHeading) stepHeading.textContent = '教师证书录入';
  document.title = '师资中心 · 教师证书录入';
  const pageCopy = document.querySelector('#page-content .page-head p');
  if (pageCopy) pageCopy.textContent = '第一步已建档完成；第二步只录入该教师的证书，可跳过或稍后再进入，本步不修改主档信息。';
  container.hidden = false;
  const teacherName = resolveTeacherFacts(teacherId)?.name || '本次新建档教师';
  const teacherLabel = document.querySelector('[data-wizard-teacher]');
  if (teacherLabel) teacherLabel.textContent = `${teacherName} · ${teacherId}`;
  const majorOptions = CERTIFICATE_MAJOR_OPTIONS;
  // §3.2.3：跳过与完成两者都进入该教师详情页，差别只在返回后的提示文案。
  const leaveStep = (notice) => { window.location.href = relativePath(teacherProfileLink(teacherId, `&notice=${notice}`, '#certificate')); };
  const draw = () => {
    const records = wizardCertificatesOf(teacherId);
    body.innerHTML = `<div class="form-section first-form-section"><div class="section-title-row"><div><h2>该教师已录入证书</h2></div><span class="tag gray">${records.length} 项</span></div><div class="table-wrap"><table><thead><tr><th>证书名称</th><th>证书类型</th><th>适用专业</th><th>审核状态</th><th>有效性</th><th>文件来源</th></tr></thead><tbody>${wizardCertificateRows(records)}</tbody></table></div></div><div class="form-section"><h2>录入证书</h2><form data-form="wizard-certificate" novalidate><div class="form-grid"><label class="form-field"><span>证书名称 *</span><input name="name" required placeholder="如：中国舞教师资格证" /></label><label class="form-field"><span>证书编号 *</span><input name="number" required placeholder="如：WD-2019-0028" /></label><label class="form-field"><span>证书类型 *</span><select name="type" required><option value="">请选择类型</option>${['学历证书', '教师资格证', '艺术等级证', '其他'].map((type) => `<option>${type}</option>`).join('')}</select></label><label class="form-field"><span>适用专业 *</span><select multiple size="3" class="certificate-major-select" name="majors" required>${majorOptions.map((major) => `<option>${major}</option>`).join('')}</select></label><label class="form-field"><span>发证机构 *</span><input name="issuer" required placeholder="如：中国舞蹈家协会" /></label><label class="form-field"><span>颁发日期</span><input name="issuedAt" type="date" /></label><label class="form-field"><span>有效期截止</span><input name="expiresAt" type="date" /></label><label class="form-field"><span>永久有效</span><span class="sales-switch-control"><input name="permanent" type="checkbox"></span></label><label class="form-field wide"><span>证书文件 *</span><input name="file" type="file" required accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" /></label></div><p class="form-error" data-wizard-error role="alert" hidden></p><div class="teacher-form-actions"><button type="button" class="button" data-wizard-action="skip">跳过，稍后录入</button><button type="button" class="button primary" data-wizard-action="finish">完成</button><button type="submit" class="button primary">保存证书</button></div></form></div>`;
  };
  body.onclick = (event) => {
    const action = event.target.closest('[data-wizard-action]')?.dataset.wizardAction;
    if (!action) return;
    leaveStep(action === 'skip' ? 'skip' : 'finish');
  };
  body.onsubmit = (event) => {
    const formEl = event.target.closest('[data-form="wizard-certificate"]');
    if (!formEl) return;
    event.preventDefault();
    const data = new FormData(formEl);
    const error = formEl.querySelector('[data-wizard-error]');
    const majors = data.getAll('majors');
    if (!String(data.get('name') || '').trim() || !String(data.get('number') || '').trim() || !data.get('type') || !String(data.get('issuer') || '').trim() || !majors.length || !formEl.querySelector('[name="file"]').files.length) {
      error.textContent = '请补齐证书名称、编号、类型、适用专业（至少 1 个）、发证机构与证书文件。';
      error.hidden = false;
      return;
    }
    // §3.2.2：查重范围是该教师已保存的全部证书（类型 + 编号），命中不产生第二条记录。
    const duplicate = findDuplicateCertificate(wizardCertificatesOf(teacherId), { type: data.get('type'), number: String(data.get('number')).trim() });
    if (duplicate) {
      // §3.2.2：第二步没有表单内既有行，「查看既有记录」定位到教师详情页证书与账号页签。
      openCertificateDuplicateDialog({ item: { type: data.get('type'), number: String(data.get('number')).trim() }, teacherName, onView: () => leaveStep('existing') });
      return;
    }
    const record = { id: `cert-${Date.now()}`, teacherId, name: String(data.get('name')).trim(), number: String(data.get('number')).trim(), type: data.get('type'), majors, issuer: String(data.get('issuer')).trim(), issuedAt: data.get('issuedAt') || '', expiresAt: data.get('permanent') ? '' : (data.get('expiresAt') || ''), status: '已通过', source: '学校录入', operator: readAdminSession()?.name || '李教务', enteredAt: demoTime(), file: formEl.querySelector('[name="file"]').files[0].name };
    persistWizardCertificate(record);
    draw();
    toast('证书已录入，状态为已通过、来源为学校录入。');
  };
  draw();
}

// 第二步入口：只在 step=certificate 时接管页面，返回 true 表示本页已由第二步渲染。
function initTeacherWizard() {
  const context = wizardStepContext();
  if (context.redirecting) return true;
  if (context.step !== 'certificate') return false;
  // §3.3.3：teacher_id 缺失或无效时回退教师列表并提示，不进入空态页面。
  if (!context.teacherId || !resolveTeacherFacts(context.teacherId)) {
    toast('缺少有效的教师标识，已返回教师列表。', 'error');
    window.setTimeout(() => { window.location.replace(relativePath('/admin/pages/teachers/list.html')); }, 800);
    return true;
  }
  // §3.4.2：第二步录入证书要求 PERM-TEACHER-004；无权限时回教师详情页，不展示证书录入。
  if (!canManageTeacherCertificate()) {
    toast('当前账号没有证书录入权限，已返回教师详情页。', 'error');
    window.setTimeout(() => { window.location.replace(relativePath(teacherProfileLink(context.teacherId, '&notice=no-permission', '#certificate'))); }, 900);
    return true;
  }
  renderWizardCertificateStep(context.teacherId);
  return true;
}

const teacherFieldEmpty = (field) => {
  if (field.type === 'checkbox') return !field.checked;
  if (field.tagName === 'SELECT') return !String(field.value || '').trim();
  return !String(field.value || '').trim();
};

// 必填项按「控件 + 单选组 + 条件行」统计：一个单选组只计一项，证书行的适用专业属行内条件必填。
function teacherRequiredFields(panel) {
  const seen = new Set();
  const items = [];
  panel.querySelectorAll('input[required], select[required], textarea[required]').forEach((field) => {
    if (field.disabled) return;
    // 单选组按 name 归并；同名控件只计一项；无 name 的（证书行适用专业等）按序号去重。
    const key = field.type === 'radio'
      ? `radio:${field.name}`
      : `${field.tagName}:${field.name || (field.dataset.certificateMajors !== undefined ? `certificate-majors-${items.length}` : `field-${items.length}`)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ key, field, value: () => (field.type === 'radio' ? [...panel.querySelectorAll(`input[type="radio"][name="${field.name}"]`)].some((radio) => radio.checked) : !teacherFieldEmpty(field)) });
  });
  return items;
}

function teacherTabMissing(form, name) {
  const panel = form.querySelector(`[data-teacher-panel="${name}"]`);
  return panel ? teacherRequiredFields(panel).filter((item) => !item.value()).length : 0;
}

function refreshTeacherTabBadges(form, names = TEACHER_TABS, mode = 'form') {
  if (mode === 'readonly') {
    let pending = 0;
    names.forEach((name) => {
      const panel = form.querySelector(`[data-teacher-panel="${name}"]`);
      const empty = panel ? [...panel.querySelectorAll('[data-archive-field][data-empty="true"]')].length : 0;
      pending += empty;
      const badge = form.querySelector(`[data-tab-badge="${name}"]`);
      const tab = form.querySelector(`[data-teacher-tab="${name}"]`);
      if (badge) { badge.textContent = empty ? String(empty) : '✓'; badge.dataset.tone = empty ? 'warn' : 'done'; badge.hidden = false; }
      if (tab) tab.dataset.state = empty ? 'incomplete' : 'complete';
    });
    const hint = form.querySelector('[data-required-hint]');
    if (hint) hint.textContent = pending ? `资料待完善 ${pending} 项` : '资料已完善';
    return { missingTotal: pending };
  }
  let missingTotal = 0;
  names.forEach((name) => {
    const missing = teacherTabMissing(form, name);
    missingTotal += missing;
    const badge = form.querySelector(`[data-tab-badge="${name}"]`);
    const tab = form.querySelector(`[data-teacher-tab="${name}"]`);
    if (badge) {
      badge.textContent = missing ? String(missing) : '✓';
      badge.dataset.tone = missing ? 'warn' : 'done';
      badge.hidden = false;
    }
    if (tab) tab.dataset.state = missing ? 'incomplete' : 'complete';
  });
  const hint = form.querySelector('[data-required-hint]');
  if (hint) hint.textContent = missingTotal ? `必填项还差 ${missingTotal} 项` : '必填项已完成';
  return { missingTotal };
}

function clearTeacherFieldErrors(form) {
  form.querySelectorAll('[data-field-error]').forEach((element) => element.remove());
  form.querySelectorAll('.teacher-field-invalid').forEach((field) => field.classList.remove('teacher-field-invalid'));
}

function markTeacherFieldError(field) {
  const anchor = field.closest('.form-field') || field.closest('td') || field;
  field.classList.add('teacher-field-invalid');
  if (anchor.querySelector('[data-field-error]')) return;
  anchor.insertAdjacentHTML('beforeend', '<p class="form-error" data-field-error role="alert">该必填项未填写或不合法。</p>');
}

// 跨页签全量校验：先临时展开全部页签找出第一个错误，再切回该页签并滚动高亮。
function validateTeacherForm(form, tabs) {
  const panels = [...form.querySelectorAll('[data-teacher-panel]')];
  const hiddenState = panels.map((panel) => panel.hidden);
  panels.forEach((panel) => { panel.hidden = false; });
  clearTeacherFieldErrors(form);
  let firstBad = null;
  for (const name of TEACHER_TABS) {
    const panel = form.querySelector(`[data-teacher-panel="${name}"]`);
    const bad = panel && [...panel.querySelectorAll('input, select, textarea')].find((field) => !field.checkValidity());
    if (bad) { firstBad = { name, field: bad }; break; }
  }
  panels.forEach((panel, index) => { panel.hidden = hiddenState[index]; });
  if (!firstBad) { refreshTeacherTabBadges(form); return true; }
  tabs.setTab(firstBad.name);
  markTeacherFieldError(firstBad.field);
  const badge = form.querySelector(`[data-tab-badge="${firstBad.name}"]`);
  if (badge) badge.dataset.tone = 'error';
  firstBad.field.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if (typeof firstBad.field.focus === 'function') firstBad.field.focus({ preventScroll: true });
  toast('请先补齐当前页签中标红的必填项。', 'error');
  return false;
}

function initTeacherTabs(form, options = {}) {
  const tabs = [...form.querySelectorAll('[data-teacher-tab]')];
  const panels = [...form.querySelectorAll('[data-teacher-panel]')];
  const names = tabs.map((tab) => tab.dataset.teacherTab);
  const fallback = names[0] || 'basic';
  const mode = options.mode || 'form';
  const setTab = (name, options = {}) => {
    const target = names.includes(name) ? name : fallback;
    tabs.forEach((tab) => {
      const active = tab.dataset.teacherTab === target;
      tab.setAttribute('aria-selected', String(active));
      tab.classList.toggle('active', active);
      tab.tabIndex = active ? 0 : -1;
      if (active && options.focus) tab.focus({ preventScroll: true });
    });
    // 切换页签只改可见性，不重建 DOM、不重置已填值。
    panels.forEach((panel) => { panel.hidden = panel.dataset.teacherPanel !== target; });
    const url = new URL(location.href);
    url.searchParams.set('tab', target);
    history.replaceState(null, '', url);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setTab(tab.dataset.teacherTab));
    tab.addEventListener('keydown', (event) => {
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      event.preventDefault();
      setTab(tabs[(index + delta + tabs.length) % tabs.length].dataset.teacherTab, { focus: true });
    });
  });
  setTab(new URLSearchParams(location.search).get('tab') || fallback);
  refreshTeacherTabBadges(form, names, mode);
  return { setTab, refreshBadges: () => refreshTeacherTabBadges(form, names, mode) };
}

// 编辑态上下文：页标题按 mode 取值；新增页第 4 页签已更名「账号」，
// 详情页带入的 tab=certificate 需归一为 account，避免落回第一个页签或被当成历史深链。
function applyCreateContextCopy() {
  const params = new URLSearchParams(location.search);
  const isEdit = params.get('mode') === 'edit';
  if (isEdit && params.get('tab') === 'certificate') {
    const url = new URL(location.href);
    url.searchParams.set('tab', 'account');
    history.replaceState(null, '', url);
  }
  const heading = document.querySelector('#page-content .page-head h1');
  if (heading) heading.textContent = isEdit ? '编辑教师' : '新增教师';
  document.title = isEdit ? '师资中心 · 编辑教师' : '师资中心 · 新增教师';
}

function initTeacherCreate() {
  applyCreateContextCopy();
  const form = document.querySelector('#teacher-form');
  const teacherTabs = form ? initTeacherTabs(form) : { setTab: () => {}, refreshBadges: () => ({ missingTotal: 0 }) };
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
    // CR-2026-045 §3.1.2：跨页签全量校验，失败切到第一个含错误的页签并高亮该字段。
    if (!validateTeacherForm(form, teacherTabs)) return;
    if (selected.length === 0) { toast('请至少添加一个授课专业。', 'error'); return; }
    const phone = form.querySelector('[name="phone"]')?.value || '';
    const idCard = form.querySelector('[name="idCard"]')?.value || '';
    if (!/^\d{11}$/.test(phone)) { toast('手机号必须为11位数字。', 'error'); return; }
    if (!/^\d{17}[\dXx]$/.test(idCard)) { toast('身份证号必须为18位有效格式。', 'error'); return; }
    // CR-2026-028 §2.2：后台录入保存前执行查重，命中不静默创建第二条记录。
    // CR-2026-048：建档只校验主档，证书不再随第一步提交。
    const result = form.querySelector('[data-build-result]');
    if (result) result.hidden = false;
    toast('教师已建档；账号邀请发送失败，可重新发送。', 'error');
    // CR-2026-048 §3.1：建档只写主档；新建教师写入演示态，第二步与详情页据此回读同一教师对象。
    const created = teacherRecordFromForm(form, demoId('teacher'));
    upsertDemoRecord('teacherRecords', created);
    // §3.4：无证书录入权限的角色完成第一步后直接进入教师详情页，不展示第二步。
    if (!canManageTeacherCertificate()) {
      window.setTimeout(() => { window.location.href = relativePath(teacherProfileLink(created.id)); }, 700);
      return;
    }
    window.setTimeout(() => { window.location.href = relativePath(wizardCertificateLink(created.id)); }, 900);
  });
  // §3.1.5／§3.2：保存草稿不校验必填，只刷新页签角标与完成度。
  form?.querySelector('[data-action="save-draft"]')?.addEventListener('click', () => { teacherTabs.refreshBadges(); toast('教师档案草稿已保存（未校验必填项）。'); });
  // 输入时刷新角标，且清除该字段的错误标记。
  form?.addEventListener('input', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLElement)) return;
    field.classList.remove('teacher-field-invalid');
    const anchor = field.closest('.form-field') || field.closest('td');
    anchor?.querySelector('[data-field-error]')?.remove();
    teacherTabs.refreshBadges();
  });
  form?.addEventListener('change', () => teacherTabs.refreshBadges());
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

  // 合同期限状态是派生值：由合同起止日期按固定演示基准日计算，不写入签署状态字段（05-状态字典 §4.2）。
  // CR-2026-046 §4：基准日固定为 2026-09-12，与教师端课表口径一致，保证四种签署状态与三种期限状态长期可复现。
  const today = CONTRACT_DEMO_TODAY;
  const termStatusOf = (row) => {
    const [startAt, endAt] = String(row.dataset.term || '').split('至').map((value) => value.trim());
    // 无固定期限（形如「2025-09-01 起（无固定期限）」）派生为有效，截止日期不参与校验。
    if (!endAt || String(row.dataset.term || '').includes('无固定期限')) return '有效';
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
      // CR-2026-046 §3：补齐课程、工作校区、合同模板、签署日期与脱敏身份证号；无固定期限显示「长期有效」；
      // 文件来源按 FD-TEACHER-050 的 noUpload 口径显示「系统生成」，业务来源行按产品未确认口径暂不展示。
      const noFixedTerm = String(data.term || '').includes('无固定期限');
      text('contract-detail-teacher', data.teacher);
      text('contract-detail-number', data.number);
      text('contract-detail-status', data.status);
      text('contract-detail-type', data.type);
      text('contract-detail-template', data.template);
      text('contract-detail-course', data.course);
      text('contract-detail-campus', data.campus);
      text('contract-detail-term', noFixedTerm ? '长期有效' : data.term);
      text('contract-detail-term-status', termStatusOf(row));
      text('contract-detail-rate', `¥${Number(data.rate || 0).toFixed(2)} / 每次课（含税）`);
      text('contract-detail-sign-date', data.signDate || '待签署');
      text('contract-detail-id-card', teacherArchiveIdCardMask(data.idCard || ''));
      text('contract-detail-file-source', '系统生成');
      text('contract-detail-file', `${data.template || '合同模板'} · ${data.number}.pdf`);
      text('contract-detail-version', data.fileVersion || 'v1');
      const terminateWrap = document.querySelector('#contract-detail-terminate-wrap');
      if (terminateWrap) {
        terminateWrap.hidden = data.status !== '已终止';
        if (data.status === '已终止') text('contract-detail-terminate', `${data.terminateReason || '未填写'} · 生效日期 ${data.terminateAt || '—'}`);
      }
      text('contract-detail-note', data.note || '暂无备注。');
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
  const params = new URLSearchParams(location.search);
  const facts = resolveTeacherFacts(params.get('teacher_id') || 'teacher-wang');
  if (facts) { renderTeacherProfileArchive(facts); renderTeacherSelfProfile(facts); }
  // CR-2026-048 §3.2.3：第二步「跳过，稍后录入」与「完成」都进入本页，差别只在提示文案。
  const notice = params.get('notice');
  if (notice === 'skip') toast('已跳过证书录入；该教师证书为 0 项，可随时从本页「录入证书」补录。');
  else if (notice === 'finish') toast('证书录入已完成，主档与证书分别保存。');
  else if (notice === 'existing') toast('已定位到该教师的既有证书，请在原记录上重新上传，不要新增第二条。', 'error');
  else if (notice === 'no-permission') toast('当前账号没有证书录入权限，请由具备该权限的角色录入证书。', 'error');
  const profileTabs = document.querySelector('.teacher-tabcard') ? initTeacherTabs(document.querySelector('.teacher-tabcard'), { mode: 'readonly' }) : null;
  // 从第二步返回的 #certificate 深链直接停在「证书与账号」页签。
  if (location.hash === '#certificate') document.querySelector('[data-teacher-tab="certificate"]')?.click();
  // §4.3：编辑入口携带当前页签，返回后停留原页签。
  const editLink = document.querySelector('#teacher-profile-edit-link');
  if (editLink && facts) {
    const tab = profileTabs ? (new URLSearchParams(location.search).get('tab') || 'basic') : 'basic';
    // 新增页第 4 页签为「账号」，证书页签进入编辑态时按「账号」带入，避免落到证书向导。
    const editTab = tab === 'certificate' ? 'account' : tab;
    editLink.href = relativePath(`/admin/pages/teachers/create.html?mode=edit&teacher_id=${encodeURIComponent(facts.id)}&tab=${encodeURIComponent(editTab)}`);
  }
  document.querySelectorAll('[data-profile-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.profileAction;
    if (action === 'freeze' || action === 'resign') toast(action === 'freeze' ? '已打开冻结确认。' : '已打开离职确认。');
  }));
}

// CR-2026-045 §4：教师详情页四个档案页签的只读投影。
// 每个字段标注来源（后台建档／教师端本人维护）与最近更新时间；空值显示「—」；身份证号与手机号按规则脱敏。
const TEACHER_ARCHIVE_GROUPS = [
  { name: 'basic', title: '基本信息', fields: [
    ['employeeNo', '工号'], ['name', '姓名'], ['personnelType', '人员类型'], ['gender', '性别'], ['birthMonth', '出生年月'],
    ['idCard', '身份证号'], ['politicalStatus', '政治面貌'], ['ethnicity', '民族'], ['highestEducation', '最高学历'],
    ['majors', '授课专业'], ['teachingYears', '从教年限'], ['professionalTitle', '职称'], ['carPlate', '车牌号']
  ] },
  { name: 'contact', title: '联系与财务', fields: [
    ['mobile', '手机号'], ['email', '邮箱'], ['emergencyName', '紧急联系人姓名'], ['emergencyMobile', '紧急联系人电话'],
    ['payeeName', '收款户名'], ['bankCard', '银行卡号'], ['bankName', '开户行']
  ] },
  { name: 'experience', title: '经历与展示', fields: [
    ['education', '学习经历'], ['employment', '工作经历'], ['awards', '获奖情况'], ['tagline', '一句话简介'], ['introduction', '简介']
  ] }
];

const TEACHER_ARCHIVE_SELF_KEYS = new Set(TEACHER_PROFILE_EDITABLE_FIELDS.map((field) => field.key));

function teacherArchiveIdCardMask(value) {
  const text = String(value || '');
  return text.length >= 10 ? `${text.slice(0, 4)}${'*'.repeat(text.length - 8)}${text.slice(-4)}` : text;
}

function teacherArchiveValue(facts, key) {
  const state = readDemoState();
  const self = (state.teacherProfiles || {})[facts.id] || {};
  if (TEACHER_ARCHIVE_SELF_KEYS.has(key) && self[key] !== undefined && String(self[key]).trim() !== '') {
    return { value: String(self[key]), source: '教师端本人维护', at: self.updatedAt || '—' };
  }
  const archive = facts.archive || {};
  if (key === 'name') return { value: facts.name || '', source: '后台建档', at: archive.updatedAt || '2026-08-18 10:00' };
  if (key === 'majors') return { value: (facts.majors || []).join('、'), source: '后台建档', at: archive.updatedAt || '2026-08-18 10:00' };
  if (key === 'teachingYears') return { value: facts.teachingYears ? `${facts.teachingYears} 年` : '', source: '后台建档', at: archive.updatedAt || '2026-08-18 10:00' };
  if (key === 'professionalTitle') return { value: facts.professionalTitle || '', source: '后台建档', at: archive.updatedAt || '2026-08-18 10:00' };
  if (key === 'tagline') return { value: facts.tagline || '', source: '教师端本人维护', at: self.updatedAt || '—' };
  if (key === 'introduction') return { value: facts.introduction || '', source: '教师端本人维护', at: self.updatedAt || '—' };
  return { value: archive[key] !== undefined ? String(archive[key]) : '', source: '后台建档', at: archive.updatedAt || '2026-08-18 10:00' };
}

function teacherArchiveDisplay(facts, key) {
  const { value, source, at } = teacherArchiveValue(facts, key);
  const masked = key === 'idCard' ? teacherArchiveIdCardMask(value) : key === 'mobile' || key === 'emergencyMobile' ? teacherProfileMask(key, value) : value;
  return { text: masked && masked.trim() ? masked : '—', empty: !(masked && masked.trim()), source, at };
}

function teacherArchiveRows(facts, fields) {
  const rows = fields.map(([key, label]) => {
    const field = teacherArchiveDisplay(facts, key);
    return `<tr data-archive-field="${key}" data-empty="${field.empty}"><th>${label}</th><td>${importEsc(field.text)}</td><td>${importEsc(field.source)}</td><td>${importEsc(field.at)}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="teacher-archive-table"><thead><tr><th>字段</th><th>当前值</th><th>来源</th><th>最近更新</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderTeacherProfileArchive(facts) {
  const name = document.querySelector('#teacher-profile-name');
  if (name) name.textContent = facts.name;
  const identity = document.querySelector('#teacher-profile-identity');
  const mobile = teacherArchiveDisplay(facts, 'mobile').text;
  const employeeNo = teacherArchiveValue(facts, 'employeeNo').value || '—';
  if (identity) identity.textContent = `${employeeNo} · ${(facts.majors || []).join(' / ') || '—'} · ${mobile}`;
  const profileStatus = document.querySelector('[data-teacher-profile-status]');
  if (profileStatus) profileStatus.textContent = facts.profileStatus || '—';
  const accountStatus = document.querySelector('[data-teacher-account-status]');
  if (accountStatus) accountStatus.textContent = facts.accountStatus === 'active' ? '正常' : facts.accountStatus === 'frozen' ? '冻结' : '未激活';

  TEACHER_ARCHIVE_GROUPS.forEach((group) => {
    const panel = document.querySelector(`[data-teacher-panel="${group.name}"]`);
    if (panel) panel.innerHTML = `<div class="form-section first-form-section"><h2>${group.title}</h2>${teacherArchiveRows(facts, group.fields)}</div>`;
  });

  const certificatePanel = document.querySelector('[data-teacher-panel="certificate"]');
  if (certificatePanel) {
    // CR-2026-048 §3.5：第 4 页签 = 账号只读信息 + 证书只读列表 + 录入证书入口；「查看证书明细」保留。
    const certificates = teacherCertificateRecords(facts.id);
    const accountFields = [['邀请手机号', mobile], ['初始账号状态', facts.accountStatus === 'active' ? '正常' : '未激活'], ['备注', teacherArchiveValue(facts, 'remark').value || '—']];
    const entry = canManageTeacherCertificate()
      ? `<a class="button primary" href="${relativePath(wizardCertificateLink(facts.id))}">录入证书</a>`
      : '';
    certificatePanel.innerHTML = `<div class="form-section first-form-section"><div class="section-title-row"><div><h2>证书列表</h2></div><div class="toolbar-actions">${entry}<a class="button" href="${relativePath(`/admin/pages/teachers/certificates.html?teacher_id=${encodeURIComponent(facts.id)}`)}">查看证书明细</a></div></div><div class="table-wrap"><table><thead><tr><th>证书名称</th><th>证书类型</th><th>适用专业</th><th>审核状态</th><th>有效性</th><th>文件来源</th></tr></thead><tbody>${certificateReadonlyRows(certificates)}</tbody></table></div><p class="teacher-profile-readonly-note">审核仍在证书列表页执行；本页只读展示，材料变更走既有记录的重新上传。</p></div><div class="form-section"><h2>账号</h2><div class="table-wrap"><table class="teacher-archive-table"><thead><tr><th>字段</th><th>当前值</th><th>来源</th><th>最近更新</th></tr></thead><tbody>${accountFields.map(([label, value]) => `<tr data-archive-field="${label}" data-empty="${value === '—'}"><th>${label}</th><td>${importEsc(value)}</td><td>后台建档</td><td>—</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  const recordsPanel = document.querySelector('[data-teacher-panel="records"]');
  if (recordsPanel) {
    const contracts = facts.contracts || [];
    const contractRows = contracts.length
      ? contracts.map((item) => `<tr><td>${importEsc(item.number)}</td><td>${statusTag(item.status)}</td><td>${importEsc(item.startAt || '—')} 至 ${importEsc(item.endAt || '长期有效')}</td><td>${importEsc((item.courses || []).join('、') || '—')}</td></tr>`).join('')
      : '<tr><td colspan="4">该教师暂无合同记录。</td></tr>';
    const courseRows = [...new Set(contracts.flatMap((item) => item.courses || []))].map((courseName) => `<tr><td>${importEsc(courseName)}</td><td>—</td><td>${importEsc((facts.majors || []).join('、'))}</td></tr>`).join('');
    recordsPanel.innerHTML = `<div class="form-section first-form-section"><div class="section-title-row"><div><h2>合同摘要</h2></div><a class="button" href="${relativePath(`/admin/pages/teachers/contracts.html?teacher_id=${encodeURIComponent(facts.id)}`)}">查看合同明细</a></div><div class="table-wrap"><table><thead><tr><th>合同编号</th><th>签署状态</th><th>合同有效期</th><th>覆盖课程</th></tr></thead><tbody>${contractRows}</tbody></table></div><p class="teacher-profile-readonly-note">签署证据、版本与终止信息在合同明细中查看；计薪按合同单价与已发生课次计算。</p></div><div class="form-section"><div class="section-title-row"><div><h2>关联课程</h2></div><span class="tag brand">${courseRows ? `${courseRows.split('<tr>').length - 1}门课程` : '暂无'}</span></div><div class="table-wrap"><table><thead><tr><th>课程名称</th><th>课程类型</th><th>所属专业</th></tr></thead><tbody>${courseRows || '<tr><td colspan="3">该教师暂无关联课程。</td></tr>'}</tbody></table></div></div><div class="form-section"><div class="section-title-row"><div><h2>本人维护字段</h2></div><span class="tag gray" id="teacher-self-profile-version">v1</span></div><div class="table-wrap"><table><thead><tr><th>字段</th><th>最新值</th><th>维护人</th><th>更新时间</th></tr></thead><tbody id="teacher-self-profile-rows"><tr><td colspan="4">教师尚未在教师端修改过档案，当前值以后台建档内容为准。</td></tr></tbody></table></div></div><div class="form-section" id="teacher-profile-audit-card"><div class="section-title-row"><div><h2>档案变更审计</h2></div><span class="tag gray" id="teacher-profile-audit-count">0 条</span></div><div class="table-wrap"><table><thead><tr><th>时间</th><th>操作人</th><th>来源</th><th>字段</th><th>变更</th></tr></thead><tbody id="teacher-profile-audit-rows"><tr><td colspan="5">暂无档案变更记录。</td></tr></tbody></table></div></div>`;
  }
}

// CR-2026-022：教师端“我的档案”由教师本人维护，后台教师详情页读取最新值并展示变更审计。
function renderTeacherSelfProfile(facts) {
  const state = readDemoState();
  const profile = (state.teacherProfiles || {})[facts.id];
  const mobileCell = document.querySelector('#teacher-profile-mobile');
  const rows = document.querySelector('#teacher-self-profile-rows');
  const versionTag = document.querySelector('#teacher-self-profile-version');
  const auditRows = document.querySelector('#teacher-profile-audit-rows');
  const auditCount = document.querySelector('#teacher-profile-audit-count');
  if (mobileCell && profile?.mobile) mobileCell.textContent = teacherProfileMask('mobile', profile.mobile);
  if (rows && profile) {
    const keys = Object.keys(TEACHER_PROFILE_LABELS).filter((key) => profile[key] !== undefined);
    rows.innerHTML = keys.length
      ? keys.map((key) => `<tr><td>${importEsc(TEACHER_PROFILE_LABELS[key])}</td><td>${importEsc(teacherProfileMask(key, profile[key]) || '未填写')}</td><td>教师本人</td><td>${importEsc(profile.updatedAt || '—')}</td></tr>`).join('')
      : '<tr><td colspan="4">教师尚未在教师端修改过档案，当前值以后台建档内容为准。</td></tr>';
  }
  if (versionTag && profile?.profileVersion) versionTag.textContent = `v${profile.profileVersion}`;
  const records = (state.teacherProfileAudit || []).filter((item) => !item.teacherId || item.teacherId === facts.id);
  if (auditCount) auditCount.textContent = `${records.length} 条`;
  if (!auditRows) return;
  if (!records.length) { auditRows.innerHTML = '<tr><td colspan="5">暂无档案变更记录。</td></tr>'; return; }
  auditRows.innerHTML = records.map((record) => record.changes.map((change, index) => `<tr>${index === 0 ? `<td rowspan="${record.changes.length}">${importEsc(record.at)}</td><td rowspan="${record.changes.length}">${importEsc(record.operator)}</td>` : ''}<td>${importEsc(change.label)}</td><td>${importEsc(change.before || '未填写')}</td><td>${importEsc(change.after || '未填写')}</td></tr>`).join('')).join('');
}

// 教师详情：按专业逐条给出资质结论，并列出申报层面的准入阻断。
function renderProfileCapacity() {
  const container = document.querySelector('.teacher-capability-detail');
  const facts = resolveTeacherFacts(new URLSearchParams(location.search).get('teacher_id') || 'teacher-wang');
  if (!container || !facts) return;
  const summary = summarizeTeacherCapacity(facts);
  const apply = explainTeacherCapacity(facts, { purpose: 'apply' });
  const withoutCertificate = summary.majors.filter((item) => !item.qualified).map((item) => item.major);
  const reasonRows = [
    ...apply.blocks.map((block) => `<div><span class="tag red">阻断</span><p>${block.text}</p></div>`),
    ...(withoutCertificate.length ? [`<div><span class="tag amber">排课提醒</span><p>${withoutCertificate.join('、')} 暂无有效资质，不影响申报，但发布与排课会按专业和课次日期校验。</p></div>`] : [])
  ].join('');
  container.innerHTML = `<div><span class="tag ${apply.status === 'available' ? 'brand' : 'gray'}">${apply.status === 'available' ? '可申报' : '暂不可申报'}</span><p>${apply.status === 'available' ? '资料已建档、离职日期为空（在职）、账号正常，且已配置授课专业。' : apply.reasons.join('；')}</p></div>${reasonRows}<div><span class="tag brand">授课专业 ${summary.majorCount} 个</span><p>${summary.majors.map((item) => `${item.major}：${item.qualified ? '有有效资质' : '缺有效资质'}`).join('；')}。</p></div>`;
  const departedStatus = document.querySelector('#teacher-departed-status');
  const departedNote = document.querySelector('#teacher-departed-note');
  if (departedStatus) departedStatus.textContent = facts.departedAt ? `离职 · ${facts.departedAt}` : '在职';
  if (departedNote) departedNote.textContent = facts.departedAt ? '离职后禁止登录与新增未来排课，历史记录保留。' : '离职日期为空即在职。';
  const summaryResult = document.querySelector('.teacher-summary-result');
  if (summaryResult) {
    const today = new Date().toISOString().slice(0, 10);
    const certificates = teacherCertificateRecords(facts.id);
    const usable = certificates.filter((item) => item.status === '已通过' && (!item.expiresAt || item.expiresAt >= today)).length;
    const pending = certificates.length - usable;
    summaryResult.innerHTML = `<strong>可用 ${usable} 份 <span aria-hidden="true">|</span> 待处理 ${pending} 份</strong><p>${summary.majors.map((item) => `${item.major}：${item.qualified ? '资质满足' : '待补充专业资质'}`).join('；')}。</p>`;
  }
}

document.addEventListener('click', (event) => { if (event.target.closest('[data-dialog-close]')) event.target.closest('dialog')?.close(); });

if (teacherPage === 'list') initTeacherList();
// CR-2026-048 §3：新增教师页承载两步向导，step=certificate 时交第二步渲染，其余情况仍渲染建档表单。
if (teacherPage === 'create' && !initTeacherWizard()) initTeacherCreate();
if (teacherPage === 'contracts') initContracts();
if (teacherPage === 'schedule') initSchedule();
if (teacherPage === 'profile') initProfile();
