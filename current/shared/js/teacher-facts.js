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
    // CR-2026-045：后台建档档案字段（详情页 28 项非子表字段的取值来源）。
    archive: {
      employeeNo: 'JS20260901', personnelType: '签约', gender: '女', birthMonth: '1988-06',
      idCard: '420106198806152826', politicalStatus: '中共党员', ethnicity: '汉族', highestEducation: '本科',
      carPlate: '鄂A·8K209', mobile: '13800002026', email: 'wangyue@hbyx.edu.cn',
      emergencyName: '王建国', emergencyMobile: '13900008812',
      payeeName: '王玥', bankCard: '6222020200112233445', bankName: '中国工商银行',
      education: '2006-2010 湖北艺术职业学院 舞蹈表演 本科', employment: '2010-2016 湖北省歌舞剧院 演员；2016 至今 湖北艺术职业学院 舞蹈教师',
      awards: '2024年湖北省职业院校技能大赛优秀指导教师。',
      remark: '2026 秋季学期承担少儿中国舞基础班教学。'
    },
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
    archive: {
      employeeNo: 'JS20260902', personnelType: '外聘', gender: '男', birthMonth: '1992-03',
      idCard: '420106199203074519', politicalStatus: '群众', ethnicity: '汉族', highestEducation: '硕士研究生',
      carPlate: '', mobile: '13800002027', email: 'chenchen@hbyx.edu.cn',
      emergencyName: '陈立', emergencyMobile: '13900008813',
      payeeName: '陈晨', bankCard: '6222020200112233450', bankName: '中国建设银行',
      education: '2011-2015 武汉音乐学院 声乐表演 本科；2015-2018 武汉音乐学院 声乐教学 硕士研究生',
      employment: '2018 至今 湖北艺术职业学院 声乐教师',
      awards: '', remark: '外聘教师，按课次结算。'
    },
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
  },
  {
    id: 'teacher-linyue', name: '林悦', profileStatus: '已建档', accountStatus: 'active',
    majors: ['钢琴'],
    teachingYears: 7, professionalTitle: '讲师',
    tagline: '用清晰的方法建立稳定的演奏习惯。',
    introduction: '从事钢琴基础与进阶教学，重视识谱、节奏和触键训练。',
    certificates: [
      { id: 'cert-linyue', name: '钢琴教师资格证', type: '教师资格证', status: '已通过', expiresAt: '2029-06-30', majors: ['钢琴'] }
    ],
    contracts: [
      { number: 'CT2026010022', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['钢琴基础'], majors: ['钢琴'] }
    ]
  },
  {
    id: 'teacher-sunning', name: '孙宁', profileStatus: '已建档', accountStatus: 'inactive',
    majors: ['古筝'],
    teachingYears: 4, professionalTitle: '助教',
    tagline: '从指法与节奏开始，逐步建立乐曲表达。',
    introduction: '负责古筝启蒙课程，关注手型、节奏和练习习惯。',
    certificates: [
      { id: 'cert-sunning', name: '古筝教师资格证', type: '艺术等级证', status: '待审核', expiresAt: '2029-12-31', majors: ['古筝'] }
    ],
    contracts: [
      { number: 'CT2026090023', status: '待教师签署', startAt: '2026-10-01', endAt: '2027-09-30', courses: ['古筝启蒙'], majors: ['古筝'] }
    ]
  },
  {
    id: 'teacher-hejing', name: '何静', profileStatus: '已建档', accountStatus: 'frozen',
    majors: ['中国画'],
    teachingYears: 10, professionalTitle: '副教授',
    tagline: '在笔墨训练中理解构图与意境。',
    introduction: '长期从事中国画基础教学，擅长花鸟画与基础构图训练。',
    certificates: [
      { id: 'cert-hejing', name: '中国画专业资格证', type: '艺术等级证', status: '已通过', expiresAt: '2030-08-31', majors: ['中国画'] }
    ],
    contracts: [
      { number: 'CT2026010024', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['中国画基础'], majors: ['中国画'] }
    ]
  },
  {
    id: 'teacher-gaoyuan', name: '高远', profileStatus: '待完善', accountStatus: 'active',
    majors: ['民族民间舞'],
    teachingYears: 3, professionalTitle: '助教',
    tagline: '从节奏与体态进入民族舞的表达。',
    introduction: '主要承担民族民间舞基础训练与组合练习。',
    certificates: [
      { id: 'cert-gaoyuan', name: '民族舞教师资格证', type: '艺术等级证', status: '已通过', expiresAt: '2028-03-31', majors: ['民族民间舞'] }
    ],
    contracts: [
      { number: 'CT2026010025', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['民族舞基础'], majors: ['民族民间舞'] }
    ]
  },
  {
    id: 'teacher-luoxin', name: '罗欣', profileStatus: '已建档', departedAt: '2026-08-31', accountStatus: 'active',
    majors: ['戏剧表演'],
    teachingYears: 11, professionalTitle: '高级教师',
    tagline: '让角色行动建立在真实感受之上。',
    introduction: '从事戏剧表演与台词教学，重视角色分析和舞台行动。',
    certificates: [
      { id: 'cert-luoxin', name: '戏剧表演教师资格证', type: '教师资格证', status: '已通过', expiresAt: '2028-12-31', majors: ['戏剧表演'] }
    ],
    contracts: [
      { number: 'CT2025010026', status: '已终止', startAt: '2025-01-01', endAt: '2026-08-31', courses: ['戏剧表演基础'], majors: ['戏剧表演'] }
    ]
  },
  {
    id: 'teacher-dengqi', name: '邓琪', profileStatus: '已建档', accountStatus: 'active',
    majors: ['朗诵与主持'],
    teachingYears: 6, professionalTitle: '讲师',
    tagline: '从声音、节奏和表达逻辑建立舞台自信。',
    introduction: '承担朗诵、主持与语言表达课程教学。',
    certificates: [
      { id: 'cert-dengqi', name: '播音主持教师资格证', type: '教师资格证', status: '已驳回', expiresAt: '2029-05-31', majors: ['朗诵与主持'] }
    ],
    contracts: [
      { number: 'CT2026010027', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['朗诵与主持基础'], majors: ['朗诵与主持'] }
    ]
  },
  {
    id: 'teacher-tangwen', name: '唐雯', profileStatus: '已建档', accountStatus: 'active',
    majors: ['少儿绘画'],
    teachingYears: 5, professionalTitle: '讲师',
    tagline: '把观察、想象和表达放进每一次创作。',
    introduction: '专注少儿绘画启蒙与创意表达课程。',
    certificates: [
      { id: 'cert-tangwen', name: '美术教师资格证', type: '教师资格证', status: '已撤销', expiresAt: '2030-06-30', majors: ['少儿绘画'] }
    ],
    contracts: [
      { number: 'CT2026090028', status: '待学校签署', startAt: '2026-10-01', endAt: '2027-09-30', courses: ['少儿创意绘画'], majors: ['少儿绘画'] }
    ]
  },
  {
    id: 'teacher-xufan', name: '徐帆', profileStatus: '已建档', accountStatus: 'active',
    majors: ['芭蕾舞'],
    teachingYears: 9, professionalTitle: '讲师',
    tagline: '用规范训练建立轻盈、稳定的身体控制。',
    introduction: '负责芭蕾基础、形体与舞台组合教学。',
    certificates: [
      { id: 'cert-xufan', name: '芭蕾舞教师资格证', type: '艺术等级证', status: '已通过', expiresAt: '2026-10-10', majors: ['芭蕾舞'] }
    ],
    contracts: [
      { number: 'CT2026010029', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['芭蕾形体基础'], majors: ['芭蕾舞'] }
    ]
  },
  {
    id: 'teacher-penglu', name: '彭露', profileStatus: '待完善', accountStatus: 'inactive',
    majors: ['书法'],
    teachingYears: 2, professionalTitle: '助教',
    tagline: '从基本笔画开始建立书写秩序。',
    introduction: '协助书法启蒙与硬笔基础课程教学。',
    certificates: [],
    contracts: []
  },
  {
    id: 'teacher-hanyu', name: '韩宇', profileStatus: '已建档', accountStatus: 'frozen',
    majors: ['声乐演唱'],
    teachingYears: 8, professionalTitle: '讲师',
    tagline: '让声音训练服务于作品表达。',
    introduction: '从事成人声乐与艺术歌曲演唱教学。',
    certificates: [
      { id: 'cert-hanyu', name: '声乐教师资格证', type: '教师资格证', status: '已通过', expiresAt: '2029-09-30', majors: ['声乐演唱'] }
    ],
    contracts: []
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
