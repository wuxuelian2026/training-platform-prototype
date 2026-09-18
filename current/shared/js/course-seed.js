// Canonical course-construction seed shared by the teacher app and the admin course center.
// I1-DEC-19: one application id (CR-YYYY-NNNN) spans both ends; the course id is derived from it.
import { TEACHER_FACTS } from './teacher-facts.js';
import { explainTeacherCapacity } from './teacher-capacity.js';

const teacherAccountMeta = {
  'teacher-wang': { no: 'JS20260901', unit: '湖北艺术职业学院', professional: '舞蹈表演', major: '中国舞' },
  'teacher-liqing': { no: 'JS20260903', unit: '武汉美术馆', professional: '美术教育', major: '中国画' },
  'teacher-zhao': { no: 'JS20260913', unit: '湖北艺术职业学院', professional: '美术教育', major: '书法' },
  'teacher-linyue': { no: 'JS20260904', unit: '湖北艺术职业学院', professional: '音乐表演', major: '钢琴' },
  'teacher-dengqi': { no: 'JS20260908', unit: '湖北艺术职业学院', professional: '戏剧表演', major: '朗诵与主持' },
  'teacher-tangwen': { no: 'JS20260909', unit: '湖北艺术职业学院', professional: '美术教育', major: '少儿绘画' },
  'teacher-xufan': { no: 'JS20260910', unit: '湖北艺术职业学院', professional: '舞蹈表演', major: '芭蕾舞' }
};

// 教师端演示账号与课程申报数据使用同一份“当前可申报”判定，避免账号状态变化后仍生成新申报。
export const teacherAccounts = TEACHER_FACTS
  .filter((facts) => teacherAccountMeta[facts.id] && explainTeacherCapacity(facts, { purpose: 'apply' }).status === 'available')
  .map((facts) => ({
    id: facts.id,
    name: facts.name,
    no: teacherAccountMeta[facts.id].no,
    unit: teacherAccountMeta[facts.id].unit,
    title: facts.professionalTitle,
    professional: teacherAccountMeta[facts.id].professional,
    major: teacherAccountMeta[facts.id].major,
    years: `${facts.teachingYears}年`
  }));

export function courseIdForApplication(applicationId) {
  return `COURSE-${applicationId}`;
}

// I1-DEC-19 retired the parallel course numbering. Demo browsers that still hold pre-rename localStorage
// keep course references on the old ids, so the retired ids stay resolvable as aliases instead of forcing
// reviewers to clear storage by hand (I1-DEF-008).
export const legacyCourseIdAliases = {
  'COURSE-001': 'COURSE-CR-2026-0001',
  'COURSE-002': 'COURSE-CR-2026-0002',
  'COURSE-003': 'COURSE-CR-2026-0003',
  'COURSE-004': 'COURSE-CR-2026-0004',
  'COURSE-005': 'COURSE-CR-2026-0005'
};

export function toCanonicalCourseId(id) {
  return legacyCourseIdAliases[id] || id;
}

export function defaultTeacherId() {
  return teacherAccounts[0].id;
}

const applicationStatuses = ['待审核', '已通过', '已驳回', '已撤销', '待审核', '已通过', '已驳回', '已撤销', '待审核', '已通过'];
const applicationTitles = ['入门基础', '核心技法', '进阶训练', '作品实践', '综合提升', '表现力训练', '经典赏析', '创作工作坊', '阶段强化', '成果展示'];
const applicationDates = ['2026-09-16', '2026-09-15', '2026-09-14', '2026-09-13', '2026-09-12', '2026-09-11', '2026-09-10', '2026-09-09', '2026-09-08', '2026-09-07'];
const applicationDifficulties = ['启蒙', '初级', '中级', '高级', '考级冲刺'];
const applicationAges = [['少儿'], ['青少年'], ['成人'], ['青少年', '成人'], ['全年龄段']];

function mockApplication(teacher, teacherIndex, itemIndex) {
  const sequence = 1001 + teacherIndex * 10 + itemIndex;
  const id = `CR-2026-${String(sequence).padStart(4, '0')}`;
  const status = applicationStatuses[itemIndex];
  const date = applicationDates[itemIndex];
  const hour = String(9 + teacherIndex).padStart(2, '0');
  const minute = String(8 + itemIndex * 4).padStart(2, '0');
  const reviewed = status !== '待审核';
  const review = status === '已通过'
    ? '课程目标与内容结构清晰，审批通过。'
    : status === '已驳回'
      ? '课程目标需进一步量化，并补充各阶段教学成果。'
      : status === '已撤销'
        ? '教师根据课程计划调整主动撤销申报。'
        : '';
  const type = itemIndex % 3 === 1 ? '视频课程' : '面授课程';
  return {
    id,
    name: `${teacher.major}${applicationTitles[itemIndex]}`,
    type,
    major: teacher.major,
    professional: teacher.professional,
    hours: 8 + itemIndex * 2,
    status,
    date,
    submittedAt: `${date} ${hour}:${minute}`,
    intro: `围绕${teacher.major}的${applicationTitles[itemIndex]}组织教学内容，包含知识讲解、示范练习与阶段成果。`,
    attachment: itemIndex % 2 === 0 ? `${teacher.major}${applicationTitles[itemIndex]}课程大纲.pdf` : '',
    file: itemIndex % 2 === 0 ? `${teacher.major}${applicationTitles[itemIndex]}课程大纲.pdf` : '',
    teacherId: teacher.id,
    teacher: teacher.name,
    teacherNo: teacher.no,
    teacherUnit: teacher.unit,
    teacherTitle: teacher.title,
    teacherProfessional: teacher.professional,
    teacherInfo: `${teacher.name} · ${teacher.title} · ${teacher.professional} · ${teacher.unit}`,
    difficulty: applicationDifficulties[itemIndex % applicationDifficulties.length],
    ages: applicationAges[itemIndex % applicationAges.length],
    courseId: courseIdForApplication(id),
    review,
    reviewedBy: status === '已撤销' ? '教师本人' : reviewed ? '教研管理员' : '',
    reviewedAt: reviewed ? `${date} ${String(17 + (teacherIndex % 3)).padStart(2, '0')}:${minute}` : ''
  };
}

function teacherApplicationMocks() {
  return teacherAccounts.flatMap((teacher, teacherIndex) =>
    Array.from({ length: 10 }, (_, itemIndex) => mockApplication(teacher, teacherIndex, itemIndex))
  );
}

const courseArrangeStatuses = ['待编排', '编排中', '已完成', '待编排', '已完成', '编排中', '已完成', '待编排', '编排中', '已完成'];

function mockCourseChapters(course, itemIndex) {
  if (course.status === '待编排') return [];
  const lessonCount = course.status === '已完成' ? course.hours : Math.min(3, course.hours);
  const chapterCount = course.status === '已完成' ? 2 : 1;
  return Array.from({ length: chapterCount }, (_, chapterIndex) => {
    const start = chapterIndex === 0 ? 0 : Math.ceil(lessonCount / 2);
    const end = chapterIndex === 0 && chapterCount > 1 ? Math.ceil(lessonCount / 2) : lessonCount;
    return {
      name: chapterIndex === 0 ? '基础训练' : '综合实践',
      desc: chapterIndex === 0 ? `建立${course.major}基本方法。` : `完成${course.major}综合运用。`,
      lessons: Array.from({ length: end - start }, (_, lessonIndex) => {
        const sequence = start + lessonIndex + 1;
        return {
          name: `第${sequence}课时 · ${applicationTitles[(itemIndex + sequence - 1) % applicationTitles.length]}`,
          target: `掌握${course.major}第${sequence}阶段训练要点`,
          duration: 45,
          kind: sequence % 2 ? '示范' : '练习',
          description: `完成${course.major}第${sequence}课时的讲解、示范与练习。`,
          resources: course.type === '视频课程' ? ['res-001'] : []
        };
      })
    };
  });
}

function mockCourse(teacher, teacherIndex, itemIndex) {
  const sequence = 1001 + teacherIndex * 10 + itemIndex;
  const applicationId = `CR-2026-${String(sequence).padStart(4, '0')}`;
  const fromApprovedApplication = applicationStatuses[itemIndex] === '已通过';
  const plannedHours = 8 + (itemIndex % 5) * 2;
  const status = courseArrangeStatuses[itemIndex];
  const course = {
    id: fromApprovedApplication ? courseIdForApplication(applicationId) : `COURSE-MOCK-${String(sequence).padStart(4, '0')}`,
    applicationId: fromApprovedApplication ? applicationId : '',
    source: fromApprovedApplication ? '教师申报' : '后台新增',
    name: `${teacher.major}${applicationTitles[itemIndex]}`,
    type: itemIndex % 3 === 1 ? '视频课程' : '面授课程',
    major: teacher.major,
    teacherId: teacher.id,
    teacher: teacher.name,
    hours: status === '已完成' ? plannedHours : 0,
    plannedHours,
    status,
    updatedAt: `${applicationDates[itemIndex]} ${String(10 + teacherIndex).padStart(2, '0')}:${String(12 + itemIndex * 3).padStart(2, '0')}`,
    difficulty: applicationDifficulties[itemIndex % applicationDifficulties.length],
    ages: [...applicationAges[itemIndex % applicationAges.length]],
    chapters: []
  };
  course.chapters = mockCourseChapters({ ...course, hours: plannedHours }, itemIndex);
  return course;
}

export function courseMockSeed() {
  return teacherAccounts.flatMap((teacher, teacherIndex) =>
    Array.from({ length: 10 }, (_, itemIndex) => mockCourse(teacher, teacherIndex, itemIndex))
  );
}

export function applicationSeed() {
  return [
    { id: 'CR-2026-0001', name: '舞蹈基本功', type: '面授课程', major: '中国舞', professional: '舞蹈表演', hours: 16, status: '待审核', date: '2026-09-08', submittedAt: '2026-09-08 09:14', intro: '从身体控制、节奏训练到基本舞姿，建立少儿中国舞的基础训练体系。', attachment: '课程申报说明.pdf', file: '课程申报说明.pdf', teacher: '王玥', teacherNo: 'JS20260901', teacherUnit: '湖北艺术职业学院', teacherTitle: '副教授', teacherProfessional: '舞蹈表演', teacherInfo: '王玥 · 副教授 · 舞蹈表演 · 湖北艺术职业学院', difficulty: '初级', ages: ['少儿'], courseId: 'COURSE-CR-2026-0001', review: '', reviewedBy: '', reviewedAt: '' },
    { id: 'CR-2026-0002', name: '声乐演唱技巧', type: '视频课程', major: '声乐演唱', professional: '声乐演唱', hours: 12, status: '已通过', date: '2026-09-07', submittedAt: '2026-09-07 15:36', intro: '围绕气息、共鸣、咬字与作品处理，帮助学习者建立完整演唱方法。', attachment: '声乐课程大纲.docx', file: '声乐课程大纲.docx', teacher: '陈晨', teacherNo: 'JS20260902', teacherUnit: '湖北艺术职业学院', teacherTitle: '讲师', teacherProfessional: '声乐演唱', teacherInfo: '陈晨 · 讲师 · 声乐演唱 · 湖北艺术职业学院', difficulty: '中级', ages: ['青少年', '成人'], courseId: 'COURSE-CR-2026-0002', review: '审批通过', reviewedBy: '教研管理员', reviewedAt: '2026-09-05 15:30' },
    { id: 'CR-2026-0003', name: '少儿国画入门', type: '面授课程', major: '中国画', professional: '美术教育', hours: 20, status: '待审核', date: '2026-09-06', submittedAt: '2026-09-06 11:20', intro: '以笔墨体验和传统题材临摹为主，适合零基础少儿建立国画兴趣。', attachment: '', file: '', teacher: '李青', teacherNo: 'JS20260903', teacherUnit: '武汉美术馆', teacherTitle: '讲师', teacherProfessional: '美术教育', teacherInfo: '李青 · 讲师 · 美术教育 · 武汉美术馆', difficulty: '启蒙', ages: ['少儿'], courseId: 'COURSE-CR-2026-0003', review: '', reviewedBy: '', reviewedAt: '' },
    { id: 'CR-2026-0004', name: '古筝基础与乐曲赏析', type: '视频课程', major: '古筝', professional: '古筝', hours: 10, status: '已驳回', date: '2026-09-05', submittedAt: '2026-09-05 16:08', intro: '从坐姿、指法、节拍到入门乐曲，配合慢速示范建立演奏习惯。', attachment: '古筝课程说明.pdf', file: '古筝课程说明.pdf', teacher: '周宁', teacherNo: 'JS20260904', teacherUnit: '湖北艺术职业学院', teacherTitle: '讲师', teacherProfessional: '古筝', teacherInfo: '周宁 · 讲师 · 古筝 · 湖北艺术职业学院', difficulty: '初级', ages: ['青少年', '成人'], courseId: 'COURSE-CR-2026-0004', review: '课时目标需补充每节课的练习要求，并明确结课考核标准。', reviewedBy: '教研管理员', reviewedAt: '2026-09-05 17:02' },
    { id: 'CR-2026-0005', name: '戏剧表演基础', type: '面授课程', major: '戏剧表演', professional: '戏剧表演', hours: 16, status: '待审核', date: '2026-09-03', submittedAt: '2026-09-03 10:32', intro: '通过台词、形体、即兴练习建立舞台表达与团队协作能力。', attachment: '', file: '', teacher: '赵可', teacherNo: 'JS20260905', teacherUnit: '武汉传媒学院', teacherTitle: '副教授', teacherProfessional: '戏剧表演', teacherInfo: '赵可 · 副教授 · 戏剧表演 · 武汉传媒学院', difficulty: '初级', ages: ['青少年'], courseId: 'COURSE-CR-2026-0005', review: '', reviewedBy: '', reviewedAt: '' },
    { id: 'CR-2026-0006', name: '青少年芭蕾基础', type: '面授课程', major: '芭蕾舞', professional: '舞蹈表演', hours: 18, status: '已撤销', date: '2026-08-28', submittedAt: '2026-08-28 14:12', intro: '面向青少年设计的芭蕾基础训练，重视体态、柔韧与节奏感。', attachment: '', file: '', teacher: '王玥', teacherNo: 'JS20260901', teacherUnit: '湖北艺术职业学院', teacherTitle: '副教授', teacherProfessional: '舞蹈表演', teacherInfo: '王玥 · 副教授 · 舞蹈表演 · 湖北艺术职业学院', difficulty: '初级', ages: ['青少年'], courseId: 'COURSE-CR-2026-0006', review: '教师主动撤销申报', reviewedBy: '教师本人', reviewedAt: '2026-08-29 09:10' },
    ...teacherApplicationMocks()
  ];
}
