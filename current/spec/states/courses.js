// 状态源 · 课程中心（2 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-COURSE-APPLICATION",
    "object": "课程申报",
    "diagram": true,
    "pages": [
      "courses/applications",
      "courses/application-review",
      "teacher/applications",
      "teacher/application-detail"
    ],
    "states": [
      [
        "reviewing",
        "待审核",
        false
      ],
      [
        "approved",
        "已通过",
        true
      ],
      [
        "rejected",
        "已驳回",
        false
      ],
      [
        "withdrawn",
        "已撤销",
        false
      ]
    ],
    "transitions": [
      [
        "待审核",
        "审批通过",
        "已通过",
        "教研主管"
      ],
      [
        "待审核",
        "驳回（填原因）",
        "已驳回",
        "教研主管"
      ],
      [
        "待审核",
        "撤销申报",
        "已撤销",
        "教师本人"
      ],
      [
        "已驳回/已撤销",
        "修改后重新提交",
        "待审核",
        "教师本人"
      ]
    ]
  },
  {
    "id": "SM-COURSE-ARRANGE",
    "object": "课程编排",
    "diagram": false,
    "pages": [
      "courses/content",
      "courses/library"
    ],
    "states": [
      [
        "pending",
        "待编排",
        false
      ],
      [
        "editing",
        "编排中",
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
        "待编排",
        "开始编排",
        "编排中",
        "教研主管/教务主管"
      ],
      [
        "编排中",
        "完成编排",
        "已完成",
        "教研主管/教务主管"
      ]
    ]
  }
];
