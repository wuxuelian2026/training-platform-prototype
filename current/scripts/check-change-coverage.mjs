#!/usr/bin/env node
// 变更单 → 验收项覆盖检查（产品 2026-09-22 ③：流程止血）。
//
// 背景：变更单在快速累积，测试基线是天然滞后的一环——基线一度只引到 CR-2026-089，
// 而变更单已到 CR-2026-107。发布门禁挂在测试基线上，缺口会直接漏到验收环节。
//
// 规则：
//   1. 每张新变更单必须写明「对应验收项编号」，且编号要能在 12-测试与验收实施基线.md 中找到；
//   2. 历史变更单（本脚本首次运行时的存量）登记在 .legacy-no-tc.txt 中，不再要求补写，
//      它们的映射已由 12-测试与验收实施基线.md 第 9 节集中登记；
//   3. 缺编号时提示，不拦截（CR-2026-113 / 客户 2026-09-22 确认）：输出文件名＋问题＋补写指引，
//      退出码保持 0，避免并发新建变更单阻断整条 check:spec 与构建。
//
// 用法：npm run check:changes

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(root, '../..');
const changesDir = path.join(repoRoot, 'PRD/开发实施PRD/changes');
const baselineFile = path.join(repoRoot, 'PRD/开发实施PRD/12-测试与验收实施基线.md');
const legacyFile = path.join(changesDir, '.legacy-no-tc.txt');

if (!existsSync(changesDir)) {
  process.stdout.write('未找到变更单目录，跳过检查。\n');
  process.exit(0);
}

const changeOrders = readdirSync(changesDir)
  .filter((name) => name.endsWith('.md') && !name.includes('模板'))
  .sort();

// 编号唯一性与「文件名 ↔ 正文编号」一致性检查（2026-09-22，客户裁定：发现重复编号即非零退出）。
// 背景：曾出现 CR-2026-104／099／103／073／011／018 等同号两单，导致引用无法定位。
// 规则：
//   1. 同一编号（含 A／B 后缀整体）被两个及以上文件使用 → 判冲突并退出码 1，阻断 check:spec；
//   2. 母单加拆分件（如 CR-2026-109 与 CR-2026-109A／109B）属正常约定，不判冲突；
//   3. 文件名的编号与正文「变更单号／变更编号」不一致 → 提示不拦截（多为改号后漏改正文）。
const changeIdOf = (name) => {
  const match = name.match(/^(CR-\d{4}-\d+[A-Z]?)/);
  return match ? match[1] : null;
};
const filesById = new Map();
for (const name of changeOrders) {
  const id = changeIdOf(name);
  if (!id) continue;
  if (!filesById.has(id)) filesById.set(id, []);
  filesById.get(id).push(name);
}
const idConflicts = [...filesById.entries()].filter(([, files]) => files.length > 1);
const idMismatches = [];
for (const name of changeOrders) {
  const id = changeIdOf(name);
  if (!id) continue;
  const declared = readFileSync(path.join(changesDir, name), 'utf8')
    .match(/-\s*(?:变更单号|变更编号)[：:]\s*(CR-\d{4}-\d+[A-Z]?)/);
  if (declared && declared[1] !== id) {
    idMismatches.push(`${name}：正文写 ${declared[1]}，文件名是 ${id}（改号后请同步正文）`);
  }
}
if (idConflicts.length) {
  process.stdout.write(`变更单编号冲突 ${idConflicts.length} 处（阻断）：\n`);
  idConflicts.forEach(([id, files]) => {
    process.stdout.write(`  - ${id} 被 ${files.length} 个文件同时使用：\n`);
    files.forEach((file) => process.stdout.write(`      · ${file}\n`));
  });
  process.stdout.write('处理方式：为其中一张改号（取当前未占用的最小号），并同步文件名、正文「变更单号」与跨文档引用。\n');
  process.exit(1);
}

const legacy = existsSync(legacyFile)
  ? new Set(readFileSync(legacyFile, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean))
  : null;

// 首次运行（没有存量清单）时，把当前变更单登记为历史存量，之后只约束新变更单。
if (!legacy) {
  writeFileSync(legacyFile, `${changeOrders.join('\n')}\n`, 'utf8');
  process.stdout.write(`已登记 ${changeOrders.length} 张历史变更单为存量（${path.relative(root, legacyFile)}），本次不拦截。\n`);
  process.exit(0);
}

const baseline = existsSync(baselineFile) ? readFileSync(baselineFile, 'utf8') : '';
const knownCases = new Set([...baseline.matchAll(/TC-[A-Z0-9-]+/g)].map((match) => match[0]));

const problems = [];
for (const name of changeOrders) {
  if (legacy.has(name)) continue;
  const text = readFileSync(path.join(changesDir, name), 'utf8');
  const declared = [...new Set([...text.matchAll(/TC-[A-Z0-9-]+/g)].map((match) => match[0]))];
  if (!declared.length) {
    problems.push(`${name}：未写「对应验收项编号」，请在影响评估中补 TC 编号（只改文案写 TC-PAGE-SPEC-001）`);
    continue;
  }
  declared.filter((id) => !knownCases.has(id)).forEach((id) => {
    problems.push(`${name}：验收项 ${id} 在 12-测试与验收实施基线.md 中不存在，请先在基线补用例再引用`);
  });
}

process.stdout.write(`变更单覆盖检查（存量 ${changeOrders.filter((n) => legacy.has(n)).length} 张豁免，本次校验 ${changeOrders.length - changeOrders.filter((n) => legacy.has(n)).length} 张）\n`);
process.stdout.write(`变更单编号唯一性检查通过（共 ${filesById.size} 个编号，无同号多单）。\n`);
if (idMismatches.length) {
  process.stdout.write(`\n编号与文件名不一致 ${idMismatches.length} 处（提示，不拦截）：\n`);
  idMismatches.forEach((problem) => process.stdout.write(`  - ${problem}\n`));
}
if (problems.length) {
  // CR-2026-113：并发新建变更单缺编号时只提示，不再阻断 check:spec 与构建（退出码保持 0）。
  process.stdout.write(`\n待补登记 ${problems.length} 处（提示，不拦截）：\n`);
  problems.forEach((problem) => process.stdout.write(`  - ${problem}\n`));
  process.stdout.write('提示：以上变更单在补写有效验收项编号前不作为发布门禁对象；补齐后本提示自动消失。\n');
  process.exit(0);
}
process.stdout.write('检查通过：新增变更单均已声明有效验收项编号。\n');
