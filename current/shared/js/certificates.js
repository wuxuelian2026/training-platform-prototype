const table = document.querySelector('#certificates-table');
const filterForm = document.querySelector('#certificate-filter');
const emptyRow = table?.querySelector('.certificate-empty');
const rows = table ? [...table.querySelectorAll('tbody tr[data-certificate-id]')] : [];
let activeRow = null;
let toastTimer;

const dialog = (id) => document.querySelector(`#${id}`);
const text = (id, value) => {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value || '—';
};

const statusClass = (value) => ({
  已录入: 'gray',
  待审核: 'amber',
  审核通过: 'green',
  审核不通过: 'red',
  未提交: 'gray',
  已归档: 'gray'
}[value] || 'gray');

const validityClass = (value) => ({有效: 'green', 即将过期: 'amber', 已过期: 'red'}[value] || 'gray');

rows.slice().sort((a, b) => a.dataset.expiry.localeCompare(b.dataset.expiry)).forEach((row) => table.tBodies[0].append(row));

// 9.2 可自动化复现：撤回/归档使用标准 dialog，确认按钮带 data-confirm-action 便于测试定位提交结果。
function openStatusConfirm(row, action) {
  activeRow = row;
  const withdraw = action === 'withdraw';
  text('certificate-status-title', withdraw ? '撤回证书' : '归档证书');
  text('certificate-status-copy', withdraw
    ? '撤回后该证书回到未提交状态，可修改后重新提交；已审核或已被课程、排课引用的证书不能撤回。'
    : '归档后该证书不再参与资质校验，历史版本、审核结论与操作记录只读保留。');
  text('certificate-status-teacher', row.dataset.teacher);
  text('certificate-status-name', `${row.dataset.name} · ${row.dataset.number}`);
  text('certificate-status-current', `${row.dataset.status} / ${row.dataset.validity || '—'}`);
  const error = document.querySelector('#certificate-status-error');
  if (error) { error.hidden = true; error.textContent = ''; }
  const confirmButton = document.querySelector('#certificate-status-confirm');
  if (confirmButton) {
    confirmButton.dataset.confirmAction = withdraw ? 'certificate-withdraw' : 'certificate-archive';
    confirmButton.textContent = withdraw ? '确认撤回' : '确认归档';
  }
  openDialog('certificate-status-dialog');
}

function confirmCertificateStatus(action) {
  const row = activeRow;
  if (!row) return;
  if (action === 'certificate-withdraw') {
    if (!['已录入', '待审核'].includes(row.dataset.status) || row.dataset.referenced === '是') {
      const error = document.querySelector('#certificate-status-error');
      if (error) { error.hidden = false; error.textContent = '该证书已审核或已被课程、排课引用，不能撤回，请改用归档。'; }
      return;
    }
    row.dataset.status = '未提交';
    updateStatusCell(row);
    updateActionCell(row);
    updateMetrics();
    applyFilters();
    closeDialog('certificate-status-dialog');
    showToast(`已撤回证书：${row.dataset.name}，可重新提交。`);
    return;
  }
  row.dataset.status = '已归档';
  updateStatusCell(row);
  updateActionCell(row);
  updateMetrics();
  applyFilters();
  closeDialog('certificate-status-dialog');
  showToast(`已归档证书：${row.dataset.name}，历史版本与审核结论保留。`);
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

function updateStatusCell(row) {
  const cell = row.querySelector('[data-cell="review"]');
  if (!cell) return;
  cell.innerHTML = `<span class="tag ${statusClass(row.dataset.status)}">${row.dataset.status}</span>`;
}

function updateActionCell(row) {
  const cell = row.querySelector('[data-cell="actions"]');
  if (!cell) return;
  // UI v1.2：审核通过可直接重传（新版本独立审核，旧结论归属旧版本）；驳回与已过期同样可重传。
  const reupload = ['审核通过', '审核不通过'].includes(row.dataset.status) || row.dataset.validity === '已过期';
  const review = row.dataset.status === '待审核';
  // UI v1.2 状态—操作矩阵：未引用且未审核可撤回；已审核或已被课程/排课引用只能归档。
  const archived = row.dataset.status === '已归档';
  const withdraw = ['已录入', '待审核'].includes(row.dataset.status) && row.dataset.referenced !== '是';
  const archive = ['审核通过', '审核不通过'].includes(row.dataset.status) || row.dataset.referenced === '是';
  cell.innerHTML = `${review ? '<button type="button" class="text-button" data-action="review">审核</button>' : ''}${reupload && !archived ? '<button type="button" class="text-button" data-action="reupload">重新上传</button>' : ''}<button type="button" class="text-button" data-action="view">查看</button>${withdraw ? '<button type="button" class="text-button" data-action="withdraw">撤回</button>' : ''}${archive && !archived ? '<button type="button" class="text-button" data-action="archive">归档</button>' : ''}<button type="button" class="text-button danger-link" data-action="delete">删除</button>`;
}

function updateMetrics() {
  const count = (selector) => rows.filter((row) => row.isConnected && row.matches(selector)).length;
  text('metric-pending', count('[data-status="待审核"]'));
  text('metric-rejected', count('[data-status="审核不通过"]'));
  text('metric-expiring', count('[data-validity="即将过期"]'));
  text('metric-expired', count('[data-validity="已过期"]'));
}

function applyFilters() {
  const status = document.querySelector('#certificate-status')?.value || '';
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
      && (!source || row.dataset.source === source)
      && (!start || row.dataset.expiry >= start)
      && (!end || row.dataset.expiry <= end);
    row.hidden = !matches;
    if (matches) visible += 1;
  });

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
  text('detail-source', data.source);
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
  // UI v1.2 §3.1-4：新版本被驳回时回退到最近一次审核通过版本；没有通过版本则不再满足准入，按目标专业重算资质校验。
  if (result === 'reject' && activeRow.dataset.previousStatus === '审核通过') {
    activeRow.dataset.status = '审核通过';
    activeRow.dataset.rejectedFileVersion = activeRow.dataset.fileVersion || '';
    activeRow.dataset.reviewNote = note;
    activeRow.dataset.reviewer = '李教研';
    activeRow.dataset.reviewedAt = '';
    updateStatusCell(activeRow); updateActionCell(activeRow); updateMetrics(); applyFilters();
    closeDialog('review-dialog');
    showToast('新版本被驳回，已回退到最近审核通过版本，发布与排课按该版本重算资质。');
    return;
  }
  const noApprovedVersion = result === 'reject' && activeRow.dataset.previousStatus !== '审核通过';
  activeRow.dataset.status = result === 'pass' ? '审核通过' : '审核不通过';
  activeRow.dataset.reviewNote = note || '证书文件和证书信息已核验。';
  activeRow.dataset.reviewer = '李教研';
  activeRow.dataset.reviewedAt = '2026-09-08 15:20';
  updateStatusCell(activeRow);
  updateActionCell(activeRow);
  updateMetrics();
  applyFilters();
  closeDialog('review-dialog');
  showToast(result === 'pass' ? '证书审核通过，列表已更新。' : (noApprovedVersion ? '证书已驳回；无审核通过版本，该证书不再满足资质要求，发布与排课按目标专业重新校验。' : '证书已驳回，已保留驳回原因。'));
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
      ({preview: openPreview, download: () => showToast(`已准备下载：${row.dataset.file}`), review: openReview, reupload: openReupload, view: openDetail, delete: openDelete, withdraw: (target) => openStatusConfirm(target, 'withdraw'), archive: (target) => openStatusConfirm(target, 'archive')}[actionElement.dataset.action])?.(row);
    }
  }
  if (event.target.closest('[data-dialog-close]')) {
    const current = event.target.closest('dialog');
    current?.close();
  }
  if (event.target.matches('[data-review-result]')) handleReview(event.target.dataset.reviewResult);
  if (event.target.id === 'detail-preview' && activeRow) { closeDialog('detail-dialog'); openPreview(activeRow); }
  if (event.target.id === 'delete-confirm' && activeRow) {
    const deletedName = activeRow.dataset.name;
    activeRow.remove();
    closeDialog('delete-dialog');
    activeRow = null;
    updateMetrics();
    applyFilters();
    showToast(`已删除证书：${deletedName}`);
  }
  if (event.target.id === 'certificate-status-confirm') confirmCertificateStatus(event.target.dataset.confirmAction);
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
  if (activeRow.children[10]) activeRow.children[10].textContent = activeRow.dataset.fileVersion;
  if (activeRow.children[8]) activeRow.children[8].textContent = activeRow.dataset.source;
  updateStatusCell(activeRow);
  updateActionCell(activeRow);
  updateMetrics();
  applyFilters();
  closeDialog('reupload-dialog');
  showToast('证书已重新上传，等待教研主管审核。');
});

const params = new URLSearchParams(window.location.search);
const queryStatus = params.get('status');
const queryValidity = params.get('validity');
const queryTeacher = params.get('teacher');
if (queryStatus) document.querySelector('#certificate-status').value = queryStatus;
if (queryValidity) document.querySelector('#certificate-validity').value = queryValidity;
if (queryTeacher) document.querySelector('#certificate-teacher').value = queryTeacher;
updateMetrics();
applyFilters();
