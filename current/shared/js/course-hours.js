// 面授班级课时口径（2026-09-23 客户裁定）：
// 班级总课时以「班级所引用课程」在课程库的总课时为准，一个课时对应一个课次。
// 本表是班级种子与校验脚本共用的课时来源；课程库侧的同名课程档案（course-seed / course-display）
// 必须与之保持一致，`npm run check:spec` 会逐班校验「班级课时 = 课次数 = 课程库课时」。
export const COURSE_TOTAL_HOURS = {
  'COURSE-CR-2026-0001': 16, // 舞蹈基本功（待排课/排课中演示班引用）
  'COURSE-MOCK-1063': 12, // 芭蕾舞进阶训练
  'COURSE-CR-2026-0003': 20, // 少儿国画入门
  'COURSE-MOCK-1003': 12, // 中国舞进阶训练
  'COURSE-MOCK-1033': 12, // 钢琴进阶训练
  'COURSE-MOCK-1053': 12 // 少儿绘画进阶训练
};

export function courseTotalHours(courseId, fallback = 8) {
  const value = Number(COURSE_TOTAL_HOURS[courseId]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
