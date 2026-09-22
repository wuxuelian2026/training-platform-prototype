// I1-DEC-24 / RM-F-01: the video product is the single source of the learner-facing price, preview
// policy and shelf visibility. Admin and learner read the same baseline records.

export const productSeed = [
  {
    id: 'product-1', courseId: 'COURSE-CR-2026-0002', name: '声乐演唱技巧', course: '声乐演唱技巧',
    price: '1280.00', sales: '86', status: '已上架', updated: '2026-08-20', preview: '允许试看', previewHours: '第1课时',
    recommend: '从气息到作品演唱，按章节循序渐进。', recommended: true, cover: '已配置', coverFile: '声乐演唱技巧-封面.png', displayDetail: '围绕气息、共鸣、咬字与作品处理，建立完整演唱方法。', tags: ['声乐', '发声'], shelfAt: '2026-08-20 10:00', priceChanges: [], courseVersion: 2
  },
  {
    id: 'product-2', courseId: 'COURSE-006', name: '艺术歌曲示范课', course: '艺术歌曲示范课',
    price: '680.00', sales: '0', status: '已下架', updated: '2026-09-02', preview: '不允许试看', previewHours: '',
    recommend: '经典艺术歌曲逐句示范。', cover: '已配置', coverFile: '艺术歌曲示范课-封面.png', displayDetail: '通过经典艺术歌曲示范，学习作品分析、咬字和情感表达。', tags: ['艺术歌曲', '示范'], shelfAt: '2026-08-15 09:00', courseVersion: 1, priceChanges: [
      { at: '2026-09-02 09:30', operator: '平台运营', item: '售价', from: '¥880.00', to: '¥680.00' }
    ]
  }
  ,
  ...[
    ['001', 'COURSE-VIDEO-DEMO-001', '童声合唱入门', '498.00', '童声合唱'],
    ['002', 'COURSE-VIDEO-DEMO-002', '钢琴即兴伴奏基础', '880.00', '钢琴'],
    ['003', 'COURSE-VIDEO-DEMO-003', '少儿水彩画入门', '368.00', '少儿绘画'],
    ['004', 'COURSE-VIDEO-DEMO-004', '朗诵表达进阶', '598.00', '朗诵与主持'],
    ['005', 'COURSE-VIDEO-DEMO-005', '古筝经典小曲演奏', '768.00', '古筝']
  ].map(([suffix, courseId, name, price, tag]) => ({ id: `product-video-demo-${suffix}`, courseId, name, course: name, price, sales: '0', status: '已上架', updated: '2026-09-21', preview: '允许试看', previewHours: '第1课时', recommend: `系统学习${name}的核心方法与实战技巧。`, recommended: false, cover: '已配置', coverFile: `${name}-封面.png`, displayDetail: `围绕${name}的核心内容设计分段视频课程，支持按章节学习。`, tags: [tag, '视频课程'], shelfAt: '2026-09-21 10:00', priceChanges: [], courseVersion: 1 }))
];

export function cloneProductSeed() {
  return productSeed.map(item => ({ ...item, priceChanges: (item.priceChanges || []).map(change => ({ ...change })) }));
}

// Products are keyed by course id: the shared store wins, the seed is the baseline.
export function productForCourse(shared, courseId) {
  const stored = (shared?.products || []).filter(item => item && typeof item === 'object');
  const override = [...stored].reverse().find(item => item.courseId === courseId);
  if (override) return { ...(productSeed.find(item => item.courseId === courseId) || {}), ...override };
  return productSeed.find(item => item.courseId === courseId) || null;
}

export function allProducts(shared) {
  const stored = (shared?.products || []).filter(item => item && typeof item === 'object');
  const merged = productSeed.map(seed => ({ ...seed, ...(stored.find(item => item.id === seed.id) || {}) }));
  stored.filter(item => !productSeed.some(seed => seed.id === item.id)).forEach(item => merged.push(item));
  return merged;
}
