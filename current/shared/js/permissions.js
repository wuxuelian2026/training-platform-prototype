// CR-2026-027：后台权限点与数据范围（单一事实源）。
//
// 权限由「角色权限管理」页面的勾选决定，PRD 里的五个角色只是**预置初始数据**，
// 不是强制限制：菜单可见性、按钮可见性与数据范围全部读取本文件的权限点，不再按角色名判断。
//
// 编号规则：PERM-<模块>-<三位序号>；每个权限点包含所属模块、业务对象、动作、可配置的数据范围与说明。
export const DATA_SCOPES = [
  { key: 'all', label: '全部', note: '不限制，覆盖全部数据' },
  { key: 'campus', label: '指定校区', note: '仅可操作所选校区的数据，可多选', multi: true },
  { key: 'major', label: '指定专业', note: '仅可操作所选专业（含其下级分类）的数据，可多选', multi: true },
  { key: 'self', label: '仅本人', note: '仅可操作与本人关联的数据' }
];

const ALL = ['all', 'campus', 'major', 'self'];
const VIEW = ['all', 'campus', 'major', 'self'];
const MANAGE = ['all', 'campus', 'major', 'self'];
const TEACHING = ['all', 'campus', 'major'];
const SYSTEM = ['all'];

export const PERMISSION_POINTS = [
  { id: 'PERM-WORKBENCH-001', module: '工作台', object: '我的待办', action: '查看', scopes: ['all', 'self'], note: '查看本人待办（迭代2工作台承接全部待办类型）' },
  { id: 'PERM-TEACHER-001', module: '师资中心', object: '教师', action: '查看', scopes: VIEW, note: '查看教师列表、详情、证书与合同摘要' },
  { id: 'PERM-TEACHER-002', module: '师资中心', object: '教师档案', action: '档案维护', scopes: MANAGE, note: '新增、编辑教师档案；保存草稿与完成建档' },
  { id: 'PERM-TEACHER-003', module: '师资中心', object: '教师导入', action: '教师导入', scopes: MANAGE, note: '批量导入、校验与确认导入' },
  { id: 'PERM-TEACHER-004', module: '师资中心', object: '教师证书', action: '证书录入', scopes: MANAGE, note: '新增录入教师证书；录入后状态为已通过（与证书审核独立授权）' },
  { id: 'PERM-TEACHER-005', module: '师资中心', object: '教师证书', action: '证书审核', scopes: MANAGE, note: '审核教师上传的证书；驳回需填原因' },
  { id: 'PERM-TEACHER-006', module: '师资中心', object: '教师合同', action: '合同管理', scopes: MANAGE, note: '创建并推送合同、学校签署、续签、终止' },
  { id: 'PERM-TEACHER-007', module: '师资中心', object: '名师推荐', action: '名师推荐', scopes: MANAGE, note: '切换学员端名师推荐位' },
  { id: 'PERM-COURSE-001', module: '课程中心', object: '课程申报', action: '查看', scopes: TEACHING, note: '查看课程申报列表与详情' },
  { id: 'PERM-COURSE-002', module: '课程中心', object: '课程申报', action: '申报审核', scopes: TEACHING, note: '审批课程申报；驳回需填原因' },
  { id: 'PERM-COURSE-003', module: '课程中心', object: '课程库', action: '内容编排与版本', scopes: TEACHING, note: '内容编排、课程档案编辑、版本与历史版本' },
  { id: 'PERM-COURSE-004', module: '课程中心', object: '教学资源', action: '资源管理', scopes: TEACHING, note: '上传、编辑、删除教学资源' },
  { id: 'PERM-COURSE-005', module: '课程中心', object: '专业目录', action: '目录维护', scopes: SYSTEM, note: '门类、分类与专业的维护与启停' },
  { id: 'PERM-MALL-001', module: '商城运营', object: '视频商品', action: '查看', scopes: VIEW, note: '查看视频课程商品列表与详情' },
  { id: 'PERM-MALL-002', module: '商城运营', object: '视频商品', action: '发布与上下架', scopes: MANAGE, note: '发布商品、改价、上架与下架' },
  { id: 'PERM-MALL-003', module: '商城运营', object: '订单', action: '订单查看', scopes: VIEW, note: '查看统一订单列表与订单详情' },
  { id: 'PERM-MALL-004', module: '商城运营', object: '轮播图', action: '轮播管理', scopes: SYSTEM, note: '新增、编辑、排序与启停轮播图' },
  { id: 'PERM-MALL-005', module: '商城运营', object: '协议', action: '协议管理', scopes: SYSTEM, note: '维护关于我们、用户协议与隐私政策正文' },
  { id: 'PERM-CRM-001', module: '面授运营', object: '班级', action: '查看', scopes: TEACHING, note: '查看面授班级列表与详情' },
  { id: 'PERM-CRM-002', module: '面授运营', object: '班级', action: '发布与上下架', scopes: TEACHING, note: '发布班级、定价与报名窗口、上下架' },
  { id: 'PERM-CRM-003', module: '面授运营', object: '批次', action: '批次管理', scopes: TEACHING, note: '维护招生批次与班级归属' },
  { id: 'PERM-CRM-004', module: 'CRM管理', object: '试听', action: '试听登记', scopes: TEACHING, note: '登记试听、确认与试听结果' },
  { id: 'PERM-CRM-005', module: 'CRM管理', object: '线索', action: '线索跟进', scopes: ['all', 'campus', 'self'], note: '跟进线索、记录沟通与下次跟进' },
  { id: 'PERM-CRM-006', module: 'CRM管理', object: '报名转化', action: '转化登记', scopes: ['all', 'campus', 'self'], note: '登记报名转化结果' },
  { id: 'PERM-INVENTORY-001', module: '物资中心', object: '物资分类', action: '分类管理', scopes: SYSTEM, note: '维护物资分类与启停' },
  { id: 'PERM-INVENTORY-002', module: '物资中心', object: '物资', action: '物资管理', scopes: TEACHING, note: '新增与编辑物资档案' },
  { id: 'PERM-INVENTORY-003', module: '物资中心', object: '出入库', action: '出入库登记', scopes: TEACHING, note: '入库与出库登记' },
  { id: 'PERM-INVENTORY-004', module: '物资中心', object: '库存台账', action: '台账导出', scopes: TEACHING, note: '查看库存台账并导出' },
  { id: 'PERM-ACADEMIC-001', module: '面授运营', object: '场地', action: '场地管理', scopes: TEACHING, note: '场地档案维护与批量导入' },
  { id: 'PERM-ACADEMIC-002', module: '面授运营', object: '排班', action: '排班管理', scopes: TEACHING, note: '从面授班级待排课入口创建排班、保存草稿与发布' },
  { id: 'PERM-ACADEMIC-003', module: '面授运营', object: '课表', action: '课表管理', scopes: TEACHING, note: '课表矩阵查看与导出' },
  { id: 'PERM-ACADEMIC-004', module: '教务执行监管', object: '考勤', action: '考勤监控', scopes: TEACHING, note: '查看与处理课次考勤' },
  { id: 'PERM-ACADEMIC-005', module: '教务执行监管', object: '作业', action: '作业批阅监管', scopes: TEACHING, note: '查看与督办作业批阅' },
  { id: 'PERM-ACADEMIC-006', module: '教务执行监管', object: '消息', action: '消息推送', scopes: TEACHING, note: '发送班级通知与补发失败通知' },
  { id: 'PERM-ACADEMIC-007', module: '教务执行监管', object: '结业', action: '结业审核', scopes: TEACHING, note: '按学员复核结业结果' },
  { id: 'PERM-ACADEMIC-008', module: '教务执行监管', object: '学习报告', action: '报告管理', scopes: TEACHING, note: '生成、发布、撤回与删除学习报告' },
  { id: 'PERM-FINANCE-001', module: '财务中心', object: '教师工资', action: '工资管理', scopes: TEACHING, note: '生成与发布教师工资单' },
  { id: 'PERM-FINANCE-002', module: '财务中心', object: '收款', action: '收款记录', scopes: TEACHING, note: '查看收款流水与到账状态' },
  { id: 'PERM-FINANCE-003', module: '财务中心', object: '退款', action: '退款记录', scopes: TEACHING, note: '查看退款流水与处理结果' },
  { id: 'PERM-SYSTEM-001', module: '系统管理', object: '后台用户', action: '后台用户管理', scopes: SYSTEM, note: '新增、编辑、启停与重置后台用户' },
  { id: 'PERM-SYSTEM-002', module: '系统管理', object: '学员用户', action: '学员用户管理', scopes: TEACHING, note: '查看学员账号与关系、启停学员账号' },
  { id: 'PERM-SYSTEM-003', module: '系统管理', object: '角色权限', action: '角色权限管理', scopes: SYSTEM, note: '维护角色、权限点与数据范围' },
  { id: 'PERM-SYSTEM-004', module: '系统管理', object: '参数配置', action: '参数配置', scopes: SYSTEM, note: '维护平台参数与开关' }
];

// 预置角色：仅初始数据，等价于当前演示账号的可见性，可由角色表格勾选自由调整。
const ALL_PERMISSIONS = PERMISSION_POINTS.map((item) => item.id);
// 预置角色初始勾选与原型既有可见性保持一致（避免演示账号突然少菜单／少按钮）：
// 学员用户��理、教师导入、名师推荐三项在当前实现里只对平台管理员与教务主管开放。
const RESTRICTED_POINTS = ['PERM-SYSTEM-002', 'PERM-TEACHER-003', 'PERM-TEACHER-007'];
const BASELINE_ROLE = ALL_PERMISSIONS.filter((id) => !RESTRICTED_POINTS.includes(id));
export const ROLE_PRESETS = [
  { key: 'super_admin', name: '超级管理员', description: '全局配置、系统运维（预置初始数据）', permissions: ALL_PERMISSIONS },
  { key: 'research_lead', name: '教研主管', description: '课程质量、教师资质审核（预置初始数据）', permissions: BASELINE_ROLE },
  { key: 'academic_lead', name: '教务主管', description: '教学调度、教务执行、物资管理（预置初始数据）', permissions: ALL_PERMISSIONS },
  { key: 'course_consultant', name: '课程顾问', description: '客户跟进与销售转化（预置初始数据）', permissions: BASELINE_ROLE },
  { key: 'finance', name: '财务', description: '财务核算与对账（预置初始数据）', permissions: BASELINE_ROLE }
];

export const permissionPointsByModule = () => {
  const grouped = new Map();
  PERMISSION_POINTS.forEach((point) => {
    if (!grouped.has(point.module)) grouped.set(point.module, []);
    grouped.get(point.module).push(point);
  });
  return [...grouped.entries()].map(([module, points]) => ({ module, points }));
};

export const permissionById = (id) => PERMISSION_POINTS.find((item) => item.id === id) || null;
export const scopeLabels = (point) => (point?.scopes || ['all']).map((key) => DATA_SCOPES.find((scope) => scope.key === key)?.label || key);
export const rolePreset = (roleKey) => ROLE_PRESETS.find((item) => item.key === roleKey) || null;
export const permissionsOfRole = (roleKey) => rolePreset(roleKey)?.permissions || [];
export const roleHasPermission = (roleKey, permissionId) => permissionsOfRole(roleKey).includes(permissionId);

// 页面 → 访问所需权限点：缺失时由后台壳层渲染统一的「暂无权限」空态。
export const ADMIN_PAGE_PERMISSIONS = {
  '/admin/pages/teachers/list.html': ['PERM-TEACHER-001'],
  '/admin/pages/teachers/create.html': ['PERM-TEACHER-002'],
  '/admin/pages/teachers/profile.html': ['PERM-TEACHER-001'],
  '/admin/pages/teachers/certificates.html': ['PERM-TEACHER-001'],
  '/admin/pages/teachers/contracts.html': ['PERM-TEACHER-001'],
  '/admin/pages/courses/applications.html': ['PERM-COURSE-001'],
  '/admin/pages/courses/application-review.html': ['PERM-COURSE-002'],
  '/admin/pages/courses/library.html': ['PERM-COURSE-003'],
  '/admin/pages/courses/resources.html': ['PERM-COURSE-004'],
  '/admin/pages/courses/catalog.html': ['PERM-COURSE-005'],
  '/admin/pages/mall/products.html': ['PERM-MALL-001'],
  '/admin/pages/mall/orders.html': ['PERM-MALL-003'],
  '/admin/pages/mall/banners.html': ['PERM-MALL-004'],
  '/admin/pages/mall/agreements.html': ['PERM-MALL-005'],
  '/admin/pages/crm/classes.html': ['PERM-CRM-001'],
  '/admin/pages/crm/batches.html': ['PERM-CRM-003'],
  '/admin/pages/crm/trials.html': ['PERM-CRM-004'],
  '/admin/pages/crm/leads.html': ['PERM-CRM-005'],
  '/admin/pages/crm/conversions.html': ['PERM-CRM-006'],
  '/admin/pages/inventory/categories.html': ['PERM-INVENTORY-001'],
  '/admin/pages/inventory/materials.html': ['PERM-INVENTORY-002'],
  '/admin/pages/inventory/stock-in.html': ['PERM-INVENTORY-003'],
  '/admin/pages/inventory/stock-out.html': ['PERM-INVENTORY-003'],
  '/admin/pages/inventory/ledger.html': ['PERM-INVENTORY-004'],
  '/admin/pages/academic/venues.html': ['PERM-ACADEMIC-001'],
  '/admin/pages/academic/scheduling.html': ['PERM-ACADEMIC-002'],
  '/admin/pages/academic/timetable.html': ['PERM-ACADEMIC-003'],
  '/admin/pages/academic/attendance.html': ['PERM-ACADEMIC-004'],
  '/admin/pages/academic/homework.html': ['PERM-ACADEMIC-005'],
  '/admin/pages/academic/messages.html': ['PERM-ACADEMIC-006'],
  '/admin/pages/academic/graduation.html': ['PERM-ACADEMIC-007'],
  '/admin/pages/academic/reports.html': ['PERM-ACADEMIC-008'],
  '/admin/pages/finance/salary.html': ['PERM-FINANCE-001'],
  '/admin/pages/finance/payments.html': ['PERM-FINANCE-002'],
  '/admin/pages/finance/refunds.html': ['PERM-FINANCE-003'],
  '/admin/pages/system/users.html': ['PERM-SYSTEM-001'],
  '/admin/pages/system/student-users.html': ['PERM-SYSTEM-002'],
  '/admin/pages/system/roles.html': ['PERM-SYSTEM-003'],
  '/admin/pages/system/settings.html': ['PERM-SYSTEM-004']
};

export const pagePermissionState = (pathname, roleKey) => {
  const required = ADMIN_PAGE_PERMISSIONS[pathname] || [];
  const missing = required.filter((id) => !roleHasPermission(roleKey, id));
  return { required, missing, allowed: missing.length === 0 };
};

// 按钮级门禁：页面里标记 data-perm="PERM-…" 的控件在缺少权限时隐藏并禁用。
export const applyPermissionGates = (roleKey, scope = document) => {
  let hidden = 0;
  scope.querySelectorAll?.('[data-perm]').forEach((element) => {
    const ids = String(element.dataset.perm || '').split(/\s+/).filter(Boolean);
    const allowed = ids.every((id) => roleHasPermission(roleKey, id));
    if (allowed) { element.hidden = false; element.removeAttribute('aria-disabled'); if (element.dataset.permDisabled === '1') { element.disabled = false; delete element.dataset.permDisabled; } return; }
    element.hidden = true;
    if ('disabled' in element) { element.disabled = true; element.dataset.permDisabled = '1'; }
    element.setAttribute('aria-disabled', 'true');
    hidden += 1;
  });
  return hidden;
};
