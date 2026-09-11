// E03 / E04 (CR-2026-005): venue archive and semester time-slot scheme shared by the scheduling,
// timetable matrix and A4 export. Rows come from time slots, columns from enabled venues.

export const SEMESTERS = ['2026秋季', '2026暑期'];

export const venueSeed = [
  { id: 'venue-302', name: '综合楼302', campus: '龙泉校区', building: '综合楼', type: '舞蹈房', capacity: 30, tags: '镜面墙 / 音响', status: '启用' },
  { id: 'venue-201', name: '音乐楼201', campus: '南湖校区', building: '音乐楼', type: '琴房', capacity: 20, tags: '钢琴 / 谱架', status: '启用' },
  { id: 'venue-105', name: '艺术楼105', campus: '龙泉校区', building: '艺术楼', type: '画室', capacity: 24, tags: '画架 / 洗笔池', status: '启用' },
  { id: 'venue-401', name: '综合楼401', campus: '龙泉校区', building: '综合楼', type: '普通教室', capacity: 40, tags: '投影 / 白板', status: '停用' }
];

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const PERIODS = [['上午', '09:00', '12:00', 'am'], ['下午', '14:00', '18:00', 'pm'], ['晚上', '18:30', '21:00', 'eve']];

// The frozen 21-slot scheme: Monday..Sunday x morning/afternoon/evening.
export function periodSeed() {
  let sort = 0;
  return WEEKDAYS.flatMap((weekday, dayIndex) => PERIODS.map(([name, start, end, periodKey]) => ({
    id: `${DAY_KEYS[dayIndex]}-${periodKey}`,
    semester: SEMESTERS[0],
    weekday,
    name: `${weekday} ${name}`,
    start,
    end,
    sort: ++sort,
    enabled: true
  })));
}

export function cloneVenueSeed() {
  return venueSeed.map(item => ({ ...item }));
}

export function mergeVenues(shared) {
  const stored = (shared?.venues || []).filter(item => item && typeof item === 'object');
  const merged = venueSeed.map(seed => ({ ...seed, ...(stored.find(item => item.id === seed.id) || {}) }));
  stored.filter(item => !venueSeed.some(seed => seed.id === item.id)).forEach(item => merged.push({ ...item }));
  return merged;
}

export function mergePeriods(shared, semester) {
  const stored = (shared?.periods || []).filter(item => item && typeof item === 'object');
  if (!stored.length) return periodSeed();
  const merged = periodSeed().map(seed => ({ ...seed, ...(stored.find(item => item.id === seed.id) || {}) }));
  stored.filter(item => !periodSeed().some(seed => seed.id === item.id)).forEach(item => merged.push({ ...item }));
  const scoped = merged.filter(item => !item.semester || !semester || item.semester === semester);
  return scoped.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
}

// E06: a class session is placed into the matrix by slot id + venue id, not by parsing schedule text.
export function resolveSlotId(weekday, start, end, periods) {
  const hit = (periods || []).filter(item => item.enabled !== false && item.weekday === weekday)
    .find(item => item.start <= start && end <= item.end);
  return hit ? hit.id : 'other';
}

export function resolveVenueId(classroom, venues) {
  const target = String(classroom || '').trim();
  if (!target) return '';
  const room = (venues || []).find(item => item.name === target);
  return room ? room.id : '';
}

export function shiftPeriod(list, id, direction) {
  const ordered = [...list].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
  const index = ordered.findIndex(item => item.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= ordered.length) return ordered;
  const current = ordered[index];
  ordered[index] = ordered[swapWith];
  ordered[swapWith] = current;
  return ordered.map((item, position) => ({ ...item, sort: position + 1 }));
}
