// 状态源 · 面授招生与CRM（3 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-CLASS-SCHEDULE-STAGE",
    "object": "阶段1 排课状态",
    "diagram": false,
    "pages": ["crm/classes"],
    "states": [["pending", "待排课", false], ["scheduling", "排课中", false], ["completed", "已完成", true], ["cancelled", "已取消", true]],
    "transitions": [["待排课", "保存排课草稿", "排课中", "教务主管"], ["待排课/排课中", "确认发布并生成正式课次", "已完成", "教务主管"], ["待排课/排课中", "取消班级", "已取消", "教务主管"]]
  },
  {
    "id": "SM-CLASS-ENROLLMENT-STAGE",
    "object": "阶段2 招生状态",
    "diagram": false,
    "pages": ["crm/classes"],
    "states": [["not_started", "未开始", false], ["active", "进行中", false], ["ended", "已结束", true]],
    "transitions": [["未开始", "到达报名开始时间", "进行中", "系统"], ["进行中", "到达报名截止时间或首课时间", "已结束", "系统"]]
  },
  {
    "id": "SM-CLASS-TEACHING-STAGE",
    "object": "阶段3 教学状态",
    "diagram": false,
    "pages": ["crm/classes"],
    "states": [["pending", "待开课", false], ["teaching", "授课中", false], ["ended", "已结课", true]],
    "transitions": [["待开课", "到达首课开始时间", "授课中", "系统"], ["授课中", "全部课次完成", "已结课", "系统"]]
  },
  {
    "id": "SM-CLASS-OPERATION",
    "object": "班级运营",
    "diagram": true,
    "pages": [
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
        "待排课/待发布",
        "取消班级",
        "已取消",
        "教务主管"
      ]
    ]
  },
  {
    // CR-2026-038 §3.1：销售线索状态机（字典 §12.4），承载 crm/leads；CR-2026-152 起转化漏斗并入线索跟进页。
    "id": "SM-LEAD",
    "object": "销售线索",
    "diagram": false,
    "pages": [
      "crm/leads"
    ],
    "states": [
      [
        "pending_followup",
        "待跟进",
        false
      ],
      [
        "followed",
        "已跟进",
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
        "待跟进",
        "首次有效跟进",
        "已跟进",
        "销售"
      ],
      [
        "已跟进",
        "生成面授订单",
        "已转化",
        "系统"
      ],
      [
        "已跟进",
        "填写流失原因",
        "已流失",
        "销售"
      ],
      [
        "已流失",
        "重新激活（填原因）",
        "待跟进",
        "销售"
      ]
    ]
  },
  {
    // CR-2026-038 §3.1：试听预约状态机（字典 §12.5），承载 crm/trials；CR-2026-152 起转化漏斗并入线索跟进页。
    "id": "SM-TRIAL",
    "object": "试听预约",
    "diagram": false,
    "pages": [
      "crm/trials"
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
      "learner/orders"
    ],
    "states": [
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
        "已分班",
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
