import { readDemoState, writeDemoState } from './demo-store.js';
import { applicationSeed } from './course-seed.js';
import { graduationSeed } from './graduation-seed.js';
import { readAdminSession } from './admin-auth.js';

const TODO_COLLECTION = 'adminTodos';
const roleTypes = {
  super_admin: null,
  research_lead: new Set(['course-review']),
  academic_lead: new Set(['graduation-review', 'academic-followup']),
  finance: new Set(['salary-publish', 'refund-review', 'payment-confirm']),
  course_consultant: new Set(['course-review'])
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function derivedTodos(state) {
  const rows = [];
  const add = (type, title, summary, targetUrl, sourceId, priority = 'P1', role = '', isDemo = false) => rows.push({
    id: `todo-${type}-${sourceId}`, type, title, summary, targetUrl, sourceType: type, sourceId,
    priority, assigneeRole: role, status: '待处理', createdAt: '2026-09-29 09:00', updatedAt: '2026-09-29 09:00',
    dedupeKey: `${type}:${sourceId}`, isDemo
  });
  const applications = (state.applications?.length ? state.applications : applicationSeed()).filter((item) => item.status === '待审核');
  applications.forEach((item) => add('course-review', '课程申报待审核', `${item.name} · ${item.teacher}`, 'pages/courses/applications.html', item.id, 'P1', '教研主管'));
  graduationSeed.filter((item) => item.classStatus === '待后台审核').forEach((item) => add('graduation-review', '班级结业待复核', `${item.className} · ${item.learners.filter((learner) => learner.status === '待审核').length} 名学员`, 'pages/academic/graduation.html', item.id, 'P1', '教务主管'));
  const salaries = [{ id: 'salary-wang', teacher: '王玥', month: '2026-08' }, { id: 'salary-chen', teacher: '陈晨', month: '2026-08' }];
  salaries.forEach((item) => add('salary-publish', '工资草稿待发布', `${item.month} · ${item.teacher}`, 'pages/finance/salary.html', item.id, 'P1', '财务'));
  (state.refunds || []).filter((item) => ['待审批', '退款异常'].includes(item.status)).forEach((item) => add('refund-review', '退款待处理', `${item.no || item.id} · ${item.student || '—'} · ${item.status}`, 'pages/finance/refunds.html', item.id, item.status === '退款异常' ? 'P0' : 'P1', '财务'));
  (state.paymentRecords || []).filter((item) => item.status === '待确认' || item.status === '异常').forEach((item) => add('payment-confirm', '收款待确认', `${item.receiptNo || item.id} · ${item.amount || 0} 元`, 'pages/finance/payments.html', item.id, item.status === '异常' ? 'P0' : 'P1', '财务'));
  (state.academicTodos || []).filter((item) => item.status === '待处理').forEach((item) => add('academic-followup', item.title || '教务待跟进', item.detail || '需要人工核对业务状态', 'pages/crm/classes.html', item.id, 'P1', '教务主管'));
  // 工作台演示覆盖：当某类真实业务当前没有记录时，保留一条明确标记的 mock 待办，便于逐角色验收入口、权限与处理闭环。
  const demoByType = new Set(rows.map((item) => item.type));
  [
    ['course-review', '课程申报待审核', '少儿国画入门 · 李青', 'pages/courses/applications.html', 'mock-course-review', 'P1', '教研主管'],
    ['graduation-review', '班级结业待复核', '成人声乐班 · 2 名学员', 'pages/academic/graduation.html', 'mock-graduation-review', 'P1', '教务主管'],
    ['salary-publish', '工资草稿待发布', '2026-08 · 王玥', 'pages/finance/salary.html', 'mock-salary-publish', 'P1', '财务'],
    ['refund-review', '退款待处理', 'RF202609290001 · 林知夏 · 待审批', 'pages/finance/refunds.html', 'mock-refund-review', 'P1', '财务'],
    ['payment-confirm', '收款待确认', 'RC202609290001 · 1680 元', 'pages/finance/payments.html', 'mock-payment-confirm', 'P1', '财务'],
    ['academic-followup', '教务待跟进', '退款被拒后的学籍状态待核对', 'pages/crm/classes.html', 'mock-academic-followup', 'P1', '教务主管']
  ].forEach(([type, title, summary, targetUrl, sourceId, priority, role]) => {
    if (!demoByType.has(type)) add(type, title, summary, targetUrl, sourceId, priority, role, true);
  });
  return rows;
}

function syncTodos() {
  const state = readDemoState();
  const existing = Array.isArray(state[TODO_COLLECTION]) ? state[TODO_COLLECTION] : [];
  const existingByKey = new Map(existing.map((item) => [item.dedupeKey, item]));
  const next = derivedTodos(state).map((item) => ({ ...item, ...(existingByKey.get(item.dedupeKey) || {}) }));
  const activeKeys = new Set(next.map((item) => item.dedupeKey));
  existing.filter((item) => !activeKeys.has(item.dedupeKey) && item.status !== '已完成').forEach((item) => next.push({ ...item, status: '已失效', resolvedAt: new Date().toISOString() }));
  if (JSON.stringify(existing) !== JSON.stringify(next)) writeDemoState((draft) => ({ ...draft, [TODO_COLLECTION]: next }));
  return next;
}

function visibleTodos(rows) {
  const session = readAdminSession();
  const allowed = roleTypes[session?.role];
  return rows.filter((item) => !allowed || allowed.has(item.type)).filter((item) => item.status === '待处理' || item.status === '处理中');
}

function render() {
  const root = document.querySelector('[data-workbench-todos]');
  if (!root) return;
  const rows = visibleTodos(syncTodos()).sort((a, b) => (a.priority === 'P0' ? -1 : b.priority === 'P0' ? 1 : a.createdAt.localeCompare(b.createdAt)));
  const count = rows.length;
  root.querySelector('[data-todo-count]')?.replaceChildren(document.createTextNode(String(count)));
  root.querySelector('[data-overdue-count]')?.replaceChildren(document.createTextNode(String(rows.filter((item) => item.priority === 'P0').length)));
  const list = root.querySelector('[data-todo-list]');
  if (!list) return;
  list.innerHTML = rows.length ? rows.map((item) => `<a class="mobile-list-item workbench-todo-row" href="${escapeHtml(item.targetUrl)}?todoId=${encodeURIComponent(item.id)}"><div><strong>${escapeHtml(item.title)} <span class="tag ${item.priority === 'P0' ? 'red' : 'brand'}">${item.priority}</span></strong><small>${escapeHtml(item.summary)} · ${escapeHtml(item.assigneeRole)}</small></div><span class="button">查看</span></a>`).join('') : '<div class="empty">当前角色暂无待处理事项。</div>';
}

document.addEventListener('DOMContentLoaded', render);
window.addEventListener('hbyx-demo-state-change', render);
document.querySelector('[data-workbench-refresh]')?.addEventListener('click', render);
