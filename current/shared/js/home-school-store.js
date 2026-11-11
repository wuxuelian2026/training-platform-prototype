(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};

  // 家校留言：人工异步留言 + 通知闭环；不提供自动回复、自动翻译、举报入口与即时通讯。
  // 原型以 localStorage 模拟服务端持久化与三端共享；生产实现须以服务端接口 + 权限校验替换。
  const STORAGE_KEY = 'hbyx-home-school-demo-v1';
  const MAX_TEXT = 300;
  // CLOSED 为系统侧只读终态（课程结束 / 教务下架），家长与教师均不提供主动结束入口。
  const STATUS = { PENDING: '待回复', REPLIED: '已回复', CLOSED: '已关闭' };
  const ROLE = { PARENT: 'parent', TEACHER: 'teacher', ADMIN: 'admin' };
  const ACTOR = { parent: 'parent-default', teacher: 'teacher-default', admin: '教务管理员' };

  function nowText() {
    const pad = value => String(value).padStart(2, '0');
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

  function seed() {
    // CR-2026-176：家校关系绑定扩充为「多班级 × 每班多学员」，供教师端「联系人」按班级分组选择。
    // 每条绑定即一个「班级 × 学员 × 授课教师 × 家长」沟通对象；active=false 表示已结课，不进联系人列表。
    // parentAccountId 为演示简化值（统一家长账号），生产实现须按学员家长账号绑定替换。
    const bindings = [
      { classId: 'CLASS-HS-01', className: '少儿中国舞启蒙 1 班', studentId: 'STU-001', studentName: '林知夏', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true },
      { classId: 'CLASS-HS-01', className: '少儿中国舞启蒙 1 班', studentId: 'STU-003', studentName: '周予安', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true },
      { classId: 'CLASS-HS-01', className: '少儿中国舞启蒙 1 班', studentId: 'STU-004', studentName: '陈一诺', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true },
      { classId: 'CLASS-HS-02', className: '少儿创意绘画 A 班', studentId: 'STU-001', studentName: '林知夏', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true },
      { classId: 'CLASS-HS-02', className: '少儿创意绘画 A 班', studentId: 'STU-005', studentName: '赵明月', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true },
      { classId: 'CLASS-HS-03', className: '少儿国画基础班（已结课）', studentId: 'STU-002', studentName: '林知远', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: false },
      { classId: 'CLASS-HS-04', className: '少儿街舞基础班', studentId: 'STU-006', studentName: '许星辰', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true },
      { classId: 'CLASS-HS-04', className: '少儿街舞基础班', studentId: 'STU-007', studentName: '刘思源', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true },
      { classId: 'CLASS-HS-05', className: '少儿书法入门班', studentId: 'STU-008', studentName: '孙艺涵', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', active: true }
    ];
    const threads = [
      { threadId: 'HS-T-001', classId: 'CLASS-HS-01', className: '少儿中国舞启蒙 1 班', studentId: 'STU-001', studentName: '林知夏', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', status: STATUS.PENDING, createdAt: '2026-11-03 18:42', lastMessageAt: '2026-11-05 09:20', closedAt: '', closedBy: '', unreadByParent: false, unreadByTeacher: true },
      { threadId: 'HS-T-003', classId: 'CLASS-HS-02', className: '少儿创意绘画 A 班', studentId: 'STU-001', studentName: '林知夏', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', status: STATUS.PENDING, createdAt: '2026-11-05 10:06', lastMessageAt: '2026-11-05 10:06', closedAt: '', closedBy: '', unreadByParent: false, unreadByTeacher: true },
      { threadId: 'HS-T-004', classId: 'CLASS-HS-03', className: '少儿国画基础班（已结课）', studentId: 'STU-002', studentName: '林知远', teacherId: 'teacher-default', teacherName: '周老师', parentAccountId: 'parent-default', status: STATUS.CLOSED, createdAt: '2026-09-18 15:10', lastMessageAt: '2026-09-19 09:31', closedAt: '2026-10-20 18:00', closedBy: '课程结束', unreadByParent: false, unreadByTeacher: false }
    ];
    const messages = [
      { messageId: 'HS-M-001', threadId: 'HS-T-001', senderRole: ROLE.PARENT, senderLabel: '林女士（家长）', text: '周老师您好，这周六的课是不是调整到下午三点？麻烦确认一下，谢谢。', createdAt: '2026-11-05 09:20', clientRequestId: 'seed-1' },
      { messageId: 'HS-M-002', threadId: 'HS-T-001', senderRole: ROLE.PARENT, senderLabel: '林女士（家长）', text: '孩子最近在家练基本功，想问一下压腿练习有没有需要特别注意的地方？', createdAt: '2026-11-03 18:42', clientRequestId: 'seed-2' },
      { messageId: 'HS-M-003', threadId: 'HS-T-001', senderRole: ROLE.TEACHER, senderLabel: '周老师', text: '家长您好，课前充分热身，每次压腿时间控制在十分钟以内，以孩子不感到疼痛为准。课堂上有情况我会及时和您沟通。', createdAt: '2026-11-03 20:05', clientRequestId: 'seed-3' },
      { messageId: 'HS-M-004', threadId: 'HS-T-003', senderRole: ROLE.PARENT, senderLabel: '林女士（家长）', text: '绘画课的材料需要家长自己准备吗？', createdAt: '2026-11-05 10:06', clientRequestId: 'seed-4' },
      { messageId: 'HS-M-005', threadId: 'HS-T-004', senderRole: ROLE.PARENT, senderLabel: '林女士（家长）', text: '想了解一下国画班结课后的学习成果在哪里查看。', createdAt: '2026-09-18 15:10', clientRequestId: 'seed-5' },
      { messageId: 'HS-M-006', threadId: 'HS-T-004', senderRole: ROLE.TEACHER, senderLabel: '周老师', text: '家长您好，学习成果在「我的-学习成果」中查看，结课报告发布后会有通知提醒。', createdAt: '2026-09-19 09:31', clientRequestId: 'seed-6' }
    ];
    return {
      version: 1,
      threads,
      messages,
      bindings,
      deliveries: [
        { id: 'HS-D-001', threadId: 'HS-T-001', title: '教师已回复您的家校留言', channel: '订阅消息', status: '已送达', createdAt: '2026-11-03 20:05' },
        { id: 'HS-D-002', threadId: 'HS-T-004', title: '教师已回复您的家校留言', channel: '站内未读红点', status: '未授权降级', createdAt: '2026-09-19 09:31' }
      ],
      audit: [
        { id: 'HS-A-001', actor: '林女士（家长）', action: '发起留言', target: 'HS-T-001', result: '通过', detail: '内容安全审核通过', createdAt: '2026-11-03 18:42' },
        { id: 'HS-A-002', actor: '周老师', action: '回复留言', target: 'HS-T-001', result: '通过', detail: '人工编辑后发送', createdAt: '2026-11-03 20:05' }
      ],
      rules: {
        enabled: true,
        keywords: ['傻子', '骗子', '加一下微信', '私聊', '线下交易', '把手机号发我'],
        subscriptionAuthorized: true,
        scanCount: 2,
        blockCount: 0
      }
    };
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && Array.isArray(parsed.threads)) return parsed;
      }
    } catch (error) { /* 数据损坏时回落到种子 */ }
    const fresh = seed();
    write(fresh);
    return fresh;
  }
  function write(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (error) { /* 隐私模式下忽略 */ }
    return data;
  }
  function mutate(fn) {
    const data = read();
    fn(data);
    write(data);
    return data;
  }

  // 角色按页面路径判定，保证原型页面直接打开也能演示；生产以会话态与服务端鉴权为准。
  function currentRole() {
    const path = String(global.location ? global.location.pathname : '');
    if (path.includes('/admin/')) return ROLE.ADMIN;
    if (path.includes('/teacher/')) return ROLE.TEACHER;
    return ROLE.PARENT;
  }
  function currentActorId() { return ACTOR[currentRole()]; }
  function roleLabel(role) { return role === ROLE.TEACHER ? '周老师' : role === ROLE.ADMIN ? '教务管理员' : '林女士（家长）'; }

  function canAccess(thread, role, actorId) {
    if (!thread) return false;
    if (role === ROLE.ADMIN) return true;
    if (role === ROLE.TEACHER) return thread.teacherId === actorId;
    return thread.parentAccountId === actorId;
  }

  function listThreads(options) {
    const role = (options && options.role) || currentRole();
    const actorId = (options && options.actorId) || currentActorId();
    const data = read();
    return data.threads
      .filter(thread => canAccess(thread, role, actorId))
      .sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));
  }
  // 一个「班级 × 学员 × 授课教师 × 家长」长期只有一条会话，按 classRef 查，不每次新建。
  // CR-2026-176：一个班级可有多名学员，传入 options.studentId 时按「班级 × 学员」精确匹配，
  // 避免同班不同学员误落到同一条会话；不传时保持按班级取最新一条（兼容家长端班级详情直达）。
  function findThreadByClass(classRef, options) {
    if (!classRef) return null;
    const role = (options && options.role) || currentRole();
    const actorId = (options && options.actorId) || currentActorId();
    const studentId = options && options.studentId;
    return read().threads
      .filter(thread => thread.classId === classRef
        && (!studentId || thread.studentId === studentId)
        && canAccess(thread, role, actorId))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  }

  function getThread(threadId, options) {
    const role = (options && options.role) || currentRole();
    const actorId = (options && options.actorId) || currentActorId();
    const thread = read().threads.find(item => item.threadId === threadId);
    return canAccess(thread, role, actorId) ? thread : null;
  }
  function listMessages(threadId, options) {
    if (!getThread(threadId, options)) return [];
    return read().messages
      .filter(message => message.threadId === threadId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }
  function lastMessage(threadId) {
    const rows = read().messages
      .filter(item => item.threadId === threadId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return rows.length ? rows[rows.length - 1] : null;
  }
  function unreadCount(options) {
    const role = (options && options.role) || currentRole();
    return listThreads({ role }).filter(thread => role === ROLE.TEACHER ? thread.unreadByTeacher : thread.unreadByParent).length;
  }
  function pendingCount(options) {
    const role = (options && options.role) || currentRole();
    return listThreads({ role }).filter(thread => thread.status === STATUS.PENDING).length;
  }

  function pushAudit(data, entry) {
    data.audit.unshift({ id: uid('HS-A'), createdAt: nowText(), ...entry });
    if (data.audit.length > 200) data.audit.length = 200;
  }
  function pushDelivery(data, entry) {
    data.deliveries.unshift({ id: uid('HS-D'), createdAt: nowText(), ...entry });
    if (data.deliveries.length > 200) data.deliveries.length = 200;
  }

  // FR-H-07：服务端事前内容安全审核。原型在提交前同步执行，生产须在服务端复核。
  function scanText(text) {
    const value = String(text || '').trim();
    const data = read();
    if (data.rules.enabled) mutate(next => { next.rules.scanCount = (next.rules.scanCount || 0) + 1; });
    const blocked = reason => {
      mutate(next => { next.rules.blockCount = (next.rules.blockCount || 0) + 1; });
      return { blocked: true, reason, hint: '请删除相关内容后再提交；如涉及退费、成绩争议或安全事件，请联系客服或教务走既有流程。' };
    };
    if (!value) return { blocked: true, reason: '留言内容不能为空', hint: '请填写需要沟通的内容。' };
    if (value.length > MAX_TEXT) return { blocked: true, reason: `留言内容超过 ${MAX_TEXT} 字`, hint: `当前 ${value.length} 字，请精简到 ${MAX_TEXT} 字以内。` };
    if (/1[3-9]\d{9}/.test(value)) return blocked('含手机号等个人敏感信息');
    if (/\d{17}[\dXx]/.test(value)) return blocked('含证件号码等个人敏感信息');
    if (data.rules.enabled) {
      const hit = data.rules.keywords.find(keyword => value.includes(keyword));
      if (hit) return blocked('命中内容安全规则（辱骂、导流线下交易或索要联系方式）');
    }
    const sensitive = ['退费', '成绩争议', '安全事件', '投诉'].find(word => value.includes(word));
    return { blocked: false, reason: '', hint: sensitive ? '涉及退费、成绩争议或安全事件的内容请走客服/教务既有流程，本通道仅用于日常沟通。' : '' };
  }

  function findDuplicate(clientRequestId) {
    if (!clientRequestId) return null;
    return read().messages.find(item => item.clientRequestId === clientRequestId) || null;
  }

  function addMessage(data, payload) {
    const message = {
      messageId: uid('HS-M'),
      threadId: payload.threadId,
      senderRole: payload.senderRole,
      senderLabel: payload.senderLabel,
      text: payload.text,
      createdAt: nowText(),
      clientRequestId: payload.clientRequestId || ''
    };
    data.messages.push(message);
    return message;
  }

  // 课程目录 id 与家校关系绑定 id 在原型中不同源；找不到精确绑定时用首条在读绑定
  // 补齐学员与授课教师，classId 仍保留来源值，保证「一个班级一条会话」。
  function resolveBindingFor(classRef, className) {
    const data = read();
    const exact = data.bindings.find(item => item.classId === classRef);
    if (exact) return exact;
    const active = data.bindings.find(item => item.active);
    if (!active) return null;
    return { ...active, classId: classRef, className: String(className || '当前班级'), active: true };
  }

  // LP-04：一个「班级 × 学员 × 授课教师 × 家长」长期只有一条会话。
  // 已有会话直接追留言，不再每次新建工单式会话；首次留言时才创建。
  function createThread(payload) {
    if (currentRole() !== ROLE.PARENT) return { ok: false, reason: '仅家长可发起留言' };
    const duplicate = findDuplicate(payload.clientRequestId);
    if (duplicate) return { ok: true, threadId: duplicate.threadId, duplicated: true };
    const scan = scanText(payload.text);
    if (scan.blocked) return { ok: false, reason: scan.reason, hint: scan.hint };
    const binding = resolveBindingFor(payload.classId, payload.className);
    if (!binding) return { ok: false, reason: '当前学员没有在读班级，无法发起留言' };
    const existing = findThreadByClass(binding.classId, { studentId: binding.studentId });
    if (existing && existing.status === STATUS.CLOSED) {
      return { ok: false, reason: '该班级会话已结课或下架，如有疑问请联系客服或教务' };
    }
    if (existing) {
      const result = appendParentMessage({ threadId: existing.threadId, text: String(payload.text).trim(), clientRequestId: payload.clientRequestId });
      return result.ok ? { ok: true, threadId: existing.threadId, reused: true, hint: scan.hint } : result;
    }
    let created = null;
    mutate(data => {
      const threadId = uid('HS-T');
      data.threads.unshift({
        threadId, classId: binding.classId, className: binding.className,
        studentId: binding.studentId, studentName: binding.studentName,
        teacherId: binding.teacherId, teacherName: binding.teacherName,
        parentAccountId: currentActorId(), status: STATUS.PENDING,
        createdAt: nowText(), lastMessageAt: nowText(), closedAt: '', closedBy: '',
        unreadByParent: false, unreadByTeacher: true
      });
      addMessage(data, { threadId, senderRole: ROLE.PARENT, senderLabel: roleLabel(ROLE.PARENT), text: String(payload.text).trim(), clientRequestId: payload.clientRequestId });
      pushAudit(data, { actor: roleLabel(ROLE.PARENT), action: '发起留言', target: threadId, result: '通过', detail: '内容安全事前审核通过' });
      created = threadId;
    });
    return { ok: true, threadId: created, hint: scan.hint };
  }

  // 家长在已回复会话下追问：状态回到待回复（终态不可回跳）。
  function appendParentMessage(payload) {
    if (currentRole() !== ROLE.PARENT) return { ok: false, reason: '仅家长可追问' };
    const duplicate = findDuplicate(payload.clientRequestId);
    if (duplicate) return { ok: true, duplicated: true };
    const scan = scanText(payload.text);
    if (scan.blocked) return { ok: false, reason: scan.reason, hint: scan.hint };
    const thread = getThread(payload.threadId);
    if (!thread) return { ok: false, reason: '会话不存在或无权访问' };
    if (thread.status === STATUS.CLOSED) return { ok: false, reason: '会话已关闭，不能再留言' };
    mutate(data => {
      const row = data.threads.find(item => item.threadId === payload.threadId);
      row.status = STATUS.PENDING;
      // CR-2026-176：家长一旦追问，会话回到常规「教师待回复 / 已回复」语义，清掉教师主动发起标记。
      row.initiatedBy = '';
      row.lastMessageAt = nowText();
      row.unreadByTeacher = true;
      row.unreadByParent = false;
      addMessage(data, { threadId: payload.threadId, senderRole: ROLE.PARENT, senderLabel: roleLabel(ROLE.PARENT), text: String(payload.text).trim(), clientRequestId: payload.clientRequestId });
      pushAudit(data, { actor: roleLabel(ROLE.PARENT), action: '追加留言', target: payload.threadId, result: '通过', detail: '状态回到待回复' });
    });
    return { ok: true, hint: scan.hint };
  }

  // LT-04：教师人工回复；页面点「发送」即调用本函数，不自动生成或自动发送。
  function replyThread(payload) {
    if (currentRole() !== ROLE.TEACHER) return { ok: false, reason: '仅授课教师可回复' };
    const duplicate = findDuplicate(payload.clientRequestId);
    if (duplicate) return { ok: true, duplicated: true };
    const scan = scanText(payload.text);
    if (scan.blocked) return { ok: false, reason: scan.reason, hint: scan.hint };
    const thread = getThread(payload.threadId);
    if (!thread) return { ok: false, reason: '会话不存在或无权访问' };
    if (thread.status === STATUS.CLOSED) return { ok: false, reason: '会话已关闭，不能回复' };
    let delivery = null;
    mutate(data => {
      const row = data.threads.find(item => item.threadId === payload.threadId);
      row.status = STATUS.REPLIED;
      row.lastMessageAt = nowText();
      row.unreadByParent = true;
      row.unreadByTeacher = false;
      addMessage(data, { threadId: payload.threadId, senderRole: ROLE.TEACHER, senderLabel: roleLabel(ROLE.TEACHER), text: String(payload.text).trim(), clientRequestId: payload.clientRequestId });
      const authorized = data.rules.subscriptionAuthorized;
      delivery = {
        threadId: payload.threadId,
        title: '教师已回复您的家校留言',
        channel: authorized ? '订阅消息' : '站内未读红点',
        status: authorized ? '已送达' : '未授权降级'
      };
      pushDelivery(data, delivery);
      pushAudit(data, { actor: roleLabel(ROLE.TEACHER), action: '回复留言', target: payload.threadId, result: '通过', detail: `人工编辑后发送；触达=${delivery.channel}` });
    });
    return { ok: true, hint: scan.hint, delivery };
  }

  // CR-2026-176 LT-05：教师端「联系人」——只列本人授课班级的在读学员，按「班级 × 学员」精确关联会话。
  // 数据权限以 bindings 的 teacherId 为准，不按班级名/学员名猜测；active=false（已结课）不入列。
  function listContacts(options) {
    const role = (options && options.role) || currentRole();
    const actorId = (options && options.actorId) || currentActorId();
    if (role !== ROLE.TEACHER) return [];
    const data = read();
    return data.bindings
      .filter(item => item.active && item.teacherId === actorId)
      .map(item => {
        const thread = data.threads
          .filter(row => row.classId === item.classId && row.studentId === item.studentId && row.teacherId === actorId)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
        return {
          classId: item.classId, className: item.className,
          studentId: item.studentId, studentName: item.studentName,
          teacherId: item.teacherId, teacherName: item.teacherName,
          parentAccountId: item.parentAccountId || 'parent-default',
          active: item.active, hasThread: Boolean(thread),
          threadId: thread ? thread.threadId : '',
          threadStatus: thread ? thread.status : '',
          initiatedBy: thread ? (thread.initiatedBy || '') : '',
          closed: Boolean(thread && thread.status === STATUS.CLOSED)
        };
      });
  }

  // CR-2026-176 LT-06：教师主动发起沟通。
  // 规则变更：此前仅家长可发起；现在教师可从联系人入口对「本人授课班级 × 学员」发出首条留言。
  // 已有会话复用同一条长期会话（走 replyThread），无会话才创建；终态会话与越权对象一律拒绝。
  function startThreadByTeacher(payload) {
    if (currentRole() !== ROLE.TEACHER) return { ok: false, reason: '仅授课教师可发起沟通' };
    const duplicate = findDuplicate(payload.clientRequestId);
    if (duplicate) return { ok: true, threadId: duplicate.threadId, duplicated: true };
    const contact = listContacts().find(item =>
      item.classId === payload.classId && item.studentId === payload.studentId && !item.closed);
    if (!contact) return { ok: false, reason: '该学员不在你负责的班级，或会话已结束' };
    const text = String(payload.text || '').trim();
    const existing = findThreadByClass(contact.classId, { studentId: contact.studentId });
    if (existing) {
      const result = replyThread({ threadId: existing.threadId, text, clientRequestId: payload.clientRequestId });
      return result.ok
        ? { ok: true, threadId: existing.threadId, reused: true, hint: result.hint, delivery: result.delivery }
        : result;
    }
    const scan = scanText(text);
    if (scan.blocked) return { ok: false, reason: scan.reason, hint: scan.hint };
    let created = null;
    let delivery = null;
    mutate(data => {
      const threadId = uid('HS-T');
      data.threads.unshift({
        threadId, classId: contact.classId, className: contact.className,
        studentId: contact.studentId, studentName: contact.studentName,
        teacherId: contact.teacherId, teacherName: contact.teacherName,
        parentAccountId: contact.parentAccountId,
        status: STATUS.REPLIED, initiatedBy: ROLE.TEACHER,
        createdAt: nowText(), lastMessageAt: nowText(), closedAt: '', closedBy: '',
        unreadByParent: true, unreadByTeacher: false
      });
      addMessage(data, { threadId, senderRole: ROLE.TEACHER, senderLabel: roleLabel(ROLE.TEACHER), text, clientRequestId: payload.clientRequestId });
      const authorized = data.rules.subscriptionAuthorized;
      // 通知只提示「有新的家校沟通」，不携带留言正文、学情或评价内容。
      delivery = { threadId, title: '教师发起了家校沟通', channel: authorized ? '订阅消息' : '站内未读红点', status: authorized ? '已送达' : '未授权降级' };
      pushDelivery(data, delivery);
      pushAudit(data, { actor: roleLabel(ROLE.TEACHER), action: '主动发起沟通', target: threadId, result: '通过', detail: `班级 ${contact.classId} · 学员 ${contact.studentId}；仅记录 ID，不含留言原文` });
      created = threadId;
    });
    return { ok: true, threadId: created, hint: scan.hint, delivery };
  }

  function markRead(threadId) {
    const role = currentRole();
    mutate(data => {
      const row = data.threads.find(item => item.threadId === threadId);
      if (!row || !canAccess(row, role, currentActorId())) return;
      if (role === ROLE.TEACHER) row.unreadByTeacher = false;
      else row.unreadByParent = false;
    });
  }

  function closeThread(threadId, closedBy, options) {
    // 家长与教师均无「结束」入口；会话是长期关系，只读终态只由课程结束或教务下架产生。
    if (!(options && options.system === true) && currentRole() !== ROLE.ADMIN) {
      return { ok: false, reason: '家长与教师不能结束会话' };
    }
    const thread = getThread(threadId);
    if (!thread) return { ok: false, reason: '会话不存在或无权访问' };
    if (thread.status === STATUS.CLOSED) return { ok: false, reason: '会话已是关闭状态' };
    mutate(data => {
      const row = data.threads.find(item => item.threadId === threadId);
      row.status = STATUS.CLOSED;
      row.closedAt = nowText();
      row.closedBy = closedBy || (currentRole() === ROLE.ADMIN ? '教务下架' : '家长主动结束');
      pushAudit(data, { actor: roleLabel(currentRole()), action: row.closedBy === '教务下架' ? '下架会话' : '结束会话', target: threadId, result: '已关闭', detail: '终态，不回跳' });
    });
    return { ok: true };
  }

  // B03：教务在内容安全人工复核队列内下架，本期无独立举报工单。
  function takeDown(threadId, reason) {
    if (currentRole() !== ROLE.ADMIN) return { ok: false, reason: '仅后台教务可下架' };
    const result = closeThread(threadId, '教务下架');
    if (result.ok) mutate(data => pushAudit(data, { actor: '教务管理员', action: '内容复核处置', target: threadId, result: '已下架', detail: `处置原因：${String(reason || '违规内容').slice(0, 40)}` }));
    return result;
  }

  function listAudit() { return read().audit.slice(0, 60); }
  function listDeliveries() { return read().deliveries.slice(0, 60); }
  function listBindings() { return read().bindings.slice(); }
  function getRules() { return JSON.parse(JSON.stringify(read().rules)); }
  function saveRules(patch) {
    mutate(data => { data.rules = { ...data.rules, ...patch }; });
    return getRules();
  }
  function setBindingActive(classId, active) {
    mutate(data => {
      data.bindings.forEach(item => {
        if (item.classId === classId) item.active = Boolean(active);
      });
      pushAudit(data, { actor: '教务管理员', action: '维护沟通关系绑定', target: classId, result: active ? '启用' : '停用', detail: '班级 × 学员 × 授课教师绑定' });
    });
    return listBindings();
  }

  function minutesBetween(start, end) {
    const a = new Date(String(start).replace(' ', 'T') + ':00');
    const b = new Date(String(end).replace(' ', 'T') + ':00');
    const diff = (b - a) / 60000;
    return Number.isFinite(diff) && diff >= 0 ? diff : null;
  }
  function stats() {
    const data = read();
    const durations = [];
    data.threads.forEach(thread => {
      const firstReply = data.messages
        .filter(item => item.threadId === thread.threadId && item.senderRole === ROLE.TEACHER)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
      if (firstReply) {
        const value = minutesBetween(thread.createdAt, firstReply.createdAt);
        if (value !== null) durations.push(value);
      }
    });
    durations.sort((a, b) => a - b);
    const percentile = ratio => durations.length ? Math.round(durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))]) : 0;
    const replied = data.threads.filter(item => item.status !== STATUS.PENDING).length;
    return {
      total: data.threads.length,
      pending: data.threads.filter(item => item.status === STATUS.PENDING).length,
      replied: data.threads.filter(item => item.status === STATUS.REPLIED).length,
      closed: data.threads.filter(item => item.status === STATUS.CLOSED).length,
      responseP50: percentile(0.5),
      responseP95: percentile(0.95),
      replyRate: data.threads.length ? Math.round(replied / data.threads.length * 100) : 0,
      scanCount: data.rules.scanCount || 0,
      blockCount: data.rules.blockCount || 0,
      blockRate: data.rules.scanCount ? Math.round((data.rules.blockCount || 0) / data.rules.scanCount * 100) : 0
    };
  }

  function resetDemo() { write(seed()); return true; }
  function maskPhone(value) { const text = String(value || ''); return text.length >= 7 ? `${text.slice(0, 3)}****${text.slice(-4)}` : '***'; }

  Object.assign(__classicExports, {
    STATUS, ROLE, MAX_TEXT,
    currentRole, currentActorId, roleLabel,
    listThreads, getThread, listMessages, lastMessage, unreadCount, pendingCount,
    scanText, createThread, findThreadByClass, appendParentMessage, replyThread, markRead, closeThread, takeDown,
    listContacts, startThreadByTeacher,
    listAudit, listDeliveries, listBindings, getRules, saveRules, setBindingActive,
    stats, resetDemo, maskPhone
  });
  __classicModules['shared/js/home-school-store.js'] = __classicExports;
})(globalThis);
