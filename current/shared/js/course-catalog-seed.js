// RM-F-01: one publishable-course catalog shared by the admin mall module and the learner app.
// Course ids here are the same ids the course library shows (course entity id / lightweight archive id).
import { courseMockSeed } from './course-seed.js';

export const courseCatalogSeed = [
  { id: 'COURSE-CR-2026-0002', name: '声乐演唱技巧', type: '视频课程', archive: '完整课程', status: '已完成', major: '声乐演唱', teacher: '陈晨', hours: 12 },
  { id: 'COURSE-006', name: '艺术歌曲示范课', type: '视频课程', archive: '完整课程', status: '已完成', major: '声乐演唱', teacher: '陈晨', hours: 8 },
  { id: 'COURSE-VIDEO-DEMO-001', name: '童声合唱入门', type: '视频课程', archive: '完整课程', status: '已完成', major: '童声合唱', teacher: '陈晨', hours: 8 },
  { id: 'COURSE-VIDEO-DEMO-002', name: '钢琴即兴伴奏基础', type: '视频课程', archive: '完整课程', status: '已完成', major: '钢琴', teacher: '林月', hours: 10 },
  { id: 'COURSE-VIDEO-DEMO-003', name: '少儿水彩画入门', type: '视频课程', archive: '完整课程', status: '已完成', major: '少儿绘画', teacher: '李青', hours: 6 },
  { id: 'COURSE-VIDEO-DEMO-004', name: '朗诵表达进阶', type: '视频课程', archive: '完整课程', status: '已完成', major: '朗诵与主持', teacher: '邓琪', hours: 8 },
  { id: 'COURSE-VIDEO-DEMO-005', name: '古筝经典小曲演奏', type: '视频课程', archive: '完整课程', status: '已完成', major: '古筝', teacher: '周宁', hours: 9 },
  { id: 'COURSE-CR-2026-0001', name: '舞蹈基本功', type: '面授课程', archive: '完整课程', status: '已完成', major: '中国舞', teacher: '王玥', hours: 16 },
  { id: 'COURSE-CR-2026-0003', name: '少儿国画入门', type: '面授课程', archive: '完整课程', status: '已完成', major: '中国画', teacher: '李青', hours: 20 },
  { id: 'LIB-003', name: '少儿美术兴趣班', type: '面授课程', archive: '轻量课程档案', major: '少儿绘画', teacher: '李青', hours: 20 },
  { id: 'LIB-004', name: '朗诵与主持基础', type: '面授课程', archive: '轻量课程档案', major: '朗诵与主持', teacher: '赵可', hours: 16 },
  ...courseMockSeed().filter((course) => course.status === '已完成').map((course) => ({
    id: course.id,
    name: course.name,
    type: course.type,
    archive: '完整课程',
    status: course.status,
    major: course.major,
    teacher: course.teacher,
    hours: course.hours,
    difficulty: course.difficulty,
    ages: [...course.ages]
  }))
];

export function cloneCourseCatalogSeed() {
  return courseCatalogSeed.map(item => ({ ...item }));
}
