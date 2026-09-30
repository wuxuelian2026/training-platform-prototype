// 面授运营与CRM管理字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。
import { COURSE_DISPLAY_FIELDS, COURSE_TEACHING_FIELDS, courseFieldRows } from './courses.js';

export const CRM_FIELD_SPEC = {
  module: '面授运营 / CRM管理',
  pages: {
    // CR-2026-043：面授班级只维护班级主体、招生和展示信息，教学排课在 面授班级的排课抽屉 完成。
    'crm/classes': {
      groups: [
        { heading: '关联课程', fields: [
          { id: 'FD-CRM-052', label: '关联课程', type: '下拉', length: '必选 1 门', required: '是', note: '只能选择已完成编排的面授课程' },
          { id: 'FD-CRM-054', label: '课程基本信息', type: '只读信息组', length: '8 项', required: '系统继承', note: '课程编号、名称、类型、专业、申报教师、总课时、难度、适合年龄', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-055', label: '课程大纲', type: '只读结构', length: '章节 + 课时', required: '系统继承', note: '展示关联版本的章节和课时，班级页不可修改', constraints: { readOnly: true, derived: true } }
        ] },
        { heading: '班级与招生', fields: [
          { id: 'FD-CRM-056', label: '班级名称', type: '文本', length: '2–50 字', required: '是', note: '招生列表和课表中的班级名称', constraints: { minLength: 2, maxLength: 50 } },
          { id: 'FD-CRM-057', label: '所属批次', type: '下拉', length: '读取批次管理列表', required: '是', note: '选项读取「批次管理」列表的批次名称，班级同时记录批次 ID 与名称（CR-2026-075）' },
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
          { id: 'FD-CRM-074', label: '是否推荐', type: '开关', length: '是 / 否', required: '否', note: '仅展示状态为“显示”时生效；控制班级是否进入学员端首页“面授课程招生”，不改变招生、展示或快速报名状态', constraints: { default: false } },
          // CR-2026-020：教学属性只读带入；运营四字段写在该班级记录自身。
          ...courseFieldRows('CRM', 46, COURSE_TEACHING_FIELDS, { type: '文本（只读）', required: '系统继承', note: '课程基本信息与课程大纲取自关联课程，发布班级时只读，不在班级表单内编辑', constraints: { readOnly: true, derived: true } }),
          ...courseFieldRows('CRM', 48, COURSE_DISPLAY_FIELDS)
        ] },
        { heading: '排课工作台 · 第 1 步 选择已有班级', fields: [
          { id: 'FD-ACADEMIC-014', label: '已有班级', type: '下拉', length: '必选 1 个 class_id', required: '是', note: '从面授班级选择，不在排课页新建班级' },
          { id: 'FD-ACADEMIC-031', label: '课程与版本', type: '文本（只读）', length: '—', required: '系统继承', note: '由班级锁定的 course_id + course_version 带入', constraints: { readOnly: true, derived: true } },
          { id: 'FD-ACADEMIC-015', label: '班级名称', type: '文本（只读）', length: '≤ 50 字', required: '系统继承', note: '由 class_id 带入，不可在排课页修改', constraints: { readOnly: true, derived: true } },
          { id: 'FD-ACADEMIC-016', label: '批次与容量', type: '文本（只读）', length: '—', required: '系统继承', note: '由班级招生配置带入', constraints: { readOnly: true, derived: true } },
          { id: 'FD-ACADEMIC-033', label: '总课时', type: '只读', length: '正整数', required: '系统继承', note: '取班级所引用课程在课程库的总课时（课时以课程库为准），一个课时对应一个课次，已排课时课次数等于总课时（CR-2026-127）', constraints: { readOnly: true, min: 1, integer: true } }
        ] },
        { heading: '排课工作台 · 第 2 步 教师与场地', fields: [
          { id: 'FD-ACADEMIC-017', label: '授课教师', type: '下拉', length: '可选教师', required: '是', note: '需满足该专业可排课条件' },
          { id: 'FD-ACADEMIC-018', label: '授课校区', type: '下拉', length: '预置校区', required: '是', note: '与教室需匹配' },
          { id: 'FD-ACADEMIC-034', label: '授课教学楼', type: '下拉', length: '预置楼栋', required: '是', note: '关联该校区下的教学楼' },
          { id: 'FD-ACADEMIC-019', label: '授课教室', type: '下拉', length: '预置教室', required: '是', note: '关联该教学楼下的教室，需满足容量与时间无冲突' },
          { id: 'FD-ACADEMIC-025', label: '招生容量', type: '只读', length: '正整数', required: '系统继承', note: '来自班级；发布时校验教室容量不得小于该值', constraints: { readOnly: true, derived: true } }
        ] },
        { heading: '排课工作台 · 第 3 步 排课配置', fields: [
          { id: 'FD-ACADEMIC-020', label: '每周上课日', type: '复选框组', length: '至少 1 天', required: '是', note: '决定课次重复规则；多选后每个上课日生成独立时间组' },
          { id: 'FD-ACADEMIC-022', label: '上课开始时间', type: '按上课日重复的时间', length: 'HH:mm', required: '每个已选上课日必填', note: '每个上课日独立维护；按 15 分钟刻度吸附，范围 08:00–21:00', constraints: { format: 'HH:mm' } },
          { id: 'FD-ACADEMIC-023', label: '单次课时长', type: '下拉', length: '45 / 60 / 90 / 120 / 150 分钟', required: '是', note: '所有上课日公用；默认 45 分钟；一个课时对应一个课次' },
          { id: 'FD-ACADEMIC-024', label: '上课结束时间', type: '按上课日重复的时间（自动计算）', length: 'HH:mm', required: '系统计算', note: '每个上课日均由该日开始时间加公用单次课时长计算，只读', constraints: { format: 'HH:mm', system: true, readOnly: true } },
          { id: 'FD-ACADEMIC-021', label: '首次上课日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '决定首次课次日期', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-ACADEMIC-036', label: '末次上课日期', type: '只读', length: 'YYYY-MM-DD', required: '系统计算', note: '取全部课次中最晚的日期（CR-2026-138 无停课与取消状态）；课次调整、增删课次后自动重算，不是发布时锁定的快照；结业后不再变化', constraints: { readOnly: true, derived: true, format: 'YYYY-MM-DD' } }
        ] },
        { heading: '排课工作台 · 第 4 步 冲突校验', fields: [
          { id: 'FD-ACADEMIC-037', label: '教师时间冲突', type: '只读', length: '无冲突 / 冲突', required: '系统计算', note: '校验所选教师在全部课次上是否已有排课', constraints: { readOnly: true, system: true } },
          { id: 'FD-ACADEMIC-038', label: '教室时间冲突', type: '只读', length: '无冲突 / 冲突', required: '系统计算', note: '校验所选教室在全部课次上是否已被占用', constraints: { readOnly: true, system: true } }
        ] },
        { heading: '学籍异动', fields: [
          { id: 'FD-CRM-091', label: '异动类型', type: '枚举', length: '退班 / 转班 / 退学', required: '是', note: '班级名册唯一变更入口；转班需选转入班级', constraints: { enum: ['退班','转班','退学'] } },
          { id: 'FD-CRM-092', label: '异动原因', type: '多行文本', length: '≤ 200 字', required: '是', note: '写入异动记录，必填', constraints: { maxLength: 200 } },
          { id: 'FD-CRM-093', label: '转入班级', type: '下拉', length: '转班时必填', required: '转班时必填', note: '目标班级 class_id；退班/退学不填', constraints: { requiredIf: "type='转班'" } },
          { id: 'FD-CRM-094', label: '同步退费', type: '开关', length: '是 / 否', required: '否', note: '退班/退学可开启；金额等于订单实收全额（全额终结口径，申请窗口与最大已消课比例仅作资格判定、不参与金额计算），财务审批为准；不受自助窗口与消课上限拦截', constraints: { enum: ['是','否'] } },
          { id: 'FD-CRM-095', label: '异动记录', type: '列表（只读）', length: 'enrollmentChanges', required: '系统生成', note: '含类型/原因/转入班级/退费关联/操作人与时间', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-096', label: '名册异动后状态', type: '派生状态', length: '已退班 / 已转班 / 已退学', required: '系统派生', note: 'isEnrollmentActive=false 者不计入名册与作业提交率分母', constraints: { readOnly: true, derived: true } }
        ] },
      ],
      notes: [
        '创建和编辑面授班级使用“关联课程／班级与招生／展示信息”三段式工作台，保存后生成唯一 class_id 并进入“待排课”。',
        '授课教师、校区、教室和上课规则统一在班级排课维护；本页不生成正式课次。',
        '列表按阶段1 排课／阶段2 招生／阶段3 教学三个页签组织（?stage= 深链）；招生阶段只承载排课已完成的班级，教学阶段只承载排课已完成且招生已结束的班级，指标卡按当前阶段统计对应状态的班级数。',
        '班级运营主状态为 6 值单向链——待排课／待发布／招生中／进行中／已结束／已取消，只用于建班表单与详情“班级与招生”面板的“班级状态”字段；列表展示三阶段派生值，两者不得合并为同一条取值链。',
        '招生阶段派生招生状态（未开始／进行中／已结束）与名额已满（是／否），展示状态（显示／隐藏）独立维护；三者均不落库，后台与学员端“已满员”来自同一次派生。',
        '班级是否可见与是否可报名由已发布排班、报名窗口、剩余名额、人工关闭与取消状态统一派生，不改写阶段派生值与主状态字段。',
        '名额以支付成功为占用时点，不以进入支付页或创建订单为准。',
        '支付成功后自动分配所选班级，不设置人工待分班。',
        '报名截止时间之后不再接受新的报名或支付。',
        '是否推荐是独立展示属性：关闭后仅移出学员端首页栏目；课程列表、快速报名列表和报名能力不受影响。班级展示状态为隐藏时，首页、快速报名列表与可报班级数均不展示该班级，但保留推荐值。',
        '课程封面、图文详情、课程标签与 C 端推荐语写在该班级记录自身（售卖单元级存储），不写入课程档案；字段定义与发布商品共用同一份规格。',
        '创建班级时可保存展示信息；确认并发布排班前必须具备封面。展示信息修改只影响本班级。',
        '班级详情使用“班级与招生／关联课程／展示信息／状态与教学／学员与记录”五个只读页签；编辑使用同源三段式工作台（关联课程／班级与招生／展示信息）。',
        '排课工作台：面授班级是唯一建班入口；班级排课必须引用已有 class_id，不得生成新的班级主体。',
        '排课工作台：保存草稿后状态为“排班草稿”，不生成正式课次且学员端不可见；确认并发布后一次生成全部课次。',
        '排课工作台：排班页实时预览课次与资源冲突；矩阵空位只能带入场地与时段，仍须选择已有待排班班级。',
        '排课工作台：时间默认吸附到最近的 15 分钟刻度；偏离刻度时强制提示修正后再保存。',
        '排课工作台：教师、教室或时段存在冲突时必须先修正，修正后才允许发布。',
        '排课工作台：一次课就是一个课次，课时费按课次数计算。',
        '排课工作台：末次上课日期取全部课次中最晚的日期（CR-2026-138 无停课与取消状态），随课次变动重算，结业后不再变化。',
        '排课工作台：同一班级的多个上课日共用同一开始时间、课时时长与教室。'
      ]
    },
    'crm/leads': {
      groups: [
        { heading: '线索字段（新增与编辑共用）', fields: [
          { id: 'FD-CRM-016', label: '联系人', type: '文本', length: '2–30 字', required: '是', note: '线索联系人姓名', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-CRM-017', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '用于跟进与转化；编辑时唯一校验排除自身，改号只更新线索主档，历史试听与订单的手机号快照不变', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-CRM-018', label: '意向课程', type: '课程库引用', length: '必选 1 门面授课程', required: '是', note: '保存 course_id 与课程名称；仅允许选择课程库中已完成且未停用的面授课程', constraints: { dictionary: '课程库', required: true } },
          { id: 'FD-CRM-097', label: '关联班级', type: '班级库引用', length: '最多 1 个班级', required: '否', note: '只展示所选意向课程下当前可报名且已发布的班级', constraints: { dictionary: '面授班级' } },
          { id: 'FD-CRM-098', label: '关联教师', type: '只读派生', length: '—', required: '系统派生', note: '取关联班级授课教师，不允许手工输入', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-099', label: '意向备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '记录学习目标、时间偏好等销售备注', constraints: { maxLength: 200 } },
          { id: 'FD-CRM-019', label: '来源类型', type: '下拉', length: '线上咨询 / 后台登记 / 转介绍 / 活动', required: '否（编辑时只读）', note: '记录线索来源渠道；与试听登记使用同一套预置来源，不再出现“咨询／后台登记试听”两套写法', constraints: { options: ['线上咨询', '后台登记', '转介绍', '活动'] } },
          { id: 'FD-CRM-075', label: '线索标签', type: '多选', length: '最多 5 个', required: '否', note: '固定标签用于销售分层与筛选，不参与线索状态流转', constraints: { options: ['高意向', '待回访', '试听后待转化', '价格敏感', '已流失待激活'], multi: true, maxItems: 5 } },
          { id: 'FD-CRM-083', label: '报名转化漏斗', type: '统计（只读）', length: '当前线索 / 有效跟进 / 已试听 / 已报名', required: '系统派生', note: 'CR-2026-152 起合并到线索跟进页：展示各阶段数量、相对当前线索占比与相邻阶段转化率，不支持编辑', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-102', label: '流失原因', type: '多行文本', length: '≤ 100 字', required: '标记流失时必填', note: 'CR-2026-153 编辑线索「线索结果」内维护：选择标记为已流失时校验必填，记录流失原因与时间', constraints: { maxLength: 100, requiredWhen: 'markLost' } },
        ] }
      ],
      notes: [
        '线索可继续流转为试听或直接报名，流转过程保留历史记录。',
        '填写跟进后记录跟进时间、跟进人和跟进内容。',
        'CR-2026-038：线索状态与试听状态由状态源统一登记；线索“已转化”保留销售历史，转化列表“已报名”仅由当前有效已支付面授订单派生，退款后不再计入。',
        '同一手机号只保留一条主线索；已流失线索通过重新激活恢复，不重新建档，意向变化记录在跟进记录中。',
        'CR-2026-038：线索详情展示该线索名下的试听记录与报名结果，形成完整链条。'
        ,'P2：线索标签仅用于销售分层、筛选和详情识别，不改变 `SM-LEAD` 状态；标签取固定枚举，最多 5 个，可在列表行操作中维护。'
        ,'历史仅有课程文本的线索标记为 unmatched；试听和转报名必须先补齐课程库关联，不得直接选择任意班级。'
        ,'CR-2026-152：原独立的报名转化页并入本页，页面顶部增加只读「报名转化漏斗」派生区（当前线索／有效跟进／已试听／已报名四阶段与相邻阶段转化率），不新增状态机与独立数据。'
        ,'CR-2026-153：原「变更意向」「标记流失」「编辑标签」三个动作合并为统一「编辑线索」表单，字段包含意向课程、线索标签与线索结果；变更意向不再要求填写变更原因（2026-09-29 客户现场裁定去掉该字段），标记流失需 `PERM-CRM-007` 且流失原因为必填。'
      ]
    },
    'crm/trials': {
      groups: [
        { heading: '登记试听字段', fields: [
          { id: 'FD-CRM-072', label: '来源线索编号', type: '下拉', length: '线索编号', required: '是', note: '试听记录必须关联来源线索；由线索发起试听登记时自动带入，直接登记试听时需选择来源线索', constraints: { dictionary: '线索' } },
          { id: 'FD-CRM-020', label: '学员姓名', type: '只读派生', length: '—', required: '系统继承', note: '取来源线索联系人，不允许在试听记录中改写', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-021', label: '家长手机号', type: '只读派生', length: '—', required: '系统继承', note: '取来源线索手机号，不允许在试听记录中改写', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-022', label: '目标课程', type: '课程库引用（只读）', length: '—', required: '系统继承', note: '取来源线索课程库关联，不允许自由文本输入', constraints: { readOnly: true, derived: true } },
          { id: 'FD-CRM-100', label: '试听班级', type: '班级库引用', length: '最多 1 个班级', required: '系统继承', note: '取线索关联班级；直接登记时由课程关联班级补充', constraints: { derived: true } },
          { id: 'FD-CRM-023', label: '试听时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '需与教师课表不冲突', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-CRM-024', label: '试听校区', type: '下拉', length: '预置校区', required: '否', note: '试听发生校区' },
          { id: 'FD-CRM-025', label: '试听教师', type: '只读派生', length: '—', required: '系统继承', note: '取试听班级授课教师，不允许手工输入', constraints: { readOnly: true, derived: true } },
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
        ,'试听登记由服务端最终校验同一线索同一时间重复记录、同一教师同一时间重复安排、教师既有课次冲突及教师专业资质；冲突时阻止保存并保留表单。'
        ,'试听取消必须填写取消原因，取消记录保留且不恢复；再次试听需新建记录。'
        ,'转报名按线索幂等，只展示当前可报名班级；存在待支付、已支付或退款中的面授订单时禁止重复创建待支付订单。'
      ]
    },
    'crm/batches': {
      groups: [{ heading: '招生批次列表字段', fields: [
        { id: 'FD-CRM-084', label: '招生季', type: '下拉', length: '春季 / 暑假 / 秋季 / 寒假', required: '否', note: '按固定年度招生季筛选' },
        { id: 'FD-CRM-085', label: '批次状态', type: '下拉', length: '未开始 / 进行中 / 已结束', required: '否', note: '按起止日期实时派生，不提供人工流转' },
        { id: 'FD-CRM-086', label: '关键词', type: '文本', length: '≤ 50 字', required: '否', note: '匹配批次名称', constraints: { maxLength: 50 } },
        { id: 'FD-CRM-087', label: '开始日期', type: '日期（只读）', length: 'YYYY-MM-DD', required: '系统记录', note: '批次起始日期', constraints: { readOnly: true, derived: true, format: 'YYYY-MM-DD' } },
        { id: 'FD-CRM-088', label: '结束日期', type: '日期（只读）', length: 'YYYY-MM-DD', required: '系统记录', note: '批次结束日期', constraints: { readOnly: true, derived: true, format: 'YYYY-MM-DD' } },
        { id: 'FD-CRM-089', label: '关联班级数', type: '统计（只读）', length: '非负整数', required: '系统派生', note: '按班级归属实时统计', constraints: { readOnly: true, derived: true, integer: true } },
        { id: 'FD-CRM-090', label: '待排课班级数', type: '统计（只读）', length: '非负整数', required: '系统派生', note: '按关联班级排课状态实时统计', constraints: { readOnly: true, derived: true, integer: true } }
      ] }], notes: ['批次固定为年度四季，由系统生成，不提供新增、删除或人工改状态。']
    }
  }
};
