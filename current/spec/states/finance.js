(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 状态源 · 财务中心（1 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；CR-2026-170：工资改教务导入，SM-SALARY 改为草稿／已发布／已作废，
// 原「工资差异」状态机随 CR-20261102-14 自动计薪撤销一并删除（偏差改为导入预览勾稽提示，不构成状态）。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
const STATE_MACHINES = [
  {
    "id": "SM-SALARY",
    "object": "工资",
    "diagram": false,
    "pages": [
      "finance/salary",
      "teacher/salary"
    ],
    "states": [
      [
        "draft",
        "草稿",
        false
      ],
      [
        "published",
        "已发布",
        true
      ],
      [
        "voided",
        "已作废",
        true
      ]
    ],
    "transitions": [
      [
        "草稿",
        "确认发布",
        "已发布",
        "教务"
      ],
      [
        "已发布",
        "作废重发",
        "已作废",
        "教务"
      ]
    ]
  }
];


__classicExports["STATE_MACHINES"] = STATE_MACHINES;
  __classicModules["spec/states/finance.js"] = __classicExports;
})(globalThis);
