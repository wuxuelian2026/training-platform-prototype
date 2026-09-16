// 面授招生与CRM字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。
import { COURSE_DISPLAY_FIELDS, COURSE_TEACHING_FIELDS, courseFieldRows } from './courses.js';

export const CRM_FIELD_SPEC = {
  module: '面授招生与CRM',
  pages: {
    // 表单结构：单表。发布班级只负责招生侧的定价、报名窗口与前台展示，字段少且无排课动作；
    // 入口在班级列表按行触发，班级、教师、教室与排课配置由教务的「创建班级」维护。
    'crm/classes': {
      groups: [
        { heading: '发布班级字段', fields: [
          { id: 'FD-CRM-013', label: '课程定价', type: '金额', length: '大于 0', required: '是', note: '报名支付金额', constraints: { exclusiveMin: 0 } },
          { id: 'FD-CRM-036', label: '试听是否收费', type: '开关', length: '是 / 否', required: '否', note: '默认免费' },
          { id: 'FD-CRM-037', label: '报名开始时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '开始时间之前不可报名', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-CRM-014', label: '报名截止时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '截止后不再接受报名；需晚于报名开始时间', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-CRM-015', label: '快速报名入口', type: '开关', length: '是 / 否', required: '是', note: '决定前台展示入口：是→快速报名 Tab，否→课表入口；不改变课程关联' },
          { id: 'FD-CRM-038', label: '发布方式', type: '单选', length: '立即发布 / 定时发布 / 仅保存', required: '否', note: '默认仅保存；选择定时发布需指定发布时间', constraints: { options: ['立即发布', '定时发布', '仅保存'] } },
          { id: 'FD-CRM-039', label: '前台展示状态', type: '只读', length: '未发布 / 已发布', required: '系统计算', note: '仅保存为未发布；立即发布或定时发布到点后为已发布', constraints: { readOnly: true, system: true } },
          // CR-2026-020：教学属性只读带入；运营四字段写在该班级记录自身。
          ...courseFieldRows('CRM', 46, COURSE_TEACHING_FIELDS, { type: '文本（只读）', required: '系统继承', note: '完整课程取自申报与编排链路，轻量课程档案取档案弹窗，发布班级时只读', constraints: { readOnly: true, derived: true } }),
          ...courseFieldRows('CRM', 48, COURSE_DISPLAY_FIELDS)
        ] }
      ],
      notes: [
        '发布班级由招生在班级列表按行触发，只能对状态为“未发布”的班级操作；班级本身由教务的「创建班级」维护，本表单不创建班级。',
        '班级运营状态与前台展示状态分别维护，快速报名开关只决定学员端入口，不改变班级归属。',
        '发布后班级状态由“未发布”转为“招生中”，并开放报名入口。',
        '名额以支付成功为占用时点，不以进入支付页或创建订单为准。',
        '支付成功后自动分配所选班级，不设置人工待分班。',
        '报名截止时间之后不再接受新的报名或支付。',
        '课程封面、图文详情、课程标签与 C 端推荐语写在该班级记录自身（售卖单元级存储），不写入课程档案；字段定义与发布商品共用同一份规格。',
        '完整课程首次发布必须上传课程封面；轻量课程档案的课程封面可选填。同一班级二次发布时运营四字段只读带入，修改只影响本班级；同一课程的其他班级不受影响。'
      ]
    },
    'crm/leads': {
      groups: [
        { heading: '新增线索字段', fields: [
          { id: 'FD-CRM-016', label: '联系人', type: '文本', length: '2–30 字', required: '是', note: '线索联系人姓名', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-CRM-017', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '用于跟进与转化', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-CRM-018', label: '意向课程', type: '文本', length: '≤ 50 字', required: '否', note: '记录意向方向，便于分配课程顾问', constraints: { maxLength: 50 } },
          { id: 'FD-CRM-019', label: '来源类型', type: '下拉', length: '预置来源', required: '否', note: '记录线索来源渠道' }
        ] }
      ],
      notes: [
        '线索可继续流转为试听或直接报名，流转过程保留历史记录。',
        '填写跟进后记录跟进时间、跟进人和跟进内容。'
      ]
    },
    'crm/trials': {
      groups: [
        { heading: '登记试听字段', fields: [
          { id: 'FD-CRM-020', label: '学员姓名', type: '文本', length: '2–30 字', required: '是', note: '试听学员姓名', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-CRM-021', label: '家长手机号', type: '文本', length: '11 位数字', required: '是', note: '用于联系与后续转化', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-CRM-022', label: '目标课程', type: '文本', length: '≤ 50 字', required: '否', note: '试听意向课程', constraints: { maxLength: 50 } },
          { id: 'FD-CRM-023', label: '试听时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '需与教师课表不冲突', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-CRM-024', label: '试听校区', type: '下拉', length: '预置校区', required: '否', note: '试听发生校区' },
          { id: 'FD-CRM-025', label: '试听教师', type: '下拉', length: '可选教师', required: '否', note: '需满足该专业可排课条件' },
          { id: 'FD-CRM-026', label: '学员年龄', type: '文本', length: '≤ 20 字', required: '否', note: '登记试听学员年龄，用于匹配合适班级', constraints: { maxLength: 20 } },
          { id: 'FD-CRM-027', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填，记录试听安排或特殊说明', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '试听登记后可确认试听并转为报名，流转过程保留记录。',
        '试听由课程顾问根据咨询线索登记，学员端不提供自主预约入口。',
        '试听教师需满足该专业可排课条件；资质或合同不满足时不可安排。'
      ]
    }
  }
};
