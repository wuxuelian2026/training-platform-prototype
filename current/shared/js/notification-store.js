// 统一通知存储（2026-09-29）：后台「消息推送」、教师端与学员端消息中心共用同一份
// 通知主记录与逐人投递记录。发送时冻结接收人快照；补发只针对发送失败对象且幂等。
import { demoTime, messageRetrySettings, readDemoState, writeDemoState } from './demo-store.js';

export const NOTIFICATION_STATUS = { PENDING: '待发送', SENT: '已发送', FAILED: '发送失败', CANCELED: '已取消' };
export const DELIVERY_STATUS = { PENDING: '待发送', DELIVERED: '已送达', FAILED: '发送失败' };
export const NOTIFICATION_SOURCE = { MANUAL: '人工通知', SYSTEM: '系统通知' };
// 通知由业务事件自动产生；后台只查看结果、处理失败投递，不直接新增业务通知。
export const NOTIFICATION_TYPES = ['课次调整', '上课提醒', '作业发布', '作业截止提醒', '作业撤回', '作业提交提醒', '退款状态变更', '结业审核结果', '工资发布', '课程申报结果', '证书审核结果', '合同待签署'];

export const NOTIFICATION_RULES = {
  lesson_rescheduled: { type: '调课通知', trigger: '调课保存并发布后立即', frequency: '同一课次版本一次', schedule: 'immediate' },
  lesson_reminder: { type: '上课提醒', trigger: '课次开始前 24 小时', frequency: '每课次一次', schedule: 'before_lesson_24h' },
  homework_published: { type: '作业发布提醒', trigger: '作业发布成功后立即', frequency: '同一 homeworkId 一次', schedule: 'immediate' },
  homework_deadline_extended: { type: '作业截止提醒', trigger: '截止时间变更保存后立即', frequency: '同一 homeworkId + 截止时间版本一次', schedule: 'immediate' },
  homework_withdrawn: { type: '作业撤回', trigger: '作业撤回成功后立即', frequency: '同一 homeworkId 一次', schedule: 'immediate' },
  homework_submitted: { type: '作业提交提醒', trigger: '学员提交成功后立即', frequency: '同一 submissionId + version 一次', schedule: 'immediate' },
  refund_status_changed: { type: '退款状态通知', trigger: '退款状态变更成功后立即', frequency: '同一退款单 + 状态版本一次', schedule: 'immediate' }
};

const deliveryLogId = (notificationId, recipientId) => `${notificationId}:${recipientId}`;

// 演示通知：为补发、逐人投递明细与阅读回写提供可操作记录；真实发送结果接入后由投递回执覆盖。
const DEMO_NOTIFICATIONS = [
  {
    notification: {
      id: 'message-1', title: '9月16日课程调课通知', type: '调课通知', className: '少儿舞蹈基础班',
      audience: 'teacher_and_learner', audienceLabel: '教师、学员', audienceRule: '仅在读学员',
      sendMode: '立即发送', scheduledAt: '', createdAt: '2026-09-08 09:20', sentAt: '2026-09-08 09:20',
      failureReason: '', retryCount: 0, source: NOTIFICATION_SOURCE.MANUAL, isDemo: true,
      content: '因教师培训安排，9月16日少儿舞蹈基础班调整至9月17日同一时间上课，教室不变。请提前安排出行时间。',
      target: ''
    },
    deliveries: [
      { recipientId: 'student-001', recipientType: '学员', name: '林知夏', scope: '仅在读学员', status: DELIVERY_STATUS.DELIVERED, readAt: '2026-09-08 09:32' },
      { recipientId: 'student-002', recipientType: '学员', name: '林知远', scope: '仅在读学员', status: DELIVERY_STATUS.DELIVERED, readAt: '' },
      { recipientId: 'teacher-wang', recipientType: '教师', name: '王玥', scope: '目标班级授课教师', status: DELIVERY_STATUS.DELIVERED, readAt: '2026-09-08 09:26' }
    ]
  },
  {
    notification: {
      id: 'message-2', title: '秋季班开课提醒', type: '上课提醒', className: '成人声乐班',
      audience: 'learner', audienceLabel: '学员', audienceRule: '仅在读学员',
      sendMode: '立即发送', scheduledAt: '', createdAt: '2026-09-07 16:00', sentAt: '2026-09-07 16:00',
      failureReason: '2 位学员小程序订阅消息失效', retryCount: 0, source: NOTIFICATION_SOURCE.MANUAL, isDemo: true,
      content: '秋季班将于 9 月 12 日开课，请提前 15 分钟到教室签到；如需请假请在开课前提交。',
      target: ''
    },
    deliveries: [
      { recipientId: 'student-001', recipientType: '学员', name: '林知夏', scope: '仅在读学员', status: DELIVERY_STATUS.DELIVERED, readAt: '2026-09-07 18:05' },
      { recipientId: 'student-002', recipientType: '学员', name: '林知远', scope: '仅在读学员', status: DELIVERY_STATUS.FAILED, readAt: '', failureReason: '小程序订阅消息未授权', lastAttemptAt: '2026-09-12 10:00' },
      { recipientId: 'student-101', recipientType: '学员', name: '周予安', scope: '仅在读学员', status: DELIVERY_STATUS.FAILED, readAt: '', failureReason: '小程序订阅消息未授权', lastAttemptAt: '2026-09-12 10:00' }
    ]
  },
  {
    // 系统通知演示：失败后按参数配置的间隔自动重试，首次进入页面即完成第 2 次投递。
    notification: {
      id: 'message-3', title: '退款已完成通知', type: '退款状态变更', className: '成人声乐班',
      audience: 'learner', audienceLabel: '学员', audienceRule: '仅在读学员',
      sendMode: '立即发送', scheduledAt: '', createdAt: '2026-09-12 09:30', sentAt: '2026-09-12 09:30',
      failureReason: '1 位学员首次投递失败', retryCount: 0, source: NOTIFICATION_SOURCE.SYSTEM, isDemo: true,
      content: '您的退款已完成，款项将按原支付渠道退回，预计 3 个工作日到账。如有疑问请联系课程顾问。',
      target: ''
    },
    deliveries: [
      { recipientId: 'student-001', recipientType: '学员', name: '林知夏', scope: '仅在读学员', status: DELIVERY_STATUS.DELIVERED, readAt: '2026-09-12 09:45' },
      { recipientId: 'student-101', recipientType: '学员', name: '周予安', scope: '仅在读学员', status: DELIVERY_STATUS.FAILED, readAt: '', failureReason: '发送超时，等待自动重试', lastAttemptAt: '2026-09-12 09:50' }
    ]
  }
];

const DEMO_TEMPLATE_TYPES = [
  ['作业发布', '作业已发布｜秋季芭蕾舞进阶1班', '林知夏已发布作业“练习视频”，提交截止：2026-10-12。', '学员、教师'],
  ['作业截止提醒', '作业截止提醒｜练习视频', '作业“练习视频”将于2026-10-12截止，请及时提交。', '学员'],
  ['作业撤回', '作业已撤回｜练习视频', '作业“练习视频”已被教师撤回，本次作业不再接受提交。', '学员'],
  ['作业提交提醒', '收到作业提交｜练习视频', '林知夏已提交作业“练习视频”，请及时查看和批阅。', '教师'],
  ['结业审核结果', '结业审核结果｜秋季芭蕾舞进阶1班', '林知夏的秋季芭蕾舞进阶1班结业审核已确认通过，学习报告和结业证书已生成。', '学员、教师'],
  ['工资发布', '工资单已发布｜2026年9月', '2026年9月工资单已发布，实际核发金额：4800元。', '教师'],
  ['课程申报结果', '课程申报通过｜芭蕾舞进阶', '课程“芭蕾舞进阶”申报结果：通过。', '教师'],
  ['证书审核结果', '证书审核通过｜教师资格证', '证书“教师资格证”审核结果：通过。', '教师'],
  ['合同待签署', '合同待签署｜HT-2026-009', '合同HT-2026-009已生成，请于2026-10-15前下载、线下签署并上传签署件。', '教师']
];

const buildTemplateDemo = ([type, title, content, audience], index) => ({
  notification: {
    id: `message-template-${index + 1}`, title, type, className: '秋季芭蕾舞进阶1班',
    audience: audience.includes('教师') && audience.includes('学员') ? 'teacher_and_learner' : audience.includes('教师') ? 'teacher' : 'learner',
    audienceLabel: audience, audienceRule: '演示接收范围', sendMode: '立即发送', scheduledAt: '',
    createdAt: `2026-09-${String(13 + index).padStart(2, '0')} 10:00`, sentAt: `2026-09-${String(13 + index).padStart(2, '0')} 10:00`,
    failureReason: index % 3 === 0 ? '演示投递失败 1 人' : '', retryCount: 0, source: NOTIFICATION_SOURCE.SYSTEM, isDemo: true, content, target: ''
  },
  deliveries: index % 3 === 0
    ? [{ recipientId: `demo-recipient-${index}`, recipientType: audience.includes('教师') ? '教师' : '学员', name: audience.includes('教师') ? '王玥' : '林知夏', scope: '演示接收范围', status: DELIVERY_STATUS.FAILED, readAt: '', failureReason: '演示投递失败' }]
    : [{ recipientId: `demo-recipient-${index}`, recipientType: audience.includes('教师') ? '教师' : '学员', name: audience.includes('教师') ? '王玥' : '林知夏', scope: '演示接收范围', status: DELIVERY_STATUS.DELIVERED, readAt: index % 2 ? '' : `2026-09-${String(13 + index).padStart(2, '0')} 10:15` }]
});

/** 通知整体状态由逐人投递结果派生，不单独维护一份会与投递记录分叉的状态。 */
export function notificationStatusOf(deliveries = []) {
  if (!deliveries.length) return NOTIFICATION_STATUS.FAILED;
  const failed = deliveries.filter((row) => row.status === DELIVERY_STATUS.FAILED).length;
  const pending = deliveries.filter((row) => row.status === DELIVERY_STATUS.PENDING).length;
  if (pending === deliveries.length) return NOTIFICATION_STATUS.PENDING;
  // 状态机为通知级三态＋已取消：任一接收人失败即整条「发送失败」，逐人结果留在投递明细。
  return failed ? NOTIFICATION_STATUS.FAILED : NOTIFICATION_STATUS.SENT;
}

function statsOf(deliveries = []) {
  return {
    total: deliveries.length,
    delivered: deliveries.filter((row) => row.status === DELIVERY_STATUS.DELIVERED).length,
    failed: deliveries.filter((row) => row.status === DELIVERY_STATUS.FAILED).length,
    pending: deliveries.filter((row) => row.status === DELIVERY_STATUS.PENDING).length,
    read: deliveries.filter((row) => row.readAt).length
  };
}

const pad2 = (value) => String(value).padStart(2, '0');

/** 按分钟偏移计算时间戳字符串，用于自动重试的下次执行时间。 */
function addMinutes(stamp, minutes) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(stamp || ''));
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]) + Number(minutes || 0));
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 失败投递的下次自动重试时间：按参数配置的间隔取第 N 次间隔，超过最大次数则不再自动重试。 */
function retryDueAt(row, settings) {
  const attempt = Number(row.attempt || 1);
  if (row.status !== DELIVERY_STATUS.FAILED || attempt >= settings.maxAttempts) return '';
  const interval = settings.intervalsMinutes[Math.min(attempt - 1, settings.intervalsMinutes.length - 1)] || 0;
  const base = row.lastAttemptAt || row.sentAt || '';
  return base ? addMinutes(base, interval) : '';
}

/** 当前自动重试策略（来自系统管理 → 参数配置），供页面说明与详情展示。 */
export function retryPolicy() {
  const settings = messageRetrySettings();
  return { maxAttempts: settings.maxAttempts, intervalsMinutes: [...settings.intervalsMinutes] };
}

/** 首次读取时补齐演示通知与投递记录；已存在的记录不会被覆盖，保证补发结果可保留。 */
export function ensureNotificationSeed() {
  const existing = new Set((readDemoState().notifications || []).map((item) => item.id));
  const allDemoNotifications = [...DEMO_NOTIFICATIONS, ...DEMO_TEMPLATE_TYPES.map(buildTemplateDemo)];
  const missing = allDemoNotifications.filter((item) => !existing.has(item.notification.id));
  if (!missing.length) return readDemoState().notifications || [];
  const snapshot = JSON.parse(JSON.stringify(missing));
  writeDemoState((next) => {
    const logs = next.notificationDeliveryLogs || [];
    snapshot.forEach((item) => {
      next.notifications = [...(next.notifications || []), item.notification];
      item.deliveries.forEach((delivery) => logs.push({
        id: deliveryLogId(item.notification.id, delivery.recipientId),
        notificationId: item.notification.id,
        attempt: 1,
        sentAt: delivery.status === DELIVERY_STATUS.DELIVERED ? item.notification.sentAt : '',
        ...delivery
      }));
    });
    next.notificationDeliveryLogs = logs;
    return next;
  });
  return readDemoState().notifications || [];
}

/** 通知列表：附带逐人投递统计，供后台列表与详情共用。 */
export function listNotifications() {
  ensureNotificationSeed();
  const state = readDemoState();
  const logs = state.notificationDeliveryLogs || [];
  return (state.notifications || []).map((item) => {
    const deliveries = logs.filter((row) => row.notificationId === item.id);
    return {
      ...item,
      source: item.source || NOTIFICATION_SOURCE.MANUAL,
      status: item.status === NOTIFICATION_STATUS.CANCELED ? NOTIFICATION_STATUS.CANCELED : notificationStatusOf(deliveries),
      stats: statsOf(deliveries),
      recipientSnapshot: item.recipientSnapshot?.length
        ? item.recipientSnapshot
        : deliveries.map(({ recipientId, recipientType, name, scope }) => ({ recipientId, recipientType, name, scope }))
    };
  }).sort((a, b) => String(b.sentAt || b.scheduledAt || b.createdAt || '').localeCompare(String(a.sentAt || a.scheduledAt || a.createdAt || '')));
}

/** 某条通知的逐人投递记录，供后台详情展示。 */
export function notificationDeliveryRows(notificationId) {
  ensureNotificationSeed();
  const settings = messageRetrySettings();
  return (readDemoState().notificationDeliveryLogs || [])
    .filter((row) => row.notificationId === notificationId)
    .map((row) => ({ ...row, nextRetryAt: retryDueAt(row, settings) }));
}

/**
 * 创建通知并冻结接收人快照。
 * 立即发送生成「已送达」投递记录；定时发送先落「待发送」，到点后由发送任务补投递结果。
 */
export function sendNotification(payload) {
  const recipients = payload.recipients || [];
  const now = demoTime();
  const id = payload.id || `message-${Date.now()}`;
  const scheduled = payload.sendMode === '定时发送';
  const notification = {
    id,
    title: payload.title,
    type: payload.type,
    className: payload.className,
    audience: payload.audience,
    audienceLabel: payload.audienceLabel,
    audienceRule: payload.audienceRule,
    recipientSnapshot: recipients,
    sendMode: payload.sendMode,
    scheduledAt: scheduled ? payload.scheduledAt : '',
    createdAt: now,
    sentAt: scheduled ? '' : now,
    failureReason: '',
    retryCount: 0,
    source: payload.source || NOTIFICATION_SOURCE.MANUAL,
    content: payload.content,
    target: payload.target || ''
    ,triggerEvent: payload.triggerEvent || ''
    ,triggerSourceType: payload.triggerSourceType || ''
    ,triggerSourceId: payload.triggerSourceId || ''
    ,triggerVersion: payload.triggerVersion || ''
    ,dedupeKey: payload.dedupeKey || ''
  };
  writeDemoState((next) => {
    next.notifications = [notification, ...(next.notifications || [])];
    const logs = next.notificationDeliveryLogs || [];
    recipients.forEach((recipient) => logs.push({
      id: deliveryLogId(id, recipient.recipientId),
      notificationId: id,
      ...recipient,
      status: scheduled ? DELIVERY_STATUS.PENDING : DELIVERY_STATUS.DELIVERED,
      attempt: 1,
      sentAt: scheduled ? '' : now,
      lastAttemptAt: scheduled ? '' : now,
      readAt: '',
      failureReason: ''
    }));
    next.notificationDeliveryLogs = logs;
    return next;
  });
  return notification;
}

/**
 * 业务事件统一入口。事件幂等由 dedupeKey 保证；接收人由业务侧在事件成功后冻结。
 * 规则只描述产品口径，不偷偷创建延时任务；需要提前提醒的事件由调度器按 schedule 计算 scheduledAt。
 */
export function emitNotificationEvent({ event, sourceType, sourceId, version = '', dedupeKey, title, content, className = '', audience = 'learner', audienceLabel = '学员', audienceRule = '事件发生时接收人快照', recipients = [], target = '', scheduledAt = '' } = {}) {
  const rule = NOTIFICATION_RULES[event];
  if (!rule) return { ok: false, reason: 'NOTIFICATION_RULE_NOT_FOUND' };
  const key = dedupeKey || `${event}:${sourceId || 'unknown'}:${version || 'v1'}`;
  const existing = listNotifications().find((item) => item.dedupeKey === key);
  if (existing) return { ok: true, duplicate: true, notification: existing };
  const notification = sendNotification({
    id: `event-${key.replace(/[^a-zA-Z0-9:_-]/g, '-')}`,
    title, type: rule.type, className, audience, audienceLabel, audienceRule,
    sendMode: scheduledAt ? '定时发送' : '立即发送', scheduledAt, content, recipients, target,
    source: NOTIFICATION_SOURCE.SYSTEM, triggerEvent: event, triggerSourceType: sourceType,
    triggerSourceId: sourceId, triggerVersion: version, dedupeKey: key
  });
  return { ok: true, duplicate: false, notification };
}

/** 业务撤回、取消或失效时调用：阻止尚未投递的相关通知，并保留取消记录供追溯。 */
export function suppressPendingNotifications(sourceType, sourceId, reason = '业务已取消或失效') {
  if (!sourceId) return 0;
  let count = 0;
  writeDemoState((next) => {
    const ids = new Set((next.notifications || [])
      .filter((item) => item.triggerSourceType === sourceType && item.triggerSourceId === sourceId)
      .map((item) => item.id));
    if (!ids.size) return next;
    next.notifications = (next.notifications || []).map((item) => {
      if (!ids.has(item.id)) return item;
      const pending = (next.notificationDeliveryLogs || []).some((row) => row.notificationId === item.id && row.status === DELIVERY_STATUS.PENDING);
      if (!pending) return item;
      count += 1;
      return { ...item, status: NOTIFICATION_STATUS.CANCELED, canceledAt: demoTime(), cancelReason: reason };
    });
    next.notificationDeliveryLogs = (next.notificationDeliveryLogs || []).filter((row) => !(ids.has(row.notificationId) && row.status === DELIVERY_STATUS.PENDING));
    return next;
  });
  return count;
}

/**
 * 人工补发：只重投发送失败的接收人，已送达对象不重复推送；重复点击不会产生重复投递。
 * 返回本次实际重投的接收人数。
 */
export function resendFailedDeliveries(notificationId) {
  ensureNotificationSeed();
  let attempted = 0;
  writeDemoState((next) => {
    const logs = next.notificationDeliveryLogs || [];
    logs.forEach((row) => {
      if (row.notificationId !== notificationId || row.status === DELIVERY_STATUS.DELIVERED) return;
      row.attempt = Number(row.attempt || 1) + 1;
      row.status = DELIVERY_STATUS.DELIVERED;
      row.sentAt = demoTime();
      row.lastAttemptAt = demoTime();
      row.failureReason = '';
      attempted += 1;
    });
    const remainingFailed = logs.filter((row) => row.notificationId === notificationId && row.status === DELIVERY_STATUS.FAILED).length;
    const remainingPending = logs.filter((row) => row.notificationId === notificationId && row.status === DELIVERY_STATUS.PENDING).length;
    const notification = (next.notifications || []).find((item) => item.id === notificationId);
    if (notification && attempted) {
      notification.retryCount = Number(notification.retryCount || 0) + 1;
      notification.lastRetryAt = demoTime();
      notification.lastRetryBy = '教务主管';
      notification.failureReason = remainingFailed ? `${remainingFailed} 位接收人仍未送达` : '';
      if (remainingPending) notification.status = NOTIFICATION_STATUS.PENDING;
    }
    next.notificationDeliveryLogs = logs;
    return next;
  });
  return attempted;
}

/**
 * 阅读回写：教师端/学员端打开消息或全部已读后，把阅读时间写回对应投递记录。
 * 入参为移动端消息行，需带 sharedNotificationId 与 sharedRecipientId。
 */
export function syncNotificationReads(rows = []) {
  const readIds = new Set(rows
    .filter((row) => row?.sharedNotificationId && row?.sharedRecipientId && row.read)
    .map((row) => deliveryLogId(row.sharedNotificationId, row.sharedRecipientId)));
  if (!readIds.size) return;
  writeDemoState((next) => {
    next.notificationDeliveryLogs = (next.notificationDeliveryLogs || []).map((row) => (
      readIds.has(row.id) && !row.readAt ? { ...row, readAt: demoTime() } : row
    ));
    return next;
  });
}

/** 取消尚未到点的定时通知：不再向任何接收人发送，记录保留为「已取消」便于追溯。 */
export function cancelScheduledNotification(notificationId) {
  ensureNotificationSeed();
  let canceled = false;
  writeDemoState((next) => {
    const notification = (next.notifications || []).find((item) => item.id === notificationId);
    if (!notification || notification.sendMode !== '定时发送' || notification.status === NOTIFICATION_STATUS.CANCELED) return next;
    const pending = (next.notificationDeliveryLogs || []).some((row) => row.notificationId === notificationId && row.status === DELIVERY_STATUS.PENDING);
    if (!pending) return next;
    notification.status = NOTIFICATION_STATUS.CANCELED;
    notification.canceledAt = demoTime();
    next.notificationDeliveryLogs = (next.notificationDeliveryLogs || []).filter((row) => !(row.notificationId === notificationId && row.status === DELIVERY_STATUS.PENDING));
    canceled = true;
    return next;
  });
  return canceled;
}

/**
 * 通知任务：把已到点的定时通知投递出去，并按参数配置对失败投递执行自动重试。
 * 页面加载与刷新时各执行一次；返回本次实际发送与被自动重试的接收人数，便于页面提示。
 */
export function processNotificationTasks(now = demoTime()) {
  ensureNotificationSeed();
  const settings = messageRetrySettings();
  const state = readDemoState();
  const logs = state.notificationDeliveryLogs || [];
  const dueScheduledIds = (state.notifications || []).filter((item) => (
    item.sendMode === '定时发送'
    && item.status !== NOTIFICATION_STATUS.CANCELED
    && item.scheduledAt
    && item.scheduledAt <= now
    && logs.some((row) => row.notificationId === item.id && row.status === DELIVERY_STATUS.PENDING)
  )).map((item) => item.id);
  const dueRetryIds = logs
    .filter((row) => {
      const dueAt = retryDueAt(row, settings);
      return Boolean(dueAt) && dueAt <= now;
    })
    .map((row) => row.id);
  if (!dueScheduledIds.length && !dueRetryIds.length) return { sent: 0, retried: 0 };
  let sent = 0;
  let retried = 0;
  writeDemoState((next) => {
    const rows = next.notificationDeliveryLogs || [];
    rows.forEach((row) => {
      if (row.status === DELIVERY_STATUS.PENDING && dueScheduledIds.includes(row.notificationId)) {
        row.status = DELIVERY_STATUS.DELIVERED;
        row.sentAt = now;
        row.lastAttemptAt = now;
        sent += 1;
        return;
      }
      if (dueRetryIds.includes(row.id)) {
        row.attempt = Number(row.attempt || 1) + 1;
        row.status = DELIVERY_STATUS.DELIVERED;
        row.sentAt = now;
        row.lastAttemptAt = now;
        row.failureReason = '';
        retried += 1;
      }
    });
    dueScheduledIds.forEach((id) => {
      const notification = (next.notifications || []).find((item) => item.id === id);
      if (notification) { notification.sentAt = now; notification.failureReason = ''; }
    });
    next.notificationDeliveryLogs = rows;
    return next;
  });
  return { sent, retried };
}
