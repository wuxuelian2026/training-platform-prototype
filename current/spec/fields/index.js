// 字段规格统一索引：把各模块的字段规格汇总，供页面说明、PRD 生成和原型输入校验共同使用。
// 新增模块时在 FIELD_MODULES 里挂上即可，不要在各消费方单独维护页面清单。
import { TEACHER_FIELD_SPEC } from './teachers.js';
import { INVENTORY_FIELD_SPEC } from './inventory.js';
import { SYSTEM_FIELD_SPEC } from './system.js';
import { MALL_FIELD_SPEC } from './mall.js';
import { CRM_FIELD_SPEC } from './crm.js';
import { COURSE_FIELD_SPEC } from './courses.js';
import { FINANCE_FIELD_SPEC } from './finance.js';
import { ACADEMIC_FIELD_SPEC } from './academic.js';
import { TEACHER_APP_FIELD_SPEC } from './teacher.js';
import { LEARNER_APP_FIELD_SPEC } from './learner.js';
import { ADMIN_FIELD_SPEC } from './admin.js';

export const FIELD_MODULES = [
  TEACHER_FIELD_SPEC,
  INVENTORY_FIELD_SPEC,
  SYSTEM_FIELD_SPEC,
  MALL_FIELD_SPEC,
  CRM_FIELD_SPEC,
  COURSE_FIELD_SPEC,
  FINANCE_FIELD_SPEC,
  ACADEMIC_FIELD_SPEC,
  TEACHER_APP_FIELD_SPEC,
  LEARNER_APP_FIELD_SPEC,
  ADMIN_FIELD_SPEC
];

export const PAGE_FIELD_SPECS = Object.fromEntries(
  FIELD_MODULES.flatMap((module) => Object.entries(module.pages))
);

export const fieldsOfPage = (pageKey) =>
  (PAGE_FIELD_SPECS[pageKey]?.groups || []).flatMap((group) => group.fields);

export const allSpecFields = () =>
  Object.entries(PAGE_FIELD_SPECS).flatMap(([pageKey, page]) =>
    page.groups.flatMap((group) => group.fields.map((field) => ({ ...field, pageKey, group: group.heading })))
  );

// 结构化字段 → 页面说明表格结构（五列固定为：参数名 / 类型 / 长度 / 是否必填 / 说明）
export const toPageSpec = (page) => ({
  groups: [
    ...page.groups.map((group) => ({
      heading: group.heading,
      rows: group.fields.map((field) => [field.label, field.type, field.length, field.required, field.note])
    })),
    ...(page.notes?.length ? [{ heading: '提交与校验说明', items: page.notes }] : [])
  ]
});
