#!/usr/bin/env node
// 校验班级课时口径（2026-09-23 客户裁定）：
//   班级总课时 = 课程库该课程的总课时；已排课时「课次数 = 总课时」（一个课时一个课次）。
// 拦截项：班级课时与课程库不一致、课次数与总课时不一致、课时表与课程库不一致。
// 提示项（不拦截）：课程库课程档案自身「总课时」与「大纲课时合计」不一致——属后台大纲待补录，需产品/教研定夺。
import { classSeed } from '../shared/js/class-seed.js';
import { courseArchiveFor } from '../shared/js/course-display.js';
import { courseTotalHours } from '../shared/js/course-hours.js';

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
  if (sessions.length && sessions.length !== Number(item.lessons)) {
    problems.push(`${item.id}：课次数 ${sessions.length} 与总课时 ${item.lessons} 不一致`);
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
console.log(`检查通过：${classes.length} 个班级的「总课时 = 课次数 = 课程库课时」一致。`);
