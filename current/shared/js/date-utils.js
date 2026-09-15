// 本地日期工具。
//
// 为什么需要它：直接用 `new Date().toISOString().slice(0, 10)` 会把本地时间换算成 UTC，
// 在东八区会整体差一天——本地零点得到的 ISO 日期是前一天，凌晨 08:00 之前取“今天”也会得到昨天。
// 课次日期、末次上课日期、创建日期等业务日期都必须按本地日历取，因此统一走这里。

const pad = (value) => String(value).padStart(2, '0');

/** 按本地日历格式化为 YYYY-MM-DD；传入空值或非法日期返回空串。 */
export const toLocalDateString = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** 在给定日期上加 n 周，返回本地日历日期字符串。 */
export const addWeeksLocal = (dateText, weeks) => {
  const date = new Date(`${String(dateText).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Number(weeks) * 7);
  return toLocalDateString(date);
};

/** 按本地时间格式化为 YYYY-MM-DD HH:mm；传入空值或非法日期返回空串。 */
export const toLocalDateTimeString = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${toLocalDateString(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** 按本地日历取月份 YYYY-MM，常用于 date/month 输入的上下限。 */
export const toLocalMonthString = (value = new Date()) => toLocalDateString(value).slice(0, 7);
