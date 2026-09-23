// 课次考勤与作业记录（单一口径，CR-2026-136）。
//
// 背景：教师端班级详情的「平均出勤率／作业提交率」原先按名册上的演示值取平均，与课次详情里
// 逐个课次的考勤名单、作业提交数各算一套，指标和明细对不上。本模块把「课次考勤记录」与
// 「课次作业记录」收敛成唯一数据源，教师端指标、课次详情、学员详情与学员端展示都读这里，
// 保证「指标 = 明细聚合」。
//
// 记录本身仍是演示派生值（按 班级#课次#学员 稳定散列，同一组合每次结果一致，不会刷新跳变）；
// 待考勤／作业记录落库后再把取数换成真实记录，页面无需改动。
import { classRosterFor } from './class-roster.js';
import { isSessionPast } from './class-lifecycle.js';

function hashSeed(text) {
  let hash = 2166136261;
  for (const ch of String(text)) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function roll(seed) { return hashSeed(seed) % 100; }

export function classSessionsOf(classItem) { return (classItem && classItem.sessions) || []; }
// 计入统计的课次：已上过且未停课（停课不占时段也不计考勤）。
export function countedSessionsOf(classItem) {
  return classSessionsOf(classItem).filter((session) => isSessionPast(session) && session.status !== '已停课');
}
export function classRosterOfRecords(classItem) {
  // 班级人数取 students（教师端投影）或 enrolled（种子／学员端记录），两者都没有时只用报名分班记录。
  return classItem ? classRosterFor(classItem.id, Number(classItem.students || classItem.enrolled || 0)) : [];
}

// 单课次考勤：按 班级#课次#学员 稳定派生，分布约 已到 84%／迟到 8%／请假 4%／缺勤 4%。
export function lessonAttendance(classItem, sessionIndex) {
  return classRosterOfRecords(classItem).map((student) => {
    const value = roll(`${classItem.id}#${sessionIndex}#${student.name}`);
    const status = value < 84 ? '已到' : value < 92 ? '迟到' : value < 96 ? '请假' : '缺勤';
    return { id: student.id, name: student.name, status, counted: status === '已到' || status === '迟到', student };
  });
}
export function lessonAttendanceStatus(classItem, sessionIndex, student) {
  const row = lessonAttendance(classItem, sessionIndex).find((item) => item.id === student.id || item.name === student.name);
  return row ? row.status : '已到';
}

// 单课次作业：班级 demoHomework 决定整班口径（未提交／点评中／点评完成），其余按学员稳定派生。
export function lessonHomework(classItem, sessionIndex) {
  const roster = classRosterOfRecords(classItem);
  const mode = classItem.demoHomework || '';
  const submittedStudents = roster.filter((student) => (mode === '未提交' ? false : roll(`${classItem.id}#${sessionIndex}#homework#${student.name}`) < 80));
  const graded = mode === '点评完成' ? submittedStudents.length : (mode === '点评中' || mode === '未提交') ? 0 : Math.max(0, submittedStudents.length - 2);
  return {
    name: `第${sessionIndex}次课作业`, published: true, total: roster.length,
    submitted: submittedStudents.length, graded, mode,
    missing: roster.filter((student) => !submittedStudents.includes(student)).map((student) => student.name).slice(0, 4)
  };
}
export function lessonHomeworkSubmitted(classItem, sessionIndex, student) {
  const mode = classItem.demoHomework || '';
  if (mode === '未提交') return false;
  return roll(`${classItem.id}#${sessionIndex}#homework#${student.name}`) < 80;
}

// 班级级聚合：指标口径 = 所有已上课次的考勤／作业记录聚合。
export function classAttendanceSummary(classItem) {
  const lessons = countedSessionsOf(classItem);
  const roster = classRosterOfRecords(classItem);
  const expected = lessons.length * roster.length;
  const present = lessons.reduce((sum, session) => sum + lessonAttendance(classItem, session.index).filter((row) => row.counted).length, 0);
  return { lessons: lessons.length, expected, present, rate: expected ? Math.round((present / expected) * 100) : null };
}
export function classHomeworkSummary(classItem) {
  const lessons = countedSessionsOf(classItem);
  const roster = classRosterOfRecords(classItem);
  const expected = lessons.length * roster.length;
  const submitted = lessons.reduce((sum, session) => sum + lessonHomework(classItem, session.index).submitted, 0);
  return { lessons: lessons.length, expected, submitted, rate: expected ? Math.round((submitted / expected) * 100) : null };
}

// 学员级聚合：分母为已上课次（请假计入应出勤但不计有效出勤，与页面口径说明一致）。
export function studentAttendanceRate(classItem, student) {
  const lessons = countedSessionsOf(classItem);
  if (!lessons.length) return null;
  const present = lessons.filter((session) => ['已到', '迟到'].includes(lessonAttendanceStatus(classItem, session.index, student))).length;
  return Math.round((present / lessons.length) * 100);
}
export function studentHomeworkRate(classItem, student) {
  const lessons = countedSessionsOf(classItem);
  if (!lessons.length) return null;
  const submitted = lessons.filter((session) => lessonHomeworkSubmitted(classItem, session.index, student)).length;
  return Math.round((submitted / lessons.length) * 100);
}
export function studentAttendanceHistory(classItem, student, limit = 4) {
  return countedSessionsOf(classItem).slice(-limit).reverse().map((session) => ({
    index: session.index, date: session.date, status: lessonAttendanceStatus(classItem, session.index, student)
  }));
}
export function studentHomeworkHistory(classItem, student, limit = 5) {
  return countedSessionsOf(classItem).slice(-limit).reverse().map((session) => {
    const submitted = lessonHomeworkSubmitted(classItem, session.index, student);
    return { lesson: session.index, date: session.date, submitted, note: submitted ? '教师已点评：完成情况良好，注意节奏与细节。' : '未提交，请提醒学员补交。' };
  });
}
