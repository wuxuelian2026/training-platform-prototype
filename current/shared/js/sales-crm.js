import { demoId, demoTime, readDemoState, resetDemoData, subscribeDemoState, updateDemoRecord, upsertDemoRecord } from './demo-store.js';
import { cloneClassSeed } from './class-seed.js';
import { cloneCourseCatalogSeed } from './course-catalog-seed.js';
import { addWeeksLocal, toLocalDateString } from './date-utils.js';
import { cloneProductSeed } from './product-seed.js';
import { COURSE_DISPLAY_UNSET, classRecordFor, courseAgesText, courseArchiveFor, courseDisplayConfigured, courseDisplayTags, persistSaleUnitDisplay, productForCourse, saleUnitDisplay } from './course-display.js';
import { versionForCourseId } from './course-version.js';
import { mountRichEditor, richTextToHtml, richTextValue } from './rich-editor.js';
import { classEnrollmentCondition, deriveClassStatus } from './class-lifecycle.js';
import { mergeVenues, resolveVenueId } from './venue-seed.js';
import { DEFAULT_LESSON_DURATION, TIMELINE_END, TIMELINE_START, isWithinTimeline, lessonDurationOptions as buildLessonDurationOptions, lessonEndTime, snapToStep } from './timetable-settings.js';

const businessRoot = document.querySelector('[data-business-page]');
const businessPage = businessRoot?.dataset.businessPage;
let businessData = null;
let businessActive = null;
let businessToastTimer;

const professionalOptions = ['音乐类', '舞蹈类', '美术类', '戏剧类'];
const lessonDurationOptions = buildLessonDurationOptions().map(option => Number(option.value));
// RM-F-01: the mall module no longer keeps its own course copy — it reads the shared publishable catalog.
const courseCatalog = cloneCourseCatalogSeed();
const businessParams = new URLSearchParams(window.location.search);
const dataSets = {
  products: cloneProductSeed(),
  // CR-2026-032 §5：订单样例补支付记录、退款记录、履约结果与操作日志，覆盖视频已支付／面授待支付／面授退款中三种情形。
  orders: [
    {
      id: 'order-video', number: 'OD202609080001', name: '声乐演唱技巧', type: '视频课程', account: '演示家长A', accountPhone: '138****2026', student: '',
      amount: '1280.00', status: '已支付', fulfillment: '学习中', linked: '学习权限：生效', time: '2026-09-08 10:18',
      payment: { channel: '微信支付', amount: '1280.00', status: '支付成功', time: '2026-09-08 10:20' },
      refund: null,
      fulfillmentDetail: { 学习权限: '已开通', 有效期: '2026-09-08 至 2027-09-07' },
      logs: [
        { at: '2026-09-08 10:18', role: '学员端', from: '—', to: '待支付', reason: '学员提交订单' },
        { at: '2026-09-08 10:20', role: '支付渠道', from: '待支付', to: '已支付', reason: '支付成功' },
        { at: '2026-09-08 10:21', role: '系统', from: '已支付', to: '已支付', reason: '学习权限已开通' }
      ]
    },
    {
      id: 'order-offline', number: 'OD202609060008', name: '少儿中国舞基础班', type: '面授课程', account: '演示家长A', accountPhone: '139****2027', student: '周子涵',
      amount: '1680.00', status: '待支付', fulfillment: '待分班', linked: '未占用名额', time: '2026-09-06 15:22',
      payment: null, refund: null,
      fulfillmentDetail: { 班级: '2026秋季中国舞启蒙一班', 校区: '龙泉校区', 分班结果: '待支付后自动分班', 名额占用: '未占用（以支付成功为占用时点）' },
      logs: [
        { at: '2026-09-06 15:22', role: '学员端', from: '—', to: '待支付', reason: '学员提交报名' },
        { at: '2026-09-06 18:00', role: '系统', from: '待支付', to: '待支付', reason: '支付时限内未支付，订单保留' }
      ]
    },
    {
      id: 'order-refund', number: 'OD202609050003', name: '成人声乐班', type: '面授课程', account: '演示家长B', accountPhone: '139****2027', student: '刘女士',
      amount: '2280.00', status: '退款中', fulfillment: '已分班', linked: '周末班', time: '2026-09-05 11:08',
      payment: { channel: '微信支付', amount: '2280.00', status: '支付成功', time: '2026-09-05 11:10' },
      refund: { number: 'RF202609050012', amount: '2280.00', status: '退款中', reason: '名额占用失败，系统发起免审批全额原路退款', expectedAt: '2026-09-12', method: '原路退回' },
      fulfillmentDetail: { 班级: '周末成人声乐班', 校区: '南湖校区', 分班结果: '报名未成功，已发起全额原路退款', 名额占用: '未占用（名额分配失败）' },
      logs: [
        { at: '2026-09-05 11:08', role: '学员端', from: '—', to: '待支付', reason: '学员提交报名' },
        { at: '2026-09-05 11:10', role: '支付渠道', from: '待支付', to: '已支付', reason: '支付成功' },
        { at: '2026-09-05 11:12', role: '系统', from: '已支付', to: '退款中', reason: '名额占用失败，已发起全额原路退款' }
      ]
    }
  ],
  batches: [
    { id: 'batch-autumn', name: '2026年秋季艺术培训', season: '秋季', start: '2026-09-01', end: '2027-01-30', classes: '12', status: '进行中' },
    { id: 'batch-summer', name: '2026年暑期艺术培训', season: '暑假', start: '2026-07-01', end: '2026-08-31', classes: '8', status: '已结束' },
    { id: 'batch-winter', name: '2027年寒假艺术培训', season: '寒假', start: '2027-02-01', end: '2027-02-28', classes: '0', status: '未开始' },
    { id: 'batch-spring', name: '2027年春季艺术培训', season: '春季', start: '2027-03-01', end: '2027-06-30', classes: '0', status: '未开始' }
  ],
  classes: cloneClassSeed(),
  trials: [
    { id: 'trial-zhou', leadNo: 'CL20260908012', student: '周子涵', phone: '139****8612', course: '少儿中国舞基础班', time: '2026-09-12 09:00', campus: '龙泉校区', status: '待确认', source: '后台登记', owner: '赵顾问' },
    { id: 'trial-li', leadNo: 'CL20260907008', student: '李思远', phone: '138****5541', course: '成人声乐班', time: '2026-09-06 14:00', campus: '南湖校区', status: '已试听', source: '后台登记', owner: '赵顾问' },
    { id: 'trial-he', leadNo: 'CL20260905003', student: '何安', phone: '137****3130', course: '少儿美术启蒙班', time: '2026-09-15 18:30', campus: '南湖校区', status: '已确认', source: '转介绍', owner: '赵顾问' }
  ],
  leads: [
    { id: 'lead-zhou', number: 'CL20260908012', student: '周女士', phone: '139****8612', course: '少儿中国舞基础班', source: '线上咨询', status: '跟进中', next: '2026-09-09', owner: '赵顾问' },
    { id: 'lead-li', number: 'CL20260907008', student: '李先生', phone: '138****5541', course: '成人声乐班', source: '后台登记', status: '跟进中', next: '2026-09-12', owner: '赵顾问' },
    { id: 'lead-he', number: 'CL20260905003', student: '何女士', phone: '137****3130', course: '少儿美术启蒙班', source: '转介绍', status: '已转化', next: '—', owner: '赵顾问' },
    { id: 'lead-sun', number: 'CL20260904006', student: '孙先生', phone: '136****7192', course: '中国画基础', source: '活动', status: '已流失', next: '—', owner: '赵顾问' }
  ],
};

// CR-2026-038 §4.2：线索与试听共用一套预置来源。
const leadSources = ['线上咨询', '后台登记', '转介绍', '活动'];

// CR-2026-038 §2.1：报名转化按线索派生，报名状态由该线索是否生成面授订单决定。
function leadOrderOf(lead) {
  return dataSets.orders.find((order) => order.type === '面授课程' && (order.student === lead.student || order.number === lead.number)) || null;
}

function derivedConversions() {
  return dataSets.leads.map((lead) => {
    const trial = dataSets.trials.find((item) => item.leadNo === lead.number) || null;
    const order = leadOrderOf(lead);
    const enrolled = lead.status === '已转化' || Boolean(order && order.status === '已支付');
    return {
      id: `conversion-${lead.id}`,
      leadId: lead.id,
      number: lead.number,
      student: lead.student,
      phone: lead.phone,
      course: lead.course,
      time: trial?.time || lead.next || '—',
      trial: trial?.status || '',
      status: enrolled ? '已报名' : '未转化',
      className: order?.linked || order?.name || '—',
      owner: lead.owner
    };
  });
}

function sharedCourseCatalog() {
  const shared = readDemoState();
  const rows = [
    ...(shared.courses || []).filter(item => item.status === '已完成'),
    // CR-2026-025：课程档案改名或调整课时后，发布商品／班级带入的课程主体同步取最新值。
    ...(shared.library || []).map(item => ({ ...item, id: item.sourceCourseId || item.id }))
  ];
  rows.forEach(item => {
    const patch = {};
    ['name', 'type', 'major', 'teacher', 'hours'].forEach(key => { if (item[key] !== undefined) patch[key] = item[key]; });
    if (item.archive) patch.archive = item.archive;
    if (item.status) patch.status = item.status;
    // CR-2026-034 §4.1.2：停用标记随课程档案带入发布候选，停用课程不出现在新的发布选择项里。
    patch.disabledAt = item.disabledAt || '';
    const existing = courseCatalog.find(course => course.id === item.id);
    if (existing) Object.assign(existing, patch);
    else courseCatalog.push({ id: item.id, ...patch });
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
function openBusinessDialog(title, subtitle, body, actions = '<button type="button" class="button" data-dialog-close>关闭</button>', options = {}) {
  closeBusinessDialog();
  const dialog = document.createElement('dialog'); dialog.className = `sales-dialog${options.workspace ? ' sales-workspace-dialog' : ''}`; dialog.dataset.businessDialog = 'true';
  dialog.innerHTML = `<div class="sales-dialog-card"><div class="sales-dialog-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button type="button" class="icon-button" data-dialog-close title="关闭" aria-label="关闭">×</button></div>${body}<div class="sales-dialog-actions">${actions}</div></div>`;
  document.body.append(dialog); dialog.showModal(); return dialog;
}

function pageFrame(title, description, controls, content) {
  const contentRoot = businessRoot;
  if (!contentRoot) return;
  contentRoot.innerHTML = `<div class="sales-page"><div class="page-head"><div><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${controls || ''}</div>${content}<div class="toast" data-business-toast role="status" aria-live="polite" hidden></div></div>`;
}
function filterPanel(id, fields) {
  return `<div class="filter-panel" data-filter-drawer-shell="${id}"><button type="button" class="button filter-drawer-trigger" data-filter-drawer-trigger="${id}" aria-expanded="false" aria-controls="${id}"><span class="filter-trigger-icon" aria-hidden="true"></span>筛选条件</button><div class="filter-drawer-backdrop" data-filter-drawer-backdrop="${id}" hidden></div><form class="card filter-form" id="${id}"><div class="filter-head"><strong>筛选条件</strong><button type="button" class="icon-button filter-drawer-close" data-filter-drawer-close="${id}" title="关闭筛选条件" aria-label="关闭筛选条件">×</button></div><div class="filter-grid sales-filter-grid">${fields}</div><div class="filter-actions"><button type="reset" class="button">重置</button><button type="submit" class="button primary">查询</button></div></form></div>`;
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
function courseSummary(course, note) { return `<div class="sales-dialog-summary sales-course-summary"><div><span>课程主体</span><strong>${escapeHtml(course?.name || '未带入课程')}</strong><small>${escapeHtml(course?.id || '请选择关联课程')}</small></div><div><span>课程类型 / 来源</span><strong>${escapeHtml(course?.type || '—')}</strong><small>${escapeHtml(course?.source || (course?.applicationId ? '教师申报' : '后台新增'))}</small></div><div><span>教师 / 总课时</span><strong>${escapeHtml(course ? `${course.teacher} · ${course.hours}课时` : '—')}</strong><small>${escapeHtml(note || '课程主体只读带入')}</small></div></div>`; }
function checkBusinessForm(form) { if (!form.reportValidity()) return false; return true; }

// CR-2026-025 §4：商品与班级在发布时记录所引用的课程版本号，在售期间不随课程档案升级自动跟随；
// 需要跟随时由运营在售卖单元侧显式同步，页面同时提示影响范围。
function courseVersionRow(course, row) {
  const latest = versionForCourseId(course.id);
  const referenced = Number(row?.courseVersion) || latest;
  const syncable = Boolean(row) && latest > referenced;
  return `<label class="form-field"><span>引用课程版本</span><input name="courseVersion" value="${referenced}" readonly class="readonly-field" data-course-version-input /><small>${syncable ? `课程档案已更新至 v${latest}；在售期间不随课程档案升级自动跟随，如需切换请显式同步。` : '发布时记录引用版本；在售期间不随课程档案升级自动跟随。'}</small></label>${syncable ? `<label class="form-field"><span>版本同步</span><button type="button" class="button" data-course-version-sync data-latest="${latest}">同步到 v${latest}</button><small>同步后本次发布按 v${latest} 引用，已支付订单仍按下单快照，不改写历史。</small></label>` : ''}`;
}
// CR-2026-012：教学属性由申报与编排链路维护，发布环节只读带入。
function courseTeachingRow(course) {
  const archive = courseArchiveFor(course);
  return `<label class="form-field"><span>难度等级</span><input value="${escapeHtml(archive?.difficulty || '—')}" readonly class="readonly-field" /></label><label class="form-field"><span>适合年龄</span><input value="${escapeHtml(courseAgesText(archive) || '—')}" readonly class="readonly-field" /></label>`;
}

function courseContentRecord(course) {
  if (!course) return null;
  const shared = readDemoState();
  return (shared.courses || []).find(item => item.id === course.id)
    || (shared.library || []).find(item => (item.sourceCourseId || item.id) === course.id)
    || course;
}
function courseReadonlyContent(course) {
  if (!course) return '<div class="empty">请先选择关联课程。</div>';
  const record = courseContentRecord(course) || course;
  const archive = courseArchiveFor(course) || record;
  const chapters = Array.isArray(record.chapters) ? record.chapters : [];
  const outline = chapters.length
    ? chapters.map((chapter, chapterIndex) => `<section class="sales-outline-chapter"><h4>第 ${chapterIndex + 1} 章 · ${escapeHtml(chapter.name)}</h4><p>${escapeHtml(chapter.desc || '暂无章节描述')}</p><div class="sales-outline-lessons">${(chapter.lessons || []).map((lesson, lessonIndex) => `<div><strong>第 ${lessonIndex + 1} 课时 · ${escapeHtml(lesson.name)}</strong><span>${escapeHtml(lesson.target || lesson.description || '暂无课时说明')} · ${Number(lesson.duration) || '—'} 分钟</span></div>`).join('') || '<span class="sub-cell">暂无课时</span>'}</div></section>`).join('')
    : '<div class="empty">该演示课程暂无可回显的章节与课时数据。</div>';
  return `<div class="sales-course-readonly"><section><h3>课程基本信息</h3><dl class="course-detail-list"><div><dt>课程编号</dt><dd>${escapeHtml(course.id)}</dd></div><div><dt>课程名称</dt><dd>${escapeHtml(course.name)}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(course.type)}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(course.major || '—')}</dd></div><div><dt>申报教师</dt><dd>${escapeHtml(course.teacher || '—')}</dd></div><div><dt>总课时</dt><dd>${Number(course.hours) || '—'} 课时</dd></div><div><dt>难度等级</dt><dd>${escapeHtml(archive?.difficulty || '—')}</dd></div><div><dt>适合年龄</dt><dd>${escapeHtml(courseAgesText(archive) || '—')}</dd></div></dl></section><section><h3>课程大纲</h3>${outline}</section></div>`;
}
function workspaceTabs(items, active) {
  return `<div class="sales-workspace-tabs" role="tablist">${items.map(([key, label, index]) => `<button type="button" role="tab" data-workspace-tab="${key}" class="${key === active ? 'active' : ''}">${index ? `<span>${index}</span>` : ''}${label}</button>`).join('')}</div>`;
}
function initWorkspace(dialog, active = 'course') {
  // UI 复核 CR-2026-031：富文本编辑器在隐藏面板内挂载会取不到高度与实例，
  // 改为切到展示信息页签时按需挂载，保证编辑态可见即已挂载。
  const mountDeferredEditors = () => {
    dialog.querySelectorAll('[data-workspace-panel]:not([hidden]) [data-rich-editor]').forEach((field) => {
      if (field.dataset.editorMounted === 'true') return;
      field.dataset.editorMounted = 'true';
      mountRichEditor(field);
    });
  };
  const activate = (key) => {
    dialog.querySelectorAll('[data-workspace-tab]').forEach(item => { const selected = item.dataset.workspaceTab === key; item.classList.toggle('active', selected); item.setAttribute('aria-selected', String(selected)); });
    dialog.querySelectorAll('[data-workspace-panel]').forEach(item => { item.hidden = item.dataset.workspacePanel !== key; });
    mountDeferredEditors();
  };
  dialog.querySelectorAll('[data-workspace-tab]').forEach(item => item.addEventListener('click', () => activate(item.dataset.workspaceTab)));
  activate(active);
}
// CR-2026-020：运营四字段写在售卖单元自身（商品或班级），不再写入课程档案。
// UI 复核 CR-2026-020／031：未选择关联课程时也要渲染展示信息字段（禁用态），
// 避免“展示信息段字段缺失”被读成未落地；字段结构、命名与可编辑态保持一致。
function courseDisplayPlaceholder(unitLabel = '本商品') {
  const field = (label, control) => `<label class="form-field"><span>${label}</span>${control}</label>`;
  return `<div class="sales-section-head"><div><span>03</span><h3>展示信息</h3></div><p>选择关联课程后可维护本${unitLabel}的对外展示。</p></div><div class="form-field wide sales-display-section" data-display-placeholder><span>课程展示信息<b class="required-mark">售卖单元级存储</b></span><div class="sales-display-grid">${field('课程封面', '<input type="file" name="cover" accept="image/*" disabled data-display-input>')}${field('C 端推荐语', '<input name="recommendation" maxlength="30" disabled data-display-input placeholder="不超过30字">')}${field('图文详情', '<div class="rich-editor-placeholder" data-display-input>选择关联课程后可编辑图文详情（富文本）</div>')}${field('课程标签', '<input name="tags" disabled data-display-input placeholder="多个标签用逗号分隔">')}</div><div class="sales-display-actions"><span class="sales-display-warning">展示信息保存在${unitLabel}自身，不写入课程基本信息或课程大纲。修改只影响${unitLabel}；不影响同课程的其他售卖单元。</span></div></div>`;
}

function courseDisplaySection(course, unit = {}, { editDisplay = false, unitLabel = '商品' } = {}) {
  const archive = saleUnitDisplay(unit);
  const configured = courseDisplayConfigured(archive);
  const editable = editDisplay || !configured;
  const coverRequired = !configured;
  const lockedAttr = editable ? '' : 'readonly class="readonly-field"';
  const coverCell = editable
    ? `<input type="file" name="cover" accept="image/*" data-display-input />${archive?.coverFile ? `<small>当前封面：${escapeHtml(archive.coverFile)}</small>` : '<small>可先存草稿；发布前必须上传展示封面</small>'}`
    : `<input class="readonly-field" readonly value="${escapeHtml(archive?.coverFile || archive?.cover || '未配置')}" />`;
  // 图文详情是富文本字段：编辑态挂 RichEditor，只读态渲染清洗后的 HTML 用隐藏字段原样回存。
  const detailCell = editable
    ? `<div class="rich-editor-field" data-rich-editor data-name="detail" data-display-input data-aria-label="图文详情" data-placeholder="只作用于本单元的对外展示，学员端详情展示，≤2000 字" data-min-height="160px" data-max-length="2000" data-value="${escapeHtml(archive?.detail || '')}"></div>`
    : `<div class="sales-display-preview" data-display-input><input type="hidden" name="detail" value="${escapeHtml(archive?.detail || '')}" />${richTextToHtml(archive?.detail, '<span class="sub-cell">未配置</span>')}</div>`;
  return `<div class="form-field wide sales-display-section"><span>课程展示信息<b class="required-mark">售卖单元级存储</b></span><div class="sales-display-grid"><label class="form-field"><span>课程封面${coverRequired ? '（发布必填）' : ''}</span>${coverCell}</label><label class="form-field"><span>C 端推荐语</span><input name="recommendation" maxlength="30" data-display-input ${lockedAttr} value="${escapeHtml(archive?.recommendation || '')}" placeholder="不超过30字" /></label><label class="form-field wide"><span>图文详情</span>${detailCell}</label><label class="form-field wide"><span>课程标签</span><input name="tags" data-display-input ${lockedAttr} value="${escapeHtml(courseDisplayTags(archive).join(','))}" placeholder="多个标签用逗号分隔" /></label></div><div class="sales-display-actions">${editable ? '' : '<button type="button" class="button" data-display-edit>修改展示信息</button>'}<span class="sales-display-warning">${editable ? `展示信息保存在${unitLabel}自身，不写入课程基本信息或课程大纲。修改只影响${unitLabel}；不影响同课程的其他售卖单元。` : '已按上次发布的值只读带入；需要调整时点击“修改展示信息”。'}</span></div></div>`;
}
function openProductForm(row = null, options = {}) {
  const course = businessCourse(options.courseId || row?.courseId || businessParams.get('courseId'));
  const displayUnit = row || {};
  const displayEdit = Boolean(options.editDisplay) || !courseDisplayConfigured(displayUnit);
  // CR-2026-034 §4.1.2：已停用课程不再作为新的发布候选；编辑既有商品时仍可读回原课程。
  const videoCourses = courseCatalog.filter(item => item.type === '视频课程' && item.status === '已完成' && (!item.disabledAt || item.id === row?.courseId));
  const courseField = course
    ? `${courseSummary(course, '仅允许已完成的视频课程发布商品')}<input type="hidden" name="courseId" value="${escapeHtml(course.id)}">`
    : requiredSelect('关联课程', 'courseId', videoCourses.map(item => item.name));
  const shelfMode = row?.shelfMode || (row?.shelfAt ? '定时上架' : row?.status === '已上架' ? '立即上架' : '仅保存');
  const body = `<form id="business-dialog-form" class="sales-workspace-form">${workspaceTabs([['course', '关联课程', 1], ['sale', '销售设置', 2], ['display', '展示信息', 3]], 'course')}<section data-workspace-panel="course" class="sales-workspace-panel"><div class="sales-section-head"><div><span>01</span><h3>关联课程</h3></div><p>商品仅保存课程编号与版本，基本信息和课程大纲只读引用。</p></div><div class="sales-dialog-grid">${courseField}${course ? courseVersionRow(course, row) : ''}</div>${courseReadonlyContent(course)}</section><section data-workspace-panel="sale" class="sales-workspace-panel" hidden><div class="sales-section-head"><div><span>02</span><h3>销售设置</h3></div><p>定价、试看和上架方式属于商品，不回写课程。</p></div><div class="sales-dialog-grid">${requiredInput('商品名称', 'name', row?.name || course?.name || '', 'text', '请输入商品名称')}${requiredInput('售卖价格', 'price', row?.price || '', 'number', '请输入售价')}<label class="form-field"><span>试看策略<b class="required-mark">*</b></span><select name="preview" id="preview-policy" required><option ${row?.preview !== '允许试看' ? 'selected' : ''}>不允许试看</option><option ${row?.preview === '允许试看' ? 'selected' : ''}>允许试看</option></select></label><label class="form-field"><span>试看课时</span><select name="previewHours" id="preview-hours" ${row?.preview !== '允许试看' ? 'disabled' : ''}><option ${row?.previewHours === '第1课时' ? 'selected' : ''}>第1课时</option></select></label><label class="form-field"><span>上架方式</span><select name="shelfMode" data-publish-mode><option ${shelfMode === '仅保存' ? 'selected' : ''}>仅保存</option><option ${shelfMode === '立即上架' ? 'selected' : ''}>立即上架</option><option ${shelfMode === '定时上架' ? 'selected' : ''}>定时上架</option></select></label><label class="form-field"><span>定时上架时间</span><input name="shelfAt" type="datetime-local" data-publish-at value="${escapeHtml(row?.shelfAt || '').replace(' ', 'T')}"></label><label class="form-field"><span>商品状态</span><input value="${escapeHtml(row?.status || '草稿')}" readonly class="readonly-field" /></label></div></section><section data-workspace-panel="display" class="sales-workspace-panel" hidden><div class="sales-section-head"><div><span>03</span><h3>展示信息</h3></div><p>仅影响本商品在学员端的展示。</p></div>${course ? courseDisplaySection(course, displayUnit, { editDisplay: displayEdit, unitLabel: '本商品' }) : courseDisplayPlaceholder('本商品')}</section></form>`;
  const dialog = openBusinessDialog(row ? '编辑商品' : '发布商品', '商品 = 课程引用 + 销售设置 + 展示信息。', body, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="business-dialog-form" class="button primary">保存商品</button>', { workspace: true });
  initWorkspace(dialog);
  // 图文详情使用富文本编辑器组件；在切到展示信息页签时按需挂载（隐藏面板内挂载取不到高度）。
  dialog.addEventListener('rich-editor:message', (event) => showToast(event.detail.message, event.detail.kind));
  // 二次发布时运营四字段只读带入，“修改展示信息”重新打开可编辑表单。
  dialog.querySelector('[data-display-edit]')?.addEventListener('click', () => { closeBusinessDialog(); openProductForm(row, { editDisplay: true }); });
  dialog.querySelector('[data-course-version-sync]')?.addEventListener('click', (event) => {
    const latest = event.currentTarget.dataset.latest;
    const input = dialog.querySelector('[data-course-version-input]');
    if (input) input.value = latest;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = `已同步至 v${latest}`;
    showToast(`引用课程版本已同步至 v${latest}；本次发布按新版本引用，已支付订单不受影响`);
  });
  // 未从课程库带入课程时，选择关联课程后重建表单，展示信息才能挂到所选课程档案上。
  dialog.querySelector('[name="courseId"]')?.addEventListener('change', (event) => {
    const selected = businessCourse(event.target.value) || videoCourses.find(item => item.name === event.target.value);
    if (!selected) return;
    closeBusinessDialog();
    openProductForm(null, { courseId: selected.id });
  });
  const preview = dialog.querySelector('#preview-policy'); const previewHours = dialog.querySelector('#preview-hours');
  preview?.addEventListener('change', () => { previewHours.disabled = preview.value !== '允许试看'; if (previewHours.disabled) previewHours.value = ''; else previewHours.value = '第1课时'; });
  const shelfModeField = dialog.querySelector('[name="shelfMode"]');
  const shelfAtField = dialog.querySelector('[name="shelfAt"]');
  const refreshShelfFields = () => { if (shelfAtField) { shelfAtField.disabled = shelfModeField?.value !== '定时上架'; shelfAtField.required = shelfModeField?.value === '定时上架'; } };
  shelfModeField?.addEventListener('change', refreshShelfFields);
  refreshShelfFields();
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
    if (Number(nextPrice) <= 0) { showToast('售卖价格必须大于 0', 'error'); return; }
    const priceChanged = Boolean(row) && Number(row.price) !== Number(nextPrice);
    const priceChanges = row ? [...(row.priceChanges || [])] : [];
    if (priceChanged) priceChanges.unshift({ at: demoTime(), operator: '平台运营', from: '¥' + Number(row.price).toFixed(2), to: '¥' + nextPrice });
    const nextShelfMode = String(data.get('shelfMode') || '仅保存');
    const shelfAt = String(data.get('shelfAt') || '').replace('T', ' ');
    const record = { id: row?.id || demoId('product'), courseId: selected.id, name: String(data.get('name')).trim(), course: selected.name, price: nextPrice, sales: row?.sales || '0', status: nextShelfMode === '立即上架' ? '已上架' : (nextShelfMode === '定时上架' ? '草稿' : (row?.status === '已上架' ? '已上架' : '草稿')), updated: row?.updated || '—', preview: data.get('preview'), previewHours: data.get('previewHours'), shelfMode: nextShelfMode, shelfAt, priceChanges, courseVersion: Number(data.get('courseVersion')) || versionForCourseId(selected.id) };
    // CR-2026-020：课程封面、图文详情、课程标签与 C 端推荐语写在商品自身。
    const coverFile = event.currentTarget.querySelector('[name="cover"]')?.files?.[0]?.name || displayUnit.coverFile || '';
    if (nextShelfMode !== '仅保存' && !courseDisplayConfigured(displayUnit) && !coverFile) { showToast('上架前需先上传商品封面', 'error'); return; }
    Object.assign(record, {
      coverFile,
      cover: coverFile ? '已配置' : (displayUnit.cover || COURSE_DISPLAY_UNSET),
      displayDetail: richTextValue(data.get('detail')),
      tags: String(data.get('tags') || '').split(/[，,、\s]+/).map(value => value.trim()).filter(Boolean),
      recommendation: String(data.get('recommendation') || '').trim()
    });
    if (row) Object.assign(row, record); else dataSets.products.unshift(record);
    persistSaleUnitDisplay('products', record);
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
// 日期按本地日历计算；不要改回 toISOString()，否则东八区会整体差一天。
function addWeeks(dateText, weeks) { return addWeeksLocal(dateText, weeks); }
// I1-DEC-29 / RM-T-F04: one 课时 equals one 课次; the session duration equals the lesson duration and
// the end time is start + duration, snapped to the fixed 15-minute axis. The matrix no longer needs a
// human-maintained slot scheme — rows are derived from the session times.
function buildClassSessions(lessons, weekday, start, lessonDuration, firstDate, classroom, semester = '2026秋季') {
  const total = Number(lessons) || 0;
  const duration = Number(lessonDuration) || DEFAULT_LESSON_DURATION;
  if (!total || !weekday || !start || !firstDate) return [];
  const shared = readDemoState();
  const roomId = resolveVenueId(classroom, mergeVenues(shared));
  const snappedStart = snapToStep(start);
  const end = lessonEndTime(snappedStart, duration);
  return Array.from({ length: total }, (_, index) => ({ index: index + 1, date: addWeeks(firstDate, index), weekday, startTime: snappedStart, endTime: end, start: snappedStart, end, lessonDuration: duration, roomId, semester, status: '待上课' }));
}
function findClassConflicts(record) {
  return dataSets.classes.filter(row => row.id !== record.id && row.display !== '已下架' && row.weekday === record.weekday && row.startTime && record.startTime && row.startTime < record.endTime && record.startTime < row.endTime)
    .filter(row => row.teacher === record.teacher || (row.campus === record.campus && row.classroom === record.classroom));
}
function openClassForm(row = null, options = {}) {
  const course = businessCourse(options.courseId || row?.courseId || businessParams.get('courseId'));
  const displayUnit = row || classRecordFor(row?.id);
  const displayEdit = Boolean(options.editDisplay) || !courseDisplayConfigured(displayUnit);
  // CR-2026-034 §4.1.2：已停用课程不再作为新的建班候选；编辑既有班级时仍可读回原课程。
  const classCourses = courseCatalog.filter(item => item.type === '面授课程' && (item.status === '已完成' || item.id === row?.courseId) && (!item.disabledAt || item.id === row?.courseId));
  const courseField = course
    ? `${courseSummary(course, '仅允许已完成的面授课程创建班级')}<input type="hidden" name="courseId" value="${escapeHtml(course.id)}">`
    : requiredSelect('关联课程', 'courseId', classCourses.map(item => item.name));
  const body = `<form id="business-dialog-form" class="sales-workspace-form">${workspaceTabs([['course', '关联课程', 1], ['enrollment', '班级与招生', 2], ['display', '展示信息', 3]], 'course')}<section data-workspace-panel="course" class="sales-workspace-panel"><div class="sales-section-head"><div><span>01</span><h3>关联课程</h3></div><p>班级必须关联一门已完成面授课程，并锁定引用版本。</p></div><div class="sales-dialog-grid">${courseField}${course ? courseVersionRow(course, row) : ''}</div>${courseReadonlyContent(course)}</section><section data-workspace-panel="enrollment" class="sales-workspace-panel" hidden><div class="sales-section-head"><div><span>02</span><h3>班级与招生</h3></div><p>创建班级主体和招生配置；教师、场地与上课规则在班级排课维护。</p></div><div class="sales-dialog-grid">${requiredInput('班级名称', 'name', row?.name || '', 'text', '请输入班级名称')}${requiredSelect('所属批次', 'batch', ['春季', '暑假', '秋季', '寒假'], row?.batch || '')}${requiredInput('招生容量', 'capacity', row?.capacity || '', 'number', '请输入容量')}${requiredInput('课程定价', 'price', row?.price || '', 'number', '请输入课程定价')}<label class="form-field"><span>是否支持试听</span><select name="trialEnabled"><option ${row?.trialEnabled !== '否' ? 'selected' : ''}>是</option><option ${row?.trialEnabled === '否' ? 'selected' : ''}>否</option></select></label><label class="form-field"><span>试听是否收费</span><select name="trialFee"><option ${row?.trialFee !== '是' ? 'selected' : ''}>否</option><option ${row?.trialFee === '是' ? 'selected' : ''}>是</option></select></label><label class="form-field"><span>试听价格</span><input name="trialPrice" type="number" min="0" step="0.01" value="${escapeHtml(row?.trialPrice || '')}" placeholder="收费试听时必填"></label><label class="form-field wide"><span>试听说明</span><textarea name="trialNote" maxlength="200">${escapeHtml(row?.trialNote || '')}</textarea></label><label class="form-field"><span>报名开始时间<b class="required-mark">*</b></span><input name="enrollStart" type="datetime-local" required value="${escapeHtml(row?.enrollStart || '').replace(' ', 'T')}"></label>${requiredInput('报名截止时间', 'deadline', row?.deadline || '', 'datetime-local', '')}<label class="form-field sales-switch-field"><span>快速报名入口</span><span class="sales-switch-control"><input name="fast" type="checkbox" ${row?.fast === '是' ? 'checked' : ''}></span></label><label class="form-field"><span>班级状态</span><input class="readonly-field" readonly value="${deriveClassStatus(row)}"></label></div></section><section data-workspace-panel="display" class="sales-workspace-panel" hidden><div class="sales-section-head"><div><span>03</span><h3>展示信息</h3></div><p>排班确认发布后，学员端读取本班级展示信息。</p></div>${course ? courseDisplaySection(course, displayUnit, { editDisplay: displayEdit, unitLabel: '本班级' }) : courseDisplayPlaceholder('本班级')}</section></form>`;
  const dialog = openBusinessDialog(`${row ? '编辑' : '创建'}面授班级`, '第一步创建班级；保存后前往班级排课。', body, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="business-dialog-form" class="button primary">保存并去排课</button>', { workspace: true });
  initWorkspace(dialog);
  // 图文详情使用富文本编辑器组件；在切到展示信息页签时按需挂载（隐藏面板内挂载取不到高度）。
  dialog.addEventListener('rich-editor:message', (event) => showToast(event.detail.message, event.detail.kind));
  // 二次发布时运营四字段只读带入，可从“修改展示信息”改为可编辑。
  dialog.querySelector('[data-display-edit]')?.addEventListener('click', () => { closeBusinessDialog(); openClassForm(row, { editDisplay: true }); });
  dialog.querySelector('[data-course-version-sync]')?.addEventListener('click', (event) => {
    const latest = event.currentTarget.dataset.latest;
    const input = dialog.querySelector('[data-course-version-input]');
    if (input) input.value = latest;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = `已同步至 v${latest}`;
    showToast(`引用课程版本已同步至 v${latest}；本次发布按新版本引用，已支付订单不受影响`);
  });
  dialog.querySelector('[name="courseId"]')?.addEventListener('change', (event) => {
    const selected = businessCourse(event.target.value) || classCourses.find(item => item.name === event.target.value);
    if (!selected) return;
    closeBusinessDialog();
    openClassForm(row, { ...options, courseId: selected.id });
  });
  const form = dialog.querySelector('#business-dialog-form');
  const trialEnabledField = form?.querySelector('[name="trialEnabled"]');
  const trialFeeField = form?.querySelector('[name="trialFee"]');
  const trialPriceField = form?.querySelector('[name="trialPrice"]');
  const refreshEnrollmentFields = () => {
    const trialDisabled = trialEnabledField?.value === '否';
    if (trialFeeField) trialFeeField.disabled = trialDisabled;
    if (trialPriceField) { trialPriceField.disabled = trialDisabled || trialFeeField?.value !== '是'; trialPriceField.required = !trialDisabled && trialFeeField?.value === '是'; }
  };
  trialEnabledField?.addEventListener('change', refreshEnrollmentFields);
  trialFeeField?.addEventListener('change', refreshEnrollmentFields);
  refreshEnrollmentFields();
  dialog.querySelector('#business-dialog-form')?.addEventListener('submit', event => {
    event.preventDefault(); if (!checkBusinessForm(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const selected = businessCourse(data.get('courseId')) || classCourses.find(item => item.name === data.get('courseId'));
    if (!selected || selected.type !== '面授课程') { showToast('请选择面授课程后再保存', 'error'); return; }
    if (selected.status !== '已完成') { showToast('课程需完成编排后才能创建班级', 'error'); return; }
    const enrollStart = String(data.get('enrollStart') || '').replace('T', ' ');
    const deadline = String(data.get('deadline') || '').replace('T', ' ');
    if (enrollStart && deadline && deadline <= enrollStart) { showToast('报名截止时间必须晚于报名开始时间', 'error'); return; }
    const trialEnabled = String(data.get('trialEnabled') || '否');
    const trialFee = trialEnabled === '是' ? String(data.get('trialFee') || '否') : '否';
    const trialPrice = trialEnabled === '是' && trialFee === '是' ? Number(data.get('trialPrice') || 0) : 0;
    if (trialEnabled === '是' && trialFee === '是' && trialPrice <= 0) { showToast('收费试听时，试听价格必须大于 0', 'error'); return; }
    const price = Number(data.get('price'));
    const capacity = Number(data.get('capacity'));
    if (price <= 0) { showToast('课程定价必须大于 0', 'error'); return; }
    if (!Number.isInteger(capacity) || capacity <= 0) { showToast('招生容量必须是大于 0 的整数', 'error'); return; }
    const record = { ...(row || {}), id: row?.id || demoId('class'), courseId: selected.id, source: selected.source || (selected.applicationId ? '教师申报' : '后台新增'), name: String(data.get('name')).trim(), className: String(data.get('name')).trim(), course: selected.name, courseName: selected.name, batch: data.get('batch'), category: selected.major.includes('中国') ? '舞蹈类' : selected.major.includes('声乐') ? '音乐类' : '美术类', professional: selected.major, price: price.toFixed(2), enrollStart, deadline, trialEnabled, trialFee, trialPrice: trialPrice ? trialPrice.toFixed(2) : '', trialNote: trialEnabled === '是' ? String(data.get('trialNote') || '').trim() : '', courseVersion: Number(data.get('courseVersion')) || versionForCourseId(selected.id), enrolled: row?.enrolled || 0, capacity, lessons: Number(selected.hours) || Number(row?.lessons) || 0, status: row?.id ? deriveClassStatus(row) : '待排班', display: row?.display || '未发布', scheduleStatus: row?.scheduleStatus || '未排班', scheduleVersion: Number(row?.scheduleVersion || 0), sessions: Array.isArray(row?.sessions) ? row.sessions : [], fast: data.get('fast') === 'on' ? '是' : '否', created: row?.created || toLocalDateString() };
    if (!row?.id) record.enrolled = 0;
    // I1-O-03: teacher and classroom conflicts block publishing until resolved.
    const coverFile = event.currentTarget.querySelector('[name="cover"]')?.files?.[0]?.name || displayUnit?.coverFile || '';
    Object.assign(record, {
      coverFile,
      cover: coverFile ? '已配置' : (displayUnit?.cover || COURSE_DISPLAY_UNSET),
      displayDetail: richTextValue(data.get('detail')),
      tags: String(data.get('tags') || '').split(/[，,、\s]+/).map(value => value.trim()).filter(Boolean),
      recommendation: String(data.get('recommendation') || '').trim()
    });
    if (row) Object.assign(row, record); else dataSets.classes.unshift(record);
    persistSaleUnitDisplay('classes', record);
    persistClass(record);
    closeBusinessDialog();
    location.href = `/admin/pages/academic/scheduling.html?classId=${encodeURIComponent(record.id)}`;
  });
}

function renderProducts() {
  // RM-U-03: a listed product keeps a visible edit entry so price, preview policy and shelf time
  // stay editable; the edit dialog annotates that re-pricing only affects later orders.
  const productRowActions = (status) => status === '已上架'
    ? '<button class="text-button" data-business-action="product-view">查看</button><button class="text-button" data-business-action="product-edit">编辑</button><button class="text-button danger-link" data-business-action="product-unpublish">下架</button>'
    : '<button class="text-button" data-business-action="product-view">查看</button><button class="text-button" data-business-action="product-edit">编辑</button><button class="text-button" data-business-action="product-publish">上架</button>';
  const productCells = (row) => {
    const latest = versionForCourseId(row.courseId);
    const referenced = Number(row.courseVersion) || latest;
    const disabled = Boolean(courseCatalog.find(course => course.id === row.courseId)?.disabledAt);
    return `<td><a class="reference-link" href="#">${escapeHtml(row.name)}</a></td><td>${escapeHtml(row.course)}${disabled ? '<br><span class="tag gray">关联课程已停用，需恢复或下架</span>' : ''}</td><td>v${referenced}${latest > referenced ? `<br><span class="sub-cell">可同步至 v${latest}</span><button class="text-button" data-business-action="product-version-sync" title="显式同步课程版本">同步</button>` : ''}</td><td class="amount-cell">¥${row.price}</td><td class="amount-cell">${row.sales}</td><td>${tag(row.status)}</td><td>${row.updated}</td><td class="action-cell">${productRowActions(row.status)}</td>`;
  };
  businessData = dataSets.products;
  const salesTotal = dataSets.products.reduce((sum, row) => sum + Number(row.sales || 0), 0);
  const metrics = metricCards([
    ['已上架', dataSets.products.filter(row => row.status === '已上架').length, '学员端可购买'],
    ['草稿', dataSets.products.filter(row => row.status === '草稿').length, '待完善售卖信息'],
    ['已下架', dataSets.products.filter(row => row.status === '已下架').length, '历史订单不受影响'],
    ['累计销售', salesTotal, '视频商品成交件数', Math.min(Math.round((salesTotal / 180) * 100), 100)]
  ]);
  pageFrame('视频课程商品', '', '<button class="button" data-business-action="demo-reset">恢复初始数据</button><button class="button primary" data-business-action="product-create">发布商品</button>', metrics + filterPanel('product-filter', selectField('商品状态', 'status', ['草稿', '已上架', '已下架']) + inputField('关键词', 'keyword', '商品名称 / 关联课程', true)) + table('<thead><tr><th>商品名称</th><th>关联课程</th><th>引用版本</th><th>售价</th><th>销售数量</th><th>商品状态</th><th>上架时间</th><th>操作</th></tr></thead>'));
  renderRows(businessData, productCells, () => true);
  document.querySelector('#product-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const status = event.currentTarget.status.value; const keyword = event.currentTarget.keyword.value.trim(); renderRows(businessData, productCells, (row) => (!status || row.status === status) && (!keyword || `${row.name}${row.course}`.includes(keyword))); });
}

function renderOrders() {
  businessData = dataSets.orders;
  // CR-2026-032 §2：指标卡可点击筛选（再次点击取消）、新增下单时间范围、关联状态并入订单状态列副行。
  const metricCard = ([label, value, note, progress, metric]) => `<button type="button" class="card metric-card" data-order-metric="${metric}"><span class="metric-label">${label}</span><span class="metric-value">${value}</span><span class="metric-note">${note}</span>${progress ? `<span class="metric-progress"><span style="width:${progress}%"></span></span>` : ''}</button>`;
  pageFrame('统一订单管理', '', '<button class="button" data-business-action="order-export">导出订单</button>', `<div class="card-grid compact-metrics">${[['今日订单', '26', '视频与面授合计', 0, 'today'], ['待支付', '1', '待完成支付', 0, '待支付'], ['退款中', '1', '符合规则的退款申请', 0, '退款中'], ['已支付', '18', '交易已完成', 70, '已支付']].map(metricCard).join('')}</div>` + filterPanel('order-filter', selectField('订单类型', 'type', ['视频课程', '面授课程']) + selectField('订单状态', 'status', ['待支付', '已支付', '已取消', '退款中', '已退款']) + selectField('关联状态', 'fulfillment', ['待分班', '已分班', '已取消', '学习中', '未开始', '已完成']) + `<label class="form-field"><span>下单时间起</span><input name="from" type="date"></label><label class="form-field"><span>下单时间止</span><input name="to" type="date"></label>` + inputField('关键词', 'keyword', '订单号 / 课程名称 / 购买账号', true)) + table('<thead><tr><th>订单号</th><th>课程名称</th><th>课程类型</th><th>购买账号 / 学员</th><th>订单金额</th><th>订单状态 / 关联状态</th><th>关联班级 / 权限</th><th>下单时间</th><th>操作</th></tr></thead>'));
  const params = new URLSearchParams(window.location.search);
  // RM-F-07: video orders name the purchasing account; offline orders keep account + student.
  const rows = (row) => `<td>${row.number}</td><td>${row.name}</td><td>${row.type}</td><td>${row.type === '视频课程' ? `${row.account || row.student}${row.account ? `<span class="sub-cell">${row.accountPhone || ''}</span>` : ''}` : row.student}</td><td class="amount-cell">¥${row.amount}</td><td>${tag(row.status)}<span class="sub-cell">${row.fulfillment ? `关联状态：${row.fulfillment}` : '关联状态：—'}</span></td><td>${row.linked}</td><td>${row.time}</td><td><button class="text-button" data-business-action="order-view">查看详情</button></td>`;
  // 指标卡与筛选条件叠加：指标卡再次点击取消；下单时间范围含起止当天。
  let metricFilter = '';
  const inRange = (row, form) => {
    const day = String(row.time || '').slice(0, 10);
    const from = form.from?.value || '';
    const to = form.to?.value || '';
    if (from && day && day < from) return false;
    if (to && day && day > to) return false;
    return true;
  };
  const matchesMetric = (row) => {
    if (!metricFilter) return true;
    if (metricFilter === 'today') return String(row.time || '').startsWith('2026-09-08');
    return row.status === metricFilter;
  };
  const filterRows = (form) => renderRows(businessData, rows, (row) => matchesMetric(row) && inRange(row, form) && (!form.type.value || row.type === form.type.value) && (!form.status.value || row.status === form.status.value) && (!form.fulfillment.value || row.fulfillment === form.fulfillment.value) && (!form.keyword.value.trim() || `${row.number}${row.name}${row.student}${row.account || ''}`.includes(form.keyword.value.trim())));
  const form = document.querySelector('#order-filter');
  if (form && params.get('type') === 'offline') form.type.value = '面授课程';
  // 指标卡点击筛选：命中同一指标再次点击即取消。
  document.querySelectorAll('[data-order-metric]').forEach((card) => card.addEventListener('click', () => {
    metricFilter = metricFilter === card.dataset.orderMetric ? '' : card.dataset.orderMetric;
    document.querySelectorAll('[data-order-metric]').forEach((item) => item.classList.toggle('is-active', item.dataset.orderMetric === metricFilter));
    filterRows(form || { type: { value: '' }, status: { value: '' }, fulfillment: { value: '' }, keyword: { value: '' }, from: { value: '' }, to: { value: '' } });
  }));
  filterRows(form || { type: { value: '' }, status: { value: '' }, fulfillment: { value: '' }, keyword: { value: '' }, from: { value: '' }, to: { value: '' } });
  form?.addEventListener('submit', (event) => { event.preventDefault(); filterRows(event.currentTarget); });
}

function renderBatches() {
  businessData = dataSets.batches;
  pageFrame('批次管理', '', '', metricCards([['年度批次', '4', '固定批次规则'], ['进行中', '1', '当前招生季'], ['已结束', '1', '历史批次保留'], ['待发布班级', '2', '可进入班级管理']]) + filterPanel('batch-filter', selectField('招生季', 'season', ['春季', '暑假', '秋季', '寒假']) + selectField('批次状态', 'status', ['未开始', '进行中', '已结束']) + inputField('关键词', 'keyword', '批次名称', true)) + table('<thead><tr><th>批次名称</th><th>招生季</th><th>开始日期</th><th>结束日期</th><th>关联班级</th><th>状态</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td><a class="reference-link" href="/admin/pages/crm/classes.html">${row.name}</a></td><td>${row.season}</td><td>${row.start}</td><td>${row.end}</td><td>${row.classes}</td><td>${tag(row.status)}</td><td><a class="link" href="/admin/pages/crm/classes.html">查看班级</a></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#batch-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { season, status, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!season.value || row.season === season.value) && (!status.value || row.status === status.value) && (!keyword.value.trim() || row.name.includes(keyword.value.trim()))); });
}

function renderClasses() {
  businessData = dataSets.classes;
  // CR-2026-047 §5.1：主状态与报名条件分层——主状态只走 6 值单向链，报名条件是独立派生标签。
  businessData.forEach(row => { row.status = deriveClassStatus(row); row.enrollmentCondition = classEnrollmentCondition(row); });
  const enrolledTotal = dataSets.classes.reduce((sum, row) => sum + Number(row.enrolled || 0), 0);
  const metrics = metricCards([
    // §6.1：指标卡按班级数统计；已报名人数单独成卡并标明单位「人」。
    ['待排课', dataSets.classes.filter(row => row.status === '待排课').length, '缺教师、场地或上课规则'],
    ['待发布', dataSets.classes.filter(row => row.status === '待发布').length, '排班已保存草稿，尚未发布'],
    ['招生中', dataSets.classes.filter(row => row.status === '招生中').length, '排班已发布，班级阶段'],
    ['进行中', dataSets.classes.filter(row => row.status === '进行中').length, '已到首课日期'],
    ['已报名', `${enrolledTotal} 人`, '当前示例班级合计报名人数', Math.min(Math.round((enrolledTotal / 60) * 100), 100)]
  ]);
  pageFrame('面授班级', '', '<button class="button primary" data-business-action="class-create">创建面授班级</button>', metrics + filterPanel('class-filter', selectField('班级状态', 'status', ['待排课', '待发布', '招生中', '进行中', '已结束', '已取消']) + selectField('报名条件', 'enrollmentCondition', ['未开始', '报名中', '已满员', '已截止', '已关闭']) + selectField('所属批次', 'batch', ['春季', '暑假', '秋季', '寒假']) + selectField('所属专业', 'category', professionalOptions) + inputField('关键词', 'keyword', '班级名称 / 课程名称', true)) + table('<thead><tr><th>班级名称</th><th>关联课程</th><th>批次</th><th>教师</th><th>报名/容量</th><th>班级状态</th><th>报名条件</th><th>排班版本</th><th>快速报名</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td><a class="reference-link" href="#">${row.name}</a></td><td>${row.course}</td><td>${row.batch}</td><td>${row.teacher || '待排课'}</td><td>${row.enrolled} / ${row.capacity}</td><td>${tag(row.status)}</td><td>${row.enrollmentCondition ? `<span class="tag ${row.enrollmentCondition === '报名中' ? 'green' : row.enrollmentCondition === '已满员' ? 'amber' : 'gray'}">${row.enrollmentCondition}</span>` : '—'}</td><td>${row.scheduleVersion ? `v${row.scheduleVersion}` : '—'}</td><td>${row.fast}</td><td class="action-cell"><button class="text-button" data-business-action="class-view">查看</button><button class="text-button" data-business-action="class-edit">编辑</button>${['待排课', '待发布'].includes(row.status) ? '<button class="text-button" data-business-action="class-schedule">去排课</button>' : '<button class="text-button" data-business-action="class-schedule">排班查看/变更</button>'}</td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#class-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, enrollmentCondition, batch, category, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!enrollmentCondition.value || row.enrollmentCondition === enrollmentCondition.value) && (!batch.value || row.batch === batch.value) && (!category.value || row.category === category.value) && (!keyword.value.trim() || `${row.name}${row.course}`.includes(keyword.value.trim()))); });
}

function renderTrials() {
  businessData = dataSets.trials;
  // CR-2026-038 §4.1／§5：试听状态只取 SM-TRIAL 四态，指标卡改为派生值。
  const trialMetrics = (list) => metricCards([['待确认', list.filter((row) => row.status === '待确认').length, '需要确认试听时间'], ['已确认', list.filter((row) => row.status === '已确认').length, '已发送通知'], ['已试听', list.filter((row) => row.status === '已试听').length, '可进入报名转化'], ['已取消', list.filter((row) => row.status === '已取消').length, '保留取消原因']]);
  pageFrame('后台登记试听', '', '<button class="button primary" data-business-action="trial-create">登记试听</button>', trialMetrics(businessData) + filterPanel('trial-filter', selectField('试听状态', 'status', ['待确认', '已确认', '已试听', '已取消']) + selectField('来源线索编号', 'leadNo', [...new Set(businessData.map((row) => row.leadNo).filter(Boolean))]) + selectField('目标课程', 'course', [...new Set(businessData.map((row) => row.course).filter(Boolean))]) + selectField('校区', 'campus', ['龙泉校区', '南湖校区']) + selectField('来源', 'source', leadSources) + inputField('关键词', 'keyword', '学员姓名 / 家长手机号', true)) + table('<thead><tr><th>学员姓名</th><th>家长手机号</th><th>目标课程</th><th>试听时间</th><th>校区</th><th>试听状态</th><th>来源线索编号</th><th>来源</th><th>跟进人</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td>${row.student}</td><td>${row.phone}</td><td>${row.course}</td><td>${row.time}</td><td>${row.campus}</td><td>${tag(row.status)}</td><td>${row.leadNo || '—'}</td><td>${row.source}</td><td>${row.owner}</td><td class="action-cell">${row.status === '待确认' ? '<button class="text-button" data-business-action="trial-confirm">确认试听</button>' : ''}<button class="text-button" data-business-action="trial-view">查看</button></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#trial-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, leadNo, course, campus, source, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!leadNo.value || row.leadNo === leadNo.value) && (!course.value || row.course === course.value) && (!campus.value || row.campus === campus.value) && (!source.value || row.source === source.value) && (!keyword.value.trim() || `${row.student}${row.phone}`.includes(keyword.value.trim()))); });
}

function renderLeads() {
  businessData = dataSets.leads;
  // CR-2026-038 §3／§5：线索状态只取 SM-LEAD 四态；指标卡与来源类型均与列表同源。
  const leadMetrics = (list) => metricCards([['待分配', list.filter((row) => row.status === '待分配').length, '等待负责人分配'], ['跟进中', list.filter((row) => row.status === '跟进中').length, '需要继续跟进'], ['已转化', list.filter((row) => row.status === '已转化').length, '已生成报名结果'], ['已流失', list.filter((row) => row.status === '已流失').length, '保留历史记录', list.length ? Math.round((list.filter((row) => row.status === '已流失').length / list.length) * 100) : 0]]);
  pageFrame('线索跟进', '', '<button class="button primary" data-business-action="lead-create">新增线索</button>', leadMetrics(businessData) + filterPanel('lead-filter', selectField('线索状态', 'status', ['待分配', '跟进中', '已转化', '已流失']) + selectField('来源类型', 'source', leadSources) + inputField('关键词', 'keyword', '学员姓名 / 手机号', true)) + table('<thead><tr><th>线索编号</th><th>联系人</th><th>手机号</th><th>意向课程</th><th>来源</th><th>线索状态</th><th>下次跟进</th><th>负责人</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td>${row.number}</td><td>${row.student}</td><td>${row.phone}</td><td>${row.course}</td><td>${row.source}</td><td>${tag(row.status)}</td><td>${row.next}</td><td>${row.owner}</td><td class="action-cell"><button class="text-button" data-business-action="lead-follow">填写跟进</button>${row.status === '跟进中' ? '<button class="text-button" data-business-action="lead-trial">转为试听</button><button class="text-button" data-business-action="lead-enroll">转报名</button>' : ''}<button class="text-button" data-business-action="lead-view">查看</button></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#lead-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, source, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!source.value || row.source === source.value) && (!keyword.value.trim() || `${row.student}${row.phone}`.includes(keyword.value.trim()))); });
}

function renderConversions() {
  // CR-2026-038 §2.1：报名转化不再是独立数据，按线索派生（关联试听记录与报名订单）。
  businessData = derivedConversions();
  const converted = businessData.filter((row) => row.status === '已报名').length;
  const attended = businessData.filter((row) => row.trial === '已试听').length;
  const rate = businessData.length ? `${((converted / businessData.length) * 100).toFixed(1)}%` : '0.0%';
  pageFrame('报名转化', '', '<button class="button" data-business-action="conversion-export">导出转化数据</button>', metricCards([['线索总数', businessData.length, '与线索跟进同源'], ['已试听', attended, '完成试听记录'], ['已报名', converted, '已生成面授订单', businessData.length ? Math.round((converted / businessData.length) * 100) : 0], ['报名转化率', rate, '已报名 ÷ 线索总数']]) + filterPanel('conversion-filter', selectField('转化状态', 'status', ['已报名', '未转化']) + selectField('试听状态', 'trial', ['待确认', '已确认', '已试听', '已取消', '无试听记录']) + selectField('目标课程', 'course', [...new Set(businessData.map((row) => row.course).filter(Boolean))]) + inputField('关键词', 'keyword', '学员姓名 / 手机号', true)) + table('<thead><tr><th>线索编号</th><th>联系人</th><th>意向课程</th><th>试听时间</th><th>试听状态</th><th>报名状态</th><th>报名班级</th><th>负责人</th><th>操作</th></tr></thead>'));
  const rows = (row) => `<td>${row.number}</td><td>${row.student}</td><td>${row.course}</td><td>${row.time}</td><td>${row.trial ? tag(row.trial) : '—'}</td><td>${tag(row.status)}</td><td>${row.className}</td><td>${row.owner}</td><td class="action-cell">${row.status === '未转化' ? '<button class="text-button" data-business-action="conversion-enroll">转报名</button>' : ''}<button class="text-button" data-business-action="conversion-view">查看</button></td>`;
  renderRows(businessData, rows, () => true);
  document.querySelector('#conversion-filter')?.addEventListener('submit', (event) => { event.preventDefault(); const { status, trial, course, keyword } = event.currentTarget; renderRows(businessData, rows, (row) => (!status.value || row.status === status.value) && (!trial.value || (trial.value === '无试听记录' ? !row.trial : row.trial === trial.value)) && (!course.value || row.course === course.value) && (!keyword.value.trim() || `${row.student}${row.number}`.includes(keyword.value.trim()))); });
}

// I1-O-16: the class detail dialog also shows generated sessions and the live class roster.
function appendClassRosterSection(row) {
  const card = document.querySelector('.sales-dialog[data-business-dialog] .sales-dialog-card');
  if (!card) return;
  const shared = readDemoState();
  const enrollments = (shared.enrollments || []).filter(item => item.classId === row.id && item.status === '已分班');
  const students = shared.students || [];
  const sessions = Array.isArray(row.sessions) ? row.sessions : [];
  const sessionLine = sessions.length ? `${sessions.length} 次 · 首次 ${sessions[0].date} ${sessions[0].startTime}-${sessions[0].endTime} · 末次 ${sessions[sessions.length - 1].date}` : '尚未生成课次';
  const roster = enrollments.length
    ? enrollments.map(item => { const student = students.find(entry => entry.id === item.studentId); return `<tr><td>${escapeHtml(student?.name || item.studentId)}</td><td>${escapeHtml(item.accountId || '—')}</td><td>${escapeHtml(item.enrolledAt || '—')}</td><td>已分班</td></tr>`; }).join('')
    : '<tr><td colspan="4">暂无学员报名；学员支付成功后会自动分班并出现在此处。</td></tr>';
  const remaining = Math.max(0, Number(row.capacity || 0) - Number(row.enrolled || 0));
  const aggregateNote = Number(row.enrolled || 0) > enrollments.length ? `<p class="sales-roster-meta">汇总报名 ${Number(row.enrolled || 0)} 人；当前可查看 ${enrollments.length} 条报名明细。</p>` : '';
  card.insertAdjacentHTML('beforeend', `<section class="sales-class-roster"><h3>课次与班级名单</h3><div class="sales-dialog-summary"><div><span>课次</span><strong>${sessions.length}</strong></div><div><span>已报名 / 容量</span><strong>${Number(row.enrolled || 0)} / ${Number(row.capacity || 0)}</strong></div><div><span>剩余名额</span><strong>${remaining}</strong></div></div><p class="sales-roster-meta">上课规则：${escapeHtml(row.schedule || '—')} · 课次：${escapeHtml(sessionLine)}</p>${aggregateNote}<div class="sales-table-wrap"><table><thead><tr><th>学员</th><th>登录账号</th><th>报名时间</th><th>状态</th></tr></thead><tbody>${roster}</tbody></table></div></section>`);
}

// CR-2026-032 §3：订单详情由通用弹窗改为订单专用分区详情（五分区，无数据的分区不渲染，不展示渠道侧标识与回调结果）。
function openOrderDetail(row) {
  const isVideo = row.type === '视频课程';
  const fulfillment = row.fulfillmentDetail || {};
  const fulfillmentRows = Object.entries(fulfillment).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value || '—'))}</dd></div>`).join('');
  const baseRows = [
    ['订单号', row.number],
    ['订单类型', row.type],
    ['课程名称', row.name],
    isVideo ? ['购买账号', `${row.account || '—'}（${row.accountPhone || '—'}）`] : ['报名学员', row.student || '—'],
    ['下单时间', row.time || '—'],
    ['订单金额', `¥${row.amount}`],
    ['订单状态', row.status],
    ['关联状态', row.fulfillment || '—']
  ].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value ?? '—'))}</dd></div>`).join('');
  const paymentRows = row.payment
    ? [['支付渠道', row.payment.channel], ['支付金额', `¥${row.payment.amount}`], ['支付状态', row.payment.status], ['支付时间', row.payment.time]].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value ?? '—'))}</dd></div>`).join('')
    : '';
  // CR-2026-036 §6.4：订单详情的退款分区同时展示线上退款单与线下退款登记。
  const linkedRefunds = (readDemoState().refunds || []).filter((item) => item.orderNo === row.number);
  const refundRecords = [
    ...(row.refund ? [{ number: row.refund.number, source: '线上', method: row.refund.method || '原路退回', amount: row.refund.amount, status: row.refund.status, at: row.refund.expectedAt || '以渠道回执为准', reason: row.refund.reason }] : []),
    ...linkedRefunds.map((item) => ({ number: item.no, source: item.source || '线上', method: item.channel, amount: item.amount, status: item.status, at: item.time, reason: item.reason }))
  ];
  const refundRows = refundRecords.length
    // UI 复核 CR-2026-032：退款分区补齐退款金额、退款状态与预计到账三项，与退款记录页口径一致。
    ? `<div class="table-wrap"><table><thead><tr><th>退款单号</th><th>退款方式</th><th>退款渠道</th><th>退款金额</th><th>退款状态</th><th>预计到账</th><th>申请时间</th><th>退款原因</th></tr></thead><tbody>${refundRecords.map((item) => `<tr><td>${escapeHtml(item.number)}</td><td>${escapeHtml(item.source || '线上')}</td><td>${escapeHtml(item.method || '—')}</td><td>¥${escapeHtml(Number(item.amount ?? 0).toFixed(2))}</td><td>${escapeHtml(item.status || '—')}</td><td>${escapeHtml(item.expectedAt || '以渠道回执为准')}</td><td>${escapeHtml(item.at || '—')}</td><td>${escapeHtml(item.reason || '—')}</td></tr>`).join('')}</tbody></table></div>`
    : '';
  const logRows = (row.logs || []).map((log) => `<tr><td>${escapeHtml(log.at)}</td><td>${escapeHtml(log.role)}</td><td>${escapeHtml(`${log.from} → ${log.to}`)}</td><td>${escapeHtml(log.reason || '—')}</td></tr>`).join('');
  const section = (title, content) => (content ? `<section class="course-detail-section wide"><h3>${title}</h3>${content}</section>` : '');
  const seatFailed = /报名未成功/.test(String(fulfillment['分班结果'] || ''));
  const body = [
    section('订单信息', `<dl class="course-detail-list">${baseRows}</dl>`),
    section('支付记录', paymentRows ? `<dl class="course-detail-list">${paymentRows}</dl>` : ''),
    section('退款记录', refundRows),
    section('履约结果', `<dl class="course-detail-list">${fulfillmentRows || '<div class="wide"><dt>结果</dt><dd>—</dd></div>'}${seatFailed ? '<div class="wide"><dt>退款结果</dt><dd>报名未成功，已发起全额原路退款</dd></div>' : ''}</dl>`),
    section('操作日志', logRows ? `<div class="table-wrap"><table><thead><tr><th>时间</th><th>操作人角色</th><th>状态变更</th><th>变更原因</th></tr></thead><tbody>${logRows}</tbody></table></div>` : '')
  ].join('');
  return openBusinessDialog('订单详情', `${row.number} · ${row.name}`, `<div class="course-detail-grid">${body}</div>`, '<button type="button" class="button" data-dialog-close>关闭</button>');
}

function readonlyRows(rows) {
  return `<dl class="course-detail-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value ?? '—'))}</dd></div>`).join('')}</dl>`;
}
function saleUnitDisplayReadonly(row) {
  return `<div class="sales-display-readonly"><div><span>展示封面</span><strong>${escapeHtml(row.coverFile || row.cover || '未配置')}</strong></div><div><span>C 端推荐语</span><strong>${escapeHtml(row.recommendation || row.recommend || '未配置')}</strong></div><div><span>课程标签</span><strong>${escapeHtml(courseDisplayTags(row).join('、') || '未配置')}</strong></div><div class="wide"><span>图文详情</span><section class="sales-display-preview">${richTextToHtml(row.displayDetail || row.detail, '<span class="sub-cell">未配置</span>')}</section></div></div>`;
}
function openProductDetail(row) {
  const course = businessCourse(row.courseId);
  const changes = Array.isArray(row.priceChanges) ? row.priceChanges : [];
  const changeRows = changes.length ? changes.map(change => `<tr><td>${escapeHtml(change.at || '—')}</td><td>${escapeHtml(change.item || '售价')}</td><td>${escapeHtml(change.from || '—')}</td><td>${escapeHtml(change.to || '—')}</td><td>${escapeHtml(change.operator || '—')}</td></tr>`).join('') : '<tr><td colspan="5">暂无变更记录</td></tr>';
  const disabledNotice = course?.disabledAt ? '<p class="sales-danger-note">关联课程已停用，学员端不再展示或允许购买。请恢复课程或下架本商品。</p>' : '';
  const body = `${disabledNotice}${workspaceTabs([['overview', '商品概览'], ['course', '课程内容'], ['sale', '展示与销售'], ['changes', '变更记录']], 'overview')}<section data-workspace-panel="overview" class="sales-workspace-panel">${readonlyRows([['商品编号', row.id], ['商品名称', row.name], ['商品状态', row.status], ['售卖价格', `¥${row.price}`], ['销售数量', row.sales], ['关联课程', row.course], ['引用版本', `v${row.courseVersion || 1}`], ['上架时间', row.updated || row.shelfAt || '—']])}</section><section data-workspace-panel="course" class="sales-workspace-panel" hidden>${courseReadonlyContent(course)}</section><section data-workspace-panel="sale" class="sales-workspace-panel" hidden>${readonlyRows([['售卖价格', `¥${row.price}`], ['试看策略', row.preview], ['试看课时', row.previewHours || '—'], ['商品状态', row.status], ['定时上架', row.shelfAt || '—']])}${saleUnitDisplayReadonly(row)}</section><section data-workspace-panel="changes" class="sales-workspace-panel" hidden><div class="sales-table-wrap"><table><thead><tr><th>生效时间</th><th>变更项</th><th>变更前</th><th>变更后</th><th>操作人</th></tr></thead><tbody>${changeRows}</tbody></table></div></section>`;
  const dialog = openBusinessDialog('商品详情', `${row.name} · ${row.status}`, body, '<button type="button" class="button" data-dialog-close>关闭</button><button type="button" class="button primary" data-business-action="product-edit-detail">编辑商品</button>', { workspace: true });
  dialog.querySelector('[data-business-action="product-edit-detail"]')?.addEventListener('click', () => { closeBusinessDialog(); openProductForm(row); });
  initWorkspace(dialog, 'overview');
}
function openClassDetail(row) {
  const course = businessCourse(row.courseId);
  const shared = readDemoState();
  const enrollments = (shared.enrollments || []).filter(item => item.classId === row.id && item.status === '已分班');
  const students = shared.students || [];
  const roster = enrollments.length ? enrollments.map(item => { const student = students.find(entry => entry.id === item.studentId); return `<tr><td>${escapeHtml(student?.name || item.studentId)}</td><td>${escapeHtml(item.enrolledAt || '—')}</td><td>已分班</td></tr>`; }).join('') : '<tr><td colspan="3">暂无学员报名</td></tr>';
  const sessions = Array.isArray(row.sessions) ? row.sessions : [];
  const body = `${workspaceTabs([['overview', '班级概览'], ['course', '课程内容'], ['teaching', '教学安排'], ['enrollment', '招生设置'], ['students', '学员与记录']], 'overview')}<section data-workspace-panel="overview" class="sales-workspace-panel">${readonlyRows([['班级编号', row.id], ['班级名称', row.name], ['关联课程', row.course], ['引用版本', `v${row.courseVersion || 1}`], ['运营状态', row.status], ['排班状态', row.scheduleVersion > 0 ? `已发布 v` : (row.scheduleStatus === '草稿' ? '排班待发布' : '未排班')], ['报名条件', classEnrollmentCondition(row)], ['前台展示', row.display], ['定价', `¥${row.price}`], ['报名 / 容量', `${row.enrolled || 0} / ${row.capacity || 0}`]])}</section><section data-workspace-panel="course" class="sales-workspace-panel" hidden>${courseReadonlyContent(course)}</section><section data-workspace-panel="teaching" class="sales-workspace-panel" hidden>${readonlyRows([['所属批次', row.batch], ['授课教师', row.teacher], ['校区', row.campus], ['教室', row.classroom], ['上课规则', row.schedule], ['首次上课', row.firstLessonDate || '—'], ['课次时长', `${row.lessonDuration || DEFAULT_LESSON_DURATION} 分钟`], ['已生成课次', sessions.length]])}</section><section data-workspace-panel="enrollment" class="sales-workspace-panel" hidden>${readonlyRows([['课程定价', `¥${row.price}`], ['报名开始', row.enrollStart || '—'], ['报名截止', row.deadline || '—'], ['快速报名', row.fast], ['支持试听', row.trialEnabled || '是'], ['试听收费', row.trialFee || '否'], ['试听价格', row.trialFee === '是' ? `¥${row.trialPrice || 0}` : '免费'], ['试听说明', row.trialNote || '—']])}${saleUnitDisplayReadonly(row)}</section><section data-workspace-panel="students" class="sales-workspace-panel" hidden><div class="sales-dialog-summary"><div><span>已报名</span><strong>${row.enrolled || 0}</strong></div><div><span>招生容量</span><strong>${row.capacity || 0}</strong></div><div><span>剩余名额</span><strong>${Math.max(0, Number(row.capacity || 0) - Number(row.enrolled || 0))}</strong></div></div><div class="sales-table-wrap"><table><thead><tr><th>学员</th><th>报名时间</th><th>状态</th></tr></thead><tbody>${roster}</tbody></table></div></section>`;
  // CR-2026-047 §7：动作门控只看主状态——首次发布前（待排课／待发布）提供「去排课」，发布后提供「排班查看／变更」，两页门控一致。
  const scheduleAction = ['待排课', '待发布'].includes(deriveClassStatus(row))
    ? `<a class="button primary" href="/admin/pages/academic/scheduling.html?classId=${encodeURIComponent(row.id)}">去排课</a>`
    : `<a class="button" href="/admin/pages/academic/scheduling.html?classId=${encodeURIComponent(row.id)}">排班查看／变更</a>`;
  const dialog = openBusinessDialog('班级详情', `${row.name} · ${deriveClassStatus(row)}`, body, `<button type="button" class="button" data-dialog-close>关闭</button><button type="button" class="button" data-business-action="class-edit-detail">编辑班级</button>${scheduleAction}`, { workspace: true });
  dialog.querySelector('[data-business-action="class-edit-detail"]')?.addEventListener('click', () => { closeBusinessDialog(); openClassForm(row); });
  initWorkspace(dialog, 'overview');
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

// CR-2026-038 §2.2：试听记录必须关联来源线索，保存后进入试听列表。
function openTrialForm() {
  const leadOptions = dataSets.leads.map((item) => `<option value="${escapeHtml(item.number)}">${escapeHtml(item.number)} · ${escapeHtml(item.student)} · ${escapeHtml(item.course)}</option>`).join('');
  const fields = `<label class="form-field wide"><span>来源线索编号 <b class="required-mark">*</b></span><select name="leadNo" required><option value="">请选择来源线索</option>${leadOptions}</select></label>${inputField('学员姓名', 'student', '请输入学员姓名')}${inputField('家长手机号', 'phone', '请输入手机号')}${inputField('目标课程', 'course', '请输入目标课程')}${inputField('试听时间', 'time', '2026-09-20 09:00')}${selectField('试听校区', 'campus', ['龙泉校区', '南湖校区'])}${selectField('来源', 'source', leadSources)}<label class="form-field wide"><span>备注</span><textarea name="remark" placeholder="选填，记录试听安排或特殊说明"></textarea></label>`;
  const dialog = openBusinessDialog('登记试听', '试听记录必须关联来源线索；线索与试听的来源类型使用同一套取值。', `<form id="business-dialog-form" class="sales-dialog-grid">${fields}</form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="business-dialog-form" class="button primary">确认</button>');
  dialog.querySelector('#business-dialog-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const leadNo = String(data.get('leadNo') || '');
    if (!leadNo) { showToast('请选择来源线索编号', 'error'); return; }
    dataSets.trials.unshift({ id: `trial-${Date.now()}`, leadNo, student: String(data.get('student') || '').trim() || '—', phone: String(data.get('phone') || '').trim() || '—', course: String(data.get('course') || '').trim() || '—', time: String(data.get('time') || '').trim() || '—', campus: data.get('campus'), status: '待确认', source: data.get('source') || '后台登记', owner: '赵顾问' });
    closeBusinessDialog();
    renderTrials();
    showToast('试听记录已登记，并已关联来源线索。');
  });
}

// CR-2026-038 §2.2／§2.3：线索详情展示该线索名下的试听记录与报名结果，形成完整链条。
function openLeadDetail(row) {
  const trials = dataSets.trials.filter((item) => item.leadNo === row.number);
  const order = leadOrderOf(row);
  const facts = [['线索编号', row.number], ['联系人', row.student], ['手机号', row.phone], ['意向课程', row.course], ['来源', row.source], ['线索状态', row.status], ['下次跟进', row.next], ['负责人', row.owner]];
  const factRows = facts.map(([label, value]) => `<div><span>${label}</span><strong>${label.includes('状态') ? tag(value) : escapeHtml(String(value ?? '—'))}</strong></div>`).join('');
  const trialRows = trials.length ? trials.map((item) => `<tr><td>${escapeHtml(item.time)}</td><td>${escapeHtml(item.campus)}</td><td>${tag(item.status)}</td><td>${escapeHtml(item.owner)}</td></tr>`).join('') : '<tr><td colspan="4">暂无试听记录</td></tr>';
  const body = `<div class="sales-detail-list">${factRows}</div><section class="course-detail-section wide"><h3>试听记录</h3><div class="table-wrap"><table><thead><tr><th>试听时间</th><th>校区</th><th>试听状态</th><th>跟进人</th></tr></thead><tbody>${trialRows}</tbody></table></div></section><section class="course-detail-section wide"><h3>报名结果</h3><p>${order ? `已生成面授订单 ${escapeHtml(order.number)}，关联班级：${escapeHtml(order.linked || '—')}` : '暂无报名订单，报名状态为未转化。'}</p></section>`;
  openBusinessDialog('线索详情', `${row.number} · ${row.student}`, `<div class="course-detail-grid">${body}</div>`, '<button type="button" class="button" data-dialog-close>关闭</button>');
}

function openSimpleForm(title, subtitle, fields, onSubmitMessage) {
  const dialog = openBusinessDialog(title, subtitle, `<form id="business-dialog-form" class="sales-dialog-grid">${fields}</form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="business-dialog-form" class="button primary">确认</button>');
  dialog.querySelector('#business-dialog-form')?.addEventListener('submit', (event) => { event.preventDefault(); closeBusinessDialog(); showToast(onSubmitMessage); });
}

function handleBusinessAction(action, row) {
  if (action === 'product-view') return openProductDetail(row);
  if (action === 'product-create' || action === 'product-edit') return openProductForm(row);
  if (action === 'product-version-sync') {
    const latest = versionForCourseId(row.courseId);
    if (latest <= Number(row.courseVersion || 1)) return showToast('当前商品已引用最新课程版本。', 'warning');
    row.courseVersion = latest;
    persistProduct(row);
    renderProducts();
    return showToast(`商品已显式同步到课程 v${latest}；历史订单仍按下单快照。`);
  }
  // RM-F-09: one-click demo reset so a live review never depends on pre-seeded results.
  if (action === 'demo-reset') {
    if (!window.confirm('确认恢复初始数据？当前订单、商品、班级和授权记录将恢复到初始状态。')) return;
    resetDemoData();
    window.alert('数据已恢复到初始状态，页面将刷新。');
    window.location.reload();
    return;
  }
  if (action === 'product-publish' || action === 'product-unpublish') { row.status = action === 'product-publish' ? '已上架' : '已下架'; row.updated = action === 'product-publish' ? demoTime() : row.updated; persistProduct(row); renderProducts(); showToast(action === 'product-publish' ? '商品已上架，学员端可购买。' : '商品已下架，历史订单不受影响。'); return; }
  if (action === 'order-view') return openOrderDetail(row);
  if (action === 'class-view') return openClassDetail(row);
  if (action === 'class-create' || action === 'class-edit') return openClassForm(row);
  if (action === 'class-schedule') { location.href = `/admin/pages/academic/scheduling.html?classId=${encodeURIComponent(row.id)}`; return; }
  if (action === 'trial-view') return openDetail(row, 'trial');
  if (action === 'trial-confirm') { row.status = '已确认'; renderTrials(); showToast('试听时间已确认，已发送学员通知。'); return; }
  if (action === 'trial-create') return openTrialForm();
  if (action === 'lead-view') return openLeadDetail(row);
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
  if (action === 'product-publish' || action === 'product-unpublish') {
    if (!row) return;
    if (action === 'product-publish' && courseCatalog.find(course => course.id === row.courseId)?.disabledAt) {
      openBusinessDialog('无法上架商品', '关联课程已停用。', '<p class="sales-danger-note">请先恢复关联课程，再重新上架商品。课程停用期间学员端不得展示或购买。</p>');
      return;
    }
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
document.addEventListener('click', (event) => { const actionElement = event.target.closest('[data-business-action]'); const row = actionElement?.closest('tr[data-row-id]'); if (actionElement && row && ['product-publish', 'product-unpublish'].includes(actionElement.dataset.businessAction)) businessActive = row.dataset.rowId; });

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
if (businessPage === 'classes') {
  renderClasses();
  // 课程库入口带入课程及版本，仍进入同一个面授班级创建工作台。
  const requestedClassCourseId = businessParams.get('courseId');
  if (requestedClassCourseId) {
    const targetClass = dataSets.classes.find(item => item.courseId === requestedClassCourseId);
    if (targetClass) openClassForm(targetClass);
    else openClassForm(null, { courseId: requestedClassCourseId });
  }
}
if (businessPage === 'trials') renderTrials();
if (businessPage === 'leads') renderLeads();
if (businessPage === 'conversions') renderConversions();
