#!/usr/bin/env node
// 把 shared/js/page-help-fields.js 里剩余的字面量字段表迁移为 spec/fields/ 下的结构化规格。
//
// 用法：node scripts/migrate-literal-fields.mjs [--dry]
//   --dry  只打印将要生成的模块文件，不写盘
//
// 迁移规则：
//   - 按页面路径前缀分模块（inventory / system / mall / crm / courses / finance / academic）。
//   - 每个字段分配稳定编号 FD-<模块>-<三位序号>，分配后不再复用。
//   - 机器约束从“长度/类型/必填”文案推导，保证与页面说明完全一致。
//   - 字段文案原样搬运，迁移后渲染结果应与迁移前逐字一致。
// 迁移完成后本脚本可重复运行：没有字面量时直接退出。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dryRun = process.argv.includes('--dry');
const sourceIndex = process.argv.indexOf('--source');
const sourceFile = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : path.join(root, 'shared/js/page-help-fields.js');

const { LITERAL_PAGE_TABLES } = await import(pathToFileURL(sourceFile).href);

const MODULE_OF_PREFIX = {
  inventory: { file: 'inventory.js', exportName: 'INVENTORY_FIELD_SPEC', label: '物资中心', idPrefix: 'INVENTORY' },
  system: { file: 'system.js', exportName: 'SYSTEM_FIELD_SPEC', label: '系统管理', idPrefix: 'SYSTEM' },
  mall: { file: 'mall.js', exportName: 'MALL_FIELD_SPEC', label: '商城运营', idPrefix: 'MALL' },
  crm: { file: 'crm.js', exportName: 'CRM_FIELD_SPEC', label: '面授招生与CRM', idPrefix: 'CRM' },
  courses: { file: 'courses.js', exportName: 'COURSE_FIELD_SPEC', label: '课程中心', idPrefix: 'COURSE' },
  finance: { file: 'finance.js', exportName: 'FINANCE_FIELD_SPEC', label: '财务中心', idPrefix: 'FINANCE' },
  academic: { file: 'academic.js', exportName: 'ACADEMIC_FIELD_SPEC', label: '教务执行监管', idPrefix: 'ACADEMIC' }
};

// 由“长度/类型/必填”文案推导机器可读约束，规则与 spec/README.md 保持一致。
export const deriveConstraints = (length, type, required) => {
  const value = String(length || '');
  const constraints = {};
  let matched;
  if ((matched = value.match(/^(\d+)\s*[–\-~]\s*(\d+)\s*字$/))) {
    constraints.minLength = Number(matched[1]);
    constraints.maxLength = Number(matched[2]);
  } else if ((matched = value.match(/^≤\s*(\d+)\s*[字]$/))) {
    constraints.maxLength = Number(matched[1]);
  } else if ((matched = value.match(/^≤\s*(\d+)\s*字符$/))) {
    constraints.maxLength = Number(matched[1]);
  } else if ((matched = value.match(/^(\d+)\s*[–\-~]\s*(\d+)\s*位数字$/))) {
    constraints.maxLength = Number(matched[2]);
    constraints.pattern = `^\\d{${matched[1]},${matched[2]}}$`;
  } else if ((matched = value.match(/^(\d+)\s*位数字$/))) {
    constraints.maxLength = Number(matched[1]);
    // 11 位手机号用更严格的号段规则，避免覆盖页面已有的精确校验
    constraints.pattern = Number(matched[1]) === 11 ? '^1[3-9]\\d{9}$' : `^\\d{${matched[1]}}$`;
  } else if ((matched = value.match(/^(\d+)\s*[–\-~]\s*(\d+)\s*位$/))) {
    constraints.minLength = Number(matched[1]);
    constraints.maxLength = Number(matched[2]);
  } else if ((matched = value.match(/^(\d+)\s*位$/))) {
    constraints.maxLength = Number(matched[1]);
  } else if ((matched = value.match(/^大于\s*(\d+)$/))) {
    constraints.exclusiveMin = Number(matched[1]);
  } else if ((matched = value.match(/^(\d+)\s*及以上整数$/))) {
    constraints.min = Number(matched[1]);
    constraints.integer = true;
  } else if ((matched = value.match(/^至少\s*(\d+)\s*[个门]$/))) {
    constraints.minItems = Number(matched[1]);
  } else if ((matched = value.match(/^≥\s*(\d+)\s*位$/))) {
    // “≥ 8 位”是密码下限，不是长度上限
    constraints.minLength = Number(matched[1]);
  } else if ((matched = value.match(/^≥\s*(\d+)[，,]\s*保留\s*(\d+)\s*位小数$/))) {
    constraints.min = Number(matched[1]);
    constraints.decimals = Number(matched[2]);
  } else if ((matched = value.match(/^(\d+)\s*[–\-~]\s*(\d+)$/))) {
    // 纯数值区间（分钟、小时、百分比），不是文本长度
    constraints.min = Number(matched[1]);
    constraints.max = Number(matched[2]);
  } else if (/^YYYY-MM-DD HH:mm$/.test(value)) {
    constraints.format = 'YYYY-MM-DD HH:mm';
  } else if (/^YYYY-MM-DD$/.test(value)) {
    constraints.format = 'YYYY-MM-DD';
  } else if (/^YYYY-MM$/.test(value)) {
    constraints.format = 'YYYY-MM';
  } else if (/^HH:mm$/.test(value)) {
    constraints.format = 'HH:mm';
  }
  if (String(required || '').includes('系统')) constraints.system = true;
  if (String(type || '').includes('只读')) constraints.readOnly = true;
  return constraints;
};

const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const hasConstraints = (constraints) => Object.keys(constraints).length > 0;
const renderConstraints = (constraints) => `{ ${Object.entries(constraints).map(([key, value]) => `${key}: ${typeof value === 'string' ? quote(value) : value}`).join(', ')} }`;

const buckets = new Map();
for (const [pageKey, spec] of Object.entries(LITERAL_PAGE_TABLES)) {
  const prefix = pageKey.split('/')[0];
  const module = MODULE_OF_PREFIX[prefix];
  if (!module) {
    process.stdout.write(`[跳过] ${pageKey}：没有对应的模块定义\n`);
    continue;
  }
  if (!buckets.has(prefix)) buckets.set(prefix, []);
  buckets.get(prefix).push([pageKey, spec]);
}

if (buckets.size === 0) {
  process.stdout.write('没有需要迁移的字面量字段表。\n');
  process.exit(0);
}

for (const [prefix, entries] of buckets) {
  const module = MODULE_OF_PREFIX[prefix];
  let sequence = 0;
  const pages = entries.map(([pageKey, spec]) => {
    const groups = [];
    const notes = [];
    for (const group of spec.groups || []) {
      if (Array.isArray(group.items)) {
        notes.push(...group.items);
        continue;
      }
      const fields = group.rows.map((row) => {
        const [label, type, length, required, note] = row;
        sequence += 1;
        const constraints = deriveConstraints(length, type, required);
        return { id: `FD-${module.idPrefix}-${String(sequence).padStart(3, '0')}`, label, type, length, required, note, constraints };
      });
      groups.push({ heading: group.heading, fields });
    }
    return { pageKey, groups, notes };
  });

  const body = pages.map(({ pageKey, groups, notes }) => `    ${quote(pageKey)}: {
      groups: [
${groups.map((group) => `        { heading: ${quote(group.heading)}, fields: [
${group.fields.map((field) => `          { id: ${quote(field.id)}, label: ${quote(field.label)}, type: ${quote(field.type)}, length: ${quote(field.length)}, required: ${quote(field.required)}, note: ${quote(field.note)}${hasConstraints(field.constraints) ? `, constraints: ${renderConstraints(field.constraints)}` : ''} }`).join(',\n')}
        ] }`).join(',\n')}
      ]${notes.length ? `,
      notes: [
${notes.map((note) => `        ${quote(note)}`).join(',\n')}
      ]` : ''}
    }`).join(',\n');

  const content = `// ${module.label}字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 \`npm run check:spec\` 校验一致性。

export const ${module.exportName} = {
  module: ${quote(module.label)},
  pages: {
${body}
  }
};
`;

  const target = path.join(root, 'spec/fields', module.file);
  if (dryRun) {
    process.stdout.write(`\n===== ${module.file}（${pages.length} 页）=====\n${content}\n`);
    continue;
  }
  writeFileSync(target, content);
  process.stdout.write(`[已生成] spec/fields/${module.file}：${pages.length} 个页面，${pages.reduce((n, page) => n + page.groups.reduce((m, group) => m + group.fields.length, 0), 0)} 个字段\n`);
}
