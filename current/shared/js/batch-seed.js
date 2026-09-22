// 批次（招生期次）种子 · 课表学期字典的唯一来源。
// 批次管理列表、面授班级的所属批次选项与课表管理的学期下拉都读这一份，避免出现两套学期口径。
// 真实系统每年 1 月 1 日自动生成下一年四批；原型以这四条固定数据呈现，不演示生成效果。
import { DEMO_TODAY } from './demo-clock.js';

export const BATCH_SEED = [
  { id: 'batch-autumn', name: '2026年秋季艺术培训', season: '秋季', start: '2026-09-01', end: '2027-01-30' },
  { id: 'batch-summer', name: '2026年暑期艺术培训', season: '暑假', start: '2026-07-01', end: '2026-08-31' },
  { id: 'batch-winter', name: '2027年寒假艺术培训', season: '寒假', start: '2027-02-01', end: '2027-02-28' },
  { id: 'batch-spring', name: '2027年春季艺术培训', season: '春季', start: '2027-03-01', end: '2027-06-30' }
];

export function cloneBatchSeed() {
  return BATCH_SEED.map((item) => ({ ...item }));
}

// 批次季节 → 学期口径用词（批次叫「暑假」，课表学期叫「暑期」）。
const SEASON_TERM = { 春季: '春季', 暑假: '暑期', 秋季: '秋季', 寒假: '寒假' };

export function batchTerm(batch) {
  return `${String(batch?.start || '').slice(0, 4)}${SEASON_TERM[batch?.season] || batch?.season || ''}`;
}

// 学期下拉的取值与顺序直接来自批次管理列表。
export const SEMESTERS = BATCH_SEED.map(batchTerm);

export function semesterRangeOf(semester) {
  const batch = BATCH_SEED.find((item) => batchTerm(item) === semester);
  return batch ? [batch.start, batch.end] : null;
}

// 切换学期时把日期窗口定位到该学期的锚点：演示当天在学期内则用演示当天，否则用学期起始日。
export function semesterAnchorOf(semester) {
  const range = semesterRangeOf(semester);
  if (!range) return DEMO_TODAY;
  return DEMO_TODAY >= range[0] && DEMO_TODAY <= range[1] ? DEMO_TODAY : range[0];
}
