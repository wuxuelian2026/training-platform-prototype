const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) { this.type = type; this.detail = init?.detail; }
};

const store = await import('../shared/js/demo-store.js');
const refunds = await import('../shared/js/refund-store.js');

const passed = [];
function check(condition, label) {
  if (!condition) throw new Error(`退款回归失败：${label}`);
  passed.push(label);
}

const futureSession = { date: '2026-09-20', startTime: '09:00', endTime: '10:00', status: '待上课' };
const defaults = store.classRefundSettings();

function seedClassCase(suffix, { status = '已分班', enrolled = 5, amount = 100 } = {}) {
  const classId = `refund-class-${suffix}`;
  const orderId = `refund-order-${suffix}`;
  const enrollmentId = `refund-enrollment-${suffix}`;
  store.writeDemoState((next) => ({
    ...next,
    classRefundSettings: defaults,
    classes: [...next.classes.filter((row) => row.id !== classId), { id: classId, name: suffix, lessons: 1, sessions: [futureSession], enrolled }],
    orders: [...next.orders.filter((row) => row.id !== orderId), { id: orderId, classId, studentId: 'student-001', accountId: 'account-001', amount, status: '已支付', createdAt: '2026-09-01 09:00' }],
    enrollments: [...next.enrollments.filter((row) => row.id !== enrollmentId), { id: enrollmentId, classId, studentId: 'student-001', accountId: 'account-001', status }]
  }));
  return { classId, orderId, enrollmentId };
}

function enrollmentOf(testCase) {
  return store.readDemoState().enrollments.find((row) => row.id === testCase.enrollmentId);
}

check(defaults.windowDays === 0 && defaults.selfMaxCompletedPercent === 100, '默认退款期限和消课比例参数正确');
check(defaults.includeBonusLessons === false && defaults.handlingFeePercent === 0 && defaults.minAmount === 1, '默认赠课、手续费和最低金额参数正确');

const applyCase = seedClassCase('apply');
const application = refunds.createRefundRequest({ orderId: applyCase.orderId, origin: refunds.REFUND_ORIGIN.LEARNER, requestedBy: '学员' });
check(application.ok && refunds.listRefunds().some((row) => row.id === application.refund.id), '申请退款生成共享退款单');
check(application.order.status === '退款中' && application.refund.status === '待审批', '申请后订单与退款单状态正确');
check(enrollmentOf(applyCase).status === '已分班' && enrollmentOf(applyCase).refundRelationStatus === '待审批', '申请后学籍保持在读并记录退款关联状态');
check(refunds.createRefundRequest({ orderId: applyCase.orderId, origin: refunds.REFUND_ORIGIN.LEARNER }).reason === 'REFUND_ALREADY_OPEN', '同订单重复申请被拦截');

const approved = refunds.settleRefund(application.refund.id, '通过', { name: '教务主管', channel: '原路退回' });
check(approved.ok && approved.refund.status === '退款中', '审批通过进入退款中');
const completed = refunds.settleRefund(application.refund.id, '完成', { name: '财务' });
check(completed.ok && completed.seatReleased, '渠道完成后释放名额');
check(enrollmentOf(applyCase).status === '已退班' && enrollmentOf(applyCase).refundRelationStatus === '已退款', '退款完成后学籍转已退班');
check(refunds.classById(applyCase.classId).enrolled === 4, '退款完成只减一次班级人数');
check(refunds.settleRefund(application.refund.id, '完成', { name: '财务' }).reason === 'REFUND_ALREADY_SETTLED', '重复完成不会二次释放名额');
check(store.readDemoState().refundAuditLogs.filter((row) => row.refundId === application.refund.id).length === 3, '申请、审批与完成均写入共享审计日志');
check(store.readDemoState().refundNotifications.some((row) => row.refundId === application.refund.id && row.type === '退款已完成'), '退款完成生成学员通知事件');

const rejectedCase = seedClassCase('reject');
const rejectedRequest = refunds.createRefundRequest({ orderId: rejectedCase.orderId, origin: refunds.REFUND_ORIGIN.LEARNER });
const rejected = refunds.settleRefund(rejectedRequest.refund.id, '拒绝', { name: '教务主管', rejectReason: '不符合退款规则' });
check(rejected.ok && rejected.order.status === '已支付', '退款拒绝后订单恢复已支付');
check(enrollmentOf(rejectedCase).status === '已分班' && enrollmentOf(rejectedCase).refundRelationStatus === '已拒绝', '自助退款拒绝后学籍仍在读');

for (const type of ['退班', '退学']) {
  for (const withRefund of [false, true]) {
    const suffix = `${type}-${withRefund ? 'refund' : 'no-refund'}`;
    const testCase = seedClassCase(suffix, { status: type === '退班' ? '已退班' : '已退学', enrolled: 4 });
    if (!withRefund) {
      check(!refunds.openRefundForOrder(testCase.orderId), `${type}不退费时不生成退款单`);
      check(refunds.classById(testCase.classId).enrolled === 4, `${type}不退费时人数保持异动后的值`);
      continue;
    }
    const request = refunds.createRefundRequest({ orderId: testCase.orderId, origin: refunds.REFUND_ORIGIN.ENROLLMENT, requestedBy: '教务异动登记' });
    check(request.ok && request.refund.businessKey === `refund:${testCase.orderId}`, `${type}同步退费生成订单级幂等键`);
    refunds.settleRefund(request.refund.id, '通过', { name: '教务主管', channel: '原路退回' });
    const done = refunds.settleRefund(request.refund.id, '完成', { name: '财务' });
    check(done.ok && !done.seatReleased, `${type}同步退费完成不重复释放名额`);
    check(refunds.classById(testCase.classId).enrolled === 4, `${type}同步退费完成后人数不重复减少`);
    check(enrollmentOf(testCase).status === (type === '退班' ? '已退班' : '已退学'), `${type}同步退费保留学籍主状态`);
  }
}

const exitedRejectCase = seedClassCase('exited-reject', { status: '已退学', enrolled: 4 });
const exitedRejectRequest = refunds.createRefundRequest({ orderId: exitedRejectCase.orderId, origin: refunds.REFUND_ORIGIN.ENROLLMENT });
const exitedReject = refunds.settleRefund(exitedRejectRequest.refund.id, '拒绝', { name: '教务主管', rejectReason: '资料不完整' });
check(exitedReject.academicTodo?.status === '待处理', '已退出学籍退款被拒生成教务待办');
check(enrollmentOf(exitedRejectCase).status === '已退学', '退款被拒不自动恢复已退出学籍');

const exceptionCase = seedClassCase('exception');
const exceptionRequest = refunds.createRefundRequest({ orderId: exceptionCase.orderId, origin: refunds.REFUND_ORIGIN.LEARNER });
refunds.settleRefund(exceptionRequest.refund.id, '通过', { name: '教务主管', channel: '原路退回' });
const exception = refunds.settleRefund(exceptionRequest.refund.id, '异常', { name: '财务', exceptionReason: '渠道超时' });
check(exception.ok && exception.refund.status === '退款异常' && exception.academicTodo?.status === '待处理', '渠道超时进入退款异常并生成待办');
const retry = refunds.settleRefund(exceptionRequest.refund.id, '重试', { name: '财务' });
check(retry.ok && retry.refund.status === '退款中' && retry.refund.retryCount === 1, '退款异常复用原退款单重试');

function seedVideoCase(suffix) {
  const orderId = `video-order-${suffix}`;
  const courseId = `video-course-${suffix}`;
  store.writeDemoState((next) => ({
    ...next,
    orders: [...next.orders.filter((row) => row.id !== orderId), { id: orderId, accountId: 'account-001', courseId, amount: 199, status: '已支付', createdAt: '2026-09-10 09:00' }],
    videoEntitlements: [...next.videoEntitlements.filter((row) => row.courseId !== courseId), { id: `entitlement-${suffix}`, accountId: 'account-001', courseId, status: '生效' }]
  }));
  return { orderId, courseId };
}

const videoRejectCase = seedVideoCase('reject');
const videoRejectRequest = refunds.createRefundRequest({ orderId: videoRejectCase.orderId, origin: refunds.REFUND_ORIGIN.LEARNER });
check(store.readDemoState().videoEntitlements.find((row) => row.courseId === videoRejectCase.courseId).status === '冻结', '视频退款申请冻结学习授权');
refunds.settleRefund(videoRejectRequest.refund.id, '拒绝', { name: '教务主管', rejectReason: '不符合规则' });
check(store.readDemoState().videoEntitlements.find((row) => row.courseId === videoRejectCase.courseId).status === '生效', '视频退款拒绝恢复学习授权');

const videoDoneCase = seedVideoCase('done');
const videoDoneRequest = refunds.createRefundRequest({ orderId: videoDoneCase.orderId, origin: refunds.REFUND_ORIGIN.LEARNER });
refunds.settleRefund(videoDoneRequest.refund.id, '通过', { name: '教务主管', channel: '原路退回' });
refunds.settleRefund(videoDoneRequest.refund.id, '完成', { name: '财务' });
check(store.readDemoState().videoEntitlements.find((row) => row.courseId === videoDoneCase.courseId).status === '已失效', '视频退款完成回收学习授权');

const offlineCase = seedClassCase('offline', { amount: 120 });
const offline = refunds.registerCompletedOfflineRefund({ orderId: offlineCase.orderId, amount: 80, reason: '协商终结退款', channel: '银行转账', voucher: 'refund.pdf', operator: { name: '周财务', role: '财务' } });
check(offline.ok && offline.refund.status === '已退款' && offline.refund.source === '线下', '线下退款经统一服务直接终结');
check(offline.order.status === '已退款' && enrollmentOf(offlineCase).status === '已退班', '线下退款联动订单与学籍');
check(refunds.registerCompletedOfflineRefund({ orderId: offlineCase.orderId, amount: 40 }).reason === 'ORDER_ALREADY_REFUNDED', '线下退款完成后拦截第二次退款');

console.log(`退款闭环回归通过：${passed.length} 项`);
