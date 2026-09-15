#!/usr/bin/env node
// 由 spec/fields/ 生成 PRD 字段表，写入 PRD 中带标记的区间。
//
// 用法：
//   node scripts/build-prd-fields.mjs          写入生成结果
//   node scripts/build-prd-fields.mjs --check  只校验，生成结果与文件中不一致则失败（供检查脚本调用）
//   node scripts/build-prd-fields.mjs --stdout 打印生成结果，便于人工比对
//
// 生成区间的写法（放在 PRD 里，内容由本脚本维护，不要手改标记之间的内容）：
//   <!-- GENERATED:FIELDS teachers/create START -->
//   <!-- GENERATED:FIELDS teachers/create END -->

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(root, '../..');
const checkOnly = process.argv.includes('--check');
const toStdout = process.argv.includes('--stdout');

const { PAGE_FIELD_SPECS } = await import(pathToFileURL(path.join(root, 'spec/fields/index.js')).href);

// 页面 → PRD 文件与标记名
const PRD_TARGETS = [
  {
    pageKey: 'teachers/create',
    marker: 'FIELDS teachers/create',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/03-后台管理端-师资中心.md')
  },
  {
    pageKey: 'inventory/categories',
    marker: 'FIELDS inventory/categories',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/09-后台管理端-物资中心.md')
  },
  {
    pageKey: 'courses/catalog',
    marker: 'FIELDS courses/catalog',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/04-后台管理端-课程中心.md')
  },
  {
    pageKey: 'inventory/materials',
    marker: 'FIELDS inventory/materials',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/09-后台管理端-物资中心.md')
  },
  {
    pageKey: 'inventory/stock-in',
    marker: 'FIELDS inventory/stock-in',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/09-后台管理端-物资中心.md')
  },
  {
    pageKey: 'inventory/stock-out',
    marker: 'FIELDS inventory/stock-out',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/09-后台管理端-物资中心.md')
  },
  {
    pageKey: 'crm/classes',
    marker: 'FIELDS crm/classes',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/06-后台管理端-面授招生与CRM.md')
  },
  {
    pageKey: 'academic/scheduling',
    marker: 'FIELDS academic/scheduling',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/07-后台管理端-教务执行监管.md')
  },
  {
    pageKey: 'crm/trials',
    marker: 'FIELDS crm/trials',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/06-后台管理端-面授招生与CRM.md')
  },
  {
    pageKey: 'finance/refunds',
    marker: 'FIELDS finance/refunds',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/08-后台管理端-财务中心.md')
  },
  {
    pageKey: 'academic/messages',
    marker: 'FIELDS academic/messages',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/07-后台管理端-教务执行监管.md')
  },
  {
    pageKey: 'courses/application-review',
    marker: 'FIELDS courses/application-review',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/04-后台管理端-课程中心.md')
  },
  {
    pageKey: 'courses/resources',
    marker: 'FIELDS courses/resources',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/04-后台管理端-课程中心.md')
  },
  {
    pageKey: 'courses/library',
    marker: 'FIELDS courses/library',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/04-后台管理端-课程中心.md')
  },
  {
    pageKey: 'courses/display-info',
    marker: 'FIELDS courses/display-info',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/04-后台管理端-课程中心.md')
  },
  {
    pageKey: 'mall/products',
    marker: 'FIELDS mall/products',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/05-后台管理端-商城运营.md')
  },
  {
    pageKey: 'courses/content',
    marker: 'FIELDS courses/content',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/04-后台管理端-课程中心.md')
  },
  {
    pageKey: 'mall/banners',
    marker: 'FIELDS mall/banners',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/05-后台管理端-商城运营.md')
  },
  {
    pageKey: 'teacher/class-detail',
    marker: 'FIELDS teacher/class-detail',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/18-小程序-教师端.md')
  },
  {
    pageKey: 'learner/login',
    groupIndex: 0,
    marker: 'FIELDS learner/login#code',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/19-小程序-学员端.md')
  },
  {
    pageKey: 'learner/login',
    groupIndex: 1,
    marker: 'FIELDS learner/login#password',
    file: path.join(repoRoot, 'PRD/原始完整版PRD-拆分版/19-小程序-学员端.md')
  }
];

const renderTable = (fields) => [
  '| 字段 | 控件 | 长度 | 必填 | 说明 |',
  '| --- | --- | --- | --- | --- |',
  ...fields.map((field) => `| ${field.label} | ${field.type} | ${field.length} | ${field.required} | ${field.note} |`)
].join('\n');

// groupIndex 用于一个页面拆成多张表的情况（如登录页的验证码登录与密码登录）。
const renderPage = (page, groupIndex) => (groupIndex === undefined ? page.groups : [page.groups[groupIndex]])
  .map((group) => `**${group.heading}**：\n\n${renderTable(group.fields)}`)
  .join('\n\n');

const markersOf = (marker) => ({
  start: `<!-- GENERATED:${marker} START -->`,
  end: `<!-- GENERATED:${marker} END -->`
});

const results = [];

for (const target of PRD_TARGETS) {
  const page = PAGE_FIELD_SPECS[target.pageKey];
  if (!page) {
    results.push({ target, error: `spec 中找不到页面 ${target.pageKey}` });
    continue;
  }
  const generated = renderPage(page, target.groupIndex);
  if (toStdout) {
    process.stdout.write(`===== ${target.pageKey} =====\n${generated}\n\n`);
    continue;
  }

  const source = readFileSync(target.file, 'utf8');
  const { start, end } = markersOf(target.marker);
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex === -1 || endIndex === -1) {
    results.push({ target, error: `PRD 中缺少标记 ${start} / ${end}` });
    continue;
  }

  const current = source.slice(startIndex + start.length, endIndex).trim();
  const next = `${start}\n${generated}\n${end}`;
  const replaced = source.slice(0, startIndex) + next + source.slice(endIndex + end.length);

  if (current === generated.trim()) {
    results.push({ target, status: '已是最新' });
    continue;
  }
  if (checkOnly) {
    results.push({ target, status: '与 spec 不一致', drift: true });
    continue;
  }
  writeFileSync(target.file, replaced);
  results.push({ target, status: current ? '已更新' : '已生成' });
}

if (!toStdout) {
  for (const result of results) {
    if (result.error) process.stdout.write(`[错误] ${result.target.pageKey}：${result.error}\n`);
    else process.stdout.write(`[${result.status}] ${result.target.pageKey} → ${path.relative(repoRoot, result.target.file)}\n`);
  }
  const failed = results.filter((result) => result.error || result.drift);
  if (failed.length) {
    process.stdout.write(`\n有 ${failed.length} 处需要处理，请运行 node scripts/build-prd-fields.mjs 同步。\n`);
    process.exit(1);
  }
}
