// 合同口径计算：签署截止日期由「推送日期 + 后台参数配置的签署截止期限」得出，
// 后台合同列表与教师端我的合同共用这一份实现。

import { contractSettings } from './demo-store.js';
import { toLocalDateString } from './date-utils.js';

/**
 * 计算合同签署截止日期。
 * @param {{pushedAt?:string}} contract 合同记录，pushedAt 为推送日期
 * @param {number} [days] 覆盖配置的天数，缺省读取后台参数
 * @returns {string} YYYY-MM-DD，缺少推送日期时返回空串
 */
export function contractSignDeadline(contract, days) {
  const pushedAt = contract?.pushedAt;
  if (!pushedAt) return '';
  const date = new Date(`${pushedAt}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const offset = Number.isFinite(days) ? days : contractSettings().signDeadlineDays;
  date.setDate(date.getDate() + offset);
  return toLocalDateString(date);
}
