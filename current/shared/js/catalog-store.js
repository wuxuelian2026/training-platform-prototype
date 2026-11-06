(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// CR-2026-166：专业目录单一事实源。
// 后台「课程中心 → 专业目录维护」与小程序学员端「兴趣专业」共用本层数据；
// 目录的启停/改名/增删由后台交互收尾写盘（persistCatalog），学员端只读引用。
// 拆分版 04「全系统所有需要选择专业的地方均从本目录树读取」由此落实。
const { readDemoState, writeDemoState } = __classicRequire("shared/js/demo-store.js");

const CATALOG_SEED = {
  groupStatus: { '音乐类': '启用', '舞蹈类': '启用', '美术类': '停用', '戏剧类': '启用' },
  groupSort: { '音乐类': 1, '舞蹈类': 2, '美术类': 3, '戏剧类': 4 },
  groupIcon: {},
  categories: [
    { id: 'cat-1', name: '声乐', parent: '音乐类', sort: 1, status: '启用' },
    { id: 'cat-2', name: '器乐', parent: '音乐类', sort: 2, status: '启用' },
    { id: 'cat-3', name: '舞蹈表演', parent: '舞蹈类', sort: 1, status: '启用' },
    { id: 'cat-4', name: '绘画', parent: '美术类', sort: 1, status: '启用' },
    { id: 'cat-5', name: '表演', parent: '戏剧类', sort: 1, status: '启用' }
  ],
  majors: [
    { id: 'major-1', name: '声乐演唱', parent: '声乐', group: '音乐类', sort: 1, status: '启用', teachers: 6, courses: 8, resources: 12 },
    { id: 'major-2', name: '童声合唱', parent: '声乐', group: '音乐类', sort: 2, status: '启用', teachers: 2, courses: 3, resources: 4 },
    { id: 'major-3', name: '钢琴', parent: '器乐', group: '音乐类', sort: 1, status: '启用', teachers: 5, courses: 5, resources: 8 },
    { id: 'major-4', name: '古筝', parent: '器乐', group: '音乐类', sort: 2, status: '启用', teachers: 3, courses: 4, resources: 5 },
    { id: 'major-5', name: '中国舞', parent: '舞蹈表演', group: '舞蹈类', sort: 1, status: '启用', teachers: 8, courses: 10, resources: 16 },
    { id: 'major-6', name: '芭蕾舞', parent: '舞蹈表演', group: '舞蹈类', sort: 2, status: '启用', teachers: 4, courses: 4, resources: 6 },
    { id: 'major-7', name: '中国画', parent: '绘画', group: '美术类', sort: 1, status: '启用', teachers: 4, courses: 5, resources: 9 },
    { id: 'major-8', name: '少儿绘画', parent: '绘画', group: '美术类', sort: 2, status: '启用', teachers: 2, courses: 2, resources: 3 },
    { id: 'major-9', name: '戏剧表演', parent: '表演', group: '戏剧类', sort: 1, status: '启用', teachers: 3, courses: 4, resources: 5 },
    { id: 'major-10', name: '朗诵与主持', parent: '表演', group: '戏剧类', sort: 2, status: '启用', teachers: 2, courses: 3, resources: 2 }
  ]
};

const clone = (value) => JSON.parse(JSON.stringify(value));
let cache = null;

// 返回可变引用：后台目录页沿用既有 mutate 写法，交互收尾调用 persistCatalog() 写盘。
function readCatalog() {
  if (cache) return cache;
  const state = readDemoState() || {};
  const saved = state.catalog;
  cache = (saved && Array.isArray(saved.categories) && Array.isArray(saved.majors) && saved.groupStatus)
    ? clone(saved)
    : clone(CATALOG_SEED);
  return cache;
}

function persistCatalog() {
  const state = readDemoState() || {};
  state.catalog = clone(readCatalog());
  writeDemoState(state);
  return state.catalog;
}

// 门类 → 分类 → [专业名] 的派生视图，供后台级联选择使用（不再自持目录常量）。
function professionalTreeOf(catalog = readCatalog()) {
  const tree = {};
  Object.keys(catalog.groupStatus || {}).sort((a, b) => (catalog.groupSort?.[a] ?? 999) - (catalog.groupSort?.[b] ?? 999) || a.localeCompare(b, 'zh-CN'))
    .forEach((group) => { tree[group] = {}; });
  (catalog.categories || []).forEach((category) => {
    if (tree[category.parent]) tree[category.parent][category.name] = [];
  });
  (catalog.majors || []).forEach((major) => {
    if (tree[major.group] && tree[major.group][major.parent]) tree[major.group][major.parent].push(major.name);
  });
  return tree;
}

// 沿用 CR-2026-034 §2.3.4：停用沿层级生效（专业自身 / 所属分类 / 所属门类）。
function isMajorEnabled(name, catalog = readCatalog()) {
  const major = (catalog.majors || []).find((item) => item.name === name);
  if (!major || major.status !== '启用') return false;
  const category = (catalog.categories || []).find((item) => item.name === major.parent && item.parent === major.group);
  if (category && category.status !== '启用') return false;
  return (catalog.groupStatus?.[major.group] || '启用') === '启用';
}

function majorPathOf(name, catalog = readCatalog()) {
  const major = (catalog.majors || []).find((item) => item.name === name);
  return major ? { group: major.group, category: major.parent, major: major.name } : null;
}

function enabledMajorOptions(catalog = readCatalog()) {
  return (catalog.majors || [])
    .filter((major) => isMajorEnabled(major.name, catalog))
    .sort((a, b) => (catalog.groupSort?.[a.group] ?? 999) - (catalog.groupSort?.[b.group] ?? 999)
      || (a.sort ?? 999) - (b.sort ?? 999) || a.name.localeCompare(b.name, 'zh-CN'))
    .map((major) => ({
      value: major.name,
      group: major.group,
      category: major.parent,
      label: `${major.group} / ${major.parent} / ${major.name}`
    }));
}

// 门类关键词：用于兴趣值在课程反推筛选树中做粗粒度反查（A② 值域取舍）。
// 「音乐类」→「音乐」，不做全量词表，避免与课程 seed 形成第二套隐式映射。
function groupKeywordOf(group) {
  return String(group || '').replace(/类$/, '').trim();
}

__classicExports["readCatalog"] = readCatalog;
__classicExports["persistCatalog"] = persistCatalog;
__classicExports["professionalTreeOf"] = professionalTreeOf;
__classicExports["isMajorEnabled"] = isMajorEnabled;
__classicExports["majorPathOf"] = majorPathOf;
__classicExports["enabledMajorOptions"] = enabledMajorOptions;
__classicExports["groupKeywordOf"] = groupKeywordOf;
__classicExports["CATALOG_SEED"] = CATALOG_SEED;
__classicModules["shared/js/catalog-store.js"] = __classicExports;
})(globalThis);
