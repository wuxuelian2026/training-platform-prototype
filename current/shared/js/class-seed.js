// Canonical offline-class seed shared by the admin CRM and the learner app.
// P0-1: one class entity keeps one primary key, one name and one enrollment count on both ends.
// P0-2: `fast` decides the learner entry: 是 -> 快速报名, 否 -> 精品课程.

export const classSeed = [
  {
    id: 'class-001', courseId: 'COURSE-CR-2026-0001', archive: '完整课程',
    name: '少儿中国舞基础班', className: '2026秋季中国舞启蒙一班', course: '舞蹈基本功', courseName: '少儿中国舞基础',
    batch: '秋季', season: '秋季', teacher: '王玥', category: '舞蹈类',
    professional: '中国舞', discipline: '舞蹈', field: '舞蹈表演', level: '初级', age: '少儿', lessons: 16,
    campus: '龙泉校区', classroom: '综合楼302', schedule: '每周六 09:00-10:30', weekday: '周六', startTime: '09:00', endTime: '10:30', firstLessonDate: '2026-09-12',
    price: '1680.00', deadline: '2026-09-30 23:59', enrolled: 17, capacity: 20,
    status: '招生中', display: '已展示', fast: '否', created: '2026-08-28'
  },
  {
    id: 'class-002', courseId: 'LIB-003', archive: '轻量课程档案',
    name: '少儿美术兴趣班', className: '2026秋季少儿美术兴趣班', course: '少儿美术兴趣班', courseName: '少儿美术兴趣班',
    batch: '秋季', season: '秋季', teacher: '李青', category: '美术类',
    professional: '少儿绘画', discipline: '绘画', field: '少儿绘画', level: '启蒙', age: '少儿', lessons: 20,
    campus: '南湖校区', classroom: '美术楼103', schedule: '每周日 14:00-15:30', weekday: '周日', startTime: '14:00', endTime: '15:30', firstLessonDate: '2026-09-13',
    price: '2280.00', deadline: '2026-09-25 23:59', enrolled: 15, capacity: 15,
    status: '已满员', display: '已展示', fast: '否', created: '2026-08-18'
  },
  {
    id: 'class-003', courseId: 'COURSE-CR-2026-0001', archive: '完整课程',
    name: '少儿中国舞提高班', className: '2026秋季中国舞提高二班', course: '舞蹈基本功', courseName: '少儿中国舞提高',
    batch: '秋季', season: '秋季', teacher: '王玥', category: '舞蹈类',
    professional: '中国舞', discipline: '舞蹈', field: '舞蹈表演', level: '初级', age: '少儿', lessons: 16,
    campus: '南湖校区', classroom: '形体教室105', schedule: '每周日 10:00-11:30', weekday: '周日', startTime: '10:00', endTime: '11:30', firstLessonDate: '2026-09-13',
    price: '1880.00', deadline: '2026-10-08 23:59', enrolled: 13, capacity: 18,
    status: '招生中', display: '已展示', fast: '是', created: '2026-08-30'
  },
  {
    id: 'class-004', courseId: 'COURSE-CR-2026-0003', archive: '完整课程',
    name: '国画入门工作坊', className: '2026秋季国画入门工作坊', course: '少儿国画入门', courseName: '少儿国画入门',
    batch: '秋季', season: '秋季', teacher: '李青', category: '美术类',
    professional: '中国画', discipline: '绘画', field: '中国画', level: '启蒙', age: '少儿', lessons: 20,
    campus: '南湖校区', classroom: '美术楼103', schedule: '每周六 14:00-15:30', weekday: '周六', startTime: '14:00', endTime: '15:30', firstLessonDate: '2026-09-12',
    price: '2280.00', deadline: '2026-10-15 23:59', enrolled: 0, capacity: 16,
    status: '未发布', display: '未发布', fast: '是', created: '2026-09-09'
  }
];

export function cloneClassSeed() {
  return classSeed.map(item => ({ ...item }));
}
