import { adminMessageRows } from './admin-inbox.js';
import { readAdminSession } from './admin-auth.js';

const root = document.querySelector('[data-my-messages-page]');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function render() {
  if (!root) return;
  const rows = adminMessageRows(readAdminSession());
  const unread = rows.filter((row) => row.unread).length;
  root.innerHTML = `<section class="page-header"><div><p class="eyebrow">个人工作台</p><h1>我的消息</h1><p class="page-copy">仅查看当前后台账号收到的通知；需要处理的事项统一进入“我的待办”。</p></div></section>
    <section class="card"><div class="section-title-row"><div><h2>消息列表</h2><p class="sub-cell">消息用于知会和留痕，不承载审批、确认、发布等处理动作。</p></div><span class="tag ${unread ? 'amber' : 'gray'}">${rows.length} 条 · 未读 ${unread}</span></div>
    <div class="table-wrap"><table><thead><tr><th>消息标题</th><th>消息类型</th><th>关联班级</th><th>接收时间</th><th>状态</th></tr></thead><tbody>${rows.length ? rows.map(({ notification: item, unread: rowUnread }) => `<tr><td><strong>${esc(item.title)}</strong>${item.isDemo ? '<br><span class="muted">演示</span>' : ''}</td><td>${esc(item.type || '—')}</td><td>${esc(item.className || '—')}</td><td>${esc(item.sentAt || item.createdAt || '—')}</td><td><span class="tag ${rowUnread ? 'amber' : 'green'}">${rowUnread ? '未读' : '已读'}</span></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty-state"><strong>暂无我的消息</strong><p>当前账号暂无需要关注的业务通知；待处理事项请前往“我的待办”。</p></div></td></tr>'}</tbody></table></div></section>`;
}

render();
