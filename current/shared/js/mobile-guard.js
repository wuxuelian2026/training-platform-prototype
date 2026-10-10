(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// CR-2026-039：小程序两端登录态统一口径。
//
// 规则：需要登录才能看到内容的页面，未登录一律直接跳转登录页，并带回跳地址；
// 学员端「我的」页保留登录入口卡片与菜单，不做跳转（发现类内容页同样可未登录浏览）。
const { relativePath } = __classicRequire("shared/js/paths.js");

const LOGIN_KEY = 'hbyx-mini-logged-in';
const ROLE_KEY = 'hbyx-mini-role';

// 学员端公开页（发现类内容，不含个人数据）；其余学员端页面与教师端全部页面需要登录。
const LEARNER_PUBLIC_PAGES = new Set([
  'index', 'courses', 'course-detail', 'teachers', 'teacher-detail',
  'fast-registration', 'fast-registration-detail', 'login', 'profile'
]);
const isMiniLoggedIn = () => sessionStorage.getItem(LOGIN_KEY) === '1';
const isMiniRole = (role) => sessionStorage.getItem(ROLE_KEY) === role;
const isLearnerPublicPage = (pageName) => LEARNER_PUBLIC_PAGES.has(String(pageName || '').replace('.html', ''));
const miniPageName = (path) => (String(path || location.pathname).split('/').pop() || '').replace('.html', '');
function miniLoginUrl(role, redirect) {
  const target = redirect ? `&redirect=${encodeURIComponent(redirect)}` : '';
  return relativePath(`/login.html?role=${encodeURIComponent(role)}${target}`);
}

// 回跳地址使用根相对路径，登录页 safeRedirect 只接受 '/' 开头且非 '//' 的地址。
function currentMiniRedirect() {
  return location.pathname.startsWith('/') ? `${location.pathname}${location.search}` : '';
}

// 返回 true 表示已发起跳转，调用方不再渲染页面内容。
function redirectMiniLogin(role) {
  location.replace(miniLoginUrl(role, currentMiniRedirect()));
  return true;
}


__classicExports["miniLoginUrl"] = miniLoginUrl;
__classicExports["currentMiniRedirect"] = currentMiniRedirect;
__classicExports["redirectMiniLogin"] = redirectMiniLogin;
__classicExports["isMiniLoggedIn"] = isMiniLoggedIn;
__classicExports["isMiniRole"] = isMiniRole;
__classicExports["isLearnerPublicPage"] = isLearnerPublicPage;
__classicExports["miniPageName"] = miniPageName;
  __classicModules["shared/js/mobile-guard.js"] = __classicExports;
})(globalThis);
