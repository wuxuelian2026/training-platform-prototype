(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// CR-2026-172 在线客服与常见问题库 · 静态 mock 数据层（单一事实源）
// 去 AI 化：本模块为关键词规则检索，不涉及模型、语义相似度或多轮上下文。
// 知识条目/未命中归并组/导入批次存 hbyx-service-demo-v1；客服留言复用 demo-store 的 consultations。
const KEY = 'hbyx-service-demo-v1';
const SERVICE_CATEGORIES = ['报名缴费', '课程学习', '考务考级', '证书', '其他'];
const SERVICE_STATUSES = ['上架', '下架'];
const SERVICE_HEADERS = ['标准问题', '同义问法', '答案', '分类', '状态'];
const MAX_ANSWER = 500;
const MAX_QUESTION = 200;

const clone = (value) => JSON.parse(JSON.stringify(value || {}));
const nowText = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
// 六步规范化：trim → NFKC → 小写 → 去空白 → 去标点/符号 → 保留中文/字母/数字
const normalizeQuestion = (raw) => String(raw == null ? '' : raw)
  .trim().normalize('NFKC').toLowerCase()
  .replace(/\s+/g, '')
  .replace(/[\p{P}\p{S}]/gu, '');

// 示例数据均为虚构，仅用于原型演示，不代表真实客服话术。
const SEED_KB = [
  ['怎么报名', '如何报名,报名流程,在哪报名', '进入「课程」或「快速报名」选择班级，点击「立即报名」并按提示完成信息填写与支付；支付成功后可在「我的订单」查看。', '报名缴费', '上架'],
  ['报名后可以退费吗', '能退款吗,退费规则', '未开课可申请退费；开课后按已消课比例核算。具体以报名时签署的协议与官方通知为准。', '报名缴费', '上架'],
  ['学费怎么交', '缴费方式,支持哪些支付', '小程序内支持在线支付，也可到教务窗口现场缴费；缴费凭证请在「我的订单」查看。', '报名缴费', '上架'],
  ['课程表在哪里看', '课表查询,上课时间', '登录学员端进入「学习」页，选择班级即可查看课表；教师端可在「我的课表」查询。', '课程学习', '上架'],
  ['缺课了能补课吗', '请假,补课安排', '请在班级详情内提交请假说明，教务会根据班级进度安排补课或提供课程回放，以教务通知为准。', '课程学习', '上架'],
  ['作业在哪里提交', '交作业,作业入口', '进入「学习」→ 班级详情 → 对应课次，在作业卡片内提交；提交状态会同步显示。', '课程学习', '上架'],
  ['考级什么时候报名', '考级时间,等级考试报名', '考级报名一般在每学期开学后开放，具体批次与时间以教务发布的官方通知为准。', '考务考级', '上架'],
  ['考级需要准备什么材料', '考级材料,考试证件', '通常需身份证或户口本复印件、近期免冠照片与报名表；以当期考级通知为准。', '考务考级', '上架'],
  ['结业证书怎么领取', '证书领取,结业证', '完成规定课时且考核合格后，由教务统一制作；领取时间与方式以官方通知为准。', '证书', '上架'],
  ['证书丢了可以补办吗', '补办证书', '可联系教务提交补办申请，需核验身份与原始学习记录，补办周期以教务答复为准。', '证书', '上架'],
  ['忘记密码怎么办', '密码找回', '在登录页点「忘记密码」，通过绑定手机号验证后重置；如手机号已更换请联系教务。', '其他', '上架'],
  ['如何联系教务', '客服电话,人工咨询', '可在「在线客服」页点「没解决？留言咨询」提交问题，客服会在工作日回复。', '其他', '下架']
];

const seedState = () => ({
  kb: SEED_KB.map((row, index) => ({
    id: 'KB' + String(index + 1).padStart(3, '0'),
    question: row[0],
    synonyms: row[1] ? row[1].split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
    answer: row[2],
    category: row[3],
    status: row[4],
    createdAt: '2026-09-01 09:' + String(index).padStart(2, '0')
  })),
  misses: [],
  batches: []
});

function readServiceState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || !Array.isArray(raw.kb)) return seedState();
    return { kb: raw.kb, misses: Array.isArray(raw.misses) ? raw.misses : [], batches: Array.isArray(raw.batches) ? raw.batches : [] };
  } catch { return seedState(); }
}
function writeServiceState(mutator) {
  const next = readServiceState();
  mutator(next);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
const resetServiceState = () => { localStorage.removeItem(KEY); return readServiceState(); };

const kbList = (state) => state.kb.slice().sort((a, b) =>
  String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));

// 命中范围仅已上架；标准问题或同义问法规范化后与提问互相包含即命中；多条按 createdAt 升序取第一个。
function matchKbItems(question, state) {
  const normalized = normalizeQuestion(question);
  if (!normalized) return { normalized, items: [] };
  const items = kbList(state).filter(item => item.status === '上架').filter(item => {
    const candidates = [item.question].concat(item.synonyms || []).map(normalizeQuestion).filter(Boolean);
    return candidates.some(q => q === normalized || q.includes(normalized) || normalized.includes(q));
  });
  return { normalized, items };
}

function recordMiss(question, normalized, state) {
  // 已转化组不唤醒（对应条目下架后同问题再次未命中 → 新建独立组）；已忽略组累加且不回退。
  const group = state.misses.find(g => g.groupKey === normalized && g.status !== '已转化');
  if (group) {
    group.count += 1;
    group.lastAt = nowText();
    if (!group.status) group.status = '待处理';
    return group;
  }
  const fresh = {
    id: 'MS' + Date.now() + Math.floor(Math.random() * 100),
    groupKey: normalized,
    displayQuestion: String(question).trim(),
    count: 1,
    firstAt: nowText(),
    lastAt: nowText(),
    status: '待处理'
  };
  state.misses.unshift(fresh);
  return fresh;
}

function ask(question) {
  const raw = String(question == null ? '' : question).trim();
  const normalized = normalizeQuestion(raw);
  if (!normalized) return { status: 'invalid', normalized, message: '请输入有效文字' };
  if (raw.length > MAX_QUESTION) return { status: 'invalid', normalized, message: `请输入 ${MAX_QUESTION} 字以内的问题` };
  const state = readServiceState();
  const { items } = matchKbItems(raw, state);
  if (items.length) return { status: 'hit', normalized, item: items[0], total: items.length };
  writeServiceState(next => recordMiss(raw, normalized, next));
  return { status: 'miss', normalized, message: '暂时回答不了这个问题，已记录，可留言咨询' };
}

function saveKbItem(payload) {
  const question = String(payload.question || '').trim();
  const answer = String(payload.answer || '').trim();
  if (!question) return { ok: false, message: '标准问题不能为空' };
  if (!answer) return { ok: false, message: '答案不能为空' };
  if (answer.length > MAX_ANSWER) return { ok: false, message: `答案不能超过 ${MAX_ANSWER} 字` };
  if (!SERVICE_CATEGORIES.includes(payload.category)) return { ok: false, message: '分类不在字典范围内' };
  if (!SERVICE_STATUSES.includes(payload.status)) return { ok: false, message: '状态不合法' };
  const synonyms = Array.isArray(payload.synonyms) ? payload.synonyms : String(payload.synonyms || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
  try {
    writeServiceState(next => {
      const key = normalizeQuestion(question);
      const duplicate = next.kb.find(item => normalizeQuestion(item.question) === key && item.id !== payload.id);
      if (duplicate) throw new Error('标准问题已存在，请修改后保存');
      const existing = payload.id ? next.kb.find(item => item.id === payload.id) : null;
      if (existing) Object.assign(existing, { question, synonyms, answer, category: payload.category, status: payload.status });
      else next.kb.push({
        id: 'KB' + Date.now() + Math.floor(Math.random() * 100),
        question, synonyms, answer, category: payload.category, status: payload.status, createdAt: nowText()
      });
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message || '保存失败' };
  }
}
const removeKbItem = (id) => writeServiceState(next => { next.kb = next.kb.filter(item => item.id !== id); });
const toggleKbStatus = (id) => writeServiceState(next => {
  const item = next.kb.find(x => x.id === id);
  if (item) item.status = item.status === '上架' ? '下架' : '上架';
});
// 不嵌套 writeServiceState，避免内层写入被外层旧快照覆盖。
function missAction(id, action, payload) {
  const group = readServiceState().misses.find(g => g.id === id);
  if (!group || group.status !== '待处理') return { ok: false, message: '该归并组不可处置' };
  if (action === 'ignore') {
    writeServiceState(next => {
      const g = next.misses.find(x => x.id === id);
      if (g) { g.status = '已忽略'; g.handledAt = nowText(); }
    });
    return { ok: true };
  }
  if (action === 'convert') {
    const result = saveKbItem({
      question: payload.question || group.displayQuestion,
      synonyms: payload.synonyms || [],
      answer: payload.answer,
      category: payload.category,
      status: '上架'
    });
    if (!result.ok) return result;
    writeServiceState(next => {
      const g = next.misses.find(x => x.id === id);
      if (g) { g.status = '已转化'; g.handledAt = nowText(); }
    });
    return { ok: true };
  }
  return { ok: false, message: '未知操作' };
}

function validateImportRows(rows) {
  const body = rows.slice(1).filter(row => row && row.some(cell => String(cell == null ? '' : cell).trim()));
  const checked = body.map((row, index) => {
    const cells = [0, 1, 2, 3, 4].map(i => String(row[i] == null ? '' : row[i]).trim());
    const reasons = [];
    if (!cells[0]) reasons.push('标准问题为空');
    if (!cells[2]) reasons.push('答案为空');
    if (cells[2].length > MAX_ANSWER) reasons.push(`答案超过 ${MAX_ANSWER} 字`);
    if (!SERVICE_CATEGORIES.includes(cells[3])) reasons.push('分类不在字典范围内');
    if (!SERVICE_STATUSES.includes(cells[4])) reasons.push('状态不合法');
    return { line: index + 2, cells, reasons, blocked: reasons.length > 0 };
  });
  return checked;
}
function applyImportRows(checked, filename) {
  let success = 0, failed = 0, overwritten = 0;
  const state = writeServiceState(next => {
    checked.forEach(row => {
      if (row.blocked) { failed += 1; return; }
      const [question, synonyms, answer, category, status] = row.cells;
      const key = normalizeQuestion(question);
      const existing = next.kb.find(item => normalizeQuestion(item.question) === key);
      const record = {
        question, synonyms: synonyms ? synonyms.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
        answer, category, status, updatedAt: nowText()
      };
      if (existing) { Object.assign(existing, record); overwritten += 1; }
      else next.kb.push(Object.assign({ id: 'KB' + Date.now() + Math.floor(Math.random() * 1000) + success, createdAt: nowText() }, record));
      success += 1;
    });
    next.batches.unshift({
      id: 'IMP' + Date.now(), file: filename || '未命名.xlsx', operator: '李教务',
      createdAt: nowText(), success, failed, overwritten,
      note: failed ? `${failed} 行因校验未通过被跳过，其余行已入库。` : '全部行已入库。'
    });
  });
  return { success, failed, overwritten, state };
}

// 客服留言复用 demo-store 的 consultations；后台回复直接写回，学员端「我的咨询」即可见。
function demoApi() {
  const mod = __classicRequire('shared/js/demo-store.js') || {};
  return { read: mod.readDemoState || (() => ({ consultations: [] })), write: mod.writeDemoState || (() => {}) };
}
const serviceLeaves = () => {
  const api = demoApi();
  let state;
  try { state = api.read(); } catch { state = {}; }
  return (Array.isArray(state.consultations) ? state.consultations : []).filter(row => row && row.source === 'service');
};
function replyServiceLeave(id, text) {
  const value = String(text || '').trim();
  if (!value) return { ok: false, message: '回复内容不能为空' };
  if (value.length > MAX_ANSWER) return { ok: false, message: `回复内容不能超过 ${MAX_ANSWER} 字` };
  const api = demoApi();
  const fn = api.write;
  if (typeof fn !== 'function') return { ok: false, message: '演示数据未就绪' };
  fn(next => {
    const row = (next.consultations || []).find(item => item.id === id);
    if (row) { row.reply = value; row.replyAt = nowText(); row.status = '已回复'; row.progress = '已回复'; }
  });
  return { ok: true };
}

const API = {
  KEY, SERVICE_CATEGORIES, SERVICE_STATUSES, SERVICE_HEADERS, MAX_ANSWER, MAX_QUESTION,
  normalizeQuestion, readServiceState, writeServiceState, resetServiceState, kbList,
  matchKbItems, ask, recordMiss, saveKbItem, removeKbItem, toggleKbStatus, missAction,
  validateImportRows, applyImportRows, serviceLeaves, replyServiceLeave, nowText
};
__classicExports['HbyxService'] = API;
global.HbyxService = API;
__classicModules['shared/js/service-store.js'] = __classicExports;
})(globalThis);
