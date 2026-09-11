// RM-F-01: one publishable-course catalog shared by the admin mall module and the learner app.
// Course ids here are the same ids the course library shows (course entity id / lightweight archive id).

export const courseCatalogSeed = [
  { id: 'COURSE-CR-2026-0002', name: '声乐演唱技巧', type: '视频课程', archive: '完整课程', status: '已完成', major: '声乐演唱', teacher: '陈晨', hours: 12 },
  { id: 'COURSE-006', name: '艺术歌曲示范课', type: '视频课程', archive: '完整课程', status: '已完成', major: '声乐演唱', teacher: '陈晨', hours: 8 },
  { id: 'COURSE-CR-2026-0001', name: '舞蹈基本功', type: '面授课程', archive: '完整课程', status: '已完成', major: '中国舞', teacher: '王玥', hours: 16 },
  { id: 'COURSE-CR-2026-0003', name: '少儿国画入门', type: '面授课程', archive: '完整课程', status: '已完成', major: '中国画', teacher: '李青', hours: 20 },
  { id: 'LIB-003', name: '少儿美术兴趣班', type: '面授课程', archive: '轻量课程档案', status: '不适用', major: '少儿绘画', teacher: '李青', hours: 20 },
  { id: 'LIB-004', name: '朗诵与主持基础', type: '面授课程', archive: '轻量课程档案', status: '不适用', major: '朗诵与主持', teacher: '赵可', hours: 16 }
];

export function cloneCourseCatalogSeed() {
  return courseCatalogSeed.map(item => ({ ...item }));
}
