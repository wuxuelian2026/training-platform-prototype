// 状态源 · 财务中心（2 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
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
      ]
    ],
    "transitions": [
      [
        "草稿",
        "核定并发布",
        "已发布",
        "财务"
      ]
    ]
  },
  {
    "id": "SM-SALARY-DIFFERENCE",
    "object": "工资差异",
    "diagram": false,
    "pages": [
      "finance/salary"
    ],
    "states": [
      [
        "pending",
        "待处理",
        false
      ],
      [
        "resolved",
        "已处理",
        true
      ]
    ],
    "transitions": [
      [
        "待处理",
        "下月补算或调整",
        "已处理",
        "财务"
      ]
    ]
  }
];
