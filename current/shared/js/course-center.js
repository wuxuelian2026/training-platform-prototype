import { relativePath } from './paths.js';
import { demoId, demoTime, readDemoState, removeDemoRecord, updateDemoRecord, upsertDemoRecord } from './demo-store.js';
import { applicationSeed, courseIdForApplication, courseMockSeed, teacherAccounts, toCanonicalCourseId } from './course-seed.js';
import { courseArchiveKey, courseEditLock, courseEditLockLabel } from './course-version.js';
import { courseAgesText, courseArchiveFor, persistCourseTeaching } from './course-display.js';
import { courseArchiveSeed } from './course-display.js';
import { TEACHER_FACTS } from './teacher-facts.js';
import { machinesForPage, stateLabelsOf } from '../../spec/states/index.js';
import { readAdminSession } from './admin-auth.js';
import { permissionsOfRole } from './permissions.js';

const courseRoot = document.querySelector('[data-course-page]');

const professionalTree = {
  '音乐类': { '声乐': ['声乐演唱', '童声合唱'], '器乐': ['钢琴', '古筝'] },
  '舞蹈类': { '舞蹈表演': ['中国舞', '芭蕾舞'], '舞蹈编导': ['舞蹈编导'] },
  '美术类': { '绘画': ['中国画', '少儿绘画'], '设计': ['视觉传达设计'] },
  '戏剧类': { '表演': ['戏剧表演', '朗诵与主持'] }
};

const applications = applicationSeed();

const contentCourses = [
  { id: 'COURSE-001', name: '舞蹈基本功', type: '面授课程', major: '中国舞', teacher: '王玥', hours: 16, status: '编排中', updatedAt: '2026-09-08 10:06', chapters: [{ name: '第一章：身体基础', desc: '站姿、脚位与身体控制。', lessons: [{ name: '站姿与脚位', target: '掌握基本站姿与一位脚', duration: 45, kind: '示范', description: '完成站姿、脚位和重心练习。', resources: [] }, { name: '身体协调训练', target: '完成基础协调组合', duration: 45, kind: '练习', description: '通过组合练习建立身体协调性。', resources: ['res-002'] }] }, { name: '第二章：节奏训练', desc: '节拍感与动作连接。', lessons: [{ name: '节奏模仿', target: '能跟随八拍节奏完成动作', duration: 45, kind: '练习', description: '完成节奏模仿和动作连接。', resources: [] }] }] },
  { id: 'COURSE-002', name: '声乐演唱技巧', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 12, status: '已完成', updatedAt: '2026-08-26 17:20', chapters: [{ name: '第一章：演唱基础', desc: '气息和发声基础。', lessons: [{ name: '气息支持', target: '理解并完成腹式呼吸练习', duration: 36, kind: '理论', description: '建立气息支撑的基本概念。', resources: ['res-001'] }, { name: '共鸣位置', target: '找到自然共鸣位置', duration: 42, kind: '示范', description: '通过示范建立共鸣感受。', resources: ['res-003'] }] }, { name: '第二章：作品处理', desc: '作品分析与表达。', lessons: [{ name: '咬字与吐字', target: '完成作品咬字练习', duration: 40, kind: '练习', description: '围绕歌词完成清晰咬字。', resources: ['res-004'] }] }] },
  { id: 'COURSE-003', name: '少儿国画入门', type: '面授课程', major: '中国画', teacher: '李青', hours: 20, status: '待编排', updatedAt: '2026-09-06 11:30', chapters: [] },
  { id: 'COURSE-004', name: '古筝基础与乐曲赏析', type: '视频课程', major: '古筝', teacher: '周宁', hours: 10, status: '待编排', updatedAt: '2026-09-05 16:10', chapters: [] },
  { id: 'COURSE-005', name: '戏剧表演基础', type: '面授课程', major: '戏剧表演', teacher: '赵可', hours: 16, status: '编排中', updatedAt: '2026-09-03 10:45', chapters: [{ name: '第一章：舞台表达', desc: '台词和形体训练。', lessons: [{ name: '台词气息', target: '完成台词气息控制', duration: 45, kind: '综合', description: '结合文本完成舞台表达。', resources: [] }] }] },
  ...courseMockSeed()
];

const resources = [
  { id: 'res-001', name: '第1章·气息支持.mp4', type: '教学视频', major: '声乐演唱', level: '初级', size: '286MB', teacher: '陈晨', uploadedAt: '2026-08-26 17:10', references: 3, ext: 'video' },
  { id: 'res-002', name: '舞蹈基本功教学大纲.pdf', type: '乐谱PDF', major: '中国舞', level: '启蒙', size: '4.2MB', teacher: '王玥', uploadedAt: '2026-09-08 09:42', references: 1, ext: 'document' },
  { id: 'res-003', name: '共鸣位置示范.mp4', type: '教学视频', major: '声乐演唱', level: '中级', size: '198MB', teacher: '陈晨', uploadedAt: '2026-08-25 14:26', references: 2, ext: 'video' },
  { id: 'res-004', name: '咬字练习示范.mp3', type: '音频示范', major: '声乐演唱', level: '初级', size: '18.6MB', teacher: '陈晨', uploadedAt: '2026-08-24 11:06', references: 1, ext: 'audio' },
  { id: 'res-005', name: '少儿国画工具清单.pptx', type: '课件PPT', major: '中国画', level: '启蒙', size: '6.8MB', teacher: '李青', uploadedAt: '2026-09-06 11:12', references: 0, ext: 'document' },
  { id: 'res-006', name: '芭蕾基础动作参考.jpg', type: '其他', major: '芭蕾舞', level: '中级', size: '2.1MB', teacher: '王玥', uploadedAt: '2026-08-28 13:50', references: 0, ext: 'image' }
];

// CR-2026-012：课程档案（教学属性）与售卖单元展示素材的读写入口统一在 shared/js/course-display.js。
const library = courseArchiveSeed();
// 课程大纲以课程主体的章节与课时为准；旧数据未迁移时兼容读取档案内结构。
const courseChaptersOf = (record) => contentCourses.find((item) => item.id === courseArchiveKey(record))?.chapters || record?.chapters || [];
// CR-2026-051 §4.1：总课时允许在编排完成前为空，统一渲染为「—」，不用固定值兜底。
const hoursText = (value, arranged = true) => (arranged && value ? `${value} 课时` : '—');
// CR-2026-051 §4.4：申报列表的编排状态列由课程主体派生；申报未通过或无课程主体时显示「—」。
const arrangeStatusText = (item) => {
  if (!item || item.status !== '已通过') return '—';
  const courseId = item.courseId || courseIdForApplication(item.id);
  const course = (readDemoState().courses || []).find(record => record.id === courseId);
  if (!course) return '—';
  if (course.status === '已完成') return '已完成编排';
  if (course.status === '编排中') return '编排中';
  return '待编排';
};

// 大纲只读视图：当前版本详情与历史版本详情共用同一份渲染，避免两处结构漂移。
function courseOutlineView(chapters, emptyHint = '尚未维护章节与课时。') {
  const list = Array.isArray(chapters) ? chapters : [];
  if (!list.length) return `<div class="course-empty"><strong>暂无课程大纲</strong><span>${escapeHtml(emptyHint)}</span></div>`;
  return `<div class="course-outline-readonly">${list.map((chapter, chapterIndex) => `<section class="course-detail-section wide"><h3>第 ${chapterIndex + 1} 章 · ${escapeHtml(chapter.name)}</h3><p class="course-hint">${escapeHtml(chapter.desc || '暂无章节描述')}</p><div class="lesson-list">${(chapter.lessons || []).map((lesson, lessonIndex) => `<article class="lesson-item"><div class="lesson-item-head"><div><h4>第 ${lessonIndex + 1} 课时 · ${escapeHtml(lesson.name)}</h4><p>${escapeHtml(lesson.target || '未填写教学目标')}</p></div></div><div class="lesson-meta"><span>${escapeHtml(String(lesson.duration ?? '—'))} 分钟</span><span>${escapeHtml(lesson.kind || '—')}</span><span>${escapeHtml(lesson.description || '暂无内容描述')}</span></div><div class="lesson-resource"><span>${(lesson.resources || []).length ? lesson.resources.map(resourceId => resources.find(resource => resource.id === resourceId)?.name).filter(Boolean).map(escapeHtml).join('、') : '未关联资源'}</span></div></article>`).join('') || '<div class="course-empty"><strong>暂无课时</strong></div>'}</div></section>`).join('')}</div>`;
}

const catalog = {
  groupStatus: { '音乐类': '启用', '舞蹈类': '启用', '美术类': '停用', '戏剧类': '启用' },
  categories: [
    { id: 'cat-1', name: '声乐', parent: '音乐类', sort: 1, status: '启用' },
    { id: 'cat-2', name: '器乐', parent: '音乐类', sort: 2, status: '启用' },
    { id: 'cat-3', name: '舞蹈表演', parent: '舞蹈类', sort: 1, status: '启用' },
    { id: 'cat-4', name: '绘画', parent: '美术类', sort: 1, status: '启用' },
    { id: 'cat-5', name: '表演', parent: '戏剧类', sort: 1, status: '启用' }
  ],
  majors: [
    { id: 'major-1', name: '声乐演唱', parent: '声乐', group: '音乐类', sort: 1, status: '启用', teachers: 6, courses: 8, resources: 12 },
    { id: 'major-2', name: '童声合唱', parent: '声乐', group: '音乐类', sort: 2, status: '启用', teachers: 2, courses: 3, resources: 4 },
    { id: 'major-3', name: '钢琴', parent: '器乐', group: '音乐类', sort: 1, status: '启用', teachers: 5, courses: 5, resources: 8 },
    { id: 'major-4', name: '古筝', parent: '器乐', group: '音乐类', sort: 2, status: '启用', teachers: 3, courses: 4, resources: 5 },
    { id: 'major-5', name: '中国舞', parent: '舞蹈表演', group: '舞蹈类', sort: 1, status: '启用', teachers: 8, courses: 10, resources: 16 },
    { id: 'major-6', name: '芭蕾舞', parent: '舞蹈表演', group: '舞蹈类', sort: 2, status: '启用', teachers: 4, courses: 4, resources: 6 },
    { id: 'major-7', name: '中国画', parent: '绘画', group: '美术类', sort: 1, status: '启用', teachers: 4, courses: 5, resources: 9 },
    { id: 'major-8', name: '少儿绘画', parent: '绘画', group: '美术类', sort: 2, status: '启用', teachers: 2, courses: 2, resources: 3 },
    { id: 'major-9', name: '戏剧表演', parent: '表演', group: '戏剧类', sort: 1, status: '启用', teachers: 3, courses: 4, resources: 5 },
    { id: 'major-10', name: '朗诵与主持', parent: '表演', group: '戏剧类', sort: 2, status: '启用', teachers: 2, courses: 3, resources: 2 }
  ]
};

// I1-DEC-19: seed courses adopt the application-derived course id, and the course library keeps
// its sourceCourseId bound to that same id so both ends share one primary key.
contentCourses.forEach(course => {
  const application = applications.find(item => item.name === course.name && !course.applicationId);
  if (application) {
    const previousId = course.id;
    course.applicationId = application.id;
    course.id = application.courseId || courseIdForApplication(application.id);
    library.forEach(record => { if (record.sourceCourseId === previousId) record.sourceCourseId = course.id; });
  }
  // I1-DEC-22 seed hygiene: a video course lesson must reference a teaching video.
  if (course.type !== '视频课程') return;
  course.chapters.flatMap(chapter => chapter.lessons).forEach(lesson => {
    const hasVideo = lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频');
    if (hasVideo) return;
    const fallback = resources.find(resource => resource.type === '教学视频' && resource.major === course.major) || resources.find(resource => resource.type === '教学视频');
    if (fallback) lesson.resources = [...lesson.resources, fallback.id];
  });
});

const sharedDemo = readDemoState();
const appendShared = (target, records) => (records || []).filter(record => !target.some(item => item.id === record.id)).forEach(record => target.push(record));
// CR-2026-012：课程档案按记录编号合并，存储记录覆盖种子基线，保证展示信息与教学属性的修改在重新进入时仍然生效。
const mergeSharedRecords = (target, records) => (records || []).forEach(record => { const index = target.findIndex(item => item.id === record.id); if (index < 0) target.push(record); else target[index] = { ...target[index], ...record }; });
// 兼容旧版本地数据，避免缺少章节／课时／资源数组时中断编排抽屉渲染。
const normalizeCourseOutline = (course) => {
  course.chapters = Array.isArray(course.chapters) ? course.chapters : [];
  course.chapters = course.chapters.map((chapter) => {
    const normalizedChapter = chapter && typeof chapter === 'object' ? chapter : {};
    const lessons = Array.isArray(normalizedChapter.lessons) ? normalizedChapter.lessons : [];
    normalizedChapter.lessons = lessons.map((lesson) => {
      const normalizedLesson = lesson && typeof lesson === 'object' ? lesson : {};
      normalizedLesson.resources = Array.isArray(normalizedLesson.resources) ? normalizedLesson.resources : [];
      return normalizedLesson;
    });
    return normalizedChapter;
  });
  return course;
};
// CR-2026-033：申报记录按编号合并存储值，审批结果刷新后必须仍然生效（此前只做追加，存储里的新状态被种子覆盖）。
mergeSharedRecords(applications, sharedDemo.applications);
for (let index = applications.length - 1; index >= 0; index -= 1) {
  if (applications[index].status === '草稿') applications.splice(index, 1);
}
// 编排草稿以本地存储为准，否则刷新后同 ID 种子课程会遮蔽已保存的章节与课时。
mergeSharedRecords(contentCourses, sharedDemo.courses);
appendShared(resources, sharedDemo.resources);
mergeSharedRecords(library, sharedDemo.library);
// CR-2026-041：取消“完整／轻量”业务分类，课程只按来源追溯，并统一进入编排三态。
contentCourses.forEach((course) => { course.source ||= course.applicationId ? '教师申报' : '后台新增'; });
library.forEach((record) => {
  // 旧存储记录仍带 archive 字段，仅用于一次性推断课程来源；新数据不再写入该字段，页面也不展示分类。
  record.source ||= record.archive === '轻量课程档案' ? '后台新增' : '教师申报';
  const courseId = courseArchiveKey(record);
  if (contentCourses.some((course) => course.id === courseId)) return;
  contentCourses.push({ id: courseId, source: record.source, name: record.name, type: record.type, major: record.major, teacher: record.teacher, hours: record.hours, status: record.status || '已完成', updatedAt: record.updatedAt || demoTime(), chapters: JSON.parse(JSON.stringify(record.chapters || [])), difficulty: record.difficulty || '', ages: [...(record.ages || [])] });
});
contentCourses.forEach(normalizeCourseOutline);
syncResourceReferences();
function applicationCourseId(item) {
  return !item.courseId || item.courseId === 'COURSE-NEW' ? courseIdForApplication(item.id) : item.courseId;
}
function persistApplication(item) { upsertDemoRecord('applications', { ...item, courseId: applicationCourseId(item) }); }
function persistCourse(item) { upsertDemoRecord('courses', item); syncResourceReferences(); }
// I1-C-11: resource "引用次数" is derived from real lesson references (distinct courses) instead of
// static seed values, so the resource list stays in step with course arrangement.
function syncResourceReferences() {
  const usage = new Map();
  contentCourses.forEach(course => (course.chapters || []).forEach(chapter => (chapter.lessons || []).forEach(lesson => (lesson.resources || []).forEach(resourceId => {
    if (!usage.has(resourceId)) usage.set(resourceId, new Set());
    usage.get(resourceId).add(course.id);
  }))));
  resources.forEach(resource => {
    const next = usage.get(resource.id)?.size || 0;
    if (Number(resource.references || 0) === next) return;
    resource.references = next;
    persistResource(resource);
  });
}
function persistLibrary(item) { upsertDemoRecord('library', item); }
function persistResource(item) { upsertDemoRecord('resources', item); }
function courseFromApplication(item) {
  // CR-2026-012 / CR-2026-014：申报阶段维护的教学属性随课程主体带入，编排页默认读取这里。
  return { id: applicationCourseId(item), applicationId: item.id, source: '教师申报', name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: 0, plannedHours: Number(item.hours) || 0, status: '待编排', updatedAt: demoTime(), chapters: [], difficulty: item.difficulty || '', ages: Array.isArray(item.ages) ? [...item.ages] : [] };
}
function syncLibraryCourse(item) {
  const existing = library.find(record => record.sourceCourseId === item.id);
  const record = existing || { id: `LIB-${item.id}`, sourceCourseId: item.id, source: item.source || '教师申报', archive: '完整课程', name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: item.hours, status: '已完成', difficulty: '', ages: [] };
  // 教学属性来自申报；只有档案里还没有值时，才用课程主体带的申报值补齐，不覆盖编排阶段的修改。
  Object.assign(record, { sourceCourseId: item.id, source: item.source || record.source || '教师申报', name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: item.hours, status: '已完成', difficulty: record.difficulty || item.difficulty || '', ages: (record.ages && record.ages.length ? record.ages : item.ages) || [] });
  if (!existing) library.unshift(record);
  persistLibrary(record);
}

const state = { page: courseRoot?.dataset.coursePage || '', applicationTab: '', libraryTab: new URLSearchParams(location.search).get('tab') === 'all' ? 'all' : 'arrange', applicationFilters: {}, contentFilters: {}, resourceFilters: {}, libraryFilters: {}, selectedGroup: '音乐类', selectedCategory: '声乐', pageSize: 20, modals: [], reviewResult: null };

// 申报状态页签：取值只读 spec/states 的 SM-COURSE-APPLICATION，「全部」是不加状态过滤的默认项。
const applicationStatusTabs = () => {
  const machine = machinesForPage('courses/applications').find((item) => item.id === 'SM-COURSE-APPLICATION');
  return [
    { value: '', label: '全部' },
    ...(machine ? stateLabelsOf(machine).map((label) => ({ value: label, label })) : [])
  ];
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const root = () => document.querySelector('#course-root');
const option = (value, selected = false) => `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(value)}</option>`;
const statusClass = status => ({ '待审核': 'brand', '已通过': 'green', '已驳回': 'red', '已撤销': 'gray', '待编排': 'gray', '编排中': 'amber', '已完成': 'green', '启用': 'green', '停用': 'gray' }[status] || 'brand');
const tag = status => `<span class="tag ${statusClass(status)}">${escapeHtml(status)}</span>`;
const majorOptions = () => catalog.majors.map(item => option(item.name)).join('');
const groupOptions = () => Object.keys(professionalTree).map(option).join('');
const typeOptions = () => ['视频课程', '面授课程'].map(option).join('');
const showToast = (message, kind = 'success') => {
  document.querySelectorAll('.course-toast').forEach(item => item.remove());
  const toast = document.createElement('div');
  toast.className = `toast course-toast${kind === 'error' ? ' course-toast-error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
};
const modal = (title, subtitle, content, options = {}) => {
  const dialog = document.createElement('dialog');
  dialog.className = `course-modal${options.large ? ' large' : ''}`;
  dialog.innerHTML = `<div class="course-modal-card"><div class="course-modal-header"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><button class="course-modal-close" type="button" aria-label="关闭">×</button></div><div class="course-modal-body">${content}</div></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('.course-modal-close').addEventListener('click', () => closeModal(dialog));
  dialog.addEventListener('click', event => { if (event.target === dialog) closeModal(dialog); });
  // CR-2026-050 §5.4：弹窗改为栈结构，关闭时按标识出栈；不再依赖异步 close 事件恢复父层引用，
  // 因此父层弹窗不会因执行过子表单而失去引用、也就能被自己的 × 与背板关闭。
  dialog.addEventListener('close', () => { dialog.remove(); state.modals = state.modals.filter((entry) => entry !== dialog); });
  dialog.showModal();
  state.modals.push(dialog);
  return dialog;
};
const currentModal = () => state.modals[state.modals.length - 1] || null;
// closeModal() 关闭最上层；closeModal(target) 关闭指定层，关闭后当前层回退为栈中的上一层。
const closeModal = (target) => {
  const dialog = target && state.modals.includes(target) ? target : currentModal();
  if (!dialog) return;
  state.modals = state.modals.filter((entry) => entry !== dialog);
  if (dialog.open) dialog.close(); else dialog.remove();
};
// CR-2026-050 §5.3：确认类弹窗站内化，允许叠在上一层之上，但只在同一次操作叠加一层。
let pendingConfirm = null;
function confirmAction({ title, message, confirmLabel = '确认', cancelLabel = '取消', tone = 'danger', detail = '', onConfirm }) {
  pendingConfirm = typeof onConfirm === 'function' ? onConfirm : null;
  const confirmTone = tone === 'danger' ? 'danger-button' : 'primary';
  modal(title, '', `<section class="course-detail-section wide"><p class="course-hint">${escapeHtml(message)}</p>${detail ? `<p class="sub-cell">${escapeHtml(detail)}</p>` : ''}</section><div class="course-modal-actions"><button type="button" class="button" data-action="close-modal">${escapeHtml(cancelLabel)}</button><button type="button" class="button ${confirmTone}" data-confirm-action="run">${escapeHtml(confirmLabel)}</button></div>`);
}
const button = (label, action, attrs = '', className = '') => `<button type="button" class="text-button ${className}" data-action="${action}" ${attrs}>${escapeHtml(label)}</button>`;
// CR-2026-049 §4.4：申报审批页抬头需要状态与「只读」标签，description/titleTag 允许传已转义的富文本。
const pageShell = (title, description, actions = '', options = {}) => {
  const toolbar = title === '课程内容编排'
    ? `${actions}<button class="button primary" type="button" data-action="new-direct-course">新增面授课程</button>`
    : title === '课程库' ? '' : actions;
  const titleMarkup = options.rawTitle ? title : escapeHtml(title);
  const descriptionMarkup = description ? (options.rawDescription ? description : escapeHtml(description)) : '';
  return `<div class="page-head"><div><h1>${titleMarkup}</h1>${descriptionMarkup ? `<p>${descriptionMarkup}</p>` : ''}</div><div class="toolbar-actions">${toolbar}</div></div>`;
};
const filterField = (label, input) => `<div class="course-field"><label>${escapeHtml(label)}</label>${input}</div>`;
const select = (name, values, selected = '', allLabel = '全部') => `<select name="${name}">${allLabel ? option('', selected === '') .replace('</option>', `>${allLabel}</option>`) : ''}${values.map(value => option(value, selected === value)).join('')}</select>`;
const selectWithValues = (name, values, selected = '', allLabel = '全部') => `<select name="${name}">${allLabel ? `<option value="">${allLabel}</option>` : ''}${values.map(value => option(value, selected === value)).join('')}</select>`;
// CR-2026-034 §2.3.4：停用专业不再出现在新的申报与筛选项；已选中的停用专业保留，
// 否则编辑既有课程时当前值会从下拉里消失。
const professionalFilter = (name, selected = '') => `<select name="${name}"><option value="">全部专业</option>${catalog.majors.filter(item => item.status === '启用' || item.name === selected).map(item => option(item.name, item.name === selected)).join('')}</select>`;
const pagination = (count, label = '条记录') => `<div class="course-pagination"><span>共 ${count} ${label}</span><div class="course-pagination-controls"><label for="page-size">每页</label><select id="page-size" data-action="page-size"><option value="10"${state.pageSize === 10 ? ' selected' : ''}>10条</option><option value="20"${state.pageSize === 20 ? ' selected' : ''}>20条</option><option value="50"${state.pageSize === 50 ? ' selected' : ''}>50条</option></select><button class="button" type="button" disabled>上一页</button><button class="button" type="button" disabled>下一页</button></div></div>`;

function init() {
  if (!courseRoot) return;
  renderPage();
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('submit', handleSubmit);
  window.addEventListener('popstate', () => {
    state.libraryTab = new URLSearchParams(location.search).get('tab') === 'all' ? 'all' : 'arrange';
    if (state.page === 'library') renderLibrary(root());
  });
}

function renderPage() {
  const page = root();
  if (!page) return;
  if (state.page === 'applications') renderApplications(page);
  if (state.page === 'review') renderApplicationReview(page);
  if (state.page === 'content') renderContent(page);
  if (state.page === 'resources') renderResources(page);
  if (state.page === 'library') renderLibrary(page);
  if (state.page === 'catalog') renderCatalog(page);
}

function renderApplications(page) {
  const tabs = applicationStatusTabs();
  // CR-2026-033：返回列表时保留页签与筛选条件（页签与筛选写入 URL）。
  const query = new URLSearchParams(location.search);
  // 状态由顶部页签唯一控制；兼容清理旧链接中的 status 参数，避免产生不可见筛选。
  if (query.has('status')) {
    query.delete('status');
    const cleanUrl = `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`;
    history.replaceState(null, '', cleanUrl);
  }
  delete state.applicationFilters.status;
  const tabFromUrl = query.get('tab') || '';
  if (tabs.some((tab) => tab.value === tabFromUrl)) state.applicationTab = tabFromUrl;
  ['teacher', 'major', 'keyword'].forEach((key) => { if (query.get(key) !== null) state.applicationFilters[key] = query.get(key) || ''; });
  const activeTab = tabs.some((tab) => tab.value === state.applicationTab) ? state.applicationTab : '';
  const tabRecords = activeTab ? applications.filter(item => item.status === activeTab) : applications;
  const filtered = tabRecords.filter(item => !state.applicationFilters.teacher || item.teacher.includes(state.applicationFilters.teacher)).filter(item => !state.applicationFilters.major || item.major === state.applicationFilters.major).filter(item => !state.applicationFilters.keyword || `${item.name}${item.id}`.includes(state.applicationFilters.keyword))
    // CR-2026-033 §2.5：待审核按申报时间升序（FIFO），其余页签按业务时间倒序，且显式排序不依赖数据源顺序。
    .sort((a, b) => activeTab === '待审核' ? String(a.submittedAt || a.date || '').localeCompare(String(b.submittedAt || b.date || '')) : String(b.submittedAt || b.date || '').localeCompare(String(a.submittedAt || a.date || '')));
  page.innerHTML = `<div class="course-page">${pageShell('课程申报', '', '<button class="button" type="button" data-action="export-applications">导出列表</button>')}<section class="course-surface"><div class="course-tabs">${tabs.map(tab => `<button type="button" class="course-tab${activeTab === tab.value ? ' active' : ''}" data-action="application-tab" data-value="${tab.value}">${tab.label} <small>(${applications.filter(item => !tab.value || item.status === tab.value).length})</small></button>`).join('')}</div><form class="course-filter" data-form="application-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('申报教师', `<input name="teacher" value="${escapeHtml(state.applicationFilters.teacher || '')}" placeholder="输入教师姓名" />`)}${filterField('所属专业', professionalFilter('major', state.applicationFilters.major))}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.applicationFilters.keyword || '')}" placeholder="课程名称或申报编号" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>申报列表</strong><span> 当前显示 ${filtered.length} 条</span></div><div class="course-legend"><span class="course-legend-item">待教研审核</span><span class="course-legend-item success">可进入编排</span><span class="course-legend-item warning">需修改</span><span class="course-legend-item gray">已撤销</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>申报编号</th><th>课程名称</th><th>课程类型</th><th>申报教师</th><th>所属专业</th><th>难度等级</th><th>总课时</th><th>申报时间</th><th>申报状态</th><th>编排状态</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td>${item.id}</td><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${escapeHtml(item.intro.slice(0, 28))}…</span></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.difficulty || '—')}</td><td>${hoursText(item.hours)}</td><td>${escapeHtml(item.submittedAt)}</td><td>${tag(item.status)}</td><td>${arrangeStatusText(item)}</td><td><div class="course-actions">${applicationEntryButton(item)}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无申报数据</strong><span>调整筛选条件后重试，或等待教师提交新的课程申报。</span></div>'}</div>${pagination(filtered.length)}</section></div>`;
}

function renderContent(page) {
  const filtered = contentCourses.filter(item => item.status !== '已完成').filter(item => !state.contentFilters.status || item.status === state.contentFilters.status).filter(item => !state.contentFilters.type || item.type === state.contentFilters.type).filter(item => !state.contentFilters.major || item.major === state.contentFilters.major).filter(item => !state.contentFilters.keyword || `${item.name}${item.teacher}`.includes(state.contentFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('课程内容编排', '', '<button class="button" type="button" data-action="refresh-content">刷新列表</button>')}<section class="course-surface"><form class="course-filter" data-form="content-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('编排状态', selectWithValues('status', ['待编排', '编排中'], state.contentFilters.status || '', '全部状态'))}${filterField('课程类型', selectWithValues('type', ['视频课程', '面授课程'], state.contentFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.contentFilters.major))}${filterField('申报教师', `<input name="keyword" value="${escapeHtml(state.contentFilters.keyword || '')}" placeholder="课程名称或教师姓名" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>待编排课程</strong><span> 共 ${filtered.length} 条，按最近编辑时间排序</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>课程名称</th><th>课程来源</th><th>课程类型</th><th>所属专业</th><th>申报教师</th><th>总课时</th><th>编排状态</th><th>上次编辑时间</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${item.id}</span></td><td>${escapeHtml(item.source || (item.applicationId ? '教师申报' : '后台新增'))}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.teacher)}</td><td>${hoursText(item.hours, item.status === '已完成')}</td><td>${tag(item.status)}</td><td>${escapeHtml(item.updatedAt)}</td><td><div class="course-actions">${button(item.status === '待编排' ? '开始编排' : '继续编排', 'content-workbench', `data-id="${item.id}"`)}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无待编排课程</strong><span>教师申报通过或后台新增的面授课程会进入此处。</span></div>'}</div>${pagination(filtered.length, '门课程')}</section></div>`;
  const queryId = new URLSearchParams(window.location.search).get('courseId');
  if (queryId && !currentModal()) openWorkbench(queryId);
}

function renderResources(page) {
  // CR-2026-034 §2.3.2：专业引用清单可深链定位到对应资源。
  const resourceQuery = new URLSearchParams(location.search).get('keyword');
  if (resourceQuery !== null) state.resourceFilters.keyword = resourceQuery;
  const filtered = resources.filter(item => !state.resourceFilters.type || item.type === state.resourceFilters.type).filter(item => !state.resourceFilters.major || item.major === state.resourceFilters.major).filter(item => !state.resourceFilters.teacher || item.teacher.includes(state.resourceFilters.teacher)).filter(item => !state.resourceFilters.keyword || item.name.includes(state.resourceFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('教学资源库', '', '<button class="button primary" type="button" data-action="upload-resource">上传资源</button>')}<section class="course-surface"><form class="course-filter" data-form="resource-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('资源类型', selectWithValues('type', ['教学视频', '课件PPT', '乐谱PDF', '音频示范', '其他'], state.resourceFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.resourceFilters.major))}${filterField('上传教师', `<input name="teacher" value="${escapeHtml(state.resourceFilters.teacher || '')}" placeholder="输入教师姓名" />`)}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.resourceFilters.keyword || '')}" placeholder="资源名称" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>资源列表</strong><span> 当前显示 ${filtered.length} 条</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>资源名称</th><th>资源类型</th><th>所属专业</th><th>适用等级</th><th>文件大小</th><th>上传教师</th><th>上传时间</th><th>引用次数</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${item.references ? `已被 ${item.references} 门课程引用` : '暂未被课程引用'}</span></td><td>${tag(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.level)}</td><td>${escapeHtml(item.size)}</td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.uploadedAt)}</td><td>${item.references}</td><td><div class="course-actions">${button('预览', 'resource-preview', `data-id="${item.id}"`)}${button('编辑', 'resource-edit', `data-id="${item.id}"`)}${button('删除', 'resource-delete', `data-id="${item.id}"`, 'danger-link')}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无资源</strong><span>上传教学视频、课件或附件，供课程编排引用。</span></div>'}</div>${pagination(filtered.length, '个资源')}</section></div>`;
}

function applyArchiveChange(record, patch, chapters = null) {
  Object.assign(record, patch);
  if (chapters) record.chapters = chapters;
  // 全部课程的基本信息与大纲均回写课程主体，避免查看与编辑两套数据。
  const course = contentCourses.find((item) => item.id === courseArchiveKey(record));
  if (course) {
    Object.assign(course, { name: record.name, type: record.type, major: record.major, teacher: record.teacher, hours: record.hours, difficulty: record.difficulty, ages: [...record.ages], chapters: chapters || course.chapters, updatedAt: demoTime() });
    persistCourse(course);
    persistCourseTeaching(course, { difficulty: record.difficulty, ages: [...record.ages] });
  }
}
// CR-2026-034 §4.1：停用只拦新的发布动作，不改写已购学习权限、在售商品、已发布班级与历史订单。
function openLibraryDisableDialog(item) {
  modal('停用课程', `${courseArchiveKey(item)} · ${item.name}`, `<form data-form="library-disable" data-id="${escapeHtml(item.id)}"><section class="course-detail-section wide"><p class="course-hint">停用后该课程不再出现在「发布商品」与「发布班级」的课程选择项中。已购学员的学习权限、已在售商品、已发布班级与已排课次、历史订单与计薪均不受影响，也不会自动下架商品或关停班级。</p><div class="course-field wide"><label for="library-disable-reason">停用原因 <span class="sub-cell">必填，≤200 字</span></label><textarea id="library-disable-reason" name="reason" maxlength="200" required placeholder="例如：专业取消、内容过时、建错课程"></textarea><p class="course-error" data-error></p></div></section><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button danger-button" type="submit">确认停用</button></div></form>`, { large: true });
}

// §4.3：只有「后台新增」且无任何引用的课程档案允许物理删除；教师申报课程有来源追溯要求，只能停用。
function deleteLibraryRecord(id) {
  const item = library.find((record) => record.id === id);
  if (!item) return;
  if ((item.source || '教师申报') !== '后台新增') { showToast('教师申报课程有来源追溯要求，只能停用，不能删除', 'error'); return; }
  if (courseEditLock(item).referenced) { showToast('该课程曾被商品、班级或订单引用，只能停用，不能删除', 'error'); return; }
  // CR-2026-050 §5.3：不可逆动作改用站内确认弹窗，确认文案与现状一致。
  confirmAction({
    title: '删除课程',
    message: `删除不可逆：确认删除课程「${item.name}」（${courseArchiveKey(item)}）？`,
    detail: '删除后该课程档案与其在课程库中的条目一并移除，已产生的历史订单与计薪记录不受影响。',
    confirmLabel: '确认删除',
    onConfirm: () => { library.splice(library.indexOf(item), 1); removeDemoRecord('library', item.id); renderLibrary(root()); showToast('课程档案已删除'); }
  });
}

function toggleLibraryEnabled(id) {
  const item = library.find((record) => record.id === id);
  if (!item) return;
  if (!item.disabledAt) { openLibraryDisableDialog(item); return; }
  item.disabledAt = '';
  item.disabledBy = '';
  item.disabledReason = '';
  persistLibrary(item);
  renderLibrary(root());
  showToast(`课程「${item.name}」已启用`);
}

function libraryRow(item) {
  const key = courseArchiveKey(item);
  const usage = courseEditLock(item);
  // CR-2026-034 §4.1：停用是发布准入开关（时间戳为空表示启用），不是课程生命周期状态。
  const disabled = Boolean(item.disabledAt);
  // §4.3：只有「后台新增」来源且从未被售卖单元引用的档案允许物理删除；教师申报课程只能停用。
  const deletable = (item.source || '教师申报') === '后台新增' && !usage.referenced;
  const actions = [
    button('查看', 'library-view', `data-id="${item.id}"`),
    usage.locked
      ? button('复制新建', 'library-copy', `data-id="${item.id}"`)
      : button('编辑', 'library-edit', `data-id="${item.id}"`),
    button(disabled ? '启用' : '停用', 'library-toggle-enabled', `data-id="${item.id}"`, disabled ? '' : 'danger-link'),
    deletable ? button('删除', 'library-delete', `data-id="${item.id}"`, 'danger-link') : '',
    item.type === '视频课程' && item.status === '已完成' && !disabled ? button('发布商品', 'publish-product', `data-id="${item.id}"`) : '',
    item.type === '面授课程' && !disabled ? button('发布班级', 'publish-class', `data-id="${item.id}"`) : '',
  ].join('');
  const statusCell = disabled
    ? `<span class="tag red">已停用</span><span class="sub-cell">${escapeHtml(item.disabledAt)} · ${escapeHtml(item.disabledBy || '—')} · 原因：${escapeHtml(item.disabledReason || '未填写')}</span>`
    : '<span class="tag green">启用</span>';
  const editCell = usage.locked
    ? `<span class="tag ${usage.permanent ? 'red' : 'amber'}">已锁定</span><span class="sub-cell">${escapeHtml(usage.reasons.join('、'))}<br>${escapeHtml(usage.actionHint)}</span>`
    : '<span class="tag green">可编辑</span><span class="sub-cell">尚无订单、正式课表或上架商品</span>';
  return `<tr><td><span class="primary-cell">${escapeHtml(key || '—')}</span></td><td><span class="primary-cell">${escapeHtml(item.name)}</span></td><td>${escapeHtml(item.source || '教师申报')}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.teacher)}</td><td>${hoursText(item.hours)}</td><td>${statusCell}</td><td>${editCell}</td><td><div class="course-actions">${actions}</div></td></tr>`;
}

// CR-2026-081：全部课程显示派生编辑状态，不再展示课程版本与历史版本。
function renderLibraryAllView(page) {
  const completed = library.filter((item) => contentCourses.find((course) => course.id === courseArchiveKey(item))?.status === '已完成' || (!contentCourses.some((course) => course.id === courseArchiveKey(item)) && item.status === '已完成'));
  // CR-2026-034 §4.1.3：启用状态筛选取值 全部／启用／已停用，默认全部。
  const enabledFilter = state.libraryFilters.enabled || '';
  const filtered = completed.filter(item => !state.libraryFilters.source || (item.source || '教师申报') === state.libraryFilters.source).filter(item => !state.libraryFilters.type || item.type === state.libraryFilters.type).filter(item => !state.libraryFilters.major || item.major === state.libraryFilters.major).filter(item => !state.libraryFilters.keyword || `${item.name}${item.teacher}`.includes(state.libraryFilters.keyword)).filter((item) => !enabledFilter || (enabledFilter === '已停用' ? Boolean(item.disabledAt) : !item.disabledAt));
  page.innerHTML = `<div class="course-page">${pageShell('课程库', '', '<button class="button primary" type="button" data-action="new-direct-course">新增面授课程</button>')}<section class="course-surface"><form class="course-filter" data-form="library-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('课程来源', selectWithValues('source', ['教师申报', '后台新增'], state.libraryFilters.source || '', '全部来源'))}${filterField('课程类型', selectWithValues('type', ['视频课程', '面授课程'], state.libraryFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.libraryFilters.major))}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.libraryFilters.keyword || '')}" placeholder="课程名称或教师姓名" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>已完成课程</strong><span> 当前显示 ${filtered.length} 条</span></div><div class="course-legend"><span class="course-legend-item success">未投入业务可直接编辑</span><span class="course-legend-item warning">投入业务后复制新建</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>课程编号</th><th>课程名称</th><th>课程来源</th><th>课程类型</th><th>所属专业</th><th>申报教师</th><th>总课时</th><th>启用状态</th><th>编辑状态</th><th>操作</th></tr></thead><tbody>${filtered.map(libraryRow).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无已完成课程</strong><span>课程完成编排后会进入全部课程。</span></div>'}</div>${pagination(filtered.length, '门课程')}</section></div>`;
}

// CR-2026-021：课程内容编排并入课程库，一个页面两个视图（内容编排 / 全部课程），视图状态进 URL。
// 2026-09-16：页签名由“待编排”改为“内容编排”；“待编排”仅保留为编排状态取值，不再作为页签名。
function libraryTabBar() {
  const tabs = [['arrange', '内容编排', contentCourses.filter(item => item.status !== '已完成').length], ['all', '全部课程', contentCourses.filter(item => item.status === '已完成').length]];
  return `<div class="course-tabs">${tabs.map(([value, label, count]) => `<button type="button" class="course-tab${state.libraryTab === value ? ' active' : ''}" data-action="library-tab" data-value="${value}">${label} <small>(${count})</small></button>`).join('')}</div>`;
}

// CR-2026-034 §4.1.3：全部课程页签增加启用状态筛选与列，默认「全部」。
// 注入到既有筛选表单内，提交与重置沿用统一筛选链路。
function mountLibraryEnabledFilter(pageEl) {
  const grid = pageEl.querySelector('.course-filter-grid');
  if (grid && !grid.querySelector('[name="enabled"]')) {
    grid.insertAdjacentHTML('afterbegin', filterField('启用状态', `<select name="enabled"><option value="">全部状态</option><option${state.libraryFilters.enabled === '启用' ? ' selected' : ''}>启用</option><option${state.libraryFilters.enabled === '已停用' ? ' selected' : ''}>已停用</option></select>`));
  }
}

function renderLibrary(page) {
  const view = state.libraryTab === 'all' ? 'all' : 'arrange';
  const holder = document.createElement('div');
  if (view === 'all') renderLibraryAllView(holder);
  else renderContent(holder);
  const pageEl = holder.querySelector('.course-page');
  if (pageEl) {
    const heading = pageEl.querySelector('.page-head h1');
    if (heading) heading.textContent = '课程库';
    pageEl.querySelector('.page-head')?.insertAdjacentHTML('afterend', libraryTabBar());
    if (view === 'all') mountLibraryEnabledFilter(pageEl);
  }
  page.innerHTML = holder.innerHTML;
  // CR-2026-034 §2.3.2：引用清单里的课程可深链定位到课程库对应课程。
  const deepLinkCourseId = new URLSearchParams(location.search).get('courseId');
  if (view === 'all' && deepLinkCourseId && !currentModal()) {
    const record = library.find((item) => courseArchiveKey(item) === toCanonicalCourseId(deepLinkCourseId));
    if (record) openLibraryView(record.id);
  }
}

// 全部课程的统一查看入口：基本信息／课程大纲两个只读页签。
function openLibraryView(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  const key = courseArchiveKey(item);
  const usage = courseEditLock(item);
  const chapters = courseChaptersOf(item);
  let activeTab = 'basic';
  const dialog = modal('课程详情', `${key} · ${item.name}`, '<div data-course-detail-root></div>', { large: true });
  const holder = dialog.querySelector('[data-course-detail-root]');
  const tabs = () => `<div class="course-tabs"><button type="button" class="course-tab${activeTab === 'basic' ? ' active' : ''}" data-course-detail-tab="basic">基本信息</button><button type="button" class="course-tab${activeTab === 'outline' ? ' active' : ''}" data-course-detail-tab="outline">课程大纲</button></div>`;
  const basic = () => `<section class="course-detail-section wide"><dl class="course-detail-list"><div><dt>课程编号</dt><dd>${escapeHtml(key)}</dd></div><div><dt>课程名称</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(item.type)}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(item.major)}</dd></div><div><dt>申报教师</dt><dd>${escapeHtml(item.teacher)}</dd></div><div><dt>总课时</dt><dd>${hoursText(item.hours)}</dd></div><div><dt>难度等级</dt><dd>${escapeHtml(item.difficulty || '未填写')}</dd></div><div><dt>适合年龄</dt><dd>${escapeHtml(courseAgesText(item) || '未填写')}</dd></div></dl></section>`;
  const outline = () => courseOutlineView(chapters);
  const render = () => {
    const primaryAction = usage.locked
      ? `<button class="button primary" type="button" data-action="library-copy" data-id="${item.id}">复制新建课程</button>`
      : `<button class="button primary" type="button" data-action="library-edit" data-id="${item.id}">编辑</button>`;
    holder.innerHTML = `${tabs()}<div class="course-version-summary"><div><span>课程来源</span><strong>${escapeHtml(item.source || '教师申报')}</strong><small>${escapeHtml(key)}</small></div><div><span>编辑状态</span><strong>${escapeHtml(courseEditLockLabel(usage))}</strong><small>${escapeHtml(usage.actionHint || '基本信息与课程大纲可直接编辑')}</small></div></div>${activeTab === 'basic' ? basic() : outline()}<div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button>${primaryAction}</div>`;
  };
  dialog.addEventListener('click', event => { const tab = event.target.closest('[data-course-detail-tab]')?.dataset.courseDetailTab; if (tab) { activeTab = tab; render(); } });
  render();
}

function openLibraryEdit(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  const usage = courseEditLock(item);
  if (usage.locked) {
    showToast(`${courseEditLockLabel(usage)}；${usage.actionHint}`, 'error');
    return;
  }
  openCourseArchiveForm(id);
}

function copyLibraryCourse(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  const sourceCourse = contentCourses.find(record => record.id === courseArchiveKey(item));
  let courseId = `COURSE-${String(Date.now()).slice(-8)}`;
  let suffix = 1;
  while (contentCourses.some(record => record.id === courseId) || library.some(record => courseArchiveKey(record) === courseId)) {
    courseId = `COURSE-${String(Date.now()).slice(-7)}-${suffix}`;
    suffix += 1;
  }
  const course = {
    id: courseId,
    source: '后台新增',
    copiedFromCourseId: courseArchiveKey(item),
    name: `${item.name}（副本）`,
    type: item.type,
    major: item.major,
    teacher: item.teacher,
    hours: Number(item.hours) || 0,
    plannedHours: Number(item.hours) || 0,
    difficulty: item.difficulty || '',
    ages: [...(item.ages || [])],
    status: '编排中',
    updatedAt: demoTime(),
    chapters: JSON.parse(JSON.stringify(sourceCourse?.chapters || item.chapters || []))
  };
  contentCourses.unshift(course);
  persistCourse(course);
  closeModal();
  state.libraryTab = 'arrange';
  const url = new URL(location.href);
  url.searchParams.set('tab', 'arrange');
  url.searchParams.set('courseId', courseId);
  history.replaceState(null, '', url);
  renderLibrary(root());
  showToast(`已复制为新课程 ${courseId}，原课程及其订单、班级和学习记录不变`);
}

function openCourseArchiveForm(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  const usage = courseEditLock(item);
  if (usage.locked) { showToast(`${courseEditLockLabel(usage)}；${usage.actionHint}`, 'error'); return; }
  const key = courseArchiveKey(item);
  const course = contentCourses.find(record => record.id === key);
  const draft = { ...item, ages: [...(item.ages || [])], chapters: JSON.parse(JSON.stringify(course?.chapters || item.chapters || [])) };
  const teacherNames = [...new Set([item.teacher, ...teacherAccounts.map(teacher => teacher.name)].filter(Boolean))];
  let activeTab = 'basic';
  let activeChapter = 0;
  const dialog = modal('编辑课程', `${key} · ${item.name}`, '<div data-course-edit-root></div>', { large: true });
  const holder = dialog.querySelector('[data-course-edit-root]');
  const collectBasic = () => {
    const form = holder.querySelector('[data-course-edit-basic]');
    if (!form) return true;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name || !data.get('major') || !data.get('teacher') || Number(data.get('hours')) <= 0) { showToast('请补齐课程名称、所属专业、申报教师和总课时', 'error'); return false; }
    if (!data.get('difficulty') || !data.getAll('ages').length) { showToast('请选择难度等级和适合年龄（教学属性必填）', 'error'); return false; }
    Object.assign(draft, { name, major: data.get('major'), teacher: data.get('teacher'), hours: Number(data.get('hours')), difficulty: data.get('difficulty'), ages: data.getAll('ages') });
    return true;
  };
  const tabs = () => `<div class="course-tabs"><button type="button" class="course-tab${activeTab === 'basic' ? ' active' : ''}" data-course-edit-tab="basic">基本信息</button><button type="button" class="course-tab${activeTab === 'outline' ? ' active' : ''}" data-course-edit-tab="outline">课程大纲</button></div>`;
  const basic = () => `<form data-course-edit-basic><div class="course-detail-grid"><div class="course-field"><label>课程编号</label><input class="readonly-field" value="${escapeHtml(key)}" readonly /></div><div class="course-field"><label>课程来源</label><input class="readonly-field" value="${escapeHtml(item.source || '教师申报')}" readonly /></div><div class="course-field"><label>课程名称 <span class="sub-cell">必填</span></label><input name="name" required maxlength="30" value="${escapeHtml(draft.name)}" /></div><div class="course-field"><label>课程类型</label><input class="readonly-field" value="${escapeHtml(draft.type)}" readonly /></div><div class="course-field"><label>所属专业 <span class="sub-cell">必填</span></label>${professionalFilter('major', draft.major)}</div><div class="course-field"><label>申报教师 <span class="sub-cell">必填</span></label><select name="teacher">${teacherNames.map(name => option(name, name === draft.teacher)).join('')}</select></div><div class="course-field"><label>总课时 <span class="sub-cell">必填</span></label><input name="hours" type="number" min="1" required value="${draft.hours}" /></div><div class="course-field"><label>难度等级 <span class="sub-cell">必填</span></label>${selectWithValues('difficulty', ['启蒙', '初级', '中级', '高级', '考级冲刺'], draft.difficulty, '')}</div><div class="course-field wide"><label>适合年龄 <span class="sub-cell">必填</span></label><div class="choice-group">${['全年龄段', '少儿', '青少年', '成人'].map(value => `<label class="choice"><input type="checkbox" name="ages" value="${value}" ${draft.ages.includes(value) ? 'checked' : ''} />${value}</label>`).join('')}</div></div></div></form>`;
  const outline = () => { const chapter = draft.chapters[activeChapter]; return `<div class="course-workbench"><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>章节结构</h3><p>${draft.chapters.length} 个章节</p></div><button class="button" type="button" data-course-edit="add-chapter">添加章节</button></div><div class="chapter-list">${draft.chapters.map((entry, index) => `<div class="chapter-item${index === activeChapter ? ' active' : ''}" data-course-edit="select-chapter" data-index="${index}"><div><strong>${escapeHtml(entry.name)}</strong><small>${entry.lessons.length} 个课时 · ${escapeHtml(entry.desc || '暂无章节描述')}</small></div><div class="chapter-item-actions"><button type="button" data-course-edit="edit-chapter" data-index="${index}">编辑</button><button type="button" data-course-edit="delete-chapter" data-index="${index}">删</button></div></div>`).join('') || '<div class="course-empty"><strong>暂无章节</strong></div>'}</div></section><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>${chapter ? escapeHtml(chapter.name) : '课时数据'}</h3><p>${chapter ? escapeHtml(chapter.desc || '维护该章节的课时') : '请选择左侧章节'}</p></div>${chapter ? '<button class="button" type="button" data-course-edit="add-lesson">添加课时</button>' : ''}</div><div class="lesson-list">${chapter?.lessons.map((lesson, index) => `<article class="lesson-item"><div class="lesson-item-head"><div><h4>${escapeHtml(lesson.name)}</h4><p>${escapeHtml(lesson.target)}</p></div><div class="chapter-item-actions"><button type="button" data-course-edit="edit-lesson" data-index="${index}">编辑</button><button type="button" data-course-edit="delete-lesson" data-index="${index}">删</button></div></div><div class="lesson-meta"><span>${lesson.duration} 分钟</span><span>${escapeHtml(lesson.kind)}</span><span>${escapeHtml(lesson.description || '暂无内容描述')}</span></div><div class="lesson-resource"><span>${(lesson.resources || []).length ? lesson.resources.map(resourceId => resources.find(resource => resource.id === resourceId)?.name).filter(Boolean).map(escapeHtml).join('、') : '未关联资源'}</span><button class="button" type="button" data-course-edit="resource" data-index="${index}">引用资源</button></div></article>`).join('') || '<div class="course-empty"><strong>暂无课时</strong></div>'}</div></section></div>`; };
  const render = () => { holder.innerHTML = `${tabs()}${activeTab === 'basic' ? basic() : outline()}<p class="course-hint">保存后直接更新课程基本信息与课程大纲。课程一旦产生订单或正式课表，将永久锁定核心内容。</p><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="button" data-course-edit="save">保存</button></div>`; };
  dialog.addEventListener('click', event => {
    const tab = event.target.closest('[data-course-edit-tab]')?.dataset.courseEditTab;
    if (tab) { if (activeTab === 'basic' && !collectBasic()) return; activeTab = tab; render(); return; }
    const target = event.target.closest('[data-course-edit]');
    if (!target) return;
    const action = target.dataset.courseEdit;
    if (action === 'select-chapter') { activeChapter = Number(target.dataset.index); render(); }
    if (action === 'add-chapter' || action === 'edit-chapter') openChapterForm(draft, action === 'edit-chapter' ? Number(target.dataset.index) : null, () => { activeChapter = Math.max(0, draft.chapters.length - 1); render(); });
    // CR-2026-050 §5.3：删除确认改为站内确认弹窗，不再使用原生 confirm。
    if (action === 'delete-chapter') {
      const chapterIndex = Number(target.dataset.index);
      confirmAction({
        title: '删除章节', message: '删除章节会同时删除其下课时，确认继续？',
        detail: '删除后本次编排不再保留该章节及其课时，需保存后才生效。',
        confirmLabel: '确认删除',
        onConfirm: () => { draft.chapters.splice(chapterIndex, 1); activeChapter = Math.max(0, Math.min(activeChapter, draft.chapters.length - 1)); render(); }
      });
    }
    if (action === 'add-lesson' || action === 'edit-lesson') openLessonForm(draft, activeChapter, action === 'edit-lesson' ? Number(target.dataset.index) : null, render);
    if (action === 'delete-lesson') {
      const lessonIndex = Number(target.dataset.index);
      confirmAction({
        title: '删除课时', message: '确认删除该课时？', detail: '删除后需重新保存才会更新课程输出。', confirmLabel: '确认删除',
        onConfirm: () => { draft.chapters[activeChapter].lessons.splice(lessonIndex, 1); render(); }
      });
    }
    if (action === 'resource') openResourcePicker(draft, activeChapter, Number(target.dataset.index), render);
    if (action !== 'save') return;
    if (activeTab === 'basic' && !collectBasic()) return;
    if (!draft.chapters.length || draft.chapters.some(chapter => !chapter.lessons.length)) { showToast('请补齐章节与课时', 'error'); return; }
    const currentUsage = courseEditLock(item);
    if (currentUsage.locked) { showToast(`课程使用情况已变化，${courseEditLockLabel(currentUsage)}；${currentUsage.actionHint}`, 'error'); return; }
    applyArchiveChange(item, { name: draft.name, major: draft.major, teacher: draft.teacher, hours: draft.hours, difficulty: draft.difficulty, ages: [...draft.ages] }, draft.chapters);
    if (course) { Object.assign(course, { name: draft.name, major: draft.major, teacher: draft.teacher, hours: draft.hours, difficulty: draft.difficulty, ages: [...draft.ages], chapters: draft.chapters, updatedAt: demoTime() }); persistCourse(course); }
    persistLibrary(item);
    closeModal();
    renderLibrary(root());
    showToast('课程基本信息与课程大纲已保存');
  });
  render();
}

// CR-2026-034 §2.2：专业引用统计由数据实时派生，不用种子里的静态值；
function majorCourseRecords(majorName) {
  const seen = new Set();
  const records = [];
  [...contentCourses, ...library].forEach((record) => {
    if (record.major !== majorName) return;
    const canonicalId = contentCourses.includes(record) ? toCanonicalCourseId(record.id) : courseArchiveKey(record);
    if (seen.has(canonicalId)) return;
    seen.add(canonicalId);
    records.push(record);
  });
  return records;
}

function majorReferences(majorName) {
  return {
    teachers: TEACHER_FACTS.filter((facts) => (facts.majors || []).includes(majorName)),
    courses: majorCourseRecords(majorName),
    resources: resources.filter((resource) => resource.major === majorName)
  };
}

const majorReferenceTotal = (references) => references.teachers.length + references.courses.length + references.resources.length;
const majorReferenceSummary = (references) => `教师 ${references.teachers.length} · 课程 ${references.courses.length} · 资源 ${references.resources.length}`;

function renderCatalog(page) {
  const groups = Object.keys(professionalTree);
  if (!(state.expandedCatalog instanceof Set)) state.expandedCatalog = new Set(groups.map((group) => `group:${group}`));
  const isOpen = (key) => state.expandedCatalog.has(key);
  const caret = (key, hasChildren) => (hasChildren
    ? `<button type="button" class="catalog-tree-toggle" data-action="catalog-tree-toggle" data-key="${escapeHtml(key)}" aria-expanded="${isOpen(key)}" aria-label="${isOpen(key) ? '收起' : '展开'}">${isOpen(key) ? '▾' : '▸'}</button>`
    : '<span class="catalog-tree-toggle is-leaf" aria-hidden="true"></span>');
  const nodeActions = (type, record) => {
    const attrs = type === 'group'
      ? `data-type="group" data-value="${escapeHtml(record)}"`
      : `data-type="${type}" data-id="${escapeHtml(record.id)}"`;
    const status = type === 'group' ? (catalog.groupStatus[record] || '启用') : record.status;
    return `<span class="catalog-item-status">${tag(status)}</span><span class="catalog-item-actions">${button('编辑', 'catalog-edit', attrs)}${button(status === '启用' ? '停用' : '启用', 'catalog-toggle', attrs, status === '启用' ? 'danger-link' : '')}${button('删除', 'catalog-delete', attrs, 'danger-link')}</span>`;
  };

  const groupNodes = groups.map((group) => {
    const categories = catalog.categories.filter((item) => item.parent === group);
    const groupMajors = catalog.majors.filter((item) => item.group === group);
    const categoryNodes = categories.map((category) => {
      const majors = catalog.majors.filter((item) => item.parent === category.name && item.group === group);
      const majorNodes = majors.map((major) => { const references = majorReferences(major.name); return `<li class="catalog-tree-node catalog-tree-major"><div class="catalog-tree-row">${caret('', false)}<span class="catalog-tree-copy"><strong>${escapeHtml(major.name)}</strong><small>${majorReferenceSummary(references)}</small></span>${nodeActions('major', major)}</div></li>`; }).join('');
      const categoryKey = `category:${category.id}`;
      return `<li class="catalog-tree-node catalog-tree-category"><div class="catalog-tree-row">${caret(categoryKey, majors.length > 0)}<button type="button" class="catalog-tree-copy catalog-tree-button" data-action="catalog-select-category" data-value="${escapeHtml(category.name)}"><strong>${escapeHtml(category.name)}</strong><small>${majors.length} 个专业</small></button>${nodeActions('category', category)}</div>${majors.length ? `<ul class="catalog-tree-children"${isOpen(categoryKey) ? '' : ' hidden'}>${majorNodes}</ul>` : ''}</li>`;
    }).join('');
    const groupKey = `group:${group}`;
    return `<li class="catalog-tree-node catalog-tree-group"><div class="catalog-tree-row">${caret(groupKey, categories.length > 0)}<button type="button" class="catalog-tree-copy catalog-tree-button" data-action="catalog-select-group" data-value="${escapeHtml(group)}"><strong>${escapeHtml(group)}</strong><small>${categories.length} 个分类 · ${groupMajors.length} 个专业</small></button>${nodeActions('group', group)}</div>${categories.length ? `<ul class="catalog-tree-children"${isOpen(groupKey) ? '' : ' hidden'}>${categoryNodes}</ul>` : ''}</li>`;
  }).join('');

  page.innerHTML = `<div class="course-page">${pageShell('专业目录维护', '', '<button class="button primary" type="button" data-action="catalog-add" data-type="group">新增目录</button>')}<section class="catalog-panel catalog-tree-panel"><div class="catalog-panel-head"><div><span class="catalog-kicker">CATALOG TREE</span><h2>目录树</h2><p>展开门类查看分类与专业</p></div><div class="catalog-tree-actions"><button class="button" type="button" data-action="catalog-add" data-type="category">新增分类</button><button class="button" type="button" data-action="catalog-add" data-type="major">新增专业</button></div></div><ul class="catalog-tree">${groupNodes}</ul></section></div>`;
}

// CR-2026-033 §2：后台申报审批页由空壳改为真实审核页（深链、状态源取数、审批区仅在待审核且具备权限时可用）。
function applicationStatusTone(status) {
  if (status === '已通过') return 'green';
  if (status === '已驳回') return 'red';
  if (status === '待审核') return 'brand';
  return 'gray';
}
// CR-2026-049 §4.1：列表操作列合并为单一入口，取值按申报状态与权限决定，两种文案指向同一地址。
// 权限取值与系统管理「角色权限管理」一致：先看角色预置，再看本地保存的勾选，便于复现无权限的只读路径。
function roleHasPoint(pointId) {
  // 页面模块可能先于后台壳层渲染，不能依赖 window.hbyxPermissions 已挂载；取值顺序与「角色权限管理」一致。
  const roleKey = window.hbyxPermissions?.roleKey || readAdminSession()?.role || 'academic_lead';
  try {
    const saved = JSON.parse(localStorage.getItem('hbyx-admin-role-permissions') || '[]');
    const row = Array.isArray(saved) ? saved.find((item) => item.key === roleKey) : null;
    if (row?.permissions?.length) return row.permissions.includes(pointId);
  } catch { /* 本地勾选不可用时回落到角色预置 */ }
  return permissionsOfRole(roleKey).includes(pointId);
}
const canReviewApplication = () => roleHasPoint('PERM-COURSE-002');

function applicationEntryButton(item) {
  const label = item.status === '待审核' && canReviewApplication() ? '审批' : '查看';
  return button(label, 'application-review', `data-id="${item.id}"`);
}
function renderApplicationReview(page) {
  const reviewParams = new URLSearchParams(location.search);
  const applicationId = reviewParams.get('application_id') || reviewParams.get('id') || '';
  const returnUrl = reviewParams.get('return') || '/admin/pages/courses/applications.html';
  const item = applications.find((record) => record.id === applicationId);
  if (!item) {
    page.innerHTML = `<div class="course-page">${pageShell('课程申报详情', '', `<a class="button" href="${escapeHtml(returnUrl)}">返回列表</a>`)}<section class="course-surface"><div class="course-empty"><strong>未找到该申报</strong><span>申报编号 ${escapeHtml(applicationId || '未提供')} 不存在或已被撤销，请返回列表重新选择。</span></div></section></div>`;
    return;
  }
  // CR-2026-049 §4.1：查看与审批合并为一个页面，页面模式由申报状态与权限决定，不由 URL 参数决定。
  const pending = item.status === '待审核';
  const canReview = pending && canReviewApplication();
  const readOnly = !canReview;
  const submittedAt = item.submittedAt || item.date || '—';
  // §4.2.2：申报编号、课程名称、申报状态与提交时间上移抬头四段式并列，页内不再重复展示。
  const headDescription = `${escapeHtml(item.id)} · ${escapeHtml(item.name)} · ${tag(item.status)} · 提交时间 ${escapeHtml(submittedAt)}`;
  // §4.4：标题按模式动态取值，只读模式在抬头标注「只读」，避免被误判为页面异常。
  const headTitle = `${escapeHtml(canReview ? '课程申报审批' : '课程申报详情')}${readOnly ? ' <span class="tag gray">只读</span>' : ''}`;
  const head = (actions, description = headDescription) => pageShell(headTitle, description, actions, { rawTitle: true, rawDescription: true });
  const backLink = `<a class="button" href="${escapeHtml(returnUrl)}">返回列表</a>`;
  // CR-2026-034 §3.1.1：审批通过后就地给出「查看该课程编排」入口，无需回列表再找课程。
  if (state.reviewResult?.id === item.id) {
    const courseId = state.reviewResult.courseId;
    page.innerHTML = `<div class="course-page">${head(`<a class="button" href="${escapeHtml(state.reviewResult.back)}">返回列表</a>`, `${escapeHtml(item.id)} · ${escapeHtml(item.name)} · ${tag('已通过')} · 提交时间 ${escapeHtml(submittedAt)}`)}<section class="course-surface"><div class="course-detail-section wide"><h3>审批已通过</h3><p class="course-hint">申报已通过，课程「${escapeHtml(item.name)}」已进入课程编排，当前状态为待编排。</p><dl class="course-detail-list"><div><dt>派生课程编号</dt><dd>${escapeHtml(courseId)}</dd></div><div><dt>编排状态</dt><dd>${tag('待编排')}</dd></div></dl><div class="course-modal-actions"><a class="button" href="${escapeHtml(state.reviewResult.back)}">返回列表</a><a class="button primary" href="${relativePath(`/admin/pages/courses/library.html?tab=arrange&courseId=${encodeURIComponent(courseId)}`)}">查看该课程编排</a></div></div></section></div>`;
    return;
  }
  const reviewDisabledReason = !pending
    ? `当前状态为「${item.status}」，不可提交审批结论。`
    : (!canReviewApplication() ? '当前账号未获得审批权限点（PERM-COURSE-002），仅可查看申报内容。' : '');
  // §4.3.1：审批结论区排在内容区之后，审批人先读完申报内容再决策；提交与返回收进页面底部常驻操作条。
  const conclusion = canReview
    ? `<form id="application-review-page-form" class="course-review-form" data-form="application-review-page" data-id="${escapeHtml(item.id)}"><section class="course-detail-section wide"><h3>审批结论</h3><div class="choice-group"><label class="choice"><input type="radio" name="result" value="approved" checked />通过</label><label class="choice"><input type="radio" name="result" value="rejected" />驳回</label></div><div class="course-field wide"><label for="review-opinion">审批意见 <span class="sub-cell">驳回时必填，≤500 字；将通过消息同步给申报人</span></label><textarea id="review-opinion" name="opinion" maxlength="500" placeholder="填写审批意见或驳回原因"></textarea></div><p class="course-error" data-error></p></section></form>`
    : `<section class="course-detail-section wide"><h3>审批结论</h3><p class="course-hint">${escapeHtml(reviewDisabledReason)}</p></section>`;
  const lastReview = item.review
    ? `<section class="course-detail-section wide"><h3>${pending && item.review ? '上一轮审核意见' : '最近一次审核意见'}</h3><div class="course-review-box">${tag(item.status)}<p>${escapeHtml(item.review)}</p><small>审批人：${escapeHtml(item.reviewedBy || '—')} · 审批时间：${escapeHtml(item.reviewedAt || '—')}</small></div></section>`
    : '<section class="course-detail-section wide"><h3>最近一次审核意见</h3><p class="course-hint">暂无审核意见。仅展示最近一次，不提供历史意见时间线。</p></section>';
  const actionBar = `<div class="course-review-actionbar"><div class="course-review-actionbar-copy">${canReview ? '审批结论提交后立即生效，并同步给申报人。' : escapeHtml(reviewDisabledReason || '当前为只读模式，不提供审批结论表单。')}</div><div class="toolbar-actions">${backLink}${canReview ? '<button class="button primary" type="submit" form="application-review-page-form">提交审批</button>' : ''}</div></div>`;
  // CR-2026-051 §4.4：已通过的申报在审批页提供「去编排」入口，深链带课程编号；已完成编排时改为「查看课程」。
  const arrangeCourseId = item.courseId || courseIdForApplication(item.id);
  const arrangeCourse = (readDemoState().courses || []).find(record => record.id === arrangeCourseId);
  const arrangeDone = arrangeCourse && arrangeCourse.status === '已完成';
  const arrangeAction = item.status === '已通过' && arrangeCourse
    ? `<a class="button${arrangeDone ? '' : ' primary'}" href="${relativePath(`/admin/pages/courses/library.html?tab=${arrangeDone ? 'all' : 'arrange'}&courseId=${encodeURIComponent(arrangeCourseId)}`)}">${arrangeDone ? '查看课程' : '去编排'}</a>`
    : '';
  page.innerHTML = `<div class="course-page">${head(backLink + arrangeAction)}<section class="course-surface"><div class="course-detail-grid"><section class="course-detail-section wide"><h3>教师信息（只读）</h3><dl class="course-detail-list"><div><dt>姓名</dt><dd>${escapeHtml(item.teacher || '—')}</dd></div><div><dt>工号</dt><dd>${escapeHtml(item.teacherNo || '—')}</dd></div><div><dt>教学单位</dt><dd>${escapeHtml(item.teacherUnit || '—')}</dd></div><div><dt>专业方向</dt><dd>${escapeHtml(item.teacherProfessional || item.major || '—')}</dd></div><div><dt>职称</dt><dd>${escapeHtml(item.teacherTitle || '—')}</dd></div></dl></section><section class="course-detail-section wide"><h3>申报内容（只读）</h3><dl class="course-detail-list"><div><dt>课程名称</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(item.major)}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(item.type)}</dd></div><div><dt>总课时</dt><dd>${hoursText(item.hours)}</dd></div><div><dt>难度等级</dt><dd>${escapeHtml(item.difficulty || '未填写')}</dd></div><div><dt>适合年龄</dt><dd>${escapeHtml(courseAgesText(item) || '未填写')}</dd></div><div class="wide"><dt>课程简介</dt><dd>${escapeHtml(item.intro || '未填写')}</dd></div><div class="wide"><dt>附件</dt><dd>${item.attachment || item.file ? '<button class="text-button" type="button" data-action="preview-attachment" data-id="' + item.id + '">预览 ' + escapeHtml(item.attachment || item.file) + '</button>' : '未上传附件'}</dd></div></dl></section>${lastReview}${conclusion}</div>${actionBar}</section></div>`;
}

function openApplicationAttachmentPreview(item) {
  const fileName = item?.attachment || item?.file || '';
  if (!fileName) return;
  modal('附件预览', fileName, `<section class="course-preview document"><div><strong>申报附件预览</strong><small>${escapeHtml(fileName)}<br />原型阶段仅记录文件名，不上传真实文件。</small></div></section><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button></div>`);
}

function openWorkbench(id) {
  const item = contentCourses.find(record => record.id === id);
  if (!item) return;
  normalizeCourseOutline(item);
  const readOnly = item.status === '已完成';
  const targetHours = Number(item.plannedHours || item.hours || 0);
  let activeChapter = 0;
  // CR-2026-014：教学属性来自申报，编排阶段可修改，保存后写入课程档案（course-display.js）。
  const archiveRecord = courseArchiveFor(item);
  const teaching = { difficulty: archiveRecord?.difficulty || item.difficulty || '', ages: [...(archiveRecord?.ages?.length ? archiveRecord.ages : item.ages || [])] };
  const readTeachingFromDom = () => {
    const difficulty = dialog.querySelector('#workbench-difficulty');
    if (!difficulty) return;
    teaching.difficulty = difficulty.value;
    teaching.ages = [...dialog.querySelectorAll('[name="workbench-age"]:checked')].map(input => input.value);
  };
  const saveTeaching = () => {
    readTeachingFromDom();
    if (!teaching.difficulty || !teaching.ages.length) { showToast('请选择难度等级和适合年龄（教学属性必填）', 'error'); return false; }
    item.difficulty = teaching.difficulty;
    item.ages = [...teaching.ages];
    persistCourseTeaching(item, { difficulty: teaching.difficulty, ages: [...teaching.ages] });
    return true;
  };
  const teachingPanel = () => '<section class="course-workbench-teaching"><div class="course-pane-head"><div><h3>教学属性</h3><p>默认读取教师申报值，可在编排阶段调整；保存后写入课程档案</p></div></div><div class="course-teaching-grid"><div class="course-field"><label>难度等级 <span class="sub-cell">必填</span></label><select id="workbench-difficulty" aria-label="难度等级"><option value="">请选择难度等级</option>' + ['启蒙', '初级', '中级', '高级', '考级冲刺'].map(value => `<option ${teaching.difficulty === value ? 'selected' : ''}>${value}</option>`).join('') + '</select></div><div class="course-field"><label>适合年龄 <span class="sub-cell">必填</span></label><div class="choice-group">' + ['全年龄段', '少儿', '青少年', '成人'].map(value => `<label class="choice"><input type="checkbox" name="workbench-age" value="${value}" ${teaching.ages.includes(value) ? 'checked' : ''} />${value}</label>`).join('') + '</div></div></div></section>';
  const dialog = modal(`${item.status === '已完成' ? '查看课程编排' : item.status === '待编排' ? '开始课程编排' : '继续课程编排'}`, `${item.name} · ${item.type} · ${item.major}`, '<div id="workbench-content"></div>', { large: true });
  const renderWorkbench = () => {
    // 章节切换会整体重绘面板，先取回教学属性的当前输入，避免编辑丢失。
    readTeachingFromDom();
    const chapter = item.chapters[activeChapter];
    const lessonCount = item.chapters.reduce((sum, current) => sum + current.lessons.length, 0);
    if (readOnly) {
      const basicInfo = `<section class="course-detail-section wide"><h3>课程基本信息</h3><dl class="course-detail-list"><div><dt>课程编号</dt><dd>${escapeHtml(item.id)}</dd></div><div><dt>课程名称</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(item.type)}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(item.major)}</dd></div><div><dt>申报教师</dt><dd>${escapeHtml(item.teacher)}</dd></div><div><dt>总课时</dt><dd>${hoursText(item.hours)}</dd></div><div><dt>难度等级</dt><dd>${escapeHtml(teaching.difficulty || '未填写')}</dd></div><div><dt>适合年龄</dt><dd>${escapeHtml(teaching.ages.join('、') || '未填写')}</dd></div></dl></section>`;
      const chapters = `<div class="course-workbench"><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>章节结构</h3><p>${item.chapters.length} 个章节 · ${lessonCount} 个课时</p></div></div><div class="chapter-list">${item.chapters.map((current, index) => `<button type="button" class="chapter-item${index === activeChapter ? ' active' : ''}" data-workbench="select-chapter" data-index="${index}"><span><strong>${escapeHtml(current.name)}</strong><small>${current.lessons.length} 个课时 · ${escapeHtml(current.desc || '暂无章节描述')}</small></span></button>`).join('') || '<div class="course-empty"><strong>暂无章节</strong></div>'}</div></section><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>${chapter ? escapeHtml(chapter.name) : '课时数据'}</h3><p>${chapter ? escapeHtml(chapter.desc || '暂无章节描述') : '请选择左侧章节'}</p></div></div><div class="lesson-list">${chapter?.lessons.map((lesson, index) => `<article class="lesson-item"><div class="lesson-item-head"><div><h4>第 ${index + 1} 课时 · ${escapeHtml(lesson.name)}</h4><p>${escapeHtml(lesson.target || '未填写教学目标')}</p></div></div><div class="lesson-meta"><span>${lesson.duration} 分钟</span><span>${escapeHtml(lesson.kind)}</span><span>${escapeHtml(lesson.description || '暂无内容描述')}</span></div><div class="lesson-resource"><span>${lesson.resources.length ? lesson.resources.map(resourceId => resources.find(resource => resource.id === resourceId)?.name).filter(Boolean).map(escapeHtml).join('、') : '未关联资源'}</span></div></article>`).join('') || '<div class="course-empty"><strong>暂无课时</strong></div>'}</div></section></div>`;
      dialog.querySelector('#workbench-content').innerHTML = `${basicInfo}${chapters}<div class="course-workbench-footer"><div><span class="tag green">编排已完成 · 只读</span></div><div class="toolbar-actions"><button class="button" type="button" data-action="close-modal">关闭</button></div></div>`;
      return;
    }
    dialog.querySelector('#workbench-content').innerHTML = workbenchEditable();
  };
  // CR-2026-050 §5.2／§5.5：编排工作台内的表单改为面板内编辑（不再叠加弹层）；
  // 「完成编排」的阻断原因在对应章节／课时行标记，并在底部常驻条汇总缺失项数量。
  let paneView = 'list';          // list：课时列表；lesson：课时编辑；resources：资源引用
  let chapterDraft = null;        // { index, name, sort, desc }
  let lessonDraft = null;         // { index, name, order, target, duration, kind, description }
  let resourceTarget = null;      // { chapterIndex, lessonIndex }
  let paneError = '';
  let blockersVisible = false;
  let chapterMarks = new Set();
  let lessonMarks = new Set();
  const buildBlockers = () => {
    const list = [];
    if (!item.chapters.length) list.push({ chapterIndex: null, lessonIndex: null, text: '至少需要一个章节' });
    item.chapters.forEach((current, chapterIndex) => {
      if (!current.lessons.length) list.push({ chapterIndex, lessonIndex: null, text: `章节「${current.name}」还没有课时` });
      current.lessons.forEach((lesson, lessonIndex) => {
        if (!lesson.name || !lesson.target || !lesson.duration) list.push({ chapterIndex, lessonIndex, text: `第 ${lessonIndex + 1} 课时缺少必填信息` });
        else if (item.type === '视频课程' && !lesson.resources.some((id) => resources.find((row) => row.id === id)?.type === '教学视频')) list.push({ chapterIndex, lessonIndex, text: `第 ${lessonIndex + 1} 课时未关联教学视频` });
      });
    });
    if (item.type !== '视频课程') {
      const lessons = item.chapters.flatMap((current) => current.lessons);
      if (targetHours && lessons.length !== targetHours) list.push({ chapterIndex: null, lessonIndex: null, text: `课时数需等于申报总课时 ${hoursText(targetHours)}，当前 ${lessons.length} 课时` });
    }
    return list;
  };
  const refreshMarks = () => {
    const blockers = blockersVisible ? buildBlockers() : [];
    chapterMarks = new Set(blockers.filter((row) => row.chapterIndex !== null && row.lessonIndex === null).map((row) => row.chapterIndex));
    lessonMarks = new Set(blockers.filter((row) => row.lessonIndex !== null).map((row) => `${row.chapterIndex}-${row.lessonIndex}`));
    return blockers;
  };
  const errorLine = () => (paneError ? `<p class="course-error" data-inline-error>${escapeHtml(paneError)}</p>` : '');
  const chapterFormMarkup = () => (chapterDraft ? `<form class="course-inline-form" data-course-inline="chapter"><div class="course-field"><label>章节名称 <span class="sub-cell">必填</span></label><input name="name" value="${escapeHtml(chapterDraft.name)}" placeholder="如：第一章：身韵元素训练" /></div><div class="course-field"><label>排序</label><input name="sort" type="number" min="1" value="${chapterDraft.sort}" /></div><div class="course-field"><label>章节描述</label><textarea name="desc" placeholder="填写章节的教学重点">${escapeHtml(chapterDraft.desc || '')}</textarea></div>${errorLine()}<div class="course-inline-actions"><button type="button" class="button" data-workbench="cancel-chapter">取消</button><button type="submit" class="button primary">保存章节</button></div></form>` : '');
  const lessonFormMarkup = () => (lessonDraft ? `<form class="course-inline-form" data-course-inline="lesson"><div class="course-detail-grid"><div class="course-field"><label>课时名称 <span class="sub-cell">必填</span></label><input name="name" value="${escapeHtml(lessonDraft.name)}" placeholder="如：站姿与脚位" /></div><div class="course-field"><label>课时序号 <span class="sub-cell">必填</span></label><input name="order" type="number" min="1" value="${lessonDraft.order}" /></div><div class="course-field"><label>课时目标 <span class="sub-cell">必填</span></label><input name="target" value="${escapeHtml(lessonDraft.target)}" placeholder="填写本课时可达成的目标" /></div><div class="course-field"><label>课时时长（分钟） <span class="sub-cell">必填</span></label><input name="duration" type="number" min="1" value="${lessonDraft.duration}" /></div><div class="course-field"><label>课时类型 <span class="sub-cell">必填</span></label>${selectWithValues('kind', ['理论', '示范', '练习', '综合'], lessonDraft.kind, '')}</div><div class="course-field wide"><label>内容描述</label><textarea name="description" placeholder="填写教学内容和执行提示">${escapeHtml(lessonDraft.description || '')}</textarea></div></div>${errorLine()}</form>` : '');
  const resourceMarkup = () => {
    const lesson = resourceTarget ? item.chapters[resourceTarget.chapterIndex]?.lessons[resourceTarget.lessonIndex] : null;
    if (!lesson) return '<div class="course-empty"><strong>请先选择课时</strong></div>';
    return `<div class="course-list-select">${resources.map((row) => `<label class="course-list-select-item"><input type="checkbox" data-workbench="toggle-resource" value="${row.id}"${lesson.resources.includes(row.id) ? ' checked' : ''} /><span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.type)} · ${escapeHtml(row.major)} · 已引用 ${row.references} 次</small></span></label>`).join('')}</div><p class="course-hint">勾选即保存，无需再次确认；视频课程的每个课时至少需要一个教学视频。</p>`;
  };
  const lessonListView = (chapter) => `<div class="lesson-list">${chapter?.lessons.map((lesson, index) => `<article class="lesson-item${lessonMarks.has(`${activeChapter}-${index}`) ? ' is-invalid' : ''}"><div class="lesson-item-head"><div><h4>${escapeHtml(lesson.name || `第 ${index + 1} 课时`)}</h4><p>${escapeHtml(lesson.target || '未填写教学目标')}</p></div><div class="chapter-item-actions"><button type="button" data-workbench="edit-lesson" data-chapter="${activeChapter}" data-index="${index}">编辑</button><button type="button" data-workbench="delete-lesson" data-chapter="${activeChapter}" data-index="${index}">删</button></div></div><div class="lesson-meta"><span>${lesson.duration} 分钟</span><span>${escapeHtml(lesson.kind)}</span><span>${escapeHtml(lesson.description || '暂无内容描述')}</span></div><div class="lesson-resource"><span class="${item.type === '视频课程' && !lesson.resources.some((resourceId) => resources.find((row) => row.id === resourceId)?.type === '教学视频') ? 'missing' : ''}">${lesson.resources.length ? lesson.resources.map((resourceId) => resources.find((row) => row.id === resourceId)?.name).filter(Boolean).map(escapeHtml).join('、') : item.type === '视频课程' ? '未关联视频资源' : '未关联资源（可选）'}</span><button class="button" type="button" data-workbench="resource" data-index="${index}">引用资源</button></div></article>`).join('') || '<div class="course-empty"><strong>暂无课时</strong><span>请添加至少一个课时并完成教学目标。</span></div>'}</div>`;
  const saveChapterDraft = (form) => {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name) { paneError = '章节名称必填'; renderWorkbench(); return; }
    paneError = '';
    const chapter = { name, desc: String(data.get('desc') || '').trim(), lessons: chapterDraft.index === null ? [] : item.chapters[chapterDraft.index].lessons };
    const fallback = chapterDraft.index === null ? item.chapters.length + 1 : chapterDraft.index + 1;
    const order = Math.max(1, Math.min(item.chapters.length + (chapterDraft.index === null ? 1 : 0), Number(data.get('sort')) || fallback));
    const editIndex = chapterDraft.index;
    if (editIndex !== null) item.chapters.splice(editIndex, 1);
    item.chapters.splice(order - 1, 0, chapter);
    activeChapter = order - 1;
    chapterDraft = null;
    persistCourse(item);
    renderWorkbench();
    showToast('章节已保存');
  };
  const saveLessonDraft = (form) => {
    const scope = form || dialog.querySelector('form[data-course-inline="lesson"]');
    if (!scope) return;
    const data = new FormData(scope);
    const name = String(data.get('name') || '').trim();
    const target = String(data.get('target') || '').trim();
    const duration = Number(data.get('duration'));
    if (!name || !target || !(duration > 0)) { paneError = '课时名称、课时目标与课时时长必填'; renderWorkbench(); return; }
    paneError = '';
    const lessons = item.chapters[activeChapter].lessons;
    const current = lessonDraft.index === null ? { resources: [] } : lessons[lessonDraft.index];
    const lesson = { name, target, duration, kind: data.get('kind'), description: String(data.get('description') || '').trim(), resources: [...(current.resources || [])] };
    const fallback = lessonDraft.index === null ? lessons.length + 1 : lessonDraft.index + 1;
    const order = Math.max(1, Math.min(lessons.length + (lessonDraft.index === null ? 1 : 0), Number(data.get('order')) || fallback));
    if (lessonDraft.index !== null) lessons.splice(lessonDraft.index, 1);
    lessons.splice(order - 1, 0, lesson);
    paneView = 'list';
    lessonDraft = null;
    persistCourse(item);
    renderWorkbench();
    showToast('课时已保存');
  };
  const workbenchEditable = () => {
    const chapter = item.chapters[activeChapter];
    const lessonCount = item.chapters.reduce((sum, current) => sum + current.lessons.length, 0);
    const videoReady = item.type !== '视频课程' || item.chapters.length > 0 && item.chapters.every(current => current.lessons.length > 0 && current.lessons.every(lesson => lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频')));
    const blockers = refreshMarks();
    const pane = paneView === 'lesson'
      ? { title: lessonDraft?.index === null ? '添加课时' : '编辑课时', hint: '表单在本面板内编辑，取消将丢弃未保存输入', body: lessonFormMarkup(), actions: '<button type="button" class="button" data-workbench="cancel-lesson">取消</button><button type="button" class="button primary" data-workbench="save-lesson">保存课时</button>' }
      : paneView === 'resources'
        ? { title: '引用教学资源', hint: '勾选即保存到该课时', body: resourceMarkup(), actions: '<button type="button" class="button primary" data-workbench="back-to-list">完成</button>' }
        : { title: chapter ? chapter.name : '选择章节', hint: chapter ? (chapter.desc || '编辑章节下的课时内容') : '请选择左侧章节', body: lessonListView(chapter), actions: '' };
    return `${teachingPanel()}${blockers.length ? `<section class="course-blocker-panel"><strong>完成编排前还需处理 ${blockers.length} 项</strong><ul>${blockers.slice(0, 4).map((row) => `<li>${escapeHtml(row.text)}</li>`).join('')}${blockers.length > 4 ? `<li>等共 ${blockers.length} 项</li>` : ''}</ul></section>` : ''}<div class="course-workbench"><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>章节结构</h3><p>${item.chapters.length} 个章节 · ${lessonCount} 个课时</p></div>${chapterDraft ? '<span class="tag brand">编辑中</span>' : '<button class="button" type="button" data-workbench="add-chapter">添加章节</button>'}</div><div class="course-pane-body">${chapterFormMarkup()}<div class="chapter-list">${item.chapters.map((current, index) => `<div class="chapter-item${index === activeChapter ? ' active' : ''}${chapterMarks.has(index) ? ' is-invalid' : ''}" data-workbench="select-chapter" data-index="${index}"><div><strong>${escapeHtml(current.name)}</strong><small>${current.lessons.length} 个课时 · ${escapeHtml(current.desc || '暂无章节描述')}</small></div><div class="chapter-item-actions"><button type="button" data-workbench="edit-chapter" data-index="${index}" aria-label="编辑章节">编辑</button><button type="button" data-workbench="delete-chapter" data-index="${index}" aria-label="删除章节">删</button></div></div>`).join('') || '<div class="course-empty"><strong>还没有章节</strong><span>先添加章节，再添加课时。</span></div>'}</div></div></section><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>${escapeHtml(pane.title)}</h3><p>${escapeHtml(pane.hint)}</p></div>${paneView === 'list' && chapter ? '<button class="button" type="button" data-workbench="add-lesson">添加课时</button>' : ''}</div><div class="course-pane-body">${pane.body}</div>${pane.actions ? `<div class="course-pane-actions">${pane.actions}</div>` : ''}</section></div><div class="course-workbench-footer"><div>${blockers.length ? `<span class="tag red">还差 ${blockers.length} 项，已在对应行标出</span>` : item.type === '视频课程' && !videoReady ? '<span class="tag red">视频课程还缺少必填视频资源</span>' : '<span class="tag green">当前结构可保存</span>'}<div class="course-progress"><span style="width:${Math.min(100, targetHours ? Math.round(lessonCount / targetHours * 100) : 0)}%"></span></div></div><div class="toolbar-actions"><button class="button" type="button" data-workbench="save">保存草稿</button>${item.status !== '已完成' ? '<button class="button primary" type="button" data-workbench="complete">完成编排</button>' : ''}</div></div>`;
  };
  dialog.addEventListener('click', event => {
    const target = event.target.closest('[data-workbench]');
    if (!target) return;
    const action = target.dataset.workbench;
    if (action === 'select-chapter') { activeChapter = Number(target.dataset.index); paneView = 'list'; paneError = ''; renderWorkbench(); }
    if (action === 'add-chapter') { chapterDraft = { index: null, name: '', sort: item.chapters.length + 1, desc: '' }; paneError = ''; renderWorkbench(); }
    if (action === 'edit-chapter') { const chapterIndex = Number(target.dataset.index); const current = item.chapters[chapterIndex]; chapterDraft = { index: chapterIndex, name: current.name, sort: chapterIndex + 1, desc: current.desc || '' }; paneError = ''; renderWorkbench(); }
    if (action === 'cancel-chapter') { chapterDraft = null; paneError = ''; renderWorkbench(); }
    if (action === 'delete-chapter') {
      const chapterIndex = Number(target.dataset.index);
      confirmAction({
        title: '删除章节', message: '删除章节会同时删除章节下的所有课时，确认继续？',
        detail: '需先保存草稿才会写入课程档案。', confirmLabel: '确认删除',
        onConfirm: () => { item.chapters.splice(chapterIndex, 1); activeChapter = Math.max(0, Math.min(activeChapter, item.chapters.length - 1)); persistCourse(item); renderWorkbench(); showToast('章节已删除'); }
      });
    }
    if (action === 'add-lesson') { paneView = 'lesson'; paneError = ''; lessonDraft = { index: null, name: '', order: (item.chapters[activeChapter]?.lessons.length || 0) + 1, target: '', duration: 45, kind: '理论', description: '' }; renderWorkbench(); }
    if (action === 'edit-lesson') { const lessonIndex = Number(target.dataset.index); const lesson = item.chapters[activeChapter].lessons[lessonIndex]; paneView = 'lesson'; paneError = ''; lessonDraft = { index: lessonIndex, name: lesson.name, order: lessonIndex + 1, target: lesson.target, duration: lesson.duration, kind: lesson.kind, description: lesson.description || '' }; renderWorkbench(); }
    if (action === 'cancel-lesson') { paneView = 'list'; lessonDraft = null; paneError = ''; renderWorkbench(); }
    if (action === 'save-lesson') saveLessonDraft();
    if (action === 'delete-lesson') {
      // R47-DEF-01：按钮可能只带 data-index，章节索引回落到当前章节；章节不存在时不执行删除。
      const chapterIndex = Number(target.dataset.chapter ?? activeChapter);
      const lessonIndex = Number(target.dataset.index);
      if (!item.chapters[chapterIndex]) { showToast('未找到该课时所属章节，请刷新后重试', 'error'); return; }
      confirmAction({
        title: '删除课时', message: '确认删除该课时？', detail: '需先保存草稿才会写入课程档案。', confirmLabel: '确认删除',
        onConfirm: () => { item.chapters[chapterIndex].lessons.splice(lessonIndex, 1); persistCourse(item); renderWorkbench(); showToast('课时已删除'); }
      });
    }
    if (action === 'resource') { paneView = 'resources'; resourceTarget = { chapterIndex: activeChapter, lessonIndex: Number(target.dataset.index) }; renderWorkbench(); }
    if (action === 'back-to-list') { paneView = 'list'; paneError = ''; renderWorkbench(); }
    if (action === 'save') { if (!saveTeaching()) return; item.status = '编排中'; item.updatedAt = demoTime(); persistCourse(item); renderWorkbench(); showToast('编排草稿已保存'); }
    if (action === 'complete') {
      if (!saveTeaching()) return;
      const blockers = buildBlockers();
      if (blockers.length) { blockersVisible = true; renderWorkbench(); showToast(`完成编排前还需处理 ${blockers.length} 项，已在面板内标出`, 'error'); return; }
      blockersVisible = false;
      item.status = '已完成';
      // CR-2026-051 §4.1：视频课程总课时由编排结果回写；面授课程此前已校验课时数与申报总课时一致。
      item.hours = item.chapters.reduce((sum, current) => sum + ((current.lessons || []).length), 0);
      item.updatedAt = demoTime();
      persistCourse(item);
      syncLibraryCourse(item);
      renderWorkbench();
      renderContent(root());
      showToast('课程编排已完成，可进入课程库');
    }
  });
  dialog.addEventListener('submit', event => {
    const inlineForm = event.target.closest('[data-course-inline]');
    if (!inlineForm) return;
    event.preventDefault();
    if (inlineForm.dataset.courseInline === 'chapter') saveChapterDraft(inlineForm); else saveLessonDraft(inlineForm);
  });
  dialog.addEventListener('change', event => {
    const box = event.target.closest('[data-workbench="toggle-resource"]');
    if (!box || !resourceTarget) return;
    const lesson = item.chapters[resourceTarget.chapterIndex]?.lessons[resourceTarget.lessonIndex];
    if (!lesson) return;
    if (box.checked) { if (!lesson.resources.includes(box.value)) lesson.resources.push(box.value); }
    else lesson.resources = lesson.resources.filter((id) => id !== box.value);
    persistCourse(item);
    if (blockersVisible && !buildBlockers().length) blockersVisible = false;
    renderWorkbench();
    showToast('资源引用已更新');
  });
  renderWorkbench();
}

function openChapterForm(course, index, onDone) {
  const current = index === null ? { name: '', desc: '' } : course.chapters[index];
  const dialog = modal(index === null ? '添加章节' : '编辑章节', '章节名称为必填项', `<form data-form="chapter-form"><div class="course-detail-grid"><div class="course-field"><label>章节名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="如：第一章：身韵元素训练" /></div><div class="course-field"><label>排序</label><input name="sort" type="number" min="1" value="${index === null ? course.chapters.length + 1 : index + 1}" /></div><div class="course-field wide"><label>章节描述</label><textarea name="desc" placeholder="填写章节的教学重点">${escapeHtml(current.desc || '')}</textarea></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存章节</button></div></form>`);
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.target);
    if (!data.get('name').trim()) return;
    const chapter = { name: data.get('name').trim(), desc: data.get('desc').trim(), lessons: current.lessons || [] };
    // I1-C-08: the chapter order field is honoured instead of being collected and dropped.
    const fallback = index === null ? course.chapters.length + 1 : index + 1;
    const order = Math.max(1, Math.min(course.chapters.length + (index === null ? 1 : 0), Number(data.get('sort')) || fallback));
    if (index !== null) course.chapters.splice(index, 1);
    course.chapters.splice(order - 1, 0, chapter);
    closeModal();
    onDone();
    showToast('章节已保存');
  });
}

function openLessonForm(course, chapterIndex, lessonIndex, onDone) {
  const current = lessonIndex === null ? { name: '', target: '', duration: 45, kind: '理论', description: '', resources: [] } : course.chapters[chapterIndex].lessons[lessonIndex];
  const lessonCount = course.chapters[chapterIndex].lessons.length;
  const defaultOrder = lessonIndex === null ? lessonCount + 1 : lessonIndex + 1;
  const dialog = modal(lessonIndex === null ? '添加课时' : '编辑课时', '课时名称、课时目标和课时时长为必填项', `<form data-form="lesson-form"><div class="course-detail-grid"><div class="course-field"><label>课时名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="如：站姿与脚位" /></div><div class="course-field"><label>课时序号 <span class="sub-cell">必填</span></label><input name="order" required type="number" min="1" value="${defaultOrder}" /></div><div class="course-field"><label>课时目标 <span class="sub-cell">必填</span></label><input name="target" required value="${escapeHtml(current.target)}" placeholder="填写本课时可达成的目标" /></div><div class="course-field"><label>课时时长（分钟） <span class="sub-cell">必填</span></label><input name="duration" required type="number" min="1" value="${current.duration}" /></div><div class="course-field"><label>课时类型 <span class="sub-cell">必填</span></label>${selectWithValues('kind', ['理论', '示范', '练习', '综合'], current.kind, '')}</div><div class="course-field wide"><label>内容描述</label><textarea name="description" placeholder="填写教学内容和执行提示">${escapeHtml(current.description || '')}</textarea></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存课时</button></div></form>`);
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.target);
    if (!data.get('name').trim() || !data.get('target').trim() || Number(data.get('duration')) <= 0) return;
    const lesson = { name: data.get('name').trim(), target: data.get('target').trim(), duration: Number(data.get('duration')), kind: data.get('kind'), description: data.get('description').trim(), resources: current.resources || [] };
    const lessons = course.chapters[chapterIndex].lessons;
    // I1-C-09: lessons keep an explicit order instead of always appending to the end.
    const fallback = lessonIndex === null ? lessons.length + 1 : lessonIndex + 1;
    const order = Math.max(1, Math.min(lessons.length + (lessonIndex === null ? 1 : 0), Number(data.get('order')) || fallback));
    if (lessonIndex !== null) lessons.splice(lessonIndex, 1);
    lessons.splice(order - 1, 0, lesson);
    closeModal();
    onDone();
    showToast('课时已保存');
  });
}

function openResourcePicker(course, chapterIndex, lessonIndex, onDone) {
  const lesson = course.chapters[chapterIndex].lessons[lessonIndex];
  const dialog = modal('引用教学资源', '可引用视频、课件或其他教学附件；视频课程至少需要一个视频资源', `<form data-form="resource-picker"><div class="course-list-select">${resources.map(item => `<label class="course-list-select-item"><input type="checkbox" name="resource" value="${item.id}"${lesson.resources.includes(item.id) ? ' checked' : ''} /><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)} · ${escapeHtml(item.major)} · 已引用 ${item.references} 次</small></span></label>`).join('')}</div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存引用</button></div></form>`);
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); lesson.resources = [...dialog.querySelectorAll('[name=resource]:checked')].map(input => input.value); closeModal(); onDone(); showToast('资源引用已更新'); });
}

function openResourceForm(id = null) {
  const current = id ? resources.find(item => item.id === id) : { name: '', type: '教学视频', major: '', level: '启蒙', size: '', teacher: '李教务', uploadedAt: '刚刚', references: 0, ext: 'video', fileName: '' };
  const dialog = modal(id ? '编辑资源' : '上传资源', '支持 MP4、PPT/PDF、MP3、JPG/PNG；视频≤500MB，其他文件≤50MB', `<form data-form="resource-form" data-id="${id || ''}"><div class="course-upload"><label for="resource-file"><strong>资源文件 <span class="sub-cell">必填</span></strong></label><input id="resource-file" name="file" type="file" accept=".mp4,.ppt,.pptx,.pdf,.mp3,.jpg,.jpeg,.png" ${id ? '' : 'required'} /><small data-file-note>${escapeHtml(current.fileName || current.name || '请选择需要上传的文件')}</small></div><div class="course-detail-grid" style="margin-top:18px"><div class="course-field"><label>资源名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="填写资源名称" /></div><div class="course-field"><label>资源类型 <span class="sub-cell">必填</span></label>${selectWithValues('type', ['教学视频', '课件PPT', '乐谱PDF', '音频示范', '其他'], current.type, '')}</div><div class="course-field"><label>所属专业 <span class="sub-cell">必填</span></label>${professionalFilter('major', current.major)}</div><div class="course-field"><label>适用等级 <span class="sub-cell">必填</span></label>${selectWithValues('level', ['启蒙', '初级', '中级', '高级', '考级冲刺'], current.level, '')}</div><div class="course-field wide"><label>资源简介</label><textarea name="intro" placeholder="填写资源简介">${escapeHtml(current.intro || '')}</textarea></div><div class="course-field wide"><label>标签</label><input name="tags" value="${escapeHtml(current.tags || '')}" placeholder="多个标签用逗号分隔" /></div><div class="course-field"><label>是否允许下载</label><label class="course-toggle"><input name="downloadable" type="checkbox"${current.downloadable ? ' checked' : ''} />允许教师下载</label></div><div class="course-field"><label>可见范围</label>${selectWithValues('visibility', ['全部', '仅教师', '仅教研'], current.visibility || '仅教研', '')}</div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">${id ? '保存修改' : '确认上传'}</button></div></form>`);
  dialog.querySelector('[name=file]').addEventListener('change', event => { const file = event.target.files[0]; if (file) dialog.querySelector('[data-file-note]').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB`; });
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const form = event.target; const data = new FormData(form); const file = form.querySelector('[name=file]').files[0]; const type = data.get('type'); if (!data.get('name').trim() || !data.get('major') || !data.get('level')) { showToast('请补齐资源名称、专业和适用等级', 'error'); return; } if (!id && !file) { showToast('请选择资源文件', 'error'); return; } if (file) { const isVideo = file.name.toLowerCase().endsWith('.mp4') || type === '教学视频'; const limit = isVideo ? 500 : 50; if (file.size / 1024 / 1024 > limit) { showToast(`文件超过${limit}MB限制，请重新选择`, 'error'); return; } } const record = { id: id || `res-${Date.now()}`, name: data.get('name').trim(), type, major: data.get('major'), level: data.get('level'), size: file ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : current.size, teacher: current.teacher, uploadedAt: current.uploadedAt, references: current.references, ext: type === '教学视频' ? 'video' : type === '音频示范' ? 'audio' : type === '其他' ? 'image' : 'document', intro: data.get('intro').trim(), tags: data.get('tags').trim(), downloadable: form.querySelector('[name=downloadable]').checked, visibility: data.get('visibility') }; if (id) { Object.assign(current, record); persistResource(record); } else { resources.unshift(record); persistResource(record); } closeModal(); renderResources(root()); showToast(id ? '资源信息已保存' : '资源上传成功'); });
}

function openResourcePreview(id) {
  const item = resources.find(record => record.id === id);
  if (!item) return;
  const documentPreview = item.ext === 'document';
  modal('资源预览', `${item.name} · ${item.type}`, `<div class="course-preview${documentPreview ? ' document' : ''}"><div><strong>${documentPreview ? '文档预览' : item.ext === 'video' ? '视频预览' : item.ext === 'audio' ? '音频预览' : '图片预览'}</strong><small>${escapeHtml(item.name)}<br />文件预览暂不可用。</small></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button></div>`);
}

// 后台新增面授课程只建立基本信息，保存后统一进入待编排。
function openDirectCourseForm() {
  const teacherNames = [...new Set(teacherAccounts.map(teacher => teacher.name).filter(Boolean))];
  const generatedId = `COURSE-${String(Date.now()).slice(-8)}`;
  const dialog = modal('新增面授课程', '保存基本信息后进入内容编排', `<form data-form="direct-course"><div class="course-detail-grid"><div class="course-field"><label>课程编号 <span class="sub-cell">必填</span></label><input name="courseNumber" required maxlength="30" value="${generatedId}" /></div><div class="course-field"><label>课程名称 <span class="sub-cell">必填</span></label><input name="name" required maxlength="30" placeholder="填写课程名称" /></div><div class="course-field"><label>课程类型</label><input class="readonly-field" value="面授课程" readonly /></div><div class="course-field"><label>所属专业 <span class="sub-cell">必填</span></label>${professionalFilter('major')}</div><div class="course-field"><label>申报教师 <span class="sub-cell">必填</span></label><select name="teacher" required><option value="">请选择</option>${teacherNames.map(name => option(name, false)).join('')}</select></div><div class="course-field"><label>总课时 <span class="sub-cell">必填</span></label><input name="hours" type="number" min="1" required value="1" /></div><div class="course-field"><label>难度等级 <span class="sub-cell">必填</span></label>${selectWithValues('difficulty', ['启蒙', '初级', '中级', '高级', '考级冲刺'], '启蒙', '')}</div><div class="course-field"><label>适合年龄 <span class="sub-cell">必填</span></label><div class="choice-group">${['全年龄段', '少儿', '青少年', '成人'].map(value => `<label class="choice"><input type="checkbox" name="ages" value="${value}" />${value}</label>`).join('')}</div></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存并进入待编排</button></div></form>`, { large: true });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.target);
    const courseNumber = String(data.get('courseNumber') || '').trim();
    const name = String(data.get('name') || '').trim();
    const ages = data.getAll('ages');
    if (!courseNumber || !name || !data.get('major') || !data.get('teacher') || Number(data.get('hours')) <= 0 || !data.get('difficulty') || !ages.length) {
      showToast('请补齐课程基本信息', 'error');
      return;
    }
    if (contentCourses.some(item => item.id === courseNumber) || library.some(item => courseArchiveKey(item) === courseNumber)) {
      showToast(`课程编号 ${courseNumber} 已存在，请更换`, 'error');
      return;
    }
    const course = { id: courseNumber, source: '后台新增', name, type: '面授课程', major: data.get('major'), teacher: data.get('teacher'), hours: Number(data.get('hours')), difficulty: data.get('difficulty'), ages, status: '待编排', updatedAt: demoTime(), chapters: [] };
    contentCourses.unshift(course);
    persistCourse(course);
    closeModal();
    state.libraryTab = 'arrange';
    const url = new URL(location.href);
    url.searchParams.set('tab', 'arrange');
    history.replaceState(null, '', url);
    renderLibrary(root());
    showToast('面授课程已创建，状态为待编排');
  });
}

function openCatalogForm(type, id = null) {
  const current = type === 'group' ? { name: id || '', sort: 1, icon: '' } : type === 'category' ? catalog.categories.find(item => item.id === id) || { name: '', parent: state.selectedGroup, sort: catalog.categories.length + 1 } : catalog.majors.find(item => item.id === id) || { name: '', parent: state.selectedCategory, group: state.selectedGroup, sort: catalog.majors.length + 1 };
  const title = `${id ? '编辑' : '新增'}${type === 'group' ? '门类' : type === 'category' ? '分类' : '专业'}`;
  const levelLabel = type === 'group' ? '门类' : type === 'category' ? '分类' : '专业';
  const levelField = `<div class="course-field"><label>目录层级</label><input class="readonly-field" value="${levelLabel}" readonly /></div>`;
  const parentField = type === 'category' ? `<div class="course-field"><label>上级节点 <span class="sub-cell">必填</span></label>${selectWithValues('parent', Object.keys(professionalTree), current.parent, '')}</div>` : type === 'major' ? `<div class="course-field"><label>上级节点 <span class="sub-cell">必填</span></label><select name="parent">${catalog.categories.map(item => option(item.name, item.name === current.parent)).join('')}</select></div>` : '<div class="course-field"><label>图标</label><input name="icon" value="" placeholder="可选图标名称" /></div>';
  const dialog = modal(title, '名称为必填项，目录将供全系统级联选择使用', `<form data-form="catalog-form" data-type="${type}" data-id="${id || ''}"><div class="course-detail-grid">${levelField}<div class="course-field"><label>名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="填写名称" /></div>${parentField}<div class="course-field"><label>排序</label><input name="sort" type="number" min="1" value="${current.sort || 1}" /></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存目录</button></div></form>`);
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); const name = data.get('name').trim(); if (!name) return; if (type === 'group') { const oldName = id || ''; if (oldName && oldName !== name && professionalTree[oldName]) { professionalTree[name] = professionalTree[oldName]; delete professionalTree[oldName]; catalog.groupStatus[name] = catalog.groupStatus[oldName] || '启用'; delete catalog.groupStatus[oldName]; catalog.categories.filter(item => item.parent === oldName).forEach(item => { item.parent = name; }); catalog.majors.filter(item => item.group === oldName).forEach(item => { item.group = name; }); } if (!professionalTree[name]) professionalTree[name] = {}; catalog.groupStatus[name] ||= '启用'; state.selectedGroup = name; } if (type === 'category') { const record = id ? catalog.categories.find(item => item.id === id) : { id: `cat-${Date.now()}` }; Object.assign(record, { name, parent: data.get('parent'), sort: Number(data.get('sort')) || 1, status: record.status || '启用' }); if (!id) catalog.categories.push(record); state.selectedGroup = record.parent; state.selectedCategory = record.name; } if (type === 'major') { const record = id ? catalog.majors.find(item => item.id === id) : { id: `major-${Date.now()}`, teachers: 0, courses: 0, resources: 0 }; const parent = data.get('parent'); const category = catalog.categories.find(item => item.name === parent); Object.assign(record, { name, parent, group: category?.parent || state.selectedGroup, sort: Number(data.get('sort')) || 1, status: record.status || '启用' }); if (!id) catalog.majors.push(record); state.selectedGroup = record.group; state.selectedCategory = parent; } closeModal(); renderCatalog(root()); showToast('目录已保存'); });
}

function handleClick(event) {
  // CR-2026-050 §5.3：确认类弹窗的「确认」先于 data-action 分派处理，先出栈再执行不可逆操作。
  const confirmButton = event.target.closest('[data-confirm-action="run"]');
  if (confirmButton) {
    const run = pendingConfirm;
    pendingConfirm = null;
    closeModal(confirmButton.closest('dialog.course-modal'));
    if (run) run();
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (target.type === 'reset') {
    const filter = target.closest('[data-form]')?.dataset.form;
    if (filter === 'application-filter') state.applicationFilters = {};
    if (filter === 'content-filter') state.contentFilters = {};
    if (filter === 'resource-filter') state.resourceFilters = {};
    if (filter === 'library-filter') state.libraryFilters = {};
    window.setTimeout(() => renderPage(), 0);
    return;
  }
  if (action === 'close-modal') closeModal();
  if (action === 'application-tab') {
    state.reviewResult = null;
    state.applicationTab = target.dataset.value || '';
    const url = new URL(location.href);
    if (state.applicationTab) url.searchParams.set('tab', state.applicationTab); else url.searchParams.delete('tab');
    url.searchParams.delete('status');
    history.replaceState(null, '', url);
    renderApplications(root());
  }
  if (action === 'library-tab') {
    state.libraryTab = target.dataset.value === 'all' ? 'all' : 'arrange';
    const url = new URL(location.href);
    url.searchParams.set('tab', state.libraryTab);
    history.replaceState(null, '', url);
    renderLibrary(root());
  }
  if (action === 'export-applications') showToast('列表导出任务已创建，数据将按当前权限脱敏');
  if (action === 'application-review') {
    // CR-2026-033 §2.1：审批动作唯一入口是审批页；列表页不再弹窗审批。
    const back = new URL(location.href);
    back.searchParams.set('tab', state.applicationTab || '');
    location.href = `application-review.html?application_id=${encodeURIComponent(target.dataset.id)}&return=${encodeURIComponent(back.pathname + back.search)}`;
  }
  if (action === 'preview-attachment') {
    const item = applications.find(record => record.id === target.dataset.id);
    if (item) openApplicationAttachmentPreview(item);
  }
  if (action === 'content-workbench') openWorkbench(target.dataset.id);
  if (action === 'refresh-content') { renderContent(root()); showToast('课程编排列表已刷新'); }
  if (action === 'upload-resource') openResourceForm();
  if (action === 'resource-preview') openResourcePreview(target.dataset.id);
  if (action === 'resource-edit') openResourceForm(target.dataset.id);
  if (action === 'resource-delete') deleteResource(target.dataset.id);
  if (action === 'new-direct-course') openDirectCourseForm();
  if (action === 'publish-product' || action === 'publish-class') {
    const item = library.find(record => record.id === target.dataset.id);
    const route = action === 'publish-product' ? '/admin/pages/mall/products.html' : '/admin/pages/crm/classes.html';
    if (item) window.location.href = relativePath(`${route}?courseId=${encodeURIComponent(courseArchiveKey(item))}`);
  }
  if (action === 'library-view') openLibraryView(target.dataset.id);
  if (action === 'library-edit') openLibraryEdit(target.dataset.id);
  if (action === 'library-copy') copyLibraryCourse(target.dataset.id);
  if (action === 'library-toggle-enabled') toggleLibraryEnabled(target.dataset.id);
  if (action === 'library-delete') deleteLibraryRecord(target.dataset.id);
  if (action === 'catalog-add') openCatalogForm(target.dataset.type);
  if (action === 'catalog-tree-toggle') { const key = target.dataset.key; if (state.expandedCatalog.has(key)) state.expandedCatalog.delete(key); else state.expandedCatalog.add(key); renderCatalog(root()); }
  if (action === 'catalog-select-group') { state.selectedGroup = target.dataset.value; state.selectedCategory = catalog.categories.find(item => item.parent === state.selectedGroup)?.name || ''; renderCatalog(root()); }
  if (action === 'catalog-select-category') { state.selectedCategory = target.dataset.value; renderCatalog(root()); }
  if (action === 'catalog-edit') { const type = target.dataset.type; const id = type === 'group' ? target.dataset.value : target.dataset.id; openCatalogForm(type, id); }
  if (action === 'catalog-toggle') toggleCatalog(target.dataset.type, target.dataset.id, target.dataset.value);
  if (action === 'catalog-delete') deleteCatalog(target.dataset.type, target.dataset.id, target.dataset.value);
  if (action === 'catalog-toggle-confirm') confirmCatalogToggle(target.dataset.id);
  if (action === 'catalog-delete-confirm') confirmCatalogDelete(target.dataset.id);
}

function handleChange(event) {
  if (event.target.matches('[data-action=page-size]')) { state.pageSize = Number(event.target.value); renderPage(); }
}

// CR-2026-033 §2.3：写入审批人与时间；通过后课程主体进入课程库，驳回后可修改重提。
function applyApplicationReview(item, result, opinion) {
  item.status = result === 'approved' ? '已通过' : '已驳回';
  // I1-DEC-20: a single review field is shared by both ends; approval defaults to 审批通过.
  item.review = opinion || '审批通过';
  item.reviewedBy = '教研管理员';
  item.reviewedAt = demoTime();
  persistApplication(item);
  if (result !== 'approved') return item;
  // I1-DEC-21: keyed by application/course id, an existing course entity is reused and updated.
  const targetId = item.courseId || courseIdForApplication(item.id);
  const existing = contentCourses.find(record => record.applicationId === item.id || record.id === targetId);
  const course = existing || courseFromApplication(item);
  if (existing) Object.assign(course, { applicationId: item.id, name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: item.type === '视频课程' ? 0 : Number(item.hours) || course.hours });
  else contentCourses.unshift(course);
  persistCourse(course);
  return item;
}
function handleSubmit(event) {
  const form = event.target;
  if (!form.matches('[data-form]')) return;
  if (form.dataset.form === 'application-filter' || form.dataset.form === 'content-filter' || form.dataset.form === 'resource-filter' || form.dataset.form === 'library-filter') { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); const key = form.dataset.form.replace('-filter', 'Filters').replace('applicationFilters', 'applicationFilters'); if (form.dataset.form === 'application-filter') {
    state.applicationFilters = data;
    const url = new URL(location.href);
    ['teacher', 'major', 'keyword'].forEach((key) => { const value = String(data[key] || '').trim(); if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); });
    url.searchParams.delete('status');
    if (state.applicationTab) url.searchParams.set('tab', state.applicationTab); else url.searchParams.delete('tab');
    history.replaceState(null, '', url);
  } if (form.dataset.form === 'content-filter') state.contentFilters = data; if (form.dataset.form === 'resource-filter') state.resourceFilters = data; if (form.dataset.form === 'library-filter') state.libraryFilters = data; renderPage(); }
  // CR-2026-033：审批落库逻辑抽成共享函数，审批页与只读详情共用同一口径。
  if (form.dataset.form === 'application-review-page') {
    event.preventDefault();
    const result = form.querySelector('[name=result]:checked')?.value;
    const opinion = form.querySelector('[name=opinion]').value.trim();
    const error = form.querySelector('[data-error]');
    if (result === 'rejected' && !opinion) { error.textContent = '驳回时必须填写审批意见或原因'; return; }
    const item = applications.find(record => record.id === form.dataset.id);
    if (!item) return;
    applyApplicationReview(item, result, opinion);
    const back = new URLSearchParams(location.search).get('return') || '/admin/pages/courses/applications.html';
    if (result === 'approved') {
      // CR-2026-034 §3.1.1：通过后留在审批页给出编排入口，教师端与列表状态已同步落库。
      state.reviewResult = { id: item.id, courseId: item.courseId || courseIdForApplication(item.id), back };
      renderApplicationReview(root());
      showToast('申报已通过，课程已进入内容编排');
      return;
    }
    state.reviewResult = null;
    location.href = back;
    return;
  }
  // CR-2026-034 §4.1：停用必须填写原因，写入停用时间／操作人／原因；清空即可恢复。
  if (form.dataset.form === 'library-disable') {
    event.preventDefault();
    const reason = String(new FormData(form).get('reason') || '').trim();
    const error = form.querySelector('[data-error]');
    if (!reason) { if (error) error.textContent = '停用原因必填'; return; }
    const item = library.find((record) => record.id === form.dataset.id);
    if (!item) return;
    item.disabledAt = demoTime();
    item.disabledBy = '教研管理员';
    item.disabledReason = reason;
    persistLibrary(item);
    closeModal();
    renderLibrary(root());
    showToast(`课程「${item.name}」已停用；既有商品、班级、订单与学习权限不受影响`);
    return;
  }
}

function deleteResource(id) {
  const item = resources.find(record => record.id === id);
  if (!item) return;
  // E-17: referenced resources cannot be physically deleted; unbind them from lessons first.
  const references = Number(item.references || 0);
  if (references > 0) { showToast(`该资源已被 ${references} 门课程引用，请先在课程编排中解除引用后再删除`, 'error'); return; }
  // CR-2026-050 §5.3：资源删除同样走站内确认弹窗。
  confirmAction({
    title: '删除资源',
    message: '该资源暂未被课时引用，确认删除？',
    detail: '删除后资源库不再提供该文件，编排页面的引用选择器同步移除。',
    onConfirm: () => { resources.splice(resources.indexOf(item), 1); removeDemoRecord('resources', id); renderResources(root()); showToast('资源已删除'); }
  });
}

// CR-2026-034 §2.3：停用／删除专业前先展示引用清单，按教师／课程／资源分组并可跳转。
function catalogReferenceGroups(references) {
  const group = (label, items, render) => `<div class="catalog-reference-group"><div class="catalog-reference-head"><span>${label}</span><strong>${items.length}</strong></div>${items.length ? `<ul>${items.map(render).join('')}</ul>` : '<p class="catalog-reference-empty">无引用</p>'}</div>`;
  const teacherLink = (item) => `<li><a href="${relativePath(`/admin/pages/teachers/profile.html?teacher=${encodeURIComponent(item.name)}`)}">${escapeHtml(item.name)}</a><small>授课专业：${escapeHtml((item.majors || []).join('、') || '—')}</small></li>`;
  const courseLink = (item) => {
    const courseId = contentCourses.includes(item) ? toCanonicalCourseId(item.id) : courseArchiveKey(item);
    return `<li><a href="${relativePath(`/admin/pages/courses/library.html?tab=all&courseId=${encodeURIComponent(courseId)}`)}">${escapeHtml(item.name || courseId)}</a><small>${escapeHtml(courseId)} · ${escapeHtml(item.type || '—')}</small></li>`;
  };
  const resourceLink = (item) => `<li><a href="${relativePath(`/admin/pages/courses/resources.html?keyword=${encodeURIComponent(item.name)}`)}">${escapeHtml(item.name)}</a><small>${escapeHtml(item.type)} · ${escapeHtml(item.level)}</small></li>`;
  return `<div class="catalog-reference-list">${group('教师', references.teachers, teacherLink)}${group('课程', references.courses, courseLink)}${group('资源', references.resources, resourceLink)}</div>`;
}

function openCatalogReferenceDialog(major, intent) {
  const references = majorReferences(major.name);
  const total = majorReferenceTotal(references);
  const canDelete = total === 0;
  const stopping = major.status === '启用';
  const intro = intent === 'delete'
    ? (canDelete ? '该专业当前没有任何引用，可以物理删除；删除后不可恢复。' : '该专业仍被引用，只能停用，不能删除。')
    : `停用后不再出现在新的申报与筛选项；已发布课程与班级的既有专业值不受影响。`;
  const confirm = intent === 'delete' && canDelete
    ? `<button type="button" class="button danger-button" data-action="catalog-delete-confirm" data-id="${major.id}">确认删除</button>`
    : `<button type="button" class="button primary" data-action="catalog-toggle-confirm" data-id="${major.id}">确认${stopping ? '停用' : '启用'}</button>`;
  modal(`${intent === 'delete' ? '删除' : stopping ? '停用' : '启用'}专业「${major.name}」`, `${major.name} · ${majorReferenceSummary(references)}`, `<section class="course-detail-section wide"><p class="course-hint">${intro}</p></section>${catalogReferenceGroups(references)}<div class="course-modal-actions"><button type="button" class="button" data-action="close-modal">取消</button>${confirm}</div>`, { large: true });
}

function confirmCatalogToggle(id) {
  const item = catalog.majors.find((record) => record.id === id);
  if (!item) return;
  item.status = item.status === '启用' ? '停用' : '启用';
  closeModal();
  renderCatalog(root());
  showToast(`${item.name}已${item.status}`);
}

function confirmCatalogDelete(id) {
  const item = catalog.majors.find((record) => record.id === id);
  if (!item) return;
  if (majorReferenceTotal(majorReferences(item.name)) > 0) { closeModal(); showToast('该专业已被引用，不可删除', 'error'); return; }
  catalog.majors.splice(catalog.majors.indexOf(item), 1);
  closeModal();
  renderCatalog(root());
  showToast('专业已删除');
}

function toggleCatalog(type, id, value) {
  if (type === 'group') { catalog.groupStatus[value] = catalog.groupStatus[value] === '启用' ? '停用' : '启用'; renderCatalog(root()); showToast(`${value}已${catalog.groupStatus[value]}`); return; }
  if (type === 'major') {
    const major = catalog.majors.find((record) => record.id === id);
    if (major) openCatalogReferenceDialog(major, 'toggle');
    return;
  }
  const collection = type === 'category' ? catalog.categories : catalog.majors;
  const item = collection.find(record => record.id === id);
  if (item) { item.status = item.status === '启用' ? '停用' : '启用'; renderCatalog(root()); showToast(`${item.name}已${item.status}`); }
}

function deleteCatalog(type, id, value) {
  if (type === 'group') {
    const childCount = catalog.categories.filter(item => item.parent === value).length;
    if (childCount) { showToast(`该门类下还有${childCount}个分类，不可删除`, 'error'); return; }
    // CR-2026-050 §5.3：门类删除走站内确认弹窗。
    confirmAction({
      title: '删除门类',
      message: `确认删除门类“${value}”？`,
      detail: '门类下必须没有分类才能删除；已被引用的目录只能停用。',
      onConfirm: () => { delete professionalTree[value]; delete catalog.groupStatus[value]; renderCatalog(root()); showToast('门类已删除'); }
    });
    return;
  }
  if (type === 'category') {
    const item = catalog.categories.find(record => record.id === id);
    if (!item) return;
    const childCount = catalog.majors.filter(record => record.parent === item.name).length;
    if (childCount) { showToast(`该分类下还有${childCount}个专业，不可删除`, 'error'); return; }
    // CR-2026-050 §5.3：分类删除走站内确认弹窗。
    confirmAction({
      title: '删除分类',
      message: `确认删除分类“${item.name}”？`,
      detail: '分类下必须没有专业才能删除；已被引用的目录只能停用。',
      onConfirm: () => { catalog.categories.splice(catalog.categories.indexOf(item), 1); renderCatalog(root()); showToast('分类已删除'); }
    });
    return;
  }
  const item = catalog.majors.find(record => record.id === id);
  if (!item) return;
  // CR-2026-034 §2.3.1：删除前先出引用清单；有引用时清单里只提供「停用」。
  openCatalogReferenceDialog(item, 'delete');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
