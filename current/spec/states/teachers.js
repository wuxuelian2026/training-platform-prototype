// 状态源 · 师资中心（5 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-TEACHER-ACCOUNT",
    "object": "教师账号",
    "diagram": true,
    "pages": [
      "teachers/list",
      "teacher/profile",
      "teachers/profile"
    ],
    "states": [
      [
        "inactive",
        "未激活",
        false
      ],
      [
        "active",
        "正常",
        false
      ],
      [
        "frozen",
        "冻结",
        false
      ]
    ],
    "transitions": [
      [
        "未激活",
        "教师激活",
        "正常",
        "教师本人"
      ],
      [
        "未激活",
        "重新发送邀请",
        "未激活",
        "超级管理员/教务主管"
      ],
      [
        "正常",
        "冻结账号",
        "冻结",
        "超级管理员/教务主管"
      ],
      [
        "冻结",
        "解冻账号",
        "正常",
        "超级管理员/教务主管"
      ]
    ]
  },
  {
    "id": "SM-TEACHER-PROFILE",
    "object": "教师资料",
    "diagram": false,
    "pages": [
      "teachers/list",
      "teacher/profile",
      "teachers/create",
      "teachers/profile"
    ],
    "states": [
      [
        "incomplete",
        "待完善",
        false
      ],
      [
        "complete",
        "已建档",
        true
      ]
    ],
    "transitions": [
      [
        "待完善",
        "保存草稿",
        "待完善",
        "超级管理员/教务主管"
      ],
      [
        "待完善",
        "完成建档并发送邀请",
        "已建档",
        "超级管理员/教务主管"
      ]
    ]
  },
  {
    "id": "SM-TEACHER-CERTIFICATE",
    "object": "教师证书",
    "diagram": true,
    "pages": [
      "teachers/certificates",
      "teachers/list",
      "teacher/certificates"
    ],
    "states": [
      [
        "pending",
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
        "审核通过",
        "已通过",
        "教研主管"
      ],
      [
        "待审核",
        "驳回",
        "已驳回",
        "教研主管"
      ],
      [
        "待审核",
        "撤回",
        "已撤销",
        "教师本人、教研主管"
      ],
      [
        "已驳回",
        "重新上传并提交",
        "待审核",
        "教师本人/教研主管"
      ],
      [
        "已撤销",
        "重新上传并提交",
        "待审核",
        "教师本人/教研主管"
      ]
    ]
  },
  {
    "id": "SM-TEACHER-CONTRACT",
    "object": "教师合同",
    "diagram": true,
    "pages": [
      "teachers/contracts",
      "teacher/contracts",
      "teacher/contract-detail"
    ],
    "states": [
      [
        "pending_teacher",
        "待教师签署",
        false
      ],
      [
        "pending_school",
        "待学校签署",
        false
      ],
      [
        "signed",
        "已签署",
        false
      ],
      [
        "terminated",
        "已终止",
        true
      ]
    ],
    "transitions": [
      [
        "待教师签署",
        "教师签署",
        "待学校签署",
        "教师本人"
      ],
      [
        "待学校签署",
        "学校签署",
        "已签署",
        "超级管理员/教务主管"
      ],
      [
        "待教师签署/待学校签署/已签署",
        "终止合同（填原因）",
        "已终止",
        "超级管理员/教务主管"
      ]
    ]
  }
];
