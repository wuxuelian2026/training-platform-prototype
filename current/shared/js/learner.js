import { relativePath } from './paths.js';

const main = document.querySelector('.mobile-main');
const path = location.pathname;
const params = new URLSearchParams(location.search);
const STORAGE_KEY = 'hbyx-mini-learner-demo';
const homeBanners = [
  { kicker: '本周精选', title: '让练习成为看得见的成长', text: '精选声乐、舞蹈和器乐课程，找到适合自己的学习节奏。', mark: '艺' },
  { kicker: '秋季招生', title: '面授班级正在招生', text: '查看教师、校区、课时和剩余名额，选择合适的班级。', mark: '课' },
  { kicker: '视频课程', title: '随时打开一节好课', text: '支持断点续播，利用碎片时间完成你的艺术训练。', mark: '学' }
];

const demo = {
  phone: '138****2026',
  wechatAuthorized: true,
  students: [{ id: 'student-001', name: '林知夏', relation: '女儿' }, { id: 'student-002', name: '林知远', relation: '儿子' }],
  courses: [
    { id: 'video-001', type: 'video', name: '声乐演唱技巧', teacher: '陈晨', category: '音乐表演', discipline: '音乐', field: '音乐表演', professional: '声乐演唱', level: '中级', age: '成人', hours: 12, price: 1280, progress: 45, chapter: '第3章 · 作品演唱', status: '可购买', intro: '从发声、气息、共鸣到作品演唱，建立清晰、可反复练习的声乐训练路径。', detail: ['课程从呼吸与发声基础开始，逐步进入共鸣位置、咬字处理和作品表达，适合已有基础、希望系统提升演唱能力的学员。', '每节课包含教师示范、训练重点和课后练习建议，可按自己的节奏重复观看。'], outline: [{ title: '第1章 · 发声基础', note: '4课时' }, { title: '第2章 · 气息与共鸣', note: '4课时' }, { title: '第3章 · 作品演唱', note: '4课时' }] },
    { id: 'class-001', type: 'class', name: '少儿中国舞基础班', className: '2026秋季中国舞启蒙一班', courseName: '少儿中国舞基础', teacher: '王玥', category: '舞蹈表演', discipline: '舞蹈', field: '舞蹈表演', professional: '中国舞', level: '初级', age: '少儿', hours: 16, lessons: 16, price: 1680, season: '秋季', campus: '龙泉校区', classroom: '综合楼302', schedule: '每周六 09:00-10:30', seats: '3/20', classStatus: '招生中', deadline: '2026-09-30', intro: '围绕基本功、身韵组合和课堂展示，帮助少儿学员建立规范动作与舞蹈表现力。', detail: ['课程根据少儿身体发展特点安排训练强度，通过热身、基本功、组合练习和课堂展示形成完整学习过程。', '教师会在课堂中持续观察动作完成情况，并提供阶段性练习建议。'], outline: [{ title: '第一阶段 · 身体启蒙', note: '4课次' }, { title: '第二阶段 · 基本功训练', note: '6课次' }, { title: '第三阶段 · 舞蹈组合', note: '6课次' }] },
    { id: 'class-002', type: 'class', name: '钢琴启蒙班', className: '2026秋季钢琴启蒙一班', courseName: '钢琴启蒙', teacher: '李老师', category: '音乐表演', discipline: '音乐', field: '音乐表演', professional: '钢琴', level: '启蒙', age: '少儿', hours: 12, lessons: 12, price: 1980, season: '秋季', campus: '南湖校区', classroom: '音乐楼205', schedule: '每周日 14:00-15:30', seats: '0/15', classStatus: '已满员', deadline: '2026-10-10', intro: '从识谱、节奏和手型开始，帮助少儿学员建立稳定的钢琴启蒙学习习惯。' }
  ],
  teachers: [
    { id: 'teacher-001', name: '陈晨', title: '声乐教师', years: 12, tags: ['声乐演唱', '艺术歌曲'], tagline: '让每一位学员找到自然、稳定且有表现力的声音。', intro: '专注声乐发声与作品演唱训练，擅长建立循序渐进的练习路径。', profile: [{ type: 'text', text: '陈晨老师长期从事声乐教学与舞台实践，注重气息、共鸣和作品表达的协调训练，并根据学员基础设计阶段性练习目标。' }, { type: 'image', title: '声乐课堂教学记录', caption: '课堂中针对气息控制与作品处理进行示范指导' }, { type: 'text', text: '课程强调听辨、示范、练习与反馈的完整闭环，帮助学员在稳定发声的基础上建立个人演唱表达。' }, { type: 'video', title: '声乐发声训练示范', caption: '教师示范视频 · 03:20' }] },
    { id: 'teacher-002', name: '王玥', title: '舞蹈教师', years: 8, tags: ['中国舞', '身韵训练'], tagline: '从基本功到舞台表达，让身体真正理解动作。', intro: '关注基本功、身韵和舞台表现，帮助学员建立稳定的身体控制。', profile: [{ type: 'text', text: '王玥老师坚持基本功与舞蹈表达并重，通过分解练习、组合训练和课堂展示，帮助学员建立动作规范与身体意识。' }, { type: 'image', title: '中国舞课堂训练', caption: '少儿中国舞课堂组合训练现场' }, { type: 'text', text: '教学过程关注学员年龄特点与身体条件，在安全训练的前提下逐步提升柔韧、协调和节奏表现。' }, { type: 'video', title: '身韵组合教学示范', caption: '教师示范视频 · 02:45' }] },
    { id: 'teacher-003', name: '李老师', title: '钢琴教师', years: 10, tags: ['钢琴启蒙', '视奏'], tagline: '用清晰的方法建立兴趣，也建立扎实的演奏习惯。', intro: '从兴趣启蒙到基础演奏，重视节奏感与音乐表达的培养。', profile: [{ type: 'text', text: '李老师擅长钢琴启蒙与基础演奏教学，通过节奏、识谱、手型和作品练习，帮助学员形成稳定的练琴习惯。' }, { type: 'image', title: '钢琴一对一课堂', caption: '课堂中进行手型与视奏指导' }, { type: 'text', text: '教学内容兼顾技术训练和音乐理解，鼓励学员通过小型展示积累舞台经验与学习信心。' }, { type: 'video', title: '钢琴启蒙课堂片段', caption: '课堂视频 · 03:05' }] }
  ],
  orders: [{ id: 'OD202609080001', courseId: 'video-001', status: '已支付', amount: 1280, studentId: 'student-001', createdAt: '2026-09-08 14:20', paidAt: '2026-09-08 14:22' }, { id: 'OD202609080002', courseId: 'class-001', status: '待支付', amount: 1680, studentId: 'student-001', createdAt: '2026-09-08 16:42', paidAt: '' }],
  messages: [
    { id: 'MSG20260908001', type: '报告发布', title: '学习报告已发布', summary: '《少儿中国舞基础班》学习报告已发布，请查看本学期学习成果。', body: '本学期学习报告已由教务发布，包含课堂参与、作品练习和阶段展示成果。请进入学习报告查看完整内容。', createdAt: '2026-09-08 18:20', read: false, courseId: 'class-001', target: '/learner/pages/results.html?courseId=class-001' },
    { id: 'MSG20260908002', type: '作业批改', title: '作业已批改', summary: '节奏练习视频已完成批改，请查看教师评语。', body: '教师已完成本次作业批改，请进入作业页面查看文本评语和后续练习建议。', createdAt: '2026-09-08 17:05', read: false, courseId: 'class-001', target: '/learner/pages/homework.html?courseId=class-001' },
    { id: 'MSG20260908003', type: '上课提醒', title: '明天有一节面授课', summary: '少儿中国舞基础班明天 09:00 在龙泉校区综合楼302上课。', body: '请按时到达上课地点：龙泉校区综合楼302。建议提前 10 分钟到达并做好课前准备。', createdAt: '2026-09-08 16:30', read: true, courseId: 'class-001', target: '/learner/pages/class-detail.html?courseId=class-001' },
    { id: 'MSG20260908004', type: '支付成功', title: '购买成功', summary: '您已成功购买《声乐演唱技巧》，课程权限已开通。', body: '微信支付已确认，课程学习权限已生效。订单状态为“已支付”，学习进度请在“我的学习”中查看。', createdAt: '2026-09-08 14:22', read: true, courseId: 'video-001', target: '/learner/pages/order-detail.html?courseId=video-001' },
    { id: 'MSG20260907001', type: '分班完成', title: '您已成功分班', summary: '您已分班至 2026 秋季中国舞启蒙一班。', body: '教务已完成分班，当前班级为 2026 秋季中国舞启蒙一班。请查看班级上课时间、地点和教师信息。', createdAt: '2026-09-07 10:15', read: true, courseId: 'class-001', target: '/learner/pages/class-detail.html?courseId=class-001' },
    { id: 'MSG20260906001', type: '证书生成', title: '您的结业证书已生成', summary: '少儿中国舞基础班结业证书已生成，可在线查看。', body: '恭喜您完成课程学习，结业证书已生成。请进入成果页面查看证书信息。', createdAt: '2026-09-06 09:10', read: true, courseId: 'class-001', target: '/learner/pages/results.html?courseId=class-001' }
  ],
  consultations: [{ id: 'C20260908001', courseId: 'class-001', status: '已回复', text: '想了解秋季班的上课时间和教室安排。', reply: '您好，秋季班每周六 09:00-10:30 在龙泉校区综合楼302上课，当前还有少量名额。', submittedAt: '2026-09-08 14:20', replyAt: '2026-09-08 15:06', progress: '已报名', anonymous: false }, { id: 'C20260908002', courseId: 'video-001', status: '待回复', text: '想了解视频课程是否支持反复观看。', reply: '', submittedAt: '2026-09-08 16:42', replyAt: '', progress: '待跟进', anonymous: false }],
  chapterDone: ['chapter-001', 'chapter-002'],
  currentStudentId: 'student-001'
};

function readState() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    const storedCourses = Array.isArray(stored.courses) ? stored.courses : [];
    const knownCourses = demo.courses.map(item => ({ ...item, ...(storedCourses.find(row => row.id === item.id) || {}) }));
    const additionalCourses = storedCourses.filter(item => !demo.courses.some(row => row.id === item.id));
    const storedTeachers = Array.isArray(stored.teachers) ? stored.teachers : [];
    const knownTeachers = demo.teachers.map(item => ({ ...item, ...(storedTeachers.find(row => row.id === item.id) || {}) }));
    const additionalTeachers = storedTeachers.filter(item => !demo.teachers.some(row => row.id === item.id));
    return { ...demo, ...stored, courses: [...knownCourses, ...additionalCourses], teachers: [...knownTeachers, ...additionalTeachers] };
  } catch { return { ...demo }; }
}
let state = readState();
function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentStudent() { return state.students.find(item => item.id === state.currentStudentId) || state.students[0]; }
function course(id = params.get('courseId')) { return state.courses.find(item => item.id === id) || state.courses[0]; }
function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function go(url) { location.href = relativePath(url); }
function pill(text, tone = '') { return `<span class="mp-pill ${tone}">${esc(text)}</span>`; }
function button(text, attrs = '', cls = '') { return `<button class="mp-button ${cls}" ${attrs}>${esc(text)}</button>`; }
function card(content, cls = '') { return `<section class="mp-card ${cls}">${content}</section>`; }
function stack(...content) { return `<div class="mp-stack">${content.join('')}</div>`; }
function toast(message) { const node = document.createElement('div'); node.className = 'mp-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 2200); }
function courseMeta(item) { return `${item.type === 'video' ? '视频课程' : '面授课程'} · ${item.teacher}老师 · ${item.category}`; }
function courseLink(item, label = '查看详情') { return item.type === 'video' ? `/learner/pages/course-detail.html?courseId=${item.id}` : `/learner/pages/class-detail.html?courseId=${item.id}`; }
function listItem(item, action = '') { return `<a class="mp-item" href="${courseLink(item)}"><div><strong>${esc(item.name)}</strong><small>${esc(courseMeta(item))}</small>${item.type === 'class' ? `<p>${esc(item.campus)} · ${esc(item.schedule)} · 剩余${esc(item.seats.split('/')[0])}名额</p>` : `<p>共${item.hours}课时 · 已学习${item.progress}%</p>`}</div><div>${action || `<span class="mp-link">查看</span>`}</div></a>`; }
function courseCard(item) {
  const isClass = item.type === 'class';
  const teacher = state.teachers.find(row => row.name === item.teacher);
  const teacherName = teacher?.name || item.teacher;
  const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
  const professionalTag = pill(item.professional || item.category);
  const detailTags = [item.level, isClass ? item.age : ''].filter(Boolean).map(tag => pill(tag, 'gray')).join('');
  const status = isClass ? item.classStatus || '招生中' : '';
  const statusTag = status ? `<span class="mp-course-status">${pill(status, status.includes('满') ? 'gray' : 'green')}</span>` : '';
  return `<a class="mp-course-card" href="/learner/pages/course-detail.html?courseId=${item.id}"><div class="mp-course-cover ${isClass ? 'class-cover' : 'video-cover'}" data-cover-mark="${esc(coverMark)}" aria-hidden="true"><span>${isClass ? '面授课程' : '视频课程'}</span></div><div class="mp-course-body"><div class="mp-course-title-row"><h3>${esc(item.name)}</h3><strong class="mp-course-price">¥${item.price.toLocaleString()}.00</strong></div><div class="mp-course-tags">${professionalTag}${detailTags}${statusTag}</div><div class="mp-course-teacher-row"><div class="mp-course-teacher"><span class="mp-avatar mp-course-avatar" aria-hidden="true">${esc(teacherName.slice(0, 1))}</span><span class="mp-course-teacher-name">${esc(teacherName)}</span></div><span class="mp-course-hours">共${esc(item.hours)}课时</span></div></div></a>`;
}
function teacherLink(item) { return `/learner/pages/teacher-detail.html?teacherId=${item.id}`; }
function isLoggedIn() { return sessionStorage.getItem('hbyx-mini-logged-in') === '1'; }
function teacherCard(item, variant = 'compact') { return `<a class="mp-teacher-card ${variant === 'list' ? 'is-list' : ''}" href="${teacherLink(item)}"><div class="mp-teacher-card-head"><span class="mp-avatar mp-teacher-avatar" aria-hidden="true">${esc(item.name.slice(0, 1))}</span><div class="mp-teacher-identity"><strong>${esc(item.name)}</strong><small>${esc(item.title)} · ${item.years}年教龄</small></div></div><div class="mp-teacher-card-copy"><p>${esc(item.tagline || item.intro)}</p><div class="mp-pills">${item.tags.map(tag => pill(tag, 'gray')).join('')}</div></div><span class="mp-teacher-card-arrow" aria-hidden="true">›</span></a>`; }
function teacherRichContent(item) {
  const blocks = Array.isArray(item.profile) ? item.profile : [{ type: 'text', text: item.intro }];
  return blocks.map(block => {
    if (block.type === 'image') return `<figure class="mp-rich-figure"><div class="mp-rich-image" role="img" aria-label="${esc(block.title)}图片占位"><span>图片</span><strong>${esc(block.title)}</strong></div><figcaption>${esc(block.caption || block.title)}</figcaption></figure>`;
    if (block.type === 'video') return `<figure class="mp-rich-figure"><div class="mp-rich-video" role="img" aria-label="${esc(block.title)}视频占位"><span class="mp-rich-play" aria-hidden="true">▶</span><div><strong>${esc(block.title)}</strong><small>视频内容占位</small></div></div><figcaption>${esc(block.caption || block.title)}</figcaption></figure>`;
    return `<p>${esc(block.text || '')}</p>`;
  }).join('');
}
function layout(content) { main.innerHTML = content; }
function renderHome() {
  const categoryItems = [['音乐', '乐', '音乐'], ['美术', '绘', '美术'], ['舞蹈', '舞', '舞蹈'], ['戏剧', '剧', '戏剧'], ['更多', '＋', '']];
  const classCourse = state.courses.find(item => item.type === 'class' && !item.isFastRegistration) || state.courses[1];
  layout(stack(`<form id="home-search-form" class="mp-home-search" role="search"><input id="home-search" aria-label="搜索课程或老师" placeholder="搜索课程或老师"><button class="mp-search-submit" type="submit" aria-label="搜索">⌕</button></form><section id="home-carousel" class="mp-carousel">${homeBanners.map((banner, index) => `<article class="mp-banner ${index === 0 ? 'active' : ''}" data-banner-index="${index}"><div class="mp-banner-copy"><span class="mp-eyebrow">${banner.kicker}</span><h2>${banner.title}</h2><p>${banner.text}</p></div><span class="mp-banner-mark">${banner.mark}</span></article>`).join('')}<div class="mp-carousel-dots">${homeBanners.map((_, index) => `<button class="mp-carousel-dot ${index === 0 ? 'active' : ''}" data-banner-dot="${index}" aria-label="第${index + 1}张轮播图"></button>`).join('')}</div></section>${card(`<div class="mp-section-head"><h2>分类入口</h2><span class="mp-muted">探索艺术方向</span></div><div class="mp-category-row">${categoryItems.map(([label, icon, category]) => `<a class="mp-category" href="${category ? `/learner/pages/courses.html?category=${encodeURIComponent(category)}` : '/learner/pages/courses.html'}"><span class="mp-category-icon">${icon}</span><span>${label}</span></a>`).join('')}</div>`)}${card(`<div class="mp-section-head"><h2>面授课程招生</h2><a class="mp-link" href="/learner/pages/fast-registration.html">查看全部</a></div>${courseCard(classCourse)}`)}${card(`<div class="mp-section-head"><h2>视频课程推荐</h2><a class="mp-link" href="/learner/pages/courses.html">课程库</a></div>${courseCard(state.courses[0])}`)}${card(`<div class="mp-section-head"><h2>名师推荐</h2><a class="mp-link" href="/learner/pages/teachers.html">更多名师</a></div><div class="mp-scroll-row">${state.teachers.map(teacherCard).join('')}</div>`)}${card(`<div class="mp-section-head"><h2>有问题先咨询</h2></div><p class="mp-muted">无需登录，提交课程和联系方式后，课程顾问会主动联系。</p><div class="mp-actions" style="margin-top:12px">${button('提交咨询', 'data-action="consult"')}</div>`)}`));
  const searchForm = document.querySelector('#home-search-form');
  searchForm.addEventListener('submit', event => { event.preventDefault(); const keyword = document.querySelector('#home-search').value.trim(); go(`/learner/pages/courses.html${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`); });
  const setBanner = index => { document.querySelectorAll('[data-banner-index]').forEach(item => item.classList.toggle('active', Number(item.dataset.bannerIndex) === index)); document.querySelectorAll('[data-banner-dot]').forEach(item => item.classList.toggle('active', Number(item.dataset.bannerDot) === index)); };
  let bannerIndex = 0; const timer = setInterval(() => { bannerIndex = (bannerIndex + 1) % homeBanners.length; setBanner(bannerIndex); }, 4200);
  document.querySelectorAll('[data-banner-dot]').forEach(dot => dot.addEventListener('click', () => { bannerIndex = Number(dot.dataset.bannerDot); setBanner(bannerIndex); }));
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}
function renderTeachers() { layout(stack(card(`<div class="mp-section-head"><h2>名师推荐</h2><span class="mp-muted">专业教师</span></div><p>按教师专业方向查看已发布课程。</p>`), `<div class="mp-list">${state.teachers.map(item => teacherCard(item, 'list')).join('')}</div>`)); }
function renderTeacherDetail() { const item = state.teachers.find(row => row.id === params.get('teacherId')) || state.teachers[0]; const related = state.courses.filter(row => row.teacher === item.name); layout(stack(card(`<div class="mp-teacher-profile"><div class="mp-teacher-profile-head"><span class="mp-avatar mp-teacher-profile-avatar" aria-hidden="true">${esc(item.name.slice(0, 1))}</span><div class="mp-teacher-profile-identity"><h2>${esc(item.name)}</h2><p>${esc(item.title)} · ${item.years}年教龄</p></div></div><p class="mp-teacher-profile-tagline">${esc(item.tagline || item.intro)}</p><div class="mp-pills mp-teacher-profile-tags">${item.tags.map(tag => pill(tag, 'gray')).join('')}</div></div>`), card(`<h3>教师简介</h3><article class="mp-rich-content">${teacherRichContent(item)}</article>`), card(`<div class="mp-section-head"><h3>已发布课程</h3><span class="mp-muted">${related.length}门</span></div><div class="mp-list" style="margin-top:10px">${related.length ? related.map(row => courseCard(row)).join('') : '<div class="mp-empty">暂无已发布课程</div>'}</div>`))); }
function renderCourses() {
  const requestedCategory = params.get('category') || '';
  const disciplineOptions = [...new Set(state.courses.map(item => item.discipline).filter(Boolean))];
  const initialDiscipline = disciplineOptions.includes(requestedCategory) ? requestedCategory : '';
  const initialField = params.get('field') || (state.courses.some(item => item.field === requestedCategory) ? requestedCategory : '');
  const initialProfessional = params.get('professional') || (state.courses.some(item => item.professional === requestedCategory) ? requestedCategory : '');
  const levels = ['启蒙', '初级', '中级', '高级'];
  const ages = ['少儿', '青少年', '成人'];
  const optionList = (options, selected, emptyText) => `<option value="">${emptyText}</option>${options.map(option => `<option value="${esc(option)}" ${option === selected ? 'selected' : ''}>${esc(option)}</option>`).join('')}`;
  const initialMatch = state.courses.find(item => (initialProfessional && item.professional === initialProfessional) || (initialField && item.field === initialField));
  const selectedMajor = {
    discipline: initialDiscipline || initialMatch?.discipline || '',
    field: initialField || (initialProfessional ? initialMatch?.field : '') || '',
    professional: initialProfessional
  };
  const professionalTree = disciplineOptions.map(discipline => ({
    value: discipline,
    children: [...new Set(state.courses.filter(item => item.discipline === discipline).map(item => item.field).filter(Boolean))].map(field => ({
      value: field,
      children: [...new Set(state.courses.filter(item => item.discipline === discipline && item.field === field).map(item => item.professional).filter(Boolean))]
    }))
  }));
  layout(stack(card(`<div class="mp-section-head"><h2>课程筛选</h2><span id="course-result-count" class="mp-muted"></span></div><div class="mp-search"><input id="course-search" aria-label="搜索课程或老师" placeholder="搜索课程或老师" value="${esc(params.get('q') || '')}"></div><div class="mp-filter-grid"><div class="mp-field mp-filter-profession"><label for="course-profession-trigger">专业</label><button id="course-profession-trigger" class="mp-select-trigger" type="button" aria-haspopup="dialog" aria-controls="course-profession-dialog" aria-expanded="false"><span id="course-profession-value">全部专业</span><span class="mp-select-chevron" aria-hidden="true">›</span></button></div><div class="mp-field"><label for="course-level">难度</label><select id="course-level">${optionList(levels, params.get('level') || '', '全部难度')}</select></div><div class="mp-field"><label for="course-age">适合年龄</label><select id="course-age">${optionList(ages, params.get('age') || '', '全年龄段')}</select></div></div><div class="mp-filter-actions"><span class="mp-muted">可组合多个条件筛选</span><button id="course-filter-reset" type="button" class="mp-button secondary">重置筛选</button></div>`), `<div class="mp-tabs" role="tablist"><button class="mp-tab active" data-course-tab="all">全部</button><button class="mp-tab" data-course-tab="class">面授课程</button><button class="mp-tab" data-course-tab="video">视频课程</button></div><div id="course-list" class="mp-list"></div>`, `<dialog id="course-profession-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet" aria-labelledby="course-cascade-title"><header class="mp-cascade-head"><div><h2 id="course-cascade-title">选择专业</h2><p id="course-cascade-caption">请选择专业门类</p></div><button class="mp-cascade-close" type="button" aria-label="关闭专业选择">×</button></header><div id="course-cascade-path" class="mp-cascade-path"></div><div id="course-cascade-options" class="mp-cascade-options" role="listbox"></div><footer class="mp-cascade-actions"><button id="course-cascade-clear" class="mp-button secondary" type="button">全部专业</button><button id="course-cascade-confirm" class="mp-button" type="button">确定</button></footer></section></dialog>`));
  const professionTrigger = document.querySelector('#course-profession-trigger');
  const professionValue = document.querySelector('#course-profession-value');
  const cascadeDialog = document.querySelector('#course-profession-dialog');
  const cascadePath = document.querySelector('#course-cascade-path');
  const cascadeOptions = document.querySelector('#course-cascade-options');
  const cascadeCaption = document.querySelector('#course-cascade-caption');
  const cascadeConfirm = document.querySelector('#course-cascade-confirm');
  const levelSelect = document.querySelector('#course-level');
  const ageSelect = document.querySelector('#course-age');
  const cascadeSteps = [
    { key: 'discipline', label: '专业门类' },
    { key: 'field', label: '专业分类' },
    { key: 'professional', label: '专业' }
  ];
  let draftMajor = { ...selectedMajor };
  let activeCascadeStep = selectedMajor.professional ? 'professional' : selectedMajor.field ? 'professional' : selectedMajor.discipline ? 'field' : 'discipline';
  const updateProfessionValue = () => {
    const pathText = [selectedMajor.discipline, selectedMajor.field, selectedMajor.professional].filter(Boolean).join(' / ');
    professionValue.textContent = pathText || '全部专业';
    professionTrigger.classList.toggle('has-value', Boolean(pathText));
  };
  const cascadeValues = () => {
    if (activeCascadeStep === 'discipline') return professionalTree.map(item => item.value);
    const discipline = professionalTree.find(item => item.value === draftMajor.discipline);
    if (activeCascadeStep === 'field') return discipline?.children.map(item => item.value) || [];
    return discipline?.children.find(item => item.value === draftMajor.field)?.children || [];
  };
  const renderCascade = () => {
    cascadePath.innerHTML = cascadeSteps.map((step, index) => {
      const enabled = index === 0 || (index === 1 && draftMajor.discipline) || (index === 2 && draftMajor.field);
      const text = draftMajor[step.key] || step.label;
      return `<button type="button" class="mp-cascade-step ${activeCascadeStep === step.key ? 'active' : ''} ${draftMajor[step.key] ? 'selected' : ''}" data-cascade-step="${step.key}" ${enabled ? '' : 'disabled'}><small>${index + 1}</small><span>${esc(text)}</span></button>`;
    }).join('');
    const stepName = cascadeSteps.find(step => step.key === activeCascadeStep)?.label || '专业';
    cascadeCaption.textContent = `请选择${stepName}`;
    const values = cascadeValues();
    cascadeOptions.innerHTML = values.length ? values.map(value => {
      const selected = draftMajor[activeCascadeStep] === value;
      return `<button type="button" class="mp-cascade-option ${selected ? 'selected' : ''}" data-cascade-value="${esc(value)}" role="option" aria-selected="${selected}"><span>${esc(value)}</span><span aria-hidden="true">${selected ? '✓' : activeCascadeStep === 'professional' ? '' : '›'}</span></button>`;
    }).join('') : '<div class="mp-cascade-empty">请先选择上一级专业</div>';
    cascadeConfirm.disabled = !draftMajor.professional;
  };
  let categoryFilter = requestedCategory;
  const draw = () => {
    const active = document.querySelector('[data-course-tab].active')?.dataset.courseTab || 'all';
    const keyword = document.querySelector('#course-search').value.trim().toLowerCase();
    const { discipline, field, professional } = selectedMajor;
    const level = levelSelect.value;
    const age = ageSelect.value;
    const items = state.courses.filter(item => {
      const searchable = `${item.name}${item.teacher}${item.category}${item.discipline || ''}${item.field || ''}${item.professional || ''}`.toLowerCase();
      const categoryMatch = !categoryFilter || [item.discipline, item.field, item.professional, item.category].filter(Boolean).some(value => value.includes(categoryFilter));
      return (active === 'all' || item.type === active) && categoryMatch && (!discipline || item.discipline === discipline) && (!field || item.field === field) && (!professional || item.professional === professional) && (!level || item.level === level) && (!age || age === '全年龄段' || item.age === age) && searchable.includes(keyword);
    });
    document.querySelector('#course-list').innerHTML = items.length ? items.map(item => courseCard(item)).join('') : `<div class="mp-empty">暂无符合条件的课程</div>`;
    document.querySelector('#course-result-count').textContent = `${items.length}门课程`;
  };
  professionTrigger.addEventListener('click', () => {
    draftMajor = { ...selectedMajor };
    activeCascadeStep = draftMajor.professional ? 'professional' : draftMajor.field ? 'professional' : draftMajor.discipline ? 'field' : 'discipline';
    renderCascade();
    professionTrigger.setAttribute('aria-expanded', 'true');
    cascadeDialog.showModal();
  });
  cascadePath.addEventListener('click', event => {
    const step = event.target.closest('[data-cascade-step]')?.dataset.cascadeStep;
    if (!step) return;
    activeCascadeStep = step;
    renderCascade();
  });
  cascadeOptions.addEventListener('click', event => {
    const value = event.target.closest('[data-cascade-value]')?.dataset.cascadeValue;
    if (!value) return;
    if (activeCascadeStep === 'discipline') {
      draftMajor = { discipline: value, field: '', professional: '' };
      activeCascadeStep = 'field';
    } else if (activeCascadeStep === 'field') {
      draftMajor = { ...draftMajor, field: value, professional: '' };
      activeCascadeStep = 'professional';
    } else {
      draftMajor = { ...draftMajor, professional: value };
    }
    renderCascade();
  });
  cascadeConfirm.addEventListener('click', () => {
    Object.assign(selectedMajor, draftMajor);
    categoryFilter = '';
    updateProfessionValue();
    cascadeDialog.close();
    draw();
  });
  document.querySelector('#course-cascade-clear').addEventListener('click', () => {
    Object.assign(selectedMajor, { discipline: '', field: '', professional: '' });
    categoryFilter = '';
    updateProfessionValue();
    cascadeDialog.close();
    draw();
  });
  document.querySelector('.mp-cascade-close').addEventListener('click', () => cascadeDialog.close());
  cascadeDialog.addEventListener('click', event => { if (event.target === cascadeDialog) cascadeDialog.close(); });
  cascadeDialog.addEventListener('close', () => professionTrigger.setAttribute('aria-expanded', 'false'));
  [levelSelect, ageSelect].forEach(select => select.addEventListener('change', draw));
  document.querySelectorAll('[data-course-tab]').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('[data-course-tab]').forEach(item => item.classList.remove('active')); tab.classList.add('active'); draw(); }));
  document.querySelector('#course-search').addEventListener('input', draw);
  document.querySelector('#course-filter-reset').addEventListener('click', () => { categoryFilter = ''; Object.assign(selectedMajor, { discipline: '', field: '', professional: '' }); levelSelect.value = ''; ageSelect.value = ''; updateProfessionValue(); document.querySelector('#course-search').value = ''; document.querySelectorAll('[data-course-tab]').forEach(item => item.classList.toggle('active', item.dataset.courseTab === 'all')); draw(); });
  updateProfessionValue();
  draw();
}
function detailActions(item) {
  const purchased = item.type === 'video' && state.orders.some(order => order.courseId === item.id && order.status === '已支付');
  const buyButton = purchased
    ? '<button class="mp-button mp-course-detail-primary" type="button" disabled>已购买</button>'
    : button(item.type === 'video' ? '立即购买' : '立即报名', `data-action="buy" data-course-id="${item.id}"`, 'mp-course-detail-primary');
  return `<div class="mp-bottom-actions mp-course-detail-actions">
    <button class="mp-button secondary mp-icon-action" type="button" data-action="consult"><span class="mp-linear-icon mp-linear-icon-consult" aria-hidden="true"></span><span>咨询</span></button>
    <button class="mp-button secondary mp-icon-action" type="button" data-action="share"><span class="mp-linear-icon mp-linear-icon-share" aria-hidden="true"></span><span>分享</span></button>
    ${buyButton}
  </div>`;
}
function renderCourseDetail(item = course('video-001')) {
  const isClass = item.type === 'class';
  const teacher = state.teachers.find(row => row.name === item.teacher);
  const status = isClass ? item.classStatus || '招生中' : item.status || '可购买';
  const statusTone = status.includes('满') ? 'gray' : 'green';
  const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
  const detailTab = params.get('tab') === 'outline' ? 'outline' : 'intro';
  const ageFact = `<div><dt>适合年龄</dt><dd>${esc(item.age || '不限')}</dd></div>`;
  const detailParagraphs = (item.detail || [item.intro]).filter(Boolean).map(text => `<p>${esc(text)}</p>`).join('');
  const hasOutline = Array.isArray(item.outline) && item.outline.length > 0;
  const outlineContent = hasOutline ? `<div class="mp-course-detail-outline">${item.outline.map((chapter, index) => `<div class="mp-course-detail-chapter"><span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></div>`).join('')}</div>` : '<div class="mp-empty mp-course-detail-empty">课程大纲暂未维护</div>';
  const teacherSection = teacher
    ? `<section class="mp-course-detail-teacher-section"><div class="mp-section-head"><h3>授课教师</h3><a class="mp-link" href="${teacherLink(teacher)}">查看详情</a></div>${teacherCard(teacher)}</section>`
    : '';

  layout(stack(
    `<section class="mp-course-detail-hero"><div class="mp-course-detail-cover ${isClass ? 'class-cover' : 'video-cover'}" data-cover-mark="${esc(coverMark)}"><div class="mp-course-detail-cover-tags">${pill(isClass ? '面授课程' : '精品视频', 'light')}${pill(status, statusTone)}</div><span class="mp-course-detail-cover-label">${esc(item.professional || item.category)}</span></div><div class="mp-course-detail-summary"><span class="mp-course-detail-kicker">${isClass ? '面授课程' : '精品课程'}</span><div class="mp-course-detail-title"><h2>${esc(item.name)}</h2><strong>¥${item.price.toLocaleString()}.00</strong></div><p class="mp-course-detail-subtitle">${esc(item.teacher)}老师 · ${esc(item.professional || item.category)}</p><dl class="mp-course-detail-facts"><div><dt>难度</dt><dd>${esc(item.level)}</dd></div>${ageFact}<div><dt>总课时</dt><dd>${esc(item.hours)}课时</dd></div><div><dt>授课教师</dt><dd>${esc(item.teacher)}</dd></div></dl></div></section>`,
    teacherSection,
    `<section class="mp-course-detail-tab-section"><div class="mp-tabs mp-course-detail-tabs" role="tablist"><button class="mp-tab ${detailTab === 'intro' ? 'active' : ''}" type="button" role="tab" aria-selected="${detailTab === 'intro'}" data-course-detail-tab="intro">课程介绍</button>${hasOutline ? `<button class="mp-tab ${detailTab === 'outline' ? 'active' : ''}" type="button" role="tab" aria-selected="${detailTab === 'outline'}" data-course-detail-tab="outline">课程大纲</button>` : ''}</div>${detailTab === 'outline' ? card(`<div class="mp-section-head"><h3>课程大纲</h3><span class="mp-muted">共${item.outline.length}章</span></div>${outlineContent}`, 'mp-course-detail-section') : card(`<h3>课程介绍</h3><article class="mp-rich-content mp-course-detail-content">${detailParagraphs}<figure class="mp-rich-figure"><div class="mp-rich-image" role="img" aria-label="${esc(item.name)}课程内容图片占位"><span>课程图文</span><strong>${esc(item.professional || item.category)}课堂内容</strong></div><figcaption>课程内容展示，以实际发布内容为准</figcaption></figure></article>`, 'mp-course-detail-section')}</section>`,
    detailActions(item)
  ));
  document.querySelectorAll('[data-course-detail-tab]').forEach(tab => tab.addEventListener('click', () => go(`/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}&tab=${tab.dataset.courseDetailTab}`)));
}
function fastRegistrationCard(item) {
  const className = item.className || item.name;
  const courseName = item.courseName || item.name.replace(/班$/, '');
  const available = item.classStatus !== '已满员' && Number(item.seats?.split('/')[0] || 0) > 0;
  const seatText = available ? `剩余 ${item.seats} 名额` : '名额已满';
  const action = available
    ? `<a class="mp-button" href="/learner/pages/fast-registration-detail.html?courseId=${item.id}">立即报名</a>`
    : '<button class="mp-button secondary" type="button" disabled>已满员</button>';
  return `<article class="mp-registration-card"><header class="mp-registration-head"><div class="mp-registration-title"><small>班级</small><h3>${esc(className)}</h3></div><div class="mp-registration-status">${pill(item.classStatus || (available ? '招生中' : '已满员'), available ? 'green' : 'gray')}<span>${esc(seatText)}</span></div></header><div class="mp-registration-course"><div><span>课程</span><strong>${esc(courseName)}</strong></div><div><span>专业</span><strong>${esc(item.professional || item.category)}</strong></div></div><dl class="mp-registration-facts"><div class="wide"><dt>上课时间</dt><dd>${esc(item.schedule)}</dd></div><div class="wide"><dt>上课教室</dt><dd>${esc(item.campus)} · ${esc(item.classroom || '教室待定')}</dd></div><div><dt>授课教师</dt><dd>${esc(item.teacher)}</dd></div><div><dt>课次</dt><dd>${esc(item.lessons || item.hours)}课次</dd></div></dl><footer class="mp-registration-footer"><div class="mp-registration-fee"><span>费用</span><strong>¥${item.price.toLocaleString()}.00</strong></div>${action}</footer></article>`;
}
function renderFastRegistration() {
  const classItems = state.courses.filter(item => item.type === 'class');
  const professionalOptions = [...new Set(classItems.map(item => item.professional).filter(Boolean))];
  const campusOptions = [...new Set(classItems.map(item => item.campus).filter(Boolean))];
  const filterOptions = (items, emptyText) => `<option value="">${emptyText}</option>${items.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}`;
  layout(stack(card(`<div class="mp-section-head"><h2 id="fast-batch-title">2026年秋季</h2><span id="fast-result-count" class="mp-muted"></span></div><div class="mp-tabs"><button class="mp-tab active" data-season="秋季">秋季</button><button class="mp-tab" data-season="春季">春季</button><button class="mp-tab" data-season="暑假">暑假</button><button class="mp-tab" data-season="寒假">寒假</button></div><div class="mp-fast-filter-grid"><div class="mp-field"><label for="fast-professional">专业</label><select id="fast-professional">${filterOptions(professionalOptions, '全部专业')}</select></div><div class="mp-field"><label for="fast-campus">校区</label><select id="fast-campus">${filterOptions(campusOptions, '全部校区')}</select></div></div><div class="mp-fast-filter-actions"><button id="fast-filter-reset" class="mp-button ghost" type="button">重置筛选</button></div>`), `<div id="class-list" class="mp-registration-list"></div>`));
  const professionalSelect = document.querySelector('#fast-professional');
  const campusSelect = document.querySelector('#fast-campus');
  const draw = () => {
    const activeSeason = document.querySelector('[data-season].active')?.dataset.season || '秋季';
    const items = classItems.filter(item => (item.season || '秋季') === activeSeason && (!professionalSelect.value || item.professional === professionalSelect.value) && (!campusSelect.value || item.campus === campusSelect.value));
    document.querySelector('#fast-batch-title').textContent = `2026年${activeSeason}`;
    document.querySelector('#fast-result-count').textContent = `${items.length}个班级`;
    document.querySelector('#class-list').innerHTML = items.length ? items.map(fastRegistrationCard).join('') : '<div class="mp-empty">当前条件下暂无可报名班级</div>';
  };
  document.querySelectorAll('[data-season]').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('[data-season]').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    draw();
  }));
  [professionalSelect, campusSelect].forEach(select => select.addEventListener('change', draw));
  document.querySelector('#fast-filter-reset').addEventListener('click', () => { professionalSelect.value = ''; campusSelect.value = ''; draw(); });
  draw();
}
function renderFastRegistrationDetail(item = course('class-001')) {
  const available = item.classStatus !== '已满员' && Number(item.seats?.split('/')[0] || 0) > 0;
  const status = item.classStatus || (available ? '招生中' : '已满员');
  const statusTone = available ? 'green' : 'gray';
  const coverMark = (item.professional || item.name).slice(0, 1);
  const detail = item.detail?.length ? item.detail : [item.intro || '本班为线下面授课程，具体教学安排以班级通知为准。'];
  const outline = Array.isArray(item.outline) && item.outline.length
    ? card(`<div class="mp-section-head"><h3>课程大纲</h3><span class="mp-muted">共${item.outline.length}章</span></div><div class="mp-course-detail-outline">${item.outline.map((chapter, index) => `<div class="mp-course-detail-chapter"><span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></div>`).join('')}</div>`, 'mp-fast-detail-section')
    : '';
  const action = available ? detailActions(item) : `<div class="mp-bottom-actions mp-course-detail-actions"><button class="mp-button secondary" type="button" data-action="consult">咨询</button><button class="mp-button secondary" type="button" data-action="share">分享</button><button class="mp-button mp-course-detail-primary" type="button" disabled>已满员</button></div>`;
  layout(stack(
    `<section class="mp-fast-detail-hero"><div class="mp-fast-detail-cover class-cover" data-cover-mark="${esc(coverMark)}"><div class="mp-course-detail-cover-tags">${pill('快速报名', 'light')}${pill(status, statusTone)}</div></div><div class="mp-fast-detail-summary"><h2>${esc(item.className || item.name)}</h2><p>${esc(item.courseName || item.name)} · ${esc(item.professional || item.category)}</p><strong class="mp-fast-detail-price">¥${item.price.toLocaleString()}.00</strong></div></section>`,
    card(`<div class="mp-section-head"><h3>报名信息</h3>${pill(status, statusTone)}</div><dl class="mp-fast-detail-facts"><div><dt>授课教师</dt><dd>${esc(item.teacher)}老师</dd></div><div><dt>上课教室</dt><dd>${esc(item.campus)} · ${esc(item.classroom || '待定')}</dd></div><div class="wide"><dt>上课时间</dt><dd>${esc(item.schedule || '以开课通知为准')}</dd></div><div><dt>总课时</dt><dd>${esc(item.hours)}课时</dd></div><div><dt>剩余名额</dt><dd>${available ? esc(item.seats) : '已满员'}</dd></div><div><dt>报名截止</dt><dd>${esc(item.deadline || '以招生通知为准')}</dd></div></dl>`, 'mp-fast-detail-section'),
    card(`<h3>课程简介</h3><article class="mp-rich-content mp-fast-detail-content">${detail.map(text => `<p>${esc(text)}</p>`).join('')}</article>`, 'mp-fast-detail-section'),
    outline,
    action
  ));
}
function classLearningRecord(item) { return learningRecords().find(record => record.courseId === item.id && record.type === 'class'); }
function classStatusLabel(record, item) { return record?.status === 'ended' ? '已结束' : record?.status === 'upcoming' ? '待开课' : record ? '学习中' : item.classStatus || '招生中'; }
function classInfoView(item, record) {
  const status = classStatusLabel(record, item);
  const statusTone = status === '学习中' ? 'green' : status === '待开课' ? 'amber' : status === '已结束' ? 'gray' : 'green';
  const coverMark = (item.professional || item.name).slice(0, 1);
  const intro = (item.detail || [item.intro || '本班为线下面授课程，具体教学安排以班级通知为准。']).map(text => `<p>${esc(text)}</p>`).join('');
  const outline = Array.isArray(item.outline) && item.outline.length ? `<section class="mp-class-detail-block"><div class="mp-section-head"><h3>课程大纲</h3><span class="mp-muted">共${item.outline.length}章</span></div><div class="mp-course-detail-outline">${item.outline.map((chapter, index) => `<div class="mp-course-detail-chapter"><span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></div>`).join('')}</div></section>` : '';
  return `<section class="mp-class-detail-hero"><div class="mp-class-detail-cover class-cover" data-cover-mark="${esc(coverMark)}"><div class="mp-course-detail-cover-tags">${pill('面授课程', 'light')}${pill(status, statusTone)}</div><span class="mp-course-detail-cover-label">${esc(item.professional || item.category)}</span></div><div class="mp-class-detail-summary"><span class="mp-course-detail-kicker">班级课程</span><h2>${esc(item.className || item.name)}</h2><p>${esc(item.courseName || item.name)} · 当前学员：${esc(currentStudent().name)}</p></div></section><section class="mp-class-detail-block"><div class="mp-section-head"><h3>课程信息</h3>${pill(status, statusTone)}</div><dl class="mp-class-detail-facts"><div><dt>授课教师</dt><dd>${esc(item.teacher)}老师</dd></div><div><dt>总课时</dt><dd>${esc(item.hours)}课时</dd></div><div class="wide"><dt>上课时间</dt><dd>${esc(item.schedule || '以开课通知为准')}</dd></div><div class="wide"><dt>上课教室</dt><dd>${esc(item.campus)} · ${esc(item.classroom || '待定')}</dd></div><div><dt>班级人数</dt><dd>${esc(item.seats || '待更新')}</dd></div><div><dt>适合年龄</dt><dd>${esc(item.age || '不限')}</dd></div></dl></section><section class="mp-class-detail-block"><h3>课程简介</h3><article class="mp-rich-content mp-class-detail-intro">${intro}</article></section>${outline}`;
}
function classAttendanceHomeworkView(item) {
  const work = homeworkState();
  return `<section class="mp-class-detail-block"><div class="mp-section-head"><h3>我的考勤</h3><span class="mp-muted">按课次记录</span></div><div class="mp-class-attendance-list"><div class="mp-class-attendance-row"><div><strong>第1课 · 基础训练</strong><small>2026-09-05 09:00</small></div>${pill('已签到', 'green')}</div><div class="mp-class-attendance-row"><div><strong>第2课 · 身韵练习</strong><small>2026-09-12 09:00</small></div>${pill('迟到', 'amber')}</div><div class="mp-class-attendance-row"><div><strong>第3课 · 组合训练</strong><small>2026-09-19 09:00</small></div>${pill('待签到', 'gray')}</div></div></section><section class="mp-class-detail-block"><div class="mp-section-head"><h3>我的作业</h3>${pill(work.status === '已提交' ? '已提交' : work.status === '草稿' ? '草稿' : '待提交', work.status === '已提交' ? 'green' : 'amber')}</div><article class="mp-class-homework-item"><div><strong>节奏练习视频</strong><p>截止时间：2026-09-27 23:59</p><small>${work.status === '已提交' ? `已提交${work.fileName ? ` · ${esc(work.fileName)}` : ''}；教师评语：${esc(work.feedback || '教师尚未完成批改。')}` : '提交文字说明，并可附加图片、视频或音频文件。'}</small></div><a class="mp-button secondary" href="/learner/pages/homework.html?courseId=${item.id}">${work.status === '已提交' ? '查看作业' : '提交作业'}</a></article></section>`;
}
function renderClassDetail(item = course('class-001'), tab = params.get('tab') || 'overview') {
  const record = classLearningRecord(item);
  const activeTab = ['overview', 'attendance', 'result'].includes(tab) ? tab : 'overview';
  const content = activeTab === 'attendance' ? classAttendanceHomeworkView(item) : activeTab === 'result' ? resultView(item, record) : classInfoView(item, record);
  layout(stack(`<section class="mp-class-detail-tabs" role="tablist"><button class="mp-tab ${activeTab === 'overview' ? 'active' : ''}" type="button" role="tab" aria-selected="${activeTab === 'overview'}" data-class-tab="overview">课程信息</button><button class="mp-tab ${activeTab === 'attendance' ? 'active' : ''}" type="button" role="tab" aria-selected="${activeTab === 'attendance'}" data-class-tab="attendance">考勤作业</button><button class="mp-tab ${activeTab === 'result' ? 'active' : ''}" type="button" role="tab" aria-selected="${activeTab === 'result'}" data-class-tab="result">我的成果</button></section>`, content));
  document.querySelectorAll('[data-class-tab]').forEach(tabButton => tabButton.addEventListener('click', () => go(`/learner/pages/class-detail.html?courseId=${encodeURIComponent(item.id)}&tab=${tabButton.dataset.classTab}`)));
}
function homeworkView(item) { return `<h3>我的作业</h3><div class="mp-list" style="margin-top:10px"><div class="mp-item"><div><strong>课堂组合练习记录</strong><small>截止时间：2026-09-20 · 教师评语：动作衔接自然，继续保持。</small></div>${pill('已批改', 'green')}</div><div class="mp-item"><div><strong>节奏练习视频</strong><small>截止时间：2026-09-27 · 仅支持文字说明和附件。</small></div>${button('提交作业', `data-action="homework" data-course-id="${item.id}"`, 'secondary')}</div></div>`; }
function resultView(item = course('class-001'), record) { const completion = state.completionStatus || (record?.status === 'ended' ? '已结业' : '审核中'); const completionTone = completion === '已结业' ? 'green' : completion === '补课中' ? 'amber' : 'gray'; const report = reportState(); const certificate = state.certificateStatus || (completion === '已结业' ? '已生成' : '生成中'); return `<section class="mp-class-detail-block"><h3>结业状态</h3><div class="mp-class-result-status"><div><strong>${esc(completion)}</strong><p>班级“${esc(classStatusLabel(record, item))}”不代表当前学员已结业，以下状态仅针对当前学员。</p></div>${pill(completion, completionTone)}</div></section>${completion === '已结业' ? `<section class="mp-class-detail-block"><h3>结业评语</h3><p>综合评语：课堂参与积极，基本功和组合衔接持续进步。</p><p>成长建议：保持每周练习，关注动作细节和节奏稳定性。</p></section>` : ''}<section class="mp-class-detail-block"><div class="mp-section-head"><h3>学习报告</h3>${pill(report, report === '已发布' ? 'green' : report === '已撤回' ? 'gray' : 'amber')}</div><p>${report === '已发布' ? '学习报告已发布，包含课堂参与、作品练习和阶段展示成果。' : report === '已撤回' ? '报告暂不可查看，教务正在更新。' : '学习报告正在生成中，完成后会通过消息通知。'}</p>${report === '已发布' ? `<a class="mp-button secondary" href="/learner/pages/results.html?courseId=${item.id}">查看报告详情</a>` : ''}</section><section class="mp-class-detail-block"><div class="mp-section-head"><h3>结业证书</h3>${pill(certificate, certificate === '已生成' ? 'green' : certificate === '生成异常' ? 'gray' : 'amber')}</div><p>${certificate === '已生成' ? '证书已生成，可在线查看。' : certificate === '生成异常' ? '证书生成异常，请联系教务。' : '证书将在结业通过后异步生成。'}</p></section>`; }
function homeworkState() { return state.homework || { status: '未提交', text: '', fileName: '', feedback: '' }; }
function renderHomeworkPage() { const item = course(params.get('courseId') || 'class-001'); const work = homeworkState(); layout(stack(card(`<div class="mp-pills">${pill('待提交', 'amber')}${pill('面授课程', 'gray')}</div><h2 style="margin-top:12px">节奏练习视频</h2><p>${esc(item.name)} · 截止时间：2026-09-27 23:59</p><div class="mp-divider"></div><p>请提交本周节奏练习记录，可以填写文字说明并附加图片、视频或音频文件。</p>`), card(`<form id="homework-form" class="mp-form"><div class="mp-field"><label for="homework-text">作业说明</label><textarea id="homework-text" placeholder="请输入本次作业说明">${esc(work.text)}</textarea></div><div class="mp-field"><label for="homework-file">附件</label><input id="homework-file" type="file" accept="image/*,video/*,audio/*"><small class="mp-muted">演示原型只记录文件名，不上传真实文件。</small><span id="homework-file-name" class="mp-muted">${work.fileName ? `已选择：${esc(work.fileName)}` : '尚未选择附件'}</span></div><p id="homework-error" class="mp-notice" hidden></p><div class="mp-actions"><button type="button" class="mp-button secondary" data-homework-action="save">保存草稿</button><button type="submit" class="mp-button">提交作业</button></div></form>`), work.status === '已提交' ? card(`<h3>教师评语</h3><p>${esc(work.feedback || '教师尚未完成批改。')}</p>`) : ''));
  const fileInput = document.querySelector('#homework-file'); fileInput.addEventListener('change', event => { const file = event.target.files[0]; if (file) document.querySelector('#homework-file-name').textContent = `已选择：${file.name}`; });
  document.querySelector('#homework-form').addEventListener('submit', event => submitHomework(event, false)); document.querySelector('[data-homework-action="save"]').addEventListener('click', () => submitHomework(null, true));
}
function submitHomework(event, draft) { event?.preventDefault(); const text = document.querySelector('#homework-text').value.trim(); const file = document.querySelector('#homework-file').files[0]; const existingFile = homeworkState().fileName; if (!draft && !text && !file && !existingFile) { const error = document.querySelector('#homework-error'); error.hidden = false; error.textContent = '请填写作业说明或选择附件后再提交'; return; } state.homework = { status: draft ? '草稿' : '已提交', text, fileName: file?.name || existingFile, feedback: homeworkState().feedback }; saveState(); toast(draft ? '作业草稿已保存' : '作业已提交'); if (!draft) setTimeout(() => go(`/learner/pages/class-detail.html?courseId=${params.get('courseId') || 'class-001'}&tab=attendance`), 450); }
function reportState() { return state.reportStatus || '已发布'; }
function renderResultsPage() { const status = reportState(); const reportBody = status === '已发布' ? '<p>本报告记录当前学员在课堂参与、作品练习和阶段展示中的学习成果。</p>' : status === '已撤回' ? '<div class="mp-notice">报告暂不可查看，教务正在更新。已结业、结业评语和证书不受影响。</div>' : '<div class="mp-notice">学习报告正在生成中，完成后会通过消息通知学员。</div>'; layout(stack(card(`<div class="mp-pills">${pill('已结业', 'green')}${pill(currentStudent().name, 'gray')}</div><h2 style="margin-top:12px">少儿中国舞基础班 · 我的成果</h2><p>班级结束不代表结业，当前页面仅展示当前学员成果。</p>`), card(`<h3>结业评语</h3><p>综合评语：课堂参与积极，基本功和组合衔接持续进步。</p><p>成长建议：保持每周练习，关注动作细节和节奏稳定性。</p>`), card(`<div class="mp-section-head"><h3>学习报告</h3>${pill(status, status === '已发布' ? 'green' : status === '已撤回' ? 'gray' : 'amber')}</div><div style="margin-top:10px">${reportBody}</div><div class="mp-field" style="margin-top:14px"><label for="report-status">演示报告状态</label><select id="report-status"><option ${status === '已发布' ? 'selected' : ''}>已发布</option><option ${status === '已撤回' ? 'selected' : ''}>已撤回</option><option ${status === '生成中' ? 'selected' : ''}>生成中</option></select></div>`), card(`<div class="mp-section-head"><h3>结业证书</h3>${pill('已生成', 'green')}</div><p>证书编号：CERT-2026-0908-001 · 可在线查看。</p>`))); document.querySelector('#report-status').addEventListener('change', event => { state.reportStatus = event.target.value; saveState(); renderResultsPage(); }); }
function renderPayment() { const item = course(params.get('courseId') || 'video-001'); layout(stack(card(`<div class="mp-pills">${pill(item.type === 'video' ? '视频课程' : '面授课程')}</div><h2 style="margin-top:10px">${esc(item.name)}</h2><p>${esc(courseMeta(item))}</p><div class="mp-divider"></div><div class="mp-row"><span class="mp-label">当前学员</span><select id="student-select" style="border:0;background:transparent;color:var(--ink);text-align:right">${state.students.map(student => `<option value="${student.id}" ${student.id === state.currentStudentId ? 'selected' : ''}>${esc(student.name)}</option>`).join('')}</select></div><div class="mp-row"><span class="mp-label">应付金额</span><strong class="mp-price">¥${item.price.toLocaleString()}.00</strong></div>`), card(`<label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--muted)"><input id="agreement" type="checkbox" style="margin-top:3px">我已阅读并同意用户协议、隐私政策和课程报名须知</label><div id="payment-error" class="mp-notice" hidden style="margin-top:12px"></div>`), `<div>${button('微信支付', 'id="pay-button"', 'full')}</div>`)); document.querySelector('#student-select').addEventListener('change', event => { state.currentStudentId = event.target.value; saveState(); }); document.querySelector('#pay-button').addEventListener('click', () => { if (!document.querySelector('#agreement').checked) { const error = document.querySelector('#payment-error'); error.hidden = false; error.textContent = '请先勾选用户协议和报名须知'; return; } const now = new Date().toISOString().slice(0, 16).replace('T', ' '); const existing = state.orders.find(order => order.courseId === item.id && order.status === '待支付'); if (existing) { existing.status = '已支付'; existing.studentId = state.currentStudentId; existing.paidAt = now; } else state.orders.unshift({ id: `OD${Date.now()}`, courseId: item.id, status: '已支付', amount: item.price, studentId: state.currentStudentId, createdAt: now, paidAt: now }); saveState(); toast('支付成功，学习权限已开通'); setTimeout(() => go(`/learner/pages/order-detail.html?courseId=${item.id}`), 500); }); }
function orderTone(status) { return status === '已支付' || status === '已退款' ? 'green' : status === '待支付' || status === '退款中' ? 'amber' : 'gray'; }
function orderTimes(order) { return { createdAt: order.createdAt || '2026-09-08 14:20', paidAt: order.paidAt || '' }; }
function renderOrders() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">单</span><strong>登录后查看我的订单</strong><p>登录后可查看课程交易记录、支付状态和退款进度。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/orders.html')}">去登录</a></section>`)); return; }
  const tabs = [['all', '全部'], ['待支付', '待支付'], ['已支付', '已支付'], ['退款中', '退款中'], ['已退款', '已退款'], ['已取消', '已取消']];
  layout(stack(card(`<div class="mp-tabs" aria-label="订单状态筛选">${tabs.map(([value, label], index) => `<button class="mp-tab ${index === 0 ? 'active' : ''}" data-order-tab="${value}" type="button">${label}</button>`).join('')}</div>`), `<div id="order-list" class="mp-order-list"></div>`));
  const draw = () => {
    const active = document.querySelector('[data-order-tab].active')?.dataset.orderTab || 'all';
    const orders = state.orders.filter(order => active === 'all' || order.status === active);
    const list = document.querySelector('#order-list');
    list.innerHTML = orders.length ? orders.map(order => {
      const item = course(order.courseId); const student = state.students.find(row => row.id === order.studentId) || currentStudent(); const times = orderTimes(order); const isClass = item.type === 'class';
      const action = order.status === '待支付' ? `<button class="mp-button mp-order-action" type="button" data-order-action="pay" data-course-id="${item.id}">去支付</button>` : order.status === '已支付' && isClass ? `<button class="mp-button secondary mp-order-action" type="button" data-order-action="refund" data-order-id="${order.id}">申请退款</button>` : `<a class="mp-button secondary mp-order-action" href="/learner/pages/order-detail.html?courseId=${encodeURIComponent(item.id)}">查看详情</a>`;
      return `<article class="mp-order-card"><div class="mp-order-card-head"><div><strong>${esc(item.name)}</strong><small>${isClass ? '面授课程' : '视频课程'} · ${esc(order.id)}</small></div>${pill(order.status, orderTone(order.status))}</div><div class="mp-order-card-facts"><div><span>当前学员</span><strong>${esc(student.name)}</strong></div><div><span>${isClass ? '班级' : '课程类型'}</span><strong>${esc(isClass ? item.className : '视频课程')}</strong></div>${isClass ? `<div><span>上课安排</span><strong>${esc(item.campus)} · ${esc(item.schedule)}</strong></div>` : `<div><span>下单时间</span><strong>${esc(times.createdAt)}</strong></div>`}<div><span>${times.paidAt ? '支付时间' : '订单时间'}</span><strong>${esc(times.paidAt || times.createdAt)}</strong></div></div><div class="mp-order-card-footer"><span>实付 <b>¥${Number(order.amount || item.price).toLocaleString()}.00</b></span><div class="mp-actions">${action}</div></div></article>`;
    }).join('') : `<div class="mp-empty">暂无${active === 'all' ? '' : active}订单</div>`;
    list.querySelectorAll('[data-order-action="pay"]').forEach(node => node.addEventListener('click', () => go(`/learner/pages/payment.html?courseId=${encodeURIComponent(node.dataset.courseId)}`)));
    list.querySelectorAll('[data-order-action="refund"]').forEach(node => node.addEventListener('click', () => { const order = state.orders.find(row => row.id === node.dataset.orderId); if (!order) return; order.status = '退款中'; saveState(); draw(); toast('退款申请已提交，等待后台审核'); }));
  };
  document.querySelectorAll('[data-order-tab]').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('[data-order-tab]').forEach(item => item.classList.remove('active')); tab.classList.add('active'); draw(); })); draw();
}
function renderOrderDetail() {
  if (!isLoggedIn()) { renderOrders(); return; }
  const item = course(params.get('courseId') || 'video-001');
  const order = state.orders.find(row => row.courseId === item.id) || { id: '待生成', status: '待支付', amount: item.price, studentId: state.currentStudentId, createdAt: '待生成', paidAt: '' };
  const student = state.students.find(row => row.id === order.studentId) || currentStudent();
  const times = orderTimes(order);
  const isClass = item.type === 'class';
  const isPaid = order.status === '已支付';
  const canRefund = isClass && isPaid;
  const statusCopy = { '待支付': '订单已创建，请在有效期内完成支付。', '已支付': '支付已确认，订单交易完成。', '退款中': '退款申请已提交，正在等待后台审核。', '已退款': '退款已完成，面授报名资格已取消。', '已取消': '订单已关闭，当前无法继续支付。' }[order.status] || '订单状态以系统记录为准。';
  const productSummary = isClass
    ? `<div class="mp-order-product-copy"><strong>${esc(item.className)}</strong><span>${esc(item.courseName || item.name)} · ${esc(item.teacher)}老师</span></div><div class="mp-order-product-cover class-cover">面授</div>`
    : `<div class="mp-order-product-copy"><strong>${esc(item.name)}</strong><span>${esc(item.teacher)}老师 · 共${esc(item.hours)}课时</span></div><div class="mp-order-product-cover video-cover">视频</div>`;
  const primaryAction = order.status === '待支付'
    ? `<a class="mp-button full" href="/learner/pages/payment.html?courseId=${encodeURIComponent(item.id)}">去支付</a>`
    : isClass && isPaid
      ? `<a class="mp-button full" href="${courseLink(item)}">查看班级</a>`
      : isPaid
        ? `<button class="mp-button full" type="button" data-action="learning">进入学习</button>`
        : '';
  const secondaryAction = canRefund ? button('申请退款', `data-action="refund" data-order-id="${order.id}"`, 'secondary') : '';
  layout(stack(
    card(`<div class="mp-order-detail-status">${pill(order.status, orderTone(order.status))}<span class="mp-muted">${isClass ? '面授课程订单' : '视频课程订单'}</span></div><div class="mp-order-status-copy">${esc(statusCopy)}</div>`),
    card(`<div class="mp-order-product">${productSummary}</div><div class="mp-divider"></div><div class="mp-row"><span class="mp-label">订单金额</span><strong class="mp-price">¥${Number(order.amount || item.price).toLocaleString()}.00</strong></div>`),
    card(`<div class="mp-section-head"><h3>订单信息</h3><span class="mp-muted">交易记录</span></div><dl class="mp-order-detail-facts"><div><dt>订单号</dt><dd>${esc(order.id)}</dd></div><div><dt>当前学员</dt><dd>${esc(student.name)}</dd></div><div><dt>下单时间</dt><dd>${esc(times.createdAt)}</dd></div><div><dt>${times.paidAt ? '支付时间' : '支付状态'}</dt><dd>${esc(times.paidAt || order.status)}</dd></div><div><dt>课程类型</dt><dd>${isClass ? '面授课程' : '视频课程'}</dd></div><div><dt>支付方式</dt><dd>${isPaid || times.paidAt ? '微信支付' : '待支付'}</dd></div></dl>`),
    card(`<div class="mp-section-head"><h3>${isClass ? '报名信息' : '课程权限'}</h3>${pill(isClass ? (isPaid ? '已保留名额' : '待支付') : (isPaid ? '已开通' : '待开通'), isPaid ? 'green' : 'amber')}</div>${isClass ? `<dl class="mp-order-detail-facts"><div><dt>班级</dt><dd>${esc(item.className)}</dd></div><div><dt>授课教师</dt><dd>${esc(item.teacher)}老师</dd></div><div><dt>上课时间</dt><dd>${esc(item.schedule)}</dd></div><div><dt>上课教室</dt><dd>${esc(item.campus)} · ${esc(item.classroom)}</dd></div></dl>` : `<p>${isPaid ? '课程学习权限已生效，学习状态和进度请前往“我的学习”查看。' : '完成支付后将开通课程学习权限，学习进度不会显示在订单状态中。'}</p>`}${order.status === '退款中' ? `<div class="mp-notice" style="margin-top:12px">退款审核期间，面授报名资格暂时冻结。</div>` : order.status === '已退款' ? `<div class="mp-notice" style="margin-top:12px">退款完成后，原面授班级名额已释放。</div>` : !isClass && isPaid ? `<div class="mp-notice" style="margin-top:12px">视频课程订单不支持退款，订单状态与学习状态相互独立。</div>` : ''}`),
    primaryAction || secondaryAction ? `<div class="mp-order-detail-actions">${primaryAction}${secondaryAction ? `<div class="mp-actions">${secondaryAction}</div>` : ''}</div>` : '',
    `<a class="mp-button secondary full" href="/learner/pages/orders.html">返回我的订单</a>`
  ));
}
function learningRecords() {
  const videoProgress = state.chapterDone.includes('chapter-003') ? 100 : course('video-001').progress;
  const records = [
    { id: 'learning-class-001', courseId: 'class-001', studentIds: ['student-001'], type: 'class', status: 'ongoing', progress: 80, className: '2026秋季中国舞启蒙一班', teacher: '王玥', classroom: '龙泉校区 · 综合楼302', nextLesson: '09-16 09:00' },
    { id: 'learning-video-001', courseId: 'video-001', studentIds: ['student-001', 'student-002'], type: 'video', status: 'ongoing', progress: videoProgress, lastPosition: '第3章 · 作品演唱 18:36' },
    { id: 'learning-class-002', courseId: 'class-002', studentIds: ['student-001', 'student-002'], type: 'class', status: 'upcoming', progress: 0, className: '2026秋季钢琴启蒙一班', teacher: '李老师', classroom: '南湖校区 · 音乐楼205', nextLesson: '10-12 14:00' },
    { id: 'learning-class-ended', studentIds: ['student-001'], type: 'class', status: 'ended', progress: 100, name: '少儿中国舞基础', className: '2026春季中国舞基础班', teacher: '王玥', classroom: '龙泉校区 · 综合楼302', completionStatus: '已结业', href: '/learner/pages/results.html?courseId=class-001' }
  ];
  return records.filter(item => item.studentIds.includes(state.currentStudentId)).map(item => {
    const source = item.courseId ? course(item.courseId) : {};
    return { ...source, ...item, name: item.name || source.name, href: item.href || (item.type === 'video' ? `/learner/pages/video.html?courseId=${source.id}` : courseLink(source)) };
  });
}
function learningTasks() {
  if (state.currentStudentId !== 'student-001') return [];
  const tasks = [];
  if (homeworkState().status !== '已提交') tasks.push({ title: '作业待提交', detail: '节奏练习视频 · 截止 09-27', label: '去提交', tone: 'amber', href: '/learner/pages/class-detail.html?courseId=class-001&tab=attendance' });
  if (reportState() === '已发布') tasks.push({ title: '报告已发布', detail: '少儿中国舞基础班 · 学习报告可查看', label: '去查看', tone: 'green', href: '/learner/pages/results.html?courseId=class-001' });
  return tasks;
}
function learningCourseCard(item) {
  const isClass = item.type === 'class';
  const typeLabel = isClass ? '面授课程' : '视频课程';
  const statusLabels = { ongoing: '进行中', upcoming: '待开课', ended: '已结束' };
  const statusTones = { ongoing: 'green', upcoming: 'amber', ended: 'gray' };
  const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
  const facts = isClass
    ? `<div class="mp-learning-facts"><span>授课教师：${esc(item.teacher)}</span><span>上课教室：${esc(item.classroom)}</span><span>${item.status === 'upcoming' ? '首次上课' : item.status === 'ended' ? '课程状态' : '下次上课'}：${esc(item.status === 'ended' ? '课程已结束' : item.nextLesson)}</span></div>`
    : `<div class="mp-learning-facts"><span>上次看到：${esc(item.lastPosition)}</span></div>`;
  const actionLabel = item.status === 'ended' ? '查看成果' : isClass ? '进入班级' : '继续学习';
  return `<article class="mp-learning-course-card"><div class="mp-learning-course-main"><div class="mp-learning-cover ${isClass ? 'class-cover' : 'video-cover'}" data-cover-mark="${esc(coverMark)}"><span>${typeLabel}</span></div><div class="mp-learning-course-copy"><div class="mp-learning-title-row"><h3>${esc(item.name)}</h3>${pill(statusLabels[item.status], statusTones[item.status])}</div>${isClass ? `<p>${esc(item.className)}</p>` : ''}${facts}</div></div><div class="mp-learning-progress"><div><span>${item.status === 'upcoming' ? '开课进度' : '学习进度'}</span><strong>${item.progress}%</strong></div><div class="mp-progress"><span style="width:${item.progress}%"></span></div></div><footer class="mp-learning-course-footer">${item.status === 'ended' ? `<span class="mp-learning-completion">当前学员：${esc(item.completionStatus)}</span>` : '<span></span>'}<a class="mp-button secondary" href="${item.href}">${actionLabel}</a></footer></article>`;
}
function renderLearning() {
  const statusLabels = { ongoing: '进行中', upcoming: '待开课', ended: '已结束' };
  const attendanceRates = { 'student-001': 92, 'student-002': 100 };
  let activeStatus = 'ongoing';
  const draw = () => {
    const records = learningRecords();
    const tasks = learningTasks();
    const filtered = records.filter(item => item.status === activeStatus);
    const activeCount = records.filter(item => item.status !== 'ended').length;
    const certificates = records.filter(item => item.status === 'ended' && item.completionStatus === '已结业').length;
    layout(stack(
      card(`<div class="mp-learning-student"><div><span class="mp-muted">当前学员</span><strong>${esc(currentStudent().name)}</strong></div><div class="mp-field"><label class="mp-sr-only" for="learning-student-select">切换当前学员</label><select id="learning-student-select">${state.students.map(student => `<option value="${student.id}" ${student.id === state.currentStudentId ? 'selected' : ''}>${esc(student.name)}</option>`).join('')}</select></div></div><div class="mp-section-head mp-learning-summary-head"><h2>学习进度总览</h2></div><div class="mp-metric-grid mp-learning-metrics"><div class="mp-metric"><strong>${activeCount}</strong><span>在读课程</span></div><div class="mp-metric"><strong>${attendanceRates[state.currentStudentId] || 0}%</strong><span>总出勤率</span></div><div class="mp-metric"><strong>${tasks.length}</strong><span>待办事项</span></div><div class="mp-metric"><strong>${certificates}</strong><span>已获证书</span></div></div>`),
      card(`<div class="mp-section-head"><h2>待办任务</h2><span class="mp-muted">${tasks.length}项</span></div>${tasks.length ? `<div class="mp-learning-task-list">${tasks.map(task => `<a class="mp-learning-task" href="${task.href}"><div><strong>${esc(task.title)}</strong><small>${esc(task.detail)}</small></div>${pill(task.label, task.tone)}</a>`).join('')}</div>` : '<div class="mp-empty mp-learning-empty">暂无待办任务</div>'}`),
      `<section class="mp-learning-section"><div class="mp-section-head"><h2>我的课程</h2><span class="mp-muted">${records.length}门</span></div><div class="mp-tabs mp-learning-tabs" role="tablist">${Object.entries(statusLabels).map(([status, label]) => `<button class="mp-tab ${status === activeStatus ? 'active' : ''}" type="button" role="tab" aria-selected="${status === activeStatus}" data-learning-status="${status}">${label}<span>${records.filter(item => item.status === status).length}</span></button>`).join('')}</div><div class="mp-learning-course-list">${filtered.length ? filtered.map(learningCourseCard).join('') : '<div class="mp-empty">当前状态下暂无课程</div>'}</div></section>`
    ));
    document.querySelector('#learning-student-select').addEventListener('change', event => { state.currentStudentId = event.target.value; saveState(); activeStatus = 'ongoing'; draw(); });
    document.querySelectorAll('[data-learning-status]').forEach(tab => tab.addEventListener('click', () => { activeStatus = tab.dataset.learningStatus; draw(); }));
  };
  draw();
}
function renderVideo() {
  const item = course(params.get('courseId') || 'video-001');
  const chapters = Array.isArray(item.outline) && item.outline.length ? item.outline : [{ title: '第1章 · 基础训练', note: '第1节' }, { title: '第2章 · 技术练习', note: '第2节' }, { title: '第3章 · 作品演唱', note: '第3节' }];
  const currentIndex = Math.min(Math.max(Number(params.get('chapter') || chapters.length - 1), 0), chapters.length - 1);
  const current = chapters[currentIndex];
  const chapterId = `chapter-${String(currentIndex + 1).padStart(3, '0')}`;
  const completedIds = Array.isArray(state.chapterDone) ? state.chapterDone : [];
  const isCompleted = completedIds.includes(chapterId);
  const completedCount = chapters.filter((_, index) => completedIds.includes(`chapter-${String(index + 1).padStart(3, '0')}`)).length;
  const courseProgress = completedCount === chapters.length ? 100 : Number(item.progress || 0);
  const positions = state.videoPositions || {};
  let watchedSeconds = Number(positions[chapterId] || (currentIndex === chapters.length - 1 ? 1116 : 0));
  const watchedText = `${String(Math.floor(watchedSeconds / 60)).padStart(2, '0')}:${String(watchedSeconds % 60).padStart(2, '0')}`;
  const totalSeconds = 2400;
  const watchedRatio = Math.min(Math.round((watchedSeconds / totalSeconds) * 100), 100);
  const chapterItems = chapters.map((chapter, index) => {
    const id = `chapter-${String(index + 1).padStart(3, '0')}`;
    const done = completedIds.includes(id);
    const active = index === currentIndex;
    return `<button class="mp-video-chapter ${active ? 'active' : ''}" type="button" data-video-chapter="${index}" aria-current="${active ? 'true' : 'false'}"><span class="mp-video-chapter-index">${String(index + 1).padStart(2, '0')}</span><span class="mp-video-chapter-copy"><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '视频课节')}</small></span>${done ? '<span class="mp-video-check" aria-label="已完成">✓</span>' : active ? pill('学习中') : '<span class="mp-video-chapter-arrow" aria-hidden="true">›</span>'}</button>`;
  }).join('');
  layout(stack(
    `<section class="mp-video-player-wrap"><div id="video-player" class="mp-video-player" data-playing="false"><div class="mp-video-poster" data-cover-mark="${esc((item.professional || item.name).slice(0, 1))}"><span class="mp-video-type">视频课程</span><button id="video-play" class="mp-video-play" type="button" aria-label="播放视频"><span aria-hidden="true">▶</span></button><strong>${esc(current.title)}</strong></div><div class="mp-video-controls"><div class="mp-video-scrubber"><span style="width:${watchedRatio}%"></span></div><div class="mp-video-control-row"><button id="video-play-small" class="mp-video-control-icon" type="button" aria-label="播放或暂停"><span aria-hidden="true">▶</span></button><span class="mp-video-time">${watchedText} / 40:00</span><div class="mp-video-control-right"><button id="video-speed" class="mp-video-speed" type="button">1×</button><button id="video-fullscreen" class="mp-video-control-icon" type="button" aria-label="全屏"><span aria-hidden="true">⛶</span></button></div></div></div></div><div class="mp-video-current"><div><span class="mp-muted">正在学习</span><h2>${esc(current.title)}</h2></div><span class="mp-video-current-progress">本课 ${watchedRatio}%</span></div></section>`,
    card(`<div class="mp-section-head"><h3>学习进度</h3><strong class="mp-video-progress-value">${courseProgress}%</strong></div><div class="mp-progress"><span style="width:${courseProgress}%"></span></div><p class="mp-video-progress-copy">已完成 ${completedCount}/${chapters.length} 章节 · 当前学习进度会自动保存</p>`, 'mp-video-progress-card'),
    `<section class="mp-video-outline"><div class="mp-section-head"><h3>课程目录</h3><span class="mp-muted">共${chapters.length}章</span></div><div class="mp-video-chapter-list">${chapterItems}</div><div class="mp-video-complete-row">${button(isCompleted ? '本节已完成' : '标记本节完成', 'id="complete-chapter"', 'secondary')}</div></section>`,
    `<nav class="mp-video-navigation" aria-label="章节导航"><button class="mp-button secondary" type="button" data-video-nav="prev" ${currentIndex === 0 ? 'disabled' : ''}><span aria-hidden="true">‹</span> 上一节</button><button class="mp-button" type="button" data-video-nav="next" ${currentIndex === chapters.length - 1 ? 'disabled' : ''}>下一节 <span aria-hidden="true">›</span></button></nav>`
  ));
  const player = document.querySelector('#video-player');
  const playButtons = [document.querySelector('#video-play'), document.querySelector('#video-play-small')];
  let playTimer;
  const updatePlayback = () => { watchedSeconds = Math.min(watchedSeconds + 1, totalSeconds); state.videoPositions = { ...(state.videoPositions || {}), [chapterId]: watchedSeconds }; saveState(); const time = player.querySelector('.mp-video-time'); const scrubber = player.querySelector('.mp-video-scrubber span'); if (time) time.textContent = `${String(Math.floor(watchedSeconds / 60)).padStart(2, '0')}:${String(watchedSeconds % 60).padStart(2, '0')} / 40:00`; if (scrubber) scrubber.style.width = `${Math.min(Math.round((watchedSeconds / totalSeconds) * 100), 100)}%`; };
  const togglePlay = () => { const playing = player.dataset.playing === 'true'; player.dataset.playing = String(!playing); playButtons.forEach(control => { control.querySelector('span').textContent = playing ? '▶' : 'Ⅱ'; control.setAttribute('aria-label', playing ? '播放视频' : '暂停视频'); }); if (playing) { clearInterval(playTimer); } else { playTimer = setInterval(updatePlayback, 1000); } };
  window.addEventListener('pagehide', () => clearInterval(playTimer), { once: true });
  playButtons.forEach(control => control.addEventListener('click', togglePlay));
  let speedIndex = 0;
  const speeds = ['1×', '1.25×', '1.5×', '2×'];
  document.querySelector('#video-speed').addEventListener('click', event => { speedIndex = (speedIndex + 1) % speeds.length; event.currentTarget.textContent = speeds[speedIndex]; toast(`播放速度 ${speeds[speedIndex]}`); });
  document.querySelector('#video-fullscreen').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen?.(); else player.requestFullscreen?.(); });
  document.querySelectorAll('[data-video-chapter]').forEach(chapter => chapter.addEventListener('click', () => go(`/learner/pages/video.html?courseId=${encodeURIComponent(item.id)}&chapter=${chapter.dataset.videoChapter}`)));
  document.querySelectorAll('[data-video-nav]').forEach(control => control.addEventListener('click', () => { const nextIndex = currentIndex + (control.dataset.videoNav === 'next' ? 1 : -1); if (nextIndex >= 0 && nextIndex < chapters.length) go(`/learner/pages/video.html?courseId=${encodeURIComponent(item.id)}&chapter=${nextIndex}`); }));
  document.querySelector('#complete-chapter').addEventListener('click', () => { state.chapterDone = [...new Set([...completedIds, chapterId])]; state.videoPositions = { ...(state.videoPositions || {}), [chapterId]: totalSeconds }; saveState(); renderVideo(); toast('学习进度已保存'); });
}
function consultationStatusTone(status) { return status === '已回复' || status === '已报名' ? 'green' : status === '已试听' ? 'amber' : 'gray'; }
function renderConsultation() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">咨</span><strong>登录后查看我的咨询</strong><p>登录后可查看已关联咨询、顾问回复和试听进度。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/consultation.html')}">去登录</a></section>`)); return; }
  const rows = state.consultations.filter(row => !row.anonymous);
  layout(stack(card(`<div class="mp-section-head"><h2>我的咨询</h2><span class="mp-muted">${rows.length}条记录</span></div><p class="mp-muted">仅展示当前登录账号提交且已关联的售前咨询。匿名咨询由课程顾问在后台跟进。</p>`), rows.length ? `<section class="mp-consultation-list">${rows.map(row => { const item = course(row.courseId); return `<a class="mp-consultation-item" href="/learner/pages/consultation-detail.html?consultationId=${encodeURIComponent(row.id)}"><div class="mp-consultation-item-head"><strong>${esc(item.name)}</strong>${pill(row.status, consultationStatusTone(row.status))}</div><p>${esc(row.text)}</p><div class="mp-consultation-meta"><span>${esc(row.submittedAt || '提交时间待补充')}</span><span>${esc(row.progress || '待跟进')}</span><span aria-hidden="true">›</span></div></a>`; }).join('')}</section>` : `<div class="mp-empty">暂无已关联咨询记录</div>`));
}
function renderConsultationDetail() {
  if (!isLoggedIn()) { renderConsultation(); return; }
  const row = state.consultations.find(item => item.id === params.get('consultationId') && !item.anonymous);
  if (!row) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">咨</span><strong>咨询记录不存在</strong><p>该咨询可能尚未关联到当前账号。</p><a class="mp-button secondary" href="/learner/pages/consultation.html">返回我的咨询</a></section>`)); return; }
  const item = course(row.courseId);
  layout(stack(card(`<div class="mp-section-head"><h2>咨询详情</h2>${pill(row.status, consultationStatusTone(row.status))}</div><p>${esc(item.name)} · ${esc(item.teacher)}老师</p><div class="mp-divider"></div><dl class="mp-consultation-detail-facts"><div><dt>提交时间</dt><dd>${esc(row.submittedAt || '待补充')}</dd></div><div><dt>当前进度</dt><dd>${esc(row.progress || '待跟进')}</dd></div></dl>`), card(`<h3>咨询内容</h3><p class="mp-consultation-question">${esc(row.text)}</p>`), card(`<h3>课程顾问回复</h3>${row.reply ? `<p class="mp-consultation-reply">${esc(row.reply)}</p><small class="mp-muted">回复时间：${esc(row.replyAt || '待补充')}</small>` : '<div class="mp-notice">课程顾问尚未回复，请耐心等待。</div>'}`), `<a class="mp-button secondary full" href="/learner/pages/consultation.html">返回我的咨询</a>`));
}
function messageTone(type) { return type === '支付成功' || type === '报告发布' || type === '证书生成' ? 'green' : type === '上课提醒' ? 'amber' : 'gray'; }
function messageIcon(type) { return ({ '支付成功': '付', '报名成功': '报', '分班完成': '班', '上课提醒': '课', '作业发布': '作', '作业批改': '评', '结业通过': '成', '报告发布': '报', '证书生成': '证' })[type] || '信'; }
function messageTarget(row) { return row.target || (row.courseId ? `/learner/pages/${row.type === '支付成功' ? 'order-detail.html' : 'class-detail.html'}?courseId=${encodeURIComponent(row.courseId)}` : '/learner/pages/messages.html'); }
function renderMessages() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">信</span><strong>登录后查看消息通知</strong><p>登录后可查看支付、上课、作业和学习成果等消息。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/messages.html')}">去登录</a></section>`)); return; }
  const unreadCount = state.messages.filter(row => !row.read).length;
  layout(stack(card(`<div class="mp-section-head"><div><h2>消息通知</h2><p class="mp-muted">${unreadCount ? `有${unreadCount}条未读消息` : '消息已全部读完'}</p></div>${unreadCount ? button('全部已读', 'id="mark-all-messages"', 'secondary') : pill('已读', 'green')}</div><div class="mp-tabs" aria-label="消息筛选"><button class="mp-tab active" type="button" data-message-tab="all">全部</button><button class="mp-tab" type="button" data-message-tab="unread">未读${unreadCount ? ` ${unreadCount}` : ''}</button></div>`), `<div id="message-list" class="mp-message-list"></div>`));
  const draw = () => { const filter = document.querySelector('[data-message-tab].active')?.dataset.messageTab || 'all'; const rows = state.messages.filter(row => filter === 'all' || !row.read); const list = document.querySelector('#message-list'); list.innerHTML = rows.length ? rows.map(row => `<a class="mp-message-item ${row.read ? '' : 'is-unread'}" href="/learner/pages/message-detail.html?messageId=${encodeURIComponent(row.id)}"><span class="mp-message-icon ${messageTone(row.type)}" aria-hidden="true">${messageIcon(row.type)}</span><span class="mp-message-copy"><span class="mp-message-head"><strong>${esc(row.title)}</strong>${row.read ? '' : pill('未读', 'amber')}</span><span class="mp-message-summary">${esc(row.summary)}</span><span class="mp-message-meta"><span>${esc(row.type)}</span><span>${esc(row.createdAt)}</span></span></span><span class="mp-message-arrow" aria-hidden="true">›</span></a>`).join('') : '<div class="mp-empty">暂无消息</div>'; };
  document.querySelectorAll('[data-message-tab]').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('[data-message-tab]').forEach(item => item.classList.remove('active')); tab.classList.add('active'); draw(); }));
  document.querySelector('#mark-all-messages')?.addEventListener('click', () => { state.messages.forEach(row => { row.read = true; }); saveState(); renderMessages(); toast('已全部标记为已读'); });
  draw();
}
function renderMessageDetail() {
  if (!isLoggedIn()) { renderMessages(); return; }
  const row = state.messages.find(item => item.id === params.get('messageId'));
  if (!row) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">信</span><strong>消息不存在</strong><p>该消息可能已被删除或暂时无法查看。</p><a class="mp-button secondary" href="/learner/pages/messages.html">返回消息列表</a></section>`)); return; }
  row.read = true; saveState();
  layout(stack(card(`<div class="mp-message-detail-top"><span class="mp-message-icon ${messageTone(row.type)}" aria-hidden="true">${messageIcon(row.type)}</span><div><span class="mp-muted">${esc(row.type)}</span><h2>${esc(row.title)}</h2><small>${esc(row.createdAt)}</small></div></div>`), card(`<article class="mp-message-content"><p>${esc(row.body)}</p></article>`), card(`<div class="mp-section-head"><h3>相关内容</h3>${pill(row.read ? '已读' : '未读', row.read ? 'gray' : 'amber')}</div><p class="mp-muted">点击下方按钮查看这条消息对应的课程、订单或学习记录。</p><a class="mp-button full" href="${messageTarget(row)}">${row.type === '支付成功' ? '查看订单详情' : row.type === '报告发布' || row.type === '证书生成' ? '查看学习成果' : row.type === '作业批改' ? '查看作业' : '查看相关内容'}</a>`), `<a class="mp-button secondary full" href="/learner/pages/messages.html">返回消息列表</a>`));
}
function profileMetric(label, value, tone = '') { return `<span class="mp-profile-metric ${tone}"><strong>${value}</strong><small>${label}</small></span>`; }
function renderProfile() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">我</span><strong>登录后查看个人资料</strong><p>登录后可管理账号信息、当前学员和学习相关功能。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/profile.html')}">去登录</a></section>`)); return; }
  const linkedConsultations = state.consultations.filter(row => !row.anonymous);
  const unreadMessageCount = state.messages.filter(row => !row.read).length;
  const orderCount = status => state.orders.filter(order => order.status === status).length;
  const consultationCount = status => linkedConsultations.filter(row => row.status === status).length;
  layout(stack(
    card(`<div class="mp-profile-identity"><span class="mp-avatar mp-profile-avatar" aria-hidden="true">林</span><div><span class="mp-muted">个人资料 · 家长账号</span><h2>林女士</h2><p>手机号 ${esc(state.phone || '138****2026')}</p></div><span class="mp-profile-verified">已认证</span></div><div class="mp-profile-account-facts"><div><span>登录方式</span><strong>${state.wechatAuthorized === false ? '手机号登录' : '微信授权'}</strong></div><div><span>关联学员</span><strong>${state.students.length}人</strong></div></div>`),
    card(`<div class="mp-profile-student-head"><div><span class="mp-muted">当前学员</span><strong>${esc(currentStudent().name)}</strong><small>${esc(currentStudent().relation)} · 学习、订单和成果将以当前学员为准</small></div><button id="profile-add-student" class="mp-profile-add" type="button" aria-label="添加学员" title="添加学员">＋</button></div><div class="mp-student-list" aria-label="学员列表">${state.students.map(student => `<div class="mp-student-row ${student.id === state.currentStudentId ? 'is-current' : ''}"><span class="mp-student-avatar" aria-hidden="true">${esc(student.name.slice(0, 1))}</span><div class="mp-student-copy"><strong>${esc(student.name)}</strong><small>${esc(student.relation)}</small></div>${student.id === state.currentStudentId ? pill('当前学员', 'green') : `<button class="mp-button secondary mp-student-switch" type="button" data-student-switch="${esc(student.id)}">切换</button>`}</div>`).join('')}</div><p class="mp-profile-student-note">同一账号可关联多个学员，切换后将同步更新学习、订单和成果页面。</p>`),
    `<section class="mp-profile-entry-list" aria-label="个人中心功能"><a class="mp-profile-entry" href="/learner/pages/orders.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">单</span><strong>我的订单</strong><span class="mp-link">查看全部 ›</span></div><div class="mp-profile-metrics">${profileMetric('待支付', orderCount('待支付'), 'amber')}${profileMetric('已支付', orderCount('已支付'), 'green')}${profileMetric('已退款', orderCount('已退款'))}</div></a><a class="mp-profile-entry" href="/learner/pages/consultation.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">咨</span><strong>我的咨询</strong><span class="mp-link">查看记录 ›</span></div><div class="mp-profile-metrics mp-profile-consultation-metrics">${profileMetric('待回复', consultationCount('待回复'), 'amber')}${profileMetric('已回复', consultationCount('已回复'), 'green')}${profileMetric('已试听', consultationCount('已试听'))}${profileMetric('已报名', consultationCount('已报名'))}</div></a><a class="mp-profile-entry mp-profile-message-entry" href="/learner/pages/messages.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">信</span><strong>消息通知</strong>${unreadMessageCount ? `<span class="mp-profile-unread"><i aria-hidden="true"></i>${unreadMessageCount}条未读</span>` : '<span class="mp-muted">已读</span>'}<span class="mp-link">›</span></div></a></section>`,
    `<a class="mp-profile-entry mp-profile-teacher-entry" href="/login.html?role=teacher"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">师</span><div><strong>教师工作台</strong><small>课表、班级与教学执行</small></div><span class="mp-link">进入 ›</span></div></a>`,
    `<a class="mp-profile-entry mp-profile-settings-entry" href="/learner/pages/settings.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">设</span><strong>设置</strong><span class="mp-link">›</span></div></a>`
  ));
  document.querySelectorAll('[data-student-switch]').forEach(buttonNode => buttonNode.addEventListener('click', () => { state.currentStudentId = buttonNode.dataset.studentSwitch; saveState(); renderProfile(); toast(`已切换当前学员：${currentStudent().name}`); }));
  document.querySelector('#profile-add-student').addEventListener('click', showAddStudentDialog);
}
function showAddStudentDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><h2>添加学员</h2><p class="mp-dialog-copy">添加后可在个人资料页切换学员，学习记录和订单会按当前学员展示。</p><form id="profile-student-form" class="mp-form" style="margin-top:16px"><div class="mp-field"><label for="profile-student-name">学员姓名</label><input id="profile-student-name" required maxlength="20" placeholder="请输入学员姓名"><small id="profile-student-error" class="mp-form-error" hidden></small></div><div class="mp-field"><label for="profile-student-relation">与账号关系</label><select id="profile-student-relation"><option>女儿</option><option>儿子</option><option>本人</option><option>其他</option></select></div><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="submit">添加并切换</button></div></form></div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('#profile-student-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = dialog.querySelector('#profile-student-name').value.trim();
    if (!name) return;
    const error = dialog.querySelector('#profile-student-error');
    if (state.students.some(student => student.name === name)) { error.hidden = false; error.textContent = '该学员已存在，请直接切换当前学员。'; return; }
    const student = { id: `student-${Date.now()}`, name, relation: dialog.querySelector('#profile-student-relation').value };
    state.students.push(student);
    state.currentStudentId = student.id;
    saveState();
    dialog.close();
    renderProfile();
    toast(`已添加学员：${name}`);
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
}
function renderSettings() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">设</span><strong>登录后查看账号设置</strong><p>登录后可管理手机号、密码和微信授权。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/settings.html')}">去登录</a></section>`)); return; }
  const phone = state.phone || '138****2026';
  const settingsRows = [['换绑手机', phone, 'phone'], ['修改密码', '已设置', 'password'], ['微信授权', state.wechatAuthorized === false ? '未授权' : '已授权', 'wechat'], ['关于我们', '版本 1.0.0', 'about'], ['用户协议', '›', 'agreement'], ['隐私政策', '›', 'privacy']];
  layout(stack(card(`<div class="mp-section-head"><div><h2>账号设置</h2><p class="mp-muted">管理登录与隐私相关设置</p></div><span class="mp-settings-avatar" aria-hidden="true">设</span></div>`), `<section class="mp-settings-list">${settingsRows.map(([label, value, action]) => `<button class="mp-settings-row" type="button" data-settings-action="${action}"><span>${label}</span><span>${value}${['password', 'agreement', 'privacy'].includes(action) ? ' ›' : ''}</span></button>`).join('')}</section>`, card(`<div class="mp-settings-security"><div><strong>账号安全</strong><p>手机号已脱敏展示，修改敏感信息需要完成校验。</p></div>${pill('安全', 'green')}</div>`), `<button class="mp-button secondary full mp-settings-logout" id="settings-logout" type="button">退出登录</button>`));
  document.querySelectorAll('[data-settings-action]').forEach(row => row.addEventListener('click', () => showSettingsDialog(row.dataset.settingsAction)));
  document.querySelector('#settings-logout').addEventListener('click', () => showSettingsDialog('logout'));
}
function showSettingsDialog(type) {
  const copy = { about: ['关于我们', '<p>湖北艺校培训平台</p><p>面向学员提供课程浏览、报名、学习和成果服务。</p><small class="mp-muted">当前版本：1.0.0</small>'], agreement: ['用户协议', '<p>您可以通过本平台浏览课程、提交咨询、购买视频课程或报名面授班级。课程价格、班级名额和服务规则以页面实际展示为准。</p><p>请妥善保管账号信息，使用平台服务即表示您同意遵守相关协议。</p>'], privacy: ['隐私政策', '<p>平台仅在提供登录、课程报名、学习服务和售后联系所必需的范围内使用您的信息。</p><p>手机号等敏感信息会按最小必要原则脱敏展示，不会在学员端公开。</p>'] };
  const dialog = document.createElement('dialog'); dialog.className = 'mp-dialog';
  if (copy[type]) dialog.innerHTML = `<div class="mp-dialog-card"><h2>${copy[type][0]}</h2><article class="mp-settings-legal">${copy[type][1]}</article><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>关闭</button></div></div>`;
  else if (type === 'wechat') dialog.innerHTML = `<div class="mp-dialog-card"><h2>微信授权</h2><p>授权后可使用微信快捷登录。当前状态：${state.wechatAuthorized === false ? '未授权' : '已授权'}。</p><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="button" id="toggle-wechat">${state.wechatAuthorized === false ? '授权微信' : '解除授权'}</button></div></div>`;
  else if (type === 'phone') dialog.innerHTML = `<div class="mp-dialog-card"><h2>换绑手机号</h2><p>请输入新的手机号和验证码，完成后原手机号将不再作为登录手机号。</p><form class="mp-form" id="change-phone-form"><div class="mp-field"><label for="new-phone">新手机号</label><input id="new-phone" required pattern="1[3-9]\\d{9}" placeholder="请输入11位手机号"></div><div class="mp-field"><label for="phone-code">验证码</label><div class="mini-code-row"><input id="phone-code" required minlength="4" maxlength="6" inputmode="numeric" placeholder="请输入验证码"><button class="mp-button secondary" id="settings-send-code" type="button">获取验证码</button></div></div><small id="settings-form-error" class="mp-form-error" hidden></small><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="submit">确认换绑</button></div></form></div>`;
  else if (type === 'logout') dialog.innerHTML = `<div class="mp-dialog-card"><h2>退出登录</h2><p>退出后仍可浏览首页和课程，订单、学习与个人资料需要重新登录后查看。</p><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="button" id="confirm-logout">确认退出</button></div></div>`;
  else dialog.innerHTML = `<div class="mp-dialog-card"><h2>修改密码</h2><p>密码长度为6-20位，修改成功后需要重新登录。</p><form class="mp-form" id="change-password-form"><div class="mp-field"><label for="new-password">新密码</label><input id="new-password" type="password" required minlength="6" maxlength="20" placeholder="请输入新密码"></div><div class="mp-field"><label for="confirm-password">确认新密码</label><input id="confirm-password" type="password" required minlength="6" maxlength="20" placeholder="请再次输入新密码"></div><small id="settings-form-error" class="mp-form-error" hidden></small><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="submit">确认修改</button></div></form></div>`;
  document.body.appendChild(dialog); dialog.showModal(); dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('#toggle-wechat')?.addEventListener('click', () => { state.wechatAuthorized = state.wechatAuthorized === false; saveState(); dialog.close(); renderSettings(); toast(state.wechatAuthorized ? '微信授权已开启' : '微信授权已解除'); });
  dialog.querySelector('#settings-send-code')?.addEventListener('click', event => { const phone = dialog.querySelector('#new-phone'); if (!/^1[3-9]\d{9}$/.test(phone.value)) { phone.reportValidity(); return; } event.currentTarget.disabled = true; event.currentTarget.textContent = '60秒后重试'; toast('验证码已发送'); });
  dialog.querySelector('#confirm-logout')?.addEventListener('click', () => { sessionStorage.removeItem('hbyx-mini-logged-in'); go('/login.html'); });
  dialog.querySelector('#change-phone-form')?.addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; const error = dialog.querySelector('#settings-form-error'); if (!form.reportValidity()) return; const phoneInput = dialog.querySelector('#new-phone'); if (state.phone === phoneInput.value) { error.hidden = false; error.textContent = '新手机号不能与当前手机号相同。'; return; } state.phone = `${phoneInput.value.slice(0, 3)}****${phoneInput.value.slice(-4)}`; saveState(); dialog.close(); renderSettings(); toast('手机号已更新'); });
  dialog.querySelector('#change-password-form')?.addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; const error = dialog.querySelector('#settings-form-error'); if (!form.reportValidity()) return; if (dialog.querySelector('#new-password').value !== dialog.querySelector('#confirm-password').value) { error.hidden = false; error.textContent = '两次输入的密码不一致。'; return; } dialog.close(); sessionStorage.removeItem('hbyx-mini-logged-in'); go('/login.html'); });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
}
function showConsultDialog() { const dialog = document.createElement('dialog'); dialog.className = 'mp-dialog'; dialog.innerHTML = `<div class="mp-dialog-card"><h2>提交课程咨询</h2><p>无需登录，填写联系方式后课程顾问会主动联系。</p><form class="mp-form" method="dialog"><div class="mp-field"><label for="consult-name">联系人</label><input id="consult-name" required placeholder="请输入联系人姓名"></div><div class="mp-field"><label for="consult-phone">手机号</label><input id="consult-phone" required pattern="1[3-9]\\d{9}" placeholder="请输入手机号"></div><div class="mp-field"><label for="consult-text">咨询内容</label><textarea id="consult-text" required placeholder="想了解哪门课程？"></textarea></div><div class="mp-actions"><button class="mp-button secondary" value="cancel">取消</button><button class="mp-button" value="submit">提交咨询</button></div></form></div>`; document.body.appendChild(dialog); dialog.showModal(); dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; state.consultations.unshift({ id: `C${Date.now()}`, courseId: params.get('courseId') || 'video-001', status: '待回复', text: '已提交 · 等待课程顾问联系。', submittedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), reply: '', replyAt: '', progress: '待跟进', anonymous: !isLoggedIn() }); saveState(); dialog.close(); dialog.remove(); toast('咨询已提交，课程顾问会主动联系'); }); dialog.addEventListener('close', () => dialog.remove(), { once: true }); }
function switchStudent() { state.currentStudentId = state.currentStudentId === 'student-001' ? 'student-002' : 'student-001'; saveState(); toast(`已切换当前学员：${currentStudent().name}`); setTimeout(() => renderProfile(), 300); }
document.addEventListener('click', event => { const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return; if (action === 'courses') go('/learner/pages/courses.html'); if (action === 'consult') showConsultDialog(); if (action === 'share') toast('课程分享卡片已生成'); if (action === 'buy') { const trigger = event.target.closest('[data-course-id]'); const courseId = trigger.dataset.courseId; const item = course(courseId); const detailPath = item.type === 'video' ? '/learner/pages/course-detail.html' : '/learner/pages/class-detail.html'; if (!isLoggedIn()) go(`/login.html?redirect=${encodeURIComponent(`${detailPath}?courseId=${courseId}`)}`); else go(`/learner/pages/payment.html?courseId=${courseId}`); } if (action === 'learning') go('/learner/pages/video.html'); if (action === 'homework') go(`/learner/pages/homework.html?courseId=${event.target.closest('[data-course-id]').dataset.courseId}`); if (action === 'switch-student') switchStudent(); if (action === 'refund') { const orderId = event.target.closest('[data-order-id]')?.dataset.orderId; const order = state.orders.find(row => row.id === orderId); if (order) { order.status = '退款中'; saveState(); renderOrderDetail(); } toast('退款申请已提交，等待后台审核'); } });

if (path.endsWith('/index.html') || path.endsWith('/learner/')) renderHome();
else if (path.endsWith('/courses.html')) renderCourses();
else if (path.endsWith('/course-detail.html')) renderCourseDetail(course());
else if (path.endsWith('/fast-registration.html')) renderFastRegistration();
else if (path.endsWith('/fast-registration-detail.html')) renderFastRegistrationDetail(course(params.get('courseId') || 'class-001'));
else if (path.endsWith('/class-detail.html')) renderClassDetail(course(params.get('courseId') || 'class-001'));
else if (path.endsWith('/payment.html')) renderPayment();
else if (path.endsWith('/orders.html')) renderOrders();
else if (path.endsWith('/order-detail.html')) renderOrderDetail();
else if (path.endsWith('/learning.html')) renderLearning();
else if (path.endsWith('/video.html')) renderVideo();
else if (path.endsWith('/homework.html')) renderHomeworkPage();
else if (path.endsWith('/results.html')) renderResultsPage();
else if (path.endsWith('/teachers.html')) renderTeachers();
else if (path.endsWith('/teacher-detail.html')) renderTeacherDetail();
else if (path.endsWith('/consultation.html')) renderConsultation();
else if (path.endsWith('/consultation-detail.html')) renderConsultationDetail();
else if (path.endsWith('/messages.html')) renderMessages();
else if (path.endsWith('/message-detail.html')) renderMessageDetail();
else if (path.endsWith('/profile.html')) renderProfile();
else if (path.endsWith('/settings.html')) renderSettings();
