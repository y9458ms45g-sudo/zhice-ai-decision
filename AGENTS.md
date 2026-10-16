# 个人知识网络应用

奶油软萌果冻质感（claymorphism）的个人知识网络可视化应用，支持多设备云端同步。

## 设计规范

### 色彩系统（马卡龙色系）
- 背景渐变：#FFF6EC → #FFF1F4 → #F5F1FF（奶油色→奶粉→淡紫）
- 草莓粉：#FFC9DE
- 糖霜蓝：#C7DEFA
- 抹茶绿：#B9E7D4
- 薰衣草紫：#DCC9F7
- 黄油黄：#FFE7A8
- 珊瑚橙：#FFD4B8
- 薄荷青：#B8E8E0
- 莓果粉：#FFB8C9

### 质感（Claymorphism）
- 大圆角：24-32px
- 白色 inset 高光：内阴影模拟果冻表面光泽
- 柔和粉色阴影：rgba(255, 180, 200, 0.3) 向下偏移
- 毛玻璃导航：backdrop-blur + 半透明白色

### 排版
- 圆润可爱字体，优先 PingFang SC / Microsoft Yahei
- 标题字重 600，正文 400
- 字号层级：24px / 18px / 14px / 12px

### 间距
- 卡片内边距：24px
- 卡片间距：20px
- 区块间距：40px

### 响应式
- 移动端（<768px）：单列布局
- 平板（768-1024px）：两列网格
- 桌面（>1024px）：三列网格

## 数据模型

### 节点 (nodes)
- id: uuid
- name: varchar(255)
- description: text
- icon: varchar(50) (emoji)
- color: varchar(20) (hex)
- x: float
- y: float
- isCenter: boolean

### 连线 (edges)
- id: uuid
- fromNode: uuid (node id)
- toNode: uuid (node id)

### 卡片内容 (card_contents)
- id: uuid
- sectionKey: varchar(50) (唯一标识，如 education/experience/techstack 等)
- content: text

## 导航结构（4个主Tab）

### 1. 🏠 首页 (`/`)
- 欢迎区 + 数据概览（已完成/完成率/今日活跃）
- 今日待办任务
- 知识网络快捷入口（知识网络/综合画像）
- 右上角 AI 建议按钮（带文字标签）

### 2. 🧠 知识网络 (`/knowledge`)
- 子切换：图谱画布 / 综合画像
- 图谱画布：Canvas 2D 节点网络 + 信息面板（战略/变现/进度）
- 综合画像：三阶段成长路线图（种子期/成长期/绽放期）

### 3. 🚀 行动 (`/action`)
- 战略规划三阶段
- 行动任务追踪（本周/下周/以后）
- 快速变现方向
- 90天行动进度
- 收藏观点入口
- 全部任务列表

### 4. 👤 我的 (`/profile`)
- 左侧边栏5个Tab：概览/历史记录/设置/数据管理/关于
- 退出登录功能

### 移动端
- 顶部导航隐藏链接，显示Logo+AI按钮
- 底部 Tab Bar：首页/知识网络/行动/我的 4个图标+文字
- 安全区域适配（env(safe-area-inset-bottom)）

### 路由重定向（向后兼容）
- `/dashboard` → `/`
- `/profile-graph` → `/knowledge#profile`
- `/strategy` → `/action`
- `/monetize` → `/action`

## 实现说明

### 后端
- `server/modules/knowledge/` — KnowledgeModule，提供节点/连线/卡片的CRUD接口
- 匿名读写（anon RLS policy），单用户无需登录
- `/api/knowledge/init` 首次打开初始化默认数据

### 前端
- `client/src/pages/KnowledgePage/` — 主页面
  - `KnowledgeCanvas.tsx` — Canvas 2D 神经网络可视化，支持平移/缩放/拖拽节点/单击高亮/双击编辑/触屏双指缩放
  - `NodeEditDialog.tsx` — 节点编辑弹窗
  - `InfoSection.tsx` — 下方信息板块，15张可编辑卡片 + 90天进度条
  - `KnowledgePage.tsx` — 主页面整合，数据加载 + 防抖自动保存

### 云端同步
- 节点位置拖动：500ms 防抖后 PATCH 更新
- 卡片内容编辑：300ms 防抖 + blur 失焦立即保存
- 打开页面自动拉取最新数据，空数据自动 init

### 默认数据
- 12 个节点 + 16 条连线（含中心辐射+指定交叉连线）
- 15 张信息卡片（教育/经历/技术栈/约束/三阶段战略/三变现/四深耕/进度条）
