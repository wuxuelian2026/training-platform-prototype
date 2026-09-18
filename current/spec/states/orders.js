// 状态源 · 订单与支付（3 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-ORDER",
    "object": "订单",
    "diagram": true,
    "pages": [
      "mall/orders",
      "learner/orders",
      "learner/order-detail"
    ],
    "states": [
      [
        "pending",
        "待支付",
        false
      ],
      [
        "paid",
        "已支付",
        false
      ],
      [
        "cancelled",
        "已取消",
        true
      ],
      [
        "refunding",
        "退款中",
        false
      ],
      [
        "refunded",
        "已退款",
        true
      ]
    ],
    "transitions": [
      [
        "待支付",
        "支付成功",
        "已支付",
        "系统"
      ],
      [
        "待支付",
        "取消或超时",
        "已取消",
        "学员端用户/系统"
      ],
      [
        "已支付",
        "视频退款资格校验通过",
        "退款中",
        "购买账号"
      ],
      [
        "已支付",
        "面授退款审批通过",
        "退款中",
        "教务主管/财务"
      ],
      [
        "已支付",
        "名额占用失败自动退款",
        "退款中",
        "系统"
      ],
      [
        "退款中",
        "渠道退款完成",
        "已退款",
        "系统"
      ],
      [
        "已支付",
        "线下登记退款",
        "已退款",
        "具备退款登记权限的后台角色"
      ]
    ]
  },
  {
    "id": "SM-PAYMENT",
    "object": "支付记录",
    "diagram": true,
    "pages": [
      "finance/payments",
      "mall/orders"
    ],
    "states": [
      [
        "awaiting_confirmation",
        "待确认",
        false
      ],
      [
        "received",
        "已到账",
        true
      ],
      [
        "exception",
        "异常",
        false
      ]
    ],
    "transitions": [
      [
        "待确认",
        "渠道回调确认",
        "已到账",
        "系统"
      ],
      [
        "待确认",
        "校验失败或对账不平",
        "异常",
        "系统/财务"
      ],
      [
        "异常",
        "财务人工确认",
        "已到账",
        "财务"
      ]
    ]
  },
  {
    "id": "SM-REFUND-OFFLINE",
    "object": "退款申请",
    "diagram": true,
    "pages": [
      "finance/refunds",
      "learner/order-detail"
    ],
    "states": [
      [
        "pending",
        "待审批",
        false
      ],
      [
        "processing",
        "退款中",
        false
      ],
      [
        "completed",
        "已退款",
        true
      ],
      [
        "rejected",
        "已拒绝",
        true
      ]
    ],
    "transitions": [
      [
        "待审批",
        "审批通过",
        "退款中",
        "教务主管"
      ],
      [
        "待审批",
        "审批拒绝（填原因）",
        "已拒绝",
        "教务主管"
      ],
      [
        "退款中",
        "渠道退款完成",
        "已退款",
        "系统"
      ],
      [
        "退款中",
        "失败或超时后重试",
        "退款中",
        "系统"
      ]
    ]
  }
];
