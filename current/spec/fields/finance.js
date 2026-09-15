// 财务中心字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。

export const FINANCE_FIELD_SPEC = {
  module: '财务中心',
  pages: {
    'finance/payments': {
      groups: [
        { heading: '登记收款字段', fields: [
          { id: 'FD-FINANCE-001', label: '关联订单号', type: '文本', length: '≤ 50 字', required: '是', note: '对应统一订单管理中的订单', constraints: { maxLength: 50 } },
          { id: 'FD-FINANCE-002', label: '学员姓名', type: '文本', length: '2–30 字', required: '否', note: '便于线下对账识别', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-FINANCE-003', label: '课程名称', type: '文本', length: '≤ 50 字', required: '否', note: '收款对应课程', constraints: { maxLength: 50 } },
          { id: 'FD-FINANCE-004', label: '收款来源', type: '下拉', length: '预置来源', required: '否', note: '区分线上或线下' },
          { id: 'FD-FINANCE-005', label: '收款渠道', type: '下拉', length: '预置渠道', required: '否', note: '决定对账口径' },
          { id: 'FD-FINANCE-006', label: '收款金额', type: '金额', length: '大于 0', required: '是', note: '实际到账金额', constraints: { exclusiveMin: 0 } },
          { id: 'FD-FINANCE-007', label: '收款时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '否', note: '默认当前时间', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-FINANCE-008', label: '备注', type: '文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '金额与状态以财务流水为准，收款记录不可直接删除。',
        '查看各渠道收款流水和到账状态；银行转账与现金支持财务手动登记。',
        '确认到账后订单状态与报名状态同步更新。',
        '同一订单重复登记收款时需提示，避免重复计入收入。',
        '收款记录由支付回调自动产生或财务人工登记；到账状态异常时不静默进入后续对账。'
      ]
    },
    'finance/refunds': {
      groups: [
        { heading: '退款审批字段', fields: [
          { id: 'FD-FINANCE-009', label: '审批结果', type: '单选', length: '通过 / 拒绝', required: '是', note: '决定退款是否继续' },
          { id: 'FD-FINANCE-010', label: '拒绝原因', type: '文本', length: '≤ 200 字', required: '拒绝时必填', note: '填写后同步给申请人', constraints: { maxLength: 200 } },
          { id: 'FD-FINANCE-011', label: '退款方式', type: '下拉', length: '原路退回 / 线下退回', required: '是', note: '默认原路退回' },
          { id: 'FD-FINANCE-012', label: '财务备注', type: '文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '支付已到账的订单退款需财务审批，审批通过后发起退款。',
        '本页仅处理面授课程退款；审批、发起与渠道完成状态独立记录，保证流程可追溯。',
        '退款状态在收到渠道成功回调前保持“退款中”，不得提前标记“已退款”。',
        '同一支付流水只允许发起一次退款，退款申请与支付流水按唯一约束关联。',
        '退款失败或超时保留原状态并允许重试，重试复用同一业务键。'
      ]
    }
  }
};
