(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
  const HS = __classicRequire('shared/js/home-school-store.js');

  // 后台「家校沟通监管」：方案 v1.1 第十三节 B01~B08。
  // 不新建一级模块、不代发代回、不做举报工单、不接 AI 服务；挂教务执行监管菜单下，用页签承载。
  const root = document.querySelector('#page-content') || document.querySelector('.admin-content');
  if (!root || !HS) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let activeTab = 'threads';
  let flash = '';

  const TABS = [
    ['threads', '会话监管'],
    ['safety', '内容安全与触达配置'],
    ['bindings', '沟通关系绑定'],
    ['deliveries', '通知投递记录'],
    ['audit', '审计与数据看板']
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
    const threads = HS.listThreads({ role: HS.ROLE.ADMIN });
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
          return panel('会话只读抽查', '按 PERM-ACADEMIC-011 受控查看；本期禁止导出、批量与跨班检索，消息正文仅用于内容核查。',
            messages.map(item => `<div style="padding:8px 0;border-bottom:1px solid #f0f1f3"><strong>${esc(item.senderLabel)}</strong> <span style="color:#6b7280;font-size:12px">${esc(item.createdAt)}</span><div style="line-height:1.6;white-space:pre-wrap">${esc(item.text)}</div></div>`).join('') || '<div style="color:#6b7280">暂无消息</div>');
        })()
      : '';
    return statCards() + panel('会话监管', '后台只做配置、监管与审计，不代家长或教师发消息。漏放内容在本页人工复核队列内下架，不设独立举报工单。', table(['会话编号', '班级 / 学员 / 教师', '状态', '最后消息', '只读原因', '操作'], rows)) + detail;
  }

  function safetyTab() {
    const rules = HS.getRules();
    const rows = rules.keywords.map((word, index) => row([String(index + 1), esc(word), badge('启用中', '#e8f7ee')]));
    return panel('内容安全事前审核（不可砍）', '提交留言与教师回复两处服务端前置拦截；命中即不入库并提示修正。撤销产品内举报后，事前拦截是唯一防线。',
      `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
         <label style="font-size:13px"><input type="checkbox" data-hs-rule="enabled" ${rules.enabled ? 'checked' : ''}> 启用规则</label>
         <label style="font-size:13px"><input type="checkbox" data-hs-rule="subscriptionAuthorized" ${rules.subscriptionAuthorized ? 'checked' : ''}> 家长已授权订阅消息</label>
         <span style="font-size:12px;color:#6b7280">未授权时自动降级为站内未读红点，不阻塞沟通闭环</span>
       </div>
       <label style="display:block;font-size:13px;margin-bottom:6px">违规关键词（逗号分隔，示例规则）</label>
       <textarea data-hs-rule="keywords" rows="3" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px">${esc(rules.keywords.join('，'))}</textarea>
       <label style="display:block;font-size:13px;margin:12px 0 6px">通知文案（禁止含学情、评价、AI 正文）</label>
       <input data-hs-rule="notifyTemplate" value="${esc(rules.notifyTemplate)}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px">
       <div style="margin-top:12px"><button class="button" type="button" data-hs-action="save-rules" style="padding:6px 14px">保存配置</button></div>`)
      + panel('当前规则明细', '手机号、证件号等个人信息由正则识别，不依赖关键词表；高风险主题仅提示走既有流程，不拦截日常沟通。', table(['序号', '关键词', '状态'], rows))
      + panel('范围说明', '本期零 AI、无翻译、无举报入口、无 IM。事后救济由既有客服 / 线下通道承接，是否必须产品内提供待法务书面确认（方案 Q5）。',
        `<p style="font-size:13px;line-height:1.8;margin:0">权限点：PERM-ACADEMIC-011（家校沟通监管，受控只读抽查）。<br>审计：所有发送、回复、下架、配置变更均写入审计日志，日志不含个人信息原文。<br>AI 开关与灰度：本期不实现，保持关闭。</p>`);
  }

  function bindingsTab() {
    const rows = HS.listBindings().map(item => row([
      esc(item.classId), esc(item.className), esc(item.studentName), esc(item.teacherName),
      badge(item.active ? '在读' : '已结课', item.active ? '#e8f7ee' : '#f1f2f4'),
      `<button class="button" type="button" data-hs-action="toggle-binding" data-hs-id="${esc(item.classId)}" data-hs-active="${item.active ? '1' : ''}" style="padding:4px 10px;font-size:12px">${item.active ? '停用' : '启用'}</button>`
    ]));
    return panel('沟通关系绑定（B01）', '以教务主数据为准，绑定「班级 × 学员 × 授课教师」三元组。停用或已结课班级不显示「联系教师」入口，不生成孤立会话。',
      table(['班级编号', '班级名称', '学员', '授课教师', '状态', '操作'], rows))
      + panel('权限模型（B02）', '沿用既有权限码体系，新增 PERM-ACADEMIC-011；本期不提供导出与批量操作。',
        `<p style="font-size:13px;line-height:1.8;margin:0">家长：仅本人关联学员会话，可发起与追留言。<br>授课教师：仅本人授课班级，可回复。<br>会话按「班级 × 学员 × 教师」长期保留，家长与教师均不提供结束入口；只读终态仅由课程结束或教务下架产生。<br>后台教务：受控只读抽查 + 内容复核下架，禁止代发代回。</p>`);
  }

  function deliveriesTab() {
    const rows = HS.listDeliveries().map(item => row([
      esc(item.id), esc(item.threadId), esc(item.title), esc(item.channel),
      badge(item.status, item.status === '已送达' ? '#e8f7ee' : '#fff4e5'), esc(item.createdAt)
    ]));
    return panel('通知投递记录（B05）', '教师发送后触发通知。原型以本地投递记录模拟订阅消息通道，生产接 notification-store.js 的发送 / 投递状态 / 失败重试能力。',
      table(['投递编号', '会话编号', '通知标题', '通道', '状态', '时间'], rows));
  }

  function auditTab() {
    const rows = HS.listAudit().map(item => row([
      esc(item.createdAt), esc(item.actor), esc(item.action), esc(item.target),
      badge(item.result, item.result === '通过' ? '#e8f7ee' : '#fff4e5'), esc(item.detail)
    ]));
    return statCards()
      + panel('最小数据看板（B08）', '指标口径：首次响应时长 = 家长留言创建到教师首条回复的自然时长；违规拦截率 = 拦截次数 / 内容安全扫描次数；数据禁止上报姓名、手机号与留言原文。',
        `<p style="font-size:13px;color:#6b7280;margin:0">至少一个核心指标看板随版本上线；AI 类指标（草稿采用率等）本期不接入。</p>`)
      + panel('审计日志（B06 / B07）', '日志已脱敏：不记录个人信息原文、不含 AI 正文（本期零 AI，故不记模型与提示版本）。',
        table(['时间', '操作人', '动作', '对象', '结果', '备注'], rows))
      + `<div style="margin-top:8px"><button class="button" type="button" data-hs-action="reset" style="padding:6px 14px">恢复演示数据</button></div>`;
  }

  function render() {
    const body = activeTab === 'threads' ? threadsTab()
      : activeTab === 'safety' ? safetyTab()
      : activeTab === 'bindings' ? bindingsTab()
      : activeTab === 'deliveries' ? deliveriesTab()
      : auditTab();
    const tabs = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px">${TABS.map(([key, label]) => `<button class="button" type="button" data-hs-tab="${key}" style="padding:6px 14px;font-size:13px;${key === activeTab ? 'background:#1f6feb;color:#fff;border-color:#1f6feb' : ''}">${esc(label)}</button>`).join('')}</div>`;
    root.innerHTML = `<div style="padding:4px 0">
      <div style="margin-bottom:14px"><h1 style="font-size:20px;margin:0 0 6px">家校沟通监管</h1>
        <p style="font-size:13px;color:#6b7280;margin:0">纯人工异步留言 + 通知闭环 · 零 AI / 无举报 / 无翻译 / 无 IM · 本期不新建一级模块</p></div>
      ${flash ? `<div style="padding:10px 12px;margin-bottom:12px;background:#e8f7ee;border-radius:6px;font-size:13px">${esc(flash)}</div>` : ''}
      ${tabs}${body}</div>`;
    flash = '';
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('[data-hs-tab]');
    if (tab) { activeTab = tab.dataset.hsTab; global.__hsThreadDetail = ''; render(); return; }
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
        notifyTemplate: String(document.querySelector('[data-hs-rule="notifyTemplate"]')?.value || '').slice(0, 80),
        keywords
      });
      flash = '内容安全与触达配置已保存，并写入审计日志';
      render();
      return;
    }
    if (action === 'reset') { HS.resetDemo(); flash = '演示数据已恢复'; render(); }
  });

  render();
  __classicExports['render'] = render;
  __classicModules['shared/js/admin-home-school.js'] = __classicExports;
})(globalThis);
