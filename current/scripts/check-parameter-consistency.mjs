#!/usr/bin/env node
// 全局业务参数一致性检查（产品 2026-09-22 ⑥：关键口径仍有 8～12 处重复表述）。
//
// 单一登记处：`PRD/原始完整版PRD-拆分版/12-后台管理端-全局业务规则.md` 2.6.1「全局业务参数（单一登记表）」。
//
// 本脚本做两件事，避免同一数值散落在十个文件里靠人工同步：
//   1. 硬失败：登记为「可配置」的参数，不允许在其它文档里被写成「不可配置／固定为／固定规则」——
//      这正是本轮出现过的口径分叉（支付时限一度被写成固定 30 分钟）。
//   2. 提示（不阻断）：统计每个参数的取值在多少个文件里被复述，出现面过大时提醒改为引用参数表。
//
// 用法：npm run check:params

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(root, '../..');
const tableFile = path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/12-后台管理端-全局业务规则.md');
const docDirs = ['PRD/原始完整版PRD-拆分版', 'PRD/开发实施PRD'];
const ALLOWED_FILES = new Set(['12-后台管理端-全局业务规则.md', '05-状态字典.md', '12-测试与验收实施基线.md']);

if (!existsSync(tableFile)) {
  process.stdout.write('未找到全局参数表，跳过检查。\n');
  process.exit(0);
}

const tableText = readFileSync(tableFile, 'utf8');
const tableStart = tableText.indexOf('#### 2.6.1 全局业务参数');
const rows = [];
if (tableStart >= 0) {
  tableText.slice(tableStart).split('\n').forEach((line) => {
    if (!line.startsWith('|')) return;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 6 || cells[0] === '参数名' || /^-+$/.test(cells[0])) return;
    rows.push({
      name: cells[0],
      key: cells[1],
      defaultValue: cells[2],
      configurable: /^可配置/.test(cells[3]),
      entry: cells[4],
      keywords: [...new Set(cells[0].split(/[／/、，,]/).map((part) => part.trim()).filter((part) => part.length >= 2))],
      // 数值复述的判定针：默认值文案本身（如「7 个自然日」「10MB」「45／60／90／120／150」）。
      // 只提参数名不算复述数值，避免把「难度等级是课程级教学属性」这类正常引用计成重复。
      valueNeedles: (cells[2].match(/\d[\d.／/–\-]*\s*(?:分钟|个自然日|天|课时|次|小时|MB|GB|%|格)?/g) || [])
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
      numeric: (cells[2].match(/\d+(\.\d+)?/) || [])[0] || ''
    });
  });
}

if (!rows.length) {
  process.stdout.write('全局参数表为空或格式不符，跳过检查。\n');
  process.exit(0);
}

const markdownFiles = docDirs
  .filter((dir) => existsSync(path.join(repoRoot, dir)))
  .flatMap((dir) => readdirSync(path.join(repoRoot, dir))
    .filter((name) => name.endsWith('.md'))
    .map((name) => ({ dir, name, file: path.join(repoRoot, dir, name) })));

const problems = [];
const spread = new Map(rows.map((row) => [row.key, new Set()]));
const FIXED_WORDS = /不可配置|固定为|固定规则|固定常量|不可调整/;
// 「参数配置边界／固定规则边界」这类标题里的“固定规则”不是对某个参数下结论，比较时排除。
const FIXED_WORDS_IGNORE = /固定规则边界|参数配置边界|固定规则（不提供配置）/;

for (const { name, file } of markdownFiles) {
  if (ALLOWED_FILES.has(name)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    rows.forEach((row) => {
      const needles = [...row.keywords, row.key].filter(Boolean);
      // 只在参数名附近的窗口内判定“固定／不可配置”，避免同一行里另一参数（例如时间轴固定）造成误报。
      const WINDOW = 16;
      let hit = false;
      let conflict = '';
      needles.forEach((needle) => {
        let from = line.indexOf(needle);
        while (from >= 0) {
          hit = true;
          const window = line.slice(Math.max(0, from - WINDOW), from + needle.length + WINDOW);
          if (row.configurable && !FIXED_WORDS_IGNORE.test(window) && FIXED_WORDS.test(window) && !conflict) conflict = window.trim();
          from = line.indexOf(needle, from + needle.length);
        }
      });
      if (!hit) return;
      // 只有「参数名 + 默认值」出现在同一行，才算复述数值；单纯引用参数名不计入复述面。
      const restatesValue = row.valueNeedles.some((needle) => line.includes(needle));
      if (restatesValue) spread.get(row.key).add(name);
      if (conflict) {
        problems.push(`${name}:${index + 1} 参数「${row.name}」登记为可配置，但邻近写法像固定规则：…${conflict.slice(0, 46)}…`);
      }
    });
  });
}

// 实现类文档（接口契约、数据库模型、测试基线、状态字典、系统管理页说明）按性质必须带具体数值，
// 单列出来，避免把「实现需要」误读成「重复维护」；业务模块文档才提示改为引用参数表。
const IMPLEMENTATION_DOCS = /^(09-接口契约|10-数据库模型与约束|12-测试与验收实施基线|05-状态字典|10-后台管理端-系统管理|07-异常处理实施要求|08-需求与验收追踪矩阵|13-迭代1原型评审基线与整改清单)\.md$/;
const crowded = [...spread.entries()].filter(([, files]) => files.size > 4);


process.stdout.write(`全局参数一致性检查（登记 ${rows.length} 个参数，扫描 ${markdownFiles.length} 个文档）\n`);
if (crowded.length) {
  process.stdout.write('\n复述面偏大的参数（建议改为引用 12 §2.6.1，不阻断）：\n');
  crowded.sort((a, b) => b[1].size - a[1].size).forEach(([key, files]) => {
    const business = [...files].filter((name) => !IMPLEMENTATION_DOCS.test(name));
    const implementation = files.size - business.length;
    process.stdout.write(`  - ${key}：出现在 ${files.size} 个文件（业务模块 ${business.length}、实现类 ${implementation}）\n`);
    if (business.length) process.stdout.write(`      业务模块待改引用：${business.join('、')}\n`);
  });
}
if (problems.length) {
  process.stdout.write(`\n口径冲突 ${problems.length} 处：\n`);
  problems.forEach((problem) => process.stdout.write(`  - ${problem}\n`));
  process.exit(1);
}
process.stdout.write('\n检查通过：参数「可配置／固定规则」口径一致，未发现冲突表述。\n');
