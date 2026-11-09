(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id] || Object.create(null);
  // 阶段学习报告（事实汇编）——纯派生，不落库、不改 seed、不新增业务字段。
  //
  // 数据来源：class-seed（真实排课课次）/ lesson-records（课次考勤·作业单一口径，CR-2026-136）
  // / homework-store（作业提交与教师逐次点评）/ graduation-seed（结业终评）
  // / 学员档案班级登记字段（未关联排课时的演示降级）。
  //
  // 锁定口径：D-01 按计划总课次 L 固定三段、按 session.index 归段；
  // D-02 / D-05 不出现任何分数、等级、星级、红黄绿灯，也不得引用废弃 score 字段；
  // D-03 结业评语「审核中」对学员／家长不可见（后台可见原文用于复核）；
  // D-04 派生结果固定标注「演示派生，非教师评价」。
  // 禁用：learner.assessments seed、studentHomeworkHistory().note 占位文案、
  // classes[].attendance.rate 静态汇总与本模块派生率混算。
  const { classSeed } = __classicRequire("shared/js/class-seed.js");
  const { graduationSeed } = __classicRequire("shared/js/graduation-seed.js");
  const { DEMO_TODAY } = __classicRequire("shared/js/demo-clock.js");
  const { lessonAttendanceStatus, lessonHomeworkSubmitted } = __classicRequire("shared/js/lesson-records.js");
  const { homeworkForLesson, listSubmissions } = __classicRequire("shared/js/homework-store.js");
  const { isSessionPast, sessionsInScheduleOrder } = __classicRequire("shared/js/class-lifecycle.js");

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const MIN_SESSIONS = 6; // L < 6 样本不足，不分段
  const STAGE_LABELS = ['起步段', '进阶段', '结业段'];

  // ---- 1) 分段：只依赖计划总课次 L，与已上课次 N 无关（防边界漂移，§5.1） ----
  function stageBounds(L) {
    const total = Number(L) || 0;
    if (total < MIN_SESSIONS) return { insufficient: true, L: total, q: 0, r: 0, bounds: [], lengths: [], segments: [] };
    const q = Math.floor(total / 3);
    const r = total % 3;
    return {
      insufficient: false, L: total, q, r,
      bounds: [q, 2 * q, total],
      lengths: [q, q, q + r], // 余数全给结业段（含最后课次与终评）
      segments: [
        { key: 'start', label: STAGE_LABELS[0], from: 1, to: q },
        { key: 'advance', label: STAGE_LABELS[1], from: q + 1, to: 2 * q },
        { key: 'final', label: STAGE_LABELS[2], from: 2 * q + 1, to: total }
      ]
    };
  }
  function stageOfIndex(index, L) {
    const rule = stageBounds(L);
    if (rule.insufficient) return null;
    const hit = rule.segments.find((seg) => Number(index) >= seg.from && Number(index) <= seg.to);
    // 越界的调整课次归入结业段并留痕（§5.1 边界规则）
    return hit ? hit.key : 'final';
  }

  // ---- 2) 数据源解析：优先真实排课班级，未命中时降级为档案登记课次的演示派生 ----
  // 当前原型中档案班级名与排课班级名分属两套 ID（打通方案 P-01/P-04），entity-links.js 尚未落码，
  // 因此不做模糊/按姓名反查（会命中 20+ 演示班级，无法唯一确定），也不伪造映射。
  // 未来映射层落地后，id / name 精确命中即自动切换为真实课次，无需改动本模块。
  function demoSessionsOf(learnerClass) {
    const total = Number(learnerClass?.attendance?.total || 0);
    const base = learnerClass?.startDate ? new Date(`${learnerClass.startDate}T00:00:00+08:00`) : null;
    return Array.from({ length: total }, (_, i) => {
      const date = new Date(base ? base.getTime() : Date.parse(`${DEMO_TODAY}T00:00:00+08:00`));
      date.setDate(date.getDate() + i * 7);
      const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { index: i + 1, date: local, startTime: '09:00', endTime: '10:30', lessonDuration: 90, status: '待上课' };
    });
  }
  function resolveClassSource(learnerClass) {
    const seed = classSeed || [];
    const linked = seed.find((item) => item && item.id === learnerClass?.id)
      || seed.find((item) => item && item.name === learnerClass?.name)
      || null;
    if (linked && (linked.sessions || []).length) {
      return {
        mode: 'linked', linked: true, classItem: linked,
        sessions: (linked.sessions || []).slice(),
        sourceLabel: `排课班级「${linked.name}」`
      };
    }
    const sessions = demoSessionsOf(learnerClass);
    return {
      mode: 'demo', linked: false,
      classItem: { id: learnerClass?.id || 'archive-class', name: learnerClass?.name || '', students: 20, enrolled: 20, demoHomework: '', sessions },
      sessions,
      sourceLabel: '档案登记课次（演示派生，未关联排课记录）'
    };
  }

  // ---- 3) 逐课次事实：只统计已上课次，按 session.index 归段（不按数组下标） ----
  function lessonFacts(source, learner, session) {
    const student = { id: learner?.id, name: learner?.name };
    const classItem = source.classItem;
    const index = Number(session.index);
    const attendance = typeof lessonAttendanceStatus === 'function'
      ? lessonAttendanceStatus(classItem, index, student) : '未登记';
    const homeworkSubmitted = typeof lessonHomeworkSubmitted === 'function'
      ? Boolean(lessonHomeworkSubmitted(classItem, index, student)) : null;
    // 教师逐次点评原文只取 submission.review.comment；禁止 studentHomeworkHistory().note 占位文案。
    const reviews = [];
    const pendingReview = [];
    if (typeof homeworkForLesson === 'function' && typeof listSubmissions === 'function') {
      const items = homeworkForLesson(classItem.id, index) || [];
      items.forEach((homework) => {
        const rows = listSubmissions(homework.id) || [];
        const row = rows.find((entry) => entry && (entry.studentId === student.id || entry.studentName === student.name));
        if (!row) return;
        const review = row.review || {};
        if (review.status === '已点评' && review.comment) {
          reviews.push({ comment: review.comment, at: review.reviewedAt || '', by: review.reviewerName || '', title: homework.title || `第${index}次课作业` });
        } else if (['已提交', '已点评'].includes(row.status)) {
          pendingReview.push(homework.title || `第${index}次课作业`);
        }
      });
    }
    return { index, date: session.date || '', attendance, homeworkSubmitted, reviews, pendingReview };
  }
  function emptyFacts() {
    return { present: 0, late: 0, leave: 0, absent: 0, hwSubmitted: 0, hwMissing: 0, reviews: [], pendingReview: [], absentLessons: [], missingLessons: [], counted: 0 };
  }
  function accumulate(target, fact) {
    const map = { '已到': 'present', '迟到': 'late', '请假': 'leave', '缺勤': 'absent' };
    const key = map[fact.attendance];
    if (key) target[key] += 1;
    if (fact.homeworkSubmitted === true) target.hwSubmitted += 1;
    if (fact.homeworkSubmitted === false) {
      target.hwMissing += 1;
      target.missingLessons.push(fact.index);
    }
    if (fact.attendance === '缺勤') target.absentLessons.push(fact.index);
    fact.reviews.forEach((review) => target.reviews.push({ ...review, lessonIndex: fact.index, date: fact.date }));
    fact.pendingReview.forEach((title) => target.pendingReview.push({ title, lessonIndex: fact.index }));
    target.counted += 1;
  }

  function buildStageReport(learnerClass, learner, options = {}) {
    const source = resolveClassSource(learnerClass);
    const sessions = (source.sessions || []).slice();
    const L = sessions.length;
    const rule = stageBounds(L);
    // 展示按 date + startTime 排序，但阶段归属只按 session.index（CR138-05 乱序不错位）
    const ordered = typeof sessionsInScheduleOrder === 'function' ? sessionsInScheduleOrder(sessions) : sessions;
    const byIndex = new Map(sessions.map((session) => [Number(session.index), session]));
    const past = (typeof isSessionPast === 'function' ? sessions.filter((s) => isSessionPast(s)) : [])
      .slice().sort((a, b) => Number(a.index) - Number(b.index));
    const pastIndexes = new Set(past.map((session) => Number(session.index)));
    const segments = rule.segments.map((seg) => {
      const list = [];
      for (let index = seg.from; index <= seg.to; index += 1) if (byIndex.has(index)) list.push(byIndex.get(index));
      const counted = list.filter((session) => pastIndexes.has(Number(session.index)));
      const length = seg.to - seg.from + 1;
      const state = counted.length === 0 ? '未开始' : counted.length === length ? '已完成' : `进行中 ${counted.length}/${length}`;
      const dates = (typeof sessionsInScheduleOrder === 'function' ? sessionsInScheduleOrder(list) : list).map((s) => s.date).filter(Boolean);
      return {
        ...seg, length, counted: counted.length, state,
        dateSpan: dates.length ? (dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} ~ ${dates[dates.length - 1]}`) : '—',
        facts: emptyFacts()
      };
    });
    // 补充：越界 index 归入结业段
    const finalSeg = segments[segments.length - 1] || null;
    past.forEach((session) => {
      const index = Number(session.index);
      const segKey = stageOfIndex(index, L);
      const seg = segKey ? segments.find((item) => item.key === segKey) : null;
      const fact = lessonFacts(source, learner, session);
      if (seg) accumulate(seg.facts, fact);
      else if (finalSeg) accumulate(finalSeg.facts, fact);
    });
    return {
      learnerName: learner?.name || '',
      className: learnerClass?.name || '',
      classId: learnerClass?.id || '',
      source, L, rule, ordered, past, segments,
      learnerClass,
      linked: source.linked,
      viewerRole: options.viewerRole || 'super_admin',
      demoDate: DEMO_TODAY
    };
  }

  // ---- 4) 结业终评可见性（D-03）：审核中对学员／家长不可见，后台可见原文用于复核 ----
  const RESTRICTED_ROLES = ['learner', 'student', 'parent', '学员', '家长', '学员端'];
  function finalCommentView(learner, learnerClass, viewerRole) {
    const restricted = RESTRICTED_ROLES.includes(String(viewerRole || '').toLowerCase()) || RESTRICTED_ROLES.includes(String(viewerRole || ''));
    const entries = (graduationSeed || []).flatMap((batch) => (batch.learners || [])
      .filter((item) => item && item.name === learner?.name)
      .map((item) => ({ ...item, className: batch.className, course: batch.course, teacher: batch.teacher })));
    if (!entries.length) return { state: 'none', restricted, html: '<div class="empty compact">暂无结业评语登记。</div>' };
    const preferred = entries.find((item) => item.status === '已通过') || entries[0];
    const status = preferred.status || '审核中'; // 状态缺失时从严按审核中处理
    if (restricted && status !== '已通过') {
      return { state: 'hidden', restricted, html: '<p class="ops-form-help">结业评语审核中，通过后可见。</p>' };
    }
    const parts = [
      `<p class="stage-final-comment">${escapeHtml(preferred.comment || '')}</p>`,
      preferred.suggestion ? `<p class="ops-form-help">成长建议：${escapeHtml(preferred.suggestion)}</p>` : '',
      `<p class="ops-form-help">来源：${escapeHtml(preferred.className)} · ${escapeHtml(preferred.teacher || '')} · 状态：${escapeHtml(status)}${status !== '已通过' ? '（后台可见，用于复核）' : ''}</p>`
    ];
    return { state: status === '已通过' ? 'visible' : 'review', restricted, html: parts.filter(Boolean).join('') };
  }

  // ---- 5) 渲染：三段表 + 五板块事实 + 终评；全程计数优先、无分数等级、无跨口径比较 ----
  function renderStageReport(learnerClass, learner, options = {}) {
    const report = buildStageReport(learnerClass, learner, options);
    const banner = [
      '<div class="stage-report-note"><strong>阶段学习报告（事实汇编）</strong>',
      '<span>按课次区间汇编学习事实，非评价结论；<b>演示派生，非教师评价</b>。</span>',
      `<span>数据来源：${escapeHtml(report.source.sourceLabel)}；计划课次 ${report.L} 次，已上 ${report.past.length} 次（基准日 ${escapeHtml(report.demoDate)}）。</span>`,
      '<span class="stage-report-diff">本区为课次区间派生明细，与上方班级汇总口径不同，不可直接相减或比较。</span>',
      '</div>'
    ].join('');
    if (report.rule.insufficient) {
      return `<section class="card stage-report">${banner}<div class="empty">该班级计划课次 ${report.L} 次，少于 ${MIN_SESSIONS} 次，样本不足，暂不划分阶段。</div></section>`;
    }
    if (!report.past.length) {
      return `<section class="card stage-report">${banner}<div class="empty">该班级尚无已上课次，阶段报告暂不生成指标；课次开始后自动按区间汇编。</div></section>`;
    }
    const rows = report.segments.map((seg) => {
      const f = seg.facts;
      const dash = (value) => seg.counted ? escapeHtml(value) : '—';
      return `<tr><td><strong>${escapeHtml(seg.label)}</strong></td><td>第 ${seg.from}~${seg.to} 次</td><td>${escapeHtml(seg.dateSpan)}</td><td>${escapeHtml(seg.state)}</td><td>${seg.counted}/${seg.length}</td><td>${dash(f.present)}</td><td>${dash(f.late)}</td><td>${dash(f.leave)}</td><td>${dash(f.absent)}</td><td>${dash(f.hwSubmitted)}</td><td>${dash(f.hwMissing)}</td><td>${dash(f.reviews.length)}</td></tr>`;
    }).join('');
    const stageTable = `<div class="table-wrap student-subtable-wrap"><table class="student-subtable stage-table"><thead><tr><th>阶段</th><th>课次区间</th><th>日期跨度</th><th>段状态</th><th>已上/计划</th><th>已到</th><th>迟到</th><th>请假</th><th>缺勤</th><th>作业已交</th><th>作业未交</th><th>教师点评</th></tr></thead><tbody>${rows}</tbody></table></div>`;

    // A 本段事实在上表；B 原文证据
    const allReviews = report.segments.flatMap((seg) => seg.facts.reviews.map((r) => ({ ...r, stage: seg.label })));
    const archiveComments = (learnerClass.reviews || []).map((r) => r.comment).filter(Boolean);
    const evidence = [
      allReviews.length
        ? `<ul class="stage-evidence">${allReviews.map((r) => `<li><span class="profile-timeline-time">${escapeHtml(r.stage)} · 第 ${r.lessonIndex} 次课 · ${escapeHtml(r.date)}${r.by ? ` · ${escapeHtml(r.by)}` : ''}</span>${escapeHtml(r.comment)}</li>`).join('')}</ul>`
        : '<div class="empty compact">暂无教师逐次点评登记（不生成占位文案）。</div>',
      archiveComments.length
        ? `<p class="ops-form-help">档案登记评语（非逐次点评）：${archiveComments.map(escapeHtml).join('；')}</p>`
        : ''
    ].filter(Boolean).join('');

    // C 段间对照：只列绝对次数变化，不写提升/下降/趋势
    const compare = `<table class="student-subtable stage-compare"><thead><tr><th>阶段</th><th>已到</th><th>迟到</th><th>请假</th><th>缺勤</th><th>作业已交</th><th>作业未交</th><th>点评条数</th></tr></thead><tbody>${report.segments.map((seg) => {
      const f = seg.facts; const val = (n) => seg.counted ? escapeHtml(n) : '—';
      return `<tr><td>${escapeHtml(seg.label)}</td><td>${val(f.present)}</td><td>${val(f.late)}</td><td>${val(f.leave)}</td><td>${val(f.absent)}</td><td>${val(f.hwSubmitted)}</td><td>${val(f.hwMissing)}</td><td>${val(f.reviews.length)}</td></tr>`;
    }).join('')}</tbody></table><p class="ops-form-help">仅并列各段绝对次数；进行中的段不参与比较，不生成百分比变化或趋势结论。</p>`;

    // D 里程碑
    const cert = (learnerClass.certificates || [])[0];
    const milestone = `<dl class="info-grid stage-milestone">
      <div><dt>班级 / 课程</dt><dd>${escapeHtml(learnerClass.name || '—')} · ${escapeHtml(learnerClass.course || '—')}</dd></div>
      <div><dt>授课教师 / 校区</dt><dd>${escapeHtml(learnerClass.teacher || '—')} · ${escapeHtml(learnerClass.campus || '—')}</dd></div>
      <div><dt>入学 ~ 结业时间</dt><dd>${escapeHtml(learnerClass.enrollDate || '—')} ~ ${escapeHtml(learnerClass.endDate || '—')}</dd></div>
      <div><dt>课次进度</dt><dd>计划 ${report.L} 次 · 已上 ${report.past.length} 次 · 剩余 ${Math.max(0, report.L - report.past.length)} 次</dd></div>
      <div><dt>结业状态</dt><dd>${escapeHtml(learnerClass.graduation?.status || '在读')}</dd></div>
      <div><dt>证书状态</dt><dd>${escapeHtml(cert ? cert.status : '暂无')}</dd></div>
    </dl>`;

    // E 待办提示
    const todos = [];
    report.segments.forEach((seg) => {
      const f = seg.facts;
      if (f.absentLessons.length) todos.push(`${seg.label}缺勤：第 ${f.absentLessons.join('、')} 次课`);
      if (f.missingLessons.length) todos.push(`${seg.label}作业未交：第 ${f.missingLessons.join('、')} 次课`);
      if (f.pendingReview.length) todos.push(`${seg.label}待点评作业 ${f.pendingReview.length} 项`);
    });
    const todoHtml = todos.length
      ? `<ul class="stage-todos">${todos.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
      : '<div class="empty compact">当前无待处理事项。</div>';

    const final = finalCommentView(learner, learnerClass, report.viewerRole);
    return `<section class="card stage-report">
      ${banner}
      <div class="section-title-row"><div><h2>三段事实</h2></div><span class="tag gray">按计划课次 ${report.L} 次固定划分</span></div>
      ${stageTable}
      <div class="detail-grid stage-sections">
        <section class="card"><h3>B · 教师点评原文</h3>${evidence}</section>
        <section class="card"><h3>D · 里程碑</h3>${milestone}</section>
        <section class="card"><h3>C · 段间对照</h3>${compare}</section>
        <section class="card"><h3>E · 待办提示</h3>${todoHtml}</section>
      </div>
      <div class="section-title-row"><div><h2>结业终评</h2></div></div>
      ${final.html}
    </section>`;
  }

  __classicExports["stageBounds"] = stageBounds;
  __classicExports["stageOfIndex"] = stageOfIndex;
  __classicExports["resolveClassSource"] = resolveClassSource;
  __classicExports["buildStageReport"] = buildStageReport;
  __classicExports["finalCommentView"] = finalCommentView;
  __classicExports["renderStageReport"] = renderStageReport;
  __classicModules["shared/js/stage-assessment.js"] = __classicExports;
})(typeof window !== 'undefined' ? window : globalThis);
