# 字段规格目录

本目录是**字段口径的唯一事实源**。页面说明、后续的产品 PRD 字段表、原型输入校验都从同一份数据派生。

## 目录结构

```
spec/
  fields/
    index.js        统一索引：汇总各模块规格，供三个消费方共用
    teachers.js     师资中心字段规格（已迁移，结构化 + 稳定编号）
  README.md
```

尚未迁移的模块，其字段表暂时仍以字面量形式存放在 `shared/js/page-help-fields.js`，属于过渡状态。

原孤儿规格 `courses/display-info` 已按 GT-12／PC-06 处置：**不再保留独立页面键**，六个展示字段只在 `spec/fields/courses.js` 顶部定义一次（`COURSE_TEACHING_FIELDS`／`COURSE_DISPLAY_FIELDS`），由 `spec/fields/mall.js`（`mall/products`）与 `spec/fields/crm.js`（`crm/classes`）用 `courseFieldRows()` 引用，避免同一字段组多处维护（总控 2026-09-16 v1.40 登记）。

## 字段定义约定

### 表单结构：分步还是合并

按表单复杂度决定，不搞一刀切：

| 表单 | 结构 | 规格写法 | 例子 |
| --- | --- | --- | --- |
| 复杂表单 | **必须分步** | `layout: 'steps'`，每个 group 就是一整步 | 发布班级（5 步）、新增教师（7 个分组） |
| 简易表单 | 可以合并 | 默认单表，一个 group 一张表 | 物资分类、专业目录、新建轻量课程档案 |

判断依据是字段规模与是否含系统校验、定价、排课等多阶段动作。分步表单在 PRD 里按步输出多张表，界面也按步呈现；简易表单合并成一张表，避免拆得过碎。

```js
{
  id: 'FD-TEACHER-002',        // 稳定编号，跨文档引用用；文案调整不要改编号
  label: '姓名',                // 参数名
  type: '文本',                 // 类型
  length: '2–30 字',            // 长度（给人和页面说明看的文案）
  required: '是',               // 是否必填：是 / 否 / 条件必填 / 系统生成 / 系统取值
  note: '用于教师列表、档案、课表和结算展示',
  constraints: { minLength: 2, maxLength: 30 }   // 机器可读约束，供校验与后续生成使用
}
```

`length` 是人读的文案，`constraints` 是机器读的约束，两者必须一致；不一致时 `npm run check:page-spec` 会报错。

常用约束键：`maxLength`、`minLength`、`pattern`、`options`、`dictionary`、`format`、`min`、`max`、`exclusiveMin`、`decimals`、`integer`、`boolean`、`readOnly`、`system`、`minItems`、`maxFiles`、`requiredWhen`、`sourceField`、`afterField`、`unique`。

只读镜像字段用 `sourceField` 指向源字段，约束自动继承，不要在自身重复声明。

## 日常工作流

1. 改字段：只改 `spec/fields/<模块>.js`，不要动页面说明里的表格。
2. 跑校验：`npm run check:spec`。包含两项：
   - `check:page-spec`：编号唯一性、字段属性完整性、长度文案与约束是否一致、是否与字面量字段表重复定义、页面说明是否与页面源码文案重复。
   - `check:prd-fields`：PRD 里的生成区间是否与规格一致（不一致说明有人手改了生成内容或忘记重新生成）。
3. 同步生成物：`npm run build:prd-fields` 重新生成 PRD 字段表；页面说明与原型输入约束不需要额外生成，运行时自动生效。

## 三个消费方

| 消费方 | 取值方式 | 产物 |
| --- | --- | --- |
| 后台页面说明 | `page-help-fields.js` 调用 `toPageSpec` | 说明弹窗里的字段表 |
| 产品 PRD 字段表 | `scripts/build-prd-fields.mjs` | 拆分版 PRD 标记区间内的表格 |
| 原型输入约束 | `shared/js/field-constraints.js` 运行时应用 | 控件的 `maxlength` / `pattern` / `min` |

原型输入约束按字段容器的标签文本匹配，因此静态 HTML 和运行时渲染的弹窗表单都能覆盖；只读与系统字段不施加输入限制。

## 编号规则

`FD-<模块大写>-<三位序号>`，例如 `FD-TEACHER-002`。编号一经分配不再复用，字段下线时保留编号并标注弃用。
