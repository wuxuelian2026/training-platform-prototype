const STORAGE_KEY = 'hbyx-iteration1-demo-v1';
// v2 (CR-2026-003 / I1-DEC-19): retire the legacy parallel course numbering; demo data restarts from seed.
const SCHEMA_VERSION = 2;

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
  classes: [],
  orders: [],
  // P0-1: one demo enrollment record so the admin class roster has a real detail row to show.
  enrollments: [
    { id: 'account-002-student-101-class-001', accountId: 'account-002', studentId: 'student-101', classId: 'class-001', status: '已报名', enrolledAt: '2026-08-22 10:05' }
  ],
  videoEntitlements: [],
  progress: {}
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
    return { ...base, ...stored, schemaVersion: SCHEMA_VERSION, accounts: stored.accounts || base.accounts, students: stored.students || base.students };
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
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
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

export function resetDemoData() {
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
