// 后台登录页交互（原型 Mock）。
//
// 字段口径来自 spec/fields/admin.js；登录态由 shared/js/admin-auth.js 写入。
// 角色不再由页面单独选择：每个后台账号自身绑定一个角色，登录后身份取该账号的角色。
// 校验口径：账号停用拒绝登录；账号不存在、密码错误分别提示；
// 登录成功进入工作台（admin/index.html），工作台本身属迭代2。
import { relativePath } from './paths.js';
import { mountFieldConstraints } from './field-constraints.js';
import { mountPageHelp } from './page-help.js';
import { ADMIN_DEMO_PASSWORD, ADMIN_HOME_PATH, ADMIN_ROLE_LABELS, adminDemoAccounts, findAdminDemoAccount, writeAdminSession } from './admin-auth.js';

const PAGE_KEY = 'admin/login';
// 「记住密码」在原型中把演示账号与口令存在本地，便于连续演示；
// 口令本身已印在本页信息区，不是密钥。真实系统不得在前端保存口令。
const REMEMBER_KEY = 'hbyx-admin-remember';

const form = document.querySelector('#admin-login-form');
const accountInput = document.querySelector('#admin-login-account');
const passwordInput = document.querySelector('#admin-login-password');
const rememberInput = document.querySelector('#admin-login-remember');
const accountList = document.querySelector('#admin-login-accounts');
const errorBox = document.querySelector('#admin-login-error');

const showError = (message) => {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.hidden = !message;
};

// 左侧信息区按同一份演示账号数据渲染，避免页面里再维护第二份账号清单。
if (accountList) {
  accountList.innerHTML = adminDemoAccounts
    .filter((item) => item.status === '启用')
    .map((item) => `<span>${item.name} · ${item.account} · ${ADMIN_ROLE_LABELS[item.role] || ''}</span>`)
    .join('');
}

const readRemembered = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
    return saved && typeof saved.account === 'string' ? saved : null;
  } catch { return null; }
};

const writeRemembered = (value) => {
  try {
    if (value) localStorage.setItem(REMEMBER_KEY, JSON.stringify(value));
    else localStorage.removeItem(REMEMBER_KEY);
  } catch { /* 无存储权限时仅放弃记住密码，不影响登录。 */ }
};

const remembered = readRemembered();
if (remembered && accountInput) {
  accountInput.value = remembered.account;
  if (passwordInput && remembered.password) passwordInput.value = remembered.password;
  if (rememberInput) rememberInput.checked = true;
} else {
  // 默认填充平台管理员账号与演示口令，打开本页即可直接登录演示。
  const defaultAccount = adminDemoAccounts.find((item) => item.role === 'super_admin' && item.status === '启用');
  if (accountInput && defaultAccount) accountInput.value = defaultAccount.account;
  if (passwordInput) passwordInput.value = ADMIN_DEMO_PASSWORD;
}

// ?role= 演示深链：按角色带入该角色的启用账号，保持既有演示入口可用。
const requestedRole = new URLSearchParams(location.search).get('role');
if (requestedRole && ADMIN_ROLE_LABELS[requestedRole] && accountInput) {
  const aligned = adminDemoAccounts.find((item) => item.role === requestedRole && item.status === '启用');
  if (aligned) accountInput.value = aligned.account;
}

accountInput?.addEventListener('input', () => showError(''));
passwordInput?.addEventListener('input', () => showError(''));

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const account = String(accountInput?.value || '').trim();
  const password = String(passwordInput?.value || '');
  const demo = findAdminDemoAccount(account);

  if (!demo) { showError('未找到该登录账号，请核对后重试。'); return; }
  if (demo.status === '停用') { showError(`账号“${demo.name}”已停用，无法登录后台，请联系超级管理员。`); return; }
  if (password !== ADMIN_DEMO_PASSWORD) { showError('登录密码不正确，请重新输入。'); return; }

  showError('');
  writeRemembered(rememberInput?.checked ? { account: demo.account, password } : null);
  writeAdminSession({ account: demo.account, role: demo.role, name: demo.name });
  location.href = relativePath(ADMIN_HOME_PATH);
});

// 登录页与后台共用字段规格：账号、密码的校验口径来自 spec/fields/admin.js。
mountFieldConstraints(PAGE_KEY);
// 页面说明入口：内容来自 spec/fields/，与后台其它页面共用同一份字段口径。
mountPageHelp({ pageKey: PAGE_KEY, title: document.title });
