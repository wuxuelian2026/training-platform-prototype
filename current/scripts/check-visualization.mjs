import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { academicYearStart, academicPeriod, aggregateDashboard, createDemoFacts, compareAcademicYears } from '../shared/js/visualization-data.js';
import { incomeChartModel } from '../shared/js/visualization-chart.js';
import { createLearningFacts, aggregateLearning, CHURN_REASONS, REVIEW_DIMENSIONS, LESSON_TOTAL } from '../shared/js/visualization-learning.js';

let checks = 0;
function check(label, run) {
  run();
  checks++;
  console.log('PASS ' + label);
}
const now = new Date('2026-10-13T14:00:00+08:00');
check('上海时区自然年度在1月1日零点切换，9月1日不再切分', () => {
  assert.equal(academicYearStart(new Date('2025-12-31T23:59:59+08:00')), 2025);
  assert.equal(academicYearStart(new Date('2026-01-01T00:00:00+08:00')), 2026);
  assert.equal(academicYearStart(new Date('2027-08-31T23:59:59+08:00')), 2027);
  assert.equal(academicYearStart(new Date('2027-09-01T00:00:00+08:00')), 2027);
  assert.equal(academicYearStart(new Date('2027-12-31T23:59:59+08:00')), 2027);
  assert.equal(academicYearStart(new Date('2028-01-01T00:00:00+08:00')), 2028);
});
check('自然年度范围和12个月按1—12月顺序排列', () => {
  const period = academicPeriod(2026, now);
  assert.equal(period.startDate, '2026-01-01');
  assert.equal(period.endDate, '2026-12-31');
  assert.equal(period.cutoffDate, '2026-10-13');
  assert.equal(period.label, '2026');
  assert.equal(period.year, 2026);
  assert.deepEqual(period.months.map(row => row.key), ['2026-01', '2026-02', '2026-03', '2026-04',
    '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
  assert.equal(period.months.filter(row => row.future).length, 2);
  assert.equal(academicPeriod(2025, now).cutoffDate, '2025-12-31');
  assert.equal(academicPeriod(2025, now).months.some(row => row.future), false);
});

const facts = {
  courses: [{ id: 'offline', name: '面授课程', major: '中国舞' }, { id: 'video', name: '视频课程' }],
  teachers: [{ id: 'teacher', name: '主授教师' }],
  batches: ['秋季', '寒假', '春季', '暑假'].map((name, index) => ({ academicYear: 2026, name,
    startsOn: ['2026-01-08', '2027-01-08', '2027-03-08', '2027-06-08'][index] })),
  classes: [
    { id: 'open', academicYear: 2026, batch: '秋季', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2026-01-08' },
    { id: 'future', academicYear: 2026, batch: '秋季', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2026-10-20' },
    { id: 'cancelled', academicYear: 2026, batch: '秋季', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2026-01-08', cancelled: true },
    { id: 'old', academicYear: 2025, batch: '暑假', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2025-12-08' }
  ],
  orders: [
    { id: 'prepaid', kind: 'offline', classId: 'open', courseId: 'offline', learnerId: 'a', paidOn: '2025-12-25', amountCents: 20000 },
    { id: 'enrolling', kind: 'offline', classId: 'future', courseId: 'offline', learnerId: 'a', paidOn: '2026-01-01', amountCents: 15000 },
    { id: 'withdrawn', kind: 'offline', classId: 'open', courseId: 'offline', learnerId: 'b', paidOn: '2026-01-01', amountCents: 10000 },
    { id: 'old-order', kind: 'offline', classId: 'old', courseId: 'offline', learnerId: 'c', paidOn: '2025-12-01', amountCents: 10000 },
    { id: 'video-valid', kind: 'video', courseId: 'video', paidOn: '2026-01-01', amountCents: 5000 },
    { id: 'video-full', kind: 'video', courseId: 'video', paidOn: '2026-01-01', amountCents: 5000 },
    { id: 'video-part', kind: 'video', courseId: 'video', paidOn: '2026-10-13', amountCents: 5000 },
    { id: 'video-after-today', kind: 'video', courseId: 'video', paidOn: '2026-10-14', amountCents: 5000 },
    { id: 'unpaid', kind: 'video', courseId: 'video', paidOn: '', amountCents: 5000 },
    { id: 'outside', kind: 'video', courseId: 'video', paidOn: '2027-09-01', amountCents: 5000 }
  ],
  enrollments: [
    { id: 'e1', classId: 'open', learnerId: 'a', orderId: 'prepaid', enrolledOn: '2025-12-25' },
    { id: 'e1-duplicate', classId: 'open', learnerId: 'a', orderId: 'prepaid', enrolledOn: '2025-12-25' },
    { id: 'e2', classId: 'future', learnerId: 'a', orderId: 'enrolling', enrolledOn: '2026-01-01' },
    { id: 'e3', classId: 'open', learnerId: 'b', orderId: 'withdrawn', enrolledOn: '2026-01-01', withdrawnOn: '2026-01-10' },
    { id: 'e4', classId: 'cancelled', learnerId: 'a', orderId: 'prepaid', enrolledOn: '2025-12-25' },
    { id: 'e5', classId: 'old', learnerId: 'c', orderId: 'old-order', enrolledOn: '2025-12-01' }
  ],
  refunds: [
    { id: 'r1', orderId: 'withdrawn', completedOn: '2026-01-10', amountCents: 10000 },
    { id: 'r2', orderId: 'old-order', completedOn: '2026-01-05', amountCents: 10000 },
    { id: 'r3', orderId: 'video-full', completedOn: '2026-01-05', amountCents: 5000 },
    { id: 'r4', orderId: 'video-part', completedOn: '2026-10-13', amountCents: 500 },
    { id: 'r5', orderId: 'video-valid', completedOn: '2026-10-14', amountCents: 5000 },
    { id: 'pending', orderId: 'prepaid', completedOn: '', amountCents: 20000 }
  ]
};
const data = aggregateDashboard(facts, 2026, now);
check('开班数排除未开课、取消和其他年度班级', () => assert.equal(data.totals.openedClasses, 1));
check('报名按学员×班级去重，排除退班，保留提前支付报名', () => {
  assert.equal(data.totals.enrolled, 2);
  assert.equal(data.totals.students, 1);
});
check('视频付费订单不含未支付、未来支付和全额退款，部分退款仍计一笔', () => {
  assert.equal(data.totals.videoOrders, 2);
  assert.equal(data.totals.refundedVideoOrders, 1);
  assert.equal(data.rankings.videos[0].orders, 2);
});
check('收入按实际支付/退款日期，含上年度订单在本年度的退款', () => {
  assert.equal(data.totals.grossCents, 40000);
  assert.equal(data.totals.refundCents, 25500);
  assert.equal(data.totals.netCents, 14500);
  assert.equal(data.totals.offlineNetCents, 5000);
  assert.equal(data.totals.videoNetCents, 9500);
  assert.equal(data.monthly.reduce((total, row) => total + row.offlineCents + row.videoCents, 0), data.totals.netCents);
});
check('四批次固定顺序、归属所选自然年度，未来批次无演示业绩', () => {
  assert.deepEqual(data.batches.map(row => [row.name, row.calendarYear]),
    [['秋季', 2026], ['寒假', 2026], ['春季', 2026], ['暑假', 2026]]);
  assert.equal(data.batches[0].classes, 1);
  assert.equal(data.batches[0].enrolled, 2);
  assert.equal(data.batches.slice(1).every(row => row.future && row.classes === 0 && row.enrolled === 0), true);
  // 自然年度早期只有已开课批次有业绩，其余三批次仍为未来（用真实演示事实复核）。
  const early = aggregateDashboard(createDemoFacts(2026), 2026, new Date('2026-02-01T12:00:00+08:00'));
  assert.deepEqual(early.batches.map(row => [row.name, row.future]),
    [['秋季', true], ['寒假', false], ['春季', true], ['暑假', true]]);
  assert.equal(early.batches.filter(row => row.future).every(row => row.classes === 0 && row.enrolled === 0), true);
});
check('专业/课程/教师榜从同一学籍汇总，教师只按主授归属', () => {
  for (const key of ['majors', 'courses', 'teachers']) {
    assert.equal(data.rankings[key][0].enrolled, 2);
    assert.equal(data.rankings[key][0].classes, 1);
  }
});
check('月度净收允许为负，不掩盖退款集中月份', () => {
  const refundOnly = { ...facts, orders: [facts.orders.find(row => row.id === 'old-order')],
    refunds: [facts.refunds.find(row => row.id === 'r2')], enrollments: [] };
  assert.equal(aggregateDashboard(refundOnly, 2026, now).monthly[0].offlineCents, -10000);
});
check('截止日取上海日期，10月14日前的支付不会在10月13日出现', () => {
  const previous = aggregateDashboard(facts, 2026, new Date('2026-10-13T23:59:59+08:00'));
  const next = aggregateDashboard(facts, 2026, new Date('2026-10-14T00:00:00+08:00'));
  assert.equal(previous.totals.grossCents, 40000);
  assert.equal(next.totals.grossCents, 45000);
});
check('历年演示榜单均为Top10且正确降序，未来月份金额为0', () => {
  for (const year of [2026, 2025, 2024]) {
    const demo = aggregateDashboard(createDemoFacts(year), year, now);
    for (const key of ['majors', 'courses', 'teachers', 'videos']) {
      const metric = key === 'videos' ? 'orders' : 'enrolled';
      const rows = demo.rankings[key];
      assert.ok(rows.length > 0 && rows.length <= 10);
      assert.equal(rows.every((row, index) => !index || rows[index - 1][metric] >= row[metric]), true);
    }
    assert.equal(demo.monthly.filter(row => row.future).every(row => row.offlineCents === 0 && row.videoCents === 0), true);
    assert.equal(demo.batches.reduce((total, row) => total + row.enrolled, 0), demo.totals.enrolled);
    assert.equal(demo.batches.reduce((total, row) => total + row.classes, 0), demo.totals.openedClasses);
  }
});
const admissionsFacts = structuredClone(facts);
admissionsFacts.classes = admissionsFacts.classes.map(row => ({ ...row,
  enrollmentEndsOn: row.id === 'future' ? '2026-10-13' : '2026-01-30', capacity: row.id === 'open' ? 2 : 1 }));
admissionsFacts.classes.push(
  { ...admissionsFacts.classes[0], id: 'still-enrolling', enrollmentEndsOn: '2026-10-14', capacity: 100 },
  { ...admissionsFacts.classes[0], id: 'missing-deadline', enrollmentEndsOn: '', capacity: 100 }
);
check('招生效能只含本年度招生结束非取消班级，不以开课日期替代招生截止', () => {
  const stats = aggregateDashboard(admissionsFacts, 2026, now).admissionsEfficiency;
  assert.equal(stats.eligibleClasses, 2);
  assert.equal(stats.enrolled, 2);
  assert.equal(stats.capacity, 3);
  assert.equal(stats.utilization, 2 / 3);
  assert.deepEqual(stats.saturation, [0, 1, 1]);
  assert.equal(stats.averageEnrolled, 1);
  assert.equal(stats.fullClasses, 1);
});
check('招生结束日期按截止日取数，次日结束班级不提前参与统计', () => {
  const next = aggregateDashboard(admissionsFacts, 2026, new Date('2026-10-14T00:00:00+08:00')).admissionsEfficiency;
  assert.equal(next.eligibleClasses, 3);
  assert.equal(next.capacity, 103);
  assert.equal(next.averageEnrolled, 2 / 3);
});
check('无招生结束班级不伪装成零使用率或零平均报名', () => {
  const empty = aggregateDashboard(facts, 2026, now).admissionsEfficiency;
  assert.deepEqual(empty, { eligibleClasses: 0, enrolled: 0, capacity: null, utilization: null,
    averageEnrolled: null, fullClasses: null, saturation: null });
});
check('名额为零、缺失、负数或非法值不缩小分母、不产生NaN或Infinity', () => {
  for (const capacity of [0, undefined, -1, NaN, Infinity, 1.5]) {
    const invalid = structuredClone(admissionsFacts);
    invalid.classes[0].capacity = capacity;
    const stats = aggregateDashboard(invalid, 2026, now).admissionsEfficiency;
    assert.equal(stats.eligibleClasses, 2);
    assert.equal(stats.enrolled, 2);
    assert.equal(stats.averageEnrolled, 1);
    assert.equal(stats.capacity, null);
    assert.equal(stats.utilization, null);
    assert.equal(stats.saturation, null);
    assert.equal(stats.fullClasses, null);
  }
});
check('招生结束但无人报名显示真实零，超额报名不被截断且仍计满班', () => {
  const empty = { ...admissionsFacts, enrollments: [] };
  const zero = aggregateDashboard(empty, 2026, now).admissionsEfficiency;
  assert.equal(zero.utilization, 0);
  assert.equal(zero.saturation[0], zero.eligibleClasses);
  assert.equal(zero.averageEnrolled, 0);
  assert.equal(zero.fullClasses, 0);
  const over = structuredClone(admissionsFacts);
  over.classes = [over.classes[0]];
  over.classes[0].capacity = 1;
  over.enrollments.push({ ...over.enrollments[0], id: 'extra-enrollment', learnerId: 'extra', orderId: 'extra' });
  over.orders.push({ ...over.orders[0], id: 'extra', learnerId: 'extra' });
  const stats = aggregateDashboard(over, 2026, now).admissionsEfficiency;
  assert.equal(stats.utilization, 2);
  assert.deepEqual(stats.saturation, [0, 0, 1]);
  assert.equal(stats.fullClasses, 1);
});
check('历年演示招生效能与对应班级事实、有效报名统计一致', () => {
  for (const year of [2026, 2025, 2024]) {
    const demoFacts = createDemoFacts(year);
    const demo = aggregateDashboard(demoFacts, year, now);
    const eligible = demoFacts.classes.filter(row =>
      Number(String(row.openedOn).slice(0, 4)) === year && !row.cancelled
      && row.enrollmentEndsOn <= demo.period.cutoffDate);
    const stats = demo.admissionsEfficiency;
    assert.equal(stats.eligibleClasses, eligible.length);
    assert.equal(stats.capacity, eligible.reduce((total, row) => total + row.capacity, 0));
    assert.equal(stats.utilization, stats.enrolled / stats.capacity);
    assert.equal(stats.averageEnrolled, stats.enrolled / stats.eligibleClasses);
    assert.ok(stats.enrolled <= demo.totals.enrolled);
    assert.ok(stats.fullClasses <= stats.eligibleClasses);
    if (year < 2026) assert.equal(stats.enrolled, demo.totals.enrolled);
  }
});
check('招生转化限定同年度新增线索，去重并校验面授已支付订单绑定', () => {
  const leadFacts = { ...facts, leads: [
    { id: 'ok', createdOn: '2026-01-01', convertedOn: '2026-01-02', orderId: 'enrolling', source: '推荐' },
    { id: 'ok', createdOn: '2026-01-01', convertedOn: '2026-01-02', orderId: 'enrolling', source: '推荐' },
    { id: 'old', createdOn: '2025-12-31', convertedOn: '2026-01-02', orderId: 'enrolling' },
    { id: 'video', createdOn: '2026-01-01', convertedOn: '2026-01-02', orderId: 'video-valid' },
    { id: 'future', createdOn: '2026-01-01', convertedOn: '2026-10-14', orderId: 'enrolling' },
    { id: 'missing', createdOn: '2026-01-01' }
  ] };
  const result = aggregateDashboard(leadFacts, 2026, now);
  assert.deepEqual(result.admissionsConversion, { leads: 4, converted: 1, rate: .25 });
  assert.equal(result.sourceRanking[0].name, '推荐');
  assert.equal(result.sourceRanking.find(row => row.name === '未记录').leads, 3);
  assert.deepEqual(aggregateDashboard(facts, 2026, now).admissionsConversion, { leads: 0, converted: 0, rate: null });
});
check('报名趋势按实际报名月份统计，排除退班和提前在上年度报名', () => {
  const result = aggregateDashboard(facts, 2026, now);
  assert.equal(result.enrollmentMonthly[0].enrolled, 1);
  assert.equal(result.enrollmentMonthly.reduce((total, row) => total + row.enrolled, 0), 1);
  assert.ok(result.enrollmentMonthly.filter(row => row.future).every(row => row.enrolled === 0));
});
check('同比对齐上年度同月同日，历史年度对齐全年，闰日截到2月28日', () => {
  assert.equal(compareAcademicYears(facts, 2026, now).previous.period.cutoffDate, '2025-10-13');
  assert.equal(compareAcademicYears(facts, 2025, now).previous.period.cutoffDate, '2024-12-31');
  assert.equal(compareAcademicYears(facts, 2028, new Date('2028-02-29T12:00:00+08:00')).previous.period.cutoffDate, '2027-02-28');
  assert.equal(compareAcademicYears(facts, 2027, new Date('2027-09-01T00:00:00+08:00')).previous.period.cutoffDate, '2026-09-01');
});
check('上期按当时事实统计，不计未来开班、支付、退款或退班，视频不混入面授同比', () => {
  const fixture = structuredClone(facts);
  fixture.classes.push(
    { ...fixture.classes[0], id: 'prior', academicYear: 2025, openedOn: '2025-10-13' },
    { ...fixture.classes[0], id: 'prior-later', academicYear: 2025, openedOn: '2025-10-14' }
  );
  fixture.orders.push(
    { id: 'prior-paid', kind: 'offline', classId: 'prior', courseId: 'offline', learnerId: 'prior-student', paidOn: '2025-10-10', amountCents: 10000 },
    { id: 'prior-video', kind: 'video', courseId: 'video', paidOn: '2025-09-01', amountCents: 90000 },
    { id: 'prior-future', kind: 'offline', classId: 'prior', paidOn: '2025-10-14', amountCents: 30000 }
  );
  fixture.enrollments.push(
    { id: 'prior-enrollment', classId: 'prior', orderId: 'prior-paid', learnerId: 'prior-student', enrolledOn: '2025-10-10', withdrawnOn: '2025-11-01' },
    { id: 'prior-duplicate', classId: 'prior', orderId: 'prior-paid', learnerId: 'prior-student', enrolledOn: '2025-10-10' }
  );
  fixture.refunds.push({ id: 'prior-refund', orderId: 'prior-paid', completedOn: '2025-10-14', amountCents: 10000 });
  const result = compareAcademicYears(fixture, 2026, now);
  assert.deepEqual(result.metrics.map(row => [row.current, row.previous, row.growth]), [[1, 1, 0], [2, 1, 1], [5000, 10000, -.5]]);
  assert.equal(result.current.totals.enrolled, data.totals.enrolled);
});
check('上期为零或净收为负时无虚假百分比，无NaN或Infinity', () => {
  const empty = compareAcademicYears(facts, 2026, now);
  assert.ok(empty.metrics.every(row => row.previous === 0 && row.growth === null));
  // 自然年度口径：支付发生在 2024 年、退款发生在 2025 年，2025 年度净收才为负。
  const negative = { ...facts, orders: [{ id: 'prior-old', kind: 'offline', paidOn: '2024-12-01', amountCents: 1000 }],
    refunds: [{ id: 'prior-refund', orderId: 'prior-old', completedOn: '2025-09-01', amountCents: 1000 }] };
  const row = compareAcademicYears(negative, 2026, now).metrics.find(row => row.key === 'offlineNetCents');
  assert.equal(row.previous, -1000);
  assert.equal(row.growth, null);
});
check('历年演示同比同源，两期均按各自截止日计算而非上年度全年', () => {
  for (const year of [2026, 2025, 2024]) {
    const fixture = createDemoFacts(year);
    const result = compareAcademicYears(fixture, year, now);
    assert.equal(result.current.period.label, String(year));
    assert.equal(result.previous.period.label, String(year - 1));
    assert.ok(result.metrics.every(row => row.growth === null || Number.isFinite(row.growth)));
    if (year === 2026) assert.ok(result.previous.totals.openedClasses < 64);
  }
});
check('收入折线只包含已发生月份，不将未来月份连到零', () => {
  const model = incomeChartModel(data.monthly);
  const occurred = data.monthly.filter(row => !row.future).length;
  assert.equal(occurred, 10, '自然年度 1—10 月为已发生月份');
  assert.equal(model.series.length, 2);
  assert.ok(model.series.every(series => series.points.length === occurred));
  assert.deepEqual(model.series[0].points.map(point => point.index), Array.from({ length: occurred }, (_, index) => index));
  assert.equal(model.series[0].points[0].x, .5 / 12 * 100);
  assert.equal(model.series[0].points[occurred - 1].x, (occurred - .5) / 12 * 100);
});
check('收入折线保留负净收且正确跨零基线', () => {
  const model = incomeChartModel([{ offlineCents: -1000000, videoCents: 2000000, future: false }]);
  assert.equal(model.ticks[0], 10);
  assert.equal(model.ticks[4], -10);
  assert.equal(model.zero, 50);
  assert.ok(Math.abs(model.series[0].points[0].y - 55) < 1e-10);
  assert.equal(model.series[1].points[0].y, 40);
});
check('无数据收入折线不产生NaN；已发生的零值仍有数据点', () => {
  for (const monthly of [[], [{ offlineCents: 0, videoCents: 0, future: true }]]) {
    const model = incomeChartModel(monthly);
    assert.equal(model.zero, 100);
    assert.ok(model.series.every(series => series.points.length === 0));
    assert.ok(model.ticks.every(Number.isFinite));
  }
  const model = incomeChartModel([{ offlineCents: 0, videoCents: 0, future: false }]);
  assert.ok(model.series.every(series => series.points.length === 1 && series.points[0].y === 100));
});
check('历史年度收入折线包含完整12个月且点位在绘图区内', () => {
  const historical = aggregateDashboard(createDemoFacts(2025), 2025, now);
  const model = incomeChartModel(historical.monthly);
  assert.ok(model.series.every(series => series.points.length === 12));
  assert.ok(model.series.every(series => series.points.every(point => point.x > 0 && point.x < 100 && point.y >= 0 && point.y <= 100)));
});
check('批次同比使用招生相同天数，未来批次不显示同比，历史批次完整比较', () => {
  const facts = createDemoFacts(2026);
  // 自然年度年初（2 月）只有寒假批次处于招生期，其余三批次尚未开始招生。
  const comparison = compareAcademicYears(facts, 2026, new Date('2026-02-15T12:00:00+08:00'));
  const inProgress = comparison.batchComparisons.filter(row => row.status === '同期');
  const future = comparison.batchComparisons.filter(row => row.status === '未开始');
  assert.equal(inProgress.length, 1);
  assert.equal(inProgress[0].name, '寒假');
  assert.equal(future.length, 3);
  assert.ok(future.every(row => row.current === null && row.previous === null));
  const days = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000);
  const currentBatch = facts.batches.find(row => Number(String(row.startsOn).slice(0, 4)) === 2026 && row.name === inProgress[0].name);
  const priorBatch = facts.batches.find(row => Number(String(row.startsOn).slice(0, 4)) === 2025 && row.name === inProgress[0].name);
  assert.equal(days(inProgress[0].previousCutoff, priorBatch.enrollmentStartsOn),
    days(inProgress[0].cutoff, currentBatch.enrollmentStartsOn), '上期截止日应与本期招生天数相同');
  const historicalFacts = createDemoFacts(2025);
  const historical = compareAcademicYears(historicalFacts, 2025, now);
  assert.ok(historical.batchComparisons.every(row => row.status === '完整' && row.current && row.previous));
  const total = historical.batchComparisons.reduce((value, row) => value + row.current.netCents, 0);
  historicalFacts.orders.push({ id: 'video-excluded', kind: 'video', paidOn: '2026-01-01', amountCents: 1000000 });
  assert.equal(compareAcademicYears(historicalFacts, 2025, now).batchComparisons.reduce((value, row) => value + row.current.netCents, 0), total);
});
// —— 学情分析（CR-2026-168）——
const learningNow = new Date('2026-11-06T19:00:00+08:00');
check('学情派生与业务字典同源：流失原因10项、教师五维度名称不漂移', () => {
  const demoStore = readFileSync(fileURLToPath(new URL('../shared/js/demo-store.js', import.meta.url)), 'utf8');
  const churnMatch = demoStore.match(/churn_reason:\s*\{[^}]*items:\s*\[([^\]]+)\]/);
  assert.ok(churnMatch, 'demo-store.js 中未找到 churn_reason 字典');
  const items = churnMatch[1].split(',').map(row => row.trim().replace(/^'|'$/g, ''));
  assert.deepEqual(CHURN_REASONS, items);
  const reviewStore = readFileSync(fileURLToPath(new URL('../shared/js/review-store.js', import.meta.url)), 'utf8');
  REVIEW_DIMENSIONS.forEach(({ key, label }) => {
    assert.ok(reviewStore.includes(`key: '${key}'`), `review-store.js 缺少维度 ${key}`);
    assert.ok(reviewStore.includes(`label: '${label}'`), `review-store.js 维度名与 ${label} 不一致`);
  });
});
check('已退班报名保留为流失事实，经营口径的在读人数不受影响', () => {
  const facts = createDemoFacts(2025);
  const learning = createLearningFacts(facts, 2025, learningNow);
  const data = aggregateLearning(learning);
  assert.ok(data.churn.count > 0, '2025 年度演示数据必须能看到流失，否则面板恒为空');
  assert.equal(data.churn.base, learning.enrollments.length);
  assert.ok(data.churn.base > data.capacity, '流失人次应计在在册基数内但不占在读');
  assert.ok(data.totals.enrollments === data.capacity);
});
check('学情比率全部落在 0-100 且空数据显示—而不是伪 0', () => {
  for (const year of [2026, 2025, 2024]) {
    const data = aggregateLearning(createLearningFacts(createDemoFacts(year), year, learningNow));
    for (const rate of [data.totals.attendanceRate, data.totals.homeworkRate, data.totals.participation, data.totals.churnRate]) {
      assert.ok(rate === null || (rate >= 0 && rate <= 100));
    }
  }
});
check('需关注名单自洽：综合分升序、脱敏、不超出风险总数', () => {
  const data = aggregateLearning(createLearningFacts(createDemoFacts(2025), 2025, learningNow));
  assert.ok(data.watchlist.length <= 10);
  assert.ok(data.totals.warning >= data.watchlist.length);
  assert.ok(data.watchlist.every(row => row.score < 70 && row.name.endsWith('**') && row.className && row.className !== '—'));
  assert.ok(data.watchlist.every((row, index) => !index || data.watchlist[index - 1].score <= row.score));
});
check('课程与教师榜从同一事实聚合：人次降序、评分缺失不产生NaN', () => {
  const data = aggregateLearning(createLearningFacts(createDemoFacts(2025), 2025, learningNow));
  assert.ok(data.courses.length <= 10);
  assert.ok(data.courses.every((row, index) => !index || data.courses[index - 1].students >= row.students));
  assert.ok(data.teachers.length <= 10);
  assert.ok(data.teachers.every(row => Number.isFinite(row.score) && row.attendanceRate !== null));
  assert.ok(data.teachers.every((row, index) => !index || data.teachers[index - 1].score >= row.score));
});
check('家长评价口径：参评率分母只含已结课班级，低分原声必带文本', () => {
  const data = aggregateLearning(createLearningFacts(createDemoFacts(2026), 2026, learningNow));
  assert.ok(data.review.base > 0 && data.review.count <= data.review.base);
  assert.equal(data.totals.participation, Math.round(data.review.count / data.review.base * 1000) / 10);
  assert.ok(data.review.low.every(row => row.text && row.lowest <= 3 && row.studentName.endsWith('**')));
  const distributionTotal = data.review.distribution.reduce((sum, row) => sum + row.count, 0);
  assert.equal(distributionTotal, data.review.count);
});
check('流失原因分布：字典原值分组、不出「其他原因合计」、占比可核对', () => {
  const data = aggregateLearning(createLearningFacts(createDemoFacts(2025), 2025, learningNow));
  assert.ok(data.churn.reasons.length <= 10 && data.churn.reasons.length > 0);
  assert.ok(data.churn.reasons.every(row => CHURN_REASONS.includes(row.name)));
  const counted = data.churn.reasons.reduce((sum, row) => sum + row.count, 0);
  assert.ok(counted <= data.churn.count);
  assert.ok(data.churn.reasons.every(row => Math.abs(row.share - Math.round(row.count / data.churn.count * 1000) / 10) < 0.05));
  assert.ok(data.churn.topCourses.every(row => row.rate !== null && row.count <= row.base));
});
check('学情进度口径：进度率 = 已上课次 ÷ 计划课次，历史年度接近完整', () => {
  for (const year of [2026, 2025, 2024]) {
    const learning = createLearningFacts(createDemoFacts(year), year, learningNow);
    const data = aggregateLearning(learning);
    assert.equal(data.totals.progressRate, Math.round(learning.sessions.length / (learning.classes.size * LESSON_TOTAL) * 1000) / 10);
    if (year < 2026) assert.ok(data.totals.progressRate > 95);
  }
});
check('CR-2026-169：两面板已彻底移除，招生与学情数据可同页共存', () => {
  const facts = createDemoFacts(2026);
  const dashboard = compareAcademicYears(facts, 2026, learningNow).current;
  const data = aggregateLearning(createLearningFacts(facts, 2026, learningNow));
  assert.equal(data.monthly, undefined, '月度趋势聚合应已移除');
  assert.equal(data.layers, undefined, '学员分层聚合应已移除');
  assert.ok(data.totals.warning >= data.watchlist.length && data.watchlist.length <= 10);
  assert.ok(Number.isFinite(dashboard.admissionsConversion.leads));
  assert.ok(Array.isArray(dashboard.sourceRanking) && dashboard.enrollmentMonthly.length > 0);
  const html = readFileSync(fileURLToPath(new URL('../visualization/learning.html', import.meta.url)), 'utf8');
  const help = readFileSync(fileURLToPath(new URL('../shared/js/visualization-help.js', import.meta.url)), 'utf8');
  assert.ok(!html.includes('出勤与作业提交趋势') && !html.includes('学员分层'), 'HTML 不应残留已删面板');
  assert.equal((html.match(/data-page=/g) || []).length, 2, '页签应为两个');
  assert.ok(html.includes('学情与招生'));
  assert.ok(help.includes('不作为结业依据') && help.includes('结业阈值（系统参数）'), '口径边界应留在页面说明而非界面');
  const redirect = readFileSync(fileURLToPath(new URL('../visualization/admissions.html', import.meta.url)), 'utf8');
  assert.ok(redirect.includes('window.location.replace'), '旧招生地址应保留跳转');
  const css = readFileSync(fileURLToPath(new URL('../shared/css/visualization.css', import.meta.url)), 'utf8');
  assert.ok(!css.includes('.lp-trend') && !css.includes('.layer-list'), 'CSS 不应残留已删面板样式');
});
check('顶部指标分子分母可核对：作业已交份数不是 NaN 且比率可复算', () => {
  for (const year of [2026, 2025, 2024]) {
    const data = aggregateLearning(createLearningFacts(createDemoFacts(year), year, learningNow));
    assert.ok(Number.isFinite(data.totals.homeworkSubmitted), '已交份数必须是数值');
    assert.ok(Number.isFinite(data.totals.attendancePresent));
    assert.ok(data.totals.homeworkSubmitted <= data.totals.homeworkExpected);
    assert.equal(data.totals.homeworkRate, Math.round(data.totals.homeworkSubmitted / data.totals.homeworkExpected * 1000) / 10);
  }
});
check('CR-2026-169：报告出口收在顶栏，六面板 2×3，界面去注释化', () => {
  const html = readFileSync(fileURLToPath(new URL('../visualization/learning.html', import.meta.url)), 'utf8');
  const css = readFileSync(fileURLToPath(new URL('../shared/css/visualization.css', import.meta.url)), 'utf8');
  const render = readFileSync(fileURLToPath(new URL('../shared/js/visualization.js', import.meta.url)), 'utf8');
  const help = readFileSync(fileURLToPath(new URL('../shared/js/visualization-help.js', import.meta.url)), 'utf8');
  const header = html.slice(html.indexOf('<header class="dashboard-header">'), html.indexOf('</header>'));
  assert.ok(header.includes('id="export-report"') && header.includes('导出报告'), '导出按钮必须在顶栏');
  assert.ok(!html.includes('报告与口径') && !html.includes('report-list') && !html.includes('report-help'), '报告面板应彻底移除');
  assert.equal((html.match(/<article class="analysis-panel lp-cell/g) || []).length, 9, '源码应保留 9 个面板定义（含 3 个隐藏）');
  assert.equal((html.match(/<article class="analysis-panel lp-cell[^>]* hidden/g) || []).length, 3, '其中 3 个面板隐藏');
  assert.ok(!html.includes('lp-wide') && !css.includes('lp-wide'), '不应残留半屏宽规则');
  assert.ok(!css.includes('.report-list') && !css.includes('.report-actions') && !css.includes('.gt-common'), 'CSS 残留报告面板样式');
  assert.ok(render.includes("byId('export-report')") && render.includes('window.print()') && !render.includes('report-help'));
  assert.ok(css.includes('.learning-grid { grid-template-rows: none; }'), '打印样式应解除固定三行');
  assert.ok(help.includes('导出报告、页面说明') && !help.includes('导出当前页、口径说明'));
  assert.ok(!html.includes('group-tag') && !html.includes('panel-footnote'), '界面不应出现分组标签与口径脚注');
  assert.ok(!html.includes('演示评分不作为结业依据') && !html.includes('转班不计入流失') && !html.includes('与经营总览同一班级事实'));
  assert.ok(!/<h2 title=/.test(html), '指标名不应挂长口径注释');
  assert.ok(!css.includes('.group-tag') && !css.includes('.gt-'), 'CSS 不应残留分组标签样式');
  assert.ok(html.includes('id="watch-scope"') && !html.includes('watch-total'));
  assert.ok(render.includes("byId('watch-scope')") && !render.includes('转班不计入流失'));
  assert.ok(css.includes('.learning-grid .lp-cell { grid-column: span 4; min-width: 0; padding: 12px 14px; background: #1c2125; border: 1px solid #394349; border-radius: 5px; }'), '九宫格应为卡片式分割');
  assert.ok(!css.includes('.learning-grid .lp-cell:nth-child(3n+2)'), '不应残留拼接式单边分隔线');
  assert.ok(help.includes('评分口径与参数边界') && help.includes('流失高发课程 Top10'), '注释口径应完整保留在页面说明');
});
check('CR-2026-169：流失高发课程与原因分布同源，口径可复算', () => {
  const html = readFileSync(fileURLToPath(new URL('../visualization/learning.html', import.meta.url)), 'utf8');
  const render = readFileSync(fileURLToPath(new URL('../shared/js/visualization.js', import.meta.url)), 'utf8');
  const help = readFileSync(fileURLToPath(new URL('../shared/js/visualization-help.js', import.meta.url)), 'utf8');
  for (const year of [2026, 2025]) {
    const data = aggregateLearning(createLearningFacts(createDemoFacts(year), year, learningNow));
    const rows = data.churn.topCourses;
    assert.ok(rows.length > 0 && rows.length <= 10, `${year} 年度应有 Top10 课程`);
    assert.ok(rows.every(row => row.count > 0 && row.base >= row.count && row.name));
    assert.ok(rows.every(row => row.rate === Math.round(row.count / row.base * 1000) / 10), '流失率可复算');
    assert.ok(rows.every((row, i) => !i || rows[i - 1].count >= row.count), '按流失人次降序');
    assert.ok(rows.reduce((sum, row) => sum + row.count, 0) <= data.churn.count, '不得超过流失总人次');
  }
  assert.ok(html.includes('id="churn-top-courses"') && html.includes('流失高发课程'));
  assert.ok(render.includes('data.churn.topCourses') && render.includes("byId('churn-top-courses')"));
  assert.ok(help.includes('课程流失率 = 该课程期间流失人次'));
});
check('CR-2026-169：所有 TOP 排行统一 Top10 且列表可滚动', () => {
  const html = readFileSync(fileURLToPath(new URL('../visualization/learning.html', import.meta.url)), 'utf8');
  const css = readFileSync(fileURLToPath(new URL('../shared/css/visualization.css', import.meta.url)), 'utf8');
  const render = readFileSync(fileURLToPath(new URL('../shared/js/visualization.js', import.meta.url)), 'utf8');
  const learning = readFileSync(fileURLToPath(new URL('../shared/js/visualization-learning.js', import.meta.url)), 'utf8');
  const factsSrc = readFileSync(fileURLToPath(new URL('../shared/js/visualization-data.js', import.meta.url)), 'utf8');
  assert.equal((html.match(/rank-scroll/g) || []).length, 7, '7 个排行列表应有滚动容器');
  assert.equal((html.match(/>Top10</g) || []).length, 6, '6 个静态排行标题应为 Top10');
  assert.ok(!/Top(?!10)\d/.test(html), '不应残留 Top3/4/5/6');
  assert.ok(css.includes('.learning-grid .rank-scroll { flex: 1; min-height: 0; overflow-y: auto;'));
  assert.ok(css.includes('table thead th { position: sticky; top: 0;'), '表头应吸顶');
  assert.ok(css.includes('.learning-grid .rank-scroll { overflow: visible !important;'), '打印应展开全部行');
  assert.ok(render.includes('function mountAutoScroll') && render.includes('mouseenter') && render.includes("get('scroll') === '0'"));
  assert.ok(render.includes("'Top10 · 共 '") && !render.includes("'Top5 · 共 '"));
  ['.score - b.score).slice(0, 10)',
   'b.students - a.students || a.id.localeCompare(b.id)).slice(0, 10)',
   'b.score - a.score || a.id.localeCompare(b.id)).slice(0, 10)',
   'b.createdAt.localeCompare(a.createdAt)).slice(0, 10)',
   "a.name.localeCompare(b.name, 'zh-CN')).slice(0, 10)",
   'b.count - a.count || a.id.localeCompare(b.id)).slice(0, 10)'
  ].forEach(snippet => assert.ok(learning.includes(snippet), '聚合上限未改 10: ' + snippet));
  assert.ok(factsSrc.includes("a.id.localeCompare(b.id, 'zh-CN')).slice(0, 10)"), '招生来源榜上限未改 10');
  for (const year of [2026, 2025]) {
    const data = aggregateLearning(createLearningFacts(createDemoFacts(year), year, learningNow));
    assert.equal(data.watchlist.length, 10, `${year} 年度需关注学员应取满 10 条`);
    assert.ok(data.courses.length <= 10 && data.teachers.length <= 10);
    assert.ok(data.churn.reasons.length <= 10 && data.churn.topCourses.length <= 10);
    assert.ok(data.review.low.length <= 10);
  }
});
check('CR-2026-171：三面板两指标隐藏但代码可恢复，栅格收敛为 2 行 × 3 列', () => {
  const html = readFileSync(fileURLToPath(new URL('../visualization/learning.html', import.meta.url)), 'utf8');
  const css = readFileSync(fileURLToPath(new URL('../shared/css/visualization.css', import.meta.url)), 'utf8');
  const render = readFileSync(fileURLToPath(new URL('../shared/js/visualization.js', import.meta.url)), 'utf8');
  const help = readFileSync(fileURLToPath(new URL('../shared/js/visualization-help.js', import.meta.url)), 'utf8');
  const hiddenPanels = [...html.matchAll(/<article class="analysis-panel lp-cell ([\w-]+)" hidden data-hidden-by="CR-2026-171">/g)]
    .map(match => match[1]).sort();
  assert.deepEqual(hiddenPanels, ['lp-churn', 'lp-enrollment', 'lp-feedback'], '隐藏面板应为报名趋势／负面反馈原声／流失预警');
  assert.equal((html.match(/data-hidden-by="CR-2026-171"/g) || []).length, 5, '3 面板 + 2 指标共 5 处隐藏标记');
  const statsStart = html.indexOf('<section class="overview-stats');
  const stats = html.slice(statsStart, html.indexOf('</section>', statsStart));
  const hiddenMetrics = [...stats.matchAll(/<div class="overview-metric" hidden[^>]*>\s*<h2>([^<]+)<\/h2>/g)]
    .map(match => match[1]).sort();
  assert.deepEqual(hiddenMetrics, ['作业提交率', '线索转报名率'], '隐藏指标应为作业提交率与线索转报名率');
  for (const label of ['在读学员', '平均出勤率', '家长参评率', '期间流失率']) {
    assert.ok(stats.includes('<h2>' + label + '</h2>'), label + ' 应保留在顶部');
  }
  assert.equal((stats.match(/<div class="overview-metric(?: |")/g) || []).length, 6, '源码应保留 6 个指标定义');
  assert.ok(css.includes('grid-template-rows: repeat(2, minmax(0, 1fr))'), '栅格应为两行');
  assert.ok(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'), '顶部指标应为四列');
  assert.ok(css.includes('.learning-grid .lp-cell[hidden] { display: none !important; }'), 'display:flex 会覆盖 hidden，需显式隐藏');
  assert.ok(css.includes('.analysis-stats .overview-metric[hidden] { display: none !important; }'), '隐藏指标应显式不参与栅格');
  assert.ok(!css.includes('metric-lead'), '首个可见指标仍由 :first-child 承担，不应残留补偿类');
  assert.ok(render.includes('.learning-grid .lp-cell:not([hidden]) .rank-scroll'), '自动滚动应跳过隐藏面板');
  assert.ok(render.includes("setMetric('learn-students'") && render.includes("byId('feedback-list')") &&
    render.includes("byId('churn-reasons')"), '隐藏只影响展示，渲染与数据口径保留');
  assert.ok(help.includes('保留 6 个可见面板'), '页面说明应与可见面板数一致');
  const data = aggregateLearning(createLearningFacts(createDemoFacts(2026), 2026, learningNow));
  assert.ok(data.churn.reasons.length > 0 && data.churn.topCourses.length > 0 && data.review.low.length <= 10,
    '流失与低分评价聚合保留供恢复使用');
});
check('CR-2026-174：两页签顶栏与页面说明统一为自然年度口径', () => {
  const read = file => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
  const sources = ['../visualization/index.html', '../visualization/learning.html',
    '../shared/js/visualization-help.js', '../shared/js/visualization.js', '../spec/pages/page-types.js'].map(read);
  const help = sources[2];
  assert.ok(help.includes('1月1日') && help.includes('12月31日') && help.includes('统计年度'),
    '页面说明须写明自然年度区间与统计年度');
  assert.ok(sources.every(source => !source.includes('学年')), '大屏相关源码不应残留学年口径表述');
  assert.ok(read('../shared/js/visualization-data.js').includes("const startDate = year + '-01-01'")
    && read('../shared/js/visualization-data.js').includes("const endDate = year + '-12-31'"));
  assert.equal(academicPeriod(2025, now).label, '2025');
  assert.equal(academicPeriod(2025, now).startDate, '2025-01-01');
});
console.log('驾驶舱回归通过：' + checks + ' 项。');
