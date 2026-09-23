import { relativePath } from './paths.js';
import { mountFieldConstraints } from './field-constraints.js';
import { mountPageHelp } from './page-help.js';
import { toLocalDateTimeString, toLocalMonthString } from './date-utils.js';
import { mountMobileSettings } from './mobile-settings.js';
import { mountMobileMessageDetail, mountMobileMessageList } from './mobile-messages.js';
import { accountStudents, demoId, demoTime, getCurrentAccountId, paymentTimeoutSettings, readDemoState, subscribeDemoState, transitionVideoEntitlement, upsertDemoRecord, updateDemoRecord, videoRefundSettings, writeDemoState } from './demo-store.js';
import { DEMO_TODAY, demoDateTime } from './demo-clock.js';
import { classSeed } from './class-seed.js';
import { venueSeed } from './venue-seed.js';
import { lessonAttendanceStatus } from './lesson-records.js';
import { resolveHomeBanners } from './banner-seed.js';
import { isLearnerPublicPage, isMiniLoggedIn, isMiniRole, miniPageName, redirectMiniLogin } from './mobile-guard.js';
import { toCanonicalCourseId } from './course-seed.js';
import { allProducts, productForCourse } from './product-seed.js';
import { COURSE_DISPLAY_UNSET, classRecordFor, courseAgesText, courseArchiveFor, courseArchiveSeed, courseArchiveVersionFor, saleUnitDisplay, VIDEO_DEMO_COURSES } from './course-display.js';
import { TEACHER_PUBLIC_PROFILE_KEYS, teacherPublicProfileById } from './teacher-facts.js';
import { isRichMarkup, richTextToHtml, sanitizeRichText } from './rich-editor.js';
import { classLessonProgress, classSalesProjection, classTeachingStatus, isSessionPast } from './class-lifecycle.js';

const main = document.querySelector('.mobile-main');
const path = location.pathname;
const params = new URLSearchParams(location.search);
// CR-2026-054：固定班级演示记录已下线；视频课程与用户后来新建的班级不受影响。
const LEGACY_CLASS_DEMO_IDS = new Set(['class-001', 'class-002', 'class-003', 'class-004']);
const isLegacyClassRecord = (record) => record?.demoScenario !== true && (LEGACY_CLASS_DEMO_IDS.has(record?.classId) || LEGACY_CLASS_DEMO_IDS.has(record?.courseId));

// CR-2026-026 §3.3：订单金额一律两位小数，禁止硬编码 .00 拼接。
const money2 = (value) => '¥' + Number(value || 0).toFixed(2).replace(/B(?=(d{3})+(?!d))/g, ',');
const STORAGE_KEY = 'hbyx-mini-learner-demo';
// D-03：首页轮播与后台「轮播图管理」同一份种子，只展示状态为「已启用」的轮播图。
const homeBanners = resolveHomeBanners(readDemoState());

// P0-1 / P0-2: learner classes are projected from the canonical class seed, so the admin CRM and the
// learner app always show the same class key, name, enrollment count and 快速报名 switch value.
const learnerCourseCopy = {
  'COURSE-CR-2026-0001': { intro: '从身体控制、节奏训练到基本舞姿，建立少儿中国舞的基础训练体系。', detail: ['课程根据少儿身体发展特点安排训练强度，通过热身、基本功、组合练习和课堂展示形成完整学习过程。'], outline: [{ title: '第一阶段 · 身体启蒙', note: '4课次' }, { title: '第二阶段 · 基本功训练', note: '6课次' }, { title: '第三阶段 · 舞蹈组合', note: '6课次' }] },
  'LIB-003': { intro: '以主题创作和材料体验为主，帮助少儿建立绘画兴趣和基本表现方法。', detail: ['课程围绕色彩、造型和材料体验展开，每次课完成一件小作品。'], outline: [{ title: '第一阶段 · 色彩与线条', note: '7课次' }, { title: '第二阶段 · 主题创作', note: '7课次' }, { title: '第三阶段 · 作品展示', note: '6课次' }] },
  'COURSE-CR-2026-0003': { intro: '以笔墨体验和传统题材临摹为主，适合零基础少儿建立国画兴趣。', detail: ['从认识工具、执笔与用墨开始，逐步完成基础题材练习。'], outline: [{ title: '第一阶段 · 笔墨入门', note: '8课次' }, { title: '第二阶段 · 传统题材', note: '12课次' }] }
};
const learnerClassCopy = {
  'class-001': { intro: '围绕基本功、身韵组合和课堂展示，帮助少儿学员建立规范动作与舞蹈表现力。', detail: ['课程根据少儿身体发展特点安排训练强度，通过热身、基本功、组合练习和课堂展示形成完整学习过程。', '教师会在课堂中持续观察动作完成情况，并提供阶段性练习建议。'], outline: [{ title: '第一阶段 · 身体启蒙', note: '4课次' }, { title: '第二阶段 · 基本功训练', note: '6课次' }, { title: '第三阶段 · 舞蹈组合', note: '6课次' }] },
  'class-002': { intro: '以主题创作和材料体验为主，帮助少儿建立绘画兴趣和基本表现方法。', detail: ['课程围绕色彩、造型和材料体验展开，每次课完成一件小作品。'], outline: [{ title: '第一阶段 · 色彩与线条', note: '7课次' }, { title: '第二阶段 · 主题创作', note: '7课次' }, { title: '第三阶段 · 作品展示', note: '6课次' }] },
  'class-003': { intro: '在基本功之上加入身韵组合与舞台表现训练，适合已完成启蒙阶段、希望继续提升的少儿学员。', detail: ['课程按提升班节奏训练基本功稳定性和动作连贯性，并加入组合与舞台表现内容。', '教师会在每次课后给出练习建议，便于家长协助学员复习。'], outline: [{ title: '第一阶段 · 基本功巩固', note: '4课次' }, { title: '第二阶段 · 身韵组合', note: '6课次' }, { title: '第三阶段 · 舞台呈现', note: '6课次' }] }
};
function classToLearnerItem(item) {
  const projection = classSalesProjection(item);
  const courseCopy = learnerCourseCopy[item.courseId] || learnerClassCopy[item.id] || {};
  return {
    id: item.id, classId: item.id, type: 'class', objectType: 'class', name: item.name, className: item.className || item.name, courseName: item.courseName || item.course,
    courseId: item.courseId,
    teacher: item.teacher, category: item.category, discipline: item.discipline, field: item.field, professional: item.professional,
    level: item.level, age: item.age, hours: item.lessons, lessons: item.lessons, price: Number(item.price),
    season: item.season, campus: item.campus, classroom: item.classroom, schedule: item.schedule,
    seats: `${projection.remainingSeats}/${item.capacity}`, remainingSeats: projection.remainingSeats, classStatus: projection.learnerStatus, learnerStatus: projection.learnerStatus,
    deadline: String(item.deadline || '').slice(0, 10), capacity: Number(item.capacity || 0), enrolled: Number(item.enrolled || 0),
    status: projection.learnerStatus, enrollable: projection.bookable, bookable: projection.bookable, visible: projection.visible, recommended: item.recommended === true,
    unavailableReason: projection.unavailableReason?.message || '', unavailableReasonCode: projection.unavailableReason?.code || '',
    courseVersion: Number(item.courseVersion || 1), scheduleVersion: Number(item.scheduleVersion || 1), firstLessonDate: item.firstLessonDate || item.sessions?.[0]?.date || '',
    created: item.created || '', updatedAt: item.updatedAt || '', sortAt: item.created || item.updatedAt || item.firstLessonDate || item.sessions?.[0]?.date || '', sales: Number(item.enrolled || 0),
    trialEnabled: item.trialEnabled || '是', trialFee: item.trialFee || '否', trialPrice: item.trialPrice || '', trialNote: item.trialNote || '请联系课程顾问了解试听安排。',
    ...courseCopy
  };
}

const learnerClassCourses = classSeed.map(classToLearnerItem);

const demo = {
  phone: '138****2026',
  wechatAuthorized: true,
  students: [{ id: 'student-001', name: '林知夏', gender: '女', birthMonth: '2017-05', relation: '女儿' }, { id: 'student-002', name: '林知远', gender: '男', birthMonth: '2015-10', relation: '儿子' }],
  courses: [
    { id: 'COURSE-CR-2026-0002', type: 'video', objectType: 'course', name: '声乐演唱技巧', teacher: '陈晨', category: '音乐表演', discipline: '音乐', field: '音乐表演', professional: '声乐演唱', level: '中级', age: '成人', hours: 12, price: 1280, progress: 45, chapter: '第3章 · 作品演唱', status: '可购买', intro: '从发声、气息、共鸣到作品演唱，建立清晰、可反复练习的声乐训练路径。', detail: ['课程从呼吸与发声基础开始，逐步进入共鸣位置、咬字处理和作品表达，适合已有基础、希望系统提升演唱能力的学员。', '每节课包含教师示范、训练重点和课后练习建议，可按自己的节奏重复观看。'], outline: [{ title: '第1章 · 发声基础', note: '4课时' }, { title: '第2章 · 气息与共鸣', note: '4课时' }, { title: '第3章 · 作品演唱', note: '4课时' }] },
    ...VIDEO_DEMO_COURSES.map((course) => ({ id: course.id, type: 'video', objectType: 'course', name: course.name, teacher: course.teacher, category: course.major, discipline: course.major, field: course.major, professional: course.major, level: course.difficulty, age: course.ages.join('、'), hours: course.hours, price: Number(course.price), progress: 0, status: '可购买', intro: `围绕${course.name}的核心内容设计分段视频课程。`, detail: [`课程包含教师示范、重点讲解与课后练习，适合按自己的节奏反复学习。`], outline: course.outline.map((chapter) => ({ title: chapter.name, note: `${chapter.lessons.length}课时` })) }))
  ],
  classOptions: learnerClassCourses,
  // CR-2026-022 §2.3：名师数据只保留展示字段，取值来自教师档案
  // （FD-TEACHER-002 姓名、FD-TEACHER-010 授课专业、FD-TEACHER-011 从教年限、
  //  FD-TEACHER-012 职称、FD-TEACHER-024 一句话简介、FD-TEACHER-025 简介）；
  // 原自造的 title / years / tags / tagline / intro / profile 富文本块已删除。
  teachers: ['teacher-chen', 'teacher-wang'].map(teacherPublicProfileById).filter(Boolean),
  orders: [
    { id: 'OD202609080001', accountId: 'account-001', courseId: 'COURSE-CR-2026-0002', status: '已支付', amount: 1280, createdAt: '2026-09-08 14:20', paidAt: '2026-09-08 14:22', paymentNo: 'PAY2026090800001', payMethod: '微信支付' },
    { id: 'OD202609080002', accountId: 'account-001', courseId: 'class-001', status: '待支付', amount: 1680, studentId: 'student-001', createdAt: '2026-09-08 16:42', paidAt: '' },
    { id: 'OD202609090001', accountId: 'account-002', courseId: 'COURSE-CR-2026-0002', status: '待支付', amount: 1280, createdAt: '2026-09-09 10:18', paidAt: '' },
    { id: 'OD202609090002', accountId: 'account-001', courseId: 'class-001', status: '已支付', amount: 1680, studentId: 'student-001', createdAt: '2026-09-09 09:36', paidAt: '2026-09-09 09:38', paymentNo: 'PAY2026090900002', payMethod: '微信支付' },
    { id: 'OD202609070001', accountId: 'account-001', courseId: 'COURSE-CR-2026-0002', status: '退款中', amount: 1280, createdAt: '2026-09-07 15:12', paidAt: '2026-09-07 15:15', paymentNo: 'PAY2026090700001', payMethod: '微信支付', refundNo: 'RF2026090900001', refundAmount: 1280, refundMethod: '微信支付原路退回', refundStatus: '审核通过，退款处理中', refundExpectedAt: '2026-09-20', refundAt: '2026-09-09 10:20', refundReason: '学员时间冲突，申请退款' },
    { id: 'OD202609070002', accountId: 'account-001', courseId: 'class-001', status: '退款中', amount: 1680, studentId: 'student-001', createdAt: '2026-09-07 11:25', paidAt: '2026-09-07 11:29', paymentNo: 'PAY2026090700002', payMethod: '微信支付', refundNo: 'RF2026090900002', refundAmount: 1680, refundMethod: '微信支付原路退回', refundStatus: '审核通过，退款处理中', refundExpectedAt: '2026-09-20', refundAt: '2026-09-09 09:40', refundReason: '重复报名，申请退款' },
    { id: 'OD202609060001', accountId: 'account-001', courseId: 'COURSE-CR-2026-0002', status: '已退款', amount: 1280, createdAt: '2026-09-06 17:08', paidAt: '2026-09-06 17:10', paymentNo: 'PAY2026090600001', payMethod: '微信支付', refundNo: 'RF2026090800011', refundAmount: 1280, refundMethod: '微信支付原路退回', refundStatus: '已完成', refundExpectedAt: '2026-09-08', refundAt: '2026-09-07 09:05', refundReason: '学员时间冲突，申请退款' },
    { id: 'OD202609060002', accountId: 'account-001', courseId: 'class-001', status: '已退款', amount: 1680, studentId: 'student-001', createdAt: '2026-09-06 13:50', paidAt: '2026-09-06 13:53', paymentNo: 'PAY2026090600002', payMethod: '微信支付原路退回', refundNo: 'RF2026090800012', refundAmount: 1680, refundMethod: '微信支付原路退回', refundStatus: '已完成', refundExpectedAt: '2026-09-08', refundAt: '2026-09-07 08:40', refundReason: '重复报名，申请退款' },
    { id: 'OD202609050001', accountId: 'account-001', courseId: 'COURSE-CR-2026-0002', status: '已取消', amount: 1280, createdAt: '2026-09-05 16:30', paidAt: '' },
    { id: 'OD202609050002', accountId: 'account-001', courseId: 'class-001', status: '已取消', amount: 1680, studentId: 'student-001', createdAt: '2026-09-05 10:05', paidAt: '' }
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

// 兼容 r54 之前的演示订单：首次读取时补成订单快照，不把历史详情继续绑定到当前课程档案。
function legacyVideoOrderSnapshot(order) {
  if (!order || order.classId || order.snapshot?.course) return order;
  const source = demo.courses.find(item => item.id === order.courseId);
  if (!source || source.type !== 'video') return order;
  const normalized = { ...order };
  delete normalized.studentId;
  return {
    ...normalized,
    snapshot: {
      accountId: order.accountId || '', courseId: order.courseId, courseVersion: 2, productId: order.courseId === 'COURSE-CR-2026-0002' ? 'product-1' : '', amount: Number(order.amount || source.price || 0),
      course: { courseVersion: 2, name: source.name, teacher: source.teacher, major: source.professional, professional: source.professional, category: source.category, type: 'video', price: Number(order.amount || source.price || 0), hours: Number(source.hours || 0), outline: source.outline || [], detail: source.detail || [], detailHtml: source.detailHtml || '', tags: source.tags || [], recommendation: source.recommendation || '' }
    }
  };
}

// 富文本字段（图文详情、通知正文等）渲染：标记值按清洗后的 HTML 输出，纯文本值继续按换行分段。
function richTextBody(value, fallback = '') {
  const html = richTextToHtml(value, fallback);
  return html ? '<div class="mp-rich-text">' + html + '</div>' : '';
}
// CR-2026-020：运营四字段按售卖单元取数（视频取商品、面授取班级），教学属性仍取课程档案。
function applyCourseDisplay(item) {
  const courseId = item.type === 'video' ? item.id : item.courseId;
  const archive = courseArchiveVersionFor(courseId || item.id, item.courseVersion);
  const unit = item.type === 'video' ? productForCourse(readDemoState(), item.id) : classRecordFor(item.id);
  const display = saleUnitDisplay(unit);
  if (!archive && !unit) return item;
  // 图文详情是富文本字段：标记值走 detailHtml 渲染，纯文本值保持原有的分段数组口径。
  const rawDetail = String(display.detail || '').trim();
  const richDetail = isRichMarkup(rawDetail) ? sanitizeRichText(rawDetail) : '';
  const displayDetail = richDetail ? [] : rawDetail.split(/\n+/).map(text => text.trim()).filter(Boolean);
  const agesText = courseAgesText(archive);
  return {
    ...item,
    cover: display.cover === COURSE_DISPLAY_UNSET ? '' : display.cover,
    coverFile: display.coverFile,
    level: archive?.difficulty || item.level,
    age: agesText || item.age,
    detail: richDetail ? [] : (displayDetail.length ? displayDetail : item.detail),
    detailHtml: richDetail || item.detailHtml || '',
    tags: display.tags,
    recommendation: display.recommendation
  };
}
function sharedLearnerCatalog(shared) {
  const validRows = (rows) => (Array.isArray(rows) ? rows : []).filter(item => item && typeof item === 'object');
  // CR-2026-070：学员端课程目录直接投影后台已完成课程档案，不再依赖 shared.courses
  // 是否恰好有班级记录。共享课程与档案修改覆盖种子，用户新增记录继续追加。
  const storedCourses = validRows(shared.courses);
  const storedLibrary = validRows(shared.library);
  // 该旧档案在后台课程主体中仍为“编排中”，后台全部课程不会展示；共享课程完成后即可覆盖此状态。
  const legacyInProgressCourseIds = new Set(['COURSE-CR-2026-0001']);
  const archives = courseArchiveSeed().map(seed => ({ ...seed, ...(storedLibrary.find(row => row.id === seed.id || toCanonicalCourseId(row.sourceCourseId) === toCanonicalCourseId(seed.sourceCourseId)) || {}) }));
  storedLibrary.filter(row => !archives.some(seed => seed.id === row.id || toCanonicalCourseId(seed.sourceCourseId) === toCanonicalCourseId(row.sourceCourseId))).forEach(row => archives.push(row));
  const representedIds = new Set(archives.map(item => toCanonicalCourseId(item.sourceCourseId || item.id)));
  const archiveCourses = archives.map(archive => {
    const id = toCanonicalCourseId(archive.sourceCourseId || archive.id);
    return { ...archive, ...(storedCourses.find(row => toCanonicalCourseId(row.id) === id) || {}), id, chapters: archive.chapters || [] };
  });
  const courseRows = [...archiveCourses, ...storedCourses.filter(item => !representedIds.has(toCanonicalCourseId(item.id)))]
    .filter(item => item.status === '已完成' && !item.disabledAt && (!legacyInProgressCourseIds.has(toCanonicalCourseId(item.id)) || storedCourses.some(row => toCanonicalCourseId(row.id) === toCanonicalCourseId(item.id) && row.status === '已完成')))
    .map(item => ({
      id: toCanonicalCourseId(item.id), type: item.type === '视频课程' ? 'video' : 'class', objectType: 'course', name: item.name, courseName: item.name, teacher: item.teacher, category: item.major, discipline: item.discipline || item.major, field: item.field || item.major, professional: item.professional || item.major, level: item.level || item.difficulty || '初级', age: item.age || (Array.isArray(item.ages) ? item.ages.join('、') : '') || '全年龄', hours: Number(item.hours) || 0, lessons: Number(item.hours) || 0, progress: 0, status: '待售', price: 0, intro: item.intro || '', updatedAt: item.updatedAt || '', chapters: item.chapters || [], outline: (item.chapters || []).map(chapter => ({ title: chapter.name, note: `${chapter.lessons?.length || 0}课时` }))
    }));
  const products = allProducts(shared).filter(item => item.status === '已上架');
  const videos = courseRows.filter(item => item.type === 'video' && products.some(product => toCanonicalCourseId(product.courseId) === item.id)).map(item => {
    const product = products.find(row => row.courseId === item.id);
    return applyCourseDisplay(product ? { ...item, price: Number(product.price || 0), status: '可购买', preview: product.preview, previewHours: product.previewHours, productId: product.id, courseVersion: Number(product.courseVersion || item.courseVersion || 1), sales: Number(product.sales || 0), sortAt: product.shelfAt || product.updated || item.updatedAt || '', product } : item);
  });

  const storedClasses = validRows(shared.classes);
  const classRecords = classSeed.map(seed => ({ ...seed, ...(storedClasses.find(row => row.id === seed.id) || {}) }));
  storedClasses.filter(row => !classSeed.some(seed => seed.id === row.id)).forEach(row => classRecords.push(row));
  const classes = classRecords.map(classToLearnerItem).map(applyCourseDisplay);
  const offlineCourseIds = new Set([
    ...courseRows.filter(item => item.type === 'class').map(item => item.id),
    ...classes.map(item => toCanonicalCourseId(item.courseId)).filter(Boolean)
  ]);
  const offlineCourses = [...offlineCourseIds].map(courseId => {
    const related = classes.filter(item => toCanonicalCourseId(item.courseId) === courseId);
    const visibleClasses = related.filter(item => item.visible);
    const bookableClasses = visibleClasses.filter(item => item.bookable);
    const source = courseRows.find(item => item.id === courseId) || {};
    const archive = courseArchiveFor(courseId);
    const sample = related[0] || {};
    const copy = learnerCourseCopy[courseId] || {};
    const minimumPrice = bookableClasses.length ? Math.min(...bookableClasses.map(item => Number(item.price || 0))) : 0;
    const sortAt = related.map(item => item.created || item.updatedAt || item.firstLessonDate || '').filter(Boolean).sort().at(-1) || source.updatedAt || archive?.updatedAt || '';
    return {
      ...source,
      ...copy,
      id: courseId,
      courseId,
      type: 'class',
      objectType: 'course',
      name: archive?.name || source.name || sample.courseName || sample.course || '面授课程',
      courseName: archive?.name || source.name || sample.courseName || sample.course || '面授课程',
      category: archive?.major || source.category || sample.category,
      discipline: source.discipline || sample.discipline || archive?.major,
      field: source.field || sample.field || archive?.major,
      professional: archive?.major || source.professional || sample.professional,
      level: archive?.difficulty || source.level || sample.level || '初级',
      age: courseAgesText(archive) || source.age || sample.age || '全年龄',
      hours: Number(archive?.hours || source.hours || sample.hours || 0),
      lessons: Number(archive?.hours || source.hours || sample.lessons || 0),
      courseVersion: Number(archive?.version || sample.courseVersion || 1),
      classOptions: visibleClasses,
      bookableClassCount: bookableClasses.length,
      minimumPrice,
      price: minimumPrice,
      sales: visibleClasses.reduce((total, item) => total + Number(item.enrolled || 0), 0),
      sortAt,
      status: bookableClasses.length ? `${bookableClasses.length}个班可报` : '暂无可报班级',
      bookable: bookableClasses.length > 0
    };
  });
  return { courses: [...videos, ...offlineCourses], classes };
}

function sortedLearnerItems(items, sortMode) {
  const timestamp = item => {
    const value = item.sortAt || item.created || item.updatedAt || item.firstLessonDate || '';
    const parsed = Date.parse(String(value).replace(' ', 'T'));
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const sales = item => Number(item.sales ?? item.enrolled ?? 0) || 0;
  return [...items].sort((a, b) => {
    const primary = sortMode === 'sales' ? sales(b) - sales(a) : timestamp(b) - timestamp(a);
    if (primary) return primary;
    const secondary = sortMode === 'sales' ? timestamp(b) - timestamp(a) : sales(b) - sales(a);
    if (secondary) return secondary;
    return String(a.name || a.id || '').localeCompare(String(b.name || b.id || ''), 'zh-CN');
  });
}

function readState() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    // I1-DEF-008: a session started before I1-DEC-19 keeps the retired course numbering, so the stored
    // copies are matched back onto the canonical seed ids instead of dropping out of the merged list.
    const storedCourses = (Array.isArray(stored.courses) ? stored.courses : []).filter(item => item && typeof item === 'object').map(item => ({ ...item, id: toCanonicalCourseId(item.id) }));
    const knownCourses = demo.courses.map(item => ({ ...item, ...(storedCourses.find(row => row.id === item.id) || {}) }));
    const additionalCourses = storedCourses.filter(item => !demo.courses.some(row => row.id === item.id));
    const storedTeachers = Array.isArray(stored.teachers) ? stored.teachers : [];
    // CR-2026-022：会话里遗留的教师记录可能带 title / years / tags / intro / profile 等自造字段，
    // 合并时只接收教师档案字段，避免旧值把学员端展示带回自造字段。
    const publicTeacherPatch = (row) => (row && typeof row === 'object'
      ? Object.fromEntries(TEACHER_PUBLIC_PROFILE_KEYS.filter(key => row[key] !== undefined).map(key => [key, row[key]]))
      : {});
    const knownTeachers = demo.teachers.map(item => ({ ...item, ...publicTeacherPatch(storedTeachers.find(row => row.id === item.id)) }));
    const additionalTeachers = storedTeachers
      .filter(item => !demo.teachers.some(row => row.id === item.id))
      .map(item => ({ ...(teacherPublicProfileById(item.id) || { id: item.id }), ...publicTeacherPatch(item) }))
      .filter(item => item.name && item.professionalTitle);
    const storedOrders = (Array.isArray(stored.orders) ? stored.orders : []).filter(item => item && typeof item === 'object').map(item => legacyVideoOrderSnapshot({ ...item, courseId: toCanonicalCourseId(item.courseId) }));
    const knownOrders = demo.orders.filter(item => !isLegacyClassRecord(item)).map(item => legacyVideoOrderSnapshot({ ...item, ...(storedOrders.find(row => row.id === item.id) || {}) }));
    const additionalOrders = storedOrders.filter(item => !isLegacyClassRecord(item) && !demo.orders.some(row => row.id === item.id));
    const storedConsultations = Array.isArray(stored.consultations) ? stored.consultations : [];
    const knownConsultations = demo.consultations.filter(item => !isLegacyClassRecord(item)).map(item => ({ ...item, ...(storedConsultations.find(row => row.id === item.id) || {}) }));
    const additionalConsultations = storedConsultations.filter(item => !isLegacyClassRecord(item) && !demo.consultations.some(row => row.id === item.id));
    const storedMessages = Array.isArray(stored.messages) ? stored.messages : [];
    const knownMessages = demo.messages.filter(item => !isLegacyClassRecord(item)).map(item => ({ ...item, read: storedMessages.find(row => row.id === item.id)?.read ?? item.read }));
    const additionalMessages = storedMessages.filter(item => !isLegacyClassRecord(item) && !demo.messages.some(row => row.id === item.id));
    const shared = readDemoState();
    const accountId = shared.currentAccountId || 'account-001';
    const learners = [...accountStudents(accountId)];
    const accountOrders = (shared.orders || []).filter(order => order.accountId === accountId);
    const sharedCatalog = sharedLearnerCatalog(shared);
    const sharedCourses = sharedCatalog.courses;
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
      item.courseDisabled = Boolean(item.disabledAt || courseArchiveFor(item.id)?.disabledAt);
      item.sellable = Boolean(product && product.status === '已上架' && !item.courseDisabled);
      item.recommended = product?.recommended === true;
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
    // CR-2026-012：难度、年龄、封面、图文详情、标签与推荐语统一取课程档案，卡片与详情页共用同一份值。
    const displayCourses = mergedCourses.map(applyCourseDisplay);
    const sellableCourses = displayCourses.filter(item => item.type !== 'video' || item.sellable !== false);
    // One logical order must appear once: shared-store records win over the local demo copy, otherwise a
    // resumed order can render a stale status while the shared record already moved on.
    const mergedOrders = (() => {
      const byId = new Map();
      // Demo seed orders may pin their own account (e.g. the pending video order belongs to 账号B).
      knownOrders.filter(order => order.accountId === accountId).forEach(order => byId.set(order.id, order));
      additionalOrders.filter(order => order.accountId === accountId).forEach(order => byId.set(order.id, order));
      accountOrders.forEach(order => byId.set(order.id, { ...(byId.get(order.id) || {}), ...order }));
      return [...byId.values()];
    })();
    const featuredTeacherIds = new Set(shared.featuredTeacherIds || []);
    const featuredTeachers = [...knownTeachers, ...additionalTeachers].filter(item => featuredTeacherIds.has(item.id));
    return { ...demo, ...stored, accountId, students: learners, currentStudentId: learners.some(item => item.id === stored.currentStudentId) ? stored.currentStudentId : learners[0]?.id || '', courses: sellableCourses, allCourses: displayCourses, classOptions: sharedCatalog.classes, teachers: featuredTeachers, allTeachers: [...knownTeachers, ...additionalTeachers], orders: mergedOrders, consultations: [...knownConsultations, ...additionalConsultations], messages: [...knownMessages, ...additionalMessages] };
  } catch (error) {
    console.warn('学员端演示数据合并失败，回退到内置演示数据。', error);
    return { ...demo, orders: demo.orders.filter(item => !isLegacyClassRecord(item)), consultations: demo.consultations.filter(item => !isLegacyClassRecord(item)), messages: demo.messages.filter(item => !isLegacyClassRecord(item)) };
  }
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
function course(id = params.get('courseId')) { return state.courses.find(item => item.id === id) || (state.classOptions || []).find(item => item.id === id) || (state.allCourses || []).find(item => item.id === id) || state.courses[0]; }
// ZK-B-18／ZK-B-21 深链口径：参数缺失或格式非法直接跳回列表；参数可解析但对象不存在、已删除、
// 已隐藏或关联课程已停用／已下架时渲染统一空态卡片，保留当前 URL 不自动跳转。
const DEEP_LINK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
function isDeepLinkIdUsable(id) { return Boolean(id) && DEEP_LINK_ID_PATTERN.test(String(id)); }
// 深链目标解析：只认学员端可售课程、班级与面授课程档案；视频课程的商品已下架（不在可售集合）
// 不再回落到课程档案，交由页面渲染空态，避免失效深链静默显示成另一门课程。
function resolveDeepLinkTarget(id) {
  if (!isDeepLinkIdUsable(id)) return null;
  const sellable = state.courses.find(item => item.id === id);
  if (sellable) return sellable;
  const classItem = (state.classOptions || []).find(item => item.id === id);
  if (classItem) return classItem;
  const archive = (state.allCourses || []).find(item => item.id === id);
  return archive && archive.type !== 'video' ? archive : null;
}
// 班级深链可展示性：不存在、对象类型不符、展示状态为隐藏，或关联课程已停用／已下架时按空态处理。
function classDeepLinkUnavailable(item) {
  if (!item || item.objectType !== 'class') return true;
  if (item.visible === false) return true;
  return Boolean(courseArchiveFor(item.courseId)?.disabledAt);
}
// 统一空态卡片：与页面说明口径一致，保留 URL 不自动跳转。
function renderDeepLinkEmpty(href = '/learner/pages/courses.html', label = '返回课程列表') {
  layout(stack(card('<div class="mp-empty"><strong>课程不存在或已下架</strong><p>该课程或班级可能已删除、已隐藏，或关联课程已停用、关联商品已下架；请返回列表重新选择。</p></div>'), `<a class="mp-button secondary full" href="${href}">${esc(label)}</a>`));
}
// I1-CLASS-DETAIL-11：班级详情只对已报名的当前学员开放，未报名不给报名入口，统一空态回班级列表。
function renderEnrollmentRequiredEmpty() {
  layout(stack(card('<div class="mp-empty"><strong>尚未报名该班级</strong><p>班级详情只对已报名的当前学员开放。可先在课程列表或快速报名列表选择班级完成报名，再回到学习中心查看。</p></div>'), '<a class="mp-button secondary full" href="/learner/pages/fast-registration.html">返回班级列表</a>'));
}
// 教室文案：校区或教室缺失时不再输出 undefined，两者都缺时显示「教室待定」。
function roomText(item, fallback = '教室待定') { return [item?.campus, item?.classroom].filter(Boolean).join(' · ') || fallback; }
function orderCourse(order) {
  const current = course(order?.classId || order?.courseId);
  if (!current || current.type !== 'video' || !order?.snapshot?.course) return current;
  return { ...current, ...order.snapshot.course, id: order.courseId, courseVersion: order.snapshot.courseVersion || order.courseVersion || current.courseVersion, type: 'video', objectType: 'course' };
}
function videoOrderSnapshot(item, amount, accountId) {
  const product = item.product || productForCourse(readDemoState(), item.id) || {};
  const display = saleUnitDisplay(product);
  const archive = courseArchiveVersionFor(item.id, item.courseVersion) || {};
  return {
    accountId, courseId: item.id, courseVersion: Number(item.courseVersion || archive.version || 1), productId: product.id || '', amount: Number(amount || item.price || 0),
    course: {
      courseVersion: Number(item.courseVersion || archive.version || 1), name: item.name, teacher: item.teacher, major: item.professional || item.major || item.category,
      professional: item.professional || item.major || item.category, category: item.category, type: 'video', price: Number(amount || item.price || 0),
      hours: Number(archive.hours ?? item.hours ?? 0), outline: (item.outline || []).map(chapter => ({ ...chapter })),
      cover: display.cover === COURSE_DISPLAY_UNSET ? '' : display.cover, coverFile: display.coverFile || '', detail: [...(item.detail || [])], detailHtml: item.detailHtml || '',
      tags: [...(display.tags || item.tags || [])], recommendation: display.recommendation || item.recommendation || ''
    }
  };
}
function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function go(url) { location.href = relativePath(url); }
function pill(text, tone = '') { return `<span class="mp-pill ${tone}">${esc(text)}</span>`; }
function button(text, attrs = '', cls = '') { return `<button class="mp-button ${cls}" ${attrs}>${esc(text)}</button>`; }
function card(content, cls = '') { return `<section class="mp-card ${cls}">${content}</section>`; }
function stack(...content) { return `<div class="mp-stack">${content.join('')}</div>`; }
function toast(message) { const node = document.createElement('div'); node.className = 'mp-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 2200); }
function courseMeta(item) { if (item.objectType === 'class') { const tail = item.category || item.professional || item.courseName || ''; return `面授班级 · ${item.teacher}老师${tail ? ` · ${tail}` : ''}`; } return `${item.type === 'video' ? '视频课程' : '面授课程'} · ${item.professional || item.category}`; }
function courseLink(item) { return item.objectType === 'class' ? `/learner/pages/class-detail.html?courseId=${item.id}` : `/learner/pages/course-detail.html?courseId=${item.id}`; }
function listItem(item, action = '') { return `<a class="mp-item" href="${courseLink(item)}"><div><strong>${esc(item.name)}</strong><small>${esc(courseMeta(item))}</small>${item.type === 'class' ? `<p>${esc(item.campus)} · ${esc(item.schedule)} · 剩余${esc(item.seats.split('/')[0])}名额</p>` : `<p>共${item.hours}课时 · 已学习${item.progress}%</p>`}</div><div>${action || `<span class="mp-link">查看</span>`}</div></a>`; }
function courseCard(item) {
  const isClass = item.type === 'class';
  if (isClass && item.objectType === 'class') {
    const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
    const statusTone = item.bookable ? 'green' : 'gray';
    const priceText = item.bookable ? money2(item.price) : '暂不可报';
    return `<a class="mp-course-card" href="/learner/pages/fast-registration-detail.html?classId=${encodeURIComponent(item.id)}"><div class="mp-course-cover class-cover" data-cover-mark="${esc(coverMark)}" aria-hidden="true"><span>面授班级</span></div><div class="mp-course-body"><div class="mp-course-title-row"><h3>${esc(item.className || item.name)}</h3><strong class="mp-course-price">${priceText}</strong></div><div class="mp-course-tags">${pill(item.professional || item.category)}${item.campus ? pill(item.campus, 'gray') : ''}${pill(item.learnerStatus || item.status, statusTone)}</div><div class="mp-course-teacher-row"><div class="mp-course-teacher"><span class="mp-avatar mp-course-avatar" aria-hidden="true">${esc((item.teacher || '教').slice(0, 1))}</span><span class="mp-course-teacher-name">${esc(item.teacher || '待定')}老师</span></div><span class="mp-course-hours">剩余${esc(item.remainingSeats)}名额</span></div></div></a>`;
  }
  if (isClass) {
    const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
    const statusTone = item.bookableClassCount > 0 ? 'green' : 'gray';
    const priceText = item.bookableClassCount > 0 ? `${money2(item.minimumPrice)}起` : '待开班';
    return `<a class="mp-course-card" href="/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}"><div class="mp-course-cover class-cover" data-cover-mark="${esc(coverMark)}" aria-hidden="true"><span>面授课程</span></div><div class="mp-course-body"><div class="mp-course-title-row"><h3>${esc(item.name)}</h3><strong class="mp-course-price">${priceText}</strong></div><div class="mp-course-tags">${pill(item.professional || item.category)}${pill(item.level || '初级', 'gray')}${pill(item.age || '全年龄', 'gray')}</div><div class="mp-course-teacher-row"><span class="mp-course-hours">共${esc(item.hours)}课时</span><span class="mp-course-status">${pill(item.status, statusTone)}</span></div></div></a>`;
  }
  const teacher = state.teachers.find(row => row.name === item.teacher);
  const teacherName = teacher?.name || item.teacher;
  const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
  const professionalTag = pill(item.professional || item.category);
  const detailTags = [item.level, isClass ? item.age : ''].filter(Boolean).map(tag => pill(tag, 'gray')).join('');
  const status = '';
  const statusTag = status ? `<span class="mp-course-status">${pill(status, status.includes('满') ? 'gray' : 'green')}</span>` : '';
  // CR-2026-012：卡片读取课程档案的课程标签。
  const archiveTags = (item.tags || []).slice(0, 2).map(value => pill(value, 'gray')).join('');
  return `<a class="mp-course-card" href="/learner/pages/course-detail.html?courseId=${item.id}"><div class="mp-course-cover video-cover" data-cover-mark="${esc(coverMark)}" aria-hidden="true"><span>视频课程</span></div><div class="mp-course-body"><div class="mp-course-title-row"><h3>${esc(item.name)}</h3><strong class="mp-course-price">${money2(item.price)}</strong></div><div class="mp-course-tags">${professionalTag}${detailTags}${archiveTags}${statusTag}</div><div class="mp-course-teacher-row"><div class="mp-course-teacher"><span class="mp-avatar mp-course-avatar" aria-hidden="true">${esc(teacherName.slice(0, 1))}</span><span class="mp-course-teacher-name">${esc(teacherName)}</span></div><span class="mp-course-hours">共${esc(item.hours)}课时</span></div></div></a>`;
}
function teacherLink(item) { return `/learner/pages/teacher-detail.html?teacherId=${item.id}`; }
function isLoggedIn() { return sessionStorage.getItem('hbyx-mini-logged-in') === '1'; }
// CR-2026-022 §2.3: 名师卡片只渲染教师档案字段——姓名（FD-TEACHER-002）、职称（FD-TEACHER-012）、
// 从教年限（FD-TEACHER-011）、一句话简介（FD-TEACHER-024）与授课专业（FD-TEACHER-010）。
function teacherMajorPills(item) { return (item.majors || []).map(major => pill(major, 'gray')).join(''); }
function teacherCard(item, variant = 'compact') { return `<a class="mp-teacher-card ${variant === 'list' ? 'is-list' : ''}" href="${teacherLink(item)}"><div class="mp-teacher-card-head"><span class="mp-avatar mp-teacher-avatar" aria-hidden="true">${esc(item.name.slice(0, 1))}</span><div class="mp-teacher-identity"><strong>${esc(item.name)}</strong><small>${esc(item.professionalTitle)} · ${esc(item.teachingYears)}年教龄</small></div></div><div class="mp-teacher-card-copy"><p>${esc(item.tagline)}</p><div class="mp-pills">${teacherMajorPills(item)}</div></div><span class="mp-teacher-card-arrow" aria-hidden="true">›</span></a>`; }
// 教师详情页的“个人简介”只渲染 FD-TEACHER-025 简介正文，不再渲染自造的图文／视频富文本块。
function teacherIntroduction(item) {
  const paragraphs = String(item.introduction || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  return paragraphs.length ? paragraphs.map(text => `<p>${esc(text)}</p>`).join('') : '<p class="mp-muted">该教师尚未填写个人简介。</p>';
}
function layout(content) { main.innerHTML = content; }
function renderHome() {
  const categoryItems = [['音乐', '乐', '音乐'], ['美术', '绘', '美术'], ['舞蹈', '舞', '舞蹈'], ['戏剧', '剧', '戏剧'], ['更多', '＋', '']];
  const recommendedClasses = (state.classOptions || []).filter(item => item.recommended === true && item.visible);
  const recommendedVideos = state.courses.filter(item => item.type === 'video' && item.sellable !== false && item.recommended === true);
  // D-03／首页口径：面授课程招生与视频课程推荐均为横向滚动卡片，与名师推荐一致；
  // 只有一张卡片时铺满整行，避免右侧留下大片空白。
  const spotlightRow = (items) => `<div class="mp-scroll-row${items.length === 1 ? ' is-single' : ''}">${items.map(courseCard).join('')}</div>`;
  const classSpotlight = recommendedClasses.length ? spotlightRow(recommendedClasses) : '<div class="mp-empty">暂无推荐面授班级</div>';
  const videoSpotlight = recommendedVideos.length ? spotlightRow(recommendedVideos) : '<div class="mp-empty">暂无推荐视频课程</div>';
  layout(stack(`<form id="home-search-form" class="mp-home-search" role="search"><input id="home-search" aria-label="搜索课程或专业" placeholder="搜索课程或专业"><button class="mp-search-submit" type="submit" aria-label="搜索">⌕</button></form><section id="home-carousel" class="mp-carousel">${homeBanners.map((banner, index) => { const tag = banner.jumpTarget ? 'a' : 'article'; const href = banner.jumpTarget ? ` href="${esc(banner.jumpTarget)}"` : ''; return `<${tag} class="mp-banner ${index === 0 ? 'active' : ''}" data-banner-index="${index}"${href} aria-label="${esc(banner.name || '轮播图')}"><span class="mp-banner-image">${esc(banner.imageFile || '轮播图片')}</span></${tag}>`; }).join('')}<div class="mp-carousel-dots">${homeBanners.map((_, index) => `<button class="mp-carousel-dot ${index === 0 ? 'active' : ''}" data-banner-dot="${index}" aria-label="第${index + 1}张轮播图"></button>`).join('')}</div></section>${card(`<div class="mp-section-head"><h2>分类入口</h2><span class="mp-muted">探索艺术方向</span></div><div class="mp-category-row">${categoryItems.map(([label, icon, category]) => `<a class="mp-category" href="${category ? `/learner/pages/courses.html?category=${encodeURIComponent(category)}` : '/learner/pages/courses.html'}"><span class="mp-category-icon">${icon}</span><span>${label}</span></a>`).join('')}</div>`)}${card(`<div class="mp-section-head"><h2>面授课程招生</h2><a class="mp-link" href="/learner/pages/fast-registration.html">查看全部</a></div>${classSpotlight}`)}${card(`<div class="mp-section-head"><h2>视频课程推荐</h2><a class="mp-link" href="/learner/pages/courses.html?type=video">课程库</a></div>${videoSpotlight}`)}${card(`<div class="mp-section-head"><h2>名师推荐</h2><a class="mp-link" href="/learner/pages/teachers.html">更多名师</a></div><div class="mp-scroll-row">${state.teachers.map(teacherCard).join('')}</div>`)}`));
  const searchForm = document.querySelector('#home-search-form');
  searchForm.addEventListener('submit', event => { event.preventDefault(); const keyword = document.querySelector('#home-search').value.trim(); go(`/learner/pages/courses.html${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`); });
  const setBanner = index => { document.querySelectorAll('[data-banner-index]').forEach(item => item.classList.toggle('active', Number(item.dataset.bannerIndex) === index)); document.querySelectorAll('[data-banner-dot]').forEach(item => item.classList.toggle('active', Number(item.dataset.bannerDot) === index)); };
  let bannerIndex = 0; const timer = setInterval(() => { if (!homeBanners.length) return; bannerIndex = (bannerIndex + 1) % homeBanners.length; setBanner(bannerIndex); }, 4200);
  document.querySelectorAll('[data-banner-dot]').forEach(dot => dot.addEventListener('click', () => { bannerIndex = Number(dot.dataset.bannerDot); setBanner(bannerIndex); }));
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}
function renderTeachers() { layout(stack(card(`<div class="mp-section-head"><h2>名师推荐</h2><span class="mp-muted">专业教师</span></div><p>按教师专业方向查看已发布课程。</p>`), `<div class="mp-list">${state.teachers.map(item => teacherCard(item, 'list')).join('')}</div>`)); }
// CR-2026-022：教师详情展示 姓名／职称／从教年限／一句话简介／授课专业／个人简介，
// 取值全部来自教师档案字段，学习经历、工作经历与获奖情况不在学员端展示。
function renderTeacherDetail() {
  const teachers = state.allTeachers || state.teachers;
  const item = teachers.find(row => row.id === params.get('teacherId')) || teachers[0];
  if (!item) { layout('<div class="mp-empty">教师信息不存在</div>'); return; }
  const related = state.courses.filter(row => row.teacher === item.name);
  layout(stack(
    card(`<div class="mp-teacher-profile"><div class="mp-teacher-profile-head"><span class="mp-avatar mp-teacher-profile-avatar" aria-hidden="true">${esc(item.name.slice(0, 1))}</span><div class="mp-teacher-profile-identity"><h2>${esc(item.name)}</h2><p>${esc(item.professionalTitle)} · ${esc(item.teachingYears)}年教龄</p></div></div><p class="mp-teacher-profile-tagline">${esc(item.tagline)}</p><div class="mp-pills mp-teacher-profile-tags">${teacherMajorPills(item)}</div></div>`),
    card(`<h3>个人简介</h3><article class="mp-rich-content">${teacherIntroduction(item)}</article>`),
    card(`<div class="mp-section-head"><h3>已发布课程</h3><span class="mp-muted">${related.length}门</span></div><div class="mp-list" style="margin-top:10px">${related.length ? related.map(row => courseCard(row)).join('') : '<div class="mp-empty">暂无已发布课程</div>'}</div>`)
  ));
}
function renderCourses() {
  const requestedCategory = params.get('category') || '';
  const disciplineOptions = [...new Set(state.courses.map(item => item.discipline).filter(Boolean))];
  const initialDiscipline = disciplineOptions.includes(requestedCategory) ? requestedCategory : '';
  const initialField = params.get('field') || (state.courses.some(item => item.field === requestedCategory) ? requestedCategory : '');
  const initialProfessional = params.get('professional') || (state.courses.some(item => item.professional === requestedCategory) ? requestedCategory : '');
  const levels = ['启蒙', '初级', '中级', '高级'];
  const ages = ['少儿', '青少年', '成人'];
  const campuses = [...new Set((state.classOptions || []).filter(item => item.visible).map(item => item.campus).filter(Boolean))];
  const initialCourseTab = params.get('type') === 'video' ? 'video' : 'class';
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
  layout(stack(`<form id="course-search-form" class="mp-course-search" role="search"><input id="course-search" aria-label="搜索课程或专业" placeholder="搜索课程或专业" value="${esc(params.get('q') || '')}"><button type="submit" aria-label="搜索课程"><span aria-hidden="true">⌕</span></button></form>`, `<section class="mp-course-browser" aria-label="课程浏览"><div class="mp-tabs mp-course-type-tabs" role="tablist"><button class="mp-tab ${initialCourseTab === 'class' ? 'active' : ''}" type="button" data-course-tab="class" role="tab" aria-selected="${initialCourseTab === 'class'}">面授课程</button><button class="mp-tab ${initialCourseTab === 'video' ? 'active' : ''}" type="button" data-course-tab="video" role="tab" aria-selected="${initialCourseTab === 'video'}">视频课程</button></div><div class="mp-course-filter-row" aria-label="课程筛选条件"><button id="course-profession-trigger" class="mp-course-filter-chip" type="button" aria-haspopup="dialog" aria-controls="course-profession-dialog" aria-expanded="false"><span id="course-profession-value">专业</span><i aria-hidden="true">⌄</i></button><button id="course-level-trigger" class="mp-course-filter-chip" type="button"><span>难度</span><i aria-hidden="true">⌄</i></button><button id="course-age-trigger" class="mp-course-filter-chip" type="button" data-course-class-filter><span>适合年龄</span><i aria-hidden="true">⌄</i></button><button id="course-campus-trigger" class="mp-course-filter-chip" type="button" data-course-class-filter><span>校区</span><i aria-hidden="true">⌄</i></button><button id="course-open-only" class="mp-course-filter-chip" type="button" data-course-class-filter aria-pressed="false"><span>仅看可报名</span></button></div></section>`, `<section class="mp-course-list-section"><div class="mp-course-list-head"><div class="mp-list-summary"><h2>课程列表</h2><span id="course-result-count" class="mp-muted"></span></div><div class="mp-sort-switch" role="group" aria-label="课程排序"><button class="active" type="button" data-course-sort="latest" aria-pressed="true">最新</button><button type="button" data-course-sort="sales" aria-pressed="false">销量</button></div></div><div id="course-list" class="mp-list"></div></section>`, `<dialog id="course-profession-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet" aria-labelledby="course-cascade-title"><header class="mp-cascade-head"><div><h2 id="course-cascade-title">选择专业</h2><p id="course-cascade-caption">请选择专业门类</p></div><button class="mp-cascade-close" type="button" aria-label="关闭专业选择">×</button></header><div id="course-cascade-path" class="mp-cascade-path"></div><div id="course-cascade-options" class="mp-cascade-options" role="listbox"></div><footer class="mp-cascade-actions"><button id="course-cascade-clear" class="mp-button secondary" type="button">全部专业</button><button id="course-cascade-confirm" class="mp-button" type="button">确定</button></footer></section></dialog>`, `<dialog id="course-choice-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet mp-course-choice-sheet" aria-labelledby="course-choice-title"><header class="mp-cascade-head"><div><h2 id="course-choice-title">选择筛选条件</h2><p>点击选项后立即生效</p></div><button class="mp-cascade-close" type="button" data-choice-close aria-label="关闭筛选">×</button></header><div id="course-choice-options" class="mp-cascade-options" role="listbox"></div></section></dialog>`));
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
  const openOnlyTrigger = document.querySelector('#course-open-only');
  const levelTrigger = document.querySelector('#course-level-trigger');
  const ageTrigger = document.querySelector('#course-age-trigger');
  const campusTrigger = document.querySelector('#course-campus-trigger');
  let level = params.get('level') || '';
  let age = params.get('age') || '';
  let campus = params.get('campus') || '';
  let openOnly = false;
  let activeCourseTab = initialCourseTab;
  let activeSort = params.get('sort') === 'sales' ? 'sales' : 'latest';
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
    const classFilterVisible = isClass;
    // 面授页签保留校区与适合年龄，视频页签隐藏只对面授有意义的筛选项。
    document.querySelectorAll('[data-course-class-filter]').forEach(item => { item.hidden = !classFilterVisible; });
    levelTrigger.querySelector('span').textContent = level || '难度';
    ageTrigger.querySelector('span').textContent = age || '适合年龄';
    campusTrigger.querySelector('span').textContent = campus || '校区';
    openOnlyTrigger.classList.toggle('has-value', openOnly);
    openOnlyTrigger.setAttribute('aria-pressed', String(openOnly));
    // 搜索范围随页签变化：面授只匹配课程名称与专业，视频才包含授课教师，占位文案同步切换。
    const searchInput = document.querySelector('#course-search');
    if (searchInput) {
      const placeholder = isClass ? '搜索课程或专业' : '搜索课程或老师';
      searchInput.setAttribute('placeholder', placeholder);
      searchInput.setAttribute('aria-label', placeholder);
    }
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
    const items = sortedLearnerItems(state.courses.filter(item => {
      const searchable = `${item.name}${item.type === 'video' ? item.teacher : ''}${item.category}${item.discipline || ''}${item.field || ''}${item.professional || ''}`.toLowerCase();
      const categoryMatch = !categoryFilter || [item.discipline, item.field, item.professional, item.category].filter(Boolean).some(value => value.includes(categoryFilter));
      const campusMatch = !campus || (item.classOptions || []).some(option => option.campus === campus);
      return item.type === activeCourseTab && categoryMatch && (!discipline || item.discipline === discipline) && (!field || item.field === field) && (!professional || item.professional === professional) && (!level || item.level === level) && (item.type !== 'class' || ((!age || String(item.age).includes(age)) && campusMatch)) && (!openOnly || item.type !== 'class' || item.bookable) && searchable.includes(keyword);
    }), activeSort);
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
  openOnlyTrigger.addEventListener('click', () => { openOnly = !openOnly; updateFilterControls(); draw(); });
  document.querySelectorAll('[data-course-tab]').forEach(tab => tab.addEventListener('click', () => { activeCourseTab = tab.dataset.courseTab; if (activeCourseTab === 'video') { age = ''; campus = ''; openOnly = false; } const url = new URL(window.location.href); url.searchParams.set('type', activeCourseTab); window.history.replaceState({}, '', url); document.querySelectorAll('[data-course-tab]').forEach(item => { const active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); }); updateFilterControls(); draw(); }));
  document.querySelector('#course-search-form').addEventListener('submit', event => { event.preventDefault(); draw(); });
  document.querySelector('#course-search').addEventListener('input', draw);
  document.querySelectorAll('[data-course-sort]').forEach(control => control.addEventListener('click', () => {
    activeSort = control.dataset.courseSort;
    document.querySelectorAll('[data-course-sort]').forEach(item => { const active = item === control; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    const url = new URL(window.location.href);
    if (activeSort === 'latest') url.searchParams.delete('sort');
    else url.searchParams.set('sort', activeSort);
    window.history.replaceState({}, '', url);
    draw();
  }));
  document.querySelectorAll('[data-course-sort]').forEach(item => { const active = item.dataset.courseSort === activeSort; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
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
function courseTeacherSection(item) {
  // 面授分支不展示教师板块：面授课程档案上的人是申报教师，真正上课的教师属于班级，
  // 课程级不借用任一班级的授课教师。视频课程才展示课程档案对应的教师卡片。
  if (item?.type !== 'video') return '';
  const teacher = (state.allTeachers || state.teachers).find(row => row.name === item.teacher);
  return teacher ? `<section class="mp-course-detail-teacher-section"><div class="mp-section-head"><h3>授课教师</h3><a class="mp-link" href="${teacherLink(teacher)}">查看详情</a></div>${teacherCard(teacher, 'list')}</section>` : '';
}
function courseCoverTags(item, typeLabel, status, statusTone) {
  return `${pill(typeLabel, 'light')}${pill(status, statusTone)}${(item.tags || []).slice(0, 2).map(tag => pill(tag, 'light')).join('')}`;
}
function renderOfflineCourseDetail(item) {
  const detailTab = params.get('tab') === 'outline' ? 'outline' : 'intro';
  const detailParagraphs = (item.detail || [item.intro]).filter(Boolean).map(text => `<p>${esc(text)}</p>`).join('') || '<p class="mp-muted">课程介绍暂未维护。</p>';
  const outline = Array.isArray(item.outline) ? item.outline : [];
  const outlineContent = outline.length ? `<div class="mp-course-detail-outline">${outline.map((chapter, index) => `<div class="mp-course-detail-chapter"><span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></div>`).join('')}</div>` : '<div class="mp-empty mp-course-detail-empty">课程大纲暂未维护</div>';
  const recommendation = item.recommendation ? `<p class="mp-course-detail-subtitle">${esc(item.recommendation)}</p>` : '';
  layout(stack(
    `<section class="mp-course-detail-hero"><div class="mp-course-detail-cover class-cover" data-cover-mark="${esc(coverMark)}"><div class="mp-course-detail-cover-tags">${courseCoverTags(item, '面授课程', item.status, item.bookable ? 'green' : 'gray')}</div><span class="mp-course-detail-cover-label">${esc(item.professional || item.category)}</span></div><div class="mp-course-detail-summary"><span class="mp-course-detail-kicker">课程档案</span><div class="mp-course-detail-title"><h2>${esc(item.name)}</h2></div>${recommendation}<dl class="mp-course-detail-facts"><div><dt>难度</dt><dd>${esc(item.level)}</dd></div><div><dt>适合年龄</dt><dd>${esc(item.age)}</dd></div><div><dt>总课时</dt><dd>${esc(item.hours)}课时</dd></div><div><dt>可报班级</dt><dd>${esc(item.bookableClassCount)}个</dd></div></dl></div></section>`,
    courseTeacherSection(item),
    `<section class="mp-course-detail-tab-section"><div class="mp-tabs mp-course-detail-tabs" role="tablist"><button class="mp-tab ${detailTab === 'intro' ? 'active' : ''}" type="button" data-course-detail-tab="intro">课程介绍</button><button class="mp-tab ${detailTab === 'outline' ? 'active' : ''}" type="button" data-course-detail-tab="outline">课程大纲</button></div>${detailTab === 'outline' ? card(outlineContent, 'mp-course-detail-section') : card(`<h3>课程介绍</h3><article class="mp-rich-content mp-course-detail-content">${detailParagraphs}</article>`, 'mp-course-detail-section')}</section>`,
    `<div class="mp-bottom-actions mp-course-detail-actions">
      <button class="mp-button secondary mp-icon-action" type="button" data-action="consult"><span class="mp-linear-icon mp-linear-icon-consult" aria-hidden="true"></span><span>咨询</span></button>
      <button class="mp-button secondary mp-icon-action" type="button" data-action="share"><span class="mp-linear-icon mp-linear-icon-share" aria-hidden="true"></span><span>分享</span></button>
      <a class="mp-button mp-course-detail-primary" href="/learner/pages/fast-registration.html?courseId=${encodeURIComponent(item.id)}">去报名</a>
    </div>`
  ));
  document.querySelectorAll('[data-course-detail-tab]').forEach(tab => tab.addEventListener('click', () => go(`/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}&tab=${tab.dataset.courseDetailTab}`)));
}
function renderCourseDetail(item) {
  if (!item) { renderDeepLinkEmpty('/learner/pages/courses.html', '返回课程列表'); return; }
  if (item.type === 'class' && item.objectType === 'course') { renderOfflineCourseDetail(item); return; }
  const isClass = item.type === 'class';
  const status = isClass ? item.classStatus || '招生中' : (item.sellable === false ? (item.product?.status || '未上架') : item.status || '可购买');
  const statusTone = status.includes('满') || status === '已下架' || status === '未上架' || status === '草稿' ? 'gray' : 'green';
  const coverMark = (item.professional || item.discipline || item.name).slice(0, 1);
  const detailTab = params.get('tab') === 'outline' ? 'outline' : 'intro';
  const ageFact = `<div><dt>适合年龄</dt><dd>${esc(item.age || '不限')}</dd></div>`;
  const detailParagraphs = item.detailHtml ? richTextBody(item.detailHtml) : (item.detail || [item.intro]).filter(Boolean).map(text => `<p>${esc(text)}</p>`).join('');
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
  const recommendation = item.recommendation ? `<p class="mp-course-detail-subtitle">${esc(item.recommendation)}</p>` : '';

  layout(stack(
    `<section class="mp-course-detail-hero"><div class="mp-course-detail-cover ${isClass ? 'class-cover' : 'video-cover'}" data-cover-mark="${esc(coverMark)}"><div class="mp-course-detail-cover-tags">${courseCoverTags(item, isClass ? '面授课程' : '精品视频', status, statusTone)}</div><span class="mp-course-detail-cover-label">${esc(item.professional || item.category)}</span></div><div class="mp-course-detail-summary"><span class="mp-course-detail-kicker">${isClass ? '面授课程' : '精品课程'}</span><div class="mp-course-detail-title"><h2>${esc(item.name)}</h2><strong>${money2(item.price)}</strong></div>${recommendation}<dl class="mp-course-detail-facts"><div><dt>难度</dt><dd>${esc(item.level)}</dd></div>${ageFact}<div><dt>总课时</dt><dd>${esc(item.hours)}课时</dd></div></dl></div></section>`,
    courseTeacherSection(item),
    `<section class="mp-course-detail-tab-section"><div class="mp-tabs mp-course-detail-tabs" role="tablist"><button class="mp-tab ${detailTab === 'intro' ? 'active' : ''}" type="button" role="tab" aria-selected="${detailTab === 'intro'}" data-course-detail-tab="intro">课程介绍</button>${hasOutline ? `<button class="mp-tab ${detailTab === 'outline' ? 'active' : ''}" type="button" role="tab" aria-selected="${detailTab === 'outline'}" data-course-detail-tab="outline">课程大纲</button>` : ''}</div>${detailTab === 'outline' ? card(`<div class="mp-section-head"><h3>课程大纲</h3><span class="mp-muted">共${item.outline.length}章</span></div>${outlineContent}`, 'mp-course-detail-section') : card(`<h3>课程介绍</h3><article class="mp-rich-content mp-course-detail-content">${detailParagraphs}<figure class="mp-rich-figure"><div class="mp-rich-image" role="img" aria-label="${esc(item.name)}课程内容图片占位"><span>课程图文</span><strong>${esc(item.professional || item.category)}课堂内容</strong></div><figcaption>课程内容展示，以实际发布内容为准</figcaption></figure></article>`, 'mp-course-detail-section')}</section>`,
    detailActions(item)
  ));
  document.querySelectorAll('[data-course-detail-tab]').forEach(tab => tab.addEventListener('click', () => go(`/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}&tab=${tab.dataset.courseDetailTab}`)));
}
function fastRegistrationCard(item) {
  const className = item.className || item.name;
  const courseName = item.courseName || item.name.replace(/班$/, '');
  const available = item.bookable === true;
  const seatText = available ? `剩余 ${item.remainingSeats} 名额` : (item.unavailableReason || item.learnerStatus);
  const action = available
    ? `<a class="mp-button" href="/learner/pages/fast-registration-detail.html?classId=${encodeURIComponent(item.id)}">立即报名</a>`
    : `<button class="mp-button secondary" type="button" disabled>${esc(item.learnerStatus || '暂不可报名')}</button>`;
  return `<article class="mp-registration-card"><header class="mp-registration-head"><div class="mp-registration-title"><small>班级</small><h3>${esc(className)}</h3></div><div class="mp-registration-status">${pill(item.learnerStatus, available ? 'green' : 'gray')}<span>${esc(seatText)}</span></div></header><div class="mp-registration-course"><div><span>课程</span><strong>${esc(courseName)}</strong></div><div><span>专业</span><strong>${esc(item.professional || item.category)}</strong></div></div><dl class="mp-registration-facts"><div><dt>首课日期</dt><dd>${esc(item.firstLessonDate || '待定')}</dd></div><div><dt>授课教师</dt><dd>${esc(item.teacher)}</dd></div><div class="wide"><dt>上课时间</dt><dd>${esc(item.schedule)}</dd></div><div class="wide"><dt>上课教室</dt><dd>${esc(roomText(item))}</dd></div><div><dt>课次</dt><dd>${esc(item.lessons || item.hours)}课次</dd></div><div><dt>剩余名额</dt><dd>${esc(item.remainingSeats)} / ${esc(item.capacity)}</dd></div></dl><footer class="mp-registration-footer"><div class="mp-registration-fee"><span>费用</span><strong>${money2(item.price)}</strong></div>${action}</footer></article>`;
}
function renderFastRegistration() {
  const courseIdFilter = params.get('courseId') || '';
  const filteredCourse = courseIdFilter ? state.courses.find(item => item.id === courseIdFilter) : null;
  const classItems = (state.classOptions || []).filter(item => (!courseIdFilter || item.courseId === courseIdFilter) && item.visible && !['CLASS_STARTED', 'CLASS_CANCELLED'].includes(item.unavailableReasonCode));
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
  layout(stack(card(`<div class="mp-section-head"><h2 id="fast-batch-title">2026年秋季</h2><span id="fast-result-count" class="mp-muted"></span></div><div class="mp-tabs"><button class="mp-tab" data-season="春季">春季</button><button class="mp-tab" data-season="暑假">暑假</button><button class="mp-tab active" data-season="秋季">秋季</button><button class="mp-tab" data-season="寒假">寒假</button></div><div class="mp-fast-filter-chips" aria-label="报名筛选条件"><button id="fast-profession-trigger" class="mp-fast-filter-chip" type="button" aria-haspopup="dialog" aria-controls="fast-profession-dialog" aria-expanded="false"><span>专业</span><b id="fast-profession-value">全部专业</b><i aria-hidden="true">›</i></button><button class="mp-fast-filter-chip" type="button" data-fast-choice="campus"><span>校区</span><b id="fast-campus-value">全部校区</b><i aria-hidden="true">›</i></button><button class="mp-fast-filter-chip" type="button" data-fast-choice="weekday"><span>上课时间</span><b id="fast-weekday-value">全部时间</b><i aria-hidden="true">›</i></button><button id="fast-open-only" class="mp-fast-filter-chip" type="button" aria-pressed="false"><span>只看可报名</span></button></div><div class="mp-fast-filter-actions"><button id="fast-filter-reset" class="mp-button ghost" type="button">重置筛选</button></div><div class="mp-fast-sort-row"><span>排序</span><div class="mp-sort-switch" role="group" aria-label="快速报名排序"><button class="active" type="button" data-fast-sort="latest" aria-pressed="true">最新</button><button type="button" data-fast-sort="sales" aria-pressed="false">销量</button></div></div>`), `<div id="class-list" class="mp-registration-list"></div>`, `<dialog id="fast-profession-dialog" class="mp-cascade-dialog"><section class="mp-cascade-sheet" aria-labelledby="fast-cascade-title"><header class="mp-cascade-head"><div><h2 id="fast-cascade-title">选择专业</h2><p id="fast-cascade-caption">请选择专业门类</p></div><button class="mp-cascade-close" type="button" aria-label="关闭专业选择">×</button></header><div id="fast-cascade-path" class="mp-cascade-path"></div><div id="fast-cascade-options" class="mp-cascade-options" role="listbox"></div><footer class="mp-cascade-actions"><button id="fast-cascade-clear" class="mp-button secondary" type="button">全部专业</button><button id="fast-cascade-confirm" class="mp-button" type="button">确定</button></footer></section></dialog>`));
  const selectedMajor = { discipline: '', field: '', professional: '' };
  const professionTrigger = document.querySelector('#fast-profession-trigger');
  const professionValue = document.querySelector('#fast-profession-value');
  professionTrigger.querySelector(':scope > span')?.remove();
  document.querySelector('[data-fast-choice="campus"] > span')?.remove();
  document.querySelector('[data-fast-choice="weekday"] > span')?.remove();
  const cascadeDialog = document.querySelector('#fast-profession-dialog');
  const cascadePath = document.querySelector('#fast-cascade-path');
  const cascadeOptions = document.querySelector('#fast-cascade-options');
  const cascadeCaption = document.querySelector('#fast-cascade-caption');
  const cascadeConfirm = document.querySelector('#fast-cascade-confirm');
  let selectedCampus = '';
  let selectedWeekday = '';
  let openOnly = false;
  let activeSort = params.get('sort') === 'sales' ? 'sales' : 'latest';
  const cascadeSteps = [{ key: 'discipline', label: '专业门类' }, { key: 'field', label: '专业分类' }, { key: 'professional', label: '专业' }];
  let draftMajor = { ...selectedMajor };
  let activeCascadeStep = 'discipline';
  const updateProfessionValue = () => {
    const pathText = [selectedMajor.discipline, selectedMajor.field, selectedMajor.professional].filter(Boolean).join(' / ');
    professionValue.textContent = pathText || '全部专业';
    professionTrigger.classList.toggle('has-value', Boolean(pathText));
    professionTrigger.setAttribute('aria-label', `专业：${pathText || '全部专业'}`);
  };
  const updateFastFilterChips = () => {
    const campusValue = selectedCampus || '全部校区';
    const weekdayValue = ({ weekday: '工作日', saturday: '周六', sunday: '周日' })[selectedWeekday] || '全部时间';
    const campusTrigger = document.querySelector('[data-fast-choice="campus"]');
    const weekdayTrigger = document.querySelector('[data-fast-choice="weekday"]');
    document.querySelector('#fast-campus-value').textContent = campusValue;
    document.querySelector('#fast-weekday-value').textContent = weekdayValue;
    campusTrigger.classList.toggle('has-value', Boolean(selectedCampus));
    weekdayTrigger.classList.toggle('has-value', Boolean(selectedWeekday));
    campusTrigger.setAttribute('aria-label', `校区：${campusValue}`);
    weekdayTrigger.setAttribute('aria-label', `上课时间：${weekdayValue}`);
    const openOnlyTrigger = document.querySelector('#fast-open-only');
    openOnlyTrigger.classList.toggle('has-value', openOnly);
    openOnlyTrigger.setAttribute('aria-pressed', String(openOnly));
    openOnlyTrigger.setAttribute('aria-label', `只看可报名：${openOnly ? '已开启' : '未开启'}`);
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
    const items = sortedLearnerItems(classItems.filter(item => (item.season || '秋季') === activeSeason && (!selectedMajor.discipline || item.discipline === selectedMajor.discipline) && (!selectedMajor.field || item.field === selectedMajor.field) && (!selectedMajor.professional || item.professional === selectedMajor.professional) && (!selectedCampus || item.campus === selectedCampus) && scheduleMatches(item.schedule, selectedWeekday) && (!openOnly || item.bookable)), activeSort);
    document.querySelector('#fast-batch-title').textContent = filteredCourse ? `${filteredCourse.name} · ${activeSeason}` : `2026年${activeSeason}`;
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
  document.querySelectorAll('[data-fast-sort]').forEach(control => control.addEventListener('click', () => {
    activeSort = control.dataset.fastSort;
    document.querySelectorAll('[data-fast-sort]').forEach(item => { const active = item === control; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    const url = new URL(window.location.href);
    if (activeSort === 'latest') url.searchParams.delete('sort');
    else url.searchParams.set('sort', activeSort);
    window.history.replaceState({}, '', url);
    draw();
  }));
  document.querySelectorAll('[data-fast-sort]').forEach(item => { const active = item.dataset.fastSort === activeSort; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  updateProfessionValue();
  updateFastFilterChips();
  draw();
}
function renderFastRegistrationDetail(item) {
  if (classDeepLinkUnavailable(item)) { renderDeepLinkEmpty('/learner/pages/fast-registration.html', '返回班级列表'); return; }
  const available = item.bookable === true;
  const status = item.learnerStatus;
  const statusTone = available ? 'green' : 'gray';
  const coverMark = (item.professional || item.name).slice(0, 1);
  const detailBody = item.detailHtml
    ? richTextBody(item.detailHtml)
    : (item.detail?.length ? item.detail : [item.intro || '本班为线下面授课程，具体教学安排以班级通知为准。']).map(text => `<p>${esc(text)}</p>`).join('');
  const detailTab = params.get('tab') === 'outline' ? 'outline' : 'intro';
  const hasOutline = Array.isArray(item.outline) && item.outline.length > 0;
  const outlineContent = hasOutline
    ? `<div class="mp-course-detail-outline">${item.outline.map((chapter, index) => `<div class="mp-course-detail-chapter"><span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></div>`).join('')}</div>`
    : '<div class="mp-empty mp-course-detail-empty">课程大纲暂未维护</div>';
  const detailContent = detailTab === 'outline'
    ? card(`<div class="mp-section-head"><h3>课程大纲</h3><span class="mp-muted">${hasOutline ? `共${item.outline.length}章` : '待完善'}</span></div>${outlineContent}`, 'mp-fast-detail-section')
    : card(`<h3>课程简介</h3><article class="mp-rich-content mp-fast-detail-content">${detailBody}</article>`, 'mp-fast-detail-section');
  const currentStudentId = state.currentStudentId;
  const classOrders = state.orders.filter(order => order.accountId === state.accountId && (order.classId === item.id || order.courseId === item.id) && (!order.studentId || order.studentId === currentStudentId));
  const paidOrder = classOrders.find(order => order.status === '已支付');
  const refundingOrder = classOrders.find(order => order.status === '退款中');
  const pendingOrder = classOrders.find(order => order.status === '待支付');
  const detailUrl = `/learner/pages/fast-registration-detail.html?classId=${encodeURIComponent(item.id)}`;
  let primaryAction = `<button class="mp-button mp-course-detail-primary" type="button" disabled>${esc(item.unavailableReason || status)}</button>`;
  if (!isLoggedIn()) primaryAction = `<a class="mp-button mp-course-detail-primary" href="/login.html?role=learner&redirect=${encodeURIComponent(detailUrl)}">登录后报名</a>`;
  else if (!state.students.length) primaryAction = '<a class="mp-button mp-course-detail-primary" href="/learner/pages/student-edit.html">添加学员</a>';
  else if (refundingOrder) primaryAction = '<button class="mp-button mp-course-detail-primary" type="button" disabled>退款处理中</button>';
  else if (paidOrder) primaryAction = `<a class="mp-button mp-course-detail-primary" href="/learner/pages/class-detail.html?courseId=${encodeURIComponent(item.id)}">已报名，查看班级</a>`;
  else if (pendingOrder) primaryAction = `<a class="mp-button mp-course-detail-primary" href="/learner/pages/payment.html?classId=${encodeURIComponent(item.id)}&orderId=${encodeURIComponent(pendingOrder.id)}">继续支付</a>`;
  else if (available) primaryAction = `<a class="mp-button mp-course-detail-primary" href="/learner/pages/payment.html?classId=${encodeURIComponent(item.id)}">立即报名</a>`;
  const action = `<div class="mp-bottom-actions mp-course-detail-actions"><button class="mp-button secondary mp-icon-action" type="button" data-action="consult"><span class="mp-linear-icon mp-linear-icon-consult" aria-hidden="true"></span><span>咨询</span></button><button class="mp-button secondary mp-icon-action" type="button" data-action="share"><span class="mp-linear-icon mp-linear-icon-share" aria-hidden="true"></span><span>分享</span></button>${primaryAction}</div>`;
  layout(stack(
    `<section class="mp-fast-detail-hero"><div class="mp-fast-detail-cover class-cover" data-cover-mark="${esc(coverMark)}"><div class="mp-course-detail-cover-tags">${pill('快速报名', 'light')}${pill(status, statusTone)}</div></div><div class="mp-fast-detail-summary"><h2>${esc(item.className || item.name)}</h2><p>${esc(item.courseName || item.name)} · ${esc(item.professional || item.category)}</p><strong class="mp-fast-detail-price">${money2(item.price)}</strong></div></section>`,
    card(`<div class="mp-section-head"><h3>报名信息</h3>${pill(status, statusTone)}</div><dl class="mp-fast-detail-facts"><div><dt>授课教师</dt><dd>${esc(item.teacher)}老师</dd></div><div><dt>首课日期</dt><dd>${esc(item.firstLessonDate || '待定')}</dd></div><div class="wide"><dt>上课教室</dt><dd>${esc(roomText(item, '待定'))}</dd></div><div class="wide"><dt>上课时间</dt><dd>${esc(item.schedule || '以开课通知为准')}</dd></div><div><dt>总课次</dt><dd>${esc(item.hours)}课次</dd></div><div><dt>剩余名额</dt><dd>${esc(item.remainingSeats)} / ${esc(item.capacity)}</dd></div><div><dt>报名截止</dt><dd>${esc(item.deadline || '以招生通知为准')}</dd></div></dl>${item.unavailableReason ? `<p class="mp-notice">${esc(item.unavailableReason)}</p>` : ''}`, 'mp-fast-detail-section'),
    `<section class="mp-fast-detail-tab-section"><div class="mp-tabs mp-course-detail-tabs" role="tablist" aria-label="课程内容切换"><button class="mp-tab ${detailTab === 'intro' ? 'active' : ''}" type="button" role="tab" aria-selected="${detailTab === 'intro'}" data-fast-detail-tab="intro">课程简介</button><button class="mp-tab ${detailTab === 'outline' ? 'active' : ''}" type="button" role="tab" aria-selected="${detailTab === 'outline'}" data-fast-detail-tab="outline">课程大纲</button></div>${detailContent}</section>`,
    card('<p class="mp-notice">名额以支付成功为准。提交订单不占用名额。</p>', 'mp-fast-detail-section'),
    action
  ));
  document.querySelectorAll('[data-fast-detail-tab]').forEach(tab => tab.addEventListener('click', () => go(`/learner/pages/fast-registration-detail.html?classId=${encodeURIComponent(item.id)}&tab=${tab.dataset.fastDetailTab}`)));
}
function classLearningRecord(item) { return learningRecords().find(record => record.courseId === item.id && record.type === 'class'); }
// CR-2026-044／CR-2026-047：班级详情区分两个维度——报名条件取班级招生投影（与课程详情、快速报名同源），
// 学习状态取当前学员自己的学习记录；两者并列展示，不再用学习状态冒充招生状态。
function classLearningLabel(record) { return record?.status === 'ended' ? '已结束' : record?.status === 'upcoming' ? '待开课' : record ? '学习中' : ''; }
const classEnrollmentTone = (value) => (value === '可报名' ? 'green' : value === '已满员' || value === '即将开放' ? 'amber' : 'gray');
const classLearningTone = (value) => (value === '学习中' ? 'green' : value === '待开课' ? 'amber' : 'gray');
function classInfoView(item, record, sessions) {
  const status = item.learnerStatus || item.classStatus || '招生中';
  const statusTone = classEnrollmentTone(status);
  const learningStatus = classLearningLabel(record);
  const statusPills = `${pill(status, statusTone)}${learningStatus ? pill(`我的学习：${learningStatus}`, classLearningTone(learningStatus)) : ''}`;
  // I1-CLASS-DETAIL-03：简介与大纲带入课程档案/班级数据，不再只显示兜底句。
  const archive = courseArchiveFor(item.courseId) || {};
  const copy = learnerCourseCopy[item.courseId] || learnerClassCopy[item.id] || {};
  // I1-CLASS-DETAIL-15：课程简介只渲染后台录入的内容（课程/班级展示信息），缺失时用占位文案；
  // 不在前端拼装或改写简介文字（客户 2026-09-23 口径）。
  const introBody = item.detailHtml
    ? richTextBody(item.detailHtml)
    : (item.detail || [item.intro || copy.intro || CLASS_INTRO_PLACEHOLDER]).map(text => `<p>${esc(text)}</p>`).join('');
  const outlineSource = Array.isArray(item.outline) && item.outline.length
    ? item.outline
    : (copy.outline || []).length
      ? copy.outline
      : (archive.chapters || []).map(chapter => ({ title: chapter.name, note: `${(chapter.lessons || []).length}课时` }));
  // I1-CLASS-DETAIL-21：课程简介为后台录入内容（缺省用约 200 字占位文本），含课程图片占位；默认收起。
  const introSection = `<section class="mp-class-detail-block"><div class="mp-section-head"><h3>课程简介</h3><div class="mp-class-fold-actions"><button type="button" class="mp-class-fold-toggle" data-class-fold="intro" aria-expanded="false">展开</button></div></div><div class="mp-class-fold-body is-collapsed" id="class-fold-intro"><div class="mp-class-fold-clamp mp-rich-content mp-class-detail-intro">${introBody}</div><div class="mp-class-intro-figure mp-class-fold-hide" role="img" aria-label="课程图片占位，实际图片由后台录入"><span>课程图片（后台录入）</span></div></div></section>`;
  // I1-CLASS-DETAIL-21：课程大纲同样默认收起。
  const outline = outlineSource.length ? `<section class="mp-class-detail-block"><div class="mp-section-head"><h3>课程大纲</h3><div class="mp-class-fold-actions"><span class="mp-muted">共${outlineSource.length}章</span><button type="button" class="mp-class-fold-toggle" data-class-fold="outline" aria-expanded="false">展开</button></div></div><div class="mp-class-fold-body is-collapsed" id="class-fold-outline"><div class="mp-course-detail-outline mp-class-fold-hide">${outlineSource.map((chapter, index) => `<div class="mp-course-detail-chapter"><span class="mp-course-detail-index">${String(index + 1).padStart(2, '0')}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.note || '')}</small></div>`).join('')}</div></div></section>` : '';
  // 事实区拆两组：家长先关心「什么时候、在哪上」，再看班级规模等基本信息。
  // I1-CLASS-DETAIL-04：课表发布后展示「上课进度」；「班级人数」改用真实已报人数，剩余名额单独成项。
  const doneCount = (sessions || []).filter(sessionHasHappened).length;
  const totalSessions = (sessions || []).length || Number(item.lessons || 0);
  const progressField = totalSessions
    ? `<div><dt>上课进度</dt><dd>已完成 ${doneCount} / 共 ${totalSessions} 次课</dd></div>`
    : `<div><dt>首次开课</dt><dd>${esc(item.firstLessonDate || '以开课通知为准')}</dd></div>`;
  const enrolledNow = Number(item.enrolled || 0);
  const capacity = Number(item.capacity || 0);
  const remaining = Number(item.remainingSeats ?? Math.max(0, capacity - enrolledNow));
  const ended = record?.status === 'ended';
  const remainingField = capacity && !ended
    ? `<div><dt>剩余名额</dt><dd>${remaining} / ${capacity}</dd></div>`
    : '';
  const scheduleFacts = `<div class="mp-class-detail-group"><h4>上课安排</h4><dl class="mp-class-detail-facts"><div><dt>授课教师</dt><dd>${esc(item.teacher)}老师</dd></div>${progressField}<div class="wide"><dt>上课时间</dt><dd>${esc(item.schedule || '以开课通知为准')}</dd></div><div class="wide"><dt>上课教室</dt><dd>${esc(roomText(item, '待定'))}</dd></div></dl></div>`;
  const classFacts = `<div class="mp-class-detail-group"><h4>班级信息</h4><dl class="mp-class-detail-facts"><div><dt>总课时</dt><dd>${esc(item.lessons || item.hours)}课时</dd></div><div><dt>已报人数</dt><dd>${enrolledNow} 人</dd></div>${remainingField}<div><dt>适合年龄</dt><dd>${esc(item.age || '不限')}</dd></div></dl></div>`;
  // I1-CLASS-DETAIL-14：班级身份区与课程信息合并为一张卡——顶部给班级名称、状态胶囊、面授标签、
  // 课程名称与当前学员，下方直接接「上课安排」「班级信息」；课程简介与课程大纲仍各自成卡（客户 2026-09-23 口径）。
  return `<section class="mp-class-detail-block mp-class-section" id="class-section-overview" data-class-section="overview">`
    + `<div class="mp-class-detail-head"><h2>${esc(item.className || item.name)}</h2>`
    + `<div class="mp-pills">${pill('面授课程', 'light')}${statusPills}</div>`
    + `<p class="mp-class-detail-head-meta">${esc(item.courseName || item.name)} · 当前学员：${esc(currentStudent().name)}</p></div>`
    + `${scheduleFacts}${classFacts}</section>`
    + `${introSection}${outline}`;
}
// 演示作业口径集中一处：学员端作业记录尚未接入教务作业表，接入后只改这里。
// 课程简介占位：后台未录入简介时展示，仅作占位，不代表课程内容。
// 课程简介占位：后台未录入时展示，约 200 字演示文本；实际内容以后台录入为准。
const CLASS_INTRO_PLACEHOLDER = "本课程为线下面授课程，采用小班授课、分阶段推进的方式组织教学。第一阶段以基础认知与规范动作为主，建立学习方法与课堂习惯；第二阶段进入技巧训练与作品实践，通过示范、分解练习和当堂纠错提升完成度；第三阶段结合舞台展示与阶段测评检验成果并给出提升建议。教师会在课堂中持续观察每位学员的完成情况，课后布置练习任务，家长可通过上课记录了解学习进度。具体教学内容、课时安排与上课地点以本班课表及班级通知为准；如遇调整，教务会提前通知。";
const CLASS_DEMO_HOMEWORK = { title: '节奏练习视频', deadline: '2026-09-27 23:59' };
// 出勤按课次状态派生。真实考勤记录接入后替换本函数，聚合布局不用动。
// 种子里的「待上课」是占位值，已过时间的课次按共享判定显示为已完成，与后台课表口径一致。
function sessionDisplayStatus(session) {
  const stored = session?.status || '待上课';
  if (stored === '待上课' && isSessionPast(session)) return '已完成';
  return stored;
}
// 课次是否已经上过（用于区分「出勤/作业状态」与「尚未开始」）。
function sessionHasHappened(session) { return ['已完成', '已上课'].includes(sessionDisplayStatus(session)); }
// CR-2026-136：当前学员的课次出勤读共享的课次考勤记录，与教师端课次详情的名单、班级指标同源；
// 未到时间的课次不再标「待签到」，避免家长误读成「该签到没签」。
function deriveAttendance(item, session) {
  const status = sessionDisplayStatus(session);
  if (status === '已停课') return { label: '已停课', tone: 'gray', counted: false, started: false };
  if (status === '上课中') return { label: '进行中', tone: 'green', counted: false, started: true };
  if (status === '已完成' || status === '已上课') {
    const record = lessonAttendanceStatus(item, session.index, currentStudent());
    if (record === '已到') return { label: '已签到', tone: 'green', counted: true, started: true };
    if (record === '迟到') return { label: '迟到', tone: 'amber', counted: true, started: true };
    if (record === '请假') return { label: '请假', tone: 'amber', counted: false, started: true };
    return { label: '缺勤', tone: 'gray', counted: false, started: true };
  }
  return { label: '未开始', tone: 'gray', counted: false, started: false };
}
function homeworkPill(work) {
  if (!work) return '';
  if (work.status === '已提交') return pill('作业已提交', 'green');
  return pill(work.status === '草稿' ? '作业草稿' : '作业待提交', 'amber');
}
// 上课记录：按课次把出勤与作业聚合成一行一课，家长一屏读完一课。
// I1-CLASS-DETAIL-12（方案 A）：班级课表与上课记录合并为一个「课次」段——一课一行，
// 行内先给课次状态，已上过的课次再补出勤与作业；分享视图只输出课表字段。
function classLessonsView(item, sessions, work, nextSession, { scheduleOnly = false, ended = false } = {}) {
  const head = `<div class="mp-section-head"><h3>${scheduleOnly ? '班级课表' : '课次'}</h3><span class="mp-muted">共 ${sessions.length} 次课</span></div>`;
  // I1-CLASS-DETAIL-16：课表在报名前已发布，报名学员的班级必有正式课次；
  // 0 课次属异常数据，不渲染课次段，也不再输出「课表尚未发布」这类不存在的场景文案（客户 2026-09-23 口径）。
  if (!sessions.length) return '';
  const rows = sessions.map((session, index) => ({ session, index, status: sessionDisplayStatus(session), attendance: deriveAttendance(item, session), homework: null }));
  classLessonRows = rows;
  const lastDone = rows.filter((row) => ['已完成', '已上课'].includes(row.status)).pop();
  // 结课后不再显示待提交作业（与「待提交作业只对在读班级有意义」的口径一致）。
  if (lastDone && !ended) lastDone.homework = work;
  const counted = rows.filter((row) => ['已完成', '已上课'].includes(row.status));
  const attended = counted.filter((row) => row.attendance.counted);
  const summary = scheduleOnly ? '' : counted.length
    ? `<p class="mp-class-summary">有效出勤 ${attended.length}/${counted.length} 次 · 出勤率 ${Math.round(attended.length / counted.length * 100)}%</p><p class="mp-class-summary-note">已上过的课次才计入出勤；迟到计出勤，请假与待补录不计入。</p>`
    : '<p class="mp-class-summary">尚未开课，出勤率会在首次课后统计。</p>';
  const statusTone = (value) => (value === '已完成' || value === '已上课' ? 'gray' : value === '已停课' ? 'amber' : 'green');
  const row = (entry) => {
    const session = entry.session;
    const time = `${esc(session.startTime || session.start || '—')}–${esc(session.endTime || session.end || '—')}`;
    // 未开始的课次只给课次状态，不挂出勤结果与作业标签。
    const metaTags = scheduleOnly || !entry.attendance.started ? '' : `${pill(entry.attendance.label, entry.attendance.tone)}${homeworkPill(entry.homework)}`;
    const homeworkCard = !scheduleOnly && entry.homework
      ? `<div class="mp-class-record-hw"><div><strong>${esc(CLASS_DEMO_HOMEWORK.title)}</strong><small>截止 ${esc(CLASS_DEMO_HOMEWORK.deadline)}${entry.homework.status === '已提交' && entry.homework.feedback ? ` · 教师评语：${esc(entry.homework.feedback)}` : ''}</small></div><a class="mp-button secondary" href="/learner/pages/homework.html?courseId=${esc(item.id)}">${entry.homework.status === '已提交' ? '查看作业' : '去提交'}</a></div>`
      : '';
    // I1-CLASS-DETAIL-20：课次行可点，打开课次详情弹层（含课次状态、出勤结果、作业与教师评语）。
    return `<li class="mp-class-lesson${session === nextSession ? ' is-next' : ''}"><button type="button" class="mp-class-lesson-main" data-lesson-open="${entry.index}" aria-haspopup="dialog" aria-label="第 ${entry.index + 1} 次课 ${esc(session.date)} ${esc(entry.status)}，查看课次详情"><div class="mp-class-lesson-head"><div><strong>第 ${entry.index + 1} 次 · ${esc(session.date)} ${esc(session.weekday || '')}</strong><small>${time} · ${esc(roomText(item, '教室待定'))}</small></div><div class="mp-class-record-tags">${pill(entry.status, statusTone(entry.status))}${metaTags}</div></div><span class="mp-class-lesson-chevron" aria-hidden="true">›</span></button>${homeworkCard}</li>`;
  };
  const rest = Math.max(0, sessions.length - 3);
  // 默认折叠前 3 条；作业入口跟随课次行，不额外展开整段。
  const collapsed = rest > 0 && !scheduleOnly;
  const list = `<ol class="mp-class-lesson-list${collapsed ? ' is-collapsed' : ''}">${rows.map(row).join('')}</ol>${collapsed ? `<button type="button" class="mp-button ghost full mp-class-lesson-more" data-class-lesson-more>查看全部 ${sessions.length} 次课</button>` : ''}`;
  const action = scheduleOnly
    ? '<small class="mp-muted">分享视图只展示上课日期、时间、教室与课次状态，不含学员个人信息。</small>'
    : '<div class="mp-class-timetable-actions"><button type="button" class="mp-button secondary" data-class-share>分享给家长</button><small class="mp-muted">分享链接只展示本班课表（日期、时间、教室与课次状态），不含学员个人信息；打开需先登录。</small></div>';
  return `<section class="mp-class-detail-block mp-class-section" id="class-section-lessons" data-class-section="lessons">${head}${summary}${list}${action}</section>`;
}
// 首屏结论：家长打开页面最想知道的是「下次什么时候上课」。
function classNextSessionView(item, session) {
  const kicker = '<span class="mp-class-hero-kicker">下次上课</span>';
  // 已结课或全部课次完成时才没有下一次课；课表本身在报名前已发布，不写「课表发布后」的等待语义。
  if (!session) return `<section class="mp-class-next is-empty">${kicker}<strong>暂无下一次课</strong><p>本班课次已全部完成。</p></section>`;
  const time = `${esc(session.startTime || session.start || '—')}–${esc(session.endTime || session.end || '—')}`;
  return `<section class="mp-class-next">${kicker}<div class="mp-class-next-head"><strong>${esc(session.date)} ${esc(session.weekday || '')} ${time}</strong>${pill(session.status || '待上课', session.status === '已停课' ? 'amber' : 'green')}</div><p>${esc(roomText(item, '教室待定'))} · ${esc(item.teacher)}老师</p><button type="button" class="mp-button secondary" data-class-jump="lessons">查看课表</button></section>`;
}
// CR-2026-102：班级课表从班级主体（种子 + demo state）读取正式课次，与后台课表同一份数据；
// 家长／学员可查看每次课的日期、时间、教室与状态，并通过「分享给家长」生成分享链接。
function classTimetableSessions(classId) {
  const shared = readDemoState();
  const seed = classSeed.find((entry) => entry.id === classId) || {};
  const stored = (shared.classes || []).find((entry) => entry.id === classId) || {};
  return (stored.sessions || seed.sessions || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
function shareClassTimetable(item) {
  const link = `${location.origin}/learner/pages/class-detail.html?courseId=${encodeURIComponent(item.id)}&tab=lessons&view=schedule`;
  if (navigator.share) { navigator.share({ title: `${item.className || item.name} · 班级课表`, text: '班级课表：上课日期、时间与教室', url: link }).catch(() => {}); return; }
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(link).then(() => toast('班级课表链接已复制，可发送给家长')).catch(() => toast('已生成班级课表分享链接')); return; }
  toast('已生成班级课表分享链接，可发送给家长');
}
// 分段导航只做滚动定位，不切换视图：切页签会丢滚动位置、返回落到第一屏，移动端单页读起来更顺。
const CLASS_DETAIL_SECTIONS = [['overview', '课程信息'], ['lessons', '课次'], ['result', '我的成果']];
// 旧深链兼容：原「考勤作业」页签合并进「上课记录」。
const CLASS_TAB_ALIAS = { overview: 'overview', lessons: 'lessons', timetable: 'lessons', records: 'lessons', attendance: 'lessons', result: 'result' };
function bindClassSectionNav() {
  const nav = document.querySelector('.mp-class-nav');
  const sections = Array.from(document.querySelectorAll('[data-class-section]'));
  if (!nav || !sections.length) return null;
  const buttons = Array.from(nav.querySelectorAll('[data-class-nav]'));
  const activate = key => buttons.forEach(button => {
    const on = button.dataset.classNav === key;
    button.classList.toggle('active', on);
    button.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const scrollTo = key => document.getElementById(`class-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  buttons.forEach(button => button.addEventListener('click', () => { activate(button.dataset.classNav); scrollTo(button.dataset.classNav); }));
  const spy = () => {
    const line = nav.getBoundingClientRect().bottom + 12;
    let current = sections[0].dataset.classSection;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= line) current = section.dataset.classSection; });
    // 滚到底时最后一段无法再顶到导航下方，直接高亮它。
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].dataset.classSection;
    activate(current);
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();
  return scrollTo;
}
// 成果区由多张卡组成，外面包一层带锚点的容器，分段导航才能定位到这里。
function resultSection(item, record) {
  // I1-CLASS-DETAIL-18：未结课时不渲染成果卡，只在页脚留一行提示；分段导航也随之少一段。
  if (record?.status !== 'ended') return '<p class="mp-class-result-hint">结业状态、结业评语、学习报告与结业证书会在本班课程结束后展示。</p>';
  return `<section class="mp-class-result-group mp-class-section" id="class-section-result" data-class-section="result">${resultView(item, record)}</section>`;
}
// 课次详情弹层：不新增独立页面（独立课次详情页属迭代2 范围）。
// CR-2026-132：课次身份用「第 N 次 / 共 M 次」讲清进度，上课地点取该课次教室，
// 已停课课次给出补课说明，已上课次展示出勤结果、课后作业与教师评语。
let classLessonRows = [];
function lessonStatusTone(value) { return value === '已完成' || value === '已上课' ? 'gray' : value === '已停课' ? 'amber' : 'green'; }
function sessionRoomText(session, item, fallback = '教室待定') {
  const room = venueSeed.find((entry) => entry.id === (session && session.roomId));
  return room ? `${room.campus} · ${room.name}` : roomText(item, fallback);
}
function showLessonDetailDialog(item, entry) {
  if (!entry) return;
  const session = entry.session;
  const time = `${session.startTime || session.start || '—'}–${session.endTime || session.end || '—'}`;
  const total = classLessonRows.length || 0;
  const status = entry.status;
  const stopped = status === '已停课';
  const started = entry.attendance.started;
  const work = entry.homework;
  const rows = [
    ['上课时间', `${session.date} ${session.weekday || ''} ${time}`],
    ['上课地点', sessionRoomText(session, item)],
    ['授课教师', `${item.teacher}老师`],
    ['出勤结果', stopped ? '本课次已停课，不考勤' : started ? entry.attendance.label : '未开始']
  ];
  const homeworkBlock = stopped
    ? '<p class="mp-muted">本课次已由教务停课，补课安排确认后会通过消息通知。</p>'
    : !started
      ? '<p class="mp-muted">本节课尚未开始，暂无出勤与作业记录。</p>'
      : work
        ? `<section class="mp-dialog-section"><h3>课后作业</h3><dl class="mp-dialog-rows"><div><dt>作业</dt><dd>${esc(CLASS_DEMO_HOMEWORK.title)}</dd></div><div><dt>截止时间</dt><dd>${esc(CLASS_DEMO_HOMEWORK.deadline)}</dd></div><div><dt>提交状态</dt><dd>${esc(work.status)}</dd></div></dl><div class="mp-dialog-comment"><span>教师评语</span><p>${esc(work.status === '已提交' ? (work.feedback || '教师尚未完成批改') : '提交后可查看教师评语')}</p></div><a class="mp-button secondary full" href="/learner/pages/homework.html?courseId=${esc(item.id)}">${work.status === '已提交' ? '查看作业' : '去提交'}</a></section>`
        : '<p class="mp-muted">本节课没有布置作业。</p>';
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog mp-lesson-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><div class="mp-lesson-dialog-head"><h2>第 ${entry.index + 1} 次课 · ${esc(session.date)} ${esc(session.weekday || '')}</h2>${pill(status, lessonStatusTone(status))}</div><p class="mp-dialog-copy">${esc(item.className || item.name)}${total ? ` · 共 ${total} 次课，本节为第 ${entry.index + 1} 次` : ''}</p><dl class="mp-dialog-rows">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${homeworkBlock}<div class="mp-actions mp-dialog-actions"><button type="button" class="mp-button secondary" data-dialog-close>关闭</button></div></div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
}
function renderClassDetail(item, tab = params.get('tab') || 'overview') {
  if (classDeepLinkUnavailable(item)) { renderDeepLinkEmpty('/learner/pages/fast-registration.html', '返回班级列表'); return; }
  const record = classLearningRecord(item);
  // I1-CLASS-DETAIL-11：班级详情只对已报名当前学员开放；未报名走空态，不提供报名入口。
  if (!record) { renderEnrollmentRequiredEmpty(); return; }
  const sessions = classTimetableSessions(item.id);
  const nextSession = sessions.find(session => !['已完成', '已上课', '已停课'].includes(sessionDisplayStatus(session))) || null;
  const work = homeworkState();
  // I1-CLASS-DETAIL-12（方案 A）：view=schedule 为「课表分享视图」——只输出日期/时间/教室/课次状态，
  // 不含出勤、作业、成果与当前学员姓名，供家长转发使用。
  const scheduleOnly = params.get('view') === 'schedule';
  if (scheduleOnly) {
    const shareHead = card('<div class="mp-section-head"><h2>' + esc(item.className || item.name) + '</h2>' + pill('课表分享视图', 'gray') + '</div><p>' + esc(item.courseName || item.name) + ' · ' + esc(item.teacher) + '老师 · ' + esc(roomText(item, '教室待定')) + '</p><p class="mp-muted">' + esc(item.schedule || '以开课通知为准') + ' · 共 ' + esc(item.lessons || sessions.length) + ' 课时</p>', 'mp-fast-detail-section');
    layout(stack(shareHead, classLessonsView(item, sessions, work, nextSession, { scheduleOnly: true }), '<a class="mp-button secondary full" href="/learner/pages/class-detail.html?courseId=' + esc(item.id) + '">返回班级详情</a>'));
    document.querySelector('.mobile-page')?.classList.add('is-schedule-share');
    document.title = '班级课表 · ' + (item.className || item.name);
    return;
  }
  // I1-CLASS-DETAIL-10：说明入口收进吸顶分段导航，避免悬浮按钮压住卡片文字。
  // 有正式课次时才渲染「课次」分段；导航列数随实际分段数走，避免出现空锚点。
  const navSections = CLASS_DETAIL_SECTIONS.filter(([key]) => (key !== 'lessons' || sessions.length > 0) && (key !== 'result' || record?.status === 'ended'));
  const nav = `<nav class="mp-class-nav" aria-label="班级详情分段" style="grid-template-columns: repeat(${navSections.length}, 1fr) auto">${navSections.map(([key, label]) => `<button class="mp-tab" type="button" data-class-nav="${key}" aria-selected="false">${label}</button>`).join('')}<button class="mp-tab mp-class-nav-help" type="button" data-class-help>说明</button></nav>`;
  // I1-CLASS-DETAIL-22：本页不设底部操作条（咨询走线下联系老师；分享只在课次段一处；进入学习改由学习中心进入）。
  // I1-CLASS-DETAIL-17：作业入口只保留在课次行内，取消顶部「待提交作业」卡（客户 2026-09-23 口径）。
  // I1-CLASS-DETAIL-19：已结课班不渲染空的「下次上课」卡（无下一次课对结课班是噪音）。
  const nextCard = record?.status === 'ended' ? '' : classNextSessionView(item, nextSession);
  layout(stack(nav, nextCard, classInfoView(item, record, sessions), classLessonsView(item, sessions, work, nextSession, { ended: record?.status === 'ended' }), resultSection(item, record)));
  document.querySelectorAll('[data-class-share]').forEach(button => button.addEventListener('click', () => shareClassTimetable(item)));
  document.querySelectorAll('[data-lesson-open]').forEach(button => button.addEventListener('click', () => showLessonDetailDialog(item, classLessonRows[Number(button.dataset.lessonOpen)])));
  document.querySelectorAll('[data-class-fold]').forEach(button => button.addEventListener('click', () => {
    const body = document.getElementById(`class-fold-${button.dataset.classFold}`);
    if (!body) return;
    const collapsed = body.classList.toggle('is-collapsed');
    button.textContent = collapsed ? '展开' : '收起';
    button.setAttribute('aria-expanded', String(!collapsed));
  }));
  document.querySelector('[data-class-help]')?.addEventListener('click', () => document.querySelector('[data-page-help-dialog]')?.showModal());
  document.title = `班级详情 · ${item.className || item.name}`;
  document.querySelector('[data-class-lesson-more]')?.addEventListener('click', event => {
    const list = document.querySelector('.mp-class-lesson-list');
    if (!list) return;
    const collapsed = list.classList.toggle('is-collapsed');
    const total = list.querySelectorAll('li').length;
    event.currentTarget.textContent = collapsed ? `查看全部 ${total} 次课` : '收起';
  });
  document.querySelectorAll('[data-class-jump]').forEach(button => button.addEventListener('click', () => document.getElementById(`class-section-${button.dataset.classJump}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  const scrollToSection = bindClassSectionNav();
  let target = CLASS_TAB_ALIAS[tab] || 'overview';
  // 未结课时没有成果段，深链回退到课次段（页脚会给出结课后的说明）。
  if (target === 'result' && record?.status !== 'ended') target = sessions.length ? 'lessons' : 'overview';
  if (target !== 'overview') setTimeout(() => scrollToSection?.(target), 120);
}
function homeworkView(item) { return `<h3>我的作业</h3><div class="mp-list" style="margin-top:10px"><div class="mp-item"><div><strong>课堂组合练习记录</strong><small>截止时间：2026-09-20 · 教师评语：动作衔接自然，继续保持。</small></div>${pill('已批改', 'green')}</div><div class="mp-item"><div><strong>节奏练习视频</strong><small>截止时间：2026-09-27 · 仅支持文字说明和附件。</small></div>${button('提交作业', `data-action="homework" data-course-id="${item.id}"`, 'secondary')}</div></div>`; }
function resultView(item = course('class-001'), record) {
  // I1-CLASS-DETAIL-06：成果区按教学阶段门控。未结课只说明「结课后才有成果」，不再显示「报告已发布／证书生成中」等假状态。
  if (record?.status !== 'ended') {
    return `<section class="mp-class-detail-block"><h3>我的成果</h3><div class="mp-class-result-status"><div><strong>尚未结课</strong><p>结业状态、结业评语、学习报告与结业证书会在本班课程结束后在这里展示。</p></div>${pill('未结课', 'gray')}</div></section>`;
  }
  const completion = state.completionStatus || '已结业';
  const completionTone = completion === '已结业' ? 'green' : completion === '补课中' ? 'amber' : 'gray';
  const completionNote = completion === '已结业'
    ? '本班已结课，以下为当前学员的结业结论与成果。'
    : '结业结论仅针对当前学员，与其他学员无关。';
  const report = reportState();
  const certificate = state.certificateStatus || '已生成';
  const reportText = report === '已发布' ? '学习报告已发布，包含课堂参与、作品练习和阶段展示成果。' : report === '已撤回' ? '报告暂不可查看，教务正在更新。' : '学习报告正在生成中，完成后会通过消息通知。';
  const certificateText = certificate === '已生成' ? '证书已生成，可在线查看。' : certificate === '生成异常' ? '证书生成异常，请联系教务。' : '证书将在结业通过后异步生成。';
  return `<section class="mp-class-detail-block"><h3>结业状态</h3><div class="mp-class-result-status"><div><strong>${esc(completion)}</strong><p>${completionNote}</p></div>${pill(completion, completionTone)}</div></section>${completion === '已结业' ? `<section class="mp-class-detail-block"><h3>结业评语</h3><p>综合评语：课堂参与积极，基本功和组合衔接持续进步。</p><p>成长建议：保持每周练习，关注动作细节和节奏稳定性。</p></section>` : ''}<section class="mp-class-detail-block"><div class="mp-section-head"><h3>学习报告</h3>${pill(report, report === '已发布' ? 'green' : report === '已撤回' ? 'gray' : 'amber')}</div><p>${reportText}</p>${report === '已发布' ? `<a class="mp-button secondary" href="/learner/pages/results.html?courseId=${esc(item.id)}">查看报告详情</a>` : ''}</section><section class="mp-class-detail-block"><div class="mp-section-head"><h3>结业证书</h3>${pill(certificate, certificate === '已生成' ? 'green' : certificate === '生成异常' ? 'gray' : 'amber')}</div><p>${certificateText}</p>${certificate === '已生成' ? `<a class="mp-button secondary" href="/learner/pages/results.html?courseId=${esc(item.id)}">查看证书</a>` : ''}</section>`;
}
function homeworkState() { return state.homework || { status: '未提交', text: '', fileName: '', feedback: '' }; }
function renderHomeworkPage() { const item = course(params.get('courseId') || 'class-001'); const work = homeworkState(); layout(stack(card(`<div class="mp-pills">${pill('待提交', 'amber')}${pill('面授课程', 'gray')}</div><h2 style="margin-top:12px">节奏练习视频</h2><p>${esc(item.name)} · 截止时间：2026-09-27 23:59</p><div class="mp-divider"></div><p>请提交本周节奏练习记录，可以填写文字说明并附加图片、视频或音频文件。</p>`), card(`<form id="homework-form" class="mp-form"><div class="mp-field"><label for="homework-text">作业说明</label><textarea id="homework-text" placeholder="请输入本次作业说明">${esc(work.text)}</textarea></div><div class="mp-field"><label for="homework-file">附件</label><input id="homework-file" type="file" accept="image/*,video/*,audio/*"><small class="mp-muted">演示原型只记录文件名，不上传真实文件。</small><span id="homework-file-name" class="mp-muted">${work.fileName ? `已选择：${esc(work.fileName)}` : '尚未选择附件'}</span></div><p id="homework-error" class="mp-notice" hidden></p><div class="mp-actions"><button type="button" class="mp-button secondary" data-homework-action="save">保存草稿</button><button type="submit" class="mp-button">提交作业</button></div></form>`), work.status === '已提交' ? card(`<h3>教师评语</h3><p>${esc(work.feedback || '教师尚未完成批改。')}</p>`) : ''));
  const fileInput = document.querySelector('#homework-file'); fileInput.addEventListener('change', event => { const file = event.target.files[0]; if (file) document.querySelector('#homework-file-name').textContent = `已选择：${file.name}`; });
  document.querySelector('#homework-form').addEventListener('submit', event => submitHomework(event, false)); document.querySelector('[data-homework-action="save"]').addEventListener('click', () => submitHomework(null, true));
}
function submitHomework(event, draft) { event?.preventDefault(); const text = document.querySelector('#homework-text').value.trim(); const file = document.querySelector('#homework-file').files[0]; const existingFile = homeworkState().fileName; if (!draft && !text && !file && !existingFile) { const error = document.querySelector('#homework-error'); error.hidden = false; error.textContent = '请填写作业说明或选择附件后再提交'; return; } state.homework = { status: draft ? '草稿' : '已提交', text, fileName: file?.name || existingFile, feedback: homeworkState().feedback }; saveState(); toast(draft ? '作业草稿已保存' : '作业已提交'); if (!draft) setTimeout(() => go(`/learner/pages/class-detail.html?courseId=${params.get('courseId') || 'class-001'}&tab=attendance`), 450); }
function reportState() { return state.reportStatus || '已发布'; }
function renderResultsPage() { const item = course(params.get('courseId') || 'class-mock-ended-finished-01'); const status = reportState(); const reportBody = status === '已发布' ? '<p>本报告记录当前学员在课堂参与、作品练习和阶段展示中的学习成果。</p>' : status === '已撤回' ? '<div class="mp-notice">报告暂不可查看，教务正在更新。已结业、结业评语和证书不受影响。</div>' : '<div class="mp-notice">学习报告正在生成中，完成后会通过消息通知学员。</div>'; layout(stack(card(`<div class="mp-pills">${pill('已结业', 'green')}${pill(currentStudent().name, 'gray')}</div><h2 style="margin-top:12px">${esc(item.className || item.name)} · 我的成果</h2><p>以下成果仅针对当前学员。</p>`), card(`<h3>结业评语</h3><p>综合评语：课堂参与积极，基本功和组合衔接持续进步。</p><p>成长建议：保持每周练习，关注动作细节和节奏稳定性。</p>`), card(`<div class="mp-section-head"><h3>学习报告</h3>${pill(status, status === '已发布' ? 'green' : status === '已撤回' ? 'gray' : 'amber')}</div><div style="margin-top:10px">${reportBody}</div><div class="mp-field" style="margin-top:14px"><label for="report-status">演示报告状态</label><select id="report-status"><option ${status === '已发布' ? 'selected' : ''}>已发布</option><option ${status === '已撤回' ? 'selected' : ''}>已撤回</option><option ${status === '生成中' ? 'selected' : ''}>生成中</option></select></div>`), card(`<div class="mp-section-head"><h3>结业证书</h3>${pill('已生成', 'green')}</div><p>证书编号：CERT-2026-0908-001 · 可在线查看。</p>`))); document.querySelector('#report-status').addEventListener('change', event => { state.reportStatus = event.target.value; saveState(); renderResultsPage(); }); }
function paymentStatusLabel(order) { return order?.status === '已取消' && order.cancelType === 'timeout' ? '已取消（超时）' : order?.status || '待支付'; }
function videoWatchedLessonCount(order, item) {
  const progress = readDemoState().progress?.[`${state.accountId}-${item.id}`] || {};
  const ids = new Set([...(Array.isArray(progress.chapterDone) ? progress.chapterDone : []), ...Object.entries(progress.positions || {}).filter(([, seconds]) => Number(seconds) > 0).map(([id]) => id)]);
  const total = Array.isArray(item.outline) && item.outline.length ? item.outline.length : Number(item.lessons || item.hours || 0);
  return [...ids].filter(id => /^chapter-\d+$/.test(id) && (!total || Number(id.slice(8)) <= total)).length;
}
function videoRefundEligibility(order, item) {
  const config = videoRefundSettings();
  if (!order || order.status !== '已支付' || !item || item.type !== 'video') return { eligible: false, watchedLessons: 0, config, reason: '仅已支付视频订单可申请退款。' };
  const paidAt = order.paidAt || order.createdAt;
  const paidTime = paidAt ? new Date(String(paidAt).replace(' ', 'T')).getTime() : NaN;
  const ageDays = Number.isFinite(paidTime) ? Math.max(0, (demoDateTime(DEMO_TODAY).getTime() - paidTime) / 86400000) : Infinity;
  const watchedLessons = videoWatchedLessonCount(order, item);
  if (!Number.isFinite(paidTime) || ageDays > config.windowDays) return { eligible: false, watchedLessons, ageDays, config, reason: `已超过购课${config.windowDays}日退款期限。` };
  if (watchedLessons > config.maxLessons) return { eligible: false, watchedLessons, ageDays, config, reason: `已观看${watchedLessons}课时，超过最多${config.maxLessons}课时的退款条件。` };
  return { eligible: true, watchedLessons, ageDays, config, reason: `购课${Math.floor(ageDays)}日，已观看${watchedLessons}课时，可申请全额退款。` };
}
// 视频退款的状态迁移同时驱动学习授权（字典 SM-VIDEO-ENTITLEMENT）：
// 申请退款即冻结，失败或超时解冻，退款完成置已失效。
function syncVideoEntitlementForRefund(order, item, nextStatus, reason) {
  if (!order || item?.type !== 'video') return false;
  return transitionVideoEntitlement(order.accountId || state.accountId, order.courseId || item.id, nextStatus, {
    reason,
    orderId: order.id,
    refundKey: order.refundBusinessKey || `video_refund:${order.paymentRecordId || order.id}`
  });
}
// 学员端申请退款：列表与详情共用同一入口；视频订单在进入「退款中」的同时冻结学习授权。
function applyRefundApplication(orderId) {
  const order = state.orders.find(row => row.id === orderId);
  const item = order ? orderCourse(order) : null;
  const eligibility = item && item.type === 'video' ? videoRefundEligibility(order, item) : { eligible: Boolean(order?.status === '已支付') };
  if (!order || !eligibility.eligible) { toast(eligibility.reason || '当前订单不满足退款条件', 'error'); return false; }
  order.status = '退款中';
  order.refundAt = order.refundAt || demoTime();
  order.refundStatus = order.refundStatus || '待审核';
  order.refundNo = order.refundNo || `RF-${order.id}`;
  order.refundAmount = Number(order.amount || 0);
  order.refundMethod = order.refundMethod || '微信支付原路退回';
  order.refundExpectedAt = order.refundExpectedAt || '预计 3 个工作日';
  order.refundReason = order.refundReason || (item.type === 'video' ? `视频课程退款：购课${Math.floor(eligibility.ageDays || 0)}日，已观看${eligibility.watchedLessons}课时` : '用户申请退款');
  order.refundBusinessKey = order.refundBusinessKey || `${item.type === 'video' ? 'video' : 'class'}_refund:${order.paymentRecordId || order.id}`;
  syncVideoEntitlementForRefund(order, item, '冻结', '视频退款审核期间学习授权冻结');
  upsertDemoRecord('orders', order);
  saveState();
  return true;
}
function isPaymentResumable(order) { return !order || ['待支付', '已取消'].includes(order.status); }
function studentEnrolledCount(shared, classId) {
  return (shared.enrollments || []).filter(item => item.accountId === state.accountId && item.studentId === state.currentStudentId && item.classId === classId && item.status === '已分班').length;
}
function renderPayment() {
  if (!isLoggedIn()) { const redirect = `${location.pathname}${location.search}`; go(`/login.html?role=learner&redirect=${encodeURIComponent(redirect)}`); return; }
  const selectedOrder = state.orders.find(order => order.id === params.get('orderId'));
  // 修复：orderCourse(undefined) 会经 course() 的兜底落到 state.courses[0]，导致带 classId 的报名页解析成视频课程；
  // 这里改为先按订单，再按 classId→courseId 的顺序解析，只有完全没有入参时才回落到默认课程。
  const requestedOrderId = selectedOrder?.classId || selectedOrder?.courseId || '';
  const requestedParamId = params.get('classId') || params.get('courseId') || '';
  const item = (selectedOrder ? orderCourse(selectedOrder) : null) || course(requestedOrderId || requestedParamId || 'COURSE-CR-2026-0002');
  if (item.objectType === 'class' && !state.students.length) {
    layout(stack(card('<div class="mp-empty"><strong>请先添加学员</strong><p>面授报名必须关联具体学员，添加后可返回当前班级继续报名。</p></div>'), '<a class="mp-button full" href="/learner/pages/student-edit.html">添加学员</a>', `<a class="mp-button secondary full" href="/learner/pages/fast-registration-detail.html?classId=${encodeURIComponent(item.id)}">返回班级</a>`));
    return;
  }
  const orderMatchesItem = order => item.objectType === 'class'
    ? (order.classId === item.id || (!order.classId && order.courseId === item.id))
    : order.courseId === item.id;
  // RM-F-03: an account that already paid for this course never reaches a second payment; it gets a
  // direct entry into learning instead.
  const paidOrder = state.orders.find(order => order.accountId === state.accountId && orderMatchesItem(order) && order.status === '已支付' && (item.objectType !== 'class' || order.studentId === state.currentStudentId));
  if (paidOrder) {
    const isClassOrder = item.objectType === 'class';
    layout(stack(card(`<div class="mp-payment-state success">${pill(isClassOrder ? '已报名' : '已支付', 'green')}<h2>${isClassOrder ? '该班级已完成报名' : '该课程已完成支付'}</h2><p>当前账号已有${isClassOrder ? '该学员的报名' : '该课程的有效订单'}，不支持重复购买。</p></div>`), isClassOrder
      ? `<a class="mp-button full" href="${courseLink(item)}">查看班级</a>`
      : '<a class="mp-button full" href="/learner/pages/learning.html">进入学习</a>', `<a class="mp-button secondary full" href="/learner/pages/order-detail.html?orderId=${encodeURIComponent(paidOrder.id)}">查看订单</a>`));
    return;
  }
  if (selectedOrder?.status === '已支付') { layout(stack(card(`<div class="mp-payment-state success">${pill('已支付', 'green')}<h2>该课程已完成支付</h2><p>当前账号已有生效订单，不支持重复购买。</p></div>`), `<a class="mp-button full" href="/learner/pages/order-detail.html?orderId=${encodeURIComponent(selectedOrder.id)}">查看订单详情</a>`, `<a class="mp-button secondary full" href="${courseLink(item)}">返回课程</a>`)); return; }
  // P1-4: no orderId in the URL means "find the resumable order for the selected student" — an absent
  // order must not short-circuit into the first branch of the ternary.
  const activeOrder = (selectedOrder && isPaymentResumable(selectedOrder)) ? selectedOrder : state.orders.find(order => order.accountId === state.accountId && orderMatchesItem(order) && (item.objectType !== 'class' || order.studentId === state.currentStudentId) && isPaymentResumable(order));
  const previousStatus = activeOrder ? paymentStatusLabel(activeOrder) : '待支付';
  const stateNotice = activeOrder?.status === '已取消' ? `<div class="mp-notice">${esc(activeOrder.paymentReason || '订单已取消')}，继续支付将复用原订单号。</div>` : '';
  const isClassItem = item.objectType === 'class';
  const account = purchaseAccount();
  const subjectRow = isClassItem
    ? `<div class="mp-row"><span class="mp-label">报名学员</span><select id="student-select" style="border:0;background:transparent;color:var(--ink);text-align:right">${state.students.map(student => `<option value="${student.id}" ${student.id === state.currentStudentId ? 'selected' : ''}>${esc(student.name)}</option>`).join('')}</select></div>`
    : `<div class="mp-row"><span class="mp-label">购买账号</span><strong>${esc(account.name)}${account.phone ? `（${esc(account.phone)}）` : ''}</strong></div>`;
  layout(stack(card(`<div class="mp-pills">${pill(item.type === 'video' ? '视频课程' : '面授课程')}${activeOrder ? pill(previousStatus, 'amber') : ''}</div><h2 style="margin-top:10px">${esc(item.name)}</h2><p>${esc(courseMeta(item))}</p>${stateNotice}<div class="mp-divider"></div>${subjectRow}<div class="mp-row"><span class="mp-label">应付金额</span><strong class="mp-price">${money2(item.price)}</strong></div>${isClassItem ? '<p class="mp-notice">请选择本次报名的学员；名额以支付成功为准，提交订单不占用名额。</p>' : ''}${activeOrder ? `<div class="mp-payment-order-ref">订单号：${esc(activeOrder.id)}</div>` : ''}`), card(`<div class="mp-field"><label for="payment-outcome">支付结果（演示）</label><select id="payment-outcome"><option value="success">支付成功</option><option value="pending">未支付</option>${isClassItem ? '<option value="seat-failed">支付成功但最终占位失败</option>' : ''}<option value="cancelled">用户取消</option><option value="timeout">支付超时</option></select></div><label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--muted);margin-top:12px"><input id="agreement" type="checkbox" style="margin-top:3px">我已阅读并同意用户协议、隐私政策和课程报名须知</label><div id="payment-error" class="mp-notice" hidden style="margin-top:12px"></div>`), `<div class="mp-actions"><button class="mp-button full" id="pay-button" type="button">${activeOrder ? '继续支付' : '确认支付'}</button><a class="mp-button secondary full" href="/learner/pages/orders.html">返回订单</a></div>`));
  // P1-4: switching the student re-resolves the resumable order instead of keeping the previous one.
  document.querySelector('#student-select')?.addEventListener('change', event => { state.currentStudentId = event.target.value; saveState(); renderPayment(); });
  document.querySelector('#pay-button').addEventListener('click', () => {
    if (!document.querySelector('#agreement').checked) { const error = document.querySelector('#payment-error'); error.hidden = false; error.textContent = '请先勾选用户协议和报名须知'; return; }
    const now = demoTime(); const outcome = document.querySelector('#payment-outcome').value; const shared = readDemoState(); const isClass = item.objectType === 'class';
    const classRecord = (shared.classes || []).find(row => row.id === item.id);
    // RM-F-03: learner-side orders (seed/session) and shared-store orders are both authoritative here.
    const paidMatcher = order => order.accountId === state.accountId && orderMatchesItem(order) && order.status === '已支付' && (!isClass || order.studentId === state.currentStudentId);
    const paidDuplicate = state.orders.find(paidMatcher) || (shared.orders || []).find(paidMatcher);
    if (paidDuplicate) {
      if (isClass) { toast('当前学员已报名该班级，不支持重复报名', 'error'); return; }
      toast('当前账号已购买该课程，正在进入学习中心', 'error');
      setTimeout(() => go('/learner/pages/learning.html'), 700);
      return;
    }
    // P1-4: match the resumable order for the student selected at submit time.
    const submitOrder = (selectedOrder && isPaymentResumable(selectedOrder)) ? selectedOrder : state.orders.find(order => order.accountId === state.accountId && orderMatchesItem(order) && (!isClass || order.studentId === state.currentStudentId) && isPaymentResumable(order));
    // P2-7 / I1-DEC-12: re-read the class record and re-check capacity right before the atomic deduction.
    if (isClass && outcome !== 'seat-failed') {
      const latestClass = (readDemoState().classes || []).find(row => row.id === item.id) || classRecord || course(item.id);
      const enrolled = Number(latestClass?.enrolled || 0); const capacity = Number(latestClass?.capacity || 0);
      if (capacity && enrolled >= capacity) { toast('该班级名额已被占满，本次报名未成功，请选择其他班级', 'error'); return; }
      if (studentEnrolledCount(shared, item.id) >= 1) { toast('当前学员已报名该班级，不支持重复报名', 'error'); return; }
    }
    const existing = submitOrder || (isClass
      ? { id: `OD${Date.now()}`, courseId: item.courseId, amount: item.price, studentId: state.currentStudentId, accountId: state.accountId, classId: item.id, createdAt: now, paidAt: '' }
      : { id: `OD${Date.now()}`, courseId: item.id, amount: item.price, accountId: state.accountId, classId: '', createdAt: now, paidAt: '' });
    const patch = { ...existing, accountId: state.accountId, courseId: isClass ? item.courseId : item.id, amount: item.price, classId: isClass ? item.id : '', updatedAt: now };
    if (isClass) patch.studentId = state.currentStudentId;
    else delete patch.studentId;
    if (isClass) patch.snapshot = { classId: item.id, className: item.className || item.name, courseId: item.courseId, courseVersion: item.courseVersion, scheduleVersion: item.scheduleVersion, price: Number(item.price), teacher: item.teacher, firstLessonDate: item.firstLessonDate, schedule: item.schedule, campus: item.campus, classroom: item.classroom, trialEnabled: item.trialEnabled, trialFee: item.trialFee, trialPrice: item.trialPrice, trialNote: item.trialNote };
    else patch.snapshot = videoOrderSnapshot(item, item.price, state.accountId);
    if (outcome === 'seat-failed') {
      patch.status = '退款中'; patch.paidAt = now; patch.paymentState = '已到账'; patch.paymentRecordId = patch.paymentRecordId || `PAY-${patch.id}`; patch.refundStatus = '处理中'; patch.refundRetryCount = 0; patch.merchantRefundNo = patch.merchantRefundNo || `MR-${patch.paymentRecordId}`; patch.refundBusinessKey = `seat_refund:${patch.paymentRecordId}`; patch.refundType = '系统免审批原路全额退款'; patch.paymentReason = '支付成功且支付记录已到账，但最终名额占用失败；已发起免审批全额原路退款。未生成报名和分班，不增加人数，不自动调班，不保留资金。可重新选择同专业、适龄且有余位班级。'; patch.cancelType = 'seat-allocation-failed';
      upsertDemoRecord('orders', patch);
    } else if (outcome === 'success') {
      patch.status = '已支付'; patch.paidAt = now; patch.paymentReason = ''; patch.cancelType = '';
      upsertDemoRecord('orders', patch);
      if (isClass) {
        // P0-1: keep the class name (not the batch class name) so the admin record is not rewritten.
        const sourceClass = classRecord || { ...item, id: item.id, name: item.name || item.className, className: item.className || item.name, course: item.courseName || item.name, display: '已展示', enrolled: 0, capacity: Number(item.seats?.split('/')[1] || 1), status: '招生中' };
        const alreadyEnrolled = (shared.enrollments || []).some(row => row.accountId === state.accountId && row.studentId === state.currentStudentId && row.classId === item.id && row.status === '已分班');
        if (!alreadyEnrolled) {
          upsertDemoRecord('enrollments', { id: `${state.accountId}-${state.currentStudentId}-${item.id}`, accountId: state.accountId, studentId: state.currentStudentId, classId: item.id, status: '已分班', enrolledAt: now });
          const sharedRow = (readDemoState().classes || []).find(row => row && typeof row === 'object' && row.id === sourceClass.id);
          const capacity = Number(sharedRow?.capacity || sourceClass.capacity || item.seats?.split('/')[1] || 1);
          const baseline = sharedRow ? Number(sharedRow.enrolled || 0) : Math.max(0, Number(item.seats?.split('/')[1] || 0) - Number(item.seats?.split('/')[0] || 0));
          upsertDemoRecord('classes', { ...sourceClass, courseId: sourceClass.courseId || item.id, course: sourceClass.course || item.courseName || item.name, batch: sourceClass.batch || item.season, status: sourceClass.status || item.classStatus || '招生中', display: sourceClass.display || '已展示', fast: sourceClass.fast || '否', archive: sourceClass.archive || '轻量课程档案', professional: item.professional || sourceClass.professional, age: item.age || sourceClass.age, capacity, enrolled: Math.min(capacity, baseline + 1) });
        }
      } else {
        // 重新购买按新授权起算：显式清空上一次冻结或失效的留痕，避免旧记录污染本次授权。
        upsertDemoRecord('videoEntitlements', { id: `${state.accountId}-${item.id}`, accountId: state.accountId, courseId: item.id, courseVersion: patch.snapshot.courseVersion, snapshot: patch.snapshot, status: '生效', grantedAt: now, updatedAt: now, frozenAt: '', frozenReason: '', freezeRefundKey: '', restoredAt: '', restoreReason: '', invalidatedAt: '', invalidReason: '', invalidatedBy: '', invalidOrderId: '' });
      }
    } else if (outcome === 'pending') {
      patch.status = '待支付'; patch.paidAt = ''; patch.paymentReason = '尚未完成支付，可在订单有效期内继续支付'; patch.cancelType = '';
      upsertDemoRecord('orders', patch);
    } else {
      patch.status = '已取消'; patch.paidAt = ''; patch.paymentReason = outcome === 'timeout' ? '支付超时，订单已关闭' : '用户主动取消支付'; patch.cancelType = outcome === 'timeout' ? 'timeout' : 'cancel'; upsertDemoRecord('orders', patch);
    }
    const index = state.orders.findIndex(order => order.id === patch.id); if (index < 0) state.orders.unshift(patch); else state.orders[index] = { ...state.orders[index], ...patch }; saveState(); toast(outcome === 'seat-failed' ? '报名未成功，退款处理中' : outcome === 'success' ? (isClass ? '支付成功，已自动分班并占用名额' : '支付成功，学习权限已开通') : outcome === 'pending' ? '订单已保留为待支付，可稍后继续支付' : '支付结果已记录，课程权限和面授名额均未生效');
    setTimeout(() => go(`/learner/pages/order-detail.html?orderId=${encodeURIComponent(patch.id)}`), 450);
  });
}
// 旧演示数据兼容：原「支付失败」不是 SM-ORDER 取值，读入时按「已取消」处理（CR-2026-023）。
function normalizeOrderStatus(order) {
  if (!order || order.status !== '支付失败') return order;
  return { ...order, status: '已取消', paymentReason: order.paymentReason || '支付未完成，订单已关闭' };
}
function orderTone(status) { return status === '已支付' || status === '已退款' ? 'green' : status === '待支付' || status === '退款中' ? 'amber' : 'gray'; }
function orderTimes(order) { return { createdAt: order.createdAt || '2026-09-08 14:20', paidAt: order.paidAt || '' }; }
// CR-2026-026 §3.4：订单号可复制；无剪贴板权限时退回到选中复制并给出同一个提示。
function copyOrderNo(orderNo) {
  const fallback = () => {
    const input = document.createElement('textarea');
    input.value = orderNo;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try { document.execCommand('copy'); } catch { /* 无权限时仍给出可手动复制的提示 */ }
    input.remove();
  };
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(orderNo).catch(fallback); toast('订单号已复制'); return; }
  fallback();
  toast('订单号已复制');
}
// CR-2026-026 §3.3：订单凭证字段（支付流水号、支付方式、退款单号、退款金额／方式／状态、预计到账时间）。
function orderCredentials(order) {
  const paid = Boolean(order.paidAt);
  const refunding = order.status === '退款中' || order.status === '已退款';
  return {
    paymentNo: order.paymentNo || order.paymentRecordId || (paid ? `PAY-${order.id}` : ''),
    payMethod: order.payMethod || (paid ? '微信支付' : '未完成支付'),
    paidAt: order.paidAt || '',
    refundNo: order.refundNo || order.merchantRefundNo || (refunding ? `RF-${order.id}` : ''),
    refundAmount: Number(order.refundAmount ?? order.amount ?? 0),
    refundMethod: order.refundMethod || order.refundType || '原路退回',
    refundStatus: order.refundStatus || (order.status === '已退款' ? '已完成' : order.status === '退款中' ? '处理中' : ''),
    refundExpectedAt: order.refundExpectedAt || '',
    refundReason: order.refundReason || order.paymentReason || '用户申请退款'
  };
}
// 支付时限提示：时限由「参数配置 → 待支付订单支付时限」维护（CR-2026-104），超时由服务端关闭为已取消（超时）。
// 本原型按静态时限文案呈现，不跳秒、不自动关闭，也不在本地改写订单状态；真实实现按服务端 pay_deadline_at 计算剩余时限。
const ORDER_PAY_WINDOW_HINT = `请在 ${paymentTimeoutSettings().paymentTimeoutMinutes} 分钟内完成支付，超时订单将自动关闭；继续支付会复用当前订单号。`;
const ORDER_SECTIONS = [
  { key: 'pending', title: '待处理', statuses: ['待支付', '退款中'], note: '需要你处理的动作' },
  { key: 'history', title: '历史订单', statuses: ['已支付', '已退款', '已取消'], note: '已完成的交易记录' }
];
function orderPendingHint(order) {
  if (order.status === '待支付') return ORDER_PAY_WINDOW_HINT;
  if (order.status === '退款中') {
    const credentials = orderCredentials(order);
    return credentials.refundExpectedAt
      ? `退款进度：${credentials.refundStatus}，预计 ${credentials.refundExpectedAt} 到账。`
      : `退款进度：${credentials.refundStatus || '处理中'}。`;
  }
  return '';
}
// 段内排序：待支付按剩余支付时限升序（时限统一，按创建时间升序等价于最紧急在前），退款中按发起时间倒序。
function sortPendingOrders(orders) {
  const paying = orders.filter(order => order.status === '待支付').sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const refunding = orders.filter(order => order.status === '退款中').sort((a, b) => (b.refundAt || b.updatedAt || b.createdAt || '').localeCompare(a.refundAt || a.updatedAt || a.createdAt || ''));
  return [...paying, ...refunding];
}
const sortHistoryOrders = (orders) => [...orders].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
function orderCard(order) {
  const item = orderCourse(order);
  const student = state.students.find(row => row.id === order.studentId) || currentStudent();
  const times = orderTimes(order);
  const isClass = item.type === 'class';
  // I1-DEC-25 / RM-U-01: video orders are keyed by the purchasing account, class orders by account + student.
  const subjectFact = isClass ? `<div><span>当前学员</span><strong>${esc(student.name)}</strong></div>` : `<div><span>购买账号</span><strong>${esc(purchaseAccount().name)}</strong></div>`;
  const detailLink = `/learner/pages/order-detail.html?orderId=${encodeURIComponent(order.id)}`;
  const videoRefund = !isClass ? videoRefundEligibility(order, item) : { eligible: false };
  const primary = isPaymentResumable(order)
    ? `<button class="mp-button mp-order-action" type="button" data-order-action="pay" data-course-id="${item.id}" data-order-id="${order.id}">${order.status === '待支付' ? '去支付' : '继续支付'}</button>`
    : order.status === '已支付' && isClass
      ? `<button class="mp-button secondary mp-order-action" type="button" data-order-action="refund" data-order-id="${order.id}">申请退款</button>`
      : videoRefund.eligible
        ? `<button class="mp-button secondary mp-order-action" type="button" data-order-action="refund" data-order-id="${order.id}">申请全额退款</button>`
      : '';
  const hint = orderPendingHint(order);
  return `<article class="mp-order-card"><div class="mp-order-card-head"><div><strong>${esc(item.name)}</strong><small>${isClass ? '面授课程' : '视频课程'} · ${esc(order.id)}</small></div>${pill(paymentStatusLabel(order), orderTone(order.status))}</div>${hint ? `<p class="mp-order-card-hint">${esc(hint)}</p>` : ''}<div class="mp-order-card-facts">${subjectFact}<div><span>${isClass ? '班级' : '课程类型'}</span><strong>${esc(isClass ? item.className : '视频课程')}</strong></div>${isClass ? `<div><span>上课安排</span><strong>${esc(item.campus)} · ${esc(item.schedule)}</strong></div>` : `<div><span>下单时间</span><strong>${esc(times.createdAt)}</strong></div>`}<div><span>${times.paidAt ? '支付时间' : '订单时间'}</span><strong>${esc(times.paidAt || times.createdAt)}</strong></div>${order.paymentReason ? `<div><span>支付说明</span><strong>${esc(order.paymentReason)}</strong></div>` : ''}</div><div class="mp-order-card-footer"><span>实付 <b>${money2(order.amount || item.price)}</b></span><div class="mp-actions">${primary}<a class="mp-button secondary mp-order-action" href="${detailLink}">${order.status === '退款中' ? '查看退款进度' : '查看详情'}</a></div></div></article>`;
}
function renderOrders() {
  if (!isLoggedIn()) { layout(stack(`<section class="mp-locked"><span class="mp-avatar" aria-hidden="true">单</span><strong>登录后查看我的订单</strong><p>登录后可查看课程交易记录、支付状态和退款进度。</p><a class="mp-button" href="/login.html?redirect=${encodeURIComponent('/learner/pages/orders.html')}">去登录</a></section>`)); return; }
  // CR-2026-023／CR-2026-026：页签固定为 SM-ORDER 五态 + 全部，取值与列表同源；「全部」为待处理 + 历史订单两段式。
  const tabs = [['all', '全部'], ['待支付', '待支付'], ['已支付', '已支付'], ['退款中', '退款中'], ['已退款', '已退款'], ['已取消', '已取消']];
  const orders = state.orders.map(normalizeOrderStatus);
  layout(stack(card(`<div class="mp-tabs" aria-label="订单状态筛选">${tabs.map(([value, label], index) => `<button class="mp-tab ${index === 0 ? 'active' : ''}" data-order-tab="${value}" type="button">${label}<span>${orders.filter(order => value === 'all' || order.status === value).length}</span></button>`).join('')}</div>`), `<div id="order-list" class="mp-order-list" aria-live="polite"></div>`));
  const draw = () => {
    const active = document.querySelector('[data-order-tab].active')?.dataset.orderTab || 'all';
    const list = document.querySelector('#order-list');
    if (active !== 'all') {
      const filtered = sortHistoryOrders(orders.filter(order => order.status === active));
      list.innerHTML = filtered.length ? filtered.map(orderCard).join('') : `<div class="mp-empty">暂无${active}订单</div>`;
    } else if (!orders.length) {
      list.innerHTML = `<div class="mp-empty"><strong>暂无订单</strong><p>挑选一门课程开始学习吧。</p></div><a class="mp-button secondary full" href="/learner/pages/courses.html">去课程库看看</a>`;
    } else {
      list.innerHTML = ORDER_SECTIONS.map(section => {
        const rows = section.key === 'pending'
          ? sortPendingOrders(orders.filter(order => section.statuses.includes(order.status)))
          : sortHistoryOrders(orders.filter(order => section.statuses.includes(order.status)));
        const body = rows.length ? rows.map(orderCard).join('') : `<div class="mp-empty">${section.key === 'pending' ? '暂无待处理订单' : '暂无历史订单'}</div>`;
        return `<section class="mp-order-section"><div class="mp-order-section-head"><h3>${section.title}</h3><span>${rows.length} 笔 · ${section.note}</span></div>${body}</section>`;
      }).join('');
    }
    list.querySelectorAll('[data-order-action="pay"]').forEach(node => node.addEventListener('click', () => { const order = state.orders.find(row => row.id === node.dataset.orderId); go(`/learner/pages/payment.html?${order?.classId ? `classId=${encodeURIComponent(order.classId)}` : `courseId=${encodeURIComponent(node.dataset.courseId)}`}&orderId=${encodeURIComponent(node.dataset.orderId)}`); }));
    list.querySelectorAll('[data-order-action="refund"]').forEach(node => node.addEventListener('click', () => { if (applyRefundApplication(node.dataset.orderId)) { draw(); toast('退款申请已提交，等待后台审核'); } }));
  };
  document.querySelectorAll('[data-order-tab]').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('[data-order-tab]').forEach(item => item.classList.remove('active')); tab.classList.add('active'); draw(); }));
  draw();
}
// 关联卡片：只保留名称 + 一行关键信息 + 跳转按钮，课程与班级细节回到各自详情页。
function orderAssociation(order, item, isClass) {
  // CR-2026-026 §6.1：关联卡片按订单状态分流；面授与视频都按状态取目标，不固定指向班级详情。
  const status = order.status;
  if (isClass) {
    const title = item.className || item.name;
    const line = `${item.teacher}老师 · ${item.schedule || '上课时间以班级详情为准'}`;
    if (status === '已支付') return { title, line, label: '查看班级', href: `/learner/pages/class-detail.html?courseId=${encodeURIComponent(item.id)}` };
    if (status === '待支付' || status === '已取消') return { title, line, label: '去快速报名', href: `/learner/pages/fast-registration-detail.html?classId=${encodeURIComponent(item.id)}` };
    // 已退款与退款中：报名已释放或正在释放，不再提供班级报名入口，只回课程详情。
    return { title: item.courseName || item.name, line: `${item.teacher}老师 · ${item.professional || item.category || '面授课程'}`, label: '查看课程', href: `/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.courseId || item.id)}` };
  }
  const videoLine = `${item.teacher}老师 · 共${item.hours}课时`;
  if (status === '已支付') return { title: item.name, line: videoLine, label: '进入学习', href: '/learner/pages/learning.html' };
  return { title: item.name, line: videoLine, label: '查看课程', href: `/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}` };
}
// 状态 + 下一步指引（CR-2026-026 §3.4）
function orderStatusGuidance(order, isClass) {
  const credentials = orderCredentials(order);
  if (order.status === '待支付') return `${ORDER_PAY_WINDOW_HINT}超时后订单自动关闭，未产生课程授权与面授分班。`;
  if (order.status === '已支付') return '支付已确认，订单交易完成；课程学习与面授报名结果以关联卡片为准。';
  if (order.status === '退款中') return `${credentials.refundExpectedAt ? `退款申请已受理，预计 ${credentials.refundExpectedAt} 到账；` : '退款申请已受理，等待后台审核；'}审核期间${isClass ? '面授报名资格' : '课程学习权限'}暂时冻结。`;
  if (order.status === '已退款') return `退款已完成，${isClass ? '原面授班级名额已释放' : '课程学习权限已关闭'}。`;
  if (order.status === '已取消') return `${order.paymentReason || '订单已取消'}。本次未授权、不分班、不扣减面授名额，可继续支付复用当前订单号。`;
  return '订单状态以系统记录为准。';
}
function renderOrderDetail() {
  if (!isLoggedIn()) { renderOrders(); return; }
  const selectedOrder = state.orders.find(row => row.id === params.get('orderId'));
  const orderIdParam = params.get('orderId');
  if (orderIdParam && !selectedOrder) { layout(stack(card('<div class="mp-empty"><strong>未找到该订单</strong><p>订单不存在或已失效，请返回订单列表查看当前记录。</p></div>'), '<a class="mp-button secondary full" href="/learner/pages/orders.html">返回我的订单</a>')); return; }
  const item = orderCourse(selectedOrder) || course(selectedOrder?.classId || selectedOrder?.courseId || params.get('classId') || params.get('courseId') || 'COURSE-CR-2026-0002');
  const order = selectedOrder || state.orders.find(row => row.classId === item.id || row.courseId === item.id);
  if (!order) { layout(stack(card('<div class="mp-empty"><strong>未找到该订单</strong><p>订单不存在或已失效，请返回订单列表查看当前记录。</p></div>'), '<a class="mp-button secondary full" href="/learner/pages/orders.html">返回我的订单</a>')); return; }
  const student = state.students.find(row => row.id === order.studentId) || currentStudent();
  const times = orderTimes(order);
  const credentials = orderCredentials(order);
  const isClass = item.type === 'class';
  if (isClass && order.cancelType === 'seat-allocation-failed') { renderSeatFailureOrder(order, item, student); return; }
  const isPaid = order.status === '已支付';
  const videoRefund = !isClass ? videoRefundEligibility(order, item) : { eligible: false };
  const canRefund = isClass && isPaid;
  const canVideoRefund = !isClass && videoRefund.eligible;
  const displayStatus = paymentStatusLabel(order);
  const association = orderAssociation(order, item, isClass);
  const refundable = order.status === '退款中' || order.status === '已退款';
  const primaryAction = isPaymentResumable(order)
    ? `<a class="mp-button full" href="/learner/pages/payment.html?${isClass ? `classId=${encodeURIComponent(item.id)}` : `courseId=${encodeURIComponent(item.id)}`}&orderId=${encodeURIComponent(order.id)}">${order.status === '待支付' ? '去支付' : '继续支付'}</a>`
    : isClass && isPaid
      ? `<a class="mp-button full" href="${courseLink(item)}">查看班级</a>`
      : isPaid
        ? `<button class="mp-button full" type="button" data-action="learning">进入学习</button>`
        : '';
  const secondaryAction = canRefund ? button('申请退款', `data-action="refund" data-order-id="${order.id}"`, 'secondary') : canVideoRefund ? button('申请全额退款', `data-action="refund" data-order-id="${order.id}"`, 'secondary') : '';
  layout(stack(
    card(`<div class="mp-order-detail-status">${pill(displayStatus, orderTone(order.status))}<span class="mp-muted">${isClass ? '面授课程订单' : '视频课程订单'}</span></div><div class="mp-order-status-copy">${esc(orderStatusGuidance(order, isClass))}</div>`),
    card(`<div class="mp-section-head"><h3>关联课程</h3><span class="mp-muted">${isClass ? '面授班级' : '视频课程'}</span></div><div class="mp-order-association"><div><strong>${esc(association.title)}</strong><span>${esc(association.line)}</span></div><a class="mp-button secondary" href="${association.href}">${association.label}</a></div><p class="mp-order-association-note">教师、上课时间、教室与学习进度在班级详情与学习页维护，订单详情不重复展开。</p>`),
    card(`<div class="mp-section-head"><h3>金额与支付</h3><span class="mp-muted">交易凭证</span></div><dl class="mp-order-detail-facts"><div><dt>实付金额</dt><dd><strong class="mp-price">${money2(order.amount || item.price)}</strong></dd></div><div><dt>支付方式</dt><dd>${esc(credentials.payMethod)}</dd></div><div><dt>支付流水号</dt><dd>${esc(credentials.paymentNo || '未产生支付流水')}</dd></div><div><dt>支付时间</dt><dd>${esc(credentials.paidAt || '未完成支付')}</dd></div></dl>`),
    refundable ? card(`<div class="mp-section-head"><h3>退款信息</h3>${pill(credentials.refundStatus || '处理中', order.status === '已退款' ? 'green' : 'amber')}</div><dl class="mp-order-detail-facts"><div><dt>退款单号</dt><dd>${esc(credentials.refundNo || '—')}</dd></div><div><dt>退款金额</dt><dd>${money2(credentials.refundAmount)}</dd></div><div><dt>退款方式</dt><dd>${esc(credentials.refundMethod)}</dd></div><div><dt>退款状态</dt><dd>${esc(credentials.refundStatus || '处理中')}</dd></div><div><dt>${order.status === '已退款' ? '实际到账时间' : '预计到账时间'}</dt><dd>${esc(credentials.refundExpectedAt || '以渠道回执为准')}</dd></div><div class="wide"><dt>退款原因</dt><dd>${esc(credentials.refundReason)}</dd></div></dl>${order.status === '退款中' ? '<div class="mp-actions"><button class="mp-button secondary" type="button" data-action="refund-retry-fail" data-order-id="' + esc(order.id) + '">模拟退款失败/超时</button><button class="mp-button" type="button" data-action="refund-success" data-order-id="' + esc(order.id) + '">模拟退款成功回调</button></div>' : ''}`) : '',
    card(`<div class="mp-section-head"><h3>订单信息</h3><span class="mp-muted">交易记录</span></div><dl class="mp-order-detail-facts"><div><dt>订单号</dt><dd class="mp-order-no"><span>${esc(order.id)}</span><button class="mp-button secondary" type="button" data-action="copy-order-no" data-order-no="${esc(order.id)}">复制</button></dd></div><div><dt>下单时间</dt><dd>${esc(times.createdAt)}</dd></div>${isClass ? `<div><dt>报名学员</dt><dd>${esc(student.name)}</dd></div>` : `<div><dt>购买账号</dt><dd>${esc(purchaseAccount().name)}${purchaseAccount().phone ? `（${esc(purchaseAccount().phone)}）` : ''}</dd></div>`}<div><dt>订单类型</dt><dd>${isClass ? '面授课程' : '视频课程'}</dd></div>${!isClass && isPaid ? `<div class="wide"><dt>退款资格</dt><dd>${esc(videoRefund.reason)}${videoRefund.eligible ? ' 申请后将按实付金额全额退款。' : ''}</dd></div>` : ''}${order.paymentReason ? `<div class="wide"><dt>状态说明</dt><dd>${esc(order.paymentReason)}</dd></div>` : ''}</dl>`),
    primaryAction || secondaryAction ? `<div class="mp-order-detail-actions">${primaryAction}${secondaryAction ? `<div class="mp-actions">${secondaryAction}</div>` : ''}</div>` : '',
    `<a class="mp-button secondary full" href="/learner/pages/orders.html">返回我的订单</a>`
  ));
}

function renderSeatFailureOrder(order, item, student) {
  const candidates = (state.classOptions || []).filter(candidate => candidate.id !== item.id && candidate.bookable && candidate.professional === item.professional && candidate.age === item.age);
  const candidateMarkup = candidates.length ? candidates.map(candidate => `<article class="mp-order-recommendation"><div><strong>${esc(candidate.className || candidate.name)}</strong><p>${esc(candidate.teacher)}老师 · ${esc(candidate.campus)} · ${esc(candidate.classroom || '教室待定')}</p><p>${esc(candidate.schedule || '时间待定')} · 余${esc(candidate.seats)} · ${money2(candidate.price)} · 截止${esc(candidate.deadline || '待定')}</p></div><button class="mp-button" type="button" data-action="seat-retry" data-course-id="${esc(candidate.id)}">重新报名</button></article>`).join('') : '<div class="mp-empty">暂无符合条件的班级，请返回班级列表或查看退款进度。</div>';
  layout(stack(
    card(`<div class="mp-order-detail-status">${pill(order.status === '已退款' ? '报名未成功，退款已完成' : '报名未成功，退款处理中', order.status === '已退款' ? 'green' : 'amber')}<span class="mp-muted">面授课程订单</span></div><div class="mp-order-status-copy">支付成功且支付记录已到账，${order.status === '已退款' ? '退款渠道已确认全额原路退款完成。' : '已发起全额原路退款，等待渠道回调。'}</div>`),
    card(`<div class="mp-section-head"><h3>处理结果</h3>${pill('未生成报名/分班', 'gray')}</div><p>支付记录已到账，系统已自动发起免审批全额原路退款。未生成报名和分班记录，未增加班级人数，不自动调班、不保留资金。</p><dl class="mp-order-detail-facts"><div><dt>订单号</dt><dd>${esc(order.id)}</dd></div><div><dt>当前学员</dt><dd>${esc(student.name)}</dd></div><div><dt>支付记录</dt><dd>已到账</dd></div><div><dt>退款状态</dt><dd>${order.status === '已退款' ? '已完成' : order.refundStatus || '处理中'}</dd></div><div><dt>退款方式</dt><dd>免审批全额原路退款</dd></div></dl>`),
    card(`<div class="mp-section-head"><h3>可重新选择的班级</h3><span class="mp-muted">同专业 · 适龄 · 有余位</span></div>${candidateMarkup}`),
    `<div class="mp-actions"><button class="mp-button secondary" type="button" data-action="refund-retry-fail" data-order-id="${esc(order.id)}">模拟退款失败并重试</button><button class="mp-button" type="button" data-action="refund-success" data-order-id="${esc(order.id)}">模拟退款成功回调</button></div><a class="mp-button secondary full" href="/learner/pages/fast-registration.html">${candidates.length ? '返回班级列表' : '返回班级列表 / 查看退款进度'}</a>`
  ));
}
function learningRecords() {
  const videoProgress = state.chapterDone.includes('chapter-003') ? 100 : course('COURSE-CR-2026-0002').progress;
  // 学习中心的班级卡片只来自已分班的真实班级（classSeed + 分班记录），不再引用已退役的 class-001～004，
  // 避免「进入班级」落到课程详情或空态；这里只登记学习状态，班级名称、教师、校区与教室一律取自班级档案。
  const demoLearningState = {
    'class-mock-ended-teaching-01': { lessonStatus: '上课中', lessonNote: '今日 10:00-11:30', nextLesson: '正在上课', homeworkStatus: '待提交' },
    'class-mock-ended-teaching-02': { lessonStatus: '待上课', lessonNote: '09-16 09:00-10:30', nextLesson: '09-16 09:00' },
    'class-mock-ended-teaching-03': { lessonStatus: '已完成', lessonNote: '09-13 10:00-11:30', nextLesson: '09-15 14:00', homeworkStatus: '待教师点评' },
    // 已结课班级的学员结业状态（学员端文案：已结业／补课中／审核中），用于「已获证书」指标与成果入口。
    'class-mock-ended-finished-01': { completionStatus: '已结业' },
    'class-mock-ended-finished-02': { completionStatus: '补课中' },
    'class-mock-ended-finished-03': { completionStatus: '审核中' },
  };
  const records = [
    { id: 'learning-video-001', courseId: 'COURSE-CR-2026-0002', studentIds: ['student-001', 'student-002'], type: 'video', status: 'ongoing', progress: videoProgress, lastPosition: '第3章 · 作品演唱 18:36' }
  ];
  const shared = readDemoState();
  const videoHasAccess = state.orders.some(order => !order.classId && order.courseId === 'COURSE-CR-2026-0002' && order.status === '已支付') || (shared.videoEntitlements || []).some(item => item.accountId === state.accountId && item.courseId === 'COURSE-CR-2026-0002' && item.status === '生效');
  const sharedVideo = (shared.videoEntitlements || []).filter(item => item.accountId === state.accountId && item.status === '生效').map(entitlement => { const progress = shared.progress?.[`${state.accountId}-${entitlement.courseId}`] || {}; return { ...(entitlement.snapshot?.course || {}), courseId: entitlement.courseId, courseVersion: entitlement.courseVersion, studentIds: state.students.map(student => student.id), type: 'video', status: 'ongoing', progress: Number(progress.percent || 0), lastPosition: progress.lastPosition || '尚未开始学习' }; });
  const sharedClassRecords = classSeed.map(seed => ({ ...seed, ...(shared.classes || []).find(row => row.id === seed.id) })).concat((shared.classes || []).filter(row => !classSeed.some(seed => seed.id === row.id)));
  const sharedClassById = new Map(sharedClassRecords.map(record => [record.id, record]));
  const classEnrollments = (shared.enrollments || []).filter(item => item.accountId === state.accountId && item.studentId === state.currentStudentId && item.status === '已分班');
  // 无分班记录的学员（如林知远）沿用同一组演示班级，保证学习中心不空且链接指向真实班级档案。
  if (!classEnrollments.length) Object.keys(demoLearningState).forEach(classId => classEnrollments.push({ classId, studentId: state.currentStudentId }));
  const sharedClasses = classEnrollments.map(enrollment => {
    const record = sharedClassById.get(enrollment.classId) || {};
    const teachingStatus = classTeachingStatus(record);
    const progress = classLessonProgress(record);
    const learningStatus = teachingStatus === '已结课' ? 'ended' : teachingStatus === '授课中' ? 'ongoing' : 'upcoming';
    const totalLessons = progress.total || Number(record.lessons || 0);
    const completedLessons = progress.completed;
    const nextSession = (record.sessions || []).find(session => session.status !== '已完成' && session.status !== '已上课');
    const classItem = classToLearnerItem(record);
    return {
      ...classItem,
      courseId: enrollment.classId,
      studentIds: [state.currentStudentId],
      type: 'class',
      objectType: 'class',
      status: learningStatus,
      progress: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      completedLessons,
      lessons: totalLessons,
      className: record.name || classItem.className,
      classroom: `${record.campus || ''} · ${record.classroom || ''}`.replace(/^ · | · $/g, ''),
      nextLesson: nextSession ? `${nextSession.date} ${nextSession.startTime || nextSession.start || ''}`.trim() : (learningStatus === 'ended' ? '课程已结束' : '待定'),
      lessonNo: Math.min(completedLessons + 1, totalLessons || 1),
      lessonStatus: learningStatus === 'ended' ? '已完成' : learningStatus === 'ongoing' ? '待上课' : '',
      lessonNote: nextSession ? `${nextSession.date} ${nextSession.startTime || nextSession.start || ''}-${nextSession.endTime || nextSession.end || ''}` : '',
      ...(demoLearningState[enrollment.classId] || {}),
    };
  });
  return [...records.filter(item => !isLegacyClassRecord(item)), ...sharedVideo, ...sharedClasses].filter(item => item.studentIds.includes(state.currentStudentId)).map(item => {
    const source = item.type === 'class' ? (sharedClassById.get(item.courseId) || {}) : item.courseId ? course(item.courseId) : {};
    const activeOrderSnapshot = item.type === 'video' ? state.orders.find(order => !order.classId && order.courseId === item.courseId && order.status === '已支付')?.snapshot?.course : null;
    const accessRevoked = item.type === 'video' && !videoHasAccess;
    return { ...source, ...(activeOrderSnapshot || {}), ...item, status: accessRevoked ? 'ended' : item.status, completionStatus: accessRevoked ? '已退款，学习记录保留' : item.completionStatus, name: item.name || item.className || source.name, href: accessRevoked ? '/learner/pages/orders.html' : (item.href || (item.type === 'video' ? `/learner/pages/video.html?courseId=${encodeURIComponent(source.id)}` : item.type === 'class' ? `/learner/pages/class-detail.html?courseId=${encodeURIComponent(item.classId || item.courseId)}` : courseLink(item))), accessRevoked };
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
  const lessonTone = item.lessonStatus === '上课中' ? 'amber' : item.lessonStatus === '已完成' ? 'green' : item.lessonStatus === '已停课' ? 'gray' : '';
  const totalLessons = item.lessons || item.totalLessons || 0;
  const completedLessons = item.completedLessons ?? Math.round((item.progress || 0) * totalLessons / 100);
  const courseStatus = item.status === 'ongoing' ? '' : pill(statusLabels[item.status], statusTones[item.status]);
  const homeworkTone = item.homeworkStatus === '待教师点评' ? 'green' : 'amber';
  const homeworkInfo = item.homeworkStatus ? ` ${pill(`作业：${item.homeworkStatus}`, homeworkTone)}` : '';
  const classInfo = item.lessonStatus
    ? `<div class="mp-learning-lesson-row"><span>第${esc(item.lessonNo)}/${esc(totalLessons)}课</span>${pill(item.lessonStatus, lessonTone)}${homeworkInfo}</div><p class="mp-learning-schedule">${esc(item.lessonNote || item.nextLesson)} · ${esc(item.classroom)}</p>`
    : `<p class="mp-learning-schedule">${item.status === 'upcoming' ? `首次上课：${esc(item.nextLesson)}` : item.status === 'ended' ? '课程已结束' : esc(item.nextLesson)} · ${esc(item.classroom)}</p>`;
  const videoInfo = `<p class="mp-learning-resume">上次学习：${esc(item.lastPosition)}</p>`;
  const progressLabel = isClass ? `已完成 ${completedLessons}/${totalLessons} 课次` : '学习进度';
  const actionLabel = item.accessRevoked ? '查看订单' : item.status === 'ended' ? '查看成果' : isClass ? '进入班级' : '继续学习';
  return `<article class="mp-learning-course-card ${isClass ? 'is-class' : 'is-video'}"><div class="mp-learning-course-main"><div class="mp-learning-cover ${isClass ? 'class-cover' : 'video-cover'}" data-cover-mark="${esc(coverMark)}"><span>${typeLabel}</span></div><div class="mp-learning-course-copy"><div class="mp-learning-title-row"><h3>${esc(item.name)}</h3>${courseStatus}</div>${isClass ? `<p class="mp-learning-class-name">${esc(item.className)}</p>${classInfo}` : videoInfo}</div></div><div class="mp-learning-progress"><div><span>${progressLabel}</span><strong>${item.progress}%</strong></div><div class="mp-progress"><span style="width:${item.progress}%"></span></div></div><footer class="mp-learning-course-footer">${item.status === 'ended' ? `<span class="mp-learning-completion">当前学员：${esc(item.completionStatus)}</span>` : '<span></span>'}<a class="mp-button secondary" href="${item.href}">${actionLabel}</a></footer></article>`;
}
function learningCoursePriority(item) {
  if (item.type === 'class' && item.lessonStatus === '上课中') return 0;
  if (item.type === 'class' && item.status === 'ongoing') return 1;
  if (item.type === 'video' && item.status === 'ongoing') return 2;
  if (item.status === 'upcoming') return 3;
  return 4;
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
    const sortedCourses = [...filtered].sort((a, b) => {
      const priority = learningCoursePriority(a) - learningCoursePriority(b);
      if (priority !== 0) return priority;
      return String(a.nextLesson || a.lastPosition || '').localeCompare(String(b.nextLesson || b.lastPosition || ''));
    });
    const courseList = sortedCourses.length
      ? `<div class="mp-learning-course-list">${sortedCourses.map(learningCourseCard).join('')}</div>`
      : '<div class="mp-learning-type-empty">暂无课程</div>';
    const activeCount = records.filter(item => item.status !== 'ended').length;
    const certificates = records.filter(item => item.status === 'ended' && item.completionStatus === '已结业').length;
    const visibleTasks = tasks.slice(0, 2);
    const taskSummary = tasks.length
      ? `<div class="mp-learning-inline-tasks"><div class="mp-learning-inline-task-head"><strong>待办</strong><span>${tasks.length}项</span></div><div class="mp-learning-task-list">${visibleTasks.map(task => `<a class="mp-learning-task" href="${task.href}"><div><strong>${esc(task.title)}</strong><small>${esc(task.detail)}</small></div>${pill(task.label, task.tone)}</a>`).join('')}</div>${tasks.length > 2 ? `<span class="mp-learning-task-more">还有 ${tasks.length - 2} 项待处理</span>` : ''}</div>`
      : '';
    layout(stack(
      card(`<div class="mp-learning-student"><div><span class="mp-muted">当前学员</span><strong>${esc(currentStudent().name)}</strong></div><div class="mp-field"><label class="mp-sr-only" for="learning-student-select">切换当前学员</label><select id="learning-student-select">${state.students.map(student => `<option value="${student.id}" ${student.id === state.currentStudentId ? 'selected' : ''}>${esc(student.name)}</option>`).join('')}</select></div></div><div class="mp-section-head mp-learning-summary-head"><h2>学习概况</h2></div><div class="mp-metric-grid mp-learning-metrics"><div class="mp-metric"><strong>${activeCount}</strong><span>在读课程</span></div><div class="mp-metric"><strong>${attendanceRates[state.currentStudentId] || 0}%</strong><span>总出勤率</span></div><div class="mp-metric"><strong>${tasks.length}</strong><span>待办</span></div><div class="mp-metric"><strong>${certificates}</strong><span>已获证书</span></div></div>${taskSummary}`, 'mp-learning-summary-card'),
      `<section class="mp-learning-section"><div class="mp-section-head"><h2>我的课程</h2><span class="mp-muted">${records.length}门</span></div><div class="mp-tabs mp-learning-tabs" role="tablist">${Object.entries(statusLabels).map(([status, label]) => `<button class="mp-tab ${status === activeStatus ? 'active' : ''}" type="button" role="tab" aria-selected="${status === activeStatus}" data-learning-status="${status}">${label}<span>${records.filter(item => item.status === status).length}</span></button>`).join('')}</div>${courseList}</section>`
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
  const maxBirthMonth = toLocalMonthString();
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
    if (student) {
      Object.assign(student, values);
      upsertDemoRecord('students', { ...student, accountId: state.accountId });
    }
    else {
      const newStudent = { id: `student-${Date.now()}`, ...values };
      state.students.push(newStudent);
      state.currentStudentId = newStudent.id;
      upsertDemoRecord('students', { ...newStudent, accountId: state.accountId });
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
    state.consultations.unshift({ id: `C${Date.now()}`, courseId: params.get('courseId') || 'COURSE-CR-2026-0002', status: '待回复', text: '已提交 · 等待课程顾问联系。', submittedAt: toLocalDateTimeString(), reply: '', replyAt: '', progress: '待跟进', anonymous: !isLoggedIn() });
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
  const item = order ? orderCourse(order) : null;
  if (!order || order.status !== '退款中' || !item) return;
  const success = action === 'refund-success';
  order.paymentRecordId = order.paymentRecordId || `PAY-${order.id}`;
  order.merchantRefundNo = order.merchantRefundNo || `MR-${order.paymentRecordId}`;
  order.refundBusinessKey = order.refundBusinessKey || `${item.type === 'video' ? 'video' : 'seat'}_refund:${order.paymentRecordId}`;
  if (!success) order.refundRetryCount = Number(order.refundRetryCount || 0) + 1;
  order.refundStatus = success ? '已完成' : '重试中';
  order.status = success ? '已退款' : '退款中';
  order.refundedAt = success ? demoTime() : '';
  order.paymentReason = success
    ? `${item.type === 'video' ? '视频课程退款' : '退款渠道'}成功回调，退款已完成；${item.type === 'video' ? '学习授权已置为已失效并留痕，学习记录与订单凭证保留。' : '未生成报名和分班，未增加人数。'}`
    : '退款渠道失败或超时，订单保持退款中，已按同一业务键重试；学习授权已解冻恢复生效。';
  upsertDemoRecord('orders', order);
  // 字典 SM-VIDEO-ENTITLEMENT：成功置已失效并留痕，失败或超时解冻恢复生效；两种路径都保留授权记录。
  syncVideoEntitlementForRefund(order, item, success ? '已失效' : '生效', success ? '视频退款完成，学习授权已失效' : '退款失败或超时，学习授权解冻恢复生效');
  saveState();
  renderOrderDetail();
  toast(success ? '退款成功回调已确认，学习授权已失效' : '退款失败或超时，订单保持退款中，学习授权已解冻，可按原业务键重试');
});
document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'seat-retry') {
    const classId = event.target.closest('[data-course-id]').dataset.courseId;
    const dialog = document.createElement('dialog');
    dialog.innerHTML = `<form method="dialog" class="mp-dialog-card"><h2>确认重新报名</h2><p>将进入所选班级的报名支付页面，当前订单退款流程不变。</p><div class="mp-actions"><button value="cancel" class="mp-button secondary">取消</button><button value="confirm" class="mp-button">确认重新报名</button></div></form>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.addEventListener('close', () => { if (dialog.returnValue === 'confirm') go(`/learner/pages/payment.html?classId=${encodeURIComponent(classId)}`); dialog.remove(); }, { once: true });
  }
  if (action === 'courses') go('/learner/pages/courses.html');
  if (action === 'consult') showConsultDialog();
  if (action === 'share') toast('课程分享卡片已生成');
  if (action === 'buy') {
    const item = course(event.target.closest('[data-course-id]').dataset.courseId);
    if (item.objectType === 'class' && !item.bookable) { toast(item.unavailableReason || `当前状态为${item.learnerStatus}，暂不可报名`); return; }
    if (item.objectType === 'class') { go(`/learner/pages/fast-registration-detail.html?classId=${encodeURIComponent(item.id)}`); return; }
    const detailPath = `/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.id)}`;
    if (!isLoggedIn()) go(`/login.html?redirect=${encodeURIComponent(detailPath)}`);
    else go(`/learner/pages/payment.html?courseId=${encodeURIComponent(item.id)}`);
  }
  if (action === 'learning') go('/learner/pages/video.html');
  if (action === 'homework') go(`/learner/pages/homework.html?courseId=${event.target.closest('[data-course-id]').dataset.courseId}`);
  if (action === 'switch-student') switchStudent();
  if (action === 'copy-order-no') { const orderNo = event.target.closest('[data-order-no]')?.dataset.orderNo || ''; if (orderNo) copyOrderNo(orderNo); }
  if (action === 'refund') {
    if (!applyRefundApplication(event.target.closest('[data-order-id]')?.dataset.orderId)) return;
    renderOrderDetail();
    toast('退款申请已提交，等待后台审核');
  }
});

subscribeDemoState(() => {
  state = readState();
  if (path.endsWith('/index.html') || path.endsWith('/learner/')) renderHome();
  if (path.endsWith('/teachers.html')) renderTeachers();
  if (path.endsWith('/courses.html')) renderCourses();
  if (path.endsWith('/fast-registration.html')) renderFastRegistration();
  if (path.endsWith('/learning.html')) renderLearning();
  if (path.endsWith('/orders.html')) renderOrders();
  if (path.endsWith('/order-detail.html')) renderOrderDetail();
});

// CR-2026-039：需要登录的页面未登录一律直接跳转登录页并带回跳地址；
// 学员端「我的」页（profile）保留登录入口卡片与菜单，发现类内容页仍可未登录浏览。
if (isMiniLoggedIn() && !isMiniRole('learner') && !isLearnerPublicPage(miniPageName(path))) {
  redirectMiniLogin('learner');
} else if (!isLearnerPublicPage(miniPageName(path)) && !isMiniLoggedIn()) {
  redirectMiniLogin('learner');
} else if (path.endsWith('/index.html') || path.endsWith('/learner/')) renderHome();
else if (path.endsWith('/courses.html')) renderCourses();
// 详情页深链：缺参或参数格式非法直接跳回列表；可解析但对象失效走空态，不再兜底成第一门课程（ZK-B-18／ZK-B-21）。
else if (path.endsWith('/course-detail.html')) {
  if (!isDeepLinkIdUsable(params.get('courseId'))) go('/learner/pages/courses.html');
  else renderCourseDetail(resolveDeepLinkTarget(params.get('courseId')));
}
else if (path.endsWith('/fast-registration.html')) renderFastRegistration();
else if (path.endsWith('/fast-registration-detail.html')) {
  const classDeepLinkId = params.get('classId') || params.get('courseId');
  if (!isDeepLinkIdUsable(classDeepLinkId)) go('/learner/pages/fast-registration.html');
  else renderFastRegistrationDetail(resolveDeepLinkTarget(classDeepLinkId));
}
else if (path.endsWith('/class-detail.html')) {
  const classDeepLinkId = params.get('courseId') || params.get('classId');
  if (!isDeepLinkIdUsable(classDeepLinkId)) go('/learner/pages/fast-registration.html');
  else renderClassDetail(resolveDeepLinkTarget(classDeepLinkId));
}
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

// 学员端与后台共用字段规格：按页面路径应用输入约束。
mountFieldConstraints('learner/' + (path.split('/').pop() || '').replace('.html', ''));

// 页面说明入口：内容来自 spec/fields/，与后台共用同一份字段口径。
mountPageHelp({ pageKey: 'learner/' + (path.split('/').pop() || '').replace('.html', ''), title: document.title });
