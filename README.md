<div align="center">

# 智策 · 个人AI决策助手

### 你的专属人生战略顾问，用知识神经网络可视化你的成长路径

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)
![React](https://img.shields.io/badge/react-19-61dafb.svg)
![NestJS](https://img.shields.io/badge/nestjs-10-e0234e.svg)
![TypeScript](https://img.shields.io/badge/typescript-5-3178c6.svg)

[![Live Demo](https://img.shields.io/badge/🚀_在线体验-立即试用-FF6B9D?style=for-the-badge)](https://4m5spt2uqph0w.doubaoapps.com/app/app_17f4sydgrtj)

[**在线体验**](https://4m5spt2uqph0w.doubaoapps.com/app/app_17f4sydgrtj) · [**功能特性**](#功能特性) · [**快速开始**](#快速开始) · [**API文档**](docs/API.md) · [**贡献指南**](CONTRIBUTING.md)

</div>

---

## 这是什么？

「智策」是一个**个人成长与职业决策可视化工具**。它把你的经历、技能、目标、变现路径以**神经网络图谱**的形式画出来，节点之间的连线表示关联关系，帮你一眼看清自己的能力结构和发展路径。

再接入大模型后，它能基于你的真实数据给出个性化建议——不是泛泛而谈的鸡汤，而是"根据你已有的X，下一步推荐做Y"。

## 功能特性

- 🧠 **知识神经网络** — Canvas 绘制可交互节点关系图，支持拖拽、缩放、单击高亮连线、双击编辑
- 📝 **卡片编辑系统** — 教育经历、工作经历、技术栈、约束条件、三阶段战略、变现路径、深耕方向等16张卡片自由编辑
- ✅ **行动任务追踪** — 任务分学习/投简历/赚钱三类，带状态、截止日期、完成进度概览
- 🤖 **AI 智能建议** — 接入火山引擎豆包大模型，基于你的知识网络生成3条具体建议
- 👤 **用户系统** — 邮箱注册登录，行级数据隔离，多用户互不干扰
- 🍪 **游客体验模式** — 不用登录就能玩，数据存浏览器本地
- 🎨 **双主题切换** — 奶油马卡龙（Claymorphism黏土拟物风）/ 深夜可爱黑
- 📊 **数据仪表盘** — 任务完成率、知识网络规模、近7天趋势
- 📱 **响应式设计** — 手机竖屏和电脑横屏自动适配

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + TailwindCSS + Canvas 2D + TanStack Query |
| UI | Radix UI + Framer Motion + Lucide Icons + Claymorphism 风格 |
| 后端 | NestJS 10 + Node.js + Drizzle ORM |
| 数据库 | PostgreSQL |
| AI | 火山引擎方舟（豆包大模型） |
| 测试 | Vitest |

## 目录结构

```
├── client/                # React 前端
│   └── src/
│       ├── pages/          # 页面组件
│       ├── components/    # 通用组件
│       ├── api/          # 接口请求
│       ├── hooks/        # 自定义 Hooks
│       └── utils/         # 工具函数
├── server/                # NestJS 后端
│   └── modules/          # 业务模块（auth/knowledge）
├── shared/                # 前后端共享类型定义
├── docs/                  # API 文档
└── scripts/               # 构建/工具脚本
```

## 快速开始

### 环境要求

- Node.js >= 22
- npm >= 10
- PostgreSQL

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/yourname/zhice.git
cd zhice

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的火山引擎 API Key（AI建议功能需要，其他功能可留空）

# 4. 启动开发服务器
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

## 默认账号

首次启动后，系统会自动初始化默认知识图谱。你可以注册自己的账号，或使用测试账号登录：

- 邮箱：`admin@zhice.com`
- 密码：`zhice2026`

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 邮箱密码登录 / 注册 |
| `/` | 知识网络主页 | 神经网络画布 + 信息卡片 + 行动任务 |
| `/dashboard` | 数据仪表盘 | 任务完成率 + 统计卡片 |

## 配置说明

复制 `.env.example` 为 `.env` 后按需修改：

| 变量 | 说明 | 必填 |
|------|------|------|
| `VOLCENGINE_API_KEY` | 火山引擎方舟 API Key | AI建议功能需要 |
| `VOLCENGINE_MODEL` | 推理接入点 ID（ep-xxx） | AI建议功能需要 |

## 故障排查

### 常见问题：登录后提示「获取知识图谱失败」

这是本项目最容易出现的问题，按以下优先级排查：

#### 第一步：看浏览器 F12 → Network 里的真实状态码

| 状态码 | 含义 | 排查方向 |
|--------|------|----------|
| **401** | 鉴权失败 | token 未带上、JWT_SECRET 不一致、token 已过期 |
| **403** | 权限不足 | 账号被禁用、用户 ID 不匹配 |
| **200 但画布空白** | 数据解析/渲染问题 | 节点坐标为 NaN、边引用了不存在的节点 |
| **500** | 后端错误 | 数据库连接失败、SQL 异常、ORM 字段不匹配 |
| **504** | 网关超时 | 数据量过大、后端处理慢、网关超时设置过短 |
| **CORS / (failed)** | 跨域/网络 | 前后端域名不一致、浏览器插件拦截、弱网 |

#### 第二步：按层定位

**前端层（最常见）**
- **拦截器时序问题**：axios request interceptor 必须在模块加载时就注册，不能放在组件 useEffect 里——否则页面首次渲染发请求时拦截器还没生效，`Authorization` 头漏带。
- **Bearer 格式错误**：header 必须是 `Bearer <token>`，`Bearer` 后面有一个空格，不能写成 `Bearer<token>`。
- **localStorage 缓存旧代码**：改完前端后按 `Ctrl+F5` 硬刷新，清掉旧 bundle。
- **脏数据渲染崩溃**：后端返回 200，但节点坐标是 `null` 或 `NaN`，Canvas 渲染抛异常。

**后端层**
- **JWT_SECRET 不一致**：生成 token 和校验 token 用了不同的密钥，必然 401。
- **空数据返回 500**：用户没有任何节点时，后端查询抛异常而不是返回 `{nodes:[], edges:[]}`。
- **数据库连接池耗尽**：高并发或连接泄漏时，查询直接超时。

**数据库层**
- 表没建成功：检查 migrations 是否跑通，`nodes` / `edges` / `users` 表是否存在。
- 字段名和 ORM model 不一致：Drizzle schema 改了但没重新生成 migration。

**快速验证后端是否正常**

```bash
# 1. 登录拿 token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zhice.com","password":"zhice2026"}'

# 2. 用 token 请求图谱
curl http://localhost:3001/api/knowledge/graph \
  -H "Authorization: Bearer <上一步返回的token>"
```

如果 curl 直接请求能返回 200 + 数据，问题 100% 在前端（拦截器/token 携带/渲染）。

### 其他常见问题

| 问题 | 解决 |
|------|------|
| 登录成功但不跳转主界面 | 用 `window.location.replace('/')` 强制刷新跳转，不要用 React Router 的 navigate（路由守卫时序问题） |
| AI 建议不返回 | 检查 `VOLCENGINE_API_KEY` 和 `VOLCENGINE_MODEL`（推理接入点 ID）是否配置正确，接入点是否处于「已开通」状态 |
| 记住密码不生效 | 确认 `remembered_email` / `remembered_password` 的 localStorage key 和 token 的 key 不冲突 |

## 路线图

- [x] 知识神经网络可视化
- [x] 用户注册登录 + 数据隔离
- [x] AI智能建议
- [x] 行动任务追踪
- [x] 数据仪表盘
- [ ] 导出知识图谱为图片/PDF
- [ ] 多端实时同步（WebSocket）
- [ ] AI对话式编辑
- [ ] 公开分享知识图谱链接

## 致谢

本项目基于 React + NestJS 全栈模板构建，UI 风格参考 Claymorphism 设计趋势。

## 许可证

[MIT](LICENSE) © 问心工作室
