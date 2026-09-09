import { normalizePrototypeLinks } from './paths.js';

const root = document.querySelector('[data-mobile-shell]');
const content = document.querySelector('#page-content');
const app = root?.dataset.app || 'learner';
const title = root?.dataset.title || '首页';
const active = root?.dataset.active || 'home';
const isTeacher = app === 'teacher';
const roleLabel = isTeacher ? '教师端' : '当前学员：林知夏';

const nav = isTeacher
  ? [['日', '课表', '/teacher/index.html', 'schedule'], ['班', '班级', '/teacher/pages/classes.html', 'classes'], ['报', '申报', '/teacher/pages/applications.html', 'applications'], ['薪', '工资', '/teacher/pages/salary.html', 'salary'], ['我', '我的', '/teacher/pages/profile.html', 'profile']]
  : [['家', '首页', '/learner/index.html', 'home'], ['课', '课程', '/learner/pages/courses.html', 'courses'], ['报', '快速报名', '/learner/pages/fast-registration.html', 'fast'], ['学', '学习', '/learner/pages/learning.html', 'learning'], ['我', '我的', '/learner/pages/profile.html', 'profile']];

const page = content ? content.innerHTML : '';
root.innerHTML = `<div class="mobile-page"><header class="mobile-header"><h1>${title}</h1><a class="mobile-role-link" href="/login.html">${roleLabel}</a></header><main class="mobile-main">${page}</main><nav class="mobile-bottom-nav">${nav.map(([icon, label, href, key]) => `<a class="${key === active ? 'active' : ''}" href="${href}"><span class="nav-icon">${icon}</span><span>${label}</span></a>`).join('')}</nav></div>`;
normalizePrototypeLinks(root);

if (app === 'learner') import('./learner.js');
if (app === 'teacher') import('./teacher.js');
