// 物资中心字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。

export const INVENTORY_FIELD_SPEC = {
  module: '物资中心',
  pages: {
    'inventory/stock-in': {
      groups: [
        { heading: '入库单信息', fields: [
          { id: 'FD-INVENTORY-001', label: '入库单号', type: '自动生成', length: 'RKYYYYMMDDxxxx', required: '系统生成', note: '由服务端生成，提交后不可修改；重试复用原单号', constraints: { system: true } },
          { id: 'FD-INVENTORY-002', label: '物资名称', type: '下拉', length: '必选 1 项', required: '是', note: '只能选择已有物资，选项同时展示当前库存' },
          { id: 'FD-INVENTORY-003', label: '入库数量', type: '数字', length: '正整数', required: '是', note: '提交后按数量增加对应物资库存' },
          { id: 'FD-INVENTORY-004', label: '入库单价', type: '数字', length: '≥ 0，保留 2 位小数', required: '否', note: '选填，仅随入库流水记录，MVP 不用于库存成本核算', constraints: { min: 0, decimals: 2 } },
          { id: 'FD-INVENTORY-005', label: '供应商', type: '文本', length: '≤ 50 字', required: '否', note: '选填，未填写时流水记录为“—”', constraints: { maxLength: 50 } },
          { id: 'FD-INVENTORY-006', label: '入库日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '默认取当天，可回填历史日期', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-INVENTORY-007', label: '入库类型', type: '下拉', length: '采购入库 / 其他', required: '是', note: 'MVP仅区分基础入库来源' },
          { id: 'FD-INVENTORY-008', label: '经办人', type: '下拉', length: '在职后台用户', required: '是', note: '记录操作责任人' },
          { id: 'FD-INVENTORY-009', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '提交前校验物资、正整数数量和入库日期，任一项不通过不写入库存。',
        '提交成功后增加对应物资库存，并生成一条入库流水。',
        '一次提交只允许变更一次库存并生成一条流水；提交处理中按钮锁定，重复提交不重复记账。',
        '入库流水的单号、数量、单价、日期、类型和经办人不可修改，记录可在入库记录中查询。',
        '登记错误不通过删除处理，需以冲销方式更正。'
      ]
    },
    'inventory/stock-out': {
      groups: [
        { heading: '出库单信息', fields: [
          { id: 'FD-INVENTORY-010', label: '出库单号', type: '自动生成', length: 'CKYYYYMMDDxxxx', required: '系统生成', note: '由服务端生成，提交后不可修改；重试复用原单号', constraints: { system: true } },
          { id: 'FD-INVENTORY-011', label: '物资名称', type: '下拉', length: '必选 1 项', required: '是', note: '只能选择已有物资，选项同时展示当前库存' },
          { id: 'FD-INVENTORY-012', label: '出库数量', type: '数字', length: '正整数', required: '是', note: '不可大于所选物资的当前库存' },
          { id: 'FD-INVENTORY-013', label: '领用人', type: '文本', length: '2–30 字', required: '否', note: '教师 / 学员 / 部门，选填', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-INVENTORY-014', label: '出库日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '默认取当天，可回填历史日期', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-INVENTORY-015', label: '出库类型', type: '下拉', length: '教学领用 / 其他', required: '是', note: 'MVP仅区分基础出库用途' },
          { id: 'FD-INVENTORY-016', label: '经办人', type: '下拉', length: '在职后台用户', required: '是', note: '记录操作责任人' },
          { id: 'FD-INVENTORY-017', label: '用途说明', type: '多行文本', length: '≤ 200 字', required: '是', note: '说明教学或活动用途', constraints: { maxLength: 200 } },
          { id: 'FD-INVENTORY-018', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '提交前校验物资、正整数数量、出库日期和用途说明，任一项不通过不写入库存。',
        '出库数量大于当前库存时提示库存不足，不写入库存也不生成流水。',
        '提交成功后扣减对应物资库存，并生成一条出库流水。',
        '一次提交只允许变更一次库存并生成一条流水；提交处理中按钮锁定，重复提交不重复记账。',
        '出库流水的单号、数量、日期、类型和经办人不可修改，记录可在出库记录中查询。',
        '登记错误不通过删除处理，需以冲销方式更正。'
      ]
    },
    'inventory/materials': {
      groups: [
        { heading: '新增物资字段', fields: [
          { id: 'FD-INVENTORY-019', label: '物资名称', type: '文本', length: '≤ 50 字', required: '是', note: '物资台账名称', constraints: { maxLength: 50 } },
          { id: 'FD-INVENTORY-020', label: '物资分类', type: '下拉', length: '预置分类', required: '否', note: '用于分类统计与筛选' },
          { id: 'FD-INVENTORY-021', label: '规格型号', type: '文本', length: '≤ 50 字', required: '否', note: '如 HB 2B', constraints: { maxLength: 50 } },
          { id: 'FD-INVENTORY-022', label: '单位', type: '下拉', length: '预置单位', required: '否', note: '计量单位' },
          { id: 'FD-INVENTORY-024', label: '预警阈值', type: '数字', length: '≥ 0 的整数', required: '否', note: '默认 10，低于阈值时提示' },
          { id: 'FD-INVENTORY-025', label: '存放位置', type: '文本', length: '≤ 50 字', required: '否', note: '仓库或教室', constraints: { maxLength: 50 } },
          { id: 'FD-INVENTORY-026', label: '物资描述', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } },
          { id: 'FD-INVENTORY-031', label: '物资图片', type: '图片上传', length: '单个图片', required: '否', note: '便于识别，选填；未上传时列表使用默认图标', constraints: { maxFiles: 1, image: true } }
        ] }
      ],
      notes: [
        '新增物资库存固定为0，库存只能由入库和出库流水变更，不直接手工改写库存数。',
        '库存状态按无库存、库存不足、正常展示，库存不足的物资优先提示。',
        '已产生出入库流水的物资保留历史记录，不删除台账；物资仅允许停用。'
      ]
    },
    'inventory/categories': {
      groups: [
        { heading: '新增分类字段', fields: [
          { id: 'FD-INVENTORY-027', label: '分类名称', type: '文本', length: '2–30 字', required: '是', note: '如 乐器类', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-INVENTORY-028', label: '上级分类', type: '下拉', length: '可选上级', required: '否', note: '留空表示一级分类' },
          { id: 'FD-INVENTORY-029', label: '分类编码', type: '文本', length: '≤ 30 字', required: '否', note: '选填，用于外部对照', constraints: { maxLength: 30 } },
          { id: 'FD-INVENTORY-030', label: '排序', type: '数字', length: '0 及以上整数', required: '否', note: '数字越小越靠前', constraints: { min: 0, integer: true } }
        ] }
      ],
      notes: [
        '已被物资引用的分类不允许直接删除，需先停用或迁移物资。',
        '分类层级不宜超过两级，避免台账统计口径分裂。'
      ]
    },
    'inventory/inbound-records': {
      groups: [{ heading: '入库记录查询字段', fields: [
        { id: 'FD-INVENTORY-032', label: '物资名称', type: '下拉', length: '已有物资', required: '否', note: '按入库物资筛选' },
        { id: 'FD-INVENTORY-033', label: '入库类型', type: '下拉', length: '采购入库 / 其他', required: '否', note: '按入库来源筛选' },
        { id: 'FD-INVENTORY-034', label: '供应商', type: '文本', length: '≤ 50 字', required: '否', note: '按供应商关键词筛选', constraints: { maxLength: 50 } },
        { id: 'FD-INVENTORY-035', label: '经办人', type: '下拉', length: '后台用户', required: '否', note: '按流水经办人筛选' },
        { id: 'FD-INVENTORY-036', label: '入库单号', type: '文本（只读）', length: 'RKYYYYMMDDxxxx', required: '系统生成', note: '提交时生成且不可修改', constraints: { readOnly: true, system: true } },
        { id: 'FD-INVENTORY-037', label: '入库数量', type: '数字（只读）', length: '正整数', required: '系统记录', note: '入库流水数量', constraints: { readOnly: true, integer: true } },
        { id: 'FD-INVENTORY-038', label: '入库日期', type: '日期（只读）', length: 'YYYY-MM-DD', required: '系统记录', note: '入库流水日期', constraints: { readOnly: true, format: 'YYYY-MM-DD' } }
      ] }], notes: ['流水只读，登记错误通过新增反向流水冲销。']
    },
    'inventory/ledger': {
      groups: [{ heading: '库存台账字段', fields: [
        { id: 'FD-INVENTORY-039', label: '物资名称', type: '文本', length: '≤ 50 字', required: '否', note: '按物资名称关键词筛选', constraints: { maxLength: 50 } },
        { id: 'FD-INVENTORY-040', label: '物资分类', type: '下拉', length: '预置分类', required: '否', note: '按物资分类筛选' },
        { id: 'FD-INVENTORY-041', label: '库存状态', type: '下拉', length: '正常 / 库存不足 / 无库存', required: '否', note: '按当前库存与预警阈值派生' },
        { id: 'FD-INVENTORY-042', label: '当前库存', type: '整数（只读）', length: '非负整数', required: '系统派生', note: '入库数量减出库数量，不支持直接编辑', constraints: { readOnly: true, derived: true, integer: true } },
        { id: 'FD-INVENTORY-043', label: '预警阈值', type: '整数（只读）', length: '非负整数', required: '台账记录', note: '来自物资档案', constraints: { readOnly: true, derived: true, integer: true } },
        { id: 'FD-INVENTORY-044', label: '单位', type: '文本（只读）', length: '预置单位', required: '系统记录', note: '来自物资档案', constraints: { readOnly: true, derived: true } }
      ] }], notes: ['台账库存只由入库和出库流水计算，不提供手工调库存。']
    },
    'inventory/outbound-records': {
      groups: [{ heading: '出库记录查询字段', fields: [
        { id: 'FD-INVENTORY-045', label: '物资名称', type: '下拉', length: '已有物资', required: '否', note: '按出库物资筛选' },
        { id: 'FD-INVENTORY-046', label: '出库类型', type: '下拉', length: '教学领用 / 其他', required: '否', note: '按出库用途筛选' },
        { id: 'FD-INVENTORY-047', label: '领用人', type: '文本', length: '2–30 字', required: '否', note: '按领用人关键词筛选', constraints: { minLength: 2, maxLength: 30 } },
        { id: 'FD-INVENTORY-048', label: '经办人', type: '下拉', length: '后台用户', required: '否', note: '按流水经办人筛选' },
        { id: 'FD-INVENTORY-049', label: '出库单号', type: '文本（只读）', length: 'CKYYYYMMDDxxxx', required: '系统生成', note: '提交时生成且不可修改', constraints: { readOnly: true, system: true } },
        { id: 'FD-INVENTORY-050', label: '出库数量', type: '数字（只读）', length: '正整数', required: '系统记录', note: '出库流水数量', constraints: { readOnly: true, integer: true } },
        { id: 'FD-INVENTORY-051', label: '用途说明', type: '文本（只读）', length: '≤ 200 字', required: '系统记录', note: '出库登记用途说明', constraints: { readOnly: true, maxLength: 200 } }
      ] }], notes: ['出库数量不得超过当时可用库存；流水只读，错误通过反向流水冲销。']
    }
  }
};
