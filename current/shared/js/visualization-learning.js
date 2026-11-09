import { academicPeriod } from './visualization-data.js';

// 学情分析演示事实（CR-2026-168）。
//
// 与经营大屏共用同一份经营事实（classes / enrollments / orders / refunds / courses / teachers），
// 因此「课程分析」「流失预警」与经营口径天然可 join；考勤、作业、家长评价按 班级#课次#学员 稳定散列
// 派生，同一组合每次结果一致，不随刷新跳变——与 lesson-records.js 的派生约定一致。
// 待考勤记录、作业提交记录、班级评价记录落库后，把 createLearningFacts 的取数换成真实记录即可，
// 聚合口径与页面均无需改动。
export const LESSON_TOTAL = 8;

// 流失原因与 demo-store.js DICTIONARY_FALLBACK.churn_reason 同源（10 项）；
// check-visualization.mjs 断言两处一致，避免字典漂移。
export const CHURN_REASONS = ['上课时间冲突', '接送与距离不便', '兴趣转移', '课程难度不匹配', '教师或班级不适应',
  '教学效果未达预期', '家庭经济原因', '身体健康原因', '迁居外地', '其他'];

// 教师评价五维度键名与维度名与 review-store.js REVIEW_DIMENSIONS 一致；同上由回归脚本断言。
export const REVIEW_DIMENSIONS = [
  { key: 'classroomFit', label: '课堂体验适配度' },
  { key: 'growthClarity', label: '成长感知清晰度' },
  { key: 'homeCommunication', label: '家校沟通顺畅度' },
  { key: 'stability', label: '教学稳定性与责任心' },
  { key: 'outcome', label: '实际教学成果' }
];

// 演示姓名池只用于展示，页面一律脱敏为「姓氏 + **」输出。
const LEARNER_NAMES = ['林知夏', '周予安', '陈一诺', '赵明月', '许星辰', '刘思源', '孙艺涵', '黄可欣', '郑雨桐', '吴清越',
  '何安然', '高语彤', '罗子墨', '彭佳宁', '蒋依然', '宋嘉禾', '唐若溪', '邓舒雅', '谢景行', '曹心悦',
  '马嘉禾', '范书宁', '柳青禾', '秦舒言', '方雨眠', '邹清和', '谭若初', '龚悦然', '程知微', '严思齐',
  '傅可岚', '钟亦辰', '崔婉清', '潘星野', '戴南乔', '毛雨桐', '石一鸣', '覃知远', '武安歌', '钱亦舒',
  '施南星', '卫清让', '沈念安', '韩雪松', '朱景明', '尤佳音', '简知白', '关山月', '苗清和', '路雨萱',
  '柏亦柔', '池晚舟', '阮清歌', '陆星阑', '殷若薇', '宁清许', '郝云归', '侯雨晴', '奚明远', '班清瑶'];

const NEGATIVE_TEXTS = [
  '孩子最近两个月进步不太明显，希望老师能多给一点针对性的练习建议。',
  '上课时间经常和学校的活动撞，接送也确实远，考虑先停一段时间。',
  '课堂内容偏快，孩子回家说跟不上，希望基础动作能再细讲一次。',
  '和老师沟通不太及时，问作业情况要等很久才回复。',
  '孩子说课堂氛围有点紧张，最近几次都不太愿意去上课。',
  '同班同学水平差距比较大，老师顾不过来，孩子有点失去兴趣。'
];
const POSITIVE_TEXTS = [
  '老师每节课后都会反馈孩子的课堂表现，能看出用心。',
  '孩子回家会主动练习，节奏感比以前好了很多。',
  '班里的学习氛围不错，孩子和同学相处也很好。',
  '课程安排循序渐进，家长能清楚看到每个阶段的成长。'
];

const datePart = value => String(value || '').slice(0, 10);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function hashSeed(text) {
  let hash = 2166136261;
  for (const ch of String(text)) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
const roll = seed => hashSeed(seed) % 100;
const percent = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : null);
function shiftDays(date, days) {
  const value = new Date(datePart(date) + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const maskName = name => (name ? String(name).slice(0, 1) + '**' : '学员');
const learnerNameOf = learnerId => LEARNER_NAMES[hashSeed(String(learnerId)) % LEARNER_NAMES.length];
// 加权流失原因：上课时间冲突／兴趣转移／接送不便占多数，其余按序均摊。
const CHURN_WEIGHTS = [0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 7, 8, 9, 9, 1, 4];

/**
 * 在经营事实之上派生学情事实：课次、考勤、作业、家长评价、流失。
 * 只保留发生在统计截止日之前的事实，未来课次与未结课班级不铺底。
 */
export function createLearningFacts(facts, startYear, now = new Date()) {
  const period = academicPeriod(startYear, now);
  const cutoff = period.cutoffDate;
  const occurred = value => Boolean(value) && datePart(value) <= cutoff;

  const classes = new Map(facts.classes
    .filter(row => row.academicYear === startYear && !row.cancelled && occurred(row.openedOn))
    .map(row => [row.id, row]));
  const courses = new Map(facts.courses.map(row => [row.id, row]));
  const teachers = new Map(facts.teachers.map(row => [row.id, row]));
  const orders = new Map(facts.orders.map(row => [row.id, row]));

  const refunded = new Map();
  [...new Map(facts.refunds.map(row => [row.id, row])).values()]
    .filter(row => occurred(row.completedOn))
    .forEach(row => refunded.set(row.orderId, (refunded.get(row.orderId) || 0) + row.amountCents));
  const hasPaidBalance = order => order && occurred(order.paidOn) && order.amountCents > (refunded.get(order.id) || 0);

  const sessions = [];
  const sessionsOf = new Map();
  classes.forEach(row => {
    const rows = [];
    for (let index = 1; index <= LESSON_TOTAL; index++) {
      const date = shiftDays(row.openedOn, (index - 1) * 7);
      if (date > cutoff) break;
      const session = { id: row.id + '#' + index, classId: row.id, index, date, month: date.slice(0, 7) };
      sessions.push(session);
      rows.push(session);
    }
    sessionsOf.set(row.id, rows);
  });

  // 班级展示名：经营事实只有批次／课程／校区，展示名由三者拼装，与班级库命名风格一致。
  const classNameOf = classRow => {
    const courseName = courses.get(classRow.courseId)?.name || '未关联课程';
    const campus = String(classRow.id).split('-').pop();
    return classRow.batch + courseName + (campus === '0' ? 'A班' : campus === '1' ? 'B班' : campus + '班');
  };

  const enrollments = [];
  [...new Map(facts.enrollments.map(row => [row.classId + '#' + row.learnerId, row])).values()].forEach(row => {
    const classRow = classes.get(row.classId);
    const order = orders.get(row.orderId);
    if (!classRow || !occurred(row.enrolledOn)) return;
    if (!order || order.kind !== 'offline' || order.classId !== row.classId || order.learnerId !== row.learnerId) return;
    // 学情口径与经营口径的差异点：已退班（可能已全额退款）仍要保留，否则流失面板恒为空；
    // 未退班的报名才要求「实付大于已退款」。
    const withdrawnOn = occurred(row.withdrawnOn) ? datePart(row.withdrawnOn) : '';
    if (!withdrawnOn && !hasPaidBalance(order)) return;
    if (withdrawnOn && !occurred(order.paidOn)) return;
    enrollments.push({
      classId: row.classId, className: classNameOf(classRow), learnerId: row.learnerId,
      enrolledOn: datePart(row.enrolledOn), withdrawnOn,
      teacherId: classRow.primaryTeacherId, courseId: classRow.courseId
    });
  });

  const attendance = [];
  const homework = [];
  enrollments.forEach(enrollment => {
    // 参与度偏置：同一学员在不同班级保持一致的投入水平，使「需关注」与「流失」名单稳定可解释。
    const engagement = roll(enrollment.learnerId + '#engagement');
    const attendanceCut = engagement < 12 ? 55 : engagement < 30 ? 74 : 84;
    const homeworkCut = engagement < 12 ? 45 : engagement < 30 ? 64 : 82;
    (sessionsOf.get(enrollment.classId) || []).forEach(session => {
      if (session.date < enrollment.enrolledOn) return;
      const seed = enrollment.classId + '#' + session.index + '#' + enrollment.learnerId;
      const value = roll(seed);
      const status = value < attendanceCut ? '已到' : value < attendanceCut + 10 ? '迟到'
        : value < attendanceCut + 14 ? '请假' : '缺勤';
      const base = { classId: enrollment.classId, learnerId: enrollment.learnerId, courseId: enrollment.courseId,
        teacherId: enrollment.teacherId, month: session.month, withdrawn: Boolean(enrollment.withdrawnOn) };
      attendance.push({ ...base, index: session.index, status, counted: status === '已到' || status === '迟到' });
      const submitted = roll(seed + '#homework') < homeworkCut;
      homework.push({ ...base, index: session.index, submitted, graded: submitted && roll(seed + '#grade') < 70 });
    });
  });

  // 家长评价：结课班级开放，每学员每班最多 1 条；参评率约六成，低分必带文本（对齐 review-store 口径）。
  const reviews = [];
  enrollments.filter(row => !row.withdrawnOn).forEach(enrollment => {
    const classRow = classes.get(enrollment.classId);
    const endsOn = shiftDays(classRow.openedOn, LESSON_TOTAL * 7);
    if (endsOn > cutoff) return;
    if (roll(enrollment.classId + '#' + enrollment.learnerId + '#review') >= 62) return;
    const quality = Math.round((roll(enrollment.classId + '#quality') + roll(enrollment.learnerId + '#quality')) / 2);
    const base = quality >= 60 ? 5 : quality >= 25 ? 4 : 3;
    const jitter = roll(enrollment.classId + '#' + enrollment.learnerId + '#jitter');
    const courseRating = clamp(base + (jitter < 12 ? -1 : jitter > 90 ? 1 : 0), 1, 5);
    const weakKey = REVIEW_DIMENSIONS[roll(enrollment.teacherId + '#weak') % REVIEW_DIMENSIONS.length].key;
    const teacherRatings = {};
    REVIEW_DIMENSIONS.forEach(({ key }) => {
      const offset = (roll(enrollment.classId + '#' + enrollment.learnerId + '#' + key) % 3) - 1;
      teacherRatings[key] = clamp(courseRating + offset - (key === weakKey ? 1 : 0), 1, 5);
    });
    const all = [courseRating, ...Object.values(teacherRatings)];
    const lowest = Math.min(...all);
    const textSeed = roll(enrollment.classId + '#' + enrollment.learnerId + '#text');
    // 文本跟着「最低分项」走：任一维度 ≤3 星时给负面原声，避免出现「四星好评 + 二分短板」的错位文案。
    const text = lowest <= 3 ? NEGATIVE_TEXTS[textSeed % NEGATIVE_TEXTS.length]
      : textSeed < 35 ? POSITIVE_TEXTS[textSeed % POSITIVE_TEXTS.length] : '';
    const courseName = courses.get(enrollment.courseId)?.name || '未关联课程';
    reviews.push({ classId: enrollment.classId, learnerId: enrollment.learnerId, teacherId: enrollment.teacherId,
      courseId: enrollment.courseId, courseRating, teacherRatings, text, lowest, className: enrollment.className,
      courseName, teacher: teachers.get(enrollment.teacherId)?.name || '未关联教师',
      studentName: maskName(learnerNameOf(enrollment.learnerId)), createdAt: endsOn });
  });

  const churns = enrollments.filter(row => row.withdrawnOn).map(row => ({
    ...row,
    reason: CHURN_REASONS[CHURN_WEIGHTS[roll(row.classId + '#' + row.learnerId + '#churn') % CHURN_WEIGHTS.length]]
  }));

  return { period, classes, courses, teachers, sessions, enrollments, attendance, homework, reviews, churns };
}

const scoreOf = rows => ({ present: rows.filter(row => row.counted).length, expected: rows.length,
  rate: percent(rows.filter(row => row.counted).length, rows.length) });

/** 按学情事实聚合大屏各面板；口径见页面说明。 */
export function aggregateLearning(learning) {
  const { period, classes, courses, teachers, sessions, enrollments, attendance, homework, reviews, churns } = learning;
  const active = enrollments.filter(row => !row.withdrawnOn);
  const activeAttendance = attendance.filter(row => !row.withdrawn);
  const activeHomework = homework.filter(row => !row.withdrawn);
  const attendanceScore = scoreOf(activeAttendance);
  const homeworkScore = scoreOf(activeHomework.map(row => ({ counted: row.submitted })));
  const progress = percent(sessions.length, classes.size * LESSON_TOTAL);

  // 学员级聚合：以「学员 × 班级 × 课次」为分母，同一学员跨班分别计。
  const studentRows = new Map();
  const studentOf = (learnerId, classId) => {
    const key = learnerId + '#' + classId;
    if (!studentRows.has(key)) studentRows.set(key, { learnerId, classId, present: 0, expected: 0,
      submitted: 0, homeworkExpected: 0, lessons: 0 });
    return studentRows.get(key);
  };
  const attendanceIndex = new Map();
  attendance.forEach(row => attendanceIndex.set(row.classId + '#' + row.learnerId + '#' + row.index, row));
  const homeworkIndex = new Map();
  homework.forEach(row => homeworkIndex.set(row.classId + '#' + row.learnerId + '#' + row.index, row));
  enrollments.forEach(row => {
    const item = studentOf(row.learnerId, row.classId);
    (learning.sessions.filter(session => session.classId === row.classId && session.date >= row.enrolledOn)).forEach(session => {
      const attendanceRecord = attendanceIndex.get(row.classId + '#' + row.learnerId + '#' + session.index);
      if (attendanceRecord) {
        item.expected++;
        item.lessons++;
        if (attendanceRecord.counted) item.present++;
      }
      const homeworkRecord = homeworkIndex.get(row.classId + '#' + row.learnerId + '#' + session.index);
      if (homeworkRecord) {
        item.homeworkExpected++;
        if (homeworkRecord.submitted) item.submitted++;
      }
    });
  });

  const students = [...studentRows.values()].map(row => {
    const attendanceRate = percent(row.present, row.expected) ?? 0;
    const homeworkRate = percent(row.submitted, row.homeworkExpected) ?? 0;
    const progressRate = percent(row.present, LESSON_TOTAL) ?? 0;
    const score = Math.round((attendanceRate * 0.55 + homeworkRate * 0.3 + progressRate * 0.15) * 10) / 10;
    return { ...row, attendanceRate, homeworkRate, progressRate, score };
  });

  const studentClassName = new Map(enrollments.map(row => [row.learnerId + '#' + row.classId, row.className]));
  const watchlist = students.filter(row => row.score < 70).sort((a, b) => a.score - b.score).slice(0, 10).map(row => {
    const className = studentClassName.get(row.learnerId + '#' + row.classId) || '—';
    const reason = row.attendanceRate < 70 && row.homeworkRate < 60 ? '出勤与作业双低'
      : row.attendanceRate < 70 ? '出勤偏低' : row.homeworkRate < 60 ? '作业未交' : '进度落后';
    return { name: maskName(learnerNameOf(row.learnerId)), className,
      attendanceRate: row.attendanceRate, homeworkRate: row.homeworkRate, score: row.score, reason };
  });

  // 课程分析：复用同一批考勤／作业事实，按课程分组，不另起口径。
  const courseGroups = new Map();
  enrollments.forEach(row => {
    if (!courseGroups.has(row.courseId)) courseGroups.set(row.courseId, { learners: new Set(), classes: new Set() });
    courseGroups.get(row.courseId).learners.add(row.learnerId);
    courseGroups.get(row.courseId).classes.add(row.classId);
  });
  const courseRows = [...courseGroups.entries()].map(([id, group]) => {
    const rows = attendance.filter(row => row.courseId === id);
    const homeworkRows = homework.filter(row => row.courseId === id);
    const lessons = sessions.filter(row => group.classes.has(row.classId)).length;
    return { id, name: courses.get(id)?.name || '未关联课程', major: courses.get(id)?.major || '—',
      students: group.learners.size, attendanceRate: percent(rows.filter(row => row.counted).length, rows.length),
      homeworkRate: percent(homeworkRows.filter(row => row.submitted).length, homeworkRows.length),
      progressRate: percent(lessons, group.classes.size * LESSON_TOTAL) };
  }).sort((a, b) => b.students - a.students || a.id.localeCompare(b.id)).slice(0, 10);

  // 教学质量：出勤、作业、家长评分加权综合分；短板维度取该教师评价均分最低的一项。
  const teacherRows = [...teachers.values()].map(teacher => {
    const classIds = new Set([...classes.values()].filter(row => row.primaryTeacherId === teacher.id).map(row => row.id));
    if (!classIds.size) return null;
    const rows = attendance.filter(row => classIds.has(row.classId));
    const homeworkRows = homework.filter(row => classIds.has(row.classId));
    const own = reviews.filter(row => row.teacherId === teacher.id);
    const rating = own.length
      ? Math.round((own.reduce((sum, row) => sum + Object.values(row.teacherRatings).reduce((a, b) => a + b, 0) / 5, 0) / own.length) * 10) / 10
      : null;
    const attendanceRate = percent(rows.filter(row => row.counted).length, rows.length);
    const homeworkRate = percent(homeworkRows.filter(row => row.submitted).length, homeworkRows.length);
    const weak = own.length ? REVIEW_DIMENSIONS.map(({ key, label }) => ({
      label, value: own.reduce((sum, row) => sum + row.teacherRatings[key], 0) / own.length
    })).sort((a, b) => a.value - b.value)[0].label : '—';
    return { id: teacher.id, name: teacher.name,
      students: new Set(enrollments.filter(row => classIds.has(row.classId)).map(row => row.learnerId)).size,
      attendanceRate, homeworkRate, rating, weak,
      score: Math.round((attendanceRate * 0.3 + homeworkRate * 0.3 + (rating ?? 0) / 5 * 100 * 0.4) * 10) / 10 };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 10);

  // 家长评价：参评率分母 = 统计期内已结课班级的在册学员（未结课班级不开放评价）。
  const endedEnrollments = active.filter(row => {
    const classRow = classes.get(row.classId);
    return classRow && shiftDays(classRow.openedOn, LESSON_TOTAL * 7) <= period.cutoffDate;
  }).length;
  const dimensions = REVIEW_DIMENSIONS.map(({ key, label }) => {
    const values = reviews.map(row => row.teacherRatings[key]).filter(value => value > 0);
    return { key, label, value: values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null };
  });

  return {
    period, capacity: active.length, progress,
    totals: {
      students: new Set(active.map(row => row.learnerId)).size, enrollments: active.length, classes: classes.size,
      attendanceRate: attendanceScore.rate, attendancePresent: attendanceScore.present, attendanceExpected: attendanceScore.expected,
      homeworkRate: homeworkScore.rate, homeworkSubmitted: homeworkScore.present, homeworkExpected: homeworkScore.expected,
      progressRate: progress,
      reviewCount: reviews.length, reviewBase: endedEnrollments, participation: percent(reviews.length, endedEnrollments),
      textRate: percent(reviews.filter(row => row.text).length, reviews.length),
      courseRating: reviews.length ? Math.round((reviews.reduce((sum, row) => sum + row.courseRating, 0) / reviews.length) * 10) / 10 : null,
      teacherRating: reviews.length ? Math.round((reviews.reduce((sum, row) =>
        sum + Object.values(row.teacherRatings).reduce((a, b) => a + b, 0) / 5, 0) / reviews.length) * 10) / 10 : null,
      churnCount: churns.length, churnBase: enrollments.length, churnRate: percent(churns.length, enrollments.length),
      warning: students.filter(row => row.score < 70).length
    },
    watchlist, courses: courseRows, teachers: teacherRows,
    review: { dimensions, participation: percent(reviews.length, endedEnrollments),
      textRate: percent(reviews.filter(row => row.text).length, reviews.length),
      courseRating: reviews.length ? Math.round((reviews.reduce((sum, row) => sum + row.courseRating, 0) / reviews.length) * 10) / 10 : null,
      teacherRating: reviews.length ? Math.round((reviews.reduce((sum, row) =>
        sum + Object.values(row.teacherRatings).reduce((a, b) => a + b, 0) / 5, 0) / reviews.length) * 10) / 10 : null,
      count: reviews.length, base: endedEnrollments,
      distribution: [5, 4, 3, 2, 1].map(stars => ({ stars, count: reviews.filter(row => row.courseRating === stars).length })),
      low: reviews.filter(row => row.text && row.lowest <= 3)
        .sort((a, b) => a.lowest - b.lowest || b.createdAt.localeCompare(a.createdAt)).slice(0, 10) },
    churn: { count: churns.length, base: enrollments.length, rate: percent(churns.length, enrollments.length),
      reasons: topReasons(churns), topCourses: topChurnCourses(enrollments, churns, courses) }
  };
}

function topReasons(churns) {
  const groups = new Map();
  churns.forEach(row => groups.set(row.reason, (groups.get(row.reason) || 0) + 1));
  // 字典本身含「其他」项，不再另造「其他原因合计」，避免同一件事出现两个「其他」。
  return [...groups.entries()].map(([name, count]) => ({ name, count, share: percent(count, churns.length) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')).slice(0, 10);
}

function topChurnCourses(enrollments, churns, courses) {
  const groups = new Map();
  enrollments.forEach(row => {
    if (!groups.has(row.courseId)) groups.set(row.courseId, { id: row.courseId, name: courses.get(row.courseId)?.name || '未关联课程', count: 0, base: 0 });
    groups.get(row.courseId).base++;
  });
  churns.forEach(row => { if (groups.has(row.courseId)) groups.get(row.courseId).count++; });
  return [...groups.values()].filter(row => row.count > 0).map(row => ({ ...row, rate: percent(row.count, row.base) }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).slice(0, 10);
}
