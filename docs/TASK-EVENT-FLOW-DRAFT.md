# 小锤子监控台｜任务事件流最小字段草案 v0

## 目标

给监控台增加一层“任务视角”，让大爷能直接看到：

- 现在有哪些重要任务在推进
- 每个任务走到哪一步了
- 卡在哪
- 接下来要干什么
- 跟哪些会话 / 自动化 / 文档有关

重点不是造一个大而全的 workflow engine，而是先做一个 **最小可见任务层**。

---

## 一、最小任务卡片字段（TaskSummary）

这是监控台首页 / 任务列表 / 任务总览卡片最值得先展示的一层。

```json
{
  "taskId": "2026-03-ai-morning-briefing-feishu-archive",
  "title": "把 AI 情报晨报同步归档到飞书知识库",
  "status": "in_progress",
  "priority": "high",
  "stage": "verifying-write-path",
  "updatedAt": "2026-03-30T08:52:00+08:00",
  "startedAt": "2026-03-30T08:00:00+08:00",
  "currentBlocker": "飞书创建文档入口未在当前运行面显式暴露",
  "nextStep": "继续验证 feishu-create-doc 的真实调用路径；若不通则补独立归档 cron",
  "relatedPaths": [
    "projects/_ops/tasks/2026-03-ai-morning-briefing-feishu-archive.md",
    "projects/feishu/AI-MORNING-BRIEFING-PLAN.md"
  ],
  "relatedSessions": [
    "agent:main:feishu:direct:ou_xxx"
  ],
  "relatedCronIds": [
    "f5f3eea2-6e05-43b7-b765-fb1a06b69a52"
  ],
  "riskLevel": "medium"
}
```

### 字段说明

- `taskId`：任务唯一 ID，建议直接复用任务卡文件名去掉 `.md`
- `title`：任务标题
- `status`：当前状态
- `priority`：优先级
- `stage`：当前阶段，用于比 `status` 更细的推进判断
- `updatedAt`：最近更新时间
- `startedAt`：任务开始时间
- `currentBlocker`：当前卡点，没有则留空
- `nextStep`：下一步动作，必须足够具体
- `relatedPaths`：关联文档 / 模板 / 脚本 / RECOVERY
- `relatedSessions`：关联会话 key（可选）
- `relatedCronIds`：关联自动化任务 ID（可选）
- `riskLevel`：风险级别，便于监控台排序和提醒

---

## 二、最小事件流字段（TaskEvent）

除了看“任务当前快照”，监控台还应该能看最近发生了什么。

```json
{
  "eventId": "taskevt-20260330-001",
  "taskId": "2026-03-ai-morning-briefing-feishu-archive",
  "time": "2026-03-30T08:24:00+08:00",
  "type": "blocker_detected",
  "label": "发现飞书知识库写入入口未显式暴露",
  "summary": "环境里 feishu-create-doc skill 是 ready，但当前聊天层没有直接可调用入口。",
  "source": {
    "kind": "conversation",
    "ref": "agent:main:feishu:direct:ou_xxx"
  },
  "severity": "medium"
}
```

### 推荐事件类型

- `task_created`：任务创建
- `progress_update`：进展更新
- `blocker_detected`：发现卡点
- `decision_made`：形成明确决策
- `artifact_created`：产出文件 / 文档 / 模板
- `automation_linked`：关联自动化 / cron
- `handoff_prepared`：已形成交接摘要
- `task_completed`：任务完成

---

## 三、状态枚举（建议先少一点）

### 任务状态 `status`

- `not_started`：未开始
- `in_progress`：进行中
- `blocked`：阻塞
- `waiting_confirmation`：等待确认
- `completed`：已完成
- `paused`：已暂停

### 优先级 `priority`

- `low`
- `medium`
- `high`

### 风险级别 `riskLevel`

- `low`
- `medium`
- `high`

---

## 四、阶段字段 `stage` 的意义

`status` 太粗，所以还需要一个轻量 `stage`。

例如：

- `researching`
- `drafting`
- `implementing`
- `verifying`
- `verifying-write-path`
- `waiting-user-input`
- `handoff-ready`

原则：
- 阶段值偏人类可读
- 不追求统一到 100 种
- 每个任务只要能表达“现在具体卡在哪个阶段”就够了

---

## 五、监控台首页最值得先展示什么

不建议一上来就做复杂甘特图或流程图。

### 第一版推荐展示 3 类信息：

#### 1. 重点任务卡（Top Tasks）
每张卡只放：
- 标题
- 状态
- 优先级
- 当前阶段
- 当前卡点
- 下一步
- 最近更新时间

#### 2. 最近任务事件（Recent Task Events）
展示最近 5~10 条：
- 时间
- 任务名
- 事件类型
- 一句话摘要

#### 3. 需要关注的任务（Attention Needed）
自动挑出：
- `blocked`
- 超过 N 小时没更新的高优任务
- 有 blocker 且 next step 不明确的任务

---

## 六、数据来源建议（先轻后重）

### 第一阶段：直接读任务卡 Markdown
从：
- `projects/_ops/tasks/*.md`

读取最核心字段：
- 状态
- 优先级
- 目标
- 最近更新时间
- 当前进展
- 下一步
- 风险 / 阻塞

优点：
- 不新造后台
- 和当前工作流最贴
- 立刻能用

### 第二阶段：补轻量事件索引
可以考虑增加一个：
- `projects/_ops/tasks/events.jsonl`

每次关键变化时 append 一条，监控台读取后形成最近事件流。

### 第三阶段：再考虑接监控台 API
等字段稳定后，再考虑让后端聚合成：
- `/api/task-flow`
- `/api/task-events`

---

## 七、我当前的建议

先做 **第一阶段 + 半个第二阶段**：

1. 任务卡继续用 Markdown
2. 先按固定格式解析出 `TaskSummary`
3. 事件流先不用全自动，允许先从任务卡最近更新时间 + 手动记录的关键事件拼出来

这样成本低，收益高，也最符合“小锤子体系先做轻量可用，不做过度框架”的方向。

---

## 八、当前最适合拿来试跑的 3 个任务

- `2026-03-ai-morning-briefing-feishu-archive`
- `2026-03-interruption-followup-reminder-rule`
- `2026-03-dashboard-task-event-flow`

这 3 个任务都具备：
- 明确目标
- 明确卡点
- 有下一步
- 有关联文档
- 适合验证任务层展示是否真的有用

---

## 九、结论

任务事件流的第一步，不是做炫酷流程图，而是先让监控台能稳定回答这 4 个问题：

1. 现在有哪些重要任务？
2. 每个任务走到哪一步了？
3. 卡在哪里？
4. 下一步是什么？

只要这四个问题能看清，小锤子监控台就已经从“看系统”开始走向“看事情”。
