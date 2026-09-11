import { relativePath } from './paths.js';
import { demoId, demoTime, readDemoState, removeDemoRecord, updateDemoRecord, upsertDemoRecord } from './demo-store.js';

const courseRoot = document.querySelector('[data-course-page]');

const professionalTree = {
  '音乐类': { '声乐': ['声乐演唱', '童声合唱'], '器乐': ['钢琴', '古筝'] },
  '舞蹈类': { '舞蹈表演': ['中国舞', '芭蕾舞'], '舞蹈编导': ['舞蹈编导'] },
  '美术类': { '绘画': ['中国画', '少儿绘画'], '设计': ['视觉传达设计'] },
  '戏剧类': { '表演': ['戏剧表演', '朗诵与主持'] }
};

const applications = [
  { id: 'CR-2026-0001', name: '舞蹈基本功', type: '面授课程', teacher: '王玥', major: '中国舞', submittedAt: '2026-09-08 09:14', status: '审核中', intro: '从身体控制、节奏训练到基本舞姿，建立少儿中国舞的基础训练体系。', hours: 16, attachment: '课程申报说明.pdf', teacherInfo: '王玥 · 本科 · 舞蹈学 · 武汉艺术培训中心 · 8年教龄', review: '' },
  { id: 'CR-2026-0002', name: '声乐演唱技巧', type: '视频课程', teacher: '陈晨', major: '声乐演唱', submittedAt: '2026-09-07 15:36', status: '已通过', intro: '围绕气息、共鸣、咬字与作品处理，帮助学习者建立完整演唱方法。', hours: 12, attachment: '声乐课程大纲.docx', teacherInfo: '陈晨 · 硕士 · 音乐表演 · 湖北艺术职业学院 · 10年教龄', review: '课程目标清晰，建议按章节补充示范视频。' },
  { id: 'CR-2026-0003', name: '少儿国画入门', type: '面授课程', teacher: '李青', major: '中国画', submittedAt: '2026-09-06 11:20', status: '审核中', intro: '以笔墨体验和传统题材临摹为主，适合零基础少儿建立国画兴趣。', hours: 20, attachment: '', teacherInfo: '李青 · 本科 · 美术教育 · 武汉美术馆 · 6年教龄', review: '' },
  { id: 'CR-2026-0004', name: '古筝基础与乐曲赏析', type: '视频课程', teacher: '周宁', major: '古筝', submittedAt: '2026-09-05 16:08', status: '已驳回', intro: '从坐姿、指法、节拍到入门乐曲，配合慢速示范建立演奏习惯。', hours: 10, attachment: '古筝课程说明.pdf', teacherInfo: '周宁 · 本科 · 古筝 · 湖北艺术职业学院 · 5年教龄', review: '需补充课程适用年龄和完整课时规划后重新提交。' },
  { id: 'CR-2026-0005', name: '戏剧表演基础', type: '面授课程', teacher: '赵可', major: '戏剧表演', submittedAt: '2026-09-03 10:32', status: '草稿', intro: '通过台词、形体、即兴练习建立舞台表达与团队协作能力。', hours: 16, attachment: '', teacherInfo: '赵可 · 硕士 · 戏剧影视表演 · 武汉传媒学院 · 7年教龄', review: '' },
  { id: 'CR-2026-0006', name: '青少年芭蕾基础', type: '面授课程', teacher: '王玥', major: '芭蕾舞', submittedAt: '2026-08-28 14:12', status: '已撤销', intro: '面向青少年设计的芭蕾基础训练，重视体态、柔韧与节奏感。', hours: 18, attachment: '', teacherInfo: '王玥 · 本科 · 舞蹈学 · 武汉艺术培训中心 · 8年教龄', review: '教师主动撤销申报。' }
];

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

const library = [
  { id: 'LIB-001', sourceCourseId: 'COURSE-002', name: '声乐演唱技巧', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 12, status: '已完成', cover: '已配置', difficulty: '中级', ages: ['青少年', '成人'], detail: '围绕气息、共鸣、咬字与作品处理，建立完整演唱方法。', tags: ['声乐', '发声'], recommendation: '跟着示范练习，建立稳定发声习惯。' },
  { id: 'LIB-006', sourceCourseId: 'COURSE-006', name: '艺术歌曲示范课', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 8, status: '已完成', cover: '已配置', difficulty: '中级', ages: ['成人'], detail: '通过经典艺术歌曲示范，学习作品分析、咬字和情感表达。', tags: ['艺术歌曲', '示范'], recommendation: '先听懂作品，再练习表达。' },
  { id: 'LIB-002', sourceCourseId: 'COURSE-001', name: '舞蹈基本功', archive: '完整课程', type: '面授课程', major: '中国舞', teacher: '王玥', hours: 16, status: '已完成', cover: '已配置', difficulty: '初级', ages: ['少儿'], detail: '从身体控制、节奏训练到基本舞姿，建立少儿中国舞的基础训练体系。', tags: ['中国舞', '基础'], recommendation: '从每一次站立开始建立身体控制。' },
  { id: 'LIB-003', sourceCourseId: 'LIB-003', name: '少儿美术兴趣班', archive: '轻量课程档案', type: '面授课程', major: '少儿绘画', teacher: '李青', hours: 20, status: '不适用', cover: '未配置', difficulty: '启蒙', ages: ['少儿'], detail: '以主题创作和材料体验激发少儿绘画兴趣。', tags: ['美术', '少儿'], recommendation: '让孩子在创作中发现自己的表达方式。' },
  { id: 'LIB-004', sourceCourseId: 'LIB-004', name: '朗诵与主持基础', archive: '轻量课程档案', type: '面授课程', major: '朗诵与主持', teacher: '赵可', hours: 16, status: '不适用', cover: '未配置', difficulty: '初级', ages: ['青少年'], detail: '训练普通话、气息和舞台表达，适合青少年入门。', tags: ['戏剧', '表达'], recommendation: '用声音和表情讲好每一个故事。' },
  { id: 'LIB-005', sourceCourseId: 'LIB-005', name: '古筝入门体验课', archive: '轻量课程档案', type: '面授课程', major: '古筝', teacher: '周宁', hours: 8, status: '不适用', cover: '未配置', difficulty: '启蒙', ages: ['少儿', '成人'], detail: '通过基础指法和短曲体验，帮助学员认识古筝。', tags: ['古筝', '体验'], recommendation: '一节课认识古筝，也认识音乐的乐趣。' }
];

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

const sharedDemo = readDemoState();
const appendShared = (target, records) => (records || []).filter(record => !target.some(item => item.id === record.id)).forEach(record => target.push(record));
appendShared(applications, sharedDemo.applications);
appendShared(contentCourses, sharedDemo.courses);
appendShared(resources, sharedDemo.resources);
appendShared(library, sharedDemo.library);
function applicationCourseId(item) {
  return !item.courseId || item.courseId === 'COURSE-NEW' ? `COURSE-${item.id}` : item.courseId;
}
function persistApplication(item) { upsertDemoRecord('applications', { ...item, courseId: applicationCourseId(item) }); }
function persistCourse(item) { upsertDemoRecord('courses', item); }
function persistLibrary(item) { upsertDemoRecord('library', item); }
function persistResource(item) { upsertDemoRecord('resources', item); }
function courseFromApplication(item) {
  return { id: applicationCourseId(item), applicationId: item.id, name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: Number(item.hours) || 1, status: '待编排', updatedAt: demoTime(), chapters: [] };
}
function syncLibraryCourse(item) {
  const existing = library.find(record => record.sourceCourseId === item.id);
  const record = existing || { id: `LIB-${item.id}`, sourceCourseId: item.id, archive: '完整课程', name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: item.hours, status: '已完成', cover: '未配置', difficulty: '初级', ages: ['全年龄段'], detail: '', tags: [], recommendation: '' };
  Object.assign(record, { sourceCourseId: item.id, name: item.name, type: item.type, major: item.major, teacher: item.teacher, hours: item.hours, status: '已完成' });
  if (!existing) library.unshift(record);
  persistLibrary(record);
}

const state = { page: courseRoot?.dataset.coursePage || '', applicationTab: '审核中', applicationFilters: {}, contentFilters: {}, resourceFilters: {}, libraryFilters: {}, selectedGroup: '音乐类', selectedCategory: '声乐', pageSize: 20, modal: null };

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const root = () => document.querySelector('#course-root');
const option = (value, selected = false) => `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(value)}</option>`;
const statusClass = status => ({ '审核中': 'brand', '草稿': 'gray', '已通过': 'green', '已驳回': 'red', '已撤销': 'gray', '待编排': 'gray', '编排中': 'amber', '已完成': 'green', '不适用': 'gray', '启用': 'green', '停用': 'gray' }[status] || 'brand');
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
const pageShell = (title, description, actions = '') => `<div class="page-head"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="toolbar-actions">${actions}</div></div>`;
const filterField = (label, input) => `<div class="course-field"><label>${escapeHtml(label)}</label>${input}</div>`;
const select = (name, values, selected = '', allLabel = '全部') => `<select name="${name}">${allLabel ? option('', selected === '') .replace('</option>', `>${allLabel}</option>`) : ''}${values.map(value => option(value, selected === value)).join('')}</select>`;
const selectWithValues = (name, values, selected = '', allLabel = '全部') => `<select name="${name}">${allLabel ? `<option value="">${allLabel}</option>` : ''}${values.map(value => option(value, selected === value)).join('')}</select>`;
const professionalFilter = (name, selected = '') => `<select name="${name}"><option value="">全部专业</option>${catalog.majors.map(item => option(item.name, item.name === selected)).join('')}</select>`;
const pagination = (count, label = '条记录') => `<div class="course-pagination"><span>共 ${count} ${label}，当前显示全部演示数据</span><div class="course-pagination-controls"><label for="page-size">每页</label><select id="page-size" data-action="page-size"><option value="10"${state.pageSize === 10 ? ' selected' : ''}>10条</option><option value="20"${state.pageSize === 20 ? ' selected' : ''}>20条</option><option value="50"${state.pageSize === 50 ? ' selected' : ''}>50条</option></select><button class="button" type="button" disabled>上一页</button><button class="button" type="button" disabled>下一页</button></div></div>`;

function init() {
  if (!courseRoot) return;
  renderPage();
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('submit', handleSubmit);
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
  const tabs = ['审核中', '已处理', '全部申报'];
  const tabRecords = state.applicationTab === '审核中' ? applications.filter(item => item.status === '审核中') : state.applicationTab === '已处理' ? applications.filter(item => ['已通过', '已驳回'].includes(item.status)) : applications;
  const filtered = tabRecords.filter(item => !state.applicationFilters.teacher || item.teacher.includes(state.applicationFilters.teacher)).filter(item => !state.applicationFilters.major || item.major === state.applicationFilters.major).filter(item => !state.applicationFilters.keyword || `${item.name}${item.id}`.includes(state.applicationFilters.keyword)).filter(item => !state.applicationFilters.status || item.status === state.applicationFilters.status);
  page.innerHTML = `<div class="course-page">${pageShell('课程申报', '结构化接收教师课程申报，完成教研审核后进入内容编排。', '<button class="button" type="button" data-action="export-applications">导出列表</button>')}<div class="course-summary"><div class="course-summary-item brand"><strong>${applications.filter(item => item.status === '审核中').length}</strong><span>待审核申报</span></div><div class="course-summary-item success"><strong>${applications.filter(item => item.status === '已通过').length}</strong><span>已通过</span></div><div class="course-summary-item warning"><strong>${applications.filter(item => item.status === '已驳回').length}</strong><span>需修改</span></div><div class="course-summary-item"><strong>${applications.length}</strong><span>全部申报</span></div></div><section class="course-surface"><div class="course-tabs">${tabs.map(tabName => `<button type="button" class="course-tab${state.applicationTab === tabName ? ' active' : ''}" data-action="application-tab" data-value="${tabName}">${tabName} <small>(${state.applicationTab === tabName ? filtered.length : applications.filter(item => tabName === '审核中' ? item.status === '审核中' : tabName === '已处理' ? ['已通过', '已驳回'].includes(item.status) : true).length})</small></button>`).join('')}</div><form class="course-filter" data-form="application-filter"><div class="course-filter-head"><strong>筛选条件</strong><span>审核中按申报时间倒序，已处理按审批结果查看</span></div><div class="course-filter-grid">${filterField('申报教师', `<input name="teacher" value="${escapeHtml(state.applicationFilters.teacher || '')}" placeholder="输入教师姓名" />`)}${filterField('所属专业', professionalFilter('major', state.applicationFilters.major))}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.applicationFilters.keyword || '')}" placeholder="课程名称或申报编号" />`)}${filterField('申报状态', selectWithValues('status', ['草稿', '审核中', '已通过', '已驳回', '已撤销'], state.applicationFilters.status || '', '全部状态'))}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>申报列表</strong><span> 当前显示 ${filtered.length} 条</span></div><div class="course-legend"><span class="course-legend-item">审批中</span><span class="course-legend-item success">可进入编排</span><span class="course-legend-item warning">需修改</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>申报编号</th><th>课程名称</th><th>课程类型</th><th>申报教师</th><th>所属专业</th><th>申报时间</th><th>申报状态</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td>${item.id}</td><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${escapeHtml(item.intro.slice(0, 28))}…</span></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.submittedAt)}</td><td>${tag(item.status)}</td><td><div class="course-actions">${button('查看详情', 'application-detail', `data-id="${item.id}"`)}${item.status === '审核中' ? button('审批', 'application-review', `data-id="${item.id}"`) : ''}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无申报数据</strong><span>调整筛选条件后重试，或等待教师提交新的课程申报。</span></div>'}</div>${pagination(filtered.length)}</section></div>`;
}

function renderContent(page) {
  const filtered = contentCourses.filter(item => !state.contentFilters.status || item.status === state.contentFilters.status).filter(item => !state.contentFilters.type || item.type === state.contentFilters.type).filter(item => !state.contentFilters.major || item.major === state.contentFilters.major).filter(item => !state.contentFilters.keyword || `${item.name}${item.teacher}`.includes(state.contentFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('课程内容编排', '维护完整课程的章节、课时与教学资源，保存后直接生效。', '<button class="button" type="button" data-action="refresh-content">刷新列表</button>')}<div class="course-summary"><div class="course-summary-item"><strong>${contentCourses.length}</strong><span>完整课程</span></div><div class="course-summary-item warning"><strong>${contentCourses.filter(item => item.status === '待编排').length}</strong><span>待编排</span></div><div class="course-summary-item brand"><strong>${contentCourses.filter(item => item.status === '编排中').length}</strong><span>编排中</span></div><div class="course-summary-item success"><strong>${contentCourses.filter(item => item.status === '已完成').length}</strong><span>已完成</span></div></div><section class="course-surface"><form class="course-filter" data-form="content-filter"><div class="course-filter-head"><strong>筛选条件</strong><span>轻量课程档案不进入此列表</span></div><div class="course-filter-grid">${filterField('编排状态', selectWithValues('status', ['待编排', '编排中', '已完成'], state.contentFilters.status || '', '全部状态'))}${filterField('课程类型', selectWithValues('type', ['视频课程', '面授课程'], state.contentFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.contentFilters.major))}${filterField('申报教师', `<input name="keyword" value="${escapeHtml(state.contentFilters.keyword || '')}" placeholder="课程名称或教师姓名" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>待编排课程</strong><span> 共 ${filtered.length} 条，按最近编辑时间排序</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>课程名称</th><th>课程类型</th><th>所属专业</th><th>申报教师</th><th>总课时</th><th>编排状态</th><th>上次编辑时间</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${item.id}</span></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.teacher)}</td><td>${item.hours} 课时</td><td>${tag(item.status)}</td><td>${escapeHtml(item.updatedAt)}</td><td><div class="course-actions">${button(item.status === '待编排' ? '开始编排' : item.status === '编排中' ? '继续编排' : '查看', 'content-workbench', `data-id="${item.id}"`)}${item.status === '已完成' ? button('查看编排', 'content-workbench', `data-id="${item.id}"`) : ''}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无课程</strong><span>只有审核通过的完整课程会进入内容编排。</span></div>'}</div>${pagination(filtered.length, '门课程')}</section></div>`;
  const queryId = new URLSearchParams(window.location.search).get('courseId');
  if (queryId && !state.modal) openWorkbench(queryId);
}

function renderResources(page) {
  const filtered = resources.filter(item => !state.resourceFilters.type || item.type === state.resourceFilters.type).filter(item => !state.resourceFilters.major || item.major === state.resourceFilters.major).filter(item => !state.resourceFilters.teacher || item.teacher.includes(state.resourceFilters.teacher)).filter(item => !state.resourceFilters.keyword || item.name.includes(state.resourceFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('教学资源库', '统一管理课程视频、课件和附件资源，支持预览与课程引用。', '<button class="button primary" type="button" data-action="upload-resource">上传资源</button>')}<div class="course-summary"><div class="course-summary-item"><strong>${resources.length}</strong><span>全部资源</span></div><div class="course-summary-item brand"><strong>${resources.filter(item => item.type === '教学视频').length}</strong><span>教学视频</span></div><div class="course-summary-item success"><strong>${resources.filter(item => ['课件PPT', '乐谱PDF'].includes(item.type)).length}</strong><span>课件与谱例</span></div><div class="course-summary-item warning"><strong>${resources.filter(item => item.references === 0).length}</strong><span>未被引用</span></div></div><section class="course-surface"><form class="course-filter" data-form="resource-filter"><div class="course-filter-head"><strong>筛选条件</strong><span>按上传时间倒序 · 视频≤500MB，其他文件≤50MB</span></div><div class="course-filter-grid">${filterField('资源类型', selectWithValues('type', ['教学视频', '课件PPT', '乐谱PDF', '音频示范', '其他'], state.resourceFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.resourceFilters.major))}${filterField('上传教师', `<input name="teacher" value="${escapeHtml(state.resourceFilters.teacher || '')}" placeholder="输入教师姓名" />`)}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.resourceFilters.keyword || '')}" placeholder="资源名称" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>资源列表</strong><span> 当前显示 ${filtered.length} 条</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>资源名称</th><th>资源类型</th><th>所属专业</th><th>适用等级</th><th>文件大小</th><th>上传教师</th><th>上传时间</th><th>引用次数</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${item.references ? `已被 ${item.references} 门课程引用` : '暂未被课程引用'}</span></td><td>${tag(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.level)}</td><td>${escapeHtml(item.size)}</td><td>${escapeHtml(item.teacher)}</td><td>${escapeHtml(item.uploadedAt)}</td><td>${item.references}</td><td><div class="course-actions">${button('预览', 'resource-preview', `data-id="${item.id}"`)}${button('编辑', 'resource-edit', `data-id="${item.id}"`)}${button('删除', 'resource-delete', `data-id="${item.id}"`, 'danger-link')}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无资源</strong><span>上传教学视频、课件或附件，供课程编排引用。</span></div>'}</div>${pagination(filtered.length, '个资源')}</section></div>`;
}

function renderLibrary(page) {
  const filtered = library.filter(item => !state.libraryFilters.archive || item.archive === state.libraryFilters.archive).filter(item => !state.libraryFilters.type || item.type === state.libraryFilters.type).filter(item => !state.libraryFilters.major || item.major === state.libraryFilters.major).filter(item => !state.libraryFilters.keyword || `${item.name}${item.teacher}`.includes(state.libraryFilters.keyword));
  page.innerHTML = `<div class="course-page">${pageShell('课程库', '统一管理完整课程和轻量课程档案，维护学员端展示信息。', '<button class="button primary" type="button" data-action="new-lightweight">新建轻量课程档案</button>')}<div class="course-summary"><div class="course-summary-item"><strong>${library.length}</strong><span>课程档案</span></div><div class="course-summary-item success"><strong>${library.filter(item => item.archive === '完整课程').length}</strong><span>完整课程</span></div><div class="course-summary-item brand"><strong>${library.filter(item => item.archive === '轻量课程档案').length}</strong><span>轻量课程档案</span></div><div class="course-summary-item warning"><strong>${library.filter(item => item.cover === '未配置').length}</strong><span>待完善展示信息</span></div></div><section class="course-surface"><form class="course-filter" data-form="library-filter"><div class="course-filter-head"><strong>筛选条件</strong><span>完整课程需完成编排，轻量档案只用于快速报名班级</span></div><div class="course-filter-grid">${filterField('课程档案类型', selectWithValues('archive', ['完整课程', '轻量课程档案'], state.libraryFilters.archive || '', '全部类型'))}${filterField('课程类型', selectWithValues('type', ['视频课程', '面授课程'], state.libraryFilters.type || '', '全部类型'))}${filterField('所属专业', professionalFilter('major', state.libraryFilters.major))}${filterField('关键词', `<input name="keyword" value="${escapeHtml(state.libraryFilters.keyword || '')}" placeholder="课程名称或教师姓名" />`)}</div><div class="course-filter-actions"><button class="button" type="reset">重置</button><button class="button primary" type="submit">查询</button></div></form><div class="course-table-head"><div><strong>课程档案</strong><span> 当前显示 ${filtered.length} 条</span></div></div><div class="course-table-wrap">${filtered.length ? `<table><thead><tr><th>课程名称</th><th>课程档案类型</th><th>课程类型</th><th>所属专业</th><th>申报教师</th><th>总课时</th><th>编排状态</th><th>操作</th></tr></thead><tbody>${filtered.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">展示信息：${item.cover === '已配置' ? '已配置' : '待完善'}</span></td><td>${tag(item.archive)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.major)}</td><td>${escapeHtml(item.teacher)}</td><td>${item.hours} 课时</td><td>${tag(item.status)}</td><td><div class="course-actions">${item.type === '视频课程' && item.archive === '完整课程' && item.status === '已完成' ? button('发布商品', 'publish-product', `data-id="${item.id}"`) : ''}${item.type === '面授课程' ? button('发布班级', 'publish-class', `data-id="${item.id}"`) : ''}${button(item.archive === '完整课程' ? '查看编排' : '查看/编辑', 'library-edit', `data-id="${item.id}"`)}</div></td></tr>`).join('')}</tbody></table>` : '<div class="course-empty"><strong>暂无课程档案</strong><span>审核通过并完成编排的完整课程，或新建的轻量档案会出现在这里。</span></div>'}</div>${pagination(filtered.length, '个课程档案')}</section></div>`;
}

function renderCatalog(page) {
  const groups = Object.keys(professionalTree);
  if (!groups.includes(state.selectedGroup)) state.selectedGroup = groups[0] || '';
  const categories = catalog.categories.filter(item => item.parent === state.selectedGroup);
  if (!categories.some(item => item.name === state.selectedCategory)) state.selectedCategory = categories[0]?.name || '';
  const majors = catalog.majors.filter(item => item.parent === state.selectedCategory && item.group === state.selectedGroup);
  const groupMarkup = groups.map(group => `<div class="catalog-list-item catalog-group-item${state.selectedGroup === group ? ' active' : ''}"><button type="button" class="catalog-select-button" data-action="catalog-select-group" data-value="${escapeHtml(group)}"><span class="catalog-item-copy"><strong>${escapeHtml(group)}</strong><small>${catalog.categories.filter(item => item.parent === group).length} 个分类</small></span><span class="catalog-item-count">${catalog.majors.filter(item => item.group === group).length}</span></button><div class="catalog-item-actions">${button('编辑', 'catalog-edit', `data-type="group" data-value="${escapeHtml(group)}"`)}${button(catalog.groupStatus[group] === '启用' ? '停用' : '启用', 'catalog-toggle', `data-type="group" data-value="${escapeHtml(group)}"`, catalog.groupStatus[group] === '启用' ? 'danger-link' : '')}${button('删除', 'catalog-delete', `data-type="group" data-value="${escapeHtml(group)}"`, 'danger-link')}</div></div>`).join('');
  const categoryMarkup = categories.map(item => `<div class="catalog-list-item catalog-category-item${state.selectedCategory === item.name ? ' active' : ''}"><button type="button" class="catalog-select-button" data-action="catalog-select-category" data-value="${escapeHtml(item.name)}"><span class="catalog-item-copy"><strong>${escapeHtml(item.name)}</strong><small>${catalog.majors.filter(major => major.parent === item.name).length} 个专业</small></span><span class="catalog-item-status">${tag(item.status)}</span></button><div class="catalog-item-actions">${button('编辑', 'catalog-edit', `data-type="category" data-id="${item.id}"`)}${button(item.status === '启用' ? '停用' : '启用', 'catalog-toggle', `data-type="category" data-id="${item.id}"`, item.status === '启用' ? 'danger-link' : '')}${button('删除', 'catalog-delete', `data-type="category" data-id="${item.id}"`, 'danger-link')}</div></div>`).join('') || '<div class="course-empty catalog-empty"><strong>暂无分类</strong><span>为当前门类新增分类。</span><button class="button" type="button" data-action="catalog-add" data-type="category">新增分类</button></div>';
  const majorMarkup = majors.map(item => `<tr><td><span class="primary-cell">${escapeHtml(item.name)}</span><span class="sub-cell">${escapeHtml(item.parent)}</span></td><td>${item.teachers}</td><td>${item.courses}</td><td>${item.resources}</td><td>${tag(item.status)}</td><td><div class="course-actions">${button('编辑', 'catalog-edit', `data-type="major" data-id="${item.id}"`)}${button(item.status === '启用' ? '停用' : '启用', 'catalog-toggle', `data-type="major" data-id="${item.id}"`, item.status === '启用' ? 'danger-link' : '')}${button('删除', 'catalog-delete', `data-type="major" data-id="${item.id}"`, 'danger-link')}</div></td></tr>`).join('') || '<tr><td colspan="6"><div class="course-empty"><strong>当前分类暂无专业</strong><span>新增专业后，它会出现在当前分类下。</span><button class="button" type="button" data-action="catalog-add" data-type="major">新增专业</button></div></td></tr>';
  const teacherCount = majors.reduce((sum, item) => sum + item.teachers, 0);
  const courseCount = majors.reduce((sum, item) => sum + item.courses, 0);
  const resourceCount = majors.reduce((sum, item) => sum + item.resources, 0);
  page.innerHTML = `<div class="course-page">${pageShell('专业目录维护', '维护门类、分类、专业三级目录，供教师、课程和资源统一引用。', '<button class="button primary" type="button" data-action="catalog-add" data-type="group">新增目录</button>')}<div class="course-summary"><div class="course-summary-item"><strong>${groups.length}</strong><span>门类</span></div><div class="course-summary-item"><strong>${catalog.categories.length}</strong><span>分类</span></div><div class="course-summary-item brand"><strong>${catalog.majors.length}</strong><span>专业</span></div><div class="course-summary-item success"><strong>${catalog.majors.filter(item => item.status === '启用').length}</strong><span>启用专业</span></div></div><div class="catalog-breadcrumb"><span>专业目录</span><i>/</i><strong>${escapeHtml(state.selectedGroup || '未选择门类')}</strong><i>/</i><strong>${escapeHtml(state.selectedCategory || '未选择分类')}</strong></div><div class="catalog-layout"><section class="catalog-panel catalog-level-panel"><div class="catalog-panel-head"><div><span class="catalog-kicker">LEVEL 01</span><h2>门类</h2><p>小程序课程一级分类</p></div><button class="button" type="button" data-action="catalog-add" data-type="group">新增</button></div><div class="catalog-list">${groupMarkup}</div></section><section class="catalog-panel catalog-level-panel"><div class="catalog-panel-head"><div><span class="catalog-kicker">LEVEL 02</span><h2>分类</h2><p>${escapeHtml(state.selectedGroup || '请选择门类')} 下的二级分类</p></div><button class="button" type="button" data-action="catalog-add" data-type="category">新增</button></div><div class="catalog-list">${categoryMarkup}</div></section><section class="catalog-panel catalog-detail-panel"><div class="catalog-panel-head"><div><span class="catalog-kicker">LEVEL 03</span><h2>专业</h2><p>${escapeHtml(state.selectedCategory || '请选择分类')} 下的专业目录</p></div><button class="button" type="button" data-action="catalog-add" data-type="major">新增专业</button></div><div class="catalog-detail-summary"><div><span>当前专业</span><strong>${majors.length}</strong></div><div><span>关联教师</span><strong>${teacherCount}</strong></div><div><span>关联课程</span><strong>${courseCount}</strong></div><div><span>资源引用</span><strong>${resourceCount}</strong></div></div><div class="course-table-wrap catalog-table"><table><thead><tr><th>专业名称</th><th>关联教师</th><th>关联课程</th><th>资源引用</th><th>状态</th><th>操作</th></tr></thead><tbody>${majorMarkup}</tbody></table></div></section></div></div>`;
}

function openApplicationDetail(id, reviewMode = false) {
  const item = applications.find(record => record.id === id);
  if (!item) return;
  const dialog = modal(reviewMode ? '审批课程申报' : '课程申报详情', `${item.id} · ${item.name}`, `<div class="course-detail-grid"><section class="course-detail-section wide"><h3>教师信息</h3><dl class="course-detail-list"><div><dt>申报教师</dt><dd>${escapeHtml(item.teacher)}</dd></div><div><dt>联系方式</dt><dd>138****4921</dd></div><div><dt>教学单位</dt><dd>${escapeHtml(item.teacherInfo.split(' · ')[3] || '湖北艺术职业学院')}</dd></div><div><dt>专业方向</dt><dd>${escapeHtml(item.major)}</dd></div></dl></section><section class="course-detail-section wide"><h3>课程信息</h3><dl class="course-detail-list"><div><dt>课程名称</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>课程类型</dt><dd>${escapeHtml(item.type)}</dd></div><div><dt>所属专业</dt><dd>${escapeHtml(item.major)}</dd></div><div><dt>总课时</dt><dd>${item.hours ? `${item.hours} 课时` : '未填写'}</dd></div><div class="wide"><dt>课程简介</dt><dd>${escapeHtml(item.intro)}</dd></div><div><dt>附件</dt><dd>${item.attachment ? escapeHtml(item.attachment) : '未上传附件'}</dd></div><div><dt>申报时间</dt><dd>${escapeHtml(item.submittedAt)}</dd></div></dl></section>${item.review ? `<section class="course-detail-section wide"><h3>审核记录</h3><div class="course-review-box">${tag(item.status)}<p>${escapeHtml(item.review)}</p>${item.reviewedBy ? `<small>审核人：${escapeHtml(item.reviewedBy)} · 审核时间：${escapeHtml(item.reviewedAt || '待记录')}</small>` : ''}</div></section>` : ''}${reviewMode ? `<form class="course-detail-section wide" data-form="application-review-form" data-id="${item.id}"><h3>审核决定</h3><div class="choice-group"><label class="choice"><input type="radio" name="result" value="approved" checked />通过</label><label class="choice"><input type="radio" name="result" value="rejected" />驳回</label></div><div class="course-field" style="margin-top:12px"><label for="review-opinion">审批意见 <span class="sub-cell">驳回时必填</span></label><textarea id="review-opinion" name="opinion" placeholder="填写审批意见或驳回原因">${escapeHtml(item.review || '')}</textarea><p class="course-error" data-error></p></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">提交审批</button></div></form>` : '<div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button></div>'}</div>`, { large: true });
  if (reviewMode) dialog.querySelector('[name=result]').addEventListener('change', event => { const error = dialog.querySelector('[data-error]'); if (event.target.value === 'approved') error.textContent = ''; });
}

function openWorkbench(id) {
  const item = contentCourses.find(record => record.id === id);
  if (!item) return;
  let activeChapter = 0;
  const dialog = modal(`${item.status === '已完成' ? '查看课程编排' : item.status === '待编排' ? '开始课程编排' : '继续课程编排'}`, `${item.name} · ${item.type} · ${item.major}`, '<div id="workbench-content"></div>', { large: true });
  const renderWorkbench = () => {
    const chapter = item.chapters[activeChapter];
    const lessonCount = item.chapters.reduce((sum, current) => sum + current.lessons.length, 0);
    const videoReady = item.type !== '视频课程' || item.chapters.length > 0 && item.chapters.every(current => current.lessons.length > 0 && current.lessons.every(lesson => lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频')));
    dialog.querySelector('#workbench-content').innerHTML = `<div class="course-workbench"><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>章节结构</h3><p>${item.chapters.length} 个章节 · ${lessonCount} 个课时</p></div><button class="button" type="button" data-workbench="add-chapter">添加章节</button></div><div class="chapter-list">${item.chapters.map((current, index) => `<div class="chapter-item${index === activeChapter ? ' active' : ''}" data-workbench="select-chapter" data-index="${index}"><div><strong>${escapeHtml(current.name)}</strong><small>${current.lessons.length} 个课时 · ${escapeHtml(current.desc || '暂无章节描述')}</small></div><div class="chapter-item-actions"><button type="button" data-workbench="edit-chapter" data-index="${index}" aria-label="编辑章节">编辑</button><button type="button" data-workbench="delete-chapter" data-index="${index}" aria-label="删除章节">删</button></div></div>`).join('') || '<div class="course-empty"><strong>还没有章节</strong><span>先添加章节，再添加课时。</span></div>'}</div></section><section class="course-workbench-pane"><div class="course-pane-head"><div><h3>${chapter ? escapeHtml(chapter.name) : '选择章节'}</h3><p>${chapter ? escapeHtml(chapter.desc || '编辑章节下的课时内容') : '请选择左侧章节'}</p></div>${chapter ? '<button class="button" type="button" data-workbench="add-lesson">添加课时</button>' : ''}</div><div class="lesson-list">${chapter?.lessons.map((lesson, index) => `<article class="lesson-item"><div class="lesson-item-head"><div><h4>${escapeHtml(lesson.name)}</h4><p>${escapeHtml(lesson.target)}</p></div><div class="chapter-item-actions"><button type="button" data-workbench="edit-lesson" data-chapter="${activeChapter}" data-index="${index}">编辑</button><button type="button" data-workbench="delete-lesson" data-chapter="${activeChapter}" data-index="${index}">删</button></div></div><div class="lesson-meta"><span>${lesson.duration} 分钟</span><span>${escapeHtml(lesson.kind)}</span><span>${escapeHtml(lesson.description || '暂无内容描述')}</span></div><div class="lesson-resource"><span class="${item.type === '视频课程' && !lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频') ? 'missing' : ''}">${lesson.resources.length ? lesson.resources.map(resourceId => resources.find(resource => resource.id === resourceId)?.name).join('、') : item.type === '视频课程' ? '未关联视频资源' : '未关联资源（可选）'}</span><button class="button" type="button" data-workbench="resource" data-chapter="${activeChapter}" data-index="${index}">引用资源</button></div></article>`).join('') || '<div class="course-empty"><strong>暂无课时</strong><span>请添加至少一个课时并完成教学目标。</span></div>'}</div></section></div><div class="course-workbench-footer"><div>${item.type === '视频课程' && !videoReady ? '<span class="tag red">视频课程还缺少必填视频资源</span>' : '<span class="tag green">当前结构可保存</span>'}<div class="course-progress"><span style="width:${Math.min(100, item.hours ? Math.round(lessonCount / item.hours * 100) : 0)}%"></span></div></div><div class="toolbar-actions"><button class="button" type="button" data-workbench="save">保存草稿</button>${item.status !== '已完成' ? '<button class="button primary" type="button" data-workbench="complete">完成编排</button>' : ''}</div></div>`;
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
    if (action === 'save') { item.status = '编排中'; item.updatedAt = demoTime(); persistCourse(item); renderWorkbench(); showToast('编排草稿已保存'); }
    if (action === 'complete') { const complete = item.type !== '视频课程' || item.chapters.length > 0 && item.chapters.every(current => current.lessons.length > 0 && current.lessons.every(lesson => lesson.resources.some(resourceId => resources.find(resource => resource.id === resourceId)?.type === '教学视频'))); if (!complete) { showToast('视频课程每个课时都必须关联至少一个教学视频', 'error'); return; } if (!item.chapters.length || item.chapters.some(current => !current.lessons.length || current.lessons.some(lesson => !lesson.name || !lesson.target || !lesson.duration))) { showToast('请补齐章节和课时必填信息', 'error'); return; } item.status = '已完成'; item.updatedAt = demoTime(); persistCourse(item); syncLibraryCourse(item); renderWorkbench(); renderContent(root()); showToast('课程编排已完成，可进入课程库'); }
  });
  renderWorkbench();
}

function openChapterForm(course, index, onDone) {
  const current = index === null ? { name: '', desc: '' } : course.chapters[index];
  const dialog = modal(index === null ? '添加章节' : '编辑章节', '章节名称为必填项', `<form data-form="chapter-form"><div class="course-detail-grid"><div class="course-field"><label>章节名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="如：第一章：身韵元素训练" /></div><div class="course-field"><label>排序</label><input name="sort" type="number" min="1" value="${index === null ? course.chapters.length + 1 : index + 1}" /></div><div class="course-field wide"><label>章节描述</label><textarea name="desc" placeholder="填写章节的教学重点">${escapeHtml(current.desc || '')}</textarea></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存章节</button></div></form>`);
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); if (!data.get('name').trim()) return; const chapter = { name: data.get('name').trim(), desc: data.get('desc').trim(), lessons: current.lessons || [] }; if (index === null) course.chapters.push(chapter); else course.chapters[index] = chapter; closeModal(); onDone(); showToast('章节已保存'); });
}

function openLessonForm(course, chapterIndex, lessonIndex, onDone) {
  const current = lessonIndex === null ? { name: '', target: '', duration: 45, kind: '理论', description: '', resources: [] } : course.chapters[chapterIndex].lessons[lessonIndex];
  const dialog = modal(lessonIndex === null ? '添加课时' : '编辑课时', '课时名称、课时目标和课时时长为必填项', `<form data-form="lesson-form"><div class="course-detail-grid"><div class="course-field"><label>课时名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="如：站姿与脚位" /></div><div class="course-field"><label>课时目标 <span class="sub-cell">必填</span></label><input name="target" required value="${escapeHtml(current.target)}" placeholder="填写本课时可达成的目标" /></div><div class="course-field"><label>课时时长（分钟） <span class="sub-cell">必填</span></label><input name="duration" required type="number" min="1" value="${current.duration}" /></div><div class="course-field"><label>课时类型 <span class="sub-cell">必填</span></label>${selectWithValues('kind', ['理论', '示范', '练习', '综合'], current.kind, '')}</div><div class="course-field wide"><label>内容描述</label><textarea name="description" placeholder="填写教学内容和执行提示">${escapeHtml(current.description || '')}</textarea></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存课时</button></div></form>`);
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); if (!data.get('name').trim() || !data.get('target').trim() || Number(data.get('duration')) <= 0) return; const lesson = { name: data.get('name').trim(), target: data.get('target').trim(), duration: Number(data.get('duration')), kind: data.get('kind'), description: data.get('description').trim(), resources: current.resources || [] }; if (lessonIndex === null) course.chapters[chapterIndex].lessons.push(lesson); else course.chapters[chapterIndex].lessons[lessonIndex] = lesson; closeModal(); onDone(); showToast('课时已保存'); });
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
  modal('资源预览', `${item.name} · ${item.type}`, `<div class="course-preview${documentPreview ? ' document' : ''}"><div><strong>${documentPreview ? '文档预览' : item.ext === 'video' ? '视频预览' : item.ext === 'audio' ? '音频预览' : '图片预览'}</strong><small>${escapeHtml(item.name)}<br />演示环境仅展示预览占位，接入文件服务后替换为实际预览组件。</small></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">关闭</button></div>`);
}

function openLightweightForm(id = null) {
  const current = id ? library.find(item => item.id === id) : { name: '', major: '', hours: 16, detail: '', cover: '未配置', difficulty: '启蒙', ages: ['少儿'], tags: [], recommendation: '' };
  const dialog = modal(id ? '编辑轻量课程档案' : '新建轻量课程档案', '轻量档案只用于快速报名班级，不进入课程内容编排', `<form data-form="lightweight-form" data-id="${id || ''}"><div class="course-detail-grid"><div class="course-field"><label>课程名称 <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="填写课程名称" /></div><div class="course-field"><label>所属专业 <span class="sub-cell">必填</span></label>${professionalFilter('major', current.major)}</div><div class="course-field"><label>课程类型</label><input class="readonly-field" value="面授课程" readonly /></div><div class="course-field"><label>总课时 <span class="sub-cell">必填</span></label><input name="hours" type="number" min="1" required value="${current.hours}" /></div><div class="course-field wide"><label>简短课程介绍 <span class="sub-cell">必填</span></label><textarea name="detail" required placeholder="填写快速报名详情页使用的介绍">${escapeHtml(current.detail)}</textarea></div><div class="course-field"><label>难度等级</label>${selectWithValues('difficulty', ['启蒙', '初级', '中级', '高级', '考级冲刺'], current.difficulty, '')}</div><div class="course-field"><label>适合年龄</label>${selectWithValues('ages', ['全年龄段', '少儿', '青少年', '成人'], current.ages?.[0] || '少儿', '')}</div><div class="course-field wide"><label>图文详情</label><textarea name="richDetail" placeholder="可选：填写课程详情">${escapeHtml(current.richDetail || '')}</textarea></div><div class="course-field"><label>课程标签</label><input name="tags" value="${escapeHtml((current.tags || []).join(','))}" placeholder="多个标签用逗号分隔" /></div><div class="course-field"><label>C端推荐语</label><input name="recommendation" maxlength="30" value="${escapeHtml(current.recommendation || '')}" placeholder="不超过30字" /></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存档案</button></div></form>`);
  dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); if (!data.get('name').trim() || !data.get('major') || !data.get('detail').trim() || Number(data.get('hours')) <= 0) { showToast('请补齐课程名称、专业、介绍和总课时', 'error'); return; } const record = { id: id || `LIB-${Date.now()}`, name: data.get('name').trim(), archive: '轻量课程档案', type: '面授课程', major: data.get('major'), teacher: id ? current.teacher : '李教务', hours: Number(data.get('hours')), status: '不适用', cover: current.cover || '未配置', difficulty: data.get('difficulty'), ages: [data.get('ages')], detail: data.get('detail').trim(), richDetail: data.get('richDetail').trim(), tags: data.get('tags').split(',').map(value => value.trim()).filter(Boolean), recommendation: data.get('recommendation').trim() }; if (id) { Object.assign(current, record); persistLibrary(record); } else { library.unshift(record); persistLibrary(record); } closeModal(); renderLibrary(root()); showToast(id ? '轻量课程档案已保存' : '轻量课程档案已创建'); });
}

function openCatalogForm(type, id = null) {
  const current = type === 'group' ? { name: id || '', sort: 1, icon: '' } : type === 'category' ? catalog.categories.find(item => item.id === id) || { name: '', parent: state.selectedGroup, sort: catalog.categories.length + 1 } : catalog.majors.find(item => item.id === id) || { name: '', parent: state.selectedCategory, group: state.selectedGroup, sort: catalog.majors.length + 1 };
  const title = `${id ? '编辑' : '新增'}${type === 'group' ? '门类' : type === 'category' ? '分类' : '专业'}`;
  const parentField = type === 'category' ? `<div class="course-field"><label>所属门类 <span class="sub-cell">必填</span></label>${selectWithValues('parent', Object.keys(professionalTree), current.parent, '')}</div>` : type === 'major' ? `<div class="course-field"><label>所属分类 <span class="sub-cell">必填</span></label><select name="parent">${catalog.categories.map(item => option(item.name, item.name === current.parent)).join('')}</select></div>` : '<div class="course-field"><label>图标</label><input name="icon" value="" placeholder="可选图标名称" /></div>';
  const dialog = modal(title, '名称为必填项，目录将供全系统级联选择使用', `<form data-form="catalog-form" data-type="${type}" data-id="${id || ''}"><div class="course-detail-grid"><div class="course-field"><label>${type === 'group' ? '门类名称' : type === 'category' ? '分类名称' : '专业名称'} <span class="sub-cell">必填</span></label><input name="name" required value="${escapeHtml(current.name)}" placeholder="填写名称" /></div>${parentField}<div class="course-field"><label>排序</label><input name="sort" type="number" min="1" value="${current.sort || 1}" /></div></div><div class="course-modal-actions"><button class="button" type="button" data-action="close-modal">取消</button><button class="button primary" type="submit">保存目录</button></div></form>`);
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
  if (action === 'application-tab') { state.applicationTab = target.dataset.value; renderApplications(root()); }
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
  if (action === 'library-edit') { const item = library.find(record => record.id === target.dataset.id); if (item?.archive === '完整课程') window.location.href = `content.html?courseId=${encodeURIComponent(contentCourses.find(course => course.name === item.name)?.id || '')}`; else openLightweightForm(target.dataset.id); }
  if (action === 'catalog-add') openCatalogForm(target.dataset.type);
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
  if (form.dataset.form === 'application-review-form') { event.preventDefault(); const result = form.querySelector('[name=result]:checked')?.value; const opinion = form.querySelector('[name=opinion]').value.trim(); const error = form.querySelector('[data-error]'); if (result === 'rejected' && !opinion) { error.textContent = '驳回时必须填写审批意见或原因'; return; } const item = applications.find(record => record.id === form.dataset.id); if (item) { item.status = result === 'approved' ? '已通过' : '已驳回'; item.review = opinion || '审批通过'; item.reviewedBy = '教研管理员'; item.reviewedAt = demoTime(); persistApplication(item); if (result === 'approved') { const course = contentCourses.find(record => record.applicationId === item.id || record.id === item.courseId) || courseFromApplication(item); if (!contentCourses.some(record => record.id === course.id)) contentCourses.unshift(course); persistCourse(course); } closeModal(); renderApplications(root()); showToast(result === 'approved' ? '申报已通过，课程进入编排列表' : '申报已驳回，教师可修改后重新提交'); } }
}

function deleteResource(id) {
  const item = resources.find(record => record.id === id);
  if (!item) return;
  const prompt = item.references ? `该资源被${item.references}门课程引用，删除后将影响这些课程展示，确认删除？` : '该资源暂未被课程引用，确认删除？';
  if (window.confirm(prompt)) { resources.splice(resources.indexOf(item), 1); removeDemoRecord('resources', id); renderResources(root()); showToast('资源已删除'); }
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
