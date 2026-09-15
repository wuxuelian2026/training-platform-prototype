// 状态源统一索引：页面说明的「状态与流转」小节只从这里取数，不再从页面 .tag 反推状态。
//
// 数据来源：PRD/开发实施PRD/05-状态字典.md（30 台状态机）。
// 消费方：shared/js/admin-shell.js（后台）、shared/js/page-help.js（小程序两端与登录页）、
//        check-page-spec.mjs（跨对象串状态与出图一致性校验）。
// 派生字段（教师能力、证书有效性、合同期限、物资库存状态）不在这里登记，也不渲染状态段。
import { STATE_MACHINES as SYSTEM_STATES } from './system.js';
import { STATE_MACHINES as TEACHER_STATES } from './teachers.js';
import { STATE_MACHINES as COURSE_STATES } from './courses.js';
import { STATE_MACHINES as MALL_STATES } from './mall.js';
import { STATE_MACHINES as ORDER_STATES } from './orders.js';
import { STATE_MACHINES as CRM_STATES } from './crm.js';
import { STATE_MACHINES as LEARNER_STATES } from './learner.js';
import { STATE_MACHINES as FINANCE_STATES } from './finance.js';
import { STATE_MACHINES as ACADEMIC_STATES } from './academic.js';

export const STATE_MACHINE_MODULES = [
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

export const STATE_MACHINES = STATE_MACHINE_MODULES.flatMap((entry) => entry.machines);

export const machineById = (id) => STATE_MACHINES.find((machine) => machine.id === id) || null;

// 页面命中：决定该页状态段展示哪些状态机（对照表口径）。
export const machinesForPage = (pageKey) => STATE_MACHINES.filter((machine) => (machine.pages || []).includes(pageKey));

export const stateLabelsOf = (machine) => (machine.states || []).map((state) => state[1]);

// 全库状态取值 → 所属状态机编号，用于“出现 spec/states 之外的状态取值即失败”的校验。
export const stateLabelIndex = () => {
  const index = new Map();
  STATE_MACHINES.forEach((machine) => {
    stateLabelsOf(machine).forEach((label) => {
      if (!index.has(label)) index.set(label, []);
      index.get(label).push(machine.id);
    });
  });
  return index;
};
