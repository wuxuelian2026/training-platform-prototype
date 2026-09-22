// 课程档案引用与兼容快照工具。
// CR-2026-081 起，MVP 不再向用户提供课程版本、同步与回退能力；旧版本字段只为兼容
// 已有演示数据和订单快照保留。课程能否编辑统一由 courseEditLock() 实时派生。
// 旧 records 中的 version/versions 字段只作为兼容数据读取，不再生成或展示新版本。
import { demoTime, readDemoState, upsertDemoRecord } from './demo-store.js';
import { courseArchiveSeed } from './course-display.js';
import { toCanonicalCourseId } from './course-seed.js';
import { classSeed } from './class-seed.js';
import { allProducts } from './product-seed.js';

// 旧版本快照字段仍保留给历史订单兼容读取，新 MVP 不再使用其变更判定。
export const COURSE_PROMISE_FIELDS = [
  ['name', '课程名称'],
  ['type', '课程类型'],
  ['major', '所属专业'],
  ['teacher', '申报教师'],
  ['hours', '总课时'],
  ['difficulty', '难度等级'],
  ['ages', '适合年龄'],
  ['structureKey', '编排结构']
];

export const COURSE_PROMISE_LABELS = COURSE_PROMISE_FIELDS.map(([, label]) => label).join('、');
export const COURSE_VERSION_FALLBACK_AT = '2026-09-08 10:00';

// 售卖单元始终引用课程主体编号，旧档案编号仅作兼容回退。
export const courseArchiveKey = (record) => toCanonicalCourseId(record?.sourceCourseId || record?.id);

export function mergedClasses() {
  const stored = (readDemoState().classes || []).filter((item) => item && typeof item === 'object');
  return [
    ...classSeed.map((seed) => ({ ...seed, ...(stored.find((item) => item.id === seed.id) || {}) })),
    ...stored.filter((item) => !classSeed.some((seed) => seed.id === item.id))
  ];
}

// 课程档案：种子基线 + 存储覆盖，供课程引用判断与旧数据兼容读取。
export function libraryRecords() {
  const stored = (readDemoState().library || []).filter((item) => item && typeof item === 'object');
  const merged = courseArchiveSeed().map((seed) => ({
    ...seed,
    ...(stored.find((item) => item.id === seed.id || (item.sourceCourseId && item.sourceCourseId === seed.sourceCourseId)) || {})
  }));
  stored.filter((item) => !merged.some((row) => row.id === item.id)).forEach((item) => merged.push({ ...item }));
  return merged;
}

export function courseRecordFor(courseId) {
  const key = toCanonicalCourseId(courseId);
  if (!key) return null;
  return libraryRecords().find((record) => courseArchiveKey(record) === key) || null;
}

// CR-2026-081：课程核心内容锁定规则。
// - 已上架商品仅在上架期间锁定；无订单时下架后可继续编辑；
// - 班级已生成/发布课表后永久锁定；
// - 任意订单（含待支付、已取消、已退款）永久锁定；
// - 草稿商品、尚未生成课次的班级不阻止编辑，但仍属于“已被引用”，不可物理删除。
export function courseEditLock(recordOrId) {
  const key = typeof recordOrId === 'string' ? toCanonicalCourseId(recordOrId) : courseArchiveKey(recordOrId);
  const shared = readDemoState();
  const products = allProducts(shared).filter((item) => toCanonicalCourseId(item.courseId) === key);
  const classes = mergedClasses().filter((item) => toCanonicalCourseId(item.courseId) === key);
  const productIds = new Set(products.map((item) => item.id));
  const classIds = new Set(classes.map((item) => item.id));
  const orders = (shared.orders || []).filter((item) => (
    toCanonicalCourseId(item.courseId) === key
    || productIds.has(item.productId)
    || classIds.has(item.classId)
  ));
  // 部分固定演示商品只保留累计销量，没有逐笔订单；销量大于 0 同样代表已有历史订单。
  const productsWithSales = products.filter((item) => Number(item.sales || 0) > 0);
  const listedProducts = products.filter((item) => item.status === '已上架');
  const scheduledClasses = classes.filter((item) => (
    (Array.isArray(item.sessions) && item.sessions.length > 0)
    || Number(item.scheduleVersion || 0) > 0
    || item.scheduleStatus === '已发布'
    || item.scheduleStatus === '已完成'
  ));
  const hasOrders = orders.length > 0 || productsWithSales.length > 0;
  const reasons = [
    hasOrders ? '已有订单（含历史订单）' : '',
    scheduledClasses.length ? '班级已生成或发布课表' : '',
    listedProducts.length ? '存在已上架视频商品' : ''
  ].filter(Boolean);
  const permanent = hasOrders || scheduledClasses.length > 0;
  return {
    key,
    locked: reasons.length > 0,
    permanent,
    reasons,
    listedProducts,
    scheduledClasses,
    orders,
    products,
    classes,
    referenced: products.length > 0 || classes.length > 0 || orders.length > 0,
    referenceCount: products.length + classes.length + orders.length,
    actionHint: permanent ? '请复制新建课程后调整内容' : listedProducts.length ? '请先下架关联商品后再编辑' : ''
  };
}

export const courseEditLockLabel = (usage) => usage?.locked
  ? `${usage.permanent ? '永久锁定' : '暂时锁定'}：${usage.reasons.join('、')}`
  : '可编辑';

export const courseVersionOf = (record) => Number(record?.version) || Number(record?.versions?.[record.versions.length - 1]?.version) || 1;

export const versionForCourseId = (courseId) => {
  const record = courseRecordFor(courseId);
  return record ? courseVersionOf(record) : 1;
};

// 编排结构签名与摘要：保留给旧快照读取，不再触发版本升级。
export function courseStructure(chapters) {
  const list = Array.isArray(chapters) ? chapters : [];
  const lessons = list.reduce((sum, chapter) => sum + ((chapter.lessons || []).length), 0);
  return {
    key: JSON.stringify(list.map((chapter) => [chapter.name, (chapter.lessons || []).map((lesson) => [
      lesson.name, lesson.target, Number(lesson.duration) || 0, lesson.kind, [...(lesson.resources || [])].sort()
    ])])),
    summary: list.length ? `${list.length} 个章节 · ${lessons} 个课时` : '暂无章节',
    // 版本快照需要可还原大纲，结构签名只用于变更判定，不能替代大纲明细。
    chapters: list.map((chapter) => ({
      ...chapter,
      lessons: (chapter.lessons || []).map((lesson) => ({ ...lesson, resources: [...(lesson.resources || [])] }))
    }))
  };
}

export function courseSnapshot(record, structure = null) {
  const shape = structure || { key: '', summary: '未编排' };
  return {
    name: record?.name || '',
    source: record?.source || '',
    type: record?.type || '',
    major: record?.major || '',
    teacher: record?.teacher || '',
    hours: Number(record?.hours) || 0,
    difficulty: record?.difficulty || '',
    ages: [...(record?.ages || [])],
    structureKey: shape.key,
    structure: shape.summary,
    outline: (shape.chapters || record?.chapters || []).map((chapter) => ({
      ...chapter,
      lessons: (chapter.lessons || []).map((lesson) => ({ ...lesson, resources: [...(lesson.resources || [])] }))
    }))
  };
}

export const changedPromiseFields = (before, after) => COURSE_PROMISE_FIELDS
  .filter(([key]) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null))
  .map(([, label]) => label);

// 保证版本轨存在并同步当前版本号；不刷新快照，避免覆盖历史条目。
export function ensureVersionTrack(record) {
  if (!record) return [];
  if (!Array.isArray(record.versions) || !record.versions.length) {
    const version = Number(record.version) || 1;
    record.version = version;
    record.versions = [{
      version,
      at: record.updatedAt || COURSE_VERSION_FALLBACK_AT,
      operator: '教研管理员',
      changes: ['建档'],
      snapshot: courseSnapshot(record, null)
    }];
  }
  const current = record.versions[record.versions.length - 1];
  record.version = Number(record.version) || Number(current.version) || 1;
  current.version = record.version;
  return record.versions;
}

// 读取路径专用：当前版本的快照始终等于档案现值，历史条目保持冻结。
export function refreshCurrentSnapshot(record, structure = null) {
  const entries = ensureVersionTrack(record);
  const current = entries[entries.length - 1];
  current.snapshot = courseSnapshot(record, structure);
  current.version = record.version;
  return current;
}

export function commitCourseVersion(record, { changed = [], structure = null, operator = '教研管理员', references = null } = {}) {
  ensureVersionTrack(record);
  const refs = references || courseReferences(record);
  const labels = [...new Set(changed)];
  if (!labels.length) return { bumped: false, version: record.version, changes: [], references: refs };
  if (refs.count > 0) {
    const next = Number(record.version) + 1;
    record.version = next;
    record.versions.push({ version: next, at: demoTime(), operator, changes: labels, snapshot: courseSnapshot(record, structure) });
    upsertDemoRecord('library', record);
    return { bumped: true, version: next, previous: next - 1, changes: labels, references: refs };
  }
  const current = record.versions[record.versions.length - 1];
  current.changes = [...new Set([...(current.changes || []), ...labels])];
  current.at = demoTime();
  current.operator = operator;
  current.snapshot = courseSnapshot(record, structure);
  upsertDemoRecord('library', record);
  return { bumped: false, version: record.version, changes: labels, references: refs };
}

// 引用统计：在售商品（已上架）与已展示班级；未发布的班级不计入承诺类版本升级。
export function courseReferences(record) {
  const key = courseArchiveKey(record);
  const shared = readDemoState();
  const products = allProducts(shared).filter((item) => toCanonicalCourseId(item.courseId) === key && item.status === '已上架');
  const classes = mergedClasses().filter((item) => toCanonicalCourseId(item.courseId) === key && item.scheduleStatus === '已发布');
  return {
    key,
    products,
    classes,
    count: products.length + classes.length,
    parts: [
      products.length ? `${products.length} 个在售商品` : '',
      classes.length ? `${classes.length} 个已展示班级` : ''
    ].filter(Boolean)
  };
}

export const referenceLabel = (references) => (references?.parts?.length ? references.parts.join(' · ') : '未被售卖单元引用');
