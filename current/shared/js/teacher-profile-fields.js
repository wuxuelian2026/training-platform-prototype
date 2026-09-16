// CR-2026-022：教师档案字段模型（唯一事实源）。
//
// 教师端“我的档案”编辑表单与后台教师详情页的“本人维护字段／变更审计”共用这一份定义，
// 避免两端各写一套字段清单导致口径漂移。字段分层依据 CR-2026-022 §2：
//   - 黑名单 5 项（工号、姓名、身份证号、人员类型、授课专业）由学校维护，教师端只读；
//   - 其余档案字段教师本人可维护，保存后直接生效并逐字段写入审计。

/** 仅学校后台维护、教师端只读的字段（黑名单）。 */
export const TEACHER_PROFILE_READONLY_FIELDS = [
  { key: 'name', label: '姓名', reason: '身份标识，与身份证、证书和合同保持一致' },
  { key: 'employeeNo', label: '工号', reason: '系统生成且全局唯一' },
  { key: 'idCard', label: '身份证号', reason: '身份标识，加密存储并做唯一校验' },
  { key: 'personnelType', label: '人员类型', reason: '涉及用工与结算口径' },
  { key: 'majors', label: '授课专业', reason: '资质判断与排课准入依据' }
];

/** 教师本人可维护的档案字段（黑名单以外的全部字段）。 */
export const TEACHER_PROFILE_EDITABLE_FIELDS = [
  { key: 'gender', label: '性别', group: '基础信息', control: 'select', options: ['女', '男'], note: '与建档枚举一致' },
  { key: 'birthMonth', label: '出生年月', group: '基础信息', control: 'month' },
  { key: 'politicalStatus', label: '政治面貌', group: '基础信息', control: 'select', options: ['中共党员', '中共预备党员', '共青团员', '民主党派', '群众'] },
  { key: 'ethnicity', label: '民族', group: '基础信息', control: 'text', maxLength: 20 },
  { key: 'highestEducation', label: '最高学历', group: '基础信息', control: 'select', options: ['中专', '大专', '本科', '硕士研究生', '博士研究生'] },
  { key: 'teachingYears', label: '从教年限', group: '基础信息', control: 'number', min: 0 },
  { key: 'professionalTitle', label: '职称', group: '基础信息', control: 'select', options: ['教授', '副教授', '讲师', '助教', '高级教师', '一级教师', '二级教师', '无'] },
  { key: 'carPlate', label: '车牌号', group: '基础信息', control: 'text', optional: true },
  { key: 'mobile', label: '手机号', group: '联系方式', control: 'tel', verifyCode: true },
  { key: 'email', label: '邮箱', group: '联系方式', control: 'email', optional: true },
  { key: 'emergencyName', label: '紧急联系人姓名', group: '联系方式', control: 'text' },
  { key: 'emergencyMobile', label: '紧急联系人电话', group: '联系方式', control: 'tel' },
  { key: 'payeeName', label: '收款户名', group: '收付款信息', control: 'text', note: '须与本人姓名一致' },
  { key: 'bankCard', label: '银行卡号', group: '收付款信息', control: 'text' },
  { key: 'bankName', label: '开户行', group: '收付款信息', control: 'text' },
  { key: 'education', label: '学习经历', group: '经历与介绍', control: 'textarea', maxLength: 500, optional: true },
  { key: 'employment', label: '工作经历', group: '经历与介绍', control: 'textarea', maxLength: 500, optional: true },
  { key: 'awards', label: '获奖情况', group: '经历与介绍', control: 'textarea', maxLength: 500, optional: true },
  { key: 'tagline', label: '一句话简介', group: '经历与介绍', control: 'textarea', maxLength: 200, optional: true, note: '学员端教师详情展示' },
  { key: 'introduction', label: '简介', group: '经历与介绍', control: 'textarea', maxLength: 2000, optional: true, note: '学员端“个人简介”正文' }
];

export const TEACHER_PROFILE_GROUPS = ['基础信息', '联系方式', '收付款信息', '经历与介绍'];

export const TEACHER_PROFILE_GROUP_NOTE = { 收付款信息: '仅用于工资发放', 经历与介绍: '内部管理与教师端展示' };

/** 展示与审计中需要脱敏的字段。 */
export const TEACHER_PROFILE_MASK_KEYS = ['mobile', 'emergencyMobile', 'bankCard'];

export const TEACHER_PROFILE_LABELS = Object.fromEntries(TEACHER_PROFILE_EDITABLE_FIELDS.map((field) => [field.key, field.label]));

export const teacherProfileMask = (key, value) => {
  const text = String(value ?? '');
  if (!TEACHER_PROFILE_MASK_KEYS.includes(key) || text.length < 5) return text;
  return text.length <= 7 ? `${text.slice(0, 2)}****${text.slice(-1)}` : `${text.slice(0, 3)}****${text.slice(-4)}`;
};
