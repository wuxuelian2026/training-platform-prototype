// 师资模块字段规格 · 唯一事实源
//
// 用途：后台页面说明表格、后续 PRD 字段表、原型输入校验，都由这里派生。
// 约定：
//   id         字段稳定编号，用于跨文档引用，不要随文案调整而变更
//   label/type/length/required/note  对应页面说明表格的五列
//   constraints  机器可读约束；页面说明只展示人看的 length 文案，校验用这里的值
//
// 新增或修改字段时只改本文件，然后运行 `npm run check:page-spec` 校验一致性。

export const TEACHER_FIELD_SPEC = {
  module: '师资中心',
  pages: {
    'teachers/create': {
      title: '新增教师',
      groups: [
        { heading: '基本信息', fields: [
          { id: 'FD-TEACHER-001', label: '工号', type: '自动生成', length: 'JS+年月日+序号', required: '系统生成', note: '系统自动生成，提交后不可修改', constraints: { system: true, readOnly: true } },
          { id: 'FD-TEACHER-002', label: '姓名', type: '文本', length: '2–30 字', required: '是', note: '教师真实姓名，用于教师列表、档案、课表和结算展示', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-TEACHER-003', label: '人员类型', type: '单选', length: '在编 / 签约 / 外聘', required: '是', note: '表示人员用工口径，与账号状态相互独立', constraints: { options: ['在编', '签约', '外聘'] } },
          { id: 'FD-TEACHER-004', label: '性别', type: '单选', length: '男 / 女', required: '否', note: '选填，可由身份证号带入', constraints: { options: ['男', '女'] } },
          { id: 'FD-TEACHER-005', label: '出生年月', type: '日期', length: 'YYYY-MM', required: '否', note: '选填，可由身份证号带入', constraints: { format: 'YYYY-MM' } },
          { id: 'FD-TEACHER-006', label: '身份证号', type: '文本', length: '18 位', required: '是', note: '需唯一；重复或格式不符时不建档', constraints: { pattern: '^\\d{17}[\\dXx]$', maxLength: 18, unique: true } },
          { id: 'FD-TEACHER-007', label: '政治面貌', type: '下拉', length: '5 个预置选项', required: '否', note: '中共党员 / 预备党员 / 共青团员 / 民主党派 / 群众', constraints: { options: ['中共党员', '预备党员', '共青团员', '民主党派', '群众'] } },
          { id: 'FD-TEACHER-008', label: '民族', type: '下拉', length: '预置民族选项', required: '否', note: '选填；取自民族字典（56 个民族）', constraints: { dictionary: '民族' } },
          { id: 'FD-TEACHER-009', label: '最高学历', type: '下拉', length: '6 个预置选项', required: '否', note: '博士 / 硕士 / 本科 / 大专 / 中专 / 高中及以下', constraints: { options: ['博士', '硕士', '本科', '大专', '中专', '高中及以下'] } },
          { id: 'FD-TEACHER-010', label: '授课专业', type: '三级级联多选', length: '至少 1 个', required: '是', note: '按门类 → 分类 → 专业选择，支持添加多个；全系统课程、资源和排课均引用该专业目录', constraints: { dictionary: '专业目录', minItems: 1 } },
          { id: 'FD-TEACHER-011', label: '从教年限', type: '数字', length: '0 及以上整数', required: '否', note: '单位：年', constraints: { min: 0, integer: true } },
          { id: 'FD-TEACHER-012', label: '职称', type: '下拉', length: '8 个预置选项', required: '否', note: '教授 / 副教授 / 讲师 / 助教 / 高级教师 / 一级教师 / 二级教师 / 无', constraints: { options: ['教授', '副教授', '讲师', '助教', '高级教师', '一级教师', '二级教师', '无'] } },
          { id: 'FD-TEACHER-013', label: '车牌号', type: '文本', length: '7–8 位', required: '否', note: '选填，教师端不可维护', constraints: { minLength: 7, maxLength: 8 } }
        ] },
        { heading: '联系方式', fields: [
          { id: 'FD-TEACHER-014', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '需唯一；作为教师账号激活和登录身份', constraints: { pattern: '^1[3-9]\\d{9}$', maxLength: 11, unique: true } },
          { id: 'FD-TEACHER-015', label: '邮箱', type: '文本', length: '≤ 64 字符', required: '否', note: '选填，需符合邮箱格式', constraints: { format: 'email', maxLength: 64 } },
          { id: 'FD-TEACHER-016', label: '紧急联系人姓名', type: '文本', length: '2–30 字', required: '否', note: '选填', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-TEACHER-017', label: '紧急联系人电话', type: '文本', length: '11 位数字', required: '否', note: '选填，填写时需符合手机号格式', constraints: { pattern: '^1[3-9]\\d{9}$', maxLength: 11 } }
        ] },
        { heading: '财务信息', fields: [
          { id: 'FD-TEACHER-018', label: '收款户名', type: '文本', length: '≤ 50 字', required: '否', note: '用于工资结算收款', constraints: { maxLength: 50 } },
          { id: 'FD-TEACHER-019', label: '银行卡号', type: '文本', length: '16–19 位数字', required: '否', note: '选填', constraints: { pattern: '^\\d{16,19}$', maxLength: 19 } },
          { id: 'FD-TEACHER-020', label: '开户行', type: '下拉', length: '4 个预置选项', required: '否', note: '选填', constraints: { options: ['中国工商银行', '中国建设银行', '中国银行', '中国农业银行'] } }
        ] },
        { heading: '经历信息', fields: [
          { id: 'FD-TEACHER-021', label: '学习经历', type: '多行文本', length: '≤ 500 字', required: '否', note: '填写毕业院校、专业和学习时间', constraints: { maxLength: 500 } },
          { id: 'FD-TEACHER-022', label: '工作经历', type: '多行文本', length: '≤ 500 字', required: '否', note: '填写任职单位、岗位和任职时间', constraints: { maxLength: 500 } },
          { id: 'FD-TEACHER-023', label: '获奖情况', type: '多行文本', length: '≤ 500 字', required: '否', note: '填写艺术或教学相关获奖经历', constraints: { maxLength: 500 } }
        ] },
        { heading: '展示信息', fields: [
          { id: 'FD-TEACHER-024', label: '一句话简介', type: '多行文本', length: '≤ 200 字', required: '否', note: '用于教师详情、课程介绍和小程序展示', constraints: { maxLength: 200 } },
          { id: 'FD-TEACHER-025', label: '简介', type: '富文本', length: '≤ 2000 字', required: '否', note: '教师艺术经历、教学特色和代表成果', constraints: { maxLength: 2000, richText: true } }
        ] },
        { heading: '证书信息（子表）', fields: [
          { id: 'FD-TEACHER-026', label: '证书名称', type: '文本', length: '≤ 50 字', required: '条件必填', note: '新增一行证书时必填', constraints: { maxLength: 50, requiredWhen: 'certificateRow' } },
          { id: 'FD-TEACHER-027', label: '证书编号', type: '文本', length: '≤ 50 字', required: '条件必填', note: '新增一行证书时必填', constraints: { maxLength: 50, requiredWhen: 'certificateRow' } },
          { id: 'FD-TEACHER-028', label: '证书类型', type: '下拉', length: '4 个预置选项', required: '条件必填', note: '学历证书 / 教师资格证 / 艺术等级证 / 其他', constraints: { options: ['学历证书', '教师资格证', '艺术等级证', '其他'], requiredWhen: 'certificateRow' } },
          { id: 'FD-TEACHER-029', label: '发证机构', type: '文本', length: '≤ 50 字', required: '条件必填', note: '新增一行证书时必填', constraints: { maxLength: 50, requiredWhen: 'certificateRow' } },
          { id: 'FD-TEACHER-030', label: '颁发日期', type: '日期', length: 'YYYY-MM-DD', required: '否', note: '选填', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-TEACHER-031', label: '有效期截止', type: '日期', length: 'YYYY-MM-DD', required: '否', note: '勾选“永久有效”后不需要填写', constraints: { format: 'YYYY-MM-DD', disabledWhen: 'permanent' } },
          { id: 'FD-TEACHER-032', label: '永久有效', type: '开关', length: '是 / 否', required: '否', note: '勾选后无需填写有效期截止', constraints: { boolean: true } },
          { id: 'FD-TEACHER-033', label: '证书文件', type: '文件上传', length: '单个文件', required: '条件必填', note: '新增一行证书时必填', constraints: { maxFiles: 1, requiredWhen: 'certificateRow' } },
          { id: 'FD-TEACHER-034', label: '审核状态', type: '只读', length: '—', required: '系统生成', note: '后台录入直接为“审核通过”并记录操作人、时间与来源；教师新增为“待审核”', constraints: { system: true, readOnly: true } }
        ] },
        { heading: '账号邀请', fields: [
          { id: 'FD-TEACHER-035', label: '邀请手机号', type: '只读', length: '11 位数字', required: '系统取值', note: '取联系方式中的手机号，作为教师激活和登录身份', constraints: { readOnly: true, sourceField: 'FD-TEACHER-014' } },
          { id: 'FD-TEACHER-036', label: '初始账号状态', type: '只读', length: '未激活', required: '系统取值', note: '待完善资料不创建账号；完成建档后为未激活，教师激活后为正常', constraints: { readOnly: true, system: true } },
          { id: 'FD-TEACHER-037', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '内部备注，不影响建档结果', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '保存草稿：资料状态为“待完善”，不创建账号、不发送邀请。',
        '完成建档并发送邀请：校验姓名、人员类型、身份证号、手机号和至少一个授课专业。',
        '校验通过后资料状态为“已建档”，人员状态默认为“在职”，账号状态为“未激活”。',
        '邀请失败不回退建档结果，可复用同一教师记录重新发送邀请。',
        '教师验证建档手机号、设置本人密码并同意协议后，账号状态转为“正常”，后台不设置初始密码。',
        '证书子表不作为完成建档的必填项；证书缺失不影响课程申报，但会在课程发布、班级发布或排课时按目标专业进入资质校验。'
      ]
    },
    'teachers/contracts': {
      title: '合同列表',
      groups: [
        { heading: '发起合同字段', fields: [
          { id: 'FD-TEACHER-038', label: '教师', type: '下拉', length: '可选教师', required: '是', note: '选择后自动带入身份证号与已归档信息', constraints: { dictionary: '教师档案' } },
          { id: 'FD-TEACHER-039', label: '身份证号', type: '文本（只读）', length: '18 位', required: '系统带入', note: '按所选教师自动读取', constraints: { readOnly: true, sourceField: 'FD-TEACHER-006' } },
          { id: 'FD-TEACHER-047', label: '课程', type: '多选', length: '至少 1 门', required: '是', note: '取自课程库中与教师授课专业匹配的课程；新入职教师先签合同后申报课程，候选集不依赖教师本人的申报记录', constraints: { dictionary: '课程库', minItems: 1, multi: true, matchMajor: true } },
          { id: 'FD-TEACHER-048', label: '合同编号', type: '只读', length: 'CT+年月日+序号', required: '系统生成', note: '按规则自动生成且全局唯一；取消或关闭弹窗不生成编号；续签生成新编号，原编号保留', constraints: { system: true, readOnly: true, unique: true, numberRule: 'CT+YYYYMMDD+序号' } },
          { id: 'FD-TEACHER-040', label: '合同模板', type: '下拉', length: '预置模板', required: '是', note: '决定合同条款与签署方式', constraints: { dictionary: '合同模板' } },
          { id: 'FD-TEACHER-041', label: '工作校区', type: '下拉', length: '预置校区', required: '是', note: '合同约定的服务校区', constraints: { dictionary: '校区' } },
          { id: 'FD-TEACHER-042', label: '合同起始日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '合同生效日期', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-TEACHER-043', label: '合同截止日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '需晚于起始日期', constraints: { format: 'YYYY-MM-DD', afterField: 'FD-TEACHER-042' } },
          { id: 'FD-TEACHER-044', label: '课时费标准', type: '金额', length: '大于 0', required: '是', note: '每课次含税单价，用于工资核算', constraints: { exclusiveMin: 0, decimals: 2 } },
          { id: 'FD-TEACHER-045', label: '无固定期限', type: '开关', length: '是 / 否', required: '否', note: '开启后合同截止日期不作为必填', constraints: { boolean: true, whenOn: 'FD-TEACHER-043' } },
          { id: 'FD-TEACHER-049', label: '合同状态', type: '只读', length: '6 个状态值', required: '系统计算', note: '推送成功后为待教师签署；教师签名后视学校签署情况进入待学校签署或已签署；到期与终止另行标记', constraints: { system: true, readOnly: true, options: ['待教师签署 pending_teacher', '待学校签署 pending_school', '已签署 signed', '即将到期 expiring', '已到期 expired', '已终止 terminated'] } },
          { id: 'FD-TEACHER-050', label: '合同文件', type: '预览区域', length: '按模板生成', required: '系统生成', note: '按合同模板和填写内容自动生成 PDF，不需要后台上传；推送后随合同版本留存并可预览', constraints: { system: true, readOnly: true, generated: true, templateDriven: true, noUpload: true } },
          { id: 'FD-TEACHER-046', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '补充约定或内部说明', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '一份合同可以覆盖多门课程；同一教师对同一课程在同一时段只允许一份生效合同。',
        '后续申报通过新课程时，由后台针对该课程另行发起合同补充，不在已推送或已生效的合同上追加课程。',
        '教师工资按课次数乘以合同约定的每课次含税单价计算。',
        '续签基于原合同带入信息，生成新合同编号与递增版本，原合同不被覆盖。',
        '终止须记录原因及生效日期，两端同步，已完成课次和历史计薪保留。',
        '合同与证书、人员状态、账号状态独立维护，不相互级联。'
      ]
    },
    'teachers/certificates': {
      groups: [
        { heading: '证书审核字段', fields: [
          { id: 'FD-TEACHER-051', label: '审核结果', type: '单选', length: '审核通过 / 审核不通过', required: '是', note: '决定该证书是否可用于目标专业的资质校验', constraints: { options: ['审核通过', '审核不通过'] } },
          { id: 'FD-TEACHER-052', label: '审核意见', type: '多行文本', length: '≤ 500 字', required: '审核不通过时必填', note: '填写后同步给上传人，说明需要补充或更正的内容', constraints: { maxLength: 500, requiredWhen: 'FD-TEACHER-051=审核不通过' } },
          { id: 'FD-TEACHER-053', label: '证书文件', type: '文件上传', length: '单个文件', required: '重传时必填', note: '重传产生新的文件版本，旧版本保留可追溯', constraints: { maxFiles: 1 } },
          { id: 'FD-TEACHER-054', label: '上传说明', type: '多行文本', length: '≤ 200 字', required: '否', note: '说明重传原因或补充材料', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '后台录入的证书直接为“审核通过”；教师端上传的证书为“待审核”。',
        '审核不通过必须填写原因；教师或后台重新上传后状态回到“待审核”。',
        '证书审核状态与证书有效性状态分别维护，有效性按有效期截止日期独立计算。',
        '证书缺失不作为课程申报前置条件，但课程发布、班级发布与排课按目标专业进入资质校验。'
      ]
    },
    'teachers/list': {
      groups: [
        { heading: '批量导入字段', fields: [
          { id: 'FD-TEACHER-055', label: '姓名', type: '文本', length: '2–30 字', required: '是', note: '教师真实姓名，导入后写入教师档案', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-TEACHER-056', label: '人员类型', type: '单选', length: '在编 / 签约 / 外聘', required: '是', note: '决定人员用工口径，与账号状态相互独立', constraints: { options: ['在编', '签约', '外聘'] } },
          { id: 'FD-TEACHER-057', label: '身份证号', type: '文本', length: '18 位', required: '是', note: '需唯一，重复或格式不符的行不建档', constraints: { maxLength: 18, pattern: '^\\d{17}[\\dXx]$', unique: true } },
          { id: 'FD-TEACHER-058', label: '手机号', type: '文本', length: '11 位数字', required: '是', note: '需唯一；作为账号激活与登录身份', constraints: { maxLength: 11, pattern: '^1[3-9]\\d{9}$', unique: true } },
          { id: 'FD-TEACHER-059', label: '授课专业', type: '三级级联多选', length: '至少 1 个', required: '是', note: '按门类 → 分类 → 专业选择，可填写多个', constraints: { minItems: 1 } },
          { id: 'FD-TEACHER-060', label: '车牌号', type: '文本', length: '7–8 位', required: '否', note: '选填，教师端不可维护', constraints: { minLength: 7, maxLength: 8 } }
        ] },
        { heading: '列表状态操作字段', fields: [
          { id: 'FD-TEACHER-061', label: '名师推荐', type: '开关', length: '是 / 否', required: '否', note: '仅控制学员端名师推荐展示，不参与教师能力计算；默认关闭', constraints: { boolean: true } },
          { id: 'FD-TEACHER-062', label: '操作类型', type: '单选', length: '冻结 / 解冻 / 离职 / 重新发送邀请', required: '是', note: '冻结与解冻只改账号状态，离职只改人员状态，两者不互相改写', constraints: { options: ['冻结', '解冻', '离职', '重新发送邀请'] } },
          { id: 'FD-TEACHER-063', label: '操作原因', type: '多行文本', length: '≤ 200 字', required: '冻结与离职时必填', note: '写入状态变更记录，供审计与复核', constraints: { maxLength: 200, requiredWhen: 'FD-TEACHER-062=冻结,离职' } }
        ] }
      ],
      notes: [
        '批量导入固定模板六字段，先校验后确认，确认后才建档并发送激活邀请。',
        '允许部分成功：失败行不建档并给出逐行原因，已建档行的邀请失败不回滚。',
        '工号由系统生成，不导入密码、证书和合同，不覆盖已有教师。',
        '冻结只暂停登录，离职只停止新增未来排课，历史授课、考勤与结算记录均保留。',
        '重新发送邀请仅用于未激活账号；教师完成激活后账号状态转为正常。'
      ]
    }
  }
};
