# 培训子系统原型

湖北艺术职业学院继续教育服务平台培训子系统交互原型。

本项目用于产品评审、业务流程确认和开发沟通，不代表最终生产系统。

## 本地运行

### 环境要求

- Node.js 18 或更高版本
- npm

### 启动开发服务

```bash
cd current
npm install
npm run dev
```

启动后，在浏览器访问终端输出的地址。默认开发地址为：

```text
http://127.0.0.1:4173/
```

### 构建和预览

```bash
cd current
npm run build
npm run preview
```

## 原型入口

在开发服务启动后，可以访问以下入口：

| 端|路径|说明|
|---|---|---|
|总入口|`/index.html`|学员端、教师端、后台和可视化入口|
|登录页|`/login.html`|学员端和教师端登录原型|
|后台管理端|`/admin/index.html`|培训后台管理功能|
|教师端|`/teacher/index.html`|教师工作台和移动端功能|
|学员端|`/learner/index.html`|学员学习和报名功能|
|运营可视化|`/visualization/index.html`|培训运营数据看板|

## 目录说明

```text
原型HTML/
├── current/                  # 当前开发和评审版本
│   ├── admin/                # 后台管理端
│   ├── teacher/              # 教师端
│   ├── learner/              # 学员端
│   ├── visualization/       # 运营可视化大屏
│   ├── shared/               # 三端共享样式和脚本
│   ├── package.json          # 项目脚本和依赖
│   └── vite.config.js        # Vite 配置
├── releases/                 # 已冻结的发布版本
├── changes/                  # 原型变更单
└── 版本管理说明.md            # 原型版本管理规则
```

## 版本管理

- 当前开发和评审修改只进入 `current/`。
- 完成评审后，将完整原型复制到 `releases/Vx.y.z/` 进行冻结保存。
- 已发布版本不直接覆盖；页面或交互变化使用原型变更单记录。
- 影响状态、字段、权限或业务流程的变化，需要同步更新对应 PRD 和需求追踪矩阵。

版本号规则：

- `V1.0.1`：视觉或文案等修订
- `V1.1.0`：新增功能
- `V2.0.0`：破坏既有交互或业务规则的重大变化

## GitHub 发布注意事项

- 不要提交 `node_modules/` 和构建生成的 `dist/`。
- 上传前确认没有真实手机号、身份证号、账号、密码、接口密钥或其他敏感资料。
- PRD、客户确认版文档、内部会议材料等资料应单独管理，不要随原型公开发布。
- 如果使用 GitHub Pages 发布在线演示，需要检查页面中的绝对路径，并确认项目子路径下的页面跳转正常。

## 迭代版本与在线预览

- `main`：迭代 1 冻结版，冻结提交为 `01174e0`，后续不接受迭代 2 的直接覆盖。
- `iteration-2`：迭代 2 当前开发和评审版。
- GitHub Pages 根地址：迭代 2 当前评审版。
- GitHub Pages `/iteration-1/`：迭代 1 冻结版。

发布后的预览地址：

```text
https://wuxuelian2026.github.io/training-platform-prototype/
https://wuxuelian2026.github.io/training-platform-prototype/iteration-1/
```

迭代 1 的开发源代码已经在线下冻结，线上原型仅用于回看和评审；实际开发以开发团队的线下代码为准。迭代 2 评审期间只推送 `iteration-2` 分支，确认冻结后再决定是否将其作为新的默认版本。

## 当前原型范围

当前原型覆盖培训子系统的后台管理端、教师端、学员端及运营可视化等主要业务场景。页面中的数据为演示数据，交互主要用于流程验证和界面评审。
