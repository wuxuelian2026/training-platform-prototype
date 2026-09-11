// Canonical course-construction seed shared by the teacher app and the admin course center.
// I1-DEC-19: one application id (CR-YYYY-NNNN) spans both ends; the course id is derived from it.

export const teacherAccounts = [
  { id: 'teacher-001', name: '王玥', no: 'JS20260901', unit: '湖北艺术职业学院', title: '副教授', professional: '舞蹈表演', years: '8年' },
  { id: 'teacher-002', name: '陈晨', no: 'JS20260902', unit: '湖北艺术职业学院', title: '讲师', professional: '声乐演唱', years: '5年' }
];

export function courseIdForApplication(applicationId) {
  return `COURSE-${applicationId}`;
}

export function defaultTeacherId() {
  return teacherAccounts[0].id;
}

export function applicationSeed() {
  return [
    { id: 'CR-2026-0001', name: '舞蹈基本功', type: '面授课程', major: '中国舞', professional: '舞蹈表演', hours: 16, status: '审核中', date: '2026-09-08', submittedAt: '2026-09-08 09:14', intro: '从身体控制、节奏训练到基本舞姿，建立少儿中国舞的基础训练体系。', attachment: '课程申报说明.pdf', file: '课程申报说明.pdf', teacher: '王玥', teacherNo: 'JS20260901', teacherUnit: '湖北艺术职业学院', teacherTitle: '副教授', teacherProfessional: '舞蹈表演', teacherInfo: '王玥 · 副教授 · 舞蹈表演 · 湖北艺术职业学院', courseId: 'COURSE-CR-2026-0001', review: '', reviewedBy: '', reviewedAt: '' },
    { id: 'CR-2026-0002', name: '声乐演唱技巧', type: '视频课程', major: '声乐演唱', professional: '声乐演唱', hours: 12, status: '已通过', date: '2026-09-07', submittedAt: '2026-09-07 15:36', intro: '围绕气息、共鸣、咬字与作品处理，帮助学习者建立完整演唱方法。', attachment: '声乐课程大纲.docx', file: '声乐课程大纲.docx', teacher: '陈晨', teacherNo: 'JS20260902', teacherUnit: '湖北艺术职业学院', teacherTitle: '讲师', teacherProfessional: '声乐演唱', teacherInfo: '陈晨 · 讲师 · 声乐演唱 · 湖北艺术职业学院', courseId: 'COURSE-CR-2026-0002', review: '审批通过', reviewedBy: '教研管理员', reviewedAt: '2026-09-05 15:30' },
    { id: 'CR-2026-0003', name: '少儿国画入门', type: '面授课程', major: '中国画', professional: '美术教育', hours: 20, status: '审核中', date: '2026-09-06', submittedAt: '2026-09-06 11:20', intro: '以笔墨体验和传统题材临摹为主，适合零基础少儿建立国画兴趣。', attachment: '', file: '', teacher: '李青', teacherNo: 'JS20260903', teacherUnit: '武汉美术馆', teacherTitle: '讲师', teacherProfessional: '美术教育', teacherInfo: '李青 · 讲师 · 美术教育 · 武汉美术馆', courseId: 'COURSE-CR-2026-0003', review: '', reviewedBy: '', reviewedAt: '' },
    { id: 'CR-2026-0004', name: '古筝基础与乐曲赏析', type: '视频课程', major: '古筝', professional: '古筝', hours: 10, status: '已驳回', date: '2026-09-05', submittedAt: '2026-09-05 16:08', intro: '从坐姿、指法、节拍到入门乐曲，配合慢速示范建立演奏习惯。', attachment: '古筝课程说明.pdf', file: '古筝课程说明.pdf', teacher: '周宁', teacherNo: 'JS20260904', teacherUnit: '湖北艺术职业学院', teacherTitle: '讲师', teacherProfessional: '古筝', teacherInfo: '周宁 · 讲师 · 古筝 · 湖北艺术职业学院', courseId: 'COURSE-CR-2026-0004', review: '课时目标需补充每节课的练习要求，并明确结课考核标准。', reviewedBy: '教研管理员', reviewedAt: '2026-09-05 17:02' },
    { id: 'CR-2026-0005', name: '戏剧表演基础', type: '面授课程', major: '戏剧表演', professional: '戏剧表演', hours: 16, status: '草稿', date: '2026-09-03', submittedAt: '2026-09-03 10:32', intro: '通过台词、形体、即兴练习建立舞台表达与团队协作能力。', attachment: '', file: '', teacher: '赵可', teacherNo: 'JS20260905', teacherUnit: '武汉传媒学院', teacherTitle: '副教授', teacherProfessional: '戏剧表演', teacherInfo: '赵可 · 副教授 · 戏剧表演 · 武汉传媒学院', courseId: 'COURSE-CR-2026-0005', review: '', reviewedBy: '', reviewedAt: '' },
    { id: 'CR-2026-0006', name: '青少年芭蕾基础', type: '面授课程', major: '芭蕾舞', professional: '舞蹈表演', hours: 18, status: '已撤销', date: '2026-08-28', submittedAt: '2026-08-28 14:12', intro: '面向青少年设计的芭蕾基础训练，重视体态、柔韧与节奏感。', attachment: '', file: '', teacher: '王玥', teacherNo: 'JS20260901', teacherUnit: '湖北艺术职业学院', teacherTitle: '副教授', teacherProfessional: '舞蹈表演', teacherInfo: '王玥 · 副教授 · 舞蹈表演 · 湖北艺术职业学院', courseId: 'COURSE-CR-2026-0006', review: '教师主动撤销申报', reviewedBy: '教师本人', reviewedAt: '2026-08-29 09:10' }
  ];
}
