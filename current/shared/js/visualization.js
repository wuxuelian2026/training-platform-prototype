import { createElement, RefreshCw, Maximize, Minimize } from 'lucide';
import { TIME_ZONE, academicYearStart, createDemoFacts, compareAcademicYears } from './visualization-data.js';
import { createLearningFacts, aggregateLearning, REVIEW_DIMENSIONS } from './visualization-learning.js';
import { incomeChartModel } from './visualization-chart.js';
import { mountDashboardHelp } from './visualization-help.js';

const byId = id => document.getElementById(id);
const format = value => new Intl.NumberFormat('zh-CN').format(value);
const money = cents => (cents / 1000000).toFixed(1);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const yearFilter = byId('academic-year-filter');
const factsCache = new Map();
const learningCache = new Map();
const view = document.body.dataset.view;
const learningView = view === 'learning';

function setMetric(id, value, unit) {
  byId(id).innerHTML = '<span>' + value + '</span><small>' + unit + '</small>';
}

function renderIncome(data) {
  const model = incomeChartModel(data.incomeMonthly);
  const axis = model.ticks.map((value, index) =>
    '<span class="axis-tick" style="top:' + index * 25 + '%">' + value + '</span>').join('');
  const lines = model.series.map((series, index) => '<polyline class="income-line ' + (index ? 'video' : 'offline') +
    '" points="' + series.points.map(point => point.x + ',' + point.y).join(' ') + '"/>').join('');
  const columns = data.incomeMonthly.map((row, index) => {
    const label = row.year + '年' + row.label;
    const description = row.future ? label + '，尚未发生' : label + '：面授净收 ' + money(row.offlineCents) + ' 万元，视频净收 ' + money(row.videoCents) + ' 万元';
    const dots = model.series.map((series, seriesIndex) => {
      const point = series.points.find(point => point.index === index);
      return point ? '<i class="income-dot ' + (seriesIndex ? 'video' : 'offline') + '" style="top:' + point.y + '%"></i>' : '';
    }).join('');
    const tag = row.future ? 'div' : 'button';
    return '<' + tag + (row.future ? '' : ' type="button"') + ' class="chart-column' + (row.future ? ' future' : '') +
      '" aria-label="' + description + '">' + (row.future ? '<span class="future-value">—</span>' : dots) +
      '<span class="month">' + row.label + '</span>' +
      (row.future ? '' : '<span class="chart-tooltip">' + label + '<br>面授 ' + money(row.offlineCents) + ' 万<br>视频 ' + money(row.videoCents) + ' 万</span>') + '</' + tag + '>';
  }).join('');
  byId('income-chart').innerHTML = '<div class="chart-axis"><div>' + axis + '</div></div>' +
    '<div class="chart-plot" style="--zero:' + model.zero + '%"><div class="chart-columns">' +
    '<div class="zero-line" aria-hidden="true"></div><svg class="income-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
    lines + '</svg>' + columns + '</div></div>';
  byId('income-chart').setAttribute('aria-label', data.incomePeriod.year + '年，截至' + data.incomePeriod.cutoffDate + '，面授与视频月度净收金额，单位万元');
}

function renderYearComparison(comparison) {
  byId('year-comparison').innerHTML = comparison.batchComparisons.map(row => {
    const current = row.current?.enrolled;
    const previous = row.previous?.enrolled;
    const rate = previous > 0 ? (current - previous) / previous : null;
    const value = amount => amount == null ? '—' : format(amount);
    const growth = !row.current ? row.status : rate === null ? '—' : (rate > 0 ? '+' : '') + (rate * 100).toFixed(1) + '%';
    return '<tr><th scope="row" title="' + row.status + '；本期截至' + row.cutoff + '；上期截至' + (row.previousCutoff || '—') + '">' + row.name + (row.status === '同期' ? '<small>同期</small>' : '') + '</th><td>' + value(current) +
      '</td><td>' + value(previous) + '</td><td class="' + (rate > 0 ? 'growth-up' : rate < 0 ? 'growth-down' : '') + '" title="' + (rate === null ? '无可比基数' : '同批次同比') + '">' + growth + '</td></tr>';
  }).join('');
  byId('comparison-range').textContent = '已结束比完整结果 · 进行中比同期';
  byId('comparison-caption').textContent = comparison.current.period.label + '年度与' + comparison.previous.period.label + '年度同批次比较';
}

function renderRanking(id, rows, video = false) {
  if (!rows.length) {
    byId(id).innerHTML = '<tr><td colspan="3" class="empty-cell">暂无' + (video ? '有效付费订单' : '有效报名') + '</td></tr>';
    return;
  }
  const max = rows[0][video ? 'orders' : 'enrolled'];
  const body = rows.map((row, index) => {
    const value = row[video ? 'orders' : 'enrolled'];
    return '<tr data-id="' + escapeHtml(row.id) + '"><td><div class="rank-name-line"><span class="rank-number">' + (index + 1) +
      '</span><span class="rank-name" title="' + escapeHtml(row.name) + '">' + escapeHtml(row.name) + '</span></div>' +
      '<div class="rank-meter" aria-hidden="true"><i style="width:' + (max ? value / max * 100 : 0) + '%"></i></div></td>' +
      '<td class="rank-value">' + format(value) + '</td><td>' + (video ? money(row.netCents) : format(row.classes)) + '</td></tr>';
  });
  while (body.length < 10) body.push('<tr class="rank-placeholder" aria-hidden="true"><td>—</td><td>—</td><td>—</td></tr>');
  byId(id).innerHTML = body.join('');
}

function mountRankingAutoScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.ranking-scroll').forEach(container => {
    if (container.dataset.autoScrollMounted) return;
    container.dataset.autoScrollMounted = 'true';
    let paused = false;
    let resumeTimer;
    let resetAt = 0;
    let last = performance.now();
    const pause = () => {
      paused = true;
      clearTimeout(resumeTimer);
    };
    const resume = () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { paused = false; }, 500);
    };
    ['mouseenter', 'focusin', 'touchstart'].forEach(event => container.addEventListener(event, pause, { passive: true }));
    container.addEventListener('wheel', () => { pause(); resume(); }, { passive: true });
    ['mouseleave', 'focusout', 'touchend'].forEach(event => container.addEventListener(event, resume, { passive: true }));
    const tick = now => {
      const elapsed = Math.min(now - last, 100);
      last = now;
      if (!paused && container.scrollHeight > container.clientHeight) {
        if (resetAt && now >= resetAt) resetAt = 0;
        if (!resetAt) {
          container.scrollTop += elapsed * 0.06;
          if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
            resetAt = now + 900;
          }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function renderAdmissionsEfficiency(data, previous) {
  const stats = data.admissionsEfficiency;
  const metric = (id, value, unit) => setMetric(id, value === null ? '—' : value, value === null ? '' : unit);
  byId('efficiency-scope').textContent = '招生结束 ' + format(stats.eligibleClasses) + ' 班';
  metric('efficiency-utilization', stats.utilization === null ? null : (stats.utilization * 100).toFixed(1), '%');
  const ring = byId('efficiency-utilization');
  ring.style.setProperty('--utilization', Math.max(0, Math.min(1, stats.utilization ?? 0)) * 100 + '%');
  ring.classList.toggle('is-unavailable', stats.utilization === null);
  ring.classList.toggle('is-over-capacity', stats.utilization > 1);
  ring.setAttribute('aria-label', stats.utilization === null ? '招生名额使用率：暂无完整数据' :
    '招生名额使用率 ' + (stats.utilization * 100).toFixed(1) + '%' + (stats.utilization > 1 ? '，超额招生' : ''));
  if (stats.utilization > 1) ring.insertAdjacentHTML('beforeend', '<b class="utilization-overflow">超额</b>');
  const prior = previous.admissionsEfficiency.utilization;
  const change = stats.utilization === null || prior === null ? null : (stats.utilization - prior) * 100;
  byId('quality-change').textContent = change === null ? '同比 —' : '同比 ' + (change > 0 ? '+' : '') + change.toFixed(1) + ' 个百分点';
  const labels = ['不足50%', '50%–不足80%', '80%及以上'];
  byId('quality-distribution').innerHTML = '<div class="quality-distribution-title">班级招生饱和度</div>' + (stats.saturation === null ? '<span>暂无完整饱和度数据</span>' :
    '<div class="quality-bar" role="img" aria-label="' + labels.map((label, i) => label + '：' + stats.saturation[i] + '班').join('，') + '">' +
    stats.saturation.map((count, i) => '<i class="quality-band band-' + i + '" style="width:' + count / stats.eligibleClasses * 100 + '%"></i>').join('') + '</div><div class="quality-legend">' +
    labels.map((label, i) => '<span class="band-' + i + '"><i aria-hidden="true"></i>' + label + '<b>' + stats.saturation[i] + '班</b></span>').join('') + '</div>');
  byId('efficiency-capacity').textContent = !stats.eligibleClasses ? '暂无招生结束班级' : stats.capacity === null
    ? '招生名额数据不完整' : '有效报名 ' + format(stats.enrolled) + ' / 招生名额 ' + format(stats.capacity);
}

function renderOverview(comparison) {
  const data = comparison.current;
  const totals = data.totals;
  setMetric('total-net', money(totals.netCents), '万元');
  byId('total-net-meta').innerHTML = '<span class="offline-ink">面授 ' + money(totals.offlineNetCents) +
    ' 万</span><span class="video-ink">视频 ' + money(totals.videoNetCents) + ' 万</span>';
  setMetric('offline-classes', format(totals.openedClasses), '班');
  const growthText = key => { const rate = comparison.metrics.find(row => row.key === key).growth; return rate === null ? '同比 —' : '同比 ' + (rate > 0 ? '+' : '') + (rate * 100).toFixed(1) + '%'; };
  byId('offline-classes-meta').textContent = '覆盖 ' + data.batches.filter(row => row.classes > 0).length + ' 个批次 · ' + growthText('openedClasses');
  setMetric('offline-enrolled', format(totals.enrolled), '人次');
  byId('offline-enrolled-meta').textContent = '去重学员 ' + format(totals.students) + ' 人 · ' + growthText('enrolled');
  setMetric('video-orders', format(totals.videoOrders), '笔');
  byId('video-orders-meta').textContent = '全额退款 ' + format(totals.refundedVideoOrders) + ' 笔';
  renderIncome(data);
  renderYearComparison(comparison);
  renderAdmissionsEfficiency(data, comparison.previous);
  renderRanking('major-ranking', data.rankings.majors);
  renderRanking('course-ranking', data.rankings.courses);
  renderRanking('teacher-ranking', data.rankings.teachers);
  renderRanking('video-ranking', data.rankings.videos, true);
  mountRankingAutoScroll();
}

// CR-2026-169：招生三面板压成两块，并入「学情与招生」视图；口径仍取经营侧的对比结果。
function renderAdmissionsPanels(data) {
  const conversion = data.admissionsConversion;
  setMetric('conversion-rate', conversion.rate === null ? '—' : (conversion.rate * 100).toFixed(1), conversion.rate === null ? '' : '%');
  setMetric('conversion-leads', format(conversion.leads), '条');
  setMetric('conversion-converted', format(conversion.converted), '条');
  byId('source-ranking').innerHTML = data.sourceRanking.length ? data.sourceRanking.map((row, index) =>
    '<tr><td><span class="rank-number">' + (index + 1) + '</span> ' + escapeHtml(row.name) + '</td><td>' +
    format(row.leads) + '</td><td>' + format(row.converted) + '</td><td>' +
    (row.rate * 100).toFixed(1) + '%</td></tr>').join('') : '<tr><td colspan="4" class="empty-cell">暂无新增线索</td></tr>';
  const enrollmentMax = Math.max(1, ...data.enrollmentMonthly.map(row => row.enrolled));
  byId('enrollment-chart').innerHTML = data.enrollmentMonthly.map(row =>
    '<div class="enrollment-month' + (row.future ? ' future' : '') + '" tabindex="0" title="' + row.year + '年' + row.label +
    (row.future ? '：尚未发生' : '：新增有效报名 ' + format(row.enrolled) + ' 人次') + '">' +
    '<div class="enrollment-bar">' + (row.future ? '' : '<i style="height:' + row.enrolled / enrollmentMax * 100 + '%"></i>') +
    '<span>' + (row.future ? '—' : format(row.enrolled)) + '</span></div><span>' + row.label + '</span></div>').join('');
}

const percentText = value => (value === null || value === undefined ? '—' : value.toFixed(1) + '%');
const starsText = value => '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(0, Math.max(0, 5 - value));

// 学情与招生：学情面板只读 learning 事实，招生面板只读经营侧对比结果；两者口径互不覆盖。
function renderLearning(data, dashboard) {
  const totals = data.totals;
  setMetric('learn-students', format(totals.students), '人');
  byId('learn-students-meta').textContent = '在读 ' + format(totals.enrollments) + ' 人次 · ' + format(totals.classes) + ' 个班';
  setMetric('learn-attendance', percentText(totals.attendanceRate).replace('%', ''), totals.attendanceRate === null ? '' : '%');
  byId('learn-attendance-meta').textContent = '有效出勤 ' + format(totals.attendancePresent) + ' / 应出勤 ' + format(totals.attendanceExpected) + ' 课次';
  setMetric('learn-homework', percentText(totals.homeworkRate).replace('%', ''), totals.homeworkRate === null ? '' : '%');
  byId('learn-homework-meta').textContent = '已交 ' + format(totals.homeworkSubmitted) + ' / 应交 ' + format(totals.homeworkExpected) + ' 份';
  setMetric('learn-review', percentText(totals.participation).replace('%', ''), totals.participation === null ? '' : '%');
  byId('learn-review-meta').textContent = '已评 ' + format(totals.reviewCount) + ' / 应评 ' + format(totals.reviewBase) +
    ' · 课程均分 ' + (totals.courseRating ?? '—') + ' 星';
  const conversion = dashboard.admissionsConversion;
  setMetric('learn-conversion', conversion.rate === null ? '—' : (conversion.rate * 100).toFixed(1), conversion.rate === null ? '' : '%');
  byId('learn-conversion-meta').textContent = '已转化 ' + format(conversion.converted) + ' / 新增 ' + format(conversion.leads) + ' 条';
  setMetric('learn-churn', percentText(totals.churnRate).replace('%', ''), totals.churnRate === null ? '' : '%');
  byId('learn-churn-meta').textContent = '流失 ' + format(totals.churnCount) + ' / 在册 ' + format(totals.churnBase) + ' 人次';

  byId('watch-list').innerHTML = data.watchlist.length ? data.watchlist.map(row =>
    '<tr><td><span class="cell-main">' + escapeHtml(row.name) + '</span><span class="cell-sub">' +
    escapeHtml(row.className) + ' · ' + escapeHtml(row.reason) + '</span></td><td class="cell-alert">' +
    row.attendanceRate.toFixed(0) + '%</td><td class="cell-alert">' + row.homeworkRate.toFixed(0) + '%</td></tr>').join('')
    : '<tr><td colspan="3" class="empty-cell">暂无综合分低于 70 的学员</td></tr>';
  byId('watch-scope').textContent = 'Top10 · 共 ' + format(totals.warning) + ' 人';

  byId('course-learning').innerHTML = data.courses.map(row =>
    '<tr><td><span class="cell-main" title="' + escapeHtml(row.name) + ' · ' + escapeHtml(row.major) +
    ' · 进度 ' + percentText(row.progressRate) + '">' + escapeHtml(row.name) + '</span></td><td>' + format(row.students) +
    '</td><td>' + percentText(row.attendanceRate) + '</td><td>' + percentText(row.homeworkRate) + '</td></tr>').join('');

  byId('teacher-quality').innerHTML = data.teachers.map((row, index) =>
    '<tr><td><span class="rank-name-line"><span class="rank-number">' + (index + 1) + '</span><span class="cell-main">' +
    escapeHtml(row.name) + '</span></span><span class="cell-sub">短板 · ' + escapeHtml(row.weak) + '</span></td><td class="rank-value">' +
    (row.rating === null ? '—' : row.score.toFixed(1)) + '</td><td>' + percentText(row.attendanceRate) + '</td><td>' +
    percentText(row.homeworkRate) + '</td><td>' + (row.rating === null ? '—' : row.rating.toFixed(1)) + '</td></tr>').join('');

  const review = data.review;
  byId('review-scope').textContent = '参评率 ' + percentText(review.participation);
  byId('review-summary').innerHTML = '<span>课程评分 <b>' + (review.courseRating ?? '—') + '</b><small>星</small></span>' +
    '<span>教师评分 <b>' + (review.teacherRating ?? '—') + '</b><small>星</small></span>' +
    '<span class="review-count">已评 ' + format(review.count) + ' / 应评 ' + format(review.base) +
    ' · 带文本 ' + percentText(review.textRate) + '</span>';
  byId('review-dims').innerHTML = REVIEW_DIMENSIONS.map(({ key, label }) => {
    const row = review.dimensions.find(item => item.key === key) || { value: null };
    return '<div class="dim-row"><span>' + label + '</span><div class="dim-bar"><i style="width:' +
      ((row.value ?? 0) / 5 * 100).toFixed(1) + '%"></i></div><b>' + (row.value === null ? '—' : row.value.toFixed(1)) + '</b></div>';
  }).join('');
  const starTotal = review.distribution.reduce((total, row) => total + row.count, 0);
  byId('review-stars').innerHTML = starTotal ? '<div class="star-bar" aria-label="' +
    review.distribution.map(row => row.stars + '星 ' + row.count + ' 条').join('，') + '">' +
    review.distribution.map(row => row.count ? '<i class="star-band star-' + row.stars + '" style="width:' +
      (row.count / starTotal * 100).toFixed(1) + '%"></i>' : '').join('') + '</div>' +
    '<div class="star-legend">' + review.distribution.map(row => '<span><i class="star-' + row.stars + '"></i>' +
      row.stars + '星<b>' + row.count + '</b></span>').join('') + '</div>'
    : '<span class="review-empty">暂无班级评价</span>';

  byId('churn-scope').textContent = '流失 ' + format(data.churn.count) + ' 人次';
  byId('churn-summary').innerHTML = '<div class="churn-rate"><b>' + percentText(data.churn.rate).replace('%', '') +
    '</b><small>%</small><span>期间流失率</span></div><div class="churn-facts"><span>在册 ' + format(data.churn.base) +
    ' 人次</span><span>需关注学员 ' + format(totals.warning) + ' 人</span></div>';
  const reasonMax = Math.max(1, ...data.churn.reasons.map(row => row.count));
  byId('churn-reasons').innerHTML = data.churn.reasons.length ? data.churn.reasons.map(row =>
    '<div class="reason-row" title="' + escapeHtml(row.name) + '：' + row.count + ' 人次，占 ' + percentText(row.share) + '">' +
    '<span>' + escapeHtml(row.name) + '</span><div class="reason-bar"><i style="width:' + (row.count / reasonMax * 100).toFixed(1) +
    '%"></i></div><b>' + row.count + '</b><small>' + percentText(row.share) + '</small></div>').join('')
    : '<p class="review-empty">统计期内无流失记录</p>';

  byId('churn-top-courses').innerHTML = data.churn.topCourses.length
    ? data.churn.topCourses.map(row =>
        '<tr><td><span class="cell-main" title="' + escapeHtml(row.name) + '">' + escapeHtml(row.name) + '</span></td><td>' +
        format(row.count) + '</td><td>' + format(row.base) + '</td><td>' + percentText(row.rate) + '</td></tr>').join('')
    : '<tr><td colspan="4" class="empty-cell">统计期内暂无流失记录</td></tr>';

  byId('feedback-list').innerHTML = review.low.length ? review.low.map(row =>
    '<figure class="feedback-card"><div class="feedback-stars">' + starsText(row.courseRating) +
    '<span>' + row.lowest + ' 星短板</span></div><blockquote>' + escapeHtml(row.text) + '</blockquote>' +
    '<figcaption>' + escapeHtml(row.studentName) + '家长 · ' + escapeHtml(row.className) + ' · ' +
    escapeHtml(row.teacher) + '</figcaption></figure>').join('')
    : '<p class="review-empty">暂无带文本的低分评价</p>';
  renderAdmissionsPanels(dashboard);
}

function renderDashboard() {
  const now = new Date();
  const year = Number(yearFilter.value);
  if (!factsCache.has(year)) factsCache.set(year, createDemoFacts(year));
  const facts = factsCache.get(year);
  const comparison = compareAcademicYears(facts, year, now);
  let period = comparison.current.period;
  if (learningView) {
    const key = year + '#' + now.toISOString().slice(0, 10);
    if (!learningCache.has(key)) learningCache.set(key, aggregateLearning(createLearningFacts(facts, year, now)));
    const data = learningCache.get(key);
    period = data.period;
    renderLearning(data, comparison.current);
  } else {
    renderOverview(comparison);
  }
  document.querySelectorAll('.learning-grid .lp-cell:not([hidden]) .rank-scroll').forEach(node => { node.scrollTop = 0; });
  byId('academic-range').textContent = period.startDate.replaceAll('-', '.') + ' - ' + period.endDate.replaceAll('-', '.');
  byId('as-of').textContent = '截至 ' + period.cutoffDate.replaceAll('-', '.');
  byId('scope').textContent = '演示数据 · ' + period.label + '年度 · 全部校区';
  byId('updated').textContent = '更新于 ' + new Intl.DateTimeFormat('zh-CN', { timeZone: TIME_ZONE, timeStyle: 'medium' }).format(now);
  document.querySelectorAll('[data-page]').forEach(link => {
    link.href = './' + link.dataset.page + '?year=' + year;
  });
  const url = new URL(window.location.href);
  url.searchParams.set('year', year);
  window.history.replaceState(null, '', url);
}

function setIcon(id, icon) {
  byId(id).replaceChildren(createElement(icon, { 'stroke-width': 1.8, 'aria-hidden': 'true' }));
}

const currentYear = academicYearStart();
const availableYears = [currentYear, currentYear - 1, currentYear - 2];
yearFilter.innerHTML = availableYears.map(year =>
  '<option value="' + year + '">' + year + '</option>').join('');
setIcon('refresh', RefreshCw);
setIcon('fullscreen', Maximize);
const requestedYear = Number(new URLSearchParams(window.location.search).get('year'));
yearFilter.value = String(availableYears.includes(requestedYear) ? requestedYear : currentYear);
yearFilter.addEventListener('change', renderDashboard);
byId('refresh').addEventListener('click', renderDashboard);
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  setIcon('fullscreen', active ? Minimize : Maximize);
  byId('fullscreen').title = active ? '退出全屏' : '全屏查看';
  byId('fullscreen').setAttribute('aria-label', byId('fullscreen').title);
});
byId('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    byId('updated').textContent = '当前窗口暂不支持全屏';
  }
});
// 排行列表超出可视高度时自动循环滚动；悬停／聚焦暂停，打印与降低动态效果时不启动。
// ?scroll=0 可关闭，便于静态截图与验收。
function mountAutoScroll() {
  if (!learningView) return;
  if (new URLSearchParams(window.location.search).get('scroll') === '0') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.learning-grid .lp-cell:not([hidden]) .rank-scroll').forEach(node => {
    let paused = false;
    let hold = 0;
    const tick = () => {
      if (paused || document.hidden) return;
      const max = node.scrollHeight - node.clientHeight;
      if (max <= 4) return;
      if (hold > 0) { hold -= 50; return; }
      if (node.scrollTop >= max - 0.5) { node.scrollTop = 0; hold = 1200; return; }
      node.scrollTop = Math.min(max, node.scrollTop + 0.7);
    };
    node.addEventListener('mouseenter', () => { paused = true; });
    node.addEventListener('mouseleave', () => { paused = false; });
    node.addEventListener('focusin', () => { paused = true; });
    node.addEventListener('focusout', () => { paused = false; });
    setTimeout(() => setInterval(tick, 50), 1800);
  });
}

mountDashboardHelp(view);
// CR-2026-175：两个页签顶栏均有「导出报告」，按按钮存在性绑定，不再只在学情页生效。
// 导出=浏览器打印当前页，配合 CSS 打印样式；口径说明复用「页面说明」按钮，不引入服务端导出依赖。
const exportButton = byId('export-report');
if (exportButton) {
  exportButton.addEventListener('click', () => window.print());
}
renderDashboard();
mountAutoScroll();
