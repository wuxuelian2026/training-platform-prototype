// I1-DEC-24 / RM-F-01: the video product is the single source of the learner-facing price, preview
// policy and shelf visibility. Admin and learner read the same baseline records.

export const productSeed = [
  {
    id: 'product-1', courseId: 'COURSE-CR-2026-0002', name: '声乐演唱技巧', course: '声乐演唱技巧',
    price: '1280.00', sales: '86', status: '已上架', updated: '2026-08-20', preview: '允许试看', previewHours: '第1课时',
    recommend: '从气息到作品演唱，按章节循序渐进。', shelfAt: '2026-08-20 10:00', priceChanges: []
  },
  {
    id: 'product-2', courseId: 'COURSE-006', name: '艺术歌曲示范课', course: '艺术歌曲示范课',
    price: '680.00', sales: '0', status: '已下架', updated: '2026-09-02', preview: '不允许试看', previewHours: '',
    recommend: '经典艺术歌曲逐句示范。', shelfAt: '2026-08-15 09:00', priceChanges: [
      { at: '2026-09-02 09:30', operator: '平台运营', item: '售价', from: '¥880.00', to: '¥680.00' }
    ]
  }
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
