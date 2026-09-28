// 原型演示统一使用固定业务日期 2026-09-12（演示基准日）。
// 与课次状态派生（CR-2026-141 上课中=09-12）、场景设计（CR-2026-147 下一课=09-13 即“明天”）对齐；
// 不用运行机实时日期，避免教师端／后台／学员端因日期不同分叉，也避免已结课班级因动态日期而丢失“已结束／已结课”派生。
export const DEMO_TODAY = '2026-09-12';
const pad = (value) => String(value).padStart(2, '0');
export const DEMO_NOW = `${DEMO_TODAY} ${pad(10)}:${pad(0)}`;

export function demoDateTime(value = DEMO_TODAY) {
  return new Date(String(value).replace(' ', 'T'));
}
