// E03 (CR-2026-005) + I1-DEC-29: venue archive shared by scheduling, the timetable matrix and the A4
// export. Columns come from enabled venues; matrix rows come from the fixed time axis (see
// timetable-settings.js), not from a hand-maintained slot scheme.

export const SEMESTERS = ['2026秋季', '2026暑期'];

export const venueSeed = [
  { id: 'venue-302', name: '综合楼302', campus: '龙泉校区', building: '综合楼', type: '舞蹈房', capacity: 30, tags: '镜面墙 / 音响', status: '启用' },
  { id: 'venue-201', name: '音乐楼201', campus: '南湖校区', building: '音乐楼', type: '琴房', capacity: 20, tags: '钢琴 / 谱架', status: '启用' },
  { id: 'venue-105', name: '艺术楼105', campus: '龙泉校区', building: '艺术楼', type: '画室', capacity: 24, tags: '画架 / 洗笔池', status: '启用' },
  { id: 'venue-401', name: '综合楼401', campus: '龙泉校区', building: '综合楼', type: '普通教室', capacity: 40, tags: '投影 / 白板', status: '停用' }
];

export function cloneVenueSeed() {
  return venueSeed.map(item => ({ ...item }));
}

export function mergeVenues(shared) {
  const stored = (shared?.venues || []).filter(item => item && typeof item === 'object');
  const merged = venueSeed.map(seed => ({ ...seed, ...(stored.find(item => item.id === seed.id) || {}) }));
  stored.filter(item => !venueSeed.some(seed => seed.id === item.id)).forEach(item => merged.push({ ...item }));
  return merged;
}

export function resolveVenueId(classroom, venues) {
  const target = String(classroom || '').trim();
  if (!target) return '';
  const room = (venues || []).find(item => item.name === target);
  return room ? room.id : '';
}
