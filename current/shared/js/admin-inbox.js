import { readAdminSession } from './admin-auth.js';
import { listNotifications, notificationDeliveryRows } from './notification-store.js';

const ROLE_LABELS = {
  super_admin: '超级管理员',
  research_lead: '教研主管',
  academic_lead: '教务主管',
  course_consultant: '课程顾问',
  finance: '财务'
};

const isBackendDelivery = (delivery = {}) => {
  const type = String(delivery.recipientType || delivery.audienceType || '').trim();
  return Boolean(delivery.recipientRole || delivery.role || delivery.roleKey || ['后台角色', '后台用户', '管理员', ...Object.values(ROLE_LABELS)].includes(type));
};

const matchesAdmin = (delivery, session) => {
  if (!session || !isBackendDelivery(delivery)) return false;
  const roleLabel = ROLE_LABELS[session.role] || session.role;
  const values = [delivery.recipientRole, delivery.role, delivery.roleLabel, delivery.roleKey, delivery.recipientType, delivery.recipientId, delivery.account, delivery.name]
    .filter(Boolean).map((value) => String(value));
  return values.includes(session.role) || values.includes(roleLabel) || values.includes(session.account) || values.includes(session.name);
};

// 后台消息只展示知会类通知；需要动作的业务事件必须进入工作台待办。
const isInformational = (notification) => notification?.requiresAction !== true && notification?.todoType == null;

export function adminMessageRows(session = readAdminSession()) {
  if (!session) return [];
  return listNotifications().map((notification) => {
    if (!isInformational(notification)) return null;
    const deliveries = notificationDeliveryRows(notification.id).filter((delivery) => matchesAdmin(delivery, session));
    if (!deliveries.length) return null;
    return { notification, deliveries, unread: deliveries.some((delivery) => !delivery.readAt && delivery.status !== '发送失败') };
  }).filter(Boolean);
}

export function unreadAdminMessageCount(session = readAdminSession()) {
  return adminMessageRows(session).filter((row) => row.unread).length;
}
