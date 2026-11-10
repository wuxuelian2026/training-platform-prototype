(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
  const HS = __classicRequire('shared/js/home-school-store.js');

  // 后台「家校沟通监管」：会话监管、内容安全与触达配置、沟通关系绑定三个页签。
  // 不新建一级模块、不代发代回、不做举报工单、不提供自动回复或自动翻译；挂教务执行监管菜单下，用页签承载。
  // 通知投递记录由「消息中心（academic/messages.html）」承载，不在本页重复展示；
  // 本模块操作审计（发送/回复/下架/配置变更）仅落库（HS.listAudit），暂不单独展示，后续单独立「操作审计」页。
  const root = document.querySelector('#page-content') || document.querySelector('.admin-content');
  if (!root || !HS) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let activeTab = 'threads';
  let flash = '';
  // 筛选状态：会话监管与沟通关系绑定各自独立，切换页签不互相影响。
  let threadFilters = { classId: '', teacher: '', student: '' };
  let bindingFilters = { classId: '', teacher: '', student: '' };

  // 从数据中提取去重后的班级 / 教师 / 学员选项（按 id 去重，取展示名）。
  function hsUniqueOptions(list, keyFn) {
    const map = new Map();
    list.forEach(item => { const k = keyFn(item); if (k && k.id) map.set(k.id, k.label); });
    return [...map.entries()].map(([id, label]) => [id, label]);
  }
  function hsFilterBar(prefix, filters, classOpts, teacherOpts, studentOpts) {
    const fkLabel = { classId: '班级', teacher: '教师', student: '学员' };
    const sel = (fk, opts) => `<select data-hs-filter="${prefix}:${fk}" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;min-width:120px"><option value="">全部${fkLabel[fk]}</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${filters[fk] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">${sel('classId', classOpts)}${sel('teacher', teacherOpts)}${sel('student', studentOpts)}<button class="button" type="button" data-hs-filter-reset="${prefix}" style="padding:6px 12px;font-size:13px">重置筛选</button></div>`;
  }
  function hsFilterSummary(prefix, filters, total, matched) {
    const parts = [];
    if (filters.classId) parts.push('班级');
    if (filters.teacher) parts.push('教师');
    if (filters.student) parts.push('学员');
    const label = parts.length ? `已按 ${parts.join(' / ')} 筛选` : '未筛选';
    return `<span style="font-size:12px;color:#6b7280;margin-left:4px">${esc(label)} · 命中 ${matched} / ${total} 条</span>`;
  }
  function hsApplyFilters(list, filters) {
    return list.filter(item =>
      (!filters.classId || item.classId === filters.classId) &&
      (!filters.teacher || item.teacherName === filters.teacher) &&
      (!filters.student || item.studentName === filters.student)
    );
  }

  const TABS = [
    ['threads', '会话监管'],
    ['safety', '内容安全与触达配置'],
    ['bindings', '沟通关系绑定']
  ];

  function tableStyle() {
    return 'width:100%;border-collapse:collapse;font-size:13px';
  }
  function cellStyle() {
    return 'padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top';
  }
  function table(columns, rows) {
    if (!rows.length) return '<div style="padding:18px;color:#6b7280;background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px">暂无记录</div>';
    return `<div style="overflow-x:auto"><table style="${tableStyle()}"><thead><tr>${columns.map(label => `<th style="${cellStyle()};background:#f5f6f8;white-space:nowrap">${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function row(cells) {
    return `<tr>${cells.map(value => `<td style="${cellStyle()}">${value}</td>`).join('')}</tr>`;
  }
  function panel(title, description, body) {
    return `<section style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px">
      <h2 style="font-size:16px;margin:0 0 6px">${esc(title)}</h2>
      <p style="font-size:12px;color:#6b7280;margin:0 0 14px">${esc(description)}</p>${body}</section>`;
  }
  function badge(text, color) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;background:${color || '#eef2f7'};color:#374151">${esc(text)}</span>`;
  }

  function statCards() {
    const s = HS.stats();
    const items = [
      ['会话总数', s.total, '#eef4ff'],
      ['待回复', s.pending, '#fff4e5'],
      ['已回复', s.replied, '#e8f7ee'],
      ['只读（结课/下架）', s.closed, '#f1f2f4'],
      ['回复率', `${s.replyRate}%`, '#eef4ff'],
      ['首次响应 P50', `${s.responseP50} 分钟`, '#eef4ff'],
      ['首次响应 P95', `${s.responseP95} 分钟`, '#eef4ff'],
      ['违规拦截率', `${s.blockRate}%（${s.blockCount}/${s.scanCount}）`, '#fff4e5']
    ];
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px">${items.map(([label, value, bg]) => `<div style="background:${bg};border-radius:8px;padding:12px"><div style="font-size:12px;color:#6b7280">${esc(label)}</div><strong style="font-size:20px">${esc(value)}</strong></div>`).join('')}</div>`;
  }

  function threadsTab() {
    const all = HS.listThreads({ role: HS.ROLE.ADMIN });
    const classOpts = hsUniqueOptions(all, i => ({ id: i.classId, label: i.className }));
    const teacherOpts = hsUniqueOptions(all, i => ({ id: i.teacherName, label: i.teacherName }));
    const studentOpts = hsUniqueOptions(all, i => ({ id: i.studentName, label: i.studentName }));
    const threads = hsApplyFilters(all, threadFilters);
    const rows = threads.map(thread => row([
      esc(thread.threadId),
      `${esc(thread.className)}<br><span style="color:#6b7280;font-size:12px">${esc(thread.studentName)} · ${esc(thread.teacherName)}</span>`,
      badge(thread.status, thread.status === HS.STATUS.PENDING ? '#fff4e5' : thread.status === HS.STATUS.REPLIED ? '#e8f7ee' : '#f1f2f4'),
      esc(thread.lastMessageAt),
      esc(thread.closedBy || '—'),
      `<button class="button" type="button" data-hs-action="view" data-hs-id="${esc(thread.threadId)}" style="padding:4px 10px;font-size:12px">只读查看</button>
       ${thread.status === HS.STATUS.CLOSED ? '' : `<button class="button" type="button" data-hs-action="takedown" data-hs-id="${esc(thread.threadId)}" style="padding:4px 10px;font-size:12px;margin-left:6px;background:#fff1f0;border-color:#ffccc7">下架</button>`}`
    ]));
    const detail = global.__hsThreadDetail
      ? (() => {
          const thread = HS.getThread(global.__hsThreadDetail, { role: HS.ROLE.ADMIN });
          if (!thread) return '';
          const messages = HS.listMessages(thread.threadId, { role: HS.ROLE.ADMIN });
          return panel('会话只读抽查', '后台受控只读查看；本期禁止导出、批量与跨班检索，消息正文仅用于内容核查。',
            messages.map(item => `<div style="padding:8px 0;border-bottom:1px solid #f0f1f3"><strong>${esc(item.senderLabel)}</strong> <span style="color:#6b7280;font-size:12px">${esc(item.createdAt)}</span><div style="line-height:1.6;white-space:pre-wrap">${esc(item.text)}</div></div>`).join('') || '<div style="color:#6b7280">暂无消息</div>');
        })()
      : '';
    const filterBar = hsFilterBar('threads', threadFilters, classOpts, teacherOpts, studentOpts) + hsFilterSummary('threads', threadFilters, all.length, threads.length);
    return statCards() + panel('会话监管', '后台只做配置、监管与审计，不代家长或教师发消息。漏放内容在本页人工复核队列内下架，不设独立举报工单。可按班级 / 教师 / 学员筛选。', filterBar + table(['会话编号', '班级 / 学员 / 教师', '状态', '最后消息', '只读原因', '操作'], rows)) + detail;
  }

  function safetyTab() {
    const rules = HS.getRules();
    const rows = rules.keywords.map((word, index) => row([String(index + 1), esc(word), badge('启用中', '#e8f7ee')]));
    return panel('内容安全事前审核', '提交留言与教师回复两处服务端前置拦截；命中即不入库并提示修正。撤销产品内举报后，事前拦截是唯一防线。',
      `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
         <label style="font-size:13px"><input type="checkbox" data-hs-rule="enabled" ${rules.enabled ? 'checked' : ''}> 启用规则</label>
         <label style="font-size:13px"><input type="checkbox" data-hs-rule="subscriptionAuthorized" ${rules.subscriptionAuthorized ? 'checked' : ''}> 家长已授权订阅消息</label>
         <span style="font-size:12px;color:#6b7280">未授权时自动降级为站内未读红点，不阻塞沟通闭环</span>
       </div>
       <label style="display:block;font-size:13px;margin-bottom:6px">违规关键词（逗号分隔，示例规则）</label>
       <textarea data-hs-rule="keywords" rows="3" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px">${esc(rules.keywords.join('，'))}</textarea>
       <div style="margin-top:12px"><button class="button" type="button" data-hs-action="save-rules" style="padding:6px 14px">保存配置</button></div>`)
      + panel('当前规则明细', '手机号、证件号等个人信息由正则识别，不依赖关键词表；高风险主题仅提示走既有流程，不拦截日常沟通。', table(['序号', '关键词', '状态'], rows))
      + panel('范围说明', '本期仅提供人工留言与通知触达，不提供翻译、举报入口与即时通讯。事后救济由既有客服 / 线下通道承接，是否必须产品内提供待法务书面确认。',
        `<p style="font-size:13px;line-height:1.8;margin:0">审计：所有发送、回复、下架、配置变更均写入审计日志，日志不含个人信息原文；本页不单独展示，由后续「操作审计」页统一承载。</p>`);
  }

  function bindingsTab() {
    const all = HS.listBindings();
    const classOpts = hsUniqueOptions(all, i => ({ id: i.classId, label: i.className }));
    const teacherOpts = hsUniqueOptions(all, i => ({ id: i.teacherName, label: i.teacherName }));
    const studentOpts = hsUniqueOptions(all, i => ({ id: i.studentName, label: i.studentName }));
    const rows = hsApplyFilters(all, bindingFilters).map(item => row([
      esc(item.classId), esc(item.className), esc(item.studentName), esc(item.teacherName),
      badge(item.active ? '在读' : '已结课', item.active ? '#e8f7ee' : '#f1f2f4'),
      `<button class="button" type="button" data-hs-action="toggle-binding" data-hs-id="${esc(item.classId)}" data-hs-active="${item.active ? '1' : ''}" style="padding:4px 10px;font-size:12px">${item.active ? '停用' : '启用'}</button>`
    ]));
    const filterBar = hsFilterBar('bindings', bindingFilters, classOpts, teacherOpts, studentOpts) + hsFilterSummary('bindings', bindingFilters, all.length, rows.length);
    return panel('沟通关系绑定', '以教务主数据为准，绑定「班级 × 学员 × 授课教师」三元组。停用或已结课班级不显示「联系教师」入口，不生成孤立会话。可按班级 / 教师 / 学员筛选。',
      filterBar + table(['班级编号', '班级名称', '学员', '授课教师', '状态', '操作'], rows));
  }

  function render() {
    const body = activeTab === 'threads' ? threadsTab()
      : activeTab === 'safety' ? safetyTab()
      : bindingsTab();
    const tabs = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px">${TABS.map(([key, label]) => `<button class="button" type="button" data-hs-tab="${key}" style="padding:6px 14px;font-size:13px;${key === activeTab ? 'background:#1f6feb;color:#fff;border-color:#1f6feb' : ''}">${esc(label)}</button>`).join('')}</div>`;
    root.innerHTML = `<div style="padding:4px 0">
      <div style="margin-bottom:14px"><h1 style="font-size:20px;margin:0 0 6px">家校沟通监管</h1>
        <p style="font-size:13px;color:#6b7280;margin:0">家长留言与教师回复 · 通知触达 · 沟通关系与内容监管</p></div>
      ${flash ? `<div style="padding:10px 12px;margin-bottom:12px;background:#e8f7ee;border-radius:6px;font-size:13px">${esc(flash)}</div>` : ''}
      ${tabs}${body}</div>`;
    flash = '';
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('[data-hs-tab]');
    if (tab) { activeTab = tab.dataset.hsTab; global.__hsThreadDetail = ''; render(); return; }
    const resetBtn = event.target.closest('[data-hs-filter-reset]');
    if (resetBtn) {
      const prefix = resetBtn.dataset.hsFilterReset;
      if (prefix === 'threads') threadFilters = { classId: '', teacher: '', student: '' };
      else if (prefix === 'bindings') bindingFilters = { classId: '', teacher: '', student: '' };
      global.__hsThreadDetail = '';
      render();
      return;
    }
    const button = event.target.closest('[data-hs-action]');
    if (!button) return;
    const action = button.dataset.hsAction;
    const id = button.dataset.hsId;
    if (action === 'view') { global.__hsThreadDetail = id; flash = `已打开会话 ${id} 的只读抽查视图`; render(); return; }
    if (action === 'takedown') {
      const reason = global.prompt('请输入下架原因（将写入审计日志，不含个人信息原文）：', '违规内容');
      if (reason === null) return;
      const result = HS.takeDown(id, reason);
      flash = result.ok ? `会话 ${id} 已下架，两端不可见` : result.reason;
      render();
      return;
    }
    if (action === 'toggle-binding') {
      HS.setBindingActive(id, !button.dataset.hsActive);
      flash = `班级 ${id} 的沟通关系绑定已更新`;
      render();
      return;
    }
    if (action === 'save-rules') {
      const keywords = String(document.querySelector('[data-hs-rule="keywords"]')?.value || '')
        .split(/[,，、\n]/).map(word => word.trim()).filter(Boolean);
      HS.saveRules({
        enabled: Boolean(document.querySelector('[data-hs-rule="enabled"]')?.checked),
        subscriptionAuthorized: Boolean(document.querySelector('[data-hs-rule="subscriptionAuthorized"]')?.checked),
        keywords
      });
      flash = '内容安全与触达配置已保存，并写入审计日志';
      render();
      return;
    }
  });

  // 筛选下拉变更：解析 prefix:key，更新对应页签筛选状态后重渲染；改筛选时清空会话详情。
  document.addEventListener('change', event => {
    const sel = event.target.closest('[data-hs-filter]');
    if (!sel) return;
    const [prefix, key] = String(sel.dataset.hsFilter).split(':');
    const next = prefix === 'threads' ? { ...threadFilters } : { ...bindingFilters };
    next[key] = sel.value;
    if (prefix === 'threads') threadFilters = next;
    else if (prefix === 'bindings') bindingFilters = next;
    global.__hsThreadDetail = '';
    render();
  });

  render();
  __classicExports['render'] = render;
  __classicModules['shared/js/admin-home-school.js'] = __classicExports;
})(globalThis);
