#!/usr/bin/env node
// 全量页面巡检（headless Chrome + 原始 CDP，无第三方依赖）
//
// 口径：遍历 spec/pages/page-types.js 登记的全部页面，逐页核对
//   1. 页面可加载且正文非空
//   2. 「页面说明」入口存在且可展开、弹窗内小节标题齐备
//   3. 无页面级横向溢出（后台 1280×900，小程序 390×844）
//   4. 控制台错误与未捕获异常为 0
//
// 前置：dev/preview 服务已启动（默认 http://127.0.0.1:4174）
// 运行：node scripts/sweep-pages.mjs            # 输出 JSON 到 stdout 末段并写 _sweep-pages.json
//      BASE=http://127.0.0.1:4180 node scripts/sweep-pages.mjs

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// SWEEP_ROOT 允许指向任意检出（QA 用 `git archive` 归档复跑时不必把脚本复制进检出）。
const root = process.env.SWEEP_ROOT ? resolve(process.env.SWEEP_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:4174';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT || 9723);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const { PAGE_TYPES } = await import(pathToFileURL(join(root, 'spec/pages/page-types.js')).href);

// ZK-D-50 D50-1：小程序只有端根目录的 index（学员端另有 /login.html），其余页面都在 <端>/pages/ 下。
// 旧映射把 /teacher/applications 之类不存在的路径交给 SPA 回退，回退页的相对 meta refresh 会无限追加 learner/。
const urlOf = (key) => {
  if (key === 'admin/index' || key === 'admin/login') return `/${key}.html`;
  if (key === 'learner/index') return '/learner/index.html';
  if (key === 'learner/login') return '/login.html';
  if (key.startsWith('learner/')) return `/learner/pages/${key.split('/')[1]}.html`;
  if (key === 'teacher/index') return '/teacher/index.html';
  if (key.startsWith('teacher/')) return `/teacher/pages/${key.split('/')[1]}.html`;
  return `/admin/pages/${key}.html`;
};
const viewportOf = (key) => (key.startsWith('learner/') || key.startsWith('teacher/') ? [390, 844] : [1280, 900]);
// 参数依赖页：缺参会渲染空态或跳回列表（ZK-B-18／ZK-B-21），巡检按演示基准注入有效参数，
// 否则「正文过短」会被误判成页面缺陷（如 teacher/class-overview 需要 ?class=）。
const PARAMS_OF = {
  'learner/course-detail': '?courseId=COURSE-CR-2026-0002',
  'learner/class-detail': '?courseId=class-mock-enrolling-01',
  'learner/fast-registration-detail': '?classId=class-mock-enrolling-01'
};
// 预期空态页（CR-2026-054 已移除教师端旧班级演示数据，新班级由后台建班后进入）。
// 这类页面正文短是设计使然，但必须真的渲染出空态文案，否则仍按「正文过短」判失败。
const EXPECTED_EMPTY = {
  'teacher/class-detail': '暂无班级',
  'teacher/class-overview': '暂无班级'
};
// 根 landing 的特征：标题固定，且带相对 meta refresh（一旦命中说明地址写错、被 SPA 回退了）。
const LANDING_TITLE = '继续教育小程序原型入口';
const keyFilter = (process.env.PAGES || '').split(',').map((item) => item.trim()).filter(Boolean);
// 页面说明弹窗检查可用 HELP_CHECK=0 关闭：个别页面在弹窗交互后会出现客户端重定向链，
// 让后续页面导航等待超时；版面与可达性断言不依赖弹窗交互，聚焦巡检时可关掉。
const HELP_CHECK = process.env.HELP_CHECK !== '0';
// CDP 超时可能有调用方已经不再等待（例如导航进行中），未处理的拒绝会让整个巡检验进程退出，
// 这里兜底记录并继续，保证结果文件一定能落盘。
process.on('unhandledRejection', (error) => {
  process.stderr.write(`[sweep] unhandledRejection: ${error?.message || error}\n`);
});
const pages = [...new Set(Object.keys(PAGE_TYPES))].sort()
  .filter((key) => !keyFilter.length || keyFilter.some((item) => key.includes(item)))
  .map((key) => ({ key, url: `${urlOf(key)}${PARAMS_OF[key] || ''}`, viewport: viewportOf(key), file: join(root, urlOf(key).split('?')[0]) }));

// D50-1 预检 1：期望 URL ↔ 磁盘文件存在性。映射写错时先报错，不把错误混进断言结果。
const missingFiles = [];
for (const page of pages) {
  if (!existsSync(page.file)) missingFiles.push(`${page.key} → ${page.url}`);
  // 端与路径前缀一致性：防止把 teacher/x 映射到 learner 目录等同号不同端的错误。
  const expectedPrefix = page.key.startsWith('teacher/') ? '/teacher/' : page.key.startsWith('learner/') ? '/learner/' : '/admin/';
  const allowed = page.key === 'learner/login' ? page.url.startsWith('/login.html') : page.url.startsWith(expectedPrefix);
  if (!allowed) missingFiles.push(`${page.key} → ${page.url}（端与路径前缀不一致，期望 ${expectedPrefix}）`);
}
if (missingFiles.length) {
  process.stderr.write(`[sweep] 路由映射预检失败，以下页面在磁盘上不存在：\n  ${missingFiles.join('\n  ')}\n`);
  process.exit(2);
}
// D50-1 预检 2：从磁盘 HTML 取期望标题；缺 title 视为登记错误。
const titleOf = (file) => (readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/)?.[1] || '').trim();
const titleProblems = [];
for (const page of pages) {
  // 端壳标记按磁盘 HTML 实测推导：登录页等无壳页面不强行要求壳标记（避免误报）。
  const html = readFileSync(page.file, 'utf8');
  page.shell = html.includes('data-mobile-shell') ? 'data-mobile-shell' : html.includes('data-admin-shell') ? 'data-admin-shell' : '';
  page.expectedTitle = titleOf(page.file);
  if (!page.expectedTitle) titleProblems.push(`${page.key} → ${page.url}`);
}
if (titleProblems.length) {
  process.stderr.write(`[sweep] 预检失败，以下页面缺少 <title>：\n  ${titleProblems.join('\n  ')}\n`);
  process.exit(2);
}
// D50-1 预检 3：HTTP 响应自检 —— 200、含端壳标记、标题与磁盘一致、且不是根 landing / 相对跳转页。
const preflight = [];
for (const page of pages) {
  let problem = '';
  try {
    const response = await fetch(`${BASE}${page.url}`);
    const html = await response.text();
    const served = (html.match(/<title>([^<]*)<\/title>/)?.[1] || '').trim();
    const hasShellSource = page.shell ? html.includes(page.shell) : html.includes('type="module"');
    if (response.status !== 200) problem = `HTTP ${response.status}`;
    else if (served === LANDING_TITLE) problem = `命中根 landing（实际 URL ${page.url}）`;
    else if (/http-equiv="refresh"/i.test(html)) problem = '命中带 meta refresh 的回退页';
    else if (served !== page.expectedTitle) problem = `标题不一致：响应「${served}」≠ 磁盘「${page.expectedTitle}」`;
    else if (!hasShellSource) problem = '响应 HTML 不含端壳或模块脚本标记';
  } catch (error) {
    problem = `请求失败：${String(error?.message || error).slice(0, 80)}`;
  }
  preflight.push({ key: page.key, url: page.url, expectedTitle: page.expectedTitle, problem });
}
const preflightFailures = preflight.filter((item) => item.problem);
if (preflightFailures.length) {
  process.stderr.write(`[sweep] 响应自检失败 ${preflightFailures.length} 页（防止地址写错也返回 200 造成假通过）：\n${preflightFailures.map((item) => `  - ${item.key} ${item.url}：${item.problem}`).join('\n')}\n`);
}
// D50-2 入口页自检：入口页不得再用 meta refresh（相对写法会被 SPA 回退按深路径无限追加，
// 绝对写法在 GitHub Pages 项目子路径与 file:// 下失效），跳转脚本必须带「真实入口地址」守卫。
for (const url of ['/index.html', '/培训后台.html']) {
  const file = join(root, url);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  if (/http-equiv="refresh"/i.test(html)) preflightFailures.push({ key: url, url, problem: '入口页仍含 meta refresh（会被 SPA 回退无限追加）' });
  else if (!/location\.pathname === '\/'/.test(html) || !/location\.replace\(/.test(html)) preflightFailures.push({ key: url, url, problem: '入口页跳转缺少「真实入口地址」守卫' });
}
if (preflightFailures.length) {
  process.stderr.write(`[sweep] 入口页自检失败：\n${preflightFailures.filter((item) => item.url.startsWith('/index') || item.url.includes('培训后台')).map((item) => `  - ${item.url}：${item.problem}`).join('\n')}\n`);
}

const child = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'sweep-'))}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
let up = false;
for (let i = 0; i < 60 && !up; i += 1) {
  try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); up = true; } catch { await wait(250); }
}
if (!up) { child.kill(); throw new Error('Chrome 未启动'); }

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(`${BASE}/admin/index.html`)}`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
const events = [];
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve: ok, reject: bad } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) bad(new Error(JSON.stringify(message.error))); else ok(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') events.push({ type: 'exception', text: message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || '' });
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') events.push({ type: 'console', text: (message.params.args || []).map((arg) => arg.value || arg.description || '').join(' ') });
};
// 单个 CDP 调用加超时：个别页面（如咨询详情）在导航／弹窗切换时会让某次 evaluate 永不返回，
// 没有超时保护就会把整轮巡检拖死。超时后按页面错误记录并继续跑下一页。
const send = (method, params = {}, timeoutMs = Number(process.env.CDP_TIMEOUT_MS || 20000)) => new Promise((ok, bad) => {
  const id = ++nextId;
  const timer = setTimeout(() => {
    pending.delete(id);
    bad(new Error(`CDP timeout: ${method} (${timeoutMs}ms)`));
  }, timeoutMs);
  pending.set(id, {
    resolve: (value) => { clearTimeout(timer); ok(value); },
    reject: (error) => { clearTimeout(timer); bad(error); }
  });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (fn, ...args) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression: `(async () => { const fn = ${fn.toString()}; return await fn(...${JSON.stringify(args)}); })()`, awaitPromise: true, returnByValue: true, userGesture: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  return result.value;
};

// R60-UI-01 补强：页级 scrollWidth 测不出「被 overflow:hidden 裁掉、沿途又没有横向滚动容器」的内容。
// 这里做两件事：1) 找出只有裁剪、不可滚动的越界内容；2) 对每个横向滚动容器滚到底，确认最右侧后代完整可见。
const clippingProbe = () => {
  // 性能优先的单遍算法：只对「overflow-x 不是 visible」的容器判断溢出。
  //   - overflow-x: hidden/clip 且 scrollWidth > clientWidth → 内容被裁且不可滚动（R60-UI-01 的签名）；
  //   - overflow-x: auto/scroll 且溢出 → 可滚动，再逐容器验证滚到底后最右列可见。
  // 相比逐节点 getBoundingClientRect + 祖先链回溯，这里每节点仅一次 getComputedStyle。
  const clipped = [];
  const scrollables = [];
  for (const node of document.querySelectorAll('body *')) {
    const rect = node.getBoundingClientRect();
    // 忽略零尺寸与视觉隐藏的小控件（如开关的 1px input），它们天然会有一两像素的内部溢出。
    if (rect.width <= 4 || rect.height <= 4) continue;
    const overflowX = getComputedStyle(node).overflowX;
    if (overflowX === 'visible') continue;
    const overflow = node.scrollWidth - node.clientWidth;
    if (overflow <= 4) continue;
    const meta = { tag: node.tagName.toLowerCase(), cls: (node.className || '').toString().slice(0, 30), overflow, text: (node.textContent || '').trim().slice(0, 16) };
    if (overflowX === 'auto' || overflowX === 'scroll') scrollables.push({ node, ...meta });
    else clipped.push({ ...meta, clipBy: overflowX });
  }
  // 可达性：把每个横向滚动容器滚到底，要求表头首行最右单元格（或容器最右子元素）落在容器内。
  const unreachable = [];
  for (const item of scrollables) {
    const node = item.node;
    const before = node.scrollLeft;
    node.scrollLeft = node.scrollWidth;
    const containerRight = node.getBoundingClientRect().right;
    const table = node.querySelector('table');
    const cells = table ? [...table.querySelectorAll('tr:first-child > *')] : [...node.children];
    const widest = cells.reduce((max, cell) => { const rect = cell.getBoundingClientRect(); return rect.width > 0 && rect.right > max ? rect.right : max; }, 0);
    node.scrollLeft = before;
    if (widest && widest > containerRight + 2) unreachable.push({ cls: item.cls, overflow: item.overflow, widestRight: Math.round(widest), containerRight: Math.round(containerRight) });
  }
  return { clippedCount: clipped.length, clipped: clipped.slice(0, 4), scrollableCount: scrollables.length, unreachableCount: unreachable.length, unreachable: unreachable.slice(0, 4) };
};

await send('Runtime.enable');
await send('Page.enable');
// 先落到同源页面，否则 about:blank 是透明源，读写 storage 会被拒绝。
await send('Page.navigate', { url: `${BASE}/admin/index.html` });
await wait(1200);
await evaluate(() => {
  localStorage.removeItem('hbyx-iteration1-demo-v1');
  sessionStorage.setItem('hbyx-admin-session', JSON.stringify({ account: 'super.admin', name: '平台管理员', role: 'super_admin' }));
  sessionStorage.setItem('hbyx-mini-logged-in', '1');
  sessionStorage.setItem('hbyx-teacher-id', 'teacher-wang');
});

const rows = [];
for (const page of pages) {
  events.length = 0;
  const startedAt = Date.now();
  process.stderr.write(`[sweep] ${page.key} start\n`);
  // 按页面归属设置会话：小程序两端各用对应角色，否则会被登录拦截重定向，页面空跑。
  await evaluate((key) => {
    // 先清掉所有端侧会话键，避免上一端残留（如 hbyx-teacher-id）让另一端反复重定向。
    ['hbyx-mini-logged-in', 'hbyx-mini-role', 'hbyx-teacher-id', 'hbyx-admin-session', 'hbyx-learner-id', 'hbyx-current-student-id']
      .forEach((name) => sessionStorage.removeItem(name));
    if (key.startsWith('learner/')) {
      sessionStorage.setItem('hbyx-mini-logged-in', '1');
      sessionStorage.setItem('hbyx-mini-role', 'learner');
    } else if (key.startsWith('teacher/')) {
      sessionStorage.setItem('hbyx-mini-logged-in', '1');
      sessionStorage.setItem('hbyx-mini-role', 'teacher');
      sessionStorage.setItem('hbyx-teacher-id', 'teacher-wang');
    } else {
      sessionStorage.setItem('hbyx-admin-session', JSON.stringify({ account: 'super.admin', name: '平台管理员', role: 'super_admin' }));
    }
  }, page.key);
  await send('Emulation.setDeviceMetricsOverride', { width: page.viewport[0], height: page.viewport[1], deviceScaleFactor: 1, mobile: page.viewport[0] < 600 });
  try {
    await send('Page.navigate', { url: `${BASE}${page.url}` });
    await wait(900);
    const probe = await evaluate(() => {
      const trigger = document.querySelector('[data-page-help-trigger], .page-help-trigger, [data-help-trigger]');
      const body = (document.querySelector('main, .mobile-main, #page-content, body')?.innerText || '').trim();
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      // D50-1 浏览器侧自检：落点路径、标题与端壳标记都必须与登记一致，命中根 landing 直接判失败。
      const shells = ['data-mobile-shell', 'data-admin-shell'];
      return {
        hasTrigger: Boolean(trigger),
        bodyLength: body.length,
        bodyText: body.slice(0, 200),
        overflow,
        title: document.title,
        href: location.href,
        pathname: location.pathname,
        shellFound: shells.some((name) => Boolean(document.querySelector(`[${name}]`))),
        hasRefreshMeta: Boolean(document.querySelector('meta[http-equiv="refresh" i]'))
      };
    });
    const expectedPath = page.url.split('?')[0];
    const landingHit = probe.title === LANDING_TITLE || probe.hasRefreshMeta;
    const shellMismatch = Boolean(page.shell) && !probe.shellFound;
    const titleMismatch = probe.title !== page.expectedTitle;
    const pathMismatch = probe.pathname !== expectedPath;
    const routeProblem = landingHit
      ? `命中根 landing／回退页（实际 ${probe.href}）`
      : pathMismatch
        ? `落点不符：实际 ${probe.pathname} ≠ 期望 ${expectedPath}`
        : shellMismatch
          ? '页面缺少端壳标记'
          : titleMismatch
            ? `标题不符：实际「${probe.title}」≠ 期望「${page.expectedTitle}」`
            : '';
    const clipping = await evaluate(clippingProbe);
    let helpOpen = false;
    let headings = [];
    if (HELP_CHECK && probe.hasTrigger) {
      await evaluate(() => document.querySelector('[data-page-help-trigger], .page-help-trigger, [data-help-trigger]')?.click());
      await wait(400);
      const dialog = await evaluate(() => {
        const node = document.querySelector('[data-page-help-dialog], .page-help-dialog, dialog[open]');
        if (!node) return { open: false, headings: [] };
        return { open: true, headings: [...node.querySelectorAll('h3, h4, .page-help-section-title')].map((h) => h.textContent.trim()).filter(Boolean) };
      });
      helpOpen = dialog.open;
      headings = dialog.headings;
      // 关闭弹窗一律用 dialog.close()：此前用「弹窗内第一个按钮」选择器，
      // 在部分页面会点到带导航的按钮（如「返回课程列表」），造成重定向链把后续页面拖死。
      if (helpOpen) await evaluate(() => {
        try { document.querySelectorAll('dialog[open]').forEach((node) => node.close()); } catch { /* 忽略无法关闭的弹窗 */ }
        document.querySelector('[data-page-help-trigger], .page-help-trigger, [data-help-trigger]')?.blur();
      });
    }
    process.stderr.write(`[sweep] ${page.key} done ${Date.now() - startedAt}ms\n`);
    rows.push({
      ...page,
      ...probe,
      ...clipping,
      routeProblem,
      helpOpen,
      headings: headings.length,
      headingTexts: headings,
      consoleErrors: events.filter((e) => e.type === 'console').length,
      exceptions: events.filter((e) => e.type === 'exception').length,
      samples: events.slice(0, 2).map((e) => `${e.type}: ${String(e.text).slice(0, 120)}`)
    });
  } catch (error) {
    rows.push({ ...page, error: String(error).slice(0, 200) });
  }
}

// 课表四视图 390／1280 专项：R60-UI-01 的同类问题只出现在窄屏卡片内，
// 页级溢出测不出，必须逐视图跑「裁剪 + 可达性」断言（复用当前连接，避免子进程已退出导致空跑）。
const timetableViews = {};
try {
await send('Page.navigate', { url: `${BASE}/admin/index.html` });
await wait(900);
await evaluate(() => sessionStorage.setItem('hbyx-admin-session', JSON.stringify({ account: 'super.admin', name: '平台管理员', role: 'super_admin' })));
for (const view of ['list', 'matrix', 'teacher', 'class']) {
  for (const width of [390, 1280]) {
    events.length = 0;
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Page.navigate', { url: `${BASE}/admin/pages/academic/timetable.html?view=${view}` });
    await wait(1100);
    const clipping = await evaluate(clippingProbe);
    const overflow = await evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    timetableViews[`${view}@${width}`] = { ...clipping, overflow, consoleErrors: events.filter((e) => e.type === 'console').length, exceptions: events.filter((e) => e.type === 'exception').length };
  }
}
} catch (error) {
  timetableViews.__error = String(error?.message || error).slice(0, 160);
}

ws.close();
child.kill();

const summary = {
  pages: rows.length,
  preflightFailures: preflightFailures.map((item) => `${item.key} ${item.url}：${item.problem}`),
  routeProblems: rows.filter((r) => r.routeProblem).map((r) => `${r.key}：${r.routeProblem}`),
  failed: rows.filter((r) => r.error).map((r) => r.key),
  emptyBody: rows.filter((r) => !r.error && r.bodyLength < 40 && !EXPECTED_EMPTY[r.key]).map((r) => r.key),
  // 登记为预期空态的页面：只要渲染出约定空态文案就不算缺陷，否则仍计入失败。
  emptyStateMismatch: rows
    .filter((r) => !r.error && EXPECTED_EMPTY[r.key] && !String(r.bodyText || '').includes(EXPECTED_EMPTY[r.key]))
    .map((r) => `${r.key}（期望空态文案「${EXPECTED_EMPTY[r.key]}」）`),
  missingTrigger: rows.filter((r) => !r.error && !r.hasTrigger).map((r) => r.key),
  helpNotOpen: rows.filter((r) => !r.error && r.hasTrigger && !r.helpOpen).map((r) => r.key),
  noHeadings: rows.filter((r) => !r.error && r.helpOpen && !r.headings).map((r) => r.key),
  overflow: rows.filter((r) => !r.error && r.overflow > 2).map((r) => `${r.key} ${r.overflow}/${r.viewport[0]}`),
  consoleErrorPages: rows.filter((r) => !r.error && r.consoleErrors).map((r) => `${r.key}(${r.consoleErrors})`),
  exceptionPages: rows.filter((r) => !r.error && r.exceptions).map((r) => r.key),
  clippedContent: rows.filter((r) => !r.error && r.clippedCount).map((r) => r.key),
  unreachableScrollers: rows.filter((r) => !r.error && r.unreachableCount).map((r) => r.key),
  timetableViews
};
writeFileSync(join(root, '_sweep-pages.json'), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
const viewProblems = Object.entries(timetableViews).filter(([, value]) => value.overflow > 2 || value.clippedCount > 0 || value.unreachableCount > 0 || value.consoleErrors > 0 || value.exceptions > 0).map(([key, value]) => `${key} 溢出${value.overflow}/被裁${value.clippedCount}/不可达${value.unreachableCount}/错误${value.consoleErrors + value.exceptions}`);
const bad = summary.failed.length + summary.emptyBody.length + summary.emptyStateMismatch.length + summary.missingTrigger.length + summary.helpNotOpen.length + summary.noHeadings.length + summary.overflow.length + summary.consoleErrorPages.length + summary.exceptionPages.length + summary.clippedContent.length + summary.unreachableScrollers.length + viewProblems.length + summary.preflightFailures.length + summary.routeProblems.length;
console.log(bad ? `巡检未通过：${bad} 项${viewProblems.length ? `（课表视图：${viewProblems.join('、')}）` : ''}` : '巡检通过：全部页面可加载且落点与标题正确、说明入口与小节齐备、无溢出、无被裁不可达内容、无控制台错误（含课表四视图 390／1280 专项）');
process.exit(bad ? 1 : 0);
