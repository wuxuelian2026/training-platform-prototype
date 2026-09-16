import { normalizePrototypeLinks, relativePath } from './paths.js';
import { FIELD_PAGE_COLUMNS, PAGE_FIELD_TABLES } from './page-help-fields.js';
import { mountFieldConstraints } from './field-constraints.js';
import { MODULE_HELP_CONTENT, PAGE_HELP_CONTENT, SECTION_TEMPLATES, pageTypeOf } from '../../spec/pages/page-types.js';
import { machinesForPage, stateLabelsOf } from '../../spec/states/index.js';
import { ADMIN_LOGIN_PATH, ADMIN_ROLE_LABELS, clearAdminSession, readAdminSession } from './admin-auth.js';

const root = document.querySelector('[data-admin-shell]');
const content = document.querySelector('#page-content');
const title = root?.dataset.title || '工作台';
const active = root?.dataset.active || 'dashboard';
const teacherPage = root?.dataset.teacherPage || '';
const pathname = window.location.pathname;
const currentPath = pathname.includes('/admin/') ? pathname.slice(pathname.indexOf('/admin/')) : pathname;
// I1-B-01 未登录拦截：后台页面没有登录态时先清空业务内容，再跳转后台登录页，
// 避免未登录时短暂渲染后台数据；登录页本身不加载本模块。
const adminSession = readAdminSession();
if (!adminSession) {
  content?.replaceChildren();
  window.location.replace(relativePath(ADMIN_LOGIN_PATH));
}
// 角色口径：演示链接的 ?role= 优先，其次取登录会话角色，最后回落到页面自带的 data-role。
const demoRole = new URLSearchParams(window.location.search).get('role') || adminSession?.role || root?.dataset.role || 'academic_lead';
const roleLabels = ADMIN_ROLE_LABELS;
const roleNames = { super_admin: '平台管理员', research_lead: '周教研', academic_lead: '李教务', course_consultant: '陈顾问', finance: '陈财务' };
const currentRoleName = roleNames[demoRole] || '李教务';

const navGroups = [
  {
    icon: '盘', label: '工作台', items: [
      ['待', '我的待办', '/admin/index.html', 'dashboard']
    ]
  },
  {
    icon: '师', label: '师资中心', items: [
      ['列', '教师列表', '/admin/pages/teachers/list.html', 'teachers'],
      ['证', '证书列表', '/admin/pages/teachers/certificates.html', 'teachers'],
      ['合', '合同列表', '/admin/pages/teachers/contracts.html', 'teachers']
    ]
  },
  {
    icon: '课', label: '课程中心', items: [
      ['申', '课程申报', '/admin/pages/courses/applications.html', 'courses'],
      ['库', '课程库', '/admin/pages/courses/library.html', 'courses'],
      ['资', '教学资源库', '/admin/pages/courses/resources.html', 'courses'],
      ['类', '专业目录维护', '/admin/pages/courses/catalog.html', 'courses']
    ]
  },
  {
    icon: '商', label: '商城运营', items: [
      ['商', '视频课程商品', '/admin/pages/mall/products.html', 'mall'],
      ['单', '统一订单管理', '/admin/pages/mall/orders.html', 'mall'],
      ['轮', '轮播图管理', '/admin/pages/mall/banners.html', 'mall'],
      ['协', '协议管理', '/admin/pages/mall/agreements.html', 'mall']
    ]
  },
  {
    icon: '招', label: '面授招生与CRM', items: [
      ['批', '批次管理', '/admin/pages/crm/batches.html', 'crm'],
      ['班', '面授班级', '/admin/pages/crm/classes.html', 'crm'],
      ['听', '后台登记试听', '/admin/pages/crm/trials.html', 'crm'],
      ['索', '线索跟进', '/admin/pages/crm/leads.html', 'crm'],
      ['转', '报名转化', '/admin/pages/crm/conversions.html', 'crm']
    ]
  },
  {
    icon: '物', label: '物资中心', items: [
      ['类', '物资分类管理', '/admin/pages/inventory/categories.html', 'inventory'],
      ['物', '物资管理', '/admin/pages/inventory/materials.html', 'inventory'],
      ['入', '入库记录', '/admin/pages/inventory/inbound-records.html', 'inventory'],
      ['出', '出库记录', '/admin/pages/inventory/outbound-records.html', 'inventory'],
      ['账', '库存台账', '/admin/pages/inventory/ledger.html', 'inventory']
    ]
  },
  {
    icon: '务', label: '教务执行监管', items: [
      ['场', '场地管理', '/admin/pages/academic/venues.html', 'academic'],
      ['排', '排班管理', '/admin/pages/academic/scheduling.html', 'academic'],
      ['表', '课表管理', '/admin/pages/academic/timetable.html', 'academic'],
      ['勤', '考勤监控', '/admin/pages/academic/attendance.html', 'academic'],
      ['作', '作业批阅监管', '/admin/pages/academic/homework.html', 'academic'],
      ['消', '消息推送', '/admin/pages/academic/messages.html', 'academic'],
      ['毕', '结业审核', '/admin/pages/academic/graduation.html', 'academic'],
      ['报', '学习报告管理', '/admin/pages/academic/reports.html', 'academic']
    ]
  },
  {
    icon: '财', label: '财务中心', items: [
      ['薪', '教师工资管理', '/admin/pages/finance/salary.html', 'finance'],
      ['收', '收款记录', '/admin/pages/finance/payments.html', 'finance'],
      ['退', '退款记录', '/admin/pages/finance/refunds.html', 'finance']
    ]
  },
  {
    icon: '设', label: '系统管理', items: [
      ['用', '后台用户管理', '/admin/pages/system/users.html', 'system'],
      ['学', '学员用户管理', '/admin/pages/system/student-users.html', 'system', ['super_admin', 'academic_lead']],
      ['权', '角色权限管理', '/admin/pages/system/roles.html', 'system'],
      ['参', '参数配置', '/admin/pages/system/settings.html', 'system']
    ]
  }
];

// Sidebar expand/collapse: per-group accordion plus a compact icon-only rail, both remembered locally.
const navGroupToggleKey = 'hbyx-admin-nav-collapsed-groups';
const navRailKey = 'hbyx-admin-nav-rail';
function readCollapsedGroups() {
  try { const stored = JSON.parse(localStorage.getItem(navGroupToggleKey) || '[]'); return Array.isArray(stored) ? stored : []; } catch { return []; }
}
function writeCollapsedGroups(list) { try { localStorage.setItem(navGroupToggleKey, JSON.stringify(list)); } catch { /* ignore */ } }
function readRailCollapsed() { try { return localStorage.getItem(navRailKey) === '1'; } catch { return false; } }
function writeRailCollapsed(value) { try { localStorage.setItem(navRailKey, value ? '1' : '0'); } catch { /* ignore */ } }
const collapsedGroups = readCollapsedGroups();
const visibleGroups = navGroups.map(group => ({ ...group, items: group.items.filter(([, , , , allowedRoles]) => !allowedRoles || allowedRoles.includes(demoRole)) })).filter(group => group.items.length);
const groupHasActive = group => group.items.some(([, , href, key]) => href === currentPath || (!currentPath && key === active));
const sidebar = visibleGroups.map((group, index) => {
  const collapsible = group.items.length > 1;
  const collapsed = collapsible && collapsedGroups.includes(group.label) && !groupHasActive(group);
  const links = group.items.map(([icon, label, href, key]) => `<a class="nav-sublink ${href === currentPath || (!currentPath && key === active) ? 'active' : ''}" href="${href}" title="${label}"${collapsed ? ' tabindex="-1"' : ''}><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></a>`).join('');
  const header = collapsible
    ? `<button type="button" class="nav-section-title${collapsed ? ' is-collapsed' : ''}" data-nav-group-toggle="${group.label}" aria-expanded="${!collapsed}" aria-controls="nav-group-${index}" title="${group.label}"><span class="nav-section-icon">${group.icon}</span><span class="nav-section-label">${group.label}</span><span class="nav-section-chevron" aria-hidden="true"></span></button>`
    : `<div class="nav-section-title" title="${group.label}"><span class="nav-section-icon">${group.icon}</span><span class="nav-section-label">${group.label}</span></div>`;
  return `<div class="nav-section${collapsed ? ' is-collapsed' : ''}" data-nav-section="${group.label}">${header}<div class="nav-section-links" id="nav-group-${index}">${links}</div></div>`;
}).join('');
// I1-DEF-008 (list not refreshing after 下架): a page module may already have rendered into #page-content
// and bound its listeners before the shell mounts, so the shell moves that node into the workspace instead
// of copying its markup. Copying left the module rendering into a detached node, which only showed up in
// the built preview where the shell chunk loads last.
const page = '';
root.innerHTML = `<div class="admin-app${readRailCollapsed() ? ' is-rail-collapsed' : ''}"><aside class="admin-sidebar"><div class="admin-brand"><div class="brand-mark">艺</div><div class="brand-copy"><strong>继续教育平台</strong><small>培训管理后台</small></div><button type="button" class="nav-rail-toggle" data-nav-rail-toggle aria-expanded="${!readRailCollapsed()}" title="${readRailCollapsed() ? '展开菜单' : '收起菜单'}" aria-label="${readRailCollapsed() ? '展开菜单' : '收起菜单'}"><span aria-hidden="true">${readRailCollapsed() ? '»' : '«'}</span></button></div><nav class="admin-nav">${sidebar}</nav><div class="nav-bulk-actions"><button type="button" class="nav-bulk-button" data-nav-expand-all>全部展开</button><button type="button" class="nav-bulk-button" data-nav-collapse-all>全部收起</button></div></aside><div class="mobile-nav-backdrop" data-mobile-nav-close hidden></div><aside class="mobile-nav-drawer" id="mobile-nav-drawer" aria-label="后台菜单"><div class="mobile-nav-header"><div class="admin-brand"><div class="brand-mark">艺</div><div class="brand-copy"><strong>继续教育平台</strong><small>培训管理后台</small></div></div><button type="button" class="icon-button" data-mobile-nav-close title="关闭菜单" aria-label="关闭菜单">×</button></div><nav class="admin-nav">${sidebar}</nav></aside><main class="admin-main"><header class="admin-topbar"><div class="crumb"><button type="button" class="icon-button mobile-nav-trigger" data-mobile-nav-trigger aria-expanded="false" aria-controls="mobile-nav-drawer" title="打开菜单" aria-label="打开菜单"><span class="mobile-nav-bars" aria-hidden="true"><i></i><i></i><i></i></span></button><span>培训管理</span> <strong>${title}</strong></div><div class="topbar-actions"><a class="topbar-message" href="/admin/pages/academic/messages.html" title="消息中心" aria-label="消息中心"><span class="topbar-message-icon" aria-hidden="true"></span><span class="topbar-badge">3</span></a><div class="top-user-wrap"><button type="button" class="top-user" data-profile-menu-trigger aria-expanded="false" aria-haspopup="menu"><span class="top-user-avatar" aria-hidden="true">${currentRoleName.slice(0, 1)}</span><span class="top-user-copy"><strong>${currentRoleName}</strong><small>${roleLabels[demoRole] || '教务主管'}</small></span><span class="top-user-chevron" aria-hidden="true">⌄</span></button><div class="profile-menu" data-profile-menu role="menu" hidden><a href="/admin/pages/system/profile.html" role="menuitem">个人中心</a><button type="button" data-profile-action="logout" role="menuitem">退出登录</button></div></div></div></header><div class="admin-content">${page}</div></main></div>`;
const pageSlot = root.querySelector('.admin-content');
if (content && pageSlot) { content.classList.add('admin-content'); pageSlot.replaceWith(content); }
normalizePrototypeLinks(root);

// 业务文案统一放在 spec/pages/page-types.js，壳层只负责渲染。
const escapePageHelp = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const cleanPageHelpText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const uniquePageHelp = (values, limit = 8) => [...new Set(values.map(cleanPageHelpText).filter(Boolean))].slice(0, limit);
const createPageHelp = () => {
  const existing = root.querySelector('[data-page-help-dialog]');
  if (existing) existing.remove();
  const fields = uniquePageHelp([...document.querySelectorAll('.form-field > span, th, dt, .metric-label')].map((element) => element.textContent.replace(/\s*\*\s*$/, '').trim()).filter((value) => value && value !== '操作' && value.length < 30));
  const section = (heading, items, empty) => `<section class="page-help-section"><h3>${heading}</h3>${items.length ? `<ul>${items.map((item) => `<li>${escapePageHelp(item)}</li>`).join('')}</ul>` : `<p class="page-help-empty">${empty}</p>`}</section>`;
  const tableSection = (heading, columns, rows) => `<section class="page-help-section"><h3>${escapePageHelp(heading)}</h3><div class="page-help-table-wrap"><table class="page-help-table"><thead><tr>${columns.map((column) => `<th>${escapePageHelp(column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapePageHelp(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  // 按页面类型组织小节：类型决定小节集合，内容从对应的页面元素取。
  const helpLabel = (element) => (element.textContent || '').replace(/\s*\*\s*$/, '').trim();
  const helpFilters = () => uniquePageHelp([...document.querySelectorAll('.filter-panel .form-field > span, .course-filter .course-field > label')].map(helpLabel), 8);
  // 行内操作不都在 .action-cell 里：有的页面直接放在 td 上，详情页则放在工具栏。
  // 统一取「每行最后一列的操作」加「工具栏与分组标题栏的按钮」。
  const helpActions = () => uniquePageHelp([
    ...[...document.querySelectorAll('.admin-content tbody tr')].flatMap((row) => [...(row.lastElementChild?.querySelectorAll('button, a') || [])]),
    ...document.querySelectorAll('.admin-content .toolbar-actions button, .admin-content .toolbar-actions a, .admin-content .toolbar-actions .text-button, .admin-content .section-title-row button, .admin-content .section-title-row a')
  ].map((element) => element.textContent), 8);
  const helpMetrics = () => uniquePageHelp([...document.querySelectorAll('.metric-label')].map(helpLabel), 8);
  const helpMetricNotes = () => uniquePageHelp([...document.querySelectorAll('.metric-note')].map((element) => element.textContent), 8);
  const helpTabs = () => uniquePageHelp([...document.querySelectorAll('.segmented button, .tab-bar button, [data-action$="-tab"]')].map((element) => element.textContent), 6);
  const buildTypedSections = (type) => {
    const authored = PAGE_HELP_CONTENT[pageKey];
    const rules = uniquePageHelp([MODULE_HELP_CONTENT[active]], 6);
    const fallback = {
      '展示字段与来源': fields,
      '状态': [],
      '可执行操作': helpActions(),
      '指标口径': uniquePageHelp([...helpMetrics(), ...helpMetricNotes()], 8),
      '维度与筛选': uniquePageHelp([...helpFilters(), ...helpTabs()], 8),
      '下钻': helpActions(),
      '数据更新时机': rules,
      '字段说明': fields,
      '生效范围与影响': rules,
      '提交与校验说明': uniquePageHelp([...rules, ...helpActions().slice(0, 3)], 8),
      '查询说明': helpFilters(),
      '状态与流转': [],
      '操作说明': helpActions(),
      '业务规则': rules
    };
    // 固定小节格式：标题只按页面类型模板输出，写实口径优先，缺项从页面元素兜底。
    const template = SECTION_TEMPLATES[type] || SECTION_TEMPLATES.list;
    const statusHeading = type === 'detail' ? '状态' : '状态与流转';
    const rows = template
      .filter((heading) => heading !== statusHeading || statusItems.length)
      .map((heading) => [heading, heading === statusHeading ? statusItems : (authored?.[heading]?.length ? authored[heading] : (fallback[heading] || []))]);
    // 看板页 / 配置页 / 表单页模板没有状态小节：本页命中状态机时在末尾补出状态段，未命中则不出现。
    if (statusItems.length && !template.includes(statusHeading)) rows.push([statusHeading, statusItems]);
    return rows;
  };
  // 页面键：/admin/pages/<模块>/<页面>.html → 模块/页面；/admin/index.html → admin/index。
  const rawKey = currentPath.replace(/\.html$/, '');
  const pageKey = rawKey.startsWith('/admin/pages/') ? rawKey.slice('/admin/pages/'.length) : rawKey.replace(/^\//, '');
  // 状态段改为数据驱动：取值与流转只来自 spec/states 命中的状态机，不再从页面 .tag 反推。
  const statusItems = machinesForPage(pageKey).flatMap((machine) => [
    `${machine.object}（${machine.id}）状态取值：${stateLabelsOf(machine).join(' / ')}。`,
    ...(machine.transitions || []).map(([from, event, to, role]) => `${machine.object}流转：${from} —${event}→ ${to}（${role}）。`)
  ]);
  const sections = buildTypedSections(pageTypeOf(pageKey));
  const fieldSpec = PAGE_FIELD_TABLES[pageKey] || null;
  const dialog = document.createElement('dialog');
  dialog.className = `page-help-dialog${fieldSpec ? ' page-help-dialog-wide' : ''}`;
  dialog.dataset.pageHelpDialog = 'true';
  // 组合规则：固定小节始终输出（模板决定标题与顺序），字段表在该页有字段规格时追加在后。
  // 模板小节与字段表并存：字段规格的补充说明若已写进模板小节，则不再重复展示。
  const authoredTexts = new Set((PAGE_HELP_CONTENT[pageKey] ? Object.values(PAGE_HELP_CONTENT[pageKey]).flat() : []).map(cleanPageHelpText));
  const fieldTablesHtml = fieldSpec
    ? fieldSpec.groups.map((group) => {
      if (group.rows) return tableSection(group.heading, FIELD_PAGE_COLUMNS, group.rows);
      const items = (group.items || []).filter((item) => !authoredTexts.has(cleanPageHelpText(item)));
      return items.length ? section(group.heading, items, '当前页面暂无补充说明。') : '';
    }).join('')
    : '';
  const typedSectionsHtml = sections.map(([heading, items]) => section(heading, items, '当前页面暂无补充说明。')).join('');
  const bodyHtml = typedSectionsHtml + fieldTablesHtml;
  dialog.innerHTML = `<div class="page-help-card"><div class="page-help-header"><div><span class="page-help-kicker">${escapePageHelp(title)}</span><h2>页面说明</h2></div><button type="button" class="icon-button" data-page-help-close title="关闭说明" aria-label="关闭说明">×</button></div>${bodyHtml}</div>`;
  root.appendChild(dialog);
};
const ensurePageHelp = () => {
  createPageHelp();
  // 页面说明与输入约束同源：规格里声明的长度/格式在这里落到实际控件上。
  // 与小程序两端一致使用带 DOM 监听的挂载入口，保证运行时弹出的表单（新增/编辑/导入）同样受约束。
  mountFieldConstraints(currentPath.replace(/^\/admin\/pages\//, '').replace(/\.html$/, ''), root);
  const trigger = root.querySelector('[data-page-help-trigger]');
  if (!trigger) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'page-help-trigger';
    button.dataset.pageHelpTrigger = 'true';
    button.setAttribute('aria-label', '页面说明');
    button.setAttribute('title', '页面说明');
    button.innerHTML = '<span aria-hidden="true">i</span>';
    root.appendChild(button);
  }
};
let pageHelpRefreshTimer;
const schedulePageHelpRefresh = () => {
  window.clearTimeout(pageHelpRefreshTimer);
  pageHelpRefreshTimer = window.setTimeout(ensurePageHelp, 0);
};
ensurePageHelp();
const adminContent = root.querySelector('.admin-content');
if (adminContent) new MutationObserver(schedulePageHelpRefresh).observe(adminContent, { childList: true, subtree: true });
root.addEventListener('click', (event) => {
  if (event.target.closest('[data-page-help-trigger]')) {
    const helpDialog = root.querySelector('[data-page-help-dialog]');
    if (helpDialog && !helpDialog.open) helpDialog.showModal();
  }
  if (event.target.closest('[data-page-help-close]')) root.querySelector('[data-page-help-dialog]')?.close();
  if (event.target.matches('[data-page-help-dialog]')) event.target.close();
});

const profileTrigger = root.querySelector('[data-profile-menu-trigger]');
const profileMenu = root.querySelector('[data-profile-menu]');
const closeProfileMenu = () => {
  if (!profileMenu || !profileTrigger) return;
  profileMenu.hidden = true;
  profileTrigger.setAttribute('aria-expanded', 'false');
};
profileTrigger?.addEventListener('click', (event) => {
  event.stopPropagation();
  const isOpen = profileMenu && !profileMenu.hidden;
  if (profileMenu) profileMenu.hidden = Boolean(isOpen);
  profileTrigger.setAttribute('aria-expanded', String(!isOpen));
});
profileMenu?.addEventListener('click', (event) => {
  if (event.target.closest('[data-profile-action="logout"]')) {
    closeProfileMenu();
    // I1-B-01：退出登录清除后台登录态，并回到后台登录页；退出后后台页面会被重新拦截。
    clearAdminSession();
    window.location.replace(relativePath(ADMIN_LOGIN_PATH));
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-profile-menu]') && !event.target.closest('[data-profile-menu-trigger]')) closeProfileMenu();
});
// Sidebar expand/collapse interactions (group accordion + icon rail + bulk actions).
const adminApp = root.querySelector('.admin-app');
const applyGroupState = (label, collapsed) => {
  // The sidebar and the mobile drawer each render a copy of the menu — keep both in sync.
  root.querySelectorAll(`.nav-section[data-nav-section="${CSS.escape(label)}"]`).forEach(section => section.classList.toggle('is-collapsed', collapsed));
  root.querySelectorAll(`[data-nav-section="${CSS.escape(label)}"] .nav-section-links a`).forEach(link => link.setAttribute('tabindex', collapsed ? '-1' : '0'));
  root.querySelectorAll(`[data-nav-group-toggle="${CSS.escape(label)}"]`).forEach(toggle => { toggle.classList.toggle('is-collapsed', collapsed); toggle.setAttribute('aria-expanded', String(!collapsed)); });
};
root.addEventListener('click', (event) => {
  const groupToggle = event.target.closest('[data-nav-group-toggle]');
  if (groupToggle) {
    const label = groupToggle.dataset.navGroupToggle;
    const collapsed = readCollapsedGroups();
    const next = collapsed.includes(label) ? collapsed.filter(item => item !== label) : [...collapsed, label];
    writeCollapsedGroups(next);
    applyGroupState(label, next.includes(label));
    return;
  }
  if (event.target.closest('[data-nav-expand-all]')) {
    writeCollapsedGroups([]);
    visibleGroups.forEach(group => applyGroupState(group.label, false));
    return;
  }
  if (event.target.closest('[data-nav-collapse-all]')) {
    const labels = visibleGroups.filter(group => group.items.length > 1).map(group => group.label);
    writeCollapsedGroups(labels);
    labels.forEach(label => applyGroupState(label, true));
    return;
  }
  const railToggle = event.target.closest('[data-nav-rail-toggle]');
  if (railToggle) {
    const collapsed = !adminApp?.classList.contains('is-rail-collapsed');
    adminApp?.classList.toggle('is-rail-collapsed', collapsed);
    writeRailCollapsed(collapsed);
    railToggle.setAttribute('aria-expanded', String(!collapsed));
    railToggle.setAttribute('title', collapsed ? '展开菜单' : '收起菜单');
    railToggle.setAttribute('aria-label', collapsed ? '展开菜单' : '收起菜单');
    const glyph = railToggle.querySelector('span');
    if (glyph) glyph.textContent = collapsed ? '»' : '«';
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeProfileMenu();
});

const mobileNavTrigger = root.querySelector('[data-mobile-nav-trigger]');
const mobileNavDrawer = root.querySelector('.mobile-nav-drawer');
const mobileNavBackdrop = root.querySelector('.mobile-nav-backdrop');
const closeMobileNav = () => {
  root.querySelector('.admin-app')?.classList.remove('mobile-nav-open');
  mobileNavBackdrop?.setAttribute('hidden', '');
  mobileNavTrigger?.setAttribute('aria-expanded', 'false');
};
mobileNavTrigger?.addEventListener('click', (event) => {
  event.stopPropagation();
  root.querySelector('.admin-app')?.classList.add('mobile-nav-open');
  mobileNavBackdrop?.removeAttribute('hidden');
  mobileNavTrigger.setAttribute('aria-expanded', 'true');
});
mobileNavBackdrop?.addEventListener('click', closeMobileNav);
mobileNavDrawer?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMobileNav();
  if (event.target.closest('[data-mobile-nav-close]')) closeMobileNav();
});

const closeFilterDrawer = (shell) => {
  if (!shell) return;
  shell.classList.remove('is-open');
  shell.querySelector('[data-filter-drawer-trigger]')?.setAttribute('aria-expanded', 'false');
  shell.querySelector('[data-filter-drawer-backdrop]')?.setAttribute('hidden', '');
};
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-filter-drawer-trigger]');
  if (trigger) {
    const shell = trigger.closest('[data-filter-drawer-shell]');
    shell?.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    shell?.querySelector('[data-filter-drawer-backdrop]')?.removeAttribute('hidden');
    return;
  }
  const close = event.target.closest('[data-filter-drawer-close], [data-filter-drawer-backdrop]');
  if (close) closeFilterDrawer(close.closest('[data-filter-drawer-shell]'));
});
document.addEventListener('submit', (event) => closeFilterDrawer(event.target.closest('[data-filter-drawer-shell]')));
document.addEventListener('reset', (event) => closeFilterDrawer(event.target.closest('[data-filter-drawer-shell]')));
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeMobileNav();
  closeFilterDrawer(root.querySelector('[data-filter-drawer-shell].is-open'));
});

let filterFormSequence = 0;
const enhanceFilterForm = (form) => {
  if (!form || form.closest('[data-filter-drawer-shell]')) return;
  if (!form.id) form.id = `filter-form-${++filterFormSequence}`;
  const shell = document.createElement('div');
  shell.className = 'filter-drawer-shell';
  shell.dataset.filterDrawerShell = form.id;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'button filter-drawer-trigger';
  trigger.dataset.filterDrawerTrigger = shell.dataset.filterDrawerShell;
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', form.id);
  trigger.innerHTML = '<span class="filter-trigger-icon" aria-hidden="true"></span>筛选条件';
  const backdrop = document.createElement('div');
  backdrop.className = 'filter-drawer-backdrop';
  backdrop.dataset.filterDrawerBackdrop = shell.dataset.filterDrawerShell;
  backdrop.hidden = true;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'icon-button filter-drawer-close';
  close.dataset.filterDrawerClose = shell.dataset.filterDrawerShell;
  close.title = '关闭筛选条件';
  close.setAttribute('aria-label', '关闭筛选条件');
  close.textContent = '×';
  form.classList.add('filter-form');
  form.parentNode.insertBefore(shell, form);
  shell.append(trigger, backdrop, form);
  form.querySelector('.filter-head, .course-filter-head')?.append(close);
};

const enhanceFilterForms = () => {
  document.querySelectorAll('form.filter-panel, form.course-filter, form#certificate-filter').forEach(enhanceFilterForm);
};
enhanceFilterForms();
new MutationObserver(enhanceFilterForms).observe(document.body, { childList: true, subtree: true });
