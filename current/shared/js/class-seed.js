// Canonical offline-class seed shared by the admin CRM and the learner app.
// P0-1: one class entity keeps one primary key, one name and one enrollment count on both ends.
// 2026-09-22 裁定：移除「快速报名入口／快速频道开关」，学员端可见性只由展示状态决定。

import { venueSeed } from './venue-seed.js';
import { courseTotalHours } from './course-hours.js';
import { demoOwnerForMajor } from './demo-categories.js';
import { DEMO_TODAY } from './demo-clock.js';

// CR-2026-056 面授班级阶段状态 Mock 数据 + CR-2026-134 演示场景重构。
// 排课阶段：待排课 3 条、排课中 3 条（CR-2026-134 起归芭蕾舞教师徐帆），其余为已完成排课 22 条。
// 招生阶段（仅已排课班级）：未开始 1 条、进行中 3 条、已结束 18 条。
// 教学阶段（招生已结束）：待开课 1 条（王玥 秋季芭蕾舞待开课1班）、授课中 11 条、已结课 6 条；
// 默认演示教师王玥的班级固定为 12 条：待开课 1／进行中 8／已结束 3，并覆盖上课中、下一课即将开始与三种作业状态。
// 已发布班级的正式课次按「每组不同教室 + 不同上课时间」铺开，避免 15 个演示班级共用同一教师、
// 同一教室、同一时段而在课表上整片报冲突；同一教师同时段不再出现无意重叠。
const slotMinutes = (start, end) => (Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5))) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)));
const publishedSessions = (firstDate, { total = 8, roomId = 'venue-302', startTime = '09:00', endTime = '10:30' } = {}) => Array.from({ length: total }, (_, index) => {
  const date = new Date(`${firstDate}T00:00:00+08:00`);
  date.setDate(date.getDate() + index * 7);
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    index: index + 1,
    date: localDate,
    weekday: `周${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`,
    startTime,
    endTime,
    start: startTime,
    end: endTime,
    lessonDuration: slotMinutes(startTime, endTime),
    roomId,
    status: '待上课'
  };
});

// owner：显式指定授课教师（用于「未发布的排课阶段演示班级归芭蕾舞教师徐帆」这一演示例外，见 CR-2026-134）；
// demoHomework：该班的作业演示状态（'' | '未提交' | '点评中' | '点评完成'），驱动课次详情与课次行的作业口径。
const classRecord = ({ id, name, courseId = 'COURSE-CR-2026-0001', course = '舞蹈基本功', teacher = '王玥', major = '中国舞', owner = '', demoHomework = '', batch = '秋季', scheduleStatus, enrollStart = '', deadline = '', firstLessonDate = '', sessions = [], enrolled = 0, capacity = 20, recommended = false, weekdays = ['周六'], updatedAt = '2026-09-17 10:00' }) => ({
  id,
  name,
  courseId,
  course,
  courseVersion: 1,
  professional: major,
  // I1-DEMO-01：班级授课教师同样按大类集中（芭蕾→王玥、少儿绘画→李青）。
  teacher: owner || demoOwnerForMajor(major, teacher),
  demoHomework,
  batch,
  capacity,
  enrolled,
  price: 1680,
  scheduleStatus,
  scheduleVersion: scheduleStatus === '已发布' ? 1 : 0,
  schedule: scheduleStatus === '已发布' ? `每${weekdays[0] || '周六'} ${sessions[0]?.startTime || '09:00'}-${sessions[0]?.endTime || '10:30'}` : '',
  weekdays: scheduleStatus === '已发布' ? weekdays : [],
  firstLessonDate,
  lessonDuration: sessions[0]?.lessonDuration || 90,
  // 班级总课时继承课程库该课程的总课时；已排课时课次数等于总课时（一个课时一个课次）。
  lessons: sessions.length || courseTotalHours(courseId),
  sessions,
  displayStatus: scheduleStatus === '已发布' ? '显示' : '隐藏',
  display: scheduleStatus === '已发布' ? '已展示' : '未发布',
  recommended,
  enrollStart,
  deadline,
  enrollmentClosed: false,
  trialEnabled: '是',
  trialFee: '否',
  trialPrice: '',
  trialNote: '请联系课程顾问了解试听安排。',
  status: scheduleStatus === '草稿' ? '排班草稿' : scheduleStatus === '已发布' ? '招生中' : '待排课',
  // CR-2026-102：班级的校区／教室与首次课次的教室保持一致，避免课次调整抽屉只列出别的校区教室。
  campus: (venueSeed.find((room) => room.id === (sessions[0]?.roomId || 'venue-201')) || venueSeed[0]).campus,
  classroom: (venueSeed.find((room) => room.id === (sessions[0]?.roomId || 'venue-201')) || venueSeed[0]).name,
  roomId: (venueSeed.find((room) => room.id === (sessions[0]?.roomId || 'venue-201')) || venueSeed[0]).id,
  updatedAt
});

// CR-2026-134：排课阶段的 6 个演示班改由芭蕾舞教师徐帆持有，让默认演示教师王玥的班级列表不再全部是待开课；
// 后台排课阶段仍保留 待排课 3 / 排课中 3 的覆盖。
const pendingScheduleClasses = [1, 2, 3].map(index => classRecord({
  id: `class-mock-pending-${String(index).padStart(2, '0')}`,
  name: `秋季芭蕾舞待排课${index}班`,
  courseId: 'COURSE-MOCK-1063',
  course: '芭蕾舞进阶训练',
  major: '芭蕾舞',
  teacher: '徐帆',
  owner: '徐帆',
  scheduleStatus: '待排课'
}));

const arrangingClasses = [1, 2, 3].map(index => classRecord({
  id: `class-mock-arranging-${String(index).padStart(2, '0')}`,
  name: `秋季芭蕾舞排课中${index}班`,
  courseId: 'COURSE-MOCK-1063',
  course: '芭蕾舞进阶训练',
  major: '芭蕾舞',
  teacher: '徐帆',
  owner: '徐帆',
  scheduleStatus: '草稿'
}));

// 已发布班级统一安排在「周四」，与课表演示课的周一／周三／周六／周日错开；
// 课程与教师取自课程库已完成的 5 门面授课程（芭蕾舞／中国画／中国舞／钢琴／少儿绘画），
// 同一批次用不同开始时间与教室；舞蹈组保留 1 组跨校区 15 分钟衔接，用于演示教师转场提示。
const CLASS_SLOTS = {
  ballet: [
    { roomId: 'venue-302', startTime: '09:00', endTime: '10:30' },
    { roomId: 'venue-art201', startTime: '10:45', endTime: '12:15' },
    { roomId: 'venue-302', startTime: '13:00', endTime: '14:30' }
  ],
  painting: [
    { roomId: 'venue-art103', startTime: '09:00', endTime: '10:30' },
    { roomId: 'venue-art105', startTime: '10:45', endTime: '12:15' },
    { roomId: 'venue-art103', startTime: '15:00', endTime: '16:30' }
  ],
  dance: [
    { roomId: 'venue-302', startTime: '14:45', endTime: '16:15' },
    { roomId: 'venue-art201', startTime: '16:30', endTime: '18:00' },
    { roomId: 'venue-302', startTime: '18:15', endTime: '19:45' }
  ],
  piano: [
    { roomId: 'venue-201', startTime: '09:00', endTime: '10:30' },
    { roomId: 'venue-201', startTime: '10:45', endTime: '12:15' },
    { roomId: 'venue-201', startTime: '13:00', endTime: '14:30' }
  ],
  sketch: [
    { roomId: 'venue-art103', startTime: '09:00', endTime: '10:30' },
    { roomId: 'venue-art105', startTime: '10:45', endTime: '12:15' },
    { roomId: 'venue-art103', startTime: '13:00', endTime: '14:30' }
  ]
};
const slotOf = (slots, index) => slots[(index - 1) % slots.length];

const completedEnrollmentNotStarted = [1, 2, 3].map(index => {
  // 芭蕾舞（王玥，CR-2026-134 演示场景重构）：1 班 招生已结束、首课 2026-11-05 → 待开课（后台教学阶段「待开课」样班）；
  // 2／3 班 首课已过、末课未到 → 进行中。
  const plan = [
    { firstDate: '2026-11-05', enrolled: 12, name: '秋季芭蕾舞待开课1班' },
    { firstDate: '2026-09-03', enrolled: 14, name: '秋季芭蕾舞进阶1班' },
    { firstDate: '2026-09-10', enrolled: 14, name: '秋季芭蕾舞进阶2班' }
  ][index - 1];
  const sessions = publishedSessions(plan.firstDate, { ...slotOf(CLASS_SLOTS.ballet, index), total: courseTotalHours('COURSE-MOCK-1063') });
  return classRecord({ id: `class-mock-ready-${String(index).padStart(2, '0')}`, name: plan.name, courseId: 'COURSE-MOCK-1063', course: '芭蕾舞进阶训练', major: '芭蕾舞', teacher: '王玥', scheduleStatus: '已发布', enrollStart: '2026-08-01 09:00', deadline: '2026-08-28 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: plan.enrolled, weekdays: ['周四'], updatedAt: '2026-09-20 10:00' });
});

const completedEnrollmentOngoing = [1, 2, 3].map(index => {
  // 少儿国画（李青）：招生进行中，首课 2026-10-08；第 3 个班与舞蹈组重叠 15 分钟，用于演示同一学员的时间冲突。
    const sessions = publishedSessions('2026-10-08', { ...slotOf(CLASS_SLOTS.painting, index), total: courseTotalHours('COURSE-CR-2026-0003') });
  return classRecord({ id: `class-mock-enrolling-${String(index).padStart(2, '0')}`, name: `秋季少儿国画招生中${index}班`, courseId: 'COURSE-CR-2026-0003', course: '少儿国画入门', major: '中国画', teacher: '李青', scheduleStatus: '已发布', enrollStart: '2026-09-01 09:00', deadline: '2026-10-01 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 6, recommended: index === 1, weekdays: ['周四'], updatedAt: '2026-09-18 10:00' });
});

const completedEnrollmentEndedPending = [1, 2, 3].map(index => {
  // 中国舞（王玥）：暑期批次 12 次课全部完成（首课 2026-06-18、末课 2026-09-03）→ 已结束。
  // 保留组内 15 分钟跨校区衔接，继续用于演示教师转场提示。
  const sessions = publishedSessions('2026-06-18', { ...slotOf(CLASS_SLOTS.dance, index), total: courseTotalHours('COURSE-MOCK-1003') });
  return classRecord({ id: `class-mock-ended-pending-${String(index).padStart(2, '0')}`, name: `暑期中国舞基础${index}班`, courseId: 'COURSE-MOCK-1003', course: '中国舞进阶训练', major: '中国舞', teacher: '王玥', scheduleStatus: '已发布', enrollStart: '2026-05-01 09:00', deadline: '2026-06-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 12, demoHomework: '点评完成', weekdays: ['周四'], updatedAt: '2026-09-10 10:00' });
});

const completedEnrollmentEndedTeaching = [1, 2, 3].map(index => {
  // 钢琴（林悦）：首课 2026-09-03、末课 2026-10-22，演示当天为授课中；第 3 个班报名数超过琴房容量 20，用于演示超容量提示。
    const sessions = publishedSessions('2026-09-03', { ...slotOf(CLASS_SLOTS.piano, index), total: courseTotalHours('COURSE-MOCK-1033') });
  return classRecord({ id: `class-mock-ended-teaching-${String(index).padStart(2, '0')}`, name: `秋季钢琴已截止授课中${index}班`, courseId: 'COURSE-MOCK-1033', course: '钢琴进阶训练', major: '钢琴', teacher: '林悦', scheduleStatus: '已发布', enrollStart: '2026-08-20 09:00', deadline: '2026-09-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: index === 3 ? 24 : 14, weekdays: ['周四'], updatedAt: '2026-09-12 10:00' });
});

const completedEnrollmentEndedFinished = [1, 2, 3].map(index => {
  // 少儿绘画（唐雯）：暑期批次，12 次课（课程库总课时 12）在 2026-08-20 结束，演示基准日 2026-09-12 前已全部完成。
    const sessions = publishedSessions('2026-06-04', { ...slotOf(CLASS_SLOTS.sketch, index), total: courseTotalHours('COURSE-MOCK-1053') });
  return classRecord({ id: `class-mock-ended-finished-${String(index).padStart(2, '0')}`, name: `暑期少儿绘画已结课${index}班`, courseId: 'COURSE-MOCK-1053', course: '少儿绘画进阶训练', major: '少儿绘画', teacher: '唐雯', batch: '暑假', scheduleStatus: '已发布', enrollStart: '2026-06-01 09:00', deadline: '2026-08-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 18, weekdays: ['周四'], updatedAt: '2026-08-30 10:00' });
});
// CR-2026-134：王玥的「进行中」场景演示班，覆盖课次与作业的不同状态（默认演示账号一进来就能看到差异）。
// 场景：上课中（今天有一节正在上）／下一课即将开始（明天）／作业未提交／作业点评中／作业点评完成／有课次待上课。
const SCENE_CLASSES = [
  { id: 'class-mock-scene-01', name: '秋季中国舞启蒙1班', courseId: 'COURSE-MOCK-1003', course: '中国舞进阶训练', major: '中国舞', roomId: 'venue-201', startTime: '15:00', endTime: '16:30', firstDate: '2026-08-01', weekday: '周六', enrolled: 16, scene: '上课中', demoHomework: '' },
  { id: 'class-mock-scene-02', name: '秋季芭蕾舞启蒙1班', courseId: 'COURSE-MOCK-1063', course: '芭蕾舞进阶训练', major: '芭蕾舞', roomId: 'venue-302', startTime: '09:00', endTime: '10:30', firstDate: '2026-08-02', weekday: '周日', enrolled: 15, scene: '下一课即将开始', demoHomework: '' },
  { id: 'class-mock-scene-03', name: '秋季中国舞进阶2班', courseId: 'COURSE-MOCK-1003', course: '中国舞进阶训练', major: '中国舞', roomId: 'venue-302', startTime: '09:00', endTime: '10:30', firstDate: '2026-08-07', weekday: '周五', enrolled: 14, scene: '作业未提交', demoHomework: '未提交' },
  { id: 'class-mock-scene-04', name: '秋季中国舞进阶3班', courseId: 'COURSE-MOCK-1003', course: '中国舞进阶训练', major: '中国舞', roomId: 'venue-art201', startTime: '10:45', endTime: '12:15', firstDate: '2026-08-07', weekday: '周五', enrolled: 14, scene: '作业点评中', demoHomework: '点评中' },
  { id: 'class-mock-scene-05', name: '秋季芭蕾舞进阶3班', courseId: 'COURSE-MOCK-1063', course: '芭蕾舞进阶训练', major: '芭蕾舞', roomId: 'venue-art201', startTime: '14:00', endTime: '15:30', firstDate: '2026-08-04', weekday: '周二', enrolled: 14, scene: '作业点评完成', demoHomework: '点评完成' },
  { id: 'class-mock-scene-06', name: '秋季芭蕾舞进阶4班', courseId: 'COURSE-MOCK-1063', course: '芭蕾舞进阶训练', major: '芭蕾舞', roomId: 'venue-302', startTime: '16:00', endTime: '17:30', firstDate: '2026-08-11', weekday: '周二', enrolled: 14, scene: '有课次待上课', demoHomework: '' }
];
const classSceneClasses = SCENE_CLASSES.map((item) => {
  const sessions = publishedSessions(item.firstDate, { roomId: item.roomId, startTime: item.startTime, endTime: item.endTime, total: courseTotalHours(item.courseId) });
  if (item.scene === '上课中') { const today = sessions.find((session) => session.date === DEMO_TODAY); if (today) today.status = '上课中'; }
  return classRecord({ id: item.id, name: item.name, courseId: item.courseId, course: item.course, major: item.major, teacher: '王玥', scheduleStatus: '已发布', enrollStart: '2026-07-01 09:00', deadline: '2026-07-25 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: item.enrolled, demoHomework: item.demoHomework, weekdays: [item.weekday], updatedAt: '2026-09-12 10:00' });
});
// 招生阶段「未开始」样班（李青）：报名 2026-10-01 开始、首课 2026-11-05，保证招生阶段三个状态都有演示数据。
const readyPaintingClass = (() => {
  const sessions = publishedSessions('2026-11-05', { roomId: 'venue-art105', startTime: '16:45', endTime: '18:15', total: courseTotalHours('COURSE-CR-2026-0003') });
  return classRecord({ id: 'class-mock-ready-painting-01', name: '秋季少儿国画待招生1班', courseId: 'COURSE-CR-2026-0003', course: '少儿国画入门', major: '中国画', teacher: '李青', scheduleStatus: '已发布', enrollStart: '2026-10-01 09:00', deadline: '2026-10-31 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 4, weekdays: ['周四'], updatedAt: '2026-09-20 10:00' });
})();
export const classSeed = [
  ...pendingScheduleClasses,
  ...arrangingClasses,
  ...completedEnrollmentNotStarted,
  ...completedEnrollmentOngoing,
  ...completedEnrollmentEndedPending,
  ...completedEnrollmentEndedTeaching,
  ...completedEnrollmentEndedFinished,
  ...classSceneClasses,
  readyPaintingClass
];

export function cloneClassSeed() {
  return classSeed.map(item => ({ ...item, weekdays: [...(item.weekdays || [])], sessions: (item.sessions || []).map(session => ({ ...session })) }));
}
// 三端同源（CR-2026-132）：教务在后台调课／停课后写入演示状态，教师端与学员端必须读同一份数据，
// 否则会出现「学员端已显示停课、教师端仍显示待上课」的分叉。
// 本模块不直接读演示状态，由调用方把演示状态里的班级记录传进来，避免与 demo-store 形成循环依赖。
export function mergeClassSeed(overlay = []) {
  const byId = new Map(classSeed.map((item) => [item.id, { ...item }]));
  (overlay || []).forEach((item) => {
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
  });
  return [...byId.values()];
}