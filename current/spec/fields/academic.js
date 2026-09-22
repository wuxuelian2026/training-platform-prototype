// 面授运营 / 教务执行监管字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。

export const ACADEMIC_FIELD_SPEC = {
  module: '面授运营 / 教务执行监管',
  pages: {
    'academic/venues': {
      groups: [
        { heading: '校区档案字段', fields: [
          { id: 'FD-ACADEMIC-045', label: '校区名称', type: '文本', length: '≤ 30 字', required: '是', note: '全局唯一；教学楼必须归属校区', constraints: { maxLength: 30 } },
          { id: 'FD-ACADEMIC-046', label: '校区地址', type: '文本', length: '≤ 100 字', required: '否', note: '校区联系地址', constraints: { maxLength: 100 } },
          { id: 'FD-ACADEMIC-047', label: '校区状态', type: '单选', length: '启用 / 停用', required: '是', note: '停用后下级教学楼和教室不可用于新排课' }
        ] },
        { heading: '教学楼档案字段', fields: [
          { id: 'FD-ACADEMIC-048', label: '所属校区', type: '下拉', length: '已启用校区', required: '是', note: '教学楼必须归属一个校区' },
          { id: 'FD-ACADEMIC-049', label: '教学楼名称', type: '文本', length: '≤ 30 字', required: '是', note: '同一校区内唯一', constraints: { maxLength: 30 } },
          { id: 'FD-ACADEMIC-050', label: '教学楼状态', type: '单选', length: '启用 / 停用', required: '是', note: '停用后下级教室不可用于新排课' }
        ] },
        { heading: '教室档案字段', fields: [
          { id: 'FD-ACADEMIC-001', label: '所属校区', type: '下拉', length: '已启用校区', required: '是', note: '教室归属校区' },
          { id: 'FD-ACADEMIC-002', label: '教学楼', type: '下拉', length: '所选校区下已启用教学楼', required: '是', note: '教室所在教学楼' },
          { id: 'FD-ACADEMIC-003', label: '教室名称', type: '文本', length: '≤ 30 字', required: '是', note: '如 综合楼302', constraints: { maxLength: 30 } },
          { id: 'FD-ACADEMIC-004', label: '场地类型', type: '下拉', length: '预置类型', required: '是', note: '决定可排课的课程类型' },
          { id: 'FD-ACADEMIC-005', label: '容量', type: '数字', length: '≥ 1 的整数', required: '是', note: '可容纳人数，用于排课容量校验' },
          { id: 'FD-ACADEMIC-006', label: '设备标签', type: '文本', length: '≤ 50 字', required: '否', note: '如 镜面墙 / 音响', constraints: { maxLength: 50 } },
          { id: 'FD-ACADEMIC-007', label: '场地状态', type: '下拉', length: '启用 / 停用', required: '是', note: '停用后不可新增排课' }
        ] }
      ],
      notes: [
        '场地管理按校区、教学楼、教室三级档案维护，下级必须引用有效上级。',
        '校区下存在教学楼或教室时不可删除；教学楼下存在教室时不可删除，只能停用。',
        '容量用于排课时的教室推荐与容量提示。',
        '停用场地不影响已发布课次，仅阻止新增排课。',
        '排课时只使用状态为启用的场地；停用教室的历史课次仍可查询。',
        '批量导入按模板校验，失败行不建档并给出逐行原因。',
        '导入按“教学楼 + 教室名称”去重；已存在的教室只更新类型与容量，不覆盖启用状态。',
        '选择文件时按文件内容导入，未选择文件则使用粘贴内容。'
      ]
    },

    'academic/messages': {
      groups: [
        { heading: '发送通知字段', fields: [
          { id: 'FD-ACADEMIC-008', label: '通知类型', type: '下拉', length: '预置类型', required: '是', note: '决定通知模板与送达范围' },
          { id: 'FD-ACADEMIC-009', label: '目标班级', type: '下拉', length: '可选班级', required: '是', note: '选定后发送到该班级学员' },
          { id: 'FD-ACADEMIC-010', label: '通知标题', type: '文本', length: '≤ 50 字', required: '是', note: '消息列表标题', constraints: { maxLength: 50 } },
          { id: 'FD-ACADEMIC-012', label: '通知内容', type: '富文本', length: '≤ 2000 字', required: '是', note: '通知正文，支持富文本排版；长度上限按纯文本字数统计，在编辑器内实时提示并阻止超限保存', constraints: { maxLength: 2000, richText: true } },
          { id: 'FD-ACADEMIC-039', label: '发送方式', type: '单选', length: '立即发送 / 定时发送', required: '否', note: '默认立即发送；选择定时发送时必须填写发送时间', constraints: { options: ['立即发送', '定时发送'] } },
          { id: 'FD-ACADEMIC-011', label: '发送时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '定时发送时必填', note: '发送方式为定时发送时必填', constraints: { format: 'YYYY-MM-DD HH:mm', requiredWhen: 'FD-ACADEMIC-039=定时发送' } },
          { id: 'FD-ACADEMIC-013', label: '发送范围', type: '单选', length: '全部学员 / 仅在读学员', required: '是', note: '决定接收人范围' }
        ] }
      ],
      notes: [
        '通知发送后可在列表中查看送达与阅读状态。',
        '发送失败可在列表中补发，补发不重复计入送达数。',
        '通知面向教师和学员发送上课提醒、停课与调课通知。',
        '通知仅发送给目标范围内当前可用的账号。'
      ]
    },
    // CR-2026-043：排课只引用已有 class_id，班级和招生字段只读带入。
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
