import { relativePath } from './paths.js';

const roleKey = 'hbyx-mini-role';
const roleButtons = document.querySelectorAll('[data-role]');
const roleInput = document.querySelector('#selected-role');
const roleCopy = document.querySelector('#role-copy');
const loginForm = document.querySelector('#mini-login-form');

if (roleButtons.length && roleInput) {
  const initialRole = new URLSearchParams(location.search).get('role') || sessionStorage.getItem(roleKey) || 'learner';
  const updateRole = role => {
    roleInput.value = role;
    roleButtons.forEach(button => button.classList.toggle('active', button.dataset.role === role));
    if (roleCopy) roleCopy.textContent = role === 'teacher' ? '登录后进入课表、班级、申报、工资和我的' : '登录后进入课程、学习、订单和我的';
  };
  updateRole(initialRole);
  roleButtons.forEach(button => button.addEventListener('click', () => updateRole(button.dataset.role)));
  loginForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const role = roleInput.value;
    sessionStorage.setItem(roleKey, role);
    sessionStorage.setItem('hbyx-mini-logged-in', '1');
    const redirect = new URLSearchParams(location.search).get('redirect');
    location.href = relativePath(redirect && redirect.startsWith('/') ? redirect : role === 'teacher' ? '/teacher/index.html' : '/learner/index.html');
  });
  document.querySelector('[data-wechat-login]')?.addEventListener('click', () => {
    const role = roleInput.value;
    sessionStorage.setItem(roleKey, role);
    sessionStorage.setItem('hbyx-mini-logged-in', '1');
    const redirect = new URLSearchParams(location.search).get('redirect');
    location.href = relativePath(redirect && redirect.startsWith('/') ? redirect : role === 'teacher' ? '/teacher/index.html' : '/learner/index.html');
  });
}
