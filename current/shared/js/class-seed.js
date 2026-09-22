// Canonical offline-class seed shared by the admin CRM and the learner app.
// P0-1: one class entity keeps one primary key, one name and one enrollment count on both ends.
// CR-2026-044: legacy `fast` maps only to visibleInFastChannel; it never changes bookability.

// CR-2026-056：面授班级阶段状态 Mock 数据。
// 排课阶段：待排课 3 条、排课中 3 条、已完成 15 条。
// 已完成排课的 15 条再按招生状态分为未开始 3 条、进行中 3 条、已结束 9 条；
// 招生已结束的 9 条按教学状态分为待开课、授课中、已结课各 3 条。
const publishedSessions = (firstDate, total = 8) => Array.from({ length: total }, (_, index) => {
  const date = new Date(`${firstDate}T00:00:00+08:00`);
  date.setDate(date.getDate() + index * 7);
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    index: index + 1,
    date: localDate,
    weekday: `周${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`,
    startTime: '09:00',
    endTime: '10:30',
    start: '09:00',
    end: '10:30',
    lessonDuration: 90,
    roomId: 'venue-201',
    status: '待上课'
  };
});

const classRecord = ({ id, name, courseId = 'COURSE-CR-2026-0001', course = '舞蹈基本功', teacher = '王玥', major = '中国舞', scheduleStatus, enrollStart = '', deadline = '', firstLessonDate = '', sessions = [], enrolled = 0, capacity = 20, recommended = false, updatedAt = '2026-09-17 10:00' }) => ({
  id,
  name,
  courseId,
  course,
  courseVersion: 1,
  professional: major,
  teacher,
  batch: '秋季',
  capacity,
  enrolled,
  price: 1680,
  scheduleStatus,
  scheduleVersion: scheduleStatus === '已发布' ? 1 : 0,
  schedule: scheduleStatus === '已发布' ? '每周六 09:00-10:30' : '',
  weekdays: scheduleStatus === '已发布' ? ['周六'] : [],
  firstLessonDate,
  lessonDuration: 90,
  lessons: sessions.length || 8,
  sessions,
  displayStatus: scheduleStatus === '已发布' ? '显示' : '隐藏',
  display: scheduleStatus === '已发布' ? '已展示' : '未发布',
  visibleInFastChannel: scheduleStatus === '已发布',
  fast: scheduleStatus === '已发布' ? '是' : '否',
  recommended,
  enrollStart,
  deadline,
  enrollmentClosed: false,
  trialEnabled: '是',
  trialFee: '否',
  trialPrice: '',
  trialNote: '请联系课程顾问了解试听安排。',
  status: scheduleStatus === '草稿' ? '排班草稿' : scheduleStatus === '已发布' ? '招生中' : '待排课',
  campus: '南湖校区',
  classroom: '音乐楼201',
  roomId: 'venue-201',
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

const completedEnrollmentNotStarted = [1, 2, 3].map(index => {
  const sessions = publishedSessions('2026-11-07');
  return classRecord({ id: `class-mock-ready-${String(index).padStart(2, '0')}`, name: `秋季中国舞待招生${index}班`, scheduleStatus: '已发布', enrollStart: '2026-10-01 09:00', deadline: '2026-10-31 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 2, updatedAt: '2026-09-20 10:00' });
});

const completedEnrollmentOngoing = [1, 2, 3].map(index => {
  const sessions = publishedSessions('2026-10-10');
  return classRecord({ id: `class-mock-enrolling-${String(index).padStart(2, '0')}`, name: `秋季中国舞招生中${index}班`, scheduleStatus: '已发布', enrollStart: '2026-09-01 09:00', deadline: '2026-10-01 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 6, recommended: index === 1, updatedAt: '2026-09-18 10:00' });
});

const completedEnrollmentEndedPending = [1, 2, 3].map(index => {
  const sessions = publishedSessions('2026-11-14');
  return classRecord({ id: `class-mock-ended-pending-${String(index).padStart(2, '0')}`, name: `秋季中国舞已截止待开课${index}班`, scheduleStatus: '已发布', enrollStart: '2026-08-20 09:00', deadline: '2026-09-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 12, updatedAt: '2026-09-15 10:00' });
});

const completedEnrollmentEndedTeaching = [1, 2, 3].map(index => {
  const sessions = publishedSessions('2026-09-10');
  return classRecord({ id: `class-mock-ended-teaching-${String(index).padStart(2, '0')}`, name: `秋季中国舞已截止授课中${index}班`, scheduleStatus: '已发布', enrollStart: '2026-08-20 09:00', deadline: '2026-09-10 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 14, updatedAt: '2026-09-12 10:00' });
});

const completedEnrollmentEndedFinished = [1, 2, 3].map(index => {
  const sessions = publishedSessions('2026-07-04');
  return classRecord({ id: `class-mock-ended-finished-${String(index).padStart(2, '0')}`, name: `秋季中国舞已结课${index}班`, scheduleStatus: '已发布', enrollStart: '2026-06-01 09:00', deadline: '2026-09-01 23:59', firstLessonDate: sessions[0].date, sessions, enrolled: 18, updatedAt: '2026-08-30 10:00' });
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
