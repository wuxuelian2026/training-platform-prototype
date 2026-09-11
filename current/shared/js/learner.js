import { relativePath } from './paths.js';
import { mountMobileSettings } from './mobile-settings.js';
import { mountMobileMessageDetail, mountMobileMessageList } from './mobile-messages.js';
import { accountStudents, demoId, demoTime, getCurrentAccountId, readDemoState, subscribeDemoState, upsertDemoRecord, updateDemoRecord, writeDemoState } from './demo-store.js';
import { classSeed } from './class-seed.js';
import { allProducts, productForCourse } from './product-seed.js';

const main = document.querySelector('.mobile-main');
const path = location.pathname;
const params = new URLSearchParams(location.search);
const STORAGE_KEY = 'hbyx-mini-learner-demo';
const homeBanners = [
  { kicker: '本周精选', title: '让练习成为看得见的成长', text: '精选声乐、舞蹈和器乐课程，找到适合自己的学习节奏。', mark: '艺' },
  { kicker: '秋季招生', title: '面授班级正在招生', text: '查看教师、校区、课时和剩余名额，选择合适的班级。', mark: '课' },
  { kicker: '视频课程', title: '随时打开一节好课', text: '支持断点续播，利用碎片时间完成你的艺术训练。', mark: '学' }
];

// P0-1 / P0-2: learner classes are projected from the canonical class seed, so the admin CRM and the
// learner app always show the same class key, name, enrollment count and 快速报名 switch value.
const learnerClassCopy = {
  'class-001': { intro: '围绕基本功、身韵组合和课堂展示，帮助少儿学员建立规范动作与舞蹈表现力。', detail: ['课程根据少儿身体发展特点安排训练强度，通过热身、基本功、组合练习和课堂展示形成完整学习过程。', '教师会在课堂中持续观察动作完成情况，并提供阶段性练习建议。'], outline: [{ title: '第一阶段 · 身体启蒙', note: '4课次' }, { title: '第二阶段 · 基本功训练', note: '6课次' }, { title: '第三阶段 · 舞蹈组合', note: '6课次' }] },
  'class-002': { intro: '以主题创作和材料体验为主，帮助少儿建立绘画兴趣和基本表现方法。', detail: ['课程围绕色彩、造型和材料体验展开，每次课完成一件小作品。'], outline: [{ title: '第一阶段 · 色彩与线条', note: '7课次' }, { title: '第二阶段 · 主题创作', note: '7课次' }, { title: '第三阶段 · 作品展示', note: '6课次' }] },
  'class-003': { intro: '在基本功之上加入身韵组合与舞台表现训练，适合已完成启蒙阶段、希望继续提升的少儿学员。', detail: ['课程按提升班节奏训练基本功稳定性和动作连贯性，并加入组合与舞台表现内容。', '教师会在每次课后给出练习建议，便于家长协助学员复习。'], outline: [{ title: '第一阶段 · 基本功巩固', note: '4课次' }, { title: '第二阶段 · 身韵组合', note: '6课次' }, { title: '第三阶段 · 舞台呈现', note: '6课次' }] }
};
const learnerClassCourses = classSeed.filter(item => item.display === '已展示').map(item => {
  const remaining = Math.max(0, Number(item.capacity || 0) - Number(item.enrolled || 0));
  return {
    id: item.id, type: 'class', name: item.name, className: item.className, courseName: item.courseName,
    teacher: item.teacher, category: item.category, discipline: item.discipline, field: item.field, professional: item.professional,
    level: item.level, age: item.age, hours: item.lessons, lessons: item.lessons, price: Number(item.price),
    season: item.season, campus: item.campus, classroom: item.classroom, schedule: item.schedule,
    seats: `${remaining}/${item.capacity}`, classStatus: Number(item.enrolled || 0) >= Number(item.capacity || 0) ? '已满员' : item.status,
    deadline: String(item.deadline || '').slice(0, 10), fast: item.fast, capacity: Number(item.capacity || 0), enrolled: Number(item.enrolled || 0),
    status: '可报名', ...(learnerClassCopy[item.id] || {})
  };
});

const demo = {
  phone: '138****2026',
  wechatAuthorized: true,
  students: [{ id: 'student-001', name: '林知夏', gender: '女', birthMonth: '2017-05', relation: '女儿' }, { id: 'student-002', name: '林知远', gender: '男', birthMonth: '2015-10', relation: '儿子' }],
  courses: [
    { id: 'COURSE-CR-2026-0002', type: 'video', name: '声乐演唱技巧', teacher: '陈晨', category: '音乐表演', discipline: '音乐', field: '音乐表演', professional: '声乐演唱', level: '中级', age: '成人', hours: 12, price: 1280, progress: 45, chapter: '第3章 · 作品演唱', status: '可购买', intro: '从发声、气息、共鸣到作品演唱，建立清晰、可反复练习的声乐训练路径。', detail: ['课程从呼吸与发声基础开始，逐步进入共鸣位置、咬字处理和作品表达，适合已有基础、希望系统提升演唱能力的学员。', '每节课包含教师示范、训练重点和课后练习建议，可按自己的节奏重复观看。'], outline: [{ title: '第1章 · 发声基础', note: '4课时' }, { title: '第2章 · 气息与共鸣', note: '4课时' }, { title: '第3章 · 作品演唱', note: '4课时' }] },
    ...learnerClassCourses
  ],
  teachers: [
    { id: 'teacher-001', name: '陈晨', title: '声乐教师', years: 12, tags: ['声乐演唱', '艺术歌曲'], tagline: '让每一位学员找到自然、稳定且有表现力的声音。', intro: '专注声乐发声与作品演唱训练，擅长建立循序渐进的练习路径。', profile: [{ type: 'text', text: '陈晨老师长期从事声乐教学与舞台实践，注重气息、共鸣和作品表达的协调训练，并根据学员基础设计阶段性练习目标。' }, { type: 'image', title: '声乐课堂教学记录', caption: '课堂中针对气息控制与作品处理进行示范指导' }, { type: 'text', text: '课程强调听辨、示范、练习与反馈的完整闭环，帮助学员在稳定发声的基础上建立个人演唱表达。' }, { type: 'video', title: '声乐发声训练示范', caption: '教师示范视频 · 03:20' }] },
    { id: 'teacher-002', name: '王玥', title: '舞蹈教师', years: 8, tags: ['中国舞', '身韵训练'], tagline: '从基本功到舞台表达，让身体真正理解动作。', intro: '关注基本功、身韵和舞台表现，帮助学员建立稳定的身体控制。', profile: [{ type: 'text', text: '王玥老师坚持基本功与舞蹈表达并重，通过分解练习、组合训练和课堂展示，帮助学员建立动作规范与身体意识。' }, { type: 'image', title: '中国舞课堂训练', caption: '少儿中国舞课堂组合训练现场' }, { type: 'text', text: '教学过程关注学员年龄特点与身体条件，在安全训练的前提下逐步提升柔韧、协调和节奏表现。' }, { type: 'video', title: '身韵组合教学示范', caption: '教师示范视频 · 02:45' }] },
    { id: 'teacher-003', name: '李老师', title: '钢琴教师', years: 10, tags: ['钢琴启蒙', '视奏'], tagline: '用清晰的方法建立兴趣，也建立扎实的演奏习惯。', intro: '从兴趣启蒙到基础演奏，重视节奏感与音乐表达的培养。', profile: [{ type: 'text', text: '李老师擅长钢琴启蒙与基础演奏教学，通过节奏、识谱、手型和作品练习，帮助学员形成稳定的练琴习惯。' }, { type: 'image', title: '钢琴一对一课堂', caption: '课堂中进行手型与视奏指导' }, { type: 'text', text: '教学内容兼顾技术训练和音乐理解，鼓励学员通过小型展示积累舞台经验与学习信心。' }, { type: 'video', title: '钢琴启蒙课堂片段', caption: '课堂视频 · 03:05' }] }
  ],
  orders: [
    { id: 'OD202609080001', courseId: 'COURSE-CR-2026-0002', status: '已支付', amount: 1280, studentId: 'student-001', createdAt: '2026-09-08 14:20', paidAt: '2026-09-08 14:22' },
    { id: 'OD202609080002', courseId: 'class-001', status: '待支付', amount: 1680, studentId: 'student-001', createdAt: '2026-09-08 16:42', paidAt: '' },
    { id: 'OD202609090001', courseId: 'COURSE-CR-2026-0002', status: '待支付', amount: 1280, studentId: '', accountId: 'account-002', createdAt: '2026-09-09 10:18', paidAt: '' },
    { id: 'OD202609090002', courseId: 'class-001', status: '已支付', amount: 1680, studentId: 'student-001', createdAt: '2026-09-09 09:36', paidAt: '2026-09-09 09:38' },
    { id: 'OD202609070001', courseId: 'COURSE-CR-2026-0002', status: '退款中', amount: 1280, studentId: 'student-001', createdAt: '2026-09-07 15:12', paidAt: '2026-09-07 15:15' },
    { id: 'OD202609070002', courseId: 'class-001', status: '退款中', amount: 1680, studentId: 'student-001', createdAt: '2026-09-07 11:25', paidAt: '2026-09-07 11:29' },
    { id: 'OD202609060001', courseId: 'COURSE-CR-2026-0002', status: '已退款', amount: 1280, studentId: 'student-001', createdAt: '2026-09-06 17:08', paidAt: '2026-09-06 17:10' },
    { id: 'OD202609060002', courseId: 'class-001', status: '已退款', amount: 1680, studentId: 'student-001', createdAt: '2026-09-06 13:50', paidAt: '2026-09-06 13:53' },
    { id: 'OD202609050001', courseId: 'COURSE-CR-2026-0002', status: '已取消', amount: 1280, studentId: 'student-001', createdAt: '2026-09-05 16:30', paidAt: '' },
    { id: 'OD202609050002', courseId: 'class-001', status: '已取消', amount: 1680, studentId: 'student-001', createdAt: '2026-09-05 10:05', paidAt: '' }
  ],
  messages: [
    { id: 'MSG20260908001', type: '报告发布', title: '学习报告已发布', summary: '《少儿中国舞基础班》学习报告已发布，请查看本学期学习成果。', body: '本学期学习报告已由教务发布，包含课堂参与、作品练习和阶段展示成果。请进入学习报告查看完整内容。', createdAt: '2026-09-08 18:20', read: false, courseId: 'class-001', target: '/learner/pages/results.html?courseId=class-001' },
    { id: 'MSG20260908002', type: '作业批改', title: '作业已批改', summary: '节奏练习视频已完成批改，请查看教师评语。', body: '教师已完成本次作业批改，请进入作业页面查看文本评语和后续练习建议。', createdAt: '2026-09-08 17:05', read: false, courseId: 'class-001', target: '/learner/pages/homework.html?courseId=class-001' },
    { id: 'MSG20260908003', type: '上课提醒', title: '明天有一节面授课', summary: '少儿中国舞基础班明天 09:00 在龙泉校区综合楼302上课。', body: '请按时到达上课地点：龙泉校区综合楼302。建议提前 10 分钟到达并做好课前准备。', createdAt: '2026-09-08 16:30', read: true, courseId: 'class-001', target: '/learner/pages/class-detail.html?courseId=class-001' },
    { id: 'MSG20260908004', type: '支付成功', title: '购买成功', summary: '您已成功购买《声乐演唱技巧》，课程权限已开通。', body: '微信支付已确认，课程学习权限已生效。订单状态为“已支付”，学习进度请在“我的学习”中查看。', createdAt: '2026-09-08 14:22', read: true, courseId: 'COURSE-CR-2026-0002', target: '/learner/pages/order-detail.html?courseId=video-001' },
    { id: 'MSG20260907001', type: '分班完成', title: '您已成功分班', summary: '支付成功后系统已自动分班至 2026 秋季中国舞启蒙一班。', body: '支付成功即自动完成分班，当前班级为 2026 秋季中国舞启蒙一班。请查看班级上课时间、地点和教师信息。', createdAt: '2026-09-07 10:15', read: true, courseId: 'class-001', target: '/learner/pages/class-detail.html?courseId=class-001' },
    { id: 'MSG20260906001', type: '证书生成', title: '您的结业证书已生成', summary: '少儿中国舞基础班结业证书已生成，可在线查看。', body: '恭喜您完成课程学习，结业证书已生成。请进入成果页面查看证书信息。', createdAt: '2026-09-06 09:10', read: true, courseId: 'class-001', target: '/learner/pages/results.html?courseId=class-001' },
    { id: 'MSG20260905001', type: '报名成功', title: '面授课程报名成功', summary: '您已成功报名《少儿中国舞基础班》，系统已自动分班并占用名额。', body: '报名支付已确认，系统已自动完成分班并占用班级名额，可通过“我的学习”查看班级和课次安排。', createdAt: '2026-09-05 17:20', read: false, courseId: 'class-001', target: '/learner/pages/order-detail.html?orderId=OD202609090002' },
    { id: 'MSG20260904001', type: '作业发布', title: '有一项新作业待完成', summary: '新作业：节奏练习视频，请在9月27日前提交。', body: '王玥老师已发布“节奏练习视频”作业，请按要求填写练习说明或上传附件，并在截止时间前提交。', createdAt: '2026-09-04 15:30', read: false, courseId: 'class-001', target: '/learner/pages/homework.html?courseId=class-001' },
    { id: 'MSG20260903001', type: '结业通过', title: '恭喜您完成课程学习', summary: '少儿中国舞基础班已确认结业，可查看学习成果。', body: '教务已确认您完成少儿中国舞基础班学习，结业评语、学习报告和结业证书将陆续生成。', createdAt: '2026-09-03 18:05', read: true, courseId: 'class-001', target: '/learner/pages/results.html?courseId=class-001' }
  ],
  consultations: [
    { id: 'C20260908001', courseId: 'class-001', status: '已回复', text: '想了解秋季班的上课时间和教室安排。', reply: '您好，秋季班每周六 09:00-10:30 在龙泉校区综合楼302上课，当前还有少量名额。', submittedAt: '2026-09-08 14:20', replyAt: '2026-09-08 15:06', progress: '待报名', anonymous: false },
    { id: 'C20260908002', courseId: 'COURSE-CR-2026-0002', status: '待回复', text: '想了解视频课程是否支持反复观看。', reply: '', submittedAt: '2026-09-08 16:42', replyAt: '', progress: '待跟进', anonymous: false },
    { id: 'C20260907001', courseId: 'class-001', status: '已试听', text: '想先体验中国舞启蒙课程，再决定是否报名。', reply: '已为您预约本周六 09:00 的试听课，请提前10分钟到达龙泉校区综合楼302。', submittedAt: '2026-09-07 10:08', replyAt: '2026-09-07 11:20', progress: '已试听', anonymous: false },
    { id: 'C20260906001', courseId: 'COURSE-CR-2026-0002', status: '已报名', text: '报名后是否可以在手机上反复观看课程内容？', reply: '可以，购买成功后课程将开通学习权限，您可在“我的学习”中随时观看。', submittedAt: '2026-09-06 16:35', replyAt: '2026-09-06 17:02', progress: '已报名', anonymous: false }
  ],
  chapterDone: ['chapter-001', 'chapter-002'],
  currentStudentId: 'student-001'
};

function sharedLearnerCourses(shared) {
  const validRows = (rows) => (Array.isArray(rows) ? rows : []).filter(item => item && typeof item === 'object');
  const courses = validRows(shared.courses).filter(item => item.status === '已完成').map(item => ({
    id: item.id, type: item.type === '视频课程' ? 'video' : 'class', name: item.name, courseName: item.name, teacher: item.teacher, category: item.major, discipline: item.discipline || item.major, field: item.field || item.major, professional: item.professional || item.major, level: item.level || '初级', age: item.age || '全年龄', hours: Number(item.hours) || 1, lessons: Number(item.hours) || 1, progress: 0, status: '待售', price: 0, intro: item.intro || '', outline: (item.chapters || []).map(chapter => ({ title: chapter.name, note: `${chapter.lessons?.length || 0}课时` }))
  }));
  const products = allProducts(shared).filter(item => item.status === '已上架');
  return courses.filter(item => item.type !== 'video' || products.some(product => product.courseId === item.id)).map(item => {
    const product = products.find(row => row.courseId === item.id);
    return product ? { ...item, price: Number(product.price || 0), status: '可购买', preview: product.preview, previewHours: product.previewHours } : item;
  }).concat(validRows(shared.classes).filter(item => item.display === '已展示').map(item => ({
    id: item.id, type: 'class', name: item.name, className: item.className || item.name, courseName: item.courseName || item.course, teacher: item.teacher, category: item.category, discipline: item.discipline || item.category, field: item.field || item.category, professional: item.professional || item.category, level: item.level || '初级', age: item.age || '全年龄', hours: Number(item.lessons || item.hours || 0), lessons: Number(item.lessons || item.hours || 0), price: Number(item.price || 0), season: item.batch, campus: item.campus, classroom: item.classroom, schedule: item.schedule, seats: `${Math.max(0, Number(item.capacity || 0) - Number(item.enrolled || 0))}/${item.capacity}`, classStatus: Number(item.enrolled || 0) >= Number(item.capacity || 0) ? '已满员' : item.status || '招生中', deadline: item.deadline, status: '可报名', fast: item.fast || '否', capacity: Number(item.capacity || 0), enrolled: Number(item.enrolled || 0), intro: item.intro || ''
  })));
}

function readState() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    const storedCourses = Array.isArray(stored.courses) ? stored.courses : [];
    const knownCourses = demo.courses.map(item => ({ ...item, ...(storedCourses.find(row => row.id === item.id) || {}) }));
    const additionalCourses = storedCourses.filter(item => !demo.courses.some(row => row.id === item.id));
    const storedTeachers = Array.isArray(stored.teachers) ? stored.teachers : [];
    const knownTeachers = demo.teachers.map(item => ({ ...item, ...(storedTeachers.find(row => row.id === item.id) || {}) }));
    const additionalTeachers = storedTeachers.filter(item => !demo.teachers.some(row => row.id === item.id));
    const storedOrders = Array.isArray(stored.orders) ? stored.orders : [];
    const knownOrders = demo.orders.map(item => ({ ...item, ...(storedOrders.find(row => row.id === item.id) || {}) }));
    const additionalOrders = storedOrders.filter(item => !demo.orders.some(row => row.id === item.id));
    const storedConsultations = Array.isArray(stored.consultations) ? stored.consultations : [];
    const knownConsultations = demo.consultations.map(item => ({ ...item, ...(storedConsultations.find(row => row.id === item.id) || {}) }));
    const additionalConsultations = storedConsultations.filter(item => !demo.consultations.some(row => row.id === item.id));
    const storedMessages = Array.isArray(stored.messages) ? stored.messages : [];
    const knownMessages = demo.messages.map(item => ({ ...item, read: storedMessages.find(row => row.id === item.id)?.read ?? item.read }));
    const additionalMessages = storedMessages.filter(item => !demo.messages.some(row => row.id === item.id));
    const shared = readDemoState();
    const accountId = shared.currentAccountId || 'account-001';
    const learners = [...accountStudents(accountId)];
    const accountOrders = (shared.orders || []).filter(order => order.accountId === accountId);
    const sharedCourses = sharedLearnerCourses(shared);
    const sharedCourseIds = new Set(sharedCourses.map(item => item.id));
    const mergedCourses = [...knownCourses, ...additionalCourses.filter(item => !item.id || !item.id.startsWith('class-') && !item.id.startsWith('COURSE-') || sharedCourseIds.has(item.id))];
    sharedCourses.forEach(item => { const index = mergedCourses.findIndex(row => row.id === item.id); if (index < 0) mergedCourses.push(item); else mergedCourses[index] = { ...mergedCourses[index], ...item }; });
    // I1-DEC-24 / RM-F-02: a video course is sellable only while its product is 已上架; price and preview
    // policy always come from the product, never from the course archive.
    const liveProducts = allProducts(shared);
    mergedCourses.forEach(item => {
      if (item.type !== 'video') return;
      const product = liveProducts.find(row => row.courseId === item.id);
      item.product = product || null;
      item.sellable = Boolean(product && product.status === '已上架');
      if (product) {
        item.price = Number(product.price || item.price || 0);
        item.preview = product.preview;
        item.previewHours = product.previewHours;
        item.status = item.sellable ? '可购买' : product.status;
      } else {
        item.sellable = false;
        item.status = '未上架';
      }
    });
    // Unsellable video courses stay resolvable by id (order detail, deep links) but leave the browse lists.
    const sellableCourses = mergedCourses.filter(item => item.type !== 'video' || item.sellable !== false);
    // One logical order must appear once: shared-store records win over the local demo copy, otherwise a
    // resumed order can render a stale status while the shared record already moved on.
    const mergedOrders = (() => {
      const byId = new Map();
      // Demo seed orders may pin their own account (e.g. the pending video order belongs to 账号B).
      knownOrders.map(order => ({ ...order, accountId: order.accountId || 'account-001' })).filter(order => order.accountId === accountId).forEach(order => byId.set(order.id, order));
      additionalOrders.filter(order => (order.accountId || 'account-001') === accountId).forEach(order => byId.set(order.id, order));
      accountOrders.forEach(order => byId.set(order.id, { ...(byId.get(order.id) || {}), ...order }));
      return [...byId.values()];
    })();
    return { ...demo, ...stored, accountId, students: learners.length ? learners : demo.students, currentStudentId: learners.some(item => item.id === stored.currentStudentId) ? stored.currentStudentId : learners[0]?.id || demo.currentStudentId, courses: sellableCourses, allCourses: mergedCourses, teachers: [...knownTeachers, ...additionalTeachers], orders: mergedOrders, consultations: [...knownConsultations, ...additionalConsultations], messages: [...knownMessages, ...additionalMessages] };
  } catch (error) { console.warn('学员端演示数据合并失败，回退到内置演示数据。', error); return { ...demo }; }
}
let state = readState();
function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function saveVideoProgress(courseId, patch) {
  writeDemoState(next => {
    const key = `${state.accountId}-${courseId}`;
    next.progress = next.progress || {};
    next.progress[key] = { ...(next.progress[key] || {}), ...patch };
    return next;
  });
}
function currentStudent() { return state.students.find(item => item.id === state.currentStudentId) || state.students[0]; }
// I1-DEC-25 / RM-U-01: video orders belong to the purchasing account, so the learner-facing pages
// show the account instead of a student selector. Class orders keep the current-student display.
function purchaseAccount() { const shared = readDemoState(); return (shared.accounts || []).find(item => item.id === state.accountId) || { name: '当前购买账号', phone: '' }; }
function course(id = params.get('courseId')) { return state.courses.find(item => item.id === id) || (state.allCourses || []).find(item => item.id === id) || state.courses[0]; }
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
  // RM-F-02: the home "视频课程推荐" slot follows the product shelf state as well.
  const homeVideoCourse = state.courses.find(item => item.type === 'video' && item.sellable !== false);
  layout(stack(`<form id="home-search-form" class="mp-home-search" role="search"><input id="home-search" aria-label="搜索课程或老师" placeholder="搜索课程或老师"><button class="mp-search-submit" type="submit" aria-label="搜索">⌕</button></form><section id="home-carousel" class="mp-carousel">${homeBanners.map((banner, index) => `<article class="mp-banner ${index === 0 ? 'active' : ''}" data-banner-index="${index}"><div class="mp-banner-copy"><span class="mp-eyebrow">${banner.kicker}</span><h2>${banner.title}</h2><p>${banner.text}</p></div><span class="mp-banner-mark">${banner.mark}</span></article>`).join('')}<div class="mp-carousel-dots">${homeBanners.map((_, index) => `<button class="mp-carousel-dot ${index === 0 ? 'active' : ''}" data-banner-dot="${index}" aria-label="第${index + 1}张轮播图"></button>`).join('')}</div></section>${card(`<div class="mp-section-head"><h2>分类入口</h2><span class="mp-muted">探索艺术方向</span></div><div class="mp-category-row">${categoryItems.map(([label, icon, category]) => `<a class="mp-category" href="${category ? `/learner/pages/courses.html?category=${encodeURIComponent(category)}` : '/learner/pages/courses.html'}"><span class="mp-category-icon">${icon}</span><span>${label}</span></a>`).join('')}</div>`)}${card(`<div class="mp-section-head"><h2>面授课程招生</h2><a class="mp-link" href="/learner/pages/fast-registration.html">查看全部</a></div>${courseCard(classCourse)}`)}${card(`<div class="mp-section-head"><h2>视频课程推荐</h2><a class="mp-link" href="/learner/pages/courses.html">课程库</a></div>${courseCard(state.courses[0])}`)}${card(`<div class="mp-section-head"><h2>名师推荐</h2><a class="mp-link" href="/learner/pages/teachers.html">更多名师</a></div><div class="mp-scroll-row">${state.teachers.map(teacherCard).join('')}</div>`)}`));
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
  const campuses = [...new Set(state.courses.filter(item => item.type === 'class').map(item => item.campus).filter(Boolean))];
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
  layout(stack(`<form id="course-search-form" class="mp-course-search" role="search"><input id="course-search" aria-label="搜索课程或老师" placeholder="搜索课程或老师" value="${esc(params.get('q') || '')}"><button type="submit" aria-label="搜索课程"><span aria-hidden="true">⌕</span></button></form>`, `<section class="mp-course-browser" aria-label="课程浏览"><div class="mp-tabs mp-course-type-tabs" role="tablist"><button class="mp-tab active" type="button" data-course-tab="all" role="tab" aria-selected="true">全部</button><button class="mp-tab" type="button" data-course-tab="class" role="tab" aria-selected="false">面授课程</button><button class="mp-tab" type="button" data-course-tab="video" role="tab" aria-selected="false">视频课程</button></div><div class="mp-course-filter-row" aria-label="课程筛选条件"><button id="course-profession-trigger" class="mp-course-filter-chip" type="button" aria-haspopup="dialog" aria-controls="course-profession-dialog" aria-expanded="false"><span id="course-profession-value">专业</span><i aria-hidden="true">⌄</i></button><button id="course-level-trigger" class="mp-course-filter-chip" type="button"><span>难度</span><i aria-hidden="true">⌄</i></button><button id="course-age-trigger" class="mp-course-filter-chip" type="button" data-course-class-filter><span>适合年龄</span><i aria-hidden="true">⌄</i></button><button id="course-campus-trigger" class="mp-course-filter-chip" type="button" data-course-class-filter><span>校区</span><i aria-hidden="true">⌄</i></button><button id="course-more-filter" class="mp-course-filter-chip mp-course-filter-more" type="button"><span>筛选</span><i aria-hidden="true">☷</i></button></div></section>`, `<section class="mp-course-list-section"><div class="mp-course-list-head"><h2>课程列表</h2><span id="course-result-count" class="mp-muted"></span></div><div id="course-list" class="mp-list"></div></section>`, `<dialog id="course-profession-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet" aria-labelledby="course-cascade-title"><header class="mp-cascade-head"><div><h2 id="course-cascade-title">选择专业</h2><p id="course-cascade-caption">请选择专业门类</p></div><button class="mp-cascade-close" type="button" aria-label="关闭专业选择">×</button></header><div id="course-cascade-path" class="mp-cascade-path"></div><div id="course-cascade-options" class="mp-cascade-options" role="listbox"></div><footer class="mp-cascade-actions"><button id="course-cascade-clear" class="mp-button secondary" type="button">全部专业</button><button id="course-cascade-confirm" class="mp-button" type="button">确定</button></footer></section></dialog>`, `<dialog id="course-choice-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet mp-course-choice-sheet" aria-labelledby="course-choice-title"><header class="mp-cascade-head"><div><h2 id="course-choice-title">选择筛选条件</h2><p>点击选项后立即生效</p></div><button class="mp-cascade-close" type="button" data-choice-close aria-label="关闭筛选">×</button></header><div id="course-choice-options" class="mp-cascade-options" role="listbox"></div></section></dialog>`, `<dialog id="course-more-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet mp-course-choice-sheet" aria-labelledby="course-more-title"><header class="mp-cascade-head"><div><h2 id="course-more-title">更多筛选</h2><p>按招生状态缩小课程范围</p></div><button class="mp-cascade-close" type="button" data-more-close aria-label="关闭更多筛选">×</button></header><label class="mp-course-toggle"><span><strong>仅看可报名课程</strong><small>隐藏已满员的面授班级</small></span><input id="course-open-only" type="checkbox" role="switch"></label><footer class="mp-cascade-actions"><button id="course-filter-reset" class="mp-button secondary" type="button">重置</button><button id="course-more-confirm" class="mp-button" type="button">确定</button></footer></section></dialog>`));
  const professionTrigger = document.querySelector('#course-profession-trigger');
  const professionValue = document.querySelector('#course-profession-value');
  const cascadeDialog = document.querySelector('#course-profession-dialog');
  const cascadePath = document.querySelector('#course-cascade-path');
  const cascadeOptions = document.querySelector('#course-cascade-options');
  const cascadeCaption = document.querySelector('#course-cascade-caption');
  const cascadeConfirm = document.querySelector('#course-cascade-confirm');
  const choiceDialog = document.querySelector('#course-choice-dialog');
  const choiceTitle = document.querySelector('#course-choice-title');
  const choiceOptions = document.querySelector('#course-choice-options');
  const moreDialog = document.querySelector('#course-more-dialog');
  const openOnlyInput = document.querySelector('#course-open-only');
  const levelTrigger = document.querySelector('#course-level-trigger');
  const ageTrigger = document.querySelector('#course-age-trigger');
  const campusTrigger = document.querySelector('#course-campus-trigger');
  const moreTrigger = document.querySelector('#course-more-filter');
  let level = params.get('level') || '';
  let age = params.get('age') || '';
  let campus = params.get('campus') || '';
  let openOnly = false;
  let activeCourseTab = 'all';
  const cascadeSteps = [
    { key: 'discipline', label: '专业门类' },
    { key: 'field', label: '专业分类' },
    { key: 'professional', label: '专业' }
  ];
  let draftMajor = { ...selectedMajor };
  let activeCascadeStep = selectedMajor.professional ? 'professional' : selectedMajor.field ? 'professional' : selectedMajor.discipline ? 'field' : 'discipline';
  const updateProfessionValue = () => {
    const pathText = [selectedMajor.discipline, selectedMajor.field, selectedMajor.professional].filter(Boolean).join(' / ');
    professionValue.textContent = pathText || '专业';
    professionTrigger.classList.toggle('has-value', Boolean(pathText));
  };
  const updateFilterControls = () => {
    const isClass = activeCourseTab === 'class';
    document.querySelectorAll('[data-course-class-filter]').forEach(item => { item.hidden = !isClass; });
    levelTrigger.querySelector('span').textContent = level || '难度';
    ageTrigger.querySelector('span').textContent = age || '适合年龄';
    campusTrigger.querySelector('span').textContent = campus || '校区';
    const filterCount = [selectedMajor.professional || selectedMajor.field || selectedMajor.discipline, level, isClass ? age : '', isClass ? campus : '', openOnly].filter(Boolean).length;
    moreTrigger.querySelector('span').textContent = filterCount ? `筛选 ${filterCount}` : '筛选';
    moreTrigger.classList.toggle('has-value', filterCount > 0);
  };
  const openChoiceDialog = (title, values, selected, onSelect) => {
    choiceTitle.textContent = title;
    choiceOptions.innerHTML = [`<button type="button" class="mp-cascade-option ${selected ? '' : 'selected'}" data-course-choice=""><span>不限</span><span aria-hidden="true">${selected ? '' : '✓'}</span></button>`, ...values.map(value => `<button type="button" class="mp-cascade-option ${value === selected ? 'selected' : ''}" data-course-choice="${esc(value)}"><span>${esc(value)}</span><span aria-hidden="true">${value === selected ? '✓' : ''}</span></button>`)].join('');
    choiceOptions.onclick = event => {
      const item = event.target.closest('[data-course-choice]');
      if (!item) return;
      onSelect(item.dataset.courseChoice);
      choiceDialog.close();
      updateFilterControls();
      draw();
    };
    choiceDialog.showModal();
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
    const keyword = document.querySelector('#course-search').value.trim().toLowerCase();
    const { discipline, field, professional } = selectedMajor;
    const items = state.courses.filter(item => {
      const searchable = `${item.name}${item.teacher}${item.category}${item.discipline || ''}${item.field || ''}${item.professional || ''}${item.campus || ''}`.toLowerCase();
      const categoryMatch = !categoryFilter || [item.discipline, item.field, item.professional, item.category].filter(Boolean).some(value => value.includes(categoryFilter));
      return (activeCourseTab === 'all' || item.type === activeCourseTab) && categoryMatch && (!discipline || item.discipline === discipline) && (!field || item.field === field) && (!professional || item.professional === professional) && (!level || item.level === level) && (activeCourseTab !== 'class' || !age || item.age === age) && (activeCourseTab !== 'class' || !campus || item.campus === campus) && (!openOnly || item.type !== 'class' || item.classStatus !== '已满员') && (item.type !== 'class' || item.fast !== '是') && searchable.includes(keyword);
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
  levelTrigger.addEventListener('click', () => openChoiceDialog('选择难度', levels, level, value => { level = value; }));
  ageTrigger.addEventListener('click', () => openChoiceDialog('选择适合年龄', ages, age, value => { age = value; }));
  campusTrigger.addEventListener('click', () => openChoiceDialog('选择校区', campuses, campus, value => { campus = value; }));
  document.querySelector('[data-choice-close]').addEventListener('click', () => choiceDialog.close());
  moreTrigger.addEventListener('click', () => { openOnlyInput.checked = openOnly; moreDialog.showModal(); });
  document.querySelector('[data-more-close]').addEventListener('click', () => moreDialog.close());
  document.querySelector('#course-more-confirm').addEventListener('click', () => { openOnly = openOnlyInput.checked; moreDialog.close(); updateFilterControls(); draw(); });
  document.querySelectorAll('[data-course-tab]').forEach(tab => tab.addEventListener('click', () => { activeCourseTab = tab.dataset.courseTab; if (activeCourseTab !== 'class') { age = ''; campus = ''; } document.querySelectorAll('[data-course-tab]').forEach(item => { const active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); }); updateFilterControls(); draw(); }));
  document.querySelector('#course-search-form').addEventListener('submit', event => { event.preventDefault(); draw(); });
  document.querySelector('#course-search').addEventListener('input', draw);
  document.querySelector('#course-filter-reset').addEventListener('click', () => { categoryFilter = ''; Object.assign(selectedMajor, { discipline: '', field: '', professional: '' }); level = ''; age = ''; campus = ''; openOnly = false; document.querySelector('#course-search').value = ''; updateProfessionValue(); moreDialog.close(); updateFilterControls(); draw(); });
  updateProfessionValue();
  updateFilterControls();
  draw();
}
function detailActions(item) {
  const purchased = hasPurchasedVideo(item);
  // RM-F-02: a video course without a listed product cannot be purchased.
  const unavailable = item.type === 'video' && item.sellable === false;
  const buyButton = purchased
    ? '<button class="mp-button mp-course-detail-primary" type="button" disabled>已购买</button>'
    : unavailable
      ? '<button class="mp-button mp-course-detail-primary" type="button" disabled>暂不可购买</button>'
      : button(item.type === 'video' ? '立即购买' : '立即报名', `data-action="buy" data-course-id="${item.id}"`, 'mp-course-detail-primary');
  return `<div class="mp-bottom-actions mp-course-detail-actions">
    <button class="mp-button secondary mp-icon-action" type="button" data-action="consult"><span class="mp-linear-icon mp-linear-icon-consult" aria-hidden="true"></span><span>咨询</span></button>
    <button class="mp-button secondary mp-icon-action" type="button" data-action="share"><span class="mp-linear-icon mp-linear-icon-share" aria-hidden="true"></span><span>分享</span></button>
    ${buyButton}
  </div>`;
}
function hasPurchasedVideo(item) {
  if (item?.type !== 'video') return false;
  const shared = readDemoState();
  return (shared.videoEntitlements || []).some(entitlement => entitlement.accountId === state.accountId && entitlement.courseId === item.id && entitlement.status === '生效') || state.orders.some(order => order.accountId === state.accountId && order.courseId === item.id && order.status === '已支付');
}
function videoLessonLink(item, index, preview = false) { return `/learner/pages/video.html?courseId=${encodeURIComponent(item.id)}&chapter=${index}${preview ? '&preview=1' : ''}`; }
function renderCourseDetail(item = course('COURSE-CR-2026-0002')) {
  const isClass = item.type === 'class';
  const teacher = state.teachers.find(row => row.name === item.teacher);
  const status = isClass ? item.classStatus || '招生中' : (item.sellable === false ? (item.product?.status || '未上架') : item.status || '可购买');
  const statusTone = status.includes('满') || status === '已下架' || status === '未上架' || status === '草稿' ? 'gray' : 'green';
  const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
  const detailTab = params.get('tab') === 'outline' ? 'outline' : 'intro';
  const ageFact = `<div><dt>适合年龄</dt><dd>${esc(item.age || '不限')}</dd></div>`;
  const detailParagraphs = (item.detail || [item.intro]).filter(Boolean).map(text => `<p>${esc(text)}</p>`).join('');
  const hasOutline = Array.isArray(item.outline) && item.outline.length > 0;
  const purchased = hasPurchasedVideo(item);
  const outlineContent = hasOutline ? `<div class="mp-course-detail-outline">${item.outline.map((chapter, index) => {
    if (isClass) return `<div class="mp-course-detail-chapter"><span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></div>`;
    // RM-F-05: preview follows the product policy — 关闭试看 locks every lesson, 开启试看 opens lesson 1 only.
    const preview = item.preview === '允许试看' && index === 0 && !purchased;
    const available = purchased || preview;
    const action = preview ? pill('免费试听', 'green') : purchased ? '<span class="mp-course-detail-play" aria-hidden="true">›</span>' : pill('购买后学习', 'gray');
    const content = `<span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><span class="mp-course-detail-chapter-copy"><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></span>${action}`;
    return available ? `<a class="mp-course-detail-chapter is-playable" href="${videoLessonLink(item, index, preview)}">${content}</a>` : `<div class="mp-course-detail-chapter is-locked" aria-disabled="true">${content}</div>`;
  }).join('')}</div>` : '<div class="mp-empty mp-course-detail-empty">课程大纲暂未维护</div>';
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
  // P0-2: the 快速报名 tab only carries classes whose 快速报名入口 is switched on.
  const classItems = state.courses.filter(item => item.type === 'class' && item.fast === '是');
  const campusOptions = [...new Set(classItems.map(item => item.campus).filter(Boolean))];
  const disciplineOptions = [...new Set(state.courses.map(item => item.discipline).filter(Boolean))];
  const professionalTree = disciplineOptions.map(discipline => ({
    value: discipline,
    children: [...new Set(state.courses.filter(item => item.discipline === discipline).map(item => item.field).filter(Boolean))].map(field => ({
      value: field,
      children: [...new Set(state.courses.filter(item => item.discipline === discipline && item.field === field).map(item => item.professional).filter(Boolean))]
    }))
  }));
  const filterOptions = (items, emptyText) => `<option value="">${emptyText}</option>${items.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}`;
  layout(stack(card(`<div class="mp-section-head"><h2 id="fast-batch-title">2026年秋季</h2><span id="fast-result-count" class="mp-muted"></span></div><div class="mp-tabs"><button class="mp-tab" data-season="春季">春季</button><button class="mp-tab" data-season="暑假">暑假</button><button class="mp-tab active" data-season="秋季">秋季</button><button class="mp-tab" data-season="寒假">寒假</button></div><div class="mp-fast-filter-chips" aria-label="报名筛选条件"><button id="fast-profession-trigger" class="mp-fast-filter-chip" type="button" aria-haspopup="dialog" aria-controls="fast-profession-dialog" aria-expanded="false"><span>专业</span><b id="fast-profession-value">全部专业</b><i aria-hidden="true">›</i></button><button class="mp-fast-filter-chip" type="button" data-fast-choice="campus"><span>校区</span><b id="fast-campus-value">全部校区</b><i aria-hidden="true">›</i></button><button class="mp-fast-filter-chip" type="button" data-fast-choice="weekday"><span>上课时间</span><b id="fast-weekday-value">全部时间</b><i aria-hidden="true">›</i></button><button id="fast-open-only" class="mp-fast-filter-chip" type="button" aria-pressed="false"><span>只看可报名</span></button></div><div class="mp-fast-filter-actions"><button id="fast-filter-reset" class="mp-button ghost" type="button">重置筛选</button></div>`), `<div id="class-list" class="mp-registration-list"></div>`, `<dialog id="fast-profession-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet" aria-labelledby="fast-cascade-title"><header class="mp-cascade-head"><div><h2 id="fast-cascade-title">选择专业</h2><p id="fast-cascade-caption">请选择专业门类</p></div><button class="mp-cascade-close" type="button" aria-label="关闭专业选择">×</button></header><div id="fast-cascade-path" class="mp-cascade-path"></div><div id="fast-cascade-options" class="mp-cascade-options" role="listbox"></div><footer class="mp-cascade-actions"><button id="fast-cascade-clear" class="mp-button secondary" type="button">全部专业</button><button id="fast-cascade-confirm" class="mp-button" type="button">确定</button></footer></section></dialog>`));
  const selectedMajor = { discipline: '', field: '', professional: '' };
  const professionTrigger = document.querySelector('#fast-profession-trigger');
  const professionValue = document.querySelector('#fast-profession-value');
  const cascadeDialog = document.querySelector('#fast-profession-dialog');
  const cascadePath = document.querySelector('#fast-cascade-path');
  const cascadeOptions = document.querySelector('#fast-cascade-options');
  const cascadeCaption = document.querySelector('#fast-cascade-caption');
  const cascadeConfirm = document.querySelector('#fast-cascade-confirm');
  let selectedCampus = '';
  let selectedWeekday = '';
  let openOnly = false;
  const cascadeSteps = [{ key: 'discipline', label: '专业门类' }, { key: 'field', label: '专业分类' }, { key: 'professional', label: '专业' }];
  let draftMajor = { ...selectedMajor };
  let activeCascadeStep = 'discipline';
  const updateProfessionValue = () => {
    const pathText = [selectedMajor.discipline, selectedMajor.field, selectedMajor.professional].filter(Boolean).join(' / ');
    professionValue.textContent = pathText || '全部专业';
    professionTrigger.classList.toggle('has-value', Boolean(pathText));
  };
  const updateFastFilterChips = () => {
    document.querySelector('#fast-campus-value').textContent = selectedCampus || '全部校区';
    document.querySelector('#fast-weekday-value').textContent = ({ weekday: '工作日', saturday: '周六', sunday: '周日' })[selectedWeekday] || '全部时间';
    document.querySelector('[data-fast-choice="campus"]').classList.toggle('has-value', Boolean(selectedCampus));
    document.querySelector('[data-fast-choice="weekday"]').classList.toggle('has-value', Boolean(selectedWeekday));
    const openOnlyTrigger = document.querySelector('#fast-open-only');
    openOnlyTrigger.classList.toggle('has-value', openOnly);
    openOnlyTrigger.setAttribute('aria-pressed', String(openOnly));
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
      return `<button type="button" class="mp-cascade-step ${activeCascadeStep === step.key ? 'active' : ''} ${draftMajor[step.key] ? 'selected' : ''}" data-fast-cascade-step="${step.key}" ${enabled ? '' : 'disabled'}><small>${index + 1}</small><span>${esc(text)}</span></button>`;
    }).join('');
    const stepName = cascadeSteps.find(step => step.key === activeCascadeStep)?.label || '专业';
    cascadeCaption.textContent = `请选择${stepName}`;
    const values = cascadeValues();
    cascadeOptions.innerHTML = values.length ? values.map(value => {
      const selected = draftMajor[activeCascadeStep] === value;
      return `<button type="button" class="mp-cascade-option ${selected ? 'selected' : ''}" data-fast-cascade-value="${esc(value)}" role="option" aria-selected="${selected}"><span>${esc(value)}</span><span aria-hidden="true">${selected ? '✓' : activeCascadeStep === 'professional' ? '' : '›'}</span></button>`;
    }).join('') : '<div class="mp-cascade-empty">请先选择上一级专业</div>';
    cascadeConfirm.disabled = !draftMajor.professional;
  };
  const scheduleMatches = (schedule, type) => {
    if (!type) return true;
    const value = String(schedule || '');
    if (type === 'saturday') return value.includes('周六');
    if (type === 'sunday') return value.includes('周日');
    return ['周一', '周二', '周三', '周四', '周五'].some(day => value.includes(day));
  };
  const draw = () => {
    const activeSeason = document.querySelector('[data-season].active')?.dataset.season || '秋季';
    const items = classItems.filter(item => (item.season || '秋季') === activeSeason && (!selectedMajor.discipline || item.discipline === selectedMajor.discipline) && (!selectedMajor.field || item.field === selectedMajor.field) && (!selectedMajor.professional || item.professional === selectedMajor.professional) && (!selectedCampus || item.campus === selectedCampus) && scheduleMatches(item.schedule, selectedWeekday) && (!openOnly || (item.classStatus !== '已满员' && Number(item.seats?.split('/')[0] || 0) > 0)));
    document.querySelector('#fast-batch-title').textContent = `2026年${activeSeason}`;
    document.querySelector('#fast-result-count').textContent = `${items.length}个班级`;
    document.querySelector('#class-list').innerHTML = items.length ? items.map(fastRegistrationCard).join('') : '<div class="mp-empty">当前条件下暂无可报名班级</div>';
  };
  document.querySelectorAll('[data-season]').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('[data-season]').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    draw();
  }));
  professionTrigger.addEventListener('click', () => {
    draftMajor = { ...selectedMajor };
    activeCascadeStep = draftMajor.professional ? 'professional' : draftMajor.field ? 'professional' : draftMajor.discipline ? 'field' : 'discipline';
    renderCascade();
    professionTrigger.setAttribute('aria-expanded', 'true');
    cascadeDialog.showModal();
  });
  cascadePath.addEventListener('click', event => {
    const step = event.target.closest('[data-fast-cascade-step]')?.dataset.fastCascadeStep;
    if (!step) return;
    activeCascadeStep = step;
    renderCascade();
  });
  cascadeOptions.addEventListener('click', event => {
    const value = event.target.closest('[data-fast-cascade-value]')?.dataset.fastCascadeValue;
    if (!value) return;
    if (activeCascadeStep === 'discipline') { draftMajor = { discipline: value, field: '', professional: '' }; activeCascadeStep = 'field'; }
    else if (activeCascadeStep === 'field') { draftMajor = { ...draftMajor, field: value, professional: '' }; activeCascadeStep = 'professional'; }
    else draftMajor = { ...draftMajor, professional: value };
    renderCascade();
  });
  cascadeConfirm.addEventListener('click', () => {
    Object.assign(selectedMajor, draftMajor);
    updateProfessionValue();
    cascadeDialog.close();
    draw();
  });
  document.querySelector('#fast-cascade-clear').addEventListener('click', () => {
    Object.assign(selectedMajor, { discipline: '', field: '', professional: '' });
    updateProfessionValue();
    cascadeDialog.close();
    draw();
  });
  document.querySelector('.mp-cascade-close').addEventListener('click', () => cascadeDialog.close());
  cascadeDialog.addEventListener('click', event => { if (event.target === cascadeDialog) cascadeDialog.close(); });
  cascadeDialog.addEventListener('close', () => professionTrigger.setAttribute('aria-expanded', 'false'));
  const openFastChoice = type => {
    const isCampus = type === 'campus';
    const title = isCampus ? '选择校区' : '选择上课时间';
    const current = isCampus ? selectedCampus : selectedWeekday;
    const options = isCampus
      ? [{ value: '', label: '全部校区' }, ...campusOptions.map(value => ({ value, label: value }))]
      : [{ value: '', label: '全部时间' }, { value: 'weekday', label: '工作日' }, { value: 'saturday', label: '周六' }, { value: 'sunday', label: '周日' }];
    const dialog = document.createElement('dialog');
    dialog.className = 'mp-filter-choice-dialog';
    dialog.innerHTML = `<section class="mp-filter-choice-sheet" aria-labelledby="fast-choice-title"><header><h2 id="fast-choice-title">${title}</h2><button type="button" aria-label="关闭${title}" data-fast-choice-close>×</button></header><div class="mp-filter-choice-list">${options.map(option => `<button type="button" class="${option.value === current ? 'selected' : ''}" data-fast-choice-value="${esc(option.value)}"><span>${esc(option.label)}</span>${option.value === current ? '<b aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div></section>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector('[data-fast-choice-close]').addEventListener('click', () => dialog.close());
    dialog.querySelectorAll('[data-fast-choice-value]').forEach(option => option.addEventListener('click', () => {
      if (isCampus) selectedCampus = option.dataset.fastChoiceValue;
      else selectedWeekday = option.dataset.fastChoiceValue;
      updateFastFilterChips();
      dialog.close();
      draw();
    }));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  };
  document.querySelectorAll('[data-fast-choice]').forEach(chip => chip.addEventListener('click', () => openFastChoice(chip.dataset.fastChoice)));
  document.querySelector('#fast-open-only').addEventListener('click', () => { openOnly = !openOnly; updateFastFilterChips(); draw(); });
  document.querySelector('#fast-filter-reset').addEventListener('click', () => { Object.assign(selectedMajor, { discipline: '', field: '', professional: '' }); selectedCampus = ''; selectedWeekday = ''; openOnly = false; updateProfessionValue(); updateFastFilterChips(); draw(); });
  updateProfessionValue();
  updateFastFilterChips();
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
function paymentStatusLabel(order) { return order?.status === '已取消' && order.cancelType === 'timeout' ? '已取消（超时）' : order?.status || '待支付'; }
function isPaymentResumable(order) { return !order || ['待支付', '支付失败', '已取消'].includes(order.status); }
function studentEnrolledCount(shared, classId) {
  return (shared.enrollments || []).filter(item => item.accountId === state.accountId && item.studentId === state.currentStudentId && item.classId === classId && item.status === '已报名').length;
}
function renderPayment() {
  if (!isLoggedIn()) { const redirect = `${location.pathname}${location.search}`; go(`/login.html?role=learner&redirect=${encodeURIComponent(redirect)}`); return; }
  const selectedOrder = state.orders.find(order => order.id === params.get('orderId'));
  const item = course(selectedOrder?.courseId || params.get('courseId') || 'COURSE-CR-2026-0002');
  // RM-F-03: an account that already paid for this course never reaches a second payment; it gets a
  // direct entry into learning instead.
  const paidOrder = state.orders.find(order => order.accountId === state.accountId && order.courseId === item.id && order.status === '已支付' && (item.type !== 'class' || (order.classId === item.id && order.studentId === state.currentStudentId)));
  if (paidOrder) {
    const isClassOrder = item.type === 'class';
    layout(stack(card(`<div class="mp-payment-state success">${pill(isClassOrder ? '已报名' : '已支付', 'green')}<h2>${isClassOrder ? '该班级已完成报名' : '该课程已完成支付'}</h2><p>当前账号已有${isClassOrder ? '该学员的报名' : '该课程的有效订单'}，不支持重复购买。</p></div>`), isClassOrder
      ? `<a class="mp-button full" href="${courseLink(item)}">查看班级</a>`
      : '<a class="mp-button full" href="/learner/pages/learning.html">进入学习</a>', `<a class="mp-button secondary full" href="/learner/pages/order-detail.html?orderId=${encodeURIComponent(paidOrder.id)}">查看订单</a>`));
    return;
  }
  if (selectedOrder?.status === '已支付') { layout(stack(card(`<div class="mp-payment-state success">${pill('已支付', 'green')}<h2>该课程已完成支付</h2><p>当前账号已有生效订单，不支持重复购买。</p></div>`), `<a class="mp-button full" href="/learner/pages/order-detail.html?orderId=${encodeURIComponent(selectedOrder.id)}">查看订单详情</a>`, `<a class="mp-button secondary full" href="${courseLink(item)}">返回课程</a>`)); return; }
  // P1-4: no orderId in the URL means "find the resumable order for the selected student" — an absent
  // order must not short-circuit into the first branch of the ternary.
  const activeOrder = (selectedOrder && isPaymentResumable(selectedOrder)) ? selectedOrder : state.orders.find(order => order.accountId === state.accountId && order.courseId === item.id && (item.type !== 'class' || order.studentId === state.currentStudentId) && isPaymentResumable(order));
  const previousStatus = activeOrder ? paymentStatusLabel(activeOrder) : '待支付';
  const stateNotice = activeOrder?.status === '支付失败' ? `<div class="mp-notice">上次支付失败：${esc(activeOrder.paymentReason || '支付渠道未完成确认')}。原订单号将继续复用。</div>` : activeOrder?.status === '已取消' ? `<div class="mp-notice">${esc(activeOrder.paymentReason || '订单已取消')}，继续支付将复用原订单号。</div>` : '';
  const isClassItem = item.type === 'class';
  const account = purchaseAccount();
  const subjectRow = isClassItem
    ? `<div class="mp-row"><span class="mp-label">当前学员</span><select id="student-select" style="border:0;background:transparent;color:var(--ink);text-align:right">${state.students.map(student => `<option value="${student.id}" ${student.id === state.currentStudentId ? 'selected' : ''}>${esc(student.name)}</option>`).join('')}</select></div>`
    : `<div class="mp-row"><span class="mp-label">购买账号</span><strong>${esc(account.name)}${account.phone ? `（${esc(account.phone)}）` : ''}</strong></div>`;
  layout(stack(card(`<div class="mp-pills">${pill(item.type === 'video' ? '视频课程' : '面授课程')}${activeOrder ? pill(previousStatus, activeOrder.status === '支付失败' ? 'gray' : 'amber') : ''}</div><h2 style="margin-top:10px">${esc(item.name)}</h2><p>${esc(courseMeta(item))}</p>${stateNotice}<div class="mp-divider"></div>${subjectRow}<div class="mp-row"><span class="mp-label">应付金额</span><strong class="mp-price">¥${item.price.toLocaleString()}.00</strong></div>${activeOrder ? `<div class="mp-payment-order-ref">订单号：${esc(activeOrder.id)}</div>` : ''}`), card(`<div class="mp-field"><label for="payment-outcome">支付结果（演示）</label><select id="payment-outcome"><option value="success">支付成功</option>${item.type === 'class' ? '<option value="seat-failed">支付成功但最终占位失败</option>' : ''}<option value="failed">支付失败</option><option value="cancelled">用户取消</option><option value="timeout">支付超时</option></select></div><label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--muted);margin-top:12px"><input id="agreement" type="checkbox" style="margin-top:3px">我已阅读并同意用户协议、隐私政策和课程报名须知</label><div id="payment-error" class="mp-notice" hidden style="margin-top:12px"></div>`), `<div class="mp-actions"><button class="mp-button full" id="pay-button" type="button">${activeOrder ? '继续支付' : '确认支付'}</button><a class="mp-button secondary full" href="/learner/pages/orders.html">返回订单</a></div>`));
  // P1-4: switching the student re-resolves the resumable order instead of keeping the previous one.
  document.querySelector('#student-select')?.addEventListener('change', event => { state.currentStudentId = event.target.value; saveState(); renderPayment(); });
  document.querySelector('#pay-button').addEventListener('click', () => {
    if (!document.querySelector('#agreement').checked) { const error = document.querySelector('#payment-error'); error.hidden = false; error.textContent = '请先勾选用户协议和报名须知'; return; }
    const now = demoTime(); const outcome = document.querySelector('#payment-outcome').value; const shared = readDemoState(); const isClass = item.type === 'class';
    const classRecord = (shared.classes || []).find(row => row.id === item.id);
    // RM-F-03: learner-side orders (seed/session) and shared-store orders are both authoritative here.
    const paidMatcher = order => order.accountId === state.accountId && order.courseId === item.id && order.status === '已支付' && (!isClass || (order.classId === item.id && order.studentId === state.currentStudentId));
    const paidDuplicate = state.orders.find(paidMatcher) || (shared.orders || []).find(paidMatcher);
    if (paidDuplicate) {
      if (isClass) { toast('当前学员已报名该班级，不支持重复报名', 'error'); return; }
      toast('当前账号已购买该课程，正在进入学习中心', 'error');
      setTimeout(() => go('/learner/pages/learning.html'), 700);
      return;
    }
    // P1-4: match the resumable order for the student selected at submit time.
    const submitOrder = (selectedOrder && isPaymentResumable(selectedOrder)) ? selectedOrder : state.orders.find(order => order.accountId === state.accountId && order.courseId === item.id && (!isClass || order.studentId === state.currentStudentId) && isPaymentResumable(order));
    // P2-7 / I1-DEC-12: re-read the class record and re-check capacity right before the atomic deduction.
    if (isClass && outcome !== 'seat-failed') {
      const latestClass = (readDemoState().classes || []).find(row => row.id === item.id) || classRecord || course(item.id);
      const enrolled = Number(latestClass?.enrolled || 0); const capacity = Number(latestClass?.capacity || 0);
      if (capacity && enrolled >= capacity) { toast('该班级名额已被占满，本次报名未成功，请选择其他班级', 'error'); return; }
      if (studentEnrolledCount(shared, item.id) >= 1) { toast('当前学员已报名该班级，不支持重复报名', 'error'); return; }
    }
    const existing = submitOrder || { id: `OD${Date.now()}`, courseId: item.id, amount: item.price, studentId: isClass ? state.currentStudentId : '', accountId: state.accountId, classId: isClass ? item.id : '', createdAt: now, paidAt: '' };
    const patch = { ...existing, accountId: state.accountId, courseId: item.id, amount: item.price, studentId: isClass ? state.currentStudentId : '', classId: isClass ? item.id : '', updatedAt: now };
    if (outcome === 'seat-failed') {
      patch.status = '退款中'; patch.paidAt = now; patch.paymentState = '已到账'; patch.paymentRecordId = patch.paymentRecordId || `PAY-${patch.id}`; patch.refundStatus = '处理中'; patch.refundRetryCount = 0; patch.merchantRefundNo = patch.merchantRefundNo || `MR-${patch.paymentRecordId}`; patch.refundBusinessKey = `seat_refund:${patch.paymentRecordId}`; patch.refundType = '系统免审批原路全额退款'; patch.paymentReason = '支付成功且支付记录已到账，但最终名额占用失败；已发起免审批全额原路退款。未生成报名和分班，不增加人数，不自动调班，不保留资金。可重新选择同专业、适龄且有余位班级。'; patch.cancelType = 'seat-allocation-failed';
      upsertDemoRecord('orders', patch);
    } else if (outcome === 'success') {
      patch.status = '已支付'; patch.paidAt = now; patch.paymentReason = ''; patch.cancelType = '';
      upsertDemoRecord('orders', patch);
      if (isClass) {
        // P0-1: keep the class name (not the batch class name) so the admin record is not rewritten.
        const sourceClass = classRecord || { ...item, id: item.id, name: item.name || item.className, className: item.className || item.name, course: item.courseName || item.name, display: '已展示', enrolled: 0, capacity: Number(item.seats?.split('/')[1] || 1), status: '招生中' };
        const alreadyEnrolled = (shared.enrollments || []).some(row => row.accountId === state.accountId && row.studentId === state.currentStudentId && row.classId === item.id && row.status === '已报名');
        if (!alreadyEnrolled) {
          upsertDemoRecord('enrollments', { id: `${state.accountId}-${state.currentStudentId}-${item.id}`, accountId: state.accountId, studentId: state.currentStudentId, classId: item.id, status: '已报名', enrolledAt: now });
          const sharedRow = (readDemoState().classes || []).find(row => row && typeof row === 'object' && row.id === sourceClass.id);
          const capacity = Number(sharedRow?.capacity || sourceClass.capacity || item.seats?.split('/')[1] || 1);
          const baseline = sharedRow ? Number(sharedRow.enrolled || 0) : Math.max(0, Number(item.seats?.split('/')[1] || 0) - Number(item.seats?.split('/')[0] || 0));
          upsertDemoRecord('classes', { ...sourceClass, courseId: sourceClass.courseId || item.id, course: sourceClass.course || item.courseName || item.name, batch: sourceClass.batch || item.season, status: sourceClass.status || item.classStatus || '招生中', display: sourceClass.display || '已展示', fast: sourceClass.fast || '否', archive: sourceClass.archive || '轻量课程档案', professional: item.professional || sourceClass.professional, age: item.age || sourceClass.age, capacity, enrolled: Math.min(capacity, baseline + 1) });
        }
      } else upsertDemoRecord('videoEntitlements', { id: `${state.accountId}-${item.id}`, accountId: state.accountId, courseId: item.id, status: '生效', grantedAt: now });
    } else {
      patch.status = outcome === 'failed' ? '支付失败' : '已取消'; patch.paidAt = ''; patch.paymentReason = outcome === 'failed' ? '支付渠道未完成确认' : outcome === 'timeout' ? '支付超时，订单已关闭' : '用户主动取消支付'; patch.cancelType = outcome === 'timeout' ? 'timeout' : 'cancel'; upsertDemoRecord('orders', patch);
    }
    const index = state.orders.findIndex(order => order.id === patch.id); if (index < 0) state.orders.unshift(patch); else state.orders[index] = { ...state.orders[index], ...patch }; saveState(); toast(outcome === 'seat-failed' ? '报名未成功，退款处理中' : outcome === 'success' ? (isClass ? '支付成功，已自动分班并占用名额' : '支付成功，学习权限已开通') : '支付结果已记录，课程权限和面授名额均未生效');
    setTimeout(() => go(`/learner/pages/order-detail.html?orderId=${encodeURIComponent(patch.id)}`), 450);
  });
}
function orderTone(status) { return status === '已支付' || status === '已退款' ? 'green' : status === '待支付' || status === '退款中' || status === '支付失败' ? 'amber' : 'gray'; }
function orderTimes(order) { return { createdAt: order.createdAt || '2026-09-08 14:20', paidAt: order.paidAt || '' }; }
function renderOrders() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">单</span><strong>登录后查看我的订单</strong><p>登录后可查看课程交易记录、支付状态和退款进度。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/orders.html')}">去登录</a></section>`)); return; }
  const tabs = [['all', '全部'], ['待支付', '待支付'], ['支付失败', '支付失败'], ['已支付', '已支付'], ['退款中', '退款中'], ['已退款', '已退款'], ['已取消', '已取消']];
  layout(stack(card(`<div class="mp-tabs" aria-label="订单状态筛选">${tabs.map(([value, label], index) => `<button class="mp-tab ${index === 0 ? 'active' : ''}" data-order-tab="${value}" type="button">${label}</button>`).join('')}</div>`), `<div id="order-list" class="mp-order-list"></div>`));
  const draw = () => {
    const active = document.querySelector('[data-order-tab].active')?.dataset.orderTab || 'all';
    const orders = state.orders.filter(order => active === 'all' || order.status === active);
    const list = document.querySelector('#order-list');
    list.innerHTML = orders.length ? orders.map(order => {
      const item = course(order.courseId); const student = state.students.find(row => row.id === order.studentId) || currentStudent(); const times = orderTimes(order); const isClass = item.type === 'class';
      // I1-DEC-25 / RM-U-01: video orders are keyed by the purchasing account, class orders by account + student.
      const subjectFact = isClass ? `<div><span>当前学员</span><strong>${esc(student.name)}</strong></div>` : `<div><span>购买账号</span><strong>${esc(purchaseAccount().name)}</strong></div>`;
      const action = isPaymentResumable(order) ? `<button class="mp-button mp-order-action" type="button" data-order-action="pay" data-course-id="${item.id}" data-order-id="${order.id}">${order.status === '待支付' ? '去支付' : '继续支付'}</button>` : order.status === '已支付' && isClass ? `<button class="mp-button secondary mp-order-action" type="button" data-order-action="refund" data-order-id="${order.id}">申请退款</button>` : `<a class="mp-button secondary mp-order-action" href="/learner/pages/order-detail.html?orderId=${encodeURIComponent(order.id)}">查看详情</a>`;
      return `<article class="mp-order-card"><div class="mp-order-card-head"><div><strong>${esc(item.name)}</strong><small>${isClass ? '面授课程' : '视频课程'} · ${esc(order.id)}</small></div>${pill(paymentStatusLabel(order), orderTone(order.status))}</div><div class="mp-order-card-facts">${subjectFact}<div><span>${isClass ? '班级' : '课程类型'}</span><strong>${esc(isClass ? item.className : '视频课程')}</strong></div>${isClass ? `<div><span>上课安排</span><strong>${esc(item.campus)} · ${esc(item.schedule)}</strong></div>` : `<div><span>下单时间</span><strong>${esc(times.createdAt)}</strong></div>`}<div><span>${times.paidAt ? '支付时间' : '订单时间'}</span><strong>${esc(times.paidAt || times.createdAt)}</strong></div>${order.paymentReason ? `<div><span>支付说明</span><strong>${esc(order.paymentReason)}</strong></div>` : ''}</div><div class="mp-order-card-footer"><span>实付 <b>¥${Number(order.amount || item.price).toLocaleString()}.00</b></span><div class="mp-actions">${action}</div></div></article>`;
    }).join('') : `<div class="mp-empty">暂无${active === 'all' ? '' : active}订单</div>`;
    list.querySelectorAll('[data-order-action="pay"]').forEach(node => node.addEventListener('click', () => go(`/learner/pages/payment.html?courseId=${encodeURIComponent(node.dataset.courseId)}&orderId=${encodeURIComponent(node.dataset.orderId)}`)));
    list.querySelectorAll('[data-order-action="refund"]').forEach(node => node.addEventListener('click', () => { const order = state.orders.find(row => row.id === node.dataset.orderId); if (!order) return; order.status = '退款中'; saveState(); draw(); toast('退款申请已提交，等待后台审核'); }));
  };
  document.querySelectorAll('[data-order-tab]').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('[data-order-tab]').forEach(item => item.classList.remove('active')); tab.classList.add('active'); draw(); })); draw();
}
function renderOrderDetail() {
  if (!isLoggedIn()) { renderOrders(); return; }
  const selectedOrder = state.orders.find(row => row.id === params.get('orderId'));
  const item = course(selectedOrder?.courseId || params.get('courseId') || 'COURSE-CR-2026-0002');
  const order = selectedOrder || state.orders.find(row => row.courseId === item.id) || { id: '待生成', status: '待支付', amount: item.price, studentId: state.currentStudentId, createdAt: '待生成', paidAt: '' };
  const student = state.students.find(row => row.id === order.studentId) || currentStudent();
  const times = orderTimes(order);
  const isClass = item.type === 'class';
  if (isClass && order.cancelType === 'seat-allocation-failed') { renderSeatFailureOrder(order, item, student); return; }
  const isPaid = order.status === '已支付';
  const canRefund = isClass && isPaid;
  const displayStatus = paymentStatusLabel(order);
  const statusCopy = order.status === '支付失败' ? `支付失败：${order.paymentReason || '支付渠道未完成确认'}。可继续支付，原订单号保持不变。` : order.status === '已取消' ? `${order.paymentReason || '订单已取消'}。当前未产生课程授权、面授分班或名额占用，可继续支付。` : { '待支付': '订单已创建，请在有效期内完成支付。', '已支付': '支付已确认，订单交易完成。', '退款中': '退款申请已提交，正在等待后台审核。', '已退款': isClass ? '退款已完成，面授报名资格已取消。' : '退款已完成，课程学习权限已关闭。' }[order.status] || '订单状态以系统记录为准。';
  const productSummary = isClass
    ? `<div class="mp-order-product-copy"><strong>${esc(item.className)}</strong><span>${esc(item.courseName || item.name)} · ${esc(item.teacher)}老师</span></div><div class="mp-order-product-cover class-cover">面授</div>`
    : `<div class="mp-order-product-copy"><strong>${esc(item.name)}</strong><span>${esc(item.teacher)}老师 · 共${esc(item.hours)}课时</span></div><div class="mp-order-product-cover video-cover">视频</div>`;
  const fulfillment = isClass
    ? order.status === '已支付' ? ['已保留名额', 'green'] : order.status === '退款中' ? ['资格冻结', 'amber'] : order.status === '已退款' ? ['名额已释放', 'gray'] : ['未生效', 'gray']
    : order.status === '已支付' ? ['已开通', 'green'] : order.status === '退款中' ? ['权限冻结', 'amber'] : order.status === '已退款' ? ['已关闭', 'gray'] : ['未生效', 'gray'];
  const primaryAction = isPaymentResumable(order)
    ? `<a class="mp-button full" href="/learner/pages/payment.html?courseId=${encodeURIComponent(item.id)}&orderId=${encodeURIComponent(order.id)}">${order.status === '待支付' ? '去支付' : '继续支付'}</a>`
    : isClass && isPaid
      ? `<a class="mp-button full" href="${courseLink(item)}">查看班级</a>`
      : isPaid
        ? `<button class="mp-button full" type="button" data-action="learning">进入学习</button>`
        : '';
  const secondaryAction = canRefund ? button('申请退款', `data-action="refund" data-order-id="${order.id}"`, 'secondary') : '';
  layout(stack(
    card(`<div class="mp-order-detail-status">${pill(displayStatus, orderTone(order.status))}<span class="mp-muted">${isClass ? '面授课程订单' : '视频课程订单'}</span></div><div class="mp-order-status-copy">${esc(statusCopy)}</div>`),
    card(`<div class="mp-order-product">${productSummary}</div><div class="mp-divider"></div><div class="mp-row"><span class="mp-label">订单金额</span><strong class="mp-price">¥${Number(order.amount || item.price).toLocaleString()}.00</strong></div>`),
    card(`<div class="mp-section-head"><h3>订单信息</h3><span class="mp-muted">交易记录</span></div><dl class="mp-order-detail-facts"><div><dt>订单号</dt><dd>${esc(order.id)}</dd></div>${isClass ? `<div><dt>当前学员</dt><dd>${esc(student.name)}</dd></div>` : `<div><dt>购买账号</dt><dd>${esc(purchaseAccount().name)}${purchaseAccount().phone ? `（${esc(purchaseAccount().phone)}）` : ''}</dd></div>`}<div><dt>下单时间</dt><dd>${esc(times.createdAt)}</dd></div><div><dt>${times.paidAt ? '支付时间' : '支付状态'}</dt><dd>${esc(times.paidAt || displayStatus)}</dd></div><div><dt>课程类型</dt><dd>${isClass ? '面授课程' : '视频课程'}</dd></div><div><dt>支付方式</dt><dd>${isPaid || times.paidAt ? '微信支付' : '未完成支付'}</dd></div>${order.paymentReason ? `<div><dt>支付说明</dt><dd>${esc(order.paymentReason)}</dd></div>` : ''}</dl>`),
    card(`<div class="mp-section-head"><h3>${isClass ? '报名信息' : '课程权限'}</h3>${pill(...fulfillment)}</div>${isClass ? `<dl class="mp-order-detail-facts"><div><dt>班级</dt><dd>${esc(item.className)}</dd></div><div><dt>授课教师</dt><dd>${esc(item.teacher)}老师</dd></div><div><dt>上课时间</dt><dd>${esc(item.schedule)}</dd></div><div><dt>上课教室</dt><dd>${esc(item.campus)} · ${esc(item.classroom)}</dd></div></dl>` : `<p>${isPaid ? '课程学习权限已生效，学习状态和进度请前往“我的学习”查看。' : '完成支付后将开通课程学习权限，学习进度不会显示在订单状态中。'}</p>`}${['支付失败', '已取消'].includes(order.status) ? `<div class="mp-notice" style="margin-top:12px">本次未授权、不分班、不扣减面授名额；继续支付会复用当前订单号。</div>` : order.status === '退款中' ? `<div class="mp-notice" style="margin-top:12px">退款审核期间，${isClass ? '面授报名资格' : '课程学习权限'}暂时冻结。</div>` : order.status === '已退款' ? `<div class="mp-notice" style="margin-top:12px">退款完成后，${isClass ? '原面授班级名额已释放' : '课程学习权限已关闭'}。</div>` : !isClass && isPaid ? `<div class="mp-notice" style="margin-top:12px">视频课程订单不支持退款，订单状态与学习状态相互独立。</div>` : ''}`),
    primaryAction || secondaryAction ? `<div class="mp-order-detail-actions">${primaryAction}${secondaryAction ? `<div class="mp-actions">${secondaryAction}</div>` : ''}</div>` : '',
    `<a class="mp-button secondary full" href="/learner/pages/orders.html">返回我的订单</a>`
  ));
}
function renderSeatFailureOrder(order, item, student) {
  const candidates = state.courses.filter(candidate => candidate.type === 'class' && candidate.id !== item.id && candidate.classStatus === '招生中' && candidate.professional === item.professional && candidate.age === item.age && Number(candidate.seats?.split('/')[0] || 0) > 0);
  const candidateMarkup = candidates.length ? candidates.map(candidate => `<article class="mp-order-recommendation"><div><strong>${esc(candidate.className || candidate.name)}</strong><p>${esc(candidate.teacher)}老师 · ${esc(candidate.campus)} · ${esc(candidate.classroom || '教室待定')}</p><p>${esc(candidate.schedule || '时间待定')} · 余${esc(candidate.seats)} · ¥${Number(candidate.price || 0).toLocaleString()}.00 · 截止${esc(candidate.deadline || '待定')}</p></div><button class="mp-button" type="button" data-action="seat-retry" data-course-id="${esc(candidate.id)}">重新报名</button></article>`).join('') : '<div class="mp-empty">暂无符合条件的班级，请返回班级列表或查看退款进度。</div>';
  layout(stack(
    card(`<div class="mp-order-detail-status">${pill(order.status === '已退款' ? '报名未成功，退款已完成' : '报名未成功，退款处理中', order.status === '已退款' ? 'green' : 'amber')}<span class="mp-muted">面授课程订单</span></div><div class="mp-order-status-copy">支付成功且支付记录已到账，${order.status === '已退款' ? '退款渠道已确认全额原路退款完成。' : '已发起全额原路退款，等待渠道回调。'}</div>`),
    card(`<div class="mp-section-head"><h3>处理结果</h3>${pill('未生成报名/分班', 'gray')}</div><p>支付记录已到账，系统已自动发起免审批全额原路退款。未生成报名和分班记录，未增加班级人数，不自动调班、不保留资金。</p><dl class="mp-order-detail-facts"><div><dt>订单号</dt><dd>${esc(order.id)}</dd></div><div><dt>当前学员</dt><dd>${esc(student.name)}</dd></div><div><dt>支付记录</dt><dd>已到账</dd></div><div><dt>退款状态</dt><dd>${order.status === '已退款' ? '已完成' : order.refundStatus || '处理中'}</dd></div><div><dt>退款方式</dt><dd>免审批全额原路退款</dd></div></dl>`),
    card(`<div class="mp-section-head"><h3>可重新选择的班级</h3><span class="mp-muted">同专业 · 适龄 · 有余位</span></div>${candidateMarkup}`),
    `<div class="mp-actions"><button class="mp-button secondary" type="button" data-action="refund-retry-fail" data-order-id="${esc(order.id)}">模拟退款失败并重试</button><button class="mp-button" type="button" data-action="refund-success" data-order-id="${esc(order.id)}">模拟退款成功回调</button></div><a class="mp-button secondary full" href="/learner/pages/fast-registration.html">${candidates.length ? '返回班级列表' : '返回班级列表 / 查看退款进度'}</a>`
  ));
}
function learningRecords() {
  const videoProgress = state.chapterDone.includes('chapter-003') ? 100 : course('COURSE-CR-2026-0002').progress;
  const records = [
    { id: 'learning-class-001', courseId: 'class-001', studentIds: ['student-001'], type: 'class', status: 'ongoing', progress: 50, completedLessons: 8, className: '2026秋季中国舞启蒙一班', teacher: '王玥', classroom: '龙泉校区 · 综合楼302', nextLesson: '09-16 09:00', lessonNo: 9, lessonStatus: '待上课', lessonNote: '09-16 09:00-10:30' },
    { id: 'learning-class-002-ongoing', courseId: 'class-001', studentIds: ['student-001'], type: 'class', status: 'ongoing', progress: 38, completedLessons: 6, name: '少儿中国舞提高班', className: '2026秋季中国舞提高二班', teacher: '王玥', classroom: '龙泉校区 · 舞蹈楼201', nextLesson: '正在上课', lessonNo: 7, lessonStatus: '上课中', lessonNote: '今日 14:00-15:30' },
    { id: 'learning-class-003-ongoing', courseId: 'class-001', studentIds: ['student-001'], type: 'class', status: 'ongoing', progress: 38, completedLessons: 6, name: '少儿中国舞基础班', className: '2026秋季中国舞基础三班', teacher: '王玥', classroom: '南湖校区 · 形体教室105', nextLesson: '09-20 10:00', lessonNo: 6, lessonStatus: '已完成', lessonNote: '09-13 10:00-11:30' },
    { id: 'learning-class-004-ongoing', courseId: 'class-003', studentIds: ['student-002'], type: 'class', status: 'ongoing', progress: 19, completedLessons: 3, name: '少儿中国舞提高班', className: '2026秋季中国舞提高二班', teacher: '王玥', classroom: '南湖校区 · 形体教室105', nextLesson: '09-20 10:00', lessonNo: 4, lessonStatus: '待上课', lessonNote: '09-20 10:00-11:30' },
    { id: 'learning-class-005-ongoing', courseId: 'class-003', studentIds: ['student-002'], type: 'class', status: 'ongoing', progress: 25, completedLessons: 4, name: '少儿中国舞提高班', className: '2026秋季中国舞提高排练班', teacher: '王玥', classroom: '南湖校区 · 形体教室105', nextLesson: '09-21 10:00', lessonNo: 5, lessonStatus: '待上课', lessonNote: '09-21 10:00-11:30' },
    { id: 'learning-video-001', courseId: 'COURSE-CR-2026-0002', studentIds: ['student-001', 'student-002'], type: 'video', status: 'ongoing', progress: videoProgress, lastPosition: '第3章 · 作品演唱 18:36' },
    { id: 'learning-class-002', courseId: 'class-002', studentIds: ['student-001', 'student-002'], type: 'class', status: 'upcoming', progress: 0, className: '2026秋季少儿美术兴趣班', teacher: '李青', classroom: '南湖校区 · 美术楼103', nextLesson: '09-13 14:00' },
    { id: 'learning-class-ended', studentIds: ['student-001'], type: 'class', status: 'ended', progress: 100, name: '少儿中国舞基础', className: '2026春季中国舞基础班', teacher: '王玥', classroom: '龙泉校区 · 综合楼302', completionStatus: '已结业', href: '/learner/pages/results.html?courseId=class-001' }
  ];
  const shared = readDemoState();
  const sharedVideo = (shared.videoEntitlements || []).filter(item => item.accountId === state.accountId && item.status === '生效').map(entitlement => { const progress = shared.progress?.[`${state.accountId}-${entitlement.courseId}`] || {}; return { courseId: entitlement.courseId, studentIds: state.students.map(student => student.id), type: 'video', status: 'ongoing', progress: Number(progress.percent || 0), lastPosition: progress.lastPosition || '尚未开始学习' }; });
  const sharedClasses = (shared.enrollments || []).filter(item => item.accountId === state.accountId && item.studentId === state.currentStudentId && item.status === '已报名').map(enrollment => { const source = state.courses.find(courseItem => courseItem.id === enrollment.classId) || {}; return { ...source, courseId: enrollment.classId, studentIds: [state.currentStudentId], type: 'class', status: 'upcoming', progress: 0, className: source.className || source.name, teacher: source.teacher, classroom: `${source.campus || ''} · ${source.classroom || ''}`, nextLesson: source.schedule || '待排课' }; });
  return [...records, ...sharedVideo, ...sharedClasses].filter(item => item.studentIds.includes(state.currentStudentId)).map(item => {
    const source = item.courseId ? course(item.courseId) : {};
    return { ...source, ...item, name: item.name || source.name, href: item.href || (item.type === 'video' ? `/learner/pages/video.html?courseId=${source.id}` : courseLink(source)) };
  });
}
function learningTasks() {
  // P1-3: tasks are derived from the current account + student instead of a fixed student-001 list.
  const records = learningRecords();
  const tasks = [];
  records.filter(item => item.type === 'class' && item.status === 'ongoing' && item.nextLesson && !String(item.lessonStatus || '').includes('停课')).slice(0, 1).forEach(item => {
    tasks.push({ type: '上课提醒', title: '上课提醒', detail: `${item.className || item.name} · ${item.nextLesson}`, label: '查看课次', tone: 'green', href: `/learner/pages/class-detail.html?courseId=${item.courseId}` });
  });
  records.filter(item => item.type === 'class' && item.status === 'ongoing' && Number(item.progress || 0) < 100).slice(0, 1).forEach(item => {
    tasks.push({ type: '作业待提交', title: '作业待提交', detail: `${item.className || item.name} · 课后练习待提交`, label: '去提交', tone: 'amber', href: `/learner/pages/class-detail.html?courseId=${item.courseId}&tab=attendance` });
  });
  records.filter(item => item.type === 'class' && String(item.lessonStatus || '').includes('停课')).slice(0, 1).forEach(item => {
    tasks.push({ type: '调课通知', title: '课次调整待确认', detail: `${item.className || item.name} · ${item.nextLesson || '时间待通知'}`, label: '查看详情', tone: 'amber', href: `/learner/pages/class-detail.html?courseId=${item.courseId}` });
  });
  if (reportState() === '已发布' && records.some(item => item.type === 'class')) tasks.push({ type: '报告已发布', title: '报告已发布', detail: '学习报告可查看', label: '去查看', tone: 'green', href: `/learner/pages/results.html?courseId=${(records.find(item => item.type === 'class') || {}).courseId || 'class-001'}` });
  return tasks;
}
function learningCourseCard(item) {
  const isClass = item.type === 'class';
  const typeLabel = isClass ? '面授课程' : '视频课程';
  const statusLabels = { ongoing: '进行中', upcoming: '待开课', ended: '已结束' };
  const statusTones = { ongoing: 'green', upcoming: 'amber', ended: 'gray' };
  const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
  const lessonTone = item.lessonStatus === '上课中' ? 'amber' : item.lessonStatus === '已完成' ? 'green' : ['已取消', '已停课'].includes(item.lessonStatus) ? 'gray' : '';
  const totalLessons = item.lessons || item.totalLessons || 0;
  const completedLessons = item.completedLessons ?? Math.round((item.progress || 0) * totalLessons / 100);
  const courseStatus = item.status === 'ongoing' ? '' : pill(statusLabels[item.status], statusTones[item.status]);
  const classInfo = item.lessonStatus
    ? `<div class="mp-learning-lesson-row"><span>第${esc(item.lessonNo)}/${esc(totalLessons)}课</span>${pill(item.lessonStatus, lessonTone)}</div><p class="mp-learning-schedule">${esc(item.lessonNote || item.nextLesson)} · ${esc(item.classroom)}</p>`
    : `<p class="mp-learning-schedule">${item.status === 'upcoming' ? `首次上课：${esc(item.nextLesson)}` : item.status === 'ended' ? '课程已结束' : esc(item.nextLesson)} · ${esc(item.classroom)}</p>`;
  const videoInfo = `<p class="mp-learning-resume">上次学习：${esc(item.lastPosition)}</p>`;
  const progressLabel = isClass ? `已完成 ${completedLessons}/${totalLessons} 课次` : '学习进度';
  const actionLabel = item.status === 'ended' ? '查看成果' : isClass ? '进入班级' : '继续学习';
  return `<article class="mp-learning-course-card ${isClass ? 'is-class' : 'is-video'}"><div class="mp-learning-course-main"><div class="mp-learning-cover ${isClass ? 'class-cover' : 'video-cover'}" data-cover-mark="${esc(coverMark)}"><span>${typeLabel}</span></div><div class="mp-learning-course-copy"><div class="mp-learning-title-row"><h3>${esc(item.name)}</h3>${courseStatus}</div>${isClass ? `<p class="mp-learning-class-name">${esc(item.className)}</p>${classInfo}` : videoInfo}</div></div><div class="mp-learning-progress"><div><span>${progressLabel}</span><strong>${item.progress}%</strong></div><div class="mp-progress"><span style="width:${item.progress}%"></span></div></div><footer class="mp-learning-course-footer">${item.status === 'ended' ? `<span class="mp-learning-completion">当前学员：${esc(item.completionStatus)}</span>` : '<span></span>'}<a class="mp-button secondary" href="${item.href}">${actionLabel}</a></footer></article>`;
}
function renderLearning() {
  if (!isLoggedIn()) {
    layout(stack(`<section class="mp-locked"><strong>登录后进入学习中心</strong><p>登录后可查看当前学员的课程、学习进度、待办任务和学习成果。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/learning.html')}">去登录</a></section>`));
    return;
  }
  const statusLabels = { ongoing: '进行中', upcoming: '待开课', ended: '已结束' };
  const attendanceRates = { 'student-001': 92, 'student-002': 100 };
  let activeStatus = 'ongoing';
  const draw = () => {
    const records = learningRecords();
    const tasks = learningTasks();
    const filtered = records.filter(item => item.status === activeStatus);
    const groupedCourses = [
      { type: 'class', label: '面授课程', records: filtered.filter(item => item.type === 'class') },
      { type: 'video', label: '视频课程', records: filtered.filter(item => item.type === 'video') }
    ];
    const courseGroups = groupedCourses.map(group => `<section class="mp-learning-type-group"><div class="mp-learning-type-head"><h3>${group.label}</h3><span>${group.records.length}门</span></div>${group.records.length ? `<div class="mp-learning-course-list">${group.records.map(learningCourseCard).join('')}</div>` : `<div class="mp-learning-type-empty">暂无${group.label}</div>`}</section>`).join('');
    const activeCount = records.filter(item => item.status !== 'ended').length;
    const certificates = records.filter(item => item.status === 'ended' && item.completionStatus === '已结业').length;
    layout(stack(
      card(`<div class="mp-learning-student"><div><span class="mp-muted">当前学员</span><strong>${esc(currentStudent().name)}</strong></div><div class="mp-field"><label class="mp-sr-only" for="learning-student-select">切换当前学员</label><select id="learning-student-select">${state.students.map(student => `<option value="${student.id}" ${student.id === state.currentStudentId ? 'selected' : ''}>${esc(student.name)}</option>`).join('')}</select></div></div><div class="mp-section-head mp-learning-summary-head"><h2>学习进度总览</h2></div><div class="mp-metric-grid mp-learning-metrics"><div class="mp-metric"><strong>${activeCount}</strong><span>在读课程</span></div><div class="mp-metric"><strong>${attendanceRates[state.currentStudentId] || 0}%</strong><span>总出勤率</span></div><div class="mp-metric"><strong>${tasks.length}</strong><span>待办事项</span></div><div class="mp-metric"><strong>${certificates}</strong><span>已获证书</span></div></div>`),
      card(`<div class="mp-section-head"><h2>待办任务</h2><span class="mp-muted">${tasks.length}项</span></div>${tasks.length ? `<div class="mp-learning-task-list">${tasks.map(task => `<a class="mp-learning-task" href="${task.href}"><div><strong>${esc(task.title)}</strong><small>${esc(task.detail)}</small></div>${pill(task.label, task.tone)}</a>`).join('')}</div>` : '<div class="mp-empty mp-learning-empty">暂无待办任务</div>'}`),
      `<section class="mp-learning-section"><div class="mp-section-head"><h2>我的课程</h2><span class="mp-muted">${records.length}门</span></div><div class="mp-tabs mp-learning-tabs" role="tablist">${Object.entries(statusLabels).map(([status, label]) => `<button class="mp-tab ${status === activeStatus ? 'active' : ''}" type="button" role="tab" aria-selected="${status === activeStatus}" data-learning-status="${status}">${label}<span>${records.filter(item => item.status === status).length}</span></button>`).join('')}</div><div class="mp-learning-type-groups">${courseGroups}</div></section>`
    ));
    document.querySelector('#learning-student-select').addEventListener('change', event => { state.currentStudentId = event.target.value; saveState(); activeStatus = 'ongoing'; draw(); });
    document.querySelectorAll('[data-learning-status]').forEach(tab => tab.addEventListener('click', () => { activeStatus = tab.dataset.learningStatus; draw(); }));
  };
  draw();
}
function renderVideo() {
  const item = course(params.get('courseId') || 'COURSE-CR-2026-0002');
  const chapters = Array.isArray(item.outline) && item.outline.length ? item.outline : [{ title: '第1章 · 基础训练', note: '第1节' }, { title: '第2章 · 技术练习', note: '第2节' }, { title: '第3章 · 作品演唱', note: '第3节' }];
  const currentIndex = Math.min(Math.max(Number(params.get('chapter') || chapters.length - 1), 0), chapters.length - 1);
  const purchased = hasPurchasedVideo(item);
  // RM-F-05: the player honours the same product preview policy as the course detail page.
  const isPreview = !purchased && item.preview === '允许试看' && params.get('preview') === '1' && currentIndex === 0;
  if (!purchased && !isPreview) {
    layout(stack(`<section class="mp-locked"><strong>购买后可学习完整课程</strong><p>${item.preview === '允许试看' ? '本商品开启试看，仅第一课时可免费试听，其余课时购买后开放。' : '本商品未开启试看，购买后可学习全部课时。'}</p><a class="mp-button secondary" href="/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}&tab=outline">返回课程大纲</a></section>`));
    return;
  }
  const current = chapters[currentIndex];
  const chapterId = `chapter-${String(currentIndex + 1).padStart(3, '0')}`;
  const sharedProgress = readDemoState().progress?.[`${state.accountId}-${item.id}`] || {};
  const completedIds = Array.isArray(sharedProgress.chapterDone) ? sharedProgress.chapterDone : (Array.isArray(state.chapterDone) ? state.chapterDone : []);
  const isCompleted = completedIds.includes(chapterId);
  const completedCount = chapters.filter((_, index) => completedIds.includes(`chapter-${String(index + 1).padStart(3, '0')}`)).length;
  const courseProgress = completedCount === chapters.length ? 100 : Number(item.progress || 0);
  const positions = sharedProgress.positions || state.videoPositions || {};
  let watchedSeconds = Number(positions[chapterId] || (currentIndex === chapters.length - 1 ? 1116 : 0));
  const watchedText = `${String(Math.floor(watchedSeconds / 60)).padStart(2, '0')}:${String(watchedSeconds % 60).padStart(2, '0')}`;
  const totalSeconds = 2400;
  const watchedRatio = Math.min(Math.round((watchedSeconds / totalSeconds) * 100), 100);
  const chapterItems = chapters.map((chapter, index) => {
    const id = `chapter-${String(index + 1).padStart(3, '0')}`;
    const done = completedIds.includes(id);
    const active = index === currentIndex;
    const locked = isPreview && index !== 0;
    return `<button class="mp-video-chapter ${active ? 'active' : ''}" type="button" data-video-chapter="${index}" aria-current="${active ? 'true' : 'false'}" ${locked ? 'disabled aria-label="购买后开放"' : ''}><span class="mp-video-chapter-index">${String(index + 1).padStart(2, '0')}</span><span class="mp-video-chapter-copy"><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '视频课节')}</small></span>${locked ? pill('购买后开放', 'gray') : done ? '<span class="mp-video-check" aria-label="已完成">✓</span>' : active ? pill(isPreview ? '免费试听' : '学习中', isPreview ? 'green' : '') : '<span class="mp-video-chapter-arrow" aria-hidden="true">›</span>'}</button>`;
  }).join('');
  layout(stack(
    `<section class="mp-video-player-wrap"><div id="video-player" class="mp-video-player" data-playing="false"><div class="mp-video-poster" data-cover-mark="${esc((item.professional || item.name).slice(0, 1))}"><span class="mp-video-type">视频课程</span><button id="video-play" class="mp-video-play" type="button" aria-label="播放视频"><span aria-hidden="true">▶</span></button><strong>${esc(current.title)}</strong></div><div class="mp-video-controls"><div class="mp-video-scrubber"><span style="width:${watchedRatio}%"></span></div><div class="mp-video-control-row"><button id="video-play-small" class="mp-video-control-icon" type="button" aria-label="播放或暂停"><span aria-hidden="true">▶</span></button><span class="mp-video-time">${watchedText} / 40:00</span><div class="mp-video-control-right"><button id="video-speed" class="mp-video-speed" type="button">1×</button><button id="video-fullscreen" class="mp-video-control-icon" type="button" aria-label="全屏"><span aria-hidden="true">⛶</span></button></div></div></div></div><div class="mp-video-current"><div><span class="mp-muted">正在学习</span><h2>${esc(current.title)}</h2></div><span class="mp-video-current-progress">本课 ${watchedRatio}%</span></div></section>`,
    card(`<div class="mp-section-head"><h3>学习进度</h3><strong class="mp-video-progress-value">${courseProgress}%</strong></div><div class="mp-progress"><span style="width:${courseProgress}%"></span></div><p class="mp-video-progress-copy">已完成 ${completedCount}/${chapters.length} 章节 · 当前学习进度会自动保存</p>`, 'mp-video-progress-card'),
    `<section class="mp-video-outline"><div class="mp-section-head"><h3>课程目录</h3><span class="mp-muted">共${chapters.length}章</span></div>${isPreview ? '<p class="mp-video-preview-note">当前为第一课时免费试听，购买后可学习完整课程。</p>' : ''}<div class="mp-video-chapter-list">${chapterItems}</div>${isPreview ? '' : `<div class="mp-video-complete-row">${button(isCompleted ? '本节已完成' : '标记本节完成', 'id="complete-chapter"', 'secondary')}</div>`}</section>`,
    `<nav class="mp-video-navigation" aria-label="章节导航"><button class="mp-button secondary" type="button" data-video-nav="prev" ${currentIndex === 0 ? 'disabled' : ''}><span aria-hidden="true">‹</span> 上一节</button>${isPreview ? `<a class="mp-button" href="/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}">购买完整课程</a>` : `<button class="mp-button" type="button" data-video-nav="next" ${currentIndex === chapters.length - 1 ? 'disabled' : ''}>下一节 <span aria-hidden="true">›</span></button>`}</nav>`
  ));
  const player = document.querySelector('#video-player');
  const playButtons = [document.querySelector('#video-play'), document.querySelector('#video-play-small')];
  let playTimer;
  const updatePlayback = () => { watchedSeconds = Math.min(watchedSeconds + 1, totalSeconds); const nextPositions = { ...positions, [chapterId]: watchedSeconds }; state.videoPositions = nextPositions; saveVideoProgress(item.id, { positions: nextPositions, lastPosition: `${current.title} ${String(Math.floor(watchedSeconds / 60)).padStart(2, '0')}:${String(watchedSeconds % 60).padStart(2, '0')}`, percent: Math.min(Math.round((watchedSeconds / totalSeconds) * 100), 100) }); const time = player.querySelector('.mp-video-time'); const scrubber = player.querySelector('.mp-video-scrubber span'); if (time) time.textContent = `${String(Math.floor(watchedSeconds / 60)).padStart(2, '0')}:${String(watchedSeconds % 60).padStart(2, '0')} / 40:00`; if (scrubber) scrubber.style.width = `${Math.min(Math.round((watchedSeconds / totalSeconds) * 100), 100)}%`; };
  const togglePlay = () => { const playing = player.dataset.playing === 'true'; player.dataset.playing = String(!playing); playButtons.forEach(control => { control.querySelector('span').textContent = playing ? '▶' : 'Ⅱ'; control.setAttribute('aria-label', playing ? '播放视频' : '暂停视频'); }); if (playing) { clearInterval(playTimer); } else { playTimer = setInterval(updatePlayback, 1000); } };
  window.addEventListener('pagehide', () => clearInterval(playTimer), { once: true });
  playButtons.forEach(control => control.addEventListener('click', togglePlay));
  let speedIndex = 0;
  const speeds = ['1×', '1.25×', '1.5×', '2×'];
  document.querySelector('#video-speed').addEventListener('click', event => { speedIndex = (speedIndex + 1) % speeds.length; event.currentTarget.textContent = speeds[speedIndex]; toast(`播放速度 ${speeds[speedIndex]}`); });
  document.querySelector('#video-fullscreen').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen?.(); else player.requestFullscreen?.(); });
  document.querySelectorAll('[data-video-chapter]').forEach(chapter => chapter.addEventListener('click', () => go(`/learner/pages/video.html?courseId=${encodeURIComponent(item.id)}&chapter=${chapter.dataset.videoChapter}`)));
  document.querySelectorAll('[data-video-nav]').forEach(control => control.addEventListener('click', () => { const nextIndex = currentIndex + (control.dataset.videoNav === 'next' ? 1 : -1); if (nextIndex >= 0 && nextIndex < chapters.length) go(`/learner/pages/video.html?courseId=${encodeURIComponent(item.id)}&chapter=${nextIndex}`); }));
  document.querySelector('#complete-chapter')?.addEventListener('click', () => { const nextDone = [...new Set([...completedIds, chapterId])]; const nextPositions = { ...positions, [chapterId]: totalSeconds }; state.chapterDone = nextDone; state.videoPositions = nextPositions; saveVideoProgress(item.id, { chapterDone: nextDone, positions: nextPositions, percent: Math.round((nextDone.length / chapters.length) * 100), lastPosition: `${current.title} 40:00` }); saveState(); renderVideo(); toast('学习进度已保存'); });
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
function renderMessages() {
  mountMobileMessageList({ container: main, messages: state.messages, loggedIn: isLoggedIn(), link: relativePath, detailPath: '/learner/pages/message-detail.html', listPath: '/learner/pages/messages.html', loginUrl: `/login.html?redirect=${encodeURIComponent('/learner/pages/messages.html')}`, lockedCopy: '登录后可查看支付、上课、作业和学习成果等消息。', save: saveState, toast });
}
function renderMessageDetail() {
  mountMobileMessageDetail({ container: main, messages: state.messages, loggedIn: isLoggedIn(), link: relativePath, detailPath: '/learner/pages/message-detail.html', listPath: '/learner/pages/messages.html', loginUrl: `/login.html?redirect=${encodeURIComponent('/learner/pages/messages.html')}`, lockedCopy: '登录后可查看支付、上课、作业和学习成果等消息。', save: saveState, toast });
}
function profileMetric(label, value, tone = '') { return `<span class="mp-profile-metric ${tone}"><strong>${value}</strong><small>${label}</small></span>`; }
function renderProfile() {
  if (!isLoggedIn()) {
    const loginFor = target => `/login.html?redirect=${encodeURIComponent(target)}`;
    layout(stack(
      `<a class="mp-profile-entry mp-profile-login-entry" href="${loginFor('/learner/pages/profile.html')}"><div class="mp-profile-entry-head"><div><strong>登录 / 注册</strong><small>登录后管理个人资料和关联学员</small></div><span class="mp-link">去登录 ›</span></div></a>`,
      `<section class="mp-profile-entry-list" aria-label="个人中心功能"><a class="mp-profile-entry" href="${loginFor('/learner/pages/profile.html')}"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">员</span><div><strong>学员管理</strong><small>切换或添加关联学员</small></div><span class="mp-link">›</span></div></a><a class="mp-profile-entry" href="${loginFor('/learner/pages/orders.html')}"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">单</span><div><strong>我的订单</strong><small>查看支付与退款记录</small></div><span class="mp-link">›</span></div></a><a class="mp-profile-entry" href="${loginFor('/learner/pages/consultation.html')}"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">咨</span><div><strong>我的咨询</strong><small>查看已关联的咨询记录</small></div><span class="mp-link">›</span></div></a><a class="mp-profile-entry mp-profile-message-entry" href="${loginFor('/learner/pages/messages.html')}"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">信</span><div><strong>消息通知</strong><small>查看课程与学习通知</small></div><span class="mp-link">›</span></div></a></section>`,
      `<a class="mp-profile-entry mp-profile-teacher-entry" href="/login.html?role=teacher"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">师</span><div><strong>教师工作台</strong><small>使用教师身份登录</small></div><span class="mp-link">进入 ›</span></div></a>`,
      `<a class="mp-profile-entry mp-profile-settings-entry" href="/learner/pages/settings.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">设</span><div><strong>设置</strong><small>账号设置、协议与关于我们</small></div><span class="mp-link">›</span></div></a>`
    ));
    return;
  }
  const linkedConsultations = state.consultations.filter(row => !row.anonymous);
  const unreadMessageCount = state.messages.filter(row => !row.read).length;
  const orderCount = status => state.orders.filter(order => order.status === status).length;
  const consultationCount = status => linkedConsultations.filter(row => row.status === status).length;
  layout(stack(
    card(`<div class="mp-profile-identity"><span class="mp-avatar mp-profile-avatar" aria-hidden="true">林</span><div><h2>林女士</h2><p>手机号 ${esc(state.phone || '138****2026')}</p></div></div>`),
    card(`<div class="mp-profile-student-head"><h2>学员管理</h2></div><div class="mp-student-row is-current mp-current-student"><span class="mp-student-avatar" aria-hidden="true">${esc(currentStudent().name.slice(0, 1))}</span><div class="mp-student-copy"><strong>${esc(currentStudent().name)}</strong><small>${esc(currentStudent().relation)}</small></div><a class="mp-button secondary mp-student-switch" href="/learner/pages/student-management.html">学员管理</a></div>`),
    `<section class="mp-profile-entry-list" aria-label="个人中心功能"><a class="mp-profile-entry" href="/learner/pages/orders.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">单</span><strong>我的订单</strong><span class="mp-link">查看全部 ›</span></div><div class="mp-profile-metrics">${profileMetric('待支付', orderCount('待支付'), 'amber')}${profileMetric('已支付', orderCount('已支付'), 'green')}${profileMetric('已退款', orderCount('已退款'))}</div></a><a class="mp-profile-entry" href="/learner/pages/consultation.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">咨</span><strong>我的咨询</strong><span class="mp-link">查看记录 ›</span></div><div class="mp-profile-metrics mp-profile-consultation-metrics">${profileMetric('待回复', consultationCount('待回复'), 'amber')}${profileMetric('已回复', consultationCount('已回复'), 'green')}${profileMetric('已试听', consultationCount('已试听'))}${profileMetric('已报名', consultationCount('已报名'))}</div></a><a class="mp-profile-entry mp-profile-message-entry" href="/learner/pages/messages.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">信</span><strong>消息通知</strong>${unreadMessageCount ? `<span class="mp-profile-unread"><i aria-hidden="true"></i>${unreadMessageCount}条未读</span>` : '<span class="mp-muted">已读</span>'}<span class="mp-link">›</span></div></a></section>`,
    `<a class="mp-profile-entry mp-profile-teacher-entry" href="/login.html?role=teacher"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">师</span><div><strong>教师工作台</strong><small>课表、班级与教学执行</small></div><span class="mp-link">进入 ›</span></div></a>`,
    `<a class="mp-profile-entry mp-profile-settings-entry" href="/learner/pages/settings.html"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">设</span><strong>设置</strong><span class="mp-link">›</span></div></a>`
  ));
}
function renderStudentManagement() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><strong>登录后管理关联学员</strong><p>登录后可切换、添加和维护学员资料。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/student-management.html')}">去登录</a></section>`)); return; }
  const studentRow = student => {
    const isCurrent = student.id === state.currentStudentId;
    return `<article class="mp-student-row ${isCurrent ? 'is-current' : ''}"><span class="mp-student-avatar" aria-hidden="true">${esc(student.name.slice(0, 1))}</span><div class="mp-student-copy"><strong>${esc(student.name)}</strong><small>${esc(student.relation)} · ${esc(student.gender || '性别待补充')}</small></div><div class="mp-student-management-actions">${isCurrent ? pill('当前学员', 'green') : `<button class="mp-button secondary mp-student-switch" type="button" data-student-manage-switch="${esc(student.id)}">切换</button>`}<a class="mp-student-action" href="/learner/pages/student-edit.html?studentId=${encodeURIComponent(student.id)}">编辑</a></div></article>`;
  };
  layout(stack(card(`<div class="mp-section-head"><h2>关联学员</h2><span class="mp-muted">${state.students.length}人</span></div><div class="mp-student-list mp-student-management-list">${state.students.map(studentRow).join('')}</div><a class="mp-button secondary mp-student-management-add" href="/learner/pages/student-edit.html">添加学员</a>`)));
  document.querySelectorAll('[data-student-manage-switch]').forEach(buttonNode => buttonNode.addEventListener('click', () => { state.currentStudentId = buttonNode.dataset.studentManageSwitch; saveState(); renderStudentManagement(); toast(`已切换当前学员：${currentStudent().name}`); }));
}
function showDeleteStudentDialog(studentId) {
  const student = state.students.find(item => item.id === studentId);
  if (!student) return;
  if (state.students.length <= 1) { toast('至少保留一名关联学员，暂无法删除。'); return; }
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><h2>删除学员</h2><p class="mp-dialog-copy">确认删除“${esc(student.name)}”？删除后仅移除该账号下的学员关联，不影响已有订单记录。</p><div class="mp-actions" style="margin-top:18px"><button class="mp-button secondary" type="button" data-delete-cancel>取消</button><button class="mp-button mp-student-delete-confirm" type="button" data-delete-confirm>确认删除</button></div></div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.querySelector('[data-delete-cancel]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-delete-confirm]').addEventListener('click', () => {
    state.students = state.students.filter(item => item.id !== studentId);
    if (state.currentStudentId === studentId) state.currentStudentId = state.students[0].id;
    saveState();
    dialog.close();
    toast(`已删除学员：${student.name}`);
    setTimeout(() => go('/learner/pages/student-management.html'), 250);
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
}
function renderStudentEdit() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><strong>登录后维护学员资料</strong><p>登录后可添加、编辑或删除关联学员。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/student-edit.html')}">去登录</a></section>`)); return; }
  const student = params.get('studentId') ? state.students.find(item => item.id === params.get('studentId')) : null;
  if (params.get('studentId') && !student) { layout(stack(`<div class="mp-empty">未找到该学员</div><a class="mp-button secondary" href="/learner/pages/student-management.html">返回学员管理</a>`)); return; }
  const maxBirthMonth = new Date().toISOString().slice(0, 7);
  const isEditing = Boolean(student);
  const gender = student?.gender || (student?.relation === '女儿' ? '女' : student?.relation === '儿子' ? '男' : '');
  const relationOptions = ['女儿', '儿子', '本人', '其他'];
  layout(stack(card(`<form id="student-edit-form" class="mp-form"><div class="mp-field"><label for="profile-student-name">学员姓名</label><input id="profile-student-name" required maxlength="20" placeholder="请输入学员姓名" value="${esc(student?.name || '')}"><small id="profile-student-error" class="mp-form-error" hidden></small></div><fieldset class="mp-student-gender"><legend>性别</legend><div class="mp-student-gender-options"><label><input type="radio" name="profile-student-gender" value="女" required ${gender === '女' ? 'checked' : ''}><span>女</span></label><label><input type="radio" name="profile-student-gender" value="男" ${gender === '男' ? 'checked' : ''}><span>男</span></label></div></fieldset><div class="mp-field"><label for="profile-student-birth-month">出生年月</label><input id="profile-student-birth-month" type="month" max="${maxBirthMonth}" required value="${esc(student?.birthMonth || '')}"></div><div class="mp-field"><label for="profile-student-relation">与账号关系</label><select id="profile-student-relation">${relationOptions.map(option => `<option ${option === student?.relation ? 'selected' : ''}>${option}</option>`).join('')}</select></div><div class="mp-actions"><a class="mp-button secondary" href="/learner/pages/student-management.html">取消</a><button class="mp-button" type="submit">${isEditing ? '保存修改' : '添加并切换'}</button></div></form>`), isEditing ? `<button id="student-edit-delete" class="mp-student-danger-action" type="button">删除学员</button>` : ''));
  document.querySelector('#student-edit-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = document.querySelector('#profile-student-name').value.trim();
    const selectedGender = document.querySelector('input[name="profile-student-gender"]:checked')?.value || '';
    const birthMonth = document.querySelector('#profile-student-birth-month').value;
    if (!name || !selectedGender || !birthMonth) return;
    const error = document.querySelector('#profile-student-error');
    if (state.students.some(item => item.id !== student?.id && item.name === name)) { error.hidden = false; error.textContent = '该学员已存在，请直接切换当前学员。'; return; }
    const values = { name, gender: selectedGender, birthMonth, relation: document.querySelector('#profile-student-relation').value };
    if (student) Object.assign(student, values);
    else {
      const newStudent = { id: `student-${Date.now()}`, ...values };
      state.students.push(newStudent);
      state.currentStudentId = newStudent.id;
    }
    saveState();
    toast(isEditing ? `已更新学员：${name}` : `已添加学员：${name}`);
    setTimeout(() => go('/learner/pages/student-management.html'), 250);
  });
  if (isEditing) document.querySelector('#student-edit-delete').addEventListener('click', () => showDeleteStudentDialog(student.id));
}
function renderSettings() {
  mountMobileSettings({
    container: main,
    loggedIn: isLoggedIn(),
    phone: state.phone,
    wechatAuthorized: state.wechatAuthorized !== false,
    getPhone: () => state.phone,
    getWechatAuthorized: () => state.wechatAuthorized !== false,
    onPhoneChange: phone => { state.phone = `${phone.slice(0, 3)}****${phone.slice(-4)}`; saveState(); },
    onWechatChange: value => { state.wechatAuthorized = value; saveState(); },
    navigate: go,
    loginUrl: '/login.html?redirect=%2Flearner%2Fpages%2Fsettings.html',
    onLogout: () => { sessionStorage.removeItem('hbyx-mini-logged-in'); go('/login.html'); },
    toast
  });
}
function showConsultDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><h2>提交课程咨询</h2><p>无需登录，填写联系方式后课程顾问会主动联系。</p><form class="mp-form"><div class="mp-field"><label for="consult-name">联系人</label><input id="consult-name" required placeholder="请输入联系人姓名"></div><div class="mp-field"><label for="consult-phone">手机号</label><input id="consult-phone" required pattern="1[3-9]\\d{9}" placeholder="请输入手机号"></div><div class="mp-field"><label for="consult-text">咨询内容</label><textarea id="consult-text" required placeholder="想了解哪门课程？"></textarea></div><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="submit">提交咨询</button></div></form></div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    state.consultations.unshift({ id: `C${Date.now()}`, courseId: params.get('courseId') || 'COURSE-CR-2026-0002', status: '待回复', text: '已提交 · 等待课程顾问联系。', submittedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), reply: '', replyAt: '', progress: '待跟进', anonymous: !isLoggedIn() });
    saveState();
    dialog.close();
    toast('咨询已提交，课程顾问会主动联系');
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
}
function switchStudent() { state.currentStudentId = state.currentStudentId === 'student-001' ? 'student-002' : 'student-001'; saveState(); toast(`已切换当前学员：${currentStudent().name}`); setTimeout(() => renderProfile(), 300); }
document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!['refund-success', 'refund-retry-fail'].includes(action)) return;
  state = readState();
  const orderId = event.target.closest('[data-order-id]')?.dataset.orderId;
  const order = state.orders.find(row => row.id === orderId);
  if (!order || order.cancelType !== 'seat-allocation-failed') return;
  const success = action === 'refund-success';
  order.paymentRecordId = order.paymentRecordId || `PAY-${order.id}`;
  order.merchantRefundNo = order.merchantRefundNo || `MR-${order.paymentRecordId}`;
  order.refundBusinessKey = `seat_refund:${order.paymentRecordId}`;
  if (!success) order.refundRetryCount = Number(order.refundRetryCount || 0) + 1;
  order.refundStatus = success ? '已完成' : '重试中';
  order.status = success ? '已退款' : '退款中';
  order.refundedAt = success ? demoTime() : '';
  order.paymentReason = success ? '退款渠道成功回调，免审批全额原路退款已完成；未生成报名和分班，未增加人数。' : '退款渠道失败或超时，订单保持退款中，已按同一业务键重试；未生成报名和分班，未增加人数。';
  upsertDemoRecord('orders', order);
  saveState();
  renderOrderDetail();
  toast(success ? '退款成功回调已确认' : '退款失败，已进入重试');
});
document.addEventListener('click', event => { const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return; if (action === 'seat-retry') { const courseId = event.target.closest('[data-course-id]').dataset.courseId; const dialog = document.createElement('dialog'); dialog.innerHTML = `<form method="dialog" class="mp-dialog-card"><h2>确认重新报名</h2><p>将进入所选班级的报名支付页面，当前订单退款流程不变。</p><div class="mp-actions"><button value="cancel" class="mp-button secondary">取消</button><button value="confirm" class="mp-button">确认重新报名</button></div></form>`; document.body.appendChild(dialog); dialog.showModal(); dialog.addEventListener('close', () => { if (dialog.returnValue === 'confirm') go(`/learner/pages/payment.html?courseId=${encodeURIComponent(courseId)}`); dialog.remove(); }, { once: true }); } if (action === 'courses') go('/learner/pages/courses.html'); if (action === 'consult') showConsultDialog(); if (action === 'share') toast('课程分享卡片已生成'); if (action === 'buy') { const trigger = event.target.closest('[data-course-id]'); const courseId = trigger.dataset.courseId; const item = course(courseId); const detailPath = item.type === 'video' ? '/learner/pages/course-detail.html' : '/learner/pages/class-detail.html'; if (!isLoggedIn()) go(`/login.html?redirect=${encodeURIComponent(`${detailPath}?courseId=${courseId}`)}`); else go(`/learner/pages/payment.html?courseId=${courseId}`); } if (action === 'learning') go('/learner/pages/video.html'); if (action === 'homework') go(`/learner/pages/homework.html?courseId=${event.target.closest('[data-course-id]').dataset.courseId}`); if (action === 'switch-student') switchStudent(); if (action === 'refund') { const orderId = event.target.closest('[data-order-id]')?.dataset.orderId; const order = state.orders.find(row => row.id === orderId); if (order) { order.status = '退款中'; saveState(); renderOrderDetail(); } toast('退款申请已提交，等待后台审核'); } });

subscribeDemoState(() => {
  state = readState();
  if (path.endsWith('/courses.html')) renderCourses();
  if (path.endsWith('/fast-registration.html')) renderFastRegistration();
  if (path.endsWith('/learning.html')) renderLearning();
  if (path.endsWith('/orders.html')) renderOrders();
  if (path.endsWith('/order-detail.html')) renderOrderDetail();
});

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
else if (path.endsWith('/student-management.html')) renderStudentManagement();
else if (path.endsWith('/student-edit.html')) renderStudentEdit();
else if (path.endsWith('/settings.html')) renderSettings();
