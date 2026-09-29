import fs from 'node:fs';

const source = fs.readFileSync(new URL('../shared/js/sales-crm.js', import.meta.url), 'utf8');
const fields = fs.readFileSync(new URL('../spec/fields/crm.js', import.meta.url), 'utf8');
const pages = fs.readFileSync(new URL('../spec/pages/page-types.js', import.meta.url), 'utf8');

const checks = [
  ['线索课程使用课程库引用', fields.includes("label: '意向课程', type: '课程库引用'")],
  ['线索登记包含班级、教师和备注字段', ['关联班级', '关联教师', '意向备注'].every((label) => fields.includes(`label: '${label}'`))],
  ['历史未匹配线索不能直接试听', source.includes('尚未匹配课程库，请先补齐意向课程后再登记试听')],
  ['历史未匹配线索不能直接报名', source.includes('尚未匹配课程库，请先补齐意向课程后再转报名')],
  ['报名班级必须与意向课程一致', source.includes('报名班级与线索意向课程不一致')],
  ['试听记录保存课程班级教师快照', ['courseId: sourceLead.intentCourseId', 'classId: sourceLead.intentClassId', 'teacher'].every((part) => source.includes(part))],
  ['订单保存线索意向快照', ['intentCourseId:', 'intentClassId:', 'intentTeacherName:'].every((part) => source.includes(part))],
  ['试听记录阻止同线索重复时间', source.includes('该线索在相同时间已有试听记录')],
  ['订单按线索幂等', source.includes('已有进行中订单') && source.includes('leadOrderOf(lead)')],
  ['页面规格登记试听继承规则', pages.includes('已关联班级和教师自动带入')]
];

const failed = checks.filter(([, passed]) => !passed);
checks.forEach(([label, passed]) => console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`));
if (failed.length) process.exitCode = 1;
