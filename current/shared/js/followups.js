(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id] || Object.create(null);

  // 线索到期标签 + 线索↔档案人工绑定 + 跟进记录只读投影。
  // CR-P-001：档案侧「跟进记录」不再有自己的数据源，统一投影 CRM 线索跟进记录；
  // 档案侧不写入、不引用家校互动数据；关联关系只认人工确认配置，禁止按姓名/手机号自动匹配。
  // 时间基准固定为 demo-clock 的 DEMO_TODAY，避免演示口径随真实日期漂移。
  const DEMO_TODAY = __classicRequire('shared/js/demo-clock.js').DEMO_TODAY || '2026-09-12';
  const demoStore = () => __classicRequire('shared/js/demo-store.js') || {};
  const LEADS_URL = '/admin/pages/crm/leads.html';
  const PROFILE_URL = '/admin/pages/system/student-profile.html';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // 演示用线索目录 / 档案目录：供人工选择，不做自动匹配。生产由服务端按当前角色权限返回。
  const LEAD_CATALOG = [
    { leadId: 'lead-zhou', leadNo: 'CL20260908012', contact: '周女士', course: '少儿中国舞基础班' },
    { leadId: 'lead-zhou-l2', leadNo: 'CL20260902005', contact: '周女士', course: '少儿中国舞 L2（进阶咨询）' },
    { leadId: 'lead-li', leadNo: 'CL20260907008', contact: '李先生', course: '成人声乐班' },
    { leadId: 'lead-he', leadNo: 'CL20260905003', contact: '何女士', course: '少儿国画入门' },
    { leadId: 'lead-sun', leadNo: 'CL20260904006', contact: '孙先生', course: '中国画基础' }
  ];
  const ARCHIVE_CATALOG = [
    { learnerId: 'learner-001', name: '林知夏', guardian: '林女士' },
    { learnerId: 'learner-002', name: '林知远', guardian: '林女士' },
    { learnerId: 'learner-003', name: '周予安', guardian: '周女士' },
    { learnerId: 'learner-004', name: '赵一诺', guardian: '赵先生' }
  ];

  function readState() {
    const read = demoStore().readDemoState;
    return typeof read === 'function' ? read() : {};
  }
  function writeState(mutator) {
    const write = demoStore().writeDemoState;
    return typeof write === 'function' ? write(mutator) : null;
  }

  // 只认 yyyy-mm-dd 前缀，UTC 计算天数差，避免时区干扰。
  function dayValue(value) {
    const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  function reminderOf(next, today = DEMO_TODAY) {
    const raw = String(next ?? '').trim();
    const due = dayValue(raw);
    if (due === null) return { state: 'unset', label: '待安排', days: 0, due: '—' };
    const base = dayValue(today);
    if (base === null) return { state: 'unset', label: '待安排', days: 0, due: raw };
    const days = Math.round((due - base) / 86400000);
    if (days < 0) return { state: 'overdue', label: `已逾期 ${-days} 天`, days, due: raw };
    if (days === 0) return { state: 'today', label: '今日跟进', days, due: raw };
    return { state: 'upcoming', label: `${days} 天后`, days, due: raw };
  }

  // CRM「下次跟进」单元格的到期标签。
  function leadReminderHtml(lead) {
    const r = reminderOf(lead?.next);
    const cls = { overdue: 'amber', today: 'brand', upcoming: 'gray', unset: 'gray' }[r.state];
    return `<span class="tag ${cls}">${escapeHtml(r.label)}</span>${r.state === 'unset' ? '' : `<br><span class="sub-cell">${escapeHtml(r.due)}</span>`}`;
  }

  // ── 人工确认的关联配置：一学员可绑多条线索，一条线索只绑一个学员 ──────────────
  function bindings() {
    const state = readState();
    return Array.isArray(state.leadLearnerBindings) ? state.leadLearnerBindings : [];
  }
  function linksForLearner(learnerId) {
    return bindings().filter((item) => item.learnerId === learnerId);
  }
  function linksForLead(lead) {
    return bindings().filter((item) => item.leadId === lead?.id || item.leadNo === lead?.number);
  }
  const linkForLearner = (learnerId) => linksForLearner(learnerId)[0] || null;
  const linkForLead = (lead) => linksForLead(lead)[0] || null;

  function bindLeadToLearner(leadNo, learnerId, operator) {
    const lead = LEAD_CATALOG.find((item) => item.leadNo === leadNo);
    if (!lead) return { ok: false, reason: '线索编号不在可绑定目录内。' };
    if (!ARCHIVE_CATALOG.some((item) => item.learnerId === learnerId)) return { ok: false, reason: '请选择有效的学员档案。' };
    const rows = bindings();
    if (rows.some((item) => item.leadNo === leadNo && item.learnerId === learnerId)) return { ok: false, reason: '该线索与学员档案已绑定。' };
    if (rows.some((item) => item.leadNo === leadNo)) return { ok: false, reason: '该线索已绑定其他学员档案，请先解绑。' };
    const record = { id: `bind-${Date.now()}`, leadId: lead.leadId, leadNo, learnerId, confirmedBy: operator || '当前账号', confirmedAt: `${DEMO_TODAY} 10:00` };
    writeState((next) => {
      next.leadLearnerBindings = [...(Array.isArray(next.leadLearnerBindings) ? next.leadLearnerBindings : []), record];
      next.leadBindingAudit = [{ action: '绑定', ...record }, ...(Array.isArray(next.leadBindingAudit) ? next.leadBindingAudit : [])];
      return next;
    });
    return { ok: true, record };
  }

  function unbindLeadFromLearner(leadNo, learnerId, operator) {
    const rows = bindings();
    if (!rows.some((item) => item.leadNo === leadNo && item.learnerId === learnerId)) return { ok: false, reason: '未找到该绑定关系。' };
    const record = { action: '解绑', leadNo, learnerId, confirmedBy: operator || '当前账号', confirmedAt: `${DEMO_TODAY} 10:00` };
    writeState((next) => {
      next.leadLearnerBindings = (Array.isArray(next.leadLearnerBindings) ? next.leadLearnerBindings : []).filter((item) => !(item.leadNo === leadNo && item.learnerId === learnerId));
      next.leadBindingAudit = [record, ...(Array.isArray(next.leadBindingAudit) ? next.leadBindingAudit : [])];
      return next;
    });
    return { ok: true };
  }

  // ── 跟进记录只读投影：唯一事实源在 CRM ───────────────────────────────────────
  // 优先读取 CRM 写入 demo-store 的 lead.followUps；从未写入过该线索时回退到演示基线。
  function followUpsOfLead(leadNo, leadId) {
    const state = readState();
    const stored = (Array.isArray(state.leads) ? state.leads : []).find((item) => item.number === leadNo || item.id === leadId);
    if (stored && Array.isArray(stored.followUps)) return stored.followUps;
    return (state.leadFollowUpBaseline || {})[leadNo] || [];
  }
  function learnerFollowUps(learnerId) {
    return linksForLearner(learnerId)
      .flatMap((link) => followUpsOfLead(link.leadNo, link.leadId).map((item) => ({ ...item, leadNo: link.leadNo, leadId: link.leadId })))
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')) || String(a.leadNo || '').localeCompare(String(b.leadNo || '')));
  }

  function learnerFollowUpsHtml(learner) {
    const links = linksForLearner(learner?.id);
    if (!links.length) {
      return `<div class="empty">该学员暂未关联线索，跟进记录以 CRM 线索为准。</div><p class="muted">请先在 CRM 线索详情中人工确认绑定；<a class="text-button" href="${LEADS_URL}">前往线索跟进 ›</a></p>`;
    }
    const sourceNote = `<p class="muted">数据来源：CRM 线索跟进记录（只读） · 已关联 ${links.length} 条线索 · 按时间倒序；新增或编辑跟进请前往线索详情。</p>`;
    const rows = learnerFollowUps(learner.id);
    if (!rows.length) return `${sourceNote}<div class="empty compact">暂无跟进记录</div>`;
    const body = rows.map((item) => `<tr><td>${escapeHtml(item.at)}</td><td><a class="text-button" href="${LEADS_URL}?leadNo=${encodeURIComponent(item.leadNo)}">${escapeHtml(item.leadNo)} ›</a></td><td>${escapeHtml(item.method)}</td><td>${escapeHtml(item.content)}</td><td>${escapeHtml(item.next || '—')}</td><td>${escapeHtml(item.owner || '—')}</td></tr>`).join('');
    return `${sourceNote}<div class="table-wrap student-subtable-wrap"><table class="student-subtable"><thead><tr><th>时间</th><th>线索编号</th><th>方式</th><th>内容</th><th>下次跟进</th><th>跟进人</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  // 档案基础档案中的「关联线索」一行；无人工确认绑定时不展示。
  function leadProfileLinkHtml(learner) {
    const links = linksForLearner(learner?.id);
    if (!links.length) return '';
    return `<div><dt>关联线索</dt><dd>${links.map((link) => `<a class="text-button" href="${LEADS_URL}?leadNo=${encodeURIComponent(link.leadNo)}">${escapeHtml(link.leadNo)} ›</a>`).join('　')}</dd></div>`;
  }

  // CRM 线索详情中的「关联学员档案」：只读链接 + 人工绑定/解绑控件（写入收口 CRM）。
  function leadBindingHtml(lead) {
    const links = linksForLead(lead);
    const current = links.length
      ? links.map((link) => {
        const archive = ARCHIVE_CATALOG.find((item) => item.learnerId === link.learnerId);
        return `<span class="lead-binding-item"><a class="text-button" href="${PROFILE_URL}?learnerId=${encodeURIComponent(link.learnerId)}">${escapeHtml(archive?.name || link.learnerId)} ›</a><button type="button" class="text-button" data-lead-unbind="${escapeHtml(link.learnerId)}">解绑</button></span>`;
      }).join('')
      : '<span class="muted">未建档</span>';
    const options = ARCHIVE_CATALOG.map((item) => `<option value="${escapeHtml(item.learnerId)}">${escapeHtml(item.name)}（${escapeHtml(item.guardian)}）</option>`).join('');
    return `<div class="lead-binding-control" data-lead-binding="${escapeHtml(lead?.number || '')}"><div class="lead-binding-current">${current}</div><div class="lead-binding-form"><select data-lead-bind-select aria-label="选择学员档案">${options}</select><button type="button" class="button" data-lead-bind>人工绑定</button></div><small class="muted">仅人工确认绑定，禁止按姓名或手机号自动匹配；绑定后该学员档案「跟进记录」只读展示本线索记录。</small></div>`;
  }

  function learnerProfileLinkHtml(lead) {
    const links = linksForLead(lead);
    if (!links.length) return '未建档';
    return links.map((link) => `<a class="text-button" href="${PROFILE_URL}?learnerId=${encodeURIComponent(link.learnerId)}">查看学员档案 ›</a>`).join('　');
  }

  // 班级详情「学员与记录」：班级名册 studentId 与档案 learnerId 不同源，只认人工确认映射。
  function studentArchiveLinkHtml(studentId) {
    const state = readState();
    const link = (Array.isArray(state.studentArchiveLinks) ? state.studentArchiveLinks : []).find((item) => item.studentId === studentId);
    if (!link) return '<span class="muted">未建档</span>';
    return `<a class="text-button" href="${PROFILE_URL}?learnerId=${encodeURIComponent(link.learnerId)}">查看学员档案 ›</a>`;
  }

  __classicExports['DEMO_TODAY'] = DEMO_TODAY;
  __classicExports['LEAD_CATALOG'] = LEAD_CATALOG;
  __classicExports['ARCHIVE_CATALOG'] = ARCHIVE_CATALOG;
  __classicExports['reminderOf'] = reminderOf;
  __classicExports['bindings'] = bindings;
  __classicExports['linksForLead'] = linksForLead;
  __classicExports['linksForLearner'] = linksForLearner;
  __classicExports['linkForLead'] = linkForLead;
  __classicExports['linkForLearner'] = linkForLearner;
  __classicExports['bindLeadToLearner'] = bindLeadToLearner;
  __classicExports['unbindLeadFromLearner'] = unbindLeadFromLearner;
  __classicExports['learnerFollowUps'] = learnerFollowUps;
  __classicExports['learnerFollowUpsHtml'] = learnerFollowUpsHtml;
  __classicExports['leadReminderHtml'] = leadReminderHtml;
  __classicExports['leadProfileLinkHtml'] = leadProfileLinkHtml;
  __classicExports['leadBindingHtml'] = leadBindingHtml;
  __classicExports['learnerProfileLinkHtml'] = learnerProfileLinkHtml;
  __classicExports['studentArchiveLinkHtml'] = studentArchiveLinkHtml;
  __classicModules['shared/js/followups.js'] = __classicExports;
})(typeof window !== 'undefined' ? window : globalThis);
