(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 状态源统一索引：页面说明的「状态与流转」小节只从这里取数，不再从页面 .tag 反推状态。
//
// 数据来源：PRD/开发实施PRD/05-状态字典.md（30 台状态机）。
// 消费方：shared/js/admin-shell.js（后台）、shared/js/page-help.js（小程序两端与登录页）、
//        check-page-spec.mjs（跨对象串状态与出图一致性校验）。
// 派生字段（教师能力、证书有效性、合同期限、物资库存状态）不在这里登记，也不渲染状态段。
const { STATE_MACHINES: SYSTEM_STATES } = __classicRequire("spec/states/system.js");
const { STATE_MACHINES: TEACHER_STATES } = __classicRequire("spec/states/teachers.js");
const { STATE_MACHINES: COURSE_STATES } = __classicRequire("spec/states/courses.js");
const { STATE_MACHINES: MALL_STATES } = __classicRequire("spec/states/mall.js");
const { STATE_MACHINES: ORDER_STATES } = __classicRequire("spec/states/orders.js");
const { STATE_MACHINES: CRM_STATES } = __classicRequire("spec/states/crm.js");
const { STATE_MACHINES: LEARNER_STATES } = __classicRequire("spec/states/learner.js");
const { STATE_MACHINES: FINANCE_STATES } = __classicRequire("spec/states/finance.js");
const { STATE_MACHINES: ACADEMIC_STATES } = __classicRequire("spec/states/academic.js");
const STATE_MACHINE_MODULES = [
  { module: 'system', machines: SYSTEM_STATES },
  { module: 'teachers', machines: TEACHER_STATES },
  { module: 'courses', machines: COURSE_STATES },
  { module: 'mall', machines: MALL_STATES },
  { module: 'orders', machines: ORDER_STATES },
  { module: 'crm', machines: CRM_STATES },
  { module: 'learner', machines: LEARNER_STATES },
  { module: 'finance', machines: FINANCE_STATES },
  { module: 'academic', machines: ACADEMIC_STATES }
];
const STATE_MACHINES = STATE_MACHINE_MODULES.flatMap((entry) => entry.machines);
const machineById = (id) => STATE_MACHINES.find((machine) => machine.id === id) || null;

// 页面命中：决定该页状态段展示哪些状态机（对照表口径）。
const machinesForPage = (pageKey) => STATE_MACHINES.filter((machine) => (machine.pages || []).includes(pageKey));
const stateLabelsOf = (machine) => (machine.states || []).map((state) => state[1]);

// 全库状态取值 → 所属状态机编号，用于“出现 spec/states 之外的状态取值即失败”的校验。
const stateLabelIndex = () => {
  const index = new Map();
  STATE_MACHINES.forEach((machine) => {
    stateLabelsOf(machine).forEach((label) => {
      if (!index.has(label)) index.set(label, []);
      index.get(label).push(machine.id);
    });
  });
  return index;
};


__classicExports["STATE_MACHINE_MODULES"] = STATE_MACHINE_MODULES;
__classicExports["STATE_MACHINES"] = STATE_MACHINES;
__classicExports["machineById"] = machineById;
__classicExports["machinesForPage"] = machinesForPage;
__classicExports["stateLabelsOf"] = stateLabelsOf;
__classicExports["stateLabelIndex"] = stateLabelIndex;
  __classicModules["spec/states/index.js"] = __classicExports;
})(globalThis);
