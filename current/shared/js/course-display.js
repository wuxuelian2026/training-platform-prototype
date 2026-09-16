// 课程展示信息（CR-2026-020：运营素��下沉到售卖单元）。
//
// 教学属性（难度等级、适合年龄）仍由课程档案承载，教师在申报时维护、后台编排可改、发布时只读带入；
// 运营四字段（课程封面、图文详情、课程标签、C 端推荐语）改为各自维护在
// 视频商品记录与面授班级记录上：同一门面授课程的多个班级互不影响，商品与班级互不影响。
//
// 本模块是课程档案与售卖单元展示素材的统一读写入口，供 course-center.js（课程库）、
// sales-crm.js（发布表单）与 learner.js（学员端展示）共用。
import { readDemoState, upsertDemoRecord } from './demo-store.js';
import { toCanonicalCourseId } from './course-seed.js';

// 课程档案基线：只保留档案字段与教学属性，不含运营四字段。
const COURSE_ARCHIVE_SEED = [
  { id: 'LIB-001', sourceCourseId: 'COURSE-002', name: '声乐演唱技巧', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 12, status: '已完成', difficulty: '中级', ages: ['青少年', '成人'] },
  { id: 'LIB-006', sourceCourseId: 'COURSE-006', name: '艺术歌曲示范课', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 8, status: '已完成', difficulty: '中级', ages: ['成人'] },
  { id: 'LIB-002', sourceCourseId: 'COURSE-001', name: '舞蹈基本功', archive: '完整课程', type: '面授课程', major: '中国舞', teacher: '王玥', hours: 16, status: '已完成', difficulty: '初级', ages: ['少儿'] },
  { id: 'LIB-003', sourceCourseId: 'LIB-003', name: '少儿美术兴趣班', archive: '轻量课程档案', type: '面授课程', major: '少儿绘画', teacher: '李青', hours: 20, difficulty: '启蒙', ages: ['少儿'], detail: '以主题创作和材料体验激发少儿绘画兴趣。' },
  { id: 'LIB-004', sourceCourseId: 'LIB-004', name: '朗诵与主持基础', archive: '轻量课程档案', type: '面授课程', major: '朗诵与主持', teacher: '赵可', hours: 16, difficulty: '初级', ages: ['青少年'], detail: '训练普通话、气息和舞台表达，适合青少年入门。' },
  { id: 'LIB-005', sourceCourseId: 'LIB-005', name: '古筝入门体验课', archive: '轻量课程档案', type: '面授课程', major: '古筝', teacher: '周宁', hours: 8, difficulty: '启蒙', ages: ['少儿', '成人'], detail: '通过基础指法和短曲体验，帮助学员认识古筝。' }
];

export const COURSE_DISPLAY_UNSET = '未配置';
// 运营四字段：只写在售卖单元（商品或班级）记录上，不写课程档案。
export const SALE_UNIT_DISPLAY_KEYS = ['cover', 'coverFile', 'detail', 'tags', 'recommendation'];

// 档案种子按 I1-DEC-19 的课程主键归一，避免后台与学员端读到退役编号。
export function courseArchiveSeed() {
  return COURSE_ARCHIVE_SEED.map((record) => ({ ...record, sourceCourseId: toCanonicalCourseId(record.sourceCourseId), ages: [...record.ages] }));
}

export function courseArchiveDefaults(course = {}) {
  return {
    id: `LIB-${course.id || Date.now()}`,
    sourceCourseId: toCanonicalCourseId(course.id),
    archive: '完整课程',
    name: course.name || '',
    type: course.type || '',
    major: course.major || course.professional || '',
    teacher: course.teacher || '',
    hours: Number(course.hours) || 0,
    status: course.status || '已完成',
    difficulty: '',
    ages: [],
    detail: ''
  };
}

// 课程档案读取：存储记录覆盖种子基线，存储里没有的课程按传入的课程对象新建默认档案。
export function courseArchiveFor(course) {
  const courseId = toCanonicalCourseId(typeof course === 'string' ? course : course?.id);
  if (!courseId) return null;
  const shared = readDemoState();
  const stored = (shared.library || []).filter((record) => record && typeof record === 'object');
  const baseline = courseArchiveSeed().find((record) => record.sourceCourseId === courseId);
  const override = [...stored].reverse().find((record) => toCanonicalCourseId(record.sourceCourseId) === courseId);
  if (baseline && override) return { ...baseline, ...override };
  if (override) return { ...courseArchiveDefaults(typeof course === 'string' ? { id: courseId } : course), ...override };
  if (baseline) return baseline;
  return null;
}

// 运营四项是否已配置：售卖单元的课程封面配置后，二次发布默认只读带入。
export function courseDisplayConfigured(unit) {
  return Boolean(unit && unit.cover && unit.cover !== COURSE_DISPLAY_UNSET);
}

export function courseDisplayTags(unit) {
  const tags = unit?.tags;
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags || '').split(/[，,、\s]+/).filter(Boolean);
}

export function courseAgesText(record) {
  const ages = record?.ages;
  if (Array.isArray(ages)) return ages.filter(Boolean).join('、');
  return String(ages || '');
}

// 写入课程档案的教学属性：只维护难度等级与适合年龄，不触碰运营素材与售卖字段。
export function persistCourseTeaching(course, patch) {
  const current = courseArchiveFor(course) || courseArchiveDefaults(typeof course === 'string' ? { id: course } : course);
  const record = { ...current, ...patch, sourceCourseId: toCanonicalCourseId(current.sourceCourseId) };
  if (!Array.isArray(record.ages)) record.ages = String(record.ages || '').split(/[，,、\s]+/).filter(Boolean);
  upsertDemoRecord('library', record);
  return record;
}

// —— 售卖单元（商品 / 班级）展示素材的读写 ——

// 按课程取在售商品记录：视频课程的对外展示素材来自它自己的商品。
export function productForCourse(courseId) {
  const canonical = toCanonicalCourseId(typeof courseId === 'string' ? courseId : courseId?.id);
  if (!canonical) return null;
  const products = (readDemoState().products || []).filter((row) => row && typeof row === 'object');
  return [...products].reverse().find((row) => toCanonicalCourseId(row.courseId) === canonical) || null;
}

// 按班级 ID 取班级记录：面授班级的对外展示素材来自它自己的班级记录。
export function classRecordFor(classId) {
  if (!classId) return null;
  const classes = (readDemoState().classes || []).filter((row) => row && typeof row === 'object');
  return classes.find((row) => row.id === classId) || null;
}

// 归一化售卖单元的展示素材：未配置时给出空态，标签统一为数组。
export function saleUnitDisplay(unit) {
  return {
    cover: unit?.cover || COURSE_DISPLAY_UNSET,
    coverFile: unit?.coverFile || '',
    detail: unit?.displayDetail || unit?.detail || '',
    tags: courseDisplayTags(unit),
    recommendation: unit?.recommendation || unit?.recommend || ''
  };
}

// 写入售卖单元的展示素材：商品写 products，班级写 classes。
export function persistSaleUnitDisplay(collection, record) {
  const patch = { ...record };
  if (patch.coverFile) patch.cover = '已配置';
  if (!patch.cover) patch.cover = COURSE_DISPLAY_UNSET;
  if (!Array.isArray(patch.tags)) patch.tags = courseDisplayTags(patch);
  upsertDemoRecord(collection, patch);
  return patch;
}

// 发布环节只读带入的申报教学属性。
export function courseTeachingSummary(course) {
  const archive = courseArchiveFor(course);
  return { difficulty: archive?.difficulty || '', ages: courseAgesText(archive) };
}
