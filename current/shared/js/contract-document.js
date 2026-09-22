// 合同条文渲染的唯一实现：后台合同详情与教师端合同阅读器共用同一份模板，
// 避免同一份合同两端看到不同条文。

const docEsc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const money2 = (value) => Number(value || 0).toFixed(2);

/**
 * 渲染合同条文 HTML。
 * @param {{type?:string,number?:string,course?:string,startAt?:string,endAt?:string,campus?:string,rate?:number|string,schoolFile?:string,teacherFile?:string,partyB?:string}} contract
 */
export function contractDocumentHtml(contract = {}) {
  const type = docEsc(contract.type);
  const number = docEsc(contract.number);
  const course = docEsc(contract.course);
  const startAt = docEsc(contract.startAt);
  const endAt = docEsc(contract.endAt || '长期有效');
  const campus = docEsc(contract.campus);
  const partyB = docEsc(contract.partyB || '王玥');
  const schoolSigned = contract.schoolFile ? '已上传学校签署件' : '待学校签署';
  const teacherSigned = contract.teacherFile ? '已上传教师签署件' : '待教师上传';
  return `<article class="teacher-contract-document"><div class="teacher-contract-document-brand">湖北艺术职业学院继续教育服务平台</div><h2>教师${type}</h2><p class="teacher-contract-document-number">合同编号：${number}</p><div class="teacher-contract-parties"><p>甲方：湖北艺术职业学院继续教育学院</p><p>乙方：${partyB}</p></div><section><h3>第一条 合作事项</h3><p>甲方聘请乙方承担${course}课程教学工作。乙方根据教学计划完成备课、授课、考勤、作业及教学记录。</p></section><section><h3>第二条 合同期限</h3><p>合同期限为${startAt}至${endAt}。课程安排以教务系统发布的课表为准。</p></section><section><h3>第三条 工作地点</h3><p>主要工作地点为${campus}。因教学需要调整校区或教室时，甲方应提前通知乙方。</p></section><section><h3>第四条 课时与报酬</h3><p>每课次含税单价为人民币 ${money2(contract.rate)} 元／每次课（含税）。有效课时以教师完成上课打卡、学员考勤和教学记录后，由系统确认的数据为准。</p></section><section><h3>第五条 教学要求</h3><p>乙方应遵守教学管理制度，按时到岗，不得擅自调课、停课或委托他人代课。确需调整时，应提前向教务部门申请。</p></section><section><h3>第六条 信息与保密</h3><p>乙方在履约过程中接触的学员信息、教学资料和平台数据仅限教学使用，未经许可不得向无关人员披露。</p></section><section><h3>第七条 合同变更与终止</h3><p>合同内容需要变更时，由双方协商确认。出现严重违反教学管理要求或无法继续履约的情形，可按约定终止合同。</p></section><section><h3>第八条 其他</h3><p>未尽事项由双方协商确认。本合同以双方线下签署后的 PDF 归档件为准。</p></section><div class="teacher-contract-document-signatures"><div><span>甲方（盖章）</span><strong>${schoolSigned}</strong></div><div><span>乙方（签名）</span><strong>${teacherSigned}</strong></div></div></article>`;
}
