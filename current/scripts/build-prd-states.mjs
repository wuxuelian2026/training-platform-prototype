#!/usr/bin/env node
// 由 spec/states 生成拆分版 PRD 的状态机索引，写入带标记的区间。
//
// 用法：
//   node scripts/build-prd-states.mjs          写入生成结果
//   node scripts/build-prd-states.mjs --check  只校验，与 spec 不一致则失败（供检查脚本调用）
//
// 设计口径：状态取值与流转的权威来源是 PRD/开发实施PRD/05-状态字典.md 与 spec/states，
// 拆分版状态字典只保留索引（状态机、业务对象、承载页面、状态数量），不再复述枚举，
// 避免同一口径在两处维护后互相漂移。

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(root, '../..');
const checkOnly = process.argv.includes('--check');

const { STATE_MACHINES, stateLabelsOf } = await import(pathToFileURL(path.join(root, 'spec/states/index.js')).href);

const target = {
  marker: 'STATES index',
  file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/13-后台管理端-状态字典.md')
};

const renderIndex = () => [
  '| 状态机 | 业务对象 | 承载页面 | 状态数量 |',
  '| --- | --- | --- | --- |',
  ...STATE_MACHINES.map((machine) => `| ${machine.id} | ${machine.object} | ${(machine.pages || []).join('、') || '—'} | ${stateLabelsOf(machine).length} |`)
].join('\n');

const markersOf = (marker) => ({
  start: `<!-- GENERATED:${marker} START -->`,
  end: `<!-- GENERATED:${marker} END -->`
});

const source = readFileSync(target.file, 'utf8');
const { start, end } = markersOf(target.marker);
const startIndex = source.indexOf(start);
const endIndex = source.indexOf(end);

if (startIndex === -1 || endIndex === -1) {
  process.stdout.write(`[错误] PRD 中缺少标记 ${start} / ${end}\n`);
  process.exit(1);
}

const generated = renderIndex();
const current = source.slice(startIndex + start.length, endIndex).trim();

if (current === generated.trim()) {
  process.stdout.write(`[已是最新] 状态机索引（共 ${STATE_MACHINES.length} 台）→ ${path.relative(repoRoot, target.file)}\n`);
  process.exit(0);
}

if (checkOnly) {
  process.stdout.write(`[与 spec 不一致] 状态机索引 → ${path.relative(repoRoot, target.file)}\n`);
  process.stdout.write('请运行 node scripts/build-prd-states.mjs 同步。\n');
  process.exit(1);
}

const next = `${start}\n${generated}\n${end}`;
writeFileSync(target.file, source.slice(0, startIndex) + next + source.slice(endIndex + end.length));
process.stdout.write(`[已更新] 状态机索引（共 ${STATE_MACHINES.length} 台）→ ${path.relative(repoRoot, target.file)}\n`);
