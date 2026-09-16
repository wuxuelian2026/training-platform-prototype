// 教师端字段规格 · 唯一事实源
//
// 与后台共用同一套字段体系：相同的编号规则（FD-<模块>-三位序号）、相同的约束键、
// 相同的页面说明机制。页面路径相对 /teacher/pages/，登录页属于根目录 login.html。
import { COURSE_TEACHING_FIELDS, courseFieldRows } from './courses.js';

export const TEACHER_APP_FIELD_SPEC = {
  module: '教师端小程序',
  pages: {
    'teacher/profile-detail': {
      groups: [
        { heading: '个人档案字段', fields: [
          { id: 'FD-TAPP-001', label: '姓名', type: '只读', length: '2–30 字', required: '系统展示', note: '按教师 ID 读取后台档案，教师端不可修改', constraints: { readOnly: true, system: true } },
          { id: 'FD-TAPP-002', label: '工号', type: '只读', length: 'JS+年月日+序号', required: '系统展示', note: '由后台建档时生成，教师端不可修改', constraints: { readOnly: true, system: true } },
          { id: 'FD-TAPP-003', label: '身份证号', type: '只读', length: '18 位（脱敏）', required: '系统展示', note: '按权限返回脱敏值，教师端不可修改', constraints: { readOnly: true, system: true, masked: true } },
          { id: 'FD-TAPP-004', label: '人员类型', type: '只读', length: '在编 / 签约 / 外聘', required: '系统展示', note: '按教师 ID 读取后台档案，教师端不可修改', constraints: { readOnly: true, system: true } },
          { id: 'FD-TAPP-005', label: '授课专业', type: '只读', length: '至少 1 个', required: '系统展示', note: '按教师 ID 读取授课专业，教师端不可修改', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '教师端个人档案全部只读，由后台建档与审核维护，教师端不提供编辑入口。',
        '资料、人员、账号、证书和合同状态分别维护，不相互覆盖；教师端只展示与本人相关的信息。'
      ]
    },
    'teacher/application-create': {
      groups: [
        { heading: '课程申报字段', fields: [
          { id: 'FD-TAPP-014', label: '课程名称', type: '文本', length: '≤ 100 字', required: '是', note: '课程对外名称，申报通过后进入课程库', constraints: { maxLength: 100 } },
          { id: 'FD-TAPP-015', label: '所属专业', type: '三级级联', length: '必选 1 个', required: '是', note: '按门类 → 分类 → 专业逐级选择，需属于本人授课专业', constraints: { dictionary: '专业目录' } },
          { id: 'FD-TAPP-016', label: '课程类型', type: '单选', length: '视频课程 / 面授课程', required: '是', note: '决定后续编排与发布路径', constraints: { options: ['视频课程', '面授课程'] } },
          { id: 'FD-TAPP-017', label: '总课时', type: '数字', length: '≥ 1 的整数', required: '面授课程必填', note: '面授课程用于生成课次和工资统计；视频课程不按课时数校验', constraints: { min: 1, integer: true, requiredWhen: 'courseType=offline' } },
          { id: 'FD-TAPP-018', label: '课程简介', type: '多行文本', length: '≤ 500 字', required: '否', note: '补充课程目标、教学内容和适合人群', constraints: { maxLength: 500 } }
        ] },
        // CR-2026-012 / CR-2026-014：教学属性与后台编排、发布环节复用同一份字段定义。
        { heading: '教学属性字段', fields: courseFieldRows('TAPP', 21, COURSE_TEACHING_FIELDS, { required: '是', note: '教师申报时维护；后台编排可修改，发布环节只读带入' }) }
      ],
      notes: [
        '课程申报不提供保存草稿，提交即进入待审核；驳回或撤销后重新提交沿用原申报编号。',
        '提交前校验资料已建档、离职日期为空、账号正常且申报专业属于本人授课专业；不校验证书和合同。',
        '难度等级与适合年龄在申报时必填，作为教学属性写入课程档案，后台审核页、编排页、课程库与学员端读取同一份值。'
      ]
    },
    // 发布作业入口在教师端课次详情页（上课结束后填写教学记录时可发布课后作业）。
    'teacher/class-detail': {
      groups: [
        { heading: '发布作业字段', fields: [
          { id: 'FD-TAPP-006', label: '作业标题', type: '文本', length: '≤ 50 字', required: '是', note: '学员端作业本展示的标题', constraints: { maxLength: 50 } },
          { id: 'FD-TAPP-007', label: '作业描述', type: '富文本', length: '≤ 2000 字', required: '是', note: '作业要求与完成说明', constraints: { maxLength: 2000, richText: true } },
          { id: 'FD-TAPP-008', label: '作业类型', type: '下拉', length: '练习视频 / 乐谱练习 / 绘画作品 / 文字报告 / 其他', required: '是', note: '决定学员端提交方式与批阅口径', constraints: { options: ['练习视频', '乐谱练习', '绘画作品', '文字报告', '其他'] } },
          { id: 'FD-TAPP-009', label: '提交格式', type: '多选', length: '图片 / 视频 / 音频 / 文字 / PDF', required: '是', note: '至少选择一种允许提交的格式', constraints: { options: ['图片', '视频', '音频', '文字', 'PDF'], minItems: 1, multi: true } },
          { id: 'FD-TAPP-010', label: '截止时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '是', note: '默认课后 48 小时', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-TAPP-011', label: '是否必交', type: '开关', length: '是 / 否', required: '否', note: '默认开启；必交作业未提交影响结业判定', constraints: { boolean: true } },
          { id: 'FD-TAPP-012', label: '参考资料', type: '多选', length: '至少 0 个资源', required: '否', note: '从教学资源库引用，随作业下发给学员', constraints: { multi: true } },
          { id: 'FD-TAPP-013', label: '发布', type: '按钮', length: '—', required: '是', note: '提交后推送至学员端作业本', constraints: { action: true } }
        ] }
      ],
      notes: [
        '作业发布后推送至该班级学员的作业本，学员在截止时间前提交。',
        '教师只能对本人在授班级发布作业，截止时间不得早于发布时刻。',
        '参考资料从教学资源库引用，不复制资源本体。'
      ]
    },
    'teacher/applications': {
      groups: [
        { heading: '申报列表操作字段', fields: [
          { id: 'FD-TAPP-019', label: '撤销申报', type: '按钮', length: '—', required: '是', note: '仅“待审核”的申报可撤销；撤销后可修改并沿用原申报编号重新提交', constraints: { action: true } },
          { id: 'FD-TAPP-020', label: '撤销确认', type: '单选', length: '确认撤销 / 取消', required: '是', note: '二次确认，避免误撤销已提交的申报', constraints: { options: ['确认撤销', '取消'] } }
        ] }
      ],
      notes: [
        '发起申报不保存草稿，提交后直接进入“待审核”，取消或离开页面不产生记录。',
        '“待审核”的申报不可直接修改，只能撤销；已驳回或已撤销的申报可编辑并沿用原申报编号重新提交。',
        '申报状态只有待审核、已通过、已驳回、已撤销，不设草稿状态。',
        '申报不校验证书与合同；申报通过后进入课程编排。'
      ]
    },

    // G1 覆盖收尾：教师端设置页承载账号级操作，按“结构化”口径补字段表。
    'teacher/settings': {
      groups: [
        { heading: '教师端设置项', fields: [
          { id: 'FD-TAPP-023', label: '登录手机号', type: '只读', length: '11 位数字（脱敏）', required: '系统展示', note: '按当前教师账号读取并脱敏展示，不支持直接编辑', constraints: { readOnly: true, system: true, masked: true } },
          { id: 'FD-TAPP-024', label: '新手机号', type: '文本', length: '11 位数字', required: '换绑时必填', note: '换绑手机号时填写，须与当前手机号不同', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$' } },
          { id: 'FD-TAPP-025', label: '验证码', type: '文本', length: '4–6 位数字', required: '换绑时必填', note: '点击获取，60 秒倒计时内不可重复获取', constraints: { maxLength: 6, pattern: '^\\d{4,6}$' } },
          { id: 'FD-TAPP-026', label: '新密码', type: '文本（密码）', length: '6–20 位', required: '改密时必填', note: '两次输入一致方可提交，修改成功后需重新登录', constraints: { minLength: 6, maxLength: 20, secret: true } },
          { id: 'FD-TAPP-027', label: '微信授权', type: '开关', length: '已授权 / 未授权', required: '否', note: '授权后可使用微信快捷登录，不影响课表、考勤与工资数据', constraints: { boolean: true } },
          { id: 'FD-TAPP-028', label: '退出登录', type: '按钮', length: '—', required: '是', note: '二次确认后清除登录态并回到登录页', constraints: { action: true } }
        ] }
      ],
      notes: [
        '设置项只影响当前教师账号在教师端的登录与通知，不改变档案、证书、合同与课表数据。',
        '教师档案、证书与合同的维护入口在教师端对应页面或后台，不在设置页提供编辑入口。',
        '改密与换绑手机号须通过验证码或二次确认，成功后原凭据失效。'
      ]
    }
  }
};
