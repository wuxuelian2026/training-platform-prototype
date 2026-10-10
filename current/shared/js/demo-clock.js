(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 原型演示统一使用固定业务日期 2026-09-12（演示基准日）。
// 与课次状态派生（CR-2026-141 上课中=09-12）、场景设计（CR-2026-147 下一课=09-13 即“明天”）对齐；
// 不用运行机实时日期，避免教师端／后台／学员端因日期不同分叉，也避免已结课班级因动态日期而丢失“已结束／已结课”派生。
const DEMO_TODAY = '2026-09-12';
const pad = (value) => String(value).padStart(2, '0');
const DEMO_NOW = `${DEMO_TODAY} ${pad(10)}:${pad(0)}`;
function demoDateTime(value = DEMO_TODAY) {
  return new Date(String(value).replace(' ', 'T'));
}


__classicExports["demoDateTime"] = demoDateTime;
__classicExports["DEMO_TODAY"] = DEMO_TODAY;
__classicExports["DEMO_NOW"] = DEMO_NOW;
  __classicModules["shared/js/demo-clock.js"] = __classicExports;
})(globalThis);
