import { toCanonicalCourseId } from './course-seed.js';
import { DEMO_NOW } from './demo-clock.js';

const STORAGE_KEY = 'hbyx-iteration1-demo-v1';
// v2 (CR-2026-003 / I1-DEC-19): retire the legacy parallel course numbering; demo data restarts from seed.
const SCHEMA_VERSION = 2;

// I1-DEF-008: data written before I1-DEC-19 still points at the retired course numbering, which made
// products unresolvable (学员端视频课程 0 门、后台关联课程为空) on any browser with history. Rewriting the
// course references on read keeps those browsers usable without asking reviewers to clear localStorage.
const COURSE_REFERENCE_COLLECTIONS = ['courses', 'library', 'products', 'classes', 'orders', 'applications', 'videoEntitlements'];

function migrateCourseReferences(state) {
  let changed = false;
  COURSE_REFERENCE_COLLECTIONS.forEach(collection => {
    (state[collection] || []).forEach(record => {
      if (!record || typeof record !== 'object') return;
      ['courseId', 'sourceCourseId'].forEach(field => {
        const canonical = toCanonicalCourseId(record[field]);
        if (canonical === record[field]) return;
        record[field] = canonical;
        changed = true;
      });
      if (collection !== 'courses') return;
      const canonicalId = toCanonicalCourseId(record.id);
      if (canonicalId === record.id) return;
      record.id = canonicalId;
      changed = true;
    });
  });
  return changed;
}

function migrateLightweightCourseArrangeStatus(state) {
  let changed = false;
  (state.library || []).forEach(record => {
    if (!record || record.archive !== '轻量课程档案' || !Object.prototype.hasOwnProperty.call(record, 'status')) return;
    delete record.status;
    changed = true;
  });
  return changed;
}

// CR-2026-020 兼容：旧版本把运营四字段存在课程档案（library）上，
// 现在按课程下发给已存在的商品与班级作为初值；已有值的售卖单元不被覆盖。
const SALE_UNIT_DISPLAY_KEYS = ['cover', 'coverFile', 'displayDetail', 'tags', 'recommendation'];
function migrateCourseDisplayToSaleUnits(state) {
  let changed = false;
  const legacy = (state.library || []).filter((row) => row && typeof row === 'object');
  const copyDown = (record, courseId) => {
    const source = [...legacy].reverse().find((row) => toCanonicalCourseId(row.sourceCourseId) === toCanonicalCourseId(courseId));
    if (!source) return;
    if (!record.cover && source.cover) { record.cover = source.cover; changed = true; }
    if (!record.coverFile && source.coverFile) { record.coverFile = source.coverFile; changed = true; }
    if (!record.displayDetail && source.detail) { record.displayDetail = source.detail; changed = true; }
    if (!record.tags && source.tags) { record.tags = source.tags; changed = true; }
    if (!record.recommendation && source.recommendation) { record.recommendation = source.recommendation; changed = true; }
  };
  (state.products || []).forEach((record) => { if (record && typeof record === 'object') copyDown(record, record.courseId); });
  (state.classes || []).forEach((record) => { if (record && typeof record === 'object') copyDown(record, record.courseId || record.id); });
  return changed;
}

function migrateCourseApplicationStatusLabel(state) {
  let changed = false;
  (state.applications || []).forEach(record => {
    if (!record || record.status !== '审核中') return;
    record.status = '待审核';
    changed = true;
  });
  return changed;
}

const clone = value => JSON.parse(JSON.stringify(value));
const defaultState = () => ({
  schemaVersion: SCHEMA_VERSION,
  accounts: [
    { id: 'account-001', name: '演示家长A', phone: '138****2026' },
    { id: 'account-002', name: '演示家长B', phone: '139****2027' }
  ],
  currentAccountId: 'account-001',
  students: [
    { id: 'student-001', accountId: 'account-001', name: '林知夏', gender: '女', birthMonth: '2017-05', relation: '女儿' },
    { id: 'student-002', accountId: 'account-001', name: '林知远', gender: '男', birthMonth: '2015-10', relation: '儿子' },
    { id: 'student-101', accountId: 'account-002', name: '周予安', gender: '女', birthMonth: '2016-06', relation: '女儿' }
  ],
  applications: [],
  courses: [],
  resources: [],
  library: [],
  products: [],
  featuredTeacherIds: ['teacher-wang', 'teacher-chen'],
  // CR-2026-022：教师本人在教师端维护的档案字段与变更审计（后台教师详情页读取展示）。
  teacherProfiles: {},
  teacherProfileAudit: [],
  classes: [],
  orders: [],
  // P0-1: one demo enrollment record so the admin class roster has a real detail row to show.
  enrollments: [
    { id: 'account-002-student-101-class-001', accountId: 'account-002', studentId: 'student-101', classId: 'class-001', status: '已分班', enrolledAt: '2026-08-22 10:05' }
  ],
  videoEntitlements: [],
  progress: {},
  // CR-2026-052：视频退款规则由后台参数配置，客户端与财务端读取同一份演示状态。
  videoRefundSettings: { windowDays: 7, maxLessons: 3 }
});

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored) return defaultState();
    // Only a *newer/older declared* schema is discarded. Payloads written by hand (e.g. a tester switching
    // currentAccountId from the console) carry no schemaVersion and are migrated instead of silently reset,
    // otherwise demo-account isolation checks appear to fail.
    if (stored.schemaVersion && stored.schemaVersion !== SCHEMA_VERSION) return defaultState();
    const base = defaultState();
    const merged = { ...base, ...stored, schemaVersion: SCHEMA_VERSION, accounts: stored.accounts || base.accounts, students: stored.students || base.students };
    // The repaired payload is written back once so the migrated ids are what the browser actually holds.
    const courseReferencesMigrated = migrateCourseReferences(merged);
    const arrangeStatusMigrated = migrateLightweightCourseArrangeStatus(merged);
    const applicationStatusMigrated = migrateCourseApplicationStatusLabel(merged);
    const displayMigrated = migrateCourseDisplayToSaleUnits(merged);
    if (courseReferencesMigrated || arrangeStatusMigrated || applicationStatusMigrated || displayMigrated) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* private mode: in-memory migration still applies. */ }
    }
    return merged;
  } catch {
    return defaultState();
  }
}

let state = readStored();

function save(next) {
  state = { ...next, schemaVersion: SCHEMA_VERSION };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('hbyx-demo-state-change', { detail: clone(state) }));
  return state;
}

export function readDemoState() {
  state = readStored();
  return state;
}

export function videoRefundSettings() {
  const settings = readStored().videoRefundSettings || {};
  return {
    // CR-2026-052：退款时间窗口是固定业务规则，只有观看课时上限允许后台配置。
    windowDays: 7,
    maxLessons: Math.max(0, Number(settings.maxLessons ?? 3))
  };
}

export function writeDemoState(mutator) {
  const next = clone(readStored());
  const result = mutator(next) || next;
  return save(result);
}

export function getCurrentAccountId() {
  return readStored().currentAccountId || 'account-001';
}

export function setCurrentAccountId(accountId) {
  const source = readStored();
  if (!source.accounts.some(account => account.id === accountId)) return source;
  return save({ ...source, currentAccountId: accountId });
}

export function accountStudents(accountId = getCurrentAccountId()) {
  return readStored().students.filter(student => student.accountId === accountId);
}

export function demoId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function demoTime() {
  return DEMO_NOW;
}

export function upsertDemoRecord(collection, record) {
  return writeDemoState(next => {
    const rows = Array.isArray(next[collection]) ? next[collection] : [];
    const index = rows.findIndex(item => item.id === record.id);
    if (index < 0) rows.unshift(clone(record));
    else rows[index] = { ...rows[index], ...clone(record) };
    next[collection] = rows;
    return next;
  });
}

export function updateDemoRecord(collection, id, patch) {
  return writeDemoState(next => {
    const rows = Array.isArray(next[collection]) ? next[collection] : [];
    const item = rows.find(row => row.id === id);
    if (item) Object.assign(item, typeof patch === 'function' ? patch(item) : patch);
    next[collection] = rows;
    return next;
  });
}

export function removeDemoRecord(collection, id) {
  return writeDemoState(next => {
    next[collection] = (next[collection] || []).filter(item => item.id !== id);
    return next;
  });
}

// 视频学习授权状态迁移，对应字典 SM-VIDEO-ENTITLEMENT：
// 退款审核期间「冻结」，退款失败或超时「解冻」（回到生效），退款完成置「已失效」。
// 记录一律保留并写入时间、原因与来源单号，用于按订单凭证追溯；不删除历史授权。
export function transitionVideoEntitlement(accountId, courseId, nextStatus, meta = {}) {
  if (!accountId || !courseId || !nextStatus) return false;
  let hit = false;
  writeDemoState(next => {
    const rows = Array.isArray(next.videoEntitlements) ? next.videoEntitlements : [];
    const target = rows.find(item => item.accountId === accountId && item.courseId === courseId);
    if (!target) return next;
    hit = true;
    const at = meta.at || demoTime();
    target.status = nextStatus;
    target.updatedAt = at;
    if (nextStatus === '冻结') {
      target.frozenAt = at;
      target.frozenReason = meta.reason || '';
      target.freezeRefundKey = meta.refundKey || '';
    } else if (nextStatus === '生效') {
      target.restoredAt = at;
      target.restoreReason = meta.reason || '';
      target.frozenAt = '';
      target.frozenReason = '';
      target.freezeRefundKey = '';
    } else if (nextStatus === '已失效') {
      target.invalidatedAt = at;
      target.invalidReason = meta.reason || '';
      target.invalidatedBy = meta.operator || '系统';
      target.invalidOrderId = meta.orderId || '';
      target.frozenAt = '';
      target.frozenReason = '';
      target.freezeRefundKey = '';
    }
    next.videoEntitlements = rows;
    return next;
  });
  return hit;
}

export function resetDemoData() {
  // I1-DEF-008: 学员端 keeps its own per-tab demo cache, so "恢复初始数据" has to clear it as well or a
  // reset browser would still merge stale course and order copies back in.
  try {
    sessionStorage.removeItem('hbyx-mini-learner-demo');
  } catch { /* storage may be unavailable; the shared store reset still applies. */ }
  return save(defaultState());
}

export function subscribeDemoState(callback) {
  const onStorage = event => {
    if (event.key === STORAGE_KEY) callback(readDemoState());
  };
  const onCustom = event => callback(event.detail || readDemoState());
  window.addEventListener('storage', onStorage);
  window.addEventListener('hbyx-demo-state-change', onCustom);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('hbyx-demo-state-change', onCustom);
  };
}

// Demo helper for reviewers: switch the acting account or reset the store without hand-editing
// localStorage (a partial setItem would drop products, orders and entitlements along with it).
if (typeof window !== 'undefined') {
  window.demoStore = {
    read: () => readDemoState(),
    setAccount: accountId => setCurrentAccountId(accountId),
    reset: () => resetDemoData(),
    key: STORAGE_KEY
  };
}
