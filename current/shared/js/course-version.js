// CR-2026-025：课程档案版本号与历史版本（唯一事实源）。
//
// 规则（变更单 §3）：
//   1. 课程档案自建档起为 v1；
//   2. 已被在售商品或已展示班级引用的课程，修改承诺类字段（含编排结构）时生成 v(n+1)；
//   3. 未被引用的课程直接更新当前版本，不产生新版本；
//   4. 历史版本整体快照只读，字段值、编排结构摘要、操作人与时间均可查；
//   5. 版本号在同一课程内单调递增，不因下架、归档或重命名重置；
//      历史版本不做字段级差异对比，也不提供版本回退。
import { demoTime, readDemoState, upsertDemoRecord } from './demo-store.js';
import { courseArchiveSeed } from './course-display.js';
import { toCanonicalCourseId } from './course-seed.js';
import { classSeed } from './class-seed.js';
import { allProducts } from './product-seed.js';

// 承诺类字段：变更这些字段才会触发版本升级（编排结构单列，后以结构签名比较）。
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

// 课程档案：种子基线 + 存储覆盖，供版本号、引用数量与历史版本统一读取。
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

export const courseVersionOf = (record) => Number(record?.version) || Number(record?.versions?.[record.versions.length - 1]?.version) || 1;

export const versionForCourseId = (courseId) => {
  const record = courseRecordFor(courseId);
  return record ? courseVersionOf(record) : 1;
};

// 编排结构签名与摘要：章节与课时的组成同等参与承诺类变更判定。
export function courseStructure(chapters) {
  const list = Array.isArray(chapters) ? chapters : [];
  const lessons = list.reduce((sum, chapter) => sum + ((chapter.lessons || []).length), 0);
  return {
    key: JSON.stringify(list.map((chapter) => [chapter.name, (chapter.lessons || []).map((lesson) => [
      lesson.name, lesson.target, Number(lesson.duration) || 0, lesson.kind, [...(lesson.resources || [])].sort()
    ])])),
    summary: list.length ? `${list.length} 个章节 · ${lessons} 个课时` : '暂无章节'
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
    structure: shape.summary
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
