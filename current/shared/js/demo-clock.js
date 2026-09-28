// 原型演示统一使用固定业务日期，避免教师端、后台与学员端因运行机器日期不同而分叉。
// 演示时钟与本地实际日期保持一致，避免课表“今天”、课次状态和执行事实各自使用不同日期。
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
export const DEMO_TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
export const DEMO_NOW = `${DEMO_TODAY} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

export function demoDateTime(value = DEMO_TODAY) {
  return new Date(String(value).replace(' ', 'T'));
}
