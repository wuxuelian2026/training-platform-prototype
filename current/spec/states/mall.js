// 状态源 · 商城运营（1 台状态机）
// 来源：PRD/开发实施PRD/05-状态字典.md；产品交付件 spec-states-数据-20260915.js。
// 字段：id 状态机编号；object 业务对象；states [code, label, terminal]；transitions [from, event, to, role]；
//       pages 承载页面（决定页面说明的状态段出现在哪些页）；diagram 是否出图。不得在此新增或改写状态语义。
export const STATE_MACHINES = [
  {
    "id": "SM-PRODUCT",
    "object": "商品",
    "diagram": true,
    "pages": [
      "mall/products",
      "learner/courses",
      "learner/course-detail"
    ],
    "states": [
      [
        "draft",
        "草稿",
        false
      ],
      [
        "published",
        "已上架",
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
        "草稿",
        "上架",
        "已上架",
        "商城运营/超级管理员"
      ],
      [
        "已上架",
        "下架",
        "已下架",
        "商城运营/超级管理员"
      ],
      [
        "已下架",
        "重新上架（复用原商品）",
        "已上架",
        "商城运营/超级管理员"
      ]
    ]
  },
  // CR-2026-017：轮播图启用/停用两态（不出图），承载页面 mall/banners。
  {
    "id": "SM-BANNER",
    "object": "轮播图",
    "diagram": false,
    "pages": [
      "mall/banners"
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
        "停用",
        "停用",
        "商城运营/超级管理员"
      ],
      [
        "停用",
        "启用",
        "启用",
        "商城运营/超级管理员"
      ]
    ]
  }
];
