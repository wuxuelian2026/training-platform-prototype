// Canonical offline-class seed shared by the admin CRM and the learner app.
// P0-1: one class entity keeps one primary key, one name and one enrollment count on both ends.
// 2026-09-22 裁定：移除「快速报名入口／快速频道开关」，学员端可见性只由展示状态决定。

import { venueSeed } from './venue-seed.js';

// CR-2026-056：面授班级阶段状态 Mock 数据。
// 排课阶段：待排课 3 条、排课中 3 条、已完成 15 条。
// 已完成排课的 15 条再按招生状态分为未开始 3 条、进行中 3 条、已结束 9 条；
// 招生已结束的 9 条按教学状态分为待开课、授课中、已结课各 3 条。
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

const classRecord = ({ id, name, courseId = 'COURSE-CR-2026-0001', course = '舞蹈基本功', teacher = '王玥', major = '中国舞', batch = '秋季', scheduleStatus, enrollStart = '', deadline = '', firstLessonDate = '', sessions = [], enrolled = 0, capacity = 20, recommended = false, weekdays = ['周六'], updatedAt = '2026-09-17 10:00' }) => ({
  id,
  name,
  courseId,
  course,
  courseVersion: 1,
  professional: major,
  teacher,
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
  lessons: sessions.length || 8,
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

const pendingScheduleClasses = [1, 2, 3].map(index => classRecord({
  id: `class-mock-pending-${String(index).padStart(2, '0')}`,
  name: `秋季中国舞待排课${index}班`,
  scheduleStatus: '待排课'
}));

const arrangingClasses = [1, 2, 3].map(index => classRecord({
  id: `class-mock-arranging-${String(index).padStart(2, '0')}`,
  name: `秋季中国舞排课中${index}班`,
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
  // 芭蕾舞（徐帆）：招生未开始，首课 2026-11-05。
  const sessions = publishedSessions('2026-11-05', slotOf(CLASS_SLOTS.ballet, index));
  return classRecord({ id: `class-mock-ready-${String(index).padStart(2, '0')}`, name: `秋季芭蕾舞待招生${index}班`, courseId: 'COURSE-MOCK-1063', course: '芭蕾舞进阶训练', major: '芭蕾舞', teacher: '徐帆', scheduleStatus: '已发布', enrollStart: '2026-10-01 09:00', deadline: '2026-10-31 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 2, weekdays: ['周四'], updatedAt: '2026-09-20 10:00' });
});

const completedEnrollmentOngoing = [1, 2, 3].map(index => {
  // 少儿国画（李青）：招生进行中，首课 2026-10-08；第 3 个班与舞蹈组重叠 15 分钟，用于演示同一学员的时间冲突。
  const sessions = publishedSessions('2026-10-08', slotOf(CLASS_SLOTS.painting, index));
  return classRecord({ id: `class-mock-enrolling-${String(index).padStart(2, '0')}`, name: `秋季少儿国画招生中${index}班`, courseId: 'COURSE-CR-2026-0003', course: '少儿国画入门', major: '中国画', teacher: '李青', scheduleStatus: '已发布', enrollStart: '2026-09-01 09:00', deadline: '2026-10-01 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 6, recommended: index === 1, weekdays: ['周四'], updatedAt: '2026-09-18 10:00' });
});

const completedEnrollmentEndedPending = [1, 2, 3].map(index => {
  // 中国舞（王玥）：招生已结束、待开课，首课 2026-10-08；组内 15 分钟跨校区衔接用于演示教师转场提示。
  const sessions = publishedSessions('2026-10-08', slotOf(CLASS_SLOTS.dance, index));
  return classRecord({ id: `class-mock-ended-pending-${String(index).padStart(2, '0')}`, name: `秋季中国舞已截止待开课${index}班`, courseId: 'COURSE-MOCK-1003', course: '中国舞进阶训练', major: '中国舞', teacher: '王玥', scheduleStatus: '已发布', enrollStart: '2026-08-20 09:00', deadline: '2026-09-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 12, weekdays: ['周四'], updatedAt: '2026-09-15 10:00' });
});

const completedEnrollmentEndedTeaching = [1, 2, 3].map(index => {
  // 钢琴（林悦）：首课 2026-09-03、末课 2026-10-22，演示当天为授课中；第 3 个班报名数超过琴房容量 20，用于演示超容量提示。
  const sessions = publishedSessions('2026-09-03', slotOf(CLASS_SLOTS.piano, index));
  return classRecord({ id: `class-mock-ended-teaching-${String(index).padStart(2, '0')}`, name: `秋季钢琴已截止授课中${index}班`, courseId: 'COURSE-MOCK-1033', course: '钢琴进阶训练', major: '钢琴', teacher: '林悦', scheduleStatus: '已发布', enrollStart: '2026-08-20 09:00', deadline: '2026-09-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: index === 3 ? 24 : 14, weekdays: ['周四'], updatedAt: '2026-09-12 10:00' });
});

const completedEnrollmentEndedFinished = [1, 2, 3].map(index => {
  // 少儿绘画（唐雯）：暑期批次，全部课次在 2026-08-20 结束。
  const sessions = publishedSessions('2026-07-02', slotOf(CLASS_SLOTS.sketch, index));
  return classRecord({ id: `class-mock-ended-finished-${String(index).padStart(2, '0')}`, name: `暑期少儿绘画已结课${index}班`, courseId: 'COURSE-MOCK-1053', course: '少儿绘画进阶训练', major: '少儿绘画', teacher: '唐雯', batch: '暑假', scheduleStatus: '已发布', enrollStart: '2026-06-01 09:00', deadline: '2026-08-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 18, weekdays: ['周四'], updatedAt: '2026-08-30 10:00' });
});
export const classSeed = [
  ...pendingScheduleClasses,
  ...arrangingClasses,
  ...completedEnrollmentNotStarted,
  ...completedEnrollmentOngoing,
  ...completedEnrollmentEndedPending,
  ...completedEnrollmentEndedTeaching,
  ...completedEnrollmentEndedFinished
];

export function cloneClassSeed() {
  return classSeed.map(item => ({ ...item, weekdays: [...(item.weekdays || [])], sessions: (item.sessions || []).map(session => ({ ...session })) }));
}
