#!/usr/bin/env node
// PRD 字段表 与 字段规格 的对齐审计。
//
// 用途：在把某个页面的 PRD 字段表改为「由规格生成」之前，先确认两边字段集一致。
// 字段集不一致时直接生成会静默增删需求字段，因此必须先对齐再接线。
//
// 用法：node scripts/audit-field-alignment.mjs
// 输出：每张 PRD 字段表 → 最匹配的规格页面，以及 PRD 独有 / 规格独有 / 命名差异。

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(root, '../..');
const prdDir = path.join(repoRoot, 'PRD/原始完整版PRD-拆分版');

const { PAGE_FIELD_SPECS } = await import(pathToFileURL(path.join(root, 'spec/fields/index.js')).href);

const specLabelsOf = (pageKey) =>
  (PAGE_FIELD_SPECS[pageKey]?.groups || []).flatMap((group) => group.fields.map((field) => field.label));

const readPrdTables = () => {
  const tables = [];
  for (const file of readdirSync(prdDir).filter((name) => name.endsWith('.md')).sort()) {
    const lines = readFileSync(path.join(prdDir, file), 'utf8').split('\n');
    // 已被生成接管（带 GENERATED 标记）的区间不参与审计，它们本来就以规格为准。
    const generatedRanges = [];
    lines.forEach((line, index) => {
      if (/<!-- GENERATED:.* START -->/.test(line)) generatedRanges.push([index, Infinity]);
      if (/<!-- GENERATED:.* END -->/.test(line) && generatedRanges.length) generatedRanges[generatedRanges.length - 1][1] = index;
    });
    const inGenerated = (index) => generatedRanges.some(([start, end]) => index >= start && index <= end);
    lines.forEach((line, index) => {
      if (inGenerated(index)) return;
      const numbered = /^\| *序号 *\| *字段名 *\|/.test(line);
      const plain = /^\| *字段 *\|/.test(line);
      if (!numbered && !plain) return;
      const names = [];
      for (let cursor = index + 2; cursor < lines.length; cursor += 1) {
        const row = lines[cursor];
        if (!row.startsWith('|')) break;
        const cells = row.split('|').map((cell) => cell.trim()).filter((cell) => cell !== '');
        if (!cells.length) break;
        names.push(numbered ? cells[1] : cells[0]);
      }
      if (names.length) tables.push({ file, line: index + 1, numbered, names });
    });
  }
  return tables;
};

// 列表页/查询表/状态表不是表单字段字典，不参与对齐。
const NON_FORM_HINT = /操作$|状态$|单号$|编号$/;
const isFormDictionary = (names) => names.filter((name) => NON_FORM_HINT.test(name)).length === 0;

const overlap = (a, b) => {
  const setB = new Set(b);
  return a.filter((name) => setB.has(name)).length;
};

const tables = readPrdTables();
const report = [];

// PRD 文件前缀 → 允许匹配的规格模块前缀，避免跨模块误配（如课程中心的表配到物资分类）。
const MODULE_OF_FILE = { '03': 'teachers', '04': 'courses', '05': 'mall', '06': 'crm', '07': 'academic', '08': 'finance', '09': 'inventory' };

for (const table of tables) {
  const allowedPrefix = MODULE_OF_FILE[table.file.slice(0, 2)];
  const candidates = allowedPrefix
    ? Object.keys(PAGE_FIELD_SPECS).filter((pageKey) => pageKey.startsWith(allowedPrefix + '/'))
    : [];
  let best = null;
  for (const pageKey of candidates) {
    const labels = specLabelsOf(pageKey);
    const hits = overlap(table.names, labels);
    const ratio = hits / Math.min(table.names.length, labels.length || 1);
    if (!best || ratio > best.ratio) best = { pageKey, labels, hits, ratio };
  }
  const matched = best && best.ratio >= 0.6;
  report.push({
    table,
    formLike: isFormDictionary(table.names),
    pageKey: matched ? best.pageKey : null,
    ratio: best ? best.ratio : 0,
    prdOnly: matched ? table.names.filter((name) => !best.labels.includes(name)) : [],
    specOnly: matched ? best.labels.filter((label) => !table.names.includes(label)) : []
  });
}

const formTables = report.filter((entry) => entry.formLike);
const matchedTables = formTables.filter((entry) => entry.pageKey);
const aligned = matchedTables.filter((entry) => entry.prdOnly.length === 0 && entry.specOnly.length === 0);
const divergent = matchedTables.filter((entry) => entry.prdOnly.length > 0 || entry.specOnly.length > 0);
const unmatched = formTables.filter((entry) => !entry.pageKey);

const line = (value) => process.stdout.write(`${value}\n`);
line(`字段对齐审计：PRD 共 ${tables.length} 张表，其中表单字段字典 ${formTables.length} 张`);
line('');
line(`已匹配到规格页面 ${matchedTables.length} 张：一致 ${aligned.length} 张，有差异 ${divergent.length} 张`);
line(`未匹配到规格页面 ${unmatched.length} 张（多为列表页查询表或教师端页面）`);
line('');

if (aligned.length) {
  line('可以直接接入生成的表：');
  for (const entry of aligned) line(`  - ${entry.table.file} L${entry.table.line} → ${entry.pageKey}（${entry.table.names.length} 字段）`);
  line('');
}

if (divergent.length) {
  line('字段集有差异，需要先对齐再生成：');
  for (const entry of divergent) {
    line(`  - ${entry.table.file} L${entry.table.line} → ${entry.pageKey}`);
    if (entry.prdOnly.length) line(`      PRD 有、规格没有：${entry.prdOnly.join('、')}`);
    if (entry.specOnly.length) line(`      规格有、PRD 没有：${entry.specOnly.join('、')}`);
  }
  line('');
}

if (unmatched.length) {
  line('未匹配的表（样例）：');
  for (const entry of unmatched.slice(0, 8)) line(`  - ${entry.table.file} L${entry.table.line}：${entry.table.names.slice(0, 5).join('、')}…`);
  if (unmatched.length > 8) line(`  … 其余 ${unmatched.length - 8} 张省略`);
}
