// 班级名册同源（CR-2026-133）：教师端班级详情／课次详情的学员名册改为按班级报名分班记录派生，
// 不再直接使用与班级无关的固定演示名单。
//
// 说明：出勤率与作业提交率目前仍是演示派生值（按姓名稳定取），
// 待「考勤记录 / 作业记录」同源后再改为按记录统计，口径见 CR-2026-133。
import { readDemoState } from './demo-store.js';

// 演示名册池：既有 20 名学员及其演示指标，用于把名册补足到班级报名人数。
const DEMO_ROSTER = [
  ['林知夏', 95, 90, '正常'], ['周予安', 88, 100, '正常'], ['陈一诺', 82, 75, '需关注'], ['赵明月', 100, 100, '正常'],
  ['许星辰', 92, 85, '正常'], ['刘思源', 86, 80, '正常'], ['孙艺涵', 78, 70, '需关注'], ['黄可欣', 96, 95, '正常'],
  ['郑雨桐', 90, 85, '正常'], ['吴清越', 84, 80, '正常'], ['何安然', 94, 90, '正常'], ['高语彤', 89, 85, '正常'],
  ['罗子墨', 97, 100, '正常'], ['彭佳宁', 91, 90, '正常'], ['蒋依然', 87, 80, '正常'], ['宋嘉禾', 93, 95, '正常'],
  ['唐若溪', 80, 70, '需关注'], ['邓舒雅', 98, 100, '正常'], ['谢景行', 85, 80, '正常'], ['曹心悦', 92, 90, '正常']
].map(([name, attendance, homework, status], index) => ({ id: `student-${String(index + 1).padStart(3, '0')}`, name, attendance, homework, status }));

// 报名分班记录里的学员：以演示状态为准（account-001 等账号下的学员）。
function enrolledStudentsOf(classId) {
  const state = readDemoState();
  const studentById = new Map((state.students || []).map((student) => [student.id, student]));
  return (state.enrollments || [])
    .filter((item) => item.classId === classId && item.status !== '已取消')
    .map((item) => {
      const student = studentById.get(item.studentId) || {};
      const fallback = DEMO_ROSTER.find((row) => row.name === student.name);
      return {
        id: item.studentId || `enrollment-${item.id}`,
        name: student.name || fallback?.name || '学员',
        attendance: fallback ? fallback.attendance : 90,
        homework: fallback ? fallback.homework : 90,
        status: fallback ? fallback.status : '正常',
        enrolled: true
      };
    });
}

// 名册 = 报名分班学员（置顶）+ 演示名册池补足到班级报名人数；按姓名去重。
export function classRosterFor(classId, size = 0) {
  const enrolled = enrolledStudentsOf(classId);
  const names = new Set(enrolled.map((item) => item.name));
  const roster = [...enrolled];
  for (const candidate of DEMO_ROSTER) {
    if (roster.length >= Number(size || 0)) break;
    if (names.has(candidate.name)) continue;
    names.add(candidate.name);
    roster.push({ ...candidate });
  }
  if (Number(size || 0) > 0) return roster.slice(0, Number(size));
  return roster;
}
