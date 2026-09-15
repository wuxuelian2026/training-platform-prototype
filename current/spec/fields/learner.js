// 学员端字段规格 · 唯一事实源
//
// 学员端与教师端共用入口 login.html（页内提供身份切换，默认学员端）。
// 字段体系与后台一致：编号 FD-<模块>-三位序号，约束键与页面说明机制共用。

export const LEARNER_APP_FIELD_SPEC = {
  module: '学员端小程序',
  pages: {
    'learner/login': {
      groups: [
        { heading: '验证码登录字段', fields: [
          { id: 'FD-LAPP-001', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '作为账号唯一标识，与家长/监护人账号绑定', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$', unique: true } },
          { id: 'FD-LAPP-002', label: '验证码', type: '文本', length: '6 位数字', required: '是', note: '点击获取，60 秒倒计时内不可重复获取', constraints: { maxLength: 6, pattern: '^\\d{6}$' } },
          { id: 'FD-LAPP-003', label: '登录按钮', type: '按钮', length: '—', required: '是', note: '校验通过后登录并进入学员端首页', constraints: { action: true } }
        ] },
        { heading: '密码登录字段', fields: [
          { id: 'FD-LAPP-004', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '与验证码登录使用同一账号体系', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-LAPP-005', label: '密码', type: '密码', length: '6–20 位', required: '是', note: '登录密码，不展示明文', constraints: { minLength: 6, maxLength: 20 } },
          { id: 'FD-LAPP-006', label: '忘记密码', type: '链接', length: '—', required: '否', note: '跳转找回密码流程', constraints: { action: true } },
          { id: 'FD-LAPP-007', label: '登录按钮', type: '按钮', length: '—', required: '是', note: '校验通过后登录并进入学员端首页', constraints: { action: true } }
        ] }
      ],
      notes: [
        '登录页提供身份切换，默认进入学员端，可切换到教师端登录。',
        '支持微信授权一键登录（获取手机号）；首次登录需勾选同意用户协议与隐私政策。',
        '登录主体是家长/监护人账号，一个账号可关联多个学员，登录后按当前学员查看业务数据。'
      ]
    },
    'learner/student-edit': {
      groups: [
        { heading: '学员资料字段', fields: [
          { id: 'FD-LAPP-008', label: '学员姓名', type: '文本', length: '≤ 20 字', required: '是', note: '学员本人姓名，用于报名、分班、考勤与结业展示', constraints: { maxLength: 20 } },
          { id: 'FD-LAPP-009', label: '性别', type: '单选', length: '男 / 女', required: '是', note: '用于班级与课程适配', constraints: { options: ['男', '女'] } },
          { id: 'FD-LAPP-010', label: '出生年月', type: '日期', length: 'YYYY-MM', required: '是', note: '不得晚于当前月份，用于适龄校验', constraints: { format: 'YYYY-MM' } },
          { id: 'FD-LAPP-011', label: '与账号关系', type: '下拉', length: '预置关系选项', required: '是', note: '说明该学员与当前登录账号的关系' }
        ] }
      ],
      notes: [
        '学员档案归属登录账号，一个家长或监护人账号可维护多名学员。',
        '学员资料的增删改不改变账号下的视频学习权限与学习进度，视频权限按账号共享。',
        '面授订单必须关联具体学员，报名、考勤、作业与结业数据按学员隔离。',
        '出生年月用于适龄校验，修改后不影响已发生的报名与订单记录。'
      ]
    },
    'learner/fast-registration-detail': {
      groups: [
        { heading: '快速报名字段', fields: [
          { id: 'FD-LAPP-014', label: '报名学员', type: '单选', length: '账号下关联学员', required: '是', note: '面授报名必须选择具体学员；默认当前学员', constraints: { required: true } },
          { id: 'FD-LAPP-015', label: '班级信息', type: '只读', length: '—', required: '系统展示', note: '展示班级、教师、校区、教室、上课时间、总课时与剩余名额', constraints: { readOnly: true, system: true } },
          { id: 'FD-LAPP-016', label: '快速报名确认', type: '开关', length: '是 / 否', required: '是', note: '确认后进入支付；名额以支付成功为占用时点', constraints: { boolean: true } },
          { id: 'FD-LAPP-017', label: '立即报名', type: '按钮', length: '—', required: '是', note: '校验学员、名额与重复报名后生成面授订单', constraints: { action: true } }
        ] }
      ],
      notes: [
        '必须先选择报名学员；班级状态须为招生中（已满员、已下架或已结束不提供报名入口）。',
        '同一账号同一学员同一班级不得重复报名，已支付订单不得重复提交。',
        '校验通过生成面授订单并进入支付页，进入支付页不占用名额；支付成功后按所选班级自动分班并占用名额。',
        '支付成功后名额占用失败时订单进入“退款中”并自动全额原路退款，不生成报名与分班记录、不自动调班。'
      ]
    },

    'learner/payment': {
      groups: [
        { heading: '支付确认字段', fields: [
          { id: 'FD-LAPP-012', label: '协议同意', type: '开关', length: '同意 / 未同意', required: '是', note: '未勾选不可支付；同意时间需记录', constraints: { boolean: true } },
          { id: 'FD-LAPP-013', label: '支付操作', type: '按钮', length: '—', required: '是', note: '待支付订单复用原订单号；已支付订单禁止重复购买或报名', constraints: { action: true } }
        ] }
      ],
      notes: [
        '未登录直接访问支付页时先跳转登录，并保留回跳地址。',
        '支付成功即订单“已支付”，视频课程开通学习权限，不设置订单“已完成”状态。',
        '面授支付成功后按所选班级自动分班并占用名额；名额以支付成功为占用时点。',
        '支付成功后最终占用名额失败时，订单进入“退款中”并自动全额原路退款，不生成报名与分班记录，不自动调班。',
        '页面中的“支付结果”为原型演示控件，不代表真实支付能力，不进入业务字段口径。'
      ]
    },

    // G1 覆盖收尾：提交作业是学员端唯一写入动作页，按“结构化”口径补字段表。
    'learner/homework': {
      groups: [
        { heading: '作业提交字段', fields: [
          { id: 'FD-LAPP-018', label: '作业说明', type: '文本', length: '≤ 500 字', required: '条件必填', note: '与附件至少填写一项；与附件同时为空时不可提交', constraints: { maxLength: 500 } },
          { id: 'FD-LAPP-019', label: '附件', type: '文件', length: '图片 / 视频 / 音频', required: '条件必填', note: '与作业说明至少填写一项；原型只记录文件名，不上传真实文件', constraints: { fileTypes: ['图片', '视频', '音频'] } },
          { id: 'FD-LAPP-020', label: '提交状态', type: '只读', length: '未提交 / 草稿 / 已提交', required: '系统展示', note: '保存草稿不进入批阅；提交后进入教师批阅队列', constraints: { readOnly: true, system: true } },
          { id: 'FD-LAPP-021', label: '教师评语', type: '只读', length: '≤ 500 字', required: '系统展示', note: '批阅完成后展示，学员端不提供编辑入口', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '作业标题、作业要求与截止时间来自教师端发布记录，学员端不可修改。',
        '作业说明与附件至少填写一项；保存草稿不校验、不进入批阅；截止时间后不可提交。',
        '未提交的必交作业影响结业判定；提交后由授课教师批阅并给出评语。',
        '原型只记录所选附件文件名，不做真实文件上传与内容校验。'
      ]
    },

    'learner/settings': {
      groups: [
        { heading: '账号设置项', fields: [
          { id: 'FD-LAPP-022', label: '登录手机号', type: '只读', length: '11 位数字（脱敏）', required: '系统展示', note: '按当前账号读取并脱敏展示，不支持直接编辑', constraints: { readOnly: true, system: true, masked: true } },
          { id: 'FD-LAPP-023', label: '新手机号', type: '文本', length: '11 位数字', required: '换绑时必填', note: '换绑手机号时填写，须与当前手机号不同', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-LAPP-024', label: '验证码', type: '文本', length: '4–6 位数字', required: '换绑时必填', note: '点击获取，60 秒倒计时内不可重复获取', constraints: { maxLength: 6, pattern: '^\\d{4,6}$' } },
          { id: 'FD-LAPP-025', label: '微信授权', type: '开关', length: '已授权 / 未授权', required: '否', note: '授权后可使用微信快捷登录；解除授权不影响已购课程与学习进度', constraints: { boolean: true } },
          { id: 'FD-LAPP-026', label: '用户协议与隐私政策', type: '只读', length: '文本条款', required: '系统展示', note: '仅查看，不提供编辑入口；协议版本由后台协议管理维护', constraints: { readOnly: true, system: true } },
          { id: 'FD-LAPP-027', label: '退出登录', type: '按钮', length: '—', required: '是', note: '二次确认后清除登录态并回到登录页', constraints: { action: true } }
        ] }
      ],
      notes: [
        '设置项只影响当前登录账号在学员端的展示与通知，不影响账号下的学员、订单与学习记录。',
        '换绑手机号需校验新手机号格式、验证码与当前手机号不同；换绑成功后原手机号不再作为登录凭据。',
        '修改密码需两次输入一致，修改成功后需重新登录；密码长度为 6–20 位。',
        '退出登录只清除本机登录态，不删除账号数据。'
      ]
    }
  }
};
