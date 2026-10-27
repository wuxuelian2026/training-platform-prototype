(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
const { readDemoState, refundSettings, removeDemoRecord, upsertDemoRecord } = __classicRequire("shared/js/demo-store.js");
const { REFUND_ORIGIN, createRefundRequest, ensureRefundRecords, mergeRefundsInto, registerCompletedOfflineRefund, settleRefund } = __classicRequire("shared/js/refund-store.js");
const { DEMO_TODAY, demoDateTime } = __classicRequire("shared/js/demo-clock.js");
const { readAdminSession } = __classicRequire("shared/js/admin-auth.js");
const { readXlsxSheetRows } = __classicRequire("shared/js/xlsx-lite.js");
const { writeXlsxSheetRows } = __classicRequire("shared/js/xlsx-lite.js");

const opsRoot = document.querySelector('[data-finance-page], [data-inventory-page]');
const opsPage = opsRoot?.dataset.financePage || opsRoot?.dataset.inventoryPage;
const opsKind = opsRoot?.dataset.financePage ? 'finance' : 'inventory';
let opsData = null;
let opsToastTimer;
let salaryActiveTab = 'calculation';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const statusClass = (value) => ({
  草稿: 'gray', 核算中: 'amber', 待发布: 'brand', 已发布: 'green', 待发放: 'amber', 发放中: 'brand', 已发放: 'green', 发放失败: 'red', 部分失败: 'red', 已到账: 'green', 待确认: 'amber', 异常: 'red', 退款中: 'brand', 已退款: 'green', 已拒绝: 'gray',
  正常: 'green', 库存不足: 'amber', 启用: 'green', 停用: 'gray', 待处理: 'amber', 已处理: 'green', 通过: 'green', 拒绝: 'red', '部分成功': 'amber', '全部失败': 'red'
}[value] || 'gray');
const tag = (value) => `<span class="tag ${statusClass(value)}">${esc(value)}</span>`;
const money = (value) => `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function showToast(message, kind = 'success') { const el = document.querySelector('[data-ops-toast]'); if (!el) return; el.textContent = message; el.dataset.kind = kind; el.hidden = false; clearTimeout(opsToastTimer); opsToastTimer = setTimeout(() => { el.hidden = true; }, 2800); }
function closeDialog() { document.querySelector('[data-ops-dialog]')?.remove(); }
function openDialog(title, subtitle, body, actions = '<button type="button" class="button" data-dialog-close>关闭</button>') { closeDialog(); const dialog = document.createElement('dialog'); dialog.className = 'ops-dialog'; dialog.dataset.opsDialog = 'true'; dialog.innerHTML = `<div class="ops-dialog-card"><div class="ops-dialog-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button type="button" class="icon-button" data-dialog-close title="关闭" aria-label="关闭">×</button></div>${body}<div class="ops-dialog-actions">${actions}</div></div>`; document.body.append(dialog); dialog.showModal(); return dialog; }
function pageFrame(title, description, controls, content) { if (!opsRoot) return; opsRoot.innerHTML = `<div class="ops-page"><div class="page-head"><div><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div><div class="ops-page-head-actions">${controls || ''}</div></div>${content}<div class="toast" data-ops-toast role="status" aria-live="polite" hidden></div></div>`; }
function field(label, name, type = 'text', placeholder = '', wide = false) {
  const textLimits = { orderNo: 50, teacher: 30, student: 30, course: 50, reason: 200, remark: 200, deductionReason: 200, voucher: 100, failureReason: 200 };
  const attrs = type === 'number'
    ? ' min="0" step="0.01"'
    : (textLimits[name] ? ` maxlength="${textLimits[name]}"` : '');
  return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><input type="${type}" name="${name}" placeholder="${placeholder}"${attrs}></label>`;
}
function select(label, name, options, wide = false, all = true) { return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><select name="${name}">${all ? `<option value="">全部${label}</option>` : ''}${options.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}</select></label>`; }
function searchableSelect(label, name, options, wide = false) {
  const listId = `finance-${name}-options`;
  const values = [...new Set(options.filter(Boolean))];
  return `<label class="form-field${wide ? ' wide' : ''}"><span>${label}</span><input type="search" name="${name}" list="${listId}" placeholder="搜索并选择${label}" autocomplete="off"><datalist id="${listId}">${values.map((item) => `<option value="${esc(item)}"></option>`).join('')}</datalist></label>`;
}
function filterPanel(id, fields) { return `<div class="filter-panel" data-filter-drawer-shell="${id}"><button type="button" class="button filter-drawer-trigger" data-filter-drawer-trigger="${id}" aria-expanded="false" aria-controls="${id}"><span class="filter-trigger-icon" aria-hidden="true"></span>筛选条件</button><div class="filter-drawer-backdrop" data-filter-drawer-backdrop="${id}" hidden></div><form class="card filter-form" id="${id}"><div class="filter-head"><strong>筛选条件</strong><button type="button" class="icon-button filter-drawer-close" data-filter-drawer-close="${id}" title="关闭筛选条件" aria-label="关闭筛选条件">×</button></div><div class="filter-grid ops-filter-grid">${fields}</div><div class="filter-actions"><button type="reset" class="button">重置</button><button type="submit" class="button primary">查询</button></div></form></div>`; }
function table(head, className = '') { return `<div class="table-wrap ops-table ${className}"><table>${head}<tbody class="table-body"></tbody></table></div><div class="pagination-bar"><span class="result-count">—</span><button class="button" disabled>上一页</button><button class="button primary">1</button><button class="button" disabled>下一页</button></div>`; }
function metrics(items) { return `<div class="card-grid compact-metrics">${items.map(([label, value, note]) => `<div class="card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`).join('')}</div>`; }
function renderRows(rows, template, empty = '暂无符合条件的数据。') { const body = opsRoot.querySelector('.table-body'); if (!body) return; body.innerHTML = rows.length ? rows.map((row) => `<tr data-row-id="${esc(row.id)}">${template(row)}</tr>`).join('') : `<tr><td colspan="20"><div class="empty">${empty}</div></td></tr>`; const count = opsRoot.querySelector('.result-count'); if (count) count.textContent = `共 ${rows.length} 条`; }
function bindFilter(id, source, predicate, template) { document.querySelector(`#${id}`)?.addEventListener('submit', (event) => { event.preventDefault(); renderRows(source.filter(predicate(event.currentTarget)), template); }); document.querySelector(`#${id}`)?.addEventListener('reset', () => setTimeout(() => renderRows(source, template), 0)); }

const salaries = [
  { id: 'salary-wang', teacher: '王玥', staffNo: 'T2024008', category: '舞蹈类', month: '2026-08', expectedLessons: 18, actualLessons: 16, hours: 32, payable: 5580, systemDeduction: 240, deduction: 240, tax: 36.8, status: '待发布', paymentStatus: '已发布', batchId: '', account: '中国建设银行 尾号 2866', sourceLessons: ['lesson-2026-08-01', 'lesson-2026-08-08'], sourceAttendance: '已完成', sourceTeachingRecords: '已完成', contractRateSnapshot: '合同 CR-2026-046 · ¥180/每课时(45分钟)', differenceStatus: '正常', details: [{ course: '舞蹈基本功', className: '少儿舞蹈基础班', hours: 20, rate: 180 }, { course: '中国舞身韵训练', className: '成人中国舞提高班', hours: 12, rate: 165 }] },
  { id: 'salary-zhao', teacher: '赵老师', staffNo: 'T2024012', category: '美术类', month: '2026-08', expectedLessons: 14, actualLessons: 14, hours: 28, payable: 5600, systemDeduction: 0, deduction: 0, tax: 78, deductionReason: '', status: '已发布', paymentStatus: '已发布', batchId: '', paidAt: '', account: '中国工商银行 尾号 1138', details: [{ course: '中国画基础', className: '中国画基础班', hours: 20, rate: 200 }, { course: '国画入门工作坊', className: '国画入门工作坊', hours: 8, rate: 200 }] },
  { id: 'salary-chen', teacher: '陈晨', staffNo: 'T2023016', category: '音乐类', month: '2026-08', expectedLessons: 15, actualLessons: 14, hours: 26, payable: 4940, systemDeduction: 100, deduction: 100, tax: null, status: '核算中', paymentStatus: '已发布', batchId: '', account: '中国建设银行 尾号 9072', sourceLessons: ['lesson-2026-08-03'], sourceAttendance: '缺失 1 条', sourceTeachingRecords: '缺失', contractRateSnapshot: '', differenceStatus: '待处理', details: [{ course: '声乐基础', className: '少儿声乐班', hours: 18, rate: 190 }, { course: '成人声乐班', className: '成人声乐班', hours: 8, rate: 190 }] },
  { id: 'salary-liu', teacher: '刘慧', staffNo: 'T2023022', category: '音乐类', month: '2026-08', expectedLessons: 12, actualLessons: 12, hours: 24, payable: 4560, systemDeduction: 0, deduction: 0, tax: 46.8, deductionReason: '', status: '已发布', paymentStatus: '已发布', batchId: '', account: '中国银行 尾号 5521', details: [{ course: '钢琴入门', className: '成人钢琴基础班', hours: 24, rate: 190 }] },
  { id: 'salary-sun', teacher: '孙文', staffNo: 'T2024019', category: '舞蹈类', month: '2026-08', expectedLessons: 10, actualLessons: 10, hours: 20, payable: 3600, systemDeduction: 0, deduction: 0, tax: 18, deductionReason: '', status: '已发布', paymentStatus: '已发布', batchId: '', account: '中国农业银行 尾号 6630', details: [{ course: '现代舞基础', className: '现代舞基础班', hours: 20, rate: 180 }] }
];
const salaryBatches = [
  { id: 'PAY20260905001', month: '2026-08', salaryIds: ['salary-zhao'], method: '银行代发', createdAt: '2026-09-04 15:20', operator: '周财务', paidAt: '2026-09-05', status: '已发放', success: 1, failed: 0, voucher: 'BANK202609050086' },
  { id: 'PAY20260906002', month: '2026-08', salaryIds: ['salary-liu'], method: '银行代发', createdAt: '2026-09-06 09:10', operator: '周财务', paidAt: '', status: '全部失败', success: 0, failed: 1, voucher: '' }
];
const payments = [
  { id: 'payment-1', receiptNo: 'RC202609080001', orderNo: 'OD202609080001', student: '林知夏', course: '声乐演唱技巧', source: '视频课程', channel: '微信支付', amount: 1280, time: '2026-09-08 10:18', status: '已到账', businessKey: 'receipt:OD202609080001:微信支付:2026-09-08 10:18:1280', auditStatus: '已核对' },
  { id: 'payment-2', receiptNo: 'RC202609070006', orderNo: 'OD202609060008', student: '周子涵', course: '少儿中国舞基础班', source: '面授课程', channel: '银行转账', amount: 1680, time: '2026-09-07 15:42', status: '待确认', businessKey: 'receipt:OD202609060008:银行转账:2026-09-07 15:42:1680', auditStatus: '待核对' },
  { id: 'payment-3', receiptNo: 'RC202609050002', orderNo: 'OD202609050003', student: '刘女士', course: '成人声乐班', source: '面授课程', channel: '现金', amount: 2280, time: '2026-09-05 11:08', status: '异常', businessKey: 'receipt:OD202609050003:现金:2026-09-05 11:08:2280', auditStatus: '金额或流水待核对', exceptionReason: '现金收款凭证未匹配' },
  { id: 'payment-4', receiptNo: 'RC202609040001', orderNo: 'OD202609040001', student: '何安', course: '艺术歌曲示范课', source: '视频课程', channel: '支付宝', amount: 680, time: '2026-09-04 09:20', status: '已到账', businessKey: 'receipt:OD202609040001:支付宝:2026-09-04 09:20:680', auditStatus: '已核对' },
  { id: 'payment-5', receiptNo: 'RC202609030004', orderNo: 'OD202609030004', student: '陈思远', course: '成人钢琴基础班', source: '面授课程', channel: '银行转账', amount: 1980, time: '2026-09-03 16:05', status: '已撤销', businessKey: 'receipt:OD202609030004:银行转账:2026-09-03 16:05:1980', auditStatus: '已撤销', exceptionReason: '订单号填写错误，已重新登记正确订单' }
];
const refunds = [
  { id: 'refund-1', no: 'RF202609080003', orderNo: 'OD202609060008', student: '周子涵', phone: '139****8612', course: '少儿中国舞基础班', orderType: '面授课程', amount: 1680, reason: '时间安排冲突', channel: '银行转账', time: '2026-09-08 09:12', status: '退款中', remark: '退款登记，等待财务执行' },
  { id: 'refund-2', no: 'RF202609070002', orderNo: 'OD202609050003', student: '刘女士', phone: '138****5541', course: '成人声乐班', orderType: '面授课程', amount: 2280, reason: '个人原因', channel: '现金', time: '2026-09-07 14:26', status: '退款中', remark: '退款中，等待财务执行' },
  { id: 'refund-3', no: 'RF202609050001', orderNo: 'OD202609020006', student: '陈一诺', phone: '137****3130', course: '成人声乐班', orderType: '面授课程', amount: 2280, reason: '临时无法参加', channel: '微信支付', time: '2026-09-05 14:26', completedAt: '2026-09-05 17:40', status: '已退款', remark: '原路退回完成。' },
  { id: 'refund-4', no: 'RF202609030001', orderNo: 'OD202609010004', student: '孙先生', phone: '136****7192', course: '中国画基础', orderType: '面授课程', amount: 1380, reason: '超过退款条件', channel: '支付宝', time: '2026-09-03 10:20', status: '已取消', remark: '资格复核未通过，财务取消退款（原因：不满足课程退款规则）。' }
  ,{ id: 'refund-video-pending', no: 'RF202609100001', orderNo: 'OD202609100001', student: '林知夏', phone: '138****2026', course: '声乐演唱技巧', orderType: '视频课程', amount: 1280, reason: '学习安排调整', channel: '微信支付', time: '2026-09-10 09:12', status: '退款中', remark: '退款登记，等待财务执行' }
  ,{ id: 'refund-video-processing', no: 'RF202609090001', orderNo: 'OD202609070001', student: '林知夏', phone: '138****2026', course: '声乐演唱技巧', orderType: '视频课程', amount: 1280, reason: '学员时间冲突', channel: '微信支付', time: '2026-09-09 10:20', status: '退款中', remark: '后台已发起退款，等待渠道回执。' }
  ,{ id: 'refund-video-cancelled', no: 'RF202609080002', orderNo: 'OD202609080002', student: '林知夏', phone: '138****2026', course: '声乐演唱技巧', orderType: '视频课程', amount: 1280, reason: '重复购买', channel: '支付宝', time: '2026-09-08 11:10', status: '已取消', remark: '学员撤回退款申请，订单回到已支付。' }
  ,{ id: 'refund-video-done', no: 'RF202609080011', orderNo: 'OD202609060001', student: '林知夏', phone: '138****2026', course: '声乐演唱技巧', orderType: '视频课程', amount: 1280, reason: '课程调整', channel: '微信支付', time: '2026-09-07 09:05', completedAt: '2026-09-07 11:32', status: '已退款', remark: '原路退回完成。' }
  ,{ id: 'refund-video-rejected', no: 'RF202609070003', orderNo: 'OD202609070003', student: '林知远', phone: '139****2027', course: '声乐演唱技巧', orderType: '视频课程', amount: 1280, reason: '超过退款期限', channel: '微信支付', time: '2026-09-07 14:26', status: '已取消', remark: '资格复核未通过，财务取消退款（原因：已超过视频课程退款窗口。' }
  ,{ id: 'refund-class-cancelled', no: 'RF202609060003', orderNo: 'OD202609060003', student: '赵欣', phone: '137****3130', course: '少儿中国舞基础班', orderType: '面授课程', amount: 1680, reason: '时间安排冲突', channel: '银行转账', time: '2026-09-06 15:10', status: '已取消', remark: '学员与班级协商继续上课，取消退款。' }
  ,{ id: 'refund-class-rejected', no: 'RF202609050004', orderNo: 'OD202609050004', student: '何安', phone: '137****3130', course: '少儿中国舞基础班', orderType: '面授课程', amount: 1680, reason: '已完成全部课次', channel: '银行转账', time: '2026-09-05 10:20', status: '已取消', remark: '资格复核未通过，财务取消退款（原因：不满足面授退款资格。' }
];
// CR-2026-036：退款单区分线上／线下；线下登记以收款记录合计为实收口径，登记成功即视为退款完成。
// 2026-09-24 结算：退款单统一存 共享集合，静态演示单先登记进共享集合，再把学员自助申请与学籍异动发起的单据并回本页，
// 保证退款执行出口能找到记录、三端读到同一张退款单。
refunds.forEach((item) => { item.source ||= '线上'; item.origin ||= REFUND_ORIGIN.SYSTEM; item.orderId ||= item.orderNo; });
refunds.forEach((item) => { item.className ||= item.course; });
function syncSharedRefunds() {
  ensureRefundRecords(refunds.map((item) => ({ ...item })));
  const merged = mergeRefundsInto(refunds);
  refunds.length = 0;
  refunds.push(...merged);
}
const refundCounted = (item) => item.status === '已退款';
const orderReceiptTotal = (orderNo) => payments.filter((item) => item.orderNo === orderNo).reduce((sum, item) => sum + Number(item.amount || 0), 0);
const orderRefundedTotal = (orderNo) => refunds.filter((item) => item.orderNo === orderNo && refundCounted(item)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
// 线下登记只处理「整单退完」的补登记，固定全额；订单存在任意退款记录后不再作为线下登记候选（部分退款走统一订单管理）。
const orderPendingRefund = (orderNo) => refunds.some((item) => item.orderNo === orderNo && item.status !== '已拒绝') ? 0 : orderReceiptTotal(orderNo);
function refundOrderStatus(orderNo) {
  const received = orderReceiptTotal(orderNo);
  const refunded = orderRefundedTotal(orderNo);
  if (refunded > 0 && refunded >= received) return '已退款';
  if (refunds.some((item) => item.orderNo === orderNo && item.status === '退款中')) return '退款中';
  return received > 0 ? '已支付' : '待支付';
}

function videoRefundRuleFor(orderNo) {
  const shared = readDemoState();
  const order = (shared.orders || []).find(item => item.id === orderNo || item.number === orderNo);
  if (!order || order.status !== '已支付' || !order.courseId) return null;
  const config = refundSettings();
  const progress = shared.progress?.[`${order.accountId}-${order.courseId}`] || {};
  const watched = new Set([...(Array.isArray(progress.chapterDone) ? progress.chapterDone : []), ...Object.entries(progress.positions || {}).filter(([, seconds]) => Number(seconds) > 0).map(([id]) => id)]);
  const paidAt = order.paidAt || order.createdAt;
  const paidTime = paidAt ? new Date(String(paidAt).replace(' ', 'T')).getTime() : NaN;
  const ageDays = Number.isFinite(paidTime) ? Math.max(0, (demoDateTime(DEMO_TODAY).getTime() - paidTime) / 86400000) : Infinity;
  const watchedLessons = [...watched].filter(id => /^chapter-\d+$/.test(id)).length;
  const totalLessons = Number(order.totalLessons || order.lessons || 0);
  const completedPercent = totalLessons > 0 ? watchedLessons / totalLessons * 100 : 0;
  return { eligible: Number.isFinite(paidTime) && ageDays <= config.windowDays && completedPercent <= config.selfMaxCompletedPercent, watchedLessons, completedPercent, ageDays, config, reason: !Number.isFinite(paidTime) || ageDays > config.windowDays ? `超过${config.windowDays}日退款期限` : completedPercent > config.selfMaxCompletedPercent ? `已消课${Math.round(completedPercent)}%，超过${config.selfMaxCompletedPercent}%上限` : '满足退款条件' };
}

// 可登记线下退款的订单：已存在收款记录且没有有效退款记录；已取消订单不出现。
function offlineRefundCandidates() {
  const seen = new Map();
  payments.forEach((item) => {
    if (seen.has(item.orderNo)) return;
    const pending = orderPendingRefund(item.orderNo);
    if (pending <= 0) return;
    seen.set(item.orderNo, { orderNo: item.orderNo, student: item.student, course: item.course, orderType: item.source, receipt: orderReceiptTotal(item.orderNo), refunded: orderRefundedTotal(item.orderNo), pending, status: refundOrderStatus(item.orderNo), refundRule: item.source === '视频课程' ? videoRefundRuleFor(item.orderNo) : null });
  });
  return [...seen.values()];
}

function openOfflineRefundForm() {
  const candidates = offlineRefundCandidates();
  const options = candidates.map((item) => `<option value="${esc(item.orderNo)}">${esc(item.orderNo)} · ${esc(item.student)} · ${esc(item.course)} · 实收 ${money(item.pending)}</option>`).join('');
  // CR-2026-036 §3 登记要素：关联订单号／退款金额／退款方式／退款原因／退款时间／经办人（取当前操作者）／凭证附件（选填）／财务备注。
  const operator = readAdminSession()?.name || '周财务';
  const body = `<label class="form-field wide"><span>关联订单 <b class="required-mark">*</b></span><select name="orderNo" required><option value="">请选择订单</option>${options}</select><small data-refund-hint>仅可登记一次全额退款；实收金额取该订单收款记录合计。</small></label><label class="form-field"><span>退款金额</span><input class="readonly-field" type="number" name="amount" readonly aria-label="退款金额锁定为订单实收全额"></label>${select('退款方式', 'channel', ['银行转账', '现金', '微信支付', '支付宝'], false, false)}<label class="form-field wide"><span>退款原因 <b class="required-mark">*</b></span><textarea name="reason" maxlength="200" placeholder="填写线下退款原因"></textarea></label>${field('退款时间', 'time', 'datetime-local')}<label class="form-field"><span>经办人</span><input class="readonly-field" readonly value="${esc(operator)}" aria-label="经办人取当前操作者，不可手工指定"></label><label class="form-field"><span>凭证附件</span><input type="file" name="voucher" accept=".jpg,.jpeg,.png,.pdf" aria-label="转账凭据或收据，选填"></label><label class="form-field wide"><span>财务备注</span><textarea name="remark" maxlength="200" placeholder="补充说明，如凭据号或经办说明"></textarea></label><p class="ops-danger" data-refund-error role="alert" hidden></p>`;
  const dialog = openDialog('登记线下退款', '线下退款没有渠道回调，登记成功即视为退款完成，订单状态直接变为已退款。', `<form id="ops-form" class="ops-dialog-grid">${body}</form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="ops-form" class="button primary">确认登记</button>');
  const form = dialog.querySelector('#ops-form');
  const error = dialog.querySelector('[data-refund-error]');
  const orderSelect = form.querySelector('[name="orderNo"]');
  const amountInput = form.querySelector('[name="amount"]');
  const hint = dialog.querySelector('[data-refund-hint]');
  const refreshHint = () => {
    const orderNo = orderSelect.value;
    if (!orderNo) { amountInput.value = ''; hint.textContent = '线下登记仅可整单全额退款；实收金额取该订单收款记录合计。'; return; }
    const pending = orderPendingRefund(orderNo);
    amountInput.min = pending;
    amountInput.max = pending;
    amountInput.value = pending;
    hint.textContent = `该订单实收 ${money(pending)}，线下登记须全额；只退部分金额请走统一订单管理。`;
  };
  orderSelect.addEventListener('change', refreshHint);
  refreshHint();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const orderNo = String(data.get('orderNo') || '');
    if (!orderNo) { error.textContent = '请选择关联订单。'; error.hidden = false; return; }
    const pending = orderPendingRefund(orderNo);
    const amount = Number(data.get('amount'));
    if (!amount || amount <= 0) { error.textContent = '退款金额必须大于 0。'; error.hidden = false; return; }
    if (amount !== pending) { error.textContent = `线下登记仅支持整单全额退款，金额必须等于 ${money(pending)}。`; error.hidden = false; return; }
    const candidate = offlineRefundCandidates().find((item) => item.orderNo === orderNo) || {};
    if (candidate.status === '已取消') { error.textContent = '已取消订单不得登记退款。'; error.hidden = false; return; }
    if (candidate.orderType === '视频课程' && candidate.refundRule && !candidate.refundRule.eligible) { error.textContent = `视频课程不满足退款条件：${candidate.refundRule.reason}。`; error.hidden = false; return; }
    const voucherName = form.querySelector('[name="voucher"]')?.files?.[0]?.name || '';
    const outcome = registerCompletedOfflineRefund({ orderId: orderNo, amount, reason: String(data.get('reason') || '').trim() || '线下退款登记', channel: String(data.get('channel') || '银行转账'), time: String(data.get('time') || '').replace('T', ' ') || '2026-09-17 16:00', voucher: voucherName, remark: String(data.get('remark') || '').trim(), operator: { name: operator, role: '财务' } });
    if (!outcome.ok) { error.textContent = outcome.reason === 'REFUND_AMOUNT_INVALID' ? '退款金额必须大于 0 且不超过订单实收。' : '线下退款登记失败，请核对订单和退款状态。'; error.hidden = false; return; }
    const record = outcome.refund;
    syncSharedRefunds();
    closeDialog();
    renderRefunds();
    showToast(record.orderType === '视频课程' ? '线下退款已登记，订单转为已退款，学习权限已回收' : '线下退款已登记，订单转为已退款，报名已取消并释放名额');
  });
}

const categories = [
  { id: 'category-teach', name: '教学用品', parent: '—', code: 'JX', count: 36, sort: 1, status: '启用' },
  { id: 'category-paint', name: '画材类', parent: '教学用品', code: 'JX-HC', count: 18, sort: 2, status: '启用' },
  { id: 'category-clothes', name: '服装类', parent: '教学用品', code: 'JX-FZ', count: 0, sort: 3, status: '停用' }
];
const seededMaterials = [
  { id: 'material-mat', code: 'WZ-0001', name: '舞蹈练功垫', category: '教学用品', spec: '200×100cm', unit: '件', stock: 86, threshold: 20, location: '仓库B-12', last: '2026-09-08', description: '少儿与成人舞蹈课程通用。' },
  { id: 'material-paint', code: 'WZ-0002', name: '水彩颜料', category: '画材类', spec: '24色', unit: '盒', stock: 8, threshold: 10, location: '画室A-03', last: '2026-09-07', description: '水彩基础课程使用。' },
  { id: 'material-notebook', code: 'WZ-0018', name: '五线谱本', category: '教学用品', spec: 'A4', unit: '本', stock: 0, threshold: 10, location: '仓库C-02', last: '2026-08-28', description: '声乐和器乐课程使用。' },
  { id: 'material-easel', code: 'WZ-0021', name: '折叠画架', category: '画材类', spec: '铝合金', unit: '个', stock: 15, threshold: 5, location: '画室A-01', last: '2026-09-01', description: '画室移动教学使用。' }
];
const seededInboundRecords = [
  { id: 'inbound-1', no: 'RK202609080002', name: '舞蹈练功垫', quantity: 50, price: 68, supplier: '艺教用品供应商', type: '采购入库', date: '2026-09-08', operator: '李教务', remark: '秋季班备货' },
  { id: 'inbound-2', no: 'RK202609050001', name: '水彩颜料', quantity: 24, price: 22, supplier: '美术用品供应商', type: '采购入库', date: '2026-09-05', operator: '周仓管', remark: '—' },
  { id: 'inbound-3', no: 'RK202608280003', name: '五线谱本', quantity: 40, price: 5.5, supplier: '教材供应商', type: '其他', date: '2026-08-28', operator: '周仓管', remark: '历史基础入库' }
];
const seededOutboundRecords = [
  { id: 'outbound-1', no: 'CK202609080005', name: '舞蹈练功垫', quantity: 20, type: '教学领用', recipient: '王玥', purpose: '少儿舞蹈基础班', date: '2026-09-08', operator: '李教务', remark: '—' },
  { id: 'outbound-2', no: 'CK202609070004', name: '水彩颜料', quantity: 16, type: '教学领用', recipient: '赵老师', purpose: '中国画基础工作坊', date: '2026-09-07', operator: '周仓管', remark: '—' },
  { id: 'outbound-3', no: 'CK202609010001', name: '折叠画架', quantity: 4, type: '其他', recipient: '教务部门', purpose: '教室布置', date: '2026-09-01', operator: '周仓管', remark: '历史基础出库' }
];
const inventoryState = readDemoState();
if (Array.isArray(inventoryState.categories) && inventoryState.categories.length) categories.splice(0, categories.length, ...inventoryState.categories);
const materials = inventoryState.materials?.length ? inventoryState.materials : seededMaterials.map((item) => ({ ...item, status: item.status || '启用' }));
const inboundRecords = inventoryState.inboundRecords?.length ? inventoryState.inboundRecords : seededInboundRecords;
const outboundRecords = inventoryState.outboundRecords?.length ? inventoryState.outboundRecords : seededOutboundRecords;
function persistInventory(collection, record) { upsertDemoRecord(collection, record); }
function categoryMaterialCount(category) { return materials.filter((item) => item.category === category.name || item.categoryId === category.id).length; }
function categoryHasReferences(category) { return categoryMaterialCount(category) > 0 || inboundRecords.some((item) => item.categoryId === category.id || item.category === category.name) || outboundRecords.some((item) => item.categoryId === category.id || item.category === category.name); }
function materialHasReferences(material) { return inboundRecords.some((item) => item.materialId === material.id || item.name === material.name) || outboundRecords.some((item) => item.materialId === material.id || item.name === material.name); }
function categoryOptions(excludeId = '') { return categories.filter((item) => item.id !== excludeId && item.status !== '停用' && item.parent === '—').map((item) => item.name); }
function inventoryMaterialOptions() { return materials.filter((item) => item.status !== '停用'); }
if (!inventoryState.materials?.length) materials.forEach((item) => persistInventory('materials', item));
if (!inventoryState.categories?.length) categories.forEach((item) => persistInventory('categories', item));
if (!inventoryState.inboundRecords?.length) inboundRecords.forEach((item) => persistInventory('inboundRecords', item));
if (!inventoryState.outboundRecords?.length) outboundRecords.forEach((item) => persistInventory('outboundRecords', item));
function salaryPayable(row) { return row.details?.length ? row.details.reduce((sum, d) => sum + (Number(d.hours) || 0) * (Number(d.rate) || 0), 0) : (Number(row.payable) || 0); }
function salaryTaxIncluded(row) { return Math.max(0, salaryPayable(row) - row.deduction); }
function salaryTotal(row) { return Math.max(0, salaryTaxIncluded(row) - Number(row.tax || 0)); }
function materialStatus(row) { return row.stock <= row.threshold ? '库存不足' : '正常'; }

function renderSalary() {
  opsData = salaries;
  pageFrame('教师工资管理', '', '<button class="button primary" data-ops-action="salary-batch-publish">批量发布工资单</button>', metrics([['核算中', salaries.filter((item) => item.status === '核算中').length, '需补全个税或核定扣款'], ['待发布', salaries.filter((item) => item.status === '待发布').length, '核算已完成'], ['已发布', salaries.filter((item) => item.status === '已发布').length, '教师端已可见']]) + filterPanel('salary-filter', select('工资单状态', 'status', ['核算中', '待发布', '已发布']) + `<label class="form-field"><span>工资月份</span><input type="month" name="month" value="2026-08"></label>` + field('教师姓名', 'teacher', 'text', '姓名')) + '<p class="ops-form-help">统计口径（新）：单节课时长固定 45 分钟；课时（学时）= 出勤课次 × 连上节数；应付工资含税 = 课时 × 合同单价（元/每课时45分钟）。</p>' + table('<thead><tr><th>教师 / 工号</th><th>工资月份</th><th>出勤课次</th><th>应付工资含税</th><th>累计扣款</th><th>实发工资含税</th><th>个税</th><th>实际核发</th><th>工资单状态</th><th>操作</th></tr></thead>', 'salary-calculation-table'));
  const row = (item) => `<td><strong>${item.teacher}</strong><br><span class="muted">${item.staffNo} · ${item.category}</span></td><td>${item.month}</td><td>${item.expectedLessons} / ${item.actualLessons} 课次<br><span class="muted">${item.hours} 课时（学时）</span></td><td>${money(salaryPayable(item))}</td><td>${money(item.deduction)}</td><td>${money(salaryTaxIncluded(item))}</td><td>${item.tax == null ? '<span class="ops-required">待填写</span>' : money(item.tax)}</td><td class="ops-amount">${item.tax == null ? '—' : money(salaryTotal(item))}</td><td>${tag(item.status)}</td><td class="action-cell">${item.status !== '已发布' ? '<button class="text-button" data-ops-action="salary-edit">核算</button>' : ''}${item.status === '待发布' ? '<button class="text-button" data-ops-action="salary-publish">发布</button>' : ''}<button class="text-button" data-ops-action="salary-view">查看详情</button></td>`;
  renderRows(opsData, row);
  bindFilter('salary-filter', opsData, (form) => { const { status, month, teacher } = form; return (item) => (!status.value || item.status === status.value) && (!month.value || item.month === month.value) && (!teacher.value.trim() || item.teacher.includes(teacher.value.trim())); }, row);
}
function renderPayments() {
  opsData = payments;
  pageFrame('收款记录', '', '', metrics([['本月收款', money(286420), '按收款日期统计'], ['已到账', payments.filter((p) => p.status === '已到账').length, '支付回调或人工确认'], ['待确认', payments.filter((p) => p.status === '待确认').length, '需核对银行流水'], ['异常', payments.filter((p) => p.status === '异常').length, '需人工处理']]) + filterPanel('payment-filter', select('收款渠道', 'channel', ['微信支付', '支付宝', '银行转账', '现金', '其他']) + select('收款来源', 'source', ['视频课程', '面授课程']) + select('到账状态', 'status', ['待确认', '已到账', '异常', '已撤销']) + field('订单号 / 学员', 'keyword', 'text', '模糊搜索', true)) + table('<thead><tr><th>收款单号</th><th>关联订单</th><th>学员</th><th>课程</th><th>来源 / 渠道</th><th>金额</th><th>收款时间</th><th>到账状态</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${item.receiptNo}</td><td>${item.orderNo}</td><td>${item.student}</td><td>${item.course}</td><td>${item.source}<br><span class="muted">${item.channel}</span></td><td class="ops-amount">${money(item.amount)}</td><td>${item.time}</td><td>${tag(item.status)}<br><span class="muted">${esc(item.auditStatus || '待核对')}</span></td><td class="action-cell"><button class="text-button" data-ops-action="payment-view">查看详情</button>${item.status === '待确认' ? '<button class="text-button" data-ops-action="payment-confirm">确认到账</button><button class="text-button" data-ops-action="payment-exception">登记异常</button>' : ''}${item.status === '异常' ? '<button class="text-button" data-ops-action="payment-reconcile">重新核对</button>' : ''}</td>`;
  renderRows(opsData, row);
  bindFilter('payment-filter', opsData, (form) => { const { channel, source, status, keyword } = form; return (item) => (!channel.value || item.channel === channel.value) && (!source.value || item.source === source.value) && (!status.value || item.status === status.value) && (!keyword.value.trim() || `${item.orderNo}${item.student}`.includes(keyword.value.trim())); }, row);
}
// 当前后台操作者：退款完成的经办人取会话身份，避免手填。
function operatorName() { return readAdminSession()?.name || '当前账号'; }
function recordFinanceAudit(action, target, detail = '') {
  upsertDemoRecord('financeAuditLogs', { id: `finance-audit:${target.id}:${action}:${Date.now()}`, action, targetId: target.id, orderNo: target.orderNo || '', operator: operatorName(), detail, createdAt: demoDateTime(DEMO_TODAY).toISOString().slice(0, 16).replace('T', ' ') });
}

// CR-2026-155 C9：退款单进入执行阶段的可展示状态（无审批中状态）。
const EXECUTABLE_REFUND_STATUSES = ['退款中', '已取消', '已退款'];
function renderRefunds() {
  // 退款单由后台发起（统一订单管理 / 学籍异动 / 收款记录），登记后直接进入「退款中」，本页只做退款执行。
  syncSharedRefunds();
  opsData = refunds;
  // CR-2026-155（C9）：审批环节已移除，本页仅保留退款执行页签。
  const tabBar = `<div class="tab-bar" role="tablist" aria-label="退款处理阶段"><button type="button" class="active" data-ops-action="refund-tab" data-tab="processing" role="tab" aria-selected="true">退款执行</button></div>`;
  const visibleRows = refunds.filter(item => EXECUTABLE_REFUND_STATUSES.includes(item.status));
  const refundCourses = refunds.map((item) => item.course);
  const refundClasses = refunds.map((item) => item.className);
  pageFrame('退款记录', '', '<button class="button" data-ops-action="refund-export">导出退款记录</button>', tabBar + filterPanel('refund-filter', select('退款处理状态', 'processingStatus', EXECUTABLE_REFUND_STATUSES) + select('退款方式', 'source', ['线上', '线下']) + select('退款渠道', 'channel', ['微信支付', '支付宝', '银行转账', '现金']) + searchableSelect('课程', 'course', refundCourses) + searchableSelect('班级', 'className', refundClasses) + field('订单号', 'orderNo', 'text', '请输入订单号') + field('学员', 'student', 'text', '请输入学员姓名')) + table('<thead><tr><th>退款单号</th><th>关联订单</th><th>学员</th><th>课程</th><th>退款金额</th><th>退款方式 / 渠道</th><th>发起时间</th><th>完成时间</th><th>退款处理状态</th><th>操作</th></tr></thead>'));
  const row = (item) => `<td>${item.no}</td><td>${item.orderNo}</td><td>${item.student}<br><span class="muted">${item.phone}</span></td><td>${item.course}<br><span class="muted">${item.orderType}${item.origin ? ` · ${item.origin}` : ''}</span></td><td class="ops-amount">${money(item.amount)}</td><td>${item.source || '线上'} / ${item.channel}</td><td>${item.time}</td><td>${item.completedAt || '—'}</td><td>${tag(item.status)}</td><td class="action-cell">${item.status === '退款中' ? '<button class="text-button" data-perm="PERM-TRADE-004" data-ops-action="refund-complete">确认退款</button><button class="text-button" data-perm="PERM-TRADE-004" data-ops-action="refund-cancel">取消退款</button>' : ''}<button class="text-button" data-ops-action="refund-view">查看详情</button></td>`;
  renderRows(visibleRows, row);
  bindFilter('refund-filter', visibleRows, (form) => { const { processingStatus, source, channel, course, className, orderNo, student } = form; return (item) => (!processingStatus?.value || item.status === processingStatus.value) && (!source.value || (item.source || '线上') === source.value) && (!channel.value || item.channel === channel.value) && (!course.value || item.course === course.value) && (!className.value || item.className === className.value) && (!orderNo.value.trim() || String(item.orderNo || '').includes(orderNo.value.trim())) && (!student.value.trim() || String(item.student || '').includes(student.value.trim())); }, row);
}


function renderCategories() {
  opsData = categories;
  pageFrame('物资分类管理', '', '<button class="button primary" data-ops-action="category-create">新增分类</button>', filterPanel('category-filter', select('分类状态', 'status', ['启用', '停用']) + field('关键词', 'keyword', 'text', '分类名称 / 编码', true)) + table('<thead><tr><th>分类名称</th><th>分类编码</th><th>物资种类数</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>'));
  const row = (item) => { const referenced = categoryHasReferences(item); return `<td><div class="ops-category-tree ${item.parent === '—' ? 'is-root' : 'is-child'}"><span class="ops-category-branch" aria-hidden="true">${item.parent === '—' ? '▾' : '└'}</span><strong>${esc(item.name)}</strong></div></td><td>${esc(item.code)}</td><td>${categoryMaterialCount(item)}</td><td>${item.sort}</td><td><label class="ops-table-switch"><input type="checkbox" data-ops-action="category-toggle" aria-label="${item.status === '启用' ? '停用' : '启用'}${esc(item.name)}" ${item.status === '启用' ? 'checked' : ''}><span aria-hidden="true"></span><em>${item.status}</em></label></td><td class="action-cell"><button class="text-button" data-ops-action="category-edit">编辑</button><button class="text-button" data-ops-action="category-view">查看物资</button>${!referenced ? '<button class="text-button danger-link" data-ops-action="category-delete">删除</button>' : '<span class="muted">有引用不可删</span>'}</td>`; };
  renderRows(opsData, row);
  bindFilter('category-filter', opsData, (form) => { const { status, keyword } = form; return (item) => (!status.value || item.status === status.value) && (!keyword.value.trim() || `${item.name}${item.code}`.includes(keyword.value.trim())); }, row);
}
function renderMaterials() {
  opsData = materials;
  pageFrame('物资管理', '', '<div class="ops-actions"><button class="button" data-ops-action="material-import">批量导入</button><button class="button" data-ops-action="material-export">导出</button><button class="button primary" data-ops-action="material-create">新增物资</button></div>', metrics([['全部物资', materials.length, '物资种类总数'], ['正常库存', materials.filter((m) => materialStatus(m) === '正常').length, '库存高于阈值'], ['库存不足', materials.filter((m) => materialStatus(m) === '库存不足').length, '库存不高于阈值']]) + filterPanel('material-filter', select('物资分类', 'category', ['教学用品', '画材类']) + select('库存状态', 'status', ['正常', '库存不足']) + select('启用状态', 'lifecycle', ['启用', '停用']) + field('关键词', 'keyword', 'text', '物资名称 / 编号', true)) + table('<thead><tr><th>物资编号</th><th>物资名称</th><th>分类</th><th>规格 / 单位</th><th>当前库存</th><th>预警阈值</th><th>存放位置</th><th>库存状态</th><th>启用状态</th><th>操作</th></tr></thead>'));
  const row = (item) => { const status = materialStatus(item); const deletable = item.stock === 0 && !materialHasReferences(item); return `<td>${item.code}</td><td><strong>${esc(item.name)}</strong></td><td>${esc(item.category)}</td><td>${esc(item.spec)}<br><span class="muted">${esc(item.unit)}</span></td><td>${item.stock}</td><td>${item.threshold}</td><td>${esc(item.location)}</td><td>${tag(status)}</td><td>${tag(item.status || '启用')}</td><td class="action-cell"><button class="text-button" data-ops-action="material-view">查看</button><button class="text-button" data-ops-action="material-edit">编辑</button>${item.status === '停用' ? '<button class="text-button" data-ops-action="material-enable">启用</button>' : `<a class="text-button" href="/admin/pages/inventory/stock-in.html?material=${item.id}">入库</a><a class="text-button" href="/admin/pages/inventory/stock-out.html?material=${item.id}">出库</a><button class="text-button danger-link" data-ops-action="material-disable">停用</button>`}${deletable ? '<button class="text-button danger-link" data-ops-action="material-delete">删除</button>' : '<span class="muted">有引用不可删</span>'}</td>`; };
  renderRows([...opsData].sort((a, b) => ({ '库存不足': 0, 正常: 1 }[materialStatus(a)] - ({ '库存不足': 0, 正常: 1 }[materialStatus(b)])) || a.name.localeCompare(b.name, 'zh-CN')), row);
  bindFilter('material-filter', opsData, (form) => { const { category, status, lifecycle, keyword } = form; return (item) => (!category.value || item.category === category.value) && (!status.value || materialStatus(item) === status.value) && (!lifecycle.value || (item.status || '启用') === lifecycle.value) && (!keyword.value.trim() || `${item.code}${item.name}`.includes(keyword.value.trim())); }, row);
}
function renderInbound() {
  opsData = inboundRecords;
  pageFrame('入库记录', '', '<button class="button" data-ops-action="inbound-export">导出入库记录</button><a class="button primary" href="/admin/pages/inventory/stock-in.html">入库登记</a>', filterPanel('inbound-filter', select('物资名称', 'name', ['舞蹈练功垫', '水彩颜料', '五线谱本']) + select('入库类型', 'type', ['采购入库', '其他']) + field('入库日期起', 'dateFrom', 'date') + field('入库日期止', 'dateTo', 'date') + field('供应商', 'supplier', 'text', '供应商名称') + searchableSelect('经办人', 'operator', inboundRecords.map((item) => item.operator), true)) + table('<thead><tr><th>入库单号</th><th>物资名称</th><th>入库数量</th><th>入库单价</th><th>供应商</th><th>入库类型</th><th>入库日期</th><th>经办人</th><th>备注</th></tr></thead>'));
  const row = (item) => `<td>${item.no}</td><td>${item.name}</td><td>${item.quantity}</td><td>${money(item.price)}</td><td>${item.supplier}</td><td>${item.type}</td><td>${item.date}</td><td>${item.operator}</td><td>${item.remark}</td>`;
  renderRows(opsData, row);
  bindFilter('inbound-filter', opsData, (form) => { const { name, type, dateFrom, dateTo, supplier, operator } = form; return (item) => (!name.value || item.name === name.value) && (!type.value || item.type === type.value) && (!dateFrom.value || item.date >= dateFrom.value) && (!dateTo.value || item.date <= dateTo.value) && (!supplier.value.trim() || item.supplier.includes(supplier.value.trim())) && (!operator.value || item.operator === operator.value); }, row);
}
function renderOutbound() {
  opsData = outboundRecords;
  const content = filterPanel('outbound-filter', select('物资名称', 'name', ['舞蹈练功垫', '水彩颜料', '折叠画架']) + select('出库类型', 'type', ['教学领用', '其他']) + field('领用人', 'recipient', 'text', '教师 / 学员 / 部门') + searchableSelect('经办人', 'operator', outboundRecords.map((item) => item.operator), true)) + table('<thead><tr><th>出库单号</th><th>物资名称</th><th>出库数量</th><th>出库类型</th><th>领用人</th><th>用途说明</th><th>出库日期</th><th>经办人</th><th>备注</th></tr></thead>');
  pageFrame('出库记录', '', '<div class="ops-page-head-actions"><button class="button" data-ops-action="outbound-export">导出出库记录</button><a class="button primary" href="/admin/pages/inventory/stock-out.html">出库登记</a></div>', content);
  const row = (item) => `<td>${item.no}</td><td>${item.name}</td><td>${item.quantity}</td><td>${item.type}</td><td>${item.recipient}</td><td>${item.purpose}</td><td>${item.date}</td><td>${item.operator}</td><td>${item.remark}</td>`;
  renderRows(opsData, row);
  bindFilter('outbound-filter', opsData, (form) => { const { name, type, dateFrom, dateTo, recipient, operator } = form; return (item) => (!name.value || item.name === name.value) && (!type.value || item.type === type.value) && (!dateFrom.value || item.date >= dateFrom.value) && (!dateTo.value || item.date <= dateTo.value) && (!recipient.value.trim() || item.recipient.includes(recipient.value.trim())) && (!operator.value || item.operator === operator.value); }, row);
}
function renderStockForm(direction) {
  const isIn = direction === 'in'; const title = isIn ? '入库登记' : '出库登记';
  pageFrame(title, isIn ? '登记基础入库，提交后增加对应物资库存。' : '登记基础出库，数量不可超过当前库存。', `<a class="button" href="/admin/pages/inventory/${isIn ? 'inbound' : 'outbound'}-records.html">查看${isIn ? '入库' : '出库'}记录</a>`, `<div class="card form-card"><h2>${title}</h2><form id="stock-form" class="form-grid"><label class="form-field"><span>物资名称 *</span><select name="material"><option value="">请选择物资</option>${inventoryMaterialOptions().map((m) => `<option value="${m.id}">${m.name}（当前库存 ${m.stock}）</option>`).join('')}</select></label>${field(isIn ? '入库数量 *' : '出库数量 *', 'quantity', 'number', isIn ? '请输入正整数' : '不可大于当前库存')}${isIn ? field('入库单价', 'price', 'number', '选填，仅记录入库单价') : ''}${isIn ? field('供应商', 'supplier', 'text', '请输入供应商') : field('领用人', 'recipient', 'text', '教师 / 学员 / 部门')}${field(isIn ? '入库日期 *' : '出库日期 *', 'date', 'date')}${select(isIn ? '入库类型 *' : '出库类型 *', 'type', isIn ? ['采购入库', '其他'] : ['教学领用', '其他'], false, false)}<label class="form-field"><span>经办人 *</span><select name="operator"><option value="李教务">李教务</option><option value="周仓管">周仓管</option></select></label>${!isIn ? `<label class="form-field wide"><span>用途说明 *</span><textarea name="purpose" placeholder="如：秋季班教学使用"></textarea></label>` : '<label class="form-field wide"><span>备注</span><textarea name="remark" placeholder="请输入备注"></textarea></label>'}<div class="form-actions wide"><a class="button" href="/admin/pages/inventory/${isIn ? 'inbound' : 'outbound'}-records.html">取消</a><button class="button primary" type="submit">提交${title}</button></div></form></div>`);
  const queryMaterial = new URLSearchParams(location.search).get('material'); if (queryMaterial) { const selectEl = document.querySelector('select[name="material"]'); if (selectEl) selectEl.value = queryMaterial; }
  let submitting = false;
  document.querySelector('#stock-form')?.addEventListener('submit', (event) => { event.preventDefault(); if (submitting) return; const form = event.currentTarget; const material = materials.find((m) => m.id === form.material.value); const quantity = Number(form.quantity.value); const type = form.type.value; const remark = form.remark?.value.trim() || ''; const date = form.date.value; if (!material || material.status === '停用' || !Number.isInteger(quantity) || quantity <= 0) { showToast('请选择启用物资并填写正整数数量。', 'warning'); return; } if (!date) { showToast('请选择业务日期。', 'warning'); return; } if (!isIn && quantity > material.stock) { showToast(`库存不足，当前库存${material.stock}件。`, 'warning'); return; } if (!isIn && !form.purpose.value.trim()) { showToast('请填写用途说明。', 'warning'); return; } submitting = true; form.querySelector('button[type="submit"]').disabled = true; const stamp = Date.now(); if (isIn) { material.stock += quantity; const record = { id: `inbound-${stamp}`, no: `RK${new Date(stamp).toISOString().slice(0,10).replaceAll('-', '')}${String(stamp).slice(-4)}`, name: material.name, materialId: material.id, quantity, price: Number(form.price.value) || 0, supplier: form.supplier.value || '—', type, date, operator: form.operator.value, remark: remark || '—' }; inboundRecords.unshift(record); persistInventory('materials', material); persistInventory('inboundRecords', record); showToast('入库登记已提交，库存已增加并生成流水。'); } else { material.stock -= quantity; const record = { id: `outbound-${stamp}`, no: `CK${new Date(stamp).toISOString().slice(0,10).replaceAll('-', '')}${String(stamp).slice(-4)}`, name: material.name, materialId: material.id, quantity, type, recipient: form.recipient.value || '—', purpose: form.purpose.value, date, operator: form.operator.value, remark: remark || '—' }; outboundRecords.unshift(record); persistInventory('materials', material); persistInventory('outboundRecords', record); showToast('出库登记已提交，库存已扣减并生成流水。'); } });
}

function openSimpleForm(title, subtitle, body, onSubmit) { const dialog = openDialog(title, subtitle, `<form id="ops-form" class="ops-dialog-grid">${body}</form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="ops-form" class="button primary">确认</button>'); dialog.querySelector('#ops-form')?.addEventListener('submit', (event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget), dialog); }); return dialog; }
function detail(title, subtitle, pairs) { openDialog(title, subtitle, `<div class="ops-detail-list">${pairs.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`); }
function salaryBatchAmount(batch) { return batch.salaryIds.map((id) => salaries.find((item) => item.id === id)).filter(Boolean).reduce((sum, item) => sum + salaryTotal(item), 0); }
function salaryDetailBody(row) {
  const payable = salaryPayable(row);
  const detailRows = (row.details && row.details.length) ? row.details.map((d) => `<tr><td>${esc(d.className || d.course)}</td><td>${Number(d.hours) || 0}</td><td>${money(d.rate)}</td><td>${money((Number(d.hours) || 0) * (Number(d.rate) || 0))}</td></tr>`).join('') : '<tr><td colspan="4">无课时明细</td></tr>';
  return `<div class="ops-salary-detail-summary"><div><span>实际核发</span><strong>${money(salaryTotal(row))}</strong></div><div>${tag(row.status)}${row.status === '已发布' ? tag(row.paymentStatus) : ''}</div></div><div class="ops-detail-list"><div><span>教师 / 工号</span><strong>${esc(row.teacher)} / ${esc(row.staffNo)}</strong></div><div><span>工资月份</span><strong>${row.month}</strong></div><div><span>应付工资含税（新口径）</span><strong>${money(payable)}</strong></div><div><span>累计扣款</span><strong>${money(row.deduction)}</strong></div><div><span>实发工资含税</span><strong>${money(salaryTaxIncluded(row))}</strong></div><div><span>个税</span><strong>${row.tax == null ? '待填写' : money(row.tax)}</strong></div><div><span>实际核发</span><strong>${money(salaryTotal(row))}</strong></div><div><span>扣款核定说明</span><strong>${esc(row.deductionReason || '—')}</strong></div></div><div class="ops-detail-subtable"><table><thead><tr><th>课程 / 班级</th><th>课时（学时）</th><th>单价（元/每课时45分钟）</th><th>小计</th></tr></thead><tbody>${detailRows}</tbody><tfoot><tr><td colspan="3">应付工资含税（Σ 课时 × 单价）</td><td><strong>${money(payable)}</strong></td></tr></tfoot></table></div>`;
}
function openSalaryEdit(row) {
  const payable = salaryPayable(row);
  const detailRows = (row.details && row.details.length) ? row.details.map((d) => `<tr><td>${esc(d.className || d.course)}</td><td>${Number(d.hours) || 0}</td><td>${money(d.rate)}</td><td>${money((Number(d.hours) || 0) * (Number(d.rate) || 0))}</td></tr>`).join('') : '';
  const dialog = openDialog('核算教师工资', '课次、课时（学时）与应付工资按新口径由系统计算：单节课固定 45 分钟；课时（学时）= 出勤课次 × 连上节数；应付工资含税 = 课时 × 合同单价（元/每课时45分钟）。财务仅核定累计扣款并填写个税。', `<form id="salary-edit-form" class="ops-dialog-grid"><div class="ops-detail-list wide"><div><span>教师 / 月份</span><strong>${esc(row.teacher)} / ${row.month}</strong></div><div><span>应付工资含税（新口径）</span><strong>${money(payable)}</strong></div><div><span>系统考勤扣款</span><strong>${money(row.systemDeduction)}</strong></div></div>${detailRows ? `<div class="ops-detail-subtable wide"><table><thead><tr><th>课程 / 班级</th><th>课时（学时）</th><th>单价（元/每课时45分钟）</th><th>小计</th></tr></thead><tbody>${detailRows}</tbody></table></div>` : ''}<label class="form-field"><span>累计扣款 *</span><input type="number" name="deduction" min="0" max="${payable}" step="0.01" value="${row.deduction}" required></label><label class="form-field"><span>个税 *</span><input type="number" name="tax" min="0" step="0.01" value="${row.tax ?? ''}" required placeholder="请填写个税"></label><label class="form-field wide"><span>扣款核定说明</span><textarea name="deductionReason" placeholder="累计扣款与系统考勤扣款不一致时必填">${esc(row.deductionReason || '')}</textarea></label><div class="ops-salary-formula wide"><span>实际核发</span><output data-salary-output>${money(salaryTotal(row))}</output><small>应付工资含税 - 累计扣款 - 个税</small></div></form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="salary-edit-form" class="button primary">保存核算</button>');
  const form = dialog.querySelector('#salary-edit-form');
  const updateOutput = () => { const deduction = Number(form.elements.deduction.value || 0); const tax = Number(form.elements.tax.value || 0); form.querySelector('[data-salary-output]').textContent = money(Math.max(0, payable - deduction - tax)); };
  form.addEventListener('input', updateOutput);
  form.addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(form); const deduction = Number(data.get('deduction')); const tax = Number(data.get('tax')); const reason = String(data.get('deductionReason') || '').trim(); if (deduction < 0 || deduction > payable) return showToast('累计扣款必须在0元至应付工资之间。', 'warning'); if (tax < 0 || deduction + tax > payable) return showToast('个税不能小于0，且实际核发不能为负数。', 'warning'); if (deduction !== row.systemDeduction && !reason) return showToast('累计扣款与系统考勤扣款不一致时，必须填写核定说明。', 'warning'); row.deduction = deduction; row.tax = tax; row.deductionReason = reason; row.status = '待发布'; closeDialog(); renderSalary(); showToast('工资核算已保存，可发布工资单。'); });
  return dialog;
}
function openSalaryBatchCreate() {
  const candidates = salaries.filter((item) => item.status === '已发布' && item.paymentStatus === '待发放');
  if (!candidates.length) return showToast('当前没有可加入历史批次记录的工资单。', 'warning');
  const dialog = openDialog('创建历史批次记录', '仅可选择已发布且待发放的工资单，批次金额由系统汇总。', `<form id="salary-batch-form" class="ops-dialog-grid"><div class="ops-salary-selection wide">${candidates.map((item) => `<label><input type="checkbox" name="salaryIds" value="${item.id}" checked><span><strong>${esc(item.teacher)}</strong><small>${item.month} · ${esc(item.account)}</small></span><b>${money(salaryTotal(item))}</b></label>`).join('')}</div>${select('发放方式', 'method', ['银行代发', '线下转账'], false, false)}${field('计划线下转账日期', 'plannedAt', 'date', '')}<p class="ops-form-help wide">创建后状态为“发放中”，需根据银行或线下转账结果再登记成功或失败。</p></form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="salary-batch-form" class="button primary">创建批次</button>');
  dialog.querySelector('#salary-batch-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const salaryIds = data.getAll('salaryIds'); if (!salaryIds.length) return showToast('请至少选择一条工资单。', 'warning'); const batch = { id: `PAY${Date.now()}`, month: candidates.find((item) => salaryIds.includes(item.id))?.month || '2026-08', salaryIds, method: data.get('method'), plannedAt: data.get('plannedAt'), createdAt: '2026-09-10 15:30', operator: '周财务', paidAt: '', status: '发放中', success: 0, failed: 0, voucher: '' }; salaryBatches.unshift(batch); salaries.filter((item) => salaryIds.includes(item.id)).forEach((item) => { item.paymentStatus = '发放中'; item.batchId = batch.id; }); closeDialog(); renderSalary(); showToast('历史批次记录已创建，请在转账后登记线下结果。'); });
  return dialog;
}
function openSalaryBatchResult(batch) {
  const records = batch.salaryIds.map((id) => salaries.find((item) => item.id === id)).filter(Boolean);
  const rows = records.map((item) => `<div class="ops-detail-subtable"><strong>${esc(item.teacher)} · ${money(salaryTotal(item))}</strong><div class="ops-dialog-grid"><label class="form-field"><span>发放结果</span><select name="result-${item.id}"><option value="">待登记</option><option value="已发放">已发放</option><option value="发放失败">发放失败</option></select></label>${field('实际线下转账日期', `paidAt-${item.id}`, 'date', '')}${field('银行流水号 / 凭证号', `voucher-${item.id}`, 'text', '成功时必填')}${field('失败原因', `failureReason-${item.id}`, 'text', '失败时必填', true)}</div></div>`).join('');
  const dialog = openDialog('登记线下结果', '逐条登记工资单结果；批次状态由成功和失败子项自动派生。', `<form id="salary-result-form" class="ops-dialog-grid"><div class="ops-detail-list wide"><div><span>历史批次记录</span><strong>${batch.id}</strong></div><div><span>批次金额</span><strong>${money(salaryBatchAmount(batch))}</strong></div></div>${rows}</form>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" form="salary-result-form" class="button primary">保存逐单结果</button>');
  dialog.querySelector('#salary-result-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); let success = 0; let failed = 0; for (const item of records) { const result = String(data.get(`result-${item.id}`) || ''); if (!result) continue; const paidAt = String(data.get(`paidAt-${item.id}`) || ''); const voucher = String(data.get(`voucher-${item.id}`) || '').trim(); const failureReason = String(data.get(`failureReason-${item.id}`) || '').trim(); if (result === '已发放' && (!paidAt || !voucher)) return showToast(`${item.teacher}的成功日期和凭证号必填。`, 'warning'); if (result === '发放失败' && !failureReason) return showToast(`${item.teacher}的失败原因必填。`, 'warning'); item.paymentStatus = result; item.paidAt = result === '已发放' ? paidAt : ''; item.failureReason = result === '发放失败' ? failureReason : ''; if (result === '已发放') success += 1; if (result === '发放失败') failed += 1; } if (!success && !failed) return showToast('请至少登记一条工资单结果。', 'warning'); batch.success = success; batch.failed = failed; batch.status = failed && success ? '部分成功' : failed ? '全部失败' : '已发放'; batch.paidAt = batch.status === '已发放' ? records.find((item) => item.paidAt)?.paidAt || '' : ''; closeDialog(); renderSalary(); showToast(batch.status === '部分成功' ? '已保存逐单结果，批次为部分成功。' : '发放结果已保存。', batch.status === '全部失败' ? 'warning' : 'success'); });
  return dialog;
}
function materialImportSheetRows(rows) {
  const table = rows.map((row) => ({ line: row.rowNumber, cells: row.cells.map((cell) => String(cell ?? '').trim()) }));
  const header = table.findIndex((row) => row.cells.some((cell) => cell.includes('物资编号') || cell.includes('物资名称')));
  return (header >= 0 ? table.slice(header + 1) : table).filter((row) => row.cells.some(Boolean) && !row.cells[0].startsWith('填写说明'));
}
async function readMaterialImportSource(form) {
  const file = form.querySelector('[name=file]')?.files?.[0];
  if (!file) return { source: '', rows: null, error: '请选择 .xlsx 格式的 Excel 文件。' };
  if (!/\.xlsx$/i.test(file.name)) return { source: file.name, rows: null, error: '仅支持 .xlsx 格式的 Excel 文件。' };
  try { const rows = await readXlsxSheetRows(await file.arrayBuffer()); return rows ? { source: file.name, rows: materialImportSheetRows(rows) } : { source: file.name, rows: null, error: `${file.name} 无法解析，请使用标准 .xlsx 文件。` }; } catch { return { source: file.name, rows: null, error: `${file.name} 无法解析，请检查文件格式。` }; }
}
function validateMaterialImportRows(rows) {
  const imported = []; const failures = [];
  rows.forEach(({ line, cells }) => {
    const [code, name, category, spec, unit, threshold, location, description] = cells;
    const fail = (reason) => failures.push({ line, code: code || '—', reason });
    if (!code) return fail('缺少物资编号');
    if (!name) return fail('缺少物资名称');
    if (!['教学用品', '画材类'].includes(category)) return fail('物资分类不在字典内');
    if (!unit) return fail('缺少单位');
    if (threshold && !/^\d+$/.test(threshold)) return fail('预警阈值需为非负整数');
    imported.push({ code, name, category, spec: spec || '', unit, threshold: Number(threshold || 10), location: location || '', description: description || '' });
  });
  return { imported, failures };
}
function openMaterialImportResult(source, result) {
  const failures = result.failures.map((item) => `<tr><td>${item.line}</td><td>${esc(item.code)}</td><td><span class="tag red">${esc(item.reason)}</span></td></tr>`).join('');
  openDialog(`物资导入结果 · ${esc(source)}`, `新增 ${result.created} 条，更新 ${result.updated} 条，失败 ${result.failures.length} 行。`, `<div class="ops-detail-list"><div><span>库存处理</span><strong>未修改，仍以出入库流水为准</strong></div></div>${failures ? `<div class="table-wrap ops-table"><table><thead><tr><th>行号</th><th>物资编号</th><th>失败原因</th></tr></thead><tbody>${failures}</tbody></table></div>` : '<p>全部数据行导入成功。</p>'}`);
}
function openMaterialImport() {
  const body = `<form id="material-import-form" class="ops-dialog-grid"><label class="form-field wide"><span>导入 Excel 文件（仅支持 .xlsx）</span><input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label><p class="ops-form-help wide">模板字段顺序：物资编号、物资名称、分类、规格、单位、预警阈值、存放位置、物资描述。按物资编号匹配；不会覆盖库存、启用状态或历史流水。首行为表头时会自动跳过。</p></form>`;
  const dialog = openDialog('批量导入物资', '仅支持 .xlsx 格式的 Excel 文件，每行一条物资档案。', body, '<button type="button" class="button" data-dialog-close>取消</button><button class="button primary" type="submit" form="material-import-form">开始导入</button>');
  dialog.querySelector('#material-import-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const source = await readMaterialImportSource(event.currentTarget);
    if (source.rows === null) return showToast(source.error, 'error');
    if (!source.rows.length) return showToast('请选择文件或粘贴物资清单。', 'warning');
    const { imported, failures } = validateMaterialImportRows(source.rows); let created = 0; let updated = 0;
    imported.forEach((item) => { const existing = materials.find((material) => material.code === item.code); const record = { ...(existing || {}), ...item, id: existing?.id || `material-${Date.now()}-${created}`, stock: existing?.stock || 0, status: existing?.status || '启用' }; const index = materials.findIndex((material) => material.id === record.id); if (index < 0) { materials.unshift(record); created += 1; } else { materials[index] = record; updated += 1; } persistInventory('materials', record); });
    closeDialog(); renderMaterials(); openMaterialImportResult(source.source, { created, updated, failures });
  });
}
function exportMaterials() {
  const rows = [...(opsData || materials)]; const headers = ['物资编号', '物资名称', '分类', '规格', '单位', '当前库存', '预警阈值', '存放位置', '状态', '物资描述'];
  const workbook = writeXlsxSheetRows([headers, ...rows.map((item) => [item.code, item.name, item.category, item.spec, item.unit, item.stock, item.threshold, item.location, item.status || '启用', item.description])]);
  const link = document.createElement('a'); link.href = URL.createObjectURL(workbook); link.download = `物资台账-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); URL.revokeObjectURL(link.href); showToast(`已导出 ${rows.length} 条物资台账。`);
}
function handleAction(action, row) {
  if (action === 'salary-view') return openDialog(`${row.teacher} · 工资详情`, '工资金额与课次明细在发布后锁定。', salaryDetailBody(row));
  if (action === 'salary-edit') return openSalaryEdit(row);
  if (action === 'salary-publish') { if (row.differenceStatus === '待处理' || !row.contractRateSnapshot || row.sourceAttendance !== '已完成' || row.sourceTeachingRecords !== '已完成') return showToast('请先补齐考勤、教学记录、合同费率并处理工资差异。', 'warning'); return confirmPublishSalary(row); }
  if (action === 'salary-batch-publish') { const ready = salaries.filter((item) => item.status === '待发布' && item.tax != null && item.differenceStatus !== '待处理' && item.contractRateSnapshot && item.sourceAttendance === '已完成' && item.sourceTeachingRecords === '已完成'); if (!ready.length) return showToast('没有可发布工资单：需先补齐考勤、教学记录、合同费率和工资差异。', 'warning'); const dialog = openDialog('批量发布工资单', '发布后教师端可见，但不代表资金已发放。', `<p>确认发布 ${ready.length} 条工资单？发布后教师端可见。</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-confirm-action="salary-batch-publish">确认发布</button>'); dialog.dataset.rowId = '__batch__'; return dialog; }
  if (action === 'salary-batch-create') return openSalaryBatchCreate();
  if (action === 'salary-batch-view') { const records = row.salaryIds.map((id) => salaries.find((item) => item.id === id)).filter(Boolean); return openDialog(`${row.id} · 历史批次记录`, '查看批次金额、教师明细和发放结果。', `<div class="ops-detail-list"><div><span>工资月份</span><strong>${row.month}</strong></div><div><span>发放方式</span><strong>${row.method}</strong></div><div><span>发放总额</span><strong>${money(salaryBatchAmount(row))}</strong></div><div><span>批次状态</span><strong>${tag(row.status)}</strong></div><div><span>实际线下转账日期</span><strong>${row.paidAt || '—'}</strong></div><div><span>银行流水 / 凭证</span><strong>${row.voucher || '—'}</strong></div></div><div class="ops-detail-subtable"><table><thead><tr><th>教师</th><th>收款账户</th><th>实际核发</th><th>发放结果</th></tr></thead><tbody>${records.map((item) => `<tr><td>${esc(item.teacher)}</td><td>${esc(item.account)}</td><td>${money(salaryTotal(item))}</td><td>${tag(item.paymentStatus)}${item.failureReason ? `<br><span class="ops-required">${esc(item.failureReason)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`); }
  if (action === 'salary-batch-result') return openSalaryBatchResult(row);
  if (action === 'salary-batch-retry') { if (!['部分成功', '全部失败'].includes(row.status)) return showToast('当前批次不可重复重试。', 'warning'); row.status = '发放中'; row.failed = 0; row.salaryIds.forEach((id) => { const salary = salaries.find((item) => item.id === id); if (salary && salary.paymentStatus !== '已发放') { salary.paymentStatus = '发放中'; salary.failureReason = ''; } }); renderSalary(); return showToast('仅未成功工资单重新进入发放中，已成功记录不会重复发放。'); }
  if (action === 'payment-view') return detail('收款详情', '展示收款渠道、关联订单、业务幂等键和到账处理记录。', [['收款单号', row.receiptNo], ['关联订单', row.orderNo], ['学员 / 课程', `${row.student} / ${row.course}`], ['收款来源', row.source], ['收款渠道', row.channel], ['收款金额', money(row.amount)], ['收款时间', row.time], ['业务键', row.businessKey || '系统生成'], ['到账状态', tag(row.status)], ['核对结果', row.auditStatus || '待核对'], ['异常原因', row.exceptionReason || '—']]);
  if (action === 'payment-confirm') { if (row.status !== '待确认') return showToast('该收款记录已处理，不能重复确认。', 'warning'); row.status = '已到账'; row.auditStatus = '已核对'; row.confirmedAt = demoDateTime(DEMO_TODAY).toISOString().slice(0, 16).replace('T', ' '); upsertDemoRecord('paymentRecords', row); recordFinanceAudit('收款确认到账', row, `订单 ${row.orderNo} 收款已核对`); renderPayments(); return showToast('已确认到账，收款记录、订单状态和审计结果已同步。'); }
  if (action === 'payment-exception') return openSimpleForm('登记收款异常', '异常原因必填；订单保持待确认，不能进入退款或履约完成状态。', field('异常原因', 'reason', 'text', '请输入金额、流水或凭证异常原因', true), (form) => { const reason = String(form.get('reason') || '').trim(); if (!reason) return showToast('异常原因必填。', 'warning'); row.status = '异常'; row.auditStatus = '待处理'; row.exceptionReason = reason; upsertDemoRecord('paymentRecords', row); recordFinanceAudit('收款登记异常', row, reason); closeDialog(); renderPayments(); showToast('收款异常已登记，订单不会被重复确认。', 'warning'); });
  if (action === 'payment-reconcile') return openSimpleForm('重新核对收款', '核对成功才会把异常收款推进为已到账；失败继续保留异常。', field('核对结果', 'result', 'text', '输入已匹配的银行流水号', true), (form) => { const result = String(form.get('result') || '').trim(); if (!result) return showToast('请填写核对结果。', 'warning'); row.status = '已到账'; row.auditStatus = `已核对 · ${result}`; row.exceptionReason = ''; upsertDemoRecord('paymentRecords', row); recordFinanceAudit('收款异常重新核对', row, result); closeDialog(); renderPayments(); showToast('收款已重新核对并确认到账。'); });
  if (action === 'payment-create') return openSimpleForm('登记线下收款', '银行转账和现金收款由财务人工登记，保存后进入待确认状态。', field('关联订单号', 'orderNo', 'text', '请输入订单号') + field('学员姓名', 'student', 'text', '请输入学员姓名') + field('课程名称', 'course', 'text', '请输入课程名称') + select('收款来源', 'source', ['面授课程', '视频课程'], false, false) + select('收款渠道', 'channel', ['银行转账', '现金', '其他'], false, false) + field('收款金额', 'amount', 'number', '请输入金额') + field('收款时间', 'time', 'datetime-local') + field('备注', 'remark', 'text', '选填', true), (form) => { const orderNo = String(form.get('orderNo') || '').trim(); const amount = Number(form.get('amount')); const time = String(form.get('time') || '').replace('T', ' '); if (!orderNo || !amount || !time) return showToast('订单号、金额和收款时间必填。', 'warning'); const channel = String(form.get('channel') || '银行转账'); const businessKey = `receipt:${orderNo}:${channel}:${time}:${amount}`; if (payments.some((item) => item.businessKey === businessKey)) return showToast('相同收款业务已登记，不能重复创建。', 'warning'); const record = { id: `payment-${Date.now()}`, receiptNo: `RC${Date.now()}`, orderNo, student: String(form.get('student') || '—'), course: String(form.get('course') || '—'), source: String(form.get('source') || '面授课程'), channel, amount, time, status: '待确认', businessKey, auditStatus: '待核对' }; payments.unshift(record); upsertDemoRecord('paymentRecords', record); closeDialog(); renderPayments(); showToast('收款记录已登记，状态为待确认。'); });
  if (action === 'payment-refund') { if (row.status !== '已到账') return openDialog('无法发起退款', '退款资格校验未通过。', '<p class="ops-danger">仅已到账收款记录可进入退款校验；待确认或异常记录需先完成收款核对。</p>'); return openSimpleForm('发起全额退款', '退款金额固定为订单实收全额；提交后由统一退款服务校验资格并直接进入「退款中」，由财务在退款记录页执行。', field('订单号', 'orderNo', 'text', row.orderNo) + `<label class="form-field"><span>退款金额</span><input class="readonly-field" readonly value="${money(row.amount)}" aria-label="退款金额锁定为订单实收全额"></label>` + field('退款原因', 'reason', 'text', '请输入退款原因', true) + select('退款渠道', 'channel', ['银行转账', '现金', '微信支付', '支付宝'], false, false), (form) => { const outcome = createRefundRequest({ orderId: row.orderNo, origin: '后台发起', requestedBy: operatorName(), reason: String(form.get('reason') || '').trim(), channel: String(form.get('channel') || '银行转账'), skipApproval: true }); if (!outcome.ok) { showToast(outcome.reason === 'REFUND_ALREADY_OPEN' ? '该订单已有有效退款单，不能重复发起。' : '退款创建失败，请检查订单资格。', 'warning'); return false; } syncSharedRefunds(); showToast('退款已登记，进入「退款中」，请在退款记录页执行。'); }); }
  if (action === 'refund-view') return detail('退款详情', '展示退款发起与渠道处理信息；订单退款、学籍异动与收款退款记录同列展示。', [['退款单号', row.no], ['关联订单', row.orderNo], ['学员 / 手机号', `${row.student} / ${row.phone}`], ['课程 / 类型', `${row.course} / ${row.orderType}`], ['申请来源', row.origin || '系统'], ['申请金额', money(row.amount)], ...(row.totalLessons ? [['退款依据', `${row.rule || '资格校验通过，退订单实收全额'} · 已上 ${row.completedLessons ?? 0}/${row.totalLessons} 课时`]] : [['退款依据', row.rule || '视频课程全额退款规则']]), ['退款原因', row.reason], ['退款方式 / 渠道', `${row.source || '线上'} / ${row.channel}`], ['申请时间', row.time], ['完成时间', row.completedAt || '—'], ['当前状态', tag(row.status)], ['处理备注', row.remark || '—'], ['订单联动', row.objectType === '视频课程' || row.orderType === '视频课程' ? '退款完成后回收学习权限，学习记录保留' : row.classChangeId ? '学籍已先行退出；退款完成只更新关联状态，不重复减员' : '退款完成后学籍转为已退班并释放一次名额']]);
  if (action === 'refund-complete') return openDialog('确认退款', '渠道退款完成后将同步订单和退款关联状态。', `<p>确认退款渠道已完成处理？订单将变为已退款。${row.classChangeId ? '该学籍已先行退出，本次不会再次减员。' : '仍在读的面授学籍将转为已退班并释放一次名额。'}</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-confirm-action="refund-complete">确认完成</button>')?.setAttribute('data-row-id', row.id);
  if (action === 'refund-cancel') return openSimpleForm('取消退款', '取消后退款单变为「已取消」，订单回到「已支付」，面授学籍保持就读、视频授权恢复生效；取消原因必填，记入财务审计。', field('取消原因', 'reason', 'text', '请填写取消原因（如学员撤回、渠道故障、信息有误）', true), (form) => { const reason = String(form.get('reason') || '').trim(); if (!reason) { showToast('取消原因必填。', 'warning'); return false; } const outcome = settleRefund(row.id, '取消', { name: operatorName(), cancelReason: reason }); if (!outcome.ok) { showToast('取消退款失败，请刷新后重试。', 'warning'); return false; } syncSharedRefunds(); showToast('退款已取消，订单已回到「已支付」。', 'warning'); });
  if (action === 'refund-export') return showToast('退款记录导出任务已创建。');
  if (action === 'inbound-export') return showToast(`已按当前筛选条件生成入库记录导出，共${opsData.length}条；生产环境需记录导出人、时间和筛选条件。`);
  if (action === 'outbound-export') return showToast(`已按当前筛选条件生成出库记录导出，共${opsData.length}条；生产环境需记录导出人、时间和筛选条件。`);
  if (action === 'refund-offline-create') return openOfflineRefundForm();
  if (action === 'category-create' || action === 'category-edit') {
    const editing = action === 'category-edit' ? row : null;
    const body = `<label class="form-field"><span>分类名称 <b class="required-mark">*</b></span><input name="name" required maxlength="30" value="${esc(editing?.name || '')}" placeholder="如 乐器类"></label>${select('上级分类', 'parent', categoryOptions(editing?.id || ''), false, true, editing?.parent === '—' ? '' : editing?.parent || '')}<label class="form-field"><span>分类编码</span><input type="text" name="code" maxlength="30" value="${esc(editing?.code || '')}" placeholder="请输入分类编码"></label>${field('排序', 'sort', 'number', '数字越小越靠前')}<p class="ops-form-help wide">最多支持两级分类；同级分类名称和编码不可重复。</p>`;
    return openSimpleForm(editing ? '编辑分类' : '新增分类', '分类编码可用于对接财务系统，父级为空时作为一级分类。', body, (form) => {
      const name = String(form.get('name') || '').trim();
      const parent = String(form.get('parent') || '').trim() || '—';
      const code = String(form.get('code') || '').trim();
      const sort = Number(form.get('sort') || 0);
      if (name.length < 2) return showToast('分类名称至少填写2个字。', 'warning');
      if (!Number.isInteger(sort) || sort < 0) return showToast('排序必须为0及以上整数。', 'warning');
      if (parent !== '—' && !categories.some((item) => item.name === parent && item.parent === '—')) return showToast('上级分类选择无效。', 'warning');
      if (parent !== '—' && categories.some((item) => item.name === parent && item.parent !== '—')) return showToast('当前上级分类不是一级分类，不能建立第三级。', 'warning');
      const duplicate = categories.find((item) => item.id !== editing?.id && item.parent === parent && (item.name === name || (code && item.code === code)));
      if (duplicate) return showToast('同级分类名称或编码已存在。', 'warning');
      const target = editing || { id: `category-${Date.now()}`, count: 0, status: '启用' };
      Object.assign(target, { name, parent, code, sort });
      if (!editing) categories.push(target);
      persistInventory('categories', target);
      closeDialog(); renderCategories(); showToast(editing ? '分类信息已更新。' : '分类已新增。');
    });
  }
  if (action === 'category-toggle') { row.status = row.status === '启用' ? '停用' : '启用'; persistInventory('categories', row); renderCategories(); return showToast(row.status === '停用' ? '分类已停用，不再用于新建物资。' : '分类已启用，可用于新建物资。'); }
  if (action === 'category-view') return detail(`${row.name} · 关联物资`, '查看当前分类下的物资种类。', [['分类编码', row.code], ['上级分类', row.parent], ['物资种类数', `${row.count} 种`], ['分类状态', tag(row.status)], ['引用关系', row.count ? '已有物资引用' : '暂无物资引用']]);
  if (action === 'category-delete') { if (categoryHasReferences(row)) return openDialog('无法删除分类', '删除前需要校验物资和流水引用。', '<p class="ops-danger">该分类已被物资或历史流水引用，只能停用，不能物理删除。</p>'); const dialog = openDialog('确认删除分类', '删除后分类记录不可恢复。', `<p>确认删除分类“${esc(row.name)}”？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="category-delete">确认删除</button>'); dialog.dataset.rowId = row.id; return dialog; }
  if (action === 'material-view') return detail(`${row.name} · 物资详情`, '展示基础信息、库存信息和最近出入库记录。', [['物资编号', row.code], ['物资分类', row.category], ['规格 / 单位', `${row.spec} / ${row.unit}`], ['存放位置', row.location], ['当前库存', String(row.stock)], ['预警阈值', String(row.threshold)], ['库存状态', tag(materialStatus(row))], ['物资描述', row.description]]);
  if (action === 'material-import') return openMaterialImport();
  if (action === 'material-export') return exportMaterials();
  if (action === 'material-create' || action === 'material-edit') return openSimpleForm(action === 'material-create' ? '新增物资' : '编辑物资', '物资不涉及审批，保存后立即生效；新增物资库存固定为0，需通过入库登记增加库存。', field('物资名称', 'name', 'text', '请输入物资名称') + select('物资分类', 'category', ['教学用品', '画材类'], false, false) + field('规格型号', 'spec', 'text', '如 HB 2B') + select('单位', 'unit', ['个', '本', '套', '支', '台', '件', '盒', '箱', '瓶'], false, false) + field('预警阈值', 'threshold', 'number', '默认10') + field('存放位置', 'location', 'text', '仓库 / 教室') + field('物资描述', 'description', 'text', '选填') + '<label class="form-field wide"><span>物资图片</span><label class="upload-control"><input type="file" accept="image/*" aria-label="物资图片" />上传图片</label></label>', (form) => { const isCreate = action === 'material-create'; const target = row || {}; Object.assign(target, { id: target.id || `material-${Date.now()}`, code: target.code || `WZ-${String(Date.now()).slice(-4)}`, name: String(form.get('name') || '').trim(), category: form.get('category') || '教学用品', spec: String(form.get('spec') || '').trim(), unit: form.get('unit') || '件', threshold: Number(form.get('threshold') || 10), location: String(form.get('location') || '').trim(), description: String(form.get('description') || '').trim(), stock: isCreate ? 0 : target.stock, status: target.status || '启用' }); if (!target.name) return showToast('请填写物资名称。', 'warning'); if (isCreate) materials.unshift(target); persistInventory('materials', target); closeDialog(); renderMaterials(); showToast('物资信息已保存。'); });
  if (action === 'material-disable' || action === 'material-enable') { row.status = action === 'material-enable' ? '启用' : '停用'; persistInventory('materials', row); renderMaterials(); return showToast(row.status === '停用' ? '物资已停用，不能继续出入库。' : '物资已启用。'); }
  if (action === 'material-delete') { if (row.stock > 0) return openDialog('无法删除物资', '删除前需要校验当前库存。', `<p class="ops-danger">该物资尚有 ${row.stock} 件库存，请先出库清零后再删除。</p>`); if (materialHasReferences(row)) return openDialog('无法删除物资', '删除前需要校验历史流水和业务引用。', '<p class="ops-danger">该物资已有历史出入库流水或业务引用，只能停用，不能物理删除。</p>'); const dialog = openDialog('确认删除物资', '仅允许删除库存为0且没有任何流水或业务引用的物资。', `<p>确认删除“${esc(row.name)}”？</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button danger-button" data-confirm-action="material-delete">确认删除</button>'); dialog.dataset.rowId = row.id; return dialog; }
}
function confirmPublishSalary(row) {
  if (row.tax == null) return showToast('请先完成核算并填写个税。', 'warning');
  const dialog = openDialog('确认发布工资单', '发布后教师端可查看工资明细，实际转账由财务在线下流程完成。', `<div class="ops-detail-list"><div><span>教师 / 月份</span><strong>${esc(row.teacher)} / ${row.month}</strong></div><div><span>实际核发</span><strong class="ops-amount">${money(salaryTotal(row))}</strong></div></div><p class="ops-warning">发布工资单不代表资金已发放。平台不登记线下转账结果。</p>`, '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-confirm-action="salary-publish">确认发布</button>');
  dialog.dataset.rowId = row.id;
  return dialog;
}
document.addEventListener('click', (event) => {
  if (!opsRoot) return;
  if (event.target.closest('[data-dialog-close]')) { closeDialog(); return; }
  const confirm = event.target.closest('[data-confirm-action]');
  if (confirm) { const dialog = confirm.closest('dialog'); const action = confirm.dataset.confirmAction; const id = dialog?.dataset.rowId; const row = id && id !== '__batch__' ? salaries.find((item) => item.id === id) || opsData.find((item) => item.id === id) : null; if (action === 'salary-batch-publish') { const ready = salaries.filter((item) => item.status === '待发布' && item.tax != null); ready.forEach((item) => { item.status = '已发布'; item.paymentStatus = '已发布'; item.batchId = ''; item.paidAt = ''; item.failureReason = ''; }); closeDialog(); renderSalary(); showToast(`已发布${ready.length}条工资单，实际转账由财务在线下流程完成。`); } if (action === 'salary-publish' && row) { if (row.tax == null) { closeDialog(); showToast('请先完成核算并填写个税。', 'warning'); return; } row.status = '已发布'; row.paymentStatus = '已发布'; row.batchId = ''; row.paidAt = ''; row.failureReason = ''; closeDialog(); renderSalary(); showToast('工资单已发布，教师端可见，工资单已发布。'); } if (action === 'refund-complete' && row) { const outcome = settleRefund(row.id, '完成', { name: operatorName(), remark: '渠道退款已完成，报名资格已取消。' }); if (!outcome.ok) { closeDialog(); showToast(outcome.reason === 'REFUND_ALREADY_SETTLED' ? '该退款单已完成，不能重复操作。' : '退款完成操作失败，请稍后重试。', 'warning'); return; } closeDialog(); renderRefunds(); if (outcome.refund?.orderType === '视频课程' || row.orderType === '视频课程') showToast('退款已完成，订单转为已退款，学习权限已回收。'); else showToast(outcome.seatReleased ? '退款已完成，学籍转为已退班并释放名额。' : '退款已完成；学籍此前已退出，本次未重复释放名额。'); } if (action === 'category-delete' && row) { if (categoryHasReferences(row)) { closeDialog(); showToast('该分类已有引用，不能删除。', 'warning'); return; } categories.splice(categories.findIndex((item) => item.id === row.id), 1); removeDemoRecord('categories', row.id); closeDialog(); renderCategories(); showToast('分类已删除。'); } if (action === 'material-delete' && row) { if (row.stock !== 0 || materialHasReferences(row)) { closeDialog(); showToast('该物资存在库存或引用，不能删除。', 'warning'); return; } materials.splice(materials.findIndex((item) => item.id === row.id), 1); removeDemoRecord('materials', row.id); closeDialog(); renderMaterials(); showToast('物资已删除。'); } return; }
  const button = event.target.closest('[data-ops-action]'); if (!button) return;
  const action = button.dataset.opsAction;
  if (action === 'refund-tab') { const url = new URL(location.href); url.searchParams.set('tab', button.dataset.tab); history.replaceState({}, '', url); renderRefunds(); return; }
  if (action === 'salary-tab') { salaryActiveTab = button.dataset.tab; renderSalary(); return; }
  const rowElement = button.closest('tr[data-row-id]'); const row = rowElement ? opsData.find((item) => item.id === rowElement.dataset.rowId) : null;
  handleAction(action, row);
});
if (opsPage === 'salary') renderSalary();
if (opsPage === 'payments') renderPayments();
if (opsPage === 'refunds') { syncSharedRefunds(); renderRefunds(); }
if (opsPage === 'categories') renderCategories();
if (opsPage === 'materials') renderMaterials();
if (opsPage === 'inbound') renderInbound();
if (opsPage === 'outbound') renderOutbound();
if (opsPage === 'stock-in') renderStockForm('in');
if (opsPage === 'stock-out') renderStockForm('out');


  __classicModules["shared/js/finance-inventory.js"] = __classicExports;
})(globalThis);
