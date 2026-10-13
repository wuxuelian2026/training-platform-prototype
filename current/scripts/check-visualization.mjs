import assert from 'node:assert/strict';
import { academicYearStart, academicPeriod, aggregateDashboard, createDemoFacts, compareAcademicYears } from '../shared/js/visualization-data.js';
import { incomeChartModel } from '../shared/js/visualization-chart.js';

let checks = 0;
function check(label, run) {
  run();
  checks++;
  console.log('PASS ' + label);
}
const now = new Date('2026-10-13T14:00:00+08:00');
check('上海时区学年在9月1日零点切换', () => {
  assert.equal(academicYearStart(new Date('2026-08-31T23:59:59+08:00')), 2025);
  assert.equal(academicYearStart(new Date('2026-09-01T00:00:00+08:00')), 2026);
  assert.equal(academicYearStart(new Date('2027-08-31T23:59:59+08:00')), 2026);
  assert.equal(academicYearStart(new Date('2027-09-01T00:00:00+08:00')), 2027);
});
check('学年范围和12个月按跨年顺序排列', () => {
  const period = academicPeriod(2026, now);
  assert.equal(period.startDate, '2026-09-01');
  assert.equal(period.endDate, '2027-08-31');
  assert.equal(period.cutoffDate, '2026-10-13');
  assert.deepEqual(period.months.map(row => row.key), ['2026-09', '2026-10', '2026-11', '2026-12',
    '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08']);
  assert.equal(period.months.filter(row => row.future).length, 10);
  assert.equal(academicPeriod(2025, now).cutoffDate, '2026-08-31');
  assert.equal(academicPeriod(2025, now).months.some(row => row.future), false);
});

const facts = {
  courses: [{ id: 'offline', name: '面授课程', major: '中国舞' }, { id: 'video', name: '视频课程' }],
  teachers: [{ id: 'teacher', name: '主授教师' }],
  batches: ['秋季', '寒假', '春季', '暑假'].map((name, index) => ({ academicYear: 2026, name,
    startsOn: ['2026-09-08', '2027-01-08', '2027-03-08', '2027-06-08'][index] })),
  classes: [
    { id: 'open', academicYear: 2026, batch: '秋季', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2026-09-08' },
    { id: 'future', academicYear: 2026, batch: '秋季', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2026-10-20' },
    { id: 'cancelled', academicYear: 2026, batch: '秋季', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2026-09-08', cancelled: true },
    { id: 'old', academicYear: 2025, batch: '暑假', courseId: 'offline', primaryTeacherId: 'teacher', openedOn: '2026-08-08' }
  ],
  orders: [
    { id: 'prepaid', kind: 'offline', classId: 'open', courseId: 'offline', learnerId: 'a', paidOn: '2026-08-25', amountCents: 20000 },
    { id: 'enrolling', kind: 'offline', classId: 'future', courseId: 'offline', learnerId: 'a', paidOn: '2026-09-01', amountCents: 15000 },
    { id: 'withdrawn', kind: 'offline', classId: 'open', courseId: 'offline', learnerId: 'b', paidOn: '2026-09-01', amountCents: 10000 },
    { id: 'old-order', kind: 'offline', classId: 'old', courseId: 'offline', learnerId: 'c', paidOn: '2026-08-01', amountCents: 10000 },
    { id: 'video-valid', kind: 'video', courseId: 'video', paidOn: '2026-09-01', amountCents: 5000 },
    { id: 'video-full', kind: 'video', courseId: 'video', paidOn: '2026-09-01', amountCents: 5000 },
    { id: 'video-part', kind: 'video', courseId: 'video', paidOn: '2026-10-13', amountCents: 5000 },
    { id: 'video-after-today', kind: 'video', courseId: 'video', paidOn: '2026-10-14', amountCents: 5000 },
    { id: 'unpaid', kind: 'video', courseId: 'video', paidOn: '', amountCents: 5000 },
    { id: 'outside', kind: 'video', courseId: 'video', paidOn: '2027-09-01', amountCents: 5000 }
  ],
  enrollments: [
    { id: 'e1', classId: 'open', learnerId: 'a', orderId: 'prepaid', enrolledOn: '2026-08-25' },
    { id: 'e1-duplicate', classId: 'open', learnerId: 'a', orderId: 'prepaid', enrolledOn: '2026-08-25' },
    { id: 'e2', classId: 'future', learnerId: 'a', orderId: 'enrolling', enrolledOn: '2026-09-01' },
    { id: 'e3', classId: 'open', learnerId: 'b', orderId: 'withdrawn', enrolledOn: '2026-09-01', withdrawnOn: '2026-09-10' },
    { id: 'e4', classId: 'cancelled', learnerId: 'a', orderId: 'prepaid', enrolledOn: '2026-08-25' },
    { id: 'e5', classId: 'old', learnerId: 'c', orderId: 'old-order', enrolledOn: '2026-08-01' }
  ],
  refunds: [
    { id: 'r1', orderId: 'withdrawn', completedOn: '2026-09-10', amountCents: 10000 },
    { id: 'r2', orderId: 'old-order', completedOn: '2026-09-05', amountCents: 10000 },
    { id: 'r3', orderId: 'video-full', completedOn: '2026-09-05', amountCents: 5000 },
    { id: 'r4', orderId: 'video-part', completedOn: '2026-10-13', amountCents: 500 },
    { id: 'r5', orderId: 'video-valid', completedOn: '2026-10-14', amountCents: 5000 },
    { id: 'pending', orderId: 'prepaid', completedOn: '', amountCents: 20000 }
  ]
};
const data = aggregateDashboard(facts, 2026, now);
check('开班数排除未开课、取消和其他学年班级', () => assert.equal(data.totals.openedClasses, 1));
check('报名按学员×班级去重，排除退班，保留提前支付报名', () => {
  assert.equal(data.totals.enrolled, 2);
  assert.equal(data.totals.students, 1);
});
check('视频付费订单不含未支付、未来支付和全额退款，部分退款仍计一笔', () => {
  assert.equal(data.totals.videoOrders, 2);
  assert.equal(data.totals.refundedVideoOrders, 1);
  assert.equal(data.rankings.videos[0].orders, 2);
});
check('收入按实际支付/退款日期，含上学年订单在本学年的退款', () => {
  assert.equal(data.totals.grossCents, 40000);
  assert.equal(data.totals.refundCents, 25500);
  assert.equal(data.totals.netCents, 14500);
  assert.equal(data.totals.offlineNetCents, 5000);
  assert.equal(data.totals.videoNetCents, 9500);
  assert.equal(data.monthly.reduce((total, row) => total + row.offlineCents + row.videoCents, 0), data.totals.netCents);
});
check('四批次固定顺序、年份归属正确，未来批次无演示业绩', () => {
  assert.deepEqual(data.batches.map(row => [row.name, row.calendarYear]), [['秋季', 2026], ['寒假', 2027], ['春季', 2027], ['暑假', 2027]]);
  assert.equal(data.batches[0].classes, 1);
  assert.equal(data.batches[0].enrolled, 2);
  assert.equal(data.batches.slice(1).every(row => row.future && row.classes === 0 && row.enrolled === 0), true);
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
check('历年演示榜单均为Top5且正确降序，未来月份金额为0', () => {
  for (const year of [2026, 2025, 2024]) {
    const demo = aggregateDashboard(createDemoFacts(year), year, now);
    for (const key of ['majors', 'courses', 'teachers', 'videos']) {
      const metric = key === 'videos' ? 'orders' : 'enrolled';
      const rows = demo.rankings[key];
      assert.equal(rows.length, 5);
      assert.equal(rows.every((row, index) => !index || rows[index - 1][metric] >= row[metric]), true);
    }
    assert.equal(demo.monthly.filter(row => row.future).every(row => row.offlineCents === 0 && row.videoCents === 0), true);
    assert.equal(demo.batches.reduce((total, row) => total + row.enrolled, 0), demo.totals.enrolled);
    assert.equal(demo.batches.reduce((total, row) => total + row.classes, 0), demo.totals.openedClasses);
  }
});
const admissionsFacts = structuredClone(facts);
admissionsFacts.classes = admissionsFacts.classes.map(row => ({ ...row,
  enrollmentEndsOn: row.id === 'future' ? '2026-10-13' : '2026-09-30', capacity: row.id === 'open' ? 2 : 1 }));
admissionsFacts.classes.push(
  { ...admissionsFacts.classes[0], id: 'still-enrolling', enrollmentEndsOn: '2026-10-14', capacity: 100 },
  { ...admissionsFacts.classes[0], id: 'missing-deadline', enrollmentEndsOn: '', capacity: 100 }
);
check('招生效能只含本学年招生结束非取消班级，不以开课日期替代招生截止', () => {
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
    const eligible = demoFacts.classes.filter(row => row.academicYear === year && !row.cancelled && row.enrollmentEndsOn <= demo.period.cutoffDate);
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
check('招生转化限定同学年新增线索，去重并校验面授已支付订单绑定', () => {
  const leadFacts = { ...facts, leads: [
    { id: 'ok', createdOn: '2026-09-01', convertedOn: '2026-09-02', orderId: 'enrolling', source: '推荐' },
    { id: 'ok', createdOn: '2026-09-01', convertedOn: '2026-09-02', orderId: 'enrolling', source: '推荐' },
    { id: 'old', createdOn: '2026-08-31', convertedOn: '2026-09-02', orderId: 'enrolling' },
    { id: 'video', createdOn: '2026-09-01', convertedOn: '2026-09-02', orderId: 'video-valid' },
    { id: 'future', createdOn: '2026-09-01', convertedOn: '2026-10-14', orderId: 'enrolling' },
    { id: 'missing', createdOn: '2026-09-01' }
  ] };
  const result = aggregateDashboard(leadFacts, 2026, now);
  assert.deepEqual(result.admissionsConversion, { leads: 4, converted: 1, rate: .25 });
  assert.equal(result.sourceRanking[0].name, '推荐');
  assert.equal(result.sourceRanking.find(row => row.name === '未记录').leads, 3);
  assert.deepEqual(aggregateDashboard(facts, 2026, now).admissionsConversion, { leads: 0, converted: 0, rate: null });
});
check('报名趋势按实际报名月份统计，排除退班和提前在上学年报名', () => {
  const result = aggregateDashboard(facts, 2026, now);
  assert.equal(result.enrollmentMonthly[0].enrolled, 1);
  assert.equal(result.enrollmentMonthly.reduce((total, row) => total + row.enrolled, 0), 1);
  assert.ok(result.enrollmentMonthly.filter(row => row.future).every(row => row.enrolled === 0));
});
check('同比对齐上学年同月同日，历史学年对齐全年，闰日截到2月28日', () => {
  assert.equal(compareAcademicYears(facts, 2026, now).previous.period.cutoffDate, '2025-10-13');
  assert.equal(compareAcademicYears(facts, 2025, now).previous.period.cutoffDate, '2025-08-31');
  assert.equal(compareAcademicYears(facts, 2027, new Date('2028-02-29T12:00:00+08:00')).previous.period.cutoffDate, '2027-02-28');
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
  const negative = { ...facts, orders: [{ id: 'prior-old', kind: 'offline', paidOn: '2025-08-01', amountCents: 1000 }],
    refunds: [{ id: 'prior-refund', orderId: 'prior-old', completedOn: '2025-09-01', amountCents: 1000 }] };
  const row = compareAcademicYears(negative, 2026, now).metrics.find(row => row.key === 'offlineNetCents');
  assert.equal(row.previous, -1000);
  assert.equal(row.growth, null);
});
check('历年演示同比同源，两期均按各自截止日计算而非上学年全年', () => {
  for (const year of [2026, 2025, 2024]) {
    const fixture = createDemoFacts(year);
    const result = compareAcademicYears(fixture, year, now);
    assert.equal(result.current.period.label, year + '-' + (year + 1));
    assert.equal(result.previous.period.label, (year - 1) + '-' + year);
    assert.ok(result.metrics.every(row => row.growth === null || Number.isFinite(row.growth)));
    if (year === 2026) assert.ok(result.previous.totals.openedClasses < 64);
  }
});
check('收入折线只包含已发生月份，不将未来月份连到零', () => {
  const model = incomeChartModel(data.monthly);
  assert.equal(model.series.length, 2);
  assert.ok(model.series.every(series => series.points.length === 2));
  assert.deepEqual(model.series[0].points.map(point => point.index), [0, 1]);
  assert.equal(model.series[0].points[0].x, .5 / 12 * 100);
  assert.equal(model.series[0].points[1].x, 1.5 / 12 * 100);
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
check('历史学年收入折线包含完整12个月且点位在绘图区内', () => {
  const historical = aggregateDashboard(createDemoFacts(2025), 2025, now);
  const model = incomeChartModel(historical.monthly);
  assert.ok(model.series.every(series => series.points.length === 12));
  assert.ok(model.series.every(series => series.points.every(point => point.x > 0 && point.x < 100 && point.y >= 0 && point.y <= 100)));
});
check('批次同比使用招生相同天数，未来批次不显示同比，历史批次完整比较', () => {
  const facts = createDemoFacts(2026);
  facts.batches.find(row => row.academicYear === 2025 && row.name === '秋季').enrollmentStartsOn = '2025-08-01';
  const comparison = compareAcademicYears(facts, 2026, new Date('2026-09-15T12:00:00+08:00'));
  assert.equal(comparison.batchComparisons[0].status, '同期');
  assert.equal(comparison.batchComparisons[0].previousCutoff, '2025-08-28');
  assert.ok(comparison.batchComparisons.slice(1).every(row => row.status === '未开始' && row.current === null && row.previous === null));
  const historical = compareAcademicYears(facts, 2025, now);
  assert.ok(historical.batchComparisons.every(row => row.status === '完整'));
  const total = historical.batchComparisons.reduce((value, row) => value + row.current.netCents, 0);
  facts.orders.push({ id: 'video-excluded', kind: 'video', paidOn: '2026-01-01', amountCents: 1000000 });
  assert.equal(compareAcademicYears(facts, 2025, now).batchComparisons.reduce((value, row) => value + row.current.netCents, 0), total);
});
console.log('驾驶舱回归通过：' + checks + ' 项。');
