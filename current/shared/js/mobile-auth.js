import { relativePath } from './paths.js';
import { getCurrentAccountId, setCurrentAccountId } from './demo-store.js';

const roleKey = 'hbyx-mini-role';
const roleButtons = document.querySelectorAll('[data-role]');
const roleInput = document.querySelector('#selected-role');
const roleCopy = document.querySelector('#role-copy');
const loginForm = document.querySelector('#mini-login-form');
const loginModeButtons = document.querySelectorAll('[data-login-mode]');
const loginPanels = document.querySelectorAll('[data-login-panel]');
const loginMessage = document.querySelector('#login-message');
const accountSelect = document.querySelector('#demo-account');
if (accountSelect) accountSelect.value = getCurrentAccountId();
const safeRedirect = (redirect, role) => {
  const target = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : role === 'teacher' ? '/teacher/index.html' : '/learner/index.html';
  return relativePath(target);
};

if (roleButtons.length && roleInput) {
  const initialRole = new URLSearchParams(location.search).get('role') || sessionStorage.getItem(roleKey) || 'learner';
  const updateRole = role => {
    roleInput.value = role;
    roleButtons.forEach(button => button.classList.toggle('active', button.dataset.role === role));
    if (roleCopy) roleCopy.textContent = role === 'teacher' ? '登录后进入课表、班级、申报、工资和我的' : '登录后进入课程、学习、订单和我的';
  };
  updateRole(initialRole);
  roleButtons.forEach(button => button.addEventListener('click', () => updateRole(button.dataset.role)));
  const updateLoginMode = mode => {
    loginModeButtons.forEach(button => {
      const active = button.dataset.loginMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    loginPanels.forEach(panel => {
      const active = panel.dataset.loginPanel === mode;
      panel.hidden = !active;
      panel.querySelectorAll('input').forEach(input => { input.disabled = !active; });
    });
    if (loginMessage) loginMessage.hidden = true;
  };
  updateLoginMode('code');
  loginModeButtons.forEach(button => button.addEventListener('click', () => updateLoginMode(button.dataset.loginMode)));
  document.querySelector('#login-send-code')?.addEventListener('click', event => {
    const phone = document.querySelector('#login-phone');
    if (!phone.reportValidity()) return;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = '60秒后重试';
    if (loginMessage) { loginMessage.hidden = false; loginMessage.textContent = '验证码已发送，请注意查收。'; }
  });
  document.querySelector('[data-forgot-password]')?.addEventListener('click', () => {
    updateLoginMode('code');
    if (loginMessage) { loginMessage.hidden = false; loginMessage.textContent = '请使用验证码登录后，在设置中修改密码。'; }
  });
  loginForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const role = roleInput.value;
    if (accountSelect) setCurrentAccountId(accountSelect.value);
    sessionStorage.setItem(roleKey, role);
    sessionStorage.setItem('hbyx-mini-logged-in', '1');
    const redirect = new URLSearchParams(location.search).get('redirect');
    location.href = safeRedirect(redirect, role);
  });
  document.querySelector('[data-wechat-login]')?.addEventListener('click', () => {
    const role = roleInput.value;
    if (accountSelect) setCurrentAccountId(accountSelect.value);
    sessionStorage.setItem(roleKey, role);
    sessionStorage.setItem('hbyx-mini-logged-in', '1');
    const redirect = new URLSearchParams(location.search).get('redirect');
    location.href = safeRedirect(redirect, role);
  });
}
