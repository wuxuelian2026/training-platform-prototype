import { normalizePrototypeLinks, relativePath } from './paths.js';

const root = document.querySelector('[data-mobile-shell]');
const content = document.querySelector('#page-content');
const app = root?.dataset.app || 'learner';
const title = root?.dataset.title || '首页';
const active = root?.dataset.active || 'home';
const isTeacher = app === 'teacher';

const nav = isTeacher
  ? [['日', '课表', '/teacher/index.html', 'schedule'], ['班', '班级', '/teacher/pages/classes.html', 'classes'], ['报', '申报', '/teacher/pages/applications.html', 'applications'], ['薪', '工资', '/teacher/pages/salary.html', 'salary'], ['我', '我的', '/teacher/pages/profile.html', 'profile']]
  : [['家', '首页', '/learner/index.html', 'home'], ['课', '课程', '/learner/pages/courses.html', 'courses'], ['报', '快速报名', '/learner/pages/fast-registration.html', 'fast'], ['学', '学习', '/learner/pages/learning.html', 'learning'], ['我', '我的', '/learner/pages/profile.html', 'profile']];

const page = content ? content.innerHTML : '';
const isPrimaryPage = nav.some(([, , href]) => location.pathname.endsWith(href));
const fallbackPath = nav.find(([, , , key]) => key === active)?.[2] || nav[0][2];
const backButton = '<button class="mobile-back" type="button" data-mobile-back aria-label="返回" title="返回"><span aria-hidden="true"></span></button>';
const bottomNav = `<nav class="mobile-bottom-nav">${nav.map(([icon, label, href, key]) => `<a class="${key === active ? 'active' : ''}" href="${href}"><span class="nav-icon">${icon}</span><span>${label}</span></a>`).join('')}</nav>`;
root.innerHTML = `<div class="mobile-page ${isPrimaryPage ? '' : 'is-subpage'}"><header class="mobile-header">${isPrimaryPage ? '' : backButton}<h1>${title}</h1></header><main class="mobile-main">${page}</main>${isPrimaryPage ? bottomNav : ''}</div>`;
normalizePrototypeLinks(root);
root.querySelector('[data-mobile-back]')?.addEventListener('click', () => {
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin) { history.back(); return; }
  } catch { /* Fall back to the owning primary page. */ }
  location.href = relativePath(fallbackPath);
});

if (app === 'learner') import('./learner.js');
if (app === 'teacher') import('./teacher.js');
