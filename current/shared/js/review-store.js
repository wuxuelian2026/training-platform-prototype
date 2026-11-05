(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 班级评价共享演示存储（CR-2026-163；补充描述字段 CR-2026-165）。
// 评价由学员端产生，后台评价管理只读；两端通过 demo-store 的 localStorage 交换数据，
// 页面级 sessionStorage 不承载评价记录。评价为一次性动作，无状态流转，不登记状态机。
const { readDemoState, writeDemoState } = __classicRequire("shared/js/demo-store.js");
const { DEMO_NOW, DEMO_TODAY } = __classicRequire("shared/js/demo-clock.js");

// 教师评价五维度：键名与维度名冻结，CR-2026-163 §2.1 第 3 条。
const REVIEW_DIMENSIONS = [
  { key: 'classroomFit', label: '课堂体验适配度' },
  { key: 'growthClarity', label: '成长感知清晰度' },
  { key: 'homeCommunication', label: '家校沟通顺畅度' },
  { key: 'stability', label: '教学稳定性与责任心' },
  { key: 'outcome', label: '实际教学成果' }
];

// CR-2026-165：补充描述上限与归一化（按 Unicode 码点计，含空格与换行；emoji 计 1 字）。
// 学员端计数/截断与提交兜底三处共用本函数，保证「所见即所存」；后台只读不改写。
const MAX_SUPPLEMENT_LENGTH = 200;
function normalizeSupplementText(value) {
  return Array.from(String(value ?? '')).slice(0, MAX_SUPPLEMENT_LENGTH).join('').trim();
}

// 演示 seed：两条不同班级评价（学员端提交后追加，不清空 seed）。
// CR-2026-165：分别覆盖「有补充描述（含换行）」与「补充描述为空」两种展示态；文案为虚构演示数据。
const REVIEW_SEEDS = [
  {
    id: 'REV20260910001',
    classId: 'class-mock-ended-teaching-01',
    className: '秋季少儿声乐启蒙1班',
    courseName: '少儿声乐启蒙',
    teacher: '林悦',
    studentName: '林知夏',
    courseRating: 5,
    teacherRatings: { classroomFit: 5, growthClarity: 4, homeCommunication: 5, stability: 4, outcome: 4 },
    supplementText: '孩子回家会主动哼课上教的旋律，老师每节课的反馈也很具体。\n希望节奏练习能再多一点。',
    createdAt: '2026-09-10 16:40'
  },
  {
    id: 'REV20260911002',
    classId: 'class-mock-ready-01',
    className: '少儿中国舞基础1班',
    courseName: '少儿中国舞基础',
    teacher: '王玥',
    studentName: '周予安',
    courseRating: 4,
    teacherRatings: { classroomFit: 4, growthClarity: 4, homeCommunication: 5, stability: 5, outcome: 4 },
    supplementText: '',
    createdAt: '2026-09-11 10:20'
  }
];

function normalizeRatings(input) {
  const source = input || {};
  const result = {};
  REVIEW_DIMENSIONS.forEach(({ key }) => {
    const value = Number(source[key]);
    result[key] = Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0;
  });
  return result;
}

function storedReviews() {
  const rows = readDemoState().classReviews;
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
}

// 合并 seed 与已提交记录（按 id 去重，学员端新提交覆盖同 id）。
// CR-2026-165：统一补齐 supplementText，历史缺字段或超长数据都在这里归一化为合法值。
function listClassReviews() {
  const decorate = (row) => ({ ...row, teacherRatings: normalizeRatings(row.teacherRatings), supplementText: normalizeSupplementText(row.supplementText) });
  const byId = new Map(REVIEW_SEEDS.map((row) => [row.id, decorate(row)]));
  storedReviews().forEach((row) => byId.set(row.id, decorate(row)));
  return [...byId.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

// 判重键：班级 + 评价人（与结业、考勤的学员标识口径一致，按姓名匹配）。
function getClassReview(classId, studentName) {
  return listClassReviews().find((row) => row.classId === classId && row.studentName === studentName) || null;
}

// 教师评价均分 = 五维度星级之和 ÷ 5，四舍五入保留 1 位小数。
function teacherAverage(teacherRatings) {
  const values = REVIEW_DIMENSIONS.map(({ key }) => Number(teacherRatings?.[key]) || 0);
  if (values.some((value) => !value)) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function starText(value) {
  const score = Math.round(Number(value) || 0);
  return '★★★★★'.slice(0, score) + '☆☆☆☆☆'.slice(0, Math.max(0, 5 - score));
}

// 提交评价：6 项星级全部必评（1–5 整数），补充描述选填且 ≤ 200 字；同班级同评价人幂等拦截。
// 返回 { ok, review?, reason? }。
function submitClassReview(payload = {}) {
  const classId = String(payload.classId || '');
  const studentName = String(payload.studentName || '').trim();
  if (!classId || !studentName) return { ok: false, reason: '缺少班级或评价人，无法提交评价。' };
  if (getClassReview(classId, studentName)) return { ok: false, reason: '该学员已评价过本班级，不能重复提交。' };
  const courseRating = Number(payload.courseRating);
  const teacherRatings = normalizeRatings(payload.teacherRatings);
  if (!(Number.isInteger(courseRating) && courseRating >= 1 && courseRating <= 5)) return { ok: false, reason: '请先完成课程评价（1–5 星）。' };
  if (REVIEW_DIMENSIONS.some(({ key }) => !(teacherRatings[key] >= 1))) return { ok: false, reason: '教师评价五个维度需全部评分后才能提交。' };
  const review = {
    // 演示时钟 DEMO_NOW 是字符串（如 "2026-09-12 10:00"）；编号 = REV + 演示日期 + 3 位随机，与 seed 风格一致。
    id: `REV${String(DEMO_TODAY).replace(/-/g, '')}${String(Math.floor(Math.random() * 900) + 100)}`,
    classId,
    className: String(payload.className || ''),
    courseName: String(payload.courseName || ''),
    teacher: String(payload.teacher || ''),
    studentName,
    courseRating,
    teacherRatings,
    supplementText: normalizeSupplementText(payload.supplementText),
    createdAt: DEMO_NOW
  };
  writeDemoState((next) => {
    const rows = Array.isArray(next.classReviews) ? next.classReviews : [];
    next.classReviews = [...rows, review];
  });
  return { ok: true, review };
}

  __classicExports["REVIEW_DIMENSIONS"] = REVIEW_DIMENSIONS;
  __classicExports["MAX_SUPPLEMENT_LENGTH"] = MAX_SUPPLEMENT_LENGTH;
  __classicExports["normalizeSupplementText"] = normalizeSupplementText;
  __classicExports["listClassReviews"] = listClassReviews;
  __classicExports["getClassReview"] = getClassReview;
  __classicExports["teacherAverage"] = teacherAverage;
  __classicExports["starText"] = starText;
  __classicExports["submitClassReview"] = submitClassReview;
  __classicModules["shared/js/review-store.js"] = __classicExports;
})(globalThis);
