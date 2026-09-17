// 状态源 · 面授招生与CRM（3 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-CLASS-OPERATION",
    "object": "班级运营",
    "diagram": true,
    "pages": [
      "crm/classes",
      "academic/scheduling",
      "learner/fast-registration",
      "learner/class-detail"
    ],
    "states": [
      [
        "pending_schedule",
        "待排课",
        false
      ],
      [
        "pending_publish",
        "待发布",
        false
      ],
      [
        "recruiting",
        "招生中",
        false
      ],
      [
        "in_progress",
        "进行中",
        false
      ],
      [
        "ended",
        "已结束",
        true
      ],
      [
        "cancelled",
        "已取消",
        true
      ]
    ],
    "transitions": [
      [
        "待排课",
        "保存排班草稿",
        "待发布",
        "教务主管"
      ],
      [
        "待发布",
        "确认并发布",
        "招生中",
        "教务主管"
      ],
      [
        "招生中",
        "到达首课日期",
        "进行中",
        "系统"
      ],
      [
        "进行中",
        "全部课次完成",
        "已结束",
        "系统"
      ],
      [
        "待排课/待发布/招生中/进行中",
        "取消班级",
        "已取消",
        "教务主管"
      ]
    ]
  },
  {
    // CR-2026-038 §3.1：销售线索状态机（字典 §12.4），承载 crm/leads 与派生视图 crm/conversions。
    "id": "SM-LEAD",
    "object": "销售线索",
    "diagram": false,
    "pages": [
      "crm/leads",
      "crm/conversions"
    ],
    "states": [
      [
        "pending_assign",
        "待分配",
        false
      ],
      [
        "following",
        "跟进中",
        false
      ],
      [
        "converted",
        "已转化",
        true
      ],
      [
        "lost",
        "已流失",
        true
      ]
    ],
    "transitions": [
      [
        "待分配",
        "指派负责人",
        "跟进中",
        "销售"
      ],
      [
        "跟进中",
        "生成面授订单",
        "已转化",
        "系统"
      ],
      [
        "跟进中",
        "填写流失原因",
        "已流失",
        "销售"
      ],
      [
        "已流失",
        "重新激活（填原因）",
        "跟进中",
        "销售"
      ]
    ]
  },
  {
    // CR-2026-038 §3.1：试听预约状态机（字典 §12.5），承载 crm/trials 与派生视图 crm/conversions。
    "id": "SM-TRIAL",
    "object": "试听预约",
    "diagram": false,
    "pages": [
      "crm/trials",
      "crm/conversions"
    ],
    "states": [
      [
        "pending_confirm",
        "待确认",
        false
      ],
      [
        "confirmed",
        "已确认",
        false
      ],
      [
        "attended",
        "已试听",
        true
      ],
      [
        "cancelled",
        "已取消",
        true
      ]
    ],
    "transitions": [
      [
        "待确认",
        "确认时间并发送通知",
        "已确认",
        "课程顾问"
      ],
      [
        "已确认",
        "完成试听",
        "已试听",
        "课程顾问"
      ],
      [
        "待确认/已确认",
        "填写原因取消",
        "已取消",
        "课程顾问"
      ]
    ]
  },
  {
    "id": "SM-CLASS-DISPLAY",
    "object": "班级前台展示",
    "diagram": true,
    "pages": [
      "crm/classes",
      "learner/fast-registration"
    ],
    "states": [
      [
        "not_published",
        "未发布",
        false
      ],
      [
        "published",
        "已展示",
        false
      ],
      [
        "unpublished",
        "已下架",
        false
      ]
    ],
    "transitions": [
      [
        "未发布",
        "发布",
        "已展示",
        "教务主管"
      ],
      [
        "已展示",
        "下架",
        "已下架",
        "教务主管"
      ],
      [
        "已下架",
        "重新展示",
        "已展示",
        "教务主管"
      ]
    ]
  },
  {
    "id": "SM-ENROLLMENT",
    "object": "报名",
    "diagram": true,
    "pages": [
      "crm/classes",
      "learner/orders"
    ],
    "states": [
      [
        "pending",
        "待分班",
        false
      ],
      [
        "assigned",
        "已分班",
        false
      ],
      [
        "completed",
        "已完成",
        true
      ],
      [
        "cancelled",
        "已取消",
        true
      ]
    ],
    "transitions": [
      [
        "待分班",
        "系统自动分班",
        "已分班",
        "系统"
      ],
      [
        "待分班/已分班",
        "退款完成",
        "已取消",
        "系统"
      ],
      [
        "已分班",
        "课程交付完成",
        "已完成",
        "系统"
      ]
    ]
  }
];
