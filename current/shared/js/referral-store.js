(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 分享有礼（老带新裂变）共享演示存储（CR-2026-164）。
// 学员端读活动配置与本人邀请/绑定，登录页写入绑定，后台维护活动与发放确认；
// 三端通过 demo-store 的 localStorage 交换数据。礼品资格状态为派生展示值，不登记状态机。
const { readDemoState, writeDemoState, upsertDemoRecord } = __classicRequire("shared/js/demo-store.js");
const { DEMO_NOW, DEMO_TODAY } = __classicRequire("shared/js/demo-clock.js");

// 单活动 seed：状态按起止时间与演示时钟推导（未开始/进行中/已结束）。
const REFERRAL_ACTIVITY_SEED = {
  id: 'ACT-REFERRAL-001',
  title: '老带新 · 分享有礼',
  startAt: '2026-08-01 00:00',
  endAt: '2026-12-31 23:59',
  // CR-2026-164 客户调整：两张独立图片，分别用于「我的」页胶囊入口与活动页整页背景。
  pillImage: '',
  pageBackgroundImage: '',
  rulesText: [
    '1. 老学员（家长）在本页生成专属邀请码，分享卡片或链接给好友。',
    '2. 好友通过您的邀请进入小程序并注册登录，即完成推荐绑定（仅限首次注册，绑定后不可修改）。',
    '3. 好友完成首笔正价课程订单支付后，您获得礼品资格（0 元单、全额优惠券订单不计入）。',
    '4. 礼品由平台人工核实后发放，发放结果可在裂变记录中查询；发放确认前首单退款的，资格作废。',
    '5. 活动规则以平台公示内容为准；如对资格或发放有疑问，可通过客服渠道咨询核实。'
  ].join('\n')
};

// 邀请码：按账号生成的固定个人码（全活动期不变）。account-001 → YQ001。
const inviteCodeOf = (accountId) => `YQ${String(accountId || '').replace(/\D/g, '').padStart(3, '0')}`;

// 原型 mock 口径：演示账号 account-001/002 为「已注册老用户」（带码进入不可绑定、不可改绑）；
// account-003 为「首次注册的新用户」，用于演示带码登录 → 邀请已生效链路。
// 真实系统由服务端按账号是否首次注册判定，原型不实现注册流程。
const PRE_REGISTERED_ACCOUNTS = ['account-001', 'account-002'];
const REFERRAL_DISPLAY_NAMES = { 'account-001': '林女士', 'account-002': '周女士', 'account-003': '新用户C' };
const displayNameOf = (account, fallback = '') => REFERRAL_DISPLAY_NAMES[account?.id] || account?.name || fallback || account?.id || '';

function readActivity() {
  const shared = readDemoState();
  const stored = shared.referralActivity;
  const merged = { ...REFERRAL_ACTIVITY_SEED, ...(stored && typeof stored === 'object' ? stored : {}) };
  const now = String(DEMO_NOW);
  const status = now < merged.startAt ? '未开始' : now > merged.endAt ? '已结束' : '进行中';
  return { ...merged, status };
}

function saveActivity(patch = {}) {
  writeDemoState((next) => {
    const base = { ...REFERRAL_ACTIVITY_SEED, ...(next.referralActivity || {}) };
    if (Object.prototype.hasOwnProperty.call(patch, 'title')) base.title = String(patch.title || '').trim();
    if (Object.prototype.hasOwnProperty.call(patch, 'rulesText')) base.rulesText = String(patch.rulesText || '');
    if (Object.prototype.hasOwnProperty.call(patch, 'pillImage')) base.pillImage = String(patch.pillImage || '');
    if (Object.prototype.hasOwnProperty.call(patch, 'pageBackgroundImage')) base.pageBackgroundImage = String(patch.pageBackgroundImage || '');
    if (Object.prototype.hasOwnProperty.call(patch, 'startAt')) base.startAt = String(patch.startAt || '');
    if (Object.prototype.hasOwnProperty.call(patch, 'endAt')) base.endAt = String(patch.endAt || '');
    next.referralActivity = base;
  });
  return readActivity();
}

// 裂变记录 seed：推荐人统一为 account-001（林女士）；被邀请人为脱敏演示数据，
// 覆盖 待解锁 / 已解锁待发放 / 无效 / 已发放 四种资格状态，供后台列表与「我的邀请」演示。
// account-002（周女士）不预置绑定，供 E2E 演示「新用户带码登录 → 邀请已生效」链路。
const REFERRAL_RECORD_SEEDS = [
  {
    id: 'FZ20260905001',
    referrerAccountId: 'account-001', referrerName: REFERRAL_DISPLAY_NAMES['account-001'],
    inviteeName: '吴女士', inviteePhoneMasked: '138****0099', inviteeAccountId: '',
    registeredAt: '2026-09-05 10:12',
    firstOrder: { orderId: 'OD202609180012', amount: 980, paidAt: '2026-09-18 11:20' },
    refunded: false,
    grantRecord: null
  },
  {
    id: 'FZ20260902002',
    referrerAccountId: 'account-001', referrerName: REFERRAL_DISPLAY_NAMES['account-001'],
    inviteeName: '郑女士', inviteePhoneMasked: '137****0033', inviteeAccountId: '',
    registeredAt: '2026-09-02 15:40',
    firstOrder: { orderId: 'OD202609080021', amount: 680, paidAt: '2026-09-08 16:02' },
    refunded: true,
    grantRecord: null
  },
  {
    id: 'FZ20260828003',
    referrerAccountId: 'account-001', referrerName: REFERRAL_DISPLAY_NAMES['account-001'],
    inviteeName: '陈先生', inviteePhoneMasked: '136****0077', inviteeAccountId: '',
    registeredAt: '2026-08-28 09:30',
    firstOrder: { orderId: 'OD202609020015', amount: 1280, paidAt: '2026-09-02 10:08' },
    refunded: false,
    grantRecord: { method: '实物礼品寄送', operator: '陈顾问', note: '已电话核实首单有效，按收货地址寄出。', grantedAt: '2026-09-03 14:20' }
  }
];

function storedRecords() {
  const rows = readDemoState().referralRecords;
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
}

// 合并 seed 与运行期写入的记录（按 id 去重）。
function listReferralRecords() {
  const byId = new Map(REFERRAL_RECORD_SEEDS.map((row) => [row.id, { ...row }]));
  storedRecords().forEach((row) => byId.set(row.id, { ...row }));
  return [...byId.values()].sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || '')));
}

function referralRecordsOfReferrer(accountId) {
  return listReferralRecords().filter((row) => row.referrerAccountId === accountId);
}

function referralBindingOfInvitee(accountId) {
  return listReferralRecords().find((row) => row.inviteeAccountId === accountId) || null;
}

// 首单口径（CR-2026-164 §4.2）：该账号第一笔「已支付且金额 > 0」的正价订单（0 元单、全额券单不算）；
// 资格判定在支付成功节点。真实账号（演示家长）从共享订单流计算；虚构演示被邀请人读记录内快照。
function firstQualifyingOrder(inviteeAccountId, snapshot) {
  if (inviteeAccountId) {
    // 「已支付」为资格判定节点；订单进入退款后状态会变为退款中／已退款，
    // 仍需按「曾完成支付」识别首单，才能把发放前退款的记录派生为「无效」。
    const orders = (readDemoState().orders || []).filter((order) => order.accountId === inviteeAccountId);
    const paid = orders
      .filter((order) => Number(order.amount) > 0 && (order.status === '已支付' || order.status === '退款中' || order.status === '已退款' || Boolean(order.paidAt)))
      .sort((a, b) => String(a.paidAt || a.createdAt || '').localeCompare(String(b.paidAt || b.createdAt || '')));
    return paid[0] || null;
  }
  return snapshot || null;
}

// 首单退款判定：首单进入退款流程（退款中/已退款）即视为退款。
function orderRefunded(order) {
  if (!order) return false;
  if (order.status === '退款中' || order.status === '已退款') return true;
  return Boolean(order.refundStatus) && /退款/.test(String(order.refundStatus));
}

// 礼品资格状态（派生展示值）：
//   已发放 = 有人工确认记录；无效 = 发放前首单退款；已解锁待发放 = 首单已支付；待解锁 = 未出首单。
function giftStatusOf(record) {
  if (record.grantRecord) return '已发放';
  const firstOrder = firstQualifyingOrder(record.inviteeAccountId, record.firstOrder);
  if (!firstOrder) return '待解锁';
  if (orderRefunded(firstOrder) || record.refunded) return '无效';
  return '已解锁待发放';
}

// 首单事实（支付时间/金额/退款）统一口径，供后台列表与学员端「我的邀请」复用。
function firstOrderFact(record) {
  const order = firstQualifyingOrder(record.inviteeAccountId, record.firstOrder);
  if (!order) return { paidAt: '', amount: '', refunded: false };
  return {
    paidAt: String(order.paidAt || order.createdAt || ''),
    amount: Number(order.amount) || 0,
    refunded: orderRefunded(order) || Boolean(record.refunded)
  };
}

// 绑定推荐人（CR-2026-164 §4.1/4.4）：仅新用户首次注册登录时发生；已注册（已有绑定）不可绑、不可改绑；自邀拦截。
// 返回 { ok, reason }：ok=true 绑定成功（邀请已生效）；ok=false 时 reason 供 toast。
function bindReferral(inviteCode, inviteeAccountId) {
  const code = String(inviteCode || '').trim().toUpperCase();
  const inviteeId = String(inviteeAccountId || '');
  if (!code || !inviteeId) return { ok: false, reason: '' };
  // 活动结束后新注册不再计礼；已绑定推荐关系与已解锁礼品资格保留（CR-2026-164 §4.6）。
  if (readActivity().status !== '进行中') return { ok: false, reason: '活动未开始或已结束，本次邀请不计礼' };
  const shared = readDemoState();
  const inviteeAccount = (shared.accounts || []).find((account) => account.id === inviteeId);
  if (!inviteeAccount) return { ok: false, reason: '' };
  // 自邀拦截：邀请码属于本人。
  if (inviteCodeOf(inviteeId) === code) return { ok: false, reason: '不能邀请自己，本次绑定不生效。' };
  // 已注册用户（含已有绑定）不可绑定、不可改绑；绑定关系一经建立不可修改。
  if (referralBindingOfInvitee(inviteeId) || PRE_REGISTERED_ACCOUNTS.includes(inviteeId)) {
    return { ok: false, reason: '已注册用户不可绑定推荐人' };
  }
  const referrer = (shared.accounts || []).find((account) => inviteCodeOf(account.id) === code);
  if (!referrer) return { ok: false, reason: '邀请码无效，本次绑定不生效。' };
  const record = {
    id: `FZ${String(DEMO_TODAY).replace(/-/g, '')}${String(Math.floor(Math.random() * 900) + 100)}`,
    referrerAccountId: referrer.id,
    referrerName: displayNameOf(referrer),
    inviteeName: displayNameOf(inviteeAccount, inviteeId),
    inviteePhoneMasked: inviteeAccount.phone || '',
    inviteeAccountId: inviteeId,
    registeredAt: DEMO_NOW,
    firstOrder: null,
    refunded: false,
    grantRecord: null
  };
  writeDemoState((next) => {
    const rows = Array.isArray(next.referralRecords) ? next.referralRecords : [];
    next.referralRecords = [...rows, record];
  });
  return { ok: true, reason: '邀请已生效' };
}

// 礼品发放确认（人工，写审计）：仅「已解锁待发放」可确认；确认后不可二次修改。
// 返回 { ok, reason }。
function confirmReferralGrant(recordId, { method, operator, note } = {}) {
  const rows = listReferralRecords();
  const record = rows.find((row) => row.id === recordId);
  if (!record) return { ok: false, reason: '记录不存在或已失效。' };
  if (giftStatusOf(record) !== '已解锁待发放') return { ok: false, reason: '仅「已解锁待发放」的记录可执行发放确认。' };
  const methodValue = String(method || '').trim();
  const operatorValue = String(operator || '').trim();
  if (!methodValue) return { ok: false, reason: '请选择发放方式。' };
  if (!operatorValue) return { ok: false, reason: '请填写经办人。' };
  const grant = {
    method: methodValue,
    operator: operatorValue,
    note: String(note || '').trim(),
    grantedAt: DEMO_NOW
  };
  // seed 记录写入演示存储（upsert 按 id 合并，保留其余字段），运行期记录同样处理。
  upsertDemoRecord('referralRecords', { ...record, grantRecord: grant });
  return { ok: true, reason: '已确认发放并写入审计记录。', grant };
}

// 后台「学员用户管理」关联口径：学员端账号与后台家长档案按脱敏手机号对齐（两端 seed 一致）。
function accountByPhone(phone) {
  return (readDemoState().accounts || []).find((account) => account.phone === phone) || null;
}
function accountIdOfPhone(phone) { return accountByPhone(phone)?.id || ''; }
function referrerNameOfPhone(phone) {
  const account = accountByPhone(phone);
  if (!account) return '—';
  return referralBindingOfInvitee(account.id)?.referrerName || '—';
}
function referralCountOfPhone(phone) {
  const account = accountByPhone(phone);
  return account ? referralRecordsOfReferrer(account.id).length : 0;
}

  __classicExports["inviteCodeOf"] = inviteCodeOf;
  __classicExports["readActivity"] = readActivity;
  __classicExports["saveActivity"] = saveActivity;
  __classicExports["listReferralRecords"] = listReferralRecords;
  __classicExports["referralRecordsOfReferrer"] = referralRecordsOfReferrer;
  __classicExports["referralBindingOfInvitee"] = referralBindingOfInvitee;
  __classicExports["firstQualifyingOrder"] = firstQualifyingOrder;
  __classicExports["giftStatusOf"] = giftStatusOf;
  __classicExports["firstOrderFact"] = firstOrderFact;
  __classicExports["bindReferral"] = bindReferral;
  __classicExports["confirmReferralGrant"] = confirmReferralGrant;
  __classicExports["accountIdOfPhone"] = accountIdOfPhone;
  __classicExports["referrerNameOfPhone"] = referrerNameOfPhone;
  __classicExports["referralCountOfPhone"] = referralCountOfPhone;
  __classicModules["shared/js/referral-store.js"] = __classicExports;
})(globalThis);
