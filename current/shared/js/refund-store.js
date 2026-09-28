// 退款单共享存储（2026-09-24 结算）。
//
// 设计口径：
// - 订单是交易事实、退款单是唯一审批对象、报名分班记录是名册事实，三者由 settleRefund() 统一推进；
// - 学员端「我的订单」自助申请、后台「学籍异动」同步发起、后台「线下登记」都只负责创建退款单；
// - 同一订单同时只能存在一张未结退款单（待审批／退款中），重复发起复用既有单，避免重复退款；
// - 退款完成才改学籍与名额，并回写订单；拒绝只回滚订单，不自动恢复学籍（由教务确认）。
import { classRefundSettings, demoId, demoTime, readDemoState, transitionVideoEntitlement, upsertDemoRecord, writeDemoState } from './demo-store.js';
import { classLessonProgress } from './class-lifecycle.js';
import { isEnrollmentActive } from './class-roster.js';
import { mergeClassSeed } from './class-seed.js';

export const REFUND_STATUS = { PENDING: '待审批', PROCESSING: '退款中', EXCEPTION: '退款异常', DONE: '已退款', REJECTED: '已拒绝' };
export const REFUND_ORIGIN = { LEARNER: '学员申请', ENROLLMENT: '学籍异动', OFFLINE: '线下登记', SYSTEM: '系统' };
const OPEN_STATUSES = [REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.EXCEPTION];
const numberOr = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function sharedRows(collection) {
  const rows = readDemoState()[collection];
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
}

export function listRefunds() {
  return sharedRows('refunds');
}

export function refundsForOrder(orderId) {
  return listRefunds().filter((row) => row.orderId === orderId || row.orderNo === orderId);
}

/** 该订单当前未结的退款单（待审批／退款中）。 */
export function openRefundForOrder(orderId) {
  return refundsForOrder(orderId).find((row) => OPEN_STATUSES.includes(row.status)) || null;
}

export function refundedTotalForOrder(orderId) {
  return refundsForOrder(orderId).filter((row) => row.status === REFUND_STATUS.DONE).reduce((sum, row) => sum + numberOr(row.amount), 0);
}

function appendRefundFact(collection, record) {
  writeDemoState((next) => {
    const rows = Array.isArray(next[collection]) ? next[collection] : [];
    if (!rows.some((row) => row.id === record.id)) rows.push(record);
    next[collection] = rows;
    return next;
  });
}

function recordRefundAudit(refund, action, fromStatus, toStatus, operator = {}, detail = '') {
  const now = demoTime();
  appendRefundFact('refundAuditLogs', {
    id: `refund-audit:${refund.id}:${action}:${toStatus}`,
    refundId: refund.id,
    refundNo: refund.no,
    orderId: refund.orderId || refund.orderNo,
    businessKey: refund.businessKey,
    action,
    fromStatus,
    toStatus,
    operatorId: operator.id || '',
    operatorName: operator.name || operator.id || refund.requestedBy || '系统',
    operatorRole: operator.role || '',
    channelResult: operator.channelResult || '',
    reason: detail,
    policySnapshot: refund.policySnapshot ? { ...refund.policySnapshot } : null,
    createdAt: now
  });
}

function notifyRefundAccount(refund, event, title, summary, body = summary) {
  if (!refund.accountId) return;
  appendRefundFact('refundNotifications', {
    id: `refund-notice:${refund.id}:${event}`,
    audience: 'learner',
    recipientId: refund.accountId,
    type: event,
    title,
    summary,
    body,
    createdAt: demoTime(),
    read: false,
    refundId: refund.id,
    orderId: refund.orderId || refund.orderNo,
    target: `/learner/pages/order-detail.html?orderId=${encodeURIComponent(refund.orderId || refund.orderNo)}`
  });
}

/** 在途退款金额，仅用于兼容旧页面展示；MVP 不支持累计或分批退款。 */
export function pendingRefundTotalForOrder(orderId) {
  return refundsForOrder(orderId).filter((row) => OPEN_STATUSES.includes(row.status)).reduce((sum, row) => sum + numberOr(row.amount), 0);
}

export function orderById(orderId) {
  return sharedRows('orders').find((row) => row.id === orderId || row.number === orderId) || null;
}

export function classById(classId) {
  return mergeClassSeed(sharedRows('classes')).find((row) => row.id === classId) || null;
}

function classEnrollmentFor(refund) {
  if (!refund?.classId || !refund?.studentId) return null;
  return sharedRows('enrollments').find((row) => row.classId === refund.classId && row.studentId === refund.studentId) || null;
}

function updateEnrollmentRefundRelation(refund, status, extra = {}) {
  const enrollment = classEnrollmentFor(refund);
  if (!enrollment) return null;
  const next = {
    ...enrollment,
    refundRelationStatus: status,
    refundNo: refund.no,
    refundUpdatedAt: demoTime(),
    ...extra
  };
  upsertDemoRecord('enrollments', next);
  return next;
}

function createAcademicRefundTodo(refund, enrollment, reason, now) {
  if (!enrollment || isEnrollmentActive(enrollment.status)) return null;
  const todo = {
    id: `refund-follow-up:${refund.id}`,
    type: '退款拒绝后学籍确认',
    status: '待处理',
    priority: '高',
    classId: refund.classId,
    studentId: refund.studentId,
    enrollmentId: enrollment.id,
    refundId: refund.id,
    refundNo: refund.no,
    title: `${refund.studentName || refund.student || '学员'}退款被拒，需确认学籍后续处理`,
    detail: `当前学籍为「${enrollment.status}」，退款拒绝原因：${reason}。请确认是否恢复学籍、重新收款或维持退出。`,
    createdAt: now,
    updatedAt: now
  };
  upsertDemoRecord('academicTodos', todo);
  return todo;
}

function createRefundExceptionTodo(refund, reason, now) {
  const todo = {
    id: `refund-exception:${refund.id}`,
    type: '退款异常处理',
    status: '待处理',
    priority: '高',
    classId: refund.classId || '',
    studentId: refund.studentId || '',
    refundId: refund.id,
    refundNo: refund.no,
    title: `${refund.studentName || refund.student || '学员'}退款失败或超时`,
    detail: `退款单 ${refund.no} 处理异常：${reason}。请核对渠道结果后重试或人工处理。`,
    createdAt: now,
    updatedAt: now
  };
  upsertDemoRecord('academicTodos', todo);
  return todo;
}

/**
 * 面授退款资格判定：申请窗口和已消课比例只决定是否可退。
 * 通过资格校验后固定退订单实收全额，不计算部分退款。
 */
export function classRefundSuggestion({ order, classRecord, requestedAt = demoTime(), selfService = true } = {}) {
  const policy = classRefundSettings();
  const paid = numberOr(order?.amount);
  const progress = classLessonProgress(classRecord || {});
  const allLessons = numberOr(progress.total);
  const total = allLessons;
  const completed = Math.min(numberOr(progress.completed), total);
  const remaining = Math.max(0, total - completed);
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const refundAmount = paid;
  const orderAt = new Date(String(order?.paidAt || order?.createdAt || '').replace(' ', 'T'));
  const requestDate = new Date(String(requestedAt || '').replace(' ', 'T'));
  const elapsedDays = Number.isNaN(orderAt.getTime()) || Number.isNaN(requestDate.getTime())
    ? 0
    : Math.max(0, Math.floor((requestDate.getTime() - orderAt.getTime()) / 86400000));
  let ineligibleReason = '';
  if (total > 0 && remaining === 0) ineligibleReason = 'CLASS_REFUND_FULLY_CONSUMED';
  else if (selfService && policy.windowDays > 0 && elapsedDays > policy.windowDays) ineligibleReason = 'CLASS_REFUND_WINDOW_EXCEEDED';
  else if (selfService && completedPercent > policy.selfMaxCompletedPercent) ineligibleReason = 'CLASS_REFUND_COMPLETED_PERCENT_EXCEEDED';
  return {
    paid, total, completed, remaining, completedPercent, elapsedDays,
    refundAmount, eligible: !ineligibleReason, ineligibleReason, policy,
    rule: total > 0
      ? `资格校验通过（已消课 ${completed}/${total}），退订单实收全额`
      : '未排课，退订单实收全额'
  };
}

function refundNo() {
  return `RF${String(Date.now()).slice(-10)}${String(Math.floor(Math.random() * 90) + 10)}`;
}

/**
 * 创建退款单。所有入口（学员自助、学籍异动、线下登记）都走这里。
 * @returns {{ok: boolean, refund?: object, order?: object, reason?: string, existing?: object}}
 */
export function createRefundRequest(input = {}) {
  const order = orderById(input.orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' };
  if (order.status === REFUND_STATUS.DONE) return { ok: false, reason: 'ORDER_ALREADY_REFUNDED' };
  const existing = openRefundForOrder(order.id);
  if (existing) return { ok: false, reason: 'REFUND_ALREADY_OPEN', existing };

  const isClass = Boolean(order.classId);
  const classRecord = isClass ? classById(order.classId) : null;
  const now = demoTime();
  const isSelfService = (input.origin || REFUND_ORIGIN.SYSTEM) === REFUND_ORIGIN.LEARNER;
  const suggestion = isClass ? classRefundSuggestion({ order, classRecord, requestedAt: now, selfService: isSelfService }) : null;
  if (suggestion && !suggestion.eligible) return { ok: false, reason: suggestion.ineligibleReason, suggestion };
  // MVP 只支持全额终结退款；面授退款资格仍沿用消课规则校验，但不拆分退款金额。
  const amount = numberOr(order.amount);
  if (!(amount > 0) || amount !== numberOr(order.amount)) return { ok: false, reason: 'REFUND_MUST_BE_FULL', suggestion };

  const student = sharedRows('students').find((row) => row.id === order.studentId) || null;
  const businessKey = `refund:${order.id}`;
  const record = {
    id: input.id || demoId('refund'),
    no: refundNo(),
    orderId: order.id,
    orderNo: order.id,
    accountId: order.accountId || '',
    studentId: order.studentId || '',
    studentName: student?.name || order.studentName || '—',
    classId: order.classId || '',
    courseId: order.courseId || '',
    // 兼容后台退款记录既有列名
    student: student?.name || order.studentName || '—',
    phone: '—',
    course: classRecord?.name || order.courseName || order.name || order.courseId || '—',
    orderType: isClass ? '面授课程' : '视频课程',
    amount,
    paidAmount: numberOr(order.amount),
    completedLessons: suggestion?.completed ?? null,
    totalLessons: suggestion?.total ?? null,
    rule: suggestion?.rule || '视频课程全额退款规则',
    policySnapshot: suggestion?.policy ? { ...suggestion.policy } : null,
    reason: String(input.reason || '').trim() || (isClass ? '学员申请面授退款' : '学员申请视频课程退款'),
    channel: input.channel || order.payMethod || '原路退回',
    time: now,
    requestedAt: now,
    requestedBy: input.requestedBy || REFUND_ORIGIN.SYSTEM,
    status: REFUND_STATUS.PENDING,
    source: '线上',
    origin: input.origin || REFUND_ORIGIN.SYSTEM,
    businessKey,
    classChangeId: input.classChangeId || '',
    expectedAt: '审批通过后预计 3 个工作日内原路退回',
    operator: input.requestedBy || '系统',
    remark: input.remark || '',
    voucher: ''
  };
  upsertDemoRecord('refunds', record);
  recordRefundAudit(record, '申请退款', '—', REFUND_STATUS.PENDING, { name: record.requestedBy, role: record.origin }, record.reason);
  notifyRefundAccount(record, '退款申请已受理', '退款申请已受理', `退款单 ${record.no} 已提交，正在等待审批。`);
  const nextOrder = {
    ...order,
    status: REFUND_STATUS.PROCESSING,
    refundNo: record.no,
    refundAmount: amount,
    refundMethod: record.channel,
    refundStatus: '待审核',
    refundExpectedAt: record.expectedAt,
    refundReason: record.reason,
    refundAt: order.refundAt || now,
    refundType: isClass ? '面授全额终结退款' : '视频全额终结退款',
    refundBusinessKey: businessKey
  };
  upsertDemoRecord('orders', nextOrder);
  if (isClass) updateEnrollmentRefundRelation(record, REFUND_STATUS.PENDING, { refundRequestedAt: now });
  // 视频订单在进入审核流程时冻结学习授权，退款完成后置为已失效。
  if (!isClass) transitionVideoEntitlement(nextOrder.accountId, nextOrder.courseId, '冻结', { reason: '视频退款审核期间学习授权冻结', orderId: nextOrder.id, refundKey: businessKey });
  return { ok: true, refund: record, order: nextOrder, suggestion };
}

function settleClassEnrollment(refund, now) {
  const enrollment = classEnrollmentFor(refund);
  if (!enrollment) return { enrollment: null, seatReleased: false };
  const wasActive = isEnrollmentActive(enrollment.status);
  const next = {
    ...enrollment,
    status: wasActive ? '已退班' : enrollment.status,
    refundRelationStatus: REFUND_STATUS.DONE,
    refundNo: refund.no,
    refundCompletedAt: now,
    changeAt: now,
    changeType: wasActive ? '退班' : enrollment.changeType,
    exitReason: enrollment.exitReason || '退款完成',
    changeReason: wasActive
      ? `退款完成（${refund.no}），报名终止并释放名额`
      : `${enrollment.changeReason || enrollment.status}；退款已完成（${refund.no}），不重复释放名额`
  };
  upsertDemoRecord('enrollments', next);
  if (wasActive) {
    const classRecord = classById(refund.classId);
    if (classRecord) upsertDemoRecord('classes', { ...classRecord, enrolled: Math.max(0, numberOr(classRecord.enrolled) - 1) });
  }
  return { enrollment: next, seatReleased: wasActive };
}

/**
 * 退款单唯一状态出口。
 * decision：通过／拒绝用于待审批；完成／异常用于退款中；重试用于退款异常。
 * @returns {{ok: boolean, reason?: string, refund?: object, order?: object, enrollment?: object}}
 */
export function settleRefund(refundId, decision, operator = {}) {
  const refund = listRefunds().find((row) => row.id === refundId || row.no === refundId);
  if (!refund) return { ok: false, reason: 'REFUND_NOT_FOUND' };
  if (refund.status === REFUND_STATUS.DONE) return { ok: false, reason: 'REFUND_ALREADY_SETTLED', refund };
  const now = demoTime();
  const order = orderById(refund.orderId || refund.orderNo);
  const failReason = String(operator.rejectReason || operator.exceptionReason || '').trim();
  if (['通过', '拒绝'].includes(decision) && refund.status !== REFUND_STATUS.PENDING) return { ok: false, reason: 'REFUND_STATUS_INVALID', refund };
  if (['完成', '异常'].includes(decision) && refund.status !== REFUND_STATUS.PROCESSING) return { ok: false, reason: 'REFUND_STATUS_INVALID', refund };
  if (decision === '重试' && refund.status !== REFUND_STATUS.EXCEPTION) return { ok: false, reason: 'REFUND_STATUS_INVALID', refund };
  if (decision === '拒绝' && !failReason) return { ok: false, reason: 'REFUND_REJECT_REASON_REQUIRED' };
  if (decision === '异常' && !failReason) return { ok: false, reason: 'REFUND_EXCEPTION_REASON_REQUIRED' };
  if (decision === '通过' && !String(operator.channel || refund.channel || '').trim()) return { ok: false, reason: 'REFUND_CHANNEL_REQUIRED' };

  const next = { ...refund, reviewedAt: now, reviewedBy: operator.name || operator.id || '当前账号' };
  if (decision === '通过') {
    next.status = REFUND_STATUS.PROCESSING;
    next.channel = operator.channel || refund.channel;
    next.remark = operator.remark || '审批通过，已进入财务退款处理。';
  } else if (decision === '拒绝') {
    next.status = REFUND_STATUS.REJECTED;
    next.rejectReason = failReason;
    next.remark = failReason;
  } else if (decision === '异常') {
    next.status = REFUND_STATUS.EXCEPTION;
    next.exceptionReason = failReason;
    next.exceptionAt = now;
    next.remark = failReason;
  } else if (decision === '重试') {
    next.status = REFUND_STATUS.PROCESSING;
    next.retryCount = numberOr(refund.retryCount) + 1;
    next.lastRetryAt = now;
    next.remark = operator.remark || '已按原退款单重新提交渠道处理。';
  } else if (decision === '完成') {
    next.status = REFUND_STATUS.DONE;
    next.completedAt = now;
    next.remark = operator.remark || '渠道退款已完成。';
  } else {
    return { ok: false, reason: 'REFUND_DECISION_INVALID' };
  }
  upsertDemoRecord('refunds', next);
  recordRefundAudit(next, decision, refund.status, next.status, operator, failReason || next.remark);
  if (decision === '通过') notifyRefundAccount(next, '退款审批通过', '退款审批已通过', `退款单 ${next.no} 已进入渠道退款处理。`);
  if (decision === '拒绝') notifyRefundAccount(next, '退款审批拒绝', '退款申请未通过', `退款单 ${next.no} 未通过：${failReason}`);
  if (decision === '异常') notifyRefundAccount(next, '退款处理异常', '退款处理延迟', `退款单 ${next.no} 处理延迟，工作人员正在核对。`);
  if (decision === '完成') notifyRefundAccount(next, '退款已完成', '退款已完成', `退款单 ${next.no} 已完成，请留意退款账户入账情况。`);

  let nextOrder = order;
  let enrollment = null;
  let academicTodo = null;
  let seatReleased = false;
  if (order) {
    if (decision === '通过') {
      nextOrder = { ...order, status: REFUND_STATUS.PROCESSING, refundStatus: '审核通过，退款处理中' };
      if (order.classId) enrollment = updateEnrollmentRefundRelation(next, REFUND_STATUS.PROCESSING, { refundApprovedAt: now });
    } else if (decision === '拒绝') {
      nextOrder = { ...order, status: '已支付', refundStatus: '已拒绝', refundRejectedAt: now, refundRejectReason: failReason };
      if (order.classId) {
        enrollment = updateEnrollmentRefundRelation(next, REFUND_STATUS.REJECTED, { refundRejectedAt: now, refundRejectReason: failReason });
        academicTodo = createAcademicRefundTodo(next, enrollment, failReason, now);
      } else transitionVideoEntitlement(order.accountId, order.courseId, '生效', { reason: '视频退款申请被拒，学习授权恢复生效', operator: operator.name || '系统', orderId: order.id });
    } else if (decision === '异常') {
      nextOrder = { ...order, status: REFUND_STATUS.PROCESSING, refundStatus: REFUND_STATUS.EXCEPTION, refundExceptionReason: failReason };
      if (order.classId) enrollment = updateEnrollmentRefundRelation(next, REFUND_STATUS.EXCEPTION, { refundExceptionAt: now, refundExceptionReason: failReason });
      academicTodo = createRefundExceptionTodo(next, failReason, now);
    } else if (decision === '重试') {
      nextOrder = { ...order, status: REFUND_STATUS.PROCESSING, refundStatus: '渠道重试中', refundRetryCount: next.retryCount };
      if (order.classId) enrollment = updateEnrollmentRefundRelation(next, REFUND_STATUS.PROCESSING, { refundRetriedAt: now });
    } else {
      const isClass = Boolean(order.classId);
      nextOrder = {
        ...order,
        status: REFUND_STATUS.DONE,
        refundStatus: '已完成',
        refundAt: now,
        refundAmount: numberOr(next.amount),
        refundMethod: next.channel,
        fulfillment: isClass ? '已取消（退款释放名额）' : '学习权限：已回收',
        fulfillmentDetail: isClass
          ? { ...(order.fulfillmentDetail || {}), 报名结果: '已取消报名并释放名额' }
          : { ...(order.fulfillmentDetail || {}), 退款处理: '退款完成，学习权限已回收，学习记录保留' }
      };
      if (isClass) {
        const settled = settleClassEnrollment(next, now);
        enrollment = settled.enrollment;
        seatReleased = settled.seatReleased;
        nextOrder.fulfillment = seatReleased ? '已取消（退款释放名额）' : '学籍已退出（退款完成）';
        nextOrder.fulfillmentDetail = { ...(order.fulfillmentDetail || {}), 报名结果: seatReleased ? '退款完成，报名终止并释放名额' : '学籍已先行退出，退款完成且未重复释放名额' };
      }
      else transitionVideoEntitlement(order.accountId, order.courseId, '已失效', { reason: '退款完成，学习授权已失效', operator: operator.name || '系统', orderId: order.id });
    }
    upsertDemoRecord('orders', nextOrder);
  }
  return { ok: true, refund: next, order: nextOrder, enrollment, seatReleased, academicTodo };
}

/**
 * 登记已在线下完成的终结退款。MVP 一单只允许一次退款，完成后订单终结。
 * 即时完成仍通过 createRefundRequest() 和 settleRefund() 推进，页面不直接改订单、学籍或授权。
 */
export function registerCompletedOfflineRefund(input = {}) {
  const order = orderById(input.orderId);
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' };
  const paidAmount = numberOr(order.amount);
  const amount = numberOr(input.amount, paidAmount);
  if (!(paidAmount > 0) || amount !== paidAmount) return { ok: false, reason: 'REFUND_AMOUNT_INVALID' };
  const created = createRefundRequest({
    ...input,
    amount,
    origin: REFUND_ORIGIN.OFFLINE,
    requestedBy: input.operator?.name || input.requestedBy || '财务',
    channel: input.channel || '线下退款'
  });
  if (!created.ok) return created;
  const approved = settleRefund(created.refund.id, '通过', {
    ...(input.operator || {}),
    channel: input.channel || '线下退款',
    remark: '线下退款凭证已核验，登记即视为审批通过。'
  });
  if (!approved.ok) return approved;
  const completed = settleRefund(created.refund.id, '完成', {
    ...(input.operator || {}),
    channelResult: '线下凭证已核验',
    remark: input.remark || '线下退款已完成。'
  });
  if (!completed.ok) return completed;
  const finalRefund = {
    ...completed.refund,
    source: '线下',
    origin: REFUND_ORIGIN.OFFLINE,
    time: input.time || completed.refund.time,
    voucher: input.voucher || '',
    expectedAt: '登记即时完成（线下）'
  };
  upsertDemoRecord('refunds', finalRefund);
  return { ...completed, refund: finalRefund };
}

/** 把共享退款单并回已有的展示数组（后台退款记录页使用）。 */
export function mergeRefundsInto(rows, { keepSeed = true } = {}) {
  const byId = new Map(listRefunds().map((row) => [row.id, row]));
  const merged = rows.map((row) => (byId.has(row.id) ? { ...row, ...byId.get(row.id) } : row));
  const known = new Set(merged.map((row) => row.id));
  const appended = keepSeed ? [...byId.values()].filter((row) => !known.has(row.id)) : [];
  return [...appended, ...merged];
}

/** 将既有静态演示退款单登记进共享集合，保证审批出口能找到记录。 */
export function ensureRefundRecords(rows = []) {
  const existing = new Set(listRefunds().map((row) => row.id));
  let changed = false;
  writeDemoState((next) => {
    const collection = Array.isArray(next.refunds) ? next.refunds : [];
    rows.forEach((row) => {
      if (!row?.id || existing.has(row.id)) return;
      collection.push({ origin: row.origin || REFUND_ORIGIN.SYSTEM, ...row });
      changed = true;
    });
    next.refunds = collection;
    return next;
  });
  return changed;
}
