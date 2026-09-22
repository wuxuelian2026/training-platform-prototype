// 页面说明入口（三端共用）。
//
// 后台由 admin-shell.js 注入；教师端、学员端和登录页通过本模块挂载同一套
// 悬浮按钮与说明弹窗，保证三端的字段口径来自同一份 spec/fields/。
// 样式复用 shared/css/shell.css 里的 .page-help-* 规则。
import { FIELD_PAGE_COLUMNS, PAGE_FIELD_TABLES } from './page-help-fields.js';
import { MODULE_HELP_CONTENT, PAGE_HELP_CONTENT, SECTION_TEMPLATES, pageTypeOf } from '../../spec/pages/page-types.js';
import { machinesForPage, stateLabelsOf } from '../../spec/states/index.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const uniqueTexts = (values, limit = 6) => [...new Set(values.map(clean).filter(Boolean))].slice(0, limit);

// 未纳入规格的页面：从页面自身的副标题和分组说明里取业务描述。
const TEXT_SOURCE_SELECTOR = '.mp-page-sub, .mp-section-head span, .mp-field > label small, .mp-hint, .mp-muted';

// 固定小节格式：小节标题只来自 SECTION_TEMPLATES，内容优先取写实口径，缺项时从页面元素兜底推导。
const textOf = (selector, root, limit = 8) => uniqueTexts([...root.querySelectorAll(selector)].map((element) => element.textContent), limit);
const derivedSections = (pageKey) => {
  const type = pageTypeOf(pageKey);
  const scope = document.querySelector('.mobile-main') || document.body;
  const moduleKey = pageKey.split('/')[0];
  const fields = textOf('.mp-field > label, .mp-field > span, dt, .mp-readonly-label', scope);
  const filters = textOf('.mp-filter-grid .mp-field > label, .mp-filter-chip, .mp-tab, .mp-course-filter-chip', scope);
  const actions = textOf('button, .mp-button, .mp-link, .mp-action', scope, 10);
  const metrics = textOf('.mp-metric-label, .mp-stat-label, .metric-label', scope);
  const rules = uniqueTexts([MODULE_HELP_CONTENT[moduleKey], ...textOf(TEXT_SOURCE_SELECTOR, document, 3)]);
  if (type === 'detail') return { 展示字段与来源: fields, 状态: [], 可执行操作: actions, 业务规则: rules };
  if (type === 'form') return { 字段说明: fields, 提交与校验说明: [...uniqueTexts([...actions.slice(0, 3), ...rules.slice(0, 2)])] };
  if (type === 'config') return { 字段说明: fields, 生效范围与影响: rules };
  if (type === 'dashboard') return { 指标口径: metrics, 维度与筛选: filters, 下钻: actions, 数据更新时机: rules };
  return { 查询说明: filters.length ? filters : fields, 状态与流转: [], 操作说明: actions, 业务规则: rules };
};

const tableSection = (heading, rows) => {
  const head = FIELD_PAGE_COLUMNS.map((column) => '<th>' + escapeHtml(column) + '</th>').join('');
  const body = rows.map((row) => '<tr>' + row.map((cell) => '<td>' + escapeHtml(cell) + '</td>').join('') + '</tr>').join('');
  return '<section class="page-help-section"><h3>' + escapeHtml(heading) + '</h3><div class="page-help-table-wrap"><table class="page-help-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div></section>';
};
const listSection = (heading, items) => {
  const content = items.length
    ? '<ul>' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'
    : '<p class="page-help-empty">当前页面暂无补充说明。</p>';
  return '<section class="page-help-section"><h3>' + escapeHtml(heading) + '</h3>' + content + '</section>';
};

const buildContent = (pageKey) => {
  const spec = PAGE_FIELD_TABLES[pageKey];
  const authored = PAGE_HELP_CONTENT[pageKey];
  const derived = derivedSections(pageKey);
  // 固定小节格式 + 字段表并存：小节标题只按页面类型模板输出，写实口径优先，其余从页面兜底推导。
  const template = SECTION_TEMPLATES[pageTypeOf(pageKey)] || SECTION_TEMPLATES.list;
  // 状态段数据驱动：只来自 spec/states 命中本页的状态机；没有命中的页面不显示状态段。
  const statusHeading = pageTypeOf(pageKey) === 'detail' ? '状态' : '状态与流转';
  const statusItems = machinesForPage(pageKey).flatMap((machine) => [
    `${machine.object}（${machine.id}）状态取值：${stateLabelsOf(machine).join(' / ')}。`,
    ...(machine.transitions || []).map(([from, event, to, role]) => `${machine.object}流转：${from} —${event}→ ${to}（${role}）。`)
  ]);
  // ZK-D-50 D50-5：先收集小节，再把字段表分组按标题合并进同名小节，避免出现两个同名 <h3>
  //（此前 teacher/applications 的「业务规则」、teacher/application-create 的「提交与校验说明」都会重复一次）。
  const blocks = template
    .filter((heading) => heading !== statusHeading || statusItems.length)
    .map((heading) => {
      const items = heading === statusHeading ? statusItems : (authored?.[heading]?.length ? authored[heading] : (derived[heading] || []));
      return { heading, items };
    });
  // 看板 / 配置 / 表单模板没有状态小节：命中状态机时在末尾补出状态段，未命中则不出现。
  if (statusItems.length && !template.includes(statusHeading)) {
    blocks.push({ heading: statusHeading, items: statusItems });
  }
  // 字段表与模板小节并存时，规格里的补充说明若已写在模板小节里就不再重复展示。
  const authoredTexts = new Set([...(authored ? Object.values(authored).flat() : []), ...Object.values(derived).flat()].map(clean));
  if (spec) spec.groups.forEach((group) => {
    if (group.rows) { blocks.push({ heading: group.heading, rows: group.rows }); return; }
    const items = (group.items || []).filter((item) => !authoredTexts.has(clean(item)));
    if (!items.length) return;
    const sameHeading = blocks.find((block) => block.heading === group.heading && !block.rows);
    if (sameHeading) { sameHeading.items = [...new Set([...sameHeading.items, ...items])]; return; }
    blocks.push({ heading: group.heading, items });
  });
  return blocks.map((block) => (block.rows ? tableSection(block.heading, block.rows) : listSection(block.heading, block.items))).join('');
};

export const mountPageHelp = ({ pageKey, title, root = document.body }) => {
  if (!root || root.querySelector('[data-page-help-trigger]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'page-help-trigger';
  button.dataset.pageHelpTrigger = 'true';
  button.setAttribute('aria-label', '页面说明');
  button.setAttribute('title', '页面说明');
  button.innerHTML = '<span aria-hidden="true">i</span>';
  root.appendChild(button);

  const dialog = document.createElement('dialog');
  dialog.className = 'page-help-dialog';
  dialog.dataset.pageHelpDialog = 'true';
  dialog.innerHTML = `<div class="page-help-card"><div class="page-help-header"><div><span class="page-help-kicker">${escapeHtml(title || document.title)}</span><h2>页面说明</h2></div><button type="button" class="icon-button" data-page-help-close title="关闭说明" aria-label="关闭说明">×</button></div>${buildContent(pageKey)}</div>`;
  root.appendChild(dialog);

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-page-help-trigger]') && !dialog.open) dialog.showModal();
    if (event.target.closest('[data-page-help-close]')) dialog.close();
    if (event.target === dialog) dialog.close();
  });
};
