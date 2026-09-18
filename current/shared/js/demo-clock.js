// 原型演示统一使用固定业务日期，避免教师端、后台与学员端因运行机器日期不同而分叉。
export const DEMO_TODAY = '2026-09-12';
export const DEMO_NOW = `${DEMO_TODAY} 10:00`;

export function demoDateTime(value = DEMO_TODAY) {
  return new Date(String(value).replace(' ', 'T'));
}
