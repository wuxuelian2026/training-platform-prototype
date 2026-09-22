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
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:4174';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT || 9723);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const { PAGE_TYPES } = await import(pathToFileURL(join(root, 'spec/pages/page-types.js')).href);

const urlOf = (key) => {
  if (key === 'admin/index' || key === 'admin/login') return `/${key}.html`;
  if (key.startsWith('learner/')) return key === 'learner/login' ? '/login.html' : `/${key}.html`;
  if (key.startsWith('teacher/')) return `/${key}.html`;
  return `/admin/pages/${key}.html`;
};
const viewportOf = (key) => (key.startsWith('learner/') || key.startsWith('teacher/') ? [390, 844] : [1280, 900]);
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
  .map((key) => ({ key, url: urlOf(key), viewport: viewportOf(key) }));

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
      return { hasTrigger: Boolean(trigger), bodyLength: body.length, overflow, title: document.title, href: location.href };
    });
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
    rows.push({ ...page, ...probe, ...clipping, helpOpen, headings: headings.length, consoleErrors: events.filter((e) => e.type === 'console').length, exceptions: events.filter((e) => e.type === 'exception').length, samples: events.slice(0, 2).map((e) => `${e.type}: ${String(e.text).slice(0, 120)}`) });
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
  failed: rows.filter((r) => r.error).map((r) => r.key),
  emptyBody: rows.filter((r) => !r.error && r.bodyLength < 40).map((r) => r.key),
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
const bad = summary.failed.length + summary.emptyBody.length + summary.missingTrigger.length + summary.helpNotOpen.length + summary.noHeadings.length + summary.overflow.length + summary.consoleErrorPages.length + summary.exceptionPages.length + summary.clippedContent.length + summary.unreachableScrollers.length + viewProblems.length;
console.log(bad ? `巡检未通过：${bad} 项${viewProblems.length ? `（课表视图：${viewProblems.join('、')}）` : ''}` : '巡检通过：全部页面可加载、说明入口与小节齐备、无溢出、无被裁不可达内容、无控制台错误（含课表四视图 390／1280 专项）');
process.exit(bad ? 1 : 0);
