import { toCanonicalCourseId } from './course-seed.js';
import { DEMO_NOW } from './demo-clock.js';

const STORAGE_KEY = 'hbyx-iteration1-demo-v1';
// v2 (CR-2026-003 / I1-DEC-19): retire the legacy parallel course numbering; demo data restarts from seed.
const SCHEMA_VERSION = 2;
// CR-2026-054：仅清理本轮已经废弃的固定班级演示记录，不重置用户后来新建的班级。
const LEGACY_CLASS_DEMO_IDS = new Set(['class-001', 'class-002', 'class-003', 'class-004']);
const TEACHING_DEMO_CLASS_IDS = ['pending', 'teaching', 'finished'].flatMap(stage =>
  [1, 2, 3].map(index => `class-mock-ended-${stage}-${String(index).padStart(2, '0')}`)
);
const teachingDemoOrders = () => TEACHING_DEMO_CLASS_IDS.map((classId, index) => ({
  id: `OD20260921${String(index + 1).padStart(4, '0')}`,
  accountId: 'account-001', studentId: 'student-001', courseId: 'COURSE-CR-2026-0001', classId,
  courseName: '舞蹈基本功', amount: 1680, status: '已支付',
  createdAt: `2026-09-${String(1 + index).padStart(2, '0')} 10:00`
}));
const teachingDemoEnrollments = () => TEACHING_DEMO_CLASS_IDS.map((classId, index) => ({
  id: `account-001-student-001-${classId}`,
  accountId: 'account-001', studentId: 'student-001', classId, status: '已分班',
  enrolledAt: `2026-09-${String(1 + index).padStart(2, '0')} 10:01`
}));
// CR-2026-099：同一学员同时报名「招生中」与「待开课」两个班（15:00–16:30 与 14:45–16:15 重叠），
// 用于演示课表里的学员时间冲突提示；该组不产生订单，避免影响交易中心演示数据。
const ENROLLING_DEMO_CLASS_IDS = ['class-mock-enrolling-01', 'class-mock-enrolling-02', 'class-mock-enrolling-03'];
const enrollingDemoEnrollments = () => ENROLLING_DEMO_CLASS_IDS.map((classId) => ({
  id: `account-001-student-001-${classId}`,
  accountId: 'account-001', studentId: 'student-001', classId, status: '已分班',
  enrolledAt: '2026-09-12 09:30'
}));

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

function migrateLegacyClassDemoData(state) {
  let changed = false;
  const hasLegacyClassId = (record) => LEGACY_CLASS_DEMO_IDS.has(record?.classId) || LEGACY_CLASS_DEMO_IDS.has(record?.id);
  ['classes', 'enrollments'].forEach(collection => {
    if (!Array.isArray(state[collection])) return;
    const filtered = state[collection].filter(record => !hasLegacyClassId(record));
    if (filtered.length !== state[collection].length) {
      state[collection] = filtered;
      changed = true;
    }
  });
  return changed;
}

function migrateTeachingDemoLinks(state) {
  let changed = false;
  const appendMissing = (collection, records) => {
    const rows = Array.isArray(state[collection]) ? state[collection] : [];
    records.forEach(record => {
      if (rows.some(item => item.id === record.id)) return;
      rows.push(record);
      changed = true;
    });
    state[collection] = rows;
  };
  appendMissing('orders', teachingDemoOrders());
  appendMissing('enrollments', [...teachingDemoEnrollments(), ...enrollingDemoEnrollments()]);
  return changed;
}

const clone = value => JSON.parse(JSON.stringify(value));

// CR-2026-103：课时时长由「参数配置」迁到「数据字典」。
// 旧版本把选项与默认值写在 lessonDurationSettings，迁移时并入 dataDictionary.lesson_duration，
// 迁完删除旧字段，避免两处各存一份。
function migrateLessonDurationToDictionary(state) {
  const legacy = state.lessonDurationSettings;
  const dictionary = state.dataDictionary || (state.dataDictionary = {});
  const hasLessonDuration = Array.isArray(dictionary.lesson_duration?.items) && dictionary.lesson_duration.items.length;
  if (!legacy || hasLessonDuration) {
    if (!legacy) return false;
    delete state.lessonDurationSettings;
    return true;
  }
  const options = [...new Set((Array.isArray(legacy.options) ? legacy.options : [])
    .map((value) => Math.round(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b);
  const preferred = Math.round(Number(legacy.defaultMinutes));
  dictionary.lesson_duration = {
    ...DICTIONARY_FALLBACK.lesson_duration,
    items: options.length ? options : DICTIONARY_FALLBACK.lesson_duration.items,
  };
  dictionary.lesson_duration.defaultItem = dictionary.lesson_duration.items.includes(preferred) ? preferred : dictionary.lesson_duration.items[0];
  delete state.lessonDurationSettings;
  return true;
}

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
  campuses: [],
  buildings: [],
  venues: [],
  classes: [],
  orders: teachingDemoOrders(),
  enrollments: [...teachingDemoEnrollments(), ...enrollingDemoEnrollments()],
  videoEntitlements: [],
  progress: {},
  // CR-2026-052：视频退款规则由后台参数配置，客户端与财务端读取同一份演示状态。
  videoRefundSettings: { windowDays: 7, maxLessons: 3 },
  // CR-2026-104：待支付订单支付时限由「参数配置」维护（默认 30 分钟）。
  orderSettings: { paymentTimeoutMinutes: 30 },
  // CR-2026-104：文件上传规格由「参数配置」维护（图片／文档／视频 MB，教学资源库 GB）。
  fileSpecSettings: { imageMb: 10, documentMb: 50, videoMb: 500, resourceGb: 100 },
  // CR-2026-104：消息失败重试策略由「参数配置」维护（次数 + 间隔分钟序列）。
  messageRetrySettings: { maxAttempts: 3, intervalsMinutes: [5, 30, 120] },
  // CR-2026-083：合同签署截止期限由后台参数配置，默认推送后 7 天，两端读取同一份配置。
  contractSettings: { signDeadlineDays: 7 },
  // CR-2026-102：排课策略参数（教师转场最小间隔、跨校区额外预留）由「参数配置」维护。
  timetableSettings: { transferGapMinutes: 30, crossCampusExtraMinutes: 15 },
  // CR-2026-103：业务枚举统一由「系统管理 → 数据字典」按字典类型维护；
  // 难度等级、适合年龄、课时类型、课时时长都在这里定义，页面与接口不得写死选项。
  // kind=number 的字典项为数值（去重升序），并用 defaultItem 指定默认值。
  dataDictionary: {
    course_difficulty: { label: '难度等级', kind: 'text', items: ['启蒙', '初级', '中级', '高级', '考级冲刺'] },
    suitable_age: { label: '适合年龄', kind: 'text', items: ['全年龄段', '少儿', '青少年', '成人'] },
    lesson_kind: { label: '课时类型', kind: 'text', items: ['理论', '示范', '练习', '综合'] },
    lesson_duration: { label: '课时时长', kind: 'number', unit: '分钟', items: [45, 60, 90, 120, 150], defaultItem: 45 }
  }
});

// 字典兜底：本地存储由旧版本写入时补齐缺失字典类型，避免页面读到空字典。
const DICTIONARY_FALLBACK = {
  course_difficulty: { label: '难度等级', kind: 'text', items: ['启蒙', '初级', '中级', '高级', '考级冲刺'] },
  suitable_age: { label: '适合年龄', kind: 'text', items: ['全年龄段', '少儿', '青少年', '成人'] },
  lesson_kind: { label: '课时类型', kind: 'text', items: ['理论', '示范', '练习', '综合'] },
  lesson_duration: { label: '课时时长', kind: 'number', unit: '分钟', items: [45, 60, 90, 120, 150], defaultItem: 45 }
};

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored) return defaultState();
    // Only a *newer/older declared* schema is discarded. Payloads written by hand (e.g. a tester switching
    // currentAccountId from the console) carry no schemaVersion and are migrated instead of silently reset,
    // otherwise demo-account isolation checks appear to fail.
    if (stored.schemaVersion && stored.schemaVersion !== SCHEMA_VERSION) return defaultState();
    // CR-2026-103：课时时长由「参数配置」迁到「数据字典」——必须在与默认值合并之前迁移，
    // 否则默认字典会先填满 dataDictionary，旧配置被静默丢弃。
    const lessonDurationMigrated = migrateLessonDurationToDictionary(stored);
    const base = defaultState();
    const merged = { ...base, ...stored, schemaVersion: SCHEMA_VERSION, accounts: stored.accounts || base.accounts, students: stored.students || base.students };
    // The repaired payload is written back once so the migrated ids are what the browser actually holds.
    const courseReferencesMigrated = migrateCourseReferences(merged);
    const arrangeStatusMigrated = migrateLightweightCourseArrangeStatus(merged);
    const applicationStatusMigrated = migrateCourseApplicationStatusLabel(merged);
    const displayMigrated = migrateCourseDisplayToSaleUnits(merged);
    const legacyClassDemoMigrated = migrateLegacyClassDemoData(merged);
    const teachingDemoLinksMigrated = migrateTeachingDemoLinks(merged);
    if (courseReferencesMigrated || arrangeStatusMigrated || applicationStatusMigrated || displayMigrated || legacyClassDemoMigrated || teachingDemoLinksMigrated || lessonDurationMigrated) {
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

const clampInt = (value, min, max, fallback) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

// CR-2026-052 / CR-2026-104：视频退款规则由后台参数配置维护——
// 退款申请窗口（自然日，1–30，默认 7）与最多观看课时数（0–999，默认 3）都可配置，
// 学员端资格校验与后台线下登记读取同一份配置。
export function videoRefundSettings() {
  const settings = readStored().videoRefundSettings || {};
  return {
    windowDays: clampInt(settings.windowDays ?? 7, 1, 30, 7),
    maxLessons: clampInt(settings.maxLessons ?? 3, 0, 999, 3)
  };
}

// CR-2026-104：待支付订单支付时限由「参数配置」维护，默认 30 分钟（1–1440）。
export function paymentTimeoutSettings() {
  const settings = readStored().orderSettings || {};
  return { paymentTimeoutMinutes: clampInt(settings.paymentTimeoutMinutes ?? 30, 1, 1440, 30) };
}

// CR-2026-104：文件上传规格由「参数配置」维护，上传校验、提示文案与后台上传入口读取同一份配置。
export function fileSpecSettings() {
  const settings = readStored().fileSpecSettings || {};
  return {
    imageMb: clampInt(settings.imageMb ?? 10, 1, 1024, 10),
    documentMb: clampInt(settings.documentMb ?? 50, 1, 1024, 50),
    videoMb: clampInt(settings.videoMb ?? 500, 1, 10240, 500),
    resourceGb: clampInt(settings.resourceGb ?? 100, 1, 10240, 100)
  };
}

// CR-2026-104：消息失败重试策略由「参数配置」维护，最多重试 1–5 次，间隔为分钟序列（升序去重）。
export function messageRetrySettings() {
  const settings = readStored().messageRetrySettings || {};
  const intervals = [...new Set((Array.isArray(settings.intervalsMinutes) ? settings.intervalsMinutes : [])
    .map((value) => Math.round(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 1440))].sort((a, b) => a - b);
  return {
    maxAttempts: clampInt(settings.maxAttempts ?? 3, 1, 5, 3),
    intervalsMinutes: intervals.length ? intervals : [5, 30, 120]
  };
}

// CR-2026-083：合同签署截止期限由后台「参数配置」维护，默认 7 天，取值范围 1–30 天。
export function contractSettings() {
  const settings = readStored().contractSettings || {};
  const days = Math.round(Number(settings.signDeadlineDays ?? 7));
  return { signDeadlineDays: Number.isFinite(days) ? Math.min(30, Math.max(1, days)) : 7 };
}

// CR-2026-100：课时时长字典由「系统管理 → 参数配置」维护，读取时按正整数去重升序兜底。
// CR-2026-102：排课策略参数读取时按范围兜底：转场最小间隔 1–120 分钟、跨校区额外预留 0–120 分钟。
export function timetableSettings() {
  const settings = readStored().timetableSettings || {};
  const clamp = (value, min, max, fallback) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  return {
    transferGapMinutes: clamp(settings.transferGapMinutes ?? 30, 1, 120, 30),
    crossCampusExtraMinutes: clamp(settings.crossCampusExtraMinutes ?? 15, 0, 120, 15)
  };
}
// CR-2026-103：数据字典读取与归一化。数值型字典（课时时长）按正整数去重升序，
// 文本型字典保持维护顺序并去重；默认项缺失或越界时回落到首项。
function normalizeDictionaryEntry(type, entry) {
  const fallback = DICTIONARY_FALLBACK[type] || { label: type, kind: 'text', items: [] };
  const kind = entry?.kind || fallback.kind;
  const raw = Array.isArray(entry?.items) ? entry.items : fallback.items;
  const items = kind === 'number'
    ? [...new Set(raw.map((value) => Math.round(Number(value))).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b)
    : [...new Set(raw.map((value) => String(value).trim()).filter(Boolean))];
  const resolved = items.length ? items : fallback.items;
  const preferred = kind === 'number' ? Math.round(Number(entry?.defaultItem)) : entry?.defaultItem;
  return {
    type,
    label: entry?.label || fallback.label,
    kind,
    unit: entry?.unit ?? fallback.unit ?? '',
    items: resolved,
    defaultItem: resolved.includes(preferred) ? preferred : resolved[0]
  };
}

/** 全部字典（按字典类型键），供数据字典维护页与各消费方读取。 */
export function dataDictionary() {
  const stored = readStored().dataDictionary || {};
  const types = [...new Set([...Object.keys(DICTIONARY_FALLBACK), ...Object.keys(stored)])];
  return Object.fromEntries(types.map((type) => {
    const entry = normalizeDictionaryEntry(type, stored[type]);
    return [type, { label: entry.label, kind: entry.kind, unit: entry.unit, items: entry.items, defaultItem: entry.defaultItem }];
  }));
}

/** 指定字典类型的字典项列表。 */
export function dictionaryItems(type) {
  return dataDictionary()[type]?.items || [];
}

/** 指定字典类型的默认项（课时时长的默认取值走这里）。 */
export function dictionaryDefault(type) {
  return dataDictionary()[type]?.defaultItem;
}

/** 写入某个字典类型的字典项与默认项，保存后即时生效。 */
export function writeDictionary(type, { items, defaultItem } = {}) {
  return writeDemoState((next) => {
    const current = normalizeDictionaryEntry(type, (next.dataDictionary || {})[type]);
    const merged = normalizeDictionaryEntry(type, {
      ...current,
      items: items ?? current.items,
      defaultItem: defaultItem ?? current.defaultItem
    });
    return {
      ...next,
      dataDictionary: {
        ...(next.dataDictionary || {}),
        [type]: { label: merged.label, kind: merged.kind, unit: merged.unit, items: merged.items, defaultItem: merged.defaultItem }
      }
    };
  });
}

// CR-2026-100 / CR-2026-103：课时时长读取数据字典 lesson_duration，
// 排班、班级默认值与课程编排共用同一份字典。
export function lessonDurationSettings() {
  return { options: dictionaryItems('lesson_duration'), defaultMinutes: dictionaryDefault('lesson_duration') };
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
