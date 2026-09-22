// 课程展示信息（CR-2026-020：运营素材下沉到售卖单元）。
//
// 教学属性（难度等级、适合年龄）仍由课程档案承载，教师在申报时维护、后台编排可改、发布时只读带入；
// 运营四字段（课程封面、图文详情、课程标签、C 端推荐语）改为各自维护在
// 视频商品记录与面授班级记录上：同一门面授课程的多个班级互不影响，商品与班级互不影响。
//
// 本模块是课程档案与售卖单元展示素材的统一读写入口，供 course-center.js（课程库）、
// sales-crm.js（发布表单）与 learner.js（学员端展示）共用。
import { readDemoState, upsertDemoRecord } from './demo-store.js';
import { courseMockSeed, toCanonicalCourseId } from './course-seed.js';

// 版本条目：CR-2026-025 要求历史版本整体快照可查（字段值、编排结构摘要、操作人与时间）。
const archiveVersion = (version, at, operator, changes, snapshot) => ({ version, at, operator, changes, snapshot });

// CR-2026-055：课程库中已完成课程必须有可查看的章节与课时数据；课程大纲同时写入当前档案和历史版本快照。
const COURSE_OUTLINES = {
  '声乐演唱技巧': [
    { name: '第一章：演唱基础', desc: '建立气息、发声与共鸣的基础方法。', lessons: [{ name: '气息支持', target: '理解并完成腹式呼吸练习', duration: 36, kind: '理论', description: '建立气息支撑的基本概念。', resources: ['res-001'] }, { name: '共鸣位置', target: '找到自然共鸣位置', duration: 42, kind: '示范', description: '通过示范建立共鸣感受。', resources: ['res-003'] }] },
    { name: '第二章：作品处理', desc: '将咬字、吐字与表达方法应用到作品中。', lessons: [{ name: '咬字与吐字', target: '完成作品咬字练习', duration: 40, kind: '练习', description: '围绕歌词完成清晰咬字。', resources: ['res-004'] }] }
  ],
  '少儿国画入门': [
    { name: '第一章：笔墨基础', desc: '认识毛笔、宣纸与基本用色，完成点线练习。', lessons: [{ name: '握笔与运笔', target: '掌握中锋运笔与基本点线', duration: 45, kind: '示范', description: '认识毛笔、墨色和宣纸特性。', resources: [] }, { name: '墨色层次', target: '调出浓淡五色并完成练习', duration: 45, kind: '练习', description: '通过调墨认识浓淡干湿变化。', resources: [] }] },
    { name: '第二章：花鸟入门', desc: '完成一幅简单的花鸟小品。', lessons: [{ name: '花朵结构', target: '完成一朵花的勾染练习', duration: 50, kind: '示范', description: '拆解花瓣结构与勾染步骤。', resources: [] }, { name: '枝叶穿插', target: '完成枝叶穿插与画面呼应', duration: 50, kind: '练习', description: '练习枝干走向与叶片的疏密关系。', resources: [] }, { name: '小品创作', target: '独立完成一幅花鸟小品', duration: 60, kind: '创作', description: '综合运用笔墨完成小幅创作。', resources: [] }] }
  ],
  '艺术歌曲示范课': [
    { name: '第一章：作品理解', desc: '认识作品结构、风格与演唱要求。', lessons: [{ name: '作品分析', target: '说出作品的结构与情绪变化', duration: 45, kind: '理论', description: '结合示范分析作品段落与表达重点。', resources: [] }, { name: '示范演唱', target: '完成作品重点段落跟唱', duration: 45, kind: '示范', description: '通过分句示范建立演唱处理方法。', resources: [] }] }
  ],
  '舞蹈基本功': [
    { name: '第一章：身体基础', desc: '建立站姿、脚位与身体控制能力。', lessons: [{ name: '站姿与脚位', target: '掌握基本站姿与一位脚', duration: 45, kind: '示范', description: '完成站姿、脚位和重心练习。', resources: ['res-002'] }, { name: '身体协调训练', target: '完成基础协调组合', duration: 45, kind: '练习', description: '通过组合练习建立身体协调性。', resources: [] }] },
    { name: '第二章：节奏训练', desc: '训练节拍感、动作连接和组合表达。', lessons: [{ name: '节奏模仿', target: '能跟随八拍节奏完成动作', duration: 45, kind: '练习', description: '完成节奏模仿和动作连接。', resources: [] }] }
  ],
  '少儿美术兴趣班': [
    { name: '第一章：色彩与线条', desc: '认识基础色彩与线条表现方法。', lessons: [{ name: '认识三原色', target: '能够区分并调配三原色', duration: 45, kind: '示范', description: '通过调色练习认识色彩关系。', resources: [] }, { name: '线条的节奏', target: '使用不同线条表现节奏变化', duration: 45, kind: '练习', description: '完成直线、曲线和组合线条练习。', resources: [] }] },
    { name: '第二章：形体与观察', desc: '从观察对象到组织画面。', lessons: [{ name: '形体观察', target: '概括对象的基本形体', duration: 45, kind: '示范', description: '练习从整体到局部的观察方法。', resources: [] }, { name: '简单构图', target: '完成一幅主题构图', duration: 45, kind: '综合', description: '将观察结果组织成完整画面。', resources: [] }] },
    { name: '第三章：主题创作', desc: '综合运用色彩、线条和构图完成作品。', lessons: [{ name: '我的主题画', target: '独立完成一幅主题作品', duration: 45, kind: '创作', description: '围绕主题完成构思、绘制与分享。', resources: [] }] }
  ],
  '朗诵与主持基础': [
    { name: '第一章：发声与气息', desc: '建立清晰、稳定的语言表达基础。', lessons: [{ name: '气息控制', target: '完成朗诵中的换气练习', duration: 45, kind: '练习', description: '通过呼吸和停连练习提升表达稳定性。', resources: [] }, { name: '咬字训练', target: '清晰完成常用音节发音', duration: 45, kind: '示范', description: '练习声母、韵母和字词的准确发音。', resources: [] }] },
    { name: '第二章：朗诵表达', desc: '掌握停连、重音与情绪表达。', lessons: [{ name: '节奏与重音', target: '根据文本完成重音处理', duration: 45, kind: '练习', description: '通过短篇文本练习节奏、停顿和重音。', resources: [] }, { name: '片段朗诵', target: '完整朗诵一段指定文本', duration: 45, kind: '综合', description: '综合运用发声和表达技巧完成朗诵。', resources: [] }] },
    { name: '第三章：主持入门', desc: '练习主持开场、串联与现场表达。', lessons: [{ name: '主持开场', target: '完成一段自然的主持开场', duration: 45, kind: '示范', description: '练习站姿、眼神、开场和串联表达。', resources: [] }] }
  ],
  '古筝入门体验课': [
    { name: '第一章：认识古筝', desc: '了解古筝结构、坐姿和基本演奏要求。', lessons: [{ name: '古筝结构与坐姿', target: '正确完成坐姿和手型准备', duration: 45, kind: '示范', description: '认识琴码、琴弦并建立规范坐姿。', resources: [] }, { name: '基本指法', target: '完成勾、托、抹基础指法', duration: 45, kind: '练习', description: '通过慢速练习熟悉基础指法。', resources: [] }] },
    { name: '第二章：入门乐曲', desc: '将基本指法应用到简单旋律中。', lessons: [{ name: '旋律练习', target: '完整演奏一段入门旋律', duration: 45, kind: '综合', description: '结合节拍和指法完成入门乐曲练习。', resources: [] }] }
  ]
};

export const VIDEO_DEMO_COURSES = [
  { id: 'COURSE-VIDEO-DEMO-001', name: '童声合唱入门', major: '童声合唱', teacher: '陈晨', hours: 8, difficulty: '初级', ages: ['少儿'], price: '498.00', outline: [{ name: '第一章：歌唱准备', desc: '建立呼吸、发声与节拍基础。', lessons: [{ name: '呼吸与站姿', target: '完成基础呼吸练习', duration: 32, kind: '示范', description: '认识合唱站姿和呼吸方法。', resources: ['res-001'] }, { name: '节拍模唱', target: '跟随节拍完成短句模唱', duration: 35, kind: '练习', description: '通过节拍练习建立合唱感。', resources: [] }] }, { name: '第二章：声部配合', desc: '学习简单声部进入与配合。', lessons: [{ name: '旋律线条', target: '完成一段旋律演唱', duration: 40, kind: '综合', description: '练习旋律连贯和音准控制。', resources: [] }] }] },
  { id: 'COURSE-VIDEO-DEMO-002', name: '钢琴即兴伴奏基础', major: '钢琴', teacher: '林月', hours: 10, difficulty: '中级', ages: ['青少年', '成人'], price: '880.00', outline: [{ name: '第一章：和弦基础', desc: '掌握常用和弦连接。', lessons: [{ name: '三和弦构成', target: '识别并弹奏常用三和弦', duration: 45, kind: '理论', description: '讲解三和弦结构和键盘位置。', resources: [] }, { name: '和弦连接', target: '完成基础和弦连接练习', duration: 48, kind: '示范', description: '通过示范掌握平稳连接。', resources: [] }] }, { name: '第二章：伴奏织体', desc: '将和弦应用到伴奏中。', lessons: [{ name: '分解和弦伴奏', target: '完成一段分解和弦伴奏', duration: 50, kind: '练习', description: '练习常用分解和弦型。', resources: [] }] }] },
  { id: 'COURSE-VIDEO-DEMO-003', name: '少儿水彩画入门', major: '少儿绘画', teacher: '李青', hours: 6, difficulty: '启蒙', ages: ['少儿'], price: '368.00', outline: [{ name: '第一章：色彩体验', desc: '认识水彩工具和基础色彩。', lessons: [{ name: '工具与用水', target: '正确使用水彩工具', duration: 30, kind: '示范', description: '认识画笔、颜料和用水方法。', resources: [] }, { name: '三原色练习', target: '完成三原色调色练习', duration: 35, kind: '练习', description: '通过调色认识色彩变化。', resources: [] }] }, { name: '第二章：主题创作', desc: '综合运用色彩完成主题画。', lessons: [{ name: '我的小花园', target: '完成一幅水彩主题画', duration: 55, kind: '创作', description: '从构图到上色完成小幅创作。', resources: [] }] }] },
  { id: 'COURSE-VIDEO-DEMO-004', name: '朗诵表达进阶', major: '朗诵与主持', teacher: '邓琪', hours: 8, difficulty: '高级', ages: ['青少年', '成人'], price: '598.00', outline: [{ name: '第一章：文本分析', desc: '掌握停连、重音与情绪分析。', lessons: [{ name: '停连与重音', target: '完成文本标注', duration: 42, kind: '理论', description: '分析文本节奏和重音位置。', resources: [] }, { name: '情绪推进', target: '完成一段情绪递进朗诵', duration: 46, kind: '示范', description: '通过示范理解情绪层次。', resources: [] }] }, { name: '第二章：完整表达', desc: '完成作品的整体表达。', lessons: [{ name: '作品朗诵', target: '独立完成指定作品朗诵', duration: 52, kind: '综合', description: '综合运用发声、节奏和情绪表达。', resources: [] }] }] },
  { id: 'COURSE-VIDEO-DEMO-005', name: '古筝经典小曲演奏', major: '古筝', teacher: '周宁', hours: 9, difficulty: '中级', ages: ['青少年', '成人'], price: '768.00', outline: [{ name: '第一章：演奏准备', desc: '巩固指法和节拍基础。', lessons: [{ name: '指法组合', target: '完成勾托抹基础组合', duration: 40, kind: '练习', description: '巩固常用指法的连续转换。', resources: [] }, { name: '节拍控制', target: '保持稳定节拍演奏', duration: 44, kind: '示范', description: '练习节拍器配合和速度控制。', resources: [] }] }, { name: '第二章：乐曲演奏', desc: '完成经典小曲的分段与连贯演奏。', lessons: [{ name: '分段练习', target: '完成乐曲重点段落', duration: 48, kind: '练习', description: '按乐句拆解并完成重点练习。', resources: [] }] }] }
];

// 课程档案基线：只保留档案字段、教学属性与版本轨，不含运营四字段。
const COURSE_ARCHIVE_SEED = [
  {
    id: 'LIB-001', sourceCourseId: 'COURSE-002', source: '教师申报', name: '声乐演唱技巧', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 12, status: '已完成', difficulty: '中级', ages: ['青少年', '成人'], updatedAt: '2026-08-26 17:20',
    chapters: COURSE_OUTLINES['声乐演唱技巧'],
    version: 2,
    versions: [
      archiveVersion(1, '2026-08-18 09:30', '教研管理员', ['建档'], { name: '声乐演唱技巧', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 10, difficulty: '初级', ages: ['成人'], structureKey: '', structure: '未编排', outline: [] }),
      archiveVersion(2, '2026-08-26 17:20', '教研管理员', ['总课时', '难度等级'], { name: '声乐演唱技巧', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 12, difficulty: '中级', ages: ['青少年', '成人'], structureKey: '', structure: '2 个章节 · 3 个课时', outline: COURSE_OUTLINES['声乐演唱技巧'] })
    ]
  },
  {
    id: 'LIB-006', sourceCourseId: 'COURSE-006', source: '教师申报', name: '艺术歌曲示范课', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 8, status: '已完成', difficulty: '中级', ages: ['成人'], updatedAt: '2026-08-15 09:00',
    chapters: COURSE_OUTLINES['艺术歌曲示范课'],
    version: 1,
    versions: [archiveVersion(1, '2026-08-15 09:00', '教研管理员', ['建档', '编排结构'], { name: '艺术歌曲示范课', archive: '完整课程', type: '视频课程', major: '声乐演唱', teacher: '陈晨', hours: 8, difficulty: '中级', ages: ['成人'], structureKey: '', structure: '1 个章节 · 2 个课时', outline: COURSE_OUTLINES['艺术歌曲示范课'] })]
  },
  {
    id: 'LIB-002', sourceCourseId: 'COURSE-001', source: '教师申报', name: '舞蹈基本功', archive: '完整课程', type: '面授课程', major: '中国舞', teacher: '王玥', hours: 16, status: '已完成', difficulty: '初级', ages: ['少儿'], updatedAt: '2026-09-02 14:40',
    chapters: COURSE_OUTLINES['舞蹈基本功'],
    version: 2,
    versions: [
      archiveVersion(1, '2026-08-20 10:15', '教研管理员', ['建档'], { name: '舞蹈基本功', archive: '完整课程', type: '面授课程', major: '中国舞', teacher: '王玥', hours: 12, difficulty: '启蒙', ages: ['少儿'], structureKey: '', structure: '1 个章节 · 2 个课时', outline: COURSE_OUTLINES['舞蹈基本功'].slice(0, 1) }),
      archiveVersion(2, '2026-09-02 14:40', '教研管理员', ['总课时', '编排结构'], { name: '舞蹈基本功', archive: '完整课程', type: '面授课程', major: '中国舞', teacher: '王玥', hours: 16, difficulty: '初级', ages: ['少儿'], structureKey: '', structure: '2 个章节 · 3 个课时', outline: COURSE_OUTLINES['舞蹈基本功'] })
    ]
  },
  {
    id: 'LIB-007', sourceCourseId: 'COURSE-CR-2026-0003', source: '教师申报', name: '少儿国画入门', archive: '完整课程', type: '面授课程', major: '中国画', teacher: '李青', hours: 20, status: '已完成', difficulty: '启蒙', ages: ['少儿'], updatedAt: '2026-09-05 10:20',
    chapters: COURSE_OUTLINES['少儿国画入门'],
    versions: [archiveVersion(1, '2026-09-05 10:20', '教研管理员', ['建档', '编排结构'], { name: '少儿国画入门', archive: '完整课程', type: '面授课程', major: '中国画', teacher: '李青', hours: 20, difficulty: '启蒙', ages: ['少儿'], structureKey: '', structure: '2 个章节 · 5 个课时', outline: COURSE_OUTLINES['少儿国画入门'] })]
  },
  {
    id: 'LIB-003', sourceCourseId: 'LIB-003', source: '后台新增', name: '少儿美术兴趣班', archive: '轻量课程档案', type: '面授课程', major: '少儿绘画', teacher: '李青', hours: 20, status: '已完成', difficulty: '启蒙', ages: ['少儿'], updatedAt: '2026-08-18 11:00',
    chapters: COURSE_OUTLINES['少儿美术兴趣班'],
    version: 1,
    versions: [archiveVersion(1, '2026-08-18 11:00', '教研管理员', ['建档', '编排结构'], { name: '少儿美术兴趣班', archive: '轻量课程档案', type: '面授课程', major: '少儿绘画', teacher: '李青', hours: 20, difficulty: '启蒙', ages: ['少儿'], structureKey: '', structure: '3 个章节 · 5 个课时', outline: COURSE_OUTLINES['少儿美术兴趣班'] })]
  },
  {
    id: 'LIB-004', sourceCourseId: 'LIB-004', source: '后台新增', name: '朗诵与主持基础', archive: '轻量课程档案', type: '面授课程', major: '朗诵与主持', teacher: '赵可', hours: 16, status: '已完成', difficulty: '初级', ages: ['青少年'], updatedAt: '2026-08-22 15:10',
    chapters: COURSE_OUTLINES['朗诵与主持基础'],
    version: 1,
    versions: [archiveVersion(1, '2026-08-22 15:10', '教研管理员', ['建档', '编排结构'], { name: '朗诵与主持基础', archive: '轻量课程档案', type: '面授课程', major: '朗诵与主持', teacher: '赵可', hours: 16, difficulty: '初级', ages: ['青少年'], structureKey: '', structure: '3 个章节 · 5 个课时', outline: COURSE_OUTLINES['朗诵与主持基础'] })]
  },
  {
    id: 'LIB-005', sourceCourseId: 'LIB-005', source: '后台新增', name: '古筝入门体验课', archive: '轻量课程档案', type: '面授课程', major: '古筝', teacher: '周宁', hours: 8, status: '已完成', difficulty: '启蒙', ages: ['少儿', '成人'], updatedAt: '2026-08-25 09:20',
    chapters: COURSE_OUTLINES['古筝入门体验课'],
    version: 1,
    versions: [archiveVersion(1, '2026-08-25 09:20', '教研管理员', ['建档', '编排结构'], { name: '古筝入门体验课', archive: '轻量课程档案', type: '面授课程', major: '古筝', teacher: '周宁', hours: 8, difficulty: '启蒙', ages: ['少儿', '成人'], structureKey: '', structure: '2 个章节 · 3 个课时', outline: COURSE_OUTLINES['古筝入门体验课'] })]
  },
  ...courseMockSeed().filter((course) => course.status === '已完成').map((course) => {
    const lessonCount = course.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
    const structureKey = JSON.stringify(course.chapters.map((chapter) => [chapter.name, chapter.lessons.map((lesson) => lesson.name)]));
    return {
      id: `LIB-${course.id}`,
      sourceCourseId: course.id,
      source: course.source,
      name: course.name,
      archive: '完整课程',
      type: course.type,
      major: course.major,
      teacher: course.teacher,
      hours: course.hours,
      status: '已完成',
      difficulty: course.difficulty,
      ages: [...course.ages],
      updatedAt: course.updatedAt,
      chapters: course.chapters.map((chapter) => ({
        ...chapter,
        lessons: (chapter.lessons || []).map((lesson) => ({ ...lesson, resources: [...(lesson.resources || [])] }))
      })),
      version: 1,
      versions: [archiveVersion(1, course.updatedAt, '教研管理员', ['建档', '编排结构'], {
        name: course.name,
        source: course.source,
        archive: '完整课程',
        type: course.type,
        major: course.major,
        teacher: course.teacher,
        hours: course.hours,
        difficulty: course.difficulty,
        ages: [...course.ages],
        structureKey,
        structure: `${course.chapters.length} 个章节 · ${lessonCount} 个课时`,
        outline: course.chapters.map((chapter) => ({
          ...chapter,
          lessons: (chapter.lessons || []).map((lesson) => ({ ...lesson, resources: [...(lesson.resources || [])] }))
        }))
      })]
    };
  }),
  ...VIDEO_DEMO_COURSES.map((course) => ({
    id: `LIB-${course.id}`,
    sourceCourseId: course.id,
    source: '后台新增',
    name: course.name,
    archive: '完整课程',
    type: '视频课程',
    major: course.major,
    teacher: course.teacher,
    hours: course.hours,
    status: '已完成',
    difficulty: course.difficulty,
    ages: [...course.ages],
    updatedAt: '2026-09-21 10:00',
    chapters: course.outline,
    version: 1,
    versions: [archiveVersion(1, '2026-09-21 10:00', '教研管理员', ['建档', '编排结构'], { name: course.name, archive: '完整课程', type: '视频课程', major: course.major, teacher: course.teacher, hours: course.hours, difficulty: course.difficulty, ages: [...course.ages], structure: `${course.outline.length} 个章节 · ${course.outline.reduce((sum, chapter) => sum + chapter.lessons.length, 0)} 个课时`, outline: course.outline })]
  }))
];

export const COURSE_DISPLAY_UNSET = '未配置';
// 运营四字段：只写在售卖单元（商品或班级）记录上，不写课程档案。
export const SALE_UNIT_DISPLAY_KEYS = ['cover', 'coverFile', 'detail', 'tags', 'recommendation'];

// 档案种子按 I1-DEC-19 的课程主键归一，避免后台与学员端读到退役编号。
export function courseArchiveSeed() {
  // 深拷贝版本轨：调用方会刷新当前版本快照，不能共享种子里的同一份对象。
  return COURSE_ARCHIVE_SEED.map((record) => ({
    ...record,
    sourceCourseId: toCanonicalCourseId(record.sourceCourseId),
    chapters: (record.chapters || []).map((chapter) => ({ ...chapter, lessons: (chapter.lessons || []).map((lesson) => ({ ...lesson, resources: [...(lesson.resources || [])] })) })),
    ages: [...record.ages],
    versions: (record.versions || []).map((entry) => ({
      ...entry,
      changes: [...(entry.changes || [])],
      snapshot: {
        ...entry.snapshot,
        ages: [...(entry.snapshot?.ages || [])],
        outline: (entry.snapshot?.outline || []).map((chapter) => ({
          ...chapter,
          lessons: (chapter.lessons || []).map((lesson) => ({ ...lesson, resources: [...(lesson.resources || [])] }))
        }))
      }
    }))
  }));
}

export function courseArchiveDefaults(course = {}) {
  return {
    id: `LIB-${course.id || Date.now()}`,
    sourceCourseId: toCanonicalCourseId(course.id),
    source: course.source || (course.applicationId ? '教师申报' : '后台新增'),
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

// 商品、班级和订单按自身保存的版本读取课程属性；未传版本时才读取当前版本。
export function courseArchiveVersionFor(course, version) {
  const current = courseArchiveFor(course);
  const requested = Number(version);
  if (!current || !Number.isInteger(requested) || requested < 1) return current;
  const entry = (current.versions || []).find((item) => Number(item.version) === requested);
  if (!entry?.snapshot) return current;
  return { ...current, ...entry.snapshot, version: requested, sourceCourseId: current.sourceCourseId, versions: current.versions };
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
