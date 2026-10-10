(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 字段规格统一索引：把各模块的字段规格汇总，供页面说明、PRD 生成和原型输入校验共同使用。
// 新增模块时在 FIELD_MODULES 里挂上即可，不要在各消费方单独维护页面清单。
const { TEACHER_FIELD_SPEC } = __classicRequire("spec/fields/teachers.js");
const { INVENTORY_FIELD_SPEC } = __classicRequire("spec/fields/inventory.js");
const { SYSTEM_FIELD_SPEC } = __classicRequire("spec/fields/system.js");
const { MALL_FIELD_SPEC } = __classicRequire("spec/fields/mall.js");
const { CRM_FIELD_SPEC } = __classicRequire("spec/fields/crm.js");
const { COURSE_FIELD_SPEC } = __classicRequire("spec/fields/courses.js");
const { FINANCE_FIELD_SPEC } = __classicRequire("spec/fields/finance.js");
const { ACADEMIC_FIELD_SPEC } = __classicRequire("spec/fields/academic.js");
const { TEACHER_APP_FIELD_SPEC } = __classicRequire("spec/fields/teacher.js");
const { LEARNER_APP_FIELD_SPEC } = __classicRequire("spec/fields/learner.js");
const { ADMIN_FIELD_SPEC } = __classicRequire("spec/fields/admin.js");
const { pageTypeOf } = __classicRequire("spec/pages/page-types.js");
const FIELD_MODULES = [
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
const PAGE_FIELD_SPECS = Object.fromEntries(
  FIELD_MODULES.flatMap((module) => Object.entries(module.pages))
);
const fieldsOfPage = (pageKey) =>
  (PAGE_FIELD_SPECS[pageKey]?.groups || []).flatMap((group) => group.fields);
const allSpecFields = () =>
  Object.entries(PAGE_FIELD_SPECS).flatMap(([pageKey, page]) =>
    page.groups.flatMap((group) => group.fields.map((field) => ({ ...field, pageKey, group: group.heading })))
  );

// 结构化字段 → 页面说明表格结构（五列固定为：参数名 / 类型 / 长度 / 是否必填 / 说明）
// 字段规格的补充说明挂在哪一节取决于页面类型：只有表单页才叫「提交与校验说明」，
// 列表、详情、配置页应挂在规则类小节下，否则会出现页面没有提交动作却写着提交校验的标题。
const NOTES_HEADINGS = {
  form: '提交与校验说明',
  list: '业务规则',
  detail: '业务规则',
  dashboard: '数据更新时机',
  config: '生效范围与影响'
};
const toPageSpec = (page, pageKey = '') => ({
  groups: [
    ...page.groups.map((group) => ({
      heading: group.heading,
      rows: group.fields.map((field) => [field.label, field.type, field.length, field.required, field.note])
    })),
    ...(page.notes?.length ? [{ heading: NOTES_HEADINGS[pageTypeOf(pageKey)] || '业务规则', items: page.notes }] : [])
  ]
});


__classicExports["FIELD_MODULES"] = FIELD_MODULES;
__classicExports["PAGE_FIELD_SPECS"] = PAGE_FIELD_SPECS;
__classicExports["fieldsOfPage"] = fieldsOfPage;
__classicExports["allSpecFields"] = allSpecFields;
__classicExports["toPageSpec"] = toPageSpec;
  __classicModules["spec/fields/index.js"] = __classicExports;
})(globalThis);
