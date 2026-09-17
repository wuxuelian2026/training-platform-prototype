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
        ] },
        // CR-2026-036：线下退款登记（登记的是已发生的线下退款事实，不是发起退款申请）。
        { heading: '线下退款登记字段', fields: [
          { id: 'FD-FINANCE-035', label: '关联订单', type: '下拉', length: '待退金额大于 0 的订单', required: '是', note: '订单必须存在且已收款；已取消订单不出现也不可登记；已退款订单未退足时可继续登记', constraints: { dictionary: '订单' } },
          { id: 'FD-FINANCE-036', label: '退款金额', type: '数字', length: '0 < 金额 ≤ 待退金额', required: '是', note: '待退金额 = 订单实收金额（收款记录合计，不用订单金额）− 已退金额；同一订单可多次登记，累计不得超过实收金额', constraints: { min: 0, max: '待退金额' } },
          { id: 'FD-FINANCE-037', label: '退款方式', type: '下拉', length: '银行转账 / 现金 / 微信支付 / 支付宝', required: '是', note: '登记的是实际退款渠道' },
          { id: 'FD-FINANCE-038', label: '退款原因', type: '文本', length: '≤ 200 字', required: '是', note: '填写线下退款原因', constraints: { maxLength: 200 } },
          { id: 'FD-FINANCE-039', label: '退款时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '否', note: '默认登记时间；用于与银行流水核对', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-FINANCE-040', label: '备注', type: '文本', length: '≤ 200 字', required: '否', note: '凭证号、经办说明等', constraints: { maxLength: 200 } },
          { id: 'FD-FINANCE-041', label: '退款方式 / 渠道', type: '只读', length: '线上 / 线下 + 渠道', required: '系统记录', note: '退款记录列表与订单详情按该列区分线上退款单与线下退款登记，筛选与指标卡计数一致', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        '支付已到账的订单退款需财务审批，审批通过后发起退款。',
        '面授课程的线上退款走审批；审批、发起与渠道完成状态独立记录，保证流程可追溯。',
        'CR-2026-036：线下退款登记用于补齐视频课程与面授课程的退款出口，登记的是已经发生的线下退款事实，不得替代面授订单的线上退款审批流程。',
        'CR-2026-036：线下退款没有渠道回调，登记成功即视为退款完成，订单状态直接转为「已退款」，不经过「退款中」；登记失败不产生任何记录。',
        'CR-2026-036：面授订单登记后取消报名并释放名额；视频订单登记后回收该账号对课程的学习权限，已产生的学习记录、排课、考勤与计薪保留不改写。',
        '退款状态在收到渠道成功回调前保持“退款中”，不得提前标记“已退款”。',
        '同一支付流水只允许发起一次退款，退款申请与支付流水按唯一约束关联。',
        '退款失败或超时保留原状态并允许重试，重试复用同一业务键。'
      ]
    }
  }
};
