function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function pill(text, tone = '') {
  return `<span class="mp-pill ${tone}">${escapeHtml(text)}</span>`;
}

function messageTone(type) {
  if (['支付成功', '报名成功', '分班完成', '作业批改', '结业通过', '报告发布', '证书生成', '课程申报审核结果', '证书审核结果', '结业申请审核结果', '工资已发布'].includes(type)) return 'green';
  if (['上课提醒', '作业发布', '新增排课通知', '课次调整通知', '作业提交提醒', '合同签署通知'].includes(type)) return 'amber';
  return 'gray';
}

function messageIcon(type) {
  return ({
    '支付成功': '付', '报名成功': '报', '分班完成': '班', '上课提醒': '课', '作业发布': '作', '作业批改': '评',
    '结业通过': '成', '报告发布': '报', '证书生成': '证', '新增排课通知': '课', '课次调整通知': '调', '作业提交提醒': '作',
    '课程申报审核结果': '审', '证书审核结果': '证', '合同签署通知': '合', '结业申请审核结果': '结', '工资已发布': '薪'
  })[type] || '信';
}

function relatedActionLabel(row) {
  if (row.actionLabel) return row.actionLabel;
  if (row.type === '支付成功') return '查看订单详情';
  if (['报告发布', '证书生成'].includes(row.type)) return '查看学习成果';
  if (row.type === '作业批改') return '查看作业';
  return '查看相关内容';
}

function lockedContent(options) {
  return `<div class="mp-stack"><section class="mp-locked"><span class="mp-avatar" aria-hidden="true">信</span><strong>登录后查看消息通知</strong><p>${escapeHtml(options.lockedCopy || '登录后可查看课程、教学和账号相关消息。')}</p><a class="mp-button" href="${escapeHtml(options.link(options.loginUrl))}">去登录</a></section></div>`;
}

export function mountMobileMessageList(options) {
  const { container, messages, loggedIn, link, detailPath, save, toast } = options;
  if (!loggedIn) { container.innerHTML = lockedContent(options); return; }
  const unreadCount = messages.filter(row => !row.read).length;
  container.innerHTML = `<div class="mp-stack"><section class="mp-card"><div class="mp-section-head"><div><h2>消息通知</h2><p class="mp-muted">${unreadCount ? `有${unreadCount}条未读消息` : '消息已全部读完'}</p></div>${unreadCount ? '<button class="mp-button secondary" id="mark-all-messages" type="button">全部已读</button>' : pill('已读', 'green')}</div><div class="mp-tabs" aria-label="消息筛选"><button class="mp-tab active" type="button" data-message-tab="all">全部</button><button class="mp-tab" type="button" data-message-tab="unread">未读${unreadCount ? ` ${unreadCount}` : ''}</button></div></section><div id="message-list" class="mp-message-list"></div></div>`;
  const draw = () => {
    const filter = container.querySelector('[data-message-tab].active')?.dataset.messageTab || 'all';
    const rows = messages.filter(row => filter === 'all' || !row.read);
    const list = container.querySelector('#message-list');
    list.innerHTML = rows.length ? rows.map(row => `<a class="mp-message-item ${row.read ? '' : 'is-unread'}" href="${escapeHtml(link(`${detailPath}?messageId=${encodeURIComponent(row.id)}`))}"><span class="mp-message-icon ${messageTone(row.type)}" aria-hidden="true">${messageIcon(row.type)}</span><span class="mp-message-copy"><span class="mp-message-head"><strong>${escapeHtml(row.title)}</strong>${row.read ? '' : pill('未读', 'amber')}</span><span class="mp-message-summary">${escapeHtml(row.summary)}</span><span class="mp-message-meta"><span>${escapeHtml(row.type)}</span><span>${escapeHtml(row.createdAt)}</span></span></span><span class="mp-message-arrow" aria-hidden="true">›</span></a>`).join('') : '<div class="mp-empty">暂无消息</div>';
  };
  container.querySelectorAll('[data-message-tab]').forEach(tab => tab.addEventListener('click', () => {
    container.querySelectorAll('[data-message-tab]').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    draw();
  }));
  container.querySelector('#mark-all-messages')?.addEventListener('click', () => {
    messages.forEach(row => { row.read = true; });
    save();
    mountMobileMessageList(options);
    toast('已全部标记为已读');
  });
  draw();
}

export function mountMobileMessageDetail(options) {
  const { container, messages, loggedIn, link, listPath, save } = options;
  if (!loggedIn) { container.innerHTML = lockedContent(options); return; }
  const messageId = new URLSearchParams(location.search).get('messageId');
  const row = messages.find(item => item.id === messageId);
  if (!row) {
    container.innerHTML = `<div class="mp-stack"><section class="mp-locked"><span class="mp-avatar" aria-hidden="true">信</span><strong>消息不存在</strong><p>该消息可能已被删除或暂时无法查看。</p><a class="mp-button secondary" href="${escapeHtml(link(listPath))}">返回消息列表</a></section></div>`;
    return;
  }
  row.read = true;
  save();
  const related = row.target ? `<section class="mp-card"><div class="mp-section-head"><h3>相关内容</h3>${pill('已读', 'gray')}</div><p class="mp-muted">点击下方按钮查看这条消息对应的业务内容。</p><a class="mp-button full" href="${escapeHtml(link(row.target))}">${escapeHtml(relatedActionLabel(row))}</a></section>` : '';
  container.innerHTML = `<div class="mp-stack"><section class="mp-card"><div class="mp-message-detail-top"><span class="mp-message-icon ${messageTone(row.type)}" aria-hidden="true">${messageIcon(row.type)}</span><div><span class="mp-muted">${escapeHtml(row.type)}</span><h2>${escapeHtml(row.title)}</h2><small>${escapeHtml(row.createdAt)}</small></div></div></section><section class="mp-card"><article class="mp-message-content"><p>${escapeHtml(row.body)}</p></article></section>${related}<a class="mp-button secondary full" href="${escapeHtml(link(listPath))}">返回消息列表</a></div>`;
}
