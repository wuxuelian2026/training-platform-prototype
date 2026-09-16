// 教师事实层：教师、证书（含适用专业）、合同覆盖课程、已开班次。
//
// 这些是客观事实，不含任何“可申报／可排课”结论。结论统一由 teacher-capacity.js
// 的 explainTeacherCapacity() 按（教师 × 专业 × 课程 × 日期）计算，
// 供教师列表、教师详情、排课工作台、证书页共用，避免各页面各写一套判断。
import { classSeed } from './class-seed.js';

export const TEACHER_FACTS = [
  {
    id: 'teacher-wang', name: '王玥', profileStatus: '已建档', personnelStatus: '在职', accountStatus: 'active',
    majors: ['中国舞', '民族民间舞'],
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
    id: 'teacher-chen', name: '陈晨', profileStatus: '已建档', personnelStatus: '在职', accountStatus: 'inactive',
    majors: ['声乐演唱', '音乐表演'],
    certificates: [
      { id: 'cert-chen', name: '教师资格证', type: '教师资格证', status: '待审核', expiresAt: '2034-06-30', majors: ['声乐演唱'] }
    ],
    contracts: [
      { number: 'CT2026090016', status: '待学校签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['声乐演唱技巧', '艺术歌曲示范课'], majors: ['声乐演唱'] }
    ]
  },
  {
    id: 'teacher-liu', name: '刘佳', profileStatus: '待完善', personnelStatus: '在职', accountStatus: 'inactive',
    majors: ['绘画', '少儿绘画'],
    certificates: [
      { id: 'cert-liu', name: '美术教师资格证', type: '教师资格证', status: '已通过', expiresAt: '2026-09-20', majors: ['绘画'] }
    ],
    contracts: []
  },
  {
    id: 'teacher-zhou', name: '周晓', profileStatus: '已建档', personnelStatus: '离职', accountStatus: 'active',
    majors: ['戏剧表演'],
    certificates: [
      { id: 'cert-zhou', name: '高级教师职称证', type: '其他', status: '已驳回', expiresAt: '2026-08-31', majors: ['戏剧表演'] }
    ],
    contracts: [
      { number: 'CT2024020004', status: '已终止', startAt: '2024-02-01', endAt: '2025-01-31', courses: ['戏剧表演基础'], majors: ['戏剧表演'] }
    ]
  },
  {
    id: 'teacher-liqing', name: '李青', profileStatus: '已建档', personnelStatus: '在职', accountStatus: 'active',
    majors: ['少儿绘画', '中国画'],
    certificates: [
      { id: 'cert-liqing', name: '美术教师资格证', type: '教师资格证', status: '已通过', expiresAt: '2030-06-30', majors: ['少儿绘画', '中国画'] }
    ],
    contracts: [
      { number: 'CT2026010012', status: '已签署', startAt: '2026-01-01', endAt: '2026-12-31', courses: ['少儿国画入门', '少儿美术兴趣班'], majors: ['少儿绘画', '中国画'] }
    ]
  },
  {
    id: 'teacher-zhao', name: '赵老师', profileStatus: '已建档', personnelStatus: '在职', accountStatus: 'active',
    majors: ['中国画', '书法'],
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
