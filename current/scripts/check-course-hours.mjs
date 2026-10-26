#!/usr/bin/env node
// 校验班级课时口径（2026-09-23 客户裁定；2026-10-23 CR-2026-155 C2/C3 修订）：
//   班级总课时（学时）= 课程库该课程的总课时；单节课固定 45 分钟；
//   课次与课时为倍数关系：课次数 = 总课时（学时）÷ 每次连上节数，单次实际上课时长 = 45 分钟 × 连上节数。
// 拦截项：班级总课时与课程库不一致、课次数与「总课时 ÷ 连上节数」不一致、课时表与课程库不一致。
// 提示项（不拦截）：课程库课程档案自身「总课时」与「大纲课时合计」不一致——属后台大纲待补录，需产品/教研定夺。
import { loadClassicModule } from './load-classic-modules.mjs';

const { classSeed } = await loadClassicModule('shared/js/class-seed.js');
const { courseArchiveFor } = await loadClassicModule('shared/js/course-display.js');
const { courseTotalHours } = await loadClassicModule('shared/js/course-hours.js');

const classes = Array.isArray(classSeed) ? classSeed : Object.values(classSeed);
const problems = [];
const notices = [];
const seenOutline = new Set();
for (const item of classes) {
  const archive = courseArchiveFor(item.courseId) || {};
  const courseHours = Number(archive.hours || 0);
  const expected = courseTotalHours(item.courseId, courseHours);
  if (Number(item.lessons) !== expected) {
    problems.push(`${item.id}：班级总课时 ${item.lessons}，课程库课时 ${expected}（课程 ${item.courseId}）`);
  }
  if (courseHours && courseHours !== expected) {
    problems.push(`${item.id}：课时表登记 ${expected}，课程库课程档案为 ${courseHours}（课程 ${item.courseId}）`);
  }
  const sessions = item.sessions || [];
  const consecutive = Number(item.consecutiveLessons) > 0 ? Number(item.consecutiveLessons) : 1;
  if (sessions.length) {
    const expectedSessions = Math.round(Number(item.lessons) / consecutive);
    if (sessions.length !== expectedSessions) {
      problems.push(`${item.id}：课次数 ${sessions.length} 与「总课时 ${item.lessons} ÷ 连上节数 ${consecutive}」预期课次 ${expectedSessions} 不一致`);
    }
  }
  const outlineLessons = (archive.chapters || []).reduce((sum, chapter) => sum + (chapter.lessons || []).length, 0);
  if (outlineLessons && courseHours && outlineLessons !== courseHours && !seenOutline.has(item.courseId)) {
    seenOutline.add(item.courseId);
    notices.push(`${archive.name || item.courseId}（${item.courseId}）：课程库总课时 ${courseHours}，大纲课时合计 ${outlineLessons}`);
  }
}

if (notices.length) {
  console.log('提示：以下课程的大纲课时合计与总课时不一致（后台大纲待补录，不拦截）：');
  notices.forEach((line) => console.log(`  - ${line}`));
}
if (problems.length) {
  console.error('班级课时口径检查未通过：');
  problems.forEach((line) => console.error(`  - ${line}`));
  process.exit(1);
}
console.log(`检查通过：${classes.length} 个班级的「总课时 = 课程库课时」，且按连上节数校验「课次数 × 连上节数 ≈ 总课时」一致。`);
