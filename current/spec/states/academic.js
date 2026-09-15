// 状态源 · 教务执行监管（10 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-LESSON",
    "object": "课次",
    "diagram": true,
    "pages": [
      "academic/timetable",
      "teacher/index",
      "academic/scheduling"
    ],
    "states": [
      [
        "scheduled",
        "待上课",
        false
      ],
      [
        "in_progress",
        "上课中",
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
      ],
      [
        "suspended",
        "已停课",
        false
      ]
    ],
    "transitions": [
      [
        "待上课",
        "开始上课",
        "上课中",
        "教师本人"
      ],
      [
        "上课中",
        "结束上课",
        "已完成",
        "教师本人"
      ],
      [
        "待上课",
        "取消课次（填原因）",
        "已取消",
        "教务主管"
      ],
      [
        "待上课",
        "停课（填原因与补课安排）",
        "已停课",
        "教务主管"
      ],
      [
        "已停课",
        "恢复上课",
        "待上课",
        "教务主管"
      ],
      [
        "待上课",
        "调课",
        "待上课",
        "教务主管"
      ]
    ]
  },
  {
    "id": "SM-ATTENDANCE",
    "object": "考勤",
    "diagram": false,
    "pages": [
      "academic/attendance",
      "teacher/class-detail"
    ],
    "states": [
      [
        "present",
        "已到",
        false
      ],
      [
        "late",
        "迟到",
        false
      ],
      [
        "leave",
        "请假",
        false
      ],
      [
        "absent",
        "缺勤",
        false
      ]
    ],
    "transitions": [
      [
        "任一取值",
        "课次结束前修改",
        "其他取值",
        "教师本人"
      ],
      [
        "任一取值",
        "待补录期内补录",
        "其他取值",
        "教师本人/教务主管"
      ]
    ]
  },
  {
    "id": "SM-ATTENDANCE-PROCESS",
    "object": "考勤处理",
    "diagram": true,
    "pages": [
      "academic/attendance"
    ],
    "states": [
      [
        "normal",
        "正常",
        true
      ],
      [
        "pending_supplement",
        "待补录",
        false
      ],
      [
        "supplemented",
        "已补录",
        true
      ]
    ],
    "transitions": [
      [
        "待补录",
        "教师 24 小时内补录",
        "已补录",
        "教师本人"
      ],
      [
        "待补录",
        "超过 24 小时教务处理",
        "已补录",
        "教务主管"
      ]
    ]
  },
  {
    "id": "SM-CLASS-GRADUATION",
    "object": "班级结业",
    "diagram": false,
    "pages": [
      "academic/graduation"
    ],
    "states": [
      [
        "pending",
        "待复核",
        false
      ],
      [
        "reviewing",
        "复核中",
        false
      ],
      [
        "archived",
        "已归档",
        true
      ]
    ],
    "transitions": [
      [
        "待复核",
        "开始复核",
        "复核中",
        "教务主管"
      ],
      [
        "复核中",
        "归档",
        "已归档",
        "系统/教务主管"
      ]
    ]
  },
  {
    "id": "SM-STUDENT-GRADUATION",
    "object": "学员结业",
    "diagram": true,
    "pages": [
      "academic/graduation",
      "learner/results"
    ],
    "states": [
      [
        "reviewing",
        "审核中",
        false
      ],
      [
        "retake_required",
        "需补课",
        false
      ],
      [
        "retaking",
        "补课中",
        false
      ],
      [
        "approved",
        "已通过",
        true
      ],
      [
        "cancelled",
        "已取消结业",
        true
      ]
    ],
    "transitions": [
      [
        "审核中",
        "审核通过",
        "已通过",
        "教务主管"
      ],
      [
        "审核中",
        "退回补课（填要求）",
        "需补课",
        "教务主管"
      ],
      [
        "需补课",
        "登记补课课次",
        "补课中",
        "教务主管"
      ],
      [
        "补课中",
        "教师重新提交",
        "审核中",
        "教师本人"
      ],
      [
        "审核中/需补课/补课中",
        "退款、退学或报名取消",
        "已取消结业",
        "系统/教务主管"
      ]
    ]
  },
  {
    "id": "SM-REPORT",
    "object": "报告",
    "diagram": true,
    "pages": [
      "academic/reports"
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
        false
      ],
      [
        "recalled",
        "已撤回",
        false
      ]
    ],
    "transitions": [
      [
        "草稿",
        "发布",
        "已发布",
        "教务主管"
      ],
      [
        "已发布",
        "撤回（填原因）",
        "已撤回",
        "教务主管"
      ],
      [
        "已撤回",
        "修订后重新发布",
        "已发布",
        "教务主管"
      ]
    ]
  },
  {
    "id": "SM-REPORT-GENERATION",
    "object": "报告生成",
    "diagram": true,
    "pages": [
      "academic/reports"
    ],
    "states": [
      [
        "pending",
        "待生成",
        false
      ],
      [
        "generating",
        "生成中",
        false
      ],
      [
        "generated",
        "已生成",
        true
      ],
      [
        "failed",
        "生成失败",
        false
      ]
    ],
    "transitions": [
      [
        "待生成",
        "任务调度",
        "生成中",
        "系统"
      ],
      [
        "生成中",
        "生成成功",
        "已生成",
        "系统"
      ],
      [
        "生成中",
        "生成或存储异常",
        "生成失败",
        "系统"
      ],
      [
        "生成失败",
        "自动重试（≤3 次）或人工重试",
        "生成中",
        "系统/教务主管"
      ]
    ]
  },
  {
    "id": "SM-CERTIFICATE-GENERATION",
    "object": "证书生成",
    "diagram": true,
    "pages": [
      "academic/graduation"
    ],
    "states": [
      [
        "pending",
        "待生成",
        false
      ],
      [
        "generating",
        "生成中",
        false
      ],
      [
        "generated",
        "已生成",
        true
      ],
      [
        "failed",
        "生成失败",
        false
      ]
    ],
    "transitions": [
      [
        "待生成",
        "任务调度",
        "生成中",
        "系统"
      ],
      [
        "生成中",
        "生成成功",
        "已生成",
        "系统"
      ],
      [
        "生成中",
        "生成或存储异常",
        "生成失败",
        "系统"
      ],
      [
        "生成失败",
        "自动重试（≤3 次）或人工重试",
        "生成中",
        "系统/教务主管"
      ]
    ]
  },
  {
    "id": "SM-NOTIFICATION-SEND",
    "object": "通知发送",
    "diagram": true,
    "pages": [
      "academic/messages",
      "learner/messages"
    ],
    "states": [
      [
        "pending",
        "待发送",
        false
      ],
      [
        "sent",
        "已发送",
        true
      ],
      [
        "failed",
        "发送失败",
        false
      ]
    ],
    "transitions": [
      [
        "待发送",
        "通道返回成功",
        "已发送",
        "系统"
      ],
      [
        "待发送",
        "通道返回失败或超时",
        "发送失败",
        "系统"
      ],
      [
        "发送失败",
        "自动重试（≤3 次）或人工补发",
        "待发送",
        "系统/教务主管/超级管理员"
      ]
    ]
  },
  {
    "id": "SM-CLASSROOM",
    "object": "教室档案",
    "diagram": false,
    "pages": [
      "academic/venues",
      "academic/timetable"
    ],
    "states": [
      [
        "active",
        "启用",
        false
      ],
      [
        "inactive",
        "停用",
        false
      ]
    ],
    "transitions": [
      [
        "启用",
        "停用教室",
        "停用",
        "教务主管/超级管理员"
      ],
      [
        "停用",
        "启用教室",
        "启用",
        "教务主管/超级管理员"
      ]
    ]
  }
];
