// 状态源 · 学员端学习（3 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-VIDEO-LEARNING",
    "object": "视频学习",
    "diagram": false,
    "pages": [
      "learner/learning",
      "learner/video"
    ],
    "states": [
      [
        "not_started",
        "未开始",
        false
      ],
      [
        "learning",
        "学习中",
        false
      ],
      [
        "completed",
        "已完成",
        true
      ]
    ],
    "transitions": [
      [
        "未开始",
        "开始学习",
        "学习中",
        "学员端用户"
      ],
      [
        "学习中",
        "达成完成条件",
        "已完成",
        "系统"
      ]
    ]
  },
  {
    "id": "SM-VIDEO-PERMISSION",
    "object": "学习权限",
    "diagram": true,
    "pages": [
      "learner/learning",
      "learner/video"
    ],
    "states": [
      [
        "active",
        "生效",
        false
      ],
      [
        "frozen",
        "冻结",
        false
      ],
      [
        "expired",
        "已到期",
        true
      ],
      [
        "revoked",
        "已失效",
        true
      ]
    ],
    "transitions": [
      [
        "生效",
        "临时冻结",
        "冻结",
        "系统/超级管理员"
      ],
      [
        "冻结",
        "恢复生效",
        "生效",
        "系统/超级管理员"
      ],
      [
        "生效",
        "授权期限到达",
        "已到期",
        "系统"
      ],
      [
        "生效/冻结",
        "运营停用或风控撤销",
        "已失效",
        "超级管理员"
      ],
      [
        "冻结",
        "视频退款完成",
        "已失效",
        "系统"
      ]
    ]
  },
  {
    "id": "SM-NOTIFICATION-READ",
    "object": "通知阅读",
    "diagram": false,
    "pages": [
      "learner/messages",
      "teacher/messages"
    ],
    "states": [
      [
        "unread",
        "未读",
        false
      ],
      [
        "read",
        "已读",
        true
      ]
    ],
    "transitions": [
      [
        "未读",
        "阅读通知",
        "已读",
        "学员端用户/教师本人/后台用户"
      ]
    ]
  }
];
