// D-03（ZK-D-17 9.1）：轮播图 Mock 种子，字段对齐 10-数据库模型与约束.md 的 banner 定义。
// 后台轮播图管理列表与学员端首页轮播共用这一份种子，避免两端各写一套演示数据。
// `copy` 为学员端展示用的文案片段；`status` 只允许「已启用 / 草稿」。

export const bannerSeed = [
  // 后台行名（name）是运营侧的轮播图档案名称；学员端首页展示的是 copy 里的文案片段，
  // 两者不是同一字段、措辞可以不同：例如 name「秋季艺术课程招生」对应学员端 kicker「秋季招生」。
  {
    id: 'banner-001',
    name: '秋季艺术课程招生',
    position: '学员端首页',
    jumpType: '课程详情',
    jumpTarget: '/learner/pages/courses.html',
    startAt: '2026-09-01',
    endAt: '2026-10-31',
    sort: 1,
    status: '已启用',
    copy: { kicker: '秋季招生', title: '面授班级正在招生', text: '查看教师、校区、课时和剩余名额，选择合适的班级。', mark: '课' }
  },
  {
    id: 'banner-002',
    name: '声乐演唱技巧推荐',
    position: '学员端首页',
    jumpType: '商品详情',
    jumpTarget: '/learner/pages/course-detail.html?course=声乐演唱技巧',
    startAt: '',
    endAt: '',
    sort: 2,
    status: '草稿',
    copy: { kicker: '本周精选', title: '让练习成为看得见的成长', text: '精选声乐、舞蹈和器乐课程，找到适合自己的学习节奏。', mark: '艺' }
  },
  {
    id: 'banner-003',
    name: '视频课程随时学',
    position: '学员端首页',
    jumpType: '课程库',
    jumpTarget: '/learner/pages/courses.html?type=video',
    startAt: '',
    endAt: '',
    sort: 3,
    status: '已启用',
    copy: { kicker: '视频课程', title: '随时打开一节好课', text: '支持断点续播，利用碎片时间完成你的艺术训练。', mark: '学' }
  },
  {
    id: 'banner-004',
    name: '名师推荐位',
    position: '学员端首页',
    jumpType: '名师列表',
    jumpTarget: '/learner/pages/teachers.html',
    startAt: '',
    endAt: '',
    sort: 4,
    status: '已启用',
    copy: { kicker: '名师推荐', title: '跟着好老师稳步进阶', text: '查看教师专业方向、教龄与已发布课程，按需选择。', mark: '师' }
  }
];

export function cloneBannerSeed() {
  return bannerSeed.map((item) => ({ ...item, copy: { ...item.copy } }));
}

// 后台与学员端共用的合并口径：种子为默认值，demo-store 中的同 id 记录覆盖种子。
export function mergeBanners(shared) {
  const stored = (shared?.banners || []).filter((item) => item && typeof item === 'object');
  const merged = bannerSeed.map((seed) => ({ ...seed, ...(stored.find((item) => item.id === seed.id) || {}) }));
  stored.filter((item) => !bannerSeed.some((seed) => seed.id === item.id)).forEach((item) => merged.push({ ...item }));
  return merged.filter((item) => !item.deleted);
}

// 学员端首页只展示排序后的已启用轮播图，无可用数据时返回空数组（由页面渲染空态）。
export function resolveHomeBanners(shared) {
  return mergeBanners(shared)
    .filter((item) => item.status === '已启用')
    .sort((left, right) => Number(left.sort || 0) - Number(right.sort || 0))
    .map((item) => item.copy)
    .filter(Boolean);
}
