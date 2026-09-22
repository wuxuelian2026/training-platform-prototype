// I1-DEC-29 (OD-S11 / OD-S12 / OD-S13): the timetable axis is fixed — 08:00-21:00, one 15-minute
// tick (52 ticks). Lesson duration is a dictionary value (45/60/90/120/150, default 45) and one
// 课时 equals exactly one 课次, so a session's end time is start + lesson duration.

import { lessonDurationSettings } from './demo-store.js';

export const TIMELINE_START = '08:00';
export const TIMELINE_END = '21:00';
export const TIMELINE_STEP_MINUTES = 15;
export const TIMELINE_TICK_COUNT = (toMinutes(TIMELINE_END) - toMinutes(TIMELINE_START)) / TIMELINE_STEP_MINUTES; // 52
export const HALF_DAY_BOUNDARIES = ['08:00', '12:00', '18:00', '21:00'];
export const HALF_DAY_LABELS = ['上午', '下午', '晚上'];
/** 课时时长字典：由「系统管理 → 数据字典」维护，页面不得写死选项（CR-2026-103）。 */
export function lessonDurationValues() {
  return lessonDurationSettings().options;
}

/** 字典默认课时时长，未配置时回落到字典首项。 */
export function defaultLessonDuration() {
  return lessonDurationSettings().defaultMinutes;
}

export function toMinutes(value) {
  const [hour, minute] = String(value || '00:00').split(':').map(Number);
  return (Number(hour) || 0) * 60 + (Number(minute) || 0);
}

export function toTime(minutes) {
  const safe = Math.max(0, Math.min(24 * 60, Math.round(Number(minutes) || 0)));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

// OD-S11: a non-tick minute snaps to the nearest 15-minute tick.
export function snapToStep(value, step = TIMELINE_STEP_MINUTES) {
  const minutes = toMinutes(value);
  return toTime(Math.round(minutes / step) * step);
}

export function lessonEndTime(start, duration = defaultLessonDuration()) {
  return toTime(toMinutes(start) + (Number(duration) || defaultLessonDuration()));
}

export function isWithinTimeline(start, duration = defaultLessonDuration()) {
  const startMinutes = toMinutes(start);
  const endMinutes = startMinutes + (Number(duration) || defaultLessonDuration());
  return startMinutes >= toMinutes(TIMELINE_START) && endMinutes <= toMinutes(TIMELINE_END);
}

// Row source for the matrix: half-day segments per weekday (default) or merged "has class" ranges.
export function halfDayRows(weekdays) {
  return weekdays.flatMap((weekday, dayIndex) => HALF_DAY_BOUNDARIES.slice(0, -1).map((start, index) => ({
    id: `${weekday}-${index}`,
    weekday,
    name: `${weekday} ${HALF_DAY_LABELS[index]}`,
    start,
    end: HALF_DAY_BOUNDARIES[index + 1],
    sort: dayIndex * 3 + index + 1
  })));
}

export function mergeBusyRanges(weekday, sessions) {
  const ranges = sessions.filter(session => session.weekday === weekday)
    .map(session => ({ start: toMinutes(session.start), end: toMinutes(session.end) }))
    .sort((a, b) => a.start - b.start);
  const merged = [];
  ranges.forEach(range => {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  });
  return merged;
}

export function lessonDurationOptions(selected = defaultLessonDuration()) {
  // The classroom grid can hand over a duration picked by dragging 15-minute ticks; keep that exact
  // value selectable instead of silently falling back to the first dictionary entry.
  const chosen = Number(selected);
  const dict = lessonDurationValues();
  const values = dict.includes(chosen) || !(chosen > 0) ? dict : [...dict, chosen].sort((a, b) => a - b);
  return values.map(value => ({ value: String(value), label: `${value} 分钟`, selected: value === chosen }));
}
