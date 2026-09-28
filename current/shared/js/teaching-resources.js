import { readDemoState } from './demo-store.js';

// 教学资源共享目录：后台教学资源库、课程编排与教师作业共用同一份演示资源主数据。
export const teachingResourceSeed = [
  { id: 'res-001', name: '第1章·气息支持.mp4', type: '教学视频', major: '声乐演唱', level: '初级' },
  { id: 'res-002', name: '舞蹈基本功教学大纲.pdf', type: '乐谱PDF', major: '中国舞', level: '启蒒' },
  { id: 'res-003', name: '共鸣位置示范.mp4', type: '教学视频', major: '声乐演唱', level: '中级' },
  { id: 'res-004', name: '咬字练习示范.mp3', type: '音频示范', major: '声乐演唱', level: '初级' },
  { id: 'res-005', name: '少儿国画工具清单.pptx', type: '课件PPT', major: '中国画', level: '启蒒' },
  { id: 'res-006', name: '芭蕾基础动作参考.jpg', type: '其他', major: '芭蕾舞', level: '中级' }
];

export function teachingResourcesForClass(classItem = {}) {
  const stored = readDemoState().resources || [];
  const catalog = [...teachingResourceSeed];
  stored.forEach((resource) => {
    const index = catalog.findIndex((item) => item.id === resource.id);
    if (index >= 0) catalog[index] = { ...catalog[index], ...resource };
    else if (resource.id && resource.name) catalog.push(resource);
  });
  const text = `${classItem.course || ''} ${classItem.professional || ''}`;
  const matched = catalog.filter((resource) => text.includes(resource.major));
  return matched.length ? matched : catalog;
}

export function teachingResourceById(resourceId) {
  return teachingResourceSeed.find((resource) => resource.id === resourceId);
}
