// 课程中心字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。

// CR-2026-012：课程展示信息六个字段按性质分流，规格只在这里定义一次。
//   教学属性（难度等级、适合年龄）：教师申报填写 → 后台编排带出可改 → 写入课程档案（CR-2026-014）。
//   运营素材（课程封面、图文详情、课程标签、C 端推荐语）：发布视频商品 / 发布面授班级时维护，写入课程档案。
// 需要引用这两个数组的页面用 courseFieldRows() 生成带本页唯一编号的字段行，不要复制定义。
export const COURSE_TEACHING_FIELDS = [
  { label: '难度等级', type: '下拉', length: '启蒙 / 初级 / 中级 / 高级 / 考级冲刺', required: '是', note: '教学属性，教师申报时维护；后台编排可修改，发布环节只读带入', constraints: { options: ['启蒙', '初级', '中级', '高级', '考级冲刺'] } },
  { label: '适合年龄', type: '多选', length: '全年龄段 / 少儿 / 青少年 / 成人', required: '是', note: '教学属性，教师申报时维护；后台编排可修改，发布环节只读带入', constraints: { options: ['全年龄段', '少儿', '青少年', '成人'], multi: true } }
];

export const COURSE_DISPLAY_FIELDS = [
  { label: '课程封面', type: '图片上传', length: '单个图片', required: '完整课程首次发布必填', note: '课程级存储；完整课程首次发布必填，轻量课程档案可选填，未上传时使用系统默认封面', constraints: { maxFiles: 1, image: true } },
  { label: '图文详情', type: '富文本', length: '≤ 2000 字', required: '否', note: '课程级存储，学员端课程详情展示', constraints: { maxLength: 2000, richText: true } },
  { label: '课程标签', type: '标签输入', length: '单个标签 ≤ 12 字', required: '否', note: '课程级存储，列表卡片与详情页展示' },
  { label: 'C 端推荐语', type: '文本', length: '≤ 30 字', required: '否', note: '课程级存储，学员端展示的推荐语', constraints: { maxLength: 30 } }
];

// 页面字段表要求编号在本页唯一：引用共享定义时按页前缀与起始序号生成当前页的行。
export const courseFieldRows = (prefix, startIndex, fields, override = {}) => fields.map((field, index) => ({
  ...field,
  ...override,
  id: `FD-${prefix}-${String(startIndex + index).padStart(3, '0')}`
}));

export const COURSE_FIELD_SPEC = {
  module: '课程中心',
  pages: {
    // 说明：门类/分类/专业三级共用同一张表单。此前的 FD-COURSE-001（门类名称）、
    // FD-COURSE-004（分类名称）、FD-COURSE-005（专业名称）已随合并下线，编号不再复用；
    // 图标与排序保留原编号，新增的层级/名称/上级节点另分配未占用编号。
    'courses/catalog': {
      groups: [
        { heading: '目录字段', fields: [
          { id: 'FD-COURSE-026', label: '目录层级', type: '单选', length: '门类 / 分类 / 专业', required: '是', note: '由入口决定：新增门类、新增分类、新增专业分别对应三级', constraints: { options: ['门类', '分类', '专业'] } },
          { id: 'FD-COURSE-027', label: '名称', type: '文本', length: '2–30 字', required: '是', note: '门类如“音乐类”、分类如“键盘乐器”、专业如“钢琴”', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-COURSE-028', label: '上级节点', type: '下拉', length: '按层级选择门类或分类', required: '门类外必填', note: '分类挂到门类，专业挂到分类；门类没有上级', constraints: { dictionary: '目录树' } },
          { id: 'FD-COURSE-002', label: '图标', type: '文本', length: '≤ 20 字', required: '否', note: '仅门类使用，小程序端展示', constraints: { maxLength: 20 } },
          { id: 'FD-COURSE-003', label: '排序', type: '数字', length: '0 及以上整数', required: '否', note: '同级内数字越小越靠前', constraints: { min: 0, integer: true } }
        ] }
      ],
      notes: [
        '目录为门类 → 分类 → 专业三级，三级共用一张表单，按当前层级显示上级节点。',
        '后台列表按目录树展示，可逐级展开查看分类与专业。',
        '专业是全系统课程、资源和排课的引用来源。',
        '已被课程或教师引用的目录不允许直接删除，需先停用。',
        '所有引用专业的功能均按同一目录取值，不在模块内单独维护。'
      ]
    },
    'courses/application-review': {
      groups: [
        { heading: '审批字段', fields: [
          { id: 'FD-COURSE-031', label: '申报内容', type: '只读', length: '—', required: '系统展示', note: '展示完整申报信息，含教师信息与课程信息', constraints: { readOnly: true, system: true } },
          { id: 'FD-COURSE-032', label: '审批结果', type: '单选', length: '通过 / 驳回', required: '是', note: '决定课程是否进入课程库', constraints: { options: ['通过', '驳回'] } },
          { id: 'FD-COURSE-006', label: '审批意见', type: '多行文本', length: '≤ 500 字', required: '驳回时必填', note: '填写后同步给申报人', constraints: { maxLength: 500 } },
          { id: 'FD-COURSE-033', label: '审批备注', type: '文本', length: '≤ 200 字', required: '否', note: '内部备注，不同步给申报人', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '通过后课程进入课程库；驳回后申报人可修改并重新提交。',
        '审批记录保留审批人、审批时间与意见。',
        '审批不改变课程申报的量纲与编号规则。',
        '通过时可填写备注；驳回时必须填写原因。'
      ]
    },
    'courses/resources': {
      groups: [
        { heading: '上传资源字段', fields: [
          { id: 'FD-COURSE-007', label: '资源文件', type: '文件上传', length: '单个文件', required: '是', note: '支持图片、音频、视频或文档' },
          { id: 'FD-COURSE-008', label: '资源名称', type: '文本', length: '≤ 50 字', required: '是', note: '填写资源名称', constraints: { maxLength: 50 } },
          { id: 'FD-COURSE-009', label: '资源类型', type: '下拉', length: '预置类型', required: '是', note: '决定资源在课程编排中的用途' },
          { id: 'FD-COURSE-010', label: '所属专业', type: '下拉', length: '专业目录', required: '是', note: '按专业目录引用' },
          { id: 'FD-COURSE-011', label: '适用等级', type: '下拉', length: '预置等级', required: '是', note: '用于筛选与编排' },
          { id: 'FD-COURSE-012', label: '资源简介', type: '多行文本', length: '≤ 500 字', required: '否', note: '填写资源简介', constraints: { maxLength: 500 } },
          { id: 'FD-COURSE-013', label: '标签', type: '文本', length: '≤ 50 字', required: '否', note: '多个标签用逗号分隔', constraints: { maxLength: 50 } },
          { id: 'FD-COURSE-014', label: '允许下载', type: '开关', length: '是 / 否', required: '否', note: '决定学员端是否可下载' },
          { id: 'FD-COURSE-015', label: '可见范围', type: '下拉', length: '预置范围', required: '是', note: '决定哪些端可见' }
        ] }
      ],
      notes: [
        '资源按专业目录引用，专业变更后需重新校验适用性。',
        '资源被课程引用后需先解除引用才能删除。',
        '上传后的文件版本独立留存，替换不覆盖历史版本。'
      ]
    },
    // 课程内容编排：章节 → 课时两层结构。两层的字段分属不同表单，分开成组呈现。
    // 课程展示信息：**不设独立页面键**（GT-12／PC-06：并入两个发布表单，不新增页面）。
    // 六个展示字段只在文件顶部 COURSE_TEACHING_FIELDS / COURSE_DISPLAY_FIELDS 定义一次，
    // 由 spec/fields/mall.js（mall/products）与 spec/fields/crm.js（crm/classes）用 courseFieldRows() 引用，
    // 避免同一字段组三处维护（总控 2026-09-16 v1.40 登记的同源残留）。


    'courses/library': {
      groups: [
        { heading: '新建轻量课程档案字段', fields: [
          { id: 'FD-COURSE-016', label: '课程名称', type: '文本', length: '2–30 字', required: '是', note: '轻量档案名称，用于快速报名班级', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-COURSE-017', label: '所属专业', type: '下拉', length: '专业目录', required: '是', note: '按专业目录引用' },
          { id: 'FD-COURSE-018', label: '课程类型', type: '文本（只读）', length: '面授课程', required: '系统固定', note: '轻量档案仅用于面授快速报名', constraints: { system: true, readOnly: true } },
          { id: 'FD-COURSE-019', label: '总课时', type: '数字', length: '≥ 1 的整数', required: '是', note: '单位：课次数' },
          { id: 'FD-COURSE-020', label: '简短课程介绍', type: '多行文本', length: '≤ 500 字', required: '是', note: '快速报名详情页展示', constraints: { maxLength: 500 } },
          { id: 'FD-COURSE-030', label: '课程大纲', type: '富文本', length: '≤ 2000 字', required: '否', note: '可选展示内容，不作为教学执行前置条件；教学执行按课次开展', constraints: { maxLength: 2000, richText: true } }
        ] },
        // CR-2026-021：课程内容编排并入课程库，编排工作台字段随页面并入。
        { heading: '教学属性字段（编排）', fields: courseFieldRows('COURSE', 44, COURSE_TEACHING_FIELDS) },
        { heading: '章节字段（编排）', fields: [
          { id: 'FD-COURSE-034', label: '章节名称', type: '文本', length: '≤ 50 字', required: '是', note: '如“第 1 章：身韵元素训练”', constraints: { maxLength: 50 } },
          { id: 'FD-COURSE-035', label: '章节描述', type: '多行文本', length: '≤ 200 字', required: '否', note: '填写章节的教学重点', constraints: { maxLength: 200 } },
          { id: 'FD-COURSE-036', label: '排序', type: '数字 / 拖拽', length: '≥ 1 的整数', required: '否', note: '决定章节在课程内的先后顺序', constraints: { min: 1, integer: true } }
        ] },
        { heading: '课时字段（编排）', fields: [
          { id: 'FD-COURSE-037', label: '课时名称', type: '文本', length: '≤ 50 字', required: '是', note: '如“站姿与脚位”', constraints: { maxLength: 50 } },
          { id: 'FD-COURSE-038', label: '课时序号', type: '数字', length: '≥ 1 的整数', required: '是', note: '决定课时在章节内的先后顺序，可拖拽调整', constraints: { min: 1, integer: true } },
          { id: 'FD-COURSE-039', label: '课时目标', type: '文本', length: '≤ 100 字', required: '是', note: '本课时可达成、可验收的教学目标', constraints: { maxLength: 100 } },
          { id: 'FD-COURSE-040', label: '课时时长（分钟）', type: '数字', length: '45 / 60 / 90 / 120 / 150', required: '是', note: '一个课时对应一个课次；默认 45 分钟', constraints: { options: [45, 60, 90, 120, 150] } },
          { id: 'FD-COURSE-041', label: '课时类型', type: '下拉', length: '理论 / 示范 / 练习 / 综合', required: '是', note: '决定课时的教学形式', constraints: { options: ['理论', '示范', '练习', '综合'] } },
          { id: 'FD-COURSE-042', label: '内容描述', type: '多行文本', length: '≤ 500 字', required: '否', note: '填写教学内容和执行提示', constraints: { maxLength: 500 } },
          { id: 'FD-COURSE-043', label: '引用资源', type: '资源选择器', length: '至少 1 个资源', required: '视频课程必填', note: '视频课程所有课时必须关联至少一个视频资源才能完成编排；面授课程可选', constraints: { minItems: 1, requiredWhen: 'courseType=video' } }
        ] }
      ],
      notes: [
        '编排工作台按“章节 → 课时”两层结构维护，章节可增删改并拖拽排序，课时挂在章节下。',
        '编排保存后直接生效，不设二次审核；完成编排后课程进入课程库。',
        '视频课程完成编排前强制校验每个课时都关联了视频资源；面授课程的资源关联为可选。',
        '面授课程完成编排时校验课时总数等于申报总课时，不一致时阻止完成并提示补齐或删除。',
        '轻量课程档案只用于快速报名班级，不进入课程内容编排。',
        '课程库记录来源课程编号，与课程中心的内容编排相互独立。',
        '课程库区分完整课程与轻量课程档案：完整课程需完成编排后才能发布商品或班级，轻量档案只用于快速报名班级。',
        '封面、难度等级、适合年龄、图文详情、课程标签和 C 端推荐语在「课程展示信息」维护，完整课程与轻量课程共用。'
      ]
    }
  }
};
