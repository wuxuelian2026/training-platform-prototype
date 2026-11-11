(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
  const { relativePath } = __classicRequire('shared/js/paths.js');
  const HS = __classicRequire('shared/js/home-school-store.js');

  // 家校留言：人工异步留言 + 通知；不提供自动回复、自动翻译、举报入口与即时通讯。
  // 呈现层采用通用会话式界面（会话列表 + 消息气泡 + 底部输入栏），仅借鉴通用交互范式，
  // 配色/间距/文案均使用项目自有规范；不引入长连接、在线状态、已读回执、输入中、消息撤回。
  const main = document.querySelector('.mobile-main');
  if (!main || !HS) return;
  const path = String(global.location.pathname);
  const params = new URLSearchParams(global.location.search);
  const role = HS.currentRole();
  if (role === HS.ROLE.ADMIN) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const link = url => relativePath(url);
  const listUrl = role === HS.ROLE.TEACHER ? '/teacher/pages/home-school.html' : '/learner/pages/home-school.html';
  const detailUrl = role === HS.ROLE.TEACHER ? '/teacher/pages/home-school-detail.html' : '/learner/pages/home-school-detail.html';
  const isList = path.endsWith('/home-school.html');
  const isDetail = path.endsWith('/home-school-detail.html');
  const toast = message => {
    const node = document.createElement('div');
    node.className = 'mp-toast';
    node.textContent = message;
    document.body.appendChild(node);
    global.setTimeout(() => node.remove(), 2200);
  };
  const pill = (text, tone = '') => `<span class="mp-pill ${tone}">${esc(text)}</span>`;
  const card = content => `<section class="mp-card">${content}</section>`;
  const requestId = () => `hs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let newFormOpen = false;
  // CR-2026-176（口径修订）：联系人与发起沟通均为独立页面，不在会话列表内展开面板。
  const contactsUrl = role === HS.ROLE.TEACHER ? '/teacher/pages/home-school-contacts.html' : '';
  const composeUrl = role === HS.ROLE.TEACHER ? '/teacher/pages/home-school-compose.html' : '';
  const isContacts = path.endsWith('/home-school-contacts.html');
  const isCompose = path.endsWith('/home-school-compose.html');

  // ---------- 列表页：通用会话列表（LP-02 / LT-02）----------
  // 「已关闭」是系统侧只读终态，展示时按来源区分，避免用户误以为会话被谁结束了。
  function statusLabel(thread) {
    if (thread.status === HS.STATUS.CLOSED) return thread.closedBy === '教务下架' ? '已下架' : '已结课 · 只读';
    // CR-2026-176：教师主动发起且家长尚未回看时，避免误显示成「教师已回复」。
    if (thread.initiatedBy === HS.ROLE.TEACHER && thread.status === HS.STATUS.REPLIED) return '已发起 · 待家长查看';
    return thread.status;
  }

  function threadRow(thread) {
    const last = HS.lastMessage(thread.threadId);
    const unread = role === HS.ROLE.TEACHER ? thread.unreadByTeacher : thread.unreadByParent;
    const preview = last ? last.text : '暂无留言内容';
    const title = role === HS.ROLE.TEACHER
      ? `${thread.studentName} · ${thread.className}`
      : `${thread.teacherName} · ${thread.className}`;
    const avatar = role === HS.ROLE.TEACHER ? '长' : '师';
    const stateTone = thread.status === HS.STATUS.PENDING ? 'is-pending' : thread.status === HS.STATUS.REPLIED ? 'is-replied' : '';
    return `<a class="hs-chat-item" href="${esc(link(`${detailUrl}?threadId=${encodeURIComponent(thread.threadId)}`))}">
      <span class="hs-avatar" aria-hidden="true">${avatar}</span>
      <div class="hs-chat-item-body">
        <div class="hs-chat-item-row"><strong>${esc(title)}</strong><time>${esc(thread.lastMessageAt)}</time></div>
        <div class="hs-chat-item-row"><span class="hs-chat-preview">${esc(preview)}</span>${unread ? '<span class="hs-chat-unread" aria-label="有未读消息">1</span>' : ''}<span class="hs-chat-state ${stateTone}">${esc(statusLabel(thread))}</span></div>
      </div>
    </a>`;
  }

  function newThreadForm() {
    const bindings = HS.listBindings().filter(item => item.active);
    if (!bindings.length) return '<div class="mp-empty">当前学员暂无在读班级，无法发起留言。</div>';
    return `<section class="mp-card hs-new-form" id="hs-new-form">
      <div class="mp-section-head"><h2>发起留言</h2><span class="mp-muted">纯文本 · ${HS.MAX_TEXT} 字以内</span></div>
      <label class="mp-field"><span>选择班级</span><select id="hs-class">${bindings.map(item => `<option value="${esc(item.classId)}">${esc(item.className)} · ${esc(item.teacherName)}</option>`).join('')}</select></label>
      <label class="mp-field"><span>留言内容</span><textarea id="hs-text" rows="3" maxlength="${HS.MAX_TEXT}" placeholder="请描述需要沟通的问题，不要填写手机号等个人信息"></textarea></label>
      <p class="mp-muted" id="hs-form-hint">提交前会进行内容安全校验；同一班级的留言会一直留在同一个会话里，教师回复后你会收到通知。</p>
      <button class="mp-button full" type="button" id="hs-submit">提交留言</button>
    </section>`;
  }

  // CR-2026-176 LT-05：教师端「联系人」为独立页面（非列表内展开面板）。按班级分组，一行一名在读学员；
  // 已有会话直接进沟通详情，无会话进独立「发起沟通」页（带 classId + studentId + className）。
  // 数据权限由 HS.listContacts() 保证（bindings.teacherId === 当前教师且 active），此处不二次拼装名单。
  function contactHref(item) {
    if (item.hasThread) return link(`${detailUrl}?threadId=${encodeURIComponent(item.threadId)}`);
    return link(`${composeUrl}?classId=${encodeURIComponent(item.classId)}&studentId=${encodeURIComponent(item.studentId)}&className=${encodeURIComponent(item.className)}`);
  }

  function renderContacts() {
    const back = `<a class="hs-chat-back" href="${esc(link(listUrl))}" aria-label="返回家校沟通">‹</a>`;
    const head = `<header class="hs-chat-topbar">${back}
      <div class="hs-chat-topbar-main"><strong>选择联系人</strong><span>仅本人授课班级的在读学员</span></div>
    </header>`;
    if (role !== HS.ROLE.TEACHER) {
      main.innerHTML = `<div class="hs-chat-page is-list">${head}<div class="hs-chat-empty">无权访问联系人。</div></div>`;
      return;
    }
    const contacts = HS.listContacts().filter(item => !item.closed);
    if (!contacts.length) {
      main.innerHTML = `<div class="hs-chat-page is-list">${head}<div class="hs-chat-empty">当前没有可沟通的在读学员，请联系教务确认班级绑定。</div></div>`;
      return;
    }
    const groups = [];
    const byClass = new Map();
    contacts.forEach(item => {
      if (!byClass.has(item.classId)) {
        const group = { className: item.className, items: [] };
        byClass.set(item.classId, group);
        groups.push(group);
      }
      byClass.get(item.classId).items.push(item);
    });
    const groupHtml = groups.map(group => `<div class="hs-contact-group">
      <h3>${esc(group.className)}<span>${group.items.length} 人</span></h3>
      ${group.items.map(item => `<a class="hs-contact-row" href="${esc(contactHref(item))}" data-hs-contact="${esc(item.classId + '|' + item.studentId)}">
        <span class="hs-avatar" aria-hidden="true">${esc(item.studentName.slice(0, 1))}</span>
        <span class="hs-contact-copy"><strong>${esc(item.studentName)}</strong><small>${item.hasThread ? esc(statusLabel({ status: item.threadStatus, initiatedBy: item.initiatedBy, closedBy: '' })) : '尚未沟通 · 可发起首条留言'}</small></span>
        <span class="hs-contact-action">${item.hasThread ? '进入 ›' : '发起 ›'}</span>
      </a>`).join('')}
    </div>`).join('');
    main.innerHTML = `<div class="hs-chat-page is-list">${head}
      <section class="mp-card hs-contacts" id="hs-contacts">
        <p class="mp-muted hs-contacts-hint">选择一位学员后进入对应班级的长期会话；尚未沟通时可发出第一条留言，家长端会收到通知。</p>
        ${groupHtml}
      </section></div>`;
  }

  function renderList() {
    const threads = HS.listThreads();
    const pending = threads.filter(item => item.status === HS.STATUS.PENDING).length;
    const head = `<header class="hs-chat-topbar">
      <div class="hs-chat-topbar-main"><strong>${role === HS.ROLE.TEACHER ? '家校沟通' : '我的家校留言'}</strong><span>${pending ? `${pending} 条待回复` : (role === HS.ROLE.TEACHER ? '异步留言 · 可从联系人主动发起' : '异步留言 · 教师课间或课后回复')}</span></div>
      ${role === HS.ROLE.TEACHER
        ? '<a class="hs-chat-icon-btn is-text hs-contact-entry" href="' + esc(link(contactsUrl)) + '" aria-label="选择联系人">联系人</a>'
        : '<button class="hs-chat-icon-btn" type="button" id="hs-toggle-new" aria-label="发起留言" aria-expanded="' + String(newFormOpen) + '">＋</button>'}
    </header>`;
    const list = threads.length
      ? `<section class="hs-chat-list" aria-label="会话列表">${threads.map(threadRow).join('')}</section>`
      : `<div class="hs-chat-empty">${role === HS.ROLE.TEACHER ? '暂无家校留言，点击右上角「联系人」选择学员发起沟通。' : '暂无家校留言，点击右上角 ＋ 发起第一条留言。'}</div>`;
    main.innerHTML = `<div class="hs-chat-page is-list">${head}${role === HS.ROLE.PARENT && newFormOpen ? newThreadForm() : ''}${list}</div>`;

    document.querySelector('#hs-toggle-new')?.addEventListener('click', () => {
      newFormOpen = !newFormOpen;
      renderList();
    });
    const submit = document.querySelector('#hs-submit');
    if (submit) submit.addEventListener('click', () => {
      const classId = document.querySelector('#hs-class')?.value;
      const text = document.querySelector('#hs-text')?.value || '';
      const result = HS.createThread({ classId, text, clientRequestId: requestId() });
      if (!result.ok) {
        const hint = document.querySelector('#hs-form-hint');
        if (hint) hint.textContent = `${result.reason}${result.hint ? ` · ${result.hint}` : ''}`;
        toast(result.reason);
        return;
      }
      toast(result.reused ? '留言已发送到原会话，等待教师回复' : '留言已提交，等待教师回复');
      global.location.href = link(`${detailUrl}?threadId=${encodeURIComponent(result.threadId)}`);
    });
  }

  // ---------- 详情页：消息气泡 + 吸底输入栏（LP-03 / LT-03）----------
  const QUICK_REPLIES = [
    '家长您好，已收到您的留言，我会在课后确认后回复您。',
    '家长您好，课堂情况我会在本次课结束后同步给您。',
    '家长您好，这个问题建议请在家长会上当面沟通，我也会持续关注孩子的学习状态。'
  ];

  function messageBubble(message) {
    const mine = (role === HS.ROLE.PARENT && message.senderRole === HS.ROLE.PARENT) || (role === HS.ROLE.TEACHER && message.senderRole === HS.ROLE.TEACHER);
    const avatar = mine ? '我' : message.senderRole === HS.ROLE.TEACHER ? '师' : '长';
    return `<div class="hs-bubble-row ${mine ? 'is-mine' : ''}">
      <span class="hs-avatar" aria-hidden="true">${avatar}</span>
      <div class="hs-bubble"><div>${esc(message.text)}</div><div class="hs-bubble-meta">${esc(message.senderLabel)} · ${esc(message.createdAt)}</div></div>
    </div>`;
  }

  function composerBar(thread) {
    const quick = role === HS.ROLE.TEACHER
      ? `<div class="hs-quick-chips" aria-label="人工快捷回复">${QUICK_REPLIES.map((text, index) => `<button class="hs-quick-chip" type="button" data-hs-quick="${index}">模板 ${index + 1}</button>`).join('')}</div>`
      : '';
    return `<div class="hs-composer-bar" id="hs-composer">
      ${quick}
      <div class="hs-composer-row">
        <textarea id="hs-reply" rows="1" maxlength="${HS.MAX_TEXT}" placeholder="输入消息…" aria-label="输入消息"></textarea>
        <button class="mp-button" type="button" id="hs-send">发送</button>
      </div>
      <p class="hs-composer-hint" id="hs-reply-hint">发送后不可修改</p>
    </div>`;
  }

  function bindComposer(thread) {
    document.querySelectorAll('[data-hs-quick]').forEach(button => button.addEventListener('click', () => {
      const input = document.querySelector('#hs-reply');
      if (input) { input.value = QUICK_REPLIES[Number(button.dataset.hsQuick)] || ''; input.focus(); }
    }));
    // 发送即发出，不再弹「最终文本预览 / 确认发送」。
    // 保留的护栏：内容安全事前扫描、PII 提示、clientRequestId 幂等、发送后不可修改、终态只读。
    const sendButton = document.querySelector('#hs-send');
    if (!sendButton) return;
    let pendingRequestId = requestId();
    sendButton.addEventListener('click', () => {
      const input = document.querySelector('#hs-reply');
      const text = String(input?.value || '').trim();
      const hint = document.querySelector('#hs-reply-hint');
      const scan = HS.scanText(text);
      if (scan.blocked) {
        if (hint) hint.textContent = `${scan.reason}${scan.hint ? ` · ${scan.hint}` : ''}`;
        toast(scan.reason);
        return;
      }
      const result = role === HS.ROLE.TEACHER
        ? HS.replyThread({ threadId: thread.threadId, text, clientRequestId: pendingRequestId })
        : HS.appendParentMessage({ threadId: thread.threadId, text, clientRequestId: pendingRequestId });
      if (!result.ok) { toast(result.reason); return; }
      pendingRequestId = requestId();
      if (result.delivery) toast(result.delivery.status === '已送达' ? '回复已发送，通知已送达家长' : '回复已发送，未授权订阅消息，已降级站内红点');
      else toast('留言已发送，等待教师回复');
      renderDetail();
    });
  }

  // 从班级详情直达：该班级还没有会话时，展示空会话 + 输入栏，提交首条留言后才创建。
  function renderNewThread(classRef) {
    const className = params.get('className') || '本班沟通';
    const head = `<header class="hs-chat-topbar">
      <a class="hs-chat-back" href="${esc(link(listUrl))}" aria-label="返回家校沟通">‹</a>
      <div class="hs-chat-topbar-main"><strong>${esc(className)}</strong><span>与授课教师沟通 · 长期会话</span></div>
    </header>`;
    main.innerHTML = `<div class="hs-chat-page">${head}
      <div class="hs-chat-bubbles" aria-label="沟通记录"><div class="hs-chat-empty">还没有留言。发出第一条消息后，这个班级的沟通会一直留在这里。</div></div>
      <div class="hs-composer-bar" id="hs-composer">
        <div class="hs-composer-row">
          <textarea id="hs-reply" rows="1" maxlength="${HS.MAX_TEXT}" placeholder="输入消息…" aria-label="输入消息"></textarea>
          <button class="mp-button" type="button" id="hs-send">发送</button>
        </div>
        <p class="hs-composer-hint" id="hs-reply-hint">发送后不可修改</p>
      </div></div>`;
    document.querySelector('#hs-send')?.addEventListener('click', () => {
      const text = String(document.querySelector('#hs-reply')?.value || '').trim();
      const hint = document.querySelector('#hs-reply-hint');
      const scan = HS.scanText(text);
      if (scan.blocked) {
        if (hint) hint.textContent = `${scan.reason}${scan.hint ? ` · ${scan.hint}` : ''}`;
        toast(scan.reason);
        return;
      }
      const result = HS.createThread({ classId: classRef, className, text, clientRequestId: requestId() });
      if (!result.ok) { toast(result.reason); return; }
      global.location.href = link(`${detailUrl}?threadId=${encodeURIComponent(result.threadId)}`);
    });
  }

  // CR-2026-176 LT-06：独立「发起沟通」页。教师从联系人页选中尚无会话的学员后进入，
  // 不预建空会话——发送成功才创建；取消、内容安全拦截或越权均不产生任何写入。
  function renderCompose() {
    const classRef = params.get('classId') || '';
    const studentId = params.get('studentId') || '';
    const back = `<a class="hs-chat-back" href="${esc(link(contactsUrl))}" aria-label="返回联系人">‹</a>`;
    const head = (title, sub) => `<header class="hs-chat-topbar">${back}<div class="hs-chat-topbar-main"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div></header>`;
    const contact = role === HS.ROLE.TEACHER
      ? HS.listContacts().find(item => item.classId === classRef && item.studentId === studentId && !item.closed)
      : null;
    if (!contact) {
      main.innerHTML = `<div class="hs-chat-page is-list">${head('无法发起沟通', '请先选择联系人')}<div class="hs-chat-empty">该学员不在你负责的班级，或会话已结束。</div><a class="mp-button secondary full" href="${esc(link(contactsUrl))}">返回联系人</a></div>`;
      return;
    }
    main.innerHTML = `<div class="hs-chat-page" data-hs-compose="1">${head(contact.className, contact.studentName + ' · 主动发起沟通')}
      <div class="hs-chat-bubbles" aria-label="沟通记录"><div class="hs-chat-empty">还没有留言。发出第一条消息后，这个班级的沟通会一直留在这里，家长端会收到通知。</div></div>
      <div class="hs-composer-bar" id="hs-composer">
        <div class="hs-composer-row">
          <textarea id="hs-reply" rows="1" maxlength="${HS.MAX_TEXT}" placeholder="输入消息…" aria-label="输入消息"></textarea>
          <button class="mp-button" type="button" id="hs-send">发送</button>
        </div>
        <p class="hs-composer-hint" id="hs-reply-hint">发送后不可修改</p>
      </div></div>`;
    document.querySelector('#hs-send')?.addEventListener('click', () => {
      const text = String(document.querySelector('#hs-reply')?.value || '').trim();
      const hint = document.querySelector('#hs-reply-hint');
      // 内容安全扫描与 PII 提示由 startThreadByTeacher 统一执行，此处不重复扫描。
      const result = HS.startThreadByTeacher({ classId: classRef, studentId, text, clientRequestId: requestId() });
      if (!result.ok) {
        if (hint) hint.textContent = `${result.reason}${result.hint ? ` · ${result.hint}` : ''}`;
        toast(result.reason);
        return;
      }
      toast(result.delivery && result.delivery.status === '已送达' ? '留言已发送，通知已送达家长' : '留言已发送，未授权订阅消息，已降级站内红点');
      global.location.href = link(`${detailUrl}?threadId=${encodeURIComponent(result.threadId)}`);
    });
  }

  function renderDetail() {
    const threadId = params.get('threadId');
    const classRef = params.get('classId');
    const studentId = params.get('studentId') || '';
    let thread = HS.getThread(threadId);
    if (!thread && classRef) thread = HS.findThreadByClass(classRef, studentId ? { studentId } : undefined);
    if (!thread && classRef && role === HS.ROLE.PARENT) { renderNewThread(classRef); return; }
    // 兼容早期 teacherStart=1 直达链接：统一重定向到独立「发起沟通」页，避免两处渲染同一内容。
    if (!thread && classRef && role === HS.ROLE.TEACHER && params.get('teacherStart') === '1') {
      const next = new URLSearchParams({ classId: classRef, studentId });
      const className = params.get('className');
      if (className) next.set('className', className);
      global.location.replace(link(`${composeUrl}?${next}`));
      return;
    }
    if (!thread) {
      main.innerHTML = `<div class="hs-chat-page is-list"><header class="hs-chat-topbar"><div class="hs-chat-topbar-main"><strong>沟通详情</strong><span>会话不存在或无权访问</span></div></header><div class="hs-chat-empty">请从家校沟通列表重新进入。</div><a class="mp-button secondary full" href="${esc(link(listUrl))}">返回家校沟通</a></div>`;
      return;
    }
    HS.markRead(thread.threadId);
    const messages = HS.listMessages(thread.threadId);
    const head = `<header class="hs-chat-topbar">
      <a class="hs-chat-back" href="${esc(link(listUrl))}" aria-label="返回家校沟通">‹</a>
      <div class="hs-chat-topbar-main"><strong>${esc(thread.className)}</strong><span>${esc(thread.studentName)} · ${esc(thread.teacherName)} · ${esc(statusLabel(thread))}</span></div>
    </header>`;
    const bubbles = messages.length
      ? messages.map(messageBubble).join('')
      : '<div class="hs-chat-empty">暂无留言内容</div>';
    const composer = thread.status === HS.STATUS.CLOSED
      ? `<div class="hs-composer-bar"><p class="hs-composer-hint">${esc(thread.closedBy === '教务下架' ? '该会话已由教务下架' : '课程已结束')} · 只读，历史留言仍可查看</p></div>`
      : composerBar(thread);
    main.innerHTML = `<div class="hs-chat-page" data-hs-thread="${esc(thread.threadId)}">${head}<div class="hs-chat-bubbles" aria-label="沟通记录">${bubbles}</div>${composer}</div>`;
    bindComposer(thread);
  }

  // ---------- 既有页面入口（LP-01 / LT-01）----------
  // 教师端班级模块顶部入口（2026-11-06 客户反馈）：收敛为「家校沟通 + 数字徽标」，
  // 标题区、说明文案、整行按钮等多余内容全部去掉；徽标沿用原卡片的待回复数口径。
  function classModuleEntryHtml(pending) {
    const badge = pending
      ? `<span class="hs-entry-badge" aria-label="${pending} 条待回复">${pending}</span>`
      : '';
    return `<a class="hs-class-top-entry" data-hs-class-entry href="${esc(link(listUrl))}">家校沟通${badge}</a>`;
  }

  function entryHtml(compact) {
    const pending = HS.pendingCount();
    const unread = HS.unreadCount();
    const badge = pending ? pill(`${pending} 条待回复`, 'amber') : unread ? pill(`${unread} 条更新`, 'amber') : '';
    if (compact) {
      return `<a class="mp-profile-entry" href="${esc(link(listUrl))}"><div class="mp-profile-entry-head"><span class="mp-profile-entry-icon" aria-hidden="true">校</span><strong>家校沟通</strong>${badge}<span class="mp-link">${role === HS.ROLE.TEACHER ? '查看待回复 ›' : '联系教师 ›'}</span></div></a>`;
    }
    // 教师端「我的班级 / 课次详情」走顶部收敛形态；其余保留原完整卡片（防御，当前无调用）。
    if (role === HS.ROLE.TEACHER) return classModuleEntryHtml(pending);
    return card(`<div class="mp-section-head"><h2>家校沟通</h2>${badge}</div>
      <p class="mp-muted">与授课教师异步留言，教师回复后收到通知。仅用于日常沟通，退费、成绩争议等请走客服或教务流程。</p>
      <a class="mp-button full" href="${esc(link(listUrl))}">进入家校沟通${pending ? `（${pending} 条待回复）` : ''}</a>`);
  }

  // 班级详情页（学员端）：入口并入底部「评价」操作条，只保留一个按钮 + 未读数字。
  // 不插卡片、不加标题与说明文案，避免入口再次落到页面最顶部。
  // 从班级详情页 DOM 取班级名，仅用于会话头展示；取不到时详情页用「本班沟通」兜底。
  function currentClassTitle() {
    const nodes = document.querySelectorAll('.mp-class-detail-head h2, .mp-class-head h2, .mp-stack h2');
    for (const node of nodes) {
      const text = String(node.textContent || '').trim();
      if (text && text !== '页面说明' && text !== '班级详情') return text.slice(0, 40);
    }
    return '';
  }

  function classDetailEntryHtml() {
    const unread = HS.unreadCount();
    const badge = unread
      ? `<span class="hs-entry-badge" aria-label="${unread} 条未读回复">${unread}</span>`
      : '';
    const classId = params.get('courseId') || '';
    const className = currentClassTitle();
    const query = classId
      ? `?classId=${encodeURIComponent(classId)}${className ? `&className=${encodeURIComponent(className)}` : ''}`
      : '';
    return `<a class="mp-button secondary hs-entry-button" data-hs-entry href="${esc(link(`${detailUrl}${query}`))}">家校沟通${badge}</a>`;
  }

  function injectClassDetailEntry() {
    const actions = main.querySelector('.mp-class-review-actions');
    if (!actions) return false;
    if (actions.querySelector('[data-hs-entry]')) return true;
    const reviewButton = actions.querySelector('[data-class-review]');
    if (!reviewButton) return false;
    reviewButton.insertAdjacentHTML('afterend', classDetailEntryHtml());
    const hint = actions.querySelector('.mp-class-review-hint');
    if (hint) hint.style.flex = '1 1 auto';
    return true;
  }

  // 教师端班级详情（class-overview.html）：入口改为吸底固定条，只保留一个按钮 + 未读数字。
  // 不插卡片、不加标题与说明文案；教师一个班级对应多位家长、多条长期会话，
  // 因此点击落到会话列表由教师选择具体家长，不擅自挑一条会话直达，避免沟通对象错位。
  function teacherClassDockHtml() {
    const unread = HS.unreadCount();
    const badge = unread
      ? `<span class="hs-entry-badge" aria-label="${unread} 条未读回复">${unread}</span>`
      : '';
    return `<a class="mp-button hs-dock-button" data-hs-dock href="${esc(link(listUrl))}">家校沟通${badge}</a>`;
  }

  function injectTeacherClassDock() {
    if (document.querySelector('[data-hs-dock-layer]')) return true;
    // 挂到 body 而非 .mobile-main：班级详情分段/筛选会重写 main.innerHTML，挂在 body 才不会被冲掉。
    const layer = document.createElement('div');
    layer.className = 'hs-dock';
    layer.setAttribute('data-hs-dock-layer', '');
    layer.innerHTML = teacherClassDockHtml();
    document.body.appendChild(layer);
    return true;
  }

  // 教师端「我的」页（2026-11-06 客户反馈）：家校沟通入口置于「消息通知」行上方。
  // 该页使用 .teacher-profile-row 行式列表、没有 .mp-profile-entry-list，
  // 原 injectEntry() 对它不注入任何入口；这里按「消息通知」行锚点插一条同款行，
  // 未登录（个人中心）与已登录（教师事务）两种分组均覆盖，复用既有样式，不新增 CSS。
  function teacherProfileEntryHtml() {
    const pending = HS.pendingCount();
    // 数值沿用同列表既有右侧 value 样式，不塞进标题，保持行间呈现一致。
    const badge = pending ? `<span class="teacher-profile-row-value amber">${pending}条待回复</span>` : '';
    return `<a class="teacher-profile-row" data-hs-profile-entry href="${esc(link(listUrl))}"><span class="teacher-profile-row-mark" aria-hidden="true">校</span><span class="teacher-profile-row-copy"><strong>家校沟通</strong><small>查看家长留言并回复</small></span>${badge}<span class="teacher-profile-row-arrow" aria-hidden="true">›</span></a>`;
  }

  function injectTeacherProfileEntry() {
    const rows = [...main.querySelectorAll('.teacher-profile-row')];
    if (rows.some(row => row.hasAttribute('data-hs-profile-entry'))) return true;
    const messageRow = rows.find(row => (row.querySelector('strong')?.textContent || '').trim() === '消息通知');
    if (!messageRow) return false;
    messageRow.insertAdjacentHTML('beforebegin', teacherProfileEntryHtml());
    return true;
  }

  function injectEntry() {
    if (isList || isDetail || isContacts || isCompose) return;
    // 家校互动 v1.1 修订（2026-11-06 客户反馈）：消息通知页顶部的家校沟通入口去掉。
    // 两端 messages.html 均不再注入入口；家校沟通仍可从「我的」页、班级详情操作条按钮
    // 或教师端班级详情吸底条进入，会话列表与详情页本身不受影响。
    // 此处显式早退，避免后续新增 .mp-profile-entry-list 容器时又把入口带回页面顶部。
    if (path.endsWith('/messages.html')) return;
    // 教师端「我的」页：入口移到「消息通知」上方，不走通用末尾追加逻辑。
    if (role === HS.ROLE.TEACHER && path.endsWith('/profile.html')) {
      injectTeacherProfileEntry();
      return;
    }
    const entryList = document.querySelector('.mp-profile-entry-list');
    if (entryList) { entryList.insertAdjacentHTML('beforeend', entryHtml(true)); return; }
    // 教师端班级详情：吸底单按钮，原先的顶部卡片入口不再注入。
    if (role === HS.ROLE.TEACHER && path.endsWith('/class-overview.html')) {
      injectTeacherClassDock();
      return;
    }
    // 学员端班级详情页走操作条内注入；找不到操作条时也不兜底插顶部。
    if (path.endsWith('/class-detail.html') && role === HS.ROLE.PARENT) {
      injectClassDetailEntry();
      return;
    }
    // 顶部卡片白名单同步移除 messages.html（与上方早退保持单一口径）。
    if (!/(\/classes\.html|\/class-detail\.html|\/class-overview\.html)$/.test(path)) return;
    const holder = main.querySelector('.mp-stack') || main;
    holder.insertAdjacentHTML('afterbegin', entryHtml(false));
  }

  if (isContacts) renderContacts();
  else if (isCompose) renderCompose();
  else if (isList) renderList();
  else if (isDetail) renderDetail();
  else injectEntry();

  __classicExports['renderHomeSchool'] = () => {
    if (isContacts) return renderContacts();
    if (isCompose) return renderCompose();
    return isList ? renderList() : renderDetail();
  };
  __classicModules['shared/js/mobile-home-school.js'] = __classicExports;
})(globalThis);
