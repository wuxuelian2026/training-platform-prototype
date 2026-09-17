// D-03（ZK-D-17 9.1）：轮播图 Mock 种子，字段对齐 10-数据库模型与约束.md 的 banner 定义。
// 后台轮播图管理列表与学员端首页轮播共用这一份种子，避免两端各写一套演示数据。
// 学员端文案来自运营维护的主标题（title）与描述（desc），角标字自动取主标题首字。
// `status` 只允许状态机 SM-BANNER 的「启用 / 停用」，未启用的轮播图即停用状态。

export const bannerSeed = [
  // 后台行名（name）只是运营侧的档案名称，学员端展示的是主标题（title）与描述（desc）；
  // copy 保留为历史兼容字段，展示口径以 title／desc 为准。
  {
    id: 'banner-001',
    name: '秋季艺术课程招生',
    position: '学员端首页',
    imageFile: 'banner-autumn-1242x414.jpg',
    title: '面授班级正在招生',
    desc: '查看教师、校区、课时和剩余名额，选择合适的班级。',
    jumpType: '课程详情',
    targetId: 'COURSE-CR-2026-0001',
    targetName: '舞蹈基本功',
    jumpTarget: '/learner/pages/course-detail.html?courseId=COURSE-CR-2026-0001',
    sort: 1,
    status: '启用',
    copy: { kicker: '秋季招生', title: '面授班级正在招生', text: '查看教师、校区、课时和剩余名额，选择合适的班级。', mark: '课' }
  },
  {
    id: 'banner-002',
    name: '声乐演唱技巧推荐',
    position: '学员端首页',
    imageFile: 'banner-vocal-1242x414.jpg',
    title: '让练习成为看得见的成长',
    desc: '精选声乐、舞蹈和器乐课程，找到适合自己的学习节奏。',
    jumpType: '商品详情',
    targetId: 'product-1',
    targetName: '声乐演唱技巧',
    jumpTarget: '/learner/pages/course-detail.html?courseId=COURSE-CR-2026-0002',
    sort: 2,
    status: '停用',
    copy: { kicker: '本周精选', title: '让练习成为看得见的成长', text: '精选声乐、舞蹈和器乐课程，找到适合自己的学习节奏。', mark: '艺' }
  },
  {
    id: 'banner-003',
    name: '视频课程随时学',
    position: '学员端首页',
    imageFile: 'banner-video-1242x414.jpg',
    title: '随时打开一节好课',
    desc: '支持断点续播，利用碎片时间完成你的艺术训练。',
    jumpType: '课程列表',
    jumpTarget: '/learner/pages/courses.html?type=video',
    sort: 3,
    status: '启用',
    copy: { kicker: '视频课程', title: '随时打开一节好课', text: '支持断点续播，利用碎片时间完成你的艺术训练。', mark: '学' }
  },
  {
    id: 'banner-004',
    name: '名师推荐位',
    position: '学员端首页',
    imageFile: 'banner-teacher-1242x414.jpg',
    title: '跟着好老师稳步进阶',
    desc: '查看教师专业方向、教龄与已发布课程，按需选择。',
    jumpType: '名师列表',
    jumpTarget: '/learner/pages/teachers.html',
    sort: 4,
    status: '启用',
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

// 学员端首页只展示排序后的启用状态轮播图，无可用数据时返回空数组（由页面渲染空态）。
export function resolveHomeBanners(shared) {
  return mergeBanners(shared)
    .filter((item) => item.status === '启用')
    .sort((left, right) => Number(left.sort || 0) - Number(right.sort || 0))
    // CR-2026-037 §2.3：学员端文案取主标题与描述，角标字取主标题首字；未填主标题的记录不展示。
    .map((item) => {
      const title = item.title || item.copy?.title || '';
      return { title, text: item.desc || item.copy?.text || '', mark: title.slice(0, 1), kicker: item.copy?.kicker || '', jumpTarget: item.jumpTarget || '' };
    })
    .filter((item) => Boolean(item.title));
}
