// I1-DEC-29 (OD-S11 / OD-S12 / OD-S13): the timetable axis is fixed — 08:00-21:00, one 15-minute
// tick (52 ticks). Lesson duration is a dictionary value (45/60/90/120/150, default 45) and one
// 课时 equals exactly one 课次, so a session's end time is start + lesson duration.

export const TIMELINE_START = '08:00';
export const TIMELINE_END = '21:00';
export const TIMELINE_STEP_MINUTES = 15;
export const TIMELINE_TICK_COUNT = (toMinutes(TIMELINE_END) - toMinutes(TIMELINE_START)) / TIMELINE_STEP_MINUTES; // 52
export const HALF_DAY_BOUNDARIES = ['08:00', '12:00', '18:00', '21:00'];
export const HALF_DAY_LABELS = ['上午', '下午', '晚上'];
export const LESSON_DURATIONS = [45, 60, 90, 120, 150];
export const DEFAULT_LESSON_DURATION = 45;

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

export function lessonEndTime(start, duration = DEFAULT_LESSON_DURATION) {
  return toTime(toMinutes(start) + (Number(duration) || DEFAULT_LESSON_DURATION));
}

export function isWithinTimeline(start, duration = DEFAULT_LESSON_DURATION) {
  const startMinutes = toMinutes(start);
  const endMinutes = startMinutes + (Number(duration) || DEFAULT_LESSON_DURATION);
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

export function lessonDurationOptions(selected = DEFAULT_LESSON_DURATION) {
  return LESSON_DURATIONS.map(value => ({ value: String(value), label: `${value} 分钟`, selected: Number(value) === Number(selected) }));
}
