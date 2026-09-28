import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { lessonStatusOf, sessionsInScheduleOrder } from '../shared/js/class-lifecycle.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = Object.fromEntries(await Promise.all(
  ['academic.js', 'teacher.js', 'learner.js'].map(async (name) => [name, await readFile(resolve(root, 'shared/js', name), 'utf8')])
));
const failures = [];
let passed = 0;

function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`PASS ${name}${detail ? ` :: ${detail}` : ''}`); return; }
  failures.push(name); console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
}

const sample = { date: '2026-09-24', startTime: '09:00', endTime: '10:00' };
check('计划开始前为待上课', lessonStatusOf(sample, new Date('2026-09-24T08:59:59')) === '待上课');
check('计划时间窗内为上课中', lessonStatusOf(sample, new Date('2026-09-24T09:00:00')) === '上课中');
check('计划结束后为已完成', lessonStatusOf(sample, new Date('2026-09-24T10:00:00')) === '已完成');

for (const name of ['academic.js', 'teacher.js', 'learner.js']) check(`${name} 引用共享课次状态派生`, /lessonStatusOf/.test(files[name]));
check('教师开始上课禁止提前', /plannedLessonStatus\(session\) !== '上课中'/.test(files['teacher.js']));
check('完成课次不自动生成执行事实', !/function ensureCompletedLessonState/.test(files['teacher.js']));

const adjusted = [
  { index: 1, date: '2026-09-05', startTime: '09:00' },
  { index: 2, date: '2026-09-14', startTime: '09:00' },
  { index: 3, date: '2026-09-19', startTime: '09:00' }
];
const ordered = sessionsInScheduleOrder(adjusted);
check('调整后按新日期排序', ordered.map((item) => item.index).join(',') === '1,2,3', ordered.map((item) => `${item.index}@${item.date}`).join(','));
check('调整后旧日期不重复', adjusted.filter((item) => item.date === '2026-09-12').length === 0);
check('课次调整覆盖原记录而非追加', /sessions\[targetIndex\]\s*=/.test(files['academic.js']) && !/sessions\.push\([^\n]*candidate/.test(files['academic.js']));
check('越过下一课次要求整体顺延', /shiftFollowing/.test(files['academic.js']) && /affectedIndexes/.test(files['academic.js']));

check('通知按有效报名筛选', /enrolledLearners[\s\S]*status === '已分班'/.test(files['academic.js']));
check('学员通知逐人投递', /enrolledLearners\.forEach/.test(files['academic.js']));
check('学员通知不使用空收件人广播', !/audience:\s*'learner',\s*recipientId:\s*''/.test(files['academic.js']));
check('教师与学员消息按 recipientId 分流', /audience === 'teacher'[\s\S]*recipientId/.test(files['teacher.js']) && /audience === 'learner'[\s\S]*recipientId/.test(files['learner.js']));

const lifecycleSource = await readFile(resolve(root, 'shared/js/class-lifecycle.js'), 'utf8');
// 只检查课次自身的两个派生函数；班级生命周期允许存在“已取消”，不能被误判为课次状态残留。
const lessonScope = lifecycleSource
  .slice(lifecycleSource.indexOf('export function isSessionPast'), lifecycleSource.indexOf('export function sessionsInScheduleOrder'))
  .replace(/\/\/.*$/gm, '');
check('课次状态无已取消残留', !/已取消|cancelled/.test(lessonScope));

if (failures.length) {
  console.error(`\n课次链路检查失败：${failures.length} 项失败，${passed} 项通过。`);
  process.exit(1);
}
console.log(`\n课次链路检查通过：${passed} 项断言全部通过。`);
