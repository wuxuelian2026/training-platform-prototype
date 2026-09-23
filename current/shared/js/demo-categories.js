// 演示数据归属口径（客户 2026-09-23）：把课程按大类集中到固定教师，方便切换演示账号。
// 舞蹈类 → 王玥（中国舞 + 芭蕾舞 + 舞蹈基本功）；美术类 → 李青（中国画 + 少儿绘画 + 书法）；
// 音乐类 → 林悦（钢琴 + 声乐演唱 + 古筝）；朗诵与主持／戏剧表演仍归邓琪（不属三大类）。
// 未列入本表的专业沿用原教师；未在类别内的教师（徐帆／唐雯／赵老师）保留账号但不再持有课程。
export const DEMO_CATEGORY_OWNERS = {
  舞蹈: ['中国舞', '芭蕾舞', '舞蹈表演'],
  美术: ['中国画', '少儿绘画', '美术教育', '书法'],
  音乐: ['钢琴', '声乐演唱', '音乐表演', '古筝', '民乐']
};
export const DEMO_CATEGORY_TEACHER_BY_CATEGORY = { 舞蹈: '王玥', 美术: '李青', 音乐: '林悦' };
export const DEMO_MAJOR_OWNER = Object.fromEntries(
  Object.entries(DEMO_CATEGORY_OWNERS).flatMap(([category, majors]) => majors.map((major) => [major, DEMO_CATEGORY_TEACHER_BY_CATEGORY[category]]))
);
// 按专业给出演示归属教师；未命中类别时回落到原教师。
export function demoOwnerForMajor(major, fallback) {
  return DEMO_MAJOR_OWNER[major] || fallback;
}
