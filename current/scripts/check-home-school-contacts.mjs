// CR-2026-176：教师端家校沟通「联系人」入口与主动发起沟通回归。
// 覆盖：数据权限（本人授课班级 / 在读）、班级×学员精确会话键、越权与终态拒绝、
// 内容安全、幂等、已有会话复用、通知与审计留痕、家长追问后状态语义、页面说明一致性。
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// home-school-store 以 localStorage 模拟持久化、以 location.pathname 判定角色，先装最小环境。
const storage = new Map();
globalThis.localStorage = {
  getItem: key => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
  clear: () => storage.clear()
};
globalThis.location = { pathname: '/teacher/pages/home-school.html' };

const { loadClassicModule } = await import('./load-classic-modules.mjs');
const HS = await loadClassicModule('shared/js/home-school-store.js');

const files = Object.fromEntries(await Promise.all([
  ['store', 'shared/js/home-school-store.js'],
  ['view', 'shared/js/mobile-home-school.js'],
  ['css', 'shared/css/mini-program.css'],
  ['pageTypes', 'spec/pages/page-types.js'],
  ['contactsHtml', 'teacher/pages/home-school-contacts.html'],
  ['composeHtml', 'teacher/pages/home-school-compose.html']
].map(async ([key, path]) => [key, await readFile(resolve(root, path), 'utf8')])));

let checks = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) { checks += 1; console.log(`PASS ${name}${detail ? ` :: ${detail}` : ''}`); return; }
  failures.push(name);
  console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
}

const asTeacher = () => { globalThis.location = { pathname: '/teacher/pages/home-school.html' }; };
const asParent = () => { globalThis.location = { pathname: '/learner/pages/home-school.html' }; };
const reset = () => { asTeacher(); HS.resetDemo(); };

// ---------- 联系人可见范围 ----------
reset();
const contacts = HS.listContacts();
check('联系人只列本人授课班级的在读学员', contacts.length === 8 && contacts.every(row => row.teacherId === 'teacher-default' && row.active), `共 ${contacts.length} 人`);
check('联系人按班级分组可枚举且不含已结课班级', new Set(contacts.map(row => row.classId)).size === 4 && !contacts.some(row => row.classId === 'CLASS-HS-03'), `在读班级 ${new Set(contacts.map(row => row.classId)).size} 个`);
check('同班多名学员均出现在联系人中', contacts.filter(row => row.classId === 'CLASS-HS-01').length === 3);
check('已有会话与尚未沟通的联系人均有标注', contacts.some(row => row.hasThread) && contacts.some(row => !row.hasThread));
check('家长角色不暴露教师联系人接口', (() => { asParent(); const rows = HS.listContacts(); asTeacher(); return rows.length === 0; })());

// 注入一条他人授课绑定，验证跨教师隔离（不污染演示种子）。
const raw = JSON.parse(storage.get('hbyx-home-school-demo-v1'));
raw.bindings.push({ classId: 'CLASS-HS-99', className: '他人授课班', studentId: 'STU-999', studentName: '外部学员', teacherId: 'teacher-other', teacherName: '吴老师', parentAccountId: 'parent-default', active: true });
storage.set('hbyx-home-school-demo-v1', JSON.stringify(raw));
check('他人授课班级的学员不进入联系人列表', !HS.listContacts().some(row => row.teacherId === 'teacher-other'));
check('他人授课班级的学员不可被教师发起沟通', HS.startThreadByTeacher({ classId: 'CLASS-HS-99', studentId: 'STU-999', text: '您好', clientRequestId: 'x-other' }).ok === false);
reset();

// ---------- 班级×学员精确会话键 ----------
check('按班级+学员精确命中既有会话', HS.findThreadByClass('CLASS-HS-01', { studentId: 'STU-001' })?.threadId === 'HS-T-001');
check('同班另一学员不串到既有会话', HS.findThreadByClass('CLASS-HS-01', { studentId: 'STU-003' }) === null);
check('不传 studentId 时保持按班级取最新会话', Boolean(HS.findThreadByClass('CLASS-HS-01')));

// ---------- 教师主动发起 ----------
reset();
check('终态或不在读对象不可发起', HS.startThreadByTeacher({ classId: 'CLASS-HS-03', studentId: 'STU-002', text: '您好', clientRequestId: 'x-closed' }).ok === false);
check('内容安全拦截不产生会话', (() => {
  const before = HS.listThreads().length;
  const result = HS.startThreadByTeacher({ classId: 'CLASS-HS-04', studentId: 'STU-006', text: '请加 13800138000', clientRequestId: 'x-pii' });
  return result.ok === false && HS.listThreads().length === before;
})());
check('空文本不产生会话', (() => {
  const before = HS.listThreads().length;
  return HS.startThreadByTeacher({ classId: 'CLASS-HS-04', studentId: 'STU-006', text: '   ', clientRequestId: 'x-empty' }).ok === false && HS.listThreads().length === before;
})());

const created = HS.startThreadByTeacher({ classId: 'CLASS-HS-04', studentId: 'STU-006', text: '家长您好，想同步一下孩子近期课堂表现。', clientRequestId: 't-start-1' });
check('教师可对本班学员发出首条留言并创建会话', created.ok === true && Boolean(created.threadId));
const newThread = HS.getThread(created.threadId);
check('新会话归属班级×学员×本人且带发起标记', newThread.classId === 'CLASS-HS-04' && newThread.studentId === 'STU-006'
  && newThread.teacherId === 'teacher-default' && newThread.initiatedBy === HS.ROLE.TEACHER);
check('新会话家长未读、教师已读，状态为已回复语义', newThread.unreadByParent === true && newThread.unreadByTeacher === false && newThread.status === HS.STATUS.REPLIED);
check('首条留言由教师发出且原文只存消息体', HS.listMessages(created.threadId)[0]?.senderRole === HS.ROLE.TEACHER);
check('教师发起产生家长通知且通知不含留言正文', HS.listDeliveries().some(row => row.threadId === created.threadId && row.title === '教师发起了家校沟通' && !row.text));
check('教师发起写入审计且不含留言原文', HS.listAudit().some(row => row.action === '主动发起沟通' && row.target === created.threadId && !/近期课堂表现/.test(row.detail || '')));
check('重复 clientRequestId 不重复建会话', (() => {
  const before = HS.listThreads().length;
  const again = HS.startThreadByTeacher({ classId: 'CLASS-HS-04', studentId: 'STU-006', text: '重复提交', clientRequestId: 't-start-1' });
  return again.duplicated === true && HS.listThreads().length === before;
})());

// ---------- 已有会话复用（沿用上一段创建的数据，避免把新会话重置掉）----------
const reused = HS.startThreadByTeacher({ classId: 'CLASS-HS-01', studentId: 'STU-001', text: '家长您好，补充一条课堂提醒。', clientRequestId: 't-reuse-1' });
check('已有会话复用同一条长期会话而不新建', reused.ok === true && reused.reused === true && reused.threadId === 'HS-T-001');
check('复用会话的消息追加到原会话', HS.listMessages('HS-T-001').some(row => row.clientRequestId === 't-reuse-1'));
check('回收联系人后原会话仍唯一', HS.listContacts().filter(row => row.classId === 'CLASS-HS-01' && row.studentId === 'STU-001').length === 1);

// ---------- 角色边界与状态语义 ----------
asParent();
check('家长角色不可调用教师主动发起', HS.startThreadByTeacher({ classId: 'CLASS-HS-01', studentId: 'STU-001', text: '您好', clientRequestId: 'p-forbid' }).ok === false);
check('家长追问后教师主动发起标记被清除', (() => {
  const result = HS.appendParentMessage({ threadId: created.threadId, text: '老师您好，收到，想再问一下作业安排。', clientRequestId: 'p-follow-1' });
  const row = HS.listThreads({ role: HS.ROLE.PARENT }).find(item => item.threadId === created.threadId);
  return result.ok === true && row && row.initiatedBy === '' && row.status === HS.STATUS.PENDING;
})());
asTeacher();

// ---------- 与后台批量启停的联动（并行会话按班级维度启停）----------
reset();
check('按班级停用绑定时同班多学员同步失效，联系人整班移除', (() => {
  HS.setBindingActive('CLASS-HS-01', false);
  const rows = HS.listBindings().filter(item => item.classId === 'CLASS-HS-01');
  return rows.length === 3 && rows.every(item => !item.active)
    && !HS.listContacts().some(item => item.classId === 'CLASS-HS-01');
})());
check('整班停用后教师不可再对该班学员发起沟通', HS.startThreadByTeacher({ classId: 'CLASS-HS-01', studentId: 'STU-003', text: '您好', clientRequestId: 'x-disabled' }).ok === false);
reset();

// ---------- 源码与页面说明一致性 ----------
check('教师端顶栏联系人是独立页链接、家长端仍是发起留言', /hs-contact-entry/.test(files.view)
  && /home-school-contacts\.html/.test(files.view) && /id="hs-toggle-new"/.test(files.view));
check('联系人不再以同页展开面板呈现', !/contactPanelHtml|hs-toggle-contacts|contactsOpen/.test(files.view));
check('联系人与发起沟通各有独立渲染分支', /function renderContacts\(\)/.test(files.view)
  && /function renderCompose\(\)/.test(files.view) && /isContacts\)/.test(files.view) && /isCompose\)/.test(files.view));
check('两个独立页面已建且标题正确', /data-title="选择联系人"/.test(files.contactsHtml)
  && /data-title="发起沟通"/.test(files.composeHtml)
  && files.contactsHtml.includes('mobile-home-school.js') && files.composeHtml.includes('mobile-home-school.js'));
check('无会话时跳独立发起页并携带班级与学员', /\$\{composeUrl\}\?classId=/.test(files.view)
  && /studentId=/.test(files.view) && /className=/.test(files.view));
check('早期 teacherStart 直达链接重定向到发起页', /teacherStart=1/.test(files.view) && /location\.replace/.test(files.view));
check('联系人名单只从 HS.listContacts() 取数', /HS\.listContacts\(\)/.test(files.view) && !/classRosterFor/.test(files.view));
check('教师首条留言调用 startThreadByTeacher 且不重复扫描', /HS\.startThreadByTeacher\(/.test(files.view) && !/renderCompose[\s\S]{0,1200}HS\.scanText/.test(files.view));
check('页面说明已废止「教师端不提供发起入口」', /主动发起（CR-2026-176）/.test(files.pageTypes)
  && /规则已废止/.test(files.pageTypes)
  && !/'查看与回复：只查看并回复本人授课班级的家长留言；新增留言由家长端发起/.test(files.pageTypes));
check('页面说明写明越权、终态与通知边界', /越权对象（非本人绑定、已结课、已关闭）/.test(files.pageTypes) && /未授权订阅消息时降级站内红点/.test(files.pageTypes));
check('两个新页面均有页面类型与页面说明', /'teacher\/home-school-contacts': 'list'/.test(files.pageTypes)
  && /'teacher\/home-school-compose': 'list'/.test(files.pageTypes)
  && /'teacher\/home-school-contacts': \{/.test(files.pageTypes) && /'teacher\/home-school-compose': \{/.test(files.pageTypes));
check('联系人页样式已落地', /\.hs-contact-row \{/.test(files.css) && /\.hs-contact-group h3 \{/.test(files.css)
  && /\.hs-chat-icon-btn\.hs-contact-entry \{/.test(files.css));
check('store 导出新增能力', /listContacts, startThreadByTeacher/.test(files.store));

if (failures.length) {
  console.error(`\n家校联系人回归失败 ${failures.length} 项：${failures.join('、')}`);
  process.exit(1);
}
console.log(`\n家校联系人回归通过：${checks} 项。`);
