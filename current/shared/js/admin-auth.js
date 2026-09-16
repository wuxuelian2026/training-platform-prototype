// 后台登录态（原型 Mock）。
//
// 迭代1 I1-B-01：后台登录、退出与账号状态校验在原型中可演示，不连接真实账号服务。
// 登录页（admin/login.html）写入，后台壳层（admin-shell.js）读取并做未登录拦截。
// 会话按标签页保存在 sessionStorage，与学员端 / 教师端的登录态（hbyx-mini-*）相互独立。

export const ADMIN_SESSION_KEY = 'hbyx-admin-session';
export const ADMIN_LOGIN_PATH = '/admin/login.html';
export const ADMIN_HOME_PATH = '/admin/index.html';

export const ADMIN_ROLE_LABELS = {
  super_admin: '超级管理员',
  research_lead: '教研主管',
  academic_lead: '教务主管',
  course_consultant: '课程顾问',
  finance: '财务'
};

// 演示口令只用于原型演示；真实系统由服务端校验，不在前端保存口令。
export const ADMIN_DEMO_PASSWORD = 'Hbyx@2026';

// 演示账号：五类角色各一个可用账号，外加一个停用账号用于演示“停用拒绝登录”。
// 姓名与后台壳层顶部的角色身份保持一致，便于核对“顶部身份与所选角色一致”。
export const adminDemoAccounts = [
  { account: 'super.admin', name: '平台管理员', role: 'super_admin', status: '启用' },
  { account: 'research.lead', name: '周教研', role: 'research_lead', status: '启用' },
  { account: 'academic.lead', name: '李教务', role: 'academic_lead', status: '启用' },
  { account: 'course.consultant', name: '陈顾问', role: 'course_consultant', status: '启用' },
  { account: 'finance.chen', name: '陈财务', role: 'finance', status: '启用' },
  { account: 'finance.wang', name: '王会计', role: 'finance', status: '停用', note: '演示停用账号登录被拒绝' }
];

export const findAdminDemoAccount = (account) => {
  const value = String(account || '').trim().toLowerCase();
  return adminDemoAccounts.find((item) => item.account.toLowerCase() === value) || null;
};

export function readAdminSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || 'null');
    if (!session || typeof session !== 'object') return null;
    if (!session.account || !ADMIN_ROLE_LABELS[session.role]) return null;
    return session;
  } catch {
    return null;
  }
}

export function writeAdminSession({ account, role, name }) {
  const session = { account, role, name, roleLabel: ADMIN_ROLE_LABELS[role] || '', loginAt: new Date().toISOString() };
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch { /* 隐私模式下写入失败时按未登录处理。 */ }
  return session;
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch { /* 忽略：无存储权限时本就没有登录态。 */ }
}
