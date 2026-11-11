(function (global) {
  const root = document.querySelector('[data-service-page]');
  if (!root) return;
  const S = global.HbyxService;
  if (!S) { root.innerHTML = '<div class="ops-page"><p>客服数据模块未就绪</p></div>'; return; }
  const xlsx = (global.__hbyxClassicModules || {})['shared/js/xlsx-lite.js'] || {};
  const readXlsx = xlsx.readXlsxSheetRows;
  const writeXlsx = xlsx.writeXlsxSheetRows;
  let toastTimer;
  let tab = 'kb';
  const filters = { keyword: '', category: '', status: '' };
  const esc = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const showToast = (message, kind = 'success') => {
    const el = document.querySelector('[data-ops-toast]');
    if (!el) return;
    el.textContent = message; el.dataset.kind = kind; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  };
  const closeDialog = () => document.querySelector('[data-ops-dialog]')?.remove();
  function openDialog(title, subtitle, body, actions = '<button type="button" class="button" data-dialog-close>关闭</button>', wide = false) {
    closeDialog();
    const dialog = document.createElement('dialog');
    dialog.className = 'ops-dialog';
    dialog.dataset.opsDialog = 'true';
    if (wide) dialog.style.width = 'min(1100px, calc(100vw - 32px))';
    dialog.innerHTML = '<div class="ops-dialog-card"><div class="ops-dialog-header"><div><h2>' + esc(title) + '</h2><p>' + esc(subtitle) + '</p></div><button type="button" class="icon-button" data-dialog-close title="关闭" aria-label="关闭">×</button></div>' + body + '<div class="ops-dialog-actions">' + actions + '</div></div>';
    document.body.append(dialog);
    dialog.showModal();
    return dialog;
  }
  const table = (headers, rows, emptyText) => '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f6f4f2">' +
    headers.map(h => '<th style="padding:9px 10px;text-align:left;font-weight:600;border-bottom:1px solid #e9e4df">' + esc(h) + '</th>').join('') +
    '</tr></thead><tbody>' + (rows.length ? rows.map(r => '<tr>' + r.map((c, i) => '<td style="padding:9px 10px;border-bottom:1px solid #f0ede9' + (i === 0 ? ';font-weight:500' : '') + '">' + c + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + headers.length + '" style="padding:20px;text-align:center;color:#8b817a">' + esc(emptyText || '暂无数据') + '</td></tr>') + '</tbody></table></div>';
  const tag = (value) => '<span class="tag">' + esc(value) + '</span>';
  const card = (title, body) => '<section class="card" style="margin:0 0 14px;padding:16px"><h2 style="margin:0 0 12px;font-size:15px">' + esc(title) + '</h2>' + body + '</section>';

  // CR-2026-177：去掉「导入批次」页签，导入结果由 toast 反馈，不再单独维护批次列表。
  const tabs = [
    ['kb', '常见问题库'], ['followups', '学员待跟进']
  ];
  const tabBar = () => '<div class="ops-tabs" style="display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap">' + tabs.map(([key, label]) =>
    '<button type="button" class="button' + (tab === key ? ' primary' : '') + '" data-service-tab="' + key + '">' + esc(label) + '</button>').join('') + '</div>';

  function filteredKb() {
    const kw = S.normalizeQuestion(filters.keyword);
    return S.kbList(S.readServiceState()).filter(item => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (!kw) return true;
      const hay = S.normalizeQuestion([item.question, (item.synonyms || []).join(','), item.answer].join(' '));
      return hay.includes(kw);
    });
  }

  function renderKb() {
    const rows = filteredKb();
    const controls = '<label class="form-field"><span>关键词</span><input type="text" data-service-filter="keyword" value="' + esc(filters.keyword) + '" placeholder="标准问题 / 同义问法" /></label>' +
      '<label class="form-field"><span>分类</span><select data-service-filter="category"><option value="">全部分类</option>' + S.SERVICE_CATEGORIES.map(c => '<option value="' + esc(c) + '"' + (filters.category === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
      '<label class="form-field"><span>状态</span><select data-service-filter="status"><option value="">全部状态</option>' + S.SERVICE_STATUSES.map(c => '<option value="' + esc(c) + '"' + (filters.status === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
      '<button type="button" class="button" data-service-action="kb-add">新增条目</button>' +
      '<button type="button" class="button" data-service-action="import-open">批量导入</button>' +
      '<button type="button" class="button" data-service-action="template">下载模板</button>' +
      '<button type="button" class="button" data-service-action="export">导出</button>';
    const body = table(['标准问题', '同义问法', '答案（摘要）', '分类', '状态', '操作'], rows.map(item => [
      esc(item.question),
      esc((item.synonyms || []).join('、') || '—'),
      esc(String(item.answer).slice(0, 40) + (String(item.answer).length > 40 ? '…' : '')),
      esc(item.category),
      tag(item.status),
      '<button type="button" class="button" data-service-action="kb-edit" data-id="' + esc(item.id) + '">编辑</button> ' +
      '<button type="button" class="button" data-service-action="kb-toggle" data-id="' + esc(item.id) + '">' + (item.status === '上架' ? '下架' : '上架') + '</button> ' +
      '<button type="button" class="button" data-service-action="kb-remove" data-id="' + esc(item.id) + '">删除</button>'
    ]), '没有符合条件的条目。');
    return card('筛选与操作', '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">' + controls + '</div>') +
      card('常见问题库（' + rows.length + ' 条，示例数据均为虚构）', body);
  }

  function renderFollowups() {
    const state = S.readServiceState();
    const leaves = S.serviceLeaves();
    const map = new Map();
    state.misses.forEach(m => {
      const key = m.groupKey || S.normalizeQuestion(m.displayQuestion);
      const node = map.get(key) || { miss: null, leaves: [] };
      node.miss = m;
      map.set(key, node);
    });
    leaves.forEach(l => {
      const key = S.normalizeQuestion(l.text || '');
      const node = map.get(key) || { miss: null, leaves: [] };
      node.leaves.push(l);
      map.set(key, node);
    });
    const rows = [...map.values()].map(node => {
      const miss = node.miss;
      const ls = node.leaves;
      const pending = ls.filter(x => x.status !== '已回复').length;
      const replied = ls.length - pending;
      const question = miss ? miss.displayQuestion : (ls[0] && ls[0].text ? ls[0].text : '—');
      const missCell = miss ? (String(miss.count) + ' 次') : '—';
      const leaveCell = ls.length ? (pending + ' 待回 / ' + replied + ' 已回') : '—';
      const timeCell = miss ? (esc(miss.firstAt) + ' / ' + esc(miss.lastAt)) : '仅留言';
      let statusText = '';
      if (miss && ls.length) statusText = miss.status + ' · ' + pending + ' 待回';
      else if (miss) statusText = miss.status;
      else statusText = pending ? (pending + ' 待回') : '已回';
      let ops = '';
      if (miss && miss.status === '待处理') {
        ops += '<button type="button" class="button" data-service-action="miss-convert" data-id="' + esc(miss.id) + '">转为知识条目</button> ' +
          '<button type="button" class="button" data-service-action="miss-ignore" data-id="' + esc(miss.id) + '">忽略</button> ';
      } else if (miss) {
        ops += '<span style="color:#8b817a">已处置</span> ';
      }
      if (pending > 0) {
        const firstPending = ls.find(x => x.status !== '已回复');
        if (firstPending) ops += '<button type="button" class="button" data-service-action="leave-reply" data-id="' + esc(firstPending.id) + '">回复</button> ';
      }
      let detail = '';
      if (ls.length) {
        const items = ls.map(l =>
          '<div style="padding:8px 0;border-bottom:1px solid #f0ede9">' +
          '<div style="font-size:12px;color:#8b817a">提交 ' + esc(l.submittedAt || '—') + ' · 手机 ' + esc(l.phone || '（见账号资料）') + ' · ' + esc(l.status || '待回复') + '</div>' +
          '<div style="margin:4px 0">' + esc(l.text || '—') + '</div>' +
          '<div style="font-size:12px">回复：' + esc(l.reply || '—') + '</div>' +
          (l.status !== '已回复' ? '<button type="button" class="button" data-service-action="leave-reply" data-id="' + esc(l.id) + '">回复</button>' : '') +
          '</div>'
        ).join('');
        detail = '<details style="margin-top:6px"><summary style="cursor:pointer;color:#6b5b95;font-size:12px">查看 ' + ls.length + ' 条留言明细</summary>' + items + '</details>';
      }
      return [
        esc(question) + (detail ? '<br/>' + detail : ''),
        missCell,
        leaveCell,
        timeCell,
        tag(statusText),
        ops || '—'
      ];
    });
    return card('学员待跟进（按问题聚合；未命中问题与转人工留言关联展示；语义相似归并本期不做）',
      table(['问题', '未命中', '转人工', '首次 / 最近', '状态', '操作'], rows, '暂无学员待跟进。学员在在线客服提问未命中、或提交留言后在此显示。'));
  }

  function render() {
    const content = tab === 'followups' ? renderFollowups() : renderKb();
    root.innerHTML = '<div class="ops-page"><div class="page-head"><div><h1>常见问题库</h1><p>维护在线客服的常见问题、导入导出、未命中问题与人工回复。</p></div></div>' +
      tabBar() + content + '<div class="toast" data-ops-toast role="status" aria-live="polite" hidden></div></div>';
  }

  const kbForm = (item) => '<form id="service-kb-form" class="ops-dialog-grid"><input type="hidden" name="id" value="' + esc(item?.id || '') + '" />' +
    '<label class="form-field wide"><span>标准问题 *</span><input name="question" required maxlength="100" value="' + esc(item?.question || '') + '" /></label>' +
    '<label class="form-field wide"><span>同义问法（多个用逗号分隔）</span><input name="synonyms" value="' + esc((item?.synonyms || []).join(',')) + '" /></label>' +
    '<label class="form-field wide"><span>答案（纯文本，≤500 字）*</span><textarea name="answer" required maxlength="500" rows="5">' + esc(item?.answer || '') + '</textarea></label>' +
    '<label class="form-field"><span>分类 *</span><select name="category">' + S.SERVICE_CATEGORIES.map(c => '<option value="' + esc(c) + '"' + (item?.category === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
    '<label class="form-field"><span>状态 *</span><select name="status">' + S.SERVICE_STATUSES.map(c => '<option value="' + esc(c) + '"' + (item?.status === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
    '</form>';

  function openKbDialog(item) {
    const dlg = openDialog(item ? '编辑条目' : '新增条目', '答案将原样返回给学员，请勿填写富文本或外链。', kbForm(item),
      '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" class="button primary" form="service-kb-form">保存</button>');
    dlg.querySelector('#service-kb-form').addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const result = S.saveKbItem(data);
      if (!result.ok) { showToast(result.message, 'error'); return; }
      closeDialog(); render(); showToast('已保存条目');
    });
  }

  const DEMO_ROWS = [
    ['标准问题', '同义问法', '答案', '分类', '状态'],
    ['怎么查看成绩', '成绩查询,分数在哪看', '进入「学习」→ 学习报告查看；如未发布请等待教务通知。', '考务考级', '上架'],
    ['可以试听吗', '试听申请', '部分班级开放试听，请在班级详情查看试听标记或联系教务。', '课程学习', '上架'],
    ['发票怎么开', '开发票', '缴费后可在「我的订单」申请开票，具体以财务通知为准。', '报名缴费', '上架'],
    ['', '', '', '', '']
  ];

  function openImportDialog() {
    const body = '<form id="service-import-form" class="ops-dialog-grid"><label class="form-field wide"><span>导入 Excel 文件（仅 .xlsx）</span><input name="file" type="file" accept=".xlsx" /></label></form>' +
      '<p style="margin:10px 0 0;color:#8b817a">请使用下载的固定模板填写，也可点「载入演示导入数据」体验行级校验（含 1 行非法数据）。</p>';
    openDialog('批量导入常见问题', '失败行标红跳过，有效行照常入库；标准问题相同则覆盖。', body,
      '<button type="button" class="button" data-service-action="import-demo">载入演示导入数据</button>' +
      '<button type="button" class="button" data-dialog-close>取消</button>' +
      '<button type="submit" class="button primary" form="service-import-form">开始导入</button>');
    const form = document.querySelector('#service-import-form');
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const file = form.querySelector('[name=file]').files?.[0];
      if (!file) { showToast('请选择 .xlsx 文件', 'warning'); return; }
      if (!/\.xlsx$/i.test(file.name)) { showToast('仅支持 .xlsx 文件', 'error'); return; }
      let rows;
      try { rows = await readXlsx(await file.arrayBuffer()); } catch { rows = null; }
      if (!rows) { showToast('文件无法解析', 'error'); return; }
      openImportPreview(S.validateImportRows(rows), file.name);
    });
  }

  function openImportPreview(checked, filename) {
    const body = '<div style="max-height:52vh;overflow:auto">' + table(['行号', '标准问题', '答案', '分类', '状态', '校验结果'], checked.map(row => [
      String(row.line), esc(row.cells[0]), esc(String(row.cells[2]).slice(0, 30)), esc(row.cells[3]), esc(row.cells[4]),
      row.blocked ? '<span style="color:#b3261e">' + esc(row.reasons.join('；')) + '</span>' : '<span style="color:#2e7d32">通过</span>'
    ]), '没有可导入的数据行。') + '</div>';
    const blocked = checked.filter(r => r.blocked).length;
    const dlg = openDialog('导入预览', '文件：' + filename + '｜有效 ' + (checked.length - blocked) + ' 行，阻断 ' + blocked + ' 行（阻断行跳过，不影响有效行）。', body,
      '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-service-action="import-confirm">确认导入</button>', true);
    dlg.querySelector('[data-service-action=import-confirm]').addEventListener('click', () => {
      const result = S.applyImportRows(checked, filename);
      global.__serviceImportResult = result;
      // CR-2026-177：导入完成后回到常见问题库查看结果，成功/阻断/覆盖条数由 toast 反馈。
      closeDialog(); tab = 'kb'; render();
      showToast('成功导入 ' + result.success + ' 行，阻断 ' + result.failed + ' 行，覆盖 ' + result.overwritten + ' 行');
    });
  }

  function openMissConvert(id) {
    const group = S.readServiceState().misses.find(g => g.id === id);
    if (!group) return;
    const body = '<form id="service-convert-form" class="ops-dialog-grid">' +
      '<label class="form-field wide"><span>标准问题 *</span><input name="question" required maxlength="100" value="' + esc(group.displayQuestion) + '" /></label>' +
      '<label class="form-field wide"><span>同义问法</span><input name="synonyms" /></label>' +
      '<label class="form-field wide"><span>答案（≤500 字）*</span><textarea name="answer" required maxlength="500" rows="5"></textarea></label>' +
      '<label class="form-field"><span>分类 *</span><select name="category">' + S.SERVICE_CATEGORIES.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('') + '</select></label></form>';
    const dlg = openDialog('转为知识条目', '问题原话已预填，补充答案后上架，归并组状态变为「已转化」。', body,
      '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" class="button primary" form="service-convert-form">保存并上架</button>');
    dlg.querySelector('#service-convert-form').addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const result = S.missAction(id, 'convert', data);
      if (!result.ok) { showToast(result.message, 'error'); return; }
      closeDialog(); render(); showToast('已转为知识条目');
    });
  }

  function openLeaveReply(id) {
    const row = S.serviceLeaves().find(x => x.id === id);
    if (!row) return;
    const body = '<div style="padding:0 0 12px"><strong>问题：</strong>' + esc(row.text || '—') + '</div>' +
      '<form id="service-reply-form" class="ops-dialog-grid"><label class="form-field wide"><span>回复内容（≤500 字）*</span><textarea name="reply" required maxlength="500" rows="5"></textarea></label></form>';
    const dlg = openDialog('回复客服留言', '回复后学员端「我的咨询／咨询详情」可见；本模块不做实时会话。', body,
      '<button type="button" class="button" data-dialog-close>取消</button><button type="submit" class="button primary" form="service-reply-form">提交回复</button>');
    dlg.querySelector('#service-reply-form').addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const result = S.replyServiceLeave(id, data.reply);
      if (!result.ok) { showToast(result.message, 'error'); return; }
      closeDialog(); render(); showToast('回复已提交');
    });
  }

  function downloadTemplate() {
    if (!writeXlsx) { showToast('导出模块未就绪', 'error'); return; }
    const rows = [S.SERVICE_HEADERS, ['示例问题', '同义问法一,同义问法二', '示例答案（导入前请删除本行）', '其他', '上架']];
    const blob = writeXlsx(rows);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = '客服知识库导入模板.xlsx'; link.click();
    URL.revokeObjectURL(link.href);
    showToast('模板已下载：5 列');
  }
  function exportKb() {
    if (!writeXlsx) { showToast('导出模块未就绪', 'error'); return; }
    const rows = filteredKb().map(item => [item.question, (item.synonyms || []).join(','), item.answer, item.category, item.status]);
    const blob = writeXlsx([S.SERVICE_HEADERS, ...rows]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = '客服知识库-' + S.nowText().slice(0, 10) + '.xlsx'; link.click();
    URL.revokeObjectURL(link.href);
    showToast('已导出 ' + rows.length + ' 条（仅知识库 5 字段）');
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-dialog-close]')) {
      const dialog = event.target.closest('[data-ops-dialog]');
      if (dialog) dialog.close();
      return;
    }
    const tabBtn = event.target.closest('[data-service-tab]');
    if (tabBtn) { tab = tabBtn.dataset.serviceTab; render(); return; }
    const btn = event.target.closest('[data-service-action]');
    if (!btn) return;
    const action = btn.dataset.serviceAction;
    const id = btn.dataset.id;
    if (action === 'kb-add') return openKbDialog(null);
    if (action === 'kb-edit') return openKbDialog(S.readServiceState().kb.find(x => x.id === id));
    if (action === 'kb-toggle') { S.toggleKbStatus(id); render(); showToast('状态已更新'); return; }
    if (action === 'kb-remove') {
      const dlg = openDialog('删除条目', '删除后不可恢复，确认继续？', '<p>该条目将从常见问题库移除。</p>',
        '<button type="button" class="button" data-dialog-close>取消</button><button type="button" class="button primary" data-service-action="kb-remove-confirm">确认删除</button>');
      dlg.querySelector('[data-service-action=kb-remove-confirm]').addEventListener('click', () => { S.removeKbItem(id); closeDialog(); render(); showToast('已删除'); });
      return;
    }
    if (action === 'import-open') return openImportDialog();
    if (action === 'import-demo') return openImportPreview(S.validateImportRows(DEMO_ROWS), '演示导入数据.xlsx');
    if (action === 'template') return downloadTemplate();
    if (action === 'export') return exportKb();
    if (action === 'miss-convert') return openMissConvert(id);
    if (action === 'miss-ignore') { S.missAction(id, 'ignore'); render(); showToast('已忽略'); return; }
    if (action === 'leave-reply') return openLeaveReply(id);
  });

  const onFilter = (event) => {
    const key = event.target.dataset?.serviceFilter;
    if (!key) return;
    filters[key] = event.target.value;
    if (event.type === 'change') render();
  };
  document.addEventListener('change', onFilter);
  document.addEventListener('input', (event) => {
    const key = event.target.dataset?.serviceFilter;
    if (!key || key !== 'keyword') return;
    filters.keyword = event.target.value;
    const caret = event.target.selectionStart;
    render();
    const next = document.querySelector('[data-service-filter=keyword]');
    if (next) { next.focus(); try { next.setSelectionRange(caret, caret); } catch (_) { /* 忽略 */ } }
  });

  render();
})(globalThis);
