# 智策 · 个人AI决策助手

基于知识神经网络可视化的个人成长 AI 决策辅助工具，帮助你梳理认知、规划路径、做出更明智的决策。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + TailwindCSS + Canvas 2D
- **后端**：NestJS + Node.js + PostgreSQL + Drizzle ORM
- **AI**：火山引擎豆包大模型 API
- **测试**：Vitest

## 功能特性

- **知识神经网络可视化** — Canvas 绘制可交互的节点关系图，支持拖拽、缩放、双击编辑
- **卡片编辑 + 任务管理** — 15 张信息卡片自由编辑，行动任务清单带进度追踪与连续打卡
- **AI 智能建议** — 基于个人数据生成个性化的职业规划与成长建议
- **用户系统 + 数据隔离** — 邮箱注册登录，行级权限保障多用户数据独立
- **游客体验模式** — 无需登录即可体验完整功能，数据存本地 localStorage
- **双主题切换** — 奶油马卡龙 / 深夜多巴胺，两种视觉风格随心切换
- **数据仪表盘** — 可视化展示任务完成率、知识网络规模、AI 建议次数等核心指标

## 目录结构

```
├── client/          # React 前端
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 通用组件
│   │   ├── api/          # 接口请求
│   │   ├── hooks/        # 自定义 Hooks
│   │   └── utils/        # 工具函数
│   └── public/       # 静态资源
├── server/          # NestJS 后端
│   ├── modules/         # 业务模块
│   ├── database/        # 数据库 schema
│   └── common/          # 通用工具
├── shared/          # 前后端共享类型定义
└── docs/            # API 文档等
```

## 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL

### 安装依赖

```bash
npm install
```

### 开发启动

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

## 默认账号

- 邮箱：`admin@zhice.com`
- 密码：`zhice2026`

## API 文档

详见 [docs/API.md](docs/API.md)

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 邮箱密码登录 / 注册 |
| `/` | 知识网络主页 | 知识图谱 + 信息卡片 + 行动任务 |
| `/dashboard` | 数据仪表盘 | 任务完成率 + 统计卡片 + 近 7 天趋势 |

## 作者

问心工作室
