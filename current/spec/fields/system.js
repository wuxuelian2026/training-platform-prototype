// 系统管理字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。

export const SYSTEM_FIELD_SPEC = {
  module: '系统管理',
  pages: {
    'system/settings': {
      groups: [
        { heading: '平台基础参数', fields: [
          { id: 'FD-SYSTEM-001', label: '平台名称', type: '文本', length: '≤ 50 字', required: '否', note: '用于后台页头等平台标识展示', constraints: { maxLength: 50 } },
          { id: 'FD-SYSTEM-002', label: '默认时区', type: '下拉', length: 'Asia/Shanghai（UTC+8）', required: '否', note: '平台统一时间口径，影响课次与流水时间展示' },
          { id: 'FD-SYSTEM-004', label: '作业默认截止时间（小时）', type: '数字', length: '1–720', required: '否', note: '布置作业时的默认截止时间', constraints: { min: 1, max: 720 } },
          { id: 'FD-SYSTEM-005', label: '最低出勤率（%）', type: '数字', length: '0–100', required: '否', note: '结业判定使用', constraints: { min: 0, max: 100 } },
          { id: 'FD-SYSTEM-006', label: '最低作业提交率（%）', type: '数字', length: '0–100', required: '否', note: '结业判定使用', constraints: { min: 0, max: 100 } },
          { id: 'FD-SYSTEM-033', label: '视频退款最多观看课时数', type: '数字', length: '0–999', required: '否', note: '视频订单退款资格的观看课时上限，默认 3 课时；按账号与课程去重计数', constraints: { min: 0, max: 999 } },
          { id: 'FD-SYSTEM-034', label: '合同签署截止期限（天）', type: '数字', length: '1–30', required: '否', note: '合同推送后按该天数生成签署截止日期，默认 7 天；后台合同列表与教师端我的合同读取同一份配置，修改后对新推送的合同生效', constraints: { min: 1, max: 30 } },
          { id: 'FD-SYSTEM-055', label: '证书到期提醒窗口（天）', type: '下拉', length: '7 / 15 / 30 / 60', required: '否', note: '后台证书列表与教师端我的证书按该窗口判定「即将过期」，默认 30 天；只允许四选一，不支持任意整数，修改后两端同步生效', constraints: { options: ['7', '15', '30', '60'] } },
          { id: 'FD-SYSTEM-047', label: '待支付订单支付时限（分钟）', type: '数字', length: '1–1440', required: '否', note: '待支付订单创建后按该时限关闭为「已取消（超时）」，默认 30 分钟；学员端支付页与统一订单管理同源展示', constraints: { min: 1, max: 1440 } },
          { id: 'FD-SYSTEM-048', label: '退款申请窗口（自然日）', type: '数字', length: '1–30', required: '否', note: '视频订单支付后按该窗口判断退款资格，默认 7 个自然日；与该页的观看课时上限共同决定资格', constraints: { min: 1, max: 30 } },
          { id: 'FD-SYSTEM-049', label: '图片上传上限（MB）', type: '数字', length: '1–1024', required: '否', note: '封面、证书与成果等图片类上传的统一上限，默认 10MB', constraints: { min: 1, max: 1024 } },
          { id: 'FD-SYSTEM-050', label: '文档上传上限（MB）', type: '数字', length: '1–1024', required: '否', note: 'PDF、Word、PPT 等文档类上传的统一上限，默认 50MB；合同签署件按本项校验', constraints: { min: 1, max: 1024 } },
          { id: 'FD-SYSTEM-051', label: '视频上传上限（MB）', type: '数字', length: '1–10240', required: '否', note: '视频课程与教学视频上传的统一上限，默认 500MB', constraints: { min: 1, max: 10240 } },
          { id: 'FD-SYSTEM-052', label: '教学资源库单文件上限（GB）', type: '数字', length: '1–10240', required: '否', note: '教学资源库单文件上限，默认 100GB；与其他上传项独立校验', constraints: { min: 1, max: 10240 } },
          { id: 'FD-SYSTEM-053', label: '消息失败最大重试次数', type: '数字', length: '1–5', required: '否', note: '通知发送失败后的最大重试次数，默认 3 次；超过次数进入补发队列', constraints: { min: 1, max: 5 } },
          { id: 'FD-SYSTEM-054', label: '消息重试间隔（分钟）', type: '数字组', length: '每项 1–1440，至少一项', required: '否', note: '按顺序生效的重试间隔，默认 5／30／120 分钟；保存时去重升序，仅在启用消息失败自动重试时生效', constraints: { min: 1, max: 1440, multi: true } },
          { id: 'FD-SYSTEM-038', label: '教师转场最小间隔（分钟）', type: '数字', length: '1–120', required: '否', note: '同一教师当天两节课之间小于该间隔且更换教室时提示“转场紧张”，默认 30 分钟', constraints: { min: 1, max: 120 } },
          { id: 'FD-SYSTEM-039', label: '跨校区额外预留（分钟）', type: '数字', length: '0–120', required: '否', note: '跨校区转场在最小间隔基础上叠加的额外预留，默认 15 分钟；有效间隔 = 最小间隔 + 额外预留', constraints: { min: 0, max: 120 } },
        ] },
        { heading: '业务开关', fields: [
          { id: 'FD-SYSTEM-007', label: '启用教师端课程申报', type: '开关', length: '开 / 关', required: '否', note: '关闭后教师端不展示课程申报入口' },
          { id: 'FD-SYSTEM-008', label: '启用学员端匿名咨询', type: '开关', length: '开 / 关', required: '否', note: '控制学员端匿名咨询入口' },
          { id: 'FD-SYSTEM-009', label: '启用消息失败自动重试', type: '开关', length: '开 / 关', required: '否', note: '消息发送失败时按设定策略自动重试' },
          { id: 'FD-SYSTEM-010', label: '允许课程顾问登记试听', type: '开关', length: '开 / 关', required: '否', note: '控制课程顾问是否可登记试听' }
        ] }
      ],
      notes: [
        '保存前校验数值范围：作业截止 1–720 小时、出勤率与作业提交率 0–100%、最多观看课时 0–999、合同签署截止期限 1–30 天、转场最小间隔 1–120 分钟、跨校区额外预留 0–120 分钟、支付时限 1–1440 分钟、退款窗口 1–30 天、文件规格为正整数、重试次数 1–5 且至少一个重试间隔。',
        '业务枚举（难度等级、适合年龄、课时类型、课时时长）不在本页维护，统一在「系统管理 → 数据字典」页维护，本页不得出现这些枚举的增删入口。',
        '任一参数超出范围时整体不保存，并提示需要修正的取值区间。',
        '固定规则不提供配置：课表时间轴（每天 08:00–21:00、15 分钟 1 刻度、共 52 格）是本页唯一的固定规则，页面只做只读说明；调整需走变更单。',
        '待支付支付时限、视频退款申请窗口、文件上传规格与消息重试策略都在本页配置：学员端支付页、统一订单管理、退款资格校验、证书与合同上传、教学资源上传读取同一份配置，页面不得写死数值。',
        '保存成功后记录审计日志，参数的变更时间与操作人可追溯。',
        '结业判定使用最低出勤率和最低作业提交率；待补录考勤不参与计算。'
      ]
    },
    // CR-2026-103：业务枚举集中到「数据字典」页维护，参数配置页不再承载课时时长。
    'system/dictionaries': {
      groups: [
        { heading: '字典维护字段', fields: [
          { id: 'FD-SYSTEM-036', label: '字典项', type: '文本组', length: '每项 ≤ 20 字，至少一项', required: '是', note: '难度等级、适合年龄、课时类型等文本字典的字典项；保存时按维护顺序去重，留空项不保存', constraints: { maxLength: 20, multi: true } },
          { id: 'FD-SYSTEM-003', label: '课时时长字典项（分钟）', type: '数字组', length: '每项为大于 0 的整数', required: '是', note: '数据字典项：排班表单、班级默认值与课程库编排的课时时长统一读取本字典，不支持写死在页面；至少保留一项', constraints: { min: 1, integer: true, multi: true } },
          { id: 'FD-SYSTEM-037', label: '默认课时时长（分钟）', type: '下拉', length: '取自课时时长字典项', required: '是', note: '新建课次与班级的默认时长，取值必须在课时时长字典项内；删除默认项时默认值回落到首项' }
        ] }
      ],
      notes: [
        '本页只维护业务枚举，平台参数、业务开关与排课策略参数在「参数配置」页维护。',
        '字典类型由产品口径固定为难度等级、适合年龄、课时类型、课时时长；新增或删除字典类型须走变更单，不提供页面自助新增。',
        '字典维护即时生效并写入审计日志；已排课次保留原时长，只有新建或编辑时按新字典取值。',
        '字典项重复或留空时按去重与过滤处理，不静默产生第二条同名字典项。'
      ]
    },
    'system/profile': {
      groups: [
        { heading: '基本设置', fields: [
          { id: 'FD-SYSTEM-011', label: '昵称', type: '文本', length: '≤ 30 字', required: '是', note: '当前后台账号的展示名称', constraints: { maxLength: 30 } },
          { id: 'FD-SYSTEM-012', label: '邮箱', type: '文本', length: '≤ 64 字符', required: '是', note: '需符合邮箱格式，用于接收系统通知', constraints: { maxLength: 64 } },
          { id: 'FD-SYSTEM-013', label: '性别', type: '单选', length: '男 / 女 / 未知', required: '是', note: '账号资料字段，仅用于展示' },
          { id: 'FD-SYSTEM-014', label: '电话', type: '文本', length: '11 位数字', required: '是', note: '需符合手机号格式，作为账号联系方式', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } }
        ] },
        { heading: '安全设置', fields: [
          { id: 'FD-SYSTEM-015', label: '旧密码', type: '密码', length: '—', required: '是', note: '修改密码时校验当前登录密码' },
          { id: 'FD-SYSTEM-016', label: '新密码', type: '密码', length: '≥ 8 位', required: '是', note: '设置新的登录密码', constraints: { minLength: 8 } },
          { id: 'FD-SYSTEM-017', label: '确认新密码', type: '密码', length: '≥ 8 位', required: '是', note: '必须与新密码一致', constraints: { minLength: 8 } }
        ] }
      ],
      notes: [
        '更新信息需填写昵称、邮箱、性别和电话，电话需为 11 位手机号。',
        '修改密码需先填写旧密码，新密码不少于 8 位且与确认新密码一致。',
        '密码输入框支持显示与隐藏切换，页面不展示任何历史密码。',
        '账号字段由后台用户管理维护，个人中心不可修改账号、部门与角色。'
      ]
    },
    'system/users': {
      groups: [
        { heading: '新增后台用户字段', fields: [
          { id: 'FD-SYSTEM-018', label: '用户姓名', type: '文本', length: '2–30 字', required: '是', note: '后台工作人员真实姓名', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-SYSTEM-019', label: '登录账号', type: '文本', length: '≤ 50 字', required: '是', note: '需唯一，用于后台登录', constraints: { maxLength: 50 } },
          { id: 'FD-SYSTEM-020', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '用于身份识别与通知', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-SYSTEM-021', label: '所属角色', type: '下拉', length: '预置角色', required: '是', note: '决定可见菜单与数据范围' },
          { id: 'FD-SYSTEM-022', label: '用户状态', type: '下拉', length: '启用 / 禁用', required: '是', note: '禁用后禁止登录' },
          { id: 'FD-SYSTEM-023', label: '初始密码', type: '密码', length: '≥ 8 位', required: '是', note: '首次登录后需修改', constraints: { minLength: 8 } }
        ] }
      ],
      notes: [
        '本页维护的是后台工作人员账号，不含小程序学员端账号。',
        '登录账号需唯一；重置密码后原会话失效。',
        '禁用账号保留历史操作记录，账号与角色权限分别维护。',
        '用户列表默认按最后登录时间倒序排列，从未登录账号置于列表末尾。',
        '涉及登录状态变化和密码重置的操作均需要二次确认。'
      ]
    },
    'system/roles': {
      groups: [
        { heading: '新增角色字段', fields: [
          { id: 'FD-SYSTEM-024', label: '角色名称', type: '文本', length: '2–30 字', required: '是', note: '展示在权限分配与账号管理', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-SYSTEM-025', label: '角色标识', type: '文本', length: '≤ 50 字', required: '是', note: '需唯一，用于权限判断', constraints: { maxLength: 50 } },
          { id: 'FD-SYSTEM-026', label: '角色说明', type: '文本', length: '≤ 100 字', required: '否', note: '说明该角色的职责范围', constraints: { maxLength: 100 } },
          { id: 'FD-SYSTEM-027', label: '角色状态', type: '下拉', length: '启用 / 禁用', required: '是', note: '禁用后该角色账号不可登录' }
        ] }
      ],
      notes: [
        '角色标识需唯一，创建后不建议修改。',
        '删除角色前需确认没有在用账号，否则应先转移或停用。',
        '权限分配决定菜单可见性与数据范围，前后端均需校验。',
        '系统预置五种角色，权限按菜单级可见性配置，业务动作仍受权限矩阵和模块规则约束。'
      ]
    },
    'system/student-users': {
      groups: [
        { heading: '学员账号启停字段', fields: [
          { id: 'FD-SYSTEM-028', label: '账号信息', type: '只读', length: '—', required: '系统展示', note: '列表一行对应一个小程序登录账号，展示账号编号、昵称与脱敏手机号；不代表学员', constraints: { readOnly: true, system: true } },
          { id: 'FD-SYSTEM-029', label: '关联学员', type: '只读', length: '—', required: '系统展示', note: '详情内完整列出该账号关联的全部学员，只读展示，不在此新增、解绑或编辑', constraints: { readOnly: true, system: true } },
          { id: 'FD-SYSTEM-030', label: '账号操作', type: '单选', length: '启用 / 禁用', required: '是', note: '超级管理员可启停；教务主管只读，其他后台角色无入口', constraints: { options: ['启用', '禁用'] } },
          { id: 'FD-SYSTEM-031', label: '禁用原因', type: '多行文本', length: '≤ 200 字', required: '禁用时必填', note: '写入账号操作记录，供后续审计与复核', constraints: { maxLength: 200, requiredWhen: 'FD-SYSTEM-030=禁用' } },
          { id: 'FD-SYSTEM-032', label: '操作记录', type: '只读', length: '—', required: '系统生成', note: '记录操作类型、操作前后状态、操作人、操作时间与原因', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '列表一行对应一个小程序登录账号（家长或监护人），一个账号可关联多名学员。',
        '禁用后当前有效会话立即失效；账号、关联学员关系、订单、报名、学习进度与考勤等历史数据全部保留。',
        '账号状态与学员状态分离，禁用账号不改变其关联学员的状态。',
        '手机号、最近登录 IP 等敏感信息按角色脱敏展示，后端接口必须独立校验权限。'
      ]
    }
  }
};
