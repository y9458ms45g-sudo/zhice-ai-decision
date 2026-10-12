# 个人知识网络 API 文档

## 项目简介

个人知识网络（Knowledge Network）是一款奶油软萌果冻质感（Claymorphism）的知识可视化应用。用户可以通过节点-连线的图谱形式管理自己的知识体系，配合信息卡片、行动任务、AI 分析建议等功能，帮助个人梳理成长路径。

## 基础 URL

所有接口路径均以 `/api` 开头：

```
基础路径：/api
```

示例：注册接口完整路径为 `POST /api/auth/register`。

## 认证方式

本项目使用 **JWT（JSON Web Token）** 进行身份认证。

### 获取 Token

调用登录或注册接口，成功后响应体中会返回 `token` 字段。

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "xxx", "nickname": "xxx" }
}
```

### 使用 Token

需要登录的接口（标注 🔒）必须在请求头中携带 Token：

```
Authorization: Bearer <token>
```

示例：

```bash
curl -H "Authorization: Bearer eyJhbGciOi..." https://your-domain/api/knowledge/graph
```

### 游客模式

部分接口（如活动日志、AI 对话记录、用户统计）支持未登录访问，返回全量公开数据，不区分用户。

## 通用错误响应格式

接口发生错误时，返回统一的 NestJS 错误响应结构：

```json
{
  "statusCode": 400,
  "message": "错误描述信息",
  "error": "Bad Request"
}
```

### 常见 HTTP 状态码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 | 成功 | 请求正常处理 |
| 201 | 已创建 | POST 创建资源成功 |
| 400 | 参数错误 | 请求参数缺失、格式不对、为空校验不通过 |
| 401 | 未认证 | 未携带 Token 或 Token 无效/过期 |
| 403 | 无权限 | 试图操作不属于当前用户的数据 |
| 404 | 资源不存在 | 请求的资源 ID 不存在 |
| 409 | 冲突 | 资源已存在（如邮箱重复注册） |
| 500 | 服务器内部错误 | 代码异常或数据库错误 |

---

## 一、认证模块

### 1.1 用户注册

**POST** `/api/auth/register`

注册新用户账号。

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址，必须唯一 |
| password | string | 是 | 密码（明文传输，服务端哈希存储） |
| nickname | string | 否 | 昵称，默认「未命名用户」 |

**成功响应（201）：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "小明"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | JWT 访问令牌 |
| user.id | number | 用户 ID |
| user.email | string | 用户邮箱 |
| user.nickname | string | 用户昵称 |

**错误：**

- `400` - 邮箱或密码为空
- `409` - 邮箱已被注册

---

### 1.2 用户登录

**POST** `/api/auth/login`

使用邮箱和密码登录。

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码 |

**成功响应（200）：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "小明"
  }
}
```

**错误：**

- `400` - 邮箱或密码为空
- `401` - 邮箱不存在或密码错误

---

### 1.3 获取当前用户 🔒

**GET** `/api/auth/me`

获取当前登录用户的基本信息。

**请求参数：** 无

**成功响应（200）：**

```json
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "小明"
}
```

**错误：**

- `401` - 未登录或 Token 无效

---

## 二、知识图谱模块

所有接口前缀：`/api/knowledge`

### 2.1 获取完整图谱 🔒

**GET** `/api/knowledge/graph`

获取当前用户的所有节点和连线。

**请求参数：** 无

**成功响应（200）：**

```json
{
  "nodes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "前端开发",
      "description": "前端技术栈",
      "icon": "🎨",
      "color": "#FFC9DE",
      "x": 0,
      "y": 0,
      "isCenter": true
    }
  ],
  "edges": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "fromNode": "550e8400-e29b-41d4-a716-446655440000",
      "toNode": "550e8400-e29b-41d4-a716-446655440002"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| nodes | KnowledgeNode[] | 节点数组 |
| edges | KnowledgeEdge[] | 连线数组 |

---

### 2.2 初始化默认图谱 🔒

**POST** `/api/knowledge/init`

为当前用户生成一套默认的知识图谱数据（12 个节点 + 16 条连线）。仅当用户没有任何节点时调用。

**请求参数：** 无

**成功响应（201）：** 同 2.1 获取完整图谱的响应结构。

---

### 2.3 获取节点列表 🔒

**GET** `/api/knowledge/nodes`

获取当前用户的所有节点。

**请求参数：** 无

**成功响应（200）：** `KnowledgeNode[]` — 节点数组，结构见数据模型。

---

### 2.4 创建节点 🔒

**POST** `/api/knowledge/nodes`

创建一个新的知识节点。

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 节点名称，不能为空 |
| x | number | 是 | 节点 X 坐标 |
| y | number | 是 | 节点 Y 坐标 |
| description | string | 否 | 节点描述 |
| icon | string | 否 | 节点图标（emoji），如 🎨 |
| color | string | 否 | 节点颜色（hex），默认 `#FFC9DE` |
| isCenter | boolean | 否 | 是否为中心节点，默认 false |

**成功响应（201）：** `KnowledgeNode` — 新建的完整节点对象。

**错误：**

- `400` - 节点名称不能为空

---

### 2.5 更新节点 🔒

**PATCH** `/api/knowledge/nodes/:id`

部分更新指定节点（支持增量更新，只传需要修改的字段）。

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 节点 ID（UUID） |

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 节点名称 |
| description | string | 否 | 节点描述 |
| icon | string | 否 | 节点图标 |
| color | string | 否 | 节点颜色 |
| x | number | 否 | X 坐标 |
| y | number | 否 | Y 坐标 |
| isCenter | boolean | 否 | 是否中心节点 |

**成功响应（200）：** `KnowledgeNode` — 更新后的完整节点对象。

**错误：**

- `403` - 节点不存在或无权操作（非当前用户的数据）

---

### 2.6 删除节点 🔒

**DELETE** `/api/knowledge/nodes/:id`

删除指定节点，相关连线会级联删除。

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 节点 ID（UUID） |

**成功响应（200）：** 空响应体。

**错误：**

- `403` - 节点不存在或无权操作

---

### 2.7 获取连线列表 🔒

**GET** `/api/knowledge/edges`

获取当前用户的所有连线。

**请求参数：** 无

**成功响应（200）：** `KnowledgeEdge[]` — 连线数组，结构见数据模型。

---

### 2.8 创建连线 🔒

**POST** `/api/knowledge/edges`

在两个节点之间创建一条连线。

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fromNode | string | 是 | 起点节点 ID |
| toNode | string | 是 | 终点节点 ID |

**成功响应（201）：** `KnowledgeEdge` — 新建的完整连线对象。

**错误：**

- `400` - 连线两端不能为空

---

### 2.9 删除连线 🔒

**DELETE** `/api/knowledge/edges/:id`

删除指定连线。

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 连线 ID（UUID） |

**成功响应（200）：** 空响应体。

**错误：**

- `403` - 连线不存在或无权操作

---

### 2.10 实时变更推送（SSE） 🔒

**GET** `/api/knowledge/stream`

Server-Sent Events 长连接，实时推送知识图谱的变更事件。

**请求头：**

```
Accept: text/event-stream
```

**事件格式：**

每条事件是一个 JSON 对象，通过 `data:` 前缀发送：

```
data: { "type": "node_updated", "payload": { ... }, "timestamp": 1699999999999 }
```

**事件类型（type）：**

| 类型 | 说明 |
|------|------|
| `connected` | 连接成功（首次建立时发送） |
| `node_created` | 节点已创建 |
| `node_updated` | 节点已更新 |
| `node_deleted` | 节点已删除 |
| `edge_created` | 连线已创建 |
| `edge_deleted` | 连线已删除 |
| `card_updated` | 卡片内容已更新 |
| `graph_changed` | 图谱整体变更 |
| `action_task_created` | 任务已创建 |
| `action_task_updated` | 任务已更新 |
| `action_task_deleted` | 任务已删除 |

> 服务器每 25 秒发送一次心跳（`ping` 注释行）以保持连接。

---

## 三、卡片模块

### 3.1 获取所有卡片 🔒

**GET** `/api/knowledge/cards`

获取当前用户的所有信息卡片。

**请求参数：** 无

**成功响应（200）：** `CardContent[]` — 卡片数组，结构见数据模型。

---

### 3.2 更新单张卡片 🔒

**PATCH** `/api/knowledge/cards/:sectionKey`

按 sectionKey 更新或创建一张卡片（upsert 语义：存在则更新，不存在则创建）。

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sectionKey | string | 是 | 卡片唯一标识，如 `education` / `experience` / `techstack` |

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 卡片内容（支持纯文本或 Markdown 文本） |

**成功响应（200）：** `CardContent` — 更新后的完整卡片对象。

---

### 3.3 批量更新卡片 🔒

**POST** `/api/knowledge/cards/batch`

批量 upsert 多张卡片。用于首次初始化或批量导入。

**请求参数（Body）：**

```json
{
  "cards": [
    { "sectionKey": "education", "content": "..." },
    { "sectionKey": "experience", "content": "..." }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cards | array | 是 | 卡片数组 |
| cards[].sectionKey | string | 是 | 卡片唯一标识 |
| cards[].content | string | 是 | 卡片内容 |

**成功响应（201）：** `CardContent[]` — 所有被更新/创建的卡片数组。

---

## 四、任务模块

### 4.1 获取任务列表 🔒

**GET** `/api/knowledge/action-tasks`

获取当前用户的所有行动任务。

**请求参数：** 无

**成功响应（200）：** `ActionTask[]` — 任务数组，结构见数据模型。

---

### 4.2 获取任务概览统计 🔒

**GET** `/api/knowledge/action-tasks/overview`

获取任务完成情况的概览统计数据。

**请求参数：** 无

**成功响应（200）：**

```json
{
  "total": 20,
  "done": 8,
  "inProgress": 5,
  "todo": 7,
  "weekDone": 3,
  "weekTotal": 5
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 任务总数 |
| done | number | 已完成数 |
| inProgress | number | 进行中数 |
| todo | number | 待办数 |
| weekDone | number | 本周已完成数 |
| weekTotal | number | 本周总任务数（截止日期在本周内的） |

---

### 4.3 创建任务 🔒

**POST** `/api/knowledge/action-tasks`

创建一条新的行动任务。

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 任务标题，不能为空 |
| status | string | 否 | 状态：`todo` / `in_progress` / `done`，默认 `todo` |
| taskType | string | 否 | 类型：`learning` / `job_hunting` / `money_making`，默认 `learning` |
| dueDate | string \| null | 否 | 截止日期（ISO 日期格式，如 `2026-10-15`） |
| isStarred | boolean | 否 | 是否星标，默认 false |

**成功响应（201）：** `ActionTask` — 新建的完整任务对象。

**错误：**

- `400` - 任务标题不能为空

---

### 4.4 更新任务 🔒

**PATCH** `/api/knowledge/action-tasks/:id`

部分更新指定任务。

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（UUID） |

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 任务标题 |
| status | string | 否 | 状态：`todo` / `in_progress` / `done` |
| taskType | string | 否 | 类型：`learning` / `job_hunting` / `money_making` |
| dueDate | string \| null | 否 | 截止日期 |
| sortOrder | number | 否 | 排序值（越小越靠前） |
| isStarred | boolean | 否 | 是否星标 |

**成功响应（200）：** `ActionTask` — 更新后的完整任务对象。

**错误：**

- `403` - 任务不存在或无权操作

---

### 4.5 删除任务 🔒

**DELETE** `/api/knowledge/action-tasks/:id`

删除指定任务。

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 任务 ID（UUID） |

**成功响应（200）：** 空响应体。

**错误：**

- `403` - 任务不存在或无权操作

---

## 五、AI 建议模块

### 5.1 AI 分析知识图谱 🔒

**POST** `/api/knowledge/analyze`

调用 AI 分析当前用户的知识图谱，生成优化建议。

**请求参数：** 无（服务端自动读取当前用户的图谱数据）

**成功响应（201）：**

```json
{
  "suggestions": [
    {
      "title": "建议标题",
      "content": "具体建议内容"
    }
  ],
  "rawText": "AI 返回的原始文本",
  "conversationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| suggestions | AiSuggestionItem[] | AI 建议列表 |
| suggestions[].title | string | 建议标题 |
| suggestions[].content | string | 建议详细内容 |
| rawText | string | AI 返回的原始完整文本（可选） |
| conversationId | string | 对话记录 ID（可选） |

---

## 六、活动日志模块

### 6.1 获取活动日志

**GET** `/api/knowledge/activity-logs`

获取公开的活动日志（所有人可见，用于公共展示页动态流）。

**查询参数：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 20 | 返回条数，最大 100 |

**成功响应（200）：**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "actionType": "node_created",
      "content": "创建了新节点「前端开发」",
      "createdAt": "2026-10-11T08:00:00.000Z"
    }
  ],
  "total": 150
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| items | ActivityLog[] | 日志列表（按时间倒序） |
| total | number | 总条数 |

---

### 6.2 创建活动日志

**POST** `/api/knowledge/activity-logs`

写入一条活动日志（公开写入，无需登录，用于记录匿名用户行为）。

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| actionType | string | 是 | 动作类型，最长 30 字符 |
| content | string | 是 | 日志内容描述，最长 500 字符 |

**成功响应（201）：** 空响应体。

**错误：**

- `400` - `actionType` 和 `content` 不能为空

---

## 七、AI 对话记录模块

### 7.1 获取 AI 对话列表

**GET** `/api/knowledge/ai-conversations`

获取所有 AI 对话记录（公开数据，无需登录）。

**请求参数：** 无

**成功响应（200）：**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userInput": "帮我分析一下我的知识图谱",
      "aiResponse": "根据你的知识结构...",
      "createdAt": "2026-10-11T08:00:00.000Z"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| items | AiConversation[] | 对话记录数组 |
| items[].id | string | 记录 ID |
| items[].userInput | string | 用户输入（可选） |
| items[].aiResponse | string | AI 响应内容 |
| items[].createdAt | string | 创建时间（ISO 8601） |

---

## 八、用户统计模块

### 8.1 获取用户统计数据

**GET** `/api/knowledge/user-stats`

获取整体用户统计数据（公开数据，无需登录，用于展示页）。

**请求参数：** 无

**成功响应（200）：**

```json
{
  "weekCompletedTasks": 5,
  "totalCompletedTasks": 42,
  "streakDays": 7,
  "lastAiSuggestionAt": "2026-10-10T12:00:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| weekCompletedTasks | number | 本周完成任务数 |
| totalCompletedTasks | number | 累计完成任务数 |
| streakDays | number | 连续打卡天数 |
| lastAiSuggestionAt | string \| null | 最近一次 AI 建议时间 |

---

## 九、仪表盘模块

### 9.1 获取仪表盘统计数据 🔒

**GET** `/api/knowledge/dashboard/stats`

获取当前登录用户的仪表盘聚合统计数据，包括节点、连线、任务、AI 建议、活动记录及近 7 天完成趋势。

**请求参数：** 无

**成功响应（200）：**

```json
{
  "totalNodes": 12,
  "totalEdges": 16,
  "totalTasks": 36,
  "completedTasks": 12,
  "pendingTasks": 18,
  "inProgressTasks": 6,
  "aiSuggestionsCount": 5,
  "todayActivity": 8,
  "weeklyProgress": 33,
  "weeklyTaskCounts": [
    { "date": "2026-10-04", "count": 1 },
    { "date": "2026-10-05", "count": 2 },
    { "date": "2026-10-06", "count": 0 },
    { "date": "2026-10-07", "count": 3 },
    { "date": "2026-10-08", "count": 1 },
    { "date": "2026-10-09", "count": 2 },
    { "date": "2026-10-10", "count": 1 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| totalNodes | number | 知识节点总数 |
| totalEdges | number | 知识连线总数 |
| totalTasks | number | 任务总数 |
| completedTasks | number | 已完成任务数 |
| pendingTasks | number | 待办任务数 |
| inProgressTasks | number | 进行中任务数 |
| aiSuggestionsCount | number | AI 建议生成总次数 |
| todayActivity | number | 今日操作记录数 |
| weeklyProgress | number | 本周任务完成率（百分比，0-100） |
| weeklyTaskCounts | DailyTaskCount[] | 最近 7 天每日完成任务数 |
| weeklyTaskCounts[].date | string | 日期（YYYY-MM-DD） |
| weeklyTaskCounts[].count | number | 当天完成的任务数 |

---

## 十、操作历史模块

### 10.1 获取操作历史 🔒

**GET** `/api/knowledge/operation-history`

获取当前用户的操作历史记录（带分页）。

**查询参数：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 20 | 每页条数，最大 100 |
| offset | number | 否 | 0 | 偏移量（跳过多少条） |

**成功响应（200）：**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "actionType": "node_updated",
      "description": "更新了节点「React」的位置",
      "detail": { "x": 100, "y": 200 },
      "createdAt": "2026-10-11T08:00:00.000Z"
    }
  ],
  "total": 35
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| items | OperationHistoryItem[] | 历史记录列表（按时间倒序） |
| items[].id | string | 记录 ID |
| items[].actionType | string | 动作类型 |
| items[].description | string | 描述 |
| items[].detail | object | 详细数据（JSON，可选） |
| items[].createdAt | string | 创建时间 |
| total | number | 总条数 |

---

### 10.2 创建操作历史 🔒

**POST** `/api/knowledge/operation-history`

为当前用户写入一条操作历史记录。

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| actionType | string | 是 | 动作类型，最长 30 字符 |
| description | string | 是 | 操作描述，最长 500 字符 |
| detail | object | 否 | 详细数据（任意 JSON 对象） |

**成功响应（201）：** 空响应体。

**错误：**

- `400` - `actionType` 和 `description` 不能为空

---

## 附录：数据模型

### User（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户 ID（自增主键） |
| email | string | 邮箱（唯一） |
| nickname | string | 昵称 |
| createdAt | string | 注册时间（ISO 8601） |
| updatedAt | string | 更新时间（ISO 8601） |

> 密码以哈希形式存储（`passwordHash`），不会通过任何接口返回。

---

### KnowledgeNode（知识节点）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 节点 ID（UUID） |
| name | string | 节点名称 |
| description | string | 节点描述 |
| icon | string | 节点图标（emoji） |
| color | string | 节点颜色（hex，如 `#FFC9DE`） |
| x | number | X 坐标（画布位置） |
| y | number | Y 坐标（画布位置） |
| isCenter | boolean | 是否为中心节点 |

---

### KnowledgeEdge（知识连线）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 连线 ID（UUID） |
| fromNode | string | 起点节点 ID |
| toNode | string | 终点节点 ID |

---

### CardContent（信息卡片）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 卡片 ID（UUID） |
| sectionKey | string | 卡片唯一标识（如 `education`、`techstack`） |
| content | string | 卡片内容（纯文本或 Markdown） |

---

### ActionTask（行动任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 任务 ID（UUID） |
| title | string | 任务标题 |
| status | string | 状态：`todo` / `in_progress` / `done` |
| taskType | string | 类型：`learning` / `job_hunting` / `money_making` |
| dueDate | string \| null | 截止日期（ISO 日期，如 `2026-10-15`） |
| sortOrder | number | 排序值（越小越靠前） |
| isStarred | boolean | 是否星标 |

---

### OperationHistory（操作历史）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 记录 ID（UUID） |
| actionType | string | 动作类型 |
| description | string | 操作描述 |
| detail | object | 详细数据（任意 JSON，可选） |
| userId | number | 所属用户 ID |
| createdAt | string | 创建时间（ISO 8601） |

---

### ActivityLog（活动日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 记录 ID（UUID） |
| actionType | string | 动作类型 |
| content | string | 日志内容 |
| createdAt | string | 创建时间（ISO 8601） |

---

### AiConversation（AI 对话记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 记录 ID（UUID） |
| userInput | string | 用户输入（可选） |
| aiResponse | string | AI 响应内容 |
| createdAt | string | 创建时间（ISO 8601） |
