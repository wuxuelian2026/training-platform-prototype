#!/usr/bin/env node
// 一致性检查：页面字段规格（shared/js/page-help-fields.js）与页面源码。
//
// 目的：让“同一句业务说明同时存在两处”“规格已声明但页面未落地”这类问题在提交前暴露，
// 而不是依靠人工记得同步。检查只读，不修改任何文件。
//
// 用法：npm run check:page-spec

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const specFile = path.join(root, 'shared/js/page-help-fields.js');
const pagesDir = path.join(root, 'admin/pages');
const SHORT_TEXT_LIMIT = 12;

const { FIELD_PAGE_COLUMNS, LITERAL_PAGE_TABLES, PAGE_FIELD_TABLES } = await import(pathToFileURL(specFile).href);
const { PAGE_FIELD_SPECS, allSpecFields } = await import(pathToFileURL(path.join(root, 'spec/fields/index.js')).href);
const { PAGE_HELP_CONTENT, PAGE_TYPES, SECTION_TEMPLATES } = await import(pathToFileURL(path.join(root, 'spec/pages/page-types.js')).href);
const { machinesForPage, stateLabelIndex, STATE_MACHINES } = await import(pathToFileURL(path.join(root, 'spec/states/index.js')).href);

const walkHtml = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walkHtml(full);
  return entry.name.endsWith('.html') ? [full] : [];
});

const pages = walkHtml(pagesDir).map((file) => ({
  file,
  key: path.relative(pagesDir, file).replace(/\.html$/, '').split(path.sep).join('/')
}));

// 教师端与学员端页面：用于判断规格页面是否有对应实现，键加端前缀避免与后台重名。
const walkEndPages = (dir, prefix) => (existsSync(dir) ? walkHtml(dir) : []).map((file) => ({
  file,
  key: `${prefix}/` + path.relative(dir, file).replace(/\.html$/, '').split(path.sep).join('/')
}));
const endPages = [
  ...walkEndPages(path.join(root, 'teacher/pages'), 'teacher'),
  ...walkEndPages(path.join(root, 'learner/pages'), 'learner')
];

const problems = [];
const warnings = [];

// 1) 规格格式：分组结构、列数、空值。
for (const [key, spec] of Object.entries(PAGE_FIELD_TABLES)) {
  if (!Array.isArray(spec?.groups) || spec.groups.length === 0) {
    problems.push(`[格式] ${key}：缺少 groups`);
    continue;
  }
  spec.groups.forEach((group, groupIndex) => {
    const label = `${key} 第${groupIndex + 1}组`;
    if (!String(group.heading || '').trim()) problems.push(`[格式] ${label}：缺少小节标题`);
    const hasRows = Array.isArray(group.rows);
    const hasItems = Array.isArray(group.items);
    if (hasRows === hasItems) {
      problems.push(`[格式] ${label}：rows 与 items 必须二选一`);
      return;
    }
    if (hasRows) {
      group.rows.forEach((row, rowIndex) => {
        const at = `${label} 第${rowIndex + 1}行`;
        if (!Array.isArray(row)) {
          problems.push(`[格式] ${at}：应为数组`);
          return;
        }
        if (row.length !== FIELD_PAGE_COLUMNS.length) {
          problems.push(`[格式] ${at}：列数应为 ${FIELD_PAGE_COLUMNS.length}，实际 ${row.length}`);
          return;
        }
        row.forEach((cell, cellIndex) => {
          if (!String(cell ?? '').trim()) problems.push(`[格式] ${at}「${FIELD_PAGE_COLUMNS[cellIndex]}」为空`);
        });
      });
    }
    if (hasItems) {
      group.items.forEach((item, itemIndex) => {
        if (!String(item ?? '').trim()) problems.push(`[格式] ${label} 第${itemIndex + 1}条：说明为空`);
      });
    }
  });
}

// 2) 覆盖度：哪些后台页面还没有字段规格。
// 1.5) 结构化字段规格：编号、必填属性、以及“长度文案是否真的落到机器可读约束”。
const ID_PATTERN = /^FD-[A-Z]+-\d{3}$/;
const lengthBoundsOf = (text) => {
  const value = String(text || '');
  // 只有带「字/位/字符」单位的才是文本长度；纯数值区间（30–240、0–100）和
  // 「保留 2 位小数」不是文本长度，「≥ 8 位」是下限而不是上限。
  if (/位小数/.test(value)) return null;
  if (/^≥\s*\d+\s*位$/.test(value)) return { min: Number(value.match(/\d+/)[0]) };
  let matched;
  if ((matched = value.match(/^(\d+)\s*[–\-~]\s*(\d+)\s*位数字$/))) return { min: Number(matched[1]), max: Number(matched[2]) };
  if ((matched = value.match(/^(\d+)\s*位数字$/))) return { max: Number(matched[1]) };
  if ((matched = value.match(/^(\d+)\s*[–\-~]\s*(\d+)\s*(?:字|字符|位)$/))) return { min: Number(matched[1]), max: Number(matched[2]) };
  if ((matched = value.match(/^≤?\s*(\d+)\s*(?:字|字符|位)$/))) return { max: Number(matched[1]) };
  return null;
};

const teacherFields = allSpecFields();
const seenIds = new Map();
for (const field of teacherFields) {
  const at = `${field.pageKey} / ${field.label}`;
  if (!ID_PATTERN.test(String(field.id || ''))) problems.push(`[编号] ${at}：字段编号格式应为 FD-模块-三位序号，实际 ${field.id}`);
  if (seenIds.has(field.id)) problems.push(`[编号] ${at}：字段编号 ${field.id} 与 ${seenIds.get(field.id)} 重复`);
  else seenIds.set(field.id, at);
  for (const key of ['label', 'type', 'length', 'required', 'note']) {
    if (!String(field[key] ?? '').trim()) problems.push(`[字段] ${at}：缺少 ${key}`);
  }
}

// 只读镜像字段（如“邀请手机号”取联系方式手机号）通过 sourceField 继承源字段约束，
// 不要求在自身重复声明 maxLength/pattern。
const fieldById = new Map(teacherFields.map((field) => [field.id, field]));
for (const field of teacherFields) {
  const bounds = lengthBoundsOf(field.length);
  if (!bounds) continue;
  const constraints = field.constraints || {};
  const inherited = constraints.sourceField ? (fieldById.get(constraints.sourceField)?.constraints || {}) : {};
  const effective = { ...inherited, ...constraints };
  // 只读与系统字段是展示值，不是可输入控件，不要求长度约束。
  if (effective.readOnly || effective.system) continue;
  const at = `${field.pageKey} / ${field.label}`;
  if (bounds.max !== undefined) {
    const covered = effective.maxLength === bounds.max || Boolean(effective.pattern);
    if (!covered) problems.push(`[约束] ${at}：长度写“${field.length}”，但缺少 maxLength=${bounds.max} 或等价 pattern`);
  }
  if (bounds.min !== undefined && effective.minLength === undefined && !effective.pattern) {
    problems.push(`[约束] ${at}：长度写“${field.length}”，但缺少 minLength=${bounds.min} 或等价 pattern`);
  }
}

const structuredKeys = new Set(Object.keys(PAGE_FIELD_SPECS));
const duplicatedDefinitions = Object.keys(LITERAL_PAGE_TABLES).filter((key) => structuredKeys.has(key));
for (const key of duplicatedDefinitions) {
  problems.push(`[重复定义] ${key}：字面量字段表与 spec/fields/ 结构化规格同时存在，请删除字面量条目`);
}

// 1.6) 开发实施 PRD 的边界：它定义接口/表结构，不应复述业务字段的长度口径。
// 规格里出现过的长度写法一旦出现在开发实施 PRD，说明业务口径被抄了第二份。
const repoRoot = path.resolve(root, '../..');
const devPrdFiles = [
  'PRD/开发实施PRD/09-接口契约.md',
  'PRD/开发实施PRD/10-数据库模型与约束.md'
];
const lengthIdioms = [...new Set(teacherFields.map((field) => String(field.length || '')))]
  .filter((value) => /\d\s*(字|字符|位)/.test(value));
for (const relative of devPrdFiles) {
  const absolute = path.join(repoRoot, relative);
  if (!existsSync(absolute)) continue;
  const content = readFileSync(absolute, 'utf8');
  for (const idiom of lengthIdioms) {
    if (content.includes(idiom)) problems.push(`[越界] ${path.basename(relative)} 出现业务长度口径“${idiom}”：业务字段定义应放在 spec/fields/，开发实施文档只写实现层命名与约束`);
  }
}

const specKeys = new Set(Object.keys(PAGE_FIELD_TABLES));
const pageKeys = new Set(pages.map((page) => page.key));
const uncovered = pages.map((page) => page.key).filter((key) => !specKeys.has(key));
// 端页面（teacher/、learner/）与根目录 login.html 也算已实现，避免误报孤儿规格。
for (const page of endPages) pageKeys.add(page.key);
if (existsSync(path.join(root, 'login.html'))) pageKeys.add('learner/login');
// 后台登录页同样位于 admin/ 根目录（不在 admin/pages/），单独登记避免误报孤儿规格。
if (existsSync(path.join(root, 'admin/login.html'))) pageKeys.add('admin/login');
const orphanSpecs = [...specKeys].filter((key) => !pageKeys.has(key));

// 2.5) 页面说明固定小节格式：每页必须有页面类型；写实口径的小节标题必须属于该类型的模板。
const typecoverageKeys = new Set([...pages.map((page) => page.key), ...endPages.map((page) => page.key)]);
// 跳转占位页（meta refresh / location.replace）不承载内容，不要求页面类型与说明规格。
const redirectPageKeys = new Set(pages
  .filter((page) => /http-equiv="refresh"|location\.replace\(/.test(readFileSync(page.file, 'utf8')))
  .map((page) => page.key));
redirectPageKeys.forEach((key) => typecoverageKeys.delete(key));
if (existsSync(path.join(root, 'login.html'))) typecoverageKeys.add('learner/login');
if (existsSync(path.join(root, 'admin/index.html'))) typecoverageKeys.add('admin/index');
if (existsSync(path.join(root, 'admin/login.html'))) typecoverageKeys.add('admin/login');
const typedPages = [...typecoverageKeys].filter((key) => PAGE_TYPES[key]);
const sectionFallbacks = [];
for (const key of typecoverageKeys) {
  if (PAGE_TYPES[key]) continue;
  problems.push(`[页面类型] ${key}：缺少 PAGE_TYPES 条目，页面说明无法按固定小节格式渲染`);
}
for (const [key, content] of Object.entries(PAGE_HELP_CONTENT)) {
  const type = PAGE_TYPES[key];
  if (!type) {
    problems.push(`[页面类型] ${key}：存在写实口径但 PAGE_TYPES 缺条目`);
    continue;
  }
  const allowed = SECTION_TEMPLATES[type] || [];
  Object.keys(content).forEach((title) => {
    if (!allowed.includes(title)) problems.push(`[小节] ${key}：小节「${title}」不属于 ${type} 模板（应为 ${allowed.join(' / ')}）`);
  });
  // 状态段由 spec/states 数据驱动，不在写实口径里重复；其余小节缺失时才走页面元素兜底。
  const statusTitle = allowed.find((title) => title === '状态' || title === '状态与流转');
  const missing = allowed.filter((title) => title !== statusTitle && !content[title]?.length);
  if (missing.length) sectionFallbacks.push(`${key}（${missing.join('、')}）`);
}

// 2.6) 状态段必须数据驱动：状态取值只允许来自该页命中的状态机，写实口径里不得再复述状态段。
for (const [key, content] of Object.entries(PAGE_HELP_CONTENT)) {
  ['状态', '状态与流转'].forEach((title) => {
    if (content[title]?.length) problems.push(`[状态段] ${key}：状态段由 spec/states 渲染（本页命中 ${machinesForPage(key).map((machine) => machine.id).join('、') || '无状态机'}），不要在写实口径里重复状态取值`);
  });
}
const knownPageKeys = new Set([...pageKeys, ...endPages.map((page) => page.key), 'admin/index', 'admin/login', 'learner/login', 'learner/index', 'teacher/index']);
for (const machine of STATE_MACHINES) {
  (machine.pages || []).forEach((pageKey) => {
    if (!knownPageKeys.has(pageKey)) problems.push(`[状态机] ${machine.id}：承载页面 ${pageKey} 不存在`);
  });
}

// 2.7) diagram: true 的状态机必须在 05-状态字典里能找到对应状态机图。
const dictionaryPath = path.join(repoRoot, 'PRD/开发实施PRD/05-状态字典.md');
if (existsSync(dictionaryPath)) {
  const dictionary = readFileSync(dictionaryPath, 'utf8');
  const sections = new Map();
  const headingPattern = /^### [\d.]+\s+(SM-[A-Z-]+)/gm;
  const matches = [...dictionary.matchAll(headingPattern)];
  matches.forEach((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : dictionary.length;
    sections.set(match[1], dictionary.slice(start, end));
  });
  // 2026-09-16：SM-ROLE / SM-BANNER / SM-ADMIN-ACCOUNT 均已写入 05-状态字典 §12（见 §12.3 与 §12.5），
  // 原具名豁免已取消；所有状态机必须能在字典找到小节，出图标记仍需与字典一致。
  const DICTIONARY_EXEMPT = new Set();
  for (const machine of STATE_MACHINES) {
    if (!sections.has(machine.id)) {
      if (!DICTIONARY_EXEMPT.has(machine.id)) problems.push(`[状态图] ${machine.id}：05-状态字典中找不到该状态机小节`);
      continue;
    }
    // 只认独立成行的 `**状态机图**` 标记；正文里的“不输出状态机图”不算。
    const hasDiagram = /\*\*状态机图\*\*/.test(sections.get(machine.id));
    if (machine.diagram && !hasDiagram) problems.push(`[状态图] ${machine.id}：标记出图但 05-状态字典中没有状态机图`);
    if (!machine.diagram && hasDiagram) problems.push(`[状态图] ${machine.id}：标记不出图但 05-状态字典中存在状态机图`);
  }
}

// 3) 重复文案：规格里的说明是否又写在页面 HTML 或该页自己的模块里。
// placeholder / aria-label / title 是控件本身的可用性提示（属于 UI），不是第二份业务说明，
// 比对前先剔除，避免把正常的输入提示误判成重复文案。
const stripUiAttributes = (text) => String(text).replace(/\s(?:placeholder|aria-label|data-placeholder|data-aria-label|title)="[^"]*"/g, ' ');

const pageSource = new Map();
for (const page of pages) {
  const html = readFileSync(page.file, 'utf8');
  const parts = [stripUiAttributes(html)];
  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const target = path.resolve(path.dirname(page.file), match[1]);
    if (!existsSync(target)) continue;
    if (target.endsWith('admin-shell.js') || target.endsWith('page-help-fields.js')) continue;
    parts.push(stripUiAttributes(readFileSync(target, 'utf8')));
  }
  pageSource.set(page.key, parts.join('\n'));
}

const specTextsOf = (spec) => {
  const texts = [];
  for (const group of spec.groups || []) {
    for (const item of group.items || []) texts.push(String(item));
    for (const row of group.rows || []) {
      if (Array.isArray(row) && row.length > 0) texts.push(String(row[row.length - 1]));
    }
  }
  return texts;
};

const duplicated = [];
for (const [key, spec] of Object.entries(PAGE_FIELD_TABLES)) {
  const source = pageSource.get(key);
  if (!source) continue;
  const hits = specTextsOf(spec)
    .map((text) => text.trim())
    .filter((text) => text.length >= SHORT_TEXT_LIMIT && source.includes(text));
  if (hits.length) duplicated.push({ key, count: hits.length, sample: hits.slice(0, 2) });
}

// 4) 落地提示：规格声明了长度，页面源码里有没有对应约束。
const constraintHits = (source) => (source.match(/maxlength\s*=|pattern\s*=/g) || []).length;
for (const [key, spec] of Object.entries(PAGE_FIELD_TABLES)) {
  const source = pageSource.get(key);
  if (!source) continue;
  const lengthRows = (spec.groups || [])
    .flatMap((group) => group.rows || [])
    .filter((row) => Array.isArray(row) && /(\d|≤|≥)/.test(String(row[2] || ''))).length;
  const constraints = constraintHits(source);
  if (lengthRows > constraints) {
    warnings.push(`${key}：规格声明 ${lengthRows} 个长度约束，页面源码仅有 ${constraints} 个 maxlength/pattern`);
  }
}

// 5) 页面里不应再保留「靠 CSS 隐藏、只给页面说明弹窗供词」的注释元素。
//    说明内容已经统一到 spec/ 与页面说明弹窗，页面源码里再出现同一句话就是第二个家。
//    允许保留的例外：.warning 提示、空态与错误态文案。
const RETIRED_SOURCE_PATTERNS = [
  { label: '筛选头说明 span', re: /<div class="(?:filter-head|course-filter-head)"><strong>[^<]*<\/strong><span>/g },
  { label: 'ops-note 说明', re: /<p class="ops-note">/g },
  { label: 'system-note 说明', re: /<p class="system-note">/g },
  { label: 'sales-form-note 说明', re: /sales-form-note/g },
  { label: 'page-help-rule 说明', re: /page-help-rule/g },
  { label: 'page-help-source 类', re: /page-help-source/g },
  { label: '排班表单标题说明', re: /planner-form-title"><strong>[^<]*<\/strong><span>/g },
  { label: '开关控件说明', re: /sales-switch-control">[\s\S]{0,200}?<em>/g },
  { label: '字段提示 small', re: /class="form-help">/g },
  { label: '分组标题说明', re: /<div class="section-title-row"><div><h2>[^<]*<\/h2><p>/g }
];
const EMPTY_STATE_NOTE_KEEP = ['当前学期暂无课次。'];

const walkSource = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSource(full, out);
    else if (/\.(js|html)$/.test(entry.name)) out.push(full);
  }
  return out;
};
const sourceFiles = [pagesDir, path.join(root, 'admin'), path.join(root, 'shared/js'), path.join(root, 'teacher'), path.join(root, 'learner')]
  .flatMap((dir) => walkSource(dir, []))
  .filter((file) => !file.includes(`${path.sep}spec${path.sep}`))
  .filter((file) => !file.endsWith(path.join('shared', 'js', 'page-help-fields.js')));

const leftovers = [];
for (const file of new Set(sourceFiles)) {
  const text = readFileSync(file, 'utf8');
  const relative = path.relative(root, file);
  for (const { label, re } of RETIRED_SOURCE_PATTERNS) {
    const count = (text.match(re) || []).length;
    if (count) leftovers.push(`${relative}：${label} ${count} 处`);
  }
  for (const match of text.matchAll(/<p class="academic-note">([^<]*)<\/p>/g)) {
    const noteText = match[1].trim();
    if (!EMPTY_STATE_NOTE_KEEP.includes(noteText)) leftovers.push(`${relative}：academic-note 说明「${noteText.slice(0, 18)}」`);
  }
}

// 输出
const line = (value) => process.stdout.write(`${value}\n`);
line(`页面字段规格检查（共 ${pages.length} 个后台页面，${specKeys.size} 个已有规格）`);
line('');

if (uncovered.length) {
  line(`未覆盖页面 ${uncovered.length} 个：`);
  uncovered.forEach((key) => line(`  - ${key}`));
  line('');
}
if (orphanSpecs.length) {
  line(`规格存在但找不到对应页面：${orphanSpecs.join('、')}`);
  line('');
}
line(`字段事实源：结构化 ${structuredKeys.size} 个页面 / ${teacherFields.length} 个字段（带编号与机器可读约束），字面量待迁移 ${Object.keys(LITERAL_PAGE_TABLES).length} 个页面`);
line('');
line(`页面说明：${typedPages.length}/${typecoverageKeys.size} 页已登记页面类型；写实口径 ${Object.keys(PAGE_HELP_CONTENT).length} 页，其中 ${sectionFallbacks.length} 页的部分小节由页面元素兜底推导：`);
if (sectionFallbacks.length) line(`  - ${sectionFallbacks.join('；')}`);
line('');
if (duplicated.length) {
  line(`规格文案与页面源码重复 ${duplicated.length} 处（同一条说明有两个家）：`);
  duplicated.forEach((hit) => line(`  - ${hit.key}：${hit.count} 条，例如「${hit.sample[0].slice(0, 24)}…」`));
  line('');
}
if (leftovers.length) {
  line(`页面源码残留隐藏说明 ${leftovers.length} 处（应迁到 spec/ 或页面说明弹窗）：`);
  leftovers.forEach((hit) => line(`  - ${hit}`));
  line('');
}
if (warnings.length) {
  line('落地提示（不阻断）：');
  warnings.forEach((warning) => line(`  - ${warning}`));
  line('');
}
if (problems.length) {
  line(`格式错误 ${problems.length} 处：`);
  problems.forEach((problem) => line(`  - ${problem}`));
  line('');
}

const failed = problems.length + duplicated.length + leftovers.length;
line(failed ? `检查未通过：${problems.length} 个格式错误，${duplicated.length} 处重复文案，${leftovers.length} 处残留隐藏说明。` : '检查通过：规格格式正确，未发现与页面源码重复的说明文案，页面内也无残留的隐藏说明。');
process.exit(failed ? 1 : 0);
