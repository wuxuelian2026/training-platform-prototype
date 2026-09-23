import { relativePath } from './paths.js';
import { mountFieldConstraints } from './field-constraints.js';
import { mountPageHelp } from './page-help.js';
import { toLocalDateString } from './date-utils.js';
import { mountMobileSettings } from './mobile-settings.js';
import { mountMobileMessageDetail, mountMobileMessageList } from './mobile-messages.js';
import { certificateExpirySettings, demoId, demoTime, dictionaryItems, fileSpecSettings, getCurrentAccountId, readDemoState, upsertDemoRecord, writeDemoState } from './demo-store.js';
import { DEMO_TODAY } from './demo-clock.js';
import { classSeed, mergeClassSeed } from './class-seed.js';
import { venueSeed } from './venue-seed.js';
import { classRosterFor } from './class-roster.js';
import { classAttendanceSummary, classHomeworkSummary, countedSessionsOf, lessonAttendance, lessonHomework, studentAttendanceHistory, studentAttendanceRate, studentHomeworkHistory, studentHomeworkRate } from './lesson-records.js';
import { applicationSeed, courseIdForApplication, defaultTeacherId, teacherAccounts } from './course-seed.js';
import { courseAgesText } from './course-display.js';
import { teacherFactsById } from './teacher-facts.js';
import { isMiniLoggedIn, isMiniRole, redirectMiniLogin } from './mobile-guard.js';
import { certificateSourceLabel, findDuplicateCertificate } from './certificate-source.js';
import { contractDocumentHtml } from './contract-document.js';
import { contractSignDeadline } from './contract-terms.js';
import { applyFieldConstraints } from './field-constraints.js';
import { TEACHER_PROFILE_EDITABLE_FIELDS as teacherProfileEditableFields, TEACHER_PROFILE_GROUPS as teacherProfileGroups, TEACHER_PROFILE_GROUP_NOTE as teacherProfileGroupNote, teacherProfileMask } from './teacher-profile-fields.js';

// CR-2026-104：证书文件规格读取「参数配置 → 文件上传规格」，与后台证书录入同一份配置。
function certificateFileSpecText() {
  const spec = fileSpecSettings();
  return `图片不超过${spec.imageMb}MB，文档不超过${spec.documentMb}MB`;
}
const teacherMain = document.querySelector('.mobile-main');
const teacherPath = location.pathname;
// I1-DEMO-08：教师端演示状态按登录教师隔离（原为单一 key，切换演示账号会复用上一个账号的状态）。
const teacherKey = `hbyx-mini-teacher-demo:${sessionStorage.getItem('hbyx-teacher-id') || new URLSearchParams(location.search).get('teacher') || 'default'}`;
// I1-DEMO-02：教师端所有演示内容以当前登录教师归属（切换演示账号后姓名、工号、专业与任课班级随之变化）。
const currentTeacherAccount = () => currentTeacher();
const currentTeacherName = () => currentTeacherAccount().name;
const currentTeacherMajor = () => currentTeacherAccount().major || currentTeacherAccount().professional;
const currentTeacherAvatar = () => (currentTeacherAccount().name || '师').slice(0, 1);
// I1-DEMO-03：我的班级与课表取当前教师任教的已发布班级（与学员端同一份班级库）。
function teacherClassFromSeed(seed) {
  const sessions = seed.sessions || [];
  const completed = sessions.filter((session) => isSessionPast(session)).length;
  const total = sessions.length || Number(seed.lessons || 0);
  // 注意：这里在模块初始化阶段也会被调用，不能引用后面才声明的 calendarToday（TDZ）。
  const status = !sessions.length ? '待开课' : completed >= total ? '已结束' : (seed.firstLessonDate > DEMO_TODAY ? '待开课' : '进行中');
  return {
    id: seed.id, name: seed.name, course: seed.course || seed.courseName, professional: seed.professional,
    teacher: seed.teacher, campus: seed.campus, classroom: seed.classroom,
    students: Number(seed.enrolled || 0), capacity: Number(seed.capacity || 0),
    completed, total, status, schedule: seed.schedule, firstLessonDate: seed.firstLessonDate, sessions,
    // CR-2026-132：透出教务在后台产生的课次调整留痕，教师端课次详情只读展示「最近调整」。
    adjustmentLogs: seed.adjustmentLogs || [],
    // CR-2026-134：透出班级的作业演示状态（未提交／点评中／点评完成）。
    demoHomework: seed.demoHomework || '',
    // 班级卡片上的「下一节课」：取该班今天之后最近的一次课；全部结束则给出完成文案。
    next: (() => {
      // 未排课班级没有课次，不能因为「总课时>0」就显示成全部完成（CR-2026-134）。
      if (!sessions.length) return '待教务排课';
      const upcoming = sessions.find((session) => session.date >= DEMO_TODAY && session.status !== '已停课');
      if (!upcoming) return total ? '全部课次已完成' : '待教务排课';
      return `${upcoming.date.slice(5)} ${upcoming.weekday || ''} ${upcoming.startTime || ''}-${upcoming.endTime || ''}`;
    })()
  };
}
// CR-2026-132：与学员端、后台同一份班级数据（种子 + 演示状态），教务调课／停课结果教师端可见。
function currentTeacherClasses() {
  return mergeClassSeed(readDemoState().classes || []).filter((seed) => seed.teacher === currentTeacherName()).map(teacherClassFromSeed);
}
function isSessionPast(session) {
  return Boolean(session && session.date && session.date < DEMO_TODAY);
}
// 教师端课表课次：由当前教师的班级课次派生，与学员端班级详情同一份数据。
function sessionVenueOf(session, classItem) {
  const room = venueSeed.find((entry) => entry.id === (session && session.roomId));
  return { campus: room ? room.campus : classItem.campus, room: room ? room.name : classItem.classroom };
}
function teacherScheduleSessions() {
  return currentTeacherClasses().flatMap((item) => (item.sessions || []).map((session) => {
    const venue = sessionVenueOf(session, item);
    return {
      id: `${item.id}#${session.index || session.date}`,
      classId: item.id, className: item.name, courseName: item.course, lessonNo: session.index,
      date: session.date, time: `${session.startTime || ''}-${session.endTime || ''}`,
      campus: venue.campus, room: venue.room, students: item.students,
      // CR-2026-132：教务停课的课次在教师课表按「已停课」呈现，不再误显示为待上课。
      status: isSessionPast(session) ? '已完成' : session.status === '已停课' ? '已停课' : session.status === '上课中' ? '上课中' : '待上课'
    };
  })).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}
function teacherScheduleByDate() {
  return teacherScheduleSessions().reduce((map, lesson) => { (map[lesson.date] = map[lesson.date] || []).push(lesson); return map; }, {});
}
const teacherProfileDefaults = {
  gender: '女',
  birthMonth: '1990-05',
  politicalStatus: '中共党员',
  ethnicity: '汉族',
  highestEducation: '本科',
  teachingYears: (currentTeacherAccount().years || "8年").replace("年", ""),
  professionalTitle: currentTeacherAccount().title,
  mobile: '138****2026',
  email: `${currentTeacherAccount().id.replace("teacher-", "")}@hbyx.edu.cn`,
  emergencyName: '紧急联系人',
  emergencyMobile: '139****9018',
  payeeName: currentTeacherName(),
  bankCard: '6217 **** **** 2866',
  bankName: '中国建设银行武汉光谷支行',
  carPlate: '鄂A·9X2R6',
  education: `2010.09-2014.06，${currentTeacherAccount().unit}${currentTeacherMajor()}专业，本科。`,
  employment: `2018.07至今，${currentTeacherAccount().unit}${currentTeacherMajor()}教师。`,
  awards: '2024年湖北省职业院校技能大赛优秀指导教师。',
  tagline: `把每一次${currentTeacherMajor()}练习，都变成看得见的进步。`,
  introduction: `长期从事${currentTeacherMajor()}教学，注重基础训练与课堂表现的结合。`
};

// I1-DEMO-07：证书／合同／工资／消息／结业申请的演示数据按当前登录教师归位。
// 只做身份与专业/班级文案替换，不改条数与状态分布，避免影响既有流转演示。
function demoDemoTeacherContext() {
  const id = sessionStorage.getItem('hbyx-teacher-id') || new URLSearchParams(location.search).get('teacher') || defaultTeacherId();
  const account = teacherAccounts.find((item) => item.id === id) || teacherAccounts[0];
  const classes = classSeed.filter((seed) => seed.teacher === account.name).map(teacherClassFromSeed);
  return { account, primary: classes[0], secondary: classes[1] || classes[0] };
}
function demoLocalize(value) {
  if (typeof value === 'string') {
    const { account, primary, secondary } = demoDemoTeacherContext();
    return value
      .replace(/王玥/g, account.name)
      .replace(/中国舞/g, account.major)
      .replace(/舞蹈表演/g, account.professional)
      .replace(/少儿舞蹈基础班/g, primary ? primary.name : `${account.major}基础班`)
      .replace(/少儿舞蹈提高班/g, secondary ? secondary.name : `${account.major}提高班`)
      .replace(/舞蹈基本功/g, primary ? primary.course : account.major);
  }
  if (Array.isArray(value)) return value.map(demoLocalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, demoLocalize(item)]));
  return value;
}

// I1-DEMO-09：教师端「我的证书／我的合同」取事实库（teacher-facts），与后台证书/合同同源，条数一致。
// 编号／颁发机构／签署日期等事实库未提供的字段按专业与状态生成演示值，不改事实库本身。
function certificateRowsFromFacts() {
  const facts = teacherFactsById(currentTeacherIdForDemo());
  if (!facts || !Array.isArray(facts.certificates) || !facts.certificates.length) return null;
  const majors = facts.majors || [];
  return facts.certificates.map((cert, index) => {
    const template = teacherCertificateDefaults.find((row) => row.id === cert.id) || {};
    const issueYear = (cert.expiresAt || '').slice(0, 4) || '2026';
    const prefix = cert.type === '学历证书' ? 'XL' : cert.type === '教师资格证' ? 'JS' : 'ZJ';
    return {
      id: cert.id,
      name: cert.name,
      number: template.number || `${prefix}-${issueYear}-${String(index + 1).padStart(4, '0')}`,
      type: cert.type,
      issuer: template.issuer || (cert.type === '学历证书' ? '湖北艺术学院' : `${(cert.majors || majors)[0] || '专业'}协会`),
      issuedAt: template.issuedAt || `${Number(issueYear) - 3}-09-01`,
      expiresAt: cert.expiresAt || '',
      status: cert.status,
      source: '后台录入',
      majors: cert.majors || majors,
      file: template.file || `${cert.name}.pdf`,
      fileVersion: 'v1',
      reviewedAt: template.reviewedAt || '2026-09-08 10:00',
      reviewNote: '后台录入默认通过。'
    };
  });
}
function contractRowsFromFacts() {
  const facts = teacherFactsById(currentTeacherIdForDemo());
  if (!facts || !Array.isArray(facts.contracts) || !facts.contracts.length) return null;
  const campus = currentTeacherClasses()[0]?.campus || '南湖校区';
  return facts.contracts.map((contract) => {
    const template = teacherContractDefaults.find((row) => row.number === contract.number) || {};
    const startYear = String(contract.startAt || '').slice(0, 4);
    const endYear = String(contract.endAt || '').slice(0, 4);
    const signed = contract.status === '已签署';
    return {
      id: `contract-${contract.number}`,
      number: contract.number,
      name: template.name || `${startYear}-${endYear}年度教师合作协议`,
      type: '合作协议',
      status: contract.status,
      startAt: contract.startAt,
      endAt: contract.endAt,
      course: (contract.courses || []).join('、'),
      majors: contract.majors || [],
      campus: template.campus || campus,
      rate: template.rate || 180,
      note: contract.status === '待教师签署' ? '请下载、线下签署并上传本人签署件。' : contract.status === '已签署' ? '双方签署完成，按合同条款执行。' : template.note || '',
      pushedAt: template.pushedAt || `${contract.startAt} 09:00`,
      teacherSignedAt: signed ? (template.teacherSignedAt || contract.startAt) : '',
      schoolSignedAt: signed ? (template.schoolSignedAt || contract.startAt) : '',
      file: template.file || `${contract.number}-合同.pdf`,
      teacherFile: signed ? `${contract.number}-教师签署件.pdf` : '',
      schoolFile: signed ? `${contract.number}-学校签署件.pdf` : '',
      renewedFrom: template.renewedFrom || '',
      terminatedAt: template.terminatedAt || '',
      terminateReason: template.terminateReason || ''
    };
  });
}
function currentTeacherIdForDemo() {
  return sessionStorage.getItem('hbyx-teacher-id') || new URLSearchParams(location.search).get('teacher') || defaultTeacherId();
}
const teacherCertificateDefaults = [
  { id: 'cert-001', name: '中国舞教师资格证', number: 'WD-2019-0028', type: '艺术等级证', issuer: '中国舞蹈家协会', issuedAt: '2019-10-01', expiresAt: '2027-09-30', status: '已通过', validity: '有效', source: '后台录入', majors: ['中国舞', '民族民间舞'], file: '中国舞教师资格证-WD-2019-0028.pdf', reviewedAt: '2026-01-04', reviewNote: '证书编号、发证机构和文件内容已核验。' },
  { id: 'cert-002', name: '本科学历证书', number: 'HBYS-2014-0618', type: '学历证书', issuer: '湖北艺术学院', issuedAt: '2014-06-20', expiresAt: '', status: '已通过', validity: '有效', source: '后台录入', majors: ['中国舞'], file: '本科学历证书.pdf', reviewedAt: '2026-09-07', reviewNote: '后台录入默认通过。' },
  { id: 'cert-003', name: '少儿舞蹈教师培训证', number: 'SEWD-2026-0902', type: '教师资格证', issuer: '湖北省舞蹈家协会', issuedAt: '2026-08-28', expiresAt: '2029-08-27', status: '待审核', validity: '有效', source: '教师端上传', majors: ['中国舞', '少儿舞蹈'], file: '少儿舞蹈教师培训证.jpg', reviewNote: '已提交，等待教研审核。' },
  { id: 'cert-004', name: '舞蹈编导专项培训证', number: 'WDBD-2023-0186', type: '其他', issuer: '湖北省艺术教育协会', issuedAt: '2023-07-12', expiresAt: '2028-07-11', status: '已驳回', validity: '有效', source: '教师端上传', majors: ['舞蹈编导'], file: '舞蹈编导专项培训证.jpg', reviewedAt: '2026-09-08', reviewNote: '证书照片右下角信息不完整，请重新拍摄清晰完整的证书。' },
  { id: 'cert-005', name: '中国舞等级考试考官证', number: 'KG-2022-1056', type: '艺术等级证', issuer: '中国舞蹈家协会', issuedAt: '2022-10-01', expiresAt: '2026-10-15', status: '已通过', validity: '即将过期', source: '教师端上传', majors: ['中国舞'], file: '中国舞等级考试考官证.pdf', reviewedAt: '2022-10-06', reviewNote: '证书信息已核验，请在有效期结束前办理续期。' }
];
const teacherContractDefaults = [
  { id: 'contract-2027', name: '2026-2027年度教师合作协议', number: 'CT2026090021', type: '合作协议', status: '待教师签署', startAt: '2026-10-01', endAt: '2027-09-30', signedAt: '', version: 'v1', rate: 180, campus: '龙泉校区', course: '舞蹈基本功', file: 'CT2026090021-待签署合同.pdf', teacherFile: '', schoolFile: '', pushedAt: '2026-09-13', renewedFrom: 'CT2026010008', note: '请下载待签署合同，线下手写签署后上传 PDF。' },
  { id: 'contract-2026', name: '2026年度教师合作协议', number: 'CT2026010008', type: '合作协议', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', signedAt: '2026-01-03', teacherSignedAt: '2026-01-02', schoolSignedAt: '2026-01-03', teacherFile: 'CT2026010008-教师签署件.pdf', schoolFile: 'CT2026010008-学校签署件.pdf', version: 'v1', rate: 180, campus: '龙泉校区', course: '舞蹈基本功', file: 'CT2026010008-学校签署件.pdf', pushedAt: '2026-01-02', note: '教师签署件与学校盖章件均已归档，按有效课次计薪。' },
  { id: 'contract-2025', name: '2025年度教师合作协议', number: 'CT2025010006', type: '合作协议', status: '已签署', startAt: '2025-01-01', endAt: '2025-12-31', signedAt: '2025-01-02', teacherSignedAt: '2024-12-30', schoolSignedAt: '2025-01-02', teacherFile: 'CT2025010006-教师签署件.pdf', schoolFile: 'CT2025010006-学校签署件.pdf', version: 'v1', rate: 165, campus: '龙泉校区', course: '舞蹈基本功', file: 'CT2025010006-学校签署件.pdf', pushedAt: '2024-12-28', note: '合同已到期，仅供历史查询。' },
  { id: 'contract-2024', name: '2024年度教师合作协议', number: 'CT2024010004', type: '合作协议', status: '已终止', startAt: '2024-01-01', endAt: '2024-12-31', signedAt: '2024-01-03', teacherSignedAt: '2024-01-02', schoolSignedAt: '2024-01-03', teacherFile: 'CT2024010004-教师签署件.pdf', schoolFile: 'CT2024010004-学校签署件.pdf', version: 'v2', rate: 150, campus: '南湖校区', course: '舞蹈基本功', file: 'CT2024010004-学校签署件.pdf', pushedAt: '2023-12-25', terminatedAt: '2024-10-31', terminateReason: '因授课安排调整，双方协商终止本合同。', note: '因授课安排调整，双方协商终止本合同。' }
];
const teacherGraduationDefaults = [
  { id: 'graduation-001', student: '林知夏', avatar: '林', className: '少儿舞蹈基础班', course: '舞蹈基本功', professional: '舞蹈表演', completedAt: '2026-09-02', submittedAt: '2026-09-03 10:20', status: '审核中', attendanceRate: 95, homeworkRate: 100, lessons: '20/20', comment: '能够认真完成基本功与组合训练，动作规范性和节奏感均有明显提升。', advice: '继续加强脚背、膝盖控制，并保持每周两次基础训练。', timeline: [{ title: '提交结业申请', time: '2026-09-03 10:20', text: '结业材料已提交教务复核。' }, { title: '教务复核中', time: '2026-09-03 14:10', text: '正在核对考勤、作业和教师评语。' }] },
  { id: 'graduation-002', student: '周予安', avatar: '周', className: '少儿舞蹈基础班', course: '舞蹈基本功', professional: '舞蹈表演', completedAt: '2026-09-02', submittedAt: '2026-09-03 10:20', status: '补课中', attendanceRate: 80, homeworkRate: 90, lessons: '18/20', comment: '基本动作掌握较稳，组合衔接仍需加强。', advice: '补齐缺勤课次后重点练习身韵连接和重心转换。', reason: '缺勤2次，当前有效出勤率未达到结业要求。', retakeNote: '补上第6、12次课的核心训练内容，完成后补充教学记录。', retakeSchedule: '2026-09-12 14:00-15:30', retakeCampus: '龙泉校区 · 艺术楼105', retakeLesson: '补课第1次 · 身韵连接与组合训练', timeline: [{ title: '提交结业申请', time: '2026-09-03 10:20', text: '结业材料已提交教务复核。' }, { title: '退回补课', time: '2026-09-05 16:40', text: '教务反馈出勤未达标，需完成补课。' }, { title: '补课已安排', time: '2026-09-08 09:30', text: '补课课次已登记，等待完成教学记录。' }] },
  { id: 'graduation-003', student: '陈一诺', avatar: '陈', className: '少儿舞蹈基础班', course: '舞蹈基本功', professional: '舞蹈表演', completedAt: '2026-09-02', submittedAt: '2026-09-03 10:20', status: '需补课', attendanceRate: 85, homeworkRate: 75, lessons: '19/20', comment: '课堂参与积极，基础动作完成度较好。', advice: '补交缺失作业，并针对转身稳定性进行集中练习。', reason: '作业提交率未达到结业要求，且有1次缺勤。', retakeNote: '教务正在协调补课时间，安排完成后将通过消息通知。', timeline: [{ title: '提交结业申请', time: '2026-09-03 10:20', text: '结业材料已提交教务复核。' }, { title: '退回补课', time: '2026-09-06 11:15', text: '请等待教务登记补课课次。' }] },
  { id: 'graduation-004', student: '赵明月', avatar: '赵', className: '少儿舞蹈提高班', course: '舞蹈基本功', professional: '舞蹈表演', completedAt: '2026-08-20', submittedAt: '2026-08-21 09:05', reviewedAt: '2026-08-23 15:30', status: '已通过', attendanceRate: 100, homeworkRate: 100, lessons: '16/16', comment: '身韵表达自然，能够准确完成课程组合并形成稳定的舞台表现。', advice: '可继续进行进阶组合训练，提升动作细节与呼吸配合。', result: '数据复核通过，学员结业成果正在生成。', timeline: [{ title: '提交结业申请', time: '2026-08-21 09:05', text: '结业材料已提交教务复核。' }, { title: '复核通过', time: '2026-08-23 15:30', text: '学员已通过结业复核。' }] },
  { id: 'graduation-005', student: '吴桐', avatar: '吴', className: '少儿舞蹈提高班', course: '舞蹈基本功', professional: '舞蹈表演', completedAt: '2026-07-28', submittedAt: '2026-07-29 13:10', reviewedAt: '2026-07-30 10:00', status: '已取消结业', attendanceRate: 50, homeworkRate: 40, lessons: '5/10', comment: '已完成前半段基础训练。', advice: '如后续恢复学习，建议从柔韧与力量基础重新衔接。', cancelReason: '学员办理退学及剩余课时退款，不再参与本班结业。', timeline: [{ title: '提交结业申请', time: '2026-07-29 13:10', text: '结业材料已提交教务复核。' }, { title: '取消结业', time: '2026-07-30 10:00', text: '因退学退款终止本次结业流程。' }] }
];
const teacherLessonDefaults = {
  status: '待上课', started: false, startedAt: '', startedAtMs: 0, endedAt: '',
  teachingRecord: '', teachingRecordSaved: false, attendanceSaved: false, attendanceSynced: false,
  attendance: { '林知夏': '', '周予安': '', '陈一诺': '', '赵明月': '' },
  attendanceNotes: {}, homework: null
};
const teacherMessageDefaults = [
  { id: 'TMSG20260910001', type: '新增排课通知', title: '今日课程将在09:00开始', summary: '少儿舞蹈基础班第8次课将在龙泉校区综合楼302上课。', body: '教务已为您安排一节舞蹈基本功课程，请提前到达龙泉校区综合楼302并完成上课准备。', createdAt: '2026-09-12 07:30', read: false, target: '/teacher/pages/class-detail.html?class=class-001&lesson=8', actionLabel: '进入课次详情' },
  { id: 'TMSG20260909001', type: '课次调整通知', title: '第12次课已停课', summary: '少儿舞蹈提高班第12次课因场地检修停课，补课安排另行通知。', body: '因龙泉校区综合楼302场地检修，原定9月12日的少儿舞蹈提高班第12次课已停课。教务确认补课安排后将再次通知您。', createdAt: '2026-09-11 17:25', read: false, target: '/teacher/pages/class-detail.html?class=class-002&lesson=12', actionLabel: '查看课次详情' },
  { id: 'TMSG20260909002', type: '合同签署通知', title: '您有一份合同待教师签署', summary: '2026-2027年度教师合作协议请于9月20日前完成签署。', body: '新的教师合作协议已推送，请核对授课范围、课时单价和有效期，并在2026年9月20日前完成签署。', createdAt: '2026-09-09 16:10', read: false, target: '/teacher/pages/contract-detail.html?contract=contract-2027', actionLabel: '查看合同' },
  { id: 'TMSG20260908003', type: '工资已发放', title: '2026年7月工资已发放', summary: '本期实际核发5483.20元，已发放至尾号2866账户。', body: '2026年7月工资已完成发放，实际核发5483.20元，已于2026年8月5日发放至中国建设银行尾号2866账户。', createdAt: '2026-09-08 10:20', read: true, target: '/teacher/pages/salary-detail.html?month=2026-07', actionLabel: '查看工资明细' },
  { id: 'TMSG20260908004', type: '工资单已发布', title: '2026年6月工资单已发布', summary: '本期实际核发5024.40元，等待财务发放。', body: '2026年6月工资单已发布，本期共计28课时，实际核发5024.40元。当前状态为待发放，资金到账后将另行通知。', createdAt: '2026-09-08 09:40', read: true, target: '/teacher/pages/salary-detail.html?month=2026-06', actionLabel: '查看工资明细' },
  { id: 'TMSG20260907003', type: '作业提交提醒', title: '有学员提交了作业', summary: '林知夏已提交“节奏练习视频”，请及时批改并填写文字评语。', body: '学员林知夏已完成“节奏练习视频”作业提交，请进入班级课次详情查看作业内容并完成文本评语。', createdAt: '2026-09-07 18:30', read: false, target: '/teacher/pages/class-detail.html?class=class-001&lesson=8', actionLabel: '查看作业' },
  { id: 'TMSG20260907004', type: '课程申报审核结果', title: '课程申报已通过', summary: '您申报的《声乐演唱技巧》已通过教研审核。', body: '课程申报资料已通过审核，教务将继续完成课程发布和后续排课安排。', createdAt: '2026-09-07 15:40', read: true, target: '/teacher/pages/applications.html', actionLabel: '查看课程申报' },
  { id: 'TMSG20260906005', type: '证书审核结果', title: '教师证书审核结果已更新', summary: '中国舞教师资格证已已通过。', body: '您提交的中国舞教师资格证已完成审核，证书状态已更新为已通过。', createdAt: '2026-09-06 11:05', read: true, target: '/teacher/pages/certificates.html', actionLabel: '查看我的证书' },
  { id: 'TMSG20260905006', type: '结业申请审核结果', title: '有3项结业申请待处理', summary: '请查看学员结业复核结果及补课安排。', body: '当前有3项学员结业申请正在处理中，其中包含需补课和审核中的记录，请及时查看并完成相关教学记录。', createdAt: '2026-09-05 09:15', read: true, target: '/teacher/pages/graduation.html', actionLabel: '查看结业记录' }
];
// I1-DEMO-10：不再把王玥口径的证书/合同/结业/消息数组塞进默认状态，
// 否则「状态里已有数组」分支永远成立，事实库（teacher-facts）与按教师归位都不生效。
const teacherDefaults = { lesson: teacherLessonDefaults, lessonHomeworks: {}, application: '待审核', applicationUpdates: {}, graduation: '可申请', salary: '已发布', profile: teacherProfileDefaults };
let teacherState;
try { teacherState = { ...teacherDefaults, ...JSON.parse(sessionStorage.getItem(teacherKey) || '{}') }; } catch { teacherState = { ...teacherDefaults }; }
teacherState.profile = { ...teacherProfileDefaults, ...(teacherState.profile || {}) };
const storedTeacherLesson = teacherState.lesson || {};
teacherState.lesson = { ...teacherLessonDefaults, ...storedTeacherLesson, attendance: { ...teacherLessonDefaults.attendance, ...(storedTeacherLesson.attendance || {}) }, attendanceNotes: { ...(storedTeacherLesson.attendanceNotes || {}) } };
// 兼容旧演示状态：原 attendanceSubmitted 实际表示课中考勤已保存；已结束课次视为已完成同步。
teacherState.lesson.attendanceSaved = storedTeacherLesson.attendanceSaved ?? storedTeacherLesson.attendanceSubmitted ?? false;
teacherState.lesson.attendanceSynced = storedTeacherLesson.attendanceSynced ?? (storedTeacherLesson.status === '已完成' && Boolean(storedTeacherLesson.attendanceSubmitted));
delete teacherState.lesson.attendanceSubmitted;
teacherState.lessonHomeworks = { ...(teacherState.lessonHomeworks || {}) };
if (storedTeacherLesson.lessonKey && storedTeacherLesson.homework) {
  teacherState.lessonHomeworks[storedTeacherLesson.lessonKey] = Array.isArray(storedTeacherLesson.homework) ? storedTeacherLesson.homework : [storedTeacherLesson.homework];
}
const factsCertificateRows = certificateRowsFromFacts();
teacherState.certificates = Array.isArray(teacherState.certificates)
  ? teacherState.certificates
  : (factsCertificateRows || demoLocalize(teacherCertificateDefaults)).map(item => ({ ...item }));
// CR-2026-019 §6 本地旧值兼容：会话里遗留的“已录入”按来源迁移，
// 后台录入直接为已通过并补齐审核人／时间／来源，教师端上传回到待审核。
const LEGACY_RECORDED_CERT_STATUS = '已录入';
const LEGACY_CERT_STATUS_LABELS = { 审核通过: '已通过', 审核不通过: '已驳回' };
teacherState.certificates = teacherState.certificates.map(item => {
  if (item?.status && LEGACY_CERT_STATUS_LABELS[item.status]) return { ...item, status: LEGACY_CERT_STATUS_LABELS[item.status] };
  if (item?.status !== LEGACY_RECORDED_CERT_STATUS) return item;
  const backendEntered = item.source === '后台录入';
  return {
    ...item,
    status: backendEntered ? '已通过' : '待审核',
    reviewedAt: backendEntered ? (item.reviewedAt || item.uploadedAt || '2026-09-07') : '',
    reviewNote: backendEntered ? (item.reviewNote || '后台录入默认通过。') : '已迁移为待审核，等待教研审核。'
  };
});
const factsContractRows = contractRowsFromFacts();
teacherState.contracts = (Array.isArray(teacherState.contracts)
  ? teacherState.contracts
  : (factsContractRows || demoLocalize(teacherContractDefaults)).map(item => ({ ...item }))).map(item => {
  const next = { ...item };
  // CR-2026-082：兼容旧演示会话，但必须重新以双方 PDF 文件是否存在为准。
  if (next.status === '待教师签署') { next.teacherFile = ''; next.schoolFile = ''; next.teacherSignedAt = ''; next.schoolSignedAt = ''; }
  if (next.status === '待学校签署' && !next.teacherFile) { next.teacherFile = `${next.number}-教师签署件.pdf`; next.teacherSignedAt = next.signedAt || '2026-09-10'; }
  if (next.status === '已签署' && (!next.teacherFile || !next.schoolFile)) {
    next.teacherFile = next.teacherFile || `${next.number}-教师签署件.pdf`;
    next.schoolFile = next.schoolFile || `${next.number}-学校签署件.pdf`;
    next.teacherSignedAt = next.teacherSignedAt || next.signedAt || '2026-09-09';
    next.schoolSignedAt = next.schoolSignedAt || next.signedAt || '2026-09-10';
  }
  return next;
});
// CR-2026-028 §3.2：教师端只展示文件来源文案（学校录入／本人上传／系统生成），
// 内部枚举（后台录入／教师端上传）不外露，业务来源口径不下发到教师端。
teacherState.certificates = teacherState.certificates.map(item => ({ ...item, source: certificateSourceLabel(item.source) }));
// CR-2026-048 §3.6：后台第二步录入的证书与教师端「我的证书」同源——
// 同一条证书记录在两端可见，来源显示为“学校录入”，不再各存一份。
const adminEnteredCertificates = (() => {
  try {
    const currentTeacherId = sessionStorage.getItem('hbyx-teacher-id') || defaultTeacherId();
    const shared = JSON.parse(localStorage.getItem('hbyx-iteration1-demo-v1') || '{}').teacherCertificates || [];
    return shared
      .filter(item => item.teacherId === currentTeacherId)
      .map(item => ({
        id: item.id, name: item.name, number: item.number, type: item.type, issuer: item.issuer,
        issuedAt: item.issuedAt || '', expiresAt: item.expiresAt || '', status: item.status,
        source: certificateSourceLabel(item.source), file: item.file || '证书文件',
        fileVersion: 'v1', reviewedAt: item.enteredAt || '', reviewNote: '后台录入默认通过。'
      }));
  } catch { return []; }
})();
if (adminEnteredCertificates.length) {
  const knownCertificateIds = new Set(teacherState.certificates.map(item => item.id));
  teacherState.certificates = [...teacherState.certificates, ...adminEnteredCertificates.filter(item => !knownCertificateIds.has(item.id))];
}
teacherState.graduationRecords = Array.isArray(teacherState.graduationRecords) ? teacherState.graduationRecords : demoLocalize(teacherGraduationDefaults).map(item => ({ ...item }));
const storedTeacherMessages = Array.isArray(teacherState.messages) ? teacherState.messages : [];
const knownTeacherMessages = demoLocalize(teacherMessageDefaults).map(item => ({ ...item, read: storedTeacherMessages.find(row => row.id === item.id)?.read ?? item.read }));
const additionalTeacherMessages = storedTeacherMessages.filter(item => !teacherMessageDefaults.some(row => row.id === item.id));
const isLegacyClassMessage = (item) => ['class-001', 'class-002', 'class-003', 'class-004'].some(id => String(item?.target || '').includes(`class=${id}`));
teacherState.messages = demoLocalize([...knownTeacherMessages, ...additionalTeacherMessages]).filter(item => !isLegacyClassMessage(item));
teacherState.applicationUpdates = { ...(teacherState.applicationUpdates || {}) };
function saveTeacher() { sessionStorage.setItem(teacherKey, JSON.stringify(teacherState)); }
function homeworkRecordsOf(value) { return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []; }
function persistCurrentLessonHomework() {
  const key = teacherState.lesson.lessonKey;
  if (!key) return;
  const records = homeworkRecordsOf(teacherState.lesson.homework);
  if (records.length) teacherState.lessonHomeworks[key] = records;
  else delete teacherState.lessonHomeworks[key];
}
function tEsc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function tPill(text, tone = '') { return `<span class="mp-pill ${tone}">${tEsc(text)}</span>`; }
function tButton(text, attrs = '', cls = '') { return `<button class="mp-button ${cls}" ${attrs}>${tEsc(text)}</button>`; }
function tCard(content) { return `<section class="mp-card">${content}</section>`; }
function tStack(...content) { return `<div class="mp-stack">${content.join('')}</div>`; }
function tToast(message) { const node = document.createElement('div'); node.className = 'mp-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 2200); }
function tLayout(content) { teacherMain.innerHTML = content; }
// I1-DEMO-04：教师端课表由当前教师的班级课次派生（原先为固定演示课次）。
const scheduleDays = []; // 兼容旧引用，实际数据见 scheduleDay()

const calendarToday = DEMO_TODAY;
let selectedScheduleDay = calendarToday;
let calendarYear = 2026;
let calendarMonth = 8;
let calendarExpanded = false;
function scheduleDay(dateKey) {
  const lessons = (teacherScheduleByDate()[dateKey] || []).map((lesson) => ({ ...lesson, id: lesson.id === `${lesson.classId}#${lesson.lessonNo}` ? lesson.id : lesson.id }));
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return {
    key: dateKey.slice(5),
    weekday: weekdays[date.getDay()],
    date: String(date.getDate()),
    label: `${date.getMonth() + 1}月${date.getDate()}日 周${weekdays[date.getDay()]}`,
    today: dateKey === calendarToday,
    lessons
  };
}
function calendarDateLabel(dateKey) {
  const [year, month, date] = dateKey.split('-').map(Number);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${month}月${date}日 周${weekdays[new Date(year, month - 1, date).getDay()]}`;
}
function renderMobileCalendar() {
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const start = new Date(calendarYear, calendarMonth, 1 - firstDay.getDay());
  const allDates = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { date, key };
  });
  const selectedIndex = allDates.findIndex(item => item.key === selectedScheduleDay);
  const weekStart = Math.max(0, Math.floor(selectedIndex / 7) * 7);
  const visibleDates = calendarExpanded ? allDates : allDates.slice(weekStart, weekStart + 7);
  const cells = visibleDates.map(({ date, key }) => {
    const day = scheduleDay(key);
    const classes = ['mp-calendar-day', date.getMonth() !== calendarMonth ? 'outside' : '', key === calendarToday ? 'today' : '', key === selectedScheduleDay ? 'selected' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${classes}" data-schedule-date="${key}" aria-label="${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日${day?.lessons.length ? `，${day.lessons.length}节课` : ''}" aria-pressed="${key === selectedScheduleDay}"><span>${date.getDate()}</span>${day?.lessons.length ? '<i aria-hidden="true"></i>' : ''}</button>`;
  }).join('');
  return `<section class="mp-calendar ${calendarExpanded ? 'is-expanded' : 'is-collapsed'}" aria-label="课表日历"><header class="mp-calendar-header"><button type="button" class="mp-calendar-icon" data-calendar-action="prev" aria-label="上个月">‹</button><strong>${calendarYear}年${calendarMonth + 1}月</strong><button type="button" class="mp-calendar-icon" data-calendar-action="next" aria-label="下个月">›</button><button type="button" class="mp-calendar-today" data-calendar-action="today">今天</button></header><div class="mp-calendar-weekdays" aria-hidden="true">${['日', '一', '二', '三', '四', '五', '六'].map(day => `<span>${day}</span>`).join('')}</div><div class="mp-calendar-grid">${cells}</div><footer class="mp-calendar-footer"><span class="mp-calendar-event-key"><i></i>有课</span><button type="button" class="mp-calendar-toggle" data-calendar-action="toggle" aria-expanded="${calendarExpanded}">${calendarExpanded ? '收起日历' : '展开日历'}<span aria-hidden="true">${calendarExpanded ? '⌃' : '⌄'}</span></button><span>点击日期查看课次</span></footer></section>`;
}
function lessonStatus(lesson) { return lesson.id === 'current' ? teacherState.lesson.status : lesson.status; }
function lessonTone(status) { return status === '上课中' ? 'amber' : status === '已完成' ? 'green' : status === '待上课' ? '' : 'gray'; }
function scheduleLessonCard(lesson) {
  const status = lessonStatus(lesson);
  const href = relativePath(`/teacher/pages/class-detail.html?class=${lesson.classId || ''}&lesson=${lesson.lessonNo || ''}`);
  // I1-DEC-44：迭代2内容不删除、入口不禁用——课表卡片保留可用的「开始上课」入口。
  // 待上课给「开始上课」；上课中给「继续上课」（进入该课次执行视图，可登记考勤并结束上课）。
  const primaryAction = status === '待上课'
    ? tButton('开始上课', `data-teacher-action="start-schedule" data-lesson-id="${tEsc(lesson.id || '')}"`)
    : status === '上课中'
      ? `<a class="mp-button" href="${href}">继续上课</a>`
      : '';
  const stoppedNote = status === '已停课' ? '<p class="teacher-schedule-note">本课次已由教务停课，补课安排另行通知。</p>' : '';
  return `<article class="teacher-schedule-card status-${status === '上课中' ? 'active' : status === '已完成' ? 'done' : status === '待上课' ? 'pending' : 'inactive'}"><div class="teacher-schedule-time"><strong>${tEsc(lesson.time.split('-')[0])}</strong><span>${tEsc(lesson.time.split('-')[1])}</span></div><div class="teacher-schedule-content"><div class="teacher-schedule-title"><div><h3>${tEsc(lesson.className)}</h3><p>${tEsc(lesson.courseName)} · 第${tEsc(lesson.lessonNo)}次课</p></div>${tPill(status, lessonTone(status))}</div><dl class="teacher-schedule-facts"><div><dt>上课地点</dt><dd>${tEsc(lesson.campus)} · ${tEsc(lesson.room)}</dd></div><div><dt>学员人数</dt><dd>${tEsc(lesson.students)}人</dd></div></dl>${lesson.note ? `<p class="teacher-schedule-note">${tEsc(lesson.note)}</p>` : ''}${stoppedNote}<div class="teacher-schedule-actions"><a class="mp-button secondary" href="${href}">${status === '已完成' ? '查看记录' : '查看详情'}</a>${primaryAction}</div></div></article>`;
}
function renderSchedule() {
  const scheduled = scheduleDay(selectedScheduleDay);
  const selected = scheduled || { label: calendarDateLabel(selectedScheduleDay), today: selectedScheduleDay === calendarToday, lessons: [] };
  const today = scheduleDay(calendarToday);
  // PM-B11：默认严格按“今天”，今天无课时给出明确空态与切换入口；不自动跳到最近有课日。
  const emptyTitle = selected.today ? '今天没有课程' : '当天没有课程';
  // I1-DEMO-06：空态给出当前教师的下一节课次与直达入口，避免切换账号后只看到空白。
  const nextLesson = teacherScheduleSessions().find((lesson) => lesson.date > selectedScheduleDay && lesson.status !== '已停课');
  const nextHint = nextLesson
    ? `<p>下一节：${tEsc(nextLesson.date)} ${tEsc(nextLesson.time)} · ${tEsc(nextLesson.className)}（${tEsc(nextLesson.campus)} ${tEsc(nextLesson.room)}）</p><button type="button" class="mp-button secondary" data-schedule-date="${tEsc(nextLesson.date)}">查看这节课</button>`
    : '<p>当前教师暂无已排课次。</p>';
  const list = selected.lessons.length
    ? selected.lessons.map(scheduleLessonCard).join('')
    : `<section class="teacher-schedule-empty"><strong>${emptyTitle}</strong>${nextHint}</section>`;
  tLayout(tStack(`<section class="teacher-schedule-overview"><div class="teacher-schedule-profile"><span class="mp-avatar" aria-hidden="true">${currentTeacherAvatar()}</span><div><span>授课教师</span><h2>${tEsc(currentTeacherName())}</h2><p>${tEsc(currentTeacherMajor())} · ${tEsc(currentTeacherAccount().no)}</p></div></div><div class="teacher-schedule-today"><span>2026年9月12日</span><strong>今日 ${today.lessons.length} 节课</strong></div></section>`, renderMobileCalendar(), `<section class="teacher-schedule-list"><div class="teacher-schedule-list-head"><div><h2>${selected.label}${selected.today ? '<small>今天</small>' : ''}</h2><p>${selected.lessons.length ? `共 ${selected.lessons.length} 节课，按上课时间排列` : '暂无已排课次'}</p></div></div>${list}</section>`));
}
function lessonTimeLabel() {
  if (teacherState.lesson.status === '已完成') return '本课次已完成';
  if (teacherState.lesson.status !== '上课中' || !teacherState.lesson.startedAtMs) return '00:00:00';
  const seconds = Math.max(0, Math.floor((Date.now() - teacherState.lesson.startedAtMs) / 1000));
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  return `${hours}:${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
function lessonTaskStatus(done, waiting = false) {
  return tPill(done ? '已完成' : waiting ? '未开始' : '待完成', done ? 'green' : waiting ? 'gray' : 'amber');
}
function lessonAttendanceSummary() {
  const values = Object.values(teacherState.lesson.attendance);
  return ['已到', '迟到', '请假', '缺勤'].map(status => `<span><b>${values.filter(value => value === status).length}</b>${status}</span>`).join('');
}
function lessonAttendanceStudent(name, status, editable) {
  const note = teacherState.lesson.attendanceNotes[name] || '';
  return `<article class="teacher-lesson-student"><div class="teacher-lesson-student-head">${editable ? `<label class="teacher-attendance-select"><input type="checkbox" data-attendance-select="${tEsc(name)}" aria-label="选择${tEsc(name)}"></label>` : ''}<span class="teacher-lesson-student-avatar" aria-hidden="true">${tEsc(name.slice(0, 1))}</span><strong>${tEsc(name)}</strong>${status ? tPill(status, status === '已到' ? 'green' : status === '缺勤' ? 'gray' : 'amber') : '<span class="teacher-lesson-unmarked">未登记</span>'}</div><div class="teacher-attendance-options" role="group" aria-label="${tEsc(name)}考勤">${['已到', '迟到', '请假', '缺勤'].map(item => `<button type="button" class="${status === item ? 'active' : ''}" data-attendance-status="${item}" data-student="${tEsc(name)}" aria-pressed="${status === item}" ${editable ? '' : 'disabled'}>${item}</button>`).join('')}</div>${status === '请假' ? `<div class="mp-field teacher-attendance-note"><label for="attendance-note-${tEsc(name)}">请假理由 <b>*</b></label><input id="attendance-note-${tEsc(name)}" data-attendance-note="${tEsc(name)}" value="${tEsc(note)}" placeholder="请输入请假理由" ${editable ? '' : 'disabled'}></div>` : status && status !== '已到' ? `<div class="mp-field teacher-attendance-note"><label for="attendance-note-${tEsc(name)}">考勤备注 <span>选填</span></label><input id="attendance-note-${tEsc(name)}" data-attendance-note="${tEsc(name)}" value="${tEsc(note)}" placeholder="补充说明" ${editable ? '' : 'disabled'}></div>` : ''}</article>`;
}
let teacherLessonTab = 'attendance';
function renderLessonExecution(classItem, session) {
  const lesson = teacherState.lesson;
  if (teacherHomeworkEditing) {
    renderTeacherHomeworkPage(classItem, session);
    return;
  }
  const active = lesson.status === '上课中';
  const completed = lesson.status === '已完成';
  const attendanceDone = Object.values(lesson.attendance).every(Boolean) && Object.entries(lesson.attendance).every(([name, status]) => status !== '请假' || lesson.attendanceNotes[name]?.trim());
  const attendancePill = completed && lesson.attendanceSynced ? tPill('已同步', 'green') : lesson.attendanceSaved ? tPill('已保存', 'green') : tPill('待保存', 'amber');
  const homeworkRecords = homeworkRecordsOf(lesson.homework);
  const controlsDisabled = active ? '' : 'disabled';
  const operationPanel = active || completed ? `<section class="teacher-lesson-workspace"><nav class="teacher-lesson-tabs" aria-label="课中工作区"><button type="button" class="${teacherLessonTab === 'attendance' ? 'active' : ''}" data-lesson-tab="attendance">考勤</button><button type="button" class="${teacherLessonTab === 'homework' ? 'active' : ''}" data-lesson-tab="homework">作业${homework ? `（${Array.isArray(homework) ? homework.length : 1}）` : ''}</button><button type="button" class="${teacherLessonTab === 'record' ? 'active' : ''}" data-lesson-tab="record">教学记录</button></nav><div class="teacher-lesson-tabbar"><strong>${teacherLessonTab === 'attendance' ? '学员考勤' : teacherLessonTab === 'homework' ? '作业' : '教学记录'}</strong>${teacherLessonTab === 'homework' && active ? '<button type="button" class="teacher-lesson-tab-action" data-lesson-action="open-homework">发布作业</button>' : ''}</div><div class="teacher-lesson-tab-content">${tStack(
    `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>01</span><h2>学员考勤</h2></div>${attendancePill}</div><div class="teacher-attendance-toolbar"><div class="teacher-attendance-summary">${lessonAttendanceSummary()}</div>${completed ? '' : '<div class="teacher-attendance-batch"><button type="button" data-lesson-action="all-present">全部标记为出勤</button><button type="button" data-lesson-action="batch-status">批量设置</button></div>'}</div><p class="teacher-attendance-help">课中保存考勤，结束上课时统一推送至学员端和后台。</p><div class="teacher-lesson-student-list">${Object.entries(lesson.attendance).map(([name, status]) => lessonAttendanceStudent(name, status, active)).join('')}</div>${completed ? '' : `<button type="button" class="mp-button full secondary teacher-attendance-submit" data-lesson-action="save-attendance" ${controlsDisabled}>保存考勤</button>`}</section>`,
    completed ? `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>02</span><h2>教学记录</h2></div>${tPill('已完成', 'green')}</div><div class="teacher-static-lesson-record"><p>${tEsc(lesson.teachingRecord || '教学记录已随结束上课提交。')}</p></div></section>` : '',
    `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>${completed ? '03' : '02'}</span><h2>作业</h2></div>${homeworkRecords.length ? tPill(`${homeworkRecords.length} 项`, 'green') : tPill('可选', 'gray')}</div>${homeworkRecords.length ? homeworkRecords.map((item, index) => `<div class="teacher-homework-published"><div><strong>${tEsc(item.title)}</strong><p>${tEsc(item.type)} · ${tEsc((item.formats || []).join('、'))}</p><span>截止 ${tEsc(item.deadline)} · ${item.required ? '必交' : '选交'}</span></div><button type="button" data-lesson-action="homework-submissions" data-homework-index="${index}">查看提交</button></div>`).join('') : `<div class="teacher-homework-empty"><p>一个课次可发布多项作业，发布后推送至学员端作业本。</p><button type="button" class="mp-button secondary" data-lesson-action="open-homework" ${controlsDisabled}>发布作业</button></div>`}</section>`
  )}</div></section>` : `<section class="teacher-lesson-locked"><strong>开始上课后登记课堂信息</strong><p>保存学员考勤后，可结束本课次并填写教学记录。</p><ol><li>登记并保存学员考勤</li><li>结束上课时填写教学记录并同步</li><li>课后作业（可选）</li></ol></section>`;
  tLayout(`<div class="teacher-lesson-page ${active ? 'has-bottom-action' : ''}">${tStack(
    `<section class="teacher-lesson-hero"><div class="teacher-lesson-hero-head"><div><span>${tEsc(classItem.course)}</span><h2><a class="teacher-lesson-class-link" href="${relativePath(`/teacher/pages/class-overview.html?class=${encodeURIComponent(classItem.id)}`)}" aria-label="查看${tEsc(classItem.name)}班级详情">${tEsc(classItem.name)}</a> · 第 ${tEsc(session.index)} 次课</h2><small>共 ${tEsc((classItem.sessions || []).length || classItem.total)} 次课 · 本节课为第 ${tEsc(session.index)} 次</small></div>${tPill(lesson.status, lessonTone(lesson.status))}</div><dl><div><dt>上课时间</dt><dd>${tEsc(session.date)} ${tEsc(session.weekday || '')} ${tEsc(session.startTime || session.start || '')}–${tEsc(session.endTime || session.end || '')}</dd></div><div><dt>上课地点</dt><dd>${tEsc(sessionVenueOf(session, classItem).campus)} · ${tEsc(sessionVenueOf(session, classItem).room)}</dd></div></dl></section>`,
    `<section class="teacher-lesson-clock"><div class="teacher-lesson-clock-main"><span>${active ? '已上课时长' : completed ? '教师考勤' : '等待开始上课'}</span><strong data-lesson-timer>${lessonTimeLabel()}</strong><small>本课次计 1 次有效课次</small></div><dl><div><dt>开始上课</dt><dd>${tEsc(lesson.startedAt || '--:--')}</dd></div><div><dt>结束上课</dt><dd>${tEsc(lesson.endedAt || '--:--')}</dd></div></dl>${lesson.status === '待上课' ? '<button type="button" class="mp-button full" data-lesson-action="start">开始上课</button>' : ''}</section>`,
    active ? `<section class="teacher-lesson-readiness"><div><strong>${lesson.attendanceSaved ? '1/1' : '0/1'}</strong><span>上课中必做事项</span></div><ul><li class="${lesson.attendanceSaved ? 'done' : ''}"><i aria-hidden="true">${lesson.attendanceSaved ? '✓' : ''}</i>学员考勤</li></ul></section>` : '',
    operationPanel,
    completed ? `<section class="teacher-lesson-complete-note"><strong>本课次已计入工资</strong><p>${tEsc(lesson.endedAt)} 结束上课，本课次已按 1 次有效课次进入工资核算。</p></section>` : ''
  )}${active ? '<div class="teacher-lesson-bottom-action"><button type="button" class="mp-button" data-lesson-action="end">结束上课</button></div>' : ''}</div>`);
}
// I1-TEACHER-CLASS-03：课次详情按课次查看作业（提交与批改情况、未提交名单）。
// CR-2026-134：作业演示状态取自班级的 demoHomework（未提交／点评中／点评完成），未设置时按 80% 提交、少量待批改的默认口径派生。
// CR-2026-136：课次作业汇总读共享的课次作业记录（未提交／点评中／点评完成由班级 demoHomework 决定）。
function lessonHomeworkSummary(classItem, lessonNumber) {
  return lessonHomework(classItem, Number(lessonNumber));
}
function lessonHomeworkSection(classItem, lessonNumber, completed) {
  if (!completed) return `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>03</span><h2>课后作业</h2></div>${tPill('未开始', 'gray')}</div><p class="mp-muted">开始上课后可发布本课次作业。</p></section>`;
  const summary = lessonHomeworkSummary(classItem, lessonNumber);
  const homeworkPill = summary.mode === '未提交' ? tPill('未提交', 'amber') : summary.mode === '点评中' ? tPill('点评中', 'amber') : summary.mode === '点评完成' ? tPill('点评完成', 'green') : tPill('已发布', 'green');
  return `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>03</span><h2>课后作业</h2></div>${homeworkPill}</div><dl class="teacher-lesson-homework-rows"><div><dt>作业名称</dt><dd>${tEsc(summary.name)}</dd></div><div><dt>提交情况</dt><dd>${summary.submitted}/${summary.total} 已提交</dd></div><div><dt>批改情况</dt><dd>${summary.graded}/${summary.submitted} 已批改</dd></div><div class="wide"><dt>未提交</dt><dd>${summary.missing.length ? tEsc(summary.missing.join('、')) : '全部已提交'}</dd></div></dl><div class="teacher-lesson-homework-links"><button type="button" class="mp-button secondary" data-lesson-homework="submissions">查看作业提交</button><button type="button" class="mp-button" data-lesson-homework="grade">批改作业</button></div></section>`;
}
// I1-TEACHER-CLASS-04：学员考勤支持按课次（课次详情）与按学员（学员详情）两个视角。
// CR-2026-136：课次考勤名单读共享的课次考勤记录，与班级详情的指标同源。
function lessonAttendanceRows(classItem, lessonNumber) {
  return lessonAttendance(classItem, Number(lessonNumber)).map((row) => ({ ...row.student, lessonStatus: row.status }));
}
function lessonAttendanceSection(classItem, lessonNumber, completed) {
  if (!completed) return `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>01</span><h2>学员考勤</h2></div>${tPill('未开始', 'gray')}</div><p class="mp-muted">开始上课后登记本课次学员考勤。</p></section>`;
  const rows = lessonAttendanceRows(classItem, lessonNumber);
  const count = (status) => rows.filter((row) => row.lessonStatus === status).length;
  return `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>01</span><h2>学员考勤</h2></div>${tPill(`已到 ${count('已到')}/${rows.length}`, 'green')}</div><dl class="teacher-lesson-homework-rows"><div><dt>已到</dt><dd>${count('已到')} 人</dd></div><div><dt>迟到</dt><dd>${count('迟到')} 人</dd></div><div><dt>请假</dt><dd>${count('请假')} 人</dd></div><div><dt>缺勤</dt><dd>${count('缺勤')} 人</dd></div></dl><div class="teacher-lesson-attendance-list">${rows.map((row) => `<div><span class="teacher-lesson-student-avatar" aria-hidden="true">${tEsc(row.name.slice(0, 1))}</span><strong>${tEsc(row.name)}</strong>${tPill(row.lessonStatus, row.lessonStatus === '已到' ? 'green' : row.lessonStatus === '迟到' ? 'amber' : row.lessonStatus === '请假' ? 'amber' : 'gray')}</div>`).join('')}</div></section>`;
}
// CR-2026-136：学员近期出勤读课次考勤记录（与课次详情名单一致）。
function studentAttendanceRecords(student) {
  const classItem = currentTeacherClass();
  if (!classItem) return [];
  return studentAttendanceHistory(classItem, student).map((row) => [row.date.slice(5), `第${row.index}次课`, row.status]);
}
// CR-2026-132：课次详情以「班级 + 该课次」为准，展示课次状态、教师考勤、学员考勤、教学记录与课后作业；
// 进度显示第 N 次／共 M 次，授课地点取该课次教室，教师考勤沿用「开始上课／结束上课」口径（CR-2026-130）。
function teacherSessionStatus(session) {
  if (!session) return '待上课';
  if (session.status === '已停课') return '已停课';
  if (session.status === '上课中') return '上课中';
  if (isSessionPast(session)) return '已完成';
  return '待上课';
}
function lessonTeachingRecordText(classItem, session) {
  return `完成${classItem.course}第 ${session.index} 次课训练要点，课堂执行情况已记录。`;
}
// 调整留痕：教务在后台调课／停课后写入班级记录，教师端只读展示最近一次。
function lessonAdjustmentOf(classItem, sessionIndex) {
  const logs = (classItem.adjustmentLogs || []).filter((log) => String(log.sessionIndex) === String(sessionIndex));
  return logs.length ? logs[logs.length - 1] : null;
}
function lessonAdjustmentSection(classItem, session) {
  const log = lessonAdjustmentOf(classItem, session.index);
  if (!log) return '';
  const before = [log.before?.date, [log.before?.startTime, log.before?.endTime].filter(Boolean).join('–')].filter(Boolean).join(' ');
  const after = log.after?.status === '已停课' ? '已停课（不再占用时段）' : [log.after?.date, [log.after?.startTime, log.after?.endTime].filter(Boolean).join('–')].filter(Boolean).join(' ');
  return `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>00</span><h2>最近调整记录</h2></div>${tPill('教务录入', 'gray')}</div><dl class="teacher-lesson-homework-rows"><div><dt>调整类型</dt><dd>${tEsc(log.type || '调整课次')}</dd></div><div><dt>调整前</dt><dd>${tEsc(before || '—')}</dd></div><div><dt>调整后</dt><dd>${tEsc(after || '—')}</dd></div><div><dt>操作留痕</dt><dd>${tEsc([log.operator, log.adjustedAt].filter(Boolean).join(' · ') || '—')}</dd></div><div class="wide"><dt>调整原因</dt><dd>${tEsc(log.reason || '—')}</dd></div></dl><p class="mp-muted">课次调整由教务在后台登记，教师端不提供停课／调课入口（CR-2026-131）。</p></section>`;
}
function renderStaticClassLesson(classItem, session) {
  const status = teacherSessionStatus(session);
  const completed = status === '已完成';
  const stopped = status === '已停课';
  const venue = sessionVenueOf(session, classItem);
  const total = (classItem.sessions || []).length || classItem.total;
  // 未开始课次：教师端不提供调整入口，给出线下沟通 + 教务后台录入的说明（CR-2026-131）。
  const adjustHint = '<p class="mp-muted">如需停课、调课、代课或顺延，请与教务线下沟通后由教务在后台「面授班级 → 教学阶段」录入，教师端不提供调整入口。</p>';
  const head = `<section class="teacher-lesson-hero"><div class="teacher-lesson-hero-head"><div><span>${tEsc(classItem.course)}</span><h2><a class="teacher-lesson-class-link" href="${relativePath(`/teacher/pages/class-overview.html?class=${encodeURIComponent(classItem.id)}`)}" aria-label="查看${tEsc(classItem.name)}班级详情">${tEsc(classItem.name)}</a> · 第 ${tEsc(session.index)} 次课</h2><small>共 ${tEsc(total)} 次课 · 本节课为第 ${tEsc(session.index)} 次</small></div>${tPill(status, lessonTone(status))}</div><dl><div><dt>上课时间</dt><dd>${tEsc(session.date)} ${tEsc(session.weekday || '')} ${tEsc(session.startTime || session.start || '-')}–${tEsc(session.endTime || session.end || '-')}</dd></div><div><dt>上课地点</dt><dd>${tEsc(venue.campus)} · ${tEsc(venue.room)}</dd></div></dl></section>`;
  if (stopped) {
    tLayout(tStack(head,
      `<section class="teacher-lesson-clock"><div class="teacher-lesson-clock-main"><span>课次状态</span><strong>已停课</strong><small>停课课次不占用时段、不计薪</small></div><dl><div><dt>开始上课</dt><dd>—</dd></div><div><dt>结束上课</dt><dd>—</dd></div></dl></section>`,
      lessonAdjustmentSection(classItem, session),
      '<section class="teacher-lesson-locked"><strong>本课次已由教务停课</strong><p>停课与补课安排由教务在后台登记后通知，教师端不提供调整入口。</p><ol><li>补课安排以消息通知为准</li><li>如需变更请联系教务</li></ol></section>'
    ));
    return;
  }
  const clock = completed
    ? `<section class="teacher-lesson-clock"><div class="teacher-lesson-clock-main"><span>教师考勤</span><strong>本课次已完成</strong><small>本课次计 1 次有效课次</small></div><dl><div><dt>开始上课</dt><dd>${tEsc(session.startTime || session.start || '—')}</dd></div><div><dt>结束上课</dt><dd>${tEsc(session.endTime || session.end || '—')}</dd></div></dl></section>`
    : `<section class="teacher-lesson-clock"><div class="teacher-lesson-clock-main"><span>教师考勤</span><strong>尚未开始</strong><small>本课次计 1 次有效课次</small></div><dl><div><dt>开始上课</dt><dd>--:--</dd></div><div><dt>结束上课</dt><dd>--:--</dd></div></dl></section>`;
  const recordSection = completed
    ? `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>02</span><h2>教学记录</h2></div>${tPill('已完成', 'green')}</div><div class="teacher-static-lesson-record"><p>${tEsc(lessonTeachingRecordText(classItem, session))}</p><footer><span>教学记录已保存</span></footer></div></section>`
    : `<section class="teacher-lesson-locked"><strong>课次尚未开始</strong><p>到达上课日期后，可从课表进入并开始上课；开始上课后登记考勤与教学记录。</p>${adjustHint}<ol><li>${tEsc(classItem.course)}</li><li>${tEsc(venue.campus)} · ${tEsc(venue.room)}</li></ol></section>`;
  tLayout(tStack(head, clock, lessonAdjustmentSection(classItem, session), lessonAttendanceSection(classItem, session.index, completed), recordSection, lessonHomeworkSection(classItem, session.index, completed)));
}
// CR-2026-132：课次身份 = 班级 # 课次序号。开始上课、结束上课与考勤都绑定该课次，
// 修复原实现「从课表点开始上课后落到默认课次」的串课次问题。
function teacherLessonKeyOf(classItem, session) { return `${classItem.id}#${session.index}`; }
function ensureTeacherLessonState(classItem, session) {
  const key = teacherLessonKeyOf(classItem, session);
  if (teacherState.lesson.lessonKey !== key) {
    persistCurrentLessonHomework();
    const roster = classRosterOf(classItem);
    const homework = homeworkRecordsOf(teacherState.lessonHomeworks[key]);
    teacherState.lesson = { ...teacherLessonDefaults, lessonKey: key, homework: homework.length ? homework : null, attendance: Object.fromEntries(roster.map((student) => [student.name, ''])), attendanceNotes: {} };
  }
  return key;
}
function startLessonFromSchedule(lessonId) {
  const [classId, lessonNo] = String(lessonId).split('#');
  const classItem = currentTeacherClasses().find((item) => item.id === classId);
  const session = classItem && (classItem.sessions || []).find((item) => String(item.index) === String(lessonNo));
  if (!classItem || !session) { tToast('未找到该课次，请刷新页面后重试'); return; }
  if (session.status === '已停课') { tToast('本课次已停课，无法开始上课'); return; }
  ensureTeacherLessonState(classItem, session);
  const now = new Date();
  teacherState.lesson.status = '上课中';
  teacherState.lesson.started = true;
  teacherState.lesson.startedAtMs = Date.now();
  teacherState.lesson.startedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  saveTeacher();
  location.href = relativePath(`/teacher/pages/class-detail.html?class=${classItem.id}&lesson=${session.index}`);
}
function renderLesson() {
  const params = new URLSearchParams(location.search);
  const lookup = currentTeacherClasses();
  const requestedId = params.get('class');
  // CR-2026-133：班级不在本人授课范围时不回退到第一个班级。
  const classItem = requestedId ? lookup.find(item => item.id === requestedId) : lookup[0];
  if (!classItem) {
    tLayout(tStack(tCard(requestedId
      ? `<h2>该班级不在你的授课范围</h2><p>你只能查看本人任教的班级课次；如需协助请联系教务。</p><a class="mp-button secondary" href="${relativePath('/teacher/pages/classes.html')}">返回我的班级</a>`
      : '<h2>暂无班级</h2><p>当前没有已分配的授课班级。</p>')));
    return;
  }
  const lessonNumber = params.get('lesson') || defaultLessonNumberOf(classItem);
  const session = (classItem.sessions || []).find((item) => String(item.index) === String(lessonNumber));
  if (!session) { tLayout(tStack(tCard(`<h2>课次不存在</h2><p>第 ${tEsc(lessonNumber)} 次课不在「${tEsc(classItem.name)}」的课表内，请从课表进入。</p><a class="mp-button secondary" href="${relativePath('/teacher/pages/classes.html')}">返回我的班级</a>`))); return; }
  // CR-2026-134：演示数据里状态为「上课中」的课次，打开即进入上课执行视图（可登记考勤并结束上课）。
  if (session.status === '上课中' && teacherState.lesson.lessonKey !== teacherLessonKeyOf(classItem, session)) {
    ensureTeacherLessonState(classItem, session);
    teacherState.lesson.status = '上课中';
    teacherState.lesson.started = true;
    teacherState.lesson.startedAt = session.startTime || session.start || '';
    saveTeacher();
  }
  // 从课表点了「开始上课」的课次进入执行视图；其余课次按状态只读展示。
  if (teacherState.lesson.lessonKey === teacherLessonKeyOf(classItem, session) && ['上课中', '已完成'].includes(teacherState.lesson.status)) { renderLessonExecution(classItem, session); return; }
  renderStaticClassLesson(classItem, session);
}
// 无 lesson 参数时落在「下一次课」：跳过已停课课次；全部结束则取最后一节。
function defaultLessonNumberOf(classItem) {
  const sessions = classItem.sessions || [];
  const upcoming = sessions.find((session) => session.status !== '已停课' && session.date >= DEMO_TODAY);
  if (upcoming) return String(upcoming.index);
  const last = [...sessions].reverse().find((session) => session.status !== '已停课');
  return String((last || sessions[sessions.length - 1] || {}).index || 1);
}
// I1-DEMO-05：我的班级取当前教师任教的班级（与学员端同一份班级库；原为固定空数组）。
const teacherClasses = [];
const teacherClassLessons = [
  ['16', '11-07', '09:00-10:30', '期末展示与课程总结', '待上课'], ['15', '10-31', '09:00-10:30', '完整组合排练', '待上课'],
  ['14', '10-24', '09:00-10:30', '舞台表现训练', '待上课'], ['13', '10-17', '09:00-10:30', '组合细节调整', '待上课'],
  ['12', '10-10', '09:00-10:30', '身韵组合后半段', '待上课'], ['11', '10-03', '09:00-10:30', '身韵组合前半段', '待上课'],
  ['10', '09-26', '09:00-10:30', '重心与呼吸配合', '待上课'], ['9', '09-19', '09:00-10:30', '身韵连接训练', '待上课'],
  ['8', '09-12', '09:00-10:30', '把杆与身韵组合', 'current'], ['7', '09-05', '09:00-10:30', '组合训练', '已完成'],
  ['6', '08-29', '09:00-10:30', '身韵练习', '已完成'], ['5', '08-22', '09:00-10:30', '基本手位与脚位', '已完成'],
  ['4', '08-15', '09:00-10:30', '柔韧与控制训练', '已完成'], ['3', '08-08', '09:00-10:30', '把杆基础训练', '已完成'],
  ['2', '08-01', '09:00-10:30', '体态与站姿训练', '已完成'], ['1', '07-25', '09:00-10:30', '课程导入与基础测评', '已完成']
].map(([number, date, time, theme, status]) => ({ number, date, time, theme, status }));
const teacherClassRecords = [
  ['7', '2026-09-05', '组合训练', '完成组合前半段动作串联，重点练习节奏与方位。', '18/20人出勤', '作业已发布'],
  ['6', '2026-08-29', '身韵练习', '掌握提沉冲靠基础方法，练习呼吸与动作配合。', '19/20人出勤', '作业已点评'],
  ['5', '2026-08-22', '基本手位与脚位', '复习七个基本手位，完成脚位转换训练。', '20/20人出勤', '未发布作业'],
  ['4', '2026-08-15', '柔韧与控制训练', '完成压腿、踢腿和核心控制练习。', '18/20人出勤', '作业已点评'],
  ['3', '2026-08-08', '把杆基础训练', '完成擦地、蹲和小踢腿基础组合。', '20/20人出勤', '作业已发布'],
  ['2', '2026-08-01', '体态与站姿训练', '建立正确站姿，练习肩背与核心控制。', '19/20人出勤', '未发布作业'],
  ['1', '2026-07-25', '课程导入与基础测评', '完成学员基础能力观察并讲解课堂规范。', '20/20人出勤', '未发布作业']
].map(([number, date, theme, goal, attendance, homework]) => ({ number, date, theme, goal, attendance, homework }));
let selectedClassStatus = '全部';
// CR-2026-135：记录每个班级上次停留的页签与滚动位置，重新渲染后不丢阅读位置。
let classDetailRenderedId = '';
const classDetailUiKey = 'hbyx-teacher-class-ui';
function readClassUiState() { try { return JSON.parse(sessionStorage.getItem(classDetailUiKey) || '{}') || {}; } catch { return {}; } }
function writeClassUiState(classId, patch) {
  if (!classId) return;
  const all = readClassUiState();
  all[classId] = { ...(all[classId] || {}), ...patch };
  try { sessionStorage.setItem(classDetailUiKey, JSON.stringify(all)); } catch { /* 隐私模式忽略 */ }
}
function classStatusTone(status) { return status === '进行中' ? 'green' : status === '待开课' ? 'amber' : 'gray'; }
function renderClassCard(item) {
  const progress = Math.round((item.completed / item.total) * 100);
  return `<a class="teacher-class-card" href="${relativePath(`/teacher/pages/class-overview.html?class=${item.id}`)}"><div class="teacher-class-card-head"><div><span class="teacher-class-kicker">${tEsc(item.campus)}</span><h3>${tEsc(item.name)}</h3><p>${tEsc(item.course)}</p></div>${tPill(item.status, classStatusTone(item.status))}</div><div class="teacher-class-card-stats"><div><strong>${tEsc(item.students)}</strong><span>学员人数</span></div><div class="teacher-class-progress"><div class="teacher-class-progress-head"><span>课次进度</span><strong>${tEsc(item.completed)}/${tEsc(item.total)} 次</strong></div><div class="teacher-class-progress-track"><i style="width:${progress}%"></i></div></div></div><div class="teacher-class-card-foot"><span>${item.status === '已结束' ? '状态' : '下一节课'}</span><strong>${tEsc(item.next)}</strong><span class="teacher-class-arrow" aria-hidden="true">›</span></div></a>`;
}
function renderClasses() {
  const myClasses = currentTeacherClasses();
  const visibleClasses = selectedClassStatus === '全部' ? myClasses : myClasses.filter(item => item.status === selectedClassStatus);
  const filterTabs = ['全部', '进行中', '待开课', '已结束'];
  const list = visibleClasses.length ? visibleClasses.map(renderClassCard).join('') : `<section class="teacher-schedule-empty"><strong>暂无${tEsc(selectedClassStatus)}班级</strong><p>切换其他状态查看我的班级。</p></section>`;
  tLayout(tStack(`<section class="teacher-class-header"><div><span class="mp-eyebrow">教学管理</span><h2>我的班级</h2><p>查看任课班级的学员、课次和教学进度。</p></div><strong>${myClasses.length}<small>个班级</small></strong></section>`, `<nav class="teacher-class-filters" aria-label="班级状态筛选" role="tablist">${filterTabs.map(status => `<button type="button" role="tab" aria-selected="${status === selectedClassStatus}" class="${status === selectedClassStatus ? 'active' : ''}" data-class-filter="${status}">${status}<span>${status === '全部' ? myClasses.length : myClasses.filter(item => item.status === status).length}</span></button>`).join('')}</nav>`, `<section class="teacher-class-list" aria-live="polite"><div class="teacher-class-list-head"><h3>${selectedClassStatus === '全部' ? '全部班级' : selectedClassStatus}</h3><span>${visibleClasses.length} 个</span></div>${list}</section>`));
}
function currentTeacherClass() {
  const list = currentTeacherClasses();
  const id = new URLSearchParams(location.search).get('class');
  // CR-2026-133：带 class 参数但不在本人授课范围内时返回 null（渲染空态），
  // 不再回退到 list[0]——回退会让教师看到别人的班级。
  if (id) return list.find(item => item.id === id) || null;
  return list[0] || null;
}
// CR-2026-133：进度改为「已完成 x / 共 y · 剩余 z」+ 进度条，替代原先无标签的刻度小竖条。
function teacherClassProgress(classItem) {
  const total = Number(classItem.total || 0);
  const completed = Number(classItem.completed || 0);
  const rest = Math.max(0, total - completed);
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const progressText = rest > 0 ? `已完成 ${completed} / 共 ${total} 次 · 剩余 ${rest} 次` : `已完成 ${completed} / 共 ${total} 次`;
  return `<section class="teacher-class-detail-progress"><div><span>课次进度</span><strong>${progressText}</strong></div><div class="teacher-class-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${completed}" aria-label="已完成 ${completed} 次，共 ${total} 次"><i style="width:${percent}%"></i></div></section>`;
}
function teacherClassRecentAdjustment(classItem) {
  const logs = Array.isArray(classItem.adjustmentLogs) ? classItem.adjustmentLogs : [];
  const log = [...logs].sort((a, b) => String(a.adjustedAt || '').localeCompare(String(b.adjustedAt || ''))).pop();
  if (!log) return '';
  const point = value => [value?.date, [value?.startTime, value?.endTime].filter(Boolean).join('–')].filter(Boolean).join(' ');
  const before = point(log.before);
  const after = log.after?.status === '已停课' ? '已停课' : point(log.after);
  return `<div class="teacher-class-adjustment"><div><strong>最近调整</strong>${tPill('教务已更新', 'gray')}</div><p>${tEsc([before && `调整前 ${before}`, after && `调整后 ${after}`].filter(Boolean).join(' · ') || log.type || '课次安排已更新')}</p><small>${tEsc(log.reason || '请按最新课次安排上课')}${log.adjustedAt ? ` · ${tEsc(log.adjustedAt)}` : ''}</small></div>`;
}
// I1-TEACHER-CLASS-01：教师考勤＝开始上课时间／结束上课时间／教学记录文本，并入课次行（对齐学员端「一课一行」）。
function teacherClassOverview(classItem) {
  const metrics = teacherClassMetrics(classItem);
  const upcoming = (classItem.sessions || []).filter((session) => !isSessionPast(session));
  const nextSession = upcoming.find((session) => session.status !== '已停课') || null;
  const stoppedUpcoming = upcoming.filter((session) => session.status === '已停课').length;
  // CR-2026-133：下一节课卡直接给行动入口（开始上课／进入课次），教师从班级进来即可开课；
  // 已停课课次不占「下一节课」位，末次课全部完成后给结课文案。
  const venue = nextSession ? sessionVenueOf(nextSession, classItem) : null;
  const totalLessons = Number(classItem.total || 0);
  const completedLessons = Number(classItem.completed || 0);
  const nextStatus = nextSession && nextSession.status === '上课中' ? '上课中' : '待上课';
  const nextAction = nextSession
    ? nextStatus === '上课中'
      ? `<a class="mp-button" href="${relativePath(`/teacher/pages/class-detail.html?class=${classItem.id}&lesson=${nextSession.index}`)}">进入课堂</a>`
      : tButton('开始上课', `data-teacher-action="start-schedule" data-lesson-id="${classItem.id}#${nextSession.index}"`)
    : '';
  const relativeDate = nextSession ? (() => {
    const today = new Date(`${DEMO_TODAY}T00:00:00`);
    const date = new Date(`${nextSession.date}T00:00:00`);
    const days = Math.round((date - today) / 86400000);
    return days === 0 ? '今天' : days === 1 ? '明天' : days === 2 ? '后天' : `${nextSession.date.slice(5)} ${nextSession.weekday || ''}`;
  })() : '';
  const nextBlock = nextSession
    ? `<section class="teacher-class-next-lesson"><div class="teacher-class-detail-section-head"><h3>下一节课</h3>${tPill(nextStatus, lessonTone(nextStatus))}</div><a href="${relativePath(`/teacher/pages/class-detail.html?class=${classItem.id}&lesson=${nextSession.index}`)}"><div class="teacher-class-next-time"><strong>${tEsc(nextSession.startTime || '')}</strong><span>${tEsc(relativeDate)} · ${tEsc(nextSession.date)} ${tEsc(nextSession.weekday || '')}</span></div><div><strong>第${nextSession.index}次课 · ${tEsc(classItem.course)}</strong><p>${tEsc(venue.campus)} · ${tEsc(venue.room)}</p></div><span class="teacher-class-arrow" aria-hidden="true">›</span></a></section><div class="teacher-class-next-actions">${nextAction}<a class="mp-button secondary" href="${relativePath(`/teacher/pages/class-detail.html?class=${classItem.id}&lesson=${nextSession.index}`)}">查看课次</a></div>`
    : stoppedUpcoming
      ? `<section class="teacher-class-next-lesson is-empty"><div class="teacher-class-detail-section-head"><h3>下一节课</h3>${tPill('待安排', 'gray')}</div><p>剩余 ${stoppedUpcoming} 次课已由教务停课，补课安排确认后会通过消息通知。</p></section>`
      : totalLessons === 0
        ? `<section class="teacher-class-next-lesson is-empty"><div class="teacher-class-detail-section-head"><h3>下一节课</h3>${tPill('待排课', 'amber')}</div><p>当前班级尚未生成课次，排课完成后会在这里显示。</p></section>`
        : `<section class="teacher-class-next-lesson is-empty"><div class="teacher-class-detail-section-head"><h3>教学进度</h3>${tPill('已完成', 'green')}</div><p>本班 ${totalLessons} 次课已全部完成，可在“课次”和“结业”中查看后续记录。</p></section>`;
  const attendanceMetric = metrics.attendance === null ? '—' : `${metrics.attendance}<small>%</small>`;
  const homeworkMetric = metrics.homework === null ? '—' : `${metrics.homework}<small>%</small>`;
  const metricsNote = metrics.attendanceDetail.expected || metrics.homeworkDetail.expected
    ? `<p class="teacher-class-metrics-note">按已上课次统计：有效出勤 ${metrics.attendanceDetail.present}/${metrics.attendanceDetail.expected} 次（迟到计出勤）· 已提交作业 ${metrics.homeworkDetail.submitted}/${metrics.homeworkDetail.expected} 份。</p>`
    : '<p class="teacher-class-metrics-note">首次上课后生成出勤率与作业提交率。</p>';
  const teachingProgress = `<section class="teacher-class-teaching-progress"><div class="teacher-class-detail-section-head"><h3>班级教学进度</h3><span>${completedLessons}/${totalLessons || '—'} 次</span></div><dl class="teacher-class-core-metrics"><div><dt>学员人数</dt><dd>${classItem.students}<small>人</small></dd></div><div><dt>平均出勤率</dt><dd>${attendanceMetric}</dd></div><div><dt>作业提交率</dt><dd>${homeworkMetric}</dd></div></dl>${metricsNote}${teacherClassProgress(classItem)}</section>`;
  const arrangement = `<section class="teacher-class-arrange"><div class="teacher-class-detail-section-head"><h3>上课安排</h3><button type="button" class="teacher-class-section-link" data-class-detail-tab="lessons">查看全部课次 <span aria-hidden="true">›</span></button></div><dl class="teacher-class-arrange-rows"><div class="wide"><dt>上课安排</dt><dd>${tEsc([classItem.schedule, [classItem.campus, classItem.classroom].filter(Boolean).join(' · ')].filter(Boolean).join(' · ') || '以班级通知为准')}</dd></div><div><dt>${completedLessons >= totalLessons && totalLessons > 0 ? '结课日期' : '预计结课'}</dt><dd>${tEsc([...(classItem.sessions || [])].reverse()[0]?.date || '以排课结果为准')}</dd></div></dl>${teacherClassRecentAdjustment(classItem)}</section>`;
  const graduationBlock = classItem.status === '已结束' ? teacherClassGraduationPanel(classItem) : '';
  return `<div class="teacher-class-overview" id="teacher-class-section-overview" data-class-section="overview">${nextBlock}${teacherClassTodoBlock(classItem)}${arrangement}${teachingProgress}${teacherClassStudentsPanel()}${teacherClassLessonsPanel(classItem)}${graduationBlock}</div>`;
}
// CR-2026-133：把本班需要教师跟进的事项收敛成一块待处理区，避免逐段翻找。
function teacherClassTodos(classItem) {
  const roster = classRosterOf(classItem);
  const focus = roster.filter((student) => student.status === '需关注' || Number(student.attendance || 0) < 80 || Number(student.homework || 0) < 80);
  const stopped = (classItem.sessions || []).filter((session) => !isSessionPast(session) && session.status === '已停课');
  const pendingGraduation = demoLocalize(teacherState.graduationRecords).filter((item) => item.className === classItem.name && ['审核中', '需补课', '补课中'].includes(item.status));
  // CR-2026-135：课次已全部完成时，出勤/作业与停课类待办已无法跟进，只保留结业跟进项。
  const allDone = Number(classItem.total || 0) > 0 && Number(classItem.completed || 0) >= Number(classItem.total || 0);
  const items = [];
  if (!allDone && focus.length) items.push({ key: 'students', label: `${focus.length} 名学员出勤或作业低于 80%`, detail: focus.slice(0, 3).map((student) => student.name).join('、') });
  if (!allDone && stopped.length) items.push({ key: 'lessons', label: `第 ${stopped.map((session) => session.index).join('、')} 次课已停课待补课`, detail: stopped[0].stopReason || '补课安排由教务确认后通知' });
  if (classItem.status === '已结束' && pendingGraduation.length) items.push({ key: 'graduation', label: `${pendingGraduation.length} 名学员结业申请处理中`, detail: '教务复核中或需补课' });
  return items;
}
function teacherClassTodoBlock(classItem) {
  const items = teacherClassTodos(classItem);
  if (!items.length) return '';
  return `<section class="teacher-class-todos"><div class="teacher-class-detail-section-head"><h3>本班待处理</h3><span>${items.length} 项</span></div><ul>${items.map((item) => `<li><button type="button" data-class-todo="${item.key}"><strong>${tEsc(item.label)}</strong><small>${tEsc(item.detail)}</small><span aria-hidden="true">›</span></button></li>`).join('')}</ul></section>`;
}
// CR-2026-136：指标口径＝已上课次的考勤／作业记录聚合（不再按名册演示值取平均）。
function teacherClassMetrics(classItem) {
  return {
    attendance: classAttendanceSummary(classItem).rate,
    homework: classHomeworkSummary(classItem).rate,
    attendanceDetail: classAttendanceSummary(classItem),
    homeworkDetail: classHomeworkSummary(classItem)
  };
}
// CR-2026-134：已完成课次的作业状态文案（未提交／点评中／点评完成）。
function classSessionHomeworkText(classItem, session) {
  const summary = lessonHomeworkSummary(classItem, session.index);
  if (summary.mode === '未提交') return `未提交（0/${summary.total}）`;
  if (summary.mode === '点评中') return `点评中（已提交 ${summary.submitted}/${summary.total}，待批改 ${summary.submitted}）`;
  if (summary.mode === '点评完成') return `点评完成（${summary.graded}/${summary.total}）`;
  return '';
}
function teacherClassSessionRow(classItem, session) {
  const completed = isSessionPast(session);
  const stopped = !completed && session.status === '已停课';
  const status = completed ? '已完成' : stopped ? '已停课' : '待上课';
  const venue = sessionVenueOf(session, classItem);
  // CR-2026-133：未开始课次不再渲染「—／—／未填写」三行空考勤；已停课课次给停课说明。
  const facts = completed
    ? `<dl class="teacher-class-session-attendance"><div><dt>开始上课</dt><dd>${tEsc(session.startTime || '—')}</dd></div><div><dt>结束上课</dt><dd>${tEsc(session.endTime || '—')}</dd></div><div class="wide"><dt>教学记录</dt><dd>${tEsc(`第${session.index}次课教学记录：完成${classItem.course}第${session.index}阶段训练要点，课堂执行情况已同步。`)}</dd></div>${classItem.demoHomework ? `<div class="wide"><dt>作业</dt><dd>${tEsc(classSessionHomeworkText(classItem, session))}</dd></div>` : ''}</dl>`
    : stopped
      ? `<dl class="teacher-class-session-attendance"><div class="wide"><dt>停课说明</dt><dd>${tEsc(session.stopReason || '已由教务停课，补课安排另行通知')}</dd></div></dl>`
      : `<p class="teacher-class-session-hint">课次尚未开始，开始上课后登记考勤与教学记录。</p>`;
  return `<article class="teacher-class-session${completed ? ' is-done' : ''}${stopped ? ' is-stopped' : ''}"><div class="teacher-class-session-head"><div><strong>第 ${session.index} 次 · ${tEsc(session.date)} ${tEsc(session.weekday || '')}</strong><small>${tEsc(session.startTime || '—')}–${tEsc(session.endTime || '—')} · ${tEsc(venue.room)}</small></div>${tPill(status, lessonTone(status))}</div>${facts}<a class="teacher-class-session-link" href="${relativePath(`/teacher/pages/class-detail.html?class=${classItem.id}&lesson=${session.index}`)}">${completed ? '查看课次' : '进入课次'}<span aria-hidden="true">›</span></a></article>`;
}
// CR-2026-133：课次段加状态筛选与折叠（默认展示前 3 条），避免授课中／已结课班一次铺开十几次课。
let teacherLessonFilter = '全部';
let teacherLessonsExpanded = false;
function classSessionMatchesFilter(session, filter) {
  const completed = isSessionPast(session);
  const stopped = !completed && session.status === '已停课';
  if (filter === '未开始') return !completed && !stopped;
  if (filter === '已完成') return completed;
  if (filter === '已停课') return stopped;
  return true;
}
function teacherClassLessonsPanel(classItem, { historyOnly = false } = {}) {
  const sessions = [...(classItem.sessions || [])];
  const source = historyOnly ? sessions.filter(isSessionPast) : sessions;
  const done = source.filter(isSessionPast).length;
  const stopped = source.filter((session) => classSessionMatchesFilter(session, '已停课')).length;
  const pending = source.filter((session) => classSessionMatchesFilter(session, '未开始')).length;
  const filter = historyOnly ? '全部' : teacherLessonFilter;
  const counts = [['全部', source.length], ['未开始', pending], ['已完成', done], ['已停课', stopped]];
  const chips = historyOnly ? '' : `<nav class="teacher-class-filters teacher-class-lesson-filters" aria-label="课次筛选">${counts.map(([name, count]) => `<button type="button" class="${filter === name ? 'active' : ''}" data-class-lesson-filter="${name}" aria-pressed="${filter === name}">${name}<span>${count}</span></button>`).join('')}</nav>`;
  const visible = source.filter((session) => classSessionMatchesFilter(session, filter));
  const collapsed = !teacherLessonsExpanded && visible.length > 3;
  const shown = collapsed ? visible.slice(0, 3) : visible;
  const list = shown.length
    ? shown.map((session) => teacherClassSessionRow(classItem, session)).join('')
    : historyOnly
      ? '<div class="teacher-class-empty"><strong>暂无历史课次</strong><p>完成第一节课后，课堂记录会显示在这里。</p></div>'
      : '<div class="teacher-class-empty"><strong>暂无符合条件的课次</strong><p>切换筛选条件查看其他课次。</p></div>';
  const more = visible.length > 3 ? `<button type="button" class="mp-button ghost full" data-class-lessons-more>${collapsed ? `查看全部 ${visible.length} 次课` : '收起'}</button>` : '';
  return `<section class="teacher-class-lessons-panel" id="teacher-class-section-lessons" data-class-section="lessons"><div class="teacher-class-detail-section-head"><h3>${historyOnly ? '历史课次' : '课次与教师考勤'}</h3><span>共 ${source.length} 次课 · 已完成 ${done}${stopped ? ` · 已停课 ${stopped}` : ''}</span></div>${chips}${list}${more}</section>`;
}
// CR-2026-133：结业段补齐「发起结业申请」入口（页面说明的可执行操作要求）与判定依据。
// 结业按班级整体提交、教务按学员复核；出勤率与作业提交率取本班名册统计。
// CR-2026-133：班级名册取报名分班记录并补足到班级报名人数（见 shared/js/class-roster.js）。
// CR-2026-136：名册上的出勤率／作业提交率改为按该班课次考勤与作业记录统计，指标与课次明细同源。
function classRosterOf(classItem) {
  if (!classItem) return [];
  return classRosterFor(classItem.id, Number(classItem.students || 0)).map((student) => {
    const attendance = studentAttendanceRate(classItem, student);
    const homework = studentHomeworkRate(classItem, student);
    const needsFocus = (attendance !== null && attendance < 80) || (homework !== null && homework < 80);
    return { ...student, attendance: attendance === null ? student.attendance : attendance, homework: homework === null ? student.homework : homework, status: needsFocus ? '需关注' : '正常' };
  });
}
function classGraduationState(classItem) {
  const records = demoLocalize(teacherState.graduationRecords).filter((item) => item.className === classItem.name);
  const submittedNames = new Set(records.map((item) => item.student));
  const roster = classRosterOf(classItem);
  const pending = roster.filter((student) => !submittedNames.has(student.name));
  const allLessonsDone = Number(classItem.total || 0) > 0 && Number(classItem.completed || 0) >= Number(classItem.total || 0);
  return { records, pending, allLessonsDone };
}
function teacherClassGraduationPanel(classItem) {
  const { records, pending, allLessonsDone } = classGraduationState(classItem);
  const list = records.length
    ? records.map((item) => `<article class="teacher-class-graduation-row"><div><strong>${tEsc(item.student)}</strong><small>${tEsc(item.completedAt || '')} 结课</small><p class="teacher-class-graduation-facts">出勤率 ${tEsc(item.attendanceRate ?? '—')}% · 作业提交率 ${tEsc(item.homeworkRate ?? '—')}% · 完成课次 ${tEsc(item.lessons || '—')}</p></div>${tPill(item.status, item.status === '已完成' || item.status === '已通过' ? 'green' : item.status === '需补课' || item.status === '补课中' ? 'amber' : '')}</article>`).join('')
    : '<div class="teacher-class-empty"><strong>暂无结业申请</strong><p>本班全部课次完成后，可在这里发起结业申请。</p></div>';
  const applyEntry = allLessonsDone && pending.length
    ? `<div class="teacher-class-graduation-apply"><p>本班课次已全部完成，${pending.length} 名学员可提交结业申请；提交后由教务按学员复核。</p>${tButton('发起结业申请', 'data-class-graduation-apply')}</div>`
    : allLessonsDone && !pending.length
      ? '<p class="teacher-class-graduation-note">本班学员均已提交结业申请，等待教务复核结果。</p>'
      : '<p class="teacher-class-graduation-note">全部课次完成后可发起结业申请。</p>';
  return `<section class="teacher-class-graduation-panel" id="teacher-class-section-graduation" data-class-section="graduation"><div class="teacher-class-detail-section-head"><h3>本班结业申请</h3><span>${records.length} 条</span></div>${list}${applyEntry}</section>`;
}
function openClassGraduationDialog(classItem) {
  const { pending } = classGraduationState(classItem);
  if (!pending.length) { tToast('本班学员均已提交结业申请'); return; }
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-lesson-dialog';
  dialog.innerHTML = `<form class="mp-dialog-card" id="class-graduation-form"><div class="teacher-lesson-dialog-head"><div><span>结业</span><h2>发起结业申请</h2></div><button type="button" data-dialog-close aria-label="关闭">×</button></div><p class="mp-dialog-copy">结业申请按班级整体提交，教务按学员复核；出勤率与作业提交率由本班课次与作业记录统计。</p><div class="mp-field teacher-graduation-picker"><label>提交学员 <b>*</b><small>默认全选，可取消不提交的学员</small></label><div>${pending.map((student) => `<label><input type="checkbox" name="graduation-student" value="${tEsc(student.name)}" checked><span>${tEsc(student.name)}</span><small>出勤 ${tEsc(student.attendance)}% · 作业 ${tEsc(student.homework)}%</small></label>`).join('')}</div></div><div class="mp-field"><label for="class-graduation-comment">综合评语 <b>*</b></label><textarea id="class-graduation-comment" required maxlength="500" placeholder="填写学员本阶段整体表现"></textarea></div><div class="mp-field"><label for="class-graduation-advice">成长建议 <b>*</b></label><textarea id="class-graduation-advice" required maxlength="500" placeholder="填写后续练习与成长建议"></textarea></div><p class="mp-form-error" data-class-graduation-error hidden></p><div class="teacher-lesson-dialog-actions"><button type="button" class="mp-button secondary" data-dialog-close>取消</button><button type="submit" class="mp-button">提交结业申请</button></div></form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = dialog.querySelector('[data-class-graduation-error]');
    const students = [...form.querySelectorAll('[name="graduation-student"]:checked')].map((input) => input.value);
    const comment = dialog.querySelector('#class-graduation-comment').value.trim();
    const advice = dialog.querySelector('#class-graduation-advice').value.trim();
    if (!students.length) { error.hidden = false; error.textContent = '请至少选择一名学员'; return; }
    if (!comment || !advice) { error.hidden = false; error.textContent = '请填写综合评语与成长建议'; return; }
    const lastSession = [...(classItem.sessions || [])].reverse()[0] || {};
    const submittedAt = demoTime();
    const created = students.map((name) => {
      const student = classRosterOf(classItem).find((item) => item.name === name) || {};
      return {
        id: demoId('graduation'), student: name, avatar: name.slice(0, 1), className: classItem.name, course: classItem.course,
        professional: classItem.professional || '', completedAt: lastSession.date || DEMO_TODAY, submittedAt,
        status: '审核中', attendanceRate: student.attendance ?? '—', homeworkRate: student.homework ?? '—',
        lessons: `${classItem.total}/${classItem.total}`, comment, advice,
        timeline: [{ title: '提交结业申请', time: submittedAt, text: '结业材料已提交教务复核。' }]
      };
    });
    teacherState.graduationRecords = [...teacherState.graduationRecords, ...created];
    saveTeacher();
    dialog.close();
    writeClassUiState(classItem.id, { tab: 'graduation' });
    renderClassDetail();
    bindTeacherEvents();
    tToast(`已提交 ${created.length} 名学员的结业申请，等待教务复核`);
  });
  dialog.showModal();
}
// CR-2026-133：学员段加「全部／需关注」筛选与出勤率／作业提交率排序，人数多时先看需要跟进的人。
let teacherStudentFilter = '全部';
let teacherStudentSort = 'default';
let teacherStudentsExpanded = false;
function teacherClassRosterFiltered(classItem = currentTeacherClass(), query = '') {
  if (!classItem) return [];
  let rows = classRosterOf(classItem).filter((item) => item.name.includes(query.trim()));
  if (teacherStudentFilter === '需关注') rows = rows.filter((item) => item.status === '需关注' || Number(item.attendance || 0) < 80 || Number(item.homework || 0) < 80);
  if (teacherStudentSort === 'attendance') rows = [...rows].sort((a, b) => Number(a.attendance) - Number(b.attendance));
  if (teacherStudentSort === 'homework') rows = [...rows].sort((a, b) => Number(a.homework) - Number(b.homework));
  return rows;
}
function teacherClassStudentRows(query = '', { limit = 0 } = {}) {
  const allStudents = teacherClassRosterFiltered(currentTeacherClass(), query);
  const students = limit > 0 ? allStudents.slice(0, limit) : allStudents;
  return students.length ? students.map(item => `<button type="button" class="teacher-class-student-row${item.status === '需关注' ? ' is-focus' : ''}" data-class-student="${item.id}"><span class="teacher-lesson-student-avatar" aria-hidden="true">${tEsc(item.name.slice(0, 1))}</span><span class="teacher-class-student-name"><strong>${tEsc(item.name)}</strong><small>${item.status === '需关注' ? '近期出勤或作业未达标' : '学习状态正常'}</small></span><span class="teacher-class-student-rate"><b>${item.attendance}%</b><small>出勤</small></span><span class="teacher-class-student-rate"><b>${item.homework}%</b><small>作业</small></span><span class="teacher-class-student-arrow" aria-hidden="true">›</span></button>`).join('') : '<div class="teacher-class-detail-empty">未找到该学员</div>';
}
function teacherClassStudentsPanel() {
  const roster = classRosterOf(currentTeacherClass());
  const focus = roster.filter((item) => item.status === '需关注' || Number(item.attendance || 0) < 80 || Number(item.homework || 0) < 80).length;
  const visible = teacherClassRosterFiltered();
  const chips = `<nav class="teacher-class-filters teacher-class-student-filters" aria-label="学员筛选">${[['全部', roster.length], ['需关注', focus]].map(([name, count]) => `<button type="button" class="${teacherStudentFilter === name ? 'active' : ''}" data-class-student-filter="${name}" aria-pressed="${teacherStudentFilter === name}">${name}<span>${count}</span></button>`).join('')}</nav>`;
  const sort = `<label class="teacher-class-student-sort"><span>排序</span><select data-class-student-sort aria-label="学员排序"><option value="default" ${teacherStudentSort === 'default' ? 'selected' : ''}>按姓名</option><option value="attendance" ${teacherStudentSort === 'attendance' ? 'selected' : ''}>出勤率从低到高</option><option value="homework" ${teacherStudentSort === 'homework' ? 'selected' : ''}>作业提交率从低到高</option></select></label>`;
  const collapsed = teacherStudentFilter !== '需关注' && !teacherStudentsExpanded && visible.length > 5;
  const more = visible.length > 5 && teacherStudentFilter !== '需关注' ? `<button type="button" class="mp-button ghost full teacher-class-students-more" data-class-students-more>${collapsed ? `查看全部 ${visible.length} 名学员` : '收起学员列表'}</button>` : '';
  return `<section class="teacher-class-students-panel" id="teacher-class-section-students" data-class-section="students"><div class="teacher-class-detail-section-head"><h3>班级学员</h3><span data-class-student-count>${visible.length} 人</span></div><div class="teacher-class-student-search"><span aria-hidden="true"></span><input type="search" data-class-student-search placeholder="搜索学员姓名" aria-label="搜索学员姓名"></div>${chips}${sort}<div class="teacher-class-student-list" data-class-student-list>${teacherClassStudentRows('', { limit: collapsed ? 5 : 0 })}</div>${more}</section>`;
}
const TEACHER_CLASS_SECTION_NAV = [['overview', '班级信息'], ['lessons', '课次'], ['students', '学员'], ['graduation', '结业']];
const TEACHER_CLASS_SECTION_ALIASES = { overview: 'overview', lessons: 'lessons', timetable: 'lessons', records: 'lessons', attendance: 'lessons', students: 'students', graduation: 'graduation' };
function teacherClassSectionTarget(value) { return TEACHER_CLASS_SECTION_ALIASES[value] || 'overview'; }
function teacherClassSectionNav(classItem) {
  const sections = TEACHER_CLASS_SECTION_NAV.filter(([key]) => key !== 'graduation' || classItem.status === '已结束');
  return `<nav class="teacher-class-detail-tabs" aria-label="班级详情分段" role="navigation">${sections.map(([key, label]) => `<button type="button" class="${key === 'overview' ? 'active' : ''}" data-class-section-nav="${key}" aria-current="${key === 'overview' ? 'location' : 'false'}">${label}</button>`).join('')}</nav>`;
}
function scrollToTeacherClassSection(key, behavior = 'smooth') {
  const target = document.getElementById(`teacher-class-section-${teacherClassSectionTarget(key)}`);
  if (target) target.scrollIntoView({ behavior, block: 'start' });
}
function bindTeacherClassSectionNav() {
  const nav = document.querySelector('.teacher-class-detail-tabs');
  const sections = [...document.querySelectorAll('[data-class-section]')];
  if (!nav || !sections.length) return;
  window.__hbyxTeacherClassSectionCleanup?.();
  const buttons = [...nav.querySelectorAll('[data-class-section-nav]')];
  const classItem = currentTeacherClass();
  const activate = key => buttons.forEach(button => {
    const active = button.dataset.classSectionNav === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'location' : 'false');
  });
  const onScroll = () => {
    const line = nav.getBoundingClientRect().bottom + 12;
    let current = sections[0].dataset.classSection;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= line) current = section.dataset.classSection; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].dataset.classSection;
    activate(current);
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.classSectionNav;
    writeClassUiState(classItem && classItem.id, { tab: target });
    scrollToTeacherClassSection(target);
  }));
  window.addEventListener('scroll', onScroll, { passive: true });
  window.__hbyxTeacherClassSectionCleanup = () => window.removeEventListener('scroll', onScroll);
  onScroll();
  const requested = new URLSearchParams(location.search).get('tab') || readClassUiState()[classItem && classItem.id]?.tab;
  const target = teacherClassSectionTarget(requested);
  if (requested && target !== 'overview') setTimeout(() => scrollToTeacherClassSection(target, 'auto'), 80);
}
function renderClassDetail() {
  const classItem = currentTeacherClass();
  if (!classItem) {
    const requested = new URLSearchParams(location.search).get('class');
    tLayout(tStack(tCard(requested
      ? `<h2>该班级不在你的授课范围</h2><p>你只能查看本人任教的班级；如需协助请联系教务。</p><a class="mp-button secondary" href="${relativePath('/teacher/pages/classes.html')}">返回我的班级</a>`
      : `<h2>暂无班级</h2><p>当前没有已分配的授课班级。</p><a class="mp-button secondary" href="${relativePath('/teacher/pages/classes.html')}">返回我的班级</a>`)));
    return;
  }
  if (classItem.id !== classDetailRenderedId) classDetailRenderedId = classItem.id;
  const totalLessons = Number(classItem.total || 0);
  const completedLessons = Number(classItem.completed || 0);
  const headerSummary = `<dl><div><dt>授课教师</dt><dd>${tEsc(classItem.teacher)}</dd></div><div><dt>所属校区</dt><dd>${tEsc(classItem.campus)}</dd></div><div><dt>学员人数</dt><dd>${tEsc(classItem.students)} 人</dd></div><div><dt>课次进度</dt><dd>${totalLessons ? `${completedLessons}/${totalLessons} 次` : '待排课'}</dd></div></dl>`;
  tLayout(tStack(`<section class="teacher-class-detail-head"><div class="teacher-class-detail-title"><span>${tEsc(classItem.course)} · ${tEsc(classItem.teacher)}老师</span><h2>${tEsc(classItem.name)}</h2></div>${tPill(classItem.status, classStatusTone(classItem.status))}${headerSummary}</section>`, teacherClassSectionNav(classItem), `<section class="teacher-class-detail-panel" aria-live="polite">${teacherClassOverview(classItem)}</section>`));
}
// I1-TEACHER-CLASS-02：学员详情的作业记录按该学员的课次生成（原来为固定 2 项演示）。
// CR-2026-136：学员作业记录读课次作业记录（与课次详情提交情况一致）。
function studentHomeworkRecordsImpl(student) {
  const classItem = currentTeacherClass();
  if (!classItem) return [];
  return studentHomeworkHistory(classItem, student);
}
let teacherStudentDetailTab = 'attendance';
function currentTeacherStudentContext() {
  const classItem = currentTeacherClass();
  const studentId = new URLSearchParams(location.search).get('student');
  const student = classItem && studentId ? classRosterOf(classItem).find(item => item.id === studentId) : null;
  return { classItem, student };
}
function teacherStudentDetailSummary(classItem, student) {
  const attendance = studentAttendanceRate(classItem, student);
  const homework = studentHomeworkRate(classItem, student);
  const lessons = countedSessionsOf(classItem).length;
  return `<section class="teacher-student-detail-identity"><div class="teacher-student-detail-avatar" aria-hidden="true">${tEsc(student.name.slice(0, 1))}</div><div><span class="mp-eyebrow">学员学习档案</span><h2>${tEsc(student.name)}</h2><p>${tEsc(classItem.name)} · ${tEsc(classItem.course)}</p></div>${tPill(student.status, student.status === '需关注' ? 'amber' : 'green')}</section><dl class="teacher-student-detail-metrics"><div><dt>出勤率</dt><dd>${attendance === null ? '—' : `${attendance}%`}</dd></div><div><dt>作业提交率</dt><dd>${homework === null ? '—' : `${homework}%`}</dd></div><div><dt>已上课次</dt><dd>${lessons}<small>次</small></dd></div></dl>`;
}
function teacherStudentDetailBasic(classItem, student) {
  const completed = Number(classItem.completed || 0);
  const total = Number(classItem.total || 0);
  return `<section class="teacher-student-detail-section"><div class="teacher-student-detail-section-head"><h3>基本信息</h3><span>当前班级</span></div><dl class="teacher-student-detail-facts"><div><dt>学员姓名</dt><dd>${tEsc(student.name)}</dd></div><div><dt>所属班级</dt><dd>${tEsc(classItem.name)}</dd></div><div><dt>所属课程</dt><dd>${tEsc(classItem.course)}</dd></div><div><dt>授课教师</dt><dd>${tEsc(classItem.teacher)}</dd></div><div><dt>学习状态</dt><dd>${tEsc(student.status)}</dd></div><div><dt>课次进度</dt><dd>${completed} / ${total || '—'} 次</dd></div></dl></section>`;
}
function teacherStudentDetailAttendance(classItem, student) {
  const records = studentAttendanceHistory(classItem, student, 50);
  const counts = records.reduce((map, row) => { map[row.status] = (map[row.status] || 0) + 1; return map; }, {});
  const list = records.length ? records.map(row => `<article class="teacher-student-detail-record"><div><strong>第 ${row.index} 次课</strong><span>${tEsc(row.date)}</span></div>${tPill(row.status, row.status === '已到' ? 'green' : row.status === '缺勤' ? 'gray' : 'amber')}</article>`).join('') : '<p class="mp-muted">暂无已完成课次的考勤记录。</p>';
  return `<section class="teacher-student-detail-section"><div class="teacher-student-detail-section-head"><h3>学员考勤</h3><span>${records.length} 次已记录</span></div><p class="teacher-student-detail-counts">已到 ${counts['已到'] || 0} · 迟到 ${counts['迟到'] || 0} · 请假 ${counts['请假'] || 0} · 缺勤 ${counts['缺勤'] || 0}</p><div class="teacher-student-detail-record-list">${list}</div></section>`;
}
function teacherStudentDetailHomework(classItem, student) {
  const records = studentHomeworkHistory(classItem, student, 50);
  const submitted = records.filter(row => row.submitted).length;
  const list = records.length ? records.map(row => `<article class="teacher-student-detail-record teacher-student-detail-homework-record"><div><strong>第 ${row.lesson} 次课作业</strong><span>${tEsc(row.date)}</span></div><div>${tPill(row.submitted ? '已提交' : '未提交', row.submitted ? 'green' : 'gray')}${row.submitted ? tPill(classItem.demoHomework === '点评完成' ? '点评完成' : '待点评', classItem.demoHomework === '点评完成' ? 'green' : 'amber') : ''}</div></article>`).join('') : '<p class="mp-muted">本班暂无已完成课次。</p>';
  return `<section class="teacher-student-detail-section"><div class="teacher-student-detail-section-head"><h3>学员作业</h3><span>${submitted}/${records.length} 份已提交</span></div><p class="teacher-student-detail-counts">已提交 ${submitted} · 未提交 ${records.length - submitted}</p><div class="teacher-student-detail-record-list">${list}</div></section>`;
}
function renderTeacherStudentDetail() {
  const { classItem, student } = currentTeacherStudentContext();
  if (!classItem || !student) {
    tLayout(tStack(tCard(`<h2>学员档案不可用</h2><p>请从本人班级的学员列表进入，或检查班级与学员参数。</p><a class="mp-button secondary" href="${relativePath(classItem ? `/teacher/pages/class-overview.html?class=${classItem.id}` : '/teacher/pages/classes.html')}">返回班级详情</a>`)));
    return;
  }
  const tabs = [['basic', '基本信息'], ['attendance', '考勤'], ['homework', `作业${studentHomeworkHistory(classItem, student, 50).filter(row => !row.submitted).length ? ' · 待处理' : ''}`]];
  const body = teacherStudentDetailTab === 'basic' ? teacherStudentDetailBasic(classItem, student) : teacherStudentDetailTab === 'homework' ? teacherStudentDetailHomework(classItem, student) : teacherStudentDetailAttendance(classItem, student);
  tLayout(tStack(teacherStudentDetailSummary(classItem, student), `<nav class="teacher-student-detail-tabs" aria-label="学员档案" role="tablist">${tabs.map(([key, label]) => `<button type="button" role="tab" aria-selected="${key === teacherStudentDetailTab}" class="${key === teacherStudentDetailTab ? 'active' : ''}" data-student-detail-tab="${key}">${label}</button>`).join('')}</nav>`, `<main class="teacher-student-detail-panel" role="tabpanel">${body}</main>`));
}
function bindTeacherStudentDetailEvents() {
  document.querySelectorAll('[data-student-detail-tab]').forEach(button => button.addEventListener('click', () => {
    teacherStudentDetailTab = button.dataset.studentDetailTab;
    renderTeacherStudentDetail();
    bindTeacherStudentDetailEvents();
    window.scrollTo({ top: 0 });
  }));
}
function openTeacherClassStudent(student) {
  const studentHomeworkRecords = studentHomeworkRecordsImpl(student);
  const attendanceRecords = studentAttendanceRecords(student);
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-class-student-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><div class="teacher-class-student-dialog-head"><div class="teacher-class-student-profile"><span class="teacher-lesson-student-avatar" aria-hidden="true">${tEsc(student.name.slice(0, 1))}</span><div><small>学员学习档案</small><h2>${tEsc(student.name)}</h2></div></div><button type="button" data-class-student-close aria-label="关闭">×</button></div><dl class="teacher-class-student-summary"><div><dt>出勤率</dt><dd>${student.attendance}%</dd></div><div><dt>作业完成率</dt><dd>${student.homework}%</dd></div><div><dt>学习状态</dt><dd>${tEsc(student.status)}</dd></div></dl><section class="teacher-class-student-record-section"><div class="teacher-class-detail-section-head"><h3>近期出勤</h3><span>最近4次课</span></div><div class="teacher-class-student-attendance">${attendanceRecords.map(([date, lesson, status]) => `<div><span>${date}</span><strong>${lesson}</strong>${tPill(status, status === '已到' ? 'green' : status === '缺勤' ? 'gray' : 'amber')}</div>`).join('')}</div></section><section class="teacher-class-student-record-section"><div class="teacher-class-detail-section-head"><h3>作业记录</h3><span>按课次 · 最近 ${studentHomeworkRecords.length} 次</span></div><div class="teacher-class-student-homework">${studentHomeworkRecords.length ? studentHomeworkRecords.map((row) => `<article><div><strong>第${row.lesson}次课作业</strong>${tPill(row.submitted ? '已提交' : '未提交', row.submitted ? 'green' : 'gray')}</div><p>${tEsc(row.date)} · ${tEsc(row.note)}</p></article>`).join('') : '<p class="mp-muted">本班暂无已完成课次。</p>'}</div></section><button type="button" class="mp-button full secondary" data-class-student-close>关闭</button></div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-class-student-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.showModal();
}
function bindTeacherClassStudentRows() {
  document.querySelectorAll('[data-class-student]').forEach(button => button.addEventListener('click', () => {
    const student = classRosterOf(currentTeacherClass()).find(item => item.id === button.dataset.classStudent);
    const classItem = currentTeacherClass();
    if (student && classItem) location.href = relativePath(`/teacher/pages/student-detail.html?class=${encodeURIComponent(classItem.id)}&student=${encodeURIComponent(student.id)}`);
  }));
}
function refreshClassDetail({ anchor = false } = {}) {
  const scrollY = window.scrollY;
  renderClassDetail();
  bindTeacherEvents();
  if (anchor) {
    const nav = document.querySelector('.teacher-class-detail-tabs');
    if (nav) { window.scrollTo({ top: Math.max(0, nav.getBoundingClientRect().top + window.scrollY - 8) }); return; }
  }
  window.scrollTo({ top: scrollY });
}
function bindClassDetailEvents() {
  bindTeacherClassStudentRows();
  document.querySelector('[data-class-graduation-apply]')?.addEventListener('click', () => { const classItem = currentTeacherClass(); if (classItem) openClassGraduationDialog(classItem); });
  document.querySelectorAll('[data-class-lesson-filter]').forEach(button => button.addEventListener('click', () => { teacherLessonFilter = button.dataset.classLessonFilter; teacherLessonsExpanded = false; refreshClassDetail(); }));
  document.querySelector('[data-class-lessons-more]')?.addEventListener('click', () => { teacherLessonsExpanded = !teacherLessonsExpanded; refreshClassDetail(); });
  document.querySelectorAll('[data-class-student-filter]').forEach(button => button.addEventListener('click', () => { teacherStudentFilter = button.dataset.classStudentFilter; teacherStudentsExpanded = false; refreshClassDetail(); }));
  document.querySelector('[data-class-students-more]')?.addEventListener('click', () => { teacherStudentsExpanded = !teacherStudentsExpanded; refreshClassDetail(); });
  document.querySelector('[data-class-student-sort]')?.addEventListener('change', (event) => { teacherStudentSort = event.target.value; refreshClassDetail(); });
  document.querySelectorAll('[data-class-todo]').forEach(button => button.addEventListener('click', () => { const classItem = currentTeacherClass(); const target = teacherClassSectionTarget(button.dataset.classTodo); writeClassUiState(classItem && classItem.id, { tab: target }); scrollToTeacherClassSection(target); }));
  document.querySelector('[data-class-student-search]')?.addEventListener('input', event => {
    const query = event.target.value;
    const visible = teacherClassRosterFiltered(currentTeacherClass(), query);
    const list = document.querySelector('[data-class-student-list]');
    const count = document.querySelector('[data-class-student-count]');
    const more = document.querySelector('[data-class-students-more]');
    if (list) list.innerHTML = teacherClassStudentRows(query);
    if (count) count.textContent = `${visible.length} 人`;
    if (more) more.hidden = Boolean(query.trim());
    bindTeacherClassStudentRows();
  });
}
// I1-DEC-19: the teacher app and the admin course center share one application seed and one id set.
const teacherApplications = applicationSeed();
function currentTeacher() {
  const requested = new URLSearchParams(location.search).get('teacher') || sessionStorage.getItem('hbyx-teacher-id') || defaultTeacherId();
  return teacherAccounts.find(item => item.id === requested) || teacherAccounts[0];
}
function nextApplicationId() {
  const used = allApplicationRecords().map(item => Number((item.id.match(/^CR-\d{4}-(\d{4})$/) || [])[1])).filter(Number.isFinite);
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `CR-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`;
}
function applicationTone(status) { return status === '已通过' ? 'green' : status === '待审核' ? 'amber' : 'gray'; }
function allApplicationRecords() {
  const shared = readDemoState().applications || [];
  const merged = teacherApplications.map(item => ({ ...item, ...(shared.find(record => record.id === item.id) || {}) }));
  return [...merged, ...shared.filter(record => !teacherApplications.some(item => item.id === record.id))].map(applicationWithStatus).filter(item => item.status !== '草稿');
}
function teacherApplicationRecords() {
  const teacher = currentTeacher();
  return allApplicationRecords().filter(item => item.teacherId ? item.teacherId === teacher.id : item.teacher === teacher.name);
}
function applicationWithStatus(item) {
  const shared = readDemoState().applications.some(record => record.id === item.id);
  const status = shared ? item.status : teacherState.applicationUpdates[item.id] || item.status;
  const normalized = status === '审核中' ? '待审核' : status;
  // CR-2026-084：重提后不展示上一轮审核记录——待审核状态不投影审核意见、审核人与审核时间。
  const pending = normalized === '待审核';
  return {
    ...item,
    status: normalized,
    review: pending ? '' : item.review,
    reviewedBy: pending ? '' : item.reviewedBy,
    reviewedAt: pending ? '' : item.reviewedAt
  };
}
function currentApplication() {
  const id = new URLSearchParams(location.search).get('application');
  return teacherApplicationRecords().find(item => item.id === id) || teacherApplicationRecords()[0];
}
// CR-2026-033 §3：申报列表的计数块改为可点击的五态筛选（与状态机 SM-COURSE-APPLICATION 同源），状态进 URL。
const TEACHER_APPLICATION_STATUSES = ['待审核', '已通过', '已驳回', '已撤销'];
function teacherApplicationFilter() {
  const requested = new URLSearchParams(location.search).get('status') || '全部';
  return requested === '全部' || TEACHER_APPLICATION_STATUSES.includes(requested) ? requested : '全部';
}
function teacherApplicationCard(item) {
  const reviewLine = item.review && item.status !== '待审核'
    ? `<div class="teacher-application-reason">审核意见：${tEsc(item.review)}</div>`
    : '';
  return `<a class="teacher-application-card" href="${relativePath(`/teacher/pages/application-detail.html?application=${item.id}`)}"><div class="teacher-application-card-head"><div><span>${tEsc(item.date)} 提交 · ${tEsc(item.id)}</span><h3>${tEsc(item.name)}</h3></div>${tPill(item.status, applicationTone(item.status))}</div><p>${tEsc(item.type)} · ${tEsc(item.professional || item.major)}${item.hours ? ` · ${item.hours}课时` : ''}</p>${reviewLine}<div class="teacher-application-card-foot"><span class="teacher-application-action">查看详情</span><span aria-hidden="true">›</span></div></a>`;
}
function renderApplications() {
  // 列表按提交时间倒序（显式排序，不依赖数据源顺序）。
  const applications = teacherApplicationRecords().slice().sort((a, b) => String(b.submittedAt || b.date || '').localeCompare(String(a.submittedAt || a.date || '')));
  const active = teacherApplicationFilter();
  const visible = active === '全部' ? applications : applications.filter(item => item.status === active);
  const tabs = [['全部', applications.length], ...TEACHER_APPLICATION_STATUSES.map(status => [status, applications.filter(item => item.status === status).length])];
  const emptyCopy = active === '全部' ? '暂无课程申报' : `${active}暂无申报`;
  const list = visible.length ? visible.map(teacherApplicationCard).join('') : `<div class="teacher-application-empty">${emptyCopy}</div>`;
  tLayout(tStack(
    `<section class="teacher-application-header"><div><span class="mp-eyebrow">教学内容</span><h2>课程申报</h2><p>发起新课程，查看教研审核进度和结果。</p></div>${tButton('发起申报', 'data-teacher-action="new-application"')}</section>`,
    `<nav class="teacher-application-filters" role="tablist" aria-label="申报状态筛选">${tabs.map(([label, count]) => `<button type="button" role="tab" aria-selected="${active === label}" class="${active === label ? 'active' : ''}" data-application-filter="${label}">${label}<span>${count}</span></button>`).join('')}</nav>`,
    `<section class="teacher-application-list"><div class="teacher-application-list-head"><h3>${active === '全部' ? '我的申报' : `${active}申报`}</h3><span>共 ${visible.length} 条</span></div>${list}</section>`
  ));
  document.querySelectorAll('[data-application-filter]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.applicationFilter;
    const url = new URL(location.href);
    if (value === '全部') url.searchParams.delete('status'); else url.searchParams.set('status', value);
    history.replaceState(null, '', url);
    renderApplications();
  }));
}
function renderApplicationCreate() {
  const requestedId = new URLSearchParams(location.search).get('application');
  const teacherProfile = currentTeacher();
  const source = requestedId ? currentApplication() : { id: '', name: '', professional: teacherProfile.professional, type: '面授课程', hours: 16, intro: '', file: '' };
  const editing = Boolean(requestedId);
  tLayout(tStack(`<section class="teacher-application-detail-head"><div>${tPill(editing ? '编辑中' : '新申报')}<h2>${editing ? '编辑课程申报' : '发起课程申报'}</h2><p>教师资料由系统自动带入，课程信息请完整填写。</p></div></section>`, `<section class="teacher-application-form"><div class="teacher-form-section"><div class="teacher-form-section-head"><h3>教师信息</h3><span>系统带入</span></div><div class="teacher-readonly-grid"><div><span>教师姓名</span><strong>${tEsc(teacherProfile.name)}</strong></div><div><span>教师工号</span><strong>${tEsc(teacherProfile.no)}</strong></div><div><span>教学单位</span><strong>${tEsc(teacherProfile.unit)}</strong></div><div><span>专业方向</span><strong>${tEsc(teacherProfile.professional)}</strong></div><div><span>职称</span><strong>${tEsc(teacherProfile.title)}</strong></div></div></div><div class="teacher-form-section"><div class="teacher-form-section-head"><h3>申报内容</h3><span>带 * 为必填</span></div><div class="mp-form"><div class="mp-field"><label for="application-name">课程名称 <b>*</b></label><input id="application-name" value="${tEsc(source.name)}" maxlength="100" placeholder="请输入课程名称"></div><div class="mp-field"><label>所属专业 <b>*</b><small>按门类、分类、专业逐级选择</small></label><div class="teacher-professional-cascade"><select id="application-discipline" aria-label="专业门类"><option>艺术学</option><option>教育学</option></select><select id="application-category" aria-label="专业分类"><option>舞蹈类</option><option>音乐类</option></select><select id="application-professional" aria-label="专业">${[...new Set([teacherProfile.professional, '舞蹈表演', '音乐表演', '音乐学'])].map(name => `<option ${source.professional === name ? 'selected' : ''}>${name}</option>`).join('')}</select></div></div><div class="mp-field"><label>课程类型 <b>*</b></label><div class="teacher-radio-row"><label><input type="radio" name="application-type" value="面授课程" ${source.type === '面授课程' ? 'checked' : ''}>面授课程</label><label><input type="radio" name="application-type" value="视频课程" ${source.type === '视频课程' ? 'checked' : ''}>视频课程</label></div></div><div class="mp-field" id="application-hours-field"><label for="application-hours">总课时 <b>*</b><small>面授课程用于生成课次和工资统计</small></label><input id="application-hours" type="number" min="1" value="${tEsc(source.hours || 16)}" placeholder="请输入总课时"></div><div class="mp-field"><label for="application-difficulty">难度等级 <b>*</b><small>学员端卡片与筛选按此展示</small></label><select id="application-difficulty"><option value="">请选择难度等级</option>${dictionaryItems('course_difficulty').map(value => `<option ${source.difficulty === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="mp-field"><label>适合年龄 <b>*</b><small>可多选</small></label><div class="teacher-radio-row">${dictionaryItems('suitable_age').map(value => `<label><input type="checkbox" name="application-age" value="${value}" ${(source.ages || []).includes(value) ? 'checked' : ''} />${value}</label>`).join('')}</div></div><div class="mp-field"><label for="application-intro">课程简介</label><textarea id="application-intro" placeholder="补充课程目标、教学内容和适合人群">${tEsc(source.intro)}</textarea></div><div class="mp-field"><label for="application-file">附加材料</label><input type="file" id="application-file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"><small class="mp-muted" id="application-file-name">${source.file ? `已选择：${tEsc(source.file)}` : '尚未选择文件'}</small></div></div></div><div class="teacher-application-form-actions"><a class="mp-button secondary" href="${relativePath('/teacher/pages/applications.html')}">取消</a>${tButton('提交审核', 'data-application-form-action="submit"')}</div></section>`));
}
function applicationReviewCopy(item) {
  if (item.status === '待审核') return ['等待教研审核', '申报已提交，审核期间课程内容不可修改。'];
  if (item.status === '已通过') return ['已通过', `教研已于${item.reviewedAt || '近期'}完成审核：${item.review || '审批通过'}`];
  if (item.status === '已驳回') return ['审核未通过', item.review || '请根据审核意见修改后重新提交。'];
  if (item.status === '已撤销') return ['申报已撤销', '该申报已停止审核，可重新编辑后提交。'];
  return ['状态异常', '当前申报状态无法识别，请返回列表后重试。'];
}
function applicationDetailActions(item) {
  const back = `<a class="mp-button secondary" href="${relativePath('/teacher/pages/applications.html')}">返回列表</a>`;
  if (['已驳回', '已撤销'].includes(item.status)) return `${back}<button type="button" class="mp-button" data-application-detail-action="edit">${item.status === '已驳回' ? '修改并重新提交' : '重新发起申报'}</button>`;
  if (item.status === '待审核') return `${back}<button type="button" class="mp-button secondary teacher-application-withdraw" data-application-detail-action="withdraw">撤销申报</button>`;
  return `<a class="mp-button secondary full" href="${relativePath('/teacher/pages/applications.html')}">返回申报列表</a>`;
}
// CR-2026-034 §3.2：仅“已通过”的申报展示后续进度，取值来自课程主体的编排状态；
// 待审核、已驳回、已撤销以及课程主体尚未生成时一律不展示。
function applicationArrangeProgressLabel(courseStatus) {
  if (!courseStatus) return '';
  return courseStatus === '已完成' ? '已完成编排' : '已进入编排';
}
function renderApplicationArrangeProgress(item) {
  if (item.status !== '已通过') return;
  const courseId = item.courseId || courseIdForApplication(item.id);
  const course = (readDemoState().courses || []).find(record => record.id === courseId);
  const label = applicationArrangeProgressLabel(course?.status);
  if (!label) return;
  const detail = course?.status === '已完成'
    ? '教研已完成课程内容编排，课程进入课程库，可按需发布商品或班级。'
    : '教研正在编排课程内容，编排完成后课程会进入课程库。';
  const anchor = document.querySelector('.teacher-application-review-note') || document.querySelector('.teacher-application-view-head');
  anchor?.insertAdjacentHTML('afterend',
    `<section class="teacher-application-arrange-progress"><span>后续进度</span><div>${tPill(label, 'green')}<p>${tEsc(detail)}</p></div></section>`);
}
function renderApplicationDetail() {
  const item = currentApplication();
  const [reviewTitle, reviewText] = applicationReviewCopy(item);
  tLayout(tStack(`<section class="teacher-application-view-head"><div><span>${tEsc(item.date)} 提交</span><h2>${tEsc(item.name)}</h2><p>申报编号 ${tEsc(item.id)}</p></div>${tPill(item.status, applicationTone(item.status))}</section>`,
    item.review ? `<section class="teacher-application-review-note"><span>审核意见</span><p>${tEsc(item.review)}</p><small>${tEsc(reviewTitle)}${item.reviewedAt ? ` · ${tEsc(item.reviewedAt)}` : ''}</small></section>` : '', `<section class="teacher-form-section"><div class="teacher-form-section-head"><h3>教师信息</h3><span>只读</span></div><div class="teacher-readonly-grid"><div><span>教师姓名</span><strong>${tEsc(item.teacher || '—')}</strong></div><div><span>教师工号</span><strong>${tEsc(item.teacherNo || '—')}</strong></div><div><span>教学单位</span><strong>${tEsc(item.teacherUnit || '—')}</strong></div><div><span>专业方向</span><strong>${tEsc(item.teacherProfessional || item.professional || item.major || '—')}</strong></div><div><span>职称</span><strong>${tEsc(item.teacherTitle || '—')}</strong></div></div></section>`, `<section class="teacher-form-section teacher-application-view-content"><div class="teacher-form-section-head"><h3>申报内容</h3><span>只读</span></div><dl class="teacher-application-view-rows"><div><dt>申报编号</dt><dd>${tEsc(item.id)}</dd></div><div><dt>派生课程编号</dt><dd>${tEsc(item.courseId || courseIdForApplication(item.id))}</dd></div><div><dt>课程名称</dt><dd>${tEsc(item.name)}</dd></div><div><dt>所属专业</dt><dd>艺术学 · ${tEsc(item.professional)}</dd></div><div><dt>课程类型</dt><dd>${tEsc(item.type)}</dd></div><div><dt>难度等级</dt><dd>${tEsc(item.difficulty || '—')}</dd></div><div><dt>适合年龄</dt><dd>${tEsc(courseAgesText(item) || '—')}</dd></div>${item.type === '面授课程' ? `<div><dt>总课时</dt><dd>${tEsc(item.hours)}课时</dd></div>` : ''}<div class="wide"><dt>课程简介</dt><dd>${tEsc(item.intro)}</dd></div><div class="wide"><dt>附加材料</dt><dd>${item.file ? tEsc(item.file) : '未上传'}</dd></div></dl></section>`, `<section class="teacher-application-review ${item.status === '已驳回' ? 'rejected' : ''}"><div>${tPill(item.status, applicationTone(item.status))}<h3>${reviewTitle}</h3></div><p>${tEsc(reviewText)}</p>${item.reviewedBy ? `<small>审核人：${tEsc(item.reviewedBy)} · 审核时间：${tEsc(item.reviewedAt || '待记录')}</small>` : ''}</section>`, `<div class="teacher-application-detail-actions">${applicationDetailActions(item)}</div>`));
  renderApplicationArrangeProgress(item);
}
function validateApplication() {
  const name = document.querySelector('#application-name')?.value.trim();
  const type = document.querySelector('[name="application-type"]:checked')?.value;
  const hours = Number(document.querySelector('#application-hours')?.value);
  if (!name) { tToast('请输入课程名称'); return false; }
  if (!document.querySelector('#application-professional')?.value) { tToast('请选择所属专业'); return false; }
  if (type === '面授课程' && hours < 1) { tToast('面授课程请输入有效总课时'); return false; }
  if (!document.querySelector('#application-difficulty')?.value) { tToast('请选择难度等级'); return false; }
  if (!document.querySelectorAll('[name="application-age"]:checked').length) { tToast('请选择适合年龄'); return false; }
  return true;
}
function initApplicationForm() {
  // FD-TAPP-014／FD-TAPP-018：申报页的输入约束直接取字段规格，避免说明写了字数上限而控件不拦。
  if (teacherPath.endsWith('/application-create.html')) applyFieldConstraints(teacherMain, 'teacher/application-create');
  const radios = document.querySelectorAll('[name="application-type"]');
  const syncHours = () => {
    const isClass = document.querySelector('[name="application-type"]:checked')?.value === '面授课程';
    const field = document.querySelector('#application-hours-field');
    const input = document.querySelector('#application-hours');
    if (field) field.hidden = !isClass;
    if (input) input.disabled = !isClass;
  };
  radios.forEach(radio => radio.addEventListener('change', syncHours));
  const submitApplication = () => {
    if (!validateApplication()) return;
    const pickedFile = document.querySelector('#application-file')?.files?.[0]?.name || '';
    const id = new URLSearchParams(location.search).get('application');
    const existing = id ? currentApplication() : null;
    const teacherProfile = currentTeacher();
    const professional = document.querySelector('#application-professional')?.value || existing?.professional || teacherProfile.professional;
    const type = document.querySelector('[name="application-type"]:checked')?.value || existing?.type || '面授课程';
    const applicationId = id || nextApplicationId();
    const record = {
      ...(existing || {}),
      id: applicationId,
      name: document.querySelector('#application-name')?.value.trim() || existing?.name || '',
      professional,
      major: professional,
      type,
      date: toLocalDateString(),
      submittedAt: demoTime(),
      status: '待审核',
      // CR-2026-051 §4.1：视频课程总课时由编排结果派生，重提时也不得沿用旧的面授课时。
      hours: type === '面授课程' ? Number(document.querySelector('#application-hours')?.value || existing?.hours || 1) : 0,
      intro: document.querySelector('#application-intro')?.value.trim() || '', difficulty: document.querySelector('#application-difficulty')?.value || existing?.difficulty || '', ages: [...document.querySelectorAll('[name="application-age"]:checked')].map(input => input.value),
      file: pickedFile || existing?.file || '',
      attachment: pickedFile || existing?.attachment || existing?.file || '',
      // I1-DEC-23: identity comes from the signed-in teacher profile, never a hardcoded name.
      teacherId: existing?.teacherId || teacherProfile.id,
      teacher: existing?.teacher || teacherProfile.name,
      teacherNo: existing?.teacherNo || teacherProfile.no,
      teacherUnit: existing?.teacherUnit || teacherProfile.unit,
      teacherTitle: existing?.teacherTitle || teacherProfile.title,
      teacherProfessional: existing?.teacherProfessional || teacherProfile.professional,
      teacherInfo: `${teacherProfile.name} · ${teacherProfile.title} · ${teacherProfile.professional} · ${teacherProfile.unit}`,
      courseId: existing?.courseId || courseIdForApplication(applicationId),
      // CR-2026-084：重提即开启新一轮审核，清空上一轮审核意见、审核人与审核时间，不再随记录展示。
      review: '',
      reviewedBy: '',
      reviewedAt: ''
    };
    upsertDemoRecord('applications', record);
    teacherState.applicationUpdates[record.id] = '待审核';
    teacherState.application = '待审核';
    saveTeacher();
    location.href = relativePath(`/teacher/pages/application-detail.html?application=${encodeURIComponent(record.id)}`);
  };
  document.querySelector('[data-application-form-action="submit"]')?.addEventListener('click', submitApplication);
  syncHours();
  // CR-2026-051 §4.2：附加材料为真实文件选择控件，选中后回显文件名；原型只记录文件名，不上传真实文件。
  const fileInput = document.querySelector('#application-file');
  const fileNameNode = document.querySelector('#application-file-name');
  fileInput?.addEventListener('change', event => {
    const picked = event.target.files && event.target.files[0];
    if (fileNameNode) fileNameNode.textContent = picked ? `已选择：${picked.name}` : '尚未选择文件';
  });
}
function initApplicationDetail() {
  document.querySelector('[data-application-detail-action="edit"]')?.addEventListener('click', () => {
    location.href = relativePath(`/teacher/pages/application-create.html?application=${currentApplication().id}`);
  });
  document.querySelector('[data-application-detail-action="withdraw"]')?.addEventListener('click', () => {
    const item = currentApplication();
    const dialog = document.createElement('dialog');
    dialog.className = 'mp-dialog';
    dialog.innerHTML = `<div class="mp-dialog-card"><h2>撤销课程申报</h2><p class="mp-dialog-copy">撤销后教研将停止审核，申报内容可重新编辑后再次提交。</p><div class="mp-actions"><button type="button" class="mp-button secondary" data-dialog-close>取消</button><button type="button" class="mp-button" data-application-withdraw-confirm>确认撤销</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-application-withdraw-confirm]').addEventListener('click', () => {
      teacherState.applicationUpdates[item.id] = '已撤销';
      upsertDemoRecord('applications', { ...item, status: '已撤销', review: item.review || '', reviewedBy: item.reviewedBy || '', reviewedAt: item.reviewedAt || '' });
      saveTeacher();
      dialog.close();
      renderApplicationDetail();
      initApplicationDetail();
      tToast('申报已撤销');
    });
    dialog.showModal();
  });
}
const salaryRecords = [
  { key: '2026-07', month: '2026年7月', publishedAt: '2026-08-01', paymentStatus: '已发放', paidAt: '2026-08-05', hours: 32, payableTaxIncluded: 5760, paidTaxIncluded: 5520, tax: 36.80, net: 5483.20, attendance: { expected: 18, actual: 16, late: 1, early: 1, absent: 1, leave: 1 }, deductions: { late: 30, early: 30, absent: 180, total: 240 }, account: '中国建设银行 尾号 2866', items: [{ course: '舞蹈基本功', className: '少儿舞蹈基础班', hours: 20, rate: 180, subtotal: 3600 }, { course: '舞蹈基本功', className: '少儿舞蹈提高班', hours: 12, rate: 165, subtotal: 1980 }] },
  { key: '2026-06', month: '2026年6月', publishedAt: '2026-07-01', paymentStatus: '待发放', paidAt: '', hours: 28, payableTaxIncluded: 5040, paidTaxIncluded: 5040, tax: 15.60, net: 5024.40, attendance: { expected: 15, actual: 14, late: 0, early: 0, absent: 0, leave: 1 }, deductions: { late: 0, early: 0, absent: 0, total: 0 }, account: '中国建设银行 尾号 2866', items: [{ course: '舞蹈基本功', className: '少儿舞蹈基础班', hours: 18, rate: 180, subtotal: 3240 }, { course: '舞蹈基本功', className: '少儿舞蹈提高班', hours: 10, rate: 180, subtotal: 1800 }] },
  { key: '2026-05', month: '2026年5月', publishedAt: '2026-06-01', paymentStatus: '发放中', paidAt: '', hours: 26, payableTaxIncluded: 4680, paidTaxIncluded: 4650, tax: 3, net: 4647, attendance: { expected: 14, actual: 13, late: 1, early: 0, absent: 0, leave: 1 }, deductions: { late: 30, early: 0, absent: 0, total: 30 }, account: '中国建设银行 尾号 2866', items: [{ course: '舞蹈基本功', className: '少儿舞蹈基础班', hours: 16, rate: 180, subtotal: 2880 }, { course: '舞蹈基本功', className: '少儿舞蹈提高班', hours: 10, rate: 180, subtotal: 1800 }] }
];
function money(value) { return `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function deductionMoney(value) { return Number(value) ? `-${money(value)}` : money(0); }
function salaryLessonDetails(record) {
  const teachingDays = [1, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24];
  const exceptionIndexes = record.key === '2026-07'
    ? { 2: 'late', 8: 'early', 14: 'absent', 16: 'leave' }
    : record.key === '2026-06' ? { 14: 'leave' } : { 4: 'late', 13: 'leave' };
  const statusCopy = { normal: '正常', late: '迟到', early: '早退', absent: '缺勤', leave: '请假' };
  return Array.from({ length: record.attendance.expected }, (_, index) => {
    const item = record.items[index % record.items.length];
    const status = exceptionIndexes[index] || 'normal';
    const day = String(teachingDays[index]).padStart(2, '0');
    return {
      lesson: `第${index + 1}课次`,
      course: item.course,
      className: item.className,
      scheduledAt: `${record.key}-${day} 19:00-20:30`,
      actualStart: ['absent', 'leave'].includes(status) ? '--' : status === 'late' ? '19:12' : '18:57',
      actualEnd: ['absent', 'leave'].includes(status) ? '--' : status === 'early' ? '20:18' : '20:31',
      status: statusCopy[status],
      exception: status === 'late' ? '迟到12分钟' : status === 'early' ? '早退12分钟' : ''
    };
  });
}
function salaryAttendanceTone(status) {
  if (status === '正常') return 'green';
  if (['迟到', '早退'].includes(status)) return 'amber';
  return 'gray';
}
function salaryPaymentTone(status) { return status === '已发放' ? 'green' : status === '发放中' ? '' : 'amber'; }
function salaryPaymentCopy(record) {
  if (record.paymentStatus === '已发放') return `${record.paidAt} 已发放`;
  if (record.paymentStatus === '发放中') return '已进入发放批次，正在处理';
  return '工资单已发布，等待财务发放';
}
function renderSalary() {
  const records = demoLocalize(salaryRecords);
  const latest = records[0];
  const paidRecords = records.filter(item => item.paymentStatus === '已发放');
  const total = paidRecords.reduce((sum, item) => sum + item.net, 0);
  const totalHours = records.reduce((sum, item) => sum + item.hours, 0);
  tLayout(tStack(`<section class="teacher-salary-summary"><div class="teacher-salary-summary-head"><div><span>累计已发放</span><strong>${money(total)}</strong></div>${tPill(`${paidRecords.length}期已到账`, 'green')}</div><div class="teacher-salary-summary-meta"><div><span>最近工资月份</span><strong>${latest.month}</strong></div><div><span>最近已发放</span><strong>${money(paidRecords[0]?.net || 0)}</strong></div><div><span>已发布课时</span><strong>${totalHours}课时</strong></div></div></section>`, `<section class="teacher-salary-list"><div class="teacher-salary-list-head"><div><h2>工资记录</h2><p>按发布时间从近到远排列</p></div><span>${salaryRecords.length} 个月</span></div>${salaryRecords.map(record => `<a class="teacher-salary-card" href="${relativePath(`/teacher/pages/salary-detail.html?month=${record.key}`)}"><div class="teacher-salary-card-head"><div><span>工资月份</span><h3>${record.month}</h3></div>${tPill(record.paymentStatus, salaryPaymentTone(record.paymentStatus))}</div><div class="teacher-salary-card-money"><div><span>应付工资含税</span><strong>${money(record.payableTaxIncluded)}</strong></div><div><span>实际核发</span><strong>${money(record.net)}</strong></div></div><div class="teacher-salary-card-foot"><span>${record.hours}课时 · ${salaryPaymentCopy(record)}</span><span>查看明细 ›</span></div></a>`).join('')}</section>`, `<p class="teacher-salary-note">工资单发布后即可查看明细；资金到账以“已发放”状态为准。</p>`));
}
function renderSalaryDetail() {
  const key = new URLSearchParams(location.search).get('month');
  const record = demoLocalize(salaryRecords).find(item => item.key === key) || demoLocalize(salaryRecords)[0];
  const lessonDetails = salaryLessonDetails(record);
  tLayout(tStack(`<section class="teacher-salary-detail-summary"><div class="teacher-salary-detail-status"><span>${record.month}工资</span>${tPill(record.paymentStatus, salaryPaymentTone(record.paymentStatus))}</div><span>实际核发</span><strong>${money(record.net)}</strong><p class="salary-payment-${record.paymentStatus === '已发放' ? 'success' : 'pending'}">${salaryPaymentCopy(record)}</p><div class="teacher-salary-equation"><div><span>实发工资含税</span><strong>${money(record.paidTaxIncluded)}</strong></div><i>−</i><div><span>个人所得税</span><strong>${money(record.tax)}</strong></div><i>=</i><div><span>实际核发</span><strong>${money(record.net)}</strong></div></div></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>出勤统计</h2><span>按课次统计</span></div><div class="teacher-salary-attendance-primary"><div><span>应出勤课次</span><strong>${record.attendance.expected}<small>课次</small></strong></div><div><span>实出勤课次</span><strong>${record.attendance.actual}<small>课次</small></strong></div></div><dl class="teacher-salary-attendance-status"><div><dt>迟到</dt><dd>${record.attendance.late}次</dd></div><div><dt>早退</dt><dd>${record.attendance.early}次</dd></div><div><dt>缺勤</dt><dd>${record.attendance.absent}次</dd></div><div><dt>请假</dt><dd>${record.attendance.leave}次</dd></div></dl><p class="teacher-salary-block-note">迟到、早退计入实出勤；缺勤、请假不计入实出勤。</p></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>扣款明细</h2><strong class="${record.deductions.total ? 'has-adjustment' : ''}">${deductionMoney(record.deductions.total)}</strong></div><dl class="teacher-salary-deduction-grid"><div><dt>迟到扣款</dt><dd>${deductionMoney(record.deductions.late)}</dd></div><div><dt>早退扣款</dt><dd>${deductionMoney(record.deductions.early)}</dd></div><div><dt>缺勤扣款</dt><dd>${deductionMoney(record.deductions.absent)}</dd></div><div class="total"><dt>累计扣款</dt><dd>${deductionMoney(record.deductions.total)}</dd></div></dl></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>工资核算</h2><span>单位：元</span></div><dl class="teacher-salary-settlement"><div><dt>应付工资含税</dt><dd>${money(record.payableTaxIncluded)}</dd></div><div><dt>实发工资含税</dt><dd>${money(record.paidTaxIncluded)}</dd></div><div><dt>个税</dt><dd>${deductionMoney(record.tax)}</dd></div><div class="total"><dt>实际核发</dt><dd>${money(record.net)}</dd></div></dl></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>课次明细</h2><span>${lessonDetails.length}课次</span></div><div class="teacher-salary-lessons">${lessonDetails.map(item => `<article><div class="teacher-salary-lesson-head"><div><span>${tEsc(item.lesson)}</span><h3>${tEsc(item.className)}</h3></div>${tPill(item.status, salaryAttendanceTone(item.status))}</div><p>${tEsc(item.course)}</p><dl><div class="wide"><dt>上课时间</dt><dd>${tEsc(item.scheduledAt)}</dd></div><div><dt>实际开始时间</dt><dd>${tEsc(item.actualStart)}</dd></div><div><dt>实际结束时间</dt><dd>${tEsc(item.actualEnd)}</dd></div></dl>${item.exception ? `<div class="teacher-salary-lesson-exception">${tEsc(item.exception)}</div>` : ['缺勤', '请假'].includes(item.status) ? '<div class="teacher-salary-lesson-missed">本课次未实际上课</div>' : ''}</article>`).join('')}</div></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>发放信息</h2></div><dl class="teacher-salary-payment"><div><dt>工资单状态</dt><dd>已发布</dd></div><div><dt>发放状态</dt><dd>${tEsc(record.paymentStatus)}</dd></div><div><dt>发放日期</dt><dd>${record.paidAt || '--'}</dd></div><div><dt>收款账户</dt><dd>${tEsc(record.account)}</dd></div><div><dt>发布时间</dt><dd>${record.publishedAt}</dd></div></dl></section>`));
}
function teacherProfileRow({ mark, title, description, href, value = '', tone = '' }) {
  return `<a class="teacher-profile-row" href="${relativePath(href)}"><span class="teacher-profile-row-mark" aria-hidden="true">${tEsc(mark)}</span><span class="teacher-profile-row-copy"><strong>${tEsc(title)}</strong><small>${tEsc(description)}</small></span>${value ? `<span class="teacher-profile-row-value ${tone}">${tEsc(value)}</span>` : ''}<span class="teacher-profile-row-arrow" aria-hidden="true">›</span></a>`;
}
function renderProfile() {
  // CR-2026-039 §2.2：教师端「我的」是唯一例外——未登录展示登录入口卡片与完整菜单，不直接跳转，
  // 保证用户仍能从这里主动进入登录；其余教师端页面未登录一律跳转登录页。
  if (!isMiniLoggedIn()) {
    const loginFor = (target) => relativePath(`/login.html?role=teacher&redirect=${encodeURIComponent(target)}`);
    const entries = [
      teacherProfileRow({ mark: '档', title: '个人档案', description: '查看并维护本人基础资料', href: loginFor('/teacher/pages/profile-detail.html'), value: '登录后查看', tone: 'amber' }),
      teacherProfileRow({ mark: '信', title: '消息通知', description: '查看排课、审核与工资通知', href: loginFor('/teacher/pages/messages.html'), value: '登录后查看', tone: 'amber' }),
      teacherProfileRow({ mark: '证', title: '我的证书', description: '资格证书与审核记录', href: loginFor('/teacher/pages/certificates.html'), value: '登录后查看', tone: 'amber' }),
      teacherProfileRow({ mark: '合', title: '我的合同', description: '查看协议、有效期与签署状态', href: loginFor('/teacher/pages/contracts.html'), value: '登录后查看', tone: 'amber' }),
      teacherProfileRow({ mark: '结', title: '结业申请记录', description: '查看复核结果与补课安排', href: loginFor('/teacher/pages/graduation.html'), value: '登录后查看', tone: 'amber' }),
      teacherProfileRow({ mark: '设', title: '设置', description: '账号设置、协议与关于我们', href: loginFor('/teacher/pages/settings.html') })
    ].join('');
    tLayout(tStack(`<a class="mp-profile-entry mp-profile-login-entry" href="${loginFor('/teacher/pages/profile.html')}"><div class="mp-profile-entry-head"><div><strong>登录 / 注册</strong><small>登录后查看课表、班级、申报、证书、合同与工资</small></div><span class="mp-link">去登录 ›</span></div></a>`, `<section class="teacher-profile-group"><h3>个人中心</h3><div class="teacher-profile-row-list">${entries}</div></section>`));
    return;
  }
  const graduationPending = teacherState.graduationRecords.filter(item => ['审核中', '需补课', '补课中'].includes(item.status)).length;
  const unreadMessages = teacherState.messages.filter(item => !item.read).length;
  const archive = teacherProfileRow({ mark: '档', title: '个人档案', description: '查看并维护本人基础资料', href: '/teacher/pages/profile-detail.html', value: '可编辑', tone: 'green' });
  const affairs = [
    { mark: '信', title: '消息通知', description: '查看排课、审核与工资通知', href: '/teacher/pages/messages.html', value: unreadMessages ? `${unreadMessages}条未读` : '已读', tone: unreadMessages ? 'amber' : 'green' },
    { mark: '证', title: '我的证书', description: '资格证书与审核记录', href: '/teacher/pages/certificates.html', value: '1项待审核', tone: 'amber' },
    { mark: '合', title: '我的合同', description: '查看协议、有效期与签署状态', href: '/teacher/pages/contracts.html', value: `${teacherState.contracts.filter(item => item.status === '待教师签署').length}份待教师签署`, tone: 'amber' },
    { mark: '结', title: '结业申请记录', description: '查看复核结果与补课安排', href: '/teacher/pages/graduation.html', value: `${graduationPending}项处理中`, tone: graduationPending ? 'amber' : 'green' }
  ].map(teacherProfileRow).join('');
  const settings = teacherProfileRow({ mark: '设', title: '设置', description: '账号设置、协议与关于我们', href: '/teacher/pages/settings.html' });
  tLayout(tStack(`<section class="teacher-profile-identity-card"><div class="teacher-profile-identity-main"><span class="teacher-profile-avatar" aria-hidden="true">${currentTeacherAvatar()}</span><div><div class="teacher-profile-name-row"><h2>${tEsc(currentTeacherName())}</h2>${tPill('正常', 'green')}</div><p>工号 ${tEsc(currentTeacherAccount().no)} · ${tEsc(currentTeacherMajor())}</p></div></div></section>`, `<section class="teacher-profile-group"><h3>个人资料</h3><div class="teacher-profile-row-list">${archive}</div></section>`, `<section class="teacher-profile-group"><h3>教师事务</h3><div class="teacher-profile-row-list">${affairs}</div></section>`, `<section class="teacher-profile-group teacher-profile-settings"><div class="teacher-profile-row-list">${settings}</div></section>`));
}
let teacherProfileEditing = false;
let teacherProfileCodeRequest = null;
let teacherProfileCodeTimer = 0;
// CR-2026-022 §2.1：黑名单 5 项由学校后台维护，教师端只读（工号、姓名、身份证号、人员类型、授课专业）。
// 取值按当前登录教师的档案事实与账号记录读取，未建档的教师显示占位符而不是借用他人信息。
function teacherProfileReadonlyRows() {
  const facts = teacherProfileCurrentFacts();
  const account = teacherAccounts.find(item => item.id === (facts?.id || currentTeacher().id)) || null;
  return [
    ['姓名', facts?.name || account?.name || currentTeacherName()],
    ['工号', account?.no || '—'],
    ['身份证号', account?.id === 'teacher-wang' ? '420106********2428' : '—'],
    ['人员类型', account ? '在编' : '—'],
    ['授课专业', account ? `文化艺术 · 表演艺术 · ${account.professional}（${(facts?.majors || []).join('、')}）` : '—']
  ];
}
// 档案页按 URL/session 指定的教师读取事实，避免未建档教师回落到默认账号而绕过离职/冻结拦截。
const teacherProfileRequestedId = () => new URLSearchParams(location.search).get('teacher') || sessionStorage.getItem('hbyx-teacher-id') || defaultTeacherId();
const teacherProfileCurrentFacts = () => teacherFactsById(teacherProfileRequestedId());
// “本人档案”只对当前登录教师开放：查看他人档案时不展示可维护资料，也不提供编辑入口。
const teacherProfileIsSelf = () => teacherProfileRequestedId() === (sessionStorage.getItem('hbyx-teacher-id') || defaultTeacherId());
// CR-2026-022 §3.5：账号冻结或人员离职后，教师端不可编辑本人档案。
function teacherProfileEditBlocked() {
  const facts = teacherProfileCurrentFacts();
  return Boolean(facts && (facts.accountStatus === 'frozen' || facts.departedAt));
}
function teacherProfileSection(title, content, note = '') {
  return `<section class="teacher-archive-section"><div class="teacher-archive-section-head"><h2>${tEsc(title)}</h2>${note ? `<span>${tEsc(note)}</span>` : ''}</div>${content}</section>`;
}
function teacherArchiveRows(rows) {
  return `<dl class="teacher-archive-rows">${rows.map(([label, value, options = '']) => `<div class="${options}"><dt>${tEsc(label)}</dt><dd>${tEsc(value || '未填写')}</dd></div>`).join('')}</dl>`;
}
function teacherProfileFieldControl(field, value) {
  const id = `teacher-profile-${field.key}`;
  const common = `id="${id}" name="${field.key}"`;
  if (field.control === 'select') return `<select ${common}>${field.options.map(option => `<option ${option === value ? 'selected' : ''}>${tEsc(option)}</option>`).join('')}</select>`;
  if (field.control === 'textarea') return `<textarea ${common} ${field.maxLength ? `maxlength="${field.maxLength}"` : ''} data-profile-limit>${tEsc(value)}</textarea>`;
  if (field.control === 'number') return `<input ${common} type="number" min="${field.min ?? 0}" step="1" value="${tEsc(value)}">`;
  if (field.control === 'month') return `<input ${common} type="month" value="${tEsc(value)}">`;
  return `<input ${common} type="${field.control === 'email' ? 'email' : field.control === 'tel' ? 'tel' : 'text'}" ${field.control === 'tel' ? 'inputmode="numeric"' : ''} value="${tEsc(value)}">`;
}
function teacherProfileFieldInput(field, profile) {
  const value = profile[field.key] ?? '';
  // 提示文案放在标签之外：字段约束按 .mp-field 的标签文本匹配规格，标签里混入提示会匹配不上。
  const hint = field.note ? `<small class="teacher-profile-hint">${tEsc(field.note)}</small>` : '';
  // CR-2026-022 §2.2 / §4.3：手机号属于唯一字段，变更须先通过页面内验证码校验（原型不接真实短信）。
  const codeRow = field.verifyCode
    ? `<div class="teacher-profile-code"><input id="teacher-profile-mobile-code" name="mobileCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码"><button type="button" class="mp-button secondary" data-profile-action="send-code">获取验证码</button></div><p class="teacher-profile-code-hint" data-profile-code-hint>原型不发送真实短信，点击“获取验证码”后在页面内校验。</p>`
    : '';
  return `<div class="mp-field"><label for="teacher-profile-${field.key}">${tEsc(field.label)}${field.optional ? '' : ' <b>*</b>'}</label>${hint}${teacherProfileFieldControl(field, value)}${codeRow}</div>`;
}
function teacherProfileSummary(editing) {
  const facts = teacherProfileCurrentFacts();
  const identity = facts ? `${facts.name} · ${facts.majors.join('、')}` : `${currentTeacherName()} · ${currentTeacherMajor()}`;
  const mode = editing
    ? '<span class="teacher-archive-mode">编辑中</span>'
    : (teacherProfileEditBlocked() || !teacherProfileIsSelf()
      ? '<span class="teacher-archive-mode">不可编辑</span>'
      : '<button type="button" class="teacher-archive-edit" data-profile-action="edit">编辑</button>');
  return `<section class="teacher-archive-summary"><div class="teacher-archive-person"><span class="teacher-profile-avatar" aria-hidden="true">${tEsc(identity.slice(0, 1))}</span><div><strong>${tEsc(identity.split(' · ')[0])}</strong><span>${tEsc(teacherState.profile.tagline)}</span></div></div>${mode}</section>`;
}
function renderTeacherProfileDetail() {
  const profile = teacherState.profile;
  if (teacherProfileEditing) {
    const groups = teacherProfileGroups.map(group => teacherProfileSection(group,
      `<div class="teacher-archive-form">${teacherProfileEditableFields.filter(field => field.group === group).map(field => teacherProfileFieldInput(field, profile)).join('')}</div>`,
      teacherProfileGroupNote[group] || ''));
    tLayout(tStack(
      teacherProfileSummary(true),
      teacherProfileSection('身份与任职（只读）', teacherArchiveRows(teacherProfileReadonlyRows().map((item, index) => [...item, index === 4 ? 'wide' : ''])), '学校维护'),
      ...groups,
      `<p class="mp-form-error" data-profile-error role="alert" hidden></p>`,
      `<div class="teacher-archive-actions"><button type="button" class="mp-button secondary" data-profile-action="cancel">取消</button><button type="button" class="mp-button" data-profile-action="save">保存修改</button></div>`
    ));
    return;
  }
  const isSelf = teacherProfileIsSelf();
  const rowsOnly = teacherArchiveRows(teacherProfileEditableFields.map(field => [field.label, teacherProfileMask(field.key, profile[field.key]), field.control === 'textarea' ? 'wide long' : '']));
  // P1：分组说明在只读态同样常驻（如「经历与介绍」由本人填写、学校认定以证书与合同为准）。
  const groupNotes = teacherProfileGroups.map(group => (teacherProfileGroupNote[group] ? `${group}：${teacherProfileGroupNote[group]}` : '')).filter(Boolean);
  const selfSections = isSelf ? [teacherProfileSection('本人可维护资料', `${rowsOnly}${groupNotes.length ? `<p class="teacher-archive-group-notes">${groupNotes.map(tEsc).join('；')}</p>` : ''}`, '教师本人维护')] : [];
  const note = !isSelf
    ? `<p class="teacher-profile-readonly-note">当前登录的教师账号与所查看档案不一致，仅展示身份与任职信息；本人档案只能在教师本人登录后查看和维护。</p>`
    : teacherProfileEditBlocked()
      ? `<p class="teacher-profile-readonly-note">当前账号已冻结或已办理离职，暂不可编辑本人档案。如需修改请联系学校管理员。</p>`
      : `<p class="teacher-profile-readonly-note">工号、姓名、身份证号、人员类型与授课专业由学校维护；其余字段可本人修改，保存后直接生效并写入变更审计。</p>`;
  tLayout(tStack(
    teacherProfileSummary(false),
    teacherProfileSection('身份与任职（只读）', teacherArchiveRows(teacherProfileReadonlyRows().map((item, index) => [...item, index === 4 ? 'wide' : ''])), '学校维护'),
    ...selfSections,
    note
  ));
}
function collectTeacherProfileForm() {
  return [...document.querySelectorAll('.teacher-archive-form [name]')].reduce((values, field) => ({ ...values, [field.name]: field.value.trim() }), {});
}
function teacherProfileError(message, key = '') {
  const error = document.querySelector('[data-profile-error]');
  if (error) { error.textContent = message; error.hidden = false; }
  tToast(message);
  if (key) document.querySelector(`#teacher-profile-${key}`)?.focus();
}
function validateTeacherProfile(values) {
  const current = teacherState.profile;
  for (const field of teacherProfileEditableFields) {
    const value = values[field.key] ?? '';
    if (!field.optional && !value) return { message: `请填写${field.label}。`, key: field.key };
  }
  if (!/^1[3-9]\d{9}$/.test(values.mobile)) return { message: '手机号需为 11 位数字。', key: 'mobile' };
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return { message: '邮箱格式不正确。', key: 'email' };
  if (!/^1[3-9]\d{9}$/.test(values.emergencyMobile)) return { message: '紧急联系人电话需为 11 位数字。', key: 'emergencyMobile' };
  if (values.carPlate && !/^[\u4e00-\u9fa5A-Z]{1}[A-Z0-9·]{6,7}$/.test(values.carPlate)) return { message: '车牌号需为 7–8 位。', key: 'carPlate' };
  if (!/^\d+$/.test(values.teachingYears)) return { message: '从教年限需为 0 及以上整数。', key: 'teachingYears' };
  if (values.payeeName !== teacherProfileReadonlyRows()[0][1]) return { message: '收款户名须与本人姓名一致。', key: 'payeeName' };
  if (!/^\d{16,19}$/.test(values.bankCard)) return { message: '银行卡号需为 16–19 位数字。', key: 'bankCard' };
  if (values.tagline.length > 200) return { message: '一句话简介不超过 200 字。', key: 'tagline' };
  if (values.introduction.length > 2000) return { message: '简介不超过 2000 字。', key: 'introduction' };
  if (values.mobile !== current.mobile) {
    const request = teacherProfileCodeRequest;
    if (!request || request.mobile !== values.mobile) return { message: '手机号已变更，请先获取并填写验证码。', key: 'mobile' };
    const code = String(document.querySelector('#teacher-profile-mobile-code')?.value || '').trim();
    if (code !== request.code) return { message: '验证码不正确，请重新获取。', key: 'mobile' };
  }
  return null;
}
function saveTeacherProfile() {
  const values = collectTeacherProfileForm();
  const problem = validateTeacherProfile(values);
  if (problem) { teacherProfileError(problem.message, problem.key); return; }
  const before = teacherState.profile;
  const changes = teacherProfileEditableFields
    .filter(field => String(before[field.key] ?? '') !== String(values[field.key] ?? ''))
    .map(field => ({ key: field.key, label: field.label, before: teacherProfileMask(field.key, before[field.key]), after: teacherProfileMask(field.key, values[field.key]) }));
  if (!changes.length) { teacherProfileError('档案内容没有变化。'); return; }
  const operator = `教师本人（${teacherProfileReadonlyRows()[0][1]}）`;
  const at = demoTime();
  teacherState.profile = { ...before, ...values };
  teacherState.profileVersion = Number(teacherState.profileVersion || 1) + 1;
  saveTeacher();
  writeDemoState(next => {
    next.teacherProfiles = { ...(next.teacherProfiles || {}), [teacherProfileRequestedId()]: { ...values, updatedAt: at, updatedBy: operator, profileVersion: teacherState.profileVersion } };
    const record = { id: demoId('TPA'), teacherId: teacherProfileRequestedId(), teacher: teacherProfileReadonlyRows()[0][1], operator, at, version: teacherState.profileVersion, changes };
    next.teacherProfileAudit = [record, ...(next.teacherProfileAudit || [])].slice(0, 30);
  });
  teacherProfileEditing = false;
  teacherProfileCodeRequest = null;
  renderTeacherProfileDetail();
  bindTeacherProfileEvents();
  window.scrollTo(0, 0);
  tToast(`档案已保存，${changes.length} 项变更已写入审计`);
}
function sendTeacherProfileCode() {
  const mobile = String(document.querySelector('#teacher-profile-mobile')?.value || '').trim();
  if (!/^1[3-9]\d{9}$/.test(mobile)) { teacherProfileError('请先填写正确的 11 位手机号。', 'mobile'); return; }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  teacherProfileCodeRequest = { mobile, code };
  const hint = document.querySelector('[data-profile-code-hint]');
  if (hint) hint.textContent = `演示验证码 ${code}（原型不发送真实短信）`;
  const button = document.querySelector('[data-profile-action="send-code"]');
  let remain = 60;
  if (button) {
    button.disabled = true;
    button.textContent = `重新获取（${remain}s）`;
    window.clearInterval(teacherProfileCodeTimer);
    teacherProfileCodeTimer = window.setInterval(() => {
      remain -= 1;
      if (remain <= 0) { window.clearInterval(teacherProfileCodeTimer); button.disabled = false; button.textContent = '获取验证码'; return; }
      button.textContent = `重新获取（${remain}s）`;
    }, 1000);
  }
}
function bindTeacherProfileEvents() {
  document.querySelector('[data-profile-action="edit"]')?.addEventListener('click', () => { teacherProfileEditing = true; renderTeacherProfileDetail(); bindTeacherProfileEvents(); window.scrollTo(0, 0); });
  document.querySelector('[data-profile-action="cancel"]')?.addEventListener('click', () => { teacherProfileEditing = false; teacherProfileCodeRequest = null; window.clearInterval(teacherProfileCodeTimer); renderTeacherProfileDetail(); bindTeacherProfileEvents(); window.scrollTo(0, 0); });
  document.querySelector('[data-profile-action="save"]')?.addEventListener('click', saveTeacherProfile);
  document.querySelector('[data-profile-action="send-code"]')?.addEventListener('click', sendTeacherProfileCode);
  document.querySelectorAll('[data-profile-limit]').forEach(input => input.addEventListener('input', () => {
    const counter = input.parentElement?.querySelector('[data-profile-count]');
    if (counter) counter.textContent = `${input.value.length}/${input.maxLength}`;
  }));
}
let teacherCertificateFilter = '全部';
function certificateStatusTone(status) {
  if (status === '已通过') return 'green';
  if (status === '待审核') return 'amber';
  if (status === '已驳回') return 'red';
  return 'gray';
}
function certificateValidityTone(validity) {
  if (validity === '有效') return 'green';
  if (validity === '即将过期') return 'amber';
  return 'red';
}
function calculateCertificateValidity(expiresAt) {
  if (!expiresAt) return '有效';
  const remainingDays = Math.ceil((new Date(`${expiresAt}T00:00:00`) - new Date(`${DEMO_TODAY}T00:00:00`)) / 86400000);
  if (remainingDays < 0) return '已过期';
  // CR-2026-112：窗口改读后台「参数配置 → 证书到期提醒窗口（天）」，与后台证书列表同源，默认 30 天。
  return remainingDays <= certificateExpirySettings().expiryReminderDays ? '即将过期' : '有效';
}
function certificateNeedsAction(item) { return item.status === '已驳回' || item.validity === '即将过期' || item.validity === '已过期'; }
const CERTIFICATE_STATUS_TABS = ['全部', '待审核', '已通过', '已驳回', '已撤销'];
function teacherCertificateCard(item) {
  const canReupload = item.status === '已驳回' || item.validity === '已过期';
  return `<article class="teacher-certificate-card ${certificateNeedsAction(item) ? 'needs-action' : ''}"><div class="teacher-certificate-card-head"><div><span>${tEsc(item.type)}</span><h3>${tEsc(item.name)}</h3></div>${tPill(item.status, certificateStatusTone(item.status))}</div><dl class="teacher-certificate-facts"><div><dt>证书编号</dt><dd>${tEsc(item.number)}</dd></div><div><dt>发证机构</dt><dd>${tEsc(item.issuer)}</dd></div><div><dt>适用专业</dt><dd>${tEsc((item.majors || []).join('、') || '未填写')}</dd></div><div><dt>有效期</dt><dd>${item.expiresAt ? `至 ${tEsc(item.expiresAt)}` : '永久有效'}</dd></div><div><dt>有效性</dt><dd>${tPill(item.validity, certificateValidityTone(item.validity))}</dd></div></dl>${item.status === '已驳回' ? `<p class="teacher-certificate-review-note">审核意见：${tEsc(item.reviewNote)}</p>` : ''}<div class="teacher-certificate-card-foot"><span class="teacher-certificate-file"><b aria-hidden="true">${item.file.toLowerCase().endsWith('.pdf') ? 'PDF' : '图'}</b><span>${tEsc(item.file)}</span></span><div><button type="button" data-certificate-view="${tEsc(item.id)}">查看</button>${canReupload ? `<button type="button" class="primary" data-certificate-reupload="${tEsc(item.id)}">重新上传</button>` : ''}</div></div></article>`;
}
function renderTeacherCertificates() {
  const certificates = [...demoLocalize(teacherState.certificates)].map(item => ({ ...item, validity: calculateCertificateValidity(item.expiresAt) })).sort((a, b) => (a.expiresAt || '9999-12-31').localeCompare(b.expiresAt || '9999-12-31'));
  // 历史态兼容：旧筛选值（需处理）不再作为页签，回落「全部」。
  if (!CERTIFICATE_STATUS_TABS.includes(teacherCertificateFilter)) teacherCertificateFilter = '全部';
  const visible = certificates.filter(item => teacherCertificateFilter === '全部' || item.status === teacherCertificateFilter);
  const filters = CERTIFICATE_STATUS_TABS.map(label => [label, label === '全部' ? certificates.length : certificates.filter(item => item.status === label).length]).filter(([label, count]) => label === '全部' || count > 0);
  const content = visible.length ? visible.map(teacherCertificateCard).join('') : `<section class="teacher-certificate-empty"><strong>暂无${tEsc(teacherCertificateFilter)}证书</strong><p>可切换其他状态或新增证书。</p></section>`;
  tLayout(tStack(`<section class="teacher-certificate-toolbar"><div><strong>${certificates.length}</strong><span>项证书资料</span></div><button type="button" class="mp-button" data-certificate-add>新增证书</button></section>`, `<nav class="teacher-certificate-filters" role="tablist" aria-label="证书状态筛选">${filters.map(([label, count]) => `<button type="button" role="tab" aria-selected="${teacherCertificateFilter === label}" class="${teacherCertificateFilter === label ? 'active' : ''}" data-certificate-filter="${label}">${label}<span>${count}</span></button>`).join('')}</nav>`, `<section class="teacher-certificate-list" aria-live="polite"><div class="teacher-certificate-list-head"><h2>${tEsc(teacherCertificateFilter)}证书</h2><span>${visible.length} 项</span></div>${content}</section>`));
}
function openTeacherCertificateDetail(item) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-certificate-dialog';
  dialog.innerHTML = `<div class="teacher-certificate-dialog-card"><header><div><span>${tEsc(item.type)}</span><h2>${tEsc(item.name)}</h2></div><button type="button" data-certificate-close aria-label="关闭">×</button></header><div class="teacher-certificate-detail-status">${tPill(item.status, certificateStatusTone(item.status))}${tPill(item.validity, certificateValidityTone(item.validity))}</div>${teacherArchiveRows([['证书编号', item.number], ['发证机构', item.issuer], ['适用专业', (item.majors || []).join('、') || '未填写'], ['颁发日期', item.issuedAt || '未填写'], ['有效期截止', item.expiresAt || '永久有效'], ['录入来源', item.source], ['证书文件', item.file, 'wide']])}<section class="teacher-certificate-audit"><span>审核记录</span><p>${tEsc(item.reviewNote || '暂无审核记录')}</p>${item.reviewedAt ? `<small>${tEsc(item.reviewedAt)}</small>` : ''}</section><button type="button" class="mp-button full secondary" data-certificate-preview="${tEsc(item.id)}">预览证书文件</button></div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('[data-certificate-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-certificate-preview]')?.addEventListener('click', () => { dialog.close(); openTeacherCertificatePreview(item); });
  dialog.showModal();
}
function openTeacherCertificatePreview(item) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-certificate-dialog';
  dialog.innerHTML = `<div class="teacher-certificate-dialog-card"><header><div><span>证书文件</span><h2>${tEsc(item.name)}</h2></div><button type="button" data-certificate-close aria-label="关闭">×</button></header><div class="teacher-certificate-preview"><span>湖北艺术职业学院继续教育服务平台</span><b>${item.file.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMG'}</b><strong>${tEsc(item.name)}</strong><p>${tEsc(item.number)}</p><small>${tEsc(item.file)}</small></div><button type="button" class="mp-button full" data-certificate-close>关闭预览</button></div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-certificate-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.showModal();
}
function openTeacherCertificateForm(item = null) {
  const isReupload = Boolean(item);
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-certificate-dialog teacher-certificate-form-dialog';
  dialog.innerHTML = `<form class="teacher-certificate-dialog-card" id="teacher-certificate-form"><header><div><span>${isReupload ? '更新证书材料' : '新增证书'}</span><h2>${isReupload ? tEsc(item.name) : '填写证书信息'}</h2></div><button type="button" data-certificate-close aria-label="关闭">×</button></header>${isReupload ? `<p class="teacher-certificate-form-tip">审核意见：${tEsc(item.reviewNote)}</p>` : ''}<div class="teacher-certificate-form"><div class="mp-field"><label for="certificate-name">证书名称 <b>*</b></label><input id="certificate-name" name="name" value="${tEsc(item?.name || '')}" placeholder="请输入证书名称"></div><div class="teacher-certificate-form-grid"><div class="mp-field"><label for="certificate-number">证书编号 <b>*</b></label><input id="certificate-number" name="number" value="${tEsc(item?.number || '')}" placeholder="请输入编号"></div><div class="mp-field"><label for="certificate-type">证书类型 <b>*</b></label><select id="certificate-type" name="type"><option value="">请选择</option>${['学历证书', '教师资格证', '艺术等级证', '其他'].map(type => `<option ${item?.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></div></div><div class="mp-field"><label>适用专业 <b>*</b><small>可多选</small></label><div class="teacher-radio-row">${['中国舞', '民族民间舞', '少儿舞蹈', '舞蹈编导'].map(major => `<label><input type="checkbox" name="majors" value="${major}" ${(item?.majors || []).includes(major) ? 'checked' : ''}>${major}</label>`).join('')}</div></div><div class="mp-field"><label for="certificate-issuer">发证机构 <b>*</b></label><input id="certificate-issuer" name="issuer" value="${tEsc(item?.issuer || '')}" placeholder="请输入发证机构"></div><div class="teacher-certificate-form-grid"><div class="mp-field"><label for="certificate-issued">颁发日期</label><input id="certificate-issued" name="issuedAt" type="date" value="${tEsc(item?.issuedAt || '')}"><label for="certificate-expiry">有效期截止</label><input id="certificate-expiry" name="expiresAt" type="date" value="${tEsc(item?.expiresAt || '')}" ${item && !item.expiresAt ? 'disabled' : ''}></div></div><label class="teacher-certificate-permanent"><input type="checkbox" data-certificate-permanent ${item && !item.expiresAt ? 'checked' : ''}>永久有效</label><div class="mp-field"><label for="certificate-file">证书文件 <b>*</b></label><label class="teacher-certificate-upload" for="certificate-file"><input id="certificate-file" type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"><b>选择文件</b><span data-certificate-file-name>${isReupload ? '请重新选择清晰完整的文件' : 'JPG、PNG、PDF、DOC、DOCX'}</span></label><small data-certificate-file-spec>${certificateFileSpecText()}</small></div></div><p class="mp-form-error" data-certificate-error role="alert" hidden></p><div class="teacher-certificate-dialog-actions"><button type="button" class="mp-button secondary" data-certificate-close>取消</button><button type="submit" class="mp-button">提交审核</button></div></form>`;
  document.body.appendChild(dialog);
  const form = dialog.querySelector('#teacher-certificate-form');
  const error = dialog.querySelector('[data-certificate-error]');
  const fileInput = dialog.querySelector('#certificate-file');
  const close = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-certificate-close]').forEach(button => button.addEventListener('click', close));
  dialog.querySelector('[data-certificate-permanent]')?.addEventListener('change', event => { const expiry = dialog.querySelector('#certificate-expiry'); expiry.disabled = event.target.checked; if (event.target.checked) expiry.value = ''; });
  fileInput?.addEventListener('change', () => { dialog.querySelector('[data-certificate-file-name]').textContent = fileInput.files[0]?.name || '未选择文件'; error.hidden = true; });
  // CR-2026-028 §2.4：查重提示里的“查看既有记录”直接打开该条证书，不新增记录。
  form.addEventListener('click', event => {
    const existing = event.target.closest('[data-certificate-existing]');
    if (!existing) return;
    const record = teacherState.certificates.find(entry => entry.id === existing.dataset.certificateExisting);
    if (!record) return;
    close();
    openTeacherCertificateDetail(record);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.name.trim()) { error.textContent = '请输入证书名称。'; error.hidden = false; dialog.querySelector('#certificate-name').focus(); return; }
    if (!values.number.trim()) { error.textContent = '请输入证书编号。'; error.hidden = false; dialog.querySelector('#certificate-number').focus(); return; }
    if (!values.type) { error.textContent = '请选择证书类型。'; error.hidden = false; dialog.querySelector('#certificate-type').focus(); return; }
    const majors = new FormData(form).getAll('majors');
    if (!majors.length) { error.textContent = '请选择适用专业。'; error.hidden = false; return; }
    if (!values.issuer.trim()) { error.textContent = '请输入发证机构。'; error.hidden = false; dialog.querySelector('#certificate-issuer').focus(); return; }
    if (!fileInput.files.length) { error.textContent = '请选择证书文件。'; error.hidden = false; fileInput.focus(); return; }
    // CR-2026-028 §2.4：教师端上传命中重复时提示“该证书已存在”，引导到既有记录，不新增记录。
    // 例外只有一种：对既有证书重新上传文件，走既有记录的版本升级（excludeId 排除自身）。
    const duplicate = findDuplicateCertificate(teacherState.certificates, { type: values.type, number: values.number }, item?.id || '');
    if (duplicate) {
      error.innerHTML = `该证书已存在：${tEsc(duplicate.name)}（${tEsc(duplicate.number)} · ${tEsc(duplicate.status)}）。<button type="button" class="mp-button secondary" data-certificate-existing="${tEsc(duplicate.id)}">查看既有记录</button>`;
      error.hidden = false;
      return;
    }
    const nextExpiry = values.expiresAt || '';
    const next = { ...(item || {}), id: item?.id || `cert-${Date.now()}`, name: values.name.trim(), number: values.number.trim(), type: values.type, majors, issuer: values.issuer.trim(), issuedAt: values.issuedAt || '', expiresAt: nextExpiry, status: '待审核', validity: calculateCertificateValidity(nextExpiry), source: certificateSourceLabel('teacher_upload'), file: fileInput.files[0].name, reviewedAt: '', reviewNote: '已重新提交，等待教研审核。' };
    teacherState.certificates = item ? teacherState.certificates.map(record => record.id === item.id ? next : record) : [next, ...teacherState.certificates];
    saveTeacher(); close(); teacherCertificateFilter = '全部'; renderTeacherCertificates(); bindTeacherCertificateEvents(); tToast(isReupload ? '证书已重新提交审核' : '证书已提交审核');
  });
  dialog.showModal();
}
function bindTeacherCertificateEvents() {
  document.querySelector('[data-certificate-add]')?.addEventListener('click', () => openTeacherCertificateForm());
  document.querySelectorAll('[data-certificate-filter]').forEach(button => button.addEventListener('click', () => { teacherCertificateFilter = button.dataset.certificateFilter; renderTeacherCertificates(); bindTeacherCertificateEvents(); }));
  document.querySelectorAll('[data-certificate-view]').forEach(button => button.addEventListener('click', () => { const item = teacherState.certificates.find(record => record.id === button.dataset.certificateView); if (item) openTeacherCertificateDetail(item); }));
  document.querySelectorAll('[data-certificate-reupload]').forEach(button => button.addEventListener('click', () => { const item = teacherState.certificates.find(record => record.id === button.dataset.certificateReupload); if (item) openTeacherCertificateForm(item); }));
}
let teacherContractFilter = '全部';
function contractStatusTone(status) {
  if (status === '已签署') return 'green';
  if (status === '有效') return 'green';
  if (status === '待教师签署' || status === '即将到期') return 'amber';
  if (status === '待学校签署') return 'brand';
  if (status === '已到期') return 'red';
  return 'gray';
}

// 合同期限状态按字典 §4.2 由起止日期派生（有效／即将到期／已到期），不写进签署状态字段。
function contractTermStatusOf(contract, today = DEMO_TODAY) {
  if (!contract?.endAt) return '有效';
  if (contract.endAt < today) return '已到期';
  if (contract.startAt && contract.startAt > today) return '有效';
  return Math.round((new Date(`${contract.endAt}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000) <= 30 ? '即将到期' : '有效';
}

function teacherContractCard(contract) {
  const action = contract.status === '待教师签署' ? '下载并上传签署件' : '查看详情';
  // I1-DEF-012：签署态与期限态分列，期限状态不替换签署状态。
  // CR-2026-083：期限状态仅在「即将到期／已到期」时以辅助标签出现，「有效」不单独出标签，也不并入签署状态文案。
  const signingStatus = contract.status;
  const termStatus = contractTermStatusOf(contract);
  const termPill = signingStatus !== '已终止' && termStatus !== '有效' ? tPill(termStatus, contractStatusTone(termStatus)) : '';
  // I1-DEF-014：已终止是签署终态，需可见终止生效日期与终止原因。
  const terminated = contract.status === '已终止';
  const terminateFacts = terminated
    ? `<div><dt>终止生效日期</dt><dd>${tEsc(contract.terminatedAt || '—')}</dd></div><div><dt>终止原因</dt><dd>${tEsc(contract.terminateReason || contract.note || '—')}</dd></div>`
    : '';
  // CR-2026-083：续签件标注原合同编号；待签署卡展示签署截止日期。
  const renewalNote = contract.renewedFrom ? `<p class="teacher-contract-card-note">续签件 · 原合同 ${tEsc(contract.renewedFrom)}</p>` : '';
  const signDeadline = contract.status === '待教师签署' ? contractSignDeadline(contract) : '';
  const pendingNote = contract.status === '待教师签署'
    ? `<p class="teacher-contract-card-note">${tEsc(contract.note)}${signDeadline ? `请于 ${tEsc(signDeadline)} 前完成签署。` : ''}</p>`
    : '';
  return `<a class="teacher-contract-card ${contract.status === '待教师签署' ? 'pending' : ''}" href="${relativePath(`/teacher/pages/contract-detail.html?contract=${contract.id}`)}"><div class="teacher-contract-card-head"><div><span>${tEsc(contract.type)}</span><h3>${tEsc(contract.name)}</h3></div>${tPill(signingStatus, contractStatusTone(signingStatus))}${termPill}</div><dl class="teacher-contract-card-facts"><div><dt>合同编号</dt><dd>${tEsc(contract.number)}</dd></div><div><dt>合同期限</dt><dd>${tEsc(contract.startAt)} 至 ${tEsc(contract.endAt)}</dd></div><div><dt>工作校区</dt><dd>${tEsc(contract.campus)}</dd></div><div><dt>每课次含税单价</dt><dd>¥${Number(contract.rate).toFixed(2)} / 每次课（含税）</dd></div>${terminateFacts}</dl>${renewalNote}${pendingNote}${contract.status === '待学校签署' ? '<p class="teacher-contract-card-note">本人签署件已上传，等待学校上传盖章件。</p>' : ''}<div class="teacher-contract-card-foot"><span>${contract.schoolSignedAt || contract.teacherSignedAt || contract.pushedAt || '—'}</span><strong>${action}<i aria-hidden="true">›</i></strong></div></a>`;
}
function renderTeacherContracts() {
  const contracts = [...teacherState.contracts].sort((a, b) => b.startAt.localeCompare(a.startAt));
  const pendingCount = contracts.filter(item => item.status === '待教师签署').length;
  // P1：筛选维度与后台对齐——按签署状态四分桶；期限状态不参与筛选，仅在即将到期／已到期时以辅助标签展示。
  const CONTRACT_STATUS_TABS = ['全部', '待教师签署', '待学校签署', '已签署', '已终止'];
  if (!CONTRACT_STATUS_TABS.includes(teacherContractFilter)) teacherContractFilter = '全部';
  const visible = contracts.filter(item => teacherContractFilter === '全部' || item.status === teacherContractFilter);
  const filters = CONTRACT_STATUS_TABS.map(label => [label, label === '全部' ? contracts.length : contracts.filter(item => item.status === label).length]).filter(([label, count]) => label === '全部' || count > 0);
  tLayout(tStack(`<section class="teacher-contract-overview"><div><strong>${pendingCount}</strong><span>份合同待教师签署</span></div><p>${pendingCount ? '请在截止日期前下载、线下签署并上传 PDF' : '当前没有待教师签署合同'}</p></section>`, `<nav class="teacher-contract-filters" role="tablist" aria-label="合同状态筛选">${filters.map(([label, count]) => `<button type="button" role="tab" aria-selected="${teacherContractFilter === label}" class="${teacherContractFilter === label ? 'active' : ''}" data-contract-filter="${label}">${label}<span>${count}</span></button>`).join('')}</nav>`, `<section class="teacher-contract-list" aria-live="polite"><div class="teacher-contract-list-head"><h2>${tEsc(teacherContractFilter)}</h2><span>${visible.length} 份</span></div>${visible.length ? visible.map(teacherContractCard).join('') : `<div class="teacher-contract-empty">暂无${tEsc(teacherContractFilter)}合同</div>`}</section>`));
}
// CR-2026-083：条文模板由 shared/js/contract-document.js 提供，后台详情与教师端阅读器同源。
function contractDocument(contract) {
  return contractDocumentHtml(contract);
}
function currentTeacherContract() {
  const id = new URLSearchParams(location.search).get('contract');
  return teacherState.contracts.find(item => item.id === id) || teacherState.contracts.find(item => item.status === '待教师签署') || teacherState.contracts[0];
}
function renderTeacherContractDetail() {
  const contract = currentTeacherContract();
  const pendingTeacher = contract.status === '待教师签署';
  const statusNote = pendingTeacher ? contract.note : contract.status === '已终止' ? `终止日期 ${contract.terminatedAt} · ${contract.note}` : contract.status === '待学校签署' ? '教师签署件已上传，等待学校上传盖章件。' : contract.note;
  // CR-2026-082：教师端不再进行在线签名，只处理本人签署 PDF 的上传。
  // CR-2026-083：信息区补充行按「签署截止日期 → 续签来源 → 终止证据」顺序拼装。
  const signDeadline = pendingTeacher ? contractSignDeadline(contract) : '';
  const contractExtraRows = [
    ...(signDeadline ? [['签署截止日期', signDeadline]] : []),
    ...(contract.renewedFrom ? [['续签来源', `原合同 ${contract.renewedFrom}`, 'wide']] : []),
    ...(contract.status === '已终止' ? [['终止生效日期', contract.terminatedAt || '—'], ['终止原因', contract.terminateReason || contract.note || '—', 'wide']] : [])
  ];
  const fileName = contract.schoolFile || contract.teacherFile || contract.file;
  const uploadArea = pendingTeacher
    ? `<div class="teacher-contract-upload"><label class="mp-field"><span>上传本人签署件 PDF</span><input type="file" accept="application/pdf,.pdf" data-contract-upload></label><small>请先下载待签署合同，线下手写签名后上传；仅支持 PDF，单文件不超过 ${fileSpecSettings().documentMb}MB。</small></div>`
    : `<p class="teacher-contract-file-note">${contract.status === '待学校签署' ? '本人签署件已归档，等待学校处理。' : '当前合同文件仅支持查看和下载，不能直接覆盖。'}</p>`;
  tLayout(tStack(`<section class="teacher-contract-detail-head"><div><span>${tEsc(contract.type)}</span><h2>${tEsc(contract.name)}</h2><p>${tEsc(contract.number)}</p></div>${tPill(contract.status, contractStatusTone(contract.status))}${tPill(contractTermStatusOf(contract), contractStatusTone(contractTermStatusOf(contract)))}</section>`, `<section class="teacher-contract-info"><div class="teacher-contract-info-head"><h3>合同信息</h3><span>${pendingTeacher ? '待上传签署件' : '只读'}</span></div>${teacherArchiveRows([['合同期限', `${contract.startAt} 至 ${contract.endAt}`, 'wide'], ['授课课程', contract.course, 'wide'], ['工作校区', contract.campus], ['每课次含税单价', `¥${Number(contract.rate).toFixed(2)} / 每次课（含税）`], ['教师签署时间', contract.teacherSignedAt || '待上传'], ['学校签署时间', contract.schoolSignedAt || '待上传'], ['待签署合同 PDF', `${contract.number}-待签署合同.pdf`, 'wide'], ['本人签署件', contract.teacherFile || '尚未上传'], ['学校签署件', contract.schoolFile || '尚未上传'], ['当前有效合同文件', contract.schoolFile || contract.teacherFile || `${contract.number}-待签署合同.pdf`, 'wide'], ...contractExtraRows])}</section>`, `<section class="teacher-contract-file"><div class="teacher-contract-file-page"><span>PDF · ${tEsc(fileName)}</span><strong>教师${tEsc(contract.type)}</strong><p>${tEsc(contract.number)}</p><small>线下签署 PDF 归档</small></div><div><h3>合同全文</h3><p>查看合同期限、授课安排、每课次含税单价及双方权责。</p><div class="teacher-contract-file-actions"><button type="button" class="mp-button secondary full" data-contract-download>下载${pendingTeacher ? '待签署合同' : '当前合同 PDF'}</button><button type="button" class="mp-button secondary full" data-contract-read>查看合同全文</button></div>${uploadArea}</div></section>`, `<p class="teacher-contract-status-note ${pendingTeacher ? 'pending' : ''}">${tEsc(statusNote)}</p>`));
}
function openTeacherContractReader(contract) {
  const dialog = document.createElement('dialog');
  dialog.className = 'teacher-contract-reader-dialog';
  dialog.innerHTML = `<div class="teacher-contract-reader"><header><div><span>${contract.status === '待教师签署' ? '待签署合同预览' : '合同全文'}</span><strong>${tEsc(contract.number)}</strong></div><button type="button" data-contract-close aria-label="关闭合同全文">×</button></header><div class="teacher-contract-reader-body" data-contract-reader-body>${contractDocument(contract)}</div><footer><span>线下签署 PDF 归档</span><button type="button" class="mp-button" data-contract-close>关闭全文</button></footer></div>`;
  document.body.appendChild(dialog);
  const close = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-contract-close]').forEach(button => button.addEventListener('click', close));
  dialog.showModal();
}
function downloadTeacherContract(contract) {
  tToast(`已准备下载合同 PDF：${contract.file || `${contract.number}-待签署合同.pdf`}`);
}
function bindTeacherContractEvents() {
  document.querySelectorAll('[data-contract-filter]').forEach(button => button.addEventListener('click', () => { teacherContractFilter = button.dataset.contractFilter; renderTeacherContracts(); bindTeacherContractEvents(); }));
  document.querySelector('[data-contract-read]')?.addEventListener('click', () => openTeacherContractReader(currentTeacherContract()));
  document.querySelector('[data-contract-download]')?.addEventListener('click', () => downloadTeacherContract(currentTeacherContract()));
  document.querySelector('[data-contract-upload]')?.addEventListener('change', (event) => {
    const file = event.currentTarget.files?.[0];
    const contract = currentTeacherContract();
    if (!file) return;
    if (file.type !== 'application/pdf' && !String(file.name).toLowerCase().endsWith('.pdf')) { tToast('仅支持上传 PDF 文件。'); event.currentTarget.value = ''; return; }
    if (file.size > fileSpecSettings().documentMb * 1024 * 1024) { tToast(`PDF 文件不能超过 ${fileSpecSettings().documentMb}MB。`); event.currentTarget.value = ''; return; }
    teacherState.contracts = teacherState.contracts.map(item => item.id === contract.id ? { ...item, status: '待学校签署', teacherFile: file.name, teacherSignedAt: DEMO_TODAY, signedAt: '', note: '本人签署件已上传，等待学校上传盖章件。' } : item);
    saveTeacher();
    renderTeacherContractDetail();
    bindTeacherContractEvents();
    tToast('本人签署件已上传，等待学校处理。');
  });
}
let teacherGraduationFilter = '全部';
function graduationStatusTone(status) {
  if (status === '已通过') return 'green';
  if (status === '审核中') return 'brand';
  if (status === '需补课' || status === '补课中') return 'amber';
  return 'gray';
}
function graduationStatusCopy(record) {
  if (record.status === '审核中') return '教务复核中，请耐心等待';
  if (record.status === '已通过') return record.result || '数据复核通过，结业成果正在生成';
  if (record.status === '需补课') return record.reason;
  if (record.status === '补课中') return '补课课次已登记，请按安排完成教学记录';
  return record.cancelReason;
}
function graduationRecordCard(record) {
  return `<a class="teacher-graduation-card" href="${relativePath(`/teacher/pages/graduation-detail.html?graduation=${record.id}`)}"><div class="teacher-graduation-card-head"><div class="teacher-graduation-student"><span aria-hidden="true">${tEsc(record.avatar)}</span><div><h3>${tEsc(record.student)}</h3><p>${tEsc(record.className)}</p></div></div>${tPill(record.status, graduationStatusTone(record.status))}</div><div class="teacher-graduation-course"><strong>${tEsc(record.course)}</strong><span>${tEsc(record.professional)}</span></div><dl class="teacher-graduation-metrics"><div><dt>出勤率</dt><dd>${record.attendanceRate}%</dd></div><div><dt>作业提交率</dt><dd>${record.homeworkRate}%</dd></div><div><dt>完成课次</dt><dd>${tEsc(record.lessons)}</dd></div></dl><div class="teacher-graduation-card-foot"><span>${tEsc(record.submittedAt)} 提交</span><strong>${record.status === '补课中' ? '填写记录' : '查看详情'}<i aria-hidden="true">›</i></strong></div></a>`;
}
function renderTeacherGraduations() {
  const records = demoLocalize([...teacherState.graduationRecords]).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const filters = [
    ['全部', records.length],
    ['处理中', records.filter(item => ['审核中', '需补课', '补课中'].includes(item.status)).length],
    ['已完成', records.filter(item => ['已通过', '已取消结业'].includes(item.status)).length]
  ];
  const visible = records.filter(item => teacherGraduationFilter === '全部' || (teacherGraduationFilter === '处理中' ? ['审核中', '需补课', '补课中'].includes(item.status) : ['已通过', '已取消结业'].includes(item.status)));
  tLayout(tStack(
    `<section class="teacher-graduation-overview"><div><span>已提交申请</span><strong>${records.length}</strong><small>人</small></div><p>申请按学员复核<br>补课记录需重新提交</p></section>`,
    `<nav class="teacher-graduation-filters" aria-label="结业申请筛选">${filters.map(([name, count]) => `<button type="button" class="${teacherGraduationFilter === name ? 'active' : ''}" data-graduation-filter="${name}" aria-pressed="${teacherGraduationFilter === name}">${name}<span>${count}</span></button>`).join('')}</nav>`,
    `<section class="teacher-graduation-list"><div class="teacher-graduation-list-head"><h2>${teacherGraduationFilter === '全部' ? '全部申请' : teacherGraduationFilter}</h2><span>${visible.length} 条记录</span></div>${visible.length ? visible.map(graduationRecordCard).join('') : '<div class="teacher-contract-empty">暂无符合条件的结业申请</div>'}</section>`
  ));
}
function currentGraduationRecord() {
  const id = new URLSearchParams(location.search).get('graduation');
  const list = demoLocalize(teacherState.graduationRecords);
  return list.find(item => item.id === id) || list[0];
}
function graduationDetailRows(record) {
  return `<dl class="teacher-graduation-detail-rows"><div><dt>班级</dt><dd>${tEsc(record.className)}</dd></div><div><dt>课程</dt><dd>${tEsc(record.course)}</dd></div><div><dt>专业</dt><dd>${tEsc(record.professional)}</dd></div><div><dt>结课日期</dt><dd>${tEsc(record.completedAt)}</dd></div></dl>`;
}
function graduationTimeline(record) {
  return `<ol class="teacher-graduation-timeline">${record.timeline.map((item, index) => `<li class="${index === record.timeline.length - 1 ? 'current' : ''}"><i aria-hidden="true"></i><div><strong>${tEsc(item.title)}</strong><time>${tEsc(item.time)}</time><p>${tEsc(item.text)}</p></div></li>`).join('')}</ol>`;
}
function graduationResultBlock(record) {
  if (record.status === '审核中' || record.status === '已通过') return `<section class="teacher-graduation-section"><div class="teacher-graduation-section-head"><h2>复核结果</h2>${tPill(record.status, graduationStatusTone(record.status))}</div><p class="teacher-graduation-result-copy">${tEsc(graduationStatusCopy(record))}</p></section>`;
  if (record.status === '已取消结业') return `<section class="teacher-graduation-section"><div class="teacher-graduation-section-head"><h2>取消原因</h2>${tPill(record.status, 'gray')}</div><p class="teacher-graduation-result-copy">${tEsc(record.cancelReason)}</p></section>`;
  return `<section class="teacher-graduation-section"><div class="teacher-graduation-section-head"><h2>补课要求</h2>${tPill(record.status, 'amber')}</div><dl class="teacher-graduation-retake"><div><dt>未达标原因</dt><dd>${tEsc(record.reason)}</dd></div><div><dt>补课说明</dt><dd>${tEsc(record.retakeNote)}</dd></div>${record.retakeSchedule ? `<div><dt>补课时间</dt><dd>${tEsc(record.retakeSchedule)}</dd></div><div><dt>上课地点</dt><dd>${tEsc(record.retakeCampus)}</dd></div><div><dt>补课课次</dt><dd>${tEsc(record.retakeLesson)}</dd></div>` : ''}</dl>${record.status === '需补课' ? '<p class="teacher-graduation-wait">补课安排登记后，可在此填写教学记录。</p>' : ''}</section>`;
}
function graduationRetakeForm(record) {
  if (record.status !== '补课中') return '';
  return `<section class="teacher-graduation-section teacher-graduation-form-section"><div class="teacher-graduation-section-head"><h2>补课教学记录</h2><span>均为必填</span></div><div class="mp-form"><div class="mp-field"><label for="graduation-teaching-record">补课教学内容 <b>*</b></label><textarea id="graduation-teaching-record" placeholder="填写本次补课完成的教学内容">${tEsc(record.retakeTeachingRecord || '')}</textarea></div><div class="mp-field"><label for="graduation-comment">教师综合评语 <b>*</b></label><textarea id="graduation-comment" placeholder="结合补课情况补充综合评语">${tEsc(record.comment || '')}</textarea></div><div class="mp-field"><label for="graduation-advice">成长建议 <b>*</b></label><textarea id="graduation-advice" placeholder="填写后续练习与成长建议">${tEsc(record.advice || '')}</textarea></div></div><div class="teacher-graduation-form-actions"><button type="button" class="mp-button secondary" data-graduation-action="cancel">取消</button><button type="button" class="mp-button" data-graduation-action="submit">重新提交审核</button></div></section>`;
}
function renderTeacherGraduationDetail() {
  const record = currentGraduationRecord();
  tLayout(tStack(
    `<section class="teacher-graduation-detail-head"><div class="teacher-graduation-detail-person"><span aria-hidden="true">${tEsc(record.avatar)}</span><div><small>结业申请</small><h2>${tEsc(record.student)}</h2><p>${tEsc(record.submittedAt)} 提交</p></div></div>${tPill(record.status, graduationStatusTone(record.status))}</section>`,
    `<section class="teacher-graduation-section">${graduationDetailRows(record)}<dl class="teacher-graduation-detail-metrics"><div><dt>出勤率</dt><dd>${record.attendanceRate}%</dd></div><div><dt>作业提交率</dt><dd>${record.homeworkRate}%</dd></div><div><dt>完成课次</dt><dd>${tEsc(record.lessons)}</dd></div></dl></section>`,
    graduationResultBlock(record),
    `<section class="teacher-graduation-section"><div class="teacher-graduation-section-head"><h2>审核进度</h2><span>${record.timeline.length}条记录</span></div>${graduationTimeline(record)}</section>`,
    `<section class="teacher-graduation-section"><div class="teacher-graduation-section-head"><h2>结业材料</h2><span>纯文本</span></div><div class="teacher-graduation-copy"><div><strong>教师综合评语</strong><p>${tEsc(record.comment)}</p></div><div><strong>成长建议</strong><p>${tEsc(record.advice)}</p></div></div></section>`,
    graduationRetakeForm(record)
  ));
}
function bindTeacherGraduationEvents() {
  document.querySelectorAll('[data-graduation-filter]').forEach(button => button.addEventListener('click', () => { teacherGraduationFilter = button.dataset.graduationFilter; renderTeacherGraduations(); bindTeacherGraduationEvents(); }));
  document.querySelector('[data-graduation-action="cancel"]')?.addEventListener('click', () => { renderTeacherGraduationDetail(); bindTeacherGraduationEvents(); tToast('已取消本次填写'); });
  document.querySelector('[data-graduation-action="submit"]')?.addEventListener('click', () => {
    const teachingRecord = document.querySelector('#graduation-teaching-record').value.trim();
    const comment = document.querySelector('#graduation-comment').value.trim();
    const advice = document.querySelector('#graduation-advice').value.trim();
    const fields = [[teachingRecord, '#graduation-teaching-record', '请填写补课教学内容'], [comment, '#graduation-comment', '请填写教师综合评语'], [advice, '#graduation-advice', '请填写成长建议']];
    const invalid = fields.find(([value]) => !value);
    if (invalid) { tToast(invalid[2]); document.querySelector(invalid[1])?.focus(); return; }
    const record = currentGraduationRecord();
    const submittedAt = '2026-09-10 16:30';
    teacherState.graduationRecords = teacherState.graduationRecords.map(item => item.id === record.id ? { ...item, status: '审核中', submittedAt, retakeTeachingRecord: teachingRecord, comment, advice, timeline: [...item.timeline, { title: '补课记录已提交', time: submittedAt, text: '补课教学记录和补充评语已提交教务再次复核。' }] } : item);
    saveTeacher(); renderTeacherGraduationDetail(); bindTeacherGraduationEvents(); window.scrollTo(0, 0); tToast('已重新提交教务复核');
  });
}
function renderTeacherSettings() {
  mountMobileSettings({
    container: teacherMain,
    loggedIn: sessionStorage.getItem('hbyx-mini-logged-in') === '1',
    phone: teacherState.profile.mobile,
    wechatAuthorized: teacherState.wechatAuthorized !== false,
    getPhone: () => teacherState.profile.mobile,
    getWechatAuthorized: () => teacherState.wechatAuthorized !== false,
    onPhoneChange: phone => { teacherState.profile.mobile = phone; saveTeacher(); },
    onWechatChange: value => { teacherState.wechatAuthorized = value; saveTeacher(); },
    navigate: url => { location.href = relativePath(url); },
    loginUrl: '/login.html?role=teacher&redirect=%2Fteacher%2Fpages%2Fsettings.html',
    onLogout: () => { sessionStorage.removeItem('hbyx-mini-logged-in'); sessionStorage.removeItem('hbyx-mini-role'); location.href = relativePath('/login.html?role=teacher'); },
    toast: tToast
  });
}
function renderTeacherMessages() {
  mountMobileMessageList({ container: teacherMain, messages: teacherState.messages, loggedIn: sessionStorage.getItem('hbyx-mini-logged-in') === '1', link: relativePath, detailPath: '/teacher/pages/message-detail.html', listPath: '/teacher/pages/messages.html', loginUrl: '/login.html?role=teacher&redirect=%2Fteacher%2Fpages%2Fmessages.html', lockedCopy: '登录后可查看排课、课程审核、合同与工资等消息。', save: saveTeacher, toast: tToast });
}
function renderTeacherMessageDetail() {
  mountMobileMessageDetail({ container: teacherMain, messages: teacherState.messages, loggedIn: sessionStorage.getItem('hbyx-mini-logged-in') === '1', link: relativePath, detailPath: '/teacher/pages/message-detail.html', listPath: '/teacher/pages/messages.html', loginUrl: '/login.html?role=teacher&redirect=%2Fteacher%2Fpages%2Fmessages.html', lockedCopy: '登录后可查看排课、课程审核、合同与工资等消息。', save: saveTeacher, toast: tToast });
}
function teacherHomeworkFormMarkup() {
  return `<form class="teacher-homework-page-form" id="lesson-homework-form"><div class="teacher-homework-form"><div class="mp-field"><label for="homework-title">作业标题 <b>*</b></label><input id="homework-title" maxlength="50" required placeholder="例如：第8次课身韵组合练习"></div><div class="mp-field"><label for="homework-description">作业描述 <b>*</b></label><textarea id="homework-description" maxlength="2000" rows="8" required placeholder="说明练习内容和提交要求（≤2000 字）"></textarea></div><div class="teacher-homework-form-grid"><div class="mp-field"><label for="homework-type">作业类型 <b>*</b></label><select id="homework-type" required><option value="">请选择</option><option>练习视频</option><option>乐谱练习</option><option>绘画作品</option><option>文字报告</option><option>其他</option></select></div><div class="mp-field"><label for="homework-deadline">截止时间 <b>*</b></label><input id="homework-deadline" type="datetime-local" value="2026-09-12T10:30" required></div></div><fieldset class="teacher-homework-formats"><legend>提交格式 <b>*</b></legend>${['图片', '视频', '音频', '文字', 'PDF'].map(format => `<label><input type="checkbox" name="homework-format" value="${format}">${format}</label>`).join('')}</fieldset><label class="teacher-homework-required"><span><strong>设为必交作业</strong><small>开启后计入作业提交率</small></span><input type="checkbox" id="homework-required" checked></label><fieldset class="teacher-homework-resources"><legend>参考资料 <span>选填</span></legend><label><input type="checkbox" value="第8次课动作示范">第8次课动作示范</label><label><input type="checkbox" value="身韵练习音乐">身韵练习音乐</label></fieldset></div><p class="mp-form-error" data-homework-error hidden></p><div class="teacher-homework-page-actions"><button type="button" class="mp-button secondary" data-homework-cancel>取消</button><button type="submit" class="mp-button">发布作业</button></div></form>`;
}
function renderTeacherHomeworkPage(classItem, session) {
  tLayout(`<div class="teacher-homework-page">${tStack(`<section class="teacher-homework-page-head"><button type="button" class="mp-button secondary" data-homework-cancel>返回课次详情</button><div><span>课后任务</span><h2>发布作业</h2><p>${tEsc(classItem.name)} · 第 ${tEsc(session.index)} 次课</p></div></section>`, `<section class="teacher-homework-page-card"><div class="teacher-homework-page-card-head"><div><span>${tEsc(classItem.course)}</span><h3>填写作业内容</h3></div><span class="mp-pill gray">发布后推送至学员端</span></div>${teacherHomeworkFormMarkup()}</section>`)}</div>`);
  const container = document.querySelector('.teacher-homework-page');
  if (!container) return;
  container.querySelectorAll('[data-homework-cancel]').forEach(button => button.addEventListener('click', () => {
    teacherHomeworkEditing = false;
    renderLesson();
    bindLessonEvents();
    window.scrollTo(0, 0);
  }));
  container.querySelector('#lesson-homework-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const description = container.querySelector('#homework-description').value.trim();
    const error = container.querySelector('[data-homework-error]');
    if (!description) { error.hidden = false; error.textContent = '请填写作业描述'; return; }
    const formats = [...container.querySelectorAll('[name="homework-format"]:checked')].map(input => input.value);
    if (!formats.length) { error.hidden = false; error.textContent = '请至少选择一种提交格式'; return; }
    const homeworkRecord = {
      title: container.querySelector('#homework-title').value.trim(),
      description,
      type: container.querySelector('#homework-type').value,
      formats,
      deadline: container.querySelector('#homework-deadline').value.replace('T', ' '),
      required: container.querySelector('#homework-required').checked,
      resources: [...container.querySelectorAll('.teacher-homework-resources input:checked')].map(input => input.value),
      reviews: { '林知夏': '动作完整，节奏稳定，注意落脚时保持膝盖方向。' },
      publishedAt: '2026-09-10 10:32'
    };
    teacherState.lesson.homework = Array.isArray(teacherState.lesson.homework)
      ? [...teacherState.lesson.homework, homeworkRecord]
      : teacherState.lesson.homework ? [teacherState.lesson.homework, homeworkRecord] : [homeworkRecord];
    persistCurrentLessonHomework();
    teacherHomeworkEditing = false;
    saveTeacher();
    renderLesson();
    bindLessonEvents();
    window.scrollTo(0, 0);
    tToast('作业已发布至学员端');
  });
}
function openLessonHomeworkPage() {
  teacherHomeworkEditing = true;
  renderLesson();
  bindLessonEvents();
  window.scrollTo(0, 0);
}
function openLessonSubmissionsDialog() {
  const currentHomework = Array.isArray(teacherState.lesson.homework) ? teacherState.lesson.homework[teacherState.lesson.homework.length - 1] : teacherState.lesson.homework;
  const reviews = { '林知夏': '动作完整，节奏稳定，注意落脚时保持膝盖方向。', ...(currentHomework?.reviews || {}) };
  const reviewedCount = Object.keys(reviews).length;
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-lesson-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><div class="teacher-lesson-dialog-head"><div><span>作业提交</span><h2>${tEsc(currentHomework?.title || '课后作业')}</h2></div><button type="button" data-lesson-dialog-close aria-label="关闭">×</button></div><div class="teacher-submission-summary"><div><strong>2</strong><span>已提交</span></div><div><strong>2</strong><span>未提交</span></div><div><strong>${reviewedCount}</strong><span>已点评</span></div></div><div class="teacher-submission-list"><article><span class="teacher-lesson-student-avatar">林</span><div><strong>林知夏</strong><small>今天 11:26 · 已点评</small></div>${tPill('已点评', 'green')}</article><article><span class="teacher-lesson-student-avatar">周</span><div><strong>周予安</strong><small>今天 12:08 · ${reviews['周予安'] ? '已点评' : '待点评'}</small></div>${reviews['周予安'] ? tPill('已点评', 'green') : '<button type="button" class="teacher-submission-review" data-submission-review="周予安">去点评</button>'}</article><article><span class="teacher-lesson-student-avatar">陈</span><div><strong>陈一诺</strong><small>尚未提交</small></div>${tPill('未提交', 'gray')}</article><article><span class="teacher-lesson-student-avatar">赵</span><div><strong>赵明月</strong><small>尚未提交</small></div>${tPill('未提交', 'gray')}</article></div><p class="teacher-submission-note">点评仅填写文本评语，可选上传批注文件，不设置分数和等级。</p><button type="button" class="mp-button full secondary" data-lesson-dialog-close>关闭</button></div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-lesson-dialog-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('[data-submission-review]')?.addEventListener('click', event => { const student = event.currentTarget.dataset.submissionReview; dialog.close(); openLessonReviewDialog(student); });
  dialog.showModal();
}
function openLessonReviewDialog(student) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-lesson-dialog';
  dialog.innerHTML = `<form class="mp-dialog-card" id="lesson-review-form"><div class="teacher-lesson-dialog-head"><div><span>作业点评</span><h2>${tEsc(student)}</h2></div><button type="button" data-lesson-review-cancel aria-label="关闭">×</button></div><div class="teacher-submission-preview"><span>视频作业</span><strong>身韵组合练习.mp4</strong><small>01:36 · 今天 12:08 提交</small></div><div class="mp-field teacher-review-comment"><label for="lesson-review-comment">评语 <b>*</b></label><textarea id="lesson-review-comment" required placeholder="填写具体的动作反馈和练习建议"></textarea></div><button type="button" class="teacher-review-upload">＋ 上传批注文件 <span>选填</span></button><p class="teacher-submission-note">只记录文本评语，不设置分数或等级。</p><div class="teacher-lesson-dialog-actions"><button type="button" class="mp-button secondary" data-lesson-review-cancel>取消</button><button type="submit" class="mp-button">提交点评</button></div></form>`;
  document.body.appendChild(dialog);
  const close = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-lesson-review-cancel]').forEach(button => button.addEventListener('click', close));
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const comment = dialog.querySelector('#lesson-review-comment').value.trim();
    teacherState.lesson.homework.reviews = { '林知夏': '动作完整，节奏稳定，注意落脚时保持膝盖方向。', ...(teacherState.lesson.homework.reviews || {}), [student]: comment };
    saveTeacher(); close(); tToast('作业点评已提交'); openLessonSubmissionsDialog();
  });
  dialog.showModal();
}
function confirmEndLesson() {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-lesson-dialog';
  dialog.innerHTML = `<form class="mp-dialog-card" id="end-lesson-form"><div class="teacher-lesson-dialog-head"><div><span>结束上课</span><h2>填写教学记录</h2></div><button type="button" data-end-lesson-cancel aria-label="关闭">×</button></div><p class="mp-dialog-copy">结束后将同时记录教师结束时间、教学记录，并把已保存的考勤推送至学员端和后台；不支持结束后补录。</p><div class="mp-field teacher-end-lesson-record"><label for="end-lesson-content">本节教学记录 <b>*</b></label><textarea id="end-lesson-content" required maxlength="1000" placeholder="请填写本节实际教学内容">${tEsc(teacherState.lesson.teachingContent || teacherState.lesson.teachingRecord || '')}</textarea></div><p class="mp-form-error" data-end-lesson-error hidden></p><div class="teacher-lesson-dialog-actions"><button type="button" class="mp-button secondary" data-end-lesson-cancel>取消</button><button type="submit" class="mp-button">结束上课并同步</button></div></form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-end-lesson-cancel]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const record = dialog.querySelector('#end-lesson-content').value.trim();
    if (!record) {
      const error = dialog.querySelector('[data-end-lesson-error]');
      error.hidden = false;
      error.textContent = '请填写教学记录';
      dialog.querySelector('#end-lesson-content').focus();
      return;
    }
    const now = new Date();
    teacherState.lesson.teachingRecord = record;
    teacherState.lesson.teachingContent = record;
    teacherState.lesson.teachingRecordSaved = true;
    teacherState.lesson.attendanceSynced = true;
    teacherState.lesson.status = '已完成';
    teacherState.lesson.started = false;
    teacherState.lesson.endedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    saveTeacher(); dialog.close(); renderLesson(); bindLessonEvents(); window.scrollTo(0, 0); tToast('已结束上课，考勤与教学记录已同步至学员端和后台');
  });
  dialog.showModal();
}
let lessonTimerId;
let teacherHomeworkEditing = false;
function bindLessonEvents() {
  clearInterval(lessonTimerId);
  document.querySelectorAll('[data-lesson-tab]').forEach(button => button.addEventListener('click', () => { teacherLessonTab = button.dataset.lessonTab; renderLesson(); bindLessonEvents(); window.scrollTo(0, 0); }));
  const lessonPanels = [...document.querySelectorAll('.teacher-lesson-tab-content .mp-stack > .teacher-lesson-section')];
  const lessonPanelOrder = ['attendance', 'record', 'homework'];
  lessonPanels.forEach((panel, index) => { panel.hidden = lessonPanelOrder[index] !== teacherLessonTab; });
  if (teacherState.lesson.status === '上课中') lessonTimerId = window.setInterval(() => { const timer = document.querySelector('[data-lesson-timer]'); if (timer) timer.textContent = lessonTimeLabel(); }, 1000);
  document.querySelectorAll('[data-lesson-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.lessonAction;
    if (action === 'start') {
      const now = new Date();
      teacherState.lesson.status = '上课中'; teacherState.lesson.started = true; teacherState.lesson.startedAtMs = Date.now();
      teacherState.lesson.startedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      saveTeacher(); renderLesson(); bindLessonEvents(); tToast('已开始上课');
    }
    if (action === 'all-present') {
      Object.keys(teacherState.lesson.attendance).forEach(name => { teacherState.lesson.attendance[name] = '已到'; delete teacherState.lesson.attendanceNotes[name]; });
      teacherState.lesson.attendanceSaved = false; teacherState.lesson.attendanceSynced = false; saveTeacher(); renderLesson(); bindLessonEvents(); tToast('已将全班标记为已到，请保存考勤');
    }
    if (action === 'batch-status') {
      const selected = [...document.querySelectorAll('[data-attendance-select]:checked')].map(input => input.dataset.attendanceSelect);
      if (!selected.length) { tToast('请先勾选需要批量登记的学员'); return; }
      const status = window.prompt('请输入考勤状态：已到、迟到、请假或缺勤', '已到');
      if (!['已到', '迟到', '请假', '缺勤'].includes(status)) { tToast('未完成批量登记，请输入有效状态'); return; }
      selected.forEach(name => { teacherState.lesson.attendance[name] = status; if (status === '已到') delete teacherState.lesson.attendanceNotes[name]; });
      teacherState.lesson.attendanceSaved = false; teacherState.lesson.attendanceSynced = false; saveTeacher(); renderLesson(); bindLessonEvents(); tToast(`已批量登记 ${selected.length} 名学员为${status}，请保存考勤`);
    }
    if (action === 'save-attendance') {
      const missing = Object.entries(teacherState.lesson.attendance).filter(([, status]) => !status).map(([name]) => name);
      if (missing.length) { tToast(`请登记${missing.join('、')}的考勤`); return; }
      const leaveWithoutReason = Object.entries(teacherState.lesson.attendance).find(([name, status]) => status === '请假' && !teacherState.lesson.attendanceNotes[name]?.trim());
      if (leaveWithoutReason) { tToast(`请填写${leaveWithoutReason[0]}的请假理由`); document.querySelector(`[data-attendance-note="${leaveWithoutReason[0]}"]`)?.focus(); return; }
      teacherState.lesson.attendanceSaved = true; teacherState.lesson.attendanceSynced = false; saveTeacher(); renderLesson(); bindLessonEvents(); tToast('考勤已保存，将在结束上课后同步至学员端和后台');
    }
    if (action === 'open-homework') openLessonHomeworkPage();
    if (action === 'homework-submissions') openLessonSubmissionsDialog();
    if (action === 'end') {
      if (!teacherState.lesson.attendanceSaved) { tToast('请先保存学员考勤'); return; }
      confirmEndLesson();
    }
  }));
  document.querySelectorAll('[data-attendance-status]').forEach(button => button.addEventListener('click', () => {
    const name = button.dataset.student;
    teacherState.lesson.attendance[name] = button.dataset.attendanceStatus;
    if (button.dataset.attendanceStatus === '已到') delete teacherState.lesson.attendanceNotes[name];
    teacherState.lesson.attendanceSaved = false; teacherState.lesson.attendanceSynced = false; saveTeacher(); renderLesson(); bindLessonEvents();
  }));
  document.querySelectorAll('[data-attendance-note]').forEach(input => input.addEventListener('input', () => {
    teacherState.lesson.attendanceNotes[input.dataset.attendanceNote] = input.value;
    teacherState.lesson.attendanceSaved = false; teacherState.lesson.attendanceSynced = false; saveTeacher();
  }));
}
function renderSimplePage(title, body) { tLayout(tStack(tCard(`<h2>${title}</h2>${body}</section>`))); }
function bindScheduleCalendar() {
  document.querySelectorAll('[data-schedule-date]').forEach(button => button.addEventListener('click', () => {
    selectedScheduleDay = button.dataset.scheduleDate;
    const [year, month] = selectedScheduleDay.split('-').map(Number);
    calendarYear = year;
    calendarMonth = month - 1;
    renderSchedule();
    bindTeacherEvents();
  }));
  document.querySelectorAll('[data-calendar-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.calendarAction;
    if (action === 'toggle') {
      calendarExpanded = !calendarExpanded;
    } else if (action === 'today') {
      selectedScheduleDay = calendarToday;
      calendarYear = 2026;
      calendarMonth = 8;
    } else {
      calendarMonth += action === 'prev' ? -1 : 1;
      if (calendarMonth < 0) { calendarYear -= 1; calendarMonth = 11; }
      if (calendarMonth > 11) { calendarYear += 1; calendarMonth = 0; }
      selectedScheduleDay = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`;
    }
    renderSchedule();
    bindTeacherEvents();
  }));
}
function bindTeacherEvents() { bindScheduleCalendar(); bindClassDetailEvents(); bindTeacherClassSectionNav(); document.querySelectorAll('[data-class-filter]').forEach(button => button.addEventListener('click', () => { selectedClassStatus = button.dataset.classFilter; renderClasses(); bindTeacherEvents(); })); document.querySelectorAll('[data-class-detail-tab]').forEach(button => button.addEventListener('click', () => { const classItem = currentTeacherClass(); const target = teacherClassSectionTarget(button.dataset.classDetailTab); writeClassUiState(classItem && classItem.id, { tab: target }); scrollToTeacherClassSection(target); })); document.querySelectorAll('[data-teacher-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.teacherAction; if (action === 'start-schedule') { startLessonFromSchedule(button.dataset.lessonId || ''); return; } if (action === 'graduation') location.href = relativePath('/teacher/pages/graduation.html'); if (action === 'new-application') location.href = relativePath('/teacher/pages/application-create.html'); })); }
// CR-2026-039：教师端全站需要登录，未登录直接跳转教师登录页并带回跳地址；不再逐页直渲染。
// 唯一例外是「我的」（profile）：未登录展示登录入口卡片与完整菜单，由用户主动选择登录入口。
const teacherPublicPage = teacherPath.endsWith('/profile.html');
if (isMiniLoggedIn() && !isMiniRole('teacher')) redirectMiniLogin('teacher');
else if (!isMiniLoggedIn() && !teacherPublicPage) redirectMiniLogin('teacher');
else if (teacherPath.endsWith('/index.html') || teacherPath.endsWith('/teacher/')) renderSchedule();
else if (teacherPath.endsWith('/class-detail.html')) renderLesson();
else if (teacherPath.endsWith('/student-detail.html')) { renderTeacherStudentDetail(); bindTeacherStudentDetailEvents(); }
else if (teacherPath.endsWith('/class-overview.html')) renderClassDetail();
else if (teacherPath.endsWith('/classes.html')) renderClasses();
else if (teacherPath.endsWith('/applications.html')) renderApplications();
else if (teacherPath.endsWith('/application-create.html')) renderApplicationCreate();
else if (teacherPath.endsWith('/application-detail.html')) renderApplicationDetail();
else if (teacherPath.endsWith('/salary.html')) renderSalary();
else if (teacherPath.endsWith('/salary-detail.html')) renderSalaryDetail();
else if (teacherPath.endsWith('/profile.html')) renderProfile();
else if (teacherPath.endsWith('/messages.html')) renderTeacherMessages();
else if (teacherPath.endsWith('/message-detail.html')) renderTeacherMessageDetail();
else if (teacherPath.endsWith('/settings.html')) renderTeacherSettings();
else if (teacherPath.endsWith('/profile-detail.html')) renderTeacherProfileDetail();
else if (teacherPath.endsWith('/certificates.html')) renderTeacherCertificates();
else if (teacherPath.endsWith('/contracts.html')) renderTeacherContracts();
else if (teacherPath.endsWith('/contract-detail.html')) renderTeacherContractDetail();
else if (teacherPath.endsWith('/graduation.html')) renderTeacherGraduations();
else if (teacherPath.endsWith('/graduation-detail.html')) renderTeacherGraduationDetail();
initApplicationForm();
initApplicationDetail();
bindTeacherCertificateEvents();
bindTeacherContractEvents();
bindTeacherProfileEvents();
bindTeacherGraduationEvents();
bindLessonEvents();
bindTeacherEvents();

// 教师端与后台共用字段规格：按页面路径应用输入约束。
mountFieldConstraints('teacher/' + (teacherPath.split('/').pop() || '').replace('.html', ''));

// 页面说明入口：内容来自 spec/fields/，与后台共用同一份字段口径。
mountPageHelp({ pageKey: 'teacher/' + (teacherPath.split('/').pop() || '').replace('.html', ''), title: document.title });
