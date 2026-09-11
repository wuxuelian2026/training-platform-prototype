import { demoId, readDemoState, removeDemoRecord, upsertDemoRecord } from './demo-store.js';
import { SEMESTERS, mergePeriods, mergeVenues, resolveSlotId, shiftPeriod } from './venue-seed.js';

const academicRoot = document.querySelector('[data-academic-page]');
const academicPage = academicRoot?.dataset.academicPage;
let academicData = null;
let academicToastTimer;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const statusClass = (value) => ({
  启用: 'green', 停用: 'gray', 未发布: 'gray', 招生中: 'brand', 已满员: 'amber', 进行中: 'brand', 已结束: 'gray', 已排班: 'green', 待排班: 'amber', 冲突: 'red', 无: 'green',
  待上课: 'amber', 上课中: 'brand', 已完成: 'green', 已取消: 'gray', 已停课: 'red', 已到: 'green', 迟到: 'amber', 请假: 'gray', 缺勤: 'red', 正常: 'green', 待补录: 'amber', 已补录: 'green',
  作业进行中: 'brand', 作业已结束: 'gray', 发送成功: 'green', 部分失败: 'amber', 发送中: 'brand', 发送失败: 'red', 待复核: 'brand', 建议结业: 'green', 需补课: 'amber', 补课中: 'amber', 已通过: 'green', 已取消结业: 'gray', 未发起: 'gray', 复核中: 'brand', 已归档: 'gray',
  草稿: 'gray', 已发布: 'green', 已撤回: 'amber', 已生成: 'green', 生成中: 'brand', 生成失败: 'red'
}[value] || 'gray');
const tag = (value) => `<span class="tag ${statusClass(value)}">${escapeHtml(value)}</span>`;

function showToast(message, kind = 'success') {
  const element = document.querySelector('[data-academic-toast]');
  if (!element) return;
  element.textContent = message; element.dataset.kind = kind; element.hidden = false;
  window.clearTimeout(academicToastTimer); academicToastTimer = window.setTimeout(() => { element.hidden = true; }, 2800);
}
function closeDialog() { document.querySelector('[data-academic-dialog]')?.remove(); }
function openDialog(title, subtitle, body, actions = '<button type="button" class="button" data-dialog-close>关闭</button>', className = '') {
  closeDialog();
  const dialog = document.createElement('dialog'); dialog.className = `academic-dialog ${className}`; dialog.dataset.academicDialog = 'true';
  dialog.innerHTML = `<div class="academic-dialog-card"><div class="academic-dialog-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button type="button" class="icon-button" data-dialog-close title="关闭" aria-label="关闭">×</button></div>${body}<div class="academic-dialog-actions">${actions}</div></div>`;
  document.body.append(dialog); dialog.showModal(); return dialog;
}
function pageFrame(title, description, controls, content) {
  if (!academicRoot) return;
  academicRoot.innerHTML = `<div class="academic-page"><div class="page-head"><div><h1>${title}</h1><p>${description}</p></div>${controls || ''}</div>${content}<div class="toast" data-academic-toast role="status" aria-live="polite" hidden></div></div>`;
}
function metrics(items) { return `<div class="card-grid compact-metrics">${items.map(([label, value, note]) => `<div class="card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`).join('')}</div>`; }
function field(label, name, type = 'text', placeholder = '', wide = false) { return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><input type="${type}" name="${name}" placeholder="${placeholder}"></label>`; }
function select(label, name, options, wide = false, includeAll = true) { return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><select name="${name}">${includeAll ? `<option value="">全部${label}</option>` : ''}${options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}</select></label>`; }
function table(head, extraClass = '') { return `<div class="table-wrap academic-table ${extraClass}"><table>${head}<tbody class="table-body"></tbody></table></div><div class="pagination-bar"><span class="result-count">—</span><button class="button" disabled>上一页</button><button class="button primary">1</button><button class="button" disabled>下一页</button></div>`; }
function filterPanel(id, fields) { return `<div class="filter-panel" data-filter-drawer-shell="${id}"><button type="button" class="button filter-drawer-trigger" data-filter-drawer-trigger="${id}" aria-expanded="false" aria-controls="${id}"><span class="filter-trigger-icon" aria-hidden="true"></span>筛选条件</button><div class="filter-drawer-backdrop" data-filter-drawer-backdrop="${id}" hidden></div><form class="card filter-form" id="${id}"><div class="filter-head"><strong>筛选条件</strong><span>当前仅展示原型数据</span><button type="button" class="icon-button filter-drawer-close" data-filter-drawer-close="${id}" title="关闭筛选条件" aria-label="关闭筛选条件">×</button></div><div class="filter-grid academic-filter-grid">${fields}</div><div class="filter-actions"><button type="reset" class="button">重置</button><button type="submit" class="button primary">查询</button></div></form></div>`; }
function renderRows(rows, rowTemplate, empty = '暂无符合条件的数据。') {
  const body = academicRoot.querySelector('.table-body'); if (!body) return;
  body.innerHTML = rows.length ? rows.map((row) => `<tr data-row-id="${escapeHtml(row.id)}">${rowTemplate(row)}</tr>`).join('') : `<tr><td colspan="20"><div class="empty">${empty}</div></td></tr>`;
  const count = academicRoot.querySelector('.result-count'); if (count) count.textContent = `共 ${rows.length} 条`;
}
function applyFilter(formId, source, predicate, rowTemplate) { document.querySelector(`#${formId}`)?.addEventListener('submit', (event) => { event.preventDefault(); renderRows(source.filter(predicate(event.currentTarget)), rowTemplate); }); document.querySelector(`#${formId}`)?.addEventListener('reset', () => window.setTimeout(() => renderRows(source, rowTemplate), 0)); }

// E03: venues live in the shared demo store so scheduling, matrix and export read the same archive.
const venues = mergeVenues(readDemoState());
function persistVenue(record) { upsertDemoRecord('venues', record); }
const schedules = [
  { id: 'schedule-dance', name: '少儿舞蹈基础班', course: '舞蹈基本功', batch: '2026秋季', teacher: '王玥', campus: '龙泉校区', room: '综合楼302', rule: '每周六 09:00-10:30', generated: '8 / 16', status: '招生中', conflict: '无' },
  { id: 'schedule-vocal', name: '成人声乐班', course: '声乐基础', batch: '2026秋季', teacher: '陈晨', campus: '南湖校区', room: '音乐楼201', rule: '每周日 14:00-15:30', generated: '0 / 12', status: '未发布', conflict: '教师时间冲突' },
  { id: 'schedule-paint', name: '国画入门工作坊', course: '中国画基础', batch: '2026秋季', teacher: '赵老师', campus: '龙泉校区', room: '艺术楼105', rule: '每周三 18:30-20:00', generated: '10 / 10', status: '进行中', conflict: '无' },
  { id: 'schedule-old', name: '暑期声乐提高班', course: '声乐演唱技巧', batch: '2026暑期', teacher: '陈晨', campus: '南湖校区', room: '音乐楼201', rule: '每周日 09:00-10:30', generated: '12 / 12', status: '已结束', conflict: '无' }
];
const sessions = [
  { id: 'session-1', date: '2026-09-08', day: '周二', time: '09:00-10:30', course: '舞蹈基本功', className: '少儿舞蹈基础班', teacher: '王玥', campus: '龙泉校区', room: '综合楼302', status: '上课中', attendance: '待补录' },
  { id: 'session-2', date: '2026-09-08', day: '周二', time: '14:00-15:30', course: '声乐基础', className: '成人声乐班', teacher: '陈晨', campus: '南湖校区', room: '音乐楼201', status: '已完成', attendance: '正常' },
  { id: 'session-3', date: '2026-09-10', day: '周四', time: '18:30-20:00', course: '中国画基础', className: '国画入门工作坊', teacher: '赵老师', campus: '龙泉校区', room: '艺术楼105', status: '待上课', attendance: '—' },
  { id: 'session-4', date: '2026-09-13', day: '周日', time: '09:00-10:30', course: '声乐演唱技巧', className: '暑期声乐提高班', teacher: '陈晨', campus: '南湖校区', room: '音乐楼201', status: '已停课', attendance: '—' }
];
// E04: rows come from the semester slot scheme (21 slots by default) held in the shared store, so the
// matrix and the A4 export follow whatever the user maintains on the 时段方案 page.
const academicSemesterKey = 'hbyx-academic-semester';
function currentSemester() { try { const stored = localStorage.getItem(academicSemesterKey); return SEMESTERS.includes(stored) ? stored : SEMESTERS[0]; } catch { return SEMESTERS[0]; } }
function setSemester(semester) { try { localStorage.setItem(academicSemesterKey, semester); } catch { /* ignore */ } }
function timetableTimeSlots() { return mergePeriods(readDemoState(), currentSemester()); }
function persistPeriod(record) { upsertDemoRecord('periods', { ...record, semester: record.semester || currentSemester() }); }
const timetableSeedSessions = [
  { id: 'mts-1', className: '少儿舞蹈基础班', course: '舞蹈基本功', teacher: '王玥', campus: '龙泉校区', building: '综合楼', roomId: 'venue-302', slotId: 'sat-am', start: '09:00', end: '10:30', status: '待上课', conflict: null },
  { id: 'mts-2', className: '成人形体班', course: '形体训练', teacher: '王玥', campus: '龙泉校区', building: '综合楼', roomId: 'venue-302', slotId: 'sat-am', start: '09:30', end: '11:00', status: '待上课', conflict: { type: 'teacher', target: '王玥' } },
  { id: 'mts-3', className: '少儿舞蹈提高班', course: '舞蹈基本功', teacher: '王玥', campus: '龙泉校区', building: '综合楼', roomId: 'venue-302', slotId: 'sat-am', start: '11:00', end: '12:30', status: '已停课', stopped: true, conflict: null },
  { id: 'mts-4', className: '成人声乐班', course: '声乐基础', teacher: '陈晨', campus: '南湖校区', building: '音乐楼', roomId: 'venue-201', slotId: 'sun-pm', start: '14:00', end: '15:30', status: '待上课', conflict: null },
  { id: 'mts-5', className: '声乐演唱提高班', course: '声乐演唱技巧', teacher: '陈晨', campus: '南湖校区', building: '音乐楼', roomId: 'venue-201', slotId: 'sun-pm', start: '14:00', end: '15:30', status: '待上课', conflict: { type: 'room', target: '音乐楼201' } },
  { id: 'mts-6', className: '合唱基础训练', course: '合唱', teacher: '李青', campus: '南湖校区', building: '音乐楼', roomId: 'venue-201', slotId: 'sun-pm', start: '15:30', end: '17:00', status: '待上课', conflict: null },
  { id: 'mts-7', className: '声乐表演工作坊', course: '声乐演唱技巧', teacher: '陈晨', campus: '南湖校区', building: '音乐楼', roomId: 'venue-201', slotId: 'sun-pm', start: '16:00', end: '17:30', status: '待上课', conflict: null },
  { id: 'mts-8', className: '国画入门工作坊', course: '中国画基础', teacher: '赵老师', campus: '龙泉校区', building: '艺术楼', roomId: 'venue-105', slotId: 'wed-eve', start: '18:30', end: '20:00', status: '待上课', conflict: null },
  { id: 'mts-9', className: '书法基础班', course: '书法基础', teacher: '赵老师', campus: '龙泉校区', building: '艺术楼', roomId: 'venue-105', slotId: 'other', start: '08:00', end: '09:00', status: '待上课', conflict: null }
];
// E06: published class sessions (which carry room, slot and start/end) are projected into the matrix
// alongside the demo rows, so a class published in the CRM shows up in the timetable.
function sharedTimetableSessions() {
  const shared = readDemoState();
  const periods = timetableTimeSlots();
  return (shared.classes || []).filter(item => item && Array.isArray(item.sessions)).flatMap(classRow => classRow.sessions.map(session => ({
    id: `${classRow.id}-session-${session.index}`,
    className: classRow.name,
    course: classRow.course,
    teacher: classRow.teacher,
    campus: classRow.campus,
    building: (classRow.classroom || '').replace(/\d+$/, '') || classRow.campus,
    roomId: session.roomId || '',
    slotId: session.slotId || resolveSlotId(session.weekday, session.startTime, session.endTime, periods),
    start: session.startTime,
    end: session.endTime,
    date: session.date,
    status: session.status || '待上课',
    conflict: null
  })));
}
function allTimetableSessions() { return [...timetableSeedSessions, ...sharedTimetableSessions()]; }
const attendance = [
  { id: 'att-1', className: '少儿舞蹈基础班', session: '第8次课', date: '2026-09-08', student: '林知夏', status: '已到', process: '正常', time: '08:54', teacher: '王玥' },
  { id: 'att-2', className: '少儿舞蹈基础班', session: '第8次课', date: '2026-09-08', student: '周子涵', status: '缺勤', process: '待补录', time: '—', teacher: '王玥' },
  { id: 'att-3', className: '少儿舞蹈基础班', session: '第8次课', date: '2026-09-08', student: '赵思远', status: '迟到', process: '正常', time: '09:12', teacher: '王玥' },
  { id: 'att-4', className: '成人声乐班', session: '第7次课', date: '2026-09-07', student: '刘女士', status: '请假', process: '已补录', time: '13:45', teacher: '陈晨' },
  { id: 'att-5', className: '成人声乐班', session: '第7次课', date: '2026-09-07', student: '陈一诺', status: '已到', process: '正常', time: '13:51', teacher: '陈晨' }
];
const homework = [
  { id: 'homework-1', title: '第8次课后练习', className: '少儿舞蹈基础班', session: '第8次课', teacher: '王玥', published: '2026-09-08 11:00', deadline: '2026-09-10 23:59', submitted: 18, total: 20, status: '进行中', content: '完成基本功组合练习，上传练习视频或文字记录。', reviewed: 12 },
  { id: 'homework-2', title: '气息练习记录', className: '成人声乐班', session: '第7次课', teacher: '陈晨', published: '2026-09-05 16:00', deadline: '2026-09-07 23:59', submitted: 16, total: 16, status: '已结束', content: '记录一次气息练习过程，并写下练习感受。', reviewed: 16 },
  { id: 'homework-3', title: '线条临摹练习', className: '国画入门工作坊', session: '第10次课', teacher: '赵老师', published: '2026-09-06 18:00', deadline: '2026-09-12 23:59', submitted: 9, total: 12, status: '进行中', content: '完成三组线条临摹，提交图片并附简短创作说明。', reviewed: 5 }
];
const messages = [
  { id: 'message-1', title: '9月16日课程调课通知', type: '调课通知', audience: '教师、学员', className: '少儿舞蹈基础班', time: '2026-09-08 09:20', status: '发送成功', fail: '' },
  { id: 'message-2', title: '秋季班开课提醒', type: '上课提醒', audience: '学员', className: '成人声乐班', time: '2026-09-07 16:00', status: '部分失败', fail: '2 位学员小程序订阅失效' },
  { id: 'message-3', title: '国画课停课通知', type: '停课通知', audience: '教师、学员', className: '国画入门工作坊', time: '2026-09-06 17:30', status: '发送成功', fail: '' }
];
const graduation = [{
  id: 'graduation-dance', className: '少儿舞蹈基础班', course: '舞蹈基本功', teacher: '王玥', operational: '已结束', classStatus: '待复核', endDate: '2026-09-08', learners: [
    { id: 'learner-lin', name: '林知夏', attendance: '100%', homework: '100%', comment: '动作完成度高，能够主动复盘。', suggestion: '继续保持练习习惯。', status: '待复核' },
    { id: 'learner-zhao', name: '赵思远', attendance: '89%', homework: '100%', comment: '课堂参与积极，但有效出勤率未达到结业阈值。', suggestion: '完成补课后再申请结业。', status: '待复核' },
    { id: 'learner-zhou', name: '周子涵', attendance: '78%', homework: '65%', comment: '阶段性练习完成度不足。', suggestion: '完成补课后再申请结业。', status: '需补课' },
    { id: 'learner-he', name: '何安', attendance: '—', homework: '—', comment: '已办理退学。', suggestion: '', status: '已取消结业' }
  ]
}, {
  id: 'graduation-vocal', className: '成人声乐班', course: '声乐基础', teacher: '陈晨', operational: '已结束', classStatus: '已归档', endDate: '2026-09-07', learners: [
    { id: 'learner-liu', name: '刘女士', attendance: '96%', homework: '100%', comment: '声音控制稳定，完成度良好。', suggestion: '保持日常发声训练。', status: '已通过' },
    { id: 'learner-chen', name: '陈一诺', attendance: '100%', homework: '92%', comment: '学习目标达成。', suggestion: '尝试更多曲目。', status: '已通过' }
  ]
}];
const reports = [
  { id: 'report-1', number: 'RP20260908001', student: '林知夏', course: '舞蹈基本功', className: '少儿舞蹈基础班', semester: '2026秋季', status: '草稿', version: 'v1', generation: '已生成', updated: '2026-09-08 10:02', comment: '动作完成度高，能够主动复盘。', reason: '' },
  { id: 'report-2', number: 'RP20260907012', student: '刘女士', course: '声乐基础', className: '成人声乐班', semester: '2026秋季', status: '已发布', version: 'v1', generation: '已生成', updated: '2026-09-07 16:28', comment: '声音控制稳定，完成度良好。', reason: '' },
  { id: 'report-3', number: 'RP20260906004', student: '赵子涵', course: '中国画基础', className: '国画入门工作坊', semester: '2026秋季', status: '草稿', version: 'v1', generation: '生成失败', updated: '2026-09-06 19:10', comment: '报告生成任务失败，需重试。', reason: '' }
];

function renderVenues() {
  academicData = venues;
  const buildingCount = new Set(venues.map(item => `${item.campus}-${item.building}`)).size;
  pageFrame('场地管理', '维护校区、教学楼和教室，排课时只使用启用场地；停用教室的历史课次仍可查询。', '<button class="button" data-academic-action="venue-import">Excel 批量导入</button><button class="button primary" data-academic-action="venue-create">新增场地</button>', metrics([['校区', new Set(venues.map(item => item.campus)).size, '龙泉、南湖'], ['教学楼', buildingCount, '已建立基础档案'], ['教室', venues.length, '含停用场地'], ['已启用', venues.filter((v) => v.status === '启用').length, '停用场地不进入新矩阵列']]) + filterPanel('venue-filter', select('校区', 'campus', ['龙泉校区', '南湖校区']) + select('场地类型', 'type', ['舞蹈房', '琴房', '画室', '普通教室']) + select('状态', 'status', ['启用', '停用']) + field('关键词', 'keyword', 'text', '名称 / 教室编号')) + table('<thead><tr><th>教室</th><th>所属校区</th><th>教学楼</th><th>类型</th><th>容量</th><th>设备标签</th><th>状态</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.campus)}</td><td>${escapeHtml(item.building)}</td><td>${escapeHtml(item.type)}</td><td>${item.capacity}人</td><td class="muted">${escapeHtml(item.tags || '—')}</td><td>${tag(item.status)}</td><td class="action-cell"><button class="text-button" data-academic-action="venue-edit">编辑</button><button class="text-button" data-academic-action="venue-toggle">${item.status === '启用' ? '停用' : '启用'}</button><button class="text-button" data-academic-action="venue-schedule">查看排课</button><button class="text-button danger-link" data-academic-action="venue-delete">删除</button></td>`;
  renderRows(academicData, row);
  applyFilter('venue-filter', academicData, (form) => { const { campus, type, status, keyword } = form; return (row) => (!campus.value || row.campus === campus.value) && (!type.value || row.type === type.value) && (!status.value || row.status === status.value) && (!keyword.value.trim() || `${row.name}${row.building}`.includes(keyword.value.trim())); }, row);
}
// E04: semester-bound time-slot scheme (21 slots by default) that feeds the matrix rows.
function periodUsageCount(periodId) {
  return allTimetableSessions().filter(session => session.slotId === periodId).length;
}
function openPeriodForm(row = null) {
  const option = (value, current) => `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(value)}</option>`;
  const body = `<form id="period-form" class="academic-form-grid">
    <label class="form-field"><span>所属学期 <b class="required-mark">*</b></span><select name="semester" required>${SEMESTERS.map(v => option(v, row?.semester || currentSemester())).join('')}</select></label>
    <label class="form-field"><span>星期 <b class="required-mark">*</b></span><select name="weekday" required><option value="">请选择星期</option>${['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(v => option(v, row?.weekday)).join('')}</select></label>
    <label class="form-field"><span>时段名称 <b class="required-mark">*</b></span><input name="name" required value="${escapeHtml(row?.name || '')}" placeholder="如 周六 上午" /></label>
    <label class="form-field"><span>开始时间 <b class="required-mark">*</b></span><input name="start" type="time" required value="${escapeHtml(row?.start || '')}" /></label>
    <label class="form-field"><span>结束时间 <b class="required-mark">*</b></span><input name="end" type="time" required value="${escapeHtml(row?.end || '')}" /></label>
    <label class="form-field"><span>状态</span><select name="enabled">${option('启用', row?.enabled === false ? '停用' : '启用')}${option('停用', row?.enabled === false ? '停用' : '启用')}</select></label>
    <p class="academic-note wide">时段按学期维护；停用时段不再作为矩阵行，命中不到任何时段的课次会落入「其他时段」兜底行。</p>
  </form>`;
  const dialog = openDialog(row ? '编辑时段' : '新增时段', '时段方案决定课表矩阵的行；排序支持上移/下移。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="period-form">保存时段</button>', 'academic-period-dialog');
  dialog.querySelector('#period-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const start = String(data.get('start')); const end = String(data.get('end'));
    if (start >= end) { showToast('结束时间需晚于开始时间。', 'error'); return; }
    const list = mergePeriods(readDemoState(), data.get('semester'));
    const record = {
      id: row?.id || demoId('period'),
      semester: data.get('semester'),
      weekday: data.get('weekday'),
      name: String(data.get('name')).trim(),
      start, end,
      sort: row?.sort || list.filter(item => item.semester === data.get('semester')).length + 1,
      enabled: data.get('enabled') !== '停用'
    };
    persistPeriod(record);
    if (record.semester !== currentSemester()) setSemester(record.semester);
    closeDialog(); renderPeriods();
    showToast(row ? '时段已保存。' : '时段已创建，可作为课表矩阵行使用。');
  });
}
function movePeriod(row, direction) {
  const list = timetableTimeSlots();
  shiftPeriod(list, row.id, direction).forEach(item => persistPeriod(item));
  renderPeriods();
  showToast(direction === 'up' ? '时段已上移。' : '时段已下移。');
}
function togglePeriod(row) {
  row.enabled = row.enabled === false;
  persistPeriod(row);
  renderPeriods();
  showToast(row.enabled ? '时段已启用。' : '时段已停用，相关课次将进入「其他时段」。');
}
function deletePeriod(row) {
  const used = periodUsageCount(row.id);
  if (used > 0) { showToast(`该时段仍有 ${used} 条课次，请先调整课次或停用时段。`, 'error'); return; }
  openDialog('确认删除时段', '删除后该行不再出现在课表矩阵中。', `<p>确认删除时段“${escapeHtml(row.name)}”？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="period-delete">确认删除</button>').dataset.rowId = row.id;
}
function resetPeriodScheme() {
  const semester = currentSemester();
  (readDemoState().periods || []).filter(item => item.semester === semester).forEach(item => removeDemoRecord('periods', item.id));
  renderPeriods();
  showToast(`${semester} 已恢复默认 21 段时段方案。`);
}
function renderPeriods() {
  const semester = currentSemester();
  const list = timetableTimeSlots();
  academicData = list;
  const otherCount = allTimetableSessions().filter(session => !list.some(item => item.id === session.slotId)).length;
  pageFrame('时段方案', '按学期维护周一至周日的上午/下午/晚上时段，课表矩阵的行即来自这里。',
    `<select class="academic-inline-select" data-academic-semester>${SEMESTERS.map(item => `<option ${item === semester ? 'selected' : ''}>${item}</option>`).join('')}</select><button class="button" data-academic-action="period-reset">恢复默认 21 段</button><button class="button primary" data-academic-action="period-create">新增时段</button>`,
    metrics([['学期', semester, '学期绑定时段方案'], ['时段段', list.length, '默认 21 段'], ['已启用', list.filter(item => item.enabled !== false).length, '参与矩阵行'], ['未命中课次', otherCount, '进入「其他时段」兜底行']])
    + '<p class="academic-note">周一至周日 × 上午（09:00-12:00）/ 下午（14:00-18:00）/ 晚上（18:30-21:00）共 21 段为默认种子；可增删改、排序和启停。</p>'
    + table('<thead><tr><th>排序</th><th>时段名称</th><th>星期</th><th>开始 - 结束</th><th>状态</th><th>关联课次</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${Number(item.sort || 0)}</td><td><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${escapeHtml(item.semester || semester)}</span></td><td>${escapeHtml(item.weekday)}</td><td>${escapeHtml(item.start)}–${escapeHtml(item.end)}</td><td>${tag(item.enabled === false ? '停用' : '启用')}</td><td>${periodUsageCount(item.id)}</td><td class="action-cell"><button class="text-button" data-academic-action="period-up">上移</button><button class="text-button" data-academic-action="period-down">下移</button><button class="text-button" data-academic-action="period-edit">编辑</button><button class="text-button" data-academic-action="period-toggle">${item.enabled === false ? '启用' : '停用'}</button><button class="text-button danger-link" data-academic-action="period-delete">删除</button></td>`;
  renderRows(academicData, row);
  document.querySelector('[data-academic-semester]')?.addEventListener('change', (event) => { setSemester(event.target.value); renderPeriods(); });
}

function renderScheduling() {
  academicData = schedules;
  pageFrame('排班管理', '为已发布班级生成课次，发布和调课前自动校验教师、教室时间冲突。', '<button class="button primary" data-academic-action="schedule-create">创建班级排班</button>', metrics([['待排班', schedules.filter((s) => s.status === '未发布').length, '关联课程编排需已完成'], ['本周课次', '86', '按有效课次统计'], ['冲突待处理', schedules.filter((s) => s.conflict !== '无').length, '需修改后重试'], ['进行中', schedules.filter((s) => s.status === '进行中').length, '已开始上课的班级']]) + filterPanel('schedule-filter', select('班级状态', 'status', ['未发布', '招生中', '已满员', '进行中', '已结束']) + select('授课教师', 'teacher', ['王玥', '陈晨', '赵老师']) + select('校区', 'campus', ['龙泉校区', '南湖校区']) + field('关键词', 'keyword', 'text', '班级名称')) + '<p class="academic-note warning">发布排班会生成课次列表；任一教师或教室冲突都会阻止发布，并展示冲突对象。</p>' + table('<thead><tr><th>班级名称</th><th>课程</th><th>教师 / 校区</th><th>教室</th><th>上课规则</th><th>已生成课次</th><th>班级状态</th><th>冲突</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td><strong>${item.name}</strong></td><td>${item.course}</td><td>${item.teacher}<br><span class="muted">${item.campus}</span></td><td>${item.room}</td><td>${item.rule}</td><td>${item.generated}</td><td>${tag(item.status)}</td><td>${item.conflict === '无' ? tag('无') : `<span class="tag red">${escapeHtml(item.conflict)}</span>`}</td><td class="action-cell">${item.status === '未发布' ? '<button class="text-button" data-academic-action="schedule-publish">发布</button>' : ''}${['招生中', '进行中'].includes(item.status) ? '<button class="text-button" data-academic-action="schedule-reschedule">调课</button><button class="text-button" data-academic-action="schedule-suspend">停课</button>' : ''}<button class="text-button" data-academic-action="schedule-view">查看</button></td>`;
  renderRows(academicData, row);
  applyFilter('schedule-filter', academicData, (form) => { const { status, teacher, campus, keyword } = form; return (item) => (!status.value || item.status === status.value) && (!teacher.value || item.teacher === teacher.value) && (!campus.value || item.campus === campus.value) && (!keyword.value.trim() || item.name.includes(keyword.value.trim())); }, row);
}
const timetableViewKey = 'hbyx-academic-timetable-view';
function getTimetableView() { try { return localStorage.getItem(timetableViewKey) === 'matrix' ? 'matrix' : 'list'; } catch { return 'list'; } }
function setTimetableView(view) { try { localStorage.setItem(timetableViewKey, view); } catch { /* ignore */ } renderTimetable(); }
function timetableViewSwitch() {
  const view = getTimetableView();
  return `<div class="academic-view-switch" role="tablist" aria-label="课表视图切换"><button type="button" class="${view === 'list' ? 'active' : ''}" data-academic-action="timetable-view" data-view="list" role="tab" aria-selected="${view === 'list'}">列表视图</button><button type="button" class="${view === 'matrix' ? 'active' : ''}" data-academic-action="timetable-view" data-view="matrix" role="tab" aria-selected="${view === 'matrix'}">矩阵视图</button></div>`;
}
function renderTimetable() { return getTimetableView() === 'matrix' ? renderTimetableMatrix() : renderTimetableList(); }
function renderTimetableList() {
  academicData = sessions;
  pageFrame('课表管理', '按校区、教师和班级查看已生成课次；课表不支持拖拽编辑。', `${timetableViewSwitch()}<div class="toolbar-actions"><button class="button" data-academic-action="timetable-prev">上一周</button><button class="button primary" data-academic-action="timetable-current">本周</button><button class="button" data-academic-action="timetable-next">下一周</button></div>`, '<div class="academic-calendar-toolbar"><strong data-timetable-label>2026年9月7日 - 9月13日</strong><div class="toolbar-actions"><button class="button primary" data-academic-action="timetable-mode" data-mode="周视图">周视图</button><button class="button" data-academic-action="timetable-mode" data-mode="日视图">日视图</button><button class="button" data-academic-action="timetable-mode" data-mode="月视图">月视图</button></div></div>' + filterPanel('timetable-filter', select('校区', 'campus', ['龙泉校区', '南湖校区']) + select('授课教师', 'teacher', ['王玥', '陈晨', '赵老师']) + select('班级', 'className', ['少儿舞蹈基础班', '成人声乐班', '国画入门工作坊']) + select('课次状态', 'status', ['待上课', '上课中', '已完成', '已取消', '已停课'])) + table('<thead><tr><th>日期</th><th>时间</th><th>课程 / 班级</th><th>教师</th><th>校区 / 教室</th><th>课次状态</th><th>考勤处理</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${item.date} ${item.day}</td><td>${item.time}</td><td>${item.course}<br><span class="muted">${item.className}</span></td><td>${item.teacher}</td><td>${item.campus}<br>${item.room}</td><td>${tag(item.status)}</td><td>${item.attendance === '—' ? '—' : tag(item.attendance)}</td><td><button class="text-button" data-academic-action="session-view">查看课次</button></td>`;
  renderRows(academicData, row);
  applyFilter('timetable-filter', academicData, (form) => { const { campus, teacher, className, status } = form; return (item) => (!campus.value || item.campus === campus.value) && (!teacher.value || item.teacher === teacher.value) && (!className.value || item.className === className.value) && (!status.value || item.status === status.value); }, row);
}
function timetableSessionSort(a, b) { return a.start.localeCompare(b.start) || a.end.localeCompare(b.end); }
function matrixConflictText(conflict) { return conflict?.type === 'teacher' ? `冲突：教师 ${conflict.target} 同时段已有课次` : conflict?.type === 'room' ? `冲突：教室 ${conflict.target} 同时段已有课次` : ''; }
function matrixEntryMarkup(session) {
  const cls = ['matrix-entry'];
  if (session.conflict) cls.push('is-conflict');
  else if (session.stopped) cls.push('is-stopped');
  return `<button type="button" class="${cls.join(' ')}" data-academic-action="matrix-session-view" data-session-id="${escapeHtml(session.id)}"><strong>${escapeHtml(session.className)}</strong><span>${escapeHtml(session.start)}–${escapeHtml(session.end)}</span><span>${escapeHtml(session.teacher)}</span>${session.conflict ? `<em>${escapeHtml(matrixConflictText(session.conflict))}</em>` : ''}</button>`;
}
function matrixCell(sessions) {
  if (!sessions.length) return '';
  const collapsed = sessions.length > 3;
  const visible = collapsed ? sessions.slice(0, 3) : sessions;
  const more = collapsed ? `<button type="button" class="matrix-more" data-academic-action="matrix-expand" data-count="${sessions.length - 3}">还有 ${sessions.length - 3} 条</button>` : '';
  const rest = collapsed ? `<div class="matrix-cell-all" hidden>${sessions.slice(3).map(matrixEntryMarkup).join('')}</div>` : '';
  return `<div class="matrix-cell">${visible.map(matrixEntryMarkup).join('')}${more}${rest}</div>`;
}
function readTimetableMatrixFilter(form) {
  return {
    campus: form.campus?.value || '',
    building: form.building?.value || '',
    type: form.type?.value || '',
    teacher: form.teacher?.value || '',
    className: form.className?.value || '',
    status: form.status?.value || ''
  };
}
function renderTimetableMatrix(filterState = {}) {
  academicData = allTimetableSessions();
  window.__timetableMatrixFilter = filterState;
  const stateParam = new URLSearchParams(window.location.search).get('state') || '';
  const semester = currentSemester();
  const controls = `${timetableViewSwitch()}<div class="toolbar-actions"><select class="academic-inline-select" aria-label="学期" data-academic-semester>${SEMESTERS.map(item => `<option ${item === semester ? 'selected' : ''}>${item}</option>`).join('')}</select><a class="button" href="/admin/pages/academic/periods.html">时段方案</a><button class="button" data-academic-action="timetable-export" data-kind="excel">导出 Excel</button><button class="button" data-academic-action="timetable-export" data-kind="pdf">导出 PDF</button><button class="button" data-academic-action="timetable-print">打印</button></div>`;
  const description = '按教室查看学期课次分布；矩阵只读，调整课次仍走排班管理。';
  const filterHtml = filterPanel('timetable-matrix-filter', select('校区', 'campus', ['龙泉校区', '南湖校区']) + select('教学楼', 'building', ['综合楼', '音乐楼', '艺术楼']) + select('场地类型', 'type', ['舞蹈房', '琴房', '画室', '普通教室']) + select('授课教师', 'teacher', ['王玥', '陈晨', '赵老师', '李青']) + select('班级', 'className', ['少儿舞蹈基础班', '成人声乐班', '国画入门工作坊', '成人形体班', '合唱基础训练', '书法基础班']) + select('课次状态', 'status', ['待上课', '已停课']));

  if (stateParam === 'no-permission') { pageFrame('课表管理', description, controls, '<div class="card empty">当前角色无权查看课表矩阵数据。</div>'); return; }
  if (stateParam === 'no-venue') { pageFrame('课表管理', description, controls, `${filterHtml}<div class="card empty">暂无启用教室，请先在场地管理中维护教室。<a class="button" href="/admin/pages/academic/venues.html">去场地管理</a></div>`); return; }
  if (stateParam === 'no-slot') { pageFrame('课表管理', description, controls, `${filterHtml}<div class="card empty">当前学期未配置排课时段。<a class="button" href="/admin/pages/academic/scheduling.html">去时段方案配置</a></div>`); return; }

  const rooms = venues.filter((v) => v.status === '启用')
    .filter((v) => !filterState.campus || v.campus === filterState.campus)
    .filter((v) => !filterState.building || v.building === filterState.building)
    .filter((v) => !filterState.type || v.type === filterState.type)
    .sort((a, b) => a.building.localeCompare(b.building, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
  const slots = timetableTimeSlots().filter((s) => s.enabled !== false);
  const slotIds = new Set(slots.map((s) => s.id));
  const sessions = allTimetableSessions()
    .filter((s) => !filterState.teacher || s.teacher === filterState.teacher)
    .filter((s) => !filterState.className || s.className === filterState.className)
    .filter((s) => !filterState.status || s.status === filterState.status);
  if (stateParam === 'no-session') sessions.splice(0);
  const otherSessions = sessions.filter((s) => !slotIds.has(s.slotId));
  const cellsFor = (room, slotId) => sessions.filter((s) => s.slotId === slotId && s.roomId === room.id).sort(timetableSessionSort);

  const header = `<tr><th class="matrix-corner"><span>时段 / 教室</span></th>${rooms.map((room) => `<th><strong>${escapeHtml(room.name)}</strong><small>${escapeHtml(room.building)}</small></th>`).join('')}</tr>`;
  const body = slots.map((slot) => `<tr><th class="matrix-slot"><strong>${escapeHtml(slot.name)}</strong><small>${escapeHtml(slot.start)}–${escapeHtml(slot.end)}</small></th>${rooms.map((room) => `<td>${matrixCell(cellsFor(room, slot.id))}</td>`).join('')}</tr>`).join('');
  const otherRow = otherSessions.length ? `<tr class="matrix-other-row"><th class="matrix-slot">其他时段<small>未命中配置</small></th>${rooms.map((room) => `<td>${matrixCell(otherSessions.filter((s) => s.roomId === room.id).sort(timetableSessionSort))}</td>`).join('')}</tr>` : '';
  const notice = stateParam === 'no-session' ? '<p class="academic-note">当前学期暂无课次。</p>' : otherSessions.length ? `<p class="academic-note warning">${otherSessions.length} 条课次不在已配置时段内，请检查时段方案。</p>` : '';
  const legend = '<div class="academic-matrix-legend"><span><i class="legend-normal"></i>正常课次</span><span><i class="legend-conflict"></i>冲突课次</span><span><i class="legend-stopped"></i>已停课</span></div>';
  const matrix = rooms.length ? `<div class="academic-matrix-wrap"><table class="academic-matrix"><thead>${header}</thead><tbody>${body}${otherRow}</tbody></table></div>` : '<div class="card empty">暂无启用教室。</div>';

  pageFrame('课表管理', description, controls, filterHtml + notice + matrix + legend);
  document.querySelector('#timetable-matrix-filter')?.addEventListener('submit', (event) => { event.preventDefault(); renderTimetableMatrix(readTimetableMatrixFilter(event.currentTarget)); });
  document.querySelector('#timetable-matrix-filter')?.addEventListener('reset', () => window.setTimeout(() => renderTimetableMatrix(), 0));
  document.querySelector('[data-academic-semester]')?.addEventListener('change', (event) => { setSemester(event.target.value); renderTimetable(); });
}
function openTimetableSessionDialog(session) {
  const room = venues.find((v) => v.id === session.roomId);
  openDialog(`${session.className} · 课次详情`, '课次为只读展示，调整时间或教室请前往排班管理。', `<div class="academic-detail-list"><div><span>班级名称</span><strong>${escapeHtml(session.className)}</strong></div><div><span>课程名称</span><strong>${escapeHtml(session.course)}</strong></div><div><span>授课教师</span><strong>${escapeHtml(session.teacher)}</strong></div><div><span>校区 / 教室</span><strong>${escapeHtml(session.campus)} / ${escapeHtml(room?.name || '—')}</strong></div><div><span>上课时间</span><strong>${escapeHtml(session.start)}–${escapeHtml(session.end)}</strong></div><div><span>课次状态</span><strong>${tag(session.status)}</strong></div><div><span>冲突校验</span><strong>${escapeHtml(session.conflict ? matrixConflictText(session.conflict) : '无')}</strong></div><div><span>考勤处理</span><strong>待补录</strong></div></div>`, '<button type="button" class="button" data-dialog-close>关闭</button><a class="button primary" href="/admin/pages/academic/scheduling.html">去排班管理</a>');
}
// E11: A4 landscape export. Columns paginate by teaching building, rows paginate by weekday group,
// the header row repeats on every sheet and empty slot rows are hidden by default.
const EXPORT_ROOMS_PER_SHEET = 4;
const EXPORT_SLOTS_PER_SHEET = 9;
function buildTimetableSheets(hideEmpty = true, filterState = {}) {
  const semester = currentSemester();
  const rooms = venues.filter((v) => v.status === '启用')
    .filter((v) => !filterState.campus || v.campus === filterState.campus)
    .filter((v) => !filterState.building || v.building === filterState.building)
    .filter((v) => !filterState.type || v.type === filterState.type)
    .sort((a, b) => a.building.localeCompare(b.building, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
  const allSlots = timetableTimeSlots().filter((s) => s.enabled !== false);
  const sessions = allTimetableSessions()
    .filter((s) => !filterState.teacher || s.teacher === filterState.teacher)
    .filter((s) => !filterState.className || s.className === filterState.className)
    .filter((s) => !filterState.status || s.status === filterState.status);
  const slotIds = new Set(allSlots.map((s) => s.id));
  const otherSlots = sessions.filter((s) => !slotIds.has(s.slotId)).length ? [{ id: 'other', name: '其他时段', start: '', end: '', weekday: '未命中配置' }] : [];
  const rows = [...allSlots, ...otherSlots];
  const cellOf = (room, slotId) => sessions.filter((s) => s.roomId === room.id && s.slotId === slotId).sort(timetableSessionSort);
  const sheets = [];
  const buildings = [...new Set(rooms.map((room) => room.building))];
  buildings.forEach((building) => {
    const buildingRooms = rooms.filter((room) => room.building === building);
    const roomChunks = [];
    for (let i = 0; i < buildingRooms.length; i += EXPORT_ROOMS_PER_SHEET) roomChunks.push(buildingRooms.slice(i, i + EXPORT_ROOMS_PER_SHEET));
    roomChunks.forEach((roomChunk, chunkIndex) => {
      let remaining = rows.filter((row) => !hideEmpty || row.id === 'other' || roomChunk.some((room) => cellOf(room, row.id).length));
      const groups = [];
      let cursor = 0;
      while (cursor < remaining.length) {
        const slice = remaining.slice(cursor, cursor + EXPORT_SLOTS_PER_SHEET);
        const firstWeekday = slice[0]?.weekday;
        const sameDay = slice.filter((row) => row.weekday === firstWeekday);
        groups.push(sameDay.length === slice.length ? slice : slice.filter((row) => row.weekday === firstWeekday));
        cursor += groups[groups.length - 1].length;
      }
      groups.forEach((slotGroup, groupIndex) => sheets.push({ building, roomChunk, chunkIndex, slotGroup, groupIndex, cellOf, semester }));
    });
  });
  const hiddenCount = rows.length * Math.max(rooms.length, 0) - rooms.reduce((sum, room) => sum + rows.filter((row) => cellOf(room, row.id).length).length, 0);
  return { sheets, rooms, rows, sessions, hiddenCount: hideEmpty ? hiddenCount : 0 };
}
function timetableSheetMarkup(sheet, index, total) {
  const header = `<tr><th class="matrix-corner">时段 / 教室</th>${sheet.roomChunk.map((room) => `<th><strong>${escapeHtml(room.name)}</strong><small>${escapeHtml(room.campus)} · 容量 ${room.capacity}</small></th>`).join('')}</tr>`;
  const body = sheet.slotGroup.map((slot) => `<tr><th class="matrix-slot"><strong>${escapeHtml(slot.name)}</strong><small>${slot.start ? `${escapeHtml(slot.start)}–${escapeHtml(slot.end)}` : '未命中时段配置'}</small></th>${sheet.roomChunk.map((room) => {
    const entries = sheet.cellOf(room, slot.id);
    if (!entries.length) return '<td class="export-empty">—</td>';
    return `<td>${entries.map((entry) => `<div class="export-entry${entry.conflict ? ' is-conflict' : ''}"><strong>${escapeHtml(entry.className)}</strong><span>${escapeHtml(entry.start)}–${escapeHtml(entry.end)} · ${escapeHtml(entry.teacher)}</span>${entry.conflict ? `<em>${escapeHtml(matrixConflictText(entry.conflict))}</em>` : ''}</div>`).join('')}</td>`;
  }).join('')}</tr>`).join('');
  return `<section class="academic-print-sheet"><header><h1>2026秋季课程表</h1><p>${escapeHtml(sheet.building)} · ${escapeHtml(sheet.semester)} · 只读矩阵导出</p></header><table class="academic-print-table"><thead>${header}</thead><tbody>${body}</tbody></table><footer><span>${escapeHtml(sheet.building)}${sheet.chunkIndex ? `（第 ${sheet.chunkIndex + 1} 组教室）` : ''}</span><span>第 ${index + 1} 页 / 共 ${total} 页 · 导出时间 ${new Date().toLocaleString('zh-CN')}</span></footer></section>`;
}
function openTimetableExport(kind, filterState = {}) {
  const label = kind === 'excel' ? 'Excel' : 'PDF';
  const preview = buildTimetableSheets(true, filterState);
  const pageCount = preview.sheets.length || 1;
  const roomCount = preview.rooms.length;
  const body = `<div class="academic-export-preview"><div class="academic-export-title">2026秋季课程表 · A4 横向预览</div>
    <p class="academic-note">共 ${pageCount} 页；列按教学楼每 ${EXPORT_ROOMS_PER_SHEET} 间教室横向分页，行按周内天数纵向分页，表头每页重复。</p>
    <div class="academic-export-pages">${(preview.sheets.length ? preview.sheets.slice(0, 2) : []).map((sheet, index) => `<div class="academic-export-page"><strong>第 ${index + 1} 页</strong><span>${escapeHtml(sheet.building)} · ${sheet.roomChunk.length} 间教室 · ${sheet.slotGroup.length} 个时段</span></div>`).join('') || '<div class="academic-export-page"><strong>暂无课次</strong><span>当前筛选条件下没有可导出的课次。</span></div>'}</div>
    <div class="academic-export-meta"><span>启用教室 ${roomCount} 间</span><span>课次 ${preview.sessions.length} 条</span><span>默认隐藏空时段 ${preview.hiddenCount} 格</span></div></div>
    <label class="academic-checkbox"><input type="checkbox" data-export-hide-empty checked>隐藏整行无课次的时段（取消勾选可导出完整 21 段）</label>`;
  openDialog(`导出课表（${label}）`, 'A4 横向；超出单页按教学楼横向分页、按周内天数纵向分页，表头每页重复。', body, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-academic-action="timetable-export-confirm" data-kind="' + kind + '">确认导出</button>', 'academic-export-dialog');
}
function printTimetable(hideEmpty) {
  const { sheets } = buildTimetableSheets(hideEmpty, window.__timetableMatrixFilter || {});
  document.querySelector('.academic-print-root')?.remove();
  const root = document.createElement('div');
  root.className = 'academic-print-root';
  root.innerHTML = sheets.length ? sheets.map((sheet, index) => timetableSheetMarkup(sheet, index, sheets.length)).join('') : '<section class="academic-print-sheet"><header><h1>2026秋季课程表</h1></header><p>当前筛选条件下没有可导出的课次。</p></section>';
  document.body.append(root);
  window.print();
}
function renderAttendance() {
  academicData = attendance;
  pageFrame('考勤监控', '查看教师端上传的学员打卡流水，集中处理待补录和超时考勤。', '<button class="button" data-academic-action="attendance-export">导出考勤</button>', metrics([['今日记录', attendance.length, '实时打卡流水'], ['可计入统计', attendance.filter((a) => a.process !== '待补录').length, '待补录不计入结业判定'], ['待补录', attendance.filter((a) => a.process === '待补录').length, '需要教务处理'], ['异常状态', attendance.filter((a) => ['迟到', '缺勤'].includes(a.status)).length, '请核对教师记录']]) + filterPanel('attendance-filter', select('班级', 'className', ['少儿舞蹈基础班', '成人声乐班']) + `<label class="form-field"><span>课次日期</span><div class="date-range"><input type="date" name="from" value="2026-09-01"><span>至</span><input type="date" name="to" value="2026-09-30"></div></label>` + select('考勤状态', 'status', ['已到', '迟到', '请假', '缺勤']) + select('考勤处理状态', 'process', ['正常', '待补录', '已补录']) + field('学员姓名', 'student', 'text', '模糊搜索') + select('授课教师', 'teacher', ['王玥', '陈晨'], true)) + '<p class="academic-note warning">“待补录”记录暂不参与出勤率、缺勤率和结业判定；超过教师补录时限后由教务主管处理，并填写处理说明。</p>' + table('<thead><tr><th>班级 / 课次</th><th>上课日期</th><th>学员</th><th>考勤状态</th><th>处理状态</th><th>打卡时间</th><th>授课教师</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${item.className}<br><span class="muted">${item.session}</span></td><td>${item.date}</td><td>${item.student}</td><td>${tag(item.status)}</td><td>${tag(item.process)}</td><td>${item.time}</td><td>${item.teacher}</td><td class="action-cell"><button class="text-button" data-academic-action="attendance-view">查看详情</button>${item.process === '待补录' ? '<button class="text-button" data-academic-action="attendance-supplement">补录处理</button>' : ''}</td>`;
  renderRows(academicData, row);
  applyFilter('attendance-filter', academicData, (form) => { const { className, status, process, student, teacher } = form; return (item) => (!className.value || item.className === className.value) && (!status.value || item.status === status.value) && (!process.value || item.process === process.value) && (!student.value.trim() || item.student.includes(student.value.trim())) && (!teacher.value || item.teacher === teacher.value); }, row);
}
function renderHomework() {
  academicData = homework;
  pageFrame('作业批阅监管', '监督作业发布、提交和文本评语批阅进度；本模块不设置分数和等级。', '<button class="button" data-academic-action="homework-export">导出记录</button>', metrics([['进行中', homework.filter((h) => h.status === '进行中').length, '仍在提交期限内'], ['待批阅', homework.reduce((sum, h) => sum + h.submitted - h.reviewed, 0), '仅展示提交数量差'], ['已结束', homework.filter((h) => h.status === '已结束').length, '超过提交截止时间'], ['批阅完成率', '72%', '按提交份数统计']]) + filterPanel('homework-filter', select('班级', 'className', ['少儿舞蹈基础班', '成人声乐班', '国画入门工作坊']) + select('作业状态', 'status', ['进行中', '已结束']) + field('关键词', 'keyword', 'text', '作业标题')) + '<p class="academic-note">批阅内容只允许填写文本评语，可选上传批注图片或文档；不得录入分数、等级字段。</p>' + table('<thead><tr><th>作业标题</th><th>班级 / 课次</th><th>教师</th><th>发布时间</th><th>截止时间</th><th>已提交 / 总人数</th><th>作业状态</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td><strong>${item.title}</strong><br><span class="muted">已批阅 ${item.reviewed} 份</span></td><td>${item.className}<br><span class="muted">${item.session}</span></td><td>${item.teacher}</td><td>${item.published}</td><td>${item.deadline}</td><td>${item.submitted} / ${item.total}</td><td>${tag(item.status === '进行中' ? '作业进行中' : '作业已结束')}</td><td><button class="text-button" data-academic-action="homework-view">查看详情</button></td>`;
  renderRows(academicData, row);
  applyFilter('homework-filter', academicData, (form) => { const { className, status, keyword } = form; return (item) => (!className.value || item.className === className.value) && (!status.value || item.status === status.value) && (!keyword.value.trim() || item.title.includes(keyword.value.trim())); }, row);
}
function renderMessages() {
  academicData = messages;
  pageFrame('消息推送', '向教师和学员发送上课提醒、停课和调课通知，失败消息支持补发。', '<button class="button primary" data-academic-action="message-create">发送班级通知</button>', metrics([['本月已发送', '86', '自动提醒与人工通知'], ['发送成功', '84', '渠道正常送达'], ['部分失败', '2', '可查看失败原因并补发'], ['定时提醒', '18', '上课前24小时触发']]) + filterPanel('message-filter', select('消息类型', 'type', ['停课通知', '调课通知', '上课提醒']) + select('发送状态', 'status', ['发送成功', '部分失败', '发送中', '发送失败']) + field('关键词', 'keyword', 'text', '标题 / 班级')) + table('<thead><tr><th>消息标题</th><th>消息类型</th><th>发送对象</th><th>关联班级</th><th>发送时间</th><th>发送状态</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td><strong>${item.title}</strong></td><td>${item.type}</td><td>${item.audience}</td><td>${item.className}</td><td>${item.time}</td><td>${tag(item.status)}</td><td class="action-cell"><button class="text-button" data-academic-action="message-view">查看</button>${item.status === '部分失败' || item.status === '发送失败' ? '<button class="text-button" data-academic-action="message-resend">补发</button>' : ''}</td>`;
  renderRows(academicData, row);
  applyFilter('message-filter', academicData, (form) => { const { type, status, keyword } = form; return (item) => (!type.value || item.type === type.value) && (!status.value || item.status === status.value) && (!keyword.value.trim() || `${item.title}${item.className}`.includes(keyword.value.trim())); }, row);
}
function classCounts(item) { const valid = item.learners.filter((l) => l.status !== '已取消结业'); return { total: item.learners.length, approved: item.learners.filter((l) => l.status === '已通过').length, suggested: item.learners.filter((l) => l.status === '待复核' && Number.parseInt(l.attendance) >= 90 && Number.parseInt(l.homework) >= 80).length, retaking: item.learners.filter((l) => ['需补课', '补课中'].includes(l.status)).length, pending: item.learners.filter((l) => l.status === '待复核').length, cancelled: item.learners.filter((l) => l.status === '已取消结业').length, rate: valid.length ? Math.round(item.learners.filter((l) => ['已通过', '需补课', '补课中'].includes(l.status)).length / valid.length * 100) : 0 }; }
function renderGraduation() {
  academicData = graduation;
  pageFrame('结业审核', '按班级进入审核台，最终按学员确认结业或退回补课；不会把班级整体直接标记为已结业。', '<button class="button" data-academic-action="graduation-export">导出审核台账</button>', metrics([['待复核班级', graduation.filter((g) => g.classStatus === '待复核').length, '按最早申请时间处理'], ['建议结业', graduation.reduce((s, g) => s + classCounts(g).suggested, 0), '系统按阈值初判'], ['补课中', graduation.reduce((s, g) => s + classCounts(g).retaking, 0), '学员级状态'], ['待补录考勤', attendance.filter((a) => a.process === '待补录').length, '不参与判定']]) + filterPanel('graduation-filter', select('班级结业状态', 'status', ['未发起', '待复核', '复核中', '已归档']) + select('授课教师', 'teacher', ['王玥', '陈晨']) + field('结课时间', 'date', 'date') + field('关键词', 'keyword', 'text', '班级名称')) + '<p class="academic-note">完成率 = 已有最终结业结果的有效学员 ÷ 有效学员总数。班级已归档只表示结业事务处理完成，不代表班级内所有学员均已通过。</p>' + table('<thead><tr><th>班级名称</th><th>课程 / 教师</th><th>运营状态</th><th>学员数</th><th>建议结业</th><th>补课中</th><th>待复核</th><th>已取消结业</th><th>班级结业状态</th><th>完成率</th><th>操作</th></tr></thead>'));
  const row = (item) => { const c = classCounts(item); return `<td><strong>${item.className}</strong><br><span class="muted">结课 ${item.endDate}</span></td><td>${item.course}<br><span class="muted">${item.teacher}</span></td><td>${tag(item.operational)}</td><td>${c.total}</td><td>${c.suggested}</td><td>${c.retaking ? tag(String(c.retaking)) : '0'}</td><td>${c.pending ? tag(String(c.pending)) : '0'}</td><td>${c.cancelled}</td><td>${tag(item.classStatus)}</td><td><div class="academic-progress">${c.rate}%<div class="academic-progress-bar"><span style="width:${c.rate}%"></span></div></div></td><td><button class="text-button" data-academic-action="graduation-review">${item.classStatus === '待复核' ? '按学员审核' : '查看'}</button></td>`; };
  renderRows(academicData, row);
  applyFilter('graduation-filter', academicData, (form) => { const { status, teacher, keyword } = form; return (item) => (!status.value || item.classStatus === status.value) && (!teacher.value || item.teacher === teacher.value) && (!keyword.value.trim() || item.className.includes(keyword.value.trim())); }, row);
}
function renderReports() {
  academicData = reports;
  pageFrame('学习报告管理', '结业确认后生成报告草稿，发布后学员端可见；撤回只隐藏报告正文，不改变结业和证书状态。', '<button class="button" data-academic-action="report-export">导出报告清单</button>', metrics([['草稿', reports.filter((r) => r.status === '草稿').length, '发布前仅后台可见'], ['已发布', reports.filter((r) => r.status === '已发布').length, '学员端可查看'], ['已撤回', reports.filter((r) => r.status === '已撤回').length, '修订后可再次发布'], ['生成失败', reports.filter((r) => r.generation === '生成失败').length, '结业状态不受影响']]) + filterPanel('report-filter', select('报告状态', 'status', ['草稿', '已发布', '已撤回']) + select('课程名称', 'course', ['舞蹈基本功', '声乐基础', '中国画基础']) + field('学员姓名', 'student', 'text', '姓名') + field('更新时间', 'date', 'date')) + '<p class="academic-note">报告与证书产物独立生成；生成失败时可重试，最多自动重试 3 次，失败期间不改变学员“已通过”结业状态。</p>' + table('<thead><tr><th>报告编号</th><th>学员</th><th>课程 / 班级</th><th>结业状态</th><th>报告状态</th><th>生成状态</th><th>版本 / 更新时间</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${item.number}</td><td>${item.student}</td><td>${item.course}<br><span class="muted">${item.className}</span></td><td>${tag('已通过')}</td><td>${tag(item.status)}</td><td>${tag(item.generation)}</td><td>${item.version}<br><span class="muted">${item.updated}</span></td><td class="action-cell"><button class="text-button" data-academic-action="report-preview">预览</button>${['草稿', '已撤回'].includes(item.status) ? '<button class="text-button" data-academic-action="report-publish">发布</button>' : ''}${item.status === '已发布' ? '<button class="text-button" data-academic-action="report-recall">撤回</button>' : ''}${item.generation === '生成失败' ? '<button class="text-button" data-academic-action="report-retry">重试</button>' : ''}${['草稿', '已撤回'].includes(item.status) ? '<button class="text-button danger-link" data-academic-action="report-delete">删除</button>' : ''}</td>`;
  renderRows(academicData, row);
  applyFilter('report-filter', academicData, (form) => { const { status, course, student } = form; return (item) => (!status.value || item.status === status.value) && (!course.value || item.course === course.value) && (!student.value.trim() || item.student.includes(student.value.trim())); }, row);
}

function openSimpleForm(title, subtitle, body, onSubmit, actions = '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="academic-form" class="button primary">确认</button>') {
  const dialog = openDialog(title, subtitle, `<form id="academic-form" class="academic-dialog-grid">${body}</form>`, actions);
  dialog.querySelector('#academic-form')?.addEventListener('submit', (event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget), dialog); });
  return dialog;
}
function detailDialog(title, subtitle, pairs) { openDialog(title, subtitle, `<div class="academic-detail-list">${pairs.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`); }
// E03: venue archive — create / edit / enable-disable / delete (guarded) / Excel import.
function venueUsedBySessions(venue) {
  const used = allTimetableSessions().filter(session => session.roomId === venue.id).length;
  const published = (readDemoState().classes || []).some(classRow => classRow.classroom === venue.name);
  return used > 0 || published;
}
function openVenueForm(row = null) {
  const option = (value, current) => `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(value)}</option>`;
  const body = `<form id="venue-form" class="academic-form-grid">
    <label class="form-field"><span>所属校区 <b class="required-mark">*</b></span><select name="campus" required><option value="">请选择校区</option>${['龙泉校区', '南湖校区'].map(v => option(v, row?.campus)).join('')}</select></label>
    <label class="form-field"><span>教学楼 <b class="required-mark">*</b></span><select name="building" required><option value="">请选择教学楼</option>${['综合楼', '音乐楼', '艺术楼'].map(v => option(v, row?.building)).join('')}</select></label>
    <label class="form-field"><span>教室名称 <b class="required-mark">*</b></span><input name="name" required value="${escapeHtml(row?.name || '')}" placeholder="如 综合楼302" /></label>
    <label class="form-field"><span>场地类型 <b class="required-mark">*</b></span><select name="type" required><option value="">请选择类型</option>${['舞蹈房', '琴房', '画室', '普通教室'].map(v => option(v, row?.type)).join('')}</select></label>
    <label class="form-field"><span>容量 <b class="required-mark">*</b></span><input name="capacity" type="number" min="1" required value="${escapeHtml(row?.capacity || '')}" placeholder="可容纳人数" /></label>
    <label class="form-field wide"><span>设备标签</span><input name="tags" value="${escapeHtml(row?.tags || '')}" placeholder="如 镜面墙 / 音响" /></label>
    <label class="form-field"><span>场地状态</span><select name="status">${['启用', '停用'].map(v => option(v, row?.status || '启用')).join('')}</select></label>
    <p class="academic-note wide">停用场地不会删除历史排课与课次，只是不再出现在新矩阵列中；删除教师前需先确认没有被课次或班级引用。</p>
  </form>`;
  const dialog = openDialog(row ? '编辑场地' : '新增场地', '维护校区、教学楼与教室档案，排课和课表都读取同一份数据。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="venue-form">保存场地</button>', 'academic-venue-dialog');
  dialog.querySelector('#venue-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const record = {
      id: row?.id || demoId('venue'),
      name: String(data.get('name')).trim(),
      campus: data.get('campus'),
      building: data.get('building'),
      type: data.get('type'),
      capacity: Number(data.get('capacity')) || 0,
      tags: String(data.get('tags') || '').trim(),
      status: data.get('status') || '启用'
    };
    const index = venues.findIndex(item => item.id === record.id);
    if (index < 0) venues.unshift(record); else venues[index] = { ...venues[index], ...record };
    persistVenue(record);
    closeDialog(); renderVenues();
    showToast(row ? '场地信息已保存。' : '场地已创建，可在排课与课表中使用。');
  });
}
function openVenueImport() {
  const body = `<form id="venue-import-form" class="academic-form-grid">
    <label class="form-field wide"><span>导入文件</span><input name="file" type="file" accept=".xlsx,.xls,.csv,.txt" /></label>
    <label class="form-field wide"><span>或粘贴教室清单（每行：校区,教学楼,教室,类型,容量）</span><textarea name="rows" rows="6">龙泉校区,艺术楼,艺术楼201,舞蹈房,26
南湖校区,音乐楼,音乐楼305,琴房,18</textarea></label>
    <p class="academic-note wide">导入按“教学楼 + 教室名称”去重；已存在的教室只更新类型与容量，不覆盖启用状态。选择文件时按文件内容导入，未选择文件则使用粘贴内容。</p>
  </form>`;
  const dialog = openDialog('Excel 批量导入场地', '支持 xlsx / csv / 文本粘贴，导入后立即出现在课表矩阵的可选教室中。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="venue-import-form">开始导入</button>', 'academic-venue-dialog');
  dialog.querySelector('#venue-import-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rows = String(data.get('rows') || '').split('\n').map(line => line.trim()).filter(Boolean);
    const file = event.currentTarget.querySelector('[name=file]')?.files?.[0];
    if (!rows.length && !file) { showToast('请粘贴教室清单或选择导入文件。', 'warning'); return; }
    let created = 0; let updated = 0;
    rows.forEach(line => {
      const [campus, building, name, type, capacity] = line.split(/[,，\t]/).map(item => String(item || '').trim());
      if (!name) return;
      const existing = venues.find(item => item.name === name && item.building === building);
      const record = { id: existing?.id || demoId('venue'), campus: campus || existing?.campus || '龙泉校区', building: building || existing?.building || '综合楼', name, type: type || existing?.type || '普通教室', capacity: Number(capacity) || existing?.capacity || 20, tags: existing?.tags || '', status: existing?.status || '启用' };
      const index = venues.findIndex(item => item.id === record.id);
      if (index < 0) { venues.unshift(record); created += 1; } else { venues[index] = { ...venues[index], ...record }; updated += 1; }
      persistVenue(record);
    });
    closeDialog(); renderVenues();
    showToast(file ? `已解析 ${file.name}，新增 ${created} 间、更新 ${updated} 间教室。` : `导入完成：新增 ${created} 间、更新 ${updated} 间教室。`);
  });
}
function deleteVenue(row) {
  if (venueUsedBySessions(row)) { showToast(`“${row.name}”已被课次或班级引用，只能停用不能删除。`, 'error'); return; }
  openDialog('确认删除场地', '删除后不可恢复；已被引用的场地请改为停用。', `<p>确认删除“${escapeHtml(row.name)}”？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="venue-delete">确认删除</button>').dataset.rowId = row.id;
}
function toggleVenue(row) {
  const target = row.status === '启用' ? '停用' : '启用';
  row.status = target;
  persistVenue(row);
  renderVenues();
  showToast(target === '停用' ? `“${row.name}”已停用，不再出现在新建矩阵列中，历史课次仍可查询。` : `“${row.name}”已启用，可参与排课。`);
}

function handleAction(action, row) {
  if (action === 'venue-create' || action === 'venue-edit') return openVenueForm(action === 'venue-edit' ? row : null);
  if (action === 'venue-import') return openVenueImport();
  if (action === 'venue-toggle') return toggleVenue(row);
  if (action === 'venue-delete') return deleteVenue(row);
  if (action === 'period-create' || action === 'period-edit') return openPeriodForm(action === 'period-edit' ? row : null);
  if (action === 'period-up') return movePeriod(row, 'up');
  if (action === 'period-down') return movePeriod(row, 'down');
  if (action === 'period-toggle') return togglePeriod(row);
  if (action === 'period-delete') return deletePeriod(row);
  if (action === 'period-reset') return resetPeriodScheme();
  if (action === 'venue-schedule') return detailDialog(`${row.name} · 排课查看`, '已按校区和教室筛选课表。', [['所属校区', row.campus], ['教学楼', row.building], ['场地类型', row.type], ['容量', `${row.capacity}人`], ['本周排课', row.status === '启用' ? '周六 09:00 · 少儿舞蹈基础班' : '暂无有效排课'], ['状态', tag(row.status)]]);
  if (action === 'schedule-view') return detailDialog(`${row.name} · 排班详情`, '查看班级规则、课次生成和冲突校验结果。', [['关联课程', row.course], ['所属批次', row.batch], ['授课教师', row.teacher], ['授课校区 / 教室', `${row.campus} / ${row.room}`], ['上课规则', row.rule], ['课次进度', row.generated], ['冲突校验', row.conflict === '无' ? tag('无') : tag(row.conflict)], ['班级状态', tag(row.status)]]);
  if (action === 'schedule-create') return openSimpleForm('创建班级排班', '仅可选择编排状态为“已完成”的完整课程或有效轻量课程档案。', select('关联课程', 'course', ['舞蹈基本功（完整课程·已完成）', '声乐基础（轻量课程档案）', '中国画基础（完整课程·已完成）'], false, false) + field('班级名称', 'name', 'text', '请输入班级名称') + select('所属批次', 'batch', ['2026秋季', '2027春季'], false, false) + select('授课教师', 'teacher', ['王玥', '陈晨', '赵老师'], false, false) + select('授课校区', 'campus', ['龙泉校区', '南湖校区'], false, false) + select('授课教室', 'room', ['综合楼302', '音乐楼201', '艺术楼105'], false, false) + field('招生人数上限', 'capacity', 'number', '请输入人数') + field('首次上课日期', 'start', 'date') + field('课程定价', 'price', 'number', '元') + field('上课时间', 'time', 'text', '每周六 09:00-10:30', true) + `<label class="form-field wide"><span>冲突校验</span><input class="readonly-field" value="提交后自动校验教师和教室时间冲突" readonly></label>`, () => { closeDialog(); showToast('班级排班已保存为草稿，待冲突校验通过后发布。'); });
  if (action === 'schedule-publish') {
    if (row.conflict !== '无') return openDialog('无法发布排班', '请先处理冲突后重试。', `<div class="academic-conflict"><strong>检测到排班冲突</strong>${escapeHtml(row.conflict)}：${row.teacher} 在 ${row.rule} 已存在有效课次。发布会被阻止，当前班级保持“${row.status}”。</div>`);
    const dialog = openDialog('确认发布班级排班', '发布后将生成课次并对学员端开放报名。', `<p>确认发布“${escapeHtml(row.name)}”？系统将按总课时和排课规则生成课次列表。</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-confirm-action="schedule-publish">确认发布</button>'); dialog.dataset.rowId = row.id; return dialog;
  }
  if (action === 'schedule-reschedule') return openSimpleForm('调课', '保存前自动校验教师和教室在新时间是否已有有效课次。', field('新上课日期', 'date', 'date') + field('新上课时间', 'time', 'text', '如 周六 11:00-12:30') + select('新教室', 'room', ['综合楼302', '音乐楼201', '艺术楼105'], false, false) + field('调整原因', 'reason', 'text', '请输入调课原因', true), (form, dialog) => { const room = form.get('room'); if (room === '综合楼302' && row.teacher === '王玥') { dialog.querySelector('#academic-form').insertAdjacentHTML('beforebegin', '<div class="academic-conflict"><strong>冲突校验未通过</strong>综合楼302在该时段已有少儿舞蹈基础班课次，请修改时间或教室。</div>'); return; } closeDialog(); showToast('调课已保存，通知将发送给教师和学员。'); });
  if (action === 'schedule-suspend') return openSimpleForm('登记停课', '停课后选定课次状态变为“已停课”，并推送班级通知。', field('停课课次', 'session', 'text', '如 第9次课') + field('停课原因', 'reason', 'text', '请输入原因', true) + field('补课安排', 'makeup', 'text', '可填写待定或补课时间', true), () => { closeDialog(); showToast('停课登记已保存，班级通知已进入发送队列。'); });
  if (action === 'session-view') return detailDialog(`${row.className} · ${row.date}`, '课次执行明细。', [['课程 / 课次', `${row.course} / ${row.time}`], ['授课教师', row.teacher], ['校区 / 教室', `${row.campus} / ${row.room}`], ['课次状态', tag(row.status)], ['考勤处理状态', row.attendance === '—' ? '未开始' : tag(row.attendance)], ['结束上课要求', '教学目标已填写且全员考勤完成']]);
  if (action === 'attendance-view') return detailDialog('考勤打卡详情', '展示教师端上传的最终考勤状态。', [['班级 / 课次', `${row.className} / ${row.session}`], ['学员', row.student], ['上课日期', row.date], ['考勤状态', tag(row.status)], ['处理状态', tag(row.process)], ['打卡时间', row.time], ['授课教师', row.teacher], ['统计口径', row.process === '待补录' ? '待补录完成前不计入统计和结业判定' : '纳入出勤统计和结业判定']]);
  if (action === 'attendance-supplement') return openSimpleForm('补录 / 修正考勤', '当前记录为待补录；教师需填写原因，超时处理需填写教务处理说明。', select('最终考勤状态', 'status', ['已到', '迟到', '请假', '缺勤'], false, false) + field('补录原因', 'reason', 'text', '必填：说明漏记或迟记原因', true) + field('教务处理说明', 'note', 'text', '超时处理时必填', true), (form) => { row.status = form.get('status'); row.process = '已补录'; row.time = '教务补录'; renderAttendance(); showToast('考勤已补录，已纳入统计并同步相关端。'); });
  if (action === 'homework-view') return openDialog(`${row.title} · 作业详情`, '监督提交和文本批阅进度。', `<div class="academic-detail-list"><div><span>作业内容</span><strong>${escapeHtml(row.content)}</strong></div><div><span>提交情况</span><strong>${row.submitted} / ${row.total} 人</strong></div><div><span>批阅进度</span><strong>${row.reviewed} / ${row.submitted} 份</strong></div><div><span>批阅规则</span><strong>仅文本评语，可选批注文件；无分数、无等级</strong></div></div><div class="form-section"><h3>示例文本评语</h3><div class="academic-report-content">动作完成度较好，建议继续保持练习频率。</div></div>`);
  if (action === 'message-view') return detailDialog(row.title, '查看通知正文和发送结果。', [['通知类型', row.type], ['发送对象', row.audience], ['目标班级', row.className], ['发送时间', row.time], ['发送状态', tag(row.status)], ['失败原因', row.fail || '无']]);
  if (action === 'message-resend') { const dialog = openDialog('确认补发通知', '失败消息补发不会改变原消息记录。', `<p>${escapeHtml(row.fail || '将向未成功送达的对象补发该通知。')}</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-confirm-action="message-resend">确认补发</button>'); dialog.dataset.rowId = row.id; return dialog; }
  if (action === 'message-create') return openSimpleForm('发送班级通知', '停课、调课和上课提醒均会记录发送结果，失败时支持补发。', select('通知类型', 'type', ['停课通知', '调课通知', '上课提醒'], false, false) + select('目标班级', 'className', ['少儿舞蹈基础班', '成人声乐班', '国画入门工作坊'], false, false) + field('通知标题', 'title', 'text', '请输入通知标题') + field('发送时间', 'time', 'datetime-local', '', false) + `<label class="form-field wide"><span>通知内容</span><textarea name="content" placeholder="请输入通知内容"></textarea></label>` + `<label class="form-field wide"><span>发送方式</span><div class="choice-group"><label class="choice"><input type="radio" name="sendMode" value="立即发送" checked>立即发送</label><label class="choice"><input type="radio" name="sendMode" value="定时发送">定时发送</label></div></label>`, (form) => { messages.unshift({ id: `message-${Date.now()}`, title: form.get('title') || '未命名通知', type: form.get('type'), audience: '教师、学员', className: form.get('className'), time: form.get('time') || '立即发送', status: '发送成功', fail: '' }); closeDialog(); renderMessages(); showToast('通知已发送，发送结果已记录。'); });
  if (action === 'graduation-review') return openGraduationDetail(row);
  if (action === 'graduation-export') return showToast('结业审核台账导出任务已创建。');
  if (action === 'report-preview') return openDialog(`学习报告预览 · ${row.student}`, '这是学员端可见的报告样式预览。', `<div class="academic-report-content"><h3>${escapeHtml(row.course)} 学习报告</h3><p><strong>学员：</strong>${escapeHtml(row.student)}　<strong>班级：</strong>${escapeHtml(row.className)}</p><p><strong>出勤数据：</strong>出勤率 100%</p><p><strong>作业数据：</strong>提交率 100%</p><p><strong>教师综合评语：</strong>${escapeHtml(row.comment)}</p><p><strong>成长建议：</strong>继续保持稳定练习。</p>${row.status === '已撤回' ? '<p class="academic-status-callout">报告暂不可查看，教务正在更新。</p>' : ''}</div>`);
  if (action === 'report-publish') { const dialog = openDialog('确认发布学习报告', '发布后学员端将可见，并产生报告已发布待办。', `<p>确认发布“${escapeHtml(row.student)}”的学习报告？发布不会改变其已通过结业状态和证书。</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-confirm-action="report-publish">确认发布</button>'); dialog.dataset.rowId = row.id; return dialog; }
  if (action === 'report-recall') return openSimpleForm('撤回学习报告', '撤回必须填写内部原因；学员端隐藏报告正文，但保留结业评语和证书。', field('撤回原因', 'reason', 'text', '请输入内部撤回原因', true), (form) => { const reason = String(form.get('reason') || '').trim(); if (!reason) { showToast('撤回学习报告时必须填写内部原因。', 'warning'); return; } row.reason = reason; row.status = '已撤回'; row.version = `v${Number(row.version.slice(1)) + 1}`; row.updated = '2026-09-08 11:20'; closeDialog(); renderReports(); showToast('报告已撤回，学员端正文已隐藏。'); });
  if (action === 'report-delete') { const dialog = openDialog('确认删除报告', '删除草稿或已撤回版本后不可在后台继续编辑。', `<p>确认删除“${escapeHtml(row.student)}”的报告记录？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="report-delete">确认删除</button>'); dialog.dataset.rowId = row.id; return dialog; }
  if (action === 'report-retry') { row.generation = '生成中'; renderReports(); showToast('报告生成已重新提交，正在重试。'); window.setTimeout(() => { row.generation = '已生成'; row.updated = '2026-09-08 11:22'; if (academicPage === 'reports') renderReports(); showToast('报告已生成，可预览或发布。'); }, 900); return; }
  if (action === 'report-export') return showToast('报告清单导出任务已创建。');
}
function openGraduationDetail(classRow) {
  const body = () => `<div class="academic-status-callout">结业确认按学员记录执行。待补录考勤不计入结业判定，班级可同时存在已通过、需补课和已取消结业学员。</div><div class="table-wrap academic-table academic-learner-table"><table><thead><tr><th>选择</th><th>学员</th><th>出勤率</th><th>作业提交率</th><th>教师综合评语</th><th>系统判定</th><th>操作</th></tr></thead><tbody>${classRow.learners.map((learner) => { const suggested = learner.status === '待复核' && Number.parseInt(learner.attendance) >= 90 && Number.parseInt(learner.homework) >= 80; return `<tr class="${learner.status === '已通过' ? 'is-approved' : learner.status === '需补课' || learner.status === '补课中' ? 'is-retake' : ''}" data-learner-id="${learner.id}"><td>${learner.status === '待复核' && suggested ? `<label class="academic-checkbox"><input type="checkbox" data-learner-select="${learner.id}">选择</label>` : '—'}</td><td><strong>${learner.name}</strong></td><td>${learner.attendance}</td><td>${learner.homework}</td><td>${escapeHtml(learner.comment)}</td><td>${suggested ? tag('建议结业') : tag(learner.status)}</td><td class="action-cell">${learner.status === '待复核' && !suggested ? '<button class="text-button" data-academic-action="learner-retake">退回补课</button>' : ''}${learner.status === '需补课' ? '<button class="text-button" data-academic-action="learner-makeup">安排补课</button>' : ''}${learner.status === '补课中' ? '<button class="text-button" data-academic-action="learner-resubmit">重新提交</button>' : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  const dialog = openDialog(`${classRow.className} · 按学员审核`, '展示出勤率、作业提交率、教师评语和系统判定。', `<div data-graduation-detail>${body()}</div>`, '<button type="button" class="button" data-dialog-close>关闭</button><button type="button" class="button primary" data-academic-action="graduation-batch">确认选中学员结业</button>');
  dialog.dataset.classId = classRow.id; return dialog;
}
function currentClassFromDialog(element) { const dialog = element.closest('dialog'); return graduation.find((item) => item.id === dialog?.dataset.classId); }
function refreshGraduationDialog(dialog, classRow) { dialog.querySelector('[data-graduation-detail]').innerHTML = openGraduationDetailMarkup(classRow); }
function openGraduationDetailMarkup(classRow) { const old = document.querySelector('[data-academic-dialog]'); const previous = old?.innerHTML; const holder = document.createElement('div'); holder.innerHTML = `<div data-graduation-detail></div>`; return openGraduationDetail(classRow) ? (document.querySelector('[data-academic-dialog] [data-graduation-detail]')?.innerHTML || previous || '') : ''; }
function confirmAction(action, row) {
  if (action === 'venue-delete') { const index = venues.findIndex((item) => item.id === row?.id); if (index >= 0) { venues.splice(index, 1); removeDemoRecord('venues', row.id); } closeDialog(); renderVenues(); showToast('场地已删除。'); }
  if (action === 'period-delete') {
    const index = (readDemoState().periods || []).findIndex((item) => item.id === row?.id);
    if (index >= 0) removeDemoRecord('periods', row.id);
    closeDialog(); renderPeriods(); showToast('时段已删除。');
  }
  if (action === 'schedule-publish') { row.status = '招生中'; row.generated = row.generated.replace('0 /', '1 /'); closeDialog(); renderScheduling(); showToast('班级排班已发布，课次列表已生成。'); }
  if (action === 'message-resend') { row.status = '发送成功'; row.fail = ''; closeDialog(); renderMessages(); showToast('失败消息已补发。'); }
  if (action === 'report-publish') { row.status = '已发布'; row.updated = '2026-09-08 11:25'; closeDialog(); renderReports(); showToast('学习报告已发布，学员端现已可见。'); }
  if (action === 'report-delete') { reports.splice(reports.findIndex((item) => item.id === row.id), 1); closeDialog(); renderReports(); showToast('报告记录已删除。'); }
}
document.addEventListener('click', (event) => {
  if (!academicRoot) return;
  if (event.target.closest('[data-dialog-close]')) { closeDialog(); return; }
  const confirm = event.target.closest('[data-confirm-action]');
  if (confirm) { const dialog = confirm.closest('dialog'); const rowId = dialog?.dataset.rowId; const row = rowId ? academicData.find((item) => item.id === rowId) : null; confirmAction(confirm.dataset.confirmAction, row); return; }
  const button = event.target.closest('[data-academic-action]'); if (!button) return;
  const action = button.dataset.academicAction;
  if (action === 'timetable-view') { setTimetableView(button.dataset.view); return; }
  if (action === 'timetable-export') { openTimetableExport(button.dataset.kind, window.__timetableMatrixFilter || {}); return; }
  if (action === 'timetable-print') { printTimetable(true); return; }
  if (action === 'timetable-export-confirm') {
    const hideEmpty = document.querySelector('[data-export-hide-empty]')?.checked !== false;
    closeDialog();
    printTimetable(hideEmpty);
    showToast(hideEmpty ? '已生成 A4 横向课表（隐藏空时段），可在打印窗口另存为 PDF。' : '已生成 A4 横向课表（含全部时段），可在打印窗口另存为 PDF。');
    return;
  }
  if (action === 'matrix-expand') { const cell = button.closest('.matrix-cell'); const all = cell?.querySelector('.matrix-cell-all'); const hidden = all?.hasAttribute('hidden'); if (hidden) all?.removeAttribute('hidden'); else all?.setAttribute('hidden', ''); button.textContent = hidden ? '收起' : `还有 ${button.dataset.count} 条`; return; }
  if (action === 'matrix-session-view') { const session = allTimetableSessions().find((s) => s.id === button.dataset.sessionId); if (session) openTimetableSessionDialog(session); return; }
  if (action === 'timetable-mode') { academicRoot.querySelectorAll('[data-academic-action="timetable-mode"]').forEach((item) => item.classList.toggle('primary', item === button)); showToast(`已切换至${button.dataset.mode}。`); return; }
  if (['timetable-prev', 'timetable-current', 'timetable-next'].includes(action)) { const label = academicRoot.querySelector('[data-timetable-label]'); if (label) label.textContent = action === 'timetable-prev' ? '2026年8月31日 - 9月6日' : action === 'timetable-next' ? '2026年9月14日 - 9月20日' : '2026年9月7日 - 9月13日'; return; }
  if (action === 'graduation-batch') { const classRow = currentClassFromDialog(button); if (!classRow) return; const selected = [...button.closest('dialog').querySelectorAll('[data-learner-select]:checked')]; if (!selected.length) { showToast('请先选择系统判定为建议结业的学员。', 'warning'); return; } openDialog('确认学员结业', '二次确认后仅更新选中学员，不改变班级整体结业状态。', `<p>确认将 ${selected.length} 名学员标记为“已通过”？系统将为每名学员生成学习报告和证书产物。</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-academic-action="graduation-batch-confirm">确认结业</button>'); document.querySelector('[data-academic-dialog]').dataset.classId = classRow.id; document.querySelector('[data-academic-dialog]').dataset.selectedIds = selected.map((item) => item.dataset.learnerSelect).join(','); return; }
  if (action === 'graduation-batch-confirm') { const dialog = button.closest('dialog'); const classRow = graduation.find((item) => item.id === dialog.dataset.classId); const ids = (dialog.dataset.selectedIds || '').split(','); classRow.learners.forEach((learner) => { if (ids.includes(learner.id)) learner.status = '已通过'; }); closeDialog(); document.querySelector('[data-academic-dialog]')?.remove(); renderGraduation(); showToast('选中学员已确认结业，报告和证书进入生成队列。'); return; }
  const rowElement = button.closest('tr[data-row-id]'); const row = rowElement ? academicData.find((item) => item.id === rowElement.dataset.rowId) : null;
  if (action.startsWith('learner-')) { const classRow = currentClassFromDialog(button); const learnerId = button.closest('tr')?.dataset.learnerId; const learner = classRow?.learners.find((item) => item.id === learnerId); if (!learner) return; if (action === 'learner-retake') return openSimpleForm('退回补课', '此操作只更新当前学员，不影响同班其他已通过学员。', field('补课说明', 'reason', 'text', '请输入未达标原因', true) + field('补课课次', 'session', 'text', '如 第17次补课'), (form) => { learner.status = '补课中'; learner.comment = `${learner.comment} 补课安排：${form.get('session') || '待排课'}。`; closeDialog(); showToast('已登记补课安排，等待教师完成补课教学记录。'); }); if (action === 'learner-makeup') return openSimpleForm('登记补课课次', '教师完成补课教学记录后，学员可重新提交结业材料。', field('补课日期', 'date', 'date') + field('补课课次', 'session', 'text', '如 第17次补课') + field('安排说明', 'note', 'text', '填写教务安排', true), (form) => { learner.status = '补课中'; closeDialog(); showToast('补课课次已登记，已同步教师端。'); }); if (action === 'learner-resubmit') { learner.status = '待复核'; closeDialog(); showToast('补课教学记录已提交，学员重新进入待复核列表。'); return; } }
  if (!row && ['venue-create', 'schedule-create', 'message-create', 'graduation-export', 'report-export', 'attendance-export', 'homework-export'].includes(action)) return handleAction(action);
  handleAction(action, row);
});

if (academicPage === 'venues') renderVenues();
if (academicPage === 'periods') renderPeriods();
if (academicPage === 'scheduling') renderScheduling();
if (academicPage === 'timetable') renderTimetable();
if (academicPage === 'attendance') renderAttendance();
if (academicPage === 'homework') renderHomework();
if (academicPage === 'messages') renderMessages();
if (academicPage === 'graduation') renderGraduation();
if (academicPage === 'reports') renderReports();
