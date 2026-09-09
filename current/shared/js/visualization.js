const dashboardData = {
  year: {
    date: '2026年度 · 截至09月09日',
    enrollments: '12,864', enrollmentChange: '+14.8%', conversion: '25.8', conversionChange: '+3.2个百分点', revenue: '742.8', revenueChange: '+12.6%',
    trendTitle: '年度经营趋势', trendSummary: '2026年实收营收 ¥742.8万，报名 12,864 人次', trendPeriod: '年度维度 · 近6年',
    labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
    revenueAxis: ['800万', '600万', '400万', '200万', '0'], conversionAxis: ['32%', '24%', '16%', '8%', '0%'],
    revenueSeries: [462, 498, 556, 613, 659, 743], enrollmentSeries: [7600, 8240, 9060, 10120, 11210, 12864], conversionSeries: [18.2, 19.6, 21.3, 20.8, 23.4, 25.8],
    insight: {best: '春季批次', bestDetail: '报名 3,842 人 · 转化率 31.6%', watch: '寒假批次', watchDetail: '转化率 18.9% · 低于均值 6.4 个百分点', reason: '春季批次报名规模与缴费转化均领先，说明艺术类基础课程的招生承接更稳定。', action: '复用春季课程组合和顾问话术，提前为寒假批次配置试听场次。'}
  },
  batch: {
    date: '2026年批次经营 · 截至09月09日',
    enrollments: '12,864', enrollmentChange: '+14.8%', conversion: '25.8', conversionChange: '+3.2个百分点', revenue: '742.8', revenueChange: '+12.6%',
    trendTitle: '四批次经营对比', trendSummary: '春季批次实收营收 ¥236.4万，报名 3,842 人次', trendPeriod: '批次维度 · 固定四批',
    labels: ['春季', '暑假', '秋季', '寒假'], revenueAxis: ['280万', '210万', '140万', '70万', '0'], conversionAxis: ['36%', '27%', '18%', '9%', '0%'],
    revenueSeries: [236, 184, 205, 117], enrollmentSeries: [3842, 2964, 3718, 2340], conversionSeries: [31.6, 26.8, 25.9, 18.9],
    insight: {best: '春季批次', bestDetail: '报名 3,842 人 · 转化率 31.6%', watch: '寒假批次', watchDetail: '转化率 18.9% · 低于均值 6.4 个百分点', reason: '春季批次报名规模与缴费转化均领先，说明艺术类基础课程的招生承接更稳定。', action: '复用春季课程组合和顾问话术，提前为寒假批次配置试听场次。'}
  }
};

const majorData = {
  revenue: {label: '实收营收（万元）', unit: '万', values: [{name: '舞蹈表演', value: 218.4}, {name: '音乐表演', value: 187.6}, {name: '美术设计', value: 146.8}, {name: '戏剧影视', value: 109.3}, {name: '播音主持', value: 80.7}]},
  enrollments: {label: '有效报名人次', unit: '人次', values: [{name: '舞蹈表演', value: 3628}, {name: '音乐表演', value: 3156}, {name: '美术设计', value: 2486}, {name: '戏剧影视', value: 1984}, {name: '播音主持', value: 1610}]},
  conversion: {label: '缴费转化率', unit: '%', values: [{name: '舞蹈表演', value: 31.6}, {name: '音乐表演', value: 28.4}, {name: '戏剧影视', value: 25.1}, {name: '美术设计', value: 23.8}, {name: '播音主持', value: 20.6}]}
};

const courseData = [
  {name: '中国舞基础训练', type: '面授', enrollment: 642, tag: '爆款课程'},
  {name: '少儿声乐启蒙', type: '面授', enrollment: 586, tag: ''},
  {name: '硬笔书法入门', type: '视频', enrollment: 524, tag: ''},
  {name: '舞台表演与形体', type: '面授', enrollment: 486, tag: ''},
  {name: '钢琴即兴伴奏', type: '视频', enrollment: 432, tag: ''}
];

const teacherData = [
  {name: '李晓芸', major: '舞蹈表演', hours: 486, tag: '明星教师'},
  {name: '周启明', major: '音乐表演', hours: 452, tag: ''},
  {name: '陈  晨', major: '美术设计', hours: 416, tag: ''},
  {name: '王雅琴', major: '戏剧影视', hours: 388, tag: ''},
  {name: '赵子昂', major: '播音主持', hours: 362, tag: ''}
];

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
};

const setMetric = (selector, value, unit) => {
  const element = document.querySelector(selector);
  if (element) element.innerHTML = value + '<small>' + unit + '</small>';
};

const formatNumber = (value) => new Intl.NumberFormat('zh-CN').format(value);

function setPath(path, values, maxValue, minY, maxY) {
  if (!path) return [];
  const step = values.length > 1 ? 720 / (values.length - 1) : 720;
  const points = values.map((value, index) => {
    const x = Math.round(step * index);
    const y = Math.round(maxY - (value / maxValue) * (maxY - minY));
    return (index === 0 ? 'M' : 'L') + x + ' ' + y;
  });
  path.setAttribute('d', points.join(' '));
  return values.map((value, index) => ({cx: Math.round(step * index), cy: Math.round(maxY - (value / maxValue) * (maxY - minY))}));
}

function renderBars(values, maxValue) {
  const group = document.querySelector('[data-chart-bars]');
  if (!group) return;
  group.innerHTML = '';
  const step = values.length > 1 ? 720 / (values.length - 1) : 720;
  const barWidth = values.length > 5 ? 44 : 72;
  values.forEach((value, index) => {
    const height = (value / maxValue) * 188;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(Math.round(step * index - barWidth / 2)));
    rect.setAttribute('y', String(Math.round(208 - height)));
    rect.setAttribute('width', String(barWidth));
    rect.setAttribute('height', String(Math.round(height)));
    rect.setAttribute('rx', '2');
    group.appendChild(rect);
  });
}

function applyTrend(dimension) {
  const data = dashboardData[dimension];
  if (!data) return;
  setText('#current-date', data.date);
  setMetric('#metric-enrollments', data.enrollments, '人次');
  setText('#metric-enrollments-change', data.enrollmentChange);
  setMetric('#metric-conversion', data.conversion, '%');
  setText('#metric-conversion-change', data.conversionChange);
  setMetric('#metric-revenue', data.revenue, '万');
  setText('#metric-revenue-change', data.revenueChange);
  setText('#trend-title', data.trendTitle);
  setText('#trend-summary', data.trendSummary);
  setText('#trend-period', data.trendPeriod);
  document.querySelectorAll('[data-axis-left]').forEach((axis, index) => { axis.textContent = data.revenueAxis[index]; });
  document.querySelectorAll('[data-axis-right]').forEach((axis, index) => { axis.textContent = data.conversionAxis[index]; });
  document.querySelectorAll('#trend-labels span').forEach((label, index) => { label.textContent = data.labels[index] || ''; });
  renderBars(data.revenueSeries, Math.max(...data.revenueSeries) * 1.08);
  const enrollmentCoords = setPath(document.querySelector('[data-chart-enrollment]'), data.enrollmentSeries, Math.max(...data.enrollmentSeries) * 1.12, 52, 208);
  const conversionCoords = setPath(document.querySelector('[data-chart-conversion]'), data.conversionSeries, 36, 42, 208);
  [...document.querySelectorAll('[data-chart-enrollment-points] circle')].forEach((point, index) => { const coord = enrollmentCoords[index]; if (coord) { point.setAttribute('cx', coord.cx); point.setAttribute('cy', coord.cy); } point.hidden = !coord; });
  [...document.querySelectorAll('[data-chart-conversion-points] circle')].forEach((point, index) => { const coord = conversionCoords[index]; if (coord) { point.setAttribute('cx', coord.cx); point.setAttribute('cy', coord.cy); } point.hidden = !coord; });
  setText('#best-batch', data.insight.best);
  setText('#best-batch-detail', data.insight.bestDetail);
  setText('#watch-batch', data.insight.watch);
  setText('#watch-batch-detail', data.insight.watchDetail);
  setText('#insight-reason-text', data.insight.reason);
  setText('#insight-action-text', data.insight.action);
}

function renderMajor(metric) {
  const data = majorData[metric];
  const container = document.querySelector('#major-ranking');
  if (!container || !data) return;
  setText('#major-axis-label', data.label);
  const max = Math.max(...data.values.map((item) => item.value));
  container.innerHTML = data.values.map((item, index) => {
    const rankClass = index < 3 ? 'rank-' + ['one', 'two', 'three'][index] : '';
    const display = metric === 'conversion' ? item.value.toFixed(1) : formatNumber(item.value);
    return '<div class=\"major-row\"><span class=\"major-rank ' + rankClass + '\">' + String(index + 1).padStart(2, '0') + '</span><span class=\"major-name\">' + item.name + '</span><span class=\"major-bar\"><i style=\"width:' + Math.round((item.value / max) * 100) + '%\"></i></span><b class=\"major-value\">' + display + '<small>' + data.unit + '</small></b></div>';
  }).join('');
}

function renderTable(selector, rows, kind) {
  const tbody = document.querySelector(selector);
  if (!tbody) return;
  tbody.innerHTML = rows.map((item, index) => {
    const tag = item.tag ? '<span class=\"table-tag ' + (kind === 'teacher' ? 'star' : '') + '\">' + item.tag + '</span>' : '<span class=\"table-muted\">—</span>';
    const value = kind === 'teacher' ? formatNumber(item.hours) + '<small>课时</small>' : formatNumber(item.enrollment) + '<small>人</small>';
    return '<tr><td>' + String(index + 1).padStart(2, '0') + '</td><td title=\"' + item.name + '\">' + item.name + '</td><td>' + (kind === 'teacher' ? item.major : item.type) + '</td><td>' + value + '</td><td>' + tag + '</td></tr>';
  }).join('');
}

function refreshData() {
  const indicator = document.querySelector('#refresh-indicator');
  setText('#updated-time', new Date().toLocaleTimeString('zh-CN', {hour12: false}));
  if (indicator) {
    indicator.hidden = false;
    window.setTimeout(() => { indicator.hidden = true; }, 2200);
  }
}

document.querySelectorAll('[data-dimension]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-dimension]').forEach((item) => item.classList.toggle('active', item === button));
    applyTrend(button.dataset.dimension);
    refreshData();
  });
});

document.querySelectorAll('[data-major-metric]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-major-metric]').forEach((item) => item.classList.toggle('active', item === button));
    renderMajor(button.dataset.majorMetric);
  });
});

document.querySelectorAll('[data-alert-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-alert-tab]').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('[data-alert-list]').forEach((list) => { list.hidden = list.dataset.alertList !== button.dataset.alertTab; });
  });
});

document.querySelector('[data-action=\"refresh\"]')?.addEventListener('click', refreshData);
document.querySelector('[data-action=\"fullscreen\"]')?.addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  else await document.exitFullscreen?.();
});

let remaining = 30;
window.setInterval(() => {
  remaining -= 1;
  if (remaining <= 0) { remaining = 30; refreshData(); }
  setText('#refresh-countdown', String(remaining));
}, 1000);

renderTable('#course-ranking', courseData, 'course');
renderTable('#teacher-ranking', teacherData, 'teacher');
renderMajor('revenue');
applyTrend('year');
