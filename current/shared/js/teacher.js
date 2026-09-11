import { relativePath } from './paths.js';
import { mountMobileSettings } from './mobile-settings.js';
import { mountMobileMessageDetail, mountMobileMessageList } from './mobile-messages.js';
import { demoId, demoTime, getCurrentAccountId, readDemoState, upsertDemoRecord } from './demo-store.js';

const teacherMain = document.querySelector('.mobile-main');
const teacherPath = location.pathname;
const teacherKey = 'hbyx-mini-teacher-demo';
const teacherProfileDefaults = {
  mobile: '13800138026',
  email: 'wangyue@hbyx.edu.cn',
  emergencyName: '王明远',
  emergencyMobile: '13900139018',
  payeeName: '王玥',
  bankCard: '6217003810022866',
  bankName: '中国建设银行武汉光谷支行',
  education: '2010.09-2014.06，湖北艺术学院舞蹈表演专业，本科。',
  employment: '2018.07至今，湖北艺术职业学院舞蹈教师，承担中国舞基础与身韵课程教学。',
  awards: '2024年湖北省职业院校技能大赛优秀指导教师。',
  tagline: '让每一次基本功练习，都成为舞台表达的一部分。',
  introduction: '长期从事中国舞基础、身韵及少儿舞蹈教学，注重基本功训练与舞台表现力的结合。'
};
const teacherCertificateDefaults = [
  { id: 'cert-001', name: '中国舞教师资格证', number: 'WD-2019-0028', type: '艺术等级证', issuer: '中国舞蹈家协会', issuedAt: '2019-10-01', expiresAt: '2027-09-30', status: '审核通过', validity: '有效', source: '后台录入', file: '中国舞教师资格证-WD-2019-0028.pdf', reviewedAt: '2026-01-04', reviewNote: '证书编号、发证机构和文件内容已核验。' },
  { id: 'cert-002', name: '本科学历证书', number: 'HBYS-2014-0618', type: '学历证书', issuer: '湖北艺术学院', issuedAt: '2014-06-20', expiresAt: '', status: '已录入', validity: '有效', source: '后台录入', file: '本科学历证书.pdf', reviewNote: '由学校档案管理员录入。' },
  { id: 'cert-003', name: '少儿舞蹈教师培训证', number: 'SEWD-2026-0902', type: '教师资格证', issuer: '湖北省舞蹈家协会', issuedAt: '2026-08-28', expiresAt: '2029-08-27', status: '待审核', validity: '有效', source: '教师端上传', file: '少儿舞蹈教师培训证.jpg', reviewNote: '已提交，等待教研审核。' },
  { id: 'cert-004', name: '舞蹈编导专项培训证', number: 'WDBD-2023-0186', type: '其他', issuer: '湖北省艺术教育协会', issuedAt: '2023-07-12', expiresAt: '2028-07-11', status: '审核不通过', validity: '有效', source: '教师端上传', file: '舞蹈编导专项培训证.jpg', reviewedAt: '2026-09-08', reviewNote: '证书照片右下角信息不完整，请重新拍摄清晰完整的证书。' },
  { id: 'cert-005', name: '中国舞等级考试考官证', number: 'KG-2022-1056', type: '艺术等级证', issuer: '中国舞蹈家协会', issuedAt: '2022-10-01', expiresAt: '2026-10-15', status: '审核通过', validity: '即将过期', source: '教师端上传', file: '中国舞等级考试考官证.pdf', reviewedAt: '2022-10-06', reviewNote: '证书信息已核验，请在有效期结束前办理续期。' }
];
const teacherContractDefaults = [
  { id: 'contract-2027', name: '2026-2027年度教师合作协议', number: 'CT2026090021', type: '合作协议', status: '待签署', startAt: '2026-10-01', endAt: '2027-09-30', signedAt: '', version: 'v1', rate: 180, campus: '龙泉校区', course: '少儿中国舞基础、中国舞身韵训练', file: 'CT2026090021-教师合作协议.pdf', pushedAt: '2026-09-09', note: '请在2026年9月20日前完成签署。' },
  { id: 'contract-2026', name: '2026年度教师合作协议', number: 'CT2026010008', type: '合作协议', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', signedAt: '2026-01-03', version: 'v1', rate: 180, campus: '龙泉校区', course: '少儿中国舞基础、中国舞身韵训练', file: 'CT2026010008-教师合作协议.pdf', pushedAt: '2026-01-02', note: '合同已完成双方签署，按有效课次计薪。' },
  { id: 'contract-2025', name: '2025年度教师合作协议', number: 'CT2025010006', type: '合作协议', status: '已到期', startAt: '2025-01-01', endAt: '2025-12-31', signedAt: '2025-01-02', version: 'v1', rate: 165, campus: '龙泉校区', course: '少儿中国舞基础', file: 'CT2025010006-教师合作协议.pdf', pushedAt: '2024-12-28', note: '合同已到期，仅供历史查询。' },
  { id: 'contract-2024', name: '2024年度教师合作协议', number: 'CT2024010004', type: '合作协议', status: '已终止', startAt: '2024-01-01', endAt: '2024-12-31', signedAt: '2024-01-03', version: 'v2', rate: 150, campus: '南湖校区', course: '舞蹈基本功', file: 'CT2024010004-教师合作协议.pdf', pushedAt: '2023-12-25', terminatedAt: '2024-10-31', note: '因授课安排调整，双方协商终止本合同。' }
];
const teacherGraduationDefaults = [
  { id: 'graduation-001', student: '林知夏', avatar: '林', className: '少儿舞蹈基础班', course: '少儿中国舞基础', professional: '舞蹈表演', completedAt: '2026-09-02', submittedAt: '2026-09-03 10:20', status: '审核中', attendanceRate: 95, homeworkRate: 100, lessons: '20/20', comment: '能够认真完成基本功与组合训练，动作规范性和节奏感均有明显提升。', advice: '继续加强脚背、膝盖控制，并保持每周两次基础训练。', timeline: [{ title: '提交结业申请', time: '2026-09-03 10:20', text: '结业材料已提交教务复核。' }, { title: '教务复核中', time: '2026-09-03 14:10', text: '正在核对考勤、作业和教师评语。' }] },
  { id: 'graduation-002', student: '周予安', avatar: '周', className: '少儿舞蹈基础班', course: '少儿中国舞基础', professional: '舞蹈表演', completedAt: '2026-09-02', submittedAt: '2026-09-03 10:20', status: '补课中', attendanceRate: 80, homeworkRate: 90, lessons: '18/20', comment: '基本动作掌握较稳，组合衔接仍需加强。', advice: '补齐缺勤课次后重点练习身韵连接和重心转换。', reason: '缺勤2次，当前有效出勤率未达到结业要求。', retakeNote: '补上第6、12次课的核心训练内容，完成后补充教学记录。', retakeSchedule: '2026-09-12 14:00-15:30', retakeCampus: '龙泉校区 · 舞蹈楼201', retakeLesson: '补课第1次 · 身韵连接与组合训练', timeline: [{ title: '提交结业申请', time: '2026-09-03 10:20', text: '结业材料已提交教务复核。' }, { title: '退回补课', time: '2026-09-05 16:40', text: '教务反馈出勤未达标，需完成补课。' }, { title: '补课已安排', time: '2026-09-08 09:30', text: '补课课次已登记，等待完成教学记录。' }] },
  { id: 'graduation-003', student: '陈一诺', avatar: '陈', className: '少儿舞蹈基础班', course: '少儿中国舞基础', professional: '舞蹈表演', completedAt: '2026-09-02', submittedAt: '2026-09-03 10:20', status: '需补课', attendanceRate: 85, homeworkRate: 75, lessons: '19/20', comment: '课堂参与积极，基础动作完成度较好。', advice: '补交缺失作业，并针对转身稳定性进行集中练习。', reason: '作业提交率未达到结业要求，且有1次缺勤。', retakeNote: '教务正在协调补课时间，安排完成后将通过消息通知。', timeline: [{ title: '提交结业申请', time: '2026-09-03 10:20', text: '结业材料已提交教务复核。' }, { title: '退回补课', time: '2026-09-06 11:15', text: '请等待教务登记补课课次。' }] },
  { id: 'graduation-004', student: '赵明月', avatar: '赵', className: '成人中国舞提高班', course: '中国舞身韵训练', professional: '舞蹈表演', completedAt: '2026-08-20', submittedAt: '2026-08-21 09:05', reviewedAt: '2026-08-23 15:30', status: '已通过', attendanceRate: 100, homeworkRate: 100, lessons: '16/16', comment: '身韵表达自然，能够准确完成课程组合并形成稳定的舞台表现。', advice: '可继续进行进阶组合训练，提升动作细节与呼吸配合。', result: '数据复核通过，学员结业成果正在生成。', timeline: [{ title: '提交结业申请', time: '2026-08-21 09:05', text: '结业材料已提交教务复核。' }, { title: '复核通过', time: '2026-08-23 15:30', text: '学员已通过结业复核。' }] },
  { id: 'graduation-005', student: '吴桐', avatar: '吴', className: '舞蹈基本功强化班', course: '舞蹈基本功', professional: '舞蹈表演', completedAt: '2026-07-28', submittedAt: '2026-07-29 13:10', reviewedAt: '2026-07-30 10:00', status: '已取消结业', attendanceRate: 50, homeworkRate: 40, lessons: '5/10', comment: '已完成前半段基础训练。', advice: '如后续恢复学习，建议从柔韧与力量基础重新衔接。', cancelReason: '学员办理退学及剩余课时退款，不再参与本班结业。', timeline: [{ title: '提交结业申请', time: '2026-07-29 13:10', text: '结业材料已提交教务复核。' }, { title: '取消结业', time: '2026-07-30 10:00', text: '因退学退款终止本次结业流程。' }] }
];
const teacherLessonDefaults = {
  status: '待上课', started: false, startedAt: '', startedAtMs: 0, endedAt: '',
  teachingRecord: '', teachingRecordSaved: false, attendanceSubmitted: false,
  attendance: { '林知夏': '', '周予安': '', '陈一诺': '', '赵明月': '' },
  attendanceNotes: {}, homework: null
};
const teacherMessageDefaults = [
  { id: 'TMSG20260910001', type: '新增排课通知', title: '今日课程将在09:00开始', summary: '少儿舞蹈基础班第8次课将在龙泉校区综合楼302上课。', body: '教务已为您安排一节少儿中国舞基础课程，请提前到达龙泉校区综合楼302并完成上课准备。', createdAt: '2026-09-10 07:30', read: false, target: '/teacher/pages/class-detail.html?class=class-001&lesson=8', actionLabel: '进入课次详情' },
  { id: 'TMSG20260909001', type: '课次调整通知', title: '第7次课上课时间已调整', summary: '少儿舞蹈基础班第7次课因场地检修暂停，补课安排另行通知。', body: '因龙泉校区综合楼302场地检修，原定9月9日的少儿舞蹈基础班第7次课已暂停。教务确认补课安排后将再次通知您。', createdAt: '2026-09-09 17:25', read: false, target: '/teacher/pages/class-detail.html?class=class-001&lesson=7', actionLabel: '查看课次详情' },
  { id: 'TMSG20260909002', type: '合同签署通知', title: '您有一份合同待签署', summary: '2026-2027年度教师合作协议请于9月20日前完成签署。', body: '新的教师合作协议已推送，请核对授课范围、课时单价和有效期，并在2026年9月20日前完成签署。', createdAt: '2026-09-09 16:10', read: false, target: '/teacher/pages/contract-detail.html?contract=contract-2027', actionLabel: '查看合同' },
  { id: 'TMSG20260908003', type: '工资已发放', title: '2026年7月工资已发放', summary: '本期实际核发5483.20元，已发放至尾号2866账户。', body: '2026年7月工资已完成发放，实际核发5483.20元，已于2026年8月5日发放至中国建设银行尾号2866账户。', createdAt: '2026-09-08 10:20', read: true, target: '/teacher/pages/salary-detail.html?month=2026-07', actionLabel: '查看工资明细' },
  { id: 'TMSG20260908004', type: '工资单已发布', title: '2026年6月工资单已发布', summary: '本期实际核发5024.40元，等待财务发放。', body: '2026年6月工资单已发布，本期共计28课时，实际核发5024.40元。当前状态为待发放，资金到账后将另行通知。', createdAt: '2026-09-08 09:40', read: true, target: '/teacher/pages/salary-detail.html?month=2026-06', actionLabel: '查看工资明细' },
  { id: 'TMSG20260907003', type: '作业提交提醒', title: '有学员提交了作业', summary: '林知夏已提交“节奏练习视频”，请及时批改并填写文字评语。', body: '学员林知夏已完成“节奏练习视频”作业提交，请进入班级课次详情查看作业内容并完成文本评语。', createdAt: '2026-09-07 18:30', read: false, target: '/teacher/pages/class-detail.html?class=class-001&lesson=8', actionLabel: '查看作业' },
  { id: 'TMSG20260907004', type: '课程申报审核结果', title: '课程申报审核通过', summary: '您申报的《声乐演唱技巧》已通过教研审核。', body: '课程申报资料已通过审核，教务将继续完成课程发布和后续排课安排。', createdAt: '2026-09-07 15:40', read: true, target: '/teacher/pages/applications.html', actionLabel: '查看课程申报' },
  { id: 'TMSG20260906005', type: '证书审核结果', title: '教师证书审核结果已更新', summary: '中国舞教师资格证已审核通过。', body: '您提交的中国舞教师资格证已完成审核，证书状态已更新为审核通过。', createdAt: '2026-09-06 11:05', read: true, target: '/teacher/pages/certificates.html', actionLabel: '查看我的证书' },
  { id: 'TMSG20260905006', type: '结业申请审核结果', title: '有3项结业申请待处理', summary: '请查看学员结业复核结果及补课安排。', body: '当前有3项学员结业申请正在处理中，其中包含需补课和审核中的记录，请及时查看并完成相关教学记录。', createdAt: '2026-09-05 09:15', read: true, target: '/teacher/pages/graduation.html', actionLabel: '查看结业记录' }
];
const teacherDefaults = { lesson: teacherLessonDefaults, application: '审核中', applicationUpdates: {}, graduation: '可申请', salary: '已发布', profile: teacherProfileDefaults, certificates: teacherCertificateDefaults, contracts: teacherContractDefaults, graduationRecords: teacherGraduationDefaults, messages: teacherMessageDefaults };
let teacherState;
try { teacherState = { ...teacherDefaults, ...JSON.parse(sessionStorage.getItem(teacherKey) || '{}') }; } catch { teacherState = { ...teacherDefaults }; }
teacherState.profile = { ...teacherProfileDefaults, ...(teacherState.profile || {}) };
teacherState.lesson = { ...teacherLessonDefaults, ...(teacherState.lesson || {}), attendance: { ...teacherLessonDefaults.attendance, ...(teacherState.lesson?.attendance || {}) }, attendanceNotes: { ...(teacherState.lesson?.attendanceNotes || {}) } };
teacherState.certificates = Array.isArray(teacherState.certificates) ? teacherState.certificates : teacherCertificateDefaults.map(item => ({ ...item }));
teacherState.contracts = Array.isArray(teacherState.contracts) ? teacherState.contracts : teacherContractDefaults.map(item => ({ ...item }));
teacherState.graduationRecords = Array.isArray(teacherState.graduationRecords) ? teacherState.graduationRecords : teacherGraduationDefaults.map(item => ({ ...item }));
const storedTeacherMessages = Array.isArray(teacherState.messages) ? teacherState.messages : [];
const knownTeacherMessages = teacherMessageDefaults.map(item => ({ ...item, read: storedTeacherMessages.find(row => row.id === item.id)?.read ?? item.read }));
const additionalTeacherMessages = storedTeacherMessages.filter(item => !teacherMessageDefaults.some(row => row.id === item.id));
teacherState.messages = [...knownTeacherMessages, ...additionalTeacherMessages];
teacherState.applicationUpdates = { ...(teacherState.applicationUpdates || {}) };
function saveTeacher() { sessionStorage.setItem(teacherKey, JSON.stringify(teacherState)); }
function tEsc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function tPill(text, tone = '') { return `<span class="mp-pill ${tone}">${tEsc(text)}</span>`; }
function tButton(text, attrs = '', cls = '') { return `<button class="mp-button ${cls}" ${attrs}>${tEsc(text)}</button>`; }
function tCard(content) { return `<section class="mp-card">${content}</section>`; }
function tStack(...content) { return `<div class="mp-stack">${content.join('')}</div>`; }
function tToast(message) { const node = document.createElement('div'); node.className = 'mp-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 2200); }
function tLayout(content) { teacherMain.innerHTML = content; }
const scheduleDays = [
  { key: '09-07', weekday: '一', date: '7', label: '9月7日 周一', lessons: [{ className: '成人中国舞提高班', courseName: '中国舞身韵训练', lessonNo: 3, time: '14:00-15:30', campus: '龙泉校区', room: '舞蹈楼201', students: 16, status: '已完成' }] },
  { key: '09-08', weekday: '二', date: '8', label: '9月8日 周二', lessons: [] },
  { key: '09-09', weekday: '三', date: '9', label: '9月9日 周三', lessons: [{ className: '少儿舞蹈基础班', courseName: '少儿中国舞基础', lessonNo: 7, time: '09:00-10:30', campus: '龙泉校区', room: '综合楼302', students: 20, status: '已停课', note: '因场地检修停课，补课时间另行通知' }] },
  { key: '09-10', weekday: '四', date: '10', label: '9月10日 周四', today: true, lessons: [{ id: 'current', className: '少儿舞蹈基础班', courseName: '少儿中国舞基础', lessonNo: 8, time: '09:00-10:30', campus: '龙泉校区', room: '综合楼302', students: 20 }, { className: '成人中国舞提高班', courseName: '中国舞身韵训练', lessonNo: 4, time: '14:00-15:30', campus: '龙泉校区', room: '舞蹈楼201', students: 16, status: '待上课' }] },
  { key: '09-11', weekday: '五', date: '11', label: '9月11日 周五', lessons: [] },
  { key: '09-12', weekday: '六', date: '12', label: '9月12日 周六', lessons: [{ className: '舞蹈基本功强化班', courseName: '舞蹈基本功', lessonNo: 5, time: '10:00-11:30', campus: '南湖校区', room: '形体教室105', students: 18, status: '已取消', note: '本课次已由教务取消' }] },
  { key: '09-13', weekday: '日', date: '13', label: '9月13日 周日', lessons: [{ className: '少儿舞蹈基础班', courseName: '少儿中国舞基础', lessonNo: 9, time: '09:00-10:30', campus: '龙泉校区', room: '综合楼302', students: 20, status: '待上课' }] }
];
const calendarToday = '2026-09-10';
let selectedScheduleDay = calendarToday;
let calendarYear = 2026;
let calendarMonth = 8;
let calendarExpanded = false;
function scheduleDay(dateKey) { return scheduleDays.find(day => day.key === dateKey.slice(5)); }
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
  const href = relativePath('/teacher/pages/class-detail.html');
  const primaryAction = status === '待上课' ? tButton('开始上课', `data-teacher-action="start-schedule" data-lesson-id="${tEsc(lesson.id || '')}"`) : '';
  return `<article class="teacher-schedule-card status-${status === '上课中' ? 'active' : status === '已完成' ? 'done' : status === '待上课' ? 'pending' : 'inactive'}"><div class="teacher-schedule-time"><strong>${tEsc(lesson.time.split('-')[0])}</strong><span>${tEsc(lesson.time.split('-')[1])}</span></div><div class="teacher-schedule-content"><div class="teacher-schedule-title"><div><h3>${tEsc(lesson.className)}</h3><p>${tEsc(lesson.courseName)} · 第${tEsc(lesson.lessonNo)}次课</p></div>${tPill(status, lessonTone(status))}</div><dl class="teacher-schedule-facts"><div><dt>上课地点</dt><dd>${tEsc(lesson.campus)} · ${tEsc(lesson.room)}</dd></div><div><dt>学员人数</dt><dd>${tEsc(lesson.students)}人</dd></div></dl>${lesson.note ? `<p class="teacher-schedule-note">${tEsc(lesson.note)}</p>` : ''}<div class="teacher-schedule-actions"><a class="mp-button secondary" href="${href}">${status === '已完成' ? '查看记录' : '查看详情'}</a>${primaryAction}</div></div></article>`;
}
function renderSchedule() {
  const scheduled = scheduleDay(selectedScheduleDay);
  const selected = scheduled || { label: calendarDateLabel(selectedScheduleDay), today: selectedScheduleDay === calendarToday, lessons: [] };
  const today = scheduleDays.find(day => day.today);
  const list = selected.lessons.length ? selected.lessons.map(scheduleLessonCard).join('') : `<section class="teacher-schedule-empty"><strong>当天没有课程</strong><p>可选择其他日期查看已排课次。</p></section>`;
  tLayout(tStack(`<section class="teacher-schedule-overview"><div class="teacher-schedule-profile"><span class="mp-avatar" aria-hidden="true">王</span><div><span>授课教师</span><h2>王玥</h2></div></div><div class="teacher-schedule-today"><span>2026年9月10日</span><strong>今日 ${today.lessons.length} 节课</strong></div></section>`, renderMobileCalendar(), `<section class="teacher-schedule-list"><div class="teacher-schedule-list-head"><div><h2>${selected.label}${selected.today ? '<small>今天</small>' : ''}</h2><p>${selected.lessons.length ? `共 ${selected.lessons.length} 节课，按上课时间排列` : '暂无已排课次'}</p></div></div>${list}</section>`));
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
  return `<article class="teacher-lesson-student"><div class="teacher-lesson-student-head"><span class="teacher-lesson-student-avatar" aria-hidden="true">${tEsc(name.slice(0, 1))}</span><strong>${tEsc(name)}</strong>${status ? tPill(status, status === '已到' ? 'green' : status === '缺勤' ? 'gray' : 'amber') : '<span class="teacher-lesson-unmarked">未登记</span>'}</div><div class="teacher-attendance-options" role="group" aria-label="${tEsc(name)}考勤">${['已到', '迟到', '请假', '缺勤'].map(item => `<button type="button" class="${status === item ? 'active' : ''}" data-attendance-status="${item}" data-student="${tEsc(name)}" aria-pressed="${status === item}" ${editable ? '' : 'disabled'}>${item}</button>`).join('')}</div>${status === '请假' ? `<div class="mp-field teacher-attendance-note"><label for="attendance-note-${tEsc(name)}">请假理由 <b>*</b></label><input id="attendance-note-${tEsc(name)}" data-attendance-note="${tEsc(name)}" value="${tEsc(note)}" placeholder="请输入请假理由" ${editable ? '' : 'disabled'}></div>` : status && status !== '已到' ? `<div class="mp-field teacher-attendance-note"><label for="attendance-note-${tEsc(name)}">考勤备注 <span>选填</span></label><input id="attendance-note-${tEsc(name)}" data-attendance-note="${tEsc(name)}" value="${tEsc(note)}" placeholder="补充说明" ${editable ? '' : 'disabled'}></div>` : ''}</article>`;
}
function renderLessonExecution() {
  const lesson = teacherState.lesson;
  const active = lesson.status === '上课中';
  const completed = lesson.status === '已完成';
  const attendanceDone = Object.values(lesson.attendance).every(Boolean) && Object.entries(lesson.attendance).every(([name, status]) => status !== '请假' || lesson.attendanceNotes[name]?.trim());
  const homework = lesson.homework;
  const controlsDisabled = active ? '' : 'disabled';
  const operationPanel = active || completed ? tStack(
    `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>01</span><h2>学员考勤</h2></div>${lessonTaskStatus(attendanceDone && lesson.attendanceSubmitted, completed)}</div><div class="teacher-attendance-toolbar"><div class="teacher-attendance-summary">${lessonAttendanceSummary()}</div>${completed ? '' : '<button type="button" data-lesson-action="all-present">全部已到</button>'}</div><div class="teacher-lesson-student-list">${Object.entries(lesson.attendance).map(([name, status]) => lessonAttendanceStudent(name, status, active)).join('')}</div>${completed ? '' : `<button type="button" class="mp-button full secondary teacher-attendance-submit" data-lesson-action="submit-attendance" ${controlsDisabled}>提交考勤</button>`}</section>`,
    completed ? `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>02</span><h2>教学记录</h2></div>${tPill('已完成', 'green')}</div><div class="teacher-static-lesson-record"><p>${tEsc(lesson.teachingRecord || '教学记录已随结束上课提交。')}</p></div></section>` : '',
    `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>${completed ? '03' : '02'}</span><h2>课后作业</h2></div>${homework ? tPill('已发布', 'green') : tPill('可选', 'gray')}</div>${homework ? `<div class="teacher-homework-published"><div><strong>${tEsc(homework.title)}</strong><p>${tEsc(homework.type)} · ${tEsc(homework.formats.join('、'))}</p><span>截止 ${tEsc(homework.deadline)} · ${homework.required ? '必交' : '选交'}</span></div><button type="button" data-lesson-action="homework-submissions">查看提交</button></div>` : `<div class="teacher-homework-empty"><p>可在课后发布练习任务，发布后推送至学员端作业本。</p><button type="button" class="mp-button secondary" data-lesson-action="open-homework" ${controlsDisabled}>发布作业</button></div>`}</section>`
  ) : `<section class="teacher-lesson-locked"><strong>开始上课后登记课堂信息</strong><p>完成学员考勤后，可结束本课次并填写教学记录。</p><ol><li>登记并提交学员考勤</li><li>结束上课时填写教学记录</li><li>课后作业（可选）</li></ol></section>`;
  tLayout(`<div class="teacher-lesson-page ${active ? 'has-bottom-action' : ''}">${tStack(
    `<section class="teacher-lesson-hero"><div class="teacher-lesson-hero-head"><div><span>少儿中国舞基础</span><h2>少儿舞蹈基础班 · 第8次课</h2></div>${tPill(lesson.status, lessonTone(lesson.status))}</div><dl><div><dt>上课时间</dt><dd>2026-09-10 09:00-10:30</dd></div><div><dt>上课地点</dt><dd>龙泉校区 · 综合楼302</dd></div></dl></section>`,
    `<section class="teacher-lesson-clock"><div class="teacher-lesson-clock-main"><span>${active ? '已上课时长' : completed ? '教师考勤' : '等待开始上课'}</span><strong data-lesson-timer>${lessonTimeLabel()}</strong><small>本课次计薪 2 课时</small></div><dl><div><dt>到达时间</dt><dd>${tEsc(lesson.startedAt || '--:--')}</dd></div><div><dt>离开时间</dt><dd>${tEsc(lesson.endedAt || '--:--')}</dd></div></dl>${lesson.status === '待上课' ? '<button type="button" class="mp-button full" data-lesson-action="start">开始上课</button>' : ''}</section>`,
    active ? `<section class="teacher-lesson-readiness"><div><strong>${lesson.attendanceSubmitted ? '1/1' : '0/1'}</strong><span>上课中必做事项</span></div><ul><li class="${lesson.attendanceSubmitted ? 'done' : ''}"><i aria-hidden="true">${lesson.attendanceSubmitted ? '✓' : ''}</i>学员考勤</li></ul></section>` : '',
    operationPanel,
    completed ? `<section class="teacher-lesson-complete-note"><strong>本课次已计入工资</strong><p>${tEsc(lesson.endedAt)} 结束上课，2课时已进入工资核算。</p></section>` : ''
  )}${active ? '<div class="teacher-lesson-bottom-action"><button type="button" class="mp-button" data-lesson-action="end">结束上课</button></div>' : ''}</div>`);
}
function renderStaticClassLesson(classItem, lessonMeta) {
  const status = lessonMeta.status === 'current' ? teacherState.lesson.status : lessonMeta.status;
  const completed = status === '已完成';
  const record = teacherClassRecords.find(item => item.number === String(lessonMeta.number));
  tLayout(tStack(
    `<section class="teacher-lesson-hero"><div class="teacher-lesson-hero-head"><div><span>${tEsc(classItem.course)}</span><h2>${tEsc(classItem.name)} · 第${tEsc(lessonMeta.number)}次课</h2></div>${tPill(status, lessonTone(status))}</div><dl><div><dt>上课时间</dt><dd>${lessonMeta.date.includes('-') ? `2026-${tEsc(lessonMeta.date)}` : tEsc(lessonMeta.date)} ${tEsc(lessonMeta.time)}</dd></div><div><dt>上课地点</dt><dd>${tEsc(classItem.campus)} · ${classItem.id === 'class-002' ? '舞蹈楼201' : classItem.id === 'class-003' ? '美术楼103' : '综合楼302'}</dd></div></dl></section>`,
    `<section class="teacher-lesson-clock"><div class="teacher-lesson-clock-main"><span>教师考勤</span><strong>${completed ? '本课次已完成' : '尚未开始'}</strong><small>本课次计薪 2 课时</small></div><dl><div><dt>到达时间</dt><dd>${completed ? '09:00' : '--:--'}</dd></div><div><dt>离开时间</dt><dd>${completed ? '10:30' : '--:--'}</dd></div></dl></section>`,
    completed ? `<section class="teacher-lesson-section"><div class="teacher-lesson-section-head"><div><span>01</span><h2>教学记录</h2></div>${tPill('已完成', 'green')}</div><div class="teacher-static-lesson-record"><div><span>课次主题</span><strong>${tEsc(lessonMeta.theme)}</strong></div><p>${tEsc(record?.goal || '本课次教学内容与课堂完成情况已记录。')}</p><footer><span>${tEsc(record?.attendance || `${Math.max(0, classItem.students - 2)}/${classItem.students}人出勤`)}</span><i></i><span>${tEsc(record?.homework || '教学记录已保存')}</span></footer></div></section>` : `<section class="teacher-lesson-locked"><strong>课次尚未开始</strong><p>到达上课日期后，可从课表进入并开始上课。</p><ol><li>${tEsc(lessonMeta.theme)}</li><li>${tEsc(classItem.campus)}</li></ol></section>`
  ));
}
function renderLesson() {
  const params = new URLSearchParams(location.search);
  const lessonNumber = params.get('lesson') || '8';
  const classItem = teacherClasses.find(item => item.id === (params.get('class') || 'class-001')) || teacherClasses[0];
  if (classItem.id === 'class-001' && lessonNumber === '8') { renderLessonExecution(); return; }
  const lessonMeta = classItem.id === 'class-001' ? teacherClassLessons.find(item => item.number === lessonNumber) : null;
  const fallback = { number: lessonNumber, date: `第${lessonNumber}周`, time: '具体时间见排课', theme: classItem.course, status: Number(lessonNumber) <= classItem.completed ? '已完成' : '待上课' };
  renderStaticClassLesson(classItem, lessonMeta || fallback);
}
const teacherClasses = [
  { id: 'class-001', name: '少儿舞蹈基础班', course: '少儿中国舞基础', students: 20, completed: 7, total: 16, attendance: 92, homework: 88, status: '进行中', next: '今天 09:00 · 综合楼302', campus: '龙泉校区' },
  { id: 'class-002', name: '成人中国舞提高班', course: '中国舞身韵训练', students: 16, completed: 3, total: 12, attendance: 95, homework: 91, status: '进行中', next: '今天 14:00 · 舞蹈楼201', campus: '龙泉校区' },
  { id: 'class-003', name: '少儿美术启蒙班', course: '儿童绘画基础', students: 15, completed: 0, total: 10, attendance: 0, homework: 0, status: '待开课', next: '09月18日 09:00 · 美术楼103', campus: '南湖校区' },
  { id: 'class-004', name: '舞蹈基本功强化班', course: '舞蹈基本功', students: 18, completed: 16, total: 16, attendance: 90, homework: 86, status: '已结束', next: '教学记录已归档', campus: '南湖校区' }
];
const teacherClassStudents = [
  ['林知夏', 95, 90, '正常'], ['周予安', 88, 100, '正常'], ['陈一诺', 82, 75, '需关注'], ['赵明月', 100, 100, '正常'],
  ['许星辰', 92, 85, '正常'], ['刘思源', 86, 80, '正常'], ['孙艺涵', 78, 70, '需关注'], ['黄可欣', 96, 95, '正常'],
  ['郑雨桐', 90, 85, '正常'], ['吴清越', 84, 80, '正常'], ['何安然', 94, 90, '正常'], ['高语彤', 89, 85, '正常'],
  ['罗子墨', 97, 100, '正常'], ['彭佳宁', 91, 90, '正常'], ['蒋依然', 87, 80, '正常'], ['宋嘉禾', 93, 95, '正常'],
  ['唐若溪', 80, 70, '需关注'], ['邓舒雅', 98, 100, '正常'], ['谢景行', 85, 80, '正常'], ['曹心悦', 92, 90, '正常']
].map(([name, attendance, homework, status], index) => ({ id: `student-${String(index + 1).padStart(3, '0')}`, name, attendance, homework, status }));
const teacherClassLessons = [
  ['16', '11-05', '09:00-10:30', '期末展示与课程总结', '待上课'], ['15', '11-01', '09:00-10:30', '完整组合排练', '待上课'],
  ['14', '10-29', '09:00-10:30', '舞台表现训练', '待上课'], ['13', '10-25', '09:00-10:30', '组合细节调整', '待上课'],
  ['12', '10-18', '09:00-10:30', '身韵组合后半段', '待上课'], ['11', '10-11', '09:00-10:30', '身韵组合前半段', '待上课'],
  ['10', '09-27', '09:00-10:30', '重心与呼吸配合', '待上课'], ['9', '09-13', '09:00-10:30', '身韵连接训练', '待上课'],
  ['8', '09-10', '09:00-10:30', '把杆与身韵组合', 'current'], ['7', '09-07', '09:00-10:30', '组合训练', '已完成'],
  ['6', '09-03', '09:00-10:30', '身韵练习', '已完成'], ['5', '08-30', '09:00-10:30', '基本手位与脚位', '已完成'],
  ['4', '08-27', '09:00-10:30', '柔韧与控制训练', '已完成'], ['3', '08-23', '09:00-10:30', '把杆基础训练', '已完成'],
  ['2', '08-20', '09:00-10:30', '体态与站姿训练', '已完成'], ['1', '08-16', '09:00-10:30', '课程导入与基础测评', '已完成']
].map(([number, date, time, theme, status]) => ({ number, date, time, theme, status }));
const teacherClassRecords = [
  ['7', '2026-09-07', '组合训练', '完成组合前半段动作串联，重点练习节奏与方位。', '18/20人出勤', '作业已发布'],
  ['6', '2026-09-03', '身韵练习', '掌握提沉冲靠基础方法，练习呼吸与动作配合。', '19/20人出勤', '作业已点评'],
  ['5', '2026-08-30', '基本手位与脚位', '复习七个基本手位，完成脚位转换训练。', '20/20人出勤', '未发布作业'],
  ['4', '2026-08-27', '柔韧与控制训练', '完成压腿、踢腿和核心控制练习。', '18/20人出勤', '作业已点评'],
  ['3', '2026-08-23', '把杆基础训练', '完成擦地、蹲和小踢腿基础组合。', '20/20人出勤', '作业已发布'],
  ['2', '2026-08-20', '体态与站姿训练', '建立正确站姿，练习肩背与核心控制。', '19/20人出勤', '未发布作业'],
  ['1', '2026-08-16', '课程导入与基础测评', '完成学员基础能力观察并讲解课堂规范。', '20/20人出勤', '未发布作业']
].map(([number, date, theme, goal, attendance, homework]) => ({ number, date, theme, goal, attendance, homework }));
let selectedClassStatus = '全部';
let selectedClassDetailTab = 'overview';
function classStatusTone(status) { return status === '进行中' ? 'green' : status === '待开课' ? 'amber' : 'gray'; }
function renderClassCard(item) {
  const progress = Math.round((item.completed / item.total) * 100);
  return `<a class="teacher-class-card" href="${relativePath(`/teacher/pages/class-overview.html?class=${item.id}`)}"><div class="teacher-class-card-head"><div><span class="teacher-class-kicker">${tEsc(item.campus)}</span><h3>${tEsc(item.name)}</h3><p>${tEsc(item.course)}</p></div>${tPill(item.status, classStatusTone(item.status))}</div><div class="teacher-class-card-stats"><div><strong>${tEsc(item.students)}</strong><span>学员人数</span></div><div class="teacher-class-progress"><div class="teacher-class-progress-head"><span>课次进度</span><strong>${tEsc(item.completed)}/${tEsc(item.total)} 次</strong></div><div class="teacher-class-progress-track"><i style="width:${progress}%"></i></div></div></div><div class="teacher-class-card-foot"><span>${item.status === '已结束' ? '状态' : '下一节课'}</span><strong>${tEsc(item.next)}</strong><span class="teacher-class-arrow" aria-hidden="true">›</span></div></a>`;
}
function renderClasses() {
  const visibleClasses = selectedClassStatus === '全部' ? teacherClasses : teacherClasses.filter(item => item.status === selectedClassStatus);
  const filterTabs = ['全部', '进行中', '待开课', '已结束'];
  const list = visibleClasses.length ? visibleClasses.map(renderClassCard).join('') : `<section class="teacher-schedule-empty"><strong>暂无${tEsc(selectedClassStatus)}班级</strong><p>切换其他状态查看我的班级。</p></section>`;
  tLayout(tStack(`<section class="teacher-class-header"><div><span class="mp-eyebrow">教学管理</span><h2>我的班级</h2><p>查看任课班级的学员、课次和教学进度。</p></div><strong>${teacherClasses.length}<small>个班级</small></strong></section>`, `<nav class="teacher-class-filters" aria-label="班级状态筛选" role="tablist">${filterTabs.map(status => `<button type="button" role="tab" aria-selected="${status === selectedClassStatus}" class="${status === selectedClassStatus ? 'active' : ''}" data-class-filter="${status}">${status}<span>${status === '全部' ? teacherClasses.length : teacherClasses.filter(item => item.status === status).length}</span></button>`).join('')}</nav>`, `<section class="teacher-class-list" aria-live="polite"><div class="teacher-class-list-head"><h3>${selectedClassStatus === '全部' ? '全部班级' : selectedClassStatus}</h3><span>${visibleClasses.length} 个</span></div>${list}</section>`));
}
function currentTeacherClass() {
  const id = new URLSearchParams(location.search).get('class');
  return teacherClasses.find(item => item.id === id) || teacherClasses[0];
}
function teacherClassProgress(classItem) {
  return `<section class="teacher-class-detail-progress"><div><span>课次进度</span><strong>${classItem.completed}/${classItem.total} 次</strong></div><div class="teacher-class-progress-ruler" style="grid-template-columns:repeat(${classItem.total},minmax(0,1fr))" aria-label="已完成${classItem.completed}次，共${classItem.total}次">${Array.from({ length: classItem.total }, (_, index) => `<i class="${index < classItem.completed ? 'done' : index === classItem.completed ? 'current' : ''}"></i>`).join('')}</div></section>`;
}
function teacherClassOverview(classItem) {
  const currentStatus = teacherState.lesson.status;
  return `<div class="teacher-class-overview"><dl class="teacher-class-core-metrics"><div><dt>学员人数</dt><dd>${classItem.students}<small>人</small></dd></div><div><dt>平均出勤率</dt><dd>${classItem.attendance}<small>%</small></dd></div><div><dt>作业提交率</dt><dd>${classItem.homework}<small>%</small></dd></div></dl>${teacherClassProgress(classItem)}<section class="teacher-class-next-lesson"><div class="teacher-class-detail-section-head"><h3>${classItem.status === '已结束' ? '班级状态' : '下一节课'}</h3>${tPill(classItem.status === '已结束' ? '已结束' : currentStatus, classItem.status === '已结束' ? 'gray' : lessonTone(currentStatus))}</div>${classItem.status === '已结束' ? '<p class="teacher-class-no-next">全部课次已完成，教学记录已归档。</p>' : `<a href="${relativePath(`/teacher/pages/class-detail.html?class=${classItem.id}&lesson=${classItem.completed + 1}`)}"><div class="teacher-class-next-time"><strong>09:00</strong><span>09月10日 周四</span></div><div><strong>第${classItem.completed + 1}次课 · ${classItem.id === 'class-001' ? '把杆与身韵组合' : classItem.course}</strong><p>${tEsc(classItem.campus)} · ${classItem.id === 'class-002' ? '舞蹈楼201' : classItem.id === 'class-003' ? '美术楼103' : '综合楼302'}</p></div><span aria-hidden="true">›</span></a>`}</section>${classItem.completed ? `<section class="teacher-class-recent-record"><div class="teacher-class-detail-section-head"><h3>最近教学记录</h3><span>第${classItem.completed}次课</span></div><strong>${classItem.id === 'class-001' ? '组合训练' : classItem.course}</strong><p>${classItem.id === 'class-001' ? '完成组合前半段动作串联，重点练习节奏与方位。' : '本课次教学目标已完成，考勤与教学记录已同步。'}</p><small>${classItem.students - 2}/${classItem.students}人出勤 · 教学记录已保存</small></section>` : ''}</div>`;
}
function teacherClassStudentRows(query = '') {
  const students = teacherClassStudents.slice(0, currentTeacherClass().students).filter(item => item.name.includes(query.trim()));
  return students.length ? students.map(item => `<button type="button" class="teacher-class-student-row" data-class-student="${item.id}"><span class="teacher-lesson-student-avatar" aria-hidden="true">${tEsc(item.name.slice(0, 1))}</span><span class="teacher-class-student-name"><strong>${tEsc(item.name)}</strong><small>${item.status === '需关注' ? '近期出勤或作业未达标' : '学习状态正常'}</small></span><span class="teacher-class-student-rate"><b>${item.attendance}%</b><small>出勤</small></span><span class="teacher-class-student-rate"><b>${item.homework}%</b><small>作业</small></span><span class="teacher-class-student-arrow" aria-hidden="true">›</span></button>`).join('') : '<div class="teacher-class-detail-empty">未找到该学员</div>';
}
function teacherClassStudentsPanel() {
  const count = Math.min(currentTeacherClass().students, teacherClassStudents.length);
  return `<section class="teacher-class-students-panel"><div class="teacher-class-student-search"><span aria-hidden="true"></span><input type="search" data-class-student-search placeholder="搜索学员姓名" aria-label="搜索学员姓名"></div><div class="teacher-class-detail-section-head"><h3>班级学员</h3><span data-class-student-count>${count} 人</span></div><div class="teacher-class-student-list" data-class-student-list>${teacherClassStudentRows()}</div></section>`;
}
function teacherClassSchedulePanel(classItem) {
  const currentStatus = teacherState.lesson.status;
  const lessons = classItem.id === 'class-001' ? teacherClassLessons : Array.from({ length: classItem.total }, (_, index) => { const number = classItem.total - index; return { number, date: `第${number}周`, time: '具体时间见排课', theme: classItem.course, status: number <= classItem.completed ? '已完成' : '待上课' }; });
  return `<section class="teacher-class-schedule-panel"><div class="teacher-class-detail-section-head"><h3>全部课次</h3><span>${lessons.length} 次课</span></div><div class="teacher-class-schedule-list">${lessons.map(item => { const status = item.status === 'current' ? currentStatus : item.status; return `<a href="${relativePath(`/teacher/pages/class-detail.html?class=${classItem.id}&lesson=${item.number}`)}" class="teacher-class-schedule-row"><div class="teacher-class-schedule-number"><strong>${item.number}</strong><span>课次</span></div><div><strong>${tEsc(item.theme)}</strong><p>${tEsc(item.date)} · ${tEsc(item.time)}</p></div>${tPill(status, lessonTone(status))}<span class="teacher-class-student-arrow" aria-hidden="true">›</span></a>`; }).join('')}</div></section>`;
}
function teacherClassRecordsPanel(classItem) {
  const records = classItem.id === 'class-001' ? teacherClassRecords : Array.from({ length: classItem.completed }, (_, index) => { const number = classItem.completed - index; return { number, date: `第${number}周`, theme: classItem.course, goal: '本课次教学目标已完成，课堂执行情况已同步。', attendance: `${Math.max(0, classItem.students - 2)}/${classItem.students}人出勤`, homework: number % 2 ? '作业已发布' : '未发布作业' }; });
  return `<section class="teacher-class-records-panel"><div class="teacher-class-detail-section-head"><h3>历史教学记录</h3><span>按时间倒序</span></div>${records.length ? `<div class="teacher-class-record-list">${records.map(item => `<article><header><div><span>第${item.number}次课</span><h3>${tEsc(item.theme)}</h3></div><time>${tEsc(item.date)}</time></header><div class="teacher-class-record-goal"><span>教学目标</span><p>${tEsc(item.goal)}</p></div><footer><span>${tEsc(item.attendance)}</span><i></i><span>${tEsc(item.homework)}</span></footer></article>`).join('')}</div>` : '<div class="teacher-class-detail-empty">班级尚未开始上课</div>'}</section>`;
}
function renderClassDetail() {
  const classItem = currentTeacherClass();
  const tabs = [['overview', '班级概况'], ['students', '学员名单'], ['schedule', '班级课表'], ['records', '教学记录']];
  const tabContent = { overview: teacherClassOverview(classItem), students: teacherClassStudentsPanel(), schedule: teacherClassSchedulePanel(classItem), records: teacherClassRecordsPanel(classItem) };
  tLayout(tStack(`<section class="teacher-class-detail-head"><div class="teacher-class-detail-title"><span>${tEsc(classItem.course)}</span><h2>${tEsc(classItem.name)}</h2></div>${tPill(classItem.status, classStatusTone(classItem.status))}<dl><div><dt>授课教师</dt><dd>王玥</dd></div><div><dt>所属校区</dt><dd>${tEsc(classItem.campus)}</dd></div><div><dt>学员人数</dt><dd>${classItem.students}人</dd></div><div><dt>课次进度</dt><dd>${classItem.completed}/${classItem.total}次</dd></div></dl></section>`, `<nav class="teacher-class-detail-tabs" aria-label="班级详情" role="tablist">${tabs.map(([key, label]) => `<button type="button" role="tab" aria-selected="${key === selectedClassDetailTab}" class="${key === selectedClassDetailTab ? 'active' : ''}" data-class-detail-tab="${key}">${label}</button>`).join('')}</nav>`, `<section class="teacher-class-detail-panel" role="tabpanel" aria-live="polite">${tabContent[selectedClassDetailTab]}</section>`));
}
function openTeacherClassStudent(student) {
  const attendanceRecords = [
    ['09-07', '第7次课', '已到'], ['09-03', '第6次课', '已到'], ['08-30', '第5次课', student.status === '需关注' ? '缺勤' : '已到'], ['08-27', '第4次课', student.attendance < 90 ? '请假' : '已到']
  ];
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-class-student-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><div class="teacher-class-student-dialog-head"><div class="teacher-class-student-profile"><span class="teacher-lesson-student-avatar" aria-hidden="true">${tEsc(student.name.slice(0, 1))}</span><div><small>学员学习档案</small><h2>${tEsc(student.name)}</h2></div></div><button type="button" data-class-student-close aria-label="关闭">×</button></div><dl class="teacher-class-student-summary"><div><dt>出勤率</dt><dd>${student.attendance}%</dd></div><div><dt>作业完成率</dt><dd>${student.homework}%</dd></div><div><dt>学习状态</dt><dd>${tEsc(student.status)}</dd></div></dl><section class="teacher-class-student-record-section"><div class="teacher-class-detail-section-head"><h3>近期出勤</h3><span>最近4次课</span></div><div class="teacher-class-student-attendance">${attendanceRecords.map(([date, lesson, status]) => `<div><span>${date}</span><strong>${lesson}</strong>${tPill(status, status === '已到' ? 'green' : status === '缺勤' ? 'gray' : 'amber')}</div>`).join('')}</div></section><section class="teacher-class-student-record-section"><div class="teacher-class-detail-section-head"><h3>作业明细</h3><span>最近2项</span></div><div class="teacher-class-student-homework"><article><div><strong>第7次课组合练习</strong>${tPill('已提交', 'green')}</div><p>2026-09-08提交 · 教师已点评</p></article><article><div><strong>第6次课身韵练习</strong>${tPill(student.homework < 80 ? '未提交' : '已提交', student.homework < 80 ? 'gray' : 'green')}</div><p>${student.homework < 80 ? '已超过截止时间' : '2026-09-05提交 · 教师已点评'}</p></article></div></section><section class="teacher-class-student-record-section"><div class="teacher-class-detail-section-head"><h3>历史点评</h3><span>教师评语</span></div><div class="teacher-class-student-comment"><time>2026-09-08</time><p>${student.status === '需关注' ? '基础动作完成度尚可，近期缺课影响了组合衔接，建议及时补练并完成课后作业。' : '课堂专注，动作规范性持续提升，继续加强重心转换和动作之间的呼吸配合。'}</p></div></section><button type="button" class="mp-button full secondary" data-class-student-close>关闭</button></div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-class-student-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.showModal();
}
function bindTeacherClassStudentRows() {
  document.querySelectorAll('[data-class-student]').forEach(button => button.addEventListener('click', () => {
    const student = teacherClassStudents.find(item => item.id === button.dataset.classStudent);
    if (student) openTeacherClassStudent(student);
  }));
}
function bindClassDetailEvents() {
  bindTeacherClassStudentRows();
  document.querySelector('[data-class-student-search]')?.addEventListener('input', event => {
    const query = event.target.value;
    const visible = teacherClassStudents.slice(0, currentTeacherClass().students).filter(item => item.name.includes(query.trim()));
    const list = document.querySelector('[data-class-student-list]');
    const count = document.querySelector('[data-class-student-count]');
    if (list) list.innerHTML = teacherClassStudentRows(query);
    if (count) count.textContent = `${visible.length} 人`;
    bindTeacherClassStudentRows();
  });
}
const teacherApplications = [
  { id: 'application-001', name: '舞蹈基本功', professional: '舞蹈表演', type: '面授课程', date: '2026-09-08', status: '审核中', hours: 16, intro: '围绕基本功、身韵和组合训练建立系统化面授课程。', file: '舞蹈基本功教学计划.pdf' },
  { id: 'application-002', name: '声乐演唱技巧', professional: '音乐表演', type: '视频课程', date: '2026-09-02', status: '已通过', intro: '通过气息、共鸣与作品训练，提升学员稳定演唱和舞台表达能力。', file: '声乐演唱技巧课程大纲.pdf', reviewedAt: '2026-09-05 15:30' },
  { id: 'application-003', name: '少儿舞蹈启蒙', professional: '舞蹈表演', type: '面授课程', date: '2026-08-25', status: '已驳回', hours: 12, intro: '面向少儿开展舞蹈基本动作、节奏和身体协调训练。', file: '少儿舞蹈启蒙教学计划.pdf', reason: '课程简介需补充教学目标和适龄说明', reviewedAt: '2026-08-28 10:20' },
  { id: 'application-004', name: '音乐欣赏入门', professional: '音乐学', type: '视频课程', date: '2026-08-18', status: '草稿', intro: '从作品背景、音乐结构和听辨方法入门，建立基础音乐欣赏能力。', file: '' }
];
function applicationTone(status) { return status === '已通过' ? 'green' : status === '审核中' ? 'amber' : 'gray'; }
function teacherApplicationRecords() {
  const shared = readDemoState().applications || [];
  const merged = teacherApplications.map(item => ({ ...item, ...(shared.find(record => record.id === item.id) || {}) }));
  return [...merged, ...shared.filter(record => !teacherApplications.some(item => item.id === record.id))].map(applicationWithStatus);
}
function applicationWithStatus(item) { const shared = readDemoState().applications.some(record => record.id === item.id); return { ...item, status: shared ? item.status : teacherState.applicationUpdates[item.id] || item.status }; }
function currentApplication() {
  const id = new URLSearchParams(location.search).get('application');
  return teacherApplicationRecords().find(item => item.id === id) || teacherApplicationRecords()[0];
}
function renderApplications() {
  const applications = teacherApplicationRecords();
  tLayout(tStack(`<section class="teacher-application-header"><div><span class="mp-eyebrow">教学内容</span><h2>课程申报</h2><p>发起新课程，查看教研审核进度和结果。</p></div>${tButton('发起申报', 'data-teacher-action="new-application"')}</section>`, `<section class="teacher-application-summary"><div><strong>${applications.length}</strong><span>全部申报</span></div><div><strong>${applications.filter(item => item.status === '审核中').length}</strong><span>审核中</span></div><div><strong>${applications.filter(item => item.status === '已通过').length}</strong><span>已通过</span></div></section>`, `<section class="teacher-application-list"><div class="teacher-application-list-head"><h3>我的申报</h3><span>共 ${applications.length} 条</span></div>${applications.map(item => `<a class="teacher-application-card" href="${relativePath(`/teacher/pages/application-detail.html?application=${item.id}`)}"><div class="teacher-application-card-head"><div><span>${tEsc(item.date)} 提交</span><h3>${tEsc(item.name)}</h3></div>${tPill(item.status, applicationTone(item.status))}</div><p>${tEsc(item.type)} · ${tEsc(item.professional)}${item.hours ? ` · ${item.hours}课时` : ''}</p>${item.reason && item.status === '已驳回' ? `<div class="teacher-application-reason">驳回原因：${tEsc(item.reason)}</div>` : ''}<div class="teacher-application-card-foot"><span class="teacher-application-action">查看详情</span><span aria-hidden="true">›</span></div></a>`).join('')}</section>`));
}
function renderApplicationCreate() {
  const requestedId = new URLSearchParams(location.search).get('application');
  const source = requestedId ? currentApplication() : { id: '', name: '', professional: '舞蹈表演', type: '面授课程', hours: 16, intro: '', file: '' };
  const editing = Boolean(requestedId);
  tLayout(tStack(`<section class="teacher-application-detail-head"><div>${tPill(editing ? '编辑中' : '新申报')}<h2>${editing ? '编辑课程申报' : '发起课程申报'}</h2><p>教师资料由系统自动带入，课程信息请完整填写。</p></div></section>`, `<section class="teacher-application-form"><div class="teacher-form-section"><div class="teacher-form-section-head"><h3>教师信息</h3><span>系统带入</span></div><div class="teacher-readonly-grid"><div><span>教师姓名</span><strong>王玥</strong></div><div><span>教学单位</span><strong>湖北艺术职业学院</strong></div><div><span>专业方向</span><strong>舞蹈表演</strong></div><div><span>职称</span><strong>副教授</strong></div></div></div><div class="teacher-form-section"><div class="teacher-form-section-head"><h3>申报内容</h3><span>带 * 为必填</span></div><div class="mp-form"><div class="mp-field"><label for="application-name">课程名称 <b>*</b></label><input id="application-name" value="${tEsc(source.name)}" maxlength="100" placeholder="请输入课程名称"></div><div class="mp-field"><label>所属专业 <b>*</b><small>按门类、分类、专业逐级选择</small></label><div class="teacher-professional-cascade"><select id="application-discipline" aria-label="专业门类"><option>艺术学</option><option>教育学</option></select><select id="application-category" aria-label="专业分类"><option>舞蹈类</option><option>音乐类</option></select><select id="application-professional" aria-label="专业"><option ${source.professional === '舞蹈表演' ? 'selected' : ''}>舞蹈表演</option><option ${source.professional === '音乐表演' ? 'selected' : ''}>音乐表演</option><option ${source.professional === '音乐学' ? 'selected' : ''}>音乐学</option></select></div></div><div class="mp-field"><label>课程类型 <b>*</b></label><div class="teacher-radio-row"><label><input type="radio" name="application-type" value="面授课程" ${source.type === '面授课程' ? 'checked' : ''}>面授课程</label><label><input type="radio" name="application-type" value="视频课程" ${source.type === '视频课程' ? 'checked' : ''}>视频课程</label></div></div><div class="mp-field" id="application-hours-field"><label for="application-hours">总课时 <b>*</b><small>面授课程用于生成课次和工资统计</small></label><input id="application-hours" type="number" min="1" value="${tEsc(source.hours || 16)}" placeholder="请输入总课时"></div><div class="mp-field"><label for="application-intro">课程简介</label><textarea id="application-intro" placeholder="补充课程目标、教学内容和适合人群">${tEsc(source.intro)}</textarea></div><div class="mp-field"><label for="application-file">附加材料</label><button type="button" class="teacher-upload-placeholder" id="application-file">＋ ${source.file ? tEsc(source.file) : '上传教学计划'} <span>可选</span></button></div></div></div><div class="teacher-application-form-actions"><a class="mp-button secondary" href="${relativePath('/teacher/pages/applications.html')}">取消</a>${tButton('保存草稿', 'data-application-form-action="save"', 'secondary')}${tButton('提交审核', 'data-application-form-action="submit"')}</div></section>`));
}
function applicationReviewCopy(item) {
  if (item.status === '审核中') return ['等待教研审核', '申报已提交，审核期间课程内容不可修改。'];
  if (item.status === '已通过') return ['审核通过', `教研已于${item.reviewedAt || '近期'}完成审核，课程可进入后续发布流程。`];
  if (item.status === '已驳回') return ['审核未通过', item.reason || '请根据审核意见修改后重新提交。'];
  if (item.status === '已撤销') return ['申报已撤销', '该申报已停止审核，可重新编辑后提交。'];
  return ['尚未提交', '当前内容保存在草稿中，可继续编辑并提交审核。'];
}
function applicationDetailActions(item) {
  const back = `<a class="mp-button secondary" href="${relativePath('/teacher/pages/applications.html')}">返回列表</a>`;
  if (['草稿', '已驳回', '已撤销'].includes(item.status)) return `${back}<button type="button" class="mp-button" data-application-detail-action="edit">${item.status === '已驳回' ? '修改并重新提交' : '编辑申报'}</button>`;
  if (item.status === '审核中') return `${back}<button type="button" class="mp-button secondary teacher-application-withdraw" data-application-detail-action="withdraw">撤销申报</button>`;
  return `<a class="mp-button secondary full" href="${relativePath('/teacher/pages/applications.html')}">返回申报列表</a>`;
}
function renderApplicationDetail() {
  const item = currentApplication();
  const [reviewTitle, reviewText] = applicationReviewCopy(item);
  tLayout(tStack(`<section class="teacher-application-view-head"><div><span>${tEsc(item.date)} 提交</span><h2>${tEsc(item.name)}</h2><p>申报编号 ${tEsc(item.id.toUpperCase())}</p></div>${tPill(item.status, applicationTone(item.status))}</section>`, `<section class="teacher-form-section"><div class="teacher-form-section-head"><h3>教师信息</h3><span>只读</span></div><div class="teacher-readonly-grid"><div><span>教师姓名</span><strong>王玥</strong></div><div><span>教学单位</span><strong>湖北艺术职业学院</strong></div><div><span>专业方向</span><strong>舞蹈表演</strong></div><div><span>职称</span><strong>副教授</strong></div></div></section>`, `<section class="teacher-form-section teacher-application-view-content"><div class="teacher-form-section-head"><h3>申报内容</h3><span>只读</span></div><dl class="teacher-application-view-rows"><div><dt>课程名称</dt><dd>${tEsc(item.name)}</dd></div><div><dt>所属专业</dt><dd>艺术学 · ${tEsc(item.professional)}</dd></div><div><dt>课程类型</dt><dd>${tEsc(item.type)}</dd></div>${item.type === '面授课程' ? `<div><dt>总课时</dt><dd>${tEsc(item.hours)}课时</dd></div>` : ''}<div class="wide"><dt>课程简介</dt><dd>${tEsc(item.intro)}</dd></div><div class="wide"><dt>附加材料</dt><dd>${item.file ? tEsc(item.file) : '未上传'}</dd></div></dl></section>`, `<section class="teacher-application-review ${item.status === '已驳回' ? 'rejected' : ''}"><div>${tPill(item.status, applicationTone(item.status))}<h3>${reviewTitle}</h3></div><p>${tEsc(reviewText)}</p>${item.reviewedBy ? `<small>审核人：${tEsc(item.reviewedBy)} · 审核时间：${tEsc(item.reviewedAt || '待记录')}</small>` : ''}</section>`, `<div class="teacher-application-detail-actions">${applicationDetailActions(item)}</div>`));
}
function validateApplication() {
  const name = document.querySelector('#application-name')?.value.trim();
  const type = document.querySelector('[name="application-type"]:checked')?.value;
  const hours = Number(document.querySelector('#application-hours')?.value);
  if (!name) { tToast('请输入课程名称'); return false; }
  if (!document.querySelector('#application-professional')?.value) { tToast('请选择所属专业'); return false; }
  if (type === '面授课程' && hours < 1) { tToast('面授课程请输入有效总课时'); return false; }
  return true;
}
function initApplicationForm() {
  const radios = document.querySelectorAll('[name="application-type"]');
  const syncHours = () => {
    const isClass = document.querySelector('[name="application-type"]:checked')?.value === '面授课程';
    const field = document.querySelector('#application-hours-field');
    const input = document.querySelector('#application-hours');
    if (field) field.hidden = !isClass;
    if (input) input.disabled = !isClass;
  };
  radios.forEach(radio => radio.addEventListener('change', syncHours));
  const saveApplication = status => {
    if (status === '审核中' && !validateApplication()) return;
    const id = new URLSearchParams(location.search).get('application');
    const existing = id ? currentApplication() : null;
    const recordId = id || `CR-${new Date().getFullYear()}-${demoId('APP').split('-').pop().toUpperCase()}`;
    const professional = document.querySelector('#application-professional')?.value || existing?.professional || '舞蹈表演';
    const type = document.querySelector('[name="application-type"]:checked')?.value || existing?.type || '面授课程';
    const record = {
      ...(existing || {}),
      id: recordId,
      name: document.querySelector('#application-name')?.value.trim() || existing?.name || '',
      professional,
      major: professional,
      type,
      date: existing?.date || new Date().toISOString().slice(0, 10),
      submittedAt: existing?.submittedAt || demoTime(),
      status,
      hours: type === '面授课程' ? Number(document.querySelector('#application-hours')?.value || existing?.hours || 1) : Number(existing?.hours || 0),
      intro: document.querySelector('#application-intro')?.value.trim() || '',
      file: existing?.file || '',
      attachment: existing?.attachment || existing?.file || '',
      teacher: '王玥',
      teacherInfo: '王玥 · 本科 · 舞蹈表演 · 湖北艺术职业学院 · 8年教龄',
      courseId: existing?.courseId || `COURSE-${recordId}`,
      accountId: getCurrentAccountId()
    };
    upsertDemoRecord('applications', record);
    teacherState.applicationUpdates[record.id] = status;
    teacherState.application = status;
    saveTeacher();
    location.href = relativePath(status === '审核中' ? `/teacher/pages/application-detail.html?application=${encodeURIComponent(record.id)}` : '/teacher/pages/applications.html');
  };
  document.querySelector('[data-application-form-action="save"]')?.addEventListener('click', () => saveApplication('草稿'));
  document.querySelector('[data-application-form-action="submit"]')?.addEventListener('click', () => saveApplication('审核中'));
  syncHours();
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
  { key: '2026-07', month: '2026年7月', publishedAt: '2026-08-01', paymentStatus: '已发放', paidAt: '2026-08-05', hours: 32, payableTaxIncluded: 5760, paidTaxIncluded: 5520, tax: 36.80, net: 5483.20, attendance: { expected: 18, actual: 16, late: 1, early: 1, absent: 1, leave: 1 }, deductions: { late: 30, early: 30, absent: 180, total: 240 }, account: '中国建设银行 尾号 2866', items: [{ course: '少儿中国舞基础', className: '少儿舞蹈基础班', hours: 20, rate: 180, subtotal: 3600 }, { course: '中国舞身韵训练', className: '成人中国舞提高班', hours: 12, rate: 165, subtotal: 1980 }] },
  { key: '2026-06', month: '2026年6月', publishedAt: '2026-07-01', paymentStatus: '待发放', paidAt: '', hours: 28, payableTaxIncluded: 5040, paidTaxIncluded: 5040, tax: 15.60, net: 5024.40, attendance: { expected: 15, actual: 14, late: 0, early: 0, absent: 0, leave: 1 }, deductions: { late: 0, early: 0, absent: 0, total: 0 }, account: '中国建设银行 尾号 2866', items: [{ course: '少儿中国舞基础', className: '少儿舞蹈基础班', hours: 18, rate: 180, subtotal: 3240 }, { course: '舞蹈基本功', className: '舞蹈基本功强化班', hours: 10, rate: 180, subtotal: 1800 }] },
  { key: '2026-05', month: '2026年5月', publishedAt: '2026-06-01', paymentStatus: '发放中', paidAt: '', hours: 26, payableTaxIncluded: 4680, paidTaxIncluded: 4650, tax: 3, net: 4647, attendance: { expected: 14, actual: 13, late: 1, early: 0, absent: 0, leave: 1 }, deductions: { late: 30, early: 0, absent: 0, total: 30 }, account: '中国建设银行 尾号 2866', items: [{ course: '少儿中国舞基础', className: '少儿舞蹈基础班', hours: 16, rate: 180, subtotal: 2880 }, { course: '中国舞身韵训练', className: '成人中国舞提高班', hours: 10, rate: 180, subtotal: 1800 }] }
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
  const latest = salaryRecords[0];
  const paidRecords = salaryRecords.filter(item => item.paymentStatus === '已发放');
  const total = paidRecords.reduce((sum, item) => sum + item.net, 0);
  const totalHours = salaryRecords.reduce((sum, item) => sum + item.hours, 0);
  tLayout(tStack(`<section class="teacher-salary-summary"><div class="teacher-salary-summary-head"><div><span>累计已发放</span><strong>${money(total)}</strong></div>${tPill(`${paidRecords.length}期已到账`, 'green')}</div><div class="teacher-salary-summary-meta"><div><span>最近工资月份</span><strong>${latest.month}</strong></div><div><span>最近已发放</span><strong>${money(paidRecords[0]?.net || 0)}</strong></div><div><span>已发布课时</span><strong>${totalHours}课时</strong></div></div></section>`, `<section class="teacher-salary-list"><div class="teacher-salary-list-head"><div><h2>工资记录</h2><p>按发布时间从近到远排列</p></div><span>${salaryRecords.length} 个月</span></div>${salaryRecords.map(record => `<a class="teacher-salary-card" href="${relativePath(`/teacher/pages/salary-detail.html?month=${record.key}`)}"><div class="teacher-salary-card-head"><div><span>工资月份</span><h3>${record.month}</h3></div>${tPill(record.paymentStatus, salaryPaymentTone(record.paymentStatus))}</div><div class="teacher-salary-card-money"><div><span>应付工资含税</span><strong>${money(record.payableTaxIncluded)}</strong></div><div><span>实际核发</span><strong>${money(record.net)}</strong></div></div><div class="teacher-salary-card-foot"><span>${record.hours}课时 · ${salaryPaymentCopy(record)}</span><span>查看明细 ›</span></div></a>`).join('')}</section>`, `<p class="teacher-salary-note">工资单发布后即可查看明细；资金到账以“已发放”状态为准。</p>`));
}
function renderSalaryDetail() {
  const key = new URLSearchParams(location.search).get('month');
  const record = salaryRecords.find(item => item.key === key) || salaryRecords[0];
  const lessonDetails = salaryLessonDetails(record);
  tLayout(tStack(`<section class="teacher-salary-detail-summary"><div class="teacher-salary-detail-status"><span>${record.month}工资</span>${tPill(record.paymentStatus, salaryPaymentTone(record.paymentStatus))}</div><span>实际核发</span><strong>${money(record.net)}</strong><p class="salary-payment-${record.paymentStatus === '已发放' ? 'success' : 'pending'}">${salaryPaymentCopy(record)}</p><div class="teacher-salary-equation"><div><span>实发工资含税</span><strong>${money(record.paidTaxIncluded)}</strong></div><i>−</i><div><span>个人所得税</span><strong>${money(record.tax)}</strong></div><i>=</i><div><span>实际核发</span><strong>${money(record.net)}</strong></div></div></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>出勤统计</h2><span>按课次统计</span></div><div class="teacher-salary-attendance-primary"><div><span>应出勤课次</span><strong>${record.attendance.expected}<small>课次</small></strong></div><div><span>实出勤课次</span><strong>${record.attendance.actual}<small>课次</small></strong></div></div><dl class="teacher-salary-attendance-status"><div><dt>迟到</dt><dd>${record.attendance.late}次</dd></div><div><dt>早退</dt><dd>${record.attendance.early}次</dd></div><div><dt>缺勤</dt><dd>${record.attendance.absent}次</dd></div><div><dt>请假</dt><dd>${record.attendance.leave}次</dd></div></dl><p class="teacher-salary-block-note">迟到、早退计入实出勤；缺勤、请假不计入实出勤。</p></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>扣款明细</h2><strong class="${record.deductions.total ? 'has-adjustment' : ''}">${deductionMoney(record.deductions.total)}</strong></div><dl class="teacher-salary-deduction-grid"><div><dt>迟到扣款</dt><dd>${deductionMoney(record.deductions.late)}</dd></div><div><dt>早退扣款</dt><dd>${deductionMoney(record.deductions.early)}</dd></div><div><dt>缺勤扣款</dt><dd>${deductionMoney(record.deductions.absent)}</dd></div><div class="total"><dt>累计扣款</dt><dd>${deductionMoney(record.deductions.total)}</dd></div></dl></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>工资核算</h2><span>单位：元</span></div><dl class="teacher-salary-settlement"><div><dt>应付工资含税</dt><dd>${money(record.payableTaxIncluded)}</dd></div><div><dt>实发工资含税</dt><dd>${money(record.paidTaxIncluded)}</dd></div><div><dt>个税</dt><dd>${deductionMoney(record.tax)}</dd></div><div class="total"><dt>实际核发</dt><dd>${money(record.net)}</dd></div></dl></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>课次明细</h2><span>${lessonDetails.length}课次</span></div><div class="teacher-salary-lessons">${lessonDetails.map(item => `<article><div class="teacher-salary-lesson-head"><div><span>${tEsc(item.lesson)}</span><h3>${tEsc(item.className)}</h3></div>${tPill(item.status, salaryAttendanceTone(item.status))}</div><p>${tEsc(item.course)}</p><dl><div class="wide"><dt>上课时间</dt><dd>${tEsc(item.scheduledAt)}</dd></div><div><dt>实际开始时间</dt><dd>${tEsc(item.actualStart)}</dd></div><div><dt>实际结束时间</dt><dd>${tEsc(item.actualEnd)}</dd></div></dl>${item.exception ? `<div class="teacher-salary-lesson-exception">${tEsc(item.exception)}</div>` : ['缺勤', '请假'].includes(item.status) ? '<div class="teacher-salary-lesson-missed">本课次未实际上课</div>' : ''}</article>`).join('')}</div></section>`, `<section class="teacher-salary-detail-block"><div class="teacher-salary-block-head"><h2>发放信息</h2></div><dl class="teacher-salary-payment"><div><dt>工资单状态</dt><dd>已发布</dd></div><div><dt>发放状态</dt><dd>${tEsc(record.paymentStatus)}</dd></div><div><dt>发放日期</dt><dd>${record.paidAt || '--'}</dd></div><div><dt>收款账户</dt><dd>${tEsc(record.account)}</dd></div><div><dt>发布时间</dt><dd>${record.publishedAt}</dd></div></dl></section>`));
}
function teacherProfileRow({ mark, title, description, href, value = '', tone = '' }) {
  return `<a class="teacher-profile-row" href="${relativePath(href)}"><span class="teacher-profile-row-mark" aria-hidden="true">${tEsc(mark)}</span><span class="teacher-profile-row-copy"><strong>${tEsc(title)}</strong><small>${tEsc(description)}</small></span>${value ? `<span class="teacher-profile-row-value ${tone}">${tEsc(value)}</span>` : ''}<span class="teacher-profile-row-arrow" aria-hidden="true">›</span></a>`;
}
function renderProfile() {
  const graduationPending = teacherState.graduationRecords.filter(item => ['审核中', '需补课', '补课中'].includes(item.status)).length;
  const unreadMessages = teacherState.messages.filter(item => !item.read).length;
  const archive = teacherProfileRow({ mark: '档', title: '个人档案', description: '联系方式、收款信息与个人简介', href: '/teacher/pages/profile-detail.html', value: '已完善', tone: 'green' });
  const affairs = [
    { mark: '信', title: '消息通知', description: '查看排课、审核与工资通知', href: '/teacher/pages/messages.html', value: unreadMessages ? `${unreadMessages}条未读` : '已读', tone: unreadMessages ? 'amber' : 'green' },
    { mark: '证', title: '我的证书', description: '资格证书与审核记录', href: '/teacher/pages/certificates.html', value: '1项待审核', tone: 'amber' },
    { mark: '合', title: '我的合同', description: '查看协议、有效期与签署状态', href: '/teacher/pages/contracts.html', value: `${teacherState.contracts.filter(item => item.status === '待签署').length}份待签署`, tone: 'amber' },
    { mark: '结', title: '结业申请记录', description: '查看复核结果与补课安排', href: '/teacher/pages/graduation.html', value: `${graduationPending}项处理中`, tone: graduationPending ? 'amber' : 'green' }
  ].map(teacherProfileRow).join('');
  const settings = teacherProfileRow({ mark: '设', title: '设置', description: '账号设置、协议与关于我们', href: '/teacher/pages/settings.html' });
  tLayout(tStack(`<section class="teacher-profile-identity-card"><div class="teacher-profile-identity-main"><span class="teacher-profile-avatar" aria-hidden="true">王</span><div><div class="teacher-profile-name-row"><h2>王玥</h2>${tPill('已激活', 'green')}</div><p>工号 JS20260901</p></div></div></section>`, `<section class="teacher-profile-group"><h3>个人资料</h3><div class="teacher-profile-row-list">${archive}</div></section>`, `<section class="teacher-profile-group"><h3>教师事务</h3><div class="teacher-profile-row-list">${affairs}</div></section>`, `<section class="teacher-profile-group teacher-profile-settings"><div class="teacher-profile-row-list">${settings}</div></section>`));
}
let teacherProfileEditing = false;
const teacherProfileIdentity = [
  ['姓名', '王玥'], ['工号', 'JS20260901'], ['身份证号', '420106********2428'], ['人员类型', '在编'],
  ['授课专业', '文化艺术 · 表演艺术 · 舞蹈表演'], ['从教年限', '8年'], ['职称', '副教授'],
  ['性别', '女'], ['出生年月', '1990年5月'], ['政治面貌', '中共党员'], ['民族', '汉族'], ['最高学历', '本科']
];
function teacherProfileSection(title, content, note = '') {
  return `<section class="teacher-archive-section"><div class="teacher-archive-section-head"><h2>${tEsc(title)}</h2>${note ? `<span>${tEsc(note)}</span>` : ''}</div>${content}</section>`;
}
function teacherArchiveRows(rows) {
  return `<dl class="teacher-archive-rows">${rows.map(([label, value, options = '']) => `<div class="${options}"><dt>${tEsc(label)}</dt><dd>${tEsc(value || '未填写')}</dd></div>`).join('')}</dl>`;
}
function renderTeacherProfileDetail() {
  const profile = teacherState.profile;
  const identity = teacherArchiveRows(teacherProfileIdentity.map((item, index) => [...item, index === 4 ? 'wide' : '']));
  if (teacherProfileEditing) {
    tLayout(tStack(
      `<section class="teacher-archive-summary"><div class="teacher-archive-person"><span class="teacher-settings-avatar" aria-hidden="true">王</span><div><strong>王玥</strong><span>JS20260901 · 舞蹈表演</span></div></div><span class="teacher-archive-mode">编辑中</span></section>`,
      teacherProfileSection('联系方式', `<div class="teacher-archive-form"><div class="mp-field"><label for="teacher-profile-mobile">手机号 <b>*</b></label><input id="teacher-profile-mobile" name="mobile" type="tel" inputmode="numeric" maxlength="11" value="${tEsc(profile.mobile)}" placeholder="请输入11位手机号"></div><div class="mp-field"><label for="teacher-profile-email">邮箱</label><input id="teacher-profile-email" name="email" type="email" value="${tEsc(profile.email)}" placeholder="请输入邮箱地址"></div><div class="teacher-archive-form-split"><div class="mp-field"><label for="teacher-profile-emergency-name">紧急联系人 <b>*</b></label><input id="teacher-profile-emergency-name" name="emergencyName" value="${tEsc(profile.emergencyName)}" placeholder="姓名"></div><div class="mp-field"><label for="teacher-profile-emergency-mobile">联系电话 <b>*</b></label><input id="teacher-profile-emergency-mobile" name="emergencyMobile" type="tel" inputmode="numeric" maxlength="11" value="${tEsc(profile.emergencyMobile)}" placeholder="手机号"></div></div></div>`),
      teacherProfileSection('收款信息', `<div class="teacher-archive-form"><div class="mp-field"><label for="teacher-profile-payee">收款户名</label><input id="teacher-profile-payee" name="payeeName" value="${tEsc(profile.payeeName)}" placeholder="请输入收款户名"></div><div class="mp-field"><label for="teacher-profile-card">银行卡号</label><input id="teacher-profile-card" name="bankCard" inputmode="numeric" maxlength="19" value="${tEsc(profile.bankCard)}" placeholder="请输入银行卡号"></div><div class="mp-field"><label for="teacher-profile-bank">开户行</label><input id="teacher-profile-bank" name="bankName" value="${tEsc(profile.bankName)}" placeholder="请输入开户行"></div></div>`, '仅用于工资发放'),
      teacherProfileSection('履历与展示', `<div class="teacher-archive-form teacher-archive-long-form"><div class="mp-field"><label for="teacher-profile-education">学习经历</label><textarea id="teacher-profile-education" name="education" placeholder="填写学校、专业及学习时间">${tEsc(profile.education)}</textarea></div><div class="mp-field"><label for="teacher-profile-employment">工作经历</label><textarea id="teacher-profile-employment" name="employment" placeholder="填写任职单位、岗位及时间">${tEsc(profile.employment)}</textarea></div><div class="mp-field"><label for="teacher-profile-awards">获奖情况</label><textarea id="teacher-profile-awards" name="awards" placeholder="填写奖项名称及获奖时间">${tEsc(profile.awards)}</textarea></div><div class="mp-field"><label for="teacher-profile-tagline">一句话简介 <small><span data-profile-tagline-count>${profile.tagline.length}</span>/200</small></label><textarea id="teacher-profile-tagline" name="tagline" maxlength="200" placeholder="用于教师信息展示">${tEsc(profile.tagline)}</textarea></div><div class="mp-field"><label for="teacher-profile-introduction">简介</label><textarea id="teacher-profile-introduction" name="introduction" class="teacher-profile-introduction" placeholder="介绍教学方向和教学经验">${tEsc(profile.introduction)}</textarea></div></div>`),
      `<div class="teacher-archive-actions"><button type="button" class="mp-button secondary" data-profile-action="cancel">取消</button><button type="button" class="mp-button" data-profile-action="save">保存修改</button></div>`
    ));
    return;
  }
  const maskedCard = profile.bankCard ? `尾号 ${profile.bankCard.slice(-4)}` : '';
  tLayout(tStack(
    `<section class="teacher-archive-summary"><div class="teacher-archive-person"><span class="teacher-profile-avatar" aria-hidden="true">王</span><div><strong>王玥</strong><span>${tEsc(profile.tagline)}</span></div></div><button type="button" class="teacher-archive-edit" data-profile-action="edit">编辑</button></section>`,
    teacherProfileSection('基本信息', `${identity}<p class="teacher-archive-readonly">基本身份和任教信息由学校统一维护</p>`, '只读'),
    teacherProfileSection('联系方式', teacherArchiveRows([['手机号', profile.mobile], ['邮箱', profile.email], ['紧急联系人', `${profile.emergencyName} · ${profile.emergencyMobile}`, 'wide']])),
    teacherProfileSection('收款信息', teacherArchiveRows([['收款户名', profile.payeeName], ['银行卡号', maskedCard], ['开户行', profile.bankName, 'wide']])),
    teacherProfileSection('履历与展示', teacherArchiveRows([['学习经历', profile.education, 'wide long'], ['工作经历', profile.employment, 'wide long'], ['获奖情况', profile.awards, 'wide long'], ['一句话简介', profile.tagline, 'wide long'], ['简介', profile.introduction, 'wide long']]))
  ));
}
function collectTeacherProfileForm() {
  return [...document.querySelectorAll('.teacher-archive-form [name]')].reduce((values, field) => ({ ...values, [field.name]: field.value.trim() }), {});
}
function saveTeacherProfile() {
  const values = collectTeacherProfileForm();
  if (!/^1\d{10}$/.test(values.mobile)) { tToast('请输入正确的11位手机号'); document.querySelector('#teacher-profile-mobile')?.focus(); return; }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) { tToast('请输入正确的邮箱地址'); document.querySelector('#teacher-profile-email')?.focus(); return; }
  if (!values.emergencyName) { tToast('请输入紧急联系人姓名'); document.querySelector('#teacher-profile-emergency-name')?.focus(); return; }
  if (!/^1\d{10}$/.test(values.emergencyMobile)) { tToast('请输入正确的紧急联系人电话'); document.querySelector('#teacher-profile-emergency-mobile')?.focus(); return; }
  if (values.bankCard && !/^\d{16,19}$/.test(values.bankCard)) { tToast('银行卡号应为16至19位数字'); document.querySelector('#teacher-profile-card')?.focus(); return; }
  teacherState.profile = values;
  saveTeacher();
  teacherProfileEditing = false;
  renderTeacherProfileDetail();
  bindTeacherProfileEvents();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  tToast('个人档案已保存');
}
function bindTeacherProfileEvents() {
  document.querySelector('[data-profile-action="edit"]')?.addEventListener('click', () => { teacherProfileEditing = true; renderTeacherProfileDetail(); bindTeacherProfileEvents(); window.scrollTo(0, 0); });
  document.querySelector('[data-profile-action="cancel"]')?.addEventListener('click', () => { teacherProfileEditing = false; renderTeacherProfileDetail(); bindTeacherProfileEvents(); window.scrollTo(0, 0); });
  document.querySelector('[data-profile-action="save"]')?.addEventListener('click', saveTeacherProfile);
  document.querySelector('#teacher-profile-tagline')?.addEventListener('input', event => { const count = document.querySelector('[data-profile-tagline-count]'); if (count) count.textContent = event.target.value.length; });
}
let teacherCertificateFilter = '全部';
function certificateStatusTone(status) {
  if (status === '审核通过') return 'green';
  if (status === '待审核') return 'amber';
  if (status === '审核不通过') return 'red';
  return 'gray';
}
function certificateValidityTone(validity) {
  if (validity === '有效') return 'green';
  if (validity === '即将过期') return 'amber';
  return 'red';
}
function calculateCertificateValidity(expiresAt) {
  if (!expiresAt) return '有效';
  const remainingDays = Math.ceil((new Date(`${expiresAt}T00:00:00`) - new Date('2026-09-10T00:00:00')) / 86400000);
  if (remainingDays < 0) return '已过期';
  return remainingDays <= 60 ? '即将过期' : '有效';
}
function certificateNeedsAction(item) { return item.status === '审核不通过' || item.validity === '即将过期' || item.validity === '已过期'; }
function teacherCertificateCard(item) {
  const canReupload = item.status === '审核不通过' || item.validity === '已过期';
  return `<article class="teacher-certificate-card ${certificateNeedsAction(item) ? 'needs-action' : ''}"><div class="teacher-certificate-card-head"><div><span>${tEsc(item.type)}</span><h3>${tEsc(item.name)}</h3></div>${tPill(item.status, certificateStatusTone(item.status))}</div><dl class="teacher-certificate-facts"><div><dt>证书编号</dt><dd>${tEsc(item.number)}</dd></div><div><dt>发证机构</dt><dd>${tEsc(item.issuer)}</dd></div><div><dt>有效期</dt><dd>${item.expiresAt ? `至 ${tEsc(item.expiresAt)}` : '永久有效'}</dd></div><div><dt>有效性</dt><dd>${tPill(item.validity, certificateValidityTone(item.validity))}</dd></div></dl>${item.status === '审核不通过' ? `<p class="teacher-certificate-review-note">审核意见：${tEsc(item.reviewNote)}</p>` : ''}<div class="teacher-certificate-card-foot"><span class="teacher-certificate-file"><b aria-hidden="true">${item.file.toLowerCase().endsWith('.pdf') ? 'PDF' : '图'}</b><span>${tEsc(item.file)}</span></span><div><button type="button" data-certificate-view="${tEsc(item.id)}">查看</button>${canReupload ? `<button type="button" class="primary" data-certificate-reupload="${tEsc(item.id)}">重新上传</button>` : ''}</div></div></article>`;
}
function renderTeacherCertificates() {
  const certificates = [...teacherState.certificates].map(item => ({ ...item, validity: calculateCertificateValidity(item.expiresAt) })).sort((a, b) => (a.expiresAt || '9999-12-31').localeCompare(b.expiresAt || '9999-12-31'));
  const visible = certificates.filter(item => teacherCertificateFilter === '全部' || (teacherCertificateFilter === '待审核' ? item.status === '待审核' : certificateNeedsAction(item)));
  const filters = [['全部', certificates.length], ['待审核', certificates.filter(item => item.status === '待审核').length], ['需处理', certificates.filter(certificateNeedsAction).length]];
  const content = visible.length ? visible.map(teacherCertificateCard).join('') : `<section class="teacher-certificate-empty"><strong>暂无${tEsc(teacherCertificateFilter)}证书</strong><p>可切换其他状态或新增证书。</p></section>`;
  tLayout(tStack(`<section class="teacher-certificate-toolbar"><div><strong>${certificates.length}</strong><span>项证书资料</span></div><button type="button" class="mp-button" data-certificate-add>新增证书</button></section>`, `<nav class="teacher-certificate-filters" role="tablist" aria-label="证书状态筛选">${filters.map(([label, count]) => `<button type="button" role="tab" aria-selected="${teacherCertificateFilter === label}" class="${teacherCertificateFilter === label ? 'active' : ''}" data-certificate-filter="${label}">${label}<span>${count}</span></button>`).join('')}</nav>`, `<section class="teacher-certificate-list" aria-live="polite"><div class="teacher-certificate-list-head"><h2>${tEsc(teacherCertificateFilter)}证书</h2><span>${visible.length} 项</span></div>${content}</section>`));
}
function openTeacherCertificateDetail(item) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-certificate-dialog';
  dialog.innerHTML = `<div class="teacher-certificate-dialog-card"><header><div><span>${tEsc(item.type)}</span><h2>${tEsc(item.name)}</h2></div><button type="button" data-certificate-close aria-label="关闭">×</button></header><div class="teacher-certificate-detail-status">${tPill(item.status, certificateStatusTone(item.status))}${tPill(item.validity, certificateValidityTone(item.validity))}</div>${teacherArchiveRows([['证书编号', item.number], ['发证机构', item.issuer], ['颁发日期', item.issuedAt || '未填写'], ['有效期截止', item.expiresAt || '永久有效'], ['录入来源', item.source], ['证书文件', item.file, 'wide']])}<section class="teacher-certificate-audit"><span>审核记录</span><p>${tEsc(item.reviewNote || '暂无审核记录')}</p>${item.reviewedAt ? `<small>${tEsc(item.reviewedAt)}</small>` : ''}</section><button type="button" class="mp-button full secondary" data-certificate-preview="${tEsc(item.id)}">预览证书文件</button></div>`;
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
  dialog.innerHTML = `<form class="teacher-certificate-dialog-card" id="teacher-certificate-form"><header><div><span>${isReupload ? '更新证书材料' : '新增证书'}</span><h2>${isReupload ? tEsc(item.name) : '填写证书信息'}</h2></div><button type="button" data-certificate-close aria-label="关闭">×</button></header>${isReupload ? `<p class="teacher-certificate-form-tip">审核意见：${tEsc(item.reviewNote)}</p>` : ''}<div class="teacher-certificate-form"><div class="mp-field"><label for="certificate-name">证书名称 <b>*</b></label><input id="certificate-name" name="name" value="${tEsc(item?.name || '')}" placeholder="请输入证书名称"></div><div class="teacher-certificate-form-grid"><div class="mp-field"><label for="certificate-number">证书编号 <b>*</b></label><input id="certificate-number" name="number" value="${tEsc(item?.number || '')}" placeholder="请输入编号"></div><div class="mp-field"><label for="certificate-type">证书类型 <b>*</b></label><select id="certificate-type" name="type"><option value="">请选择</option>${['学历证书', '教师资格证', '艺术等级证', '其他'].map(type => `<option ${item?.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></div></div><div class="mp-field"><label for="certificate-issuer">发证机构 <b>*</b></label><input id="certificate-issuer" name="issuer" value="${tEsc(item?.issuer || '')}" placeholder="请输入发证机构"></div><div class="teacher-certificate-form-grid"><div class="mp-field"><label for="certificate-issued">颁发日期</label><input id="certificate-issued" name="issuedAt" type="date" value="${tEsc(item?.issuedAt || '')}"></div><div class="mp-field"><label for="certificate-expiry">有效期截止</label><input id="certificate-expiry" name="expiresAt" type="date" value="${tEsc(item?.expiresAt || '')}" ${item && !item.expiresAt ? 'disabled' : ''}></div></div><label class="teacher-certificate-permanent"><input type="checkbox" data-certificate-permanent ${item && !item.expiresAt ? 'checked' : ''}>永久有效</label><div class="mp-field"><label for="certificate-file">证书文件 <b>*</b></label><label class="teacher-certificate-upload" for="certificate-file"><input id="certificate-file" type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"><b>选择文件</b><span data-certificate-file-name>${isReupload ? '请重新选择清晰完整的文件' : 'JPG、PNG、PDF、DOC、DOCX'}</span></label><small>图片不超过10MB，文档不超过50MB</small></div></div><p class="mp-form-error" data-certificate-error role="alert" hidden></p><div class="teacher-certificate-dialog-actions"><button type="button" class="mp-button secondary" data-certificate-close>取消</button><button type="submit" class="mp-button">提交审核</button></div></form>`;
  document.body.appendChild(dialog);
  const form = dialog.querySelector('#teacher-certificate-form');
  const error = dialog.querySelector('[data-certificate-error]');
  const fileInput = dialog.querySelector('#certificate-file');
  const close = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-certificate-close]').forEach(button => button.addEventListener('click', close));
  dialog.querySelector('[data-certificate-permanent]')?.addEventListener('change', event => { const expiry = dialog.querySelector('#certificate-expiry'); expiry.disabled = event.target.checked; if (event.target.checked) expiry.value = ''; });
  fileInput?.addEventListener('change', () => { dialog.querySelector('[data-certificate-file-name]').textContent = fileInput.files[0]?.name || '未选择文件'; error.hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.name.trim()) { error.textContent = '请输入证书名称。'; error.hidden = false; dialog.querySelector('#certificate-name').focus(); return; }
    if (!values.number.trim()) { error.textContent = '请输入证书编号。'; error.hidden = false; dialog.querySelector('#certificate-number').focus(); return; }
    if (!values.type) { error.textContent = '请选择证书类型。'; error.hidden = false; dialog.querySelector('#certificate-type').focus(); return; }
    if (!values.issuer.trim()) { error.textContent = '请输入发证机构。'; error.hidden = false; dialog.querySelector('#certificate-issuer').focus(); return; }
    if (!fileInput.files.length) { error.textContent = '请选择证书文件。'; error.hidden = false; fileInput.focus(); return; }
    const nextExpiry = values.expiresAt || '';
    const next = { ...(item || {}), id: item?.id || `cert-${Date.now()}`, name: values.name.trim(), number: values.number.trim(), type: values.type, issuer: values.issuer.trim(), issuedAt: values.issuedAt || '', expiresAt: nextExpiry, status: '待审核', validity: calculateCertificateValidity(nextExpiry), source: '教师端上传', file: fileInput.files[0].name, reviewedAt: '', reviewNote: '已重新提交，等待教研审核。' };
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
  if (status === '待签署' || status === '即将到期') return 'amber';
  if (status === '已到期') return 'red';
  return 'gray';
}
function teacherContractCard(contract) {
  const action = contract.status === '待签署' ? '去签署' : '查看详情';
  return `<a class="teacher-contract-card ${contract.status === '待签署' ? 'pending' : ''}" href="${relativePath(`/teacher/pages/contract-detail.html?contract=${contract.id}`)}"><div class="teacher-contract-card-head"><div><span>${tEsc(contract.type)} · ${tEsc(contract.version)}</span><h3>${tEsc(contract.name)}</h3></div>${tPill(contract.status, contractStatusTone(contract.status))}</div><dl class="teacher-contract-card-facts"><div><dt>合同编号</dt><dd>${tEsc(contract.number)}</dd></div><div><dt>合同期限</dt><dd>${tEsc(contract.startAt)} 至 ${tEsc(contract.endAt)}</dd></div><div><dt>工作校区</dt><dd>${tEsc(contract.campus)}</dd></div><div><dt>课时费</dt><dd>¥${tEsc(contract.rate)} / 课时</dd></div></dl><div class="teacher-contract-card-foot"><span>${contract.signedAt ? `${tEsc(contract.signedAt)} 签署` : `${tEsc(contract.pushedAt)} 推送`}</span><strong>${action}<i aria-hidden="true">›</i></strong></div></a>`;
}
function renderTeacherContracts() {
  const contracts = [...teacherState.contracts].sort((a, b) => b.startAt.localeCompare(a.startAt));
  const pendingCount = contracts.filter(item => item.status === '待签署').length;
  const visible = contracts.filter(item => teacherContractFilter === '全部' || (teacherContractFilter === '待签署' ? item.status === '待签署' : item.status !== '待签署'));
  const filters = [['全部', contracts.length], ['待签署', pendingCount], ['历史合同', contracts.length - pendingCount]];
  tLayout(tStack(`<section class="teacher-contract-overview"><div><strong>${pendingCount}</strong><span>份合同待签署</span></div><p>${pendingCount ? '请在截止日期前阅读并完成签署' : '当前没有待签署合同'}</p></section>`, `<nav class="teacher-contract-filters" role="tablist" aria-label="合同状态筛选">${filters.map(([label, count]) => `<button type="button" role="tab" aria-selected="${teacherContractFilter === label}" class="${teacherContractFilter === label ? 'active' : ''}" data-contract-filter="${label}">${label}<span>${count}</span></button>`).join('')}</nav>`, `<section class="teacher-contract-list" aria-live="polite"><div class="teacher-contract-list-head"><h2>${tEsc(teacherContractFilter)}</h2><span>${visible.length} 份</span></div>${visible.length ? visible.map(teacherContractCard).join('') : `<div class="teacher-contract-empty">暂无${tEsc(teacherContractFilter)}合同</div>`}</section>`));
}
function contractDocument(contract) {
  return `<article class="teacher-contract-document"><div class="teacher-contract-document-brand">湖北艺术职业学院继续教育服务平台</div><h2>教师${tEsc(contract.type)}</h2><p class="teacher-contract-document-number">合同编号：${tEsc(contract.number)}</p><div class="teacher-contract-parties"><p>甲方：湖北艺术职业学院继续教育学院</p><p>乙方：王玥</p></div><section><h3>第一条 合作事项</h3><p>甲方聘请乙方承担${tEsc(contract.course)}课程教学工作。乙方根据教学计划完成备课、授课、考勤、作业及教学记录。</p></section><section><h3>第二条 合同期限</h3><p>合同期限为${tEsc(contract.startAt)}至${tEsc(contract.endAt)}。课程安排以教务系统发布的课表为准。</p></section><section><h3>第三条 工作地点</h3><p>主要工作地点为${tEsc(contract.campus)}。因教学需要调整校区或教室时，甲方应提前通知乙方。</p></section><section><h3>第四条 课时与报酬</h3><p>课时费标准为人民币${tEsc(contract.rate)}元／课时。有效课时以教师完成上课打卡、学员考勤和教学记录后，由系统确认的数据为准。</p></section><section><h3>第五条 教学要求</h3><p>乙方应遵守教学管理制度，按时到岗，不得擅自调课、停课或委托他人代课。确需调整时，应提前向教务部门申请。</p></section><section><h3>第六条 信息与保密</h3><p>乙方在履约过程中接触的学员信息、教学资料和平台数据仅限教学使用，未经许可不得向无关人员披露。</p></section><section><h3>第七条 合同变更与终止</h3><p>合同内容需要变更时，由双方协商确认。出现严重违反教学管理要求或无法继续履约的情形，可按约定终止合同。</p></section><section><h3>第八条 其他</h3><p>未尽事项由双方协商处理。本合同经双方签署后生效，电子签署文本与纸质文本具有同等效力。</p></section><div class="teacher-contract-document-signatures"><div><span>甲方（盖章）</span><strong>湖北艺术职业学院</strong></div><div><span>乙方（签名）</span><strong>${contract.signedAt ? '王玥' : '待签署'}</strong></div></div></article>`;
}
function currentTeacherContract() {
  const id = new URLSearchParams(location.search).get('contract');
  return teacherState.contracts.find(item => item.id === id) || teacherState.contracts.find(item => item.status === '待签署') || teacherState.contracts[0];
}
function renderTeacherContractDetail() {
  const contract = currentTeacherContract();
  const readonly = contract.status !== '待签署';
  const statusNote = contract.status === '待签署' ? contract.note : contract.status === '已终止' ? `终止日期 ${contract.terminatedAt} · ${contract.note}` : contract.note;
  tLayout(tStack(`<section class="teacher-contract-detail-head"><div><span>${tEsc(contract.type)} · ${tEsc(contract.version)}</span><h2>${tEsc(contract.name)}</h2><p>${tEsc(contract.number)}</p></div>${tPill(contract.status, contractStatusTone(contract.status))}</section>`, `<section class="teacher-contract-info"><div class="teacher-contract-info-head"><h3>合同信息</h3><span>${readonly ? '只读' : '签署前请核对'}</span></div>${teacherArchiveRows([['合同期限', `${contract.startAt} 至 ${contract.endAt}`, 'wide'], ['授课课程', contract.course, 'wide'], ['工作校区', contract.campus], ['课时费标准', `¥${contract.rate} / 课时`], ['签署日期', contract.signedAt || '未签署'], ['合同版本', contract.version]])}</section>`, `<section class="teacher-contract-file"><div class="teacher-contract-file-page"><span>PDF · ${tEsc(contract.file)}</span><strong>教师${tEsc(contract.type)}</strong><p>${tEsc(contract.number)}</p><small>共 8 条</small></div><div><h3>合同全文</h3><p>查看合同期限、授课安排、课时费标准及双方权责。</p><button type="button" class="mp-button secondary full" data-contract-read>${readonly ? '查看合同全文' : '阅读并签署'}</button></div></section>`, `<p class="teacher-contract-status-note ${contract.status === '待签署' ? 'pending' : ''}">${tEsc(statusNote)}</p>`));
}
function openTeacherContractReader(contract) {
  const canSign = contract.status === '待签署';
  const dialog = document.createElement('dialog');
  dialog.className = 'teacher-contract-reader-dialog';
  dialog.innerHTML = `<div class="teacher-contract-reader"><header><div><span>${canSign ? '签署前阅读' : '合同全文'}</span><strong>${tEsc(contract.number)}</strong></div><button type="button" data-contract-close aria-label="关闭合同全文">×</button></header><div class="teacher-contract-reader-body" data-contract-reader-body>${contractDocument(contract)}</div><footer><span data-contract-read-status>${canSign ? '请阅读至合同末尾' : '只读合同'}</span><button type="button" class="mp-button" data-contract-to-sign ${canSign ? 'disabled' : ''}>${canSign ? '已阅读，去签名' : '关闭全文'}</button></footer></div>`;
  document.body.appendChild(dialog);
  const body = dialog.querySelector('[data-contract-reader-body]');
  const action = dialog.querySelector('[data-contract-to-sign]');
  const status = dialog.querySelector('[data-contract-read-status]');
  const close = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('[data-contract-close]').addEventListener('click', close);
  if (canSign) {
    const updateReadState = () => { const complete = body.scrollTop + body.clientHeight >= body.scrollHeight - 8; action.disabled = !complete; status.textContent = complete ? '合同已阅读完毕' : '请阅读至合同末尾'; };
    body.addEventListener('scroll', updateReadState);
    action.addEventListener('click', () => { if (action.disabled) return; dialog.close(); openTeacherContractSignature(contract); });
  } else action.addEventListener('click', close);
  dialog.showModal();
}
function openTeacherContractSignature(contract) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-contract-sign-dialog';
  dialog.innerHTML = `<div class="teacher-contract-sign-card"><header><div><span>合同编号 ${tEsc(contract.number)}</span><h2>手写签名</h2></div><button type="button" data-contract-close aria-label="关闭">×</button></header><p>请本人在下方区域签名，签名将用于本合同电子签署。</p><div class="teacher-contract-signature-pad"><canvas data-contract-signature aria-label="手写签名区域"></canvas><span data-signature-placeholder>请在此处签名</span></div><div class="teacher-contract-signature-tools"><button type="button" data-signature-clear>清除重写</button><span data-signature-status>尚未签名</span></div><label class="teacher-contract-confirm"><input type="checkbox" data-contract-agree>我已阅读并同意合同全部内容</label><div class="teacher-certificate-dialog-actions"><button type="button" class="mp-button secondary" data-contract-close>取消</button><button type="button" class="mp-button" data-contract-confirm disabled>确认签署</button></div></div>`;
  document.body.appendChild(dialog);
  const canvas = dialog.querySelector('[data-contract-signature]');
  const confirm = dialog.querySelector('[data-contract-confirm]');
  const agreement = dialog.querySelector('[data-contract-agree]');
  const signatureStatus = dialog.querySelector('[data-signature-status]');
  const placeholder = dialog.querySelector('[data-signature-placeholder]');
  let drawing = false;
  let hasInk = false;
  let context;
  const syncConfirm = () => { confirm.disabled = !(hasInk && agreement.checked); signatureStatus.textContent = hasInk ? '已签名' : '尚未签名'; placeholder.hidden = hasInk; };
  const point = event => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const close = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-contract-close]').forEach(button => button.addEventListener('click', close));
  agreement.addEventListener('change', syncConfirm);
  canvas.addEventListener('pointerdown', event => { drawing = true; hasInk = true; canvas.setPointerCapture(event.pointerId); const start = point(event); context.beginPath(); context.moveTo(start.x, start.y); syncConfirm(); });
  canvas.addEventListener('pointermove', event => { if (!drawing) return; const next = point(event); context.lineTo(next.x, next.y); context.stroke(); });
  canvas.addEventListener('pointerup', () => { drawing = false; });
  canvas.addEventListener('pointercancel', () => { drawing = false; });
  dialog.querySelector('[data-signature-clear]').addEventListener('click', () => { context.clearRect(0, 0, canvas.width, canvas.height); hasInk = false; syncConfirm(); });
  confirm.addEventListener('click', () => { if (confirm.disabled) return; teacherState.contracts = teacherState.contracts.map(item => item.id === contract.id ? { ...item, status: '已签署', signedAt: '2026-09-10', note: '合同已完成教师签署，等待归档。' } : item); saveTeacher(); dialog.close(); renderTeacherContractDetail(); bindTeacherContractEvents(); window.scrollTo(0, 0); tToast('合同签署成功'); });
  dialog.showModal();
  const rect = canvas.getBoundingClientRect();
  const scale = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  context = canvas.getContext('2d');
  context.scale(scale, scale);
  context.strokeStyle = '#342b27';
  context.lineWidth = 2.2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
}
function bindTeacherContractEvents() {
  document.querySelectorAll('[data-contract-filter]').forEach(button => button.addEventListener('click', () => { teacherContractFilter = button.dataset.contractFilter; renderTeacherContracts(); bindTeacherContractEvents(); }));
  document.querySelector('[data-contract-read]')?.addEventListener('click', () => openTeacherContractReader(currentTeacherContract()));
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
  const records = [...teacherState.graduationRecords].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
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
  return teacherState.graduationRecords.find(item => item.id === id) || teacherState.graduationRecords[0];
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
function openLessonHomeworkDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-lesson-dialog';
  dialog.innerHTML = `<form class="mp-dialog-card" id="lesson-homework-form"><div class="teacher-lesson-dialog-head"><div><span>课后任务</span><h2>发布作业</h2></div><button type="button" data-lesson-dialog-close aria-label="关闭">×</button></div><div class="teacher-homework-form"><div class="mp-field"><label for="homework-title">作业标题 <b>*</b></label><input id="homework-title" maxlength="50" required placeholder="例如：第8次课身韵组合练习"></div><div class="mp-field"><label for="homework-description">作业描述 <b>*</b></label><textarea id="homework-description" required placeholder="说明练习内容和提交要求"></textarea></div><div class="teacher-homework-form-grid"><div class="mp-field"><label for="homework-type">作业类型 <b>*</b></label><select id="homework-type" required><option value="">请选择</option><option>练习视频</option><option>乐谱练习</option><option>绘画作品</option><option>文字报告</option><option>其他</option></select></div><div class="mp-field"><label for="homework-deadline">截止时间 <b>*</b></label><input id="homework-deadline" type="datetime-local" value="2026-09-12T10:30" required></div></div><fieldset class="teacher-homework-formats"><legend>提交格式 <b>*</b></legend>${['图片', '视频', '音频', '文字', 'PDF'].map(format => `<label><input type="checkbox" name="homework-format" value="${format}">${format}</label>`).join('')}</fieldset><label class="teacher-homework-required"><span><strong>设为必交作业</strong><small>开启后计入作业提交率</small></span><input type="checkbox" id="homework-required" checked></label><fieldset class="teacher-homework-resources"><legend>参考资料 <span>选填</span></legend><label><input type="checkbox" value="第8次课动作示范">第8次课动作示范</label><label><input type="checkbox" value="身韵练习音乐">身韵练习音乐</label></fieldset></div><p class="mp-form-error" data-homework-error hidden></p><div class="teacher-lesson-dialog-actions"><button type="button" class="mp-button secondary" data-lesson-dialog-close>取消</button><button type="submit" class="mp-button">发布作业</button></div></form>`;
  document.body.appendChild(dialog);
  const close = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-lesson-dialog-close]').forEach(button => button.addEventListener('click', close));
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const formats = [...dialog.querySelectorAll('[name="homework-format"]:checked')].map(input => input.value);
    const error = dialog.querySelector('[data-homework-error]');
    if (!formats.length) { error.hidden = false; error.textContent = '请至少选择一种提交格式'; return; }
    teacherState.lesson.homework = {
      title: dialog.querySelector('#homework-title').value.trim(),
      description: dialog.querySelector('#homework-description').value.trim(),
      type: dialog.querySelector('#homework-type').value,
      formats,
      deadline: dialog.querySelector('#homework-deadline').value.replace('T', ' '),
      required: dialog.querySelector('#homework-required').checked,
      resources: [...dialog.querySelectorAll('.teacher-homework-resources input:checked')].map(input => input.value),
      reviews: { '林知夏': '动作完整，节奏稳定，注意落脚时保持膝盖方向。' },
      publishedAt: '2026-09-10 10:32'
    };
    saveTeacher(); close(); renderLesson(); bindLessonEvents(); tToast('作业已发布至学员端');
  });
  dialog.showModal();
}
function openLessonSubmissionsDialog() {
  const reviews = { '林知夏': '动作完整，节奏稳定，注意落脚时保持膝盖方向。', ...(teacherState.lesson.homework?.reviews || {}) };
  const reviewedCount = Object.keys(reviews).length;
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog teacher-lesson-dialog';
  dialog.innerHTML = `<div class="mp-dialog-card"><div class="teacher-lesson-dialog-head"><div><span>作业提交</span><h2>${tEsc(teacherState.lesson.homework?.title || '课后作业')}</h2></div><button type="button" data-lesson-dialog-close aria-label="关闭">×</button></div><div class="teacher-submission-summary"><div><strong>2</strong><span>已提交</span></div><div><strong>2</strong><span>未提交</span></div><div><strong>${reviewedCount}</strong><span>已点评</span></div></div><div class="teacher-submission-list"><article><span class="teacher-lesson-student-avatar">林</span><div><strong>林知夏</strong><small>今天 11:26 · 已点评</small></div>${tPill('已点评', 'green')}</article><article><span class="teacher-lesson-student-avatar">周</span><div><strong>周予安</strong><small>今天 12:08 · ${reviews['周予安'] ? '已点评' : '待点评'}</small></div>${reviews['周予安'] ? tPill('已点评', 'green') : '<button type="button" class="teacher-submission-review" data-submission-review="周予安">去点评</button>'}</article><article><span class="teacher-lesson-student-avatar">陈</span><div><strong>陈一诺</strong><small>尚未提交</small></div>${tPill('未提交', 'gray')}</article><article><span class="teacher-lesson-student-avatar">赵</span><div><strong>赵明月</strong><small>尚未提交</small></div>${tPill('未提交', 'gray')}</article></div><p class="teacher-submission-note">点评仅填写文本评语，可选上传批注文件，不设置分数和等级。</p><button type="button" class="mp-button full secondary" data-lesson-dialog-close>关闭</button></div>`;
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
  dialog.innerHTML = `<form class="mp-dialog-card" id="end-lesson-form"><div class="teacher-lesson-dialog-head"><div><span>结束上课</span><h2>填写教学记录</h2></div><button type="button" data-end-lesson-cancel aria-label="关闭">×</button></div><p class="mp-dialog-copy">记录本次课堂完成情况、教学调整和学员表现。提交后将结束本课次并计入2课时。</p><div class="mp-field teacher-end-lesson-record"><label for="end-lesson-record">教学记录 <b>*</b></label><textarea id="end-lesson-record" required maxlength="1000" placeholder="请填写本次课的教学记录">${tEsc(teacherState.lesson.teachingRecord || '')}</textarea><small>最多1000字</small></div><p class="mp-form-error" data-end-lesson-error hidden></p><div class="teacher-lesson-dialog-actions"><button type="button" class="mp-button secondary" data-end-lesson-cancel>取消</button><button type="submit" class="mp-button">提交并结束上课</button></div></form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelectorAll('[data-end-lesson-cancel]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const record = dialog.querySelector('#end-lesson-record').value.trim();
    if (!record) {
      const error = dialog.querySelector('[data-end-lesson-error]');
      error.hidden = false;
      error.textContent = '请填写教学记录';
      dialog.querySelector('#end-lesson-record').focus();
      return;
    }
    const now = new Date();
    teacherState.lesson.teachingRecord = record;
    teacherState.lesson.teachingRecordSaved = true;
    teacherState.lesson.status = '已完成';
    teacherState.lesson.started = false;
    teacherState.lesson.endedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    saveTeacher(); dialog.close(); renderLesson(); bindLessonEvents(); window.scrollTo(0, 0); tToast('已结束上课，2课时计入工资');
  });
  dialog.showModal();
}
let lessonTimerId;
function bindLessonEvents() {
  clearInterval(lessonTimerId);
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
      teacherState.lesson.attendanceSubmitted = false; saveTeacher(); renderLesson(); bindLessonEvents(); tToast('已将全班标记为已到');
    }
    if (action === 'submit-attendance') {
      const missing = Object.entries(teacherState.lesson.attendance).filter(([, status]) => !status).map(([name]) => name);
      if (missing.length) { tToast(`请登记${missing.join('、')}的考勤`); return; }
      const leaveWithoutReason = Object.entries(teacherState.lesson.attendance).find(([name, status]) => status === '请假' && !teacherState.lesson.attendanceNotes[name]?.trim());
      if (leaveWithoutReason) { tToast(`请填写${leaveWithoutReason[0]}的请假理由`); document.querySelector(`[data-attendance-note="${leaveWithoutReason[0]}"]`)?.focus(); return; }
      teacherState.lesson.attendanceSubmitted = true; saveTeacher(); renderLesson(); bindLessonEvents(); tToast('考勤已提交并同步至学员端');
    }
    if (action === 'open-homework') openLessonHomeworkDialog();
    if (action === 'homework-submissions') openLessonSubmissionsDialog();
    if (action === 'end') {
      if (!teacherState.lesson.attendanceSubmitted) { tToast('请先完成学员考勤'); return; }
      confirmEndLesson();
    }
  }));
  document.querySelectorAll('[data-attendance-status]').forEach(button => button.addEventListener('click', () => {
    const name = button.dataset.student;
    teacherState.lesson.attendance[name] = button.dataset.attendanceStatus;
    if (button.dataset.attendanceStatus === '已到') delete teacherState.lesson.attendanceNotes[name];
    teacherState.lesson.attendanceSubmitted = false; saveTeacher(); renderLesson(); bindLessonEvents();
  }));
  document.querySelectorAll('[data-attendance-note]').forEach(input => input.addEventListener('input', () => {
    teacherState.lesson.attendanceNotes[input.dataset.attendanceNote] = input.value;
    teacherState.lesson.attendanceSubmitted = false; saveTeacher();
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
function bindTeacherEvents() { bindScheduleCalendar(); bindClassDetailEvents(); document.querySelectorAll('[data-class-filter]').forEach(button => button.addEventListener('click', () => { selectedClassStatus = button.dataset.classFilter; renderClasses(); bindTeacherEvents(); })); document.querySelectorAll('[data-class-detail-tab]').forEach(button => button.addEventListener('click', () => { selectedClassDetailTab = button.dataset.classDetailTab; renderClassDetail(); bindTeacherEvents(); })); document.querySelectorAll('[data-teacher-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.teacherAction; if (action === 'start-schedule') { const now = new Date(); teacherState.lesson.started = true; teacherState.lesson.status = '上课中'; teacherState.lesson.startedAtMs = Date.now(); teacherState.lesson.startedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; saveTeacher(); location.href = relativePath('/teacher/pages/class-detail.html'); } if (action === 'graduation') location.href = relativePath('/teacher/pages/graduation.html'); if (action === 'new-application') location.href = relativePath('/teacher/pages/application-create.html'); })); }
if (teacherPath.endsWith('/index.html') || teacherPath.endsWith('/teacher/')) renderSchedule();
else if (teacherPath.endsWith('/class-detail.html')) renderLesson();
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
bindTeacherProfileEvents();
bindTeacherCertificateEvents();
bindTeacherContractEvents();
bindTeacherGraduationEvents();
bindLessonEvents();
bindTeacherEvents();
