(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// I1-DEC-29 (OD-S11 / OD-S12 / OD-S13): the timetable axis is fixed — 08:00-21:00, one 15-minute
// tick (52 ticks). CR-2026-155 C2: 单节课时长固定 45 分钟（课时时长字典已冻结），
// 课次时长 = 连上节数 × 45；一次课次可包含多节课时，不再是一课时对一课次。
const FIXED_LESSON_DURATION = 45;
const TIMELINE_START = '08:00';
const TIMELINE_END = '21:00';
const TIMELINE_STEP_MINUTES = 15;
const TIMELINE_TICK_COUNT = (toMinutes(TIMELINE_END) - toMinutes(TIMELINE_START)) / TIMELINE_STEP_MINUTES; // 52
const HALF_DAY_BOUNDARIES = ['08:00', '12:00', '18:00', '21:00'];
const HALF_DAY_LABELS = ['上午', '下午', '晚上'];
/** 课时时长：已按 CR-2026-155 C2 冻结为 45 分钟，字典仅保留一项。 */
function lessonDurationValues() {
  return [FIXED_LESSON_DURATION];
}

/** 默认课时时长：固定 45 分钟（字典冻结后仅此项）。 */
function defaultLessonDuration() {
  return FIXED_LESSON_DURATION;
}
function toMinutes(value) {
  const [hour, minute] = String(value || '00:00').split(':').map(Number);
  return (Number(hour) || 0) * 60 + (Number(minute) || 0);
}
function toTime(minutes) {
  const safe = Math.max(0, Math.min(24 * 60, Math.round(Number(minutes) || 0)));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

// OD-S11: a non-tick minute snaps to the nearest 15-minute tick.
function snapToStep(value, step = TIMELINE_STEP_MINUTES) {
  const minutes = toMinutes(value);
  return toTime(Math.round(minutes / step) * step);
}
function lessonEndTime(start, duration = defaultLessonDuration()) {
  return toTime(toMinutes(start) + (Number(duration) || defaultLessonDuration()));
}
function isWithinTimeline(start, duration = defaultLessonDuration()) {
  const startMinutes = toMinutes(start);
  const endMinutes = startMinutes + (Number(duration) || defaultLessonDuration());
  return startMinutes >= toMinutes(TIMELINE_START) && endMinutes <= toMinutes(TIMELINE_END);
}

// Row source for the matrix: half-day segments per weekday (default) or merged "has class" ranges.
function halfDayRows(weekdays) {
  return weekdays.flatMap((weekday, dayIndex) => HALF_DAY_BOUNDARIES.slice(0, -1).map((start, index) => ({
    id: `${weekday}-${index}`,
    weekday,
    name: `${weekday} ${HALF_DAY_LABELS[index]}`,
    start,
    end: HALF_DAY_BOUNDARIES[index + 1],
    sort: dayIndex * 3 + index + 1
  })));
}
function mergeBusyRanges(weekday, sessions) {
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
function lessonDurationOptions(selected = defaultLessonDuration()) {
  // The classroom grid can hand over a duration picked by dragging 15-minute ticks; keep that exact
  // value selectable instead of silently falling back to the first dictionary entry.
  const chosen = Number(selected);
  const dict = lessonDurationValues();
  const values = dict.includes(chosen) || !(chosen > 0) ? dict : [...dict, chosen].sort((a, b) => a - b);
  return values.map(value => ({ value: String(value), label: `${value} 分钟`, selected: value === chosen }));
}


__classicExports["lessonDurationValues"] = lessonDurationValues;
__classicExports["defaultLessonDuration"] = defaultLessonDuration;
__classicExports["FIXED_LESSON_DURATION"] = FIXED_LESSON_DURATION;
__classicExports["toMinutes"] = toMinutes;
__classicExports["toTime"] = toTime;
__classicExports["snapToStep"] = snapToStep;
__classicExports["lessonEndTime"] = lessonEndTime;
__classicExports["isWithinTimeline"] = isWithinTimeline;
__classicExports["halfDayRows"] = halfDayRows;
__classicExports["mergeBusyRanges"] = mergeBusyRanges;
__classicExports["lessonDurationOptions"] = lessonDurationOptions;
__classicExports["TIMELINE_START"] = TIMELINE_START;
__classicExports["TIMELINE_END"] = TIMELINE_END;
__classicExports["TIMELINE_STEP_MINUTES"] = TIMELINE_STEP_MINUTES;
__classicExports["TIMELINE_TICK_COUNT"] = TIMELINE_TICK_COUNT;
__classicExports["HALF_DAY_BOUNDARIES"] = HALF_DAY_BOUNDARIES;
__classicExports["HALF_DAY_LABELS"] = HALF_DAY_LABELS;
  __classicModules["shared/js/timetable-settings.js"] = __classicExports;
})(globalThis);
