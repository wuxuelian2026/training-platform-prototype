// 状态源 · 系统管理（1 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-STUDENT-ACCOUNT",
    "object": "学员端账号",
    "diagram": false,
    "pages": [
      "system/student-users",
      "learner/profile"
    ],
    "states": [
      [
        "active",
        "启用",
        false
      ],
      [
        "frozen",
        "禁用",
        false
      ]
    ],
    "transitions": [
      [
        "启用",
        "禁用账号（填原因）",
        "禁用",
        "超级管理员"
      ],
      [
        "禁用",
        "启用账号",
        "启用",
        "超级管理员"
      ]
    ]
  },
  // CR-2026-017：后台角色启用/禁用两态（不出图），承载页面 system/roles。
  {
    "id": "SM-ROLE",
    "object": "后台角色",
    "diagram": false,
    "pages": [
      "system/roles"
    ],
    "states": [
      [
        "active",
        "启用",
        false
      ],
      [
        "inactive",
        "禁用",
        false
      ]
    ],
    "transitions": [
      [
        "启用",
        "禁用角色",
        "禁用",
        "超级管理员"
      ],
      [
        "禁用",
        "启用角色",
        "启用",
        "超级管理员"
      ]
    ]
  }
];
