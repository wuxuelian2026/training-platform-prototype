import { demoId, demoTime, readDemoState, removeDemoRecord, timetableSettings, upsertDemoRecord } from './demo-store.js';
import { cloneCourseCatalogSeed } from './course-catalog-seed.js';
import { classSeed } from './class-seed.js';
import { readXlsxSheetRows } from './xlsx-lite.js';
import { toLocalDateString } from './date-utils.js';
import { DEMO_NOW, DEMO_TODAY } from './demo-clock.js';
import { mergeVenues, resolveVenueId } from './venue-seed.js';
import { SEMESTERS, semesterAnchorOf, semesterRangeOf } from './batch-seed.js';
import { TEACHER_FACTS } from './teacher-facts.js';
import { explainTeacherCapacity } from './teacher-capacity.js';
import { mountRichEditor, richTextValue } from './rich-editor.js';
import { defaultLessonDuration, lessonDurationValues, TIMELINE_END, TIMELINE_START, TIMELINE_STEP_MINUTES, TIMELINE_TICK_COUNT, isWithinTimeline, lessonDurationOptions, lessonEndTime, snapToStep, toMinutes, toTime } from './timetable-settings.js';
import { classEnrollmentCondition, classScheduleStatus, classTeachingStatus } from './class-lifecycle.js';

const academicRoot = document.querySelector('[data-academic-page]');
const academicPage = academicRoot?.dataset.academicPage;
let academicData = null;
let academicToastTimer;

// 排课工作台：教师候选按「目标专业 + 首次上课日期」由能力校验器给出，不可用的选项直接禁用并写明原因。
function plannerTeacherOptions(selectedTeacher, major, course, date) {
  return TEACHER_FACTS.map((facts) => {
    const result = explainTeacherCapacity(facts, { major, course, date, purpose: 'arrange' });
    const reason = result.status === 'blocked' ? result.blocks.map((item) => item.text).join('；') : result.warnings.map((item) => item.text).join('；');
    const suffix = reason ? `（${reason}）` : '';
    return `<option value="${escapeHtml(facts.name)}" ${facts.name === selectedTeacher ? 'selected' : ''} ${result.status === 'blocked' ? 'disabled' : ''}>${escapeHtml(facts.name)}${escapeHtml(suffix)}</option>`;
  }).join('');
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const statusClass = (value) => ({
  启用: 'green', 停用: 'gray', 未发布: 'gray', 招生中: 'brand', 已满员: 'amber', 进行中: 'brand', 已结束: 'gray', 已排班: 'green', 待排课: 'amber', 排课中: 'brand', 已完成: 'green', 冲突: 'red', 无: 'green',
  待上课: 'amber', 上课中: 'brand', 已完成: 'green', 已停课: 'red', 已到: 'green', 迟到: 'amber', 请假: 'gray', 缺勤: 'red', 正常: 'green', 待补录: 'amber', 已补录: 'green',
  作业进行中: 'brand', 作业已结束: 'gray', 发送成功: 'green', 部分失败: 'amber', 发送中: 'brand', 发送失败: 'red', 待复核: 'brand', 建议结业: 'green', 需补课: 'amber', 补课中: 'amber', 已通过: 'green', 已取消结业: 'gray', 未发起: 'gray', 复核中: 'brand', 已归档: 'gray',
  草稿: 'gray', 已发布: 'green', 已撤回: 'amber', 已生成: 'green', 生成中: 'brand', 生成失败: 'red'
}[value] || 'gray');
const tag = (value) => `<span class="tag ${statusClass(value)}">${escapeHtml(value)}</span>`;

function showToast(message, kind = 'success') {
  const element = document.querySelector('[data-academic-toast]');
  if (!element) {
    window.dispatchEvent(new CustomEvent('hbyx-academic-toast', { detail: { message, kind } }));
    return;
  }
  element.textContent = message; element.dataset.kind = kind; element.hidden = false;
  window.clearTimeout(academicToastTimer); academicToastTimer = window.setTimeout(() => { element.hidden = true; }, 2800);
}
function closeDialog() { document.querySelector('[data-academic-dialog]')?.remove(); }
function openDialog(title, subtitle, body, actions = '<button type="button" class="button" data-dialog-close>关闭</button>', className = '') {
  closeDialog();
  const dialog = document.createElement('dialog'); dialog.className = `academic-dialog ${className}`; dialog.dataset.academicDialog = 'true';
  dialog.innerHTML = `<div class="academic-dialog-card"><div class="academic-dialog-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button type="button" class="icon-button" data-dialog-close title="关闭" aria-label="关闭">×</button></div>${body}<div class="academic-dialog-actions">${actions}</div></div>`;
  dialog.addEventListener('click', (event) => {
    if (!event.target.closest('[data-dialog-close]')) return;
    event.stopPropagation();
    closeDialog();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });
  document.body.append(dialog); dialog.showModal(); return dialog;
}
function pageFrame(title, description, controls, content) {
  if (!academicRoot) return;
  academicRoot.innerHTML = `<div class="academic-page"><div class="page-head"><div><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${controls || ''}</div>${content}<div class="toast" data-academic-toast role="status" aria-live="polite" hidden></div></div>`;
}
function metrics(items) { return `<div class="card-grid compact-metrics">${items.map(([label, value, note]) => `<div class="card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`).join('')}</div>`; }
function field(label, name, type = 'text', placeholder = '', wide = false) { return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><input type="${type}" name="${name}" placeholder="${placeholder}"></label>`; }
function select(label, name, options, wide = false, includeAll = true, selected = '') { return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><select name="${name}">${includeAll ? `<option value="">全部${label}</option>` : ''}${options.map((item) => `<option value="${escapeHtml(item)}"${item === selected ? ' selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></label>`; }
function table(head, extraClass = '') { return `<div class="table-wrap academic-table ${extraClass}"><table>${head}<tbody class="table-body"></tbody></table></div><div class="pagination-bar"><span class="result-count">—</span><button class="button" disabled>上一页</button><button class="button primary">1</button><button class="button" disabled>下一页</button></div>`; }
function filterPanel(id, fields) { return `<div class="filter-panel" data-filter-drawer-shell="${id}"><button type="button" class="button filter-drawer-trigger" data-filter-drawer-trigger="${id}" aria-expanded="false" aria-controls="${id}"><span class="filter-trigger-icon" aria-hidden="true"></span>筛选条件</button><div class="filter-drawer-backdrop" data-filter-drawer-backdrop="${id}" hidden></div><form class="card filter-form" id="${id}"><div class="filter-head"><strong>筛选条件</strong><button type="button" class="icon-button filter-drawer-close" data-filter-drawer-close="${id}" title="关闭筛选条件" aria-label="关闭筛选条件">×</button></div><div class="filter-grid academic-filter-grid">${fields}</div><div class="filter-actions"><button type="reset" class="button">重置</button><button type="submit" class="button primary">查询</button></div></form></div>`; }
let academicPager = { page: 1, size: 20 };
let academicRowsCache = { rows: [], template: null, empty: '' };
// CR-2026-103：列表按页渲染，筛选条件变化回到第 1 页；分页按钮复用同一份行模板。
function renderRows(rows, rowTemplate, empty = '暂无符合条件的数据。', keepPage = false) {
  const body = academicRoot.querySelector('.table-body'); if (!body) return;
  academicRowsCache = { rows, template: rowTemplate, empty };
  const totalPages = Math.max(1, Math.ceil(rows.length / academicPager.size));
  if (!keepPage) academicPager.page = 1;
  academicPager.page = Math.min(Math.max(1, academicPager.page), totalPages);
  const page = academicPager.page;
  const pageRows = rows.slice((page - 1) * academicPager.size, page * academicPager.size);
  body.innerHTML = pageRows.length ? pageRows.map((row) => `<tr data-row-id="${escapeHtml(row.id)}">${rowTemplate(row)}</tr>`).join('') : `<tr><td colspan="20"><div class="empty">${empty}</div></td></tr>`;
  const count = academicRoot.querySelector('.result-count'); if (count) count.textContent = `共 ${rows.length} 条 · 第 ${page} / ${totalPages} 页`;
  const bar = academicRoot.querySelector('.pagination-bar');
  if (bar) bar.innerHTML = `<span class="result-count">共 ${rows.length} 条 · 第 ${page} / ${totalPages} 页</span><button type="button" class="button" data-academic-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>上一页</button><button type="button" class="button" data-academic-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>下一页</button><select data-academic-page-size aria-label="每页条数">${[20, 50, 100].map((size) => `<option value="${size}" ${size === academicPager.size ? 'selected' : ''}>${size} 条 / 页</option>`).join('')}</select>`;
}
// 分页与每页条数：只重渲染行，不重跑业务逻辑。
academicRoot?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-academic-page]');
  if (!button) return;
  const target = Number(button.dataset.academicPage);
  if (!Number.isFinite(target)) return;
  academicPager.page = target;
  renderRows(academicRowsCache.rows, academicRowsCache.template, academicRowsCache.empty, true);
});
academicRoot?.addEventListener('change', (event) => {
  const select = event.target.closest('[data-academic-page-size]');
  if (!select) return;
  academicPager.size = Number(select.value) || 20;
  academicPager.page = 1;
  renderRows(academicRowsCache.rows, academicRowsCache.template, academicRowsCache.empty, true);
});
function applyFilter(formId, source, predicate, rowTemplate) { document.querySelector(`#${formId}`)?.addEventListener('submit', (event) => { event.preventDefault(); renderRows(source.filter(predicate(event.currentTarget)), rowTemplate); }); document.querySelector(`#${formId}`)?.addEventListener('reset', () => window.setTimeout(() => renderRows(source, rowTemplate), 0)); }

// E03: venues live in the shared demo store so scheduling, matrix and export read the same archive.
const initialVenueState = readDemoState();
const venues = mergeVenues(initialVenueState);
const derivedCampuses = [...new Set(venues.map(item => item.campus))].map((name, index) => ({ id: `campus-seed-${index + 1}`, name, address: '', status: '启用' }));
const campuses = derivedCampuses.map(seed => ({ ...seed, ...((initialVenueState.campuses || []).find(item => item.name === seed.name) || {}) }));
(initialVenueState.campuses || []).filter(item => !campuses.some(seed => seed.id === item.id || seed.name === item.name)).forEach(item => campuses.push({ ...item }));
const derivedBuildings = [...new Set(venues.map(item => `${item.campus}::${item.building}`))].map((key, index) => { const [campus, name] = key.split('::'); return { id: `building-seed-${index + 1}`, campus, name, status: '启用' }; });
const buildings = derivedBuildings.map(seed => ({ ...seed, ...((initialVenueState.buildings || []).find(item => item.campus === seed.campus && item.name === seed.name) || {}) }));
(initialVenueState.buildings || []).filter(item => !buildings.some(seed => seed.id === item.id || (seed.campus === item.campus && seed.name === item.name))).forEach(item => buildings.push({ ...item }));
let venueLevel = 'campus';
function persistVenue(record) { upsertDemoRecord('venues', record); }
function persistCampus(record) { upsertDemoRecord('campuses', record); }
function persistBuilding(record) { upsertDemoRecord('buildings', record); }
function campusEnabled(name) { return campuses.some(item => item.name === name && item.status === '启用'); }
function buildingEnabled(campus, name) { return buildings.some(item => item.campus === campus && item.name === name && item.status === '启用'); }
function venueAvailable(room) { return room?.status === '启用' && campusEnabled(room.campus) && buildingEnabled(room.campus, room.building); }
function sessionRoomId(classRecord, session = {}) {
  const stored = session.roomId || classRecord?.roomId || '';
  return venues.some(room => room.id === stored) ? stored : resolveVenueId(classRecord?.classroom, venues);
}
const schedules = [
  { id: 'schedule-dance', name: '少儿舞蹈基础班', course: '舞蹈基本功', batch: '2026秋季', teacher: '王玥', campus: '龙泉校区', room: '综合楼302', rule: '每周六 09:00-10:30', generated: '8 / 16', status: '招生中', conflict: '无' },
  { id: 'schedule-vocal', name: '成人声乐班', course: '声乐基础', batch: '2026秋季', teacher: '陈晨', campus: '南湖校区', room: '音乐楼201', rule: '每周日 14:00-15:30', generated: '0 / 12', status: '未发布', conflict: '教师时间冲突' },
  { id: 'schedule-paint', name: '国画入门工作坊', course: '中国画基础', batch: '2026秋季', teacher: '赵老师', campus: '龙泉校区', room: '艺术楼105', rule: '每周三 18:30-20:00', generated: '10 / 10', status: '进行中', conflict: '无' },
  { id: 'schedule-old', name: '暑期声乐提高班', course: '声乐演唱技巧', batch: '2026暑期', teacher: '陈晨', campus: '南湖校区', room: '音乐楼201', rule: '每周日 09:00-10:30', generated: '12 / 12', status: '已结束', conflict: '无' }
];
const scheduleCourseCatalog = cloneCourseCatalogSeed().filter(item => item.type === '面授课程');
const SCHEDULE_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
function formatPlannerDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function addPlannerDays(dateText, days) { const date = new Date(`${dateText}T00:00:00`); if (Number.isNaN(date.getTime())) return ''; date.setDate(date.getDate() + days); return formatPlannerDate(date); }
function plannerWeekday(dateText) { const date = new Date(`${dateText}T00:00:00`); if (Number.isNaN(date.getTime())) return ''; return SCHEDULE_WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]; }
function plannerSessions(total, weekdayTimes, duration, firstDate, roomId, semester = '2026秋季') {
  const sessions = []; const wanted = new Set(Object.keys(weekdayTimes || {}).filter(weekday => weekdayTimes[weekday]?.startTime));
  if (!total || !wanted.size || !firstDate) return sessions;
  for (let offset = 0; offset < 370 && sessions.length < total; offset += 1) {
    const date = addPlannerDays(firstDate, offset); const weekday = plannerWeekday(date); if (!wanted.has(weekday)) continue;
    const start = weekdayTimes[weekday].startTime;
    const end = lessonEndTime(start, duration);
    sessions.push({ index: sessions.length + 1, date, weekday, startTime: start, endTime: end, start, end, lessonDuration: duration, roomId, semester, status: '待上课' });
  }
  return sessions;
}
function plannerScheduleLabel(weekdays, weekdayTimes) {
  return weekdays.map(weekday => {
    const time = weekdayTimes?.[weekday];
    return time?.startTime && time?.endTime ? `${weekday.replace(/^周/, '每周')} ${time.startTime}-${time.endTime}` : '';
  }).filter(Boolean).join('；');
}
function plannerWeekdayTimeRows(weekdays, weekdayTimes, duration) {
  if (!weekdays.length) return '<div class="planner-weekday-time-empty">请先选择每周上课日。</div>';
  return weekdays.map(weekday => {
    const start = weekdayTimes?.[weekday]?.startTime || '';
    const end = start ? lessonEndTime(start, duration) : '';
    return `<div class="planner-weekday-time-row" data-planner-weekday-time="${escapeHtml(weekday)}"><strong>${escapeHtml(weekday)}</strong><label><span>上课开始时间</span><input data-weekday-start type="time" step="900" min="${TIMELINE_START}" max="${TIMELINE_END}" required value="${escapeHtml(start)}"></label><label><span>上课结束时间</span><input data-weekday-end class="readonly-field" readonly value="${escapeHtml(end)}"></label></div>`;
  }).join('');
}
// CR-2026-102：学员时间冲突是硬校验——发布排班与调整课次时，同一学员不能在同一时段出现在两个班。
// 课表风险提示、排课预览与提交守卫共用这一份判定，避免“提示有冲突、提交却放行”。
function studentConflictsWithOthers(classRecord, sessions) {
  if (!classRecord?.id) return [];
  const shared = readDemoState();
  const enrollments = shared.enrollments || [];
  const mine = new Set(enrollments.filter((item) => item.classId === classRecord.id && item.status === '已分班').map((item) => item.studentId));
  if (!mine.size) return [];
  const others = schedulingClasses().filter((row) => row.id !== classRecord.id);
  const conflicts = [];
  (sessions || []).forEach((session) => {
    if (!session?.date || !session.start || !session.end) return;
    others.forEach((row) => {
      const sharedStudents = enrollments.filter((item) => item.classId === row.id && item.status === '已分班' && mine.has(item.studentId)).map((item) => item.studentId);
      if (!sharedStudents.length) return;
      (row.sessions || []).forEach((other) => {
        if (other.status === '已停课' || other.date !== session.date) return;
        const start = other.startTime || other.start; const end = other.endTime || other.end;
        if (!start || !end || !(session.start < end && start < session.end)) return;
        sharedStudents.forEach((studentId) => conflicts.push({ studentId, className: row.name, date: session.date, start, end }));
      });
    });
  });
  return conflicts.filter((item, index, list) => list.findIndex((row) => `${row.studentId}-${row.className}-${row.date}-${row.start}` === `${item.studentId}-${item.className}-${item.date}-${item.start}`) === index);
}
// 学员冲突的改期建议：先试同一天的其他时段，再试后续 7 天的原时段，返回前 3 个不冲突的时段。
function sessionConflictSuggestions(classRecord, session, limit = 3) {
  const suggestions = [];
  const duration = Number(session.lessonDuration || classRecord.lessonDuration || defaultLessonDuration());
  const roomId = sessionRoomId(classRecord, session);
  const trySlot = (date, start) => {
    if (suggestions.length >= limit || !date || !start) return;
    const end = lessonEndTime(start, duration);
    if (!isWithinTimeline(start, duration)) return;
    const candidate = { ...session, date, start, end, startTime: start, endTime: end };
    if (studentConflictsWithOthers(classRecord, [candidate]).length) return;
    if (sessionAdjustmentConflicts(classRecord, session.index, { date, start, end, teacher: session.teacher || classRecord.teacher, roomId }).length) return;
    suggestions.push({ date, start, end });
  };
  ['15:45', '17:00', '18:30', '09:00', '10:45'].forEach((start) => trySlot(session.date, start));
  for (let day = 1; day <= 7 && suggestions.length < limit; day += 1) {
    trySlot(addPlannerDays(session.date, day), session.startTime || session.start);
  }
  return suggestions;
}
function sessionSuggestionButtons(classRecord, session, limit = 3) {
  const suggestions = sessionConflictSuggestions(classRecord, session, limit);
  if (!suggestions.length) return "";
  return `<div class="academic-suggestions"><strong>建议时段（点击采用）</strong>${suggestions.map((item, index) => `<button type="button" class="button" data-session-suggestion="${index}" data-suggest-date="${item.date}" data-suggest-start="${item.start}">${escapeHtml(item.date)} ${escapeHtml(item.start)}</button>`).join("")}<span class="muted">同一天其他时段优先，其次后续 7 天原时段</span></div>`;
}
function sessionSuggestionText(classRecord, session) {
  const suggestions = sessionConflictSuggestions(classRecord, session);
  if (!suggestions.length) return '';
  return `；可改到 ${suggestions.map((item) => `${item.date} ${item.start}`).join(' 或 ')}`;
}
function studentNamesOf(ids = []) {
  const shared = readDemoState();
  return ids.map((id) => (shared.students || []).find((student) => student.id === id)?.name || id);
}
function plannerStudentConflicts(preview) {
  return studentConflictsWithOthers(preview.classRecord, preview.sessions);
}
function studentConflictText(conflict) {
  return `学员时间冲突：${studentNamesOf([conflict.studentId])[0]} 在 ${conflict.date} 与“${conflict.className}”${conflict.start}–${conflict.end} 重叠`;
}
function plannerOverlap(left, right) { return left.start < right.end && right.start < left.end; }
function plannerConflicts(preview) {
  const existing = allTimetableSessions(); const conflicts = [];
  preview.sessions.forEach(session => existing.filter(item => ((session.date && item.date) ? session.date === item.date : item.weekday === session.weekday) && plannerOverlap(session, item)).forEach(item => {
    if (preview.teacher && preview.teacher === item.teacher) conflicts.push({ type: '教师', target: item.teacher, existing: item.className, weekday: session.weekday });
    if (preview.roomId && preview.roomId === item.roomId) conflicts.push({ type: '教室', target: preview.roomName, existing: item.className, weekday: session.weekday });
  }));
  return conflicts.filter((item, index, list) => list.findIndex(row => `${row.type}-${row.target}-${row.existing}-${row.weekday}` === `${item.type}-${item.target}-${item.existing}-${item.weekday}`) === index);
}
function plannerFormState(form) {
  const data = new FormData(form); const classRecord = schedulingClasses().find(item => item.id === data.get('classId'));
  const course = scheduleCourseCatalog.find(item => item.id === classRecord?.courseId) || { id: classRecord?.courseId, name: classRecord?.course, hours: classRecord?.lessons, major: classRecord?.professional || classRecord?.category || '' };
  const weekdays = [...form.querySelectorAll('[name=weekdays]:checked')].map(item => item.value);
  const duration = Number(data.get('lessonDuration')) || defaultLessonDuration();
  const weekdayTimes = {}; const rawWeekdayTimes = {};
  form.querySelectorAll('[data-planner-weekday-time]').forEach(row => {
    const weekday = row.dataset.plannerWeekdayTime; const field = row.querySelector('[data-weekday-start]');
    const rawStart = String(field?.value || ''); const startTime = rawStart ? snapToStep(rawStart) : '';
    rawWeekdayTimes[weekday] = rawStart;
    weekdayTimes[weekday] = { startTime, endTime: startTime ? lessonEndTime(startTime, duration) : '' };
  });
  const firstTime = weekdayTimes[weekdays[0]] || { startTime: '', endTime: '' };
  const room = venues.find(item => item.id === data.get('roomId')); const total = Number(classRecord?.lessons || course?.hours || 0);
  const preview = { classRecord, course, name: classRecord?.name || '', batch: classRecord?.batch || '', teacher: String(data.get('teacher') || '').trim(), campus: data.get('campus') || '', building: String(data.get('building') || ''), roomId: room?.id || '', roomName: room?.name || '', capacity: Number(classRecord?.capacity || 0), price: Number(classRecord?.price || 0), weekdays, weekdayTimes, rawWeekdayTimes, start: firstTime.startTime, end: firstTime.endTime, duration, firstLessonDate: String(data.get('firstLessonDate') || ''), deadline: classRecord?.deadline || '', total, sessions: plannerSessions(total, weekdayTimes, duration, String(data.get('firstLessonDate') || ''), room?.id || '', classRecord?.batch === '暑假' ? '2026暑期' : '2026秋季') };
  preview.conflicts = plannerConflicts(preview); preview.studentConflicts = plannerStudentConflicts(preview); preview.timeComplete = weekdays.length > 0 && weekdays.every(weekday => Boolean(weekdayTimes[weekday]?.startTime)); preview.withinTimeline = preview.timeComplete && weekdays.every(weekday => isWithinTimeline(weekdayTimes[weekday].startTime, duration)); preview.roomCapacityOk = Boolean(room && preview.capacity > 0 && room.capacity >= preview.capacity);
  return preview;
}
function plannerRecommendationRows(preview) {
  if (!preview.campus || !preview.weekdays.length || !preview.timeComplete || !preview.firstLessonDate) return [];
  return venues.filter(room => venueAvailable(room) && room.campus === preview.campus).map(room => {
    const sessions = plannerSessions(preview.total, preview.weekdayTimes, preview.duration, preview.firstLessonDate, room.id, preview.batch === '2026暑假' ? '2026暑期' : '2026秋季');
    const candidate = { ...preview, roomId: room.id, roomName: room.name, sessions };
    return { room, conflicts: plannerConflicts(candidate), capacityGap: Math.max(0, room.capacity - preview.capacity) };
  }).sort((left, right) => left.conflicts.length - right.conflicts.length || left.capacityGap - right.capacityGap || left.room.capacity - right.room.capacity).slice(0, 3);
}
function plannerMiniMatrix(preview) {
  const room = venues.find(item => item.id === preview.roomId);
  if (!room || !preview.weekdays.length) return '<div class="planner-empty">选择上课日和教室后显示预览矩阵。</div>';
  return `<div class="planner-mini-matrix"><div class="planner-mini-head"><span>星期 / 教室</span><strong>${escapeHtml(room.name)}</strong></div>${preview.weekdays.map(weekday => `<div class="planner-mini-row"><span>${weekday}</span><div>${preview.sessions.filter(session => session.weekday === weekday).map(session => `<span class="planner-mini-entry">${session.date}<br>${session.startTime}-${session.endTime}</span>`).join('') || '<em>暂无课次</em>'}</div></div>`).join('')}</div>`;
}
// 待补充项与提交守卫使用同一份判定，避免“实时预览显示可发布、提交却被拦”的口径不一致。
function plannerIssues(preview) {
  const missing = [];
  if (!preview.classRecord) missing.push('已有班级');
  if (!preview.teacher) missing.push('授课教师');
  if (!preview.campus) missing.push('授课校区');
  if (!preview.roomId) missing.push(`授课教室（${preview.campus || '所选校区'}${preview.building ? ` · ${preview.building}` : ''} 暂无启用教室，请到「场地管理」启用或新增）`);
  if (!preview.weekdays.length) missing.push('每周上课日');
  preview.weekdays.filter(weekday => !preview.weekdayTimes?.[weekday]?.startTime).forEach(weekday => missing.push(`${weekday}上课开始时间`));
  if (!preview.firstLessonDate) missing.push('首次上课日期');
  return missing;
}
function plannerPreviewMarkup(preview) {
  const recommendations = plannerRecommendationRows(preview); const missing = plannerIssues(preview); const invalid = missing.length > 0 || !preview.timeComplete || !preview.total; const issues = [];
  if (preview.timeComplete && !preview.withinTimeline) {
    const invalidWeekdays = preview.weekdays.filter(weekday => !isWithinTimeline(preview.weekdayTimes[weekday].startTime, preview.duration));
    issues.push(`时间需落在 ${TIMELINE_START}–${TIMELINE_END} 内，请调整：${invalidWeekdays.map(weekday => `${weekday} ${preview.weekdayTimes[weekday].startTime}-${preview.weekdayTimes[weekday].endTime}`).join('、')}`);
  }
  if (preview.roomId && preview.capacity && !preview.roomCapacityOk) issues.push(`教室容量不足，当前 ${preview.capacity} 人，${preview.roomName}容量不足`);
  if (preview.conflicts.length) issues.push(...preview.conflicts.map(item => `${item.type}冲突：${item.target}与“${item.existing}”在${item.weekday}有重叠课次`));
  if (preview.studentConflicts?.length) issues.push(...preview.studentConflicts.slice(0, 3).map(studentConflictText));
  const snappedTimes = preview.weekdays.filter(weekday => preview.rawWeekdayTimes[weekday] && preview.rawWeekdayTimes[weekday] !== preview.weekdayTimes[weekday]?.startTime).map(weekday => `${weekday} ${preview.rawWeekdayTimes[weekday]} 已吸附为 ${preview.weekdayTimes[weekday].startTime}`);
  const rawNote = snappedTimes.length ? snappedTimes.join('；') : '各上课日开始时间均对齐 15 分钟刻度';
  const sessionRows = preview.sessions.slice(0, 8).map(session => `<tr><td>第${session.index}次</td><td>${session.date} ${session.weekday}</td><td>${session.startTime}–${session.endTime}</td><td>${escapeHtml(preview.roomName || '待选教室')}</td></tr>`).join('');
  return `<div class="planner-preview-panel"><div class="planner-preview-header"><div><strong>排课预览</strong><span>只计算，不写入正式课表</span></div>${tag(issues.length ? '待修正' : missing.length ? '待填写' : '可发布')}</div><div class="planner-preview-metrics"><div><span>预计课次</span><strong>${preview.total || 0}</strong></div><div><span>每次时长</span><strong>${preview.duration} 分钟</strong></div><div><span>首课 / 末课</span><strong>${preview.sessions[0]?.date || '—'} / ${preview.sessions.at(-1)?.date || '—'}</strong></div></div><p class="planner-preview-note">${rawNote}；${preview.weekdays.length ? `每周${preview.weekdays.join('、')}` : '尚未选择上课日'}。</p>${missing.length ? `<div class="academic-conflict"><strong>待补充项（补齐后才能保存或发布）</strong><ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}${issues.length ? `<div class="academic-conflict"><strong>发布前需处理</strong><ul>${issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}</ul></div>` : ''}${recommendations.length ? `<div class="planner-recommendations"><div class="planner-section-title"><strong>智能推荐教室</strong><span>按无冲突、容量合适排序</span></div>${recommendations.map(item => `<button type="button" class="planner-recommendation ${item.room.id === preview.roomId ? 'selected' : ''}" data-planner-room="${escapeHtml(item.room.id)}"><span><strong>${escapeHtml(item.room.name)}</strong><small>${escapeHtml(item.room.building)} · 容量 ${item.room.capacity} 人</small></span><em>${item.conflicts.length ? `${item.conflicts.length} 个冲突` : '无冲突'}</em></button>`).join('')}</div>` : ''}${plannerMiniMatrix(preview)}<div class="planner-section-title"><strong>课次清单</strong><span>${preview.sessions.length > 8 ? `展示前 8 条，共 ${preview.sessions.length} 条` : `${preview.sessions.length} 条`}</span></div><div class="planner-session-list"><table><thead><tr><th>课次</th><th>日期</th><th>时间</th><th>教室</th></tr></thead><tbody>${sessionRows || '<tr><td colspan="4"><div class="planner-empty">补充课程、上课日和首课日期后自动生成课次。</div></td></tr>'}</tbody></table></div></div>`;
}
function plannerBuildings(campus = '') { return buildings.filter(item => item.status === '启用' && campusEnabled(item.campus) && (!campus || item.campus === campus)).map(item => item.name); }
function plannerBuildingOptions(campus = '') { return plannerBuildings(campus).map(name => `<option>${name}</option>`).join(''); }
function schedulePlannerRoomOptions(selected = '', campus = '') { return venues.filter(item => venueAvailable(item) && (!campus || item.campus === campus)).map(item => `<option value="${escapeHtml(item.id)}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(item.name)} · ${escapeHtml(item.building)} · ${item.capacity}人</option>`).join(''); }
function schedulingClasses() {
  const shared = readDemoState();
  const byId = new Map(classSeed.map(item => [item.id, { ...item }]));
  (shared.classes || []).forEach(item => byId.set(item.id, { ...(byId.get(item.id) || {}), ...item }));
  return [...byId.values()];
}
export function openSchedulePlanner(prefill = {}) {
  const classes = schedulingClasses();
  const selectedClass = classes.find(item => item.id === (prefill.classId || prefill.id)) || classes.find(item => classScheduleStatus(item) !== '已完成') || classes[0];
  if (!selectedClass) { showToast('请先在“面授班级”创建班级。', 'warning'); return; }
  const course = scheduleCourseCatalog.find(item => item.id === selectedClass.courseId);
  const plannerMode = prefill.mode || (classScheduleStatus(selectedClass) === '已完成' ? 'change' : 'create');
  if (plannerMode === 'change' && classTeachingStatus(selectedClass) !== '待开课') {
    showToast('班级已开课，不能变更整体排班，请使用“课次调整”。', 'warning');
    return;
  }
  // A grid-sourced prefill (weekday/start/room dragged on the classroom timetable) describes the
  // slot to fill, so it must win over the selected class's own schedule preview.
  const gridPrefill = !prefill.classId && !prefill.id && Boolean(prefill.weekday || prefill.startTime || prefill.start);
  const draft = gridPrefill
    ? { ...selectedClass, ...prefill, schedulePreview: [], weekdayTimes: {}, sessions: [] }
    : selectedClass.schedulePreview?.length ? selectedClass : { ...selectedClass, ...prefill };
  // An empty weekdays array means "not configured yet" and must not shadow a single weekday prefill.
  const selectedWeekdays = (Array.isArray(draft.weekdays) && draft.weekdays.length ? draft.weekdays : null) || (draft.weekday ? [draft.weekday] : ['周六']);
  const selectedCampus = draft.campus || campuses.find(item => item.status === '启用')?.name || ''; const selectedRoom = draft.roomId || venues.find(item => venueAvailable(item) && item.campus === selectedCampus)?.id || ''; const selectedStart = draft.startTime || draft.start || '09:00';
  const selectedWeekdayTimes = Object.fromEntries(selectedWeekdays.map(weekday => {
    const stored = draft.weekdayTimes?.[weekday];
    const session = draft.schedulePreview?.find(item => item.weekday === weekday) || draft.sessions?.find(item => item.weekday === weekday);
    const startTime = stored?.startTime || session?.startTime || session?.start || selectedStart;
    return [weekday, { startTime, endTime: lessonEndTime(startTime, draft.lessonDuration || defaultLessonDuration()) }];
  }));
  const classOptions = classes.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === selectedClass.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${escapeHtml(classScheduleStatus(item))}</option>`).join('');
  if (plannerMode === 'view') {
    const sessions = Array.isArray(selectedClass.sessions) ? selectedClass.sessions : [];
    const sessionRows = sessions.map(session => { const room = venues.find(item => item.id === sessionRoomId(selectedClass, session)); return `<tr><td>第 ${session.index} 次</td><td>${escapeHtml(session.date)}</td><td>${escapeHtml(session.startTime || session.start)}-${escapeHtml(session.endTime || session.end)}</td><td>${escapeHtml(session.teacher || selectedClass.teacher || '—')}</td><td>${escapeHtml(room?.name || selectedClass.classroom || '—')}</td><td>${tag(session.status || '待上课')}</td></tr>`; }).join('');
    const facts = [['班级名称', selectedClass.name], ['关联课程', selectedClass.course || course?.name || '—'], ['批次 / 容量', `${selectedClass.batch || '—'} · ${selectedClass.capacity || 0}人`], ['排课状态', classScheduleStatus(selectedClass)], ['授课教师', selectedClass.teacher || '—'], ['授课校区', selectedClass.campus || '—'], ['授课教室', selectedClass.classroom || '—'], ['上课规则', selectedClass.schedule || '—'], ['首次上课日期', selectedClass.firstLessonDate || '—'], ['总课时', selectedClass.lessons || sessions.length], ['单次课时长', `${selectedClass.lessonDuration || defaultLessonDuration()} 分钟`], ['排班版本', `v${selectedClass.scheduleVersion || 0}`]];
    const body = `<div class="academic-readonly-grid">${facts.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div><div class="planner-preview-panel"><div class="planner-section-title"><strong>正式课次</strong><span>共 ${sessions.length} 条</span></div><div class="planner-session-list"><table><thead><tr><th>课次</th><th>日期</th><th>时间</th><th>授课教师</th><th>教室</th><th>状态</th></tr></thead><tbody>${sessionRows || '<tr><td colspan="6">暂无正式课次</td></tr>'}</tbody></table></div></div>`;
    openDialog('排班查看', '只读查看当前已发布的排班版本和正式课次。', body, '<button type="button" class="button" data-dialog-close>关闭</button>', 'academic-planner-dialog');
    return;
  }
  const body = `<form id="schedule-planner-form" class="academic-form-grid"><div class="planner-form-column"><div class="planner-form-title"><strong>已有班级与排课条件</strong></div><label class="form-field wide"><span>已有班级 <b class="required-mark">*</b></span><select name="classId" required>${classOptions}</select></label><label class="form-field wide"><span>关联课程 / 版本</span><input class="readonly-field" readonly value="${escapeHtml(selectedClass.course || course?.name || '—')} · v${selectedClass.courseVersion || 1}"></label><label class="form-field"><span>班级名称</span><input class="readonly-field" readonly value="${escapeHtml(selectedClass.name)}"></label><label class="form-field"><span>批次 / 容量</span><input class="readonly-field" readonly value="${escapeHtml(selectedClass.batch || '—')} · ${selectedClass.capacity || 0}人"></label><label class="form-field"><span>授课教师 <b class="required-mark">*</b></span><select name="teacher" required>${plannerTeacherOptions(draft.teacher || course?.teacher, course?.major || selectedClass.professional, course?.name || selectedClass.course, draft.firstLessonDate || '2026-09-19')}</select></label><label class="form-field"><span>授课校区 <b class="required-mark">*</b></span><select name="campus" required>${['龙泉校区', '南湖校区'].map(value => `<option ${value === selectedCampus ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label class="form-field"><span>授课教学楼 <b class="required-mark">*</b></span><select name="building" required>${plannerBuildingOptions(selectedCampus)}</select></label><label class="form-field"><span>授课教室 <b class="required-mark">*</b></span><select name="roomId" required>${schedulePlannerRoomOptions(selectedRoom, selectedCampus)}</select></label><label class="form-field wide"><span>每周上课日 <b class="required-mark">*</b></span><div class="planner-weekday-grid">${SCHEDULE_WEEKDAYS.map(value => `<label class="planner-weekday-option"><input type="checkbox" name="weekdays" value="${value}" ${selectedWeekdays.includes(value) ? 'checked' : ''}><span>${value.replace('周', '')}</span></label>`).join('')}</div></label><label class="form-field"><span>单次课时长 <b class="required-mark">*</b></span><select name="lessonDuration" required>${lessonDurationOptions(draft.lessonDuration || defaultLessonDuration()).map(item => `<option value="${item.value}" ${item.selected ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label><label class="form-field"><span>首次上课日期 <b class="required-mark">*</b></span><input name="firstLessonDate" type="date" required value="${escapeHtml(draft.firstLessonDate || '2026-09-19')}"></label><label class="form-field"><span>总课时</span><input name="totalLessons" class="readonly-field" readonly value="${selectedClass.lessons || course?.hours || 0}"></label><div class="planner-weekday-time-section wide"><div class="planner-weekday-time-head"><strong>每周上课时间</strong><span>按上课日分别设置，结束时间按公用课时长自动计算</span></div><div class="planner-weekday-time-list" data-planner-weekday-time-list>${plannerWeekdayTimeRows(selectedWeekdays, selectedWeekdayTimes, draft.lessonDuration || defaultLessonDuration())}</div></div></div><div class="planner-preview-wrap" data-planner-preview></div></form>`;
  const displayBody = body.replace('关联课程 / 版本', '关联课程').replace(/ · v[^\"]+/, '');
  const isChange = plannerMode === 'change';
  const actions = isChange
    ? '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-planner-submit="publish">确认变更并发布</button>'
    : '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button" data-planner-submit="draft">保存草稿</button><button type="button" class="button primary" data-planner-submit="publish">确认并发布</button>';
  const dialog = openDialog(isChange ? '排班变更' : '去排课', isChange ? '编辑当前排班：确认后重排该班级全部课次并生成新排班版本（不是新增单次课次）。' : '首次维护排课：按所选上课日与首次上课日期重排该班级全部课次（不是新增单次课次）；保存草稿不生成正式课次。', displayBody, actions, 'academic-planner-dialog');
  const form = dialog.querySelector('#schedule-planner-form');
  const campusField = form.querySelector('[name=campus]');
  if (campusField) { campusField.innerHTML = campuses.filter(item => item.status === '启用').map(item => `<option ${item.name === selectedCampus ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join(''); }
  const weekdayTimeDraft = { ...selectedWeekdayTimes };
  const captureWeekdayTimes = () => form.querySelectorAll('[data-planner-weekday-time]').forEach(row => { const startTime = row.querySelector('[data-weekday-start]')?.value || ''; weekdayTimeDraft[row.dataset.plannerWeekdayTime] = { startTime, endTime: startTime ? lessonEndTime(startTime, Number(form.elements.lessonDuration.value) || defaultLessonDuration()) : '' }; });
  const renderWeekdayTimes = () => {
    captureWeekdayTimes();
    const weekdays = [...form.querySelectorAll('[name=weekdays]:checked')].map(item => item.value);
    weekdays.forEach(weekday => { if (!weekdayTimeDraft[weekday]) weekdayTimeDraft[weekday] = { startTime: selectedStart, endTime: lessonEndTime(selectedStart, Number(form.elements.lessonDuration.value) || defaultLessonDuration()) }; });
    form.querySelector('[data-planner-weekday-time-list]').innerHTML = plannerWeekdayTimeRows(weekdays, weekdayTimeDraft, Number(form.elements.lessonDuration.value) || defaultLessonDuration());
  };
  const refresh = () => { const campus = form.querySelector('[name=campus]')?.value || ''; const roomField = form.querySelector('[name=roomId]'); const currentRoom = roomField?.value || ''; const buildingField = form.querySelector('[name=building]'); if (buildingField) { const buildings = plannerBuildings(campus); const currentBuilding = buildingField.value; buildingField.innerHTML = buildings.map(name => `<option>${name}</option>`).join(''); buildingField.value = buildings.includes(currentBuilding) ? currentBuilding : (buildings[0] || ''); } const building = buildingField?.value || ''; if (roomField) { const options = venues.filter(item => item.status === '启用' && (!campus || item.campus === campus) && (!building || item.building === building)); roomField.innerHTML = options.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === currentRoom ? 'selected' : ''}>${escapeHtml(item.name)} · ${escapeHtml(item.building)} · ${item.capacity}人</option>`).join(''); if (!options.some(item => item.id === roomField.value) && options.length) roomField.value = options[0].id; } form.querySelectorAll('[data-weekday-start]').forEach(startField => { const rawStart = startField.value || ''; const snapped = rawStart ? snapToStep(rawStart) : ''; if (snapped && rawStart !== snapped) { startField.dataset.originalTime = rawStart; startField.value = snapped; } }); const preview = plannerFormState(form); form.querySelectorAll('[data-planner-weekday-time]').forEach(row => { const weekday = row.dataset.plannerWeekdayTime; const endField = row.querySelector('[data-weekday-end]'); if (endField) endField.value = preview.weekdayTimes[weekday]?.endTime || ''; }); dialog.querySelector('[data-planner-preview]').innerHTML = plannerPreviewMarkup(preview); return preview; };
  form.addEventListener('input', (event) => { if (event.target.matches('[data-weekday-start]')) delete event.target.dataset.originalTime; refresh(); }); form.addEventListener('change', (event) => { if (event.target.name === 'classId') { closeDialog(); openSchedulePlanner({ classId: event.target.value, mode: plannerMode }); return; } if (event.target.name === 'weekdays' || event.target.name === 'lessonDuration') renderWeekdayTimes(); refresh(); }); refresh();
  dialog.addEventListener('click', event => { const roomButton = event.target.closest('[data-planner-room]'); if (roomButton) { const roomField = form.querySelector('[name=roomId]'); if (roomField) roomField.value = roomButton.dataset.plannerRoom; refresh(); return; } const submit = event.target.closest('[data-planner-submit]'); if (submit) saveSchedulePlanner(submit.dataset.plannerSubmit, dialog, refresh()); });
}
function saveSchedulePlanner(mode, dialog, preview) {
  const form = dialog.querySelector('#schedule-planner-form');
  const snappedNotes = [...form.querySelectorAll('[data-planner-weekday-time]')].map(row => {
    const original = row.querySelector('[data-weekday-start]')?.dataset.originalTime || '';
    return original ? `${row.dataset.plannerWeekdayTime} ${original}→${preview.weekdayTimes[row.dataset.plannerWeekdayTime]?.startTime || ''}` : '';
  }).filter(Boolean);
  const missingFields = plannerIssues(preview);
  if (missingFields.length) { showToast(`请补充：${missingFields.join('、')}`, 'warning'); return; }
  if (!preview.withinTimeline) { showToast(`各上课日时间均需落在 ${TIMELINE_START}–${TIMELINE_END} 内`, 'error'); return; }
  if (!preview.roomCapacityOk) { showToast('招生人数超过所选教室容量，请更换教室或调整人数。', 'error'); return; }
  if (mode === 'publish' && preview.conflicts.length) { showToast('存在教师或教室冲突，处理冲突后才能发布排班。', 'error'); return; }
  const publishStudentConflicts = studentConflictsWithOthers(preview.classRecord, preview.sessions);
  if (mode === 'publish' && publishStudentConflicts.length) { showToast(`${studentConflictText(publishStudentConflicts[0])}${sessionSuggestionText(preview.classRecord, preview.sessions[0] || {})}。`, 'error'); return; }
  const semester = String(preview.batch || '').includes('暑假') ? '2026暑期' : '2026秋季';
  const record = { ...preview.classRecord, semester, teacher: preview.teacher, campus: preview.campus, classroom: preview.roomName, roomId: preview.roomId, schedule: plannerScheduleLabel(preview.weekdays, preview.weekdayTimes), weekdays: preview.weekdays, weekdayTimes: preview.weekdayTimes, weekday: preview.weekdays[0], startTime: preview.start, endTime: preview.end, lessonDuration: preview.duration, firstLessonDate: preview.firstLessonDate, scheduleStatus: mode === 'publish' ? '已发布' : '草稿', status: mode === 'publish' ? '招生中' : '排班草稿', display: mode === 'publish' ? '已展示' : '未发布', schedulePreview: preview.sessions, sessions: mode === 'publish' ? preview.sessions : [], scheduleVersion: mode === 'publish' ? Number(preview.classRecord.scheduleVersion || 0) + 1 : Number(preview.classRecord.scheduleVersion || 0), schedulePublishedAt: mode === 'publish' ? toLocalDateString() : preview.classRecord.schedulePublishedAt };
  upsertDemoRecord('classes', record);
  closeDialog(); if (academicPage === 'timetable') renderTimetable(); showToast(mode === 'publish' ? `排班已发布，已按规则重排该班级 ${record.sessions.length} 个课次。${snappedNotes.length ? `时间已按 15 分钟刻度调整：${snappedNotes.join('、')}。` : ''}` : `排班草稿已保存，预览 ${preview.sessions.length} 个课次，尚未进入正式课表。`);
}
// 课次调整只允许调整演示当天及以后的课次；日期与班级阶段派生同取演示当天，不另立一套今天。
const SESSION_ADJUST_TODAY = DEMO_TODAY;
function sessionCanAdjust(session) {
  return Boolean(session && String(session.date || '') >= SESSION_ADJUST_TODAY && !['上课中', '已完成', '已上课', '已停课'].includes(session.status));
}
function sessionAdjustmentConflicts(classRecord, sessionIndex, candidate) {
  return schedulingClasses().flatMap(item => (item.sessions || []).map(session => ({ classRecord: item, session }))).filter(({ classRecord: item, session }) => {
    if (item.id === classRecord.id && Number(session.index) === Number(sessionIndex)) return false;
    if (session.status === '已停课') return false;
    if (session.date !== candidate.date) return false;
    const overlap = plannerOverlap({ start: session.startTime || session.start, end: session.endTime || session.end }, candidate);
    if (!overlap) return false;
    return (session.teacher || item.teacher) === candidate.teacher || sessionRoomId(item, session) === candidate.roomId;
  }).map(({ classRecord: item, session }) => ({
    className: item.name,
    teacherConflict: (session.teacher || item.teacher) === candidate.teacher,
    roomConflict: sessionRoomId(item, session) === candidate.roomId
  }));
}
export function openSessionAdjustment(prefill = {}) {
  const classRecord = schedulingClasses().find(item => item.id === (prefill.classId || prefill.id));
  if (!classRecord) { showToast('未找到需要调整的班级。', 'error'); return; }
  const adjustable = (classRecord.sessions || []).filter(sessionCanAdjust);
  if (!adjustable.length) { showToast('当前班级没有可调整的未开始课次。', 'warning'); return; }
  const initial = adjustable.find(session => Number(session.index) === Number(prefill.sessionIndex)) || adjustable[0];
  const roomOptions = venues.filter(room => venueAvailable(room) && room.campus === classRecord.campus);
  const initialRoomId = sessionRoomId(classRecord, initial);
  const body = `<form id="session-adjustment-form" class="academic-dialog-grid"><label class="form-field wide"><span>调整课次 <b class="required-mark">*</b></span><select name="sessionIndex" required>${adjustable.map(session => `<option value="${session.index}" ${session.index === initial.index ? 'selected' : ''}>第 ${session.index} 次 · ${escapeHtml(session.date)} ${escapeHtml(session.startTime || session.start)}-${escapeHtml(session.endTime || session.end)}</option>`).join('')}</select></label><label class="form-field"><span>调整类型 <b class="required-mark">*</b></span><select name="adjustmentType"><option>调整课次</option><option>停课</option></select></label><label class="form-field"><span>代课教师 <b class="required-mark">*</b></span><select name="teacher">${TEACHER_FACTS.map(item => `<option value="${escapeHtml(item.name)}" ${item.name === (initial.teacher || classRecord.teacher) ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label class="form-field"><span>上课日期 <b class="required-mark">*</b></span><input name="date" type="date" min="${SESSION_ADJUST_TODAY}" required value="${escapeHtml(initial.date)}"></label><label class="form-field"><span>开始时间 <b class="required-mark">*</b></span><input name="startTime" type="time" step="900" min="${TIMELINE_START}" max="${TIMELINE_END}" required value="${escapeHtml(initial.startTime || initial.start)}"></label><label class="form-field"><span>结束时间</span><input name="endTime" class="readonly-field" readonly value="${escapeHtml(initial.endTime || initial.end)}"></label><label class="form-field"><span>教室 <b class="required-mark">*</b></span><select name="roomId" required>${roomOptions.map(room => `<option value="${escapeHtml(room.id)}" ${room.id === initialRoomId ? 'selected' : ''}>${escapeHtml(room.name)} · ${room.capacity}人</option>`).join('')}</select></label><label class="form-field wide academic-checkbox"><input name="shiftFollowing" type="checkbox">停课后将后续未开始课次整体顺延 7 天，并在末尾补生成一节课</label><label class="form-field wide"><span>调整原因 <b class="required-mark">*</b></span><textarea name="reason" maxlength="200" required placeholder="如：授课教师请假，由其他教师代课"></textarea></label><label class="form-field wide academic-checkbox"><input name="notify" type="checkbox" checked>通知授课教师与已报名学员</label><div class="academic-status-callout wide" data-session-adjustment-impact></div></form>`;
  const dialog = openDialog('课次调整', `${classRecord.name} · 仅允许调整未开始课次`, body, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="session-adjustment-form" class="button primary">确认调整</button>', 'academic-session-adjustment-dialog');
  const form = dialog.querySelector('#session-adjustment-form');
  const field = name => form.elements[name];
  const refresh = (resetValues = false) => {
    const selected = adjustable.find(session => Number(session.index) === Number(field('sessionIndex').value)) || initial;
    if (resetValues) {
      field('teacher').value = selected.teacher || classRecord.teacher || '';
      field('date').value = selected.date;
      field('startTime').value = selected.startTime || selected.start;
      field('roomId').value = sessionRoomId(classRecord, selected);
    }
    const stopped = field('adjustmentType').value === '停课';
    ['teacher', 'date', 'startTime', 'roomId'].forEach(name => { field(name).disabled = stopped; });
    field('shiftFollowing').disabled = !stopped;
    if (!stopped) field('shiftFollowing').checked = false;
    const duration = Number(selected.lessonDuration || classRecord.lessonDuration || defaultLessonDuration());
    field('endTime').value = lessonEndTime(field('startTime').value || selected.startTime || selected.start, duration);
    const affected = stopped && field('shiftFollowing').checked ? adjustable.filter(session => Number(session.index) > Number(selected.index)).length + 1 : 1;
    dialog.querySelector('[data-session-adjustment-impact]').textContent = stopped ? `本次将停课第 ${selected.index} 次；${field('shiftFollowing').checked ? `后续课次顺延并补课，预计影响 ${affected} 个课次` : '后续课次保持不变'}` : `仅调整第 ${selected.index} 次课，不改变班级整体排班规则。`;
    const suggestionHost = dialog.querySelector('[data-session-adjustment-impact]');
    if (!stopped) suggestionHost.insertAdjacentHTML('beforeend', sessionSuggestionButtons(classRecord, { ...selected, index: selected.index, date: field('date').value || selected.date, startTime: field('startTime').value || selected.startTime || selected.start, start: field('startTime').value || selected.startTime || selected.start }));
    suggestionHost.addEventListener('click', (event) => {
      const pick = event.target.closest('[data-session-suggestion]');
      if (!pick) return;
      // 按钮上写什么就填什么：直接用渲染时的候选快照，避免在已变化的字段上重算导致索引错位。
      field('date').value = pick.dataset.suggestDate || field('date').value;
      field('startTime').value = pick.dataset.suggestStart || field('startTime').value;
      refresh(false);
    });
  };
  field('sessionIndex').addEventListener('change', () => refresh(true));
  form.addEventListener('input', () => refresh(false));
  refresh(true);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const selectedIndex = Number(data.get('sessionIndex'));
    const sessions = (classRecord.sessions || []).map(session => ({ ...session }));
    const targetIndex = sessions.findIndex(session => Number(session.index) === selectedIndex);
    const target = sessions[targetIndex];
    if (!sessionCanAdjust(target)) { showToast('该课次已开始或已完成，不能调整。', 'error'); return; }
    const type = String(data.get('adjustmentType'));
    const reason = String(data.get('reason') || '').trim();
    if (!reason) { showToast('请填写调整原因。', 'warning'); return; }
    const notify = data.get('notify') === 'on';
    const before = { date: target.date, startTime: target.startTime || target.start, endTime: target.endTime || target.end, teacher: target.teacher || classRecord.teacher, roomId: target.roomId || classRecord.roomId, status: target.status || '待上课' };
    const log = { id: demoId('session-adjustment'), sessionIndex: selectedIndex, type, reason, before, operator: '当前账号', adjustedAt: demoTime(), notify };
    if (type === '调整课次') {
      const teacher = String(data.get('teacher') || '');
      const date = String(data.get('date') || '');
      const start = snapToStep(String(data.get('startTime') || ''));
      const duration = Number(target.lessonDuration || classRecord.lessonDuration || defaultLessonDuration());
      const end = lessonEndTime(start, duration);
      const room = venues.find(item => item.id === data.get('roomId'));
      const teacherFacts = TEACHER_FACTS.find(item => item.name === teacher);
      const capacity = teacherFacts ? explainTeacherCapacity(teacherFacts, { major: classRecord.professional || classRecord.category, course: classRecord.course, date, purpose: 'arrange' }) : { status: 'blocked', blocks: [{ text: '教师不存在' }] };
      if (capacity.status === 'blocked') { showToast(`所选教师不可授课：${capacity.blocks.map(item => item.text).join('；')}`, 'error'); return; }
      if (!date || date < SESSION_ADJUST_TODAY || !start || !isWithinTimeline(start, duration)) { showToast(`调整后的日期不得早于 ${SESSION_ADJUST_TODAY}，时间需在 ${TIMELINE_START}-${TIMELINE_END} 内。`, 'error'); return; }
      if (!room || Number(room.capacity || 0) < Number(classRecord.capacity || 0)) { showToast('所选教室未启用或容量不足。', 'error'); return; }
      const conflicts = sessionAdjustmentConflicts(classRecord, selectedIndex, { date, start, end, teacher, roomId: room.id });
      if (conflicts.length) { const conflict = conflicts[0]; showToast(`冲突校验未通过：${conflict.teacherConflict ? '教师' : '教室'}与“${conflict.className}”课次冲突。`, 'error'); return; }
      const adjustStudentConflicts = studentConflictsWithOthers(classRecord, [sessions[targetIndex]]);
      if (adjustStudentConflicts.length) { showToast(`${studentConflictText(adjustStudentConflicts[0])}${sessionSuggestionText(classRecord, sessions[targetIndex])}。`, 'error'); return; }
      sessions[targetIndex] = { ...target, date, weekday: plannerWeekday(date), startTime: start, endTime: end, start, end, teacher, roomId: room.id, status: '待上课', adjusted: true };
      log.after = { date, startTime: start, endTime: end, teacher, roomId: room.id, status: '待上课' };
    } else {
      const shiftFollowing = data.get('shiftFollowing') === 'on';
      sessions[targetIndex] = { ...target, status: '已停课', stopped: true, stopReason: reason };
      if (shiftFollowing) {
        sessions.forEach(session => { if (Number(session.index) > selectedIndex && sessionCanAdjust(session)) { session.date = addPlannerDays(session.date, 7); session.weekday = plannerWeekday(session.date); session.shiftedByAdjustmentId = log.id; } });
        const lastActive = [...sessions].reverse().find(session => session.status !== '已停课') || target;
        const replacementDate = addPlannerDays(lastActive.date, 7);
        sessions.push({ ...target, index: Math.max(...sessions.map(session => Number(session.index) || 0)) + 1, date: replacementDate, weekday: plannerWeekday(replacementDate), status: '待上课', stopped: false, stopReason: '', makeupFor: selectedIndex, shiftedByAdjustmentId: log.id });
      }
      log.shiftFollowing = shiftFollowing;
      log.after = { ...before, status: '已停课' };
    }
    const record = { ...classRecord, sessions, adjustmentLogs: [...(classRecord.adjustmentLogs || []), log], updatedAt: demoTime() };
    upsertDemoRecord('classes', record);
    if (notify) upsertDemoRecord('notifications', { id: demoId('notice'), type: type === '停课' ? '停课通知' : '调课通知', classId: classRecord.id, sessionIndex: selectedIndex, recipients: Number(classRecord.enrolled || 0) + 1, status: '发送成功', createdAt: demoTime(), reason });
    closeDialog();
    if (academicPage === 'timetable') renderTimetable();
    showToast(`${type}已保存${notify ? '，通知记录已生成' : ''}。`);
  });
}
// 课次列表与教师视图、教室视图共用 allTimetableSessions() 一份数据源，不再保留独立的列表演示种子。
// I1-DEC-29: matrix rows are derived from the fixed time axis — never from a maintained slot scheme.
const academicSemesterKey = 'hbyx-academic-semester';
function currentSemester() { try { const stored = localStorage.getItem(academicSemesterKey); return SEMESTERS.includes(stored) ? stored : SEMESTERS[0]; } catch { return SEMESTERS[0]; } }
// 学期与日期范围共同过滤；学期取值与起止日期来自批次管理种子（batch-seed.js），课表内不再另立一套字典。
const SEMESTER_RANGES = Object.fromEntries(SEMESTERS.map((semester) => [semester, semesterRangeOf(semester)]).filter(([, range]) => range));
function semesterOfDate(date) {
  const match = Object.entries(SEMESTER_RANGES).find(([, [from, to]]) => date && date >= from && date <= to);
  return match ? match[0] : SEMESTERS[0];
}
function setSemester(semester) {
  try { localStorage.setItem(academicSemesterKey, semester); } catch { /* ignore */ }
  const range = SEMESTER_RANGES[semester];
  const anchor = getTimetableAnchor();
  if (!range || (anchor >= range[0] && anchor <= range[1])) return;
  try { localStorage.setItem(timetableAnchorKey, semesterAnchorDate(semester)); } catch { /* ignore */ }
}
// 切学期时优先落在该学期「第一个有课次的日期」，落不到再退回学期起始日，
// 避免切到暑期后停在 7 月 1 日这种没有课次的日子，看起来像课表是空的。
function semesterAnchorDate(semester) {
  const range = SEMESTER_RANGES[semester];
  if (!range) return semesterAnchorOf(semester);
  if (DEMO_TODAY >= range[0] && DEMO_TODAY <= range[1]) return DEMO_TODAY;
  const dates = timetableSessionItems()
    .map((item) => item.date)
    .filter((date) => date && date >= range[0] && date <= range[1])
    .sort();
  return dates[0] || semesterAnchorOf(semester);
}
const ACADEMIC_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
// CR-2026-103：课次状态筛选统一取固定 5 值（与 SM-LESSON 取值一致），不再按当前数据动态枚举。
const TIMETABLE_STATUS_OPTIONS = ['待上课', '上课中', '已完成', '已停课'];
function isOutsideTimeline(session) { return toMinutes(session.start) < toMinutes(TIMELINE_START) || toMinutes(session.end) > toMinutes(TIMELINE_END); }
// 课表演示课次：模板按周展开到所属学期，每条都带真实日期（不再靠「星期 + 锚点周」临时映射，
// 因此既不会漂到别的周，也不会跑到别的学期）。教师与教室按专业铺开，仅保留 1 组故意冲突用于演示。
const timetableSeedTemplates = [
  { key: 'dance-basic', className: '少儿舞蹈基础班', course: '舞蹈基本功', teacher: '王玥', campus: '龙泉校区', building: '综合楼', roomId: 'venue-302', weekday: '周六', start: '09:00', end: '10:30' },
  { key: 'dance-adult', className: '成人形体班', course: '形体训练', teacher: '王玥', campus: '龙泉校区', building: '综合楼', roomId: 'venue-302', weekday: '周六', start: '09:30', end: '11:00' },
  { key: 'dance-adv', className: '少儿舞蹈提高班', course: '舞蹈基本功', teacher: '王玥', campus: '南湖校区', building: '艺术楼', roomId: 'venue-art201', weekday: '周六', start: '11:30', end: '13:00', statusOverrides: { '2026-09-19': { status: '已停课', stopped: true } } },
  { key: 'vocal-adult', className: '成人声乐班', course: '声乐基础', teacher: '陈晨', campus: '南湖校区', building: '音乐楼', roomId: 'venue-201', weekday: '周日', start: '14:00', end: '15:30' },
  { key: 'chorus', className: '合唱基础训练', course: '合唱', teacher: '陈晨', campus: '南湖校区', building: '音乐楼', roomId: 'venue-201', weekday: '周日', start: '15:30', end: '17:00' },
  { key: 'vocal-adv', className: '声乐演唱提高班', course: '声乐演唱技巧', teacher: '陈晨', campus: '龙泉校区', building: '艺术楼', roomId: 'venue-105', weekday: '周日', start: '17:00', end: '18:30' },
  { key: 'vocal-workshop', className: '声乐表演工作坊', course: '声乐演唱技巧', teacher: '陈晨', campus: '南湖校区', building: '音乐楼', roomId: 'venue-201', weekday: '周日', start: '18:30', end: '20:00' },
  { key: 'painting', className: '国画入门工作坊', course: '中国画基础', teacher: '李青', campus: '南湖校区', building: '艺术楼', roomId: 'venue-art103', weekday: '周三', start: '18:30', end: '20:00', statusOverrides: { '2026-09-16': { status: '已停课' } } },
  { key: 'calligraphy', className: '书法基础班', course: '书法基础', teacher: '赵老师', campus: '龙泉校区', building: '艺术楼', roomId: 'venue-105', weekday: '周一', start: '07:30', end: '08:15' }
];
function firstWeekdayOnOrAfter(date, weekdayLabel) {
  let cursor = date;
  for (let step = 0; step < 7; step += 1) {
    if (weekdayLabelOf(cursor) === weekdayLabel) return cursor;
    cursor = shiftDate(cursor, 1);
  }
  return date;
}
function expandTimetableSeed(template) {
  const { key, statusOverrides = {}, ...base } = template;
  const term = semesterRangeOf(SEMESTERS[0]);
  if (!term) return [];
  const sessions = [];
  let cursor = firstWeekdayOnOrAfter(term[0], base.weekday);
  while (cursor <= term[1]) {
    const override = statusOverrides[cursor] || {};
    sessions.push({ ...base, ...override, id: `mts-${key}-${cursor}`, date: cursor, status: override.status || '待上课', lessonDuration: toMinutes(base.end) - toMinutes(base.start) });
    cursor = shiftDate(cursor, 7);
  }
  return sessions;
}
const timetableSeedSessions = timetableSeedTemplates.flatMap(expandTimetableSeed);
// E06: published class sessions (which carry room, slot and start/end) are projected into the matrix
// alongside the demo rows, so a class published in the CRM shows up in the timetable.
// 与「面授班级」列表同源：读 schedulingClasses()（班级种子 + demo state），否则演示班级只存在于
// 班级列表、课表里永远看不到它们排出来的课次。
function sharedTimetableSessions() {
  return schedulingClasses().filter(item => item?.scheduleStatus === '已发布' && Array.isArray(item.sessions)).flatMap(classRow => classRow.sessions.map(session => ({
    id: `${classRow.id}-session-${session.index}`,
    classId: classRow.id,
    className: classRow.name,
    course: classRow.course,
    teacher: session.teacher || classRow.teacher,
    campus: classRow.campus,
    building: (venues.find(room => room.id === (session.roomId || classRow.roomId))?.building || classRow.classroom || '').replace(/\d+$/, '') || classRow.campus,
    roomId: sessionRoomId(classRow, session),
    start: session.startTime,
    end: session.endTime,
    date: session.date,
    weekday: session.weekday,
    sessionIndex: session.index,
    lessonDuration: session.lessonDuration || defaultLessonDuration(),
    status: session.status || '待上课',
  })));
}
// 课表内实时派生教师／教室冲突：同一天、时间段重叠且教师或教室相同即为冲突，与排课抽屉的校验口径一致。
// 有具体日期的课次按日期比，只有星期的演示课次按星期比；不再依赖种子数据里写死的冲突字段。
// 教务关注的三类课表风险（与教师／教室冲突并列展示）：
// 1) 学员时间冲突：同一学员在两个班的课次时段重叠；
// 2) 教师转场紧张：同一教师当天两节课之间不足 30 分钟且换了教室（含跨校区）；
// 3) 超容量：班级报名数超过所选教室容量。
// 已停课的课次不参与判定（课次不设「已取消」状态，见 CR-2026-099）。
function timetableClassStudentNames(classId) {
  if (!classId) return [];
  const shared = readDemoState();
  return (shared.enrollments || [])
    .filter((item) => item.classId === classId && item.status === '已分班')
    .map((item) => (shared.students || []).find((student) => student.id === item.studentId)?.name || item.studentId);
}
function withTimetableRisks(items) {
  const classes = schedulingClasses();
  const studentsOf = new Map();
  const classOf = new Map();
  items.forEach((item) => {
    if (!item.classId) return;
    if (!studentsOf.has(item.classId)) studentsOf.set(item.classId, timetableClassStudentNames(item.classId));
    if (!classOf.has(item.classId)) classOf.set(item.classId, classes.find((row) => row.id === item.classId) || null);
  });
  const active = items.filter((item) => item.status !== '已停课');
  return items.map((item) => {
    if (item.status === '已停课' || !item.date) return { ...item };
    const risks = {};
    const mine = studentsOf.get(item.classId) || [];
    if (mine.length) {
      const clash = active.find((other) => other.id !== item.id
        && other.date === item.date && other.start < item.end && item.start < other.end
        && (studentsOf.get(other.classId) || []).some((name) => mine.includes(name)));
      if (clash) risks.studentConflict = (studentsOf.get(clash.classId) || []).find((name) => mine.includes(name)) || '已报名学员';
    }
    const gapSettings = timetableSettings();
    const campusOf = (roomId) => venues.find((venue) => venue.id === roomId)?.campus || '';
    const transferThreshold = (left, right) => gapSettings.transferGapMinutes + (campusOf(left.roomId) === campusOf(right.roomId) ? 0 : gapSettings.crossCampusExtraMinutes);
    const tight = active.find((other) => other.id !== item.id
      && other.date === item.date && other.teacher === item.teacher && other.roomId !== item.roomId
      && ((other.start >= item.end && toMinutes(other.start) - toMinutes(item.end) < transferThreshold(item, other)) || (item.start >= other.end && toMinutes(item.start) - toMinutes(other.end) < transferThreshold(item, other))));
    if (tight) {
      const minutes = tight.start >= item.end ? toMinutes(tight.start) - toMinutes(item.end) : toMinutes(item.start) - toMinutes(tight.end);
      risks.transferGap = { minutes, room: venues.find((venue) => venue.id === tight.roomId)?.name || '其他教室', crossCampus: campusOf(item.roomId) !== campusOf(tight.roomId) };
    }

    const classRecord = classOf.get(item.classId);
    const room = venues.find((venue) => venue.id === item.roomId);
    if (classRecord && room && Number(classRecord.enrolled) > Number(room.capacity || 0)) {
      risks.overCapacity = { enrolled: Number(classRecord.enrolled), capacity: Number(room.capacity || 0) };
    }
    return Object.keys(risks).length ? { ...item, risks } : { ...item };
  });
}
// 课次列表／教师视图／班级视图的「排课提示」列统一用它渲染，避免各视图各写一套。
function timetableRiskTags(item) {
  const parts = [];
  if (isOutsideTimeline(item)) parts.push('<span class="tag amber">超出时间轴</span>');
  if (item.conflict) parts.push(`<span class="teacher-view-conflict">${escapeHtml(matrixConflictText(item.conflict))}</span>`);
  if (item.risks?.studentConflict) parts.push(`<span class="tag amber">学员冲突：${escapeHtml(item.risks.studentConflict)}</span>`);
  if (item.risks?.transferGap) parts.push(`<span class="tag amber">转场紧张 ${item.risks.transferGap.minutes} 分钟 · ${escapeHtml(item.risks.transferGap.room)}${item.risks.transferGap.crossCampus ? '（跨校区）' : ''}</span>`);
  if (item.risks?.overCapacity) parts.push(`<span class="tag amber">超容量 ${item.risks.overCapacity.enrolled}/${item.risks.overCapacity.capacity}</span>`);
  return parts.length ? parts.join(' ') : '—';
}
function withDerivedConflicts(items) {
  // 已停课的课次不再占用时段，也不参与冲突判定（与排课抽屉的校验口径一致）。
  const active = items.filter((item) => item.status !== '已停课');
  return items.map((item) => {
    if (item.status === '已停课') return { ...item };
    if (!item.start || !item.end) return { ...item };
    const overlap = active.find((other) => other.id !== item.id
      && other.start && other.end
      && (item.date && other.date ? item.date === other.date : other.weekday === item.weekday)
      && item.start < other.end && other.start < item.end
      && (other.teacher === item.teacher || (item.roomId && other.roomId === item.roomId)));
    if (!overlap) return { ...item };
    const isTeacher = overlap.teacher === item.teacher;
    return {
      ...item,
      conflict: {
        type: isTeacher ? 'teacher' : 'room',
        target: isTeacher ? item.teacher : (venues.find((venue) => venue.id === item.roomId)?.name || item.roomId || '—')
      }
    };
  });
}
function allTimetableSessions() { return withTimetableRisks(withDerivedConflicts([...timetableSeedSessions, ...sharedTimetableSessions()])); }
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
  const tabs = `<div class="tab-bar" role="tablist" aria-label="场地档案层级">${[['campus', '校区管理'], ['building', '教学楼管理'], ['room', '教室管理']].map(([key, label]) => `<button type="button" class="${venueLevel === key ? 'active' : ''}" data-venue-level="${key}" role="tab" aria-selected="${venueLevel === key}">${label}</button>`).join('')}</div>`;
  const source = venueLevel === 'campus' ? campuses : venueLevel === 'building' ? buildings : venues;
  academicData = source;
  const createAction = venueLevel === 'campus' ? 'campus-create' : venueLevel === 'building' ? 'building-create' : 'venue-create';
  const createLabel = venueLevel === 'campus' ? '新增校区' : venueLevel === 'building' ? '新增教学楼' : '新增教室';
  const controls = `<div class="toolbar-actions"><button class="button primary" data-academic-action="${createAction}">${createLabel}</button>${venueLevel === 'room' ? '<button class="button" data-academic-action="venue-import">Excel 批量导入</button>' : ''}</div>`;
  const metricBlock = metrics([['校区', campuses.length, `启用 ${campuses.filter(item => item.status === '启用').length}`], ['教学楼', buildings.length, `启用 ${buildings.filter(item => item.status === '启用').length}`], ['教室', venues.length, `启用 ${venues.filter(venueAvailable).length}`]]);
  let head = '';
  let row;
  if (venueLevel === 'campus') {
    head = '<thead><tr><th>校区名称</th><th>地址</th><th>教学楼</th><th>教室</th><th>状态</th><th>操作</th></tr></thead>';
    row = item => `<td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.address || '—')}</td><td>${buildings.filter(building => building.campus === item.name).length}</td><td>${venues.filter(room => room.campus === item.name).length}</td><td>${tag(item.status)}</td><td class="action-cell"><button class="text-button" data-academic-action="campus-edit">编辑</button><button class="text-button" data-academic-action="campus-toggle">${item.status === '启用' ? '停用' : '启用'}</button><button class="text-button danger-link" data-academic-action="campus-delete">删除</button></td>`;
  } else if (venueLevel === 'building') {
    head = '<thead><tr><th>教学楼名称</th><th>所属校区</th><th>教室</th><th>状态</th><th>操作</th></tr></thead>';
    row = item => `<td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.campus)}</td><td>${venues.filter(room => room.campus === item.campus && room.building === item.name).length}</td><td>${tag(item.status)}</td><td class="action-cell"><button class="text-button" data-academic-action="building-edit">编辑</button><button class="text-button" data-academic-action="building-toggle">${item.status === '启用' ? '停用' : '启用'}</button><button class="text-button danger-link" data-academic-action="building-delete">删除</button></td>`;
  } else {
    head = '<thead><tr><th>教室</th><th>所属校区</th><th>教学楼</th><th>类型</th><th>容量</th><th>设备标签</th><th>状态</th><th>操作</th></tr></thead>';
    row = item => `<td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.campus)}</td><td>${escapeHtml(item.building)}</td><td>${escapeHtml(item.type)}</td><td>${item.capacity}人</td><td class="muted">${escapeHtml(item.tags || '—')}</td><td>${tag(item.status)}</td><td class="action-cell"><button class="text-button" data-academic-action="venue-edit">编辑</button><button class="text-button" data-academic-action="venue-toggle">${item.status === '启用' ? '停用' : '启用'}</button><button class="text-button" data-academic-action="venue-schedule">查看排课</button><button class="text-button danger-link" data-academic-action="venue-delete">删除</button></td>`;
  }
  const roomFilter = venueLevel === 'room'
    ? filterPanel('venue-room-filter',
      select('所属校区', 'campus', [...new Set(venues.map(item => item.campus))])
      + select('所属教学楼', 'building', [...new Set(venues.map(item => item.building))])
      + '<label class="form-field"><span>关键词</span><input name="keyword" placeholder="搜索教室名称或设备标签" /></label>'
      + select('状态', 'status', ['启用', '停用']))
    : '';
  pageFrame('场地管理', '', controls, tabs + metricBlock + roomFilter + table(head));
  renderRows(source, row);
  if (venueLevel === 'room') {
    const filter = document.querySelector('#venue-room-filter');
    const campusField = filter?.querySelector('[name="campus"]');
    const buildingField = filter?.querySelector('[name="building"]');
    const syncBuildings = () => {
      if (!buildingField) return;
      const campus = campusField?.value || '';
      const names = [...new Set(venues.filter(item => !campus || item.campus === campus).map(item => item.building))];
      const current = buildingField.value;
      buildingField.innerHTML = `<option value="">全部所属教学楼</option>${names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}`;
      buildingField.value = names.includes(current) ? current : '';
    };
    syncBuildings();
    campusField?.addEventListener('change', syncBuildings);
    filter?.addEventListener('reset', () => window.setTimeout(syncBuildings, 0));
    applyFilter('venue-room-filter', venues, (form) => {
      const campus = form.campus?.value || '';
      const building = form.building?.value || '';
      const status = form.status?.value || '';
      const keyword = (form.keyword?.value || '').trim();
      return (item) => (!campus || item.campus === campus)
        && (!building || item.building === building)
        && (!status || item.status === status)
        && (!keyword || `${item.name} ${item.tags || ''}`.includes(keyword));
    }, row);
  }
  document.querySelectorAll('[data-venue-level]').forEach(button => button.addEventListener('click', () => { venueLevel = button.dataset.venueLevel; renderVenues(); }));
}

const timetableViewKey = 'hbyx-academic-timetable-view';
function getTimetableView() { const requested = new URLSearchParams(window.location.search).get('view'); if (['list', 'matrix', 'teacher', 'class'].includes(requested)) return requested; try { const stored = localStorage.getItem(timetableViewKey); return ['matrix', 'teacher', 'class'].includes(stored) ? stored : 'list'; } catch { return 'list'; } }
function setTimetableView(view) {
  try { localStorage.setItem(timetableViewKey, view); } catch { /* ignore */ }
  // 深链带 view= 参数时，点击视图页签必须同步覆盖 URL 参数，否则每次重渲染都会被参数拉回旧视图。
  const url = new URL(window.location.href);
  if (url.searchParams.has('view')) { url.searchParams.set('view', view); window.history.replaceState({}, '', url); }
  renderTimetable();
}
const timetableModeKey = 'hbyx-academic-timetable-mode';
function getTimetableMode() { try { const stored = localStorage.getItem(timetableModeKey); return ['日视图', '周视图', '月视图'].includes(stored) ? stored : '周视图'; } catch { return '周视图'; } }
function setTimetableMode(mode) { try { localStorage.setItem(timetableModeKey, mode); } catch { /* ignore */ } renderTimetable(); }

// 日期窗口：日／周／月三种模式共用一个锚点日期，日期导航按模式移动锚点，箭头才是真的换页。
const timetableAnchorKey = 'hbyx-academic-timetable-anchor';
function getTimetableAnchor() { try { const stored = localStorage.getItem(timetableAnchorKey); return /^\d{4}-\d{2}-\d{2}$/.test(stored || '') ? stored : DEMO_TODAY; } catch { return DEMO_TODAY; } }
function setTimetableAnchor(value) {
  try { localStorage.setItem(timetableAnchorKey, value); } catch { /* ignore */ }
  // 日期与学期是同一套过滤：手动定位到某一天时，学期跟着切到该日期所属的学期，避免空课表。
  try { localStorage.setItem(academicSemesterKey, semesterOfDate(value)); } catch { /* ignore */ }
  renderTimetable();
}
function shiftDate(date, days) { const next = new Date(`${date}T00:00:00`); next.setDate(next.getDate() + days); return toLocalDateString(next); }
function shiftMonth(date, months) { const [year, month, day] = date.split('-').map(Number); const lastDay = new Date(year, month + months, 0).getDate(); return toLocalDateString(new Date(year, month - 1 + months, Math.min(day, lastDay))); }
function dateRange(from, to) { const dates = []; let cursor = from; while (cursor <= to) { dates.push(cursor); cursor = shiftDate(cursor, 1); } return dates; }
function anchorWeekDates() {
  const anchor = getTimetableAnchor();
  const weekday = new Date(`${anchor}T00:00:00`).getDay();
  const monday = shiftDate(anchor, -((weekday + 6) % 7));
  const dates = dateRange(monday, shiftDate(monday, 6));
  return Object.fromEntries(ACADEMIC_WEEKDAYS.map((label, index) => [label, dates[index]]));
}
function timetableWindow() {
  const mode = getTimetableMode();
  const anchor = getTimetableAnchor();
  if (mode === '日视图') return { anchor, mode, from: anchor, to: anchor, dates: [anchor] };
  if (mode === '月视图') {
    const [year, month] = anchor.split('-').map(Number);
    const first = `${anchor.slice(0, 7)}-01`;
    const last = `${anchor.slice(0, 7)}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    return { anchor, mode, from: first, to: last, dates: dateRange(first, last) };
  }
  const weekday = new Date(`${anchor}T00:00:00`).getDay();
  const from = shiftDate(anchor, -((weekday + 6) % 7));
  const to = shiftDate(from, 6);
  return { anchor, mode, from, to, dates: dateRange(from, to) };
}
function weekdayLabelOf(date) { return ACADEMIC_WEEKDAYS[(new Date(`${date}T00:00:00`).getDay() + 6) % 7]; }
function formatTimetableLabel(win) {
  const [year, month, day] = win.anchor.split('-').map(Number);
  if (win.mode === '日视图') return `${year}年${month}月${day}日`;
  if (win.mode === '月视图') return `${year}年${month}月`;
  const [, fromMonth, fromDay] = win.from.split('-').map(Number);
  const [, toMonth, toDay] = win.to.split('-').map(Number);
  return `${year}年${fromMonth}月${fromDay}日 - ${toMonth}月${toDay}日`;
}
function withinWindow(date, win) { return Boolean(date) && date >= win.from && date <= win.to; }
function timetableSemesterSelect() {
  const semester = currentSemester();
  return `<select class="academic-inline-select" aria-label="学期" data-academic-semester>${SEMESTERS.map((item) => `<option ${item === semester ? 'selected' : ''}>${item}</option>`).join('')}</select>`;
}
// 各视图的筛选条件按视图缓存，切换视图后回填，避免来回切换时条件丢失。
const timetableFilters = { list: {}, teacher: {}, matrix: {}, classView: {} };
function bindTimetableSemester() { document.querySelector('[data-academic-semester]')?.addEventListener('change', (event) => { setSemester(event.target.value); renderTimetable(); }); }
function timetableViewSwitch() {
  const view = getTimetableView();
  const tab = (key, label) => `<button type="button" class="${view === key ? 'active' : ''}" data-academic-action="timetable-view" data-view="${key}" role="tab" aria-selected="${view === key}">${label}</button>`;
  return `<div class="academic-view-switch" role="tablist" aria-label="课表视图切换">${tab('list', '课次列表')}${tab('matrix', '教室视图')}${tab('teacher', '教师视图')}${tab('class', '班级视图')}</div>`;
}
function timetableModeSwitch() {
  const mode = getTimetableMode();
  return `<div class="academic-view-switch" role="tablist" aria-label="日周月视图切换">${['日视图', '周视图', '月视图'].map(item => `<button type="button" class="${mode === item ? 'active' : ''}" data-academic-action="timetable-mode" data-mode="${item}" role="tab" aria-selected="${mode === item}">${item}</button>`).join('')}</div>`;
}
function timetableDateNav() {
  const win = timetableWindow();
  const step = win.mode === '日视图' ? '日' : win.mode === '月视图' ? '月' : '周';
  return `<div class="academic-date-nav" aria-label="课表日期导航"><button type="button" class="icon-button" data-academic-action="timetable-prev" aria-label="上一个${step}">‹</button><strong data-timetable-label>${formatTimetableLabel(win)}</strong><button type="button" class="icon-button" data-academic-action="timetable-next" aria-label="下一个${step}">›</button><button type="button" class="button" data-academic-action="timetable-today">今天</button></div>`;
}
function renderTimetable() { const view = getTimetableView(); return view === 'matrix' ? renderTimetableMatrix() : view === 'teacher' ? renderTeacherTimetable() : view === 'class' ? renderClassTimetable() : renderTimetableList(); }
// 课次列表：与教师视图、教室视图共用同一份课次数据源，并按「日期范围 + 学期」真实过滤。
// 日／周／月与日期导航联动同一锚点日期，学期下拉在三个视图都出现；筛选条件按视图缓存。
function renderTimetableList() {
  const win = timetableWindow();
  const semester = currentSemester();
  const cache = timetableFilters.list;
  const items = timetableSessionItems()
    .filter((item) => withinWindow(item.date, win) && item.semester === semester)
    .sort((a, b) => a.date.localeCompare(b.date) || timetableSessionSort(a, b));
  academicData = items;
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const conflicts = items.filter((item) => item.conflict).length;
  const controls = `<div class="toolbar-actions">${timetableToolbar()}</div>`;
  const content = `<div class="academic-calendar-toolbar"><div><strong>${escapeHtml(formatTimetableLabel(win))}</strong><p class="academic-subnote">${escapeHtml(semester)} · 按所选日期范围与学期过滤课次；只有星期的循环课次按所选周补出具体日期。</p></div><div class="teacher-view-summary"><span>课次 ${items.length} 条</span><span class="${conflicts ? 'has-conflict' : ''}">冲突 ${conflicts} 个</span></div></div>`
    + filterPanel('timetable-filter', select('校区', 'campus', unique(items.map((item) => item.campus)), false, true, cache.campus || '') + select('授课教师', 'teacher', unique(items.map((item) => item.teacher)), false, true, cache.teacher || '') + select('班级', 'className', unique(items.map((item) => item.className)), false, true, cache.className || '') + select('课次状态', 'status', TIMETABLE_STATUS_OPTIONS, false, true, cache.status || ''))
    + table('<thead><tr><th>日期</th><th>时间</th><th>课程 / 班级</th><th>授课教师</th><th>校区 / 教室</th><th>课次状态</th><th>排课提示</th><th>考勤处理</th><th>操作</th></tr></thead>');
  pageFrame('课表管理', '', controls, content);
  const row = (item) => `<td>${escapeHtml(item.day)}</td><td>${escapeHtml(item.time)}</td><td>${escapeHtml(item.course)}<br><span class="muted">${escapeHtml(item.className)}</span></td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.campus)}<br>${escapeHtml(item.room)}</td><td>${item.stopped ? `<span class="tag gray is-stopped">${escapeHtml(item.status)}</span>` : tag(item.status)}</td><td>${timetableRiskTags(item)}</td><td>${item.attendanceProcess === '—' ? '—' : tag(item.attendanceProcess)}</td><td><button class="text-button" data-academic-action="session-view">查看课次</button></td>`;
  const applyListFilter = () => {
    const form = document.querySelector('#timetable-filter');
    if (!form) return;
    const { campus, teacher, className, status } = form;
    cache.campus = campus.value; cache.teacher = teacher.value; cache.className = className.value; cache.status = status.value;
    renderRows(items.filter((item) => (!campus.value || item.campus === campus.value) && (!teacher.value || item.teacher === teacher.value) && (!className.value || item.className === className.value) && (!status.value || item.status === status.value)), row, '当前日期范围内暂无课次。');
  };
  applyListFilter();
  document.querySelector('#timetable-filter')?.addEventListener('submit', (event) => { event.preventDefault(); applyListFilter(); });
  document.querySelector('#timetable-filter')?.addEventListener('reset', () => window.setTimeout(applyListFilter, 0));
  bindTimetableSemester();
}
// 课次条目的唯一构造入口：只有星期的循环课次按当前锚点周补出具体日期，再按日期派生星期、
// 学期与考勤处理状态；课次列表、教师视图、教室视图与导出共用同一份条目，口径不再分叉。
// 课次状态派生：已停课保持原状态；其余按演示当天判断——已上完为「已完成」、
// 正在上为「上课中」、未开始为「待上课」。演示数据里不再靠写死的「待上课」冒充全部课次。
function deriveTimetableStatus(item) {
  if (!item?.date || !item.start || !item.end) return item?.status || '待上课';
  if (['已停课', '已完成', '上课中'].includes(item.status)) return item.status;
  const startAt = `${item.date} ${item.start}`;
  const endAt = `${item.date} ${item.end}`;
  if (endAt <= DEMO_NOW) return '已完成';
  if (startAt <= DEMO_NOW && DEMO_NOW < endAt) return '上课中';
  return '待上课';
}
function timetableSessionItems() {
  const weekdayDates = anchorWeekDates();
  return allTimetableSessions().map(item => {
    const room = venues.find(venue => venue.id === item.roomId);
    const date = item.date || weekdayDates[item.weekday] || '';
    const weekday = date ? weekdayLabelOf(date) : (item.weekday || '');
    // 考勤处理状态与「考勤监控」同源：按班级 + 日期匹配同一批考勤记录派生，课表内不单独维护。
    // 演示数据里考勤记录的日期与课次日期未完全对齐，匹配不到时回退为按班级汇总。
    const dated = attendance.filter(row => row.className === item.className && row.date === date);
    const records = dated.length ? dated : attendance.filter(row => row.className === item.className);
    const attendanceProcess = item.status === '已停课' ? '—' : records.length ? (records.some(row => row.process === '待补录') ? '待补录' : '正常') : item.status === '待上课' ? '未开始' : '待补录';
    return { ...item, date, weekday, status: deriveTimetableStatus({ ...item, date }), day: date ? `${date.slice(5)} ${weekday}` : (weekday || '—'), time: `${item.start || '—'}–${item.end || '—'}`, course: item.course || '—', className: item.className || '—', campus: item.campus || room?.campus || '—', room: room?.name || '—', semester: item.semester || semesterOfDate(date), attendanceProcess };
  });
}
// 教师视图：与课次列表同列口径（含考勤处理），按当前日期范围与学期过滤，筛选条件按视图缓存。
function renderTeacherTimetable(filterState = {}) {
  const win = timetableWindow();
  const semester = currentSemester();
  const queryTeacher = new URLSearchParams(window.location.search).get('teacher') || '';
  const cache = { ...timetableFilters.teacher, teacher: timetableFilters.teacher.teacher || queryTeacher, ...filterState };
  timetableFilters.teacher = cache;
  const scoped = timetableSessionItems().filter((item) => withinWindow(item.date, win) && item.semester === semester);
  const items = scoped
    .filter((item) => (!cache.teacher || item.teacher === cache.teacher) && (!cache.campus || item.campus === cache.campus) && (!cache.status || item.status === cache.status))
    .sort((a, b) => a.date.localeCompare(b.date) || timetableSessionSort(a, b));
  academicData = items;
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const conflicts = items.filter((item) => item.conflict).length;
  const controls = `<div class="toolbar-actions">${timetableToolbar()}</div>`;
  const content = `<div class="academic-calendar-toolbar"><div><strong>${escapeHtml(formatTimetableLabel(win))}</strong><p class="academic-subnote">${escapeHtml(semester)} · 按教师查看所选日期范围内的课次；调整时间、教室或教师请前往班级排课。</p></div><div class="teacher-view-summary"><span>当前 ${items.length} 个课次</span><span class="${conflicts ? 'has-conflict' : ''}">冲突 ${conflicts} 个</span></div></div>`
    + filterPanel('teacher-timetable-filter', select('教师', 'teacher', unique(scoped.map((item) => item.teacher)), false, true, cache.teacher || '') + select('校区', 'campus', unique(scoped.map((item) => item.campus)), false, true, cache.campus || '') + select('课次状态', 'status', TIMETABLE_STATUS_OPTIONS, false, true, cache.status || ''))
    + table('<thead><tr><th>日期</th><th>时间</th><th>授课教师</th><th>课程 / 班级</th><th>校区 / 教室</th><th>课次状态</th><th>排课提示</th><th>考勤处理</th><th>操作</th></tr></thead>');
  pageFrame('课表管理 · 教师视图', '', controls, content);
  const row = (item) => `<td>${escapeHtml(item.day)}</td><td>${escapeHtml(item.time)}</td><td><strong>${escapeHtml(item.teacher)}</strong></td><td>${escapeHtml(item.course)}<br><span class="muted">${escapeHtml(item.className)}</span></td><td>${escapeHtml(item.campus)}<br><span class="muted">${escapeHtml(item.room)}</span></td><td>${item.stopped ? `<span class="tag gray is-stopped">${escapeHtml(item.status)}</span>` : tag(item.status)}</td><td>${timetableRiskTags(item)}</td><td>${item.attendanceProcess === '—' ? '—' : tag(item.attendanceProcess)}</td><td><button class="text-button" data-academic-action="session-view">查看课次</button></td>`;
  renderRows(items, row, '当前日期范围内暂无课次。');
  document.querySelector('#teacher-timetable-filter')?.addEventListener('submit', (event) => { event.preventDefault(); timetableFilters.teacher = { ...timetableFilters.teacher, ...Object.fromEntries(new FormData(event.currentTarget).entries()) }; renderTeacherTimetable(); });
  document.querySelector('#teacher-timetable-filter')?.addEventListener('reset', () => window.setTimeout(() => { timetableFilters.teacher = {}; renderTeacherTimetable(); }, 0));
  bindTimetableSemester();
}
// 班级视图：按班级聚合所选日期范围内的课次，供教务把某个班的课表发给教师／家长。
// 与课次列表、教师视图共用同一份课次条目与筛选缓存，只把分组维度从教师换成班级。
function renderClassTimetable(filterState = {}) {
  const win = timetableWindow();
  const semester = currentSemester();
  const cache = { ...timetableFilters.classView, ...filterState };
  timetableFilters.classView = cache;
  const scoped = timetableSessionItems().filter((item) => withinWindow(item.date, win) && item.semester === semester);
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const items = scoped.filter((item) => (!cache.className || item.className === cache.className) && (!cache.teacher || item.teacher === cache.teacher) && (!cache.status || item.status === cache.status));
  academicData = items;
  const groups = [...new Set(items.map((item) => item.className))].map((className) => ({
    className,
    rows: items.filter((item) => item.className === className).sort((a, b) => a.date.localeCompare(b.date) || timetableSessionSort(a, b))
  }));
  const controls = timetableToolbar();
  const content = `<div class="academic-calendar-toolbar"><div><strong>${escapeHtml(formatTimetableLabel(win))}</strong><p class="academic-subnote">${escapeHtml(semester)} · 按班级汇总课次，可打印单个班级的课表；调整课次仍走面授班级的「课次调整」。</p></div><div class="teacher-view-summary"><span>班级 ${groups.length} 个</span><span>课次 ${items.length} 条</span></div></div>`
    + filterPanel('class-timetable-filter', select('班级', 'className', unique(scoped.map((item) => item.className)), false, true, cache.className || '') + select('授课教师', 'teacher', unique(scoped.map((item) => item.teacher)), false, true, cache.teacher || '') + select('课次状态', 'status', TIMETABLE_STATUS_OPTIONS, false, true, cache.status || ''))
    + (groups.length ? groups.map((group) => {
      const first = group.rows[0];
      const conflicts = group.rows.filter((item) => item.conflict).length;
      return `<section class="academic-class-sheet"><header><div><strong>${escapeHtml(group.className)}</strong><span>${escapeHtml(first.course)} · ${escapeHtml(first.teacher)} · ${escapeHtml(first.campus)} · 共 ${group.rows.length} 次</span></div><div class="academic-class-sheet-actions">${conflicts ? `<span class="tag amber">冲突 ${conflicts} 条</span>` : ''}<button type="button" class="button" data-academic-action="class-sheet-print" data-class-name="${escapeHtml(group.className)}">打印本班课表</button></div></header><table><thead><tr><th>课次</th><th>日期</th><th>上课时间</th><th>教室</th><th>授课教师</th><th>课次状态</th><th>排课提示</th><th>操作</th></tr></thead><tbody>${group.rows.map((item, index) => `<tr data-row-id="${escapeHtml(item.id)}"><td>第 ${index + 1} 次</td><td>${escapeHtml(item.day)}</td><td>${escapeHtml(item.time)}</td><td>${escapeHtml(item.room)}</td><td>${escapeHtml(item.teacher)}</td><td>${item.stopped ? `<span class="tag gray is-stopped">${escapeHtml(item.status)}</span>` : tag(item.status)}</td><td>${timetableRiskTags(item)}</td><td><button type="button" class="text-button" data-academic-action="session-view">查看课次</button></td></tr>`).join('')}</tbody></table></section>`;
    }).join('') : '<div class="card empty">当前日期范围内暂无课次。</div>');
  pageFrame('课表管理 · 班级视图', '', controls, content);
  document.querySelector('#class-timetable-filter')?.addEventListener('submit', (event) => { event.preventDefault(); timetableFilters.classView = { ...timetableFilters.classView, ...Object.fromEntries(new FormData(event.currentTarget).entries()) }; renderClassTimetable(); });
  document.querySelector('#class-timetable-filter')?.addEventListener('reset', () => window.setTimeout(() => { timetableFilters.classView = {}; renderClassTimetable(); }, 0));
  bindTimetableSemester();
}
// 打印单个班级的课表：A4 纵向，一条课次一行，供张贴或发给家长；与屏幕班级视图同源同范围。
function printClassTimetable(className) {
  const win = timetableWindow();
  const semester = currentSemester();
  const rows = timetableSessionItems()
    .filter((item) => item.className === className && withinWindow(item.date, win) && item.semester === semester)
    .sort((a, b) => a.date.localeCompare(b.date) || timetableSessionSort(a, b));
  if (!rows.length) { showToast('当前日期范围内没有该班级的课次。', 'warning'); return; }
  const first = rows[0];
  const table = `<table class="academic-print-table"><thead><tr><th class="matrix-slot">课次</th><th>日期</th><th>星期</th><th>上课时间</th><th>教室</th><th>授课教师</th><th>课次状态</th></tr></thead><tbody>${rows.map((item, index) => `<tr><th class="matrix-slot">第 ${index + 1} 次</th><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.weekday)}</td><td>${escapeHtml(item.time)}</td><td>${escapeHtml(item.room)}</td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.status)}</td></tr>`).join('')}</tbody></table>`;
  const markup = `<section class="academic-print-sheet"><header><h1>${escapeHtml(className)} · 课表</h1><p>${escapeHtml(semester)} · ${escapeHtml(formatTimetableLabel(win))} · ${escapeHtml(first.course)} · ${escapeHtml(first.campus)} ${escapeHtml(first.room)}</p></header>${table}<footer><span>${escapeHtml(className)}</span><span>导出时间 ${new Date().toLocaleString('zh-CN')}</span></footer></section>`;
  document.querySelector('.academic-print-root')?.remove();
  const root = document.createElement('div');
  root.className = 'academic-print-root';
  root.innerHTML = markup;
  document.body.append(root);
  window.print();
}
function timetableSessionSort(a, b) { return a.start.localeCompare(b.start) || a.end.localeCompare(b.end); }
function matrixConflictText(conflict) { return conflict?.type === 'teacher' ? `冲突：教师 ${conflict.target} 同时段已有课次` : conflict?.type === 'room' ? `冲突：教室 ${conflict.target} 同时段已有课次` : ''; }
function matrixEntryMarkup(session) {
  const cls = ['matrix-entry'];
  if (session.conflict) cls.push('is-conflict');
  else if (session.stopped) cls.push('is-stopped');
  const extra = [
    session.conflict ? `<em>${escapeHtml(matrixConflictText(session.conflict))}</em>` : '',
    session.risks?.studentConflict ? `<em>学员冲突：${escapeHtml(session.risks.studentConflict)}</em>` : '',
    session.risks?.transferGap ? `<em>转场紧张 ${session.risks.transferGap.minutes} 分钟</em>` : '',
    session.risks?.overCapacity ? `<em>超容量 ${session.risks.overCapacity.enrolled}/${session.risks.overCapacity.capacity}</em>` : ''
  ].join('');
  return `<button type="button" class="${cls.join(' ')}" data-academic-action="matrix-session-view" data-session-id="${escapeHtml(session.id)}"><strong>${escapeHtml(session.className)}</strong><span>${escapeHtml(session.start)}–${escapeHtml(session.end)}</span><span>${escapeHtml(session.teacher)}</span>${extra}</button>`;
}
function quarterTimeSlots() {
  const start = toMinutes(TIMELINE_START);
  return Array.from({ length: TIMELINE_TICK_COUNT }, (_, index) => {
    const slotStart = start + index * TIMELINE_STEP_MINUTES;
    return { start: toTime(slotStart), end: toTime(slotStart + TIMELINE_STEP_MINUTES), index };
  });
}
// 课表工具栏：视图切换 / 日周月 / 「日期范围 + 学期」成组 / 更多（导出、打印、键盘创建排班）。
// 三个视图共用同一套控件，避免列表与教师视图看得到问题却找不到导出入口。
function timetableToolbar() {
  return `<div class="toolbar-actions">${timetableViewSwitch()}${timetableModeSwitch()}<div class="academic-range-group"><span class="academic-range-label">范围</span>${timetableDateNav()}${timetableSemesterSelect()}</div><details class="academic-more"><summary class="button">更多</summary><div class="academic-more-menu"><button type="button" class="text-button" data-academic-action="timetable-export" data-kind="excel">导出 Excel</button><button type="button" class="text-button" data-academic-action="timetable-export" data-kind="pdf">导出 PDF</button><button type="button" class="text-button" data-academic-action="timetable-print">打印</button><button type="button" class="text-button" data-academic-action="matrix-keyboard-create">键盘排课（按所选日期）</button></div></details></div>`;
}
// 同一教室同一天的重叠课次合并成一个跨行区块，避免在每个 15 分钟刻度上重复出现。
function matrixRoomBlocks(room, date, sessions, slotCount) {
  const dayStart = toMinutes(TIMELINE_START);
  const blocks = [];
  sessions
    .filter((s) => s.roomId === room.id && s.date === date && !isOutsideTimeline(s))
    .sort(timetableSessionSort)
    .forEach((session) => {
      const startIndex = Math.max(0, Math.floor((toMinutes(session.start) - dayStart) / TIMELINE_STEP_MINUTES));
      const endIndex = Math.min(slotCount, Math.ceil((toMinutes(session.end) - dayStart) / TIMELINE_STEP_MINUTES));
      if (endIndex <= startIndex) return;
      const owner = blocks.find((block) => startIndex < block.endIndex && endIndex > block.startIndex);
      if (owner) {
        owner.startIndex = Math.min(owner.startIndex, startIndex);
        owner.endIndex = Math.max(owner.endIndex, endIndex);
        owner.sessions.push(session);
        return;
      }
      blocks.push({ startIndex, endIndex, sessions: [session] });
    });
  return blocks.sort((a, b) => a.startIndex - b.startIndex);
}
// 空白刻度带上具体日期：从矩阵创建排班时同时带入星期、日期与教室，首次上课日期按该格日期预填。
// 键盘用户不逐个 Tab 过上千个空格子：空格按钮不进 Tab 序列，键盘走工具栏「更多 → 键盘创建排班」。
function matrixSlotCell(room, date, weekday, slot) {
  return `<td class="matrix-slot-cell" data-slot-index="${slot.index}" data-date="${escapeHtml(date)}" data-weekday="${escapeHtml(weekday)}" data-room-id="${escapeHtml(room.id)}" data-start="${escapeHtml(slot.start)}" data-campus="${escapeHtml(room.campus)}"><button type="button" class="matrix-slot-create" tabindex="-1" data-academic-action="matrix-create" data-date="${escapeHtml(date)}" data-weekday="${escapeHtml(weekday)}" data-start="${escapeHtml(slot.start)}" data-room-id="${escapeHtml(room.id)}" data-campus="${escapeHtml(room.campus)}" aria-label="在${escapeHtml(date)} ${escapeHtml(weekday)} ${escapeHtml(slot.start)} ${escapeHtml(room.name)} 为该班级排课"><span>按此时间排课</span></button></td>`;
}
let matrixDragState = null;
// 触摸端的选择状态：手指点选无法做纵向拖动，改为「点起点刻度 + 点同列终点刻度」。
let matrixTouchSelection = null;
// 密度开关只决定展示哪些刻度行，不改变时间轴与课次数据；默认仍是完整的 15 分钟刻度。
let matrixDensity = 'all';
function matrixDragRange(state) {
  return { from: Math.min(state.anchor, state.head), to: Math.max(state.anchor, state.head) };
}
function matrixSelectionKey(state) {
  return `${state?.date || ''}|${state?.roomId || ''}`;
}
function activeMatrixSelection() {
  return matrixDragState || matrixTouchSelection;
}
function paintMatrixSelection(wrap) {
  if (!wrap) return;
  const state = activeMatrixSelection();
  const range = state ? matrixDragRange(state) : null;
  wrap.querySelectorAll('.matrix-slot-cell').forEach((cell) => {
    const inRange = Boolean(range)
      && matrixSelectionKey(cell.dataset) === matrixSelectionKey(state)
      && Number(cell.dataset.slotIndex) >= range.from
      && Number(cell.dataset.slotIndex) <= range.to;
    cell.classList.toggle('is-selected', inRange);
  });
}
function beginMatrixDrag(cell) {
  matrixDragState = { date: cell.dataset.date, weekday: cell.dataset.weekday, roomId: cell.dataset.roomId, campus: cell.dataset.campus, anchor: Number(cell.dataset.slotIndex), head: Number(cell.dataset.slotIndex), moved: false };
  document.documentElement.classList.add('is-matrix-dragging');
}
function extendMatrixDrag(cell) {
  if (!matrixDragState) return;
  if (matrixSelectionKey(cell.dataset) !== matrixSelectionKey(matrixDragState)) return;
  const index = Number(cell.dataset.slotIndex);
  if (index === matrixDragState.head) return;
  matrixDragState.head = index;
  if (index !== matrixDragState.anchor) matrixDragState.moved = true;
}
function matrixTimeRange(state) {
  const range = matrixDragRange(state);
  return { start: toTime(toMinutes(TIMELINE_START) + range.from * TIMELINE_STEP_MINUTES), duration: (range.to - range.from + 1) * TIMELINE_STEP_MINUTES, ticks: range.to - range.from + 1 };
}
function finishMatrixDrag(wrap) {
  if (!matrixDragState) return;
  const state = matrixDragState;
  matrixDragState = null;
  document.documentElement.classList.remove('is-matrix-dragging');
  paintMatrixSelection(wrap);
  if (!state.moved) return;
  // 跨多个刻度的拖动就是所选课次时间窗；抑制随之而来的 click，避免再按单格创建重复打开抽屉。
  const swallow = (event) => { event.preventDefault(); event.stopPropagation(); };
  document.addEventListener('click', swallow, { capture: true, once: true });
  window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 0);
  const time = matrixTimeRange(state);
  openSchedulePlanner({ weekday: state.weekday, date: state.date, start: time.start, lessonDuration: time.duration, roomId: state.roomId, campus: state.campus, firstLessonDate: state.date });
}
function matrixTouchHintMarkup() {
  const state = matrixTouchSelection;
  if (!state) return '';
  const time = matrixTimeRange(state);
  const end = toTime(toMinutes(time.start) + time.duration);
  return `<div class="matrix-touch-hint-text">已选 <strong>${escapeHtml(state.date)} ${escapeHtml(state.weekday)} ${escapeHtml(time.start)}–${escapeHtml(end)}</strong>（${time.ticks} 格 · ${time.duration} 分钟）· ${escapeHtml(state.campus || '—')} ${escapeHtml(state.roomName || '')}<small>再点同一教室列的其他刻度可调整时间窗，点「创建排班」带入去排课抽屉。</small></div><div class="matrix-touch-hint-actions"><button type="button" class="button" data-academic-action="matrix-touch-clear">取消选择</button><button type="button" class="button primary" data-academic-action="matrix-touch-create">创建排班</button></div>`;
}
function updateMatrixTouchHint() {
  const hint = document.querySelector('[data-matrix-touch-hint]');
  if (!hint) return;
  const markup = matrixTouchHintMarkup();
  hint.innerHTML = markup;
  hint.hidden = !markup;
}
function beginMatrixTouchSelect(cell, wrap) {
  const sameColumn = Boolean(matrixTouchSelection) && matrixSelectionKey(matrixTouchSelection) === matrixSelectionKey(cell.dataset);
  const room = venues.find((item) => item.id === cell.dataset.roomId);
  matrixTouchSelection = sameColumn
    ? { ...matrixTouchSelection, head: Number(cell.dataset.slotIndex) }
    : { date: cell.dataset.date, weekday: cell.dataset.weekday, roomId: cell.dataset.roomId, roomName: room?.name || '', campus: cell.dataset.campus, anchor: Number(cell.dataset.slotIndex), head: Number(cell.dataset.slotIndex) };
  paintMatrixSelection(wrap);
  updateMatrixTouchHint();
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
// 教室数量多时矩阵会很宽：按教学楼切换教室列（筛选条件里的教学楼与这里同源）。
// 可选项按校区／场地类型范围给出、不受当前教学楼筛选影响，否则只剩一栋楼时无法切回「全部教学楼」。
function matrixBuildingSwitch(scope) {
  const buildings = [...new Set(scope.map((room) => room.building).filter(Boolean))];
  if (buildings.length < 2) return '';
  const current = timetableFilters.matrix.building || '';
  return `<div class="academic-view-switch academic-building-switch" role="tablist" aria-label="按教学楼切换教室列">${['', ...buildings].map((name) => `<button type="button" class="${current === name ? 'active' : ''}" data-academic-action="matrix-building" data-building="${escapeHtml(name)}" role="tab" aria-selected="${current === name}">${name ? escapeHtml(name) : '全部教学楼'}</button>`).join('')}</div>`;
}
function matrixDensitySwitch() {
  return `<label class="academic-checkbox academic-density-switch"><input type="checkbox" data-academic-action="matrix-density" ${matrixDensity === 'busy' ? 'checked' : ''}>只显示有课次的时段</label>`;
}
// 月视图：日期 × 教室聚合。31 天 × 52 刻度会把矩阵拉到 1500 行以上，月粒度改看聚合格，
// 点击单元格下钻到该日 15 分钟刻度视图；日／周视图仍保留完整刻度。
function matrixMonthAggregate(win, rooms, sessions) {
  const header = `<tr><th class="matrix-day-column">日期</th><th class="matrix-room-column">教室 / 课次</th></tr>`;
  const body = win.dates.map((date) => {
    const today = date === DEMO_TODAY;
    const chips = rooms.map((room) => {
      const entries = sessions.filter((session) => session.roomId === room.id && session.date === date).sort(timetableSessionSort);
      if (!entries.length) return '';
      const conflicts = entries.filter((entry) => entry.conflict).length;
      const outside = entries.some(isOutsideTimeline);
      const times = [...new Set(entries.map((entry) => `${entry.start}–${entry.end}`))].join('、');
      return `<button type="button" class="matrix-aggregate-entry${conflicts ? ' is-conflict' : ''}" data-academic-action="matrix-open-day" data-date="${escapeHtml(date)}" data-room-id="${escapeHtml(room.id)}" title="下钻查看该日 15 分钟刻度"><strong>${escapeHtml(room.name)} · ${entries.length} 节</strong><span>${escapeHtml(times)}</span><small>${escapeHtml([...new Set(entries.map((entry) => entry.className))].join('、'))}</small>${conflicts ? `<em>冲突 ${conflicts} 条</em>` : ''}${outside ? '<em>含超出时间轴课次</em>' : ''}</button>`;
    }).join('');
    return `<tr class="${today ? 'is-today-row' : ''}"><th class="matrix-day${today ? ' is-today' : ''}">${escapeHtml(date.slice(5))}<br><span>${escapeHtml(weekdayLabelOf(date))}</span>${today ? '<em class="matrix-today-flag">今天</em>' : ''}</th><td class="matrix-aggregate-cell">${chips || '<span class="muted">当日无课次</span>'}</td></tr>`;
  }).join('');
  return `<div class="academic-matrix-wrap" data-matrix-grid><table class="academic-matrix academic-matrix-aggregate"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
}
function renderTimetableMatrix(filterState = {}) {
  const win = timetableWindow();
  const semester = currentSemester();
  timetableFilters.matrix = { ...timetableFilters.matrix, ...filterState };
  const cache = timetableFilters.matrix;
  window.__timetableMatrixFilter = cache;
  matrixDragState = null;
  matrixTouchSelection = null;
  const stateParam = new URLSearchParams(window.location.search).get('state') || '';
  const scoped = timetableSessionItems().filter((item) => withinWindow(item.date, win) && item.semester === semester);
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const rooms = venues.filter(venueAvailable)
    .filter((v) => !cache.campus || v.campus === cache.campus)
    .filter((v) => !cache.building || v.building === cache.building)
    .filter((v) => !cache.type || v.type === cache.type)
    .sort((a, b) => a.building.localeCompare(b.building, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
  const sessions = scoped
    .filter((s) => !cache.teacher || s.teacher === cache.teacher)
    .filter((s) => !cache.className || s.className === cache.className)
    .filter((s) => !cache.status || s.status === cache.status);
  const controls = timetableToolbar();
  // 页头不显示说明文案：课表管理的口径放在页面说明弹窗里，不在标题下方重复提示。
  const description = '';
  const filterHtml = filterPanel('timetable-matrix-filter', select('校区', 'campus', unique(venues.map((item) => item.campus)), false, true, cache.campus || '')
    + select('教学楼', 'building', unique(venues.map((item) => item.building)), false, true, cache.building || '')
    + select('场地类型', 'type', unique(venues.map((item) => item.type)), false, true, cache.type || '')
    + select('授课教师', 'teacher', unique(scoped.map((item) => item.teacher)), false, true, cache.teacher || '')
    + select('班级', 'className', unique(scoped.map((item) => item.className)), false, true, cache.className || '')
    + select('课次状态', 'status', TIMETABLE_STATUS_OPTIONS, false, true, cache.status || ''));

  if (stateParam === 'no-permission') { pageFrame('课表管理', description, controls, '<div class="card empty">当前角色无权查看课表矩阵数据。</div>'); return; }
  if (stateParam === 'no-venue') { pageFrame('课表管理', description, controls, `${filterHtml}<div class="card empty">暂无启用教室，请先在场地管理中维护教室。<a class="button" href="/admin/pages/academic/venues.html">去场地管理</a></div>`); return; }
  if (stateParam === 'no-slot' || stateParam === 'out-of-timeline') { pageFrame('课表管理', description, controls, `${filterHtml}<div class="card empty">部分课次超出 ${TIMELINE_START}–${TIMELINE_END} 时间轴，未在矩阵中展示；时间轴为固定口径，无需配置。<a class="button" href="/admin/pages/crm/classes.html?stage=schedule">去班级排课</a></div>`); return; }

  const isMonth = win.mode === '月视图';
  const otherSessions = sessions.filter(isOutsideTimeline);
  const outsideLink = '<button type="button" class="text-button" data-academic-action="timetable-view-outside">在课次列表查看</button>';
  const notice = stateParam === 'no-session'
    ? '<div class="card empty">当前日期范围内暂无课次。</div>'
    : otherSessions.length
      ? (isMonth
        ? `<p class="academic-note warning">${otherSessions.length} 条课次时间超出 ${TIMELINE_START}–${TIMELINE_END}，已在聚合单元格内标注：${outsideLink}。</p>`
        : `<p class="academic-note warning">${otherSessions.length} 条课次时间超出 ${TIMELINE_START}–${TIMELINE_END} 时间轴，不在矩阵中展示。${outsideLink}（导出时归入「其他时段」分组）。</p>`)
      : '';
  const legend = '<div class="academic-matrix-legend"><span><i class="legend-normal"></i>正常课次</span><span><i class="legend-conflict"></i>冲突课次</span><span><i class="legend-stopped"></i>已停课</span><span><i class="legend-today"></i>今天／当前时间</span></div>';

  let matrix = '';
  if (!rooms.length) matrix = '<div class="card empty">暂无启用教室。</div>';
  else if (isMonth) matrix = matrixMonthAggregate(win, rooms, sessions);
  else {
    // 行按所选日期范围逐天展开，每行是一个 15 分钟刻度；列是启用教室，左侧固定「日期」「时段」两列。
    const slots = quarterTimeSlots();
    const nowTime = DEMO_NOW.slice(11);
    const nowIndex = win.dates.includes(DEMO_TODAY) ? slots.findIndex((slot) => slot.start <= nowTime && nowTime < slot.end) : -1;
    const body = win.dates.map((date) => {
      const weekday = weekdayLabelOf(date);
      const blocksByRoom = new Map(rooms.map((room) => [room.id, matrixRoomBlocks(room, date, sessions, slots.length)]));
      const busy = [];
      blocksByRoom.forEach((blocks) => blocks.forEach((block) => {
        for (let index = block.startIndex; index < block.endIndex; index += 1) busy.push(index);
        if (block.endIndex < slots.length) busy.push(block.endIndex);
        if (block.startIndex > 0) busy.push(block.startIndex - 1);
      }));
      const visible = matrixDensity === 'busy' ? [...new Set(busy)].sort((a, b) => a - b) : slots.map((slot) => slot.index);
      const position = new Map(visible.map((index, order) => [index, order]));
      const dayCell = (rowspan) => `<th class="matrix-day${date === DEMO_TODAY ? ' is-today' : ''}" rowspan="${rowspan}">${escapeHtml(date.slice(5))}<br><span>${escapeHtml(weekday)}</span>${date === DEMO_TODAY ? '<em class="matrix-today-flag">今天</em>' : ''}</th>`;
      if (!visible.length) return `<tr class="is-day-start">${dayCell(1)}<th class="matrix-slot">—</th><td class="matrix-empty-day" colspan="${Math.max(rooms.length, 1)}">该日暂无课次</td></tr>`;
      return visible.map((index, order) => {
        const slot = slots[index];
        const cells = rooms.map((room) => {
          const blocks = blocksByRoom.get(room.id) || [];
          const block = blocks.find((item) => item.startIndex === index);
          if (block) return `<td class="matrix-block-cell" rowspan="${(position.get(block.endIndex - 1) ?? position.get(index)) - position.get(index) + 1}"><div class="matrix-cell matrix-quarter-cell">${block.sessions.map(matrixEntryMarkup).join('')}</div></td>`;
          if (blocks.some((item) => item.startIndex < index && index < item.endIndex)) return '';
          return matrixSlotCell(room, date, weekday, slot);
        }).join('');
        const onHalfHour = /:(00|30)$/.test(slot.start);
        const gap = order > 0 && index - visible[order - 1] > 1;
        const tickClass = `${onHalfHour ? 'matrix-slot' : 'matrix-slot is-minor'}${index === nowIndex ? ' is-now' : ''}`;
        const tickLabel = `${gap ? '<span class="matrix-gap-flag" title="已隐藏无课次的刻度">⋯</span>' : ''}${onHalfHour ? escapeHtml(slot.start) : ''}${index === nowIndex ? '<span class="matrix-now-flag">现在</span>' : ''}`;
        return `<tr class="${order === 0 ? 'is-day-start' : ''}${gap ? ' is-gap' : ''}">${order === 0 ? dayCell(visible.length) : ''}<th class="${tickClass}">${tickLabel}</th>${cells}</tr>`;
      }).join('');
    }).join('');
    matrix = `<div class="academic-matrix-wrap" data-matrix-grid><table class="academic-matrix academic-matrix-ticks"><thead><tr><th class="matrix-day-column">日期</th><th class="matrix-time-column">时段</th>${rooms.map((room) => `<th><strong>${escapeHtml(room.name)}</strong><small>${escapeHtml(room.building)}</small></th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  const meta = `<div class="academic-calendar-toolbar"><div><strong>${escapeHtml(formatTimetableLabel(win))}</strong><p class="academic-subnote">${escapeHtml(semester)} · 日／周／月与学期都是真实过滤；空格悬浮显示创建入口，拖动可选中时间窗。</p></div><div class="teacher-view-summary"><span>课次 ${sessions.length} 条</span><span>教室 ${rooms.length} 间</span></div></div>`;
  const buildingScope = venues.filter(venueAvailable)
    .filter((v) => !cache.campus || v.campus === cache.campus)
    .filter((v) => !cache.type || v.type === cache.type);

  pageFrame('课表管理', description, controls, meta + filterHtml + matrixBuildingSwitch(buildingScope) + (isMonth ? '' : matrixDensitySwitch()) + '<div class="matrix-touch-hint" data-matrix-touch-hint hidden></div>' + notice + matrix + legend);
  const matrixWrap = document.querySelector('[data-matrix-grid]');
  matrixWrap?.addEventListener('pointerdown', (event) => {
    const cell = event.target.closest('.matrix-slot-cell');
    if (!cell) return;
    // 触摸端保留原生滚动，只用两次点选选择时间窗。
    if (event.pointerType === 'touch') {
      const swallow = (clickEvent) => { clickEvent.preventDefault(); clickEvent.stopPropagation(); };
      document.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 0);
      beginMatrixTouchSelect(cell, matrixWrap);
      return;
    }
    event.preventDefault();
    beginMatrixDrag(cell);
    paintMatrixSelection(matrixWrap);
  });
  matrixWrap?.addEventListener('pointerover', (event) => {
    if (!matrixDragState) return;
    const cell = event.target.closest('.matrix-slot-cell');
    if (!cell) return;
    extendMatrixDrag(cell);
    paintMatrixSelection(matrixWrap);
  });
  document.querySelector('#timetable-matrix-filter')?.addEventListener('submit', (event) => { event.preventDefault(); renderTimetableMatrix(readTimetableMatrixFilter(event.currentTarget)); });
  document.querySelector('#timetable-matrix-filter')?.addEventListener('reset', () => window.setTimeout(() => { timetableFilters.matrix = {}; renderTimetableMatrix(); }, 0));
  bindTimetableSemester();
}
// 课次详情：只读展示课次事实、风险提示与最近调整记录，并提供「去课次调整」深链，
// 形成「课表发现问题 → 调整 → 留痕 → 复查」的闭环。
function openTimetableSessionDialog(session) {
  const room = venues.find((v) => v.id === session.roomId);
  const classRecord = schedulingClasses().find((item) => item.id === session.classId || item.name === session.className);
  const logs = (classRecord?.adjustmentLogs || []).slice().reverse();
  const related = session.sessionIndex ? logs.filter((log) => Number(log.sessionIndex) === Number(session.sessionIndex)) : logs;
  const shown = (related.length ? related : logs).slice(0, 5);
  const riskList = [
    session.conflict ? `<span class="tag amber">${escapeHtml(matrixConflictText(session.conflict))}</span>` : '',
    session.risks?.studentConflict ? `<span class="tag amber">学员时间冲突：${escapeHtml(session.risks.studentConflict)}</span>` : '',
    session.risks?.transferGap ? `<span class="tag amber">换教室仅 ${session.risks.transferGap.minutes} 分钟（换 ${escapeHtml(session.risks.transferGap.room)}）</span>` : '',
    session.risks?.overCapacity ? `<span class="tag amber">报名超出教室容量 ${session.risks.overCapacity.enrolled}/${session.risks.overCapacity.capacity}</span>` : '',
    isOutsideTimeline(session) ? `<span class="tag amber">超出 ${TIMELINE_START}–${TIMELINE_END} 时间轴</span>` : ''
  ].filter(Boolean).join(' ') || '无';
  const logList = shown.length
    ? `<ul class="academic-adjustment-log">${shown.map((log) => `<li><strong>第 ${escapeHtml(String(log.sessionIndex || '—'))} 次 · ${escapeHtml(log.type || '调整课次')}</strong><span>${escapeHtml(log.before?.date || '—')} ${escapeHtml(log.before?.startTime || '')} → ${escapeHtml(log.after?.date || '—')} ${escapeHtml(log.after?.startTime || '')}</span><small>${escapeHtml(log.reason || '未填写原因')} · ${escapeHtml(log.operator || '教务')} · ${escapeHtml(log.adjustedAt || '')}</small></li>`).join('')}</ul>`
    : '<p class="academic-subnote">该课次暂无调整记录。</p>';
  const body = `<div class="academic-detail-list"><div><span>班级名称</span><strong>${escapeHtml(session.className)}</strong></div><div><span>课程名称</span><strong>${escapeHtml(session.course)}</strong></div><div><span>授课教师</span><strong>${escapeHtml(session.teacher)}</strong></div><div><span>校区 / 教室</span><strong>${escapeHtml(session.campus)} / ${escapeHtml(room?.name || '—')}</strong></div><div><span>上课日期</span><strong>${escapeHtml(session.date || '—')} ${escapeHtml(session.weekday || '')}</strong></div><div><span>上课时间</span><strong>${escapeHtml(session.start)}–${escapeHtml(session.end)}</strong></div><div><span>课次状态</span><strong>${tag(session.status)}</strong></div><div><span>考勤处理</span><strong>${session.attendanceProcess && session.attendanceProcess !== '—' ? escapeHtml(session.attendanceProcess) : '待补录'}</strong></div></div>`
    + `<section class="academic-session-block"><strong>风险提示</strong><div class="academic-session-risks">${riskList}</div></section>`
    + `<section class="academic-session-block"><strong>最近调整记录</strong>${logList}</section>`;
  // CR-2026-108：只有该班级存在可调整的未开始课次时才显示「去课次调整」，避免点开只弹提示。
  const adjustableCount = (classRecord?.sessions || []).filter(sessionCanAdjust).length;
  const actions = `<button type="button" class="button" data-dialog-close>关闭</button>${session.classId && adjustableCount ? `<a class="button" href="/admin/pages/crm/classes.html?stage=teaching&classId=${encodeURIComponent(session.classId)}&action=adjust${session.sessionIndex ? `&session=${encodeURIComponent(session.sessionIndex)}` : ''}">去课次调整</a>` : ''}<a class="button primary" href="/admin/pages/crm/classes.html?stage=schedule${session.classId ? `&classId=${encodeURIComponent(session.classId)}` : ''}">去班级排课</a>`;
  openDialog(`${session.className} · 课次详情`, '课次为只读展示；调整课次时间、教室或教师走「去课次调整」，整班排班变更走「去班级排课」。', body, actions);
}
// E11: A4 landscape export. Columns paginate by teaching building, rows paginate by date group,
// the header row repeats on every sheet and empty slot rows are hidden by default.
// 导出与屏幕同源：沿用当前日期范围（日／周／月）、学期与矩阵筛选条件，只是把 15 分钟刻度
// 折成半天段行以控制 A4 页数；超出时间轴的课次统一归入「其他时段」。
const EXPORT_ROOMS_PER_SHEET = 4;
const EXPORT_DAYS_PER_SHEET = 3;
const EXPORT_HALF_DAYS = [['上午段', '08:00', '12:00'], ['下午段', '12:00', '18:00'], ['晚上段', '18:00', '21:00']];
function exportHalfDayRows(win) {
  return win.dates.flatMap((date) => EXPORT_HALF_DAYS.map(([label, start, end], index) => ({
    id: `${date}-${index}`,
    date,
    weekday: weekdayLabelOf(date),
    name: `${date.slice(5)} ${weekdayLabelOf(date)} ${label}`,
    start,
    end
  })));
}
function buildTimetableSheets(hideEmpty = true, filterState = {}) {
  const win = timetableWindow();
  const semester = currentSemester();
  const rooms = venues.filter(venueAvailable)
    .filter((v) => !filterState.campus || v.campus === filterState.campus)
    .filter((v) => !filterState.building || v.building === filterState.building)
    .filter((v) => !filterState.type || v.type === filterState.type)
    .sort((a, b) => a.building.localeCompare(b.building, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
  const sessions = timetableSessionItems()
    .filter((item) => withinWindow(item.date, win) && item.semester === semester)
    .filter((s) => !filterState.teacher || s.teacher === filterState.teacher)
    .filter((s) => !filterState.className || s.className === filterState.className)
    .filter((s) => !filterState.status || s.status === filterState.status);
  const rows = exportHalfDayRows(win);
  const cellOf = (room, row) => sessions
    .filter((s) => s.roomId === room.id && s.date === row.date && !isOutsideTimeline(s) && toMinutes(s.start) >= toMinutes(row.start) && toMinutes(s.start) < toMinutes(row.end))
    .sort(timetableSessionSort);
  const otherEntries = (room) => sessions.filter((s) => s.roomId === room.id && isOutsideTimeline(s)).sort(timetableSessionSort);
  const sheets = [];
  const buildings = [...new Set(rooms.map((room) => room.building))];
  buildings.forEach((building) => {
    const buildingRooms = rooms.filter((room) => room.building === building);
    const roomChunks = [];
    for (let i = 0; i < buildingRooms.length; i += EXPORT_ROOMS_PER_SHEET) roomChunks.push(buildingRooms.slice(i, i + EXPORT_ROOMS_PER_SHEET));
    roomChunks.forEach((roomChunk, chunkIndex) => {
      const remaining = rows.filter((row) => !hideEmpty || roomChunk.some((room) => cellOf(room, row).length));
      const groups = [];
      let cursor = 0;
      while (cursor < remaining.length) {
        const date = remaining[cursor].date;
        const end = remaining.findIndex((row, index) => index > cursor && row.date !== date);
        const group = remaining.slice(cursor, end < 0 ? remaining.length : end);
        groups.push(group);
        cursor += group.length;
      }
      // 纵向按日期分页：每页最多 3 天（不足 3 天时不跨日拆分），与固定行的半分页等价。
      const pages = [];
      let page = [];
      groups.forEach((group) => {
        if (page.length && page.length + group.length > EXPORT_DAYS_PER_SHEET * EXPORT_HALF_DAYS.length) { pages.push(page); page = []; }
        page = page.concat(group);
      });
      if (page.length) pages.push(page);
      pages.forEach((slotGroup, groupIndex) => sheets.push({ building, roomChunk, chunkIndex, slotGroup, groupIndex, cellOf, otherEntries, semester, windowLabel: formatTimetableLabel(win) }));
    });
  });
  const hiddenCount = hideEmpty ? rooms.reduce((sum, room) => sum + rows.filter((row) => !cellOf(room, row).length).length, 0) : 0;
  return { sheets, rooms, rows, sessions, hiddenCount, windowLabel: formatTimetableLabel(win), semester };
}
function timetableSheetMarkup(sheet, index, total) {
  const entryCell = (entries) => (entries.length ? `<td>${entries.map((entry) => `<div class="export-entry${entry.conflict ? ' is-conflict' : ''}"><strong>${escapeHtml(entry.className)}</strong><span>${escapeHtml(entry.start)}–${escapeHtml(entry.end)} · ${escapeHtml(entry.teacher)}</span>${entry.conflict ? `<em>${escapeHtml(matrixConflictText(entry.conflict))}</em>` : ''}</div>`).join('')}</td>` : '<td class="export-empty">—</td>');
  const header = `<tr><th class="matrix-corner">时段 / 教室</th>${sheet.roomChunk.map((room) => `<th><strong>${escapeHtml(room.name)}</strong><small>${escapeHtml(room.campus)} · 容量 ${room.capacity}</small></th>`).join('')}</tr>`;
  const body = sheet.slotGroup.map((slot) => `<tr><th class="matrix-slot"><strong>${escapeHtml(slot.name)}</strong><small>${escapeHtml(slot.start)}–${escapeHtml(slot.end)}</small></th>${sheet.roomChunk.map((room) => entryCell(sheet.cellOf(room, slot.id))).join('')}</tr>`).join('');
  const otherRow = sheet.otherEntries && sheet.roomChunk.some((room) => sheet.otherEntries(room).length)
    ? `<tr><th class="matrix-slot"><strong>其他时段</strong><small>超出时间轴</small></th>${sheet.roomChunk.map((room) => entryCell(sheet.otherEntries(room))).join('')}</tr>`
    : '';
  return `<section class="academic-print-sheet"><header><h1>${escapeHtml(sheet.semester)}课程表（${escapeHtml(sheet.windowLabel)}）</h1><p>${escapeHtml(sheet.building)} · 只读矩阵导出</p></header><table class="academic-print-table"><thead>${header}</thead><tbody>${body}${otherRow}</tbody></table><footer><span>${escapeHtml(sheet.building)}${sheet.chunkIndex ? `（第 ${sheet.chunkIndex + 1} 组教室）` : ''}</span><span>第 ${index + 1} 页 / 共 ${total} 页 · 导出时间 ${new Date().toLocaleString('zh-CN')}</span></footer></section>`;
}
function openTimetableExport(kind, filterState = {}) {
  const label = kind === 'excel' ? 'Excel' : 'PDF';
  const preview = buildTimetableSheets(true, filterState);
  const pageCount = preview.sheets.length || 1;
  const roomCount = preview.rooms.length;
  const body = `<div class="academic-export-preview"><div class="academic-export-title">${escapeHtml(preview.semester)}课程表 · ${escapeHtml(preview.windowLabel)} · A4 横向预览</div>
    <div class="academic-export-pages">${(preview.sheets.length ? preview.sheets.slice(0, 2) : []).map((sheet, index) => `<div class="academic-export-page"><strong>第 ${index + 1} 页</strong><span>${escapeHtml(sheet.building)} · ${sheet.roomChunk.length} 间教室 · ${sheet.slotGroup.length} 个时段</span></div>`).join('') || '<div class="academic-export-page"><strong>暂无课次</strong><span>当前筛选条件下没有可导出的课次。</span></div>'}</div>
    <div class="academic-export-meta"><span>日期范围 ${escapeHtml(preview.windowLabel)}</span><span>启用教室 ${roomCount} 间</span><span>课次 ${preview.sessions.length} 条</span><span>默认隐藏空时段 ${preview.hiddenCount} 格</span><span>共 ${pageCount} 页</span></div></div>
    <label class="academic-checkbox"><input type="checkbox" data-export-hide-empty checked>隐藏整行无课次的时段（取消勾选则导出全部时段）</label>`;
  openDialog(`导出课表（${label}）`, 'A4 横向；导出范围与屏幕一致（当前日期范围、学期与筛选条件）；超出单页按教学楼横向分页、按日期纵向分页，表头每页重复。', body, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-academic-action="timetable-export-confirm" data-kind="' + kind + '">确认导出</button>', 'academic-export-dialog');
}
function printTimetable(hideEmpty) {
  const { sheets } = buildTimetableSheets(hideEmpty, window.__timetableMatrixFilter || {});
  document.querySelector('.academic-print-root')?.remove();
  const root = document.createElement('div');
  root.className = 'academic-print-root';
  root.innerHTML = sheets.length ? sheets.map((sheet, index) => timetableSheetMarkup(sheet, index, sheets.length)).join('') : '<section class="academic-print-sheet"><header><h1>课程表</h1></header><p>当前筛选条件下没有可导出的课次。</p></section>';
  document.body.append(root);
  window.print();
}
function renderAttendance() {
  academicData = attendance;
  pageFrame('考勤监控', '', '<button class="button" data-academic-action="attendance-export">导出考勤</button>', metrics([['今日记录', attendance.length, '实时打卡流水'], ['可计入统计', attendance.filter((a) => a.process !== '待补录').length, '待补录不计入结业判定'], ['待补录', attendance.filter((a) => a.process === '待补录').length, '需要教务处理'], ['异常状态', attendance.filter((a) => ['迟到', '缺勤'].includes(a.status)).length, '请核对教师记录']]) + filterPanel('attendance-filter', select('班级', 'className', ['少儿舞蹈基础班', '成人声乐班']) + `<label class="form-field"><span>课次日期</span><div class="date-range"><input type="date" name="from" value="2026-09-01"><span>至</span><input type="date" name="to" value="2026-09-30"></div></label>` + select('考勤状态', 'status', ['已到', '迟到', '请假', '缺勤']) + select('考勤处理状态', 'process', ['正常', '待补录', '已补录']) + field('学员姓名', 'student', 'text', '模糊搜索') + select('授课教师', 'teacher', ['王玥', '陈晨'], true)) + '<p class="academic-note warning">“待补录”记录暂不参与出勤率、缺勤率和结业判定；超过教师补录时限后由教务主管处理，并填写处理说明。</p>' + table('<thead><tr><th>班级 / 课次</th><th>上课日期</th><th>学员</th><th>考勤状态</th><th>处理状态</th><th>打卡时间</th><th>授课教师</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${item.className}<br><span class="muted">${item.session}</span></td><td>${item.date}</td><td>${item.student}</td><td>${tag(item.status)}</td><td>${tag(item.process)}</td><td>${item.time}</td><td>${item.teacher}</td><td class="action-cell"><button class="text-button" data-academic-action="attendance-view">查看详情</button>${item.process === '待补录' ? '<button class="text-button" data-academic-action="attendance-supplement">补录处理</button>' : ''}</td>`;
  renderRows(academicData, row);
  applyFilter('attendance-filter', academicData, (form) => { const { className, status, process, student, teacher } = form; return (item) => (!className.value || item.className === className.value) && (!status.value || item.status === status.value) && (!process.value || item.process === process.value) && (!student.value.trim() || item.student.includes(student.value.trim())) && (!teacher.value || item.teacher === teacher.value); }, row);
}
function renderHomework() {
  academicData = homework;
  pageFrame('作业批阅监管', '', '<button class="button" data-academic-action="homework-export">导出记录</button>', metrics([['进行中', homework.filter((h) => h.status === '进行中').length, '仍在提交期限内'], ['待批阅', homework.reduce((sum, h) => sum + h.submitted - h.reviewed, 0), '仅展示提交数量差'], ['已结束', homework.filter((h) => h.status === '已结束').length, '超过提交截止时间'], ['批阅完成率', '72%', '按提交份数统计']]) + filterPanel('homework-filter', select('班级', 'className', ['少儿舞蹈基础班', '成人声乐班', '国画入门工作坊']) + select('作业状态', 'status', ['进行中', '已结束']) + field('关键词', 'keyword', 'text', '作业标题')) + table('<thead><tr><th>作业标题</th><th>班级 / 课次</th><th>教师</th><th>发布时间</th><th>截止时间</th><th>已提交 / 总人数</th><th>作业状态</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td><strong>${item.title}</strong><br><span class="muted">已批阅 ${item.reviewed} 份</span></td><td>${item.className}<br><span class="muted">${item.session}</span></td><td>${item.teacher}</td><td>${item.published}</td><td>${item.deadline}</td><td>${item.submitted} / ${item.total}</td><td>${tag(item.status === '进行中' ? '作业进行中' : '作业已结束')}</td><td><button class="text-button" data-academic-action="homework-view">查看详情</button></td>`;
  renderRows(academicData, row);
  applyFilter('homework-filter', academicData, (form) => { const { className, status, keyword } = form; return (item) => (!className.value || item.className === className.value) && (!status.value || item.status === status.value) && (!keyword.value.trim() || item.title.includes(keyword.value.trim())); }, row);
}
function renderMessages() {
  academicData = messages;
  pageFrame('消息推送', '', '<button class="button primary" data-academic-action="message-create">发送班级通知</button>', metrics([['本月已发送', '86', '自动提醒与人工通知'], ['发送成功', '84', '渠道正常送达'], ['部分失败', '2', '可查看失败原因并补发'], ['定时提醒', '18', '上课前24小时触发']]) + filterPanel('message-filter', select('消息类型', 'type', ['停课通知', '调课通知', '上课提醒']) + select('发送状态', 'status', ['发送成功', '部分失败', '发送中', '发送失败']) + field('关键词', 'keyword', 'text', '标题 / 班级')) + table('<thead><tr><th>消息标题</th><th>消息类型</th><th>发送对象</th><th>关联班级</th><th>发送时间</th><th>发送状态</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td><strong>${item.title}</strong></td><td>${item.type}</td><td>${item.audience}</td><td>${item.className}</td><td>${item.time}</td><td>${tag(item.status)}</td><td class="action-cell"><button class="text-button" data-academic-action="message-view">查看</button>${item.status === '部分失败' || item.status === '发送失败' ? '<button class="text-button" data-academic-action="message-resend">补发</button>' : ''}</td>`;
  renderRows(academicData, row);
  applyFilter('message-filter', academicData, (form) => { const { type, status, keyword } = form; return (item) => (!type.value || item.type === type.value) && (!status.value || item.status === status.value) && (!keyword.value.trim() || `${item.title}${item.className}`.includes(keyword.value.trim())); }, row);
}
function classCounts(item) { const valid = item.learners.filter((l) => l.status !== '已取消结业'); return { total: item.learners.length, approved: item.learners.filter((l) => l.status === '已通过').length, suggested: item.learners.filter((l) => l.status === '待复核' && Number.parseInt(l.attendance) >= 90 && Number.parseInt(l.homework) >= 80).length, retaking: item.learners.filter((l) => ['需补课', '补课中'].includes(l.status)).length, pending: item.learners.filter((l) => l.status === '待复核').length, cancelled: item.learners.filter((l) => l.status === '已取消结业').length, rate: valid.length ? Math.round(item.learners.filter((l) => ['已通过', '需补课', '补课中'].includes(l.status)).length / valid.length * 100) : 0 }; }
function renderGraduation() {
  academicData = graduation;
  pageFrame('结业审核', '', '<button class="button" data-academic-action="graduation-export">导出审核台账</button>', metrics([['待复核班级', graduation.filter((g) => g.classStatus === '待复核').length, '按最早申请时间处理'], ['建议结业', graduation.reduce((s, g) => s + classCounts(g).suggested, 0), '系统按阈值初判'], ['补课中', graduation.reduce((s, g) => s + classCounts(g).retaking, 0), '学员级状态'], ['待补录考勤', attendance.filter((a) => a.process === '待补录').length, '不参与判定']]) + filterPanel('graduation-filter', select('班级结业状态', 'status', ['未发起', '待复核', '复核中', '已归档']) + select('授课教师', 'teacher', ['王玥', '陈晨']) + field('结课时间', 'date', 'date') + field('关键词', 'keyword', 'text', '班级名称')) + table('<thead><tr><th>班级名称</th><th>课程 / 教师</th><th>运营状态</th><th>学员数</th><th>建议结业</th><th>补课中</th><th>待复核</th><th>已取消结业</th><th>班级结业状态</th><th>完成率</th><th>操作</th></tr></thead>'));
  const row = (item) => { const c = classCounts(item); return `<td><strong>${item.className}</strong><br><span class="muted">结课 ${item.endDate}</span></td><td>${item.course}<br><span class="muted">${item.teacher}</span></td><td>${tag(item.operational)}</td><td>${c.total}</td><td>${c.suggested}</td><td>${c.retaking ? tag(String(c.retaking)) : '0'}</td><td>${c.pending ? tag(String(c.pending)) : '0'}</td><td>${c.cancelled}</td><td>${tag(item.classStatus)}</td><td><div class="academic-progress">${c.rate}%<div class="academic-progress-bar"><span style="width:${c.rate}%"></span></div></div></td><td><button class="text-button" data-academic-action="graduation-review">${item.classStatus === '待复核' ? '按学员审核' : '查看'}</button></td>`; };
  renderRows(academicData, row);
  applyFilter('graduation-filter', academicData, (form) => { const { status, teacher, keyword } = form; return (item) => (!status.value || item.classStatus === status.value) && (!teacher.value || item.teacher === teacher.value) && (!keyword.value.trim() || item.className.includes(keyword.value.trim())); }, row);
}
function renderReports() {
  academicData = reports;
  pageFrame('学习报告管理', '', '<button class="button" data-academic-action="report-export">导出报告清单</button>', metrics([['草稿', reports.filter((r) => r.status === '草稿').length, '发布前仅后台可见'], ['已发布', reports.filter((r) => r.status === '已发布').length, '学员端可查看'], ['已撤回', reports.filter((r) => r.status === '已撤回').length, '修订后可再次发布'], ['生成失败', reports.filter((r) => r.generation === '生成失败').length, '结业状态不受影响']]) + filterPanel('report-filter', select('报告状态', 'status', ['草稿', '已发布', '已撤回']) + select('课程名称', 'course', ['舞蹈基本功', '声乐基础', '中国画基础']) + field('学员姓名', 'student', 'text', '姓名') + field('更新时间', 'date', 'date')) + table('<thead><tr><th>报告编号</th><th>学员</th><th>课程 / 班级</th><th>结业状态</th><th>报告状态</th><th>生成状态</th><th>版本 / 更新时间</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${item.number}</td><td>${item.student}</td><td>${item.course}<br><span class="muted">${item.className}</span></td><td>${tag('已通过')}</td><td>${tag(item.status)}</td><td>${tag(item.generation)}</td><td>${item.version}<br><span class="muted">${item.updated}</span></td><td class="action-cell"><button class="text-button" data-academic-action="report-preview">预览</button>${['草稿', '已撤回'].includes(item.status) ? '<button class="text-button" data-academic-action="report-publish">发布</button>' : ''}${item.status === '已发布' ? '<button class="text-button" data-academic-action="report-recall">撤回</button>' : ''}${item.generation === '生成失败' ? '<button class="text-button" data-academic-action="report-retry">重试</button>' : ''}${['草稿', '已撤回'].includes(item.status) ? '<button class="text-button danger-link" data-academic-action="report-delete">删除</button>' : ''}</td>`;
  renderRows(academicData, row);
  applyFilter('report-filter', academicData, (form) => { const { status, course, student } = form; return (item) => (!status.value || item.status === status.value) && (!course.value || item.course === course.value) && (!student.value.trim() || item.student.includes(student.value.trim())); }, row);
}

function openSimpleForm(title, subtitle, body, onSubmit, actions = '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="academic-form" class="button primary">确认</button>') {
  const dialog = openDialog(title, subtitle, `<form id="academic-form" class="academic-dialog-grid">${body}</form>`, actions);
  dialog.querySelector('#academic-form')?.addEventListener('submit', (event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget), dialog); });
  return dialog;
}
// 通知内容按富文本字段维护：与图文详情、教师简介复用同一个富文本编辑器组件。
function openMessageForm() {
  const body = select('通知类型', 'type', ['停课通知', '调课通知', '上课提醒'], false, false)
    + select('目标班级', 'className', ['少儿舞蹈基础班', '成人声乐班', '国画入门工作坊'], false, false)
    + field('通知标题', 'title', 'text', '请输入通知标题')
    + field('发送时间', 'time', 'datetime-local', '', false)
    + '<label class="form-field wide"><span>通知内容</span><div class="rich-editor-field" data-rich-editor data-name="content" data-aria-label="通知内容" data-placeholder="请输入通知内容（≤2000 字）" data-min-height="180px" data-max-length="2000"></div></label>'
    + '<label class="form-field wide"><span>发送方式</span><div class="choice-group"><label class="choice"><input type="radio" name="sendMode" value="立即发送" checked>立即发送</label><label class="choice"><input type="radio" name="sendMode" value="定时发送">定时发送</label></div></label>';
  const dialog = openSimpleForm('发送班级通知', '停课、调课和上课提醒均会记录发送结果，失败时支持补发。', body, (form) => {
    messages.unshift({ id: `message-${Date.now()}`, title: form.get('title') || '未命名通知', type: form.get('type'), audience: '教师、学员', className: form.get('className'), time: form.get('time') || '立即发送', status: '发送成功', fail: '', content: richTextValue(form.get('content')) });
    closeDialog(); renderMessages(); showToast('通知已发送，失败记录可在列表补发。');
  });
  mountRichEditor(dialog.querySelector('[data-rich-editor]'));
  dialog.addEventListener('rich-editor:message', (event) => showToast(event.detail.message, event.detail.kind));
  return dialog;
}
// B2-QA-03：排班详情的学员名单来自报名记录（demo-store enrollments），不再只显示课次进度。
// 名单入口最终落在排班详情还是面授班级详情由产品确认（I1-QA-CLASS-05）；本实现按“排班详情可查看名单”给出。
function scheduleRosterMarkup(row) {
  const shared = readDemoState();
  const classId = classSeed.find((item) => item.name === row.name)?.id || '';
  const enrollments = (shared.enrollments || []).filter((item) => item.classId === classId || item.className === row.name);
  const names = enrollments.map((item) => {
    const student = (shared.students || []).find((entry) => entry.id === item.studentId);
    return `${escapeHtml(student?.name || item.studentId)}（${escapeHtml(item.status)}）`;
  });
  const expected = row.generated ? Number(String(row.generated).split('/')[1].trim()) : 0;
  return `${names.length ? names.join('、') : '暂无已报名学员'}<br><small class="muted">报名记录 ${enrollments.length} 人${expected ? ` · 招生上限 ${expected} 人` : ''}</small>`;
}
function detailDialog(title, subtitle, pairs) { openDialog(title, subtitle, `<div class="academic-detail-list">${pairs.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`); }
// E03: venue archive — create / edit / enable-disable / delete (guarded) / Excel import.
function venueUsedBySessions(venue) {
  const used = allTimetableSessions().filter(session => session.roomId === venue.id).length;
  const published = (readDemoState().classes || []).some(classRow => classRow.classroom === venue.name);
  return used > 0 || published;
}
function openCampusForm(row = null) {
  const body = `<form id="campus-form" class="academic-form-grid"><label class="form-field"><span>校区名称 <b class="required-mark">*</b></span><input name="name" maxlength="30" required value="${escapeHtml(row?.name || '')}" placeholder="如 龙泉校区"></label><label class="form-field"><span>状态</span><select name="status"><option ${row?.status !== '停用' ? 'selected' : ''}>启用</option><option ${row?.status === '停用' ? 'selected' : ''}>停用</option></select></label><label class="form-field wide"><span>校区地址</span><input name="address" maxlength="100" value="${escapeHtml(row?.address || '')}" placeholder="请输入校区地址"></label></form>`;
  const dialog = openDialog(row ? '编辑校区' : '新增校区', '校区是教学楼和教室的一级归属。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="campus-form">保存校区</button>', 'academic-venue-dialog');
  dialog.querySelector('#campus-form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name')).trim(); if (campuses.some(item => item.id !== row?.id && item.name === name)) return showToast('校区名称已存在。', 'error'); const record = { id: row?.id || demoId('campus'), name, address: String(data.get('address') || '').trim(), status: data.get('status') || '启用' }; if (row) { const oldName = row.name; Object.assign(row, record); buildings.forEach(item => { if (item.campus === oldName) { item.campus = name; persistBuilding(item); } }); venues.forEach(item => { if (item.campus === oldName) { item.campus = name; persistVenue(item); } }); } else campuses.unshift(record); persistCampus(record); closeDialog(); renderVenues(); showToast('校区信息已保存。'); });
}
function openBuildingForm(row = null) {
  const activeCampuses = campuses.filter(item => item.status === '启用' || item.name === row?.campus);
  const body = `<form id="building-form" class="academic-form-grid"><label class="form-field"><span>所属校区 <b class="required-mark">*</b></span><select name="campus" required><option value="">请选择校区</option>${activeCampuses.map(item => `<option ${item.name === row?.campus ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label class="form-field"><span>教学楼名称 <b class="required-mark">*</b></span><input name="name" maxlength="30" required value="${escapeHtml(row?.name || '')}" placeholder="如 艺术楼"></label><label class="form-field"><span>状态</span><select name="status"><option ${row?.status !== '停用' ? 'selected' : ''}>启用</option><option ${row?.status === '停用' ? 'selected' : ''}>停用</option></select></label></form>`;
  const dialog = openDialog(row ? '编辑教学楼' : '新增教学楼', '教学楼必须归属一个启用校区。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="building-form">保存教学楼</button>', 'academic-venue-dialog');
  dialog.querySelector('#building-form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const campus = String(data.get('campus')); const name = String(data.get('name')).trim(); if (buildings.some(item => item.id !== row?.id && item.campus === campus && item.name === name)) return showToast('该校区下已存在同名教学楼。', 'error'); const record = { id: row?.id || demoId('building'), campus, name, status: data.get('status') || '启用' }; if (row) { const oldCampus = row.campus; const oldName = row.name; Object.assign(row, record); venues.forEach(item => { if (item.campus === oldCampus && item.building === oldName) { item.campus = campus; item.building = name; persistVenue(item); } }); } else buildings.unshift(record); persistBuilding(record); closeDialog(); renderVenues(); showToast('教学楼信息已保存。'); });
}
function openVenueForm(row = null) {
  const option = (value, current) => `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(value)}</option>`;
  const activeCampuses = campuses.filter(item => item.status === '启用' || item.name === row?.campus);
  const selectedCampus = row?.campus || activeCampuses[0]?.name || '';
  const activeBuildings = buildings.filter(item => item.campus === selectedCampus && (item.status === '启用' || item.name === row?.building));
  const body = `<form id="venue-form" class="academic-form-grid">
    <label class="form-field"><span>所属校区 <b class="required-mark">*</b></span><select name="campus" required><option value="">请选择校区</option>${activeCampuses.map(item => option(item.name, selectedCampus)).join('')}</select></label>
    <label class="form-field"><span>教学楼 <b class="required-mark">*</b></span><select name="building" required><option value="">请选择教学楼</option>${activeBuildings.map(item => option(item.name, row?.building)).join('')}</select></label>
    <label class="form-field"><span>教室名称 <b class="required-mark">*</b></span><input name="name" required value="${escapeHtml(row?.name || '')}" placeholder="如 综合楼302" /></label>
    <label class="form-field"><span>场地类型 <b class="required-mark">*</b></span><select name="type" required><option value="">请选择类型</option>${['舞蹈房', '琴房', '画室', '普通教室'].map(v => option(v, row?.type)).join('')}</select></label>
    <label class="form-field"><span>容量 <b class="required-mark">*</b></span><input name="capacity" type="number" min="1" required value="${escapeHtml(row?.capacity || '')}" placeholder="可容纳人数" /></label>
    <label class="form-field wide"><span>设备标签</span><input name="tags" value="${escapeHtml(row?.tags || '')}" placeholder="如 镜面墙 / 音响" /></label>
    <label class="form-field"><span>场地状态</span><select name="status">${['启用', '停用'].map(v => option(v, row?.status || '启用')).join('')}</select></label>
    
  </form>`;
  const dialog = openDialog(row ? '编辑教室' : '新增教室', '维护校区、教学楼与教室档案，排课和课表都读取同一份数据。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="venue-form">保存教室</button>', 'academic-venue-dialog');
  dialog.querySelector('[name="campus"]')?.addEventListener('change', event => { const buildingField = dialog.querySelector('[name="building"]'); const options = buildings.filter(item => item.campus === event.target.value && item.status === '启用'); buildingField.innerHTML = '<option value="">请选择教学楼</option>' + options.map(item => option(item.name, '')).join(''); });
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
    // 唯一键：校区 + 教学楼 + 教室名称（与批量导入的匹配口径一致）。
    if (venues.some(item => item.id !== record.id && item.campus === record.campus && item.building === record.building && item.name === record.name)) return showToast('该教学楼下已存在同名教室。', 'error');
    const index = venues.findIndex(item => item.id === record.id);
    if (index < 0) venues.unshift(record); else venues[index] = { ...venues[index], ...record };
    persistVenue(record);
    closeDialog(); renderVenues();
    showToast(row ? '场地信息已保存。' : '场地已创建，可在排课与课表中使用。');
  });
}
const VENUE_IMPORT_TYPES = ['舞蹈房', '琴房', '画室', '普通教室'];

// B2-QA-04：导入结果必须来自所选文件／粘贴文本的实际内容，非法行输出行号与原因。
function venueImportSheetRows(rows) {
  const table = rows.map((row) => ({ line: row.rowNumber, cells: row.cells.map((cell) => String(cell ?? '').trim()) }));
  const headerIndex = table.findIndex((row) => row.cells.some((cell) => cell.includes('教室') || cell.includes('教学楼')));
  const body = headerIndex >= 0 ? table.slice(headerIndex + 1) : table;
  return body.filter((row) => {
    const filled = row.cells.filter(Boolean);
    return filled.length > 0 && !filled[0].startsWith('填写说明');
  });
}

function venueImportTextRows(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, cells: line.split(/[,，\t]/).map((item) => item.trim()) }))
    .filter((row) => row.cells.some(Boolean));
}

async function readVenueImportSource(form) {
  const file = form.querySelector('[name=file]')?.files?.[0];
  if (file) {
    if (/\.xlsx$/i.test(file.name)) {
      let sheetRows = null;
      try { sheetRows = await readXlsxSheetRows(await file.arrayBuffer()); } catch { sheetRows = null; }
      if (!sheetRows) return { source: file.name, rows: null, error: `${file.name} 无法解析，请使用 .xlsx／.csv／.txt 且保持「校区,教学楼,教室,类型,容量」五列结构。` };
      return { source: file.name, rows: venueImportSheetRows(sheetRows) };
    }
    const text = await file.text();
    return { source: file.name, rows: venueImportTextRows(text) };
  }
  const pasted = new FormData(form).get('rows');
  return { source: '粘贴文本', rows: venueImportTextRows(pasted) };
}

function validateVenueImportRows(rows) {
  const imported = [];
  const failures = [];
  rows.forEach(({ line, cells }) => {
    const [campus, building, name, type, capacity] = cells;
    const fail = (reason) => failures.push({ line, name: name || '—', reason });
    if (!name) { fail('缺少教室名称'); return; }
    if (!campus || !campuses.some(item => item.name === campus && item.status === '启用')) { fail('校区不存在或已停用，请先维护校区档案'); return; }
    if (!building) { fail('缺少教学楼'); return; }
    if (!buildings.some(item => item.campus === campus && item.name === building && item.status === '启用')) { fail('教学楼不存在、已停用或不属于所选校区'); return; }
    if (type && !VENUE_IMPORT_TYPES.includes(type)) { fail('场地类型不在字典内（舞蹈房／琴房／画室／普通教室）'); return; }
    if (capacity && !/^[1-9]\d*$/.test(capacity)) { fail('容量需为正整数'); return; }
    imported.push({ campus, building, name, type: type || '普通教室', capacity: Number(capacity) || 20 });
  });
  return { imported, failures };
}

function openVenueImportResult(sourceName, result) {
  const failureRows = result.failures.map((item) => `<tr><td>${item.line}</td><td>${escapeHtml(item.name)}</td><td><span class="tag red">${escapeHtml(item.reason)}</span></td></tr>`).join('');
  const body = `<div class="detail-grid" style="margin-bottom:12px"><section><h3>导入汇总</h3><dl class="info-grid"><div><dt>来源</dt><dd>${escapeHtml(sourceName)}</dd></div><div><dt>新增</dt><dd>${result.created} 间</dd></div><div><dt>更新</dt><dd>${result.updated} 间</dd></div><div><dt>失败</dt><dd>${result.failures.length} 行</dd></div></dl></section></div>${result.failures.length ? `<div class="table-wrap academic-table"><table><thead><tr><th>行号</th><th>教室</th><th>失败原因</th></tr></thead><tbody>${failureRows}</tbody></table></div>` : '<p>全部数据行导入成功。</p>'}`;
  openDialog(`场地导入结果 · ${sourceName}`, `已处理 ${result.created + result.updated} 行，失败行未导入，可修正后重新导入。`, body);
}

function openVenueImport() {
  const body = `<form id="venue-import-form" class="academic-form-grid">
    <label class="form-field wide"><span>导入文件（.xlsx／.csv／.txt）</span><input name="file" type="file" accept=".xlsx,.csv,.txt" /></label>
    <label class="form-field wide"><span>未选择文件时，按以下教室清单导入（每行：校区,教学楼,教室,类型,容量）</span><textarea name="rows" rows="6">龙泉校区,艺术楼,艺术楼201,舞蹈房,26
南湖校区,音乐楼,音乐楼305,琴房,18</textarea></label>
  </form>`;
  const dialog = openDialog('批量导入场地', '支持 .xlsx／.csv／.txt 文件或文本粘贴，导入后立即出现在课表矩阵的可选教室中。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="venue-import-form">开始导入</button>', 'academic-venue-dialog');
  dialog.querySelector('#venue-import-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const source = await readVenueImportSource(form);
    if (source.rows === null) { showToast(source.error, 'error'); return; }
    if (!source.rows.length) {
      showToast(source.source === '粘贴文本' ? '请粘贴教室清单或选择导入文件。' : `${source.source} 中没有可导入的数据行。`, 'warning');
      return;
    }
    const { imported, failures } = validateVenueImportRows(source.rows);
    let created = 0;
    let updated = 0;
    imported.forEach((line) => {
      // 唯一键：校区 + 教学楼 + 教室名称，避免跨校区同名教学楼误判为同一条。
      const existing = venues.find((item) => item.campus === line.campus && item.building === line.building && item.name === line.name);
      const record = { id: existing?.id || demoId('venue'), campus: line.campus, building: line.building, name: line.name, type: line.type, capacity: line.capacity, tags: existing?.tags || '', status: existing?.status || '启用' };
      const index = venues.findIndex((item) => item.id === record.id);
      if (index < 0) { venues.unshift(record); created += 1; } else { venues[index] = { ...venues[index], ...record }; updated += 1; }
      persistVenue(record);
    });
    closeDialog();
    renderVenues();
    openVenueImportResult(source.source, { created, updated, failures });
    showToast(`已按 ${source.source} 导入：新增 ${created} 间、更新 ${updated} 间${failures.length ? `，${failures.length} 行失败` : ''}。`, failures.length ? 'warning' : 'success');
  });
}
function deleteVenue(row) {
  if (venueUsedBySessions(row)) { showToast(`“${row.name}”已被课次或班级引用，只能停用不能删除。`, 'error'); return; }
  openDialog('确认删除场地', '删除后不可恢复；已被引用的场地请改为停用。', `<p>确认删除“${escapeHtml(row.name)}”？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="venue-delete">确认删除</button>').dataset.rowId = row.id;
}
function deleteCampus(row) {
  if (buildings.some(item => item.campus === row.name) || venues.some(item => item.campus === row.name)) { showToast('该校区下仍有教学楼或教室，只能停用，不能删除。', 'error'); return; }
  openDialog('确认删除校区', '删除后不可恢复。', `<p>确认删除“${escapeHtml(row.name)}”？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="campus-delete">确认删除</button>').dataset.rowId = row.id;
}
function deleteBuilding(row) {
  if (venues.some(item => item.campus === row.campus && item.building === row.name)) { showToast('该教学楼下仍有教室，只能停用，不能删除。', 'error'); return; }
  openDialog('确认删除教学楼', '删除后不可恢复。', `<p>确认删除“${escapeHtml(row.name)}”？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="building-delete">确认删除</button>').dataset.rowId = row.id;
}
function toggleVenue(row) {
  const target = row.status === '启用' ? '停用' : '启用';
  if (target === '启用' && (!campusEnabled(row.campus) || !buildingEnabled(row.campus, row.building))) { showToast('请先启用所属校区和教学楼。', 'error'); return; }
  row.status = target;
  persistVenue(row);
  renderVenues();
  showToast(target === '停用' ? `“${row.name}”已停用，不再出现在新建矩阵列中，历史课次仍可查询。` : `“${row.name}”已启用，可参与排课。`);
}
function toggleCampus(row) { row.status = row.status === '启用' ? '停用' : '启用'; persistCampus(row); renderVenues(); showToast(`校区已${row.status}；下级档案保留，停用期间不可用于新排课。`); }
function toggleBuilding(row) { const target = row.status === '启用' ? '停用' : '启用'; if (target === '启用' && !campusEnabled(row.campus)) { showToast('请先启用所属校区。', 'error'); return; } row.status = target; persistBuilding(row); renderVenues(); showToast(`教学楼已${row.status}；下级教室保留，停用期间不可用于新排课。`); }

function handleAction(action, row) {
  if (action === 'campus-create' || action === 'campus-edit') return openCampusForm(action === 'campus-edit' ? row : null);
  if (action === 'building-create' || action === 'building-edit') return openBuildingForm(action === 'building-edit' ? row : null);
  if (action === 'campus-toggle') return toggleCampus(row);
  if (action === 'building-toggle') return toggleBuilding(row);
  if (action === 'campus-delete') return deleteCampus(row);
  if (action === 'building-delete') return deleteBuilding(row);
  if (action === 'venue-create' || action === 'venue-edit') return openVenueForm(action === 'venue-edit' ? row : null);
  if (action === 'venue-import') return openVenueImport();
  if (action === 'venue-toggle') return toggleVenue(row);
  if (action === 'venue-delete') return deleteVenue(row);
  if (action === 'venue-schedule') return detailDialog(`${row.name} · 排课查看`, '已按校区和教室筛选课表。', [['所属校区', row.campus], ['教学楼', row.building], ['场地类型', row.type], ['容量', `${row.capacity}人`], ['本周排课', row.status === '启用' ? '周六 09:00 · 少儿舞蹈基础班' : '暂无有效排课'], ['状态', tag(row.status)]]);
  if (action === 'attendance-view') return detailDialog('考勤打卡详情', '展示教师端上传的最终考勤状态。', [['班级 / 课次', `${row.className} / ${row.session}`], ['学员', row.student], ['上课日期', row.date], ['考勤状态', tag(row.status)], ['处理状态', tag(row.process)], ['打卡时间', row.time], ['授课教师', row.teacher], ['统计口径', row.process === '待补录' ? '待补录完成前不计入统计和结业判定' : '纳入出勤统计和结业判定']]);
  if (action === 'attendance-supplement') return openSimpleForm('补录 / 修正考勤', '当前记录为待补录；教师需填写原因，超时处理需填写教务处理说明。', select('最终考勤状态', 'status', ['已到', '迟到', '请假', '缺勤'], false, false) + field('补录原因', 'reason', 'text', '必填：说明漏记或迟记原因', true) + field('教务处理说明', 'note', 'text', '超时处理时必填', true), (form) => { row.status = form.get('status'); row.process = '已补录'; row.time = '教务补录'; renderAttendance(); showToast('考勤已补录，已纳入统计并同步相关端。'); });
  if (action === 'homework-view') return openDialog(`${row.title} · 作业详情`, '监督提交和文本批阅进度。', `<div class="academic-detail-list"><div><span>作业内容</span><strong>${escapeHtml(row.content)}</strong></div><div><span>提交情况</span><strong>${row.submitted} / ${row.total} 人</strong></div><div><span>批阅进度</span><strong>${row.reviewed} / ${row.submitted} 份</strong></div><div><span>批阅规则</span><strong>仅文本评语，可选批注文件；无分数、无等级</strong></div></div><div class="form-section"><h3>示例文本评语</h3><div class="academic-report-content">动作完成度较好，建议继续保持练习频率。</div></div>`);
  if (action === 'message-view') return detailDialog(row.title, '查看通知正文和发送结果。', [['通知类型', row.type], ['发送对象', row.audience], ['目标班级', row.className], ['发送时间', row.time], ['发送状态', tag(row.status)], ['失败原因', row.fail || '无']]);
  if (action === 'message-resend') { const dialog = openDialog('确认补发通知', '失败消息补发不会改变原消息记录。', `<p>${escapeHtml(row.fail || '将向未成功送达的对象补发该通知。')}</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-confirm-action="message-resend">确认补发</button>'); dialog.dataset.rowId = row.id; return dialog; }
  if (action === 'message-create') return openMessageForm();
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
  if (action === 'campus-delete') { const index = campuses.findIndex(item => item.id === row?.id); if (index >= 0) { campuses.splice(index, 1); removeDemoRecord('campuses', row.id); } closeDialog(); renderVenues(); showToast('校区已删除。'); }
  if (action === 'building-delete') { const index = buildings.findIndex(item => item.id === row?.id); if (index >= 0) { buildings.splice(index, 1); removeDemoRecord('buildings', row.id); } closeDialog(); renderVenues(); showToast('教学楼已删除。'); }
  if (action === 'message-resend') { row.status = '发送成功'; row.fail = ''; closeDialog(); renderMessages(); showToast('失败消息已补发。'); }
  if (action === 'report-publish') { row.status = '已发布'; row.updated = '2026-09-08 11:25'; closeDialog(); renderReports(); showToast('学习报告已发布，学员端现已可见。'); }
  if (action === 'report-delete') { reports.splice(reports.findIndex((item) => item.id === row.id), 1); closeDialog(); renderReports(); showToast('报告记录已删除。'); }
}
// Drag selection lives on the matrix itself; releasing anywhere ends the gesture so a stray
// pointer-out never leaves the classroom grid stuck in a selecting state.
document.addEventListener('pointerup', () => {
  if (!matrixDragState) return;
  finishMatrixDrag(document.querySelector('[data-matrix-grid]'));
});
document.addEventListener('click', (event) => {
  if (!academicRoot) return;
  if (event.target.closest('[data-dialog-close]')) { closeDialog(); return; }
  const confirm = event.target.closest('[data-confirm-action]');
  if (confirm) { const dialog = confirm.closest('dialog'); const rowId = dialog?.dataset.rowId; const row = rowId ? academicData.find((item) => item.id === rowId) : null; confirmAction(confirm.dataset.confirmAction, row); return; }
  const button = event.target.closest('[data-academic-action]'); if (!button) return;
  const action = button.dataset.academicAction;
  if (action === 'timetable-view') { setTimetableView(button.dataset.view); return; }
  if (action === 'timetable-view-outside') { setTimetableView('list'); showToast('已在课次列表列出超出时间轴的课次。'); return; }
  if (action === 'timetable-export') { openTimetableExport(button.dataset.kind, window.__timetableMatrixFilter || {}); return; }
  if (action === 'timetable-print') { printTimetable(true); return; }
  if (action === 'class-sheet-print') { printClassTimetable(button.dataset.className || ''); return; }
  if (action === 'timetable-export-confirm') {
    const hideEmpty = document.querySelector('[data-export-hide-empty]')?.checked !== false;
    closeDialog();
    printTimetable(hideEmpty);
    showToast(hideEmpty ? '已生成 A4 横向课表（隐藏空时段），可在打印窗口另存为 PDF。' : '已生成 A4 横向课表（含全部时段），可在打印窗口另存为 PDF。');
    return;
  }
  if (action === 'matrix-expand') { const cell = button.closest('.matrix-cell'); const all = cell?.querySelector('.matrix-cell-all'); const hidden = all?.hasAttribute('hidden'); if (hidden) all?.removeAttribute('hidden'); else all?.setAttribute('hidden', ''); button.textContent = hidden ? '收起' : `还有 ${button.dataset.count} 条`; return; }
  if (action === 'matrix-create') { openSchedulePlanner({ weekday: button.dataset.weekday, date: button.dataset.date, start: button.dataset.start, roomId: button.dataset.roomId, campus: button.dataset.campus, firstLessonDate: button.dataset.date }); return; }
  if (action === 'matrix-building') { timetableFilters.matrix = { ...timetableFilters.matrix, building: button.dataset.building || '' }; renderTimetableMatrix(); return; }
  if (action === 'matrix-density') { matrixDensity = button.checked ? 'busy' : 'all'; renderTimetableMatrix(); return; }
  if (action === 'matrix-open-day') { const date = button.dataset.date || getTimetableAnchor(); setTimetableMode('日视图'); setTimetableAnchor(date); showToast(`已下钻到 ${date} 的 15 分钟刻度视图。`); return; }
  if (action === 'matrix-keyboard-create') { const anchor = getTimetableAnchor(); openSchedulePlanner({ mode: 'create', firstLessonDate: anchor, weekday: weekdayLabelOf(anchor) }); return; }
  if (action === 'matrix-touch-create') { if (!matrixTouchSelection) return; const touchState = matrixTouchSelection; const touchTime = matrixTimeRange(touchState); matrixTouchSelection = null; updateMatrixTouchHint(); openSchedulePlanner({ weekday: touchState.weekday, date: touchState.date, start: touchTime.start, lessonDuration: touchTime.duration, roomId: touchState.roomId, campus: touchState.campus, firstLessonDate: touchState.date }); return; }
  if (action === 'matrix-touch-clear') { matrixTouchSelection = null; paintMatrixSelection(document.querySelector('[data-matrix-grid]')); updateMatrixTouchHint(); return; }
  if (action === 'session-view') { const rowElement = button.closest('tr[data-row-id]'); const session = rowElement ? academicData.find((item) => item.id === rowElement.dataset.rowId) : null; if (session) openTimetableSessionDialog(session); return; }
  if (action === 'matrix-session-view') { const session = allTimetableSessions().find((s) => s.id === button.dataset.sessionId); if (session) openTimetableSessionDialog(session); return; }
  if (action === 'timetable-mode') { setTimetableMode(button.dataset.mode); showToast(`已切换至${button.dataset.mode}。`); return; }
  if (['timetable-prev', 'timetable-next'].includes(action)) {
    const win = timetableWindow();
    const mode = win.mode;
    const anchor = mode === '日视图' ? shiftDate(win.anchor, action === 'timetable-prev' ? -1 : 1) : mode === '月视图' ? shiftMonth(win.anchor, action === 'timetable-prev' ? -1 : 1) : shiftDate(win.anchor, action === 'timetable-prev' ? -7 : 7);
    setTimetableAnchor(anchor);
    return;
  }
  if (action === 'timetable-today') { setTimetableAnchor(DEMO_TODAY); return; }

  if (action === 'graduation-batch') { const classRow = currentClassFromDialog(button); if (!classRow) return; const selected = [...button.closest('dialog').querySelectorAll('[data-learner-select]:checked')]; if (!selected.length) { showToast('请先选择系统判定为建议结业的学员。', 'warning'); return; } openDialog('确认学员结业', '二次确认后仅更新选中学员，不改变班级整体结业状态。', `<p>确认将 ${selected.length} 名学员标记为“已通过”？系统将为每名学员生成学习报告和证书产物。</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-academic-action="graduation-batch-confirm">确认结业</button>'); document.querySelector('[data-academic-dialog]').dataset.classId = classRow.id; document.querySelector('[data-academic-dialog]').dataset.selectedIds = selected.map((item) => item.dataset.learnerSelect).join(','); return; }
  if (action === 'graduation-batch-confirm') { const dialog = button.closest('dialog'); const classRow = graduation.find((item) => item.id === dialog.dataset.classId); const ids = (dialog.dataset.selectedIds || '').split(','); classRow.learners.forEach((learner) => { if (ids.includes(learner.id)) learner.status = '已通过'; }); closeDialog(); document.querySelector('[data-academic-dialog]')?.remove(); renderGraduation(); showToast('选中学员已确认结业，报告和证书进入生成队列。'); return; }
  const rowElement = button.closest('tr[data-row-id]'); const row = rowElement ? academicData.find((item) => item.id === rowElement.dataset.rowId) : null;
  if (action.startsWith('learner-')) { const classRow = currentClassFromDialog(button); const learnerId = button.closest('tr')?.dataset.learnerId; const learner = classRow?.learners.find((item) => item.id === learnerId); if (!learner) return; if (action === 'learner-retake') return openSimpleForm('退回补课', '此操作只更新当前学员，不影响同班其他已通过学员。', field('补课说明', 'reason', 'text', '请输入未达标原因', true) + field('补课课次', 'session', 'text', '如 第17次补课'), (form) => { learner.status = '补课中'; learner.comment = `${learner.comment} 补课安排：${form.get('session') || '待排课'}。`; closeDialog(); showToast('已登记补课安排，等待教师完成补课教学记录。'); }); if (action === 'learner-makeup') return openSimpleForm('登记补课课次', '教师完成补课教学记录后，学员可重新提交结业材料。', field('补课日期', 'date', 'date') + field('补课课次', 'session', 'text', '如 第17次补课') + field('安排说明', 'note', 'text', '填写教务安排', true), (form) => { learner.status = '补课中'; closeDialog(); showToast('补课课次已登记，已同步教师端。'); }); if (action === 'learner-resubmit') { learner.status = '待复核'; closeDialog(); showToast('补课教学记录已提交，学员重新进入待复核列表。'); return; } }
  if (!row && ['campus-create', 'building-create', 'venue-create', 'venue-import', 'message-create', 'graduation-export', 'report-export', 'attendance-export', 'homework-export'].includes(action)) return handleAction(action);
  handleAction(action, row);
});

if (academicPage === 'venues') renderVenues();
if (academicPage === 'timetable') renderTimetable();
if (academicPage === 'attendance') renderAttendance();
if (academicPage === 'homework') renderHomework();
if (academicPage === 'messages') renderMessages();
if (academicPage === 'graduation') renderGraduation();
if (academicPage === 'reports') renderReports();
