import { machinesForPage, stateLabelsOf } from '../../spec/states/index.js';
import { sessionsFrom, teacherFactsById, teacherFactsByName } from './teacher-facts.js';
import { certificateDedupKey, certificateSourceLabel } from './certificate-source.js';
import { readDemoState } from './demo-store.js';
import { DEMO_TODAY, demoDateTime } from './demo-clock.js';
import { toLocalDateString } from './date-utils.js';

const table = document.querySelector('#certificates-table');
const filterForm = document.querySelector('#certificate-filter');
const emptyRow = table?.querySelector('.certificate-empty');
const rows = table ? [...table.querySelectorAll('tbody tr[data-certificate-id]')] : [];
// CR-2026-028 §3.3：来源与文件版本列在渲染期会被“适用专业／受影响课次”插列推移，
// 先按静态列位打上 data-cell 标记，后续更新按标记定位，不再依赖列序号。
rows.forEach((row) => {
  row.children[8]?.setAttribute('data-cell', 'source');
  row.children[10]?.setAttribute('data-cell', 'file-version');
  row.children[5]?.setAttribute('data-cell', 'expiry');
  row.children[7]?.setAttribute('data-cell', 'validity');
});
let activeRow = null;
let toastTimer;

const dialog = (id) => document.querySelector(`#${id}`);
const text = (id, value) => {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value || '—';
};

const statusClass = (value) => ({
  待审核: 'amber',
  已通过: 'green',
  已驳回: 'red',
  已撤销: 'gray'
}[value] || 'gray');

const validityClass = (value) => ({有效: 'green', 即将过期: 'amber', 已过期: 'red'}[value] || 'gray');

// 证书有效性只按「演示基准日 + 30 天窗口」派生：静态行与渲染期补行共用这一处口径，
// 避免静态 HTML 写死的有效性随基准日推移与窗口判定分叉（R57-UI-01）。
const CERTIFICATE_VALIDITY_WINDOW_DAYS = 30;
function certificateValidityOf(expiry) {
  if (!expiry) return '有效';
  const soon = demoDateTime(DEMO_TODAY);
  soon.setDate(soon.getDate() + CERTIFICATE_VALIDITY_WINDOW_DAYS);
  const soonDate = toLocalDateString(soon);
  return expiry > soonDate ? '有效' : expiry < DEMO_TODAY ? '已过期' : '即将过期';
}

// 列表、筛选、详情与导出同源：渲染期统一重算有效性，并同步到期日单元格的提示配色。
function syncCertificateValidityCells() {
  rows.forEach((row) => {
    if (!row.isConnected) return;
    const validity = certificateValidityOf(row.dataset.expiry);
    row.dataset.validity = validity;
    const expiryCell = row.querySelector('[data-cell="expiry"]');
    if (expiryCell) expiryCell.className = validity === '已过期' ? 'expiry-danger' : validity === '即将过期' ? 'expiry-warning' : '';
    const validityCell = row.querySelector('[data-cell="validity"]');
    if (validityCell) validityCell.innerHTML = `<span class="tag ${validityClass(validity)}">${validity}</span>`;
  });
}

// 本地旧值兼容：审核状态只取 待审核／已通过／已驳回／已撤销（05-状态字典 §4.1）。
// 一是 CR-2026-019 删除的“已录入”按来源迁移；二是旧标签“审核通过／审核不通过”改名。
const LEGACY_RECORDED_STATUS = '已录入';
const LEGACY_STATUS_LABELS = { 审核通过: '已通过', 审核不通过: '已驳回' };
rows.forEach((row) => {
  const legacyRecorded = row.dataset.status === LEGACY_RECORDED_STATUS;
  const legacyLabel = LEGACY_STATUS_LABELS[row.dataset.status];
  if (!legacyRecorded && !legacyLabel) return;
  if (!legacyRecorded) {
    row.dataset.status = legacyLabel;
    updateStatusCell(row);
    updateActionCell(row);
    return;
  }
  const backendEntered = row.dataset.source === '后台录入';
  row.dataset.status = backendEntered ? '已通过' : '待审核';
  if (backendEntered) {
    row.dataset.reviewer = row.dataset.reviewer || row.dataset.enteredBy || '后台录入';
    row.dataset.reviewedAt = row.dataset.reviewedAt || row.dataset.uploadedAt || '';
    row.dataset.reviewNote = row.dataset.reviewNote || '后台录入默认通过。';
  } else {
    row.dataset.reviewNote = row.dataset.reviewNote || '已迁移为待审核，等待教研审核。';
  }
  updateStatusCell(row);
  updateActionCell(row);
});

rows.slice().sort((a, b) => a.dataset.expiry.localeCompare(b.dataset.expiry)).forEach((row) => table.tBodies[0].append(row));

// 事实层视图：证书只在“适用专业”范围内参与资质校验；受影响课次 =
// 证书到期之后、教师仍要上的、属于该适用专业的课次，用来提前发现换人或续证需求。
function renderCertificateFactCells() {
  const today = DEMO_TODAY;
  rows.forEach((row) => {
    const facts = teacherFactsByName(row.dataset.teacher);
    const certificate = (facts?.certificates || []).find((item) => item.name === row.dataset.name);
    const majors = certificate?.majors || [];
    const majorCell = document.createElement('td');
    majorCell.dataset.cell = 'majors';
    majorCell.textContent = majors.length ? majors.join('、') : '—';
    row.insertBefore(majorCell, row.children[2] || null);

    const affectedCell = document.createElement('td');
    affectedCell.dataset.cell = 'affected';
    if (!certificate || !certificate.expiresAt) {
      affectedCell.textContent = '—';
    } else if (certificate.expiresAt < today) {
      affectedCell.textContent = '已过期';
      affectedCell.className = 'expiry-danger';
    } else {
      const affected = majors.flatMap((major) => sessionsFrom({ teacher: row.dataset.teacher, major, from: certificate.expiresAt }));
      const unique = [...new Map(affected.map((item) => [`${item.classId}-${item.date}`, item])).values()].sort((a, b) => a.date.localeCompare(b.date));
      affectedCell.textContent = unique.length ? `${unique.length} 个课次` : '无';
      affectedCell.className = unique.length ? 'expiry-warning' : '';
      if (unique.length) affectedCell.title = `${certificate.expiresAt} 之后：${unique.slice(0, 4).map((item) => `${item.date} ${item.className}`).join('；')}${unique.length > 4 ? ' 等' : ''}`;
    }
    const actionCell = row.querySelector('[data-cell="actions"]');
    row.insertBefore(affectedCell, actionCell || null);
  });
}

renderCertificateFactCells();

// 9.2 可自动化复现：撤回使用标准 dialog，确认按钮带 data-confirm-action 便于测试定位提交结果。
// 口径（2026-09-22）：证书只保留待审核／已通过／已驳回／已撤销四态；撤回后进入“已撤销”，可重新上传生成新版本。
function openWithdrawConfirm(row) {
  activeRow = row;
  text('certificate-status-title', '撤回证书');
  text('certificate-status-copy', '撤回后该证书状态变为已撤销，可重新上传后再次提交审核；已审核或已被课程、排课引用的证书不能撤回。');
  text('certificate-status-teacher', row.dataset.teacher);
  text('certificate-status-name', `${row.dataset.name} · ${row.dataset.number}`);
  text('certificate-status-current', `${row.dataset.status} / ${row.dataset.validity || '—'}`);
  const error = document.querySelector('#certificate-status-error');
  if (error) { error.hidden = true; error.textContent = ''; }
  const confirmButton = document.querySelector('#certificate-status-confirm');
  if (confirmButton) {
    confirmButton.dataset.confirmAction = 'certificate-withdraw';
    confirmButton.textContent = '确认撤回';
  }
  openDialog('certificate-status-dialog');
}

function confirmCertificateStatus() {
  const row = activeRow;
  if (!row) return;
  if (row.dataset.status !== '待审核' || row.dataset.referenced === '是') {
    const error = document.querySelector('#certificate-status-error');
    if (error) { error.hidden = false; error.textContent = '只有待审核且未被课程、排课引用的证书可以撤回。'; }
    return;
  }
  row.dataset.status = '已撤销';
  updateStatusCell(row);
  updateActionCell(row);
  applyFilters();
  closeDialog('certificate-status-dialog');
  showToast(`已撤销证书：${row.dataset.name}，可重新上传后再次提交审核。`);
}

function openDialog(id) {
  const current = dialog(id);
  if (current && !current.open) current.showModal();
}

function closeDialog(id) {
  const current = dialog(id);
  if (current?.open) current.close();
}

function showToast(message) {
  const element = document.querySelector('#certificate-toast');
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { element.hidden = true; }, 2600);
}

function rowData(row) {
  return {
    teacher: row.dataset.teacher,
    name: row.dataset.name,
    number: row.dataset.number,
    type: row.dataset.type,
    issuer: row.dataset.issuer,
    expiry: row.dataset.expiry,
    status: row.dataset.status,
    validity: row.dataset.validity,
    source: row.dataset.source,
    enteredBy: row.dataset.enteredBy,
    file: row.dataset.file,
    uploadedAt: row.dataset.uploadedAt,
    reviewer: row.dataset.reviewer,
    reviewedAt: row.dataset.reviewedAt,
    reviewNote: row.dataset.reviewNote
  };
}

// CR-2026-028 §3.3.1：后台来源列展示文件来源（学校录入／本人上传／系统生成），
// 与教师端“我的证书”同一套文案；存储值保持旧枚举，展示统一走映射。
function syncCertificateSourceCells() {
  rows.forEach((row) => {
    const cell = row.querySelector('[data-cell="source"]');
    if (cell) cell.textContent = certificateSourceLabel(row.dataset.source);
  });
}

function updateFileVersionCell(row) {
  const cell = row.querySelector('[data-cell="file-version"]');
  if (cell) cell.textContent = row.dataset.fileVersion || 'v1';
}

function updateStatusCell(row) {
  const cell = row.querySelector('[data-cell="review"]');
  if (!cell) return;
  cell.innerHTML = `<span class="tag ${statusClass(row.dataset.status)}">${row.dataset.status}</span>`;
}

function canDeleteCertificate(row) {
  return row.dataset.status === '待审核' && row.dataset.referenced !== '是';
}

function updateActionCell(row) {
  const cell = row.querySelector('[data-cell="actions"]');
  if (!cell) return;
  // UI v1.2：已通过可直接重传（新版本独立审核，旧结论归属旧版本）；驳回、已过期与已撤销同样可重传，
  // 已撤销的记录重新上传并提交后回到“待审核”。
  const reupload = ['已通过', '已驳回', '已撤销'].includes(row.dataset.status) || row.dataset.validity === '已过期';
  const review = row.dataset.status === '待审核';
  // UI v1.2 状态—操作矩阵 + 2026-09-16 口径：未引用且未审核可撤回（撤回后为“已撤销”）；
  // 已审核的证书通过重新上传生成新版本改变材料。
  const withdraw = row.dataset.status === '待审核' && row.dataset.referenced !== '是';
  const remove = canDeleteCertificate(row);
  cell.innerHTML = `${review ? '<button type="button" class="text-button" data-action="review" data-perm="PERM-TEACHER-005">审核</button>' : ''}${reupload ? '<button type="button" class="text-button" data-action="reupload">重新上传</button>' : ''}<button type="button" class="text-button" data-action="view">查看</button>${withdraw ? '<button type="button" class="text-button" data-action="withdraw">撤回</button>' : ''}${remove ? '<button type="button" class="text-button danger-link" data-action="delete">删除</button>' : ''}`;
}

// 证书审核状态以页签切换：状态取值只读 spec/states 的 SM-TEACHER-CERTIFICATE，
// 页面不得自定义状态；「全部」是不加状态过滤的默认项，本身不是状态取值。
const CERTIFICATE_STATE_MACHINE = 'SM-TEACHER-CERTIFICATE';
const certificateStateMachine = machinesForPage('teachers/certificates').find((machine) => machine.id === CERTIFICATE_STATE_MACHINE);
const certificateStatusTabs = [
  { value: '', label: '全部' },
  ...(certificateStateMachine ? stateLabelsOf(certificateStateMachine).map((label) => ({ value: label, label })) : [])
];
const statusTabHost = document.querySelector('#certificate-status-tabs');
if (statusTabHost) {
  statusTabHost.innerHTML = certificateStatusTabs
    .map(({ value, label }) => `<button type="button" role="tab" class="status-tab" data-certificate-status="${value}" aria-selected="false">${label}<span>0</span></button>`)
    .join('');
}
const statusTabs = [...document.querySelectorAll('[data-certificate-status]')];
let activeStatus = '';

function syncStatusTabs() {
  statusTabs.forEach((tab) => {
    const value = tab.dataset.certificateStatus || '';
    const selected = value === activeStatus;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    const badge = tab.querySelector('span');
    if (badge) badge.textContent = String(rows.filter((row) => row.isConnected && (!value || row.dataset.status === value)).length);
  });
}

statusTabs.forEach((tab) => tab.addEventListener('click', () => {
  activeStatus = tab.dataset.certificateStatus || '';
  applyFilters();
}));

function applyFilters() {
  const status = activeStatus;
  const validity = document.querySelector('#certificate-validity')?.value || '';
  const type = document.querySelector('#certificate-type')?.value || '';
  const teacher = (document.querySelector('#certificate-teacher')?.value || '').trim();
  const source = document.querySelector('#certificate-source')?.value || '';
  const start = document.querySelector('#certificate-date-start')?.value || '';
  const end = document.querySelector('#certificate-date-end')?.value || '';
  let visible = 0;

  rows.forEach((row) => {
    const matches = row.isConnected && (!status || row.dataset.status === status)
      && (!validity || row.dataset.validity === validity)
      && (!type || row.dataset.type === type)
      && (!teacher || row.dataset.teacher.includes(teacher))
      && (!source || certificateSourceLabel(row.dataset.source) === source)
      && (!start || row.dataset.expiry >= start)
      && (!end || row.dataset.expiry <= end);
    row.hidden = !matches;
    if (matches) visible += 1;
  });

  syncStatusTabs();
  if (emptyRow) emptyRow.hidden = visible !== 0;
  const total = rows.filter((row) => row.isConnected).length;
  text('certificate-count', `共${total}条证书 · 当前筛选显示${visible}条 · 默认按有效期截止升序`);
  text('certificate-pagination-count', `共${visible}条`);
}

function setDetailStatus(id, value, className) {
  const element = document.querySelector(`#${id}`);
  if (!element) return;
  element.textContent = value || '—';
  element.className = `tag ${className}`;
}

function openDetail(row) {
  activeRow = row;
  const data = rowData(row);
  text('detail-teacher', data.teacher);
  text('detail-name', data.name);
  text('detail-number', data.number);
  text('detail-type', data.type);
  text('detail-issuer', data.issuer);
  text('detail-expiry', data.expiry);
  text('detail-source', certificateSourceLabel(data.source));
  text('detail-entered-by', data.enteredBy);
  text('detail-uploaded-at', data.uploadedAt);
  text('detail-file', data.file);
  setDetailStatus('detail-status', data.status, statusClass(data.status));
  setDetailStatus('detail-validity', data.validity, validityClass(data.validity));
  text('detail-audit', data.reviewer ? `${data.reviewer} · ${data.reviewedAt}：${data.reviewNote || '已完成审核。'}` : '暂无审核记录。');
  openDialog('detail-dialog');
}

function openReview(row) {
  activeRow = row;
  const data = rowData(row);
  text('review-teacher', data.teacher);
  text('review-name', data.name);
  text('review-number', data.number);
  text('review-document-name', data.name);
  text('review-document-number', data.number);
  text('review-document-issuer', data.issuer);
  text('review-document-expiry', data.expiry);
  text('review-document-file', data.file);
  const note = document.querySelector('#review-note');
  if (note) note.value = '';
  const error = document.querySelector('#review-error');
  if (error) error.hidden = true;
  openDialog('review-dialog');
}

function openReupload(row) {
  activeRow = row;
  const data = rowData(row);
  text('reupload-teacher', data.teacher);
  text('reupload-name', data.name);
  text('reupload-status', data.validity === '已过期' ? '已过期' : data.status);
  const form = document.querySelector('#reupload-form');
  form?.reset();
  text('reupload-file-name', '未选择文件');
  const error = document.querySelector('#reupload-error');
  if (error) error.hidden = true;
  openDialog('reupload-dialog');
}

function openDelete(row) {
  activeRow = row;
  const data = rowData(row);
  text('delete-name', data.name);
  text('delete-number', `${data.teacher} · ${data.number}`);
  openDialog('delete-dialog');
}

function openPreview(row) {
  activeRow = row;
  const data = rowData(row);
  text('preview-file-name', data.file);
  text('preview-name', data.name);
  text('preview-number', data.number);
  text('preview-issuer', data.issuer);
  text('preview-expiry', data.expiry);
  openDialog('preview-dialog');
}

function handleReview(result) {
  if (!activeRow) return;
  const note = document.querySelector('#review-note')?.value.trim() || '';
  const error = document.querySelector('#review-error');
  // UI v1.1：驳回原因必填且 10–200 字，不通过不落库。
  if (result === 'reject' && (note.length < 10 || note.length > 200)) {
    if (error) {
      error.textContent = note ? '驳回原因需 10–200 字，请补充具体说明。' : '驳回原因必填（10–200 字），请填写后重新提交。';
      error.hidden = false;
    }
    return;
  }
  // UI v1.2 §3.1-4：新版本被驳回时回退到最近一次已通过版本；没有通过版本则不再满足准入，按目标专业重算资质校验。
  if (result === 'reject' && activeRow.dataset.previousStatus === '已通过') {
    activeRow.dataset.status = '已通过';
    activeRow.dataset.rejectedFileVersion = activeRow.dataset.fileVersion || '';
    activeRow.dataset.reviewNote = note;
    activeRow.dataset.reviewer = '李教研';
    activeRow.dataset.reviewedAt = '';
    updateStatusCell(activeRow); updateActionCell(activeRow); applyFilters();
    closeDialog('review-dialog');
    showToast('新版本被驳回，已回退到最近一次已通过版本，发布与排课按该版本重算资质。');
    return;
  }
  const noApprovedVersion = result === 'reject' && activeRow.dataset.previousStatus !== '已通过';
  activeRow.dataset.status = result === 'pass' ? '已通过' : '已驳回';
  activeRow.dataset.reviewNote = note || '证书文件和证书信息已核验。';
  activeRow.dataset.reviewer = '李教研';
  activeRow.dataset.reviewedAt = '2026-09-08 15:20';
  updateStatusCell(activeRow);
  updateActionCell(activeRow);
  applyFilters();
  closeDialog('review-dialog');
  showToast(result === 'pass' ? '证书已通过审核，列表已更新。' : (noApprovedVersion ? '证书已驳回；无已通过版本，该证书不再满足资质要求，发布与排课按目标专业重新校验。' : '证书已驳回，已保留驳回原因。'));
}

filterForm?.addEventListener('submit', (event) => { event.preventDefault(); applyFilters(); });
filterForm?.addEventListener('reset', () => window.setTimeout(applyFilters));

document.querySelector('#reupload-file')?.addEventListener('change', (event) => {
  text('reupload-file-name', event.target.files?.[0]?.name || '未选择文件');
});

document.addEventListener('click', (event) => {
  const actionElement = event.target.closest('[data-action]');
  if (actionElement && actionElement.dataset.action !== 'download-current') {
    const row = actionElement.closest('tr[data-certificate-id]');
    if (row) {
      ({preview: openPreview, download: () => showToast(`已准备下载：${row.dataset.file}`), review: openReview, reupload: openReupload, view: openDetail, delete: openDelete, withdraw: openWithdrawConfirm}[actionElement.dataset.action])?.(row);
    }
  }
  if (event.target.closest('[data-dialog-close]')) {
    const current = event.target.closest('dialog');
    current?.close();
  }
  if (event.target.matches('[data-review-result]')) handleReview(event.target.dataset.reviewResult);
  if (event.target.id === 'detail-preview' && activeRow) { closeDialog('detail-dialog'); openPreview(activeRow); }
  if (event.target.id === 'delete-confirm' && activeRow) {
    if (!canDeleteCertificate(activeRow)) {
      closeDialog('delete-dialog');
      showToast('仅待审核且未被课程或排课引用的证书可以删除。');
      activeRow = null;
      return;
    }
    const deletedName = activeRow.dataset.name;
    activeRow.remove();
    closeDialog('delete-dialog');
    activeRow = null;
    applyFilters();
    showToast(`已删除证书：${deletedName}`);
  }
  if (event.target.id === 'certificate-status-confirm') confirmCertificateStatus();
  if (event.target.matches('[data-action="download-current"]') && activeRow) showToast(`已准备下载：${activeRow.dataset.file}`);
});

document.querySelector('#reupload-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!activeRow) return;
  const file = document.querySelector('#reupload-file')?.files?.[0];
  const error = document.querySelector('#reupload-error');
  if (!file) {
    if (error) error.hidden = false;
    return;
  }
  activeRow.dataset.previousStatus = activeRow.dataset.status;
  activeRow.dataset.status = '待审核';
  activeRow.dataset.source = '教师端上传';
  activeRow.dataset.previousFile = activeRow.dataset.file || '';
  activeRow.dataset.file = file.name;
  activeRow.dataset.uploadedAt = '2026-09-08 15:20';
  // 驳回重传：生成新 file_version，旧文件/旧审批结论/旧来源只读保留（原型以版本递增与留痕字段体现）。
  const currentVersion = Number(String(activeRow.dataset.fileVersion || 'v1').replace(/[^0-9]/g, '')) || 1;
  activeRow.dataset.previousReview = activeRow.dataset.reviewNote || '';
  activeRow.dataset.fileVersion = `v${currentVersion + 1}`;
  // 列位标记定位，避免插入列后把文件版本写进“录入人”、把来源写进“证书有效性”。
  updateFileVersionCell(activeRow);
  syncCertificateSourceCells();
  updateStatusCell(activeRow);
  updateActionCell(activeRow);
  applyFilters();
  closeDialog('reupload-dialog');
  showToast('证书已重新上传，等待教研主管审核。');
});

// CR-2026-048 §3.5.4／§3.6：第二步（后台）录入的证书与后台列表页同源；
// 按 teacher_id 进入时把该教师的证书记录补进列表，避免详情页有证书而明细页空白。
function appendTeacherEnteredRows(teacherId, teacherName) {
  const entered = (readDemoState().teacherCertificates || []).filter((item) => item.teacherId === teacherId);
  if (!entered.length || !table || !rows.length) return;
  const template = rows[0];
  entered.forEach((item) => {
    const key = certificateDedupKey(item);
    const sameTeacher = (row) => row.dataset.teacher === teacherName;
    if (rows.filter(sameTeacher).some((row) => certificateDedupKey({ type: row.dataset.type, number: row.dataset.number }) === key)) return;
    const row = template.cloneNode(true);
    row.dataset.certificateId = item.id;
    row.dataset.teacher = teacherName;
    row.dataset.name = item.name;
    row.dataset.number = item.number;
    row.dataset.type = item.type;
    row.dataset.issuer = item.issuer;
    row.dataset.expiry = item.expiresAt || '';
    row.dataset.status = item.status;
    row.dataset.source = item.source;
    row.dataset.enteredBy = item.operator || '—';
    row.dataset.file = item.file || '';
    row.dataset.uploadedAt = item.enteredAt || '';
    row.dataset.reviewer = item.operator || '—';
    row.dataset.reviewedAt = item.enteredAt || '';
    row.dataset.reviewNote = '后台录入默认通过。';
    row.dataset.referenced = '否';
    row.dataset.validity = certificateValidityOf(item.expiresAt);
    const cells = row.children;
    cells[0].innerHTML = `<a class="link" href="profile.html?teacher_id=${encodeURIComponent(teacherId)}">${item.teacherName || teacherName}</a>`;
    cells[1].textContent = item.name;
    cells[2].textContent = (item.majors || []).join('、') || '—';
    cells[3].textContent = item.number;
    cells[4].innerHTML = `<span class="tag brand">${item.type}</span>`;
    cells[5].textContent = item.issuer || '—';
    cells[6].textContent = item.expiresAt || '永久有效';
    cells[8].innerHTML = `<span class="tag ${validityClass(row.dataset.validity)}">${row.dataset.validity}</span>`;
    cells[10].textContent = item.operator || '—';
    cells[13].textContent = '—';
    updateStatusCell(row);
    table.tBodies[0].append(row);
    rows.push(row);
  });
}

const params = new URLSearchParams(window.location.search);
const queryStatus = params.get('status');
const queryValidity = params.get('validity');
const queryTeacher = params.get('teacher');
// CR-2026-048 §3.5.4：教师详情页「查看证书明细」按 teacher_id 进入，这里解析出教师姓名并套用同一套筛选。
const queryTeacherId = params.get('teacher_id');
if (queryStatus && statusTabs.some((tab) => tab.dataset.certificateStatus === queryStatus)) activeStatus = queryStatus;
if (queryValidity) document.querySelector('#certificate-validity').value = queryValidity;
const teacherNameOfQuery = queryTeacher
  || (queryTeacherId ? (teacherFactsById(queryTeacherId)?.name
    || (readDemoState().teacherRecords || []).find((item) => item.id === queryTeacherId)?.name || '') : '');
if (teacherNameOfQuery) document.querySelector('#certificate-teacher').value = teacherNameOfQuery;
// 第二步录入的证书归属演示态教师（静态列表里没有该行），按 teacher_id 进入时补行后再统一渲染。
if (queryTeacherId) appendTeacherEnteredRows(queryTeacherId, teacherNameOfQuery || '本次建档教师');
// 操作列由 updateActionCell 统一渲染，静态标记只作占位，避免静态与动态分叉成两套动作。
syncCertificateValidityCells();
rows.forEach(updateActionCell);
syncCertificateSourceCells();
rows.forEach(updateFileVersionCell);
applyFilters();
