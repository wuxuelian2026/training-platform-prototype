import { demoId, demoTime, readDemoState, resetDemoData, subscribeDemoState, updateDemoRecord, upsertDemoRecord } from './demo-store.js';
import { cloneClassSeed } from './class-seed.js';
import { cloneCourseCatalogSeed } from './course-catalog-seed.js';
import { cloneProductSeed } from './product-seed.js';
import { mergePeriods, mergeVenues, resolveSlotId, resolveVenueId } from './venue-seed.js';

const businessRoot = document.querySelector('[data-business-page]');
const businessPage = businessRoot?.dataset.businessPage;
let businessData = null;
let businessActive = null;
let businessToastTimer;

const professionalOptions = ['音乐类', '舞蹈类', '美术类', '戏剧类'];
// RM-F-01: the mall module no longer keeps its own course copy — it reads the shared publishable catalog.
const courseCatalog = cloneCourseCatalogSeed();
const businessParams = new URLSearchParams(window.location.search);
const dataSets = {
  products: cloneProductSeed(),
  orders: [
    { id: 'order-video', number: 'OD202609080001', name: '声乐演唱技巧', type: '视频课程', student: '林知夏', amount: '1280.00', status: '已支付', fulfillment: '学习中', linked: '学习权限：生效', time: '2026-09-08 10:18' },
    { id: 'order-offline', number: 'OD202609060008', name: '少儿中国舞基础班', type: '面授课程', student: '周子涵', amount: '1680.00', status: '待支付', fulfillment: '待分班', linked: '秋季一班', time: '2026-09-06 15:22' },
    { id: 'order-refund', number: 'OD202609050003', name: '成人声乐班', type: '面授课程', student: '刘女士', amount: '2280.00', status: '退款中', fulfillment: '已分班', linked: '周末班', time: '2026-09-05 11:08' }
  ],
  batches: [
    { id: 'batch-autumn', name: '2026年秋季艺术培训', season: '秋季', start: '2026-09-01', end: '2027-01-30', classes: '12', status: '进行中' },
    { id: 'batch-summer', name: '2026年暑期艺术培训', season: '暑假', start: '2026-07-01', end: '2026-08-31', classes: '8', status: '已结束' },
    { id: 'batch-winter', name: '2027年寒假艺术培训', season: '寒假', start: '2027-02-01', end: '2027-02-28', classes: '0', status: '未开始' },
    { id: 'batch-spring', name: '2027年春季艺术培训', season: '春季', start: '2027-03-01', end: '2027-06-30', classes: '0', status: '未开始' }
  ],
  classes: cloneClassSeed(),
  trials: [
    { id: 'trial-zhou', student: '周子涵', phone: '139****8612', course: '少儿中国舞基础班', time: '2026-09-12 09:00', campus: '龙泉校区', status: '待确认', source: '后台登记', owner: '赵顾问' },
    { id: 'trial-li', student: '李思远', phone: '138****5541', course: '成人声乐班', time: '2026-09-06 14:00', campus: '南湖校区', status: '已试听', source: '后台登记', owner: '赵顾问' },
    { id: 'trial-he', student: '何安', phone: '137****3130', course: '少儿美术启蒙班', time: '2026-09-15 18:30', campus: '南湖校区', status: '已确认', source: '后台登记', owner: '赵顾问' }
  ],
  leads: [
    { id: 'lead-zhou', number: 'CL20260908012', student: '周女士', phone: '139****8612', course: '少儿中国舞基础班', source: '咨询', status: '跟进中', next: '2026-09-09', owner: '赵顾问' },
    { id: 'lead-li', number: 'CL20260907008', student: '李先生', phone: '138****5541', course: '成人声乐班', source: '后台登记试听', status: '跟进中', next: '2026-09-12', owner: '赵顾问' },
    { id: 'lead-he', number: 'CL20260905003', student: '何女士', phone: '137****3130', course: '少儿美术启蒙班', source: '咨询', status: '已转化', next: '—', owner: '赵顾问' },
    { id: 'lead-sun', number: 'CL20260904006', student: '孙先生', phone: '136****7192', course: '中国画基础', source: '咨询', status: '已流失', next: '—', owner: '赵顾问' }
  ],
  conversions: [
    { id: 'conversion-li', number: 'CL20260907008', student: '李先生', course: '成人声乐班', time: '2026-09-07', trial: '已试听', status: '已报名', className: '周末班', owner: '赵顾问' },
    { id: 'conversion-zhou', number: 'CL20260908012', student: '周女士', course: '少儿中国舞基础班', time: '2026-09-08', trial: '待试听', status: '未转化', className: '—', owner: '赵顾问' },
    { id: 'conversion-sun', number: 'CL20260904006', student: '孙先生', course: '中国画基础', time: '2026-09-04', trial: '已试听', status: '未转化', className: '—', owner: '赵顾问' }
  ],
};

function sharedCourseCatalog() {
  const shared = readDemoState();
  const rows = [...(shared.courses || []).filter(item => item.status === '已完成'), ...(shared.library || []).filter(item => item.archive === '轻量课程档案')];
  rows.forEach(item => {
    const id = item.archive === '轻量课程档案' ? item.id : item.id;
    if (!courseCatalog.some(course => course.id === id)) courseCatalog.push({ id, name: item.name, type: item.type, archive: item.archive || '完整课程', status: item.status, major: item.major, teacher: item.teacher, hours: item.hours });
  });
  return shared;
}
function syncSharedBusinessData() {
  const shared = sharedCourseCatalog();
  const appendOrUpdate = (collection, rows) => (rows || []).forEach(row => {
    const index = dataSets[collection].findIndex(item => item.id === row.id);
    if (index < 0) dataSets[collection].unshift({ ...row });
    else if (row.id.startsWith('product-') || row.id.startsWith('class-')) dataSets[collection][index] = { ...dataSets[collection][index], ...row };
  });
  appendOrUpdate('products', shared.products);
  appendOrUpdate('classes', shared.classes);
  const dynamicOrders = (shared.orders || []).map(order => {
    const course = courseCatalog.find(item => item.id === order.courseId);
    const classRecord = (shared.classes || []).find(item => item.id === order.classId);
    const student = (shared.students || []).find(item => item.id === order.studentId);
    const account = (shared.accounts || []).find(item => item.id === order.accountId);
    const isClass = course?.type === '面授课程' || Boolean(order.classId);
    // RM-F-07 / I1-DEC-25: video orders are keyed by the purchasing account, never a placeholder label.
    return { id: `shared-${order.id}`, number: order.id, name: classRecord?.name || course?.name || order.courseName || order.courseId, type: isClass ? '面授课程' : '视频课程', student: isClass ? (student?.name || order.studentName || '—') : (account?.name || order.accountName || order.accountId || '—'), account: isClass ? '' : (account?.name || order.accountName || order.accountId || '—'), accountPhone: isClass ? '' : (account?.phone || ''), amount: Number(order.amount || 0).toFixed(2), status: order.status, fulfillment: order.status === '已支付' ? (isClass ? '已分班' : '学习中') : (isClass ? '待分班' : '待开通'), linked: isClass ? (classRecord?.name || '待分班') : (order.status === '已支付' ? '学习权限：已开通' : '学习权限：未开通'), time: order.createdAt || demoTime(), accountId: order.accountId, sourceOrderId: order.id };
  });
  dynamicOrders.forEach(row => {
    const index = dataSets.orders.findIndex(item => item.id === row.id);
    if (index < 0) dataSets.orders.unshift(row); else dataSets.orders[index] = { ...dataSets.orders[index], ...row };
  });
  return shared;
}
function persistProduct(record) { upsertDemoRecord('products', record); }
function persistClass(record) { upsertDemoRecord('classes', record); }
syncSharedBusinessData();

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const statusClass = (value) => ({ 已上架: 'green', 已下架: 'gray', 草稿: 'gray', 已支付: 'green', 待支付: 'amber', 退款中: 'amber', 已退款: 'gray', 已取消: 'gray', 进行中: 'brand', 已结束: 'gray', 未开始: 'gray', 招生中: 'brand', 已满员: 'amber', 未发布: 'gray', 已展示: 'green', 待确认: 'amber', 已确认: 'brand', 已试听: 'green', 已报名: 'green', 已放弃: 'gray', 待分班: 'amber', 已分班: 'green', 学习中: 'brand', 已完成: 'green', 跟进中: 'brand', 已转化: 'green', 已流失: 'gray', 未转化: 'amber' }[value] || 'gray');
const tag = (value) => `<span class="tag ${statusClass(value)}">${escapeHtml(value)}</span>`;

function showToast(message, kind = 'success') {
  const element = document.querySelector('[data-business-toast]'); if (!element) return;
  element.textContent = message; element.dataset.kind = kind; element.hidden = false;
  window.clearTimeout(businessToastTimer); businessToastTimer = window.setTimeout(() => { element.hidden = true; }, 2800);
}
function closeBusinessDialog() { document.querySelector('[data-business-dialog]')?.remove(); }
function openBusinessDialog(title, subtitle, body, actions = '<button type="button" class="button" data-dialog-close>关闭</button>') {
  closeBusinessDialog();
  const dialog = document.createElement('dialog'); dialog.className = 'sales-dialog'; dialog.dataset.businessDialog = 'true';
  dialog.innerHTML = `<div class="sales-dialog-card"><div class="sales-dialog-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button type="button" class="icon-button" data-dialog-close title="关闭" aria-label="关闭">×</button></div>${body}<div class="sales-dialog-actions">${actions}</div></div>`;
  document.body.append(dialog); dialog.showModal(); return dialog;
}

function pageFrame(title, description, controls, content) {
  const contentRoot = businessRoot;
  if (!contentRoot) return;
  contentRoot.innerHTML = `<div class="sales-page"><div class="page-head"><div><h1>${title}</h1><p>${description}</p></div>${controls || ''}</div>${content}<div class="toast" data-business-toast role="status" aria-live="polite" hidden></div></div>`;
}
function filterPanel(id, fields) {
  return `<div class="filter-panel" data-filter-drawer-shell="${id}"><button type="button" class="button filter-drawer-trigger" data-filter-drawer-trigger="${id}" aria-expanded="false" aria-controls="${id}"><span class="filter-trigger-icon" aria-hidden="true"></span>筛选条件</button><div class="filter-drawer-backdrop" data-filter-drawer-backdrop="${id}" hidden></div><form class="card filter-form" id="${id}"><div class="filter-head"><strong>筛选条件</strong><span>列表默认按业务时间降序</span><button type="button" class="icon-button filter-drawer-close" data-filter-drawer-close="${id}" title="关闭筛选条件" aria-label="关闭筛选条件">×</button></div><div class="filter-grid sales-filter-grid">${fields}</div><div class="filter-actions"><button type="reset" class="button">重置</button><button type="submit" class="button primary">查询</button></div></form></div>`;
}
function selectField(label, name, options, wide = false) { return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><select name="${name}"><option value="">全部${label}</option>${options.map((option) => `<option>${option}</option>`).join('')}</select></label>`; }
function inputField(label, name, placeholder = '', wide = false) { return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><input name="${name}" placeholder="${placeholder}"></label>`; }
function metricCards(cards) { return `<div class="card-grid compact-metrics">${cards.map(([label, value, note, progress]) => `<div class="card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div>${progress ? `<div class="metric-progress"><span style="width:${progress}%"></span></div>` : ''}</div>`).join('')}</div>`; }
function table(content, emptyText = '暂无符合条件的数据，请调整筛选条件后重试。') { return `<div class="table-wrap"><table>${content}<tbody class="table-body"></tbody></table></div><div class="pagination-bar"><span class="result-count">—</span><button class="button" disabled>上一页</button><button class="button primary">1</button><button class="button" disabled>下一页</button><select aria-label="每页条数"><option>20条 / 页</option><option>50条 / 页</option><option>100条 / 页</option></select></div><template data-empty-template><tr class="table-empty"><td colspan="20"><div class="empty">${emptyText}</div></td></tr></template>`; }
function renderRows(rows, columns, filter) {
  const contentRoot = businessRoot;
  const body = contentRoot?.querySelector('.table-body'); if (!body) return;
  const visible = rows.filter(filter);
  body.innerHTML = visible.length ? visible.map((row) => `<tr data-row-id="${row.id}">${columns(row)}</tr>`).join('') : '<tr class="table-empty"><td colspan="20"><div class="empty">暂无符合条件的数据，请调整筛选条件后重试。</div></td></tr>';
  const count = contentRoot.querySelector('.result-count'); if (count) count.textContent = `当前筛选显示${visible.length}条`;
}

function businessCourse(id = businessParams.get('courseId')) { return courseCatalog.find(item => item.id === id) || null; }
function requiredInput(label, name, value = '', type = 'text', placeholder = '') { return `<label class="form-field"><span>${label}<b class="required-mark">*</b></span><input name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${placeholder}"${type === 'number' ? ' min="0" step="0.01"' : ''} required></label>`; }
function requiredSelect(label, name, options, value = '') { return `<label class="form-field"><span>${label}<b class="required-mark">*</b></span><select name="${name}" required><option value="">请选择${label}</option>${options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`; }
function courseSummary(course, note) { return `<div class="sales-dialog-summary sales-course-summary"><div><span>课程主体</span><strong>${escapeHtml(course?.name || '未带入课程')}</strong><small>${escapeHtml(course?.id || '请从课程库进入发布')}</small></div><div><span>课程类型 / 档案</span><strong>${escapeHtml(course?.type || '—')}</strong><small>${escapeHtml(course?.archive || '—')}</small></div><div><span>教师 / 总课时</span><strong>${escapeHtml(course ? `${course.teacher} · ${course.hours}课时` : '—')}</strong><small>${escapeHtml(note || '课程主体只读带入')}</small></div></div>`; }
function checkBusinessForm(form) { if (!form.reportValidity()) return false; return true; }

function openProductForm(row = null) {
  const course = businessCourse(row?.courseId || businessParams.get('courseId'));
  const videoCourses = courseCatalog.filter(item => item.type === '视频课程' && (item.archive === '完整课程' || item.status === '已完成'));
  const courseField = course
    ? `${courseSummary(course, '仅允许已完成的视频课程发布商品')}<input type="hidden" name="courseId" value="${escapeHtml(course.id)}">`
    : requiredSelect('关联课程', 'courseId', videoCourses.map(item => item.name));
  const body = `<form id="business-dialog-form" class="sales-dialog-grid">${courseField}${requiredInput('商品名称', 'name', row?.name || course?.name || '', 'text', '请输入商品名称')}${requiredInput('售价', 'price', row?.price || '', 'number', '请输入售价')}<label class="form-field"><span>试看策略<b class="required-mark">*</b></span><select name="preview" id="preview-policy" required><option ${row?.preview !== '允许试看' ? 'selected' : ''}>不允许试看</option><option ${row?.preview === '允许试看' ? 'selected' : ''}>允许试看</option></select></label><label class="form-field"><span>试看课时<b class="required-mark">*</b></span><select name="previewHours" id="preview-hours" required ${row?.preview !== '允许试看' ? 'disabled' : ''}><option ${row?.previewHours === '第1课时' ? 'selected' : ''}>第1课时</option></select></label>${inputField('推荐语', 'recommend', '请输入前台推荐语', true)}<label class="form-field"><span>上下架时间</span><input name="shelfAt" value="${escapeHtml(row?.shelfAt || '')}" placeholder="YYYY-MM-DD HH:mm"></label>${row ? '<p class="wide sales-form-note">已上架商品改价只影响生效后的新订单，已支付订单保留成交金额；每次价格或售卖配置变更都会写入调价记录。</p>' : ''}</form>`;
  const dialog = openBusinessDialog(row ? '编辑商品' : '发布商品', '从课程库带入课程主体；视频商品只允许一门课程一个有效商品。', body, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="business-dialog-form" class="button primary">保存草稿</button>');
  const preview = dialog.querySelector('#preview-policy'); const previewHours = dialog.querySelector('#preview-hours');
  preview?.addEventListener('change', () => { previewHours.disabled = preview.value !== '允许试看'; if (previewHours.disabled) previewHours.value = ''; else previewHours.value = '第1课时'; });
  dialog.querySelector('#business-dialog-form')?.addEventListener('submit', event => {
    event.preventDefault(); if (!checkBusinessForm(event.currentTarget)) return;
    const data = new FormData(event.currentTarget); const selected = businessCourse(data.get('courseId')) || videoCourses.find(item => item.name === data.get('courseId'));
    if (!selected || selected.type !== '视频课程' || selected.status !== '已完成') { showToast('只能从已完成的视频课程发布商品', 'error'); return; }
    // I1-DEC-26 / RM-F-06: one course keeps exactly one product subject — reuse it instead of adding a second.
    const duplicate = dataSets.products.find(item => item.courseId === selected.id && item.id !== row?.id);
    if (duplicate) {
      showToast(`课程“${selected.name}”已有商品（${duplicate.status}），请复用原商品改价复售，不能新建第二条`, 'error');
      closeBusinessDialog();
      openProductForm(duplicate);
      return;
    }
    const nextPrice = Number(data.get('price')).toFixed(2);
    const priceChanged = Boolean(row) && Number(row.price) !== Number(nextPrice);
    const priceChanges = row ? [...(row.priceChanges || [])] : [];
    if (priceChanged) priceChanges.unshift({ at: demoTime(), operator: '平台运营', from: '¥' + Number(row.price).toFixed(2), to: '¥' + nextPrice });
    const record = { id: row?.id || demoId('product'), courseId: selected.id, name: String(data.get('name')).trim(), course: selected.name, price: nextPrice, sales: row?.sales || '0', status: row?.status || '草稿', updated: row?.updated || '—', preview: data.get('preview'), previewHours: data.get('previewHours'), recommend: String(data.get('recommend')).trim(), shelfAt: String(data.get('shelfAt') || '').trim(), priceChanges };
    if (row) Object.assign(row, record); else dataSets.products.unshift(record);
    persistProduct(record);
    closeBusinessDialog(); renderProducts(); showToast(row ? (priceChanged ? '商品信息已保存；本次调价已写入变更记录，只影响生效后的新订单' : '商品信息已保存') : '商品草稿已保存，已加入商品列表');
  });
}

// I1-O-03 / I1-O-06: structured weekly schedule plus generated lesson sessions.
const classWeekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
function parseClassSchedule(text) {
  const match = String(text || '').match(/每(周[一二三四五六日])\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  return { weekday: match ? match[1] : '', start: match ? match[2] : '', end: match ? match[3] : '' };
}
function composeClassSchedule(weekday, start, end) { return weekday && start && end ? `每${weekday} ${start}-${end}` : ''; }
function addWeeks(dateText, weeks) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}
// E06: every generated session carries venue, time slot and start/end so it can be placed in the matrix
// without parsing the human-readable schedule text.
function buildClassSessions(lessons, weekday, start, end, firstDate, classroom, semester = '2026秋季') {
  const total = Number(lessons) || 0;
  if (!total || !weekday || !start || !end || !firstDate) return [];
  const shared = readDemoState();
  const roomId = resolveVenueId(classroom, mergeVenues(shared));
  const slotId = resolveSlotId(weekday, start, end, mergePeriods(shared, semester));
  return Array.from({ length: total }, (_, index) => ({ index: index + 1, date: addWeeks(firstDate, index), weekday, startTime: start, endTime: end, start, end, roomId, slotId, semester, status: '待上课' }));
}
function findClassConflicts(record) {
  return dataSets.classes.filter(row => row.id !== record.id && row.display !== '已下架' && row.weekday === record.weekday && row.startTime && record.startTime && row.startTime < record.endTime && record.startTime < row.endTime)
    .filter(row => row.teacher === record.teacher || (row.campus === record.campus && row.classroom === record.classroom));
}
function openClassForm(row = null) {
  const course = businessCourse(row?.courseId || businessParams.get('courseId'));
  const classCourses = courseCatalog.filter(item => item.type === '面授课程');
  const courseField = course
    ? `${courseSummary(course, course.archive === '完整课程' ? '完整课程需已完成编排' : '轻量课程档案可直接发布班级')}<input type="hidden" name="courseId" value="${escapeHtml(course.id)}">`
    : requiredSelect('关联课程', 'courseId', classCourses.map(item => item.name));
  const scheduleParts = parseClassSchedule(row?.schedule);
  const body = `<form id="business-dialog-form" class="sales-dialog-grid">${courseField}${requiredInput('班级名称', 'name', row?.name || '', 'text', '请输入班级名称')}${requiredSelect('所属批次', 'batch', ['春季', '暑假', '秋季', '寒假'], row?.batch)}${requiredInput('授课教师', 'teacher', row?.teacher || course?.teacher || '', 'text', '请输入授课教师')}${requiredSelect('校区', 'campus', ['龙泉校区', '南湖校区'], row?.campus)}${requiredInput('教室', 'classroom', row?.classroom || '', 'text', '如综合楼302')}${requiredSelect('每周上课日', 'weekday', classWeekdays, scheduleParts.weekday)}${requiredInput('上课开始时间', 'startTime', scheduleParts.start, 'time', '')}${requiredInput('上课结束时间', 'endTime', scheduleParts.end, 'time', '')}${requiredInput('首次上课日期', 'firstLessonDate', row?.firstLessonDate || '', 'date', '')}${requiredInput('招生人数上限', 'capacity', row?.capacity || '', 'number', '请输入人数')}${requiredInput('价格', 'price', row?.price || '', 'number', '请输入价格')}${requiredInput('报名截止时间', 'deadline', row?.deadline?.replace(' ', 'T') || '', 'datetime-local', '')}<div class="form-field wide" data-class-schedule-hint><span>课次与冲突校验</span><p class="sales-conflict-hint" data-conflict-hint>选择课程、教师、教室、上课日后自动生成课次并校验冲突</p></div><label class="form-field wide sales-switch-field"><span>快速报名入口</span><span class="sales-switch-control"><input name="fast" type="checkbox" ${row?.fast === '是' ? 'checked' : ''}><em>开启后进入学员端“快速报名”Tab，关闭则进入精品课程</em></span></label></form>`;
  const dialog = openBusinessDialog(row ? '编辑班级' : '发布班级', '课程主体从课程库带入；保存后为未发布草稿，校验完整后再上架。', body, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="business-dialog-form" class="button primary">保存班级</button>');
  const form = dialog.querySelector('#business-dialog-form');
  const conflictHint = dialog.querySelector('[data-conflict-hint]');
  const refreshScheduleHint = () => {
    const data = new FormData(form);
    const selected = businessCourse(data.get('courseId')) || classCourses.find(item => item.name === data.get('courseId'));
    const preview = { id: row?.id || 'preview', display: row?.display || '未发布', teacher: String(data.get('teacher') || '').trim(), campus: data.get('campus'), classroom: String(data.get('classroom') || '').trim(), weekday: String(data.get('weekday') || ''), startTime: String(data.get('startTime') || ''), endTime: String(data.get('endTime') || '') };
    const lessons = Number(selected?.hours || row?.lessons || 0);
    const sessions = buildClassSessions(lessons, preview.weekday, preview.startTime, preview.endTime, String(data.get('firstLessonDate') || ''), preview.classroom);
    const conflicts = preview.weekday && preview.startTime && preview.endTime ? findClassConflicts(preview) : [];
    conflictHint.textContent = `${lessons ? `按课程总课时生成 ${sessions.length} 个课次` : '课程总课时缺失，暂不生成课次'}${conflicts.length ? ` · 冲突：${conflicts.map(item => item.name).join('、')}` : ' · 暂无教师或教室冲突'}`;
    conflictHint.classList.toggle('conflict', conflicts.length > 0);
  };
  form?.addEventListener('input', refreshScheduleHint);
  form?.addEventListener('change', refreshScheduleHint);
  refreshScheduleHint();
  dialog.querySelector('#business-dialog-form')?.addEventListener('submit', event => {
    event.preventDefault(); if (!checkBusinessForm(event.currentTarget)) return;
    const data = new FormData(event.currentTarget); const selected = businessCourse(data.get('courseId')) || classCourses.find(item => item.name === data.get('courseId'));
    if (!selected || selected.type !== '面授课程') { showToast('请选择面授课程后再保存', 'error'); return; }
    if (selected.archive === '完整课程' && selected.status !== '已完成') { showToast('完整课程需完成编排后才能发布班级', 'error'); return; }
    const weekday = String(data.get('weekday') || '');
    const startTime = String(data.get('startTime') || '');
    const endTime = String(data.get('endTime') || '');
    const firstLessonDate = String(data.get('firstLessonDate') || '');
    if (!weekday || !startTime || !endTime) { showToast('请完整填写每周上课日、开始时间和结束时间', 'error'); return; }
    if (startTime >= endTime) { showToast('上课结束时间需晚于开始时间', 'error'); return; }
    const record = { id: row?.id || demoId('class'), courseId: selected.id, archive: selected.archive, name: String(data.get('name')).trim(), course: selected.name, batch: data.get('batch'), teacher: String(data.get('teacher')).trim(), category: selected.major.includes('中国') ? '舞蹈类' : selected.major.includes('声乐') ? '音乐类' : '美术类', campus: data.get('campus'), classroom: String(data.get('classroom')).trim(), schedule: composeClassSchedule(weekday, startTime, endTime), weekday, startTime, endTime, firstLessonDate, price: Number(data.get('price')).toFixed(2), deadline: data.get('deadline').replace('T', ' '), enrolled: row?.enrolled || 0, capacity: data.get('capacity'), lessons: Number(selected.hours) || Number(row?.lessons) || 0, status: row?.status || '未发布', display: row?.display || '未发布', fast: data.get('fast') === 'on' ? '是' : '否', created: row?.created || new Date().toISOString().slice(0, 10) };
    // I1-O-06: sessions are generated from the course hours and the weekly schedule.
    record.sessions = buildClassSessions(record.lessons, weekday, startTime, endTime, firstLessonDate, record.classroom, record.batch === '暑假' ? '2026暑期' : '2026秋季');
    if (!row?.id) record.enrolled = 0;
    // I1-O-03: teacher and classroom conflicts block publishing until resolved.
    const conflicts = findClassConflicts(record);
    if (conflicts.length) { showToast(`排课冲突：${conflicts.map(item => `${item.name}（${item.teacher} · ${item.campus}${item.classroom}）`).join('、')}，请调整教师、教室或上课时间`, 'error'); return; }
    if (row) Object.assign(row, record); else dataSets.classes.unshift(record);
    persistClass(record);
    closeBusinessDialog(); renderClasses(); showToast(row ? '班级信息已保存' : '班级草稿已保存，已加入班级列表');
  });
}

function renderProducts() {
  // RM-U-03: a listed product keeps a visible edit entry so price, preview policy and shelf time
  // stay editable; the edit dialog annotates that re-pricing only affects later orders.
  const productRowActions = (status) => status === '已上架'
    ? '<button class="text-button" data-business-action="product-view">查看</button><button class="text-button" data-business-action="product-edit">编辑</button><button class="text-button danger-link" data-business-action="product-unpublish">下架</button>'
    : '<button class="text-button" data-business-action="product-edit">编辑</button><button class="text-button" data-business-action="product-publish">上架</button>';
  businessData = dataSets.products;
  const salesTotal = dataSets.products.reduce((sum, row) => sum + Number(row.sales || 0), 0);
  const metrics = metricCards([
    ['已上架', dataSets.products.filter(row => row.status === '已上架').length, '学员端可购买'],
    ['草稿', dataSets.products.filter(row => row.status === '草稿').length, '待完善售卖信息'],
    ['已下架', dataSets.products.filter(row => row.status === '已下架').length, '历史订单不受影响'],
    ['累计销售', salesTotal, '视频商品成交件数', Math.min(Math.round((salesTotal / 180) * 100), 100)]
  ]);
  pageFrame('视频课程商品', '配置价格、试看策略和前台上下架状态；同一课程只保留一条商品主体。', '<button class="button" data-business-action="demo-reset">重置演示数据</button><button class="button primary" data-business-action="product-create">发布商品</button>', metrics + filterPanel('product-filter', selectField('商品状态', 'status', ['草稿', '已上架', '已下架']) + inputField('关键词', 'keyword', '商品名称 / 关联课程', true)) + table('<thead><tr><th>商品名称</th><th>关联课程</th><th>售价</th><th>销售数量</th><th>商品状态</th><th>上架时间</th><th>操作</th></tr></thead>'));
  renderRows(businessData, (row) => `<td><a class="reference-link" href="#">${row.name}</a></td><td>${row.course}</td><td class="amount-cell">¥${row.price}</td><td class="amount-cell">${row.sales}</td><td>${tag(row.status)}</td><td>${row.updated}</td><td class="action-cell">${productRowActions(row.status)}</td>`, () => true);
  document.querySelector('#product-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const status = event.currentTarget.status.value; const keyword = event.currentTarget.keyword.value.trim(); renderRows(businessData, (row) => `<td><a class="reference-link" href="#">${row.name}</a></td><td>${row.course}</td><td class="amount-cell">¥${row.price}</td><td class="amount-cell">${row.sales}</td><td>${tag(row.status)}</td><td>${row.updated}</td><td class="action-cell">${productRowActions(row.status)}</td>`, (row) => (!status || row.status === status) && (!keyword || `${row.name}${row.course}`.includes(keyword))); });
}

function renderOrders() {
  businessData = dataSets.orders;
  pageFrame('统一订单管理', '统一查看视频课程和面授课程交易状态；视频订单按购买账号追溯，面授订单按账号＋学员展示。', '<button class="button" data-business-action="order-export">导出订单</button>', metricCards([['今日订单', '26', '视频与面授合计'], ['待支付', '1', '待完成支付'], ['退款中', '1', '仅面授订单允许'], ['已支付', '18', '交易已完成', 70]]) + filterPanel('order-filter', selectField('订单类型', 'type', ['视频课程', '面授课程']) + selectField('订单状态', 'status', ['待支付', '已支付', '已取消', '退款中', '已退款']) + selectField('关联状态', 'fulfillment', ['待分班', '已分班', '已取消', '学习中', '未开始', '已完成']) + inputField('关键词', 'keyword', '订单号 / 课程名称 / 购买账号', true)) + '<p class="ops-note">视频订单以购买账号为主体（不展示关联学员）；面授订单可在“关联状态”中查看分班进度。</p>' + table('<thead><tr><th>订单号</th><th>课程名称</th><th>课程类型</th><th>购买账号 / 学员</th><th>订单金额</th><th>订单状态</th><th>关联状态</th><th>关联班级 / 权限</th><th>下单时间</th><th>操作</th></tr></thead>'));
  const params = new URLSearchParams(window.location.search);
  // RM-F-07: video orders name the purchasing account; offline orders keep account + student.
  const rows = (row) => `<td>${row.number}</td><td>${row.name}</td><td>${row.type}</td><td>${row.type === '视频课程' ? `${row.account || row.student}${row.account ? `<span class="sub-cell">${row.accountPhone || ''}</span>` : ''}` : row.student}</td><td class="amount-cell">¥${row.amount}</td><td>${tag(row.status)}</td><td>${tag(row.fulfillment)}</td><td>${row.linked}</td><td>${row.time}</td><td><button class="text-button" data-business-action="order-view">查看详情</button></td>`;
  const filterRows = (form) => renderRows(businessData, rows, (row) => (!form.type.value || row.type === form.type.value) && (!form.status.value || row.status === form.status.value) && (!form.fulfillment.value || row.fulfillment === form.fulfillment.value) && (!form.keyword.value.trim() || `${row.number}${row.name}${row.student}${row.account || ''}`.includes(form.keyword.value.trim())));
  const form = document.querySelector('#order-filter');
  if (form && params.get('type') === 'offline') form.type.value = '面授课程';
  filterRows(form || { type: { value: '' }, status: { value: '' }, fulfillment: { value: '' }, keyword: { value: '' } });
  form?.addEventListener('submit', (event) => { event.preventDefault(); filterRows(event.currentTarget); });
}

function renderBatches() {
  businessData = dataSets.batches;
  pageFrame('批次管理', '系统每年固定生成春季、暑假、秋季、寒假四个批次，不支持新增或删除。', '', metricCards([['年度批次', '4', '固定批次规则'], ['进行中', '1', '当前招生季'], ['已结束', '1', '历史批次保留'], ['待发布班级', '2', '可进入班级管理']]) + filterPanel('batch-filter', selectField('招生季', 'season', ['春季', '暑假', '秋季', '寒假']) + selectField('批次状态', 'status', ['未开始', '进行中', '已结束']) + inputField('关键词', 'keyword', '批次名称', true)) + table('<thead><tr><th>批次名称</th><th>招生季</th><th>开始日期</th><th>结束日期</th><th>关联班级</th><th>状态</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td><a class="reference-link" href="/admin/pages/crm/classes.html">${row.name}</a></td><td>${row.season}</td><td>${row.start}</td><td>${row.end}</td><td>${row.classes}</td><td>${tag(row.status)}</td><td><a class="link" href="/admin/pages/crm/classes.html">查看班级</a></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#batch-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { season, status, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!season.value || row.season === season.value) && (!status.value || row.status === status.value) && (!keyword.value.trim() || row.name.includes(keyword.value.trim()))); });
}

function renderClasses() {
  businessData = dataSets.classes;
  const enrolledTotal = dataSets.classes.reduce((sum, row) => sum + Number(row.enrolled || 0), 0);
  const metrics = metricCards([
    ['招生中', dataSets.classes.filter(row => row.status === '招生中').length, '前台已展示'],
    ['已下架', dataSets.classes.filter(row => row.display === '已下架').length, '运营状态不变'],
    ['未发布', dataSets.classes.filter(row => row.status === '未发布').length, '待配置后发布'],
    ['已报名', enrolledTotal, '当前示例班级合计', Math.min(Math.round((enrolledTotal / 60) * 100), 100)]
  ]);
  pageFrame('面授班级', '班级运营状态和前台展示状态分别维护，快速报名只决定学员端入口。', '<button class="button primary" data-business-action="class-create">发布班级</button>', metrics + filterPanel('class-filter', selectField('班级状态', 'status', ['未发布', '招生中', '已满员', '进行中', '已结束']) + selectField('所属批次', 'batch', ['春季', '暑假', '秋季', '寒假']) + selectField('所属专业', 'category', professionalOptions) + selectField('前台展示状态', 'display', ['未发布', '已展示', '已下架']) + inputField('关键词', 'keyword', '班级名称 / 课程名称', true)) + table('<thead><tr><th>班级名称</th><th>关联课程</th><th>批次</th><th>教师</th><th>报名/容量</th><th>运营状态</th><th>前台展示</th><th>快速报名</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td><a class="reference-link" href="#">${row.name}</a></td><td>${row.course}</td><td>${row.batch}</td><td>${row.teacher}</td><td>${row.enrolled} / ${row.capacity}</td><td>${tag(row.status)}</td><td>${tag(row.display)}</td><td>${row.fast}</td><td class="action-cell">${row.status === '未发布' ? '<button class="text-button" data-business-action="class-edit">编辑</button><button class="text-button" data-business-action="class-publish">上架</button>' : row.display === '已展示' ? '<button class="text-button" data-business-action="class-view">查看</button><button class="text-button danger-link" data-business-action="class-unpublish">下架</button>' : '<button class="text-button" data-business-action="class-view">查看</button><button class="text-button" data-business-action="class-publish">上架</button>'}</td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#class-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, batch, category, display, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!batch.value || row.batch === batch.value) && (!category.value || row.category === category.value) && (!display.value || row.display === display.value) && (!keyword.value.trim() || `${row.name}${row.course}`.includes(keyword.value.trim()))); });
}

function renderTrials() {
  businessData = dataSets.trials;
  pageFrame('后台登记试听', '课程顾问根据咨询线索登记试听，学员端不提供自主预约入口。', '<button class="button primary" data-business-action="trial-create">登记试听</button>', metricCards([['待确认', '1', '需要确认试听时间'], ['已确认', '1', '已发送通知'], ['已试听', '1', '可进入报名转化'], ['本月试听', '12', '后台登记记录', 54]]) + filterPanel('trial-filter', selectField('试听状态', 'status', ['待确认', '已确认', '已试听', '已报名', '已放弃']) + selectField('目标课程', 'course', ['少儿中国舞基础班', '成人声乐班', '少儿美术启蒙班']) + selectField('校区', 'campus', ['龙泉校区', '南湖校区']) + inputField('关键词', 'keyword', '学员姓名 / 家长手机号', true)) + table('<thead><tr><th>学员姓名</th><th>家长手机号</th><th>目标课程</th><th>试听时间</th><th>校区</th><th>试听状态</th><th>来源</th><th>跟进人</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td>${row.student}</td><td>${row.phone}</td><td>${row.course}</td><td>${row.time}</td><td>${row.campus}</td><td>${tag(row.status)}</td><td>${row.source}</td><td>${row.owner}</td><td class="action-cell">${row.status === '待确认' ? '<button class="text-button" data-business-action="trial-confirm">确认试听</button>' : ''}<button class="text-button" data-business-action="trial-view">查看</button></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#trial-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, course, campus, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!course.value || row.course === course.value) && (!campus.value || row.campus === campus.value) && (!keyword.value.trim() || `${row.student}${row.phone}`.includes(keyword.value.trim()))); });
}

function renderLeads() {
  businessData = dataSets.leads;
  pageFrame('线索跟进', '管理咨询和后台登记试听产生的客户线索，状态按 PRD 数据字典维护。', '<button class="button primary" data-business-action="lead-create">新增线索</button>', metricCards([['待分配', '6', '等待负责人分配'], ['跟进中', '18', '今日待跟进8条'], ['已转化', '9', '已生成报名结果'], ['已流失', '3', '保留历史记录', 38]]) + filterPanel('lead-filter', selectField('线索状态', 'status', ['待分配', '跟进中', '已转化', '已流失']) + selectField('来源类型', 'source', ['咨询', '后台登记试听']) + inputField('关键词', 'keyword', '学员姓名 / 手机号', true)) + table('<thead><tr><th>线索编号</th><th>联系人</th><th>手机号</th><th>意向课程</th><th>来源</th><th>线索状态</th><th>下次跟进</th><th>负责人</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td>${row.number}</td><td>${row.student}</td><td>${row.phone}</td><td>${row.course}</td><td>${row.source}</td><td>${tag(row.status)}</td><td>${row.next}</td><td>${row.owner}</td><td class="action-cell"><button class="text-button" data-business-action="lead-follow">填写跟进</button>${row.status === '跟进中' ? '<button class="text-button" data-business-action="lead-trial">转为试听</button><button class="text-button" data-business-action="lead-enroll">转报名</button>' : ''}<button class="text-button" data-business-action="lead-view">查看</button></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#lead-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, source, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!source.value || row.source === source.value) && (!keyword.value.trim() || `${row.student}${row.phone}`.includes(keyword.value.trim()))); });
}

function renderConversions() {
  businessData = dataSets.conversions;
  pageFrame('报名转化', '追踪线索从咨询、试听到正式报名的转化结果。', '<button class="button" data-business-action="conversion-export">导出转化数据</button>', metricCards([['本月新线索', '128', '咨询与后台登记'], ['已试听', '42', '完成试听记录'], ['已报名', '26', '已生成面授订单', 62], ['报名转化率', '20.3%', '按本月新线索计算']]) + filterPanel('conversion-filter', selectField('转化状态', 'status', ['已报名', '未转化']) + selectField('目标课程', 'course', ['少儿中国舞基础班', '成人声乐班', '中国画基础']) + inputField('关键词', 'keyword', '学员姓名 / 手机号', true)) + table('<thead><tr><th>线索编号</th><th>联系人</th><th>意向课程</th><th>试听时间</th><th>试听状态</th><th>报名状态</th><th>报名班级</th><th>负责人</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td>${row.number}</td><td>${row.student}</td><td>${row.course}</td><td>${row.time}</td><td>${tag(row.trial)}</td><td>${tag(row.status)}</td><td>${row.className}</td><td>${row.owner}</td><td class="action-cell">${row.status === '未转化' ? '<button class="text-button" data-business-action="conversion-enroll">转报名</button>' : ''}<button class="text-button" data-business-action="conversion-view">查看</button></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#conversion-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, course, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!course.value || row.course === course.value) && (!keyword.value.trim() || `${row.student}${row.number}`.includes(keyword.value.trim()))); });
}

// I1-O-16: the class detail dialog also shows generated sessions and the live class roster.
function appendClassRosterSection(row) {
  const card = document.querySelector('.sales-dialog[data-business-dialog] .sales-dialog-card');
  if (!card) return;
  const shared = readDemoState();
  const enrollments = (shared.enrollments || []).filter(item => item.classId === row.id && item.status === '已报名');
  const students = shared.students || [];
  const sessions = Array.isArray(row.sessions) ? row.sessions : [];
  const sessionLine = sessions.length ? `${sessions.length} 次 · 首次 ${sessions[0].date} ${sessions[0].startTime}-${sessions[0].endTime} · 末次 ${sessions[sessions.length - 1].date}` : '尚未生成课次';
  const roster = enrollments.length
    ? enrollments.map(item => { const student = students.find(entry => entry.id === item.studentId); return `<tr><td>${escapeHtml(student?.name || item.studentId)}</td><td>${escapeHtml(item.accountId || '—')}</td><td>${escapeHtml(item.enrolledAt || '—')}</td><td>已报名 / 已分班</td></tr>`; }).join('')
    : '<tr><td colspan="4">暂无学员报名；学员支付成功后会自动分班并出现在此处。</td></tr>';
  const remaining = Math.max(0, Number(row.capacity || 0) - Number(row.enrolled || 0));
  const aggregateNote = Number(row.enrolled || 0) > enrollments.length ? `<p class="sales-roster-meta">汇总报名 ${Number(row.enrolled || 0)} 人；下列明细为演示数据中可展开的账号记录（${enrollments.length} 条）。</p>` : '';
  card.insertAdjacentHTML('beforeend', `<section class="sales-class-roster"><h3>课次与班级名单</h3><div class="sales-dialog-summary"><div><span>课次</span><strong>${sessions.length}</strong></div><div><span>已报名 / 容量</span><strong>${Number(row.enrolled || 0)} / ${Number(row.capacity || 0)}</strong></div><div><span>剩余名额</span><strong>${remaining}</strong></div></div><p class="sales-roster-meta">上课规则：${escapeHtml(row.schedule || '—')} · 课次：${escapeHtml(sessionLine)}</p>${aggregateNote}<div class="sales-table-wrap"><table><thead><tr><th>学员</th><th>登录账号</th><th>报名时间</th><th>状态</th></tr></thead><tbody>${roster}</tbody></table></div></section>`);
}

function openDetail(row, kind) {
  const labels = kind === 'product' ? [['商品名称', row.name], ['关联课程', row.course], ['售价', `¥${row.price}`], ['销售数量', row.sales], ['商品状态', row.status], ['上架时间', row.updated]] : kind === 'order' ? [['订单号', row.number], ['课程类型', row.type], ['学员', row.student], ['订单金额', `¥${row.amount}`], ['订单状态', row.status], ['关联状态', row.fulfillment], ['关联班级 / 权限', row.linked], ['下单时间', row.time]] : kind === 'class' ? [['班级名称', row.name], ['关联课程', row.course], ['授课教师', row.teacher], ['报名情况', `${row.enrolled} / ${row.capacity}`], ['运营状态', row.status], ['前台展示状态', row.display]] : kind === 'trial' ? [['学员', row.student], ['家长手机号', row.phone], ['目标课程', row.course], ['试听时间', row.time], ['校区', row.campus], ['试听状态', row.status]] : kind === 'lead' ? [['线索编号', row.number], ['联系人', row.student], ['手机号', row.phone], ['意向课程', row.course], ['来源', row.source], ['线索状态', row.status]] : [['线索编号', row.number], ['联系人', row.student], ['意向课程', row.course], ['试听状态', row.trial], ['报名状态', row.status], ['报名班级', row.className]];
  openBusinessDialog(`${kind === 'product' ? '商品' : kind === 'order' || kind === 'offline' ? '订单' : kind === 'class' ? '班级' : kind === 'trial' ? '试听预约' : kind === 'lead' ? '线索' : '报名转化'}详情`, '查看当前记录的完整字段和状态。', `<div class="sales-detail-list">${labels.map(([label, value]) => `<div><span>${label}</span><strong>${label.includes('状态') ? tag(value) : escapeHtml(value)}</strong></div>`).join('')}</div>`);
}

// I1-DEC-26 / RM-U-03: the read-only product detail carries the price-change trail so a re-priced
// product shows what changed, when it takes effect and who changed it.
function appendProductChangeLog(row) {
  const card = document.querySelector('.sales-dialog[data-business-dialog] .sales-dialog-card');
  if (!card) return;
  const changes = Array.isArray(row.priceChanges) ? row.priceChanges : [];
  const rows = changes.length
    ? changes.map(change => `<tr><td>${escapeHtml(change.at || '—')}</td><td>售价</td><td>${escapeHtml(change.from || '—')}</td><td>${escapeHtml(change.to || '—')}</td><td>${escapeHtml(change.operator || '—')}</td></tr>`).join('')
    : '<tr><td colspan="5">暂无调价记录；复售改价后会在此显示变更项、变更前后值、操作人和生效时间。</td></tr>';
  card.insertAdjacentHTML('beforeend', `<section class="sales-class-roster"><h3>调价与售卖配置变更记录</h3><p class="sales-roster-meta">调价只影响生效后的新订单；已支付订单保留成交金额，已购账号授权与学习记录不受影响。</p><div class="sales-table-wrap"><table><thead><tr><th>生效时间</th><th>变更项</th><th>变更前</th><th>变更后</th><th>操作人</th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
}

function openSimpleForm(title, subtitle, fields, onSubmitMessage) {
  const dialog = openBusinessDialog(title, subtitle, `<form id="business-dialog-form" class="sales-dialog-grid">${fields}</form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="business-dialog-form" class="button primary">确认</button>');
  dialog.querySelector('#business-dialog-form')?.addEventListener('submit', (event) => { event.preventDefault(); closeBusinessDialog(); showToast(onSubmitMessage); });
}

function handleBusinessAction(action, row) {
  if (action === 'product-view') { openDetail(row, 'product'); appendProductChangeLog(row); return; }
  if (action === 'product-create' || action === 'product-edit') return openProductForm(row);
  // RM-F-09: one-click demo reset so a live review never depends on pre-seeded results.
  if (action === 'demo-reset') {
    if (!window.confirm('确认重置演示数据？所有本地演示订单、商品、班级和授权将恢复到初始种子数据。')) return;
    resetDemoData();
    window.alert('演示数据已重置为初始状态，页面将继续刷新。');
    window.location.reload();
    return;
  }
  if (action === 'product-publish' || action === 'product-unpublish') { row.status = action === 'product-publish' ? '已上架' : '已下架'; row.updated = action === 'product-publish' ? demoTime() : row.updated; persistProduct(row); renderProducts(); showToast(action === 'product-publish' ? '商品已上架，学员端可购买。' : '商品已下架，历史订单不受影响。'); return; }
  if (action === 'order-view') return openDetail(row, 'order');
  if (action === 'class-view') { openDetail(row, 'class'); appendClassRosterSection(row); return; }
  if (action === 'class-create' || action === 'class-edit') return openClassForm(row);
  if (action === 'class-publish' || action === 'class-unpublish') {
    if (action === 'class-publish' && (!row.courseId || !row.batch || !row.teacher || !row.campus || !row.classroom || !row.schedule || !row.capacity || !row.price || !row.deadline)) { showToast('请先补齐班级的批次、教师、校区、教室、排课、容量、价格和截止时间', 'error'); return; }
    row.display = action === 'class-publish' ? '已展示' : '已下架'; if (action === 'class-publish' && row.status === '未发布') row.status = '招生中'; persistClass(row); renderClasses(); showToast(action === 'class-publish' ? '班级已展示，学员端入口按快速报名开关分流。' : '班级已下架，运营状态保持不变。'); return;
  }
  if (action === 'trial-view') return openDetail(row, 'trial');
  if (action === 'trial-confirm') { row.status = '已确认'; renderTrials(); showToast('试听时间已确认，已发送学员通知。'); return; }
  if (action === 'trial-create') return openSimpleForm('登记试听', '从线索带入学员信息，填写试听时间、校区和教师。', inputField('学员姓名', 'student', '请输入学员姓名') + inputField('家长手机号', 'phone', '请输入手机号') + inputField('目标课程', 'course', '请输入目标课程') + inputField('试听时间', 'time', '2026-09-20 09:00') + selectField('试听校区', 'campus', ['龙泉校区', '南湖校区']) + selectField('试听教师', 'teacher', ['王玥', '陈晨', '赵老师']), '试听记录已登记。');
  if (action === 'lead-view') return openDetail(row, 'lead');
  if (action === 'lead-follow') return openSimpleForm('填写跟进', '记录跟进方式、内容和下次跟进时间。', selectField('跟进方式', 'method', ['电话', '微信', '面谈', '短信']) + inputField('跟进内容', 'content', '请输入跟进内容', true) + inputField('下次跟进时间', 'next', '2026-09-20 10:00'), '跟进记录已保存。');
  if (action === 'lead-trial') return openSimpleForm('转为试听', '已自动带入线索学员和意向课程。', inputField('试听时间', 'time', '2026-09-20 09:00') + selectField('试听校区', 'campus', ['龙泉校区', '南湖校区']) + selectField('试听教师', 'teacher', ['王玥', '陈晨', '赵老师']), '试听记录已生成。');
  if (action === 'lead-enroll') return openSimpleForm('报名确认', '选择课程和班级后生成面授订单。', selectField('课程', 'course', ['少儿中国舞基础班', '成人声乐班', '中国画基础']) + selectField('班级', 'className', ['秋季一班', '周末班', '南湖一班']), '面授订单已生成，可在统一订单管理中按“面授课程”筛选查看。');
  if (action === 'lead-create') return openSimpleForm('新增线索', '录入线索后进入跟进流程。', inputField('联系人', 'student', '请输入联系人') + inputField('手机号', 'phone', '请输入手机号') + inputField('意向课程', 'course', '请输入意向课程', true) + selectField('来源类型', 'source', ['咨询', '后台登记试听']), '线索已创建。');
  if (action === 'conversion-view') return openDetail(row, 'conversion');
  if (action === 'conversion-enroll') return openSimpleForm('转报名', '选择课程和班级后生成面授订单。', selectField('课程', 'course', ['少儿中国舞基础班', '成人声乐班', '中国画基础']) + selectField('班级', 'className', ['秋季一班', '周末班', '南湖一班']), '报名订单已生成，可在统一订单管理中按“面授课程”筛选查看。');
  if (action.endsWith('export')) return showToast('导出任务已创建，数据将按当前角色权限脱敏。');
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-dialog-close]')) { closeBusinessDialog(); return; }
  const actionElement = event.target.closest('[data-business-action]'); if (!actionElement) return;
  const action = actionElement.dataset.businessAction;
  const rowElement = actionElement.closest('tr[data-row-id]');
  const row = rowElement ? businessData.find((item) => item.id === rowElement.dataset.rowId) : null;
  // RM-U-02: both publish and unpublish require a second confirmation; publishing states that the
  // course becomes visible in the mini program.
  if (action === 'product-publish' || action === 'product-unpublish' || action === 'class-unpublish') {
    if (!row) return;
    const subject = action === 'product-publish'
      ? `确认上架商品“${row.name}”？确认后小程序端可见，未购买账号可按商品价格购买。`
      : action === 'product-unpublish'
        ? `确认下架商品“${row.name}”？下架后小程序端不再展示，历史订单和已购账号授权不受影响。`
        : `确认下架班级“${row.name}”？下架后小程序端将不可见。`;
    const confirmButton = action === 'product-publish'
      ? `<button type="button" class="button primary" data-confirm-action="${action}">确认上架</button>`
      : `<button type="button" class="button danger-button" data-confirm-action="${action}">确认</button>`;
    openBusinessDialog(action === 'product-publish' ? '确认上架商品' : '确认操作', '重要状态变化需要二次确认。', `<p class="sales-danger-note">${escapeHtml(subject)}</p>`, `<button type="button" class="button" data-dialog-close>取消</button>${confirmButton}`);
    return;
  }
  if (actionElement.dataset.confirmAction) return;
  handleBusinessAction(action, row);
});
document.addEventListener('click', (event) => { const confirm = event.target.closest('[data-confirm-action]'); if (!confirm) return; const action = confirm.dataset.confirmAction; closeBusinessDialog(); const rowId = businessActive; if (rowId) { const row = businessData.find((item) => item.id === rowId); handleBusinessAction(action, row); } });
document.addEventListener('click', (event) => { const actionElement = event.target.closest('[data-business-action]'); const row = actionElement?.closest('tr[data-row-id]'); if (actionElement && row && ['product-publish', 'product-unpublish', 'class-unpublish'].includes(actionElement.dataset.businessAction)) businessActive = row.dataset.rowId; });

subscribeDemoState(() => {
  syncSharedBusinessData();
  if (businessPage === 'products') renderProducts();
  if (businessPage === 'orders') renderOrders();
  if (businessPage === 'classes') renderClasses();
});

if (businessPage === 'products') {
  renderProducts();
  // RM-F-08: arriving from the course library opens the publish form with that course read-only;
  // if the course already has a product, the existing subject is reused instead of creating a second.
  const requestedCourseId = businessParams.get('courseId');
  if (requestedCourseId) {
    const existing = dataSets.products.find(item => item.courseId === requestedCourseId);
    if (existing) { showToast(`课程“${existing.course}”已有商品（${existing.status}），已打开原商品供复用`, 'error'); openProductForm(existing); }
    else openProductForm();
  }
}
if (businessPage === 'orders') renderOrders();
if (businessPage === 'batches') renderBatches();
if (businessPage === 'classes') renderClasses();
if (businessPage === 'trials') renderTrials();
if (businessPage === 'leads') renderLeads();
if (businessPage === 'conversions') renderConversions();
