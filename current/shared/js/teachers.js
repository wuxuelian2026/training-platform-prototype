import { relativePath } from './paths.js';
import { mountRichEditor } from './rich-editor.js';

const teacherRoot = document.querySelector('[data-teacher-page]');
const teacherPage = teacherRoot?.dataset.teacherPage;
let activeTeacherRow = null;
let activeContractRow = null;
let toastTimer;

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
  待完善: 'gray', 审核中: 'amber', 审核通过: 'brand', 已入职: 'green', 已离职: 'gray', 已冻结: 'gray',
  已签署: 'green', 待签署: 'amber', 签署中: 'brand', 即将到期: 'amber', 已到期: 'red', 已终止: 'gray', 无合同: 'gray',
  未激活: 'gray', 已激活: 'green', 冻结: 'gray', 已注销: 'gray', 草稿: 'gray'
}[value] || 'gray');

function statusTag(value) { return `<span class="tag ${tagClass(value)}">${value}</span>`; }

function confirmTeacherAction(row, action) {
  activeTeacherRow = row;
  const teacher = row.dataset.teacher;
  const copy = {
    freeze: ['冻结教师账号', '确认冻结该教师账号？冻结后教师将无法登录。', '确认冻结'],
    unfreeze: ['解冻教师账号', '确认解冻该教师账号？', '确认解冻'],
    resign: ['标记教师离职', '确认将该教师标记为离职？此操作不可撤销，账号将被注销。', '确认离职']
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
  const profileCell = row.querySelector('[data-cell="profile-status"]');
  const accountCell = row.querySelector('[data-cell="account-status"]');
  const actionCell = row.querySelector('[data-cell="actions"]');
  if (action === 'freeze') {
    row.dataset.accountStatus = '冻结';
    if (accountCell) accountCell.innerHTML = statusTag('冻结');
  }
  if (action === 'unfreeze') {
    row.dataset.accountStatus = '已激活';
    if (accountCell) accountCell.innerHTML = statusTag('已激活');
  }
  if (action === 'resign') {
    row.dataset.profileStatus = '已离职';
    row.dataset.accountStatus = '已注销';
    if (profileCell) profileCell.innerHTML = statusTag('已离职');
    if (accountCell) accountCell.innerHTML = statusTag('已注销');
  }
  renderTeacherActions(row, actionCell);
}

function renderTeacherActions(row, cell) {
  if (!cell) return;
  const status = row.dataset.profileStatus;
  const account = row.dataset.accountStatus;
  const actions = ['<a class="link" href="/admin/pages/teachers/profile.html">查看</a>'];
  if (status === '待完善' || status === '已驳回') actions.push(`<a class="link" href="/admin/pages/teachers/create.html?mode=edit&teacher=${row.dataset.employeeNo}">编辑</a>`);
  if (status === '审核中') actions.push('<button type="button" class="text-button" data-action="review-profile">审核档案</button>');
  actions.push(`<a class="link" href="/admin/pages/teachers/certificates.html?teacher=${encodeURIComponent(row.dataset.teacher)}&status=待审核">审核证书</a>`);
  if (status === '已入职' || account === '已激活') actions.push(`<button type="button" class="text-button" data-action="start-contract">发起合同</button>`);
  if (status === '已入职' || row.dataset.contractStatus === '已签署') actions.push('<a class="link" href="/admin/pages/teachers/contracts.html">查看合同</a>');
  if (account === '冻结') actions.push('<button type="button" class="text-button" data-action="unfreeze">解冻</button>');
  else if (status === '已入职') actions.push('<button type="button" class="text-button danger-link" data-action="freeze">冻结</button>');
  if (status === '已入职' || account === '冻结') actions.push('<button type="button" class="text-button danger-link" data-action="resign">离职</button>');
  cell.innerHTML = actions.join('');
}

function applyTeacherFilters() {
  const form = document.querySelector('#teacher-filter');
  const status = form?.querySelector('[name="status"]')?.value || '';
  const category = form?.querySelector('[name="category"]')?.value || '';
  const keyword = (form?.querySelector('[name="keyword"]')?.value || '').trim();
  const start = form?.querySelector('[name="start"]')?.value || '';
  const end = form?.querySelector('[name="end"]')?.value || '';
  const rows = [...document.querySelectorAll('tr[data-teacher-id]')];
  let visible = 0;
  rows.forEach((row) => {
    const matches = (!status || row.dataset.profileStatus === status)
      && (!category || row.dataset.category === category)
      && (!keyword || `${row.dataset.teacher}${row.dataset.employeeNo}${row.dataset.phone}`.includes(keyword))
      && (!start || row.dataset.hiredAt >= start)
      && (!end || row.dataset.hiredAt <= end);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const empty = document.querySelector('.teacher-empty-row');
  if (empty) empty.hidden = visible !== 0;
  text('teacher-count', `共28名教师 · 当前筛选显示${visible}名 · 默认按入职日期降序`);
}

function initTeacherList() {
  const form = document.querySelector('#teacher-filter');
  form?.addEventListener('submit', (event) => { event.preventDefault(); applyTeacherFilters(); });
  form?.addEventListener('reset', () => window.setTimeout(applyTeacherFilters));
  document.querySelectorAll('tr[data-teacher-id]').forEach((row) => renderTeacherActions(row, row.querySelector('[data-cell="actions"]')));
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const row = event.target.closest('tr[data-teacher-id]');
    if (!action || !row) return;
    if (['freeze', 'unfreeze', 'resign'].includes(action)) confirmTeacherAction(row, action);
    if (action === 'review-profile') toast(`已打开${row.dataset.teacher}的档案审核入口`);
    if (action === 'start-contract') { window.location.href = relativePath(`/admin/pages/teachers/contracts.html?teacher=${encodeURIComponent(row.dataset.teacher)}&action=create`); }
  });
  document.querySelector('#teacher-action-confirm')?.addEventListener('click', (event) => {
    if (!activeTeacherRow) return;
    updateTeacherRow(activeTeacherRow, event.currentTarget.dataset.action);
    closeDialog('teacher-action-dialog');
    toast(event.currentTarget.dataset.action === 'resign' ? '教师已标记为离职，账号已注销。' : '教师账号状态已更新。');
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
    toast('教师档案已提交，状态变更为“审核中”。');
  });
  form?.querySelector('[data-action="save-draft"]')?.addEventListener('click', () => toast('教师档案草稿已保存。'));
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

function initContracts() {
  const form = document.querySelector('#contract-filter');
  const rows = [...document.querySelectorAll('tr[data-contract-id]')];
  const apply = () => {
    const status = form?.querySelector('[name="status"]')?.value || '';
    const type = form?.querySelector('[name="type"]')?.value || '';
    const teacher = (form?.querySelector('[name="teacher"]')?.value || '').trim();
    let visible = 0;
    rows.forEach((row) => {
      const matches = (!status || row.dataset.status === status) && (!type || row.dataset.type === type) && (!teacher || row.dataset.teacher.includes(teacher));
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    const empty = document.querySelector('.contract-empty-row');
    if (empty) empty.hidden = visible !== 0;
    text('contract-count', `共${rows.length}份合同 · 当前筛选显示${visible}份`);
  };
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
      text('contract-detail-teacher', data.teacher); text('contract-detail-number', data.number); text('contract-detail-status', data.status); text('contract-detail-term', data.term); text('contract-detail-rate', `¥${data.rate} / 课时`); text('contract-detail-note', data.note || '暂无备注。');
      const status = document.querySelector('#contract-detail-status'); if (status) status.className = `tag ${tagClass(data.status)}`;
      openDialog('contract-detail-dialog');
    }
    if (action === 'download') toast(`已准备下载合同：${row.dataset.number}`);
    if (action === 'remind') { openDialog('contract-action-dialog'); text('contract-action-title', '发送催签提醒'); text('contract-action-copy', `确认向${row.dataset.teacher}发送合同催签提醒？`); document.querySelector('#contract-action-confirm').dataset.action = 'remind'; }
    if (action === 'terminate') { openDialog('contract-action-dialog'); text('contract-action-title', '终止合同'); text('contract-action-copy', '确认终止该合同？终止前必须填写原因。'); document.querySelector('#contract-action-confirm').dataset.action = 'terminate'; }
    if (action === 'renew') { openDialog('contract-form-dialog'); text('contract-form-title', '续签合同'); const teacher = document.querySelector('#contract-teacher'); if (teacher) teacher.value = row.dataset.teacher; }
    if (action === 'start') openDialog('contract-form-dialog');
  });
  document.querySelector('#contract-action-confirm')?.addEventListener('click', (event) => {
    if (!activeContractRow) return;
    if (event.currentTarget.dataset.action === 'terminate' && !document.querySelector('#contract-action-note')?.value.trim()) {
      toast('终止合同必须填写原因。', 'error');
      return;
    }
    if (event.currentTarget.dataset.action === 'terminate') {
      activeContractRow.dataset.status = '已终止';
      const statusCell = activeContractRow.querySelector('[data-cell="status"]'); if (statusCell) statusCell.innerHTML = statusTag('已终止');
      activeContractRow.querySelector('[data-contract-action="terminate"]')?.remove();
      closeDialog('contract-action-dialog'); apply(); toast('合同已终止。');
    } else {
      closeDialog('contract-action-dialog'); toast('已发送催签提醒。');
    }
  });
  document.querySelector('#contract-form')?.addEventListener('submit', (event) => { event.preventDefault(); closeDialog('contract-form-dialog'); toast('合同草稿已保存，已生成预览。'); });
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
  document.querySelectorAll('[data-month-action]').forEach((button) => button.addEventListener('click', () => { text('schedule-month', button.dataset.monthAction === 'prev' ? '2026年8月' : '2026年10月'); toast(`已切换至${button.dataset.monthAction === 'prev' ? '2026年8月' : '2026年10月'}演示视图。`); }));
  apply();
}

function initProfile() {
  document.querySelectorAll('[data-profile-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.profileAction;
    if (action === 'freeze' || action === 'resign') toast(action === 'freeze' ? '已打开冻结确认。' : '已打开离职确认。');
  }));
}

document.addEventListener('click', (event) => { if (event.target.closest('[data-dialog-close]')) event.target.closest('dialog')?.close(); });

if (teacherPage === 'list') initTeacherList();
if (teacherPage === 'create') initTeacherCreate();
if (teacherPage === 'contracts') initContracts();
if (teacherPage === 'schedule') initSchedule();
if (teacherPage === 'profile') initProfile();
