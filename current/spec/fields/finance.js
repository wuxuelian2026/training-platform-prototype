(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 财务中心字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。
const FINANCE_FIELD_SPEC = {
  module: '财务中心',
  pages: {
    'finance/salary': {
      groups: [
        { heading: '工资查询字段', fields: [
          { id: 'FD-FINANCE-013', label: '工资状态', type: '下拉', length: '全部 / 草稿 / 已发布', required: '否', note: '按工资单状态筛选（CR-2026-170：草稿 / 已发布，已作废留痕可查）' },
          { id: 'FD-FINANCE-014', label: '工资月份', type: '月份', length: 'YYYY-MM', required: '否', note: '默认当前工资月份', constraints: { format: 'YYYY-MM' } },
          { id: 'FD-FINANCE-015', label: '教师姓名', type: '文本', length: '2–30 字', required: '否', note: '支持模糊搜索', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-FINANCE-016', label: '所属专业', type: '级联下拉', length: '系统目录', required: '否', note: '按专业筛选工资记录' }
        ] },
        { heading: '工资单字段（CR-2026-170：金额由教务导入，课时由系统统计）', fields: [
          { id: 'FD-FINANCE-017', label: '教师 / 工号', type: '只读文本', length: '2–30 字', required: '系统', note: '教师工号为导入唯一键组成部分', constraints: { readOnly: true, system: true } },
          { id: 'FD-FINANCE-018', label: '工资月份', type: '只读文本', length: 'YYYY-MM', required: '系统', note: '工资归属月份，年月格式校验', constraints: { readOnly: true, system: true } },
          { id: 'FD-FINANCE-019', label: '课时日明细', type: '只读表格', length: '系统生成', required: '系统', note: '按自然日归集（日期、课时、课程/班级）；日明细合计＝月度系统课时', constraints: { readOnly: true, system: true } },
          { id: 'FD-FINANCE-020', label: '系统课时', type: '只读数字', length: '非负整数', required: '系统', note: '由排课与考勤自动统计（课时 = 有效课次数 × 连上节数）；次月 1 日锁定上月', constraints: { readOnly: true, system: true, integer: true, min: 0 } },
          { id: 'FD-FINANCE-047', label: '课酬标准', type: '金额（导入）', length: '元/课时，2 位小数', required: '是', note: '教务导入；用于偏差勾稽（课时费 ÷ 系统课时 与标准的偏差 >5% 须填原因）', constraints: { min: 0, decimals: 2, source: 'import' } },
          { id: 'FD-FINANCE-048', label: '课时费', type: '金额（导入）', length: '2 位小数', required: '是', note: '教务导入；与系统课时做勾稽比对', constraints: { min: 0, decimals: 2, source: 'import' } },
          { id: 'FD-FINANCE-049', label: '其他', type: '金额（导入）', length: '2 位小数，可为负', required: '否', note: '其他调整（补贴/扣款合列）', constraints: { decimals: 2, source: 'import' } },
          { id: 'FD-FINANCE-021', label: '应发', type: '金额（导入）', length: '2 位小数', required: '是', note: '教务导入，系统不自动算薪', constraints: { min: 0, decimals: 2, source: 'import' } },
          { id: 'FD-FINANCE-050', label: '扣税', type: '金额（导入）', length: '2 位小数', required: '是', note: '教务导入', constraints: { min: 0, decimals: 2, source: 'import' } },
          { id: 'FD-FINANCE-024', label: '实发', type: '金额（导入）', length: '2 位小数', required: '是', note: '教务导入；发布后金额锁定', constraints: { decimals: 2, source: 'import' } },
          { id: 'FD-FINANCE-025', label: '备注', type: '文本', length: '≤ 200 字', required: '否', note: '教务导入随行备注，可写核对说明', constraints: { maxLength: 200, source: 'import' } },
          { id: 'FD-FINANCE-051', label: '偏差原因', type: '文本', length: '≤ 200 字', required: '偏差 >5% 时必填', note: '导入预览中｜课时费 ÷ 系统课时 − 课酬标准｜÷ 课酬标准 > 5% 的行必填', constraints: { maxLength: 200 } },
          { id: 'FD-FINANCE-052', label: '导入批次号', type: '只读文本', length: 'IMP+日期+序号', required: '系统', note: '批次留痕：批次号、月份、文件、操作人、时间、成功/失败/覆盖条数', constraints: { readOnly: true, system: true } },
          { id: 'FD-FINANCE-026', label: '工资状态', type: '只读标签', length: '草稿 / 已发布 / 已作废', required: '系统', note: '草稿教师端不可见；发布后金额锁定；作废重发须填原因并留痕', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        'CR-2026-170：金额由教务按月导入（模板 9 列 = 教师工号 + 年月、课酬标准、课时费、其他、应发、扣税、实发、备注；无课时列），系统不自动算薪；合同不承载任何价格。',
        '课时与课时日明细由系统从排课／考勤自动统计，按自然日归集；日明细合计＝月度系统课时；次月 1 日锁定上月，补录不追溯已发布工资单。',
        '导入唯一键 = 教师工号 × 年月；重复导入命中草稿须二次确认覆盖并保留历史版本；命中已发布阻断（须先作废重发）；工号无当月系统课时的行阻断。',
        '偏差勾稽：｜课时费 ÷ 系统课时 − 课酬标准｜÷ 课酬标准 > 5% 仅提示不阻断，但须填写偏差原因后放行；导入保存当时课时快照。',
        '导入落草稿（教师端不可见）；发布为按钮级动作（二次确认：人数、实发金额合计、异常提示），发布后金额锁定；更正走作废重发（原因必填）或草稿覆盖重导，全量留痕。',
        '课程单课时时长（45/60/90/120 四档）仅为排课属性，不参与任何计价；修改课程时长不影响任何已发布工资金额。',
        '教师端仅可查询已发布且属于本人的工资记录，展示 8 字段＋系统课时与日明细展开，只读，无在线申诉入口（如有疑问请联系教务）。'
      ]
    },
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
        { heading: '退款记录筛选字段', fields: [
          { id: 'FD-FINANCE-042', label: '课程', type: '关联对象选择（可搜索）', length: '可选课程', required: '否', note: '选项来自退款单关联课程' },
          { id: 'FD-FINANCE-043', label: '班级', type: '关联对象选择（可搜索）', length: '可选班级', required: '否', note: '选项来自退款单关联班级' },
          { id: 'FD-FINANCE-044', label: '订单号', type: '文本', length: '≤ 50 字', required: '否', note: '与学员姓名独立筛选，支持模糊匹配', constraints: { maxLength: 50 } },
          { id: 'FD-FINANCE-045', label: '学员', type: '文本', length: '≤ 30 字', required: '否', note: '与订单号独立筛选，支持姓名模糊匹配', constraints: { maxLength: 30 } }
        ] },
        { heading: '退款执行字段', fields: [
          { id: 'FD-FINANCE-012', label: '财务备注', type: '文本', length: '≤ 200 字', required: '否', note: '确认退款与取消退款的经办说明，选填', constraints: { maxLength: 200 } }
        ] },
        // CR-2026-036：线下退款登记（登记的是已发生的线下退款事实，不是发起退款申请）。
        { heading: '线下退款登记字段', fields: [
          { id: 'FD-FINANCE-035', label: '关联订单', type: '下拉', length: '已收款且无终结退款的订单', required: '是', note: '订单必须存在且已收款；已取消、退款中、已退款或已有退款记录的订单不可登记', constraints: { dictionary: '订单' } },
          { id: 'FD-FINANCE-036', label: '退款金额', type: '数字', length: '0.01 ~ 订单实收金额', required: '是', note: '默认等于订单实收金额（全额退款），允许改小为部分退款；一单仅支持一次退款，退款完成后订单终结、不支持二次发起', constraints: { min: 0.01, max: '订单实收金额' } },
          { id: 'FD-FINANCE-037', label: '退款方式', type: '下拉', length: '银行转账 / 现金 / 微信支付 / 支付宝', required: '是', note: '登记的是实际退款渠道' },
          { id: 'FD-FINANCE-038', label: '退款原因', type: '文本', length: '≤ 200 字', required: '是', note: '填写线下退款原因', constraints: { maxLength: 200 } },
          { id: 'FD-FINANCE-039', label: '退款时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '否', note: '默认登记时间；用于与银行流水核对', constraints: { format: 'YYYY-MM-DD HH:mm' } },
          { id: 'FD-FINANCE-040', label: '备注', type: '文本', length: '≤ 200 字', required: '否', note: '凭证号、经办说明等', constraints: { maxLength: 200 } },
          { id: 'FD-FINANCE-041', label: '退款方式 / 渠道', type: '只读', length: '线上 / 线下 + 渠道', required: '系统记录', note: '退款记录列表与订单详情按该列区分线上退款单与线下退款登记，筛选与指标卡计数一致', constraints: { readOnly: true, system: true } },
          { id: 'FD-FINANCE-046', label: '完成时间', type: '日期时间', length: 'YYYY-MM-DD HH:mm', required: '系统记录', note: '财务确认退款（或渠道回调成功）时由系统自动写入；退款中／已取消单据为空，展示「—」；与发起时间并列展示，用于对账与时效统计', constraints: { readOnly: true, system: true } }
        ] }
      ],
      notes: [
        'CR-2026-155 C9：退款统一由后台发起，发起后直接进入「退款中」，不设学员申请与教务审批环节；确认退款与取消退款由财务负责。',
        '面授课程与视频课程的线上退款均不再经过审批；发起、渠道处理与完成状态独立记录，保证流程可追溯。',
        'CR-2026-036：线下退款登记用于补齐视频课程与面授课程的退款出口，登记的是已经发生的线下退款事实。',
        'CR-2026-036：线下退款没有渠道回调，登记成功即视为退款完成，订单状态直接转为「已退款」，不经过「退款中」；登记失败不产生任何记录。',
        'CR-2026-036：面授订单登记后取消报名并释放名额；视频订单登记后回收该账号对课程的学习权限，已产生的学习记录、排课、考勤与计薪保留不改写。',
        'CR-2026-052：视频订单退款资格为购课期限内且观看课时不超过后台参数上限；满足时只允许按实付金额全额退款，线下登记同样复核资格。后台发起同样按退款窗口与已消课比例校验资格（CR-2026-155 C9 仅取消审批环节，不取消资格校验）。',
        '退款状态在收到渠道成功回调（或财务确认退款）前不得标记“已退款”。',
        '同一支付流水只允许发起一次退款，退款单与支付流水按唯一约束关联。',
        'CR-2026-157：退款中退款单可由财务「取消退款」（取消原因必填，记入审计），取消后退款单为「已取消」、订单回「已支付」，面授学籍保持就读、视频授权恢复生效；已取消不占用「一单一次」配额，可重新发起新退款单；不存在「退款异常→重试」链路。'
      ]
    }
  }
};


__classicExports["FINANCE_FIELD_SPEC"] = FINANCE_FIELD_SPEC;
  __classicModules["spec/fields/finance.js"] = __classicExports;
})(globalThis);
