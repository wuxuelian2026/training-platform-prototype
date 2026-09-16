// 教师能力校验器：唯一的准入判断实现。
//
// 输入是事实（teacher-facts.js）与请求上下文（专业／课程／课次日期／用途），
// 输出是结论与可解释的原因。硬阻断用 blocks，提醒用 warnings。
// 调用方只负责展示，不再自行复算规则。
const DAY = 24 * 60 * 60 * 1000;
const toTime = (iso) => (iso ? new Date(`${iso}T00:00:00`).getTime() : Number.POSITIVE_INFINITY);

const certificateMatches = (certificate, major, date) => certificate.status === '已通过'
  && (!certificate.majors?.length || certificate.majors.includes(major))
  && toTime(certificate.expiresAt) >= toTime(date);

// 某专业在该日期是否具备有效资质；返回命中的证书。
export const validCertificateFor = (facts, major, date) => (facts?.certificates || [])
  .filter((certificate) => certificateMatches(certificate, major, date))
  .sort((a, b) => toTime(a.expiresAt) - toTime(b.expiresAt))[0] || null;

// 到期提醒：在课次日期当天仍有效、但在提醒窗口内到期的证书。
const expiringCertificateFor = (facts, major, date, windowDays = 60) => (facts?.certificates || [])
  .filter((certificate) => certificateMatches(certificate, major, date))
  .filter((certificate) => certificate.expiresAt && toTime(certificate.expiresAt) - toTime(date) <= windowDays * DAY)[0] || null;

const contractCovers = (facts, request) => (facts?.contracts || []).find((contract) => {
  if (contract.status !== '已签署') return false;
  if (request.course && contract.courses?.length && !contract.courses.includes(request.course)) return false;
  if (request.major && contract.majors?.length && !contract.majors.includes(request.major)) return false;
  if (!request.date) return true;
  return toTime(contract.startAt) <= toTime(request.date) && toTime(request.date) <= toTime(contract.endAt);
}) || null;

// purpose：apply（课程申报）／arrange（排课）。申报不校验证书与合同，排课必须校验。
export function explainTeacherCapacity(facts, request = {}) {
  const { major = '', course = '', date = '', purpose = 'arrange' } = request;
  const blocks = [];
  const warnings = [];

  if (facts.profileStatus !== '已建档') blocks.push({ code: 'profile_incomplete', text: '资料待完善，请先完成建档' });
  const departed = Boolean(facts.departedAt) || facts.personnelStatus === '离职';
  if (departed) blocks.push({ code: 'departed', text: facts.departedAt ? `已于 ${facts.departedAt} 离职` : '人员已离职' });
  if (facts.accountStatus !== 'active') {
    const text = facts.accountStatus === 'frozen' ? '账号已冻结，无法登录教师端' : '账号未激活，无法登录教师端';
    if (purpose === 'apply') blocks.push({ code: 'account', text });
    else warnings.push({ code: 'account', text: `${text}（不影响排课，需提醒教师处理）` });
  }
  if (!facts.majors?.length) blocks.push({ code: 'no_major', text: '未配置授课专业' });
  else if (major && !facts.majors.includes(major)) blocks.push({ code: 'major_scope', text: `${major} 不在可授课专业范围` });

  if (purpose !== 'apply' && major && !departed) {
    const certificate = validCertificateFor(facts, major, date);
    if (!certificate) {
      const pending = (facts.certificates || []).find((item) => item.status === '待审核' && item.majors?.includes(major));
      blocks.push({ code: 'no_certificate', text: pending ? `${major} 资质待审核，暂不能排课` : `${major} 无有效资质` });
    } else {
      const expiring = expiringCertificateFor(facts, major, date);
      if (expiring) warnings.push({ code: 'certificate_expiring', text: `${expiring.name} 将于 ${expiring.expiresAt} 到期，请提前续期` });
    }
    const contract = contractCovers(facts, { major, course, date });
    if (!contract) blocks.push({ code: 'no_contract', text: course ? `生效合同未覆盖「${course}」在该课次日期的授课` : `${major} 在该日期无生效合同` });
  }

  return {
    status: blocks.length ? 'blocked' : 'available',
    label: blocks.length ? '暂不可用' : '可用',
    blocks,
    warnings,
    reasons: [...blocks, ...warnings].map((item) => item.text)
  };
}

// 视图层汇总：可授课专业数量、各专业资质结论、档案与账号问题。
// 注意这里刻意不产出教师级“可排课”结论，排课结论只在具体（专业 × 日期）下成立。
export function summarizeTeacherCapacity(facts, today = new Date().toISOString().slice(0, 10)) {
  const majors = (facts?.majors || []).map((major) => {
    const certificate = validCertificateFor(facts, major, today);
    return {
      major,
      qualified: Boolean(certificate),
      certificate: certificate ? `${certificate.name}（至 ${certificate.expiresAt || '长期有效'}）` : '',
      hint: certificate ? '' : '缺有效资质'
    };
  });
  const issues = [];
  if (facts?.profileStatus !== '已建档') issues.push({ code: 'profile_incomplete', text: '资料待完善' });
  if (facts?.departedAt || facts?.personnelStatus === '离职') issues.push({ code: 'departed', text: '已离职' });
  if (facts?.accountStatus === 'frozen') issues.push({ code: 'account_frozen', text: '账号冻结' });
  else if (facts?.accountStatus === 'inactive') issues.push({ code: 'account_inactive', text: '账号未激活' });
  return {
    majorCount: majors.length,
    qualifiedCount: majors.filter((item) => item.qualified).length,
    majors,
    issues,
    blocked: issues.some((item) => ['profile_incomplete', 'departed'].includes(item.code))
  };
}
