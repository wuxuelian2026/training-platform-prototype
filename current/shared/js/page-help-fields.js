// 后台页面说明的字段表。键是相对 /admin/pages/ 的页面路径。
//
// 字段事实源分工：
//   - spec/fields/*.js：已完成结构化迁移的模块（目前是师资中心）。字段带稳定编号 FD-* 与机器可读约束，
//     页面说明表格由 toPageSpec 生成，后续 PRD 字段表与原型输入校验也从同一份数据派生。
//   - 本文件中的字面量条目：尚未迁移的页面，仅承载页面说明文案，属于过渡状态。
// 新增或修改字段口径时，优先补到 spec/fields/ 下对应模块，不要再往本文件加字面量字段表。
//
// 通用长度口径（PRD 未定义时使用）：姓名 2-30 字、短文本 ≤50 字、多行文本 ≤500 字、
// 富文本 ≤2000 字、备注 ≤200 字、邮箱 ≤64 字符、银行卡号 16-19 位。
import { PAGE_FIELD_SPECS, toPageSpec } from '../../spec/fields/index.js';

export const FIELD_PAGE_COLUMNS = ['参数名', '类型', '长度', '是否必填', '说明'];

const STRUCTURED_PAGE_TABLES = Object.fromEntries(
  Object.entries(PAGE_FIELD_SPECS).map(([pageKey, page]) => [pageKey, toPageSpec(page, pageKey)])
);

// 过渡态容器：所有页面都已迁移到 spec/fields/，这里保持空对象。
// 若临时新增未迁移页面，可在此登记；检查脚本会把「字面量与结构化同时定义同一页面」判为重复定义。
export const LITERAL_PAGE_TABLES = {};

// 已迁移到 spec/fields/ 的模块优先；同一页面若同时存在字面量与结构化定义，
// 以结构化规格为准，并由 `npm run check:page-spec` 报出重复定义。
export const PAGE_FIELD_TABLES = { ...LITERAL_PAGE_TABLES, ...STRUCTURED_PAGE_TABLES };
