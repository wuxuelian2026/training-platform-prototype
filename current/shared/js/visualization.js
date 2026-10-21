import { createElement, RefreshCw, Maximize, Minimize, ArrowLeft } from 'lucide';
import { TIME_ZONE, academicYearStart, createDemoFacts, compareAcademicYears } from './visualization-data.js';
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
const admissionsView = document.body.dataset.view === 'admissions';

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
  byId('comparison-caption').textContent = comparison.current.period.label + '与' + comparison.previous.period.label + '同批次比较';
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

function renderAdmissions(data) {
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

function renderDashboard() {
  const now = new Date();
  const year = Number(yearFilter.value);
  if (!factsCache.has(year)) factsCache.set(year, createDemoFacts(year));
  const comparison = compareAcademicYears(factsCache.get(year), year, now);
  const data = comparison.current;
  byId('academic-range').textContent = data.period.startDate.replaceAll('-', '.') + ' - ' + data.period.endDate.replaceAll('-', '.');
  byId('as-of').textContent = '截至 ' + data.period.cutoffDate.replaceAll('-', '.');
  byId('scope').textContent = '演示数据 · ' + data.period.label + '学年 · 全部校区';
  byId('updated').textContent = '更新于 ' + new Intl.DateTimeFormat('zh-CN', { timeZone: TIME_ZONE, timeStyle: 'medium' }).format(now);
  if (admissionsView) byId('analysis-link').href = './index.html?year=' + year;
  const url = new URL(window.location.href);
  url.searchParams.set('year', year);
  window.history.replaceState(null, '', url);
  if (admissionsView) renderAdmissions(data);
  else renderOverview(comparison);
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
if (admissionsView) setIcon('navigation-icon', ArrowLeft);
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
mountDashboardHelp();
renderDashboard();
