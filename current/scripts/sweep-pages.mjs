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
const pages = [...new Set(Object.keys(PAGE_TYPES))].sort().map((key) => ({ key, url: urlOf(key), viewport: viewportOf(key) }));

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
const send = (method, params = {}) => new Promise((ok, bad) => { const id = ++nextId; pending.set(id, { resolve: ok, reject: bad }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (fn) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression: `(async () => { const fn = ${fn.toString()}; return await fn(); })()`, awaitPromise: true, returnByValue: true, userGesture: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  return result.value;
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
    let helpOpen = false;
    let headings = [];
    if (probe.hasTrigger) {
      await evaluate(() => document.querySelector('[data-page-help-trigger], .page-help-trigger, [data-help-trigger]')?.click());
      await wait(400);
      const dialog = await evaluate(() => {
        const node = document.querySelector('[data-page-help-dialog], .page-help-dialog, dialog[open]');
        if (!node) return { open: false, headings: [] };
        return { open: true, headings: [...node.querySelectorAll('h3, h4, .page-help-section-title')].map((h) => h.textContent.trim()).filter(Boolean) };
      });
      helpOpen = dialog.open;
      headings = dialog.headings;
      if (helpOpen) await evaluate(() => document.querySelector('[data-page-help-dialog] [data-help-close], [data-page-help-dialog] button')?.click());
    }
    rows.push({ ...page, ...probe, helpOpen, headings: headings.length, consoleErrors: events.filter((e) => e.type === 'console').length, exceptions: events.filter((e) => e.type === 'exception').length, samples: events.slice(0, 2).map((e) => `${e.type}: ${String(e.text).slice(0, 120)}`) });
  } catch (error) {
    rows.push({ ...page, error: String(error).slice(0, 200) });
  }
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
  exceptionPages: rows.filter((r) => !r.error && r.exceptions).map((r) => r.key)
};
writeFileSync(join(root, '_sweep-pages.json'), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
const bad = summary.failed.length + summary.emptyBody.length + summary.missingTrigger.length + summary.helpNotOpen.length + summary.noHeadings.length + summary.overflow.length + summary.consoleErrorPages.length + summary.exceptionPages.length;
console.log(bad ? `巡检未通过：${bad} 项` : '巡检通过：全部页面可加载、说明入口与小节齐备、无溢出、无控制台错误');
process.exit(bad ? 1 : 0);
