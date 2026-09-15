// 课程展示信息（课程级存储）。
//
// CR-2026-012 把六个展示字段按性质分流：
//   - 教学属性：难度等级、适合年龄 —— 教师申报时维护；
//   - 运营素材：课程封面、图文详情、课程标签、C 端推荐语 —— 发布视频商品 / 发布面授班级时维护。
// 六个字段统一落在课程档案（课程库记录）里，不写入班级记录或商品记录，学员端与后台都从这里取数。
//
// 课程档案的种子与访问入口集中在本模块：course-center.js（课程库）、sales-crm.js（发布表单）
// 与 learner.js（学员端展示）共用，避免各自维护一份。
import { readDemoState, upsertDemoRecord } from './demo-store.js';
import { toCanonicalCourseId } from './course-seed.js';

// 课程档案基线：完整课程与轻量课程共用一套字段，轻量课程的运营字段为选填。
const COURSE_ARCHIVE_SEED = [
  { id: 'LIB-001', sourceCourseId: 'COURSE-002', name: '声乐演唱技巧', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 12, status: '已完成', cover: '已配置', coverFile: '声乐演唱技巧-封面.png', difficulty: '中级', ages: ['青少年', '成人'], detail: '围绕气息、共鸣、咬字与作品处理，建立完整演唱方法。', tags: ['声乐', '发声'], recommendation: '跟着示范练习，建立稳定发声习惯。' },
  { id: 'LIB-006', sourceCourseId: 'COURSE-006', name: '艺术歌曲示范课', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 8, status: '已完成', cover: '已配置', coverFile: '艺术歌曲示范课-封面.png', difficulty: '中级', ages: ['成人'], detail: '通过经典艺术歌曲示范，学习作品分析、咬字和情感表达。', tags: ['艺术歌曲', '示范'], recommendation: '先听懂作品，再练习表达。' },
  { id: 'LIB-002', sourceCourseId: 'COURSE-001', name: '舞蹈基本功', archive: '完整课程', type: '面授课程', major: '中国舞', teacher: '王玥', hours: 16, status: '已完成', cover: '已配置', coverFile: '舞蹈基本功-封面.png', difficulty: '初级', ages: ['少儿'], detail: '从身体控制、节奏训练到基本舞姿，建立少儿中国舞的基础训练体系。', tags: ['中国舞', '基础'], recommendation: '从每一次站立开始建立身体控制。' },
  { id: 'LIB-003', sourceCourseId: 'LIB-003', name: '少儿美术兴趣班', archive: '轻量课程档案', type: '面授课程', major: '少儿绘画', teacher: '李青', hours: 20, status: '不适用', cover: '未配置', coverFile: '', difficulty: '启蒙', ages: ['少儿'], detail: '以主题创作和材料体验激发少儿绘画兴趣。', tags: ['美术', '少儿'], recommendation: '让孩子在创作中发现自己的表达方式。' },
  { id: 'LIB-004', sourceCourseId: 'LIB-004', name: '朗诵与主持基础', archive: '轻量课程档案', type: '面授课程', major: '朗诵与主持', teacher: '赵可', hours: 16, status: '不适用', cover: '未配置', coverFile: '', difficulty: '初级', ages: ['青少年'], detail: '训练普通话、气息和舞台表达，适合青少年入门。', tags: ['戏剧', '表达'], recommendation: '用声音和表情讲好每一个故事。' },
  { id: 'LIB-005', sourceCourseId: 'LIB-005', name: '古筝入门体验课', archive: '轻量课程档案', type: '面授课程', major: '古筝', teacher: '周宁', hours: 8, status: '不适用', cover: '未配置', coverFile: '', difficulty: '启蒙', ages: ['少儿', '成人'], detail: '通过基础指法和短曲体验，帮助学员认识古筝。', tags: ['古筝', '体验'], recommendation: '一节课认识古筝，也认识音乐的乐趣。' }
];

export const COURSE_DISPLAY_UNSET = '未配置';

// 档案种子按 I1-DEC-19 的课程主键归一，避免后台与学员端读到退役编号。
export function courseArchiveSeed() {
  return COURSE_ARCHIVE_SEED.map((record) => ({ ...record, sourceCourseId: toCanonicalCourseId(record.sourceCourseId), ages: [...record.ages], tags: [...record.tags] }));
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
    cover: COURSE_DISPLAY_UNSET,
    coverFile: '',
    difficulty: '',
    ages: [],
    detail: '',
    tags: [],
    recommendation: ''
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

// 运营四项是否已配置：课程封面配置后，二次发布默认只读带入。
export function courseDisplayConfigured(archive) {
  return Boolean(archive && archive.cover && archive.cover !== COURSE_DISPLAY_UNSET);
}

export function courseDisplayTags(archive) {
  const tags = archive?.tags;
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags || '').split(/[，,、\s]+/).filter(Boolean);
}

export function courseAgesText(archive) {
  const ages = archive?.ages;
  if (Array.isArray(ages)) return ages.filter(Boolean).join('、');
  return String(ages || '');
}

// 写入课程档案：只维护展示信息，不触碰价格、试看与上下架等售卖字段。
export function persistCourseDisplay(course, patch) {
  const current = courseArchiveFor(course) || courseArchiveDefaults(typeof course === 'string' ? { id: course } : course);
  const record = { ...current, ...patch, sourceCourseId: toCanonicalCourseId(current.sourceCourseId) };
  if (record.coverFile) record.cover = '已配置';
  if (!Array.isArray(record.tags)) record.tags = courseDisplayTags(record);
  if (!Array.isArray(record.ages)) record.ages = String(record.ages || '').split(/[，,、\s]+/).filter(Boolean);
  upsertDemoRecord('library', record);
  return record;
}

// 发布环节只读带入的申报教学属性。
export function courseTeachingSummary(course) {
  const archive = courseArchiveFor(course);
  return { difficulty: archive?.difficulty || '', ages: courseAgesText(archive) };
}
