export const TIME_ZONE = 'Asia/Shanghai';
export const BATCHES = ['秋季', '寒假', '春季', '暑假'];

const OFFLINE_COURSES = [
  { id: 'offline-dance', name: '中国舞基础训练', major: '中国舞', priceCents: 168000 },
  { id: 'offline-ballet', name: '芭蕾舞进阶训练', major: '芭蕾舞', priceCents: 218000 },
  { id: 'offline-piano', name: '钢琴基础与演奏', major: '钢琴', priceCents: 258000 },
  { id: 'offline-vocal', name: '声乐演唱技巧', major: '声乐', priceCents: 198000 },
  { id: 'offline-painting', name: '中国画山水入门', major: '中国画', priceCents: 158000 },
  { id: 'offline-writing', name: '书法临帖与创作', major: '书法', priceCents: 138000 },
  { id: 'offline-child-art', name: '少儿创意绘画', major: '少儿绘画', priceCents: 148000 },
  { id: 'offline-dance-advanced', name: '中国舞身韵提高', major: '中国舞', priceCents: 188000 }
];
const VIDEO_COURSES = [
  { id: 'video-vocal', name: '声乐演唱技巧', priceCents: 128000 },
  { id: 'video-dance', name: '中国舞基础训练', priceCents: 98000 },
  { id: 'video-writing', name: '硬笔书法入门', priceCents: 68000 },
  { id: 'video-stage', name: '舞台表演与形体', priceCents: 158000 },
  { id: 'video-piano', name: '钢琴即兴伴奏', priceCents: 78000 },
  { id: 'video-art', name: '国画花鸟技法', priceCents: 88000 }
];
const TEACHERS = ['王玥', '徐帆', '林悦', '陈晨', '李青', '周雅', '唐雯']
  .map((name, index) => ({ id: 'teacher-' + index, name }));
const uniqueBy = (rows, key) => [...new Map(rows.map(row => [row[key], row])).values()];
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
const datePart = value => String(value || '').slice(0, 10);

export function shanghaiDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map(part => [part.type, part.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
}

export function academicYearStart(now = new Date()) {
  const today = shanghaiDate(now);
  return Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 9 ? 1 : 0);
}

export function academicPeriod(startYear, now = new Date()) {
  const today = shanghaiDate(now);
  const startDate = startYear + '-09-01';
  const endDate = (startYear + 1) + '-08-31';
  const cutoffDate = today < endDate ? today : endDate;
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = (index + 8) % 12 + 1;
    const year = startYear + (index >= 4 ? 1 : 0);
    const key = year + '-' + String(month).padStart(2, '0');
    return { key, year, month, label: month + '月', future: key > cutoffDate.slice(0, 7) };
  });
  return { startYear, startDate, endDate, cutoffDate, label: startYear + '-' + (startYear + 1), months };
}

// 展示样例独立于三端业务存储；同时保留支付、退款、学籍和班级事实，避免用静态总数拼榜单。
export function createDemoFacts(startYear) {
  const facts = { courses: [...OFFLINE_COURSES, ...VIDEO_COURSES], teachers: TEACHERS,
    batches: [], classes: [], enrollments: [], orders: [], refunds: [], leads: [] };
  const shiftDays = (date, days) => {
    const value = new Date(date + 'T00:00:00Z');
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const date = (year, month, day) => year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  for (const year of [startYear - 1, startYear, startYear + 1]) {
    BATCHES.forEach((batch, batchIndex) => {
      const calendarYear = year + (batchIndex > 0 ? 1 : 0);
      const firstMonth = [9, 1, 3, 6][batchIndex];
      facts.batches.push({ academicYear: year, name: batch, startsOn: date(calendarYear, firstMonth, 8),
        enrollmentStartsOn: shiftDays(date(calendarYear, firstMonth, 8), -20),
        enrollmentEndsOn: date(calendarYear, firstMonth + 1, 19) });
      OFFLINE_COURSES.forEach((course, courseIndex) => {
        for (let campus = 0; campus < 2; campus++) {
          const classId = 'class-' + year + '-' + batchIndex + '-' + courseIndex + '-' + campus;
          const month = firstMonth + (courseIndex % 3 === 2 ? 1 : 0);
          const openedOn = date(calendarYear, month, 8 + (campus + courseIndex % 4) * 2);
          const teacher = TEACHERS[courseIndex % TEACHERS.length];
          const count = Math.round((14 + (courseIndex * 5 + batchIndex * 3 + campus * 2) % 13) * (1 + (year - 2026) * .06));
          facts.classes.push({ id: classId, academicYear: year, batch, courseId: course.id,
            primaryTeacherId: teacher.id, openedOn, cancelled: false,
            enrollmentEndsOn: shiftDays(openedOn, 3), capacity: count + (courseIndex % 3 === 2 ? 0 : 6) });
          for (let index = 0; index < count; index++) {
            const orderId = classId + '-order-' + index;
            const learnerId = 'student-' + campus + '-' + (courseIndex * 31 + index);
            const paidOn = shiftDays(openedOn, -20 + index % 24);
            const refundOn = index % 17 === 0 ? shiftDays(paidOn, 35) : '';
            facts.orders.push({ id: orderId, kind: 'offline', classId, courseId: course.id,
              learnerId, paidOn, amountCents: course.priceCents });
            facts.enrollments.push({ id: orderId + '-enrollment', classId, learnerId, orderId,
              enrolledOn: paidOn, withdrawnOn: refundOn });
            if (refundOn) facts.refunds.push({ id: orderId + '-refund', orderId,
              completedOn: refundOn, amountCents: course.priceCents });
            else if (index % 13 === 0) facts.refunds.push({ id: orderId + '-refund', orderId,
              completedOn: shiftDays(paidOn, 12), amountCents: Math.round(course.priceCents * .15) });
          }
        }
      });
    });
  }
  const months = academicPeriod(startYear).months;
  months.forEach((month, monthIndex) => VIDEO_COURSES.forEach((course, courseIndex) => {
    const count = Math.round((28 + courseIndex * 6 + (monthIndex * 7) % 19) * (1 + (startYear - 2026) * .06));
    for (let index = 0; index < count; index++) {
      const orderId = 'video-' + month.key + '-' + courseIndex + '-' + index;
      const paidOn = date(month.year, month.month, index % 26 + 1);
      facts.orders.push({ id: orderId, kind: 'video', courseId: course.id,
        learnerId: 'account-' + (monthIndex * 60 + courseIndex * 10 + index), paidOn,
        amountCents: course.priceCents });
      if (index % 23 === 0) facts.refunds.push({ id: orderId + '-refund', orderId,
        completedOn: shiftDays(paidOn, 6), amountCents: course.priceCents });
      else if (index % 19 === 0) facts.refunds.push({ id: orderId + '-refund', orderId,
        completedOn: shiftDays(paidOn, 4), amountCents: Math.round(course.priceCents * .2) });
    }
  }));
  facts.orders.filter(row => row.kind === 'offline').forEach((order, index) => {
    if (index % 3 === 0) return;
    const source = ['小程序咨询', '线下活动', '学员推荐', '电话咨询', '公众号', ''][index % 6];
    facts.leads.push({ id: 'lead-' + order.id, source, createdOn: shiftDays(order.paidOn, -4),
      convertedOn: shiftDays(order.paidOn, 1), orderId: order.id });
    if (index % 2 === 0) facts.leads.push({ id: 'unconverted-' + order.id,
      source, createdOn: shiftDays(order.paidOn, -4) });
  });
  return facts;
}

export function compareAcademicYears(facts, startYear, now = new Date()) {
  const current = aggregateDashboard(facts, startYear, now);
  const cutoff = current.period.cutoffDate;
  const previousYear = Number(cutoff.slice(0, 4)) - 1;
  const month = Number(cutoff.slice(5, 7));
  const day = Math.min(Number(cutoff.slice(8, 10)), new Date(Date.UTC(previousYear, month, 0)).getUTCDate());
  const previousCutoff = previousYear + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  const previous = aggregateDashboard(facts, startYear - 1, new Date(previousCutoff + 'T23:59:59+08:00'));
  const metrics = [
    { key: 'openedClasses', name: '开班数', unit: '班' },
    { key: 'enrolled', name: '报名人次', unit: '人次' },
    { key: 'offlineNetCents', name: '净收/万元', unit: '万元' }
  ].map(metric => ({ ...metric, current: current.totals[metric.key], previous: previous.totals[metric.key],
    growth: previous.totals[metric.key] > 0
      ? (current.totals[metric.key] - previous.totals[metric.key]) / previous.totals[metric.key] : null }));
  const batchComparisons = BATCHES.map(name => {
    const batch = facts.batches.find(row => row.academicYear === startYear && row.name === name);
    const prior = facts.batches.find(row => row.academicYear === startYear - 1 && row.name === name);
    const ready = batch?.enrollmentStartsOn && batch?.enrollmentEndsOn;
    const future = ready && cutoff < batch.enrollmentStartsOn;
    const complete = ready && cutoff >= batch.enrollmentEndsOn;
    const days = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000);
    const priorDate = prior?.enrollmentStartsOn ? new Date(Date.parse(prior.enrollmentStartsOn + 'T00:00:00Z') + days(cutoff, batch?.enrollmentStartsOn || cutoff) * 86400000).toISOString().slice(0, 10) : null;
    const priorCutoff = complete ? previousCutoff : priorDate;
    const snapshot = (year, date) => {
      const rows = facts.classes.filter(row => row.academicYear === year && row.batch === name && !row.cancelled);
      const ids = new Set(rows.map(row => row.id));
      const at = aggregateDashboard(facts, year, new Date(date + 'T23:59:59+08:00'));
      const orders = uniqueBy(facts.orders, 'id').filter(row => row.kind === 'offline' && ids.has(row.classId) && row.paidOn && datePart(row.paidOn) <= date);
      const orderIds = new Set(orders.map(row => row.id));
      const refunds = uniqueBy(facts.refunds, 'id').filter(row => orderIds.has(row.orderId) && row.completedOn && datePart(row.completedOn) <= date);
      return { classes: at.batches.find(row => row.name === name).classes,
        enrolled: at.batches.find(row => row.name === name).enrolled,
        netCents: sum(orders, 'amountCents') - sum(refunds, 'amountCents') };
    };
    return { name, status: !ready ? '日期缺失' : future ? '未开始' : complete ? '完整' : '同期',
      current: ready && !future ? snapshot(startYear, cutoff) : null,
      previous: ready && !future && prior?.enrollmentEndsOn && priorCutoff ? snapshot(startYear - 1, priorCutoff) : null,
      cutoff, previousCutoff: priorCutoff };
  });
  return { current, previous, metrics, batchComparisons };
}

export function aggregateDashboard(facts, startYear, now = new Date()) {
  const period = academicPeriod(startYear, now);
  const inPeriod = value => {
    const date = datePart(value);
    return date >= period.startDate && date <= period.cutoffDate;
  };
  const occurred = value => Boolean(value) && datePart(value) <= period.cutoffDate;
  const orders = uniqueBy(facts.orders, 'id');
  const orderById = new Map(orders.map(row => [row.id, row]));
  const leads = uniqueBy(facts.leads || [], 'id').filter(row => inPeriod(row.createdOn));
  // CRM conversion records describe the completed binding event, not current enrollment volume.
  const converted = leads.filter(row => {
    const order = orderById.get(row.orderId);
    return occurred(row.convertedOn) && datePart(row.convertedOn) >= datePart(row.createdOn)
      && order?.kind === 'offline' && order.amountCents > 0 && occurred(order.paidOn)
      && datePart(order.paidOn) <= datePart(row.convertedOn);
  });
  const admissionsConversion = { leads: leads.length, converted: converted.length,
    rate: leads.length ? converted.length / leads.length : null };
  const convertedIds = new Set(converted.map(row => row.id));
  const sourceGroups = new Map();
  leads.forEach(row => {
    const source = String(row.source || '').trim() || '未记录';
    if (!sourceGroups.has(source)) sourceGroups.set(source, { id: source, name: source, leads: 0, converted: 0 });
    const group = sourceGroups.get(source);
    group.leads++;
    if (convertedIds.has(row.id)) group.converted++;
  });
  const sourceRanking = [...sourceGroups.values()].map(row => ({ ...row, rate: row.converted / row.leads }))
    .sort((a, b) => b.converted - a.converted || b.leads - a.leads || a.id.localeCompare(b.id, 'zh-CN')).slice(0, 5);
  const refunds = uniqueBy(facts.refunds, 'id').filter(row => occurred(row.completedOn));
  const refunded = new Map();
  refunds.forEach(row => refunded.set(row.orderId, (refunded.get(row.orderId) || 0) + row.amountCents));
  const hasPaidBalance = order => order && occurred(order.paidOn) && order.amountCents > (refunded.get(order.id) || 0);
  const courses = new Map(facts.courses.map(row => [row.id, row]));
  const teachers = new Map(facts.teachers.map(row => [row.id, row]));
  const classes = uniqueBy(facts.classes, 'id').filter(row => row.academicYear === startYear && !row.cancelled);
  const classById = new Map(classes.map(row => [row.id, row]));
  const opened = classes.filter(row => occurred(row.openedOn));
  const validEnrollments = facts.enrollments.filter(row => {
    const order = orderById.get(row.orderId);
    return !row.cancelled && classById.has(row.classId) && occurred(row.enrolledOn) && !occurred(row.withdrawnOn)
      && order?.kind === 'offline' && order.classId === row.classId && order.learnerId === row.learnerId && hasPaidBalance(order);
  });
  const enrollments = [...new Map(validEnrollments.map(row => [JSON.stringify([row.learnerId, row.classId]), row])).values()];
  const enrollmentMonthly = period.months.map(month => ({ ...month,
    enrolled: enrollments.filter(row => inPeriod(row.enrolledOn) && datePart(row.enrolledOn).slice(0, 7) === month.key).length }));
  const endedAdmissions = classes.filter(row => occurred(row.enrollmentEndsOn));
  const enrolledByClass = new Map();
  enrollments.forEach(row => enrolledByClass.set(row.classId, (enrolledByClass.get(row.classId) || 0) + 1));
  const admissionsEnrolled = endedAdmissions.reduce((total, row) => total + (enrolledByClass.get(row.id) || 0), 0);
  // 缺失名额不能缩小分母或误报为零；所有指标仍使用同一招生结束班级集合。
  const completeCapacity = endedAdmissions.length > 0 && endedAdmissions.every(row => Number.isSafeInteger(row.capacity) && row.capacity > 0);
  const admissionsCapacity = completeCapacity ? sum(endedAdmissions, 'capacity') : null;
  const admissionsEfficiency = {
    eligibleClasses: endedAdmissions.length, enrolled: admissionsEnrolled, capacity: admissionsCapacity,
    utilization: completeCapacity ? admissionsEnrolled / admissionsCapacity : null,
    averageEnrolled: endedAdmissions.length ? admissionsEnrolled / endedAdmissions.length : null,
    fullClasses: completeCapacity ? endedAdmissions.filter(row => (enrolledByClass.get(row.id) || 0) >= row.capacity).length : null
  };
  const saturation = completeCapacity ? [0, 0, 0] : null;
  if (saturation) endedAdmissions.forEach(row => {
    const rate = (enrolledByClass.get(row.id) || 0) / row.capacity;
    saturation[rate < 0.5 ? 0 : rate < 0.8 ? 1 : 2] += 1;
  });
  admissionsEfficiency.saturation = saturation;
  const paidVideo = orders.filter(row => row.kind === 'video' && inPeriod(row.paidOn));
  const validVideo = paidVideo.filter(hasPaidBalance);

  // 收款和退款按各自发生日期入月；不能用班级所属学年倒推现金发生日期。
  const receipts = orders.filter(row => inPeriod(row.paidOn)).map(row => ({
    date: datePart(row.paidOn), kind: row.kind, courseId: row.courseId, grossCents: row.amountCents, refundCents: 0
  }));
  refunds.filter(row => inPeriod(row.completedOn)).forEach(row => {
    const order = orderById.get(row.orderId);
    if (order) receipts.push({ date: datePart(row.completedOn), kind: order.kind, courseId: order.courseId,
      grossCents: 0, refundCents: row.amountCents });
  });
  const monthly = period.months.map(month => ({ ...month, offlineCents: 0, videoCents: 0 }));
  const monthByKey = new Map(monthly.map(row => [row.key, row]));
  const courseNet = new Map();
  receipts.forEach(row => {
    const net = row.grossCents - row.refundCents;
    const month = monthByKey.get(row.date.slice(0, 7));
    if (month && (row.kind === 'offline' || row.kind === 'video')) month[row.kind + 'Cents'] += net;
    courseNet.set(row.courseId, (courseNet.get(row.courseId) || 0) + net);
  });

  const batches = BATCHES.map(name => {
    const batch = facts.batches.find(row => row.academicYear === startYear && row.name === name);
    const selected = enrollments.filter(row => classById.get(row.classId).batch === name);
    const classCount = opened.filter(row => row.batch === name).length;
    return { name, calendarYear: startYear + (name === '秋季' ? 0 : 1), classes: classCount, enrolled: selected.length,
      future: Boolean(batch?.startsOn && !occurred(batch.startsOn) && !selected.length && !classCount) };
  });
  const ranking = (keyOfClass, nameOf, classRows = classes) => {
    const groups = new Map();
    classRows.forEach(row => {
      const key = keyOfClass(row);
      if (!groups.has(key)) groups.set(key, { id: key, name: nameOf(key), enrolled: 0, classes: 0 });
      if (occurred(row.openedOn)) groups.get(key).classes++;
    });
    enrollments.forEach(row => {
      const group = groups.get(keyOfClass(classById.get(row.classId)));
      if (group) group.enrolled++;
    });
    return [...groups.values()].filter(row => row.enrolled > 0)
      .sort((a, b) => b.enrolled - a.enrolled || b.classes - a.classes || String(a.id).localeCompare(String(b.id), 'zh-CN')).slice(0, 10);
  };
  const videoRanking = [...new Set(validVideo.map(row => row.courseId))].map(id => ({
    id, name: courses.get(id)?.name || '未关联课程', orders: validVideo.filter(row => row.courseId === id).length,
    netCents: courseNet.get(id) || 0
  })).sort((a, b) => b.orders - a.orders || b.netCents - a.netCents || a.id.localeCompare(b.id)).slice(0, 10);
  const offlineNetCents = sum(monthly, 'offlineCents');
  const videoNetCents = sum(monthly, 'videoCents');
  return { period, monthly, batches, admissionsEfficiency, admissionsConversion, sourceRanking, enrollmentMonthly,
    totals: { netCents: offlineNetCents + videoNetCents, offlineNetCents, videoNetCents,
      grossCents: sum(receipts, 'grossCents'), refundCents: sum(receipts, 'refundCents'),
      openedClasses: opened.length, enrolled: enrollments.length,
      students: new Set(enrollments.map(row => row.learnerId)).size,
      videoOrders: validVideo.length, refundedVideoOrders: paidVideo.length - validVideo.length },
    rankings: {
      majors: ranking(row => courses.get(row.courseId)?.major || '未关联专业', id => id),
      courses: ranking(row => row.courseId, id => courses.get(id)?.name || '未关联课程'),
      teachers: ranking(row => row.primaryTeacherId, id => teachers.get(id)?.name || '未关联教师'),
      videos: videoRanking
    }
  };
}
