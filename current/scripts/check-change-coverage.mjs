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
//   3. 只删不改：缺编号时直接失败并提示补写位置。
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
if (problems.length) {
  process.stdout.write(`\n未通过 ${problems.length} 处：\n`);
  problems.forEach((problem) => process.stdout.write(`  - ${problem}\n`));
  process.exit(1);
}
process.stdout.write('检查通过：新增变更单均已声明有效验收项编号。\n');
