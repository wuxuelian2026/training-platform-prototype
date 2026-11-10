(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 客服知识库字段规格 · 唯一事实源（CR-2026-172）
// 口径变更后运行 `npm run check:spec` 校验一致性。
const SERVICE_FIELD_SPEC = {
  module: '客服知识库',
  pages: {
    'service/index': {
      groups: [
        { heading: '常见问题库条目字段（5 字段）', fields: [
          { id: 'FD-SERVICE-001', label: '标准问题', type: '文本', length: '≤ 100 字', required: '是', note: '规范化后作为唯一键；重复导入覆盖并留痕', constraints: { maxLength: 100 } },
          { id: 'FD-SERVICE-002', label: '同义问法', type: '文本', length: '多个逗号分隔', required: '否', note: '中文/英文逗号分隔，导入时切分为数组' },
          { id: 'FD-SERVICE-003', label: '答案', type: '纯文本', length: '≤ 500 字', required: '是', note: '原样返回，禁止富文本与外链', constraints: { maxLength: 500 } },
          { id: 'FD-SERVICE-004', label: '分类', type: '下拉', length: '报名缴费 / 课程学习 / 考务考级 / 证书 / 其他', required: '是', note: 'CR-2026-172：本期固定 5 类，不做后台字典维护页' },
          { id: 'FD-SERVICE-005', label: '状态', type: '下拉', length: '上架 / 下架', required: '是', note: '下架条目不参与匹配' }
        ] },
        { heading: '筛选与导入字段', fields: [
          { id: 'FD-SERVICE-006', label: '关键词', type: '文本', length: '≤ 50 字', required: '否', note: '匹配标准问题与同义问法', constraints: { maxLength: 50 } },
          { id: 'FD-SERVICE-007', label: '导入文件', type: '文件', length: '仅 .xlsx', required: '是', note: '模板 5 列：标准问题｜同义问法｜答案｜分类｜状态' },
          { id: 'FD-SERVICE-008', label: '导入批次号', type: '只读文本', length: 'IMP+日期+序号', required: '系统', note: '批次留痕：批次号、文件名、操作人、时间、成功/失败/覆盖数', constraints: { readOnly: true, system: true } }
        ] },
        { heading: '未命中问题归并字段（只读）', fields: [
          { id: 'FD-SERVICE-009', label: '问题原话', type: '只读文本', length: '首次出现原话', required: '系统', note: '规范化后完全相同才归并；语义相似本期不做', constraints: { readOnly: true, system: true } },
          { id: 'FD-SERVICE-010', label: '出现次数', type: '只读数字', length: '非负整数', required: '系统', note: '未命中事件次数，不做用户去重', constraints: { readOnly: true, system: true, integer: true, min: 0 } },
          { id: 'FD-SERVICE-011', label: '首次 / 最近时间', type: '只读日期时间', length: 'YYYY-MM-DD HH:mm', required: '系统', note: '本地演示时钟', constraints: { readOnly: true, system: true } },
          { id: 'FD-SERVICE-012', label: '状态', type: '只读标签', length: '待处理 / 已转化 / 已忽略', required: '系统', note: '已忽略组再次出现不回退到待处理', constraints: { readOnly: true, system: true } }
        ] },
        { heading: '客服留言字段', fields: [
          { id: 'FD-SERVICE-013', label: '问题', type: '文本', length: '≤ 500 字', required: '是', note: '预填最近一次提问，可改', constraints: { maxLength: 500 } },
          { id: 'FD-SERVICE-014', label: '联系方式', type: '手机号', length: '11 位', required: '是', note: '预填本人手机号，可改；列表展示脱敏', constraints: { pattern: '1[3-9]\\d{9}' } },
          { id: 'FD-SERVICE-015', label: '回复内容', type: '纯文本', length: '≤ 500 字', required: '是', note: '客服逐条文本回复，写入既有 consultations[].reply', constraints: { maxLength: 500 } }
        ] }
      ],
      notes: [
        'CR-2026-172：本期仅做静态 mock 原型，不做真实后端、NLP 与实时会话。',
        '去 AI 化：界面文案与模块命名不出现 AI／智能／机器人／助手等字眼；顶部固定声明为「以下为常见问题自助答复，仅供参考，具体以官方通知为准」。',
        '多条命中按 createdAt 升序取第一个已上架条目，不做权重排序；下架条目不参与匹配。',
        '导出范围限于当前筛选结果；客服留言不提供导出（PII 不出库）。',
        '「工作日 48 小时内回复」仅为固定话术，不产生系统 SLA 计时与超时告警。'
      ]
    },
    'learner/service': {
      groups: [
        { heading: '在线客服会话字段', fields: [
          { id: 'FD-SERVICE-016', label: '提问内容', type: '纯文本', length: '≤ 200 字', required: '是', note: '单轮、无上下文；不支持图片/语音/附件', constraints: { maxLength: 200 } },
          { id: 'FD-SERVICE-017', label: '顶部声明', type: '只读文本', length: '固定文案', required: '系统', note: '每次进入固定展示、不可关闭', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '未登录可提问；点「留言咨询」走登录引导，登录后回填手机号再提交。',
        '留言复用 showConsultDialog() 弹窗：2 个输入框（问题 / 联系方式）+ 提交，无联系人字段。',
        '人工回复后通过既有「我的咨询／咨询详情」查看，学员端不新增留言页与记录页。'
      ]
    }
  }
};


__classicExports["SERVICE_FIELD_SPEC"] = SERVICE_FIELD_SPEC;
  __classicModules["spec/fields/service.js"] = __classicExports;
})(globalThis);
