// 结业（graduation）共享种子：后台 academic.js 与学员端 learner.js 同源取数，
// 避免学习报告在两端各存一份导致口径分叉（见 CR-2026-149）。
// 关联班级按 className 匹配真实班级档案（class-seed.js）：
//   「暑期中国舞基础1班」= class-mock-ended-pending-01（中国舞进阶训练／王玥）。
export const graduationSeed = [{
  id: 'graduation-dance', className: '暑期中国舞基础1班', course: '中国舞进阶训练', teacher: '王玥', operational: '已结束', classStatus: '待后台审核', endDate: '2026-09-08', learners: [
    { id: 'learner-lin', name: '林知夏', attendance: '80%', homework: '80%', comment: '课堂参与积极，基本功和组合衔接持续进步。', suggestion: '保持每周练习，关注动作细节和节奏稳定性。', status: '待审核' },
    { id: 'learner-zhou', name: '周予安', attendance: '80%', homework: '90%', comment: '基本动作掌握较稳，组合衔接仍需加强。', suggestion: '补齐缺勤课次后重点练习身韵连接和重心转换。', status: '需补课' },
    { id: 'learner-chen', name: '陈一诺', attendance: '85%', homework: '75%', comment: '课堂参与积极，基础动作完成度较好。', suggestion: '补交缺失作业，并针对转身稳定性进行集中练习。', status: '需补课' },
    { id: 'learner-zhao', name: '赵明月', attendance: '100%', homework: '100%', comment: '身韵表达自然，能够准确完成课程组合并形成稳定的舞台表现。', suggestion: '可继续进行进阶组合训练，提升动作细节与呼吸配合。', status: '已通过', auditBy: '教务管理员', auditAt: '2026-09-09 10:20', auditNote: '考勤、作业与教师评语符合结业要求。' },
    { id: 'learner-wu', name: '吴桐', attendance: '50%', homework: '40%', comment: '已完成前半段基础训练。', suggestion: '如后续恢复学习，建议从柔韧与力量基础重新衔接。', status: '已取消结业' }
  ]
}, {
  id: 'graduation-vocal', className: '成人声乐班', course: '声乐基础', teacher: '陈晨', operational: '已结束', classStatus: '审核完成', endDate: '2026-09-07', learners: [
    { id: 'learner-liu', name: '刘女士', attendance: '96%', homework: '100%', comment: '声音控制稳定，完成度良好。', suggestion: '保持日常发声训练。', status: '已通过' },
    { id: 'learner-chen', name: '陈一诺', attendance: '100%', homework: '92%', comment: '学习目标达成。', suggestion: '尝试更多曲目。', status: '已通过' }
  ]
}];
