// 面授运营与CRM管理字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。
import { COURSE_DISPLAY_FIELDS, COURSE_TEACHING_FIELDS, courseFieldRows } from './courses.js';

export const CRM_FIELD_SPEC = {
  module: '面授运营 / CRM管理',
  pages: {
    // CR-2026-043：面授班级只维护班级主体、招生和展示信息，教学排课在 academic/scheduling 完成。
    'crm/classes': {
      groups: [
        { heading: '关联课程', fields: [
          { id: 'FD-CRM-052', label: '关联课程', type: '下拉', length: '必选 1 门', required: '是', note: '只能选择已完成编排的面授课程' },
          { id: 'FD-CRM-054', label: '课程基本信息', type: '只读信息组', length: '8 项', required: '系统继承', note: '课程编号、名称、类型、专业、申报教师、总课时、难度、适合年龄', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-055', label: '课程大纲', type: '只读结构', length: '章节 + 课时', required: '系统继承', note: '展示关联版本的章节和课时，班级页不可修改', constraints: { readOnly: true, derived: true } }
        ] },
        { heading: '班级与招生', fields: [
          { id: 'FD-CRM-056', label: '班级名称', type: '文本', length: '2–50 字', required: '是', note: '招生列表和课表中的班级名称', constraints: { minLength: 2, maxLength: 50 } },
          { id: 'FD-CRM-057', label: '所属批次', type: '下拉', length: '春季 / 暑假 / 秋季 / 寒假', required: '是', note: '班级归属批次' },
          { id: 'FD-CRM-068', label: '招生容量', type: '整数', length: '大于 0', required: '是', note: '支付成功时占用名额', constraints: { min: 1, integer: true } }
        ] },
        { heading: '招生与试听', fields: [
          { id: 'FD-CRM-013', label: '课程定价', type: '金额', length: '大于 0', required: '是', note: '报名支付金额', constraints: { exclusiveMin: 0 } },
          { id: 'FD-CRM-069', label: '是否支持试听', type: '开关', length: '是 / 否', required: '是', note: '关闭后试听收费、价格和说明不生效' },
          { id: 'FD-CRM-036', label: '试听是否收费', type: '开关', length: '是 / 否', required: '否', note: '默认免费' },
          { id: 'FD-CRM-070', label: '试听价格', type: '金额', length: '大于 0', required: '收费试听时必填', note: '关闭试听或免费试听时不保存', constraints: { exclusiveMin: 0 } },
          { id: 'FD-CRM-071', label: '试听说明', type: '多行文本', length: '≤ 200 字', required: '否', note: '说明适用人群与注意事项', constraints: { maxLength: 200 } },
          { id: 'FD-CRM-037', label: '报名开始时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '开始时间之前不可报名', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-CRM-014', label: '报名截止时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '截止后不再接受报名；需晚于报名开始时间', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-CRM-015', label: '快速报名入口', type: '开关', length: '是 / 否', required: '是', note: '决定前台展示入口：是→快速报名 Tab，否→课表入口；不改变课程关联' },
          { id: 'FD-CRM-074', label: '是否推荐', type: '开关', length: '是 / 否', required: '否', note: '仅展示状态为“显示”时生效；控制班级是否进入学员端首页“面授课程招生”，不改变招生、展示或快速报名状态', constraints: { default: false } },
          // CR-2026-020：教学属性只读带入；运营四字段写在该班级记录自身。
          ...courseFieldRows('CRM', 46, COURSE_TEACHING_FIELDS, { type: '文本（只读）', required: '系统继承', note: '课程基本信息与课程大纲取自关联课程的当前引用版本，发布班级时只读，不在班级表单内编辑', constraints: { readOnly: true, derived: true } }),
          ...courseFieldRows('CRM', 48, COURSE_DISPLAY_FIELDS)
        ] }
      ],
      notes: [
        '创建和编辑面授班级使用“关联课程／班级与招生／展示信息”三段式工作台，保存后生成唯一 class_id 并进入“待排课”。',
        '授课教师、校区、教室和上课规则统一在班级排课维护；本页不生成正式课次。',
        'CR-2026-047：主状态为 6 值单向链——待排课／待发布／招生中／进行中／已结束／已取消；容量与报名窗口不参与主链，首次发布后进入“招生中”且不回退。',
        'CR-2026-047：报名条件是仅在“招生中”阶段有效的派生标签（未开始／报名中／已满员／已截止／已关闭），不落库、不进入主状态；后台与学员端“已满员”来自同一次派生。',
        '班级是否可见与是否可报名由已发布排班、报名窗口、剩余名额、人工关闭与取消状态统一派生，不改写主状态字段。',
        '名额以支付成功为占用时点，不以进入支付页或创建订单为准。',
        '支付成功后自动分配所选班级，不设置人工待分班。',
        '报名截止时间之后不再接受新的报名或支付。',
        '是否推荐是独立展示属性：关闭后仅移出学员端首页栏目；班级列表、快速报名列表和报名能力不受影响。班级隐藏时首页自动不展示，但保留推荐值。',
        '课程封面、图文详情、课程标签与 C 端推荐语写在该班级记录自身（售卖单元级存储），不写入课程档案；字段定义与发布商品共用同一份规格。',
        '创建班级时可保存展示信息；确认并发布排班前必须具备封面。展示信息修改只影响本班级。',
        '班级详情使用“班级概览／课程内容／教学安排／招生设置／学员与记录”五页签，详情内容全部只读。'
      ]
    },
    'crm/leads': {
      groups: [
        { heading: '新增线索字段', fields: [
          { id: 'FD-CRM-016', label: '联系人', type: '文本', length: '2–30 字', required: '是', note: '线索联系人姓名', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-CRM-017', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '用于跟进与转化', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-CRM-018', label: '意向课程', type: '文本', length: '≤ 50 字', required: '否', note: '记录意向方向，便于分配课程顾问', constraints: { maxLength: 50 } },
          { id: 'FD-CRM-019', label: '来源类型', type: '下拉', length: '线上咨询 / 后台登记 / 转介绍 / 活动', required: '否', note: '记录线索来源渠道；与试听登记使用同一套预置来源，不再出现“咨询／后台登记试听”两套写法', constraints: { options: ['线上咨询', '后台登记', '转介绍', '活动'] } }
        ] }
      ],
      notes: [
        '线索可继续流转为试听或直接报名，流转过程保留历史记录。',
        '填写跟进后记录跟进时间、跟进人和跟进内容。',
        'CR-2026-038：线索状态与试听状态由状态源统一登记，线索状态“已转化”与转化列表中该线索的“已报名”必须一致。',
        'CR-2026-038：线索详情展示该线索名下的试听记录与报名结果，形成完整链条。'
      ]
    },
    'crm/trials': {
      groups: [
        { heading: '登记试听字段', fields: [
          { id: 'FD-CRM-072', label: '来源线索编号', type: '下拉', length: '线索编号', required: '是', note: '试听记录必须关联来源线索；由线索发起试听登记时自动带入，直接登记试听时需选择来源线索', constraints: { dictionary: '线索' } },
          { id: 'FD-CRM-020', label: '学员姓名', type: '文本', length: '2–30 字', required: '是', note: '试听学员姓名', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-CRM-021', label: '家长手机号', type: '文本', length: '11 位数字', required: '是', note: '用于联系与后续转化', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-CRM-022', label: '目标课程', type: '文本', length: '≤ 50 字', required: '否', note: '试听意向课程', constraints: { maxLength: 50 } },
          { id: 'FD-CRM-023', label: '试听时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '需与教师课表不冲突', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-CRM-024', label: '试听校区', type: '下拉', length: '预置校区', required: '否', note: '试听发生校区' },
          { id: 'FD-CRM-025', label: '试听教师', type: '下拉', length: '可选教师', required: '否', note: '需满足该专业可排课条件' },
          { id: 'FD-CRM-026', label: '学员年龄', type: '文本', length: '≤ 20 字', required: '否', note: '登记试听学员年龄，用于匹配合适班级', constraints: { maxLength: 20 } },
          { id: 'FD-CRM-027', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填，记录试听安排或特殊说明', constraints: { maxLength: 200 } }
        ] },
        { heading: '试听来源字段', fields: [
          { id: 'FD-CRM-073', label: '来源', type: '下拉', length: '线上咨询 / 后台登记 / 转介绍 / 活动', required: '否', note: '与线索来源类型共用同一套预置取值', constraints: { options: ['线上咨询', '后台登记', '转介绍', '活动'] } }
        ] }
      ],
      notes: [
        '试听登记后可确认试听并转为报名，流转过程保留记录。',
        '试听由课程顾问根据咨询线索登记，学员端不提供自主预约入口。',
        '试听教师需满足该专业可排课条件；资质或合同不满足时不可安排。',
        'CR-2026-038：试听状态取值以状态源 `SM-TRIAL` 为准；同一试听记录在试听列表与报名转化列表的取值来自同一字段。',
        'CR-2026-038：报名转化页是按线索派生的只读视图，不维护独立数据；其线索状态与试听状态引用 `SM-LEAD`／`SM-TRIAL`，不新增独立状态机。'
      ]
    }
  }
};
