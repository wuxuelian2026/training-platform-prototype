// 物资中心字段规格 · 唯一事实源
// 由 scripts/migrate-literal-fields.mjs 从页面说明字面量迁移生成，迁移后请只维护本文件。
// 字段口径变更后运行 `npm run check:spec` 校验一致性。

export const INVENTORY_FIELD_SPEC = {
  module: '物资中心',
  pages: {
    'inventory/stock-in': {
      groups: [
        { heading: '入库单信息', fields: [
          { id: 'FD-INVENTORY-001', label: '入库单号', type: '自动生成', length: 'RK+时间戳', required: '系统生成', note: '提交后生成，不可修改', constraints: { system: true } },
          { id: 'FD-INVENTORY-002', label: '物资名称', type: '下拉', length: '必选 1 项', required: '是', note: '只能选择已有物资，选项同时展示当前库存' },
          { id: 'FD-INVENTORY-003', label: '入库数量', type: '数字', length: '正整数', required: '是', note: '提交后按数量增加对应物资库存' },
          { id: 'FD-INVENTORY-004', label: '入库单价', type: '数字', length: '≥ 0，保留 2 位小数', required: '否', note: '选填，用于成本核算', constraints: { min: 0, decimals: 2 } },
          { id: 'FD-INVENTORY-005', label: '供应商', type: '文本', length: '≤ 50 字', required: '否', note: '选填，未填写时流水记录为“—”', constraints: { maxLength: 50 } },
          { id: 'FD-INVENTORY-006', label: '入库日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '默认取当天，可回填历史日期', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-INVENTORY-007', label: '入库类型', type: '下拉', length: '采购入库 / 退货入库 / 调拨入库 / 盘点入库 / 其他', required: '是', note: '决定入库流水的统计归类' },
          { id: 'FD-INVENTORY-008', label: '经办人', type: '下拉', length: '在职后台用户', required: '是', note: '记录操作责任人' },
          { id: 'FD-INVENTORY-009', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '提交前校验物资、正整数数量和入库日期，任一项不通过不写入库存。',
        '提交成功后增加对应物资库存，并生成一条入库流水。',
        '入库流水的单号、数量、单价、日期、类型和经办人不可修改，记录可在入库记录中查询。',
        '登记错误不通过删除处理，需以冲销方式更正。'
      ]
    },
    'inventory/stock-out': {
      groups: [
        { heading: '出库单信息', fields: [
          { id: 'FD-INVENTORY-010', label: '出库单号', type: '自动生成', length: 'CK+时间戳', required: '系统生成', note: '提交后生成，不可修改', constraints: { system: true } },
          { id: 'FD-INVENTORY-011', label: '物资名称', type: '下拉', length: '必选 1 项', required: '是', note: '只能选择已有物资，选项同时展示当前库存' },
          { id: 'FD-INVENTORY-012', label: '出库数量', type: '数字', length: '正整数', required: '是', note: '不可大于所选物资的当前库存' },
          { id: 'FD-INVENTORY-013', label: '领用人', type: '文本', length: '2–30 字', required: '否', note: '教师 / 学员 / 部门，选填', constraints: { minLength: 2, maxLength: 30 } },
          { id: 'FD-INVENTORY-014', label: '出库日期', type: '日期', length: 'YYYY-MM-DD', required: '是', note: '默认取当天，可回填历史日期', constraints: { format: 'YYYY-MM-DD' } },
          { id: 'FD-INVENTORY-015', label: '出库类型', type: '下拉', length: '教学领用 / 活动消耗 / 调拨出库 / 损耗报废 / 其他', required: '是', note: '决定出库流水的统计归类' },
          { id: 'FD-INVENTORY-016', label: '经办人', type: '下拉', length: '在职后台用户', required: '是', note: '记录操作责任人' },
          { id: 'FD-INVENTORY-017', label: '用途说明', type: '多行文本', length: '≤ 200 字', required: '是', note: '说明教学或活动用途', constraints: { maxLength: 200 } },
          { id: 'FD-INVENTORY-018', label: '备注', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } }
        ] }
      ],
      notes: [
        '提交前校验物资、正整数数量、出库日期和用途说明，任一项不通过不写入库存。',
        '出库数量大于当前库存时提示库存不足，不写入库存也不生成流水。',
        '提交成功后扣减对应物资库存，并生成一条出库流水。',
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
          { id: 'FD-INVENTORY-023', label: '初始库存', type: '数字', length: '≥ 0 的整数', required: '否', note: '默认 0，之后通过出入库调整' },
          { id: 'FD-INVENTORY-024', label: '预警阈值', type: '数字', length: '≥ 0 的整数', required: '否', note: '默认 10，低于阈值时提示' },
          { id: 'FD-INVENTORY-025', label: '存放位置', type: '文本', length: '≤ 50 字', required: '否', note: '仓库或教室', constraints: { maxLength: 50 } },
          { id: 'FD-INVENTORY-026', label: '物资描述', type: '多行文本', length: '≤ 200 字', required: '否', note: '选填', constraints: { maxLength: 200 } },
          { id: 'FD-INVENTORY-031', label: '物资图片', type: '图片上传', length: '单个图片', required: '否', note: '便于识别，选填；未上传时列表使用默认图标', constraints: { maxFiles: 1, image: true } }
        ] }
      ],
      notes: [
        '库存由入库和出库流水计算，不直接手工改写库存数。',
        '库存状态按无库存、库存不足、正常展示，库存不足的物资优先提示。',
        '已产生出入库流水的物资保留历史记录，不删除台账。'
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
    }
  }
};
