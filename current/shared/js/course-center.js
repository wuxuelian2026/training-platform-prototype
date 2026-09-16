import { relativePath } from './paths.js';
import { demoId, demoTime, readDemoState, removeDemoRecord, updateDemoRecord, upsertDemoRecord } from './demo-store.js';
import { applicationSeed, courseIdForApplication, teacherAccounts, toCanonicalCourseId } from './course-seed.js';
import { COURSE_PROMISE_LABELS, changedPromiseFields, commitCourseVersion, courseArchiveKey, courseReferences, courseSnapshot, courseStructure, courseVersionOf, ensureVersionTrack, refreshCurrentSnapshot, referenceLabel } from './course-version.js';
import { courseAgesText, courseArchiveFor, persistCourseTeaching } from './course-display.js';
import { courseArchiveSeed } from './course-display.js';
import { mountRichEditor, richTextToHtml, richTextValue } from './rich-editor.js';
import { machinesForPage, stateLabelsOf } from '../../spec/states/index.js';

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
  { id: 'COURSE-005', name: '戏剧表演基础', type: '面授课程', major: '戏剧表演', teacher: '赵可', hours: 16, status: '编排中', updatedAt: '2026-09-03 10:45', chapters: [{ name: '第一章：舞台表达', desc: '台词和形体训练。', lessons: [{ name: '台词气息', target: '完成台词气息控制', duration: 45, kind: '综合', description: '结合文本完成舞台表达。', resources: [] }] }] }
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
// CR-2026-025：课程档案的编排结构来自课程主体；轻量档案以课程大纲参与承诺类变更判定。
const courseChaptersOf = (record) => (record?.archive === '完整课程' ? (contentCourses.find((item) => item.id === courseArchiveKey(record))?.chapters || []) : []);
const courseStructureOf = (record) => (record?.archive === '完整课程' ? courseStructure(courseChaptersOf(record)) : null);

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
appendShared(applications, sharedDemo.applications);
for (let index = applications.length - 1; index >= 0; index -= 1) {
  if (applications[index].status === '草稿') applications.splice(index, 1);
}
appendShared(contentCourses, sharedDemo.courses);
appendShared(resources, sharedDemo.resources);
mergeSharedRecords(library, sharedDemo.library);
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
  return { id: applicationCourseId(item), applicationId: item.id, name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: Number(item.hours) || 1, status: '待编排', updatedAt: demoTime(), chapters: [], difficulty: item.difficulty || '', ages: Array.isArray(item.ages) ? [...item.ages] : [] };
}
function syncLibraryCourse(item) {
  const existing = library.find(record => record.sourceCourseId === item.id);
  const record = existing || { id: `LIB-${item.id}`, sourceCourseId: item.id, archive: '完整课程', name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: item.hours, status: '已完成', difficulty: '', ages: [], detail: '' };
  // 教学属性来自申报；只有档案里还没有值时，才用课程主体带的申报值补齐，不覆盖编排阶段的修改。
  Object.assign(record, { sourceCourseId: item.id, name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: item.hours, status: '已完成', difficulty: record.difficulty || item.difficulty || '', ages: (record.ages && record.ages.length ? record.ages : item.ages) || [] });
  if (!existing) library.unshift(record);
  persistLibrary(record);
}

const state = { page: courseRoot?.dataset.coursePage || '', applicationTab: '', libraryTab: new URLSearchParams(location.search).get('tab') === 'all' ? 'all' : 'arrange', applicationFilters: {}, contentFilters: {}, resourceFilters: {}, libraryFilters: {}, selectedGroup: '音乐类', selectedCategory: '声乐', pageSize: 20, modal: null };

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
  const previousModal = state.modal;
  const dialog = document.createElement('dialog');
  dialog.className = `course-modal${options.large ? ' large' : ''}`;
  dialog.innerHTML = `<div class="course-modal-card"><div class="course-modal-header"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><button class="course-modal-close" type="button" aria-label="关闭">×</button></div><div class="course-modal-body">${content}</div></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('.course-modal-close').addEventListener('click', closeModal);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeModal(); });
  dialog.addEventListener('close', () => { dialog.remove(); state.modal = previousModal || null; });
  dialog.showModal();
  state.modal = dialog;
  return dialog;
};
const closeModal = () => { if (state.modal?.open) state.modal.close(); else state.modal?.remove(); state.modal = null; };
const button = (label, action, attrs = '', className = '') => `<button type="button" class="text-button ${className}" data-action="${action}" ${attrs}>${escapeHtml(label)}</button>`;
const pageShell = (title, description, actions = '') => `<div class="page-head"><div><h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div><div class="toolbar-actions">${actions}</div></div>`;
const filterField = (label, input) => `<div class="course-field"><label>${escapeHtml(label)}</label>${input}</div>`;
const select = (name, values, selected = '', allLabel = '全部') => `<select name="${name}">${allLabel ? option('', selected === '') .replace('</option>', `>${allLabel}</option>`) : ''}${values.map(value => option(value, selected === value)).join('')}</select>`;
const selectWithValues = (name, values, selected = '', allLabel = '全部') => `<select name="${name}">${allLabel ? `<option value="">${allLabel}</option>` : ''}${values.map(value => option(value, selected === value)).join('')}</select>`;
const professionalFilter = (name, selected = '') => `<select name="${name}"><option value="">全部专业</option>${catalog.majors.map(item => option(item.name, item.name === selected)).join('')}</select>`;
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
  if (state.page === 'content') renderContent(page);
  if (state.page === 'resources') renderResources(page);
  if (state.page === 'library') renderLibrary(page);
  if (state.page === 'catalog') renderCatalog(page);
}

function renderApplications(page) {
  const tabs = applicationStatusTabs();
  const activeTab = tabs.some((tab) => tab.value === state.applicationTab) ? state.applicationTab : '';
  const tabRecords = activeTab ? applications.filter(item => item.status === activeTab) : applications;
  const filtered = tabRecords.filter(item => !state.applicationFilters.teacher || item.teacher.includes(state.applicationFilters.teacher)).filter(item => !state.applicationFilters.major || item.major === state.applicationFilters.major).filter(item => !state.applicationFilters.keyword || `${item.name}${item.id}`.includes(state.applicationFilters.keyword)).filter(item => !state.applicationFilters.status || item.status === state.applicationFilters.status);
  // 具体状态页签本身已经限定了状态，只有「全部」页签才需要状态下拉补充筛选。
  const statusFilter = activeTab === ''
    ? filterField('申报状态', selectWithValues('status', tabs.filter(tab => tab.value).map(tab => tab.value), state.applicationFilters.status || '', '全部状态'))
    : '';
  page.innerHTML = `<div class="course-page">${pageShell('课程申报', '', '<button class="button" type="button" data-action="export-applications">导出列表</button>')}<section class="course-surface"><div class="course-tabs">${tabs.map(tab => `<button type="button" class="course-tab${activeTab === tab.value ? ' active' : ''}" data-action="application-tab" data-value="${tab.value}">${tab.label} <small>(${applications.filter(item => !tab.value || item.status === tab.value).length})</small></button>`).join('')}</div><form class="course-filter" data-form="application-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('申报教师', `<input name="teacher" value="${escapeHtml(state.applicationFilters.teacher || '')}" placeholder="输入教师姓名" />`)}${filterField('所属专业', professionalFilter('major', state.applicationFilters.major))}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.applicationFilters.keyword || '')}" placeholder="课程名称或申报编号" />`)}${statusFilter}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>申报列表</strong><span> 当前显示 ${filtered.length} 条</span></div><div class="course-legend"><span class="course-legend-item">待教研审核</span><span class="course-legend-item success">可进入编排</span><span class="course-legend-item warning">需修改</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>申报编号</th><th>课程名称</th><th>课程类型</th><th>申报教师</th><th>所属专业</th><th>申报时间</th><th>申报状态</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td>${item.id}</td><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${escapeHtml(item.intro.slice(0, 28))}…</span></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.submittedAt)}</td><td>${tag(item.status)}</td><td><div class="course-actions">${button('查看详情', 'application-detail', `data-id="${item.id}"`)}${item.status === '待审核' ? button('审批', 'application-review', `data-id="${item.id}"`) : ''}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无申报数据</strong><span>调整筛选条件后重试，或等待教师提交新的课程申报。</span></div>'}</div>${pagination(filtered.length)}</section></div>`;
}

function renderContent(page) {
  const filtered = contentCourses.filter(item => !state.contentFilters.status || item.status === state.contentFilters.status).filter(item => !state.contentFilters.type || item.type === state.contentFilters.type).filter(item => !state.contentFilters.major || item.major === state.contentFilters.major).filter(item => !state.contentFilters.keyword || `${item.name}${item.teacher}`.includes(state.contentFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('课程内容编排', '', '<button class="button" type="button" data-action="refresh-content">刷新列表</button>')}<section class="course-surface"><form class="course-filter" data-form="content-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('编排状态', selectWithValues('status', ['待编排', '编排中', '已完成'], state.contentFilters.status || '', '全部状态'))}${filterField('课程类型', selectWithValues('type', ['视频课程', '面授课程'], state.contentFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.contentFilters.major))}${filterField('申报教师', `<input name="keyword" value="${escapeHtml(state.contentFilters.keyword || '')}" placeholder="课程名称或教师姓名" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>待编排课程</strong><span> 共 ${filtered.length} 条，按最近编辑时间排序</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>课程名称</th><th>课程类型</th><th>所属专业</th><th>申报教师</th><th>总课时</th><th>编排状态</th><th>上次编辑时间</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${item.id}</span></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.teacher)}</td><td>${item.hours} 课时</td><td>${tag(item.status)}</td><td>${escapeHtml(item.updatedAt)}</td><td><div class="course-actions">${button(item.status === '待编排' ? '开始编排' : item.status === '编排中' ? '继续编排' : '查看', 'content-workbench', `data-id="${item.id}"`)}${item.status === '已完成' ? button('查看编排', 'content-workbench', `data-id="${item.id}"`) : ''}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无课程</strong><span>只有审核通过的完整课程会进入内容编排。</span></div>'}</div>${pagination(filtered.length, '门课程')}</section></div>`;
  const queryId = new URLSearchParams(window.location.search).get('courseId');
  if (queryId && !state.modal) openWorkbench(queryId);
}

function renderResources(page) {
  const filtered = resources.filter(item => !state.resourceFilters.type || item.type === state.resourceFilters.type).filter(item => !state.resourceFilters.major || item.major === state.resourceFilters.major).filter(item => !state.resourceFilters.teacher || item.teacher.includes(state.resourceFilters.teacher)).filter(item => !state.resourceFilters.keyword || item.name.includes(state.resourceFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('教学资源库', '', '<button class="button primary" type="button" data-action="upload-resource">上传资源</button>')}<section class="course-surface"><form class="course-filter" data-form="resource-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('资源类型', selectWithValues('type', ['教学视频', '课件PPT', '乐谱PDF', '音频示范', '其他'], state.resourceFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.resourceFilters.major))}${filterField('上传教师', `<input name="teacher" value="${escapeHtml(state.resourceFilters.teacher || '')}" placeholder="输入教师姓名" />`)}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.resourceFilters.keyword || '')}" placeholder="资源名称" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>资源列表</strong><span> 当前显示 ${filtered.length} 条</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>资源名称</th><th>资源类型</th><th>所属专业</th><th>适用等级</th><th>文件大小</th><th>上传教师</th><th>上传时间</th><th>引用次数</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${item.references ? `已被 ${item.references} 门课程引用` : '暂未被课程引用'}</span></td><td>${tag(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.level)}</td><td>${escapeHtml(item.size)}</td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.uploadedAt)}</td><td>${item.references}</td><td><div class="course-actions">${button('预览', 'resource-preview', `data-id="${item.id}"`)}${button('编辑', 'resource-edit', `data-id="${item.id}"`)}${button('删除', 'resource-delete', `data-id="${item.id}"`, 'danger-link')}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无资源</strong><span>上传教学视频、课件或附件，供课程编排引用。</span></div>'}</div>${pagination(filtered.length, '个资源')}</section></div>`;
}

// CR-2026-025：全部课程页签的行内操作拆分为「查看 / 编辑 / 历史版本」，并新增版本号列。
function syncLibraryVersion(record) {
  ensureVersionTrack(record);
  refreshCurrentSnapshot(record, courseStructureOf(record));
  return courseVersionOf(record);
}
// 承诺类字段变更后统一提交版本：被引用课程生成 v(n+1)，未引用课程直接更新当前版本。
function versionResultMessage(result, base) {
  if (!result || !result.changes.length) return `${base}；未变更承诺类字段，版本保持 v${result?.version || ''}`;
  return result.bumped
    ? `${base}；已生成 v${result.version}，旧版本 v${result.previous} 保留`
    : `${base}；课程未被售卖单元引用，直接更新 v${result.version}，未生成新版本`;
}
function versionNotice(record, references, version) {
  if (!references.count) {
    return `<p class="course-hint course-version-notice">该课程未被在售商品或已展示班级引用：修改承诺类字段（${COURSE_PROMISE_LABELS}）直接更新当前版本 v${version}，不产生新版本。</p>`;
  }
  return `<p class="course-hint course-version-notice">该课程已被 ${escapeHtml(referenceLabel(references))} 引用：保存时若变更承诺类字段（${COURSE_PROMISE_LABELS}），将生成 v${version + 1}，旧版本 v${version} 保留。</p>`;
}
function applyArchiveChange(record, patch, chapters = null) {
  const structure = record.archive === '轻量课程档案' ? null : courseStructure(chapters || courseChaptersOf(record));
  ensureVersionTrack(record);
  refreshCurrentSnapshot(record, structure);
  const before = courseSnapshot(record, structure);
  Object.assign(record, patch);
  const after = courseSnapshot(record, structure);
  const references = courseReferences(record);
  const result = commitCourseVersion(record, { changed: changedPromiseFields(before, after), structure, references });
  // 完整课程的档案字段与课程主体同源，档案改动同步回课程主体，避免两处口径分叉。
  if (record.archive === '完整课程') {
    const course = contentCourses.find((item) => item.id === courseArchiveKey(record));
    if (course) {
      Object.assign(course, { name: record.name, type: record.type, major: record.major, teacher: record.teacher, hours: record.hours, difficulty: record.difficulty, ages: [...record.ages] });
      persistCourse(course);
      persistCourseTeaching(course, { difficulty: record.difficulty, ages: [...record.ages] });
    }
  }
  return result;
}
function libraryRow(item) {
  const key = courseArchiveKey(item);
  const version = syncLibraryVersion(item);
  const references = courseReferences(item);
  const actions = [
    button('查看', 'library-view', `data-id="${item.id}"`),
    button('编辑', 'library-edit', `data-id="${item.id}"`),
    button('历史版本', 'library-versions', `data-id="${item.id}"`),
    item.type === '视频课程' && item.archive === '完整课程' && item.status === '已完成' ? button('发布商品', 'publish-product', `data-id="${item.id}"`) : '',
    item.type === '面授课程' ? button('发布班级', 'publish-class', `data-id="${item.id}"`) : '',
    item.archive === '完整课程' ? button('查看编排', 'library-workbench', `data-id="${item.id}"`) : ''
  ].join('');
  return `<tr><td><span class="primary-cell">${escapeHtml(key || '—')}</span><span class="sub-cell">${item.archive === '完整课程' ? '来源课程主体' : '轻量档案'}</span></td><td><span class="primary-cell">${escapeHtml(item.name)}</span></td><td>${tag(item.archive)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.teacher)}</td><td>${item.hours} 课时</td><td><button type="button" class="text-button course-version-link" data-action="library-versions" data-id="${item.id}">v${version}</button><span class="sub-cell">${escapeHtml(referenceLabel(references))}</span></td><td><div class="course-actions">${actions}</div></td></tr>`;
}

// CR-2026-025：全部课程页签（行内操作拆分为查看 / 编辑 / 历史版本，新增版本号列）。
function renderLibraryAllView(page) {
  const filtered = library.filter(item => !state.libraryFilters.archive || item.archive === state.libraryFilters.archive).filter(item => !state.libraryFilters.type || item.type === state.libraryFilters.type).filter(item => !state.libraryFilters.major || item.major === state.libraryFilters.major).filter(item => !state.libraryFilters.keyword || `${item.name}${item.teacher}`.includes(state.libraryFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('课程库', '', '<button class="button primary" type="button" data-action="new-lightweight">新建轻量课程档案</button>')}<section class="course-surface"><form class="course-filter" data-form="library-filter"><div class="course-filter-head"><strong>筛选条件</strong></div><div class="course-filter-grid">${filterField('课程档案类型', selectWithValues('archive', ['完整课程', '轻量课程档案'], state.libraryFilters.archive || '', '全部类型'))}${filterField('课程类型', selectWithValues('type', ['视频课程', '面授课程'], state.libraryFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.libraryFilters.major))}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.libraryFilters.keyword || '')}" placeholder="课程名称或教师姓名" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>课程档案</strong><span> 当前显示 ${filtered.length} 条</span></div><div class="course-legend"><span class="course-legend-item success">版本号可点击查看历史版本</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>课程编号</th><th>课程名称</th><th>课程档案类型</th><th>课程类型</th><th>所属专业</th><th>申报教师</th><th>总课时</th><th>版本号</th><th>操作</th></tr></thead><tbody>${filtered.map(libraryRow).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无课程档案</strong><span>审核通过并完成编排的完整课程，或新建的轻量档案会出现在这里。</span></div>'}</div>${pagination(filtered.length, '个课程档案')}</section></div>`;
}

// CR-2026-021：课程内容编排并入课程库，一个页面两个视图（内容编排 / 全部课程），视图状态进 URL。
// 2026-09-16：页签名由“待编排”改为“内容编排”；“待编排”仅保留为编排状态取值，不再作为页签名。
function libraryTabBar() {
  const tabs = [['arrange', '内容编排', contentCourses.length], ['all', '全部课程', library.length]];
  return `<div class="course-tabs">${tabs.map(([value, label, count]) => `<button type="button" class="course-tab${state.libraryTab === value ? ' active' : ''}" data-action="library-tab" data-value="${value}">${label} <small>(${count})</small></button>`).join('')}</div>`;
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
  }
  page.innerHTML = holder.innerHTML;
}

// 只读详情：档案字段、版本号与编排摘要，不出现任何可写控件。
function openLibraryView(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  const key = courseArchiveKey(item);
  const version = syncLibraryVersion(item);
  const references = courseReferences(item);
  const chapters = courseChaptersOf(item);
  const outline = String(item.outline || '').trim();
  const structureBlock = item.archive === '完整课程'
    ? (chapters.length
      ? `<ul class="course-version-outline">${chapters.map(chapter => `<li><strong>${escapeHtml(chapter.name)}</strong><small>${(chapter.lessons || []).length} 个课时</small></li>`).join('')}</ul>`
      : '<p class="course-hint">该课程尚未编排章节。</p>')
    : `<div class="course-hint course-rich-text">${richTextToHtml(outline, '未填写课程大纲')}</div>`;
  const current = refreshCurrentSnapshot(item, courseStructureOf(item));
  modal('课程档案详情', `${key} · ${item.name}`, `<div class="course-version-summary"><div><span>当前版本</span><strong>v${version}</strong><small>自建档起单调递增，不因下架或重命名重置</small></div><div><span>引用情况</span><strong>${escapeHtml(referenceLabel(references))}</strong><small>在售商品与已展示班级决定是否生成新版本</small></div></div><section class="course-detail-section wide"><h3>档案字段（只读）</h3><dl class="course-detail-list"><div><dt>课程编号</dt><dd>${escapeHtml(key || '—')}</dd></div><div><dt>课程名称</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>课程档案类型</dt><dd>${escapeHtml(item.archive)}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(item.type)}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(item.major)}</dd></div><div><dt>申报教师</dt><dd>${escapeHtml(item.teacher)}</dd></div><div><dt>总课时</dt><dd>${item.hours} 课时</dd></div><div><dt>难度等级</dt><dd>${escapeHtml(item.difficulty || '未填写')}</dd></div><div><dt>适合年龄</dt><dd>${escapeHtml(courseAgesText(item) || '未填写')}</dd></div>${item.archive === '轻量课程档案' ? `<div class="wide"><dt>简短课程介绍</dt><dd>${escapeHtml(item.detail || '未填写')}</dd></div>` : ''}</dl></section><section class="course-detail-section wide"><h3>编排摘要</h3>${structureBlock}</section><section class="course-detail-section wide"><h3>展示素材</h3><p class="course-hint">课程封面、图文详情、标签与 C 端推荐语按售卖单元维护，本页只读展示，不提供写入入口。</p></section><p class="course-hint">当前版本 v${version} 生成于 ${escapeHtml(current?.at || '—')}，操作人 ${escapeHtml(current?.operator || '—')}，变更字段：${escapeHtml((current?.changes || []).join('、') || '—')}。</p><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button><button class="button" type="button" data-action="library-versions" data-id="${item.id}">历史版本</button><button class="button primary" type="button" data-action="library-edit" data-id="${item.id}">编辑档案</button></div>`, { large: true });
}

// 编辑入口：轻量档案走轻量表单，完整课程走课程档案表单（课程档案类型与课程类型不可改）。
function openLibraryEdit(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  if (item.archive === '轻量课程档案') openLightweightForm(id);
  else openCourseArchiveForm(id);
}

function openCourseArchiveForm(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  const key = courseArchiveKey(item);
  const version = syncLibraryVersion(item);
  const references = courseReferences(item);
  const teacherNames = [...new Set([item.teacher, ...teacherAccounts.map(teacher => teacher.name)].filter(Boolean))];
  const dialog = modal('编辑课程档案', `${key} · ${item.name}`, `<form data-form="course-archive-form" data-id="${item.id}"><div class="course-detail-grid"><div class="course-field"><label>课程编号</label><input class="readonly-field" value="${escapeHtml(key)}" readonly /></div><div class="course-field"><label>课程名称 <span class="sub-cell">必填</span></label><input name="name" required maxlength="30" value="${escapeHtml(item.name)}" /></div><div class="course-field"><label>课程档案类型</label><input class="readonly-field" value="${escapeHtml(item.archive)}" readonly /></div><div class="course-field"><label>课程类型</label><input class="readonly-field" value="${escapeHtml(item.type)}" readonly /></div><div class="course-field"><label>所属专业 <span class="sub-cell">必填</span></label>${professionalFilter('major', item.major)}</div><div class="course-field"><label>申报教师 <span class="sub-cell">必填</span></label><select name="teacher">${teacherNames.map(name => option(name, name === item.teacher)).join('')}</select></div><div class="course-field"><label>总课时 <span class="sub-cell">必填</span></label><input name="hours" type="number" min="1" required value="${item.hours}" /></div><div class="course-field"><label>难度等级 <span class="sub-cell">必填</span></label>${selectWithValues('difficulty', ['启蒙', '初级', '中级', '高级', '考级冲刺'], item.difficulty, '')}</div><div class="course-field wide"><label>适合年龄 <span class="sub-cell">必填</span></label><div class="choice-group">${['全年龄段', '少儿', '青少年', '成人'].map(value => `<label class="choice"><input type="checkbox" name="ages" value="${value}" ${(item.ages || []).includes(value) ? 'checked' : ''} />${value}</label>`).join('')}</div></div></div>${versionNotice(item, references, version)}<div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button" type="button" data-action="library-versions" data-id="${item.id}">历史版本</button><button class="button primary" type="submit">保存档案</button></div></form>`, { large: true });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = String(data.get('name') || '').trim();
    if (!name || !data.get('major') || !data.get('teacher') || Number(data.get('hours')) <= 0) { showToast('请补齐课程名称、所属专业、申报教师和总课时', 'error'); return; }
    if (!data.get('difficulty') || !data.getAll('ages').length) { showToast('请选择难度等级和适合年龄（教学属性必填）', 'error'); return; }
    const result = applyArchiveChange(item, { name, major: data.get('major'), teacher: data.get('teacher'), hours: Number(data.get('hours')), difficulty: data.get('difficulty'), ages: data.getAll('ages') });
    closeModal();
    renderLibrary(root());
    showToast(versionResultMessage(result, '课程档案已保存'));
  });
}

// 历史版本列表：版本号、生成时间、操作人、变更摘要与当前版本标识；不提供差异对比与回退。
function openLibraryVersions(id) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  const key = courseArchiveKey(item);
  syncLibraryVersion(item);
  ensureVersionTrack(item);
  const currentVersion = courseVersionOf(item);
  const rows = [...item.versions].reverse().map(entry => `<tr><td><span class="primary-cell">v${entry.version}</span>${entry.version === currentVersion ? '<span class="sub-cell">当前版本</span>' : ''}</td><td>${escapeHtml(entry.at || '—')}</td><td>${escapeHtml(entry.operator || '—')}</td><td>${escapeHtml((entry.changes || []).join('、') || '—')}</td><td><div class="course-actions">${button(entry.version === currentVersion ? '查看当前版本' : `查看 v${entry.version}`, 'library-version-detail', `data-id="${item.id}" data-version="${entry.version}"`)}</div></td></tr>`).join('');
  modal('历史版本', `${key} · ${item.name}`, `<div class="course-version-summary"><div><span>当前版本</span><strong>v${currentVersion}</strong><small>历史版本整体快照只读</small></div><div><span>引用情况</span><strong>${escapeHtml(referenceLabel(courseReferences(item)))}</strong><small>历史版本可查可回溯</small></div></div><div class="course-table-wrap"><table><thead><tr><th>版本号</th><th>生成时间</th><th>操作人</th><th>变更摘要</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div><p class="course-hint">历史版本不提供字段级差异对比，也不提供版本回退；如需恢复历史内容，请按当前版本手工修改并生成新版本。</p><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button></div>`, { large: true });
}

// 历史版本只读详情：整体快照，可返回版本列表或当前版本。
function openLibraryVersionDetail(id, version) {
  const item = library.find(record => record.id === id);
  if (!item) return;
  syncLibraryVersion(item);
  const entry = (item.versions || []).find(row => row.version === version);
  if (!entry) { showToast('未找到该历史版本', 'error'); return; }
  const snapshot = entry.snapshot || {};
  const currentVersion = courseVersionOf(item);
  const isCurrent = entry.version === currentVersion;
  modal(isCurrent ? '当前版本详情（只读）' : `历史版本详情 v${entry.version}（只读）`, `${courseArchiveKey(item)} · ${item.name}`, `<div class="course-version-summary"><div><span>版本号</span><strong>v${entry.version}</strong><small>${isCurrent ? '当前版本' : '历史版本，永久只读'}</small></div><div><span>生成时间 / 操作人</span><strong>${escapeHtml(entry.at || '—')}</strong><small>${escapeHtml(entry.operator || '—')}</small></div></div><section class="course-detail-section wide"><h3>版本快照</h3><dl class="course-detail-list"><div><dt>课程名称</dt><dd>${escapeHtml(snapshot.name || '—')}</dd></div><div><dt>课程档案类型</dt><dd>${escapeHtml(snapshot.archive || '—')}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(snapshot.type || '—')}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(snapshot.major || '—')}</dd></div><div><dt>申报教师</dt><dd>${escapeHtml(snapshot.teacher || '—')}</dd></div><div><dt>总课时</dt><dd>${escapeHtml(String(snapshot.hours ?? '—'))} 课时</dd></div><div><dt>难度等级</dt><dd>${escapeHtml(snapshot.difficulty || '未填写')}</dd></div><div><dt>适合年龄</dt><dd>${escapeHtml((snapshot.ages || []).join('、') || '未填写')}</dd></div><div class="wide"><dt>编排结构摘要</dt><dd>${escapeHtml(snapshot.structure || '—')}</dd></div><div class="wide"><dt>本版本变更字段</dt><dd>${escapeHtml((entry.changes || []).join('、') || '—')}</dd></div></dl></section><p class="course-hint">历史版本为整体快照，不提供与当前版本的字段级差异对比，也不提供回退入口。</p><div class="course-modal-actions"><button class="button" type="button" data-action="library-versions" data-id="${item.id}">返回版本列表</button><button class="button primary" type="button" data-action="close-modal">关闭</button></div>`, { large: true });
}

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
      const majorNodes = majors.map((major) => `<li class="catalog-tree-node catalog-tree-major"><div class="catalog-tree-row">${caret('', false)}<span class="catalog-tree-copy"><strong>${escapeHtml(major.name)}</strong><small>关联教师 ${major.teachers} · 关联课程 ${major.courses} · 资源引用 ${major.resources}</small></span>${nodeActions('major', major)}</div></li>`).join('');
      const categoryKey = `category:${category.id}`;
      return `<li class="catalog-tree-node catalog-tree-category"><div class="catalog-tree-row">${caret(categoryKey, majors.length > 0)}<button type="button" class="catalog-tree-copy catalog-tree-button" data-action="catalog-select-category" data-value="${escapeHtml(category.name)}"><strong>${escapeHtml(category.name)}</strong><small>${majors.length} 个专业</small></button>${nodeActions('category', category)}</div>${majors.length ? `<ul class="catalog-tree-children"${isOpen(categoryKey) ? '' : ' hidden'}>${majorNodes}</ul>` : ''}</li>`;
    }).join('');
    const groupKey = `group:${group}`;
    return `<li class="catalog-tree-node catalog-tree-group"><div class="catalog-tree-row">${caret(groupKey, categories.length > 0)}<button type="button" class="catalog-tree-copy catalog-tree-button" data-action="catalog-select-group" data-value="${escapeHtml(group)}"><strong>${escapeHtml(group)}</strong><small>${categories.length} 个分类 · ${groupMajors.length} 个专业</small></button>${nodeActions('group', group)}</div>${categories.length ? `<ul class="catalog-tree-children"${isOpen(groupKey) ? '' : ' hidden'}>${categoryNodes}</ul>` : ''}</li>`;
  }).join('');

  const teacherCount = catalog.majors.reduce((sum, item) => sum + item.teachers, 0);
  const courseCount = catalog.majors.reduce((sum, item) => sum + item.courses, 0);
  const resourceCount = catalog.majors.reduce((sum, item) => sum + item.resources, 0);
  page.innerHTML = `<div class="course-page">${pageShell('专业目录维护', '', '<button class="button primary" type="button" data-action="catalog-add" data-type="group">新增目录</button>')}<section class="catalog-panel catalog-tree-panel"><div class="catalog-panel-head"><div><span class="catalog-kicker">CATALOG TREE</span><h2>目录树</h2><p>展开门类查看分类与专业</p></div><div class="catalog-tree-actions"><button class="button" type="button" data-action="catalog-add" data-type="category">新增分类</button><button class="button" type="button" data-action="catalog-add" data-type="major">新增专业</button></div></div><ul class="catalog-tree">${groupNodes}</ul></section></div>`;
}

function openApplicationDetail(id, reviewMode = false) {
  const item = applications.find(record => record.id === id);
  if (!item) return;
  const dialog = modal(reviewMode ? '审批课程申报' : '课程申报详情', `${item.id} · ${item.name}`, `<div class="course-detail-grid"><section class="course-detail-section wide"><h3>教师信息</h3><dl class="course-detail-list"><div><dt>申报教师</dt><dd>${escapeHtml(item.teacher)}</dd></div><div><dt>教师工号</dt><dd>${escapeHtml(item.teacherNo || '—')}</dd></div><div><dt>教学单位</dt><dd>${escapeHtml(item.teacherUnit || '—')}</dd></div><div><dt>职称</dt><dd>${escapeHtml(item.teacherTitle || '—')}</dd></div><div><dt>专业方向</dt><dd>${escapeHtml(item.teacherProfessional || item.major)}</dd></div></dl></section><section class="course-detail-section wide"><h3>课程信息</h3><dl class="course-detail-list"><div><dt>申报编号</dt><dd>${escapeHtml(item.id)}</dd></div><div><dt>派生课程编号</dt><dd>${escapeHtml(applicationCourseId(item))}</dd></div><div><dt>课程名称</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(item.type)}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(item.major)}</dd></div><div><dt>总课时</dt><dd>${item.hours ? `${item.hours} 课时` : '未填写'}</dd></div><div><dt>难度等级</dt><dd>${escapeHtml(item.difficulty || '未填写')}</dd></div><div><dt>适合年龄</dt><dd>${escapeHtml(courseAgesText(item))}</dd></div><div class="wide"><dt>课程简介</dt><dd>${escapeHtml(item.intro)}</dd></div><div><dt>附件</dt><dd>${item.attachment ? escapeHtml(item.attachment) : '未上传附件'}</dd></div><div><dt>申报时间</dt><dd>${escapeHtml(item.submittedAt)}</dd></div></dl></section>${item.review ? `<section class="course-detail-section wide"><h3>审核记录</h3><div class="course-review-box">${tag(item.status)}<p>${escapeHtml(item.review)}</p>${item.reviewedBy ? `<small>审核人：${escapeHtml(item.reviewedBy)} · 审核时间：${escapeHtml(item.reviewedAt || '待记录')}</small>` : ''}</div></section>` : ''}${reviewMode ? `<form class="course-detail-section wide" data-form="application-review-form" data-id="${item.id}"><h3>审核决定</h3><div class="choice-group"><label class="choice"><input type="radio" name="result" value="approved" checked />通过</label><label class="choice"><input type="radio" name="result" value="rejected" />驳回</label></div><div class="course-field" style="margin-top:12px"><label for="review-opinion">审批意见 <span class="sub-cell">驳回时必填</span></label><textarea id="review-opinion" name="opinion" placeholder="填写审批意见或驳回原因">${escapeHtml(item.review || '')}</textarea><p class="course-error" data-error></p></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">提交审批</button></div></form>` : '<div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button></div>'}</div>`, { large: true });
  if (reviewMode) dialog.querySelector('[name=result]').addEventListener('change', event => { const error = dialog.querySelector('[data-error]'); if (event.target.value === 'approved') error.textContent = ''; });
}

function openWorkbench(id) {
  const item = contentCourses.find(record => record.id === id);
  if (!item) return;
  let activeChapter = 0;
  // CR-2026-025：编排结构（章节与课时组成）属承诺类变更，保存时按入口快照比较后提交版本。
  const workbenchLibrary = library.find((record) => courseArchiveKey(record) === toCanonicalCourseId(item.id)) || null;
  const entryStructure = workbenchLibrary ? courseStructure(item.chapters) : null;
  const commitWorkbenchVersion = () => {
    if (!workbenchLibrary || !entryStructure) return null;
    const structure = courseStructure(item.chapters);
    return commitCourseVersion(workbenchLibrary, { changed: entryStructure.key === structure.key ? [] : ['编排结构'], structure });
  };
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
    const videoReady = item.type !== '视频课程' || item.chapters.length > 0 && item.chapters.every(current => current.lessons.length > 0 && current.lessons.every(lesson => lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频')));
    dialog.querySelector('#workbench-content').innerHTML = `${teachingPanel()}<div class="course-workbench"><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>章节结构</h3><p>${item.chapters.length} 个章节 · ${lessonCount} 个课时</p></div><button class="button" type="button" data-workbench="add-chapter">添加章节</button></div><div class="chapter-list">${item.chapters.map((current, index) => `<div class="chapter-item${index === activeChapter ? ' active' : ''}" data-workbench="select-chapter" data-index="${index}"><div><strong>${escapeHtml(current.name)}</strong><small>${current.lessons.length} 个课时 · ${escapeHtml(current.desc || '暂无章节描述')}</small></div><div class="chapter-item-actions"><button type="button" data-workbench="edit-chapter" data-index="${index}" aria-label="编辑章节">编辑</button><button type="button" data-workbench="delete-chapter" data-index="${index}" aria-label="删除章节">删</button></div></div>`).join('') || '<div class="course-empty"><strong>还没有章节</strong><span>先添加章节，再添加课时。</span></div>'}</div></section><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>${chapter ? escapeHtml(chapter.name) : '选择章节'}</h3><p>${chapter ? escapeHtml(chapter.desc || '编辑章节下的课时内容') : '请选择左侧章节'}</p></div>${chapter ? '<button class="button" type="button" data-workbench="add-lesson">添加课时</button>' : ''}</div><div class="lesson-list">${chapter?.lessons.map((lesson, index) => `<article class="lesson-item"><div class="lesson-item-head"><div><h4>${escapeHtml(lesson.name)}</h4><p>${escapeHtml(lesson.target)}</p></div><div class="chapter-item-actions"><button type="button" data-workbench="edit-lesson" data-chapter="${activeChapter}" data-index="${index}">编辑</button><button type="button" data-workbench="delete-lesson" data-chapter="${activeChapter}" data-index="${index}">删</button></div></div><div class="lesson-meta"><span>${lesson.duration} 分钟</span><span>${escapeHtml(lesson.kind)}</span><span>${escapeHtml(lesson.description || '暂无内容描述')}</span></div><div class="lesson-resource"><span class="${item.type === '视频课程' && !lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频') ? 'missing' : ''}">${lesson.resources.length ? lesson.resources.map(resourceId => resources.find(resource => resource.id === resourceId)?.name).join('、') : item.type === '视频课程' ? '未关联视频资源' : '未关联资源（可选）'}</span><button class="button" type="button" data-workbench="resource" data-chapter="${activeChapter}" data-index="${index}">引用资源</button></div></article>`).join('') || '<div class="course-empty"><strong>暂无课时</strong><span>请添加至少一个课时并完成教学目标。</span></div>'}</div></section></div><div class="course-workbench-footer"><div>${item.type === '视频课程' && !videoReady ? '<span class="tag red">视频课程还缺少必填视频资源</span>' : '<span class="tag green">当前结构可保存</span>'}<div class="course-progress"><span style="width:${Math.min(100, item.hours ? Math.round(lessonCount / item.hours * 100) : 0)}%"></span></div></div><div class="toolbar-actions"><button class="button" type="button" data-workbench="save">保存草稿</button>${item.status !== '已完成' ? '<button class="button primary" type="button" data-workbench="complete">完成编排</button>' : ''}</div></div>`;
  };
  dialog.addEventListener('click', event => {
    const target = event.target.closest('[data-workbench]');
    if (!target) return;
    const action = target.dataset.workbench;
    if (action === 'select-chapter') { activeChapter = Number(target.dataset.index); renderWorkbench(); }
    if (action === 'add-chapter' || action === 'edit-chapter') openChapterForm(item, action === 'edit-chapter' ? Number(target.dataset.index) : null, () => { persistCourse(item); renderWorkbench(); });
    if (action === 'delete-chapter') { if (window.confirm('删除章节会同时删除章节下的所有课时，确认继续？')) { item.chapters.splice(Number(target.dataset.index), 1); activeChapter = Math.max(0, activeChapter - 1); persistCourse(item); renderWorkbench(); showToast('章节已删除'); } }
    if (action === 'add-lesson') openLessonForm(item, activeChapter, null, () => { persistCourse(item); renderWorkbench(); });
    if (action === 'edit-lesson') openLessonForm(item, Number(target.dataset.chapter), Number(target.dataset.index), () => { persistCourse(item); renderWorkbench(); });
    if (action === 'delete-lesson') { if (window.confirm('确认删除该课时？')) { item.chapters[Number(target.dataset.chapter)].lessons.splice(Number(target.dataset.index), 1); persistCourse(item); renderWorkbench(); showToast('课时已删除'); } }
    if (action === 'resource') openResourcePicker(item, Number(target.dataset.chapter), Number(target.dataset.index), () => { persistCourse(item); renderWorkbench(); });
    if (action === 'save') { if (!saveTeaching()) return; item.status = '编排中'; item.updatedAt = demoTime(); persistCourse(item); const versionResult = commitWorkbenchVersion(); renderWorkbench(); showToast(versionResult && versionResult.bumped ? `编排草稿已保存；编排结构变更已生成 v${versionResult.version}，v${versionResult.previous} 保留` : '编排草稿已保存'); }
    if (action === 'complete') { if (!saveTeaching()) return;
      const lessons = item.chapters.flatMap(current => current.lessons);
      if (!item.chapters.length || item.chapters.some(current => !current.lessons.length || current.lessons.some(lesson => !lesson.name || !lesson.target || !lesson.duration))) { showToast('请补齐章节和课时必填信息', 'error'); return; }
      // I1-DEC-22: 面授课程校验课时数等于申报总课时；视频课程只校验每个课时都有教学视频。
      if (item.type === '视频课程') {
        const videoReady = item.chapters.every(current => current.lessons.every(lesson => lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频')));
        if (!videoReady) { showToast('视频课程每个课时都必须关联至少一个教学视频', 'error'); return; }
      } else if (lessons.length !== Number(item.hours)) {
        const gap = Number(item.hours) - lessons.length;
        showToast(gap > 0 ? `面授课程课时数需等于申报总课时 ${item.hours} 课时，当前 ${lessons.length} 课时，请再补齐 ${gap} 个课时` : `面授课程课时数需等于申报总课时 ${item.hours} 课时，当前 ${lessons.length} 课时，请删除 ${Math.abs(gap)} 个课时`, 'error');
        return;
      }
      item.status = '已完成';
      item.updatedAt = demoTime();
      persistCourse(item);
      syncLibraryCourse(item);
      const versionResult = commitWorkbenchVersion();
      renderWorkbench();
      renderContent(root());
      showToast(versionResult && versionResult.bumped ? `课程编排已完成，编排结构变更已生成 v${versionResult.version}，v${versionResult.previous} 保留` : '课程编排已完成，可进入课程库');
    }
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

function openLightweightForm(id = null) {
  const current = id ? library.find(item => item.id === id) : { name: '', major: '', hours: 16, detail: '', difficulty: '启蒙', ages: ['少儿'], outline: '' };
  // CR-2026-025：已引用课程保存前提示将生成的版本号与被引用数量。
  const notice = id && current ? versionNotice(current, courseReferences(current), syncLibraryVersion(current)) : '';
  const dialog = modal(id ? '编辑轻量课程档案' : '新建轻量课程档案', '轻量档案只用于快速报名班级，不进入课程内容编排', `<form data-form="lightweight-form" data-id="${id || ''}"><div class="course-detail-grid"><div class="course-field"><label>课程名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="填写课程名称" /></div><div class="course-field"><label>所属专业 <span class="sub-cell">必填</span></label>${professionalFilter('major', current.major)}</div><div class="course-field"><label>课程类型</label><input class="readonly-field" value="面授课程" readonly /></div><div class="course-field"><label>总课时 <span class="sub-cell">必填</span></label><input name="hours" type="number" min="1" required value="${current.hours}" /></div><div class="course-field wide"><label>简短课程介绍 <span class="sub-cell">必填</span></label><textarea name="detail" required placeholder="填写快速报名详情页使用的介绍">${escapeHtml(current.detail)}</textarea></div><div class="course-field"><label>难度等级 <span class="sub-cell">必填</span></label>${selectWithValues('difficulty', ['启蒙', '初级', '中级', '高级', '考级冲刺'], current.difficulty, '')}</div><div class="course-field"><label>适合年龄 <span class="sub-cell">必填</span></label><div class="choice-group">${['全年龄段', '少儿', '青少年', '成人'].map(value => `<label class="choice"><input type="checkbox" name="ages" value="${value}" ${(current.ages || []).includes(value) ? 'checked' : ''} />${value}</label>`).join('')}</div></div><div class="course-field wide"><label>课程大纲 <span class="sub-cell">富文本 · 编排结构参与版本升级</span></label><div class="rich-editor-field" data-rich-editor data-name="outline" data-aria-label="课程大纲" data-placeholder="可选：填写课程大纲，不作为教学执行前置条件（≤2000 字）" data-min-height="160px" data-value="${escapeHtml(current.outline || '')}"></div></div>${notice}<div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button>${id ? `<button class="button" type="button" data-action="library-versions" data-id="${id}">历史版本</button>` : ''}<button class="button primary" type="submit">保存档案</button></div></form>`, { large: true });
  // 课程大纲是富文本字段：与图文详情、教师简介复用同一个编辑器组件。
  mountRichEditor(dialog.querySelector('[data-rich-editor]'));
  dialog.addEventListener('rich-editor:message', event => showToast(event.detail.message, event.detail.kind));
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); if (!data.get('name').trim() || !data.get('major') || !data.get('detail').trim() || Number(data.get('hours')) <= 0) { showToast('请补齐课程名称、专业、介绍和总课时', 'error'); return; } if (!data.get('difficulty') || !data.getAll('ages').length) { showToast('请选择难度等级和适合年龄（教学属性必填）', 'error'); return; } const patch = { name: data.get('name').trim(), major: data.get('major'), hours: Number(data.get('hours')), difficulty: data.get('difficulty'), ages: data.getAll('ages'), detail: data.get('detail').trim(), outline: richTextValue(data.get('outline')) }; if (id) { const result = applyArchiveChange(current, patch); closeModal(); renderLibrary(root()); showToast(versionResultMessage(result, '轻量课程档案已保存')); return; } const record = { id: `LIB-${Date.now()}`, archive: '轻量课程档案', type: '面授课程', teacher: '李教务', ...patch }; library.unshift(record); ensureVersionTrack(record); refreshCurrentSnapshot(record, null); persistLibrary(record); closeModal(); renderLibrary(root()); showToast('轻量课程档案已创建，建档版本 v1'); });
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
  if (action === 'application-tab') { state.applicationTab = target.dataset.value || ''; state.applicationFilters.status = ''; renderApplications(root()); }
  if (action === 'library-tab') {
    state.libraryTab = target.dataset.value === 'all' ? 'all' : 'arrange';
    const url = new URL(location.href);
    url.searchParams.set('tab', state.libraryTab);
    history.replaceState(null, '', url);
    renderLibrary(root());
  }
  if (action === 'export-applications') showToast('列表导出任务已创建，数据将按当前权限脱敏');
  if (action === 'application-detail') openApplicationDetail(target.dataset.id);
  if (action === 'application-review') openApplicationDetail(target.dataset.id, true);
  if (action === 'content-workbench') openWorkbench(target.dataset.id);
  if (action === 'refresh-content') { renderContent(root()); showToast('课程编排列表已刷新'); }
  if (action === 'upload-resource') openResourceForm();
  if (action === 'resource-preview') openResourcePreview(target.dataset.id);
  if (action === 'resource-edit') openResourceForm(target.dataset.id);
  if (action === 'resource-delete') deleteResource(target.dataset.id);
  if (action === 'new-lightweight') openLightweightForm();
  if (action === 'publish-product' || action === 'publish-class') {
    const item = library.find(record => record.id === target.dataset.id);
    const route = action === 'publish-product' ? '/admin/pages/mall/products.html' : '/admin/pages/crm/classes.html';
    if (item?.sourceCourseId) window.location.href = relativePath(`${route}?courseId=${encodeURIComponent(item.sourceCourseId)}`);
  }
  if (action === 'library-view') openLibraryView(target.dataset.id);
  if (action === 'library-edit') openLibraryEdit(target.dataset.id);
  if (action === 'library-versions') openLibraryVersions(target.dataset.id);
  if (action === 'library-version-detail') openLibraryVersionDetail(target.dataset.id, Number(target.dataset.version));
  if (action === 'library-workbench') {
    const item = library.find(record => record.id === target.dataset.id);
    const courseId = item ? courseArchiveKey(item) : '';
    if (courseId) window.location.href = `content.html?courseId=${encodeURIComponent(courseId)}`;
  }
  if (action === 'catalog-add') openCatalogForm(target.dataset.type);
  if (action === 'catalog-tree-toggle') { const key = target.dataset.key; if (state.expandedCatalog.has(key)) state.expandedCatalog.delete(key); else state.expandedCatalog.add(key); renderCatalog(root()); }
  if (action === 'catalog-select-group') { state.selectedGroup = target.dataset.value; state.selectedCategory = catalog.categories.find(item => item.parent === state.selectedGroup)?.name || ''; renderCatalog(root()); }
  if (action === 'catalog-select-category') { state.selectedCategory = target.dataset.value; renderCatalog(root()); }
  if (action === 'catalog-edit') { const type = target.dataset.type; const id = type === 'group' ? target.dataset.value : target.dataset.id; openCatalogForm(type, id); }
  if (action === 'catalog-toggle') toggleCatalog(target.dataset.type, target.dataset.id, target.dataset.value);
  if (action === 'catalog-delete') deleteCatalog(target.dataset.type, target.dataset.id, target.dataset.value);
}

function handleChange(event) {
  if (event.target.matches('[data-action=page-size]')) { state.pageSize = Number(event.target.value); renderPage(); }
}

function handleSubmit(event) {
  const form = event.target;
  if (!form.matches('[data-form]')) return;
  if (form.dataset.form === 'application-filter' || form.dataset.form === 'content-filter' || form.dataset.form === 'resource-filter' || form.dataset.form === 'library-filter') { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); const key = form.dataset.form.replace('-filter', 'Filters').replace('applicationFilters', 'applicationFilters'); if (form.dataset.form === 'application-filter') state.applicationFilters = data; if (form.dataset.form === 'content-filter') state.contentFilters = data; if (form.dataset.form === 'resource-filter') state.resourceFilters = data; if (form.dataset.form === 'library-filter') state.libraryFilters = data; renderPage(); }
  if (form.dataset.form === 'application-review-form') {
    event.preventDefault();
    const result = form.querySelector('[name=result]:checked')?.value;
    const opinion = form.querySelector('[name=opinion]').value.trim();
    const error = form.querySelector('[data-error]');
    if (result === 'rejected' && !opinion) { error.textContent = '驳回时必须填写审批意见或原因'; return; }
    const item = applications.find(record => record.id === form.dataset.id);
    if (!item) return;
    item.status = result === 'approved' ? '已通过' : '已驳回';
    // I1-DEC-20: a single review field is shared by both ends; approval defaults to 审批通过.
    item.review = opinion || '审批通过';
    item.reviewedBy = '教研管理员';
    item.reviewedAt = demoTime();
    persistApplication(item);
    if (result === 'approved') {
      // I1-DEC-21: keyed by application/course id, an existing course entity is reused and updated.
      const targetId = item.courseId || courseIdForApplication(item.id);
      const existing = contentCourses.find(record => record.applicationId === item.id || record.id === targetId);
      const course = existing || courseFromApplication(item);
      if (existing) Object.assign(course, { applicationId: item.id, name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: Number(item.hours) || course.hours });
      else contentCourses.unshift(course);
      persistCourse(course);
    }
    closeModal();
    renderApplications(root());
    showToast(result === 'approved' ? '申报已通过，课程进入编排列表' : '申报已驳回，教师可修改后重新提交');
  }
}

function deleteResource(id) {
  const item = resources.find(record => record.id === id);
  if (!item) return;
  // E-17: referenced resources cannot be physically deleted; unbind them from lessons first.
  const references = Number(item.references || 0);
  if (references > 0) { showToast(`该资源已被 ${references} 门课程引用，请先在课程编排中解除引用后再删除`, 'error'); return; }
  if (window.confirm('该资源暂未被课时引用，确认删除？')) { resources.splice(resources.indexOf(item), 1); removeDemoRecord('resources', id); renderResources(root()); showToast('资源已删除'); }
}

function toggleCatalog(type, id, value) {
  if (type === 'group') { catalog.groupStatus[value] = catalog.groupStatus[value] === '启用' ? '停用' : '启用'; renderCatalog(root()); showToast(`${value}已${catalog.groupStatus[value]}`); return; }
  const collection = type === 'category' ? catalog.categories : catalog.majors;
  const item = collection.find(record => record.id === id);
  if (item) { item.status = item.status === '启用' ? '停用' : '启用'; renderCatalog(root()); showToast(`${item.name}已${item.status}`); }
}

function deleteCatalog(type, id, value) {
  if (type === 'group') {
    const childCount = catalog.categories.filter(item => item.parent === value).length;
    if (childCount) { showToast(`该门类下还有${childCount}个分类，不可删除`, 'error'); return; }
    if (window.confirm(`确认删除门类“${value}”？`)) { delete professionalTree[value]; delete catalog.groupStatus[value]; renderCatalog(root()); showToast('门类已删除'); }
    return;
  }
  if (type === 'category') {
    const item = catalog.categories.find(record => record.id === id);
    if (!item) return;
    const childCount = catalog.majors.filter(record => record.parent === item.name).length;
    if (childCount) { showToast(`该分类下还有${childCount}个专业，不可删除`, 'error'); return; }
    if (window.confirm(`确认删除分类“${item.name}”？`)) { catalog.categories.splice(catalog.categories.indexOf(item), 1); renderCatalog(root()); showToast('分类已删除'); }
    return;
  }
  const item = catalog.majors.find(record => record.id === id);
  if (!item) return;
  if (item.teachers || item.courses || item.resources) { showToast('该专业已被引用，不可删除', 'error'); return; }
  if (window.confirm(`确认删除专业“${item.name}”？`)) { catalog.majors.splice(catalog.majors.indexOf(item), 1); renderCatalog(root()); showToast('专业已删除'); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
