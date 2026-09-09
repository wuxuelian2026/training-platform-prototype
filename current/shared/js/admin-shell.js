import { normalizePrototypeLinks } from './paths.js';

const root = document.querySelector('[data-admin-shell]');
const content = document.querySelector('#page-content');
const title = root?.dataset.title || '工作台';
const active = root?.dataset.active || 'dashboard';
const pathname = window.location.pathname;
const currentPath = pathname.includes('/admin/') ? pathname.slice(pathname.indexOf('/admin/')) : pathname;

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
      ['合', '合同列表', '/admin/pages/teachers/contracts.html', 'teachers'],
      ['时', '教师时间表', '/admin/pages/teachers/schedule.html', 'teachers']
    ]
  },
  {
    icon: '课', label: '课程中心', items: [
      ['申', '课程申报', '/admin/pages/courses/applications.html', 'courses'],
      ['编', '课程内容编排', '/admin/pages/courses/content.html', 'courses'],
      ['资', '教学资源库', '/admin/pages/courses/resources.html', 'courses'],
      ['库', '课程库', '/admin/pages/courses/library.html', 'courses'],
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
      ['权', '角色权限管理', '/admin/pages/system/roles.html', 'system'],
      ['参', '参数配置', '/admin/pages/system/settings.html', 'system']
    ]
  }
];

const sidebar = navGroups.map(group => `<div class="nav-section"><div class="nav-section-title"><span class="nav-section-icon">${group.icon}</span><span>${group.label}</span></div>${group.items.map(([icon, label, href, key]) => `<a class="nav-sublink ${href === currentPath || (!currentPath && key === active) ? 'active' : ''}" href="${href}"><span class="nav-icon">${icon}</span><span>${label}</span></a>`).join('')}</div>`).join('');
const page = content ? content.innerHTML : '';
root.innerHTML = `<div class="admin-app"><aside class="admin-sidebar"><div class="admin-brand"><div class="brand-mark">艺</div><div class="brand-copy"><strong>继续教育平台</strong><small>培训管理后台</small></div></div><nav class="admin-nav">${sidebar}</nav></aside><div class="mobile-nav-backdrop" data-mobile-nav-close hidden></div><aside class="mobile-nav-drawer" id="mobile-nav-drawer" aria-label="后台菜单"><div class="mobile-nav-header"><div class="admin-brand"><div class="brand-mark">艺</div><div class="brand-copy"><strong>继续教育平台</strong><small>培训管理后台</small></div></div><button type="button" class="icon-button" data-mobile-nav-close title="关闭菜单" aria-label="关闭菜单">×</button></div><nav class="admin-nav">${sidebar}</nav></aside><main class="admin-main"><header class="admin-topbar"><div class="crumb"><button type="button" class="icon-button mobile-nav-trigger" data-mobile-nav-trigger aria-expanded="false" aria-controls="mobile-nav-drawer" title="打开菜单" aria-label="打开菜单"><span class="mobile-nav-bars" aria-hidden="true"><i></i><i></i><i></i></span></button><span>培训管理</span> <strong>${title}</strong></div><div class="topbar-actions"><a class="topbar-message" href="/admin/pages/academic/messages.html" title="消息中心" aria-label="消息中心"><span class="topbar-message-icon" aria-hidden="true"></span><span class="topbar-badge">3</span></a><div class="top-user-wrap"><button type="button" class="top-user" data-profile-menu-trigger aria-expanded="false" aria-haspopup="menu"><span class="top-user-avatar" aria-hidden="true">李</span><span class="top-user-copy"><strong>李教务</strong><small>教务主管</small></span><span class="top-user-chevron" aria-hidden="true">⌄</span></button><div class="profile-menu" data-profile-menu role="menu" hidden><a href="/admin/pages/system/profile.html" role="menuitem">个人中心</a><button type="button" data-profile-action="logout" role="menuitem">退出登录</button></div></div></div></header><div class="admin-content">${page}</div></main></div>`;
normalizePrototypeLinks(root);

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
    const notice = document.createElement('div');
    notice.className = 'shell-toast';
    notice.textContent = '已退出登录，当前为原型演示环境。';
    document.body.appendChild(notice);
    window.setTimeout(() => notice.remove(), 2600);
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-profile-menu]') && !event.target.closest('[data-profile-menu-trigger]')) closeProfileMenu();
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
