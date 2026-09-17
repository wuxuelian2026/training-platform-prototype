// 商城运营字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。
import { COURSE_DISPLAY_FIELDS, COURSE_TEACHING_FIELDS, courseFieldRows } from './courses.js';

export const MALL_FIELD_SPEC = {
  module: '商城运营',
  pages: {
    // 轮播图表单：简单表单，字段少且无系统校验，合并为一张表。
    // 注意：原型该页目前是静态占位页，尚无新增弹窗，本页规格先于原型存在。
    'mall/banners': {
      groups: [
        { heading: '新增轮播图字段', fields: [
          { id: 'FD-MALL-012', label: '轮播图名称', type: '文本', length: '≤ 50 字', required: '否', note: '运营侧档案名称，不在学员端展示；学员端文案取主标题与描述', constraints: { maxLength: 50 } },
          { id: 'FD-MALL-013', label: '图片', type: '图片上传', length: '单个图片', required: '是', note: '建议尺寸 1242×414px', constraints: { maxFiles: 1, image: true } },
          { id: 'FD-MALL-055', label: '主标题', type: '文本', length: '≤ 20 字', required: '是', note: '学员端轮播展示的第一行文案；角标字自动取主标题首字，不单独配置', constraints: { maxLength: 20 } },
          { id: 'FD-MALL-056', label: '描述', type: '文本', length: '≤ 40 字', required: '否', note: '学员端轮播展示的说明文案', constraints: { maxLength: 40 } },
          { id: 'FD-MALL-014', label: '跳转链接类型', type: '下拉', length: '无跳转 / 课程详情 / 商品详情 / 课程列表 / 名师列表 / 教师详情', required: '否', note: '决定点击轮播图的跳转目标', constraints: { options: ['无跳转', '课程详情', '商品详情', '课程列表', '名师列表', '教师详情'] } },
          { id: 'FD-MALL-015', label: '跳转对象', type: '对象选择器', length: '单个课程 / 商品 / 名师', required: '条件必填', note: '选择课程详情、商品详情或教师详情时，从对应对象中选择一项，目标地址由系统生成', constraints: { requiredWhen: 'FD-MALL-014=课程详情|商品详情|教师详情' } },
          { id: 'FD-MALL-016', label: '排序序号', type: '数字', length: '≥ 1 的整数', required: '否', note: '数字越小越靠前；上移下移后自动重算序号', constraints: { min: 1, integer: true } },
          { id: 'FD-MALL-019', label: '状态', type: '下拉', length: '启用 / 停用', required: '是', note: '取值只取状态机 SM-BANNER 的启用／停用；停用后学员端不展示，未上传图片的记录不允许启用', constraints: { options: ['启用', '停用'] } }
        ] }
      ],
      notes: [
        '轮播图配置用于学员端首页展示，可设置跳转目标、排序与启用状态。',
        '轮播图按排序序号升序展示，序号越小越靠前。',
        '轮播图不设置有效期，是否展示只由启用状态决定。',
        '跳转链接类型为无跳转时，点击轮播图不产生跳转；详情类型必须选择具体课程、商品或名师。',
        'CR-2026-037：学员端文案来自主标题与描述，未填写主标题的记录不允许启用；角标字自动取主标题首字。',
        'CR-2026-037：状态只有启用与停用两种；列表提供上移／下移并自动重排序号，与手工输入序号结果一致；列表不展示「展示位置」列。'
      ]
    },
    // 试看与上下架口径以 CR-2026-004 为准：试看由商品配置决定，开启后只能播放第一课时；
    // 商品状态在草稿/已上架/已下架之间流转，复售复用原商品主体并保留调价记录。
    'mall/agreements': {
      groups: [
        { heading: '协议配置字段', fields: [
          { id: 'FD-MALL-026', label: '协议类型', type: '下拉', length: '用户协议 / 隐私政策 / 报名须知', required: '是', note: '决定协议在学员端出现的位置；三类各保留一条启用版本', constraints: { options: ['用户协议', '隐私政策', '报名须知'] } },
          { id: 'FD-MALL-027', label: '协议标题', type: '文本', length: '≤ 50 字', required: '是', note: '学员端协议页展示标题', constraints: { maxLength: 50 } },
          { id: 'FD-MALL-028', label: '协议正文', type: '富文本', length: '≤ 20000 字', required: '是', note: '支持段落与列表；不含脚本与外链资源；长度上限按纯文本字数统计，在编辑器内实时提示并阻止超限保存', constraints: { maxLength: 20000, richText: true } },
          { id: 'FD-MALL-029', label: '版本号', type: '文本', length: '≤ 20 字', required: '是', note: '版本唯一，用于记录用户确认的版本', constraints: { maxLength: 20, unique: true } },
          { id: 'FD-MALL-030', label: '生效时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '到点后新确认记录按新版本', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-MALL-031', label: '启用状态', type: '开关', length: '是 / 否', required: '是', note: '关闭后学员端不展示；历史确认记录保留', constraints: { boolean: true } }
        ] }
      ],
      notes: [
        '协议在支付与报名前展示且必须勾选确认，确认记录保存账号、协议类型、版本与时间。',
        '修改正文须生成新版本，已确认的旧版本记录不被覆盖；关闭协议不影响已发生的订单与报名。'
      ]
    },

    // CR-2026-032：订单详情分区字段与列表筛选字段纳入规格。
    'mall/orders': {
      groups: [
        { heading: '列表筛选字段', fields: [
          { id: 'FD-MALL-041', label: '订单类型', type: '下拉', length: '视频课程 / 面授课程', required: '否', note: '区分视频订单与面授订单', constraints: { options: ['视频课程', '面授课程'] } },
          { id: 'FD-MALL-042', label: '订单状态', type: '下拉', length: '待支付 / 已支付 / 已取消 / 退款中 / 已退款', required: '否', note: '取值与 SM-ORDER 一致', constraints: { options: ['待支付', '已支付', '已取消', '退款中', '已退款'] } },
          { id: 'FD-MALL-043', label: '下单时间起', type: '日期', length: 'YYYY-MM-DD', required: '否', note: '按下单时间范围筛选，含当天' },
          { id: 'FD-MALL-044', label: '下单时间止', type: '日期', length: 'YYYY-MM-DD', required: '否', note: '含当天；与起始日期共同构成闭区间' },
          { id: 'FD-MALL-045', label: '指标卡筛选', type: '按钮', length: '—', required: '否', note: '今日订单／待支付／退款中／已支付可点击筛选，再次点击取消', constraints: { action: true } }
        ] },
        { heading: '订单详情分区字段', fields: [
          { id: 'FD-MALL-046', label: '订单基础信息', type: '只读', length: '—', required: '系统展示', note: '订单号、类型、课程、购买账号或报名学员、下单时间、金额、状态与关联状态', constraints: { readOnly: true, system: true } },
          { id: 'FD-MALL-047', label: '支付记录', type: '只读', length: '—', required: '有支付记录时展示', note: '支付渠道、金额、状态与时间；未支付订单不渲染该分区', constraints: { readOnly: true, system: true } },
          { id: 'FD-MALL-048', label: '退款记录', type: '只读', length: '—', required: '退款中或已退款时展示', note: '退款单号、渠道、金额、状态、到账时间与原因；视频订单不渲染该分区', constraints: { readOnly: true, system: true } },
          { id: 'FD-MALL-049', label: '履约结果', type: '只读', length: '—', required: '系统展示', note: '视频订单展示学习权限与有效期；面授订单展示班级、校区、分班与名额占用结果', constraints: { readOnly: true, system: true } },
          { id: 'FD-MALL-050', label: '操作日志', type: '只读', length: '—', required: '有状态变更时展示', note: '状态变更时间、操作人角色、变更前后状态与原因', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '详情不展示渠道侧标识与回调结果，只展示业务单号；分区无数据时不渲染；退款状态在渠道回调前保持退款中。',
        '导出按当前筛选结果执行，不提供单条订单导出入口。'
      ]
    },
    'mall/products': {
      groups: [
        { heading: '发布商品字段', fields: [
          { id: 'FD-MALL-001', label: '关联课程', type: '下拉', length: '必选 1 门', required: '是', note: '只能选择课程库中已完成编排的视频课程' },
          { id: 'FD-MALL-051', label: '引用课程版本', type: '只读', length: 'v1 起单调递增', required: '系统记录', note: '发布时锁定版本；课程升版后商品不自动跟随', constraints: { readOnly: true, system: true } },
          { id: 'FD-MALL-052', label: '课程基本信息', type: '只读信息组', length: '8 项', required: '系统继承', note: '课程编号、名称、类型、专业、申报教师、总课时、难度、适合年龄', constraints: { readOnly: true, derived: true } },
          { id: 'FD-MALL-053', label: '课程大纲', type: '只读结构', length: '章节 + 课时', required: '系统继承', note: '展示关联版本的章节和课时，商品页不可修改', constraints: { readOnly: true, derived: true } },
          { id: 'FD-MALL-008', label: '课程名称', type: '文本（只读）', length: '—', required: '系统继承', note: '由所选课程自动带入，禁止商城维护独立课程目录副本', constraints: { readOnly: true, derived: true } },
          { id: 'FD-MALL-009', label: '所属专业', type: '文本（只读）', length: '—', required: '系统继承', note: '由所选课程自动带入', constraints: { readOnly: true, derived: true } },
          { id: 'FD-MALL-010', label: '总课时数', type: '只读', length: '正整数', required: '系统继承', note: '由所选课程自动带入，用于学员端展示', constraints: { readOnly: true, min: 1, integer: true } },
          { id: 'FD-MALL-002', label: '商品名称', type: '文本', length: '≤ 50 字', required: '是', note: '展示在学员端商品列表与订单', constraints: { maxLength: 50 } },
          { id: 'FD-MALL-003', label: '售卖价格', type: '金额', length: '大于 0，保留两位小数', required: '是', note: '以商品配置为准，课程档案价格仅作发布初值', constraints: { exclusiveMin: 0, decimals: 2 } },
          { id: 'FD-MALL-004', label: '试看策略', type: '单选', length: '不允许试看 / 允许试看', required: '是', note: '由商品配置决定，默认不允许；开启后只能播放第一课时', constraints: { options: ['不允许试看', '允许试看'] } },
          { id: 'FD-MALL-005', label: '试看课时', type: '下拉', length: '第 1 课时', required: '允许试看时必填', note: '只能选择第一课时', constraints: { options: ['第 1 课时'], requiredWhen: 'FD-MALL-004=允许试看' } },
          { id: 'FD-MALL-054', label: '上架方式', type: '单选', length: '仅保存 / 立即上架 / 定时上架', required: '是', note: '仅保存时封面可为空；上架前必须补齐展示信息', constraints: { options: ['仅保存', '立即上架', '定时上架'] } },
          { id: 'FD-MALL-011', label: '商品状态', type: '只读', length: '草稿 / 已上架 / 已下架', required: '系统计算', note: '保存为草稿，发布后已上架；下架保留商品主体与调价记录', constraints: { readOnly: true, system: true } },
          { id: 'FD-MALL-007', label: '定时上架时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '定时上架时必填', note: '到点自动上架；下架只影响购买入口', constraints: { format: 'YYYY-MM-DD HH:mm', requiredWhen: 'FD-MALL-054=定时上架' } },
          // CR-2026-020：教学属性只读带入；运营四字段写在该商品记录自身。
          ...courseFieldRows('MALL', 20, COURSE_TEACHING_FIELDS, { type: '文本（只读）', required: '系统继承', note: '来自教师申报与编排环节，发布商品时只读带入，不可修改', constraints: { readOnly: true, derived: true } }),
          ...courseFieldRows('MALL', 22, COURSE_DISPLAY_FIELDS)
        ] }
      ],
      notes: [
        '一个视频课程只允许一个有效商品，历史下架商品保留，不允许同时多价售卖。',
        '已上架商品改价只影响生效后的新订单，已支付订单保留成交金额；每次价格或售卖配置变更都会写入调价记录。',
        '历史下架商品重新售卖时复用原商品，并保留调价记录。',
        '价格、试看与上下架以商品配置为准，课程档案不得覆盖售卖字段与售卖单元的展示素材。',
        '关闭试看时未购买账号不能播放任何课时；开启试看时只能播放第一课时。',
        '课程封面、图文详情、课程标签与 C 端推荐语写在该商品记录自身（售卖单元级存储），不写入课程档案；字段定义与发布班级共用同一份规格。',
        '商品草稿可不上传封面；立即或定时上架前必须上传。同一商品再次编辑时展示四字段只读带入，点“修改展示信息”后可编辑。',
        '新增、编辑用“关联课程／销售设置／展示信息”三段式工作台；详情用“商品概览／课程内容／展示与销售／变更记录”四页签且全部只读。'
      ]
    }
  }
};
