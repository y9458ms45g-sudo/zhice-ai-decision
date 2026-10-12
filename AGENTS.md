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
