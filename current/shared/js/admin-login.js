// 后台登录页交互（原型 Mock）。
//
// 字段口径来自 spec/fields/admin.js；登录态由 shared/js/admin-auth.js 写入。
// 校验口径：账号停用拒绝登录；账号不存在、密码错误、验证码错误分别提示；
// 登录成功进入工作台（admin/index.html），工作台本身属迭代2。
import { relativePath } from './paths.js';
import { mountFieldConstraints } from './field-constraints.js';
import { mountPageHelp } from './page-help.js';
import { ADMIN_DEMO_PASSWORD, ADMIN_HOME_PATH, ADMIN_ROLE_LABELS, adminDemoAccounts, findAdminDemoAccount, writeAdminSession } from './admin-auth.js';

const PAGE_KEY = 'admin/login';
const form = document.querySelector('#admin-login-form');
const roleSelect = document.querySelector('#admin-login-role');
const demoSelect = document.querySelector('#admin-login-demo');
const accountInput = document.querySelector('#admin-login-account');
const passwordInput = document.querySelector('#admin-login-password');
const captchaInput = document.querySelector('#admin-login-captcha');
const captchaCode = document.querySelector('#admin-login-captcha-code');
const captchaRefresh = document.querySelector('#admin-login-captcha-refresh');
const agreementInput = document.querySelector('#admin-login-agreement');
const errorBox = document.querySelector('#admin-login-error');

const showError = (message) => {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.hidden = !message;
};

const nextCaptcha = () => String(Math.floor(1000 + Math.random() * 9000));
let captchaValue = nextCaptcha();
const paintCaptcha = () => {
  if (captchaCode) captchaCode.textContent = captchaValue;
  if (captchaInput) captchaInput.value = captchaValue;
};

if (demoSelect) {
  demoSelect.innerHTML = adminDemoAccounts
    .map((item) => `<option value="${item.account}">${item.name} · ${item.account} · ${ADMIN_ROLE_LABELS[item.role]}${item.status === '停用' ? '（已停用）' : ''}</option>`)
    .join('');
  // 演示默认落在教务主管账号，与迭代1常用演示口径一致。
  demoSelect.value = 'academic.lead';
}

// 演示账号只负责带入账号信息；角色选择决定进入后台后的身份与菜单。
const applyDemoAccount = (accountValue, { keepRole = false } = {}) => {
  const demo = findAdminDemoAccount(accountValue);
  if (!demo) return;
  if (accountInput) accountInput.value = demo.account;
  if (passwordInput) passwordInput.value = ADMIN_DEMO_PASSWORD;
  if (roleSelect && !keepRole) roleSelect.value = demo.role;
};

if (demoSelect) {
  applyDemoAccount(demoSelect.value);
  demoSelect.addEventListener('change', () => { showError(''); applyDemoAccount(demoSelect.value); });
}
// 演示链接可用 ?role= 直接落位到指定角色（在演示账号带入之后再覆盖，避免被账号角色回写）。
const requestedRole = new URLSearchParams(location.search).get('role');
if (roleSelect && ADMIN_ROLE_LABELS[requestedRole]) roleSelect.value = requestedRole;
// 手动改账号时同步演示账号下拉，避免“下拉显示的账号”和“实际提交的账号”不一致。
accountInput?.addEventListener('input', () => {
  showError('');
  const demo = findAdminDemoAccount(accountInput.value);
  if (demoSelect && demo) demoSelect.value = demo.account;
});
// 切换角色时同步到该角色的演示账号，避免出现“财务角色 + 教研账号”这类不便于核对身份的演示组合；
// 手动改动登录账号后仍以手动填写的账号为准。
roleSelect?.addEventListener('change', () => {
  showError('');
  const role = roleSelect.value;
  const current = findAdminDemoAccount(accountInput?.value);
  if (current?.role === role) return;
  const aligned = adminDemoAccounts.find((item) => item.role === role && item.status === '启用');
  if (!aligned) return;
  if (demoSelect) demoSelect.value = aligned.account;
  applyDemoAccount(aligned.account, { keepRole: true });
});
passwordInput?.addEventListener('input', () => showError(''));
captchaInput?.addEventListener('input', () => showError(''));
captchaRefresh?.addEventListener('click', () => { captchaValue = nextCaptcha(); paintCaptcha(); showError(''); });
captchaCode?.addEventListener('click', () => { captchaValue = nextCaptcha(); paintCaptcha(); showError(''); });
paintCaptcha();

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const account = String(accountInput?.value || '').trim();
  const password = String(passwordInput?.value || '');
  const captcha = String(captchaInput?.value || '').trim();
  const role = ADMIN_ROLE_LABELS[roleSelect?.value] ? roleSelect.value : 'academic_lead';

  if (!agreementInput?.checked) { showError('请先阅读并同意用户协议与隐私政策。'); return; }
  const demo = findAdminDemoAccount(account);
  if (!demo) { showError('未找到该登录账号，请核对后重试。'); return; }
  if (demo.status === '停用') { showError(`账号“${demo.name}”已停用，无法登录后台，请联系超级管理员。`); return; }
  if (password !== ADMIN_DEMO_PASSWORD) { showError('登录密码不正确，请重新输入。'); return; }
  if (captcha !== captchaValue) { showError('验证码不正确，请重新输入。'); captchaValue = nextCaptcha(); paintCaptcha(); return; }

  showError('');
  writeAdminSession({ account: demo.account, role, name: demo.name });
  location.href = relativePath(ADMIN_HOME_PATH);
});

// 登录页与后台共用字段规格：账号、密码、验证码的校验口径来自 spec/fields/admin.js。
mountFieldConstraints(PAGE_KEY);
// 页面说明入口：内容来自 spec/fields/，与后台其它页面共用同一份字段口径。
mountPageHelp({ pageKey: PAGE_KEY, title: document.title });
