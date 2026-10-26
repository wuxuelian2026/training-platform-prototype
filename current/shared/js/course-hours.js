(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 面授班级课时口径（2026-09-23 客户裁定；2026-10-23 CR-2026-155 C2/C3 修订）：
// 单节课时长固定 45 分钟；班级总课时（学时）以所引用课程在课程库的总课时为准。
// 课次与课时为倍数关系：课次数 = 总课时（学时）÷ 每次连上节数；单次实际上课时长 = 45 分钟 × 连上节数。
// 本表是班级种子与校验脚本共用的课时来源；课程库侧同名课程档案（course-seed / course-display）
// 必须与之保持一致，`npm run check:spec`（check-course-hours）逐班校验「班级总课时 = 课程库课时」，
// 并按连上节数校验「课次数 × 连上节数 ≈ 总课时」。
const COURSE_TOTAL_HOURS = {
  'COURSE-CR-2026-0001': 16, // 舞蹈基本功（待排课/排课中演示班引用）
  'COURSE-MOCK-1063': 12, // 芭蕾舞进阶训练
  'COURSE-CR-2026-0003': 20, // 少儿国画入门
  'COURSE-MOCK-1003': 12, // 中国舞进阶训练
  'COURSE-MOCK-1033': 12, // 钢琴进阶训练
  'COURSE-MOCK-1053': 12 // 少儿绘画进阶训练
};
function courseTotalHours(courseId, fallback = 8) {
  const value = Number(COURSE_TOTAL_HOURS[courseId]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}


__classicExports["courseTotalHours"] = courseTotalHours;
__classicExports["COURSE_TOTAL_HOURS"] = COURSE_TOTAL_HOURS;
  __classicModules["shared/js/course-hours.js"] = __classicExports;
})(globalThis);
