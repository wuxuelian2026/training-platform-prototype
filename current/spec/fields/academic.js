// 教务执行监管字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。

export const ACADEMIC_FIELD_SPEC = {
  module: '教务执行监管',
  pages: {
    'academic/venues': {
      groups: [
        { heading: '新增场地字段', fields: [
          { id: 'FD-ACADEMIC-001', label: '所属校区', type: '下拉', length: '预置校区', required: '是', note: '场地归属校区' },
          { id: 'FD-ACADEMIC-002', label: '教学楼', type: '下拉', length: '预置楼栋', required: '是', note: '场地所在楼栋' },
          { id: 'FD-ACADEMIC-003', label: '教室名称', type: '文本', length: '≤ 30 字', required: '是', note: '如 综合楼302', constraints: { maxLength: 30 } },
          { id: 'FD-ACADEMIC-004', label: '场地类型', type: '下拉', length: '预置类型', required: '是', note: '决定可排课的课程类型' },
          { id: 'FD-ACADEMIC-005', label: '容量', type: '数字', length: '≥ 1 的整数', required: '是', note: '可容纳人数，用于排课容量校验' },
          { id: 'FD-ACADEMIC-006', label: '设备标签', type: '文本', length: '≤ 50 字', required: '否', note: '如 镜面墙 / 音响', constraints: { maxLength: 50 } },
          { id: 'FD-ACADEMIC-007', label: '场地状态', type: '下拉', length: '启用 / 停用', required: '是', note: '停用后不可新增排课' }
        ] }
      ],
      notes: [
        '容量用于排课时的教室推荐与容量提示。',
        '停用场地不影响已发布课次，仅阻止新增排课。',
        '排课时只使用状态为启用的场地；停用教室的历史课次仍可查询。',
        '批量导入按模板校验，失败行不建档并给出逐行原因。',
        '导入按“教学楼 + 教室名称”去重；已存在的教室只更新类型与容量，不覆盖启用状态。',
        '选择文件时按文件内容导入，未选择文件则使用粘贴内容。'
      ]
    },
    // 迭代1页面说明规格：本页为只读口径展示，不提供编辑入口。
    'academic/periods': {
      groups: [
        { heading: '时间轴与课时口径（只读）', fields: [
          { id: 'FD-ACADEMIC-040', label: '时间轴范围', type: '只读', length: '08:00–21:00', required: '系统固定', note: '固定不可修改，超出范围的课次归入“其他时段”兜底行', constraints: { readOnly: true, system: true } },
          { id: 'FD-ACADEMIC-041', label: '刻度粒度', type: '只读', length: '15 分钟/格', required: '系统固定', note: '开始时间按最近刻度吸附', constraints: { readOnly: true, system: true } },
          { id: 'FD-ACADEMIC-042', label: '课时时长字典', type: '只读', length: '45 / 60 / 90 / 120 / 150 分钟', required: '系统固定', note: '默认 45 分钟；一个课时对应一个课次', constraints: { readOnly: true, system: true } },
          { id: 'FD-ACADEMIC-043', label: '时段划分', type: '只读', length: '上午 / 下午 / 晚上', required: '系统固定', note: '用于课表半天段与自动聚合行', constraints: { readOnly: true, system: true } },
          { id: 'FD-ACADEMIC-044', label: '超出时间轴课次', type: '只读', length: '其他时段', required: '系统计算', note: '只做兜底展示，不参与时段统计', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '时间轴与课时时长是全平台排课与课表的统一口径，排班、矩阵视图与 A4 导出共用。',
        '口径固定，页面只展示刻度与说明，不提供配置入口。'
      ]
    },

    'academic/messages': {
      groups: [
        { heading: '发送通知字段', fields: [
          { id: 'FD-ACADEMIC-008', label: '通知类型', type: '下拉', length: '预置类型', required: '是', note: '决定通知模板与送达范围' },
          { id: 'FD-ACADEMIC-009', label: '目标班级', type: '下拉', length: '可选班级', required: '是', note: '选定后发送到该班级学员' },
          { id: 'FD-ACADEMIC-010', label: '通知标题', type: '文本', length: '≤ 50 字', required: '是', note: '消息列表标题', constraints: { maxLength: 50 } },
          { id: 'FD-ACADEMIC-012', label: '通知内容', type: '富文本', length: '≤ 2000 字', required: '是', note: '通知正文，支持富文本排版', constraints: { maxLength: 2000, richText: true } },
          { id: 'FD-ACADEMIC-039', label: '发送方式', type: '单选', length: '立即发送 / 定时发送', required: '否', note: '默认立即发送；选择定时发送时必须填写发送时间', constraints: { options: ['立即发送', '定时发送'] } },
          { id: 'FD-ACADEMIC-011', label: '发送时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '定时发送时必填', note: '发送方式为定时发送时必填', constraints: { format: 'YYYY-MM-DD HH:mm', requiredWhen: 'FD-ACADEMIC-039=定时发送' } },
          { id: 'FD-ACADEMIC-013', label: '发送范围', type: '单选', length: '全部学员 / 仅在读学员', required: '是', note: '决定接收人范围' }
        ] }
      ],
      notes: [
        '通知发送后可在列表中查看送达与阅读状态。',
        '发送失败可在列表中补发，补发不重复计入送达数。',
        '通知面向教师和学员发送上课提醒、停课与调课通知。',
        '通知仅发送给目标范围内的账号，不向已注销账号发送。'
      ]
    },
    // 表单结构：步骤式（layout: steps）。创建班级含课程、班级信息、排课与冲突校验四段，
    // 属于复杂表单；定价与报名时间属于招生动作，不在本表单内。
    'academic/scheduling': {
      layout: 'steps',
      groups: [
        { heading: '第 1 步 选择课程', fields: [
          { id: 'FD-ACADEMIC-014', label: '关联课程', type: '下拉', length: '必选 1 门', required: '是', note: '只能选择课程库中已完成编排的面授课程，或有效轻量课程档案' },
          { id: 'FD-ACADEMIC-031', label: '课程名称', type: '文本（只读）', length: '—', required: '系统继承', note: '由所选课程自动带入', constraints: { readOnly: true, derived: true } },
          { id: 'FD-ACADEMIC-032', label: '所属专业', type: '文本（只读）', length: '—', required: '系统继承', note: '由所选课程自动带入', constraints: { readOnly: true, derived: true } },
          { id: 'FD-ACADEMIC-033', label: '总课时', type: '只读', length: '正整数', required: '系统继承', note: '从所选课程自动继承，等于课次数，用于生成课次和结业统计', constraints: { readOnly: true, min: 1, integer: true } }
        ] },
        { heading: '第 2 步 班级基本信息', fields: [
          { id: 'FD-ACADEMIC-015', label: '班级名称', type: '文本', length: '≤ 50 字', required: '是', note: '班级对外名称，需与批次、专业和班型一致', constraints: { maxLength: 50 } },
          { id: 'FD-ACADEMIC-016', label: '所属批次', type: '下拉', length: '必选 1 个', required: '是', note: '决定批次归属与统计口径' },
          { id: 'FD-ACADEMIC-017', label: '授课教师', type: '下拉', length: '可选教师', required: '是', note: '需满足该专业可排课条件' },
          { id: 'FD-ACADEMIC-018', label: '授课校区', type: '下拉', length: '预置校区', required: '是', note: '与教室需匹配' },
          { id: 'FD-ACADEMIC-034', label: '授课教学楼', type: '下拉', length: '预置楼栋', required: '是', note: '关联该校区下的教学楼' },
          { id: 'FD-ACADEMIC-019', label: '授课教室', type: '下拉', length: '预置教室', required: '是', note: '关联该教学楼下的教室，需满足容量与时间无冲突' },
          { id: 'FD-ACADEMIC-025', label: '招生人数上限', type: '数字', length: '≥ 1 的整数', required: '是', note: '不得大于教室容量；名额以支付成功为占用时点' },
          { id: 'FD-ACADEMIC-035', label: '最低开班人数', type: '数字', length: '≥ 1 的整数', required: '否', note: '默认 5 人；未达最低人数时不开班' }
        ] },
        { heading: '第 3 步 排课配置', fields: [
          { id: 'FD-ACADEMIC-020', label: '每周上课日', type: '复选框组', length: '至少 1 天', required: '是', note: '决定课次重复规则' },
          { id: 'FD-ACADEMIC-022', label: '上课开始时间', type: '时间', length: 'HH:mm', required: '是', note: '按 15 分钟刻度吸附，范围 08:00–21:00', constraints: { format: 'HH:mm' } },
          { id: 'FD-ACADEMIC-023', label: '单次课时长', type: '下拉', length: '45 / 60 / 90 / 120 / 150 分钟', required: '是', note: '默认 45 分钟；一个课时对应一个课次' },
          { id: 'FD-ACADEMIC-024', label: '上课结束时间', type: '时间（自动计算）', length: 'HH:mm', required: '系统计算', note: '由开始时间加单次课时长自动计算，只读', constraints: { format: 'HH:mm', system: true, readOnly: true } },
          { id: 'FD-ACADEMIC-021', label: '首次上课日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '决定首次课次日期', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-ACADEMIC-036', label: '末次上课日期', type: '只读', length: 'YYYY-MM-DD', required: '系统计算', note: '取未取消、未停课课次中最晚的日期；停课、恢复、调课、补课和增删课次后自动重算，不是发布时锁定的快照；结业后不再变化', constraints: { readOnly: true, derived: true, format: 'YYYY-MM-DD' } }
        ] },
        { heading: '第 4 步 冲突校验', fields: [
          { id: 'FD-ACADEMIC-037', label: '教师时间冲突', type: '只读', length: '无冲突 / 冲突', required: '系统计算', note: '校验所选教师在全部课次上是否已有排课', constraints: { readOnly: true, system: true } },
          { id: 'FD-ACADEMIC-038', label: '教室时间冲突', type: '只读', length: '无冲突 / 冲突', required: '系统计算', note: '校验所选教室在全部课次上是否已被占用', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '创建班级由教务在排班管理完成，保存后班级状态为“未发布”；定价、报名时间与前台展示由招生的发布班级动作设置。',
        '保存草稿不生成正式课次；发布后按排课配置生成课次并进入冲突校验。',
        '排班页实时预览课次与资源冲突；矩阵空位可直接带入创建班级。',
        '时间默认吸附到最近的 15 分钟刻度；偏离刻度时强制提示修正后再保存。',
        '教师、教室或时段存在冲突时必须先修正，修正后才允许发布。',
        '一次课就是一个课次，课时费按课次数计算。',
        '末次上课日期取未取消、未停课课次中最晚的日期，随课次变动重算，结业后不再变化。',
        '同一班级的多个上课日共用同一开始时间、课时时长与教室。'
      ]
    },
    'academic/attendance': {
      groups: [
        { heading: '考勤补录字段', fields: [
          { id: 'FD-ACADEMIC-028', label: '最终考勤状态', type: '下拉', length: '出勤 / 迟到 / 缺勤 / 请假', required: '是', note: '补录后的最终状态' },
          { id: 'FD-ACADEMIC-029', label: '补录原因', type: '文本', length: '≤ 200 字', required: '是', note: '说明漏记或迟记原因', constraints: { maxLength: 200 } },
          { id: 'FD-ACADEMIC-030', label: '教务处理说明', type: '文本', length: '≤ 200 字', required: '超时处理时必填', note: '超时补录需教务补充说明', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '补录须记录操作人、操作时间与原因，形成审计记录。',
        '补录会更新该课次考勤统计与学员出勤率。',
        '考勤监控集中处理教师端上传的待补录与超时考勤流水。',
        '已确认的历史考勤再次变更需走补录流程，不直接覆盖。'
      ]
    }
  }
};
