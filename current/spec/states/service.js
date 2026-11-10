(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 状态源 · 客服知识库（2 台状态机，CR-2026-172）
// 留言状态复用既有 consultations 的「待回复／已回复」，不新增状态字典。
const STATE_MACHINES = [
  {
    "id": "SM-SERVICE-KB",
    "object": "常见问题库条目",
    "diagram": false,
    "pages": [
      "service/index"
    ],
    "states": [
      ["off", "下架", false],
      ["on", "上架", false]
    ],
    "transitions": [
      ["下架", "上架", "上架", "客服"],
      ["上架", "下架", "下架", "客服"]
    ]
  },
  {
    "id": "SM-SERVICE-MISS",
    "object": "未命中问题归并组",
    "diagram": false,
    "pages": [
      "service/index"
    ],
    "states": [
      ["pending", "待处理", false],
      ["converted", "已转化", true],
      ["ignored", "已忽略", true]
    ],
    "transitions": [
      ["待处理", "转为知识条目", "已转化", "客服"],
      ["待处理", "忽略", "已忽略", "客服"]
    ]
  }
];


__classicExports["STATE_MACHINES"] = STATE_MACHINES;
  __classicModules["spec/states/service.js"] = __classicExports;
})(globalThis);
