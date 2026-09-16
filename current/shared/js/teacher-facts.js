// 教师事实层：教师、证书（含适用专业）、合同覆盖课程、已开班次。
//
// 这些是客观事实，不含任何“可申报／可排课”结论。结论统一由 teacher-capacity.js
// 的 explainTeacherCapacity() 按（教师 × 专业 × 课程 × 日期）计算，
// 供教师列表、教师详情、排课工作台、证书页共用，避免各页面各写一套判断。
import { classSeed } from './class-seed.js';

export const TEACHER_FACTS = [
  {
    id: 'teacher-wang', name: '王玥', profileStatus: '已建档', accountStatus: 'active',
    majors: ['中国舞', '民族民间舞'],
    teachingYears: 8, professionalTitle: '副教授',
    tagline: '从基本功到舞台表达，让身体真正理解动作。',
    introduction: '长期从事中国舞基础、身韵及少儿舞蹈教学，注重基本功训练与舞台表现力的结合。',
    certificates: [
      { id: 'cert-001', name: '中国舞教师资格证', type: '艺术等级证', status: '已通过', expiresAt: '2027-09-30', majors: ['中国舞'] },
      { id: 'cert-002', name: '本科学历证书', type: '学历证书', status: '已通过', expiresAt: '', majors: ['中国舞', '民族民间舞'] },
      { id: 'cert-005', name: '中国舞等级考试考官证', type: '艺术等级证', status: '已通过', expiresAt: '2026-10-15', majors: ['中国舞'] }
    ],
    contracts: [
      { number: 'CT2026090021', status: '待教师签署', startAt: '2026-10-01', endAt: '2027-09-30', courses: ['舞蹈基本功'], majors: ['中国舞'] },
      { number: 'CT2026010008', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['舞蹈基本功'], majors: ['中国舞'] }
    ]
  },
  {
    id: 'teacher-chen', name: '陈晨', profileStatus: '已建档', accountStatus: 'inactive',
    majors: ['声乐演唱', '音乐表演'],
    teachingYears: 5, professionalTitle: '讲师',
    tagline: '让每一位学员找到自然、稳定且有表现力的声音。',
    introduction: '专注声乐发声与作品演唱训练，擅长建立循序渐进的练习路径。',
    certificates: [
      { id: 'cert-chen', name: '教师资格证', type: '教师资格证', status: '待审核', expiresAt: '2034-06-30', majors: ['声乐演唱'] }
    ],
    contracts: [
      { number: 'CT2026090016', status: '待学校签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['声乐演唱技巧', '艺术歌曲示范课'], majors: ['声乐演唱'] }
    ]
  },
  {
    id: 'teacher-liu', name: '刘佳', profileStatus: '待完善', accountStatus: 'inactive',
    majors: ['绘画', '少儿绘画'],
    teachingYears: 6, professionalTitle: '讲师',
    tagline: '先让孩子喜欢画画，再谈技法。',
    introduction: '从事少儿绘画启蒙教学，以观察、想象和表达为训练主线。',
    certificates: [
      { id: 'cert-liu', name: '美术教师资格证', type: '教师资格证', status: '已通过', expiresAt: '2026-09-20', majors: ['绘画'] }
    ],
    contracts: []
  },
  {
    id: 'teacher-zhou', name: '周晓', profileStatus: '已建档', departedAt: '2026-06-30', accountStatus: 'active',
    majors: ['戏剧表演'],
    teachingYears: 12, professionalTitle: '高级教师',
    tagline: '把台词、形体与情感放进同一个练习里。',
    introduction: '长期承担戏剧表演基础教学，重视舞台感与表达自信的建立。',
    certificates: [
      { id: 'cert-zhou', name: '高级教师职称证', type: '其他', status: '已驳回', expiresAt: '2026-08-31', majors: ['戏剧表演'] }
    ],
    contracts: [
      { number: 'CT2024020004', status: '已终止', startAt: '2024-02-01', endAt: '2025-01-31', courses: ['戏剧表演基础'], majors: ['戏剧表演'] }
    ]
  },
  {
    id: 'teacher-liqing', name: '李青', profileStatus: '已建档', accountStatus: 'active',
    majors: ['少儿绘画', '中国画'],
    teachingYears: 9, professionalTitle: '讲师',
    tagline: '一笔一画，把观察变成表达。',
    introduction: '负责少儿国画与美术兴趣班教学，强调观察方法与笔墨基础的结合。',
    certificates: [
      { id: 'cert-liqing', name: '美术教师资格证', type: '教师资格证', status: '已通过', expiresAt: '2030-06-30', majors: ['少儿绘画', '中国画'] }
    ],
    contracts: [
      { number: 'CT2026010012', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['少儿国画入门', '少儿美术兴趣班'], majors: ['少儿绘画', '中国画'] }
    ]
  },
  {
    id: 'teacher-zhao', name: '赵老师', profileStatus: '已建档', accountStatus: 'active',
    majors: ['中国画', '书法'],
    teachingYears: 15, professionalTitle: '副教授',
    tagline: '书法先立规矩，再谈风格。',
    introduction: '长期从事书法与中国画教学，注重笔法基础与章法训练的循序渐进。',
    certificates: [
      { id: 'cert-zhao', name: '书法等级证书', type: '艺术等级证', status: '已通过', expiresAt: '2028-05-31', majors: ['书法', '中国画'] }
    ],
    contracts: [
      { number: 'CT2026010018', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['书法基础班', '中国画基础'], majors: ['书法', '中国画'] }
    ]
  }
];

export const teacherFactsByName = (name) => TEACHER_FACTS.find((item) => item.name === name) || null;
export const teacherFactsById = (id) => TEACHER_FACTS.find((item) => item.id === id) || null;

// CR-2026-022 §2.3：学员端（名师列表／教师详情）展示字段的唯一取值来源。
// 只允许读取下列教师档案字段，小程序端不得再自造 tagline / intro / profile / tags 之类的字段；
// 学习经历、工作经历、获奖情况属于内部资料，不在学员端展示。
export const TEACHER_PUBLIC_PROFILE_FIELD_IDS = {
  name: 'FD-TEACHER-002',
  majors: 'FD-TEACHER-010',
  teachingYears: 'FD-TEACHER-011',
  professionalTitle: 'FD-TEACHER-012',
  tagline: 'FD-TEACHER-024',
  introduction: 'FD-TEACHER-025'
};

export const TEACHER_PUBLIC_PROFILE_KEYS = Object.keys(TEACHER_PUBLIC_PROFILE_FIELD_IDS);

export const teacherPublicProfileById = (id) => {
  const facts = teacherFactsById(id);
  if (!facts) return null;
  return {
    id: facts.id,
    name: facts.name,
    majors: [...(facts.majors || [])],
    teachingYears: facts.teachingYears,
    professionalTitle: facts.professionalTitle,
    tagline: facts.tagline || '',
    introduction: facts.introduction || ''
  };
};

const addDays = (iso, days) => {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

// 已开班次：由班级种子派生的课时日期（未发布或已停课的班级不计入）。
export const TEACHER_LESSON_SESSIONS = classSeed
  .filter((item) => item.status && item.status !== '未发布' && item.firstLessonDate && item.lessons)
  .flatMap((item) => Array.from({ length: Number(item.lessons) }, (_, index) => ({
    classId: item.id,
    className: item.name,
    teacher: item.teacher,
    major: item.professional,
    date: addDays(item.firstLessonDate, index * 7)
  })));

// 指定教师、专业在某个日期之后（含当天）仍要上的课次。
export const sessionsFrom = ({ teacher, major, from }) => TEACHER_LESSON_SESSIONS
  .filter((session) => session.teacher === teacher && (!major || session.major === major) && (!from || session.date >= from))
  .sort((a, b) => a.date.localeCompare(b.date));
