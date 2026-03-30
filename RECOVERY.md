# RECOVERY - 小锤子监控台

## 1. 这是干嘛的

- 独立项目 **小锤子监控台**，用于查看 OpenClaw 运行状态、Token 用量、成本、任务日志、实时活动、自动化摘要和 ACP 工作流。
- **不是** OpenClaw 官方 Dashboard / Control UI。
- 关键区分：
  - 小锤子监控台：`3210`
  - 官方 Dashboard：`18789`

## 2. 当前状态

- 状态：开发中 / 可用
- 最近确认时间：2026-03-30
- 当前版本：`v3.5.0`

## 3. 入口 / 启动方式

- 访问地址：
  - 本机：`http://127.0.0.1:3210`
  - 局域网：`http://<局域网IP>:3210`
- 启动命令：`npm start`
- 构建命令：`npm run build`
- 开发命令：
  - 后端：`npm run dev:server`
  - 前端：`npm run dev:web`
- 官方 Dashboard 诊断入口：`http://127.0.0.1:18789`

## 4. 关键路径

- 项目目录：`projects/dashboard/openclaw-dashboard`
- 关键脚本：
  - `projects/scripts/dashboard-midnight-journal.mjs`（午夜抓取监控台 `/api/metrics`，写记忆和原始快照）
- 原始快照目录：`projects/dashboard/openclaw-dashboard/.snapshots/`
- 说明文档：
  - `README.md`
  - `CHANGELOG.md`
  - `SECURITY.md`
  - `docs/PROJECT_BRIEF.md`
- 本地备注：`LOCAL_NOTES.md`

## 5. 数据 / 配置位置

- 环境示例：`.env.example`
- 关键运行依赖：本机 OpenClaw Gateway 正常可访问（默认 `18789`）
- 每日日结写入：`memory/YYYY-MM-DD.md`
- 每日日结原始 JSON：`projects/dashboard/openclaw-dashboard/.snapshots/YYYY-MM-DD.json`

## 6. 最近重要变更

- 已升级到 `v3.5.0`
- 本轮重点完成首屏启动编排、卡片状态统一、会话命名产品化和异常反馈补齐
- 当前已形成“总览 / 检修”双视图结构
- 已接入自动化状态摘要、ACP 工作流摘要与官方 Dashboard 深链
- 已约定每天 00:00 抓取 `/api/metrics` 做日结并备份原始 JSON

## 7. 出问题先看什么

- 先看：监控台和官方 Dashboard 有没有混淆（3210 vs 18789）
- 再看：OpenClaw Gateway 是否正常运行：`openclaw status`
- 再看：监控台项目依赖是否完整、是否完成构建：`npm install && npm run build`
- 再看：本地 `3210` 端口是否被占用、服务是否正常启动
- 再看：`projects/scripts/dashboard-midnight-journal.mjs` 抓取的 `/api/metrics` 是否还能返回数据
- 常见报错：
  - 页面打不开：先查 `npm start` 是否已启动、3210 端口是否可访问
  - 数据空白：优先查 OpenClaw Gateway / API 输出，不要先怀疑前端
  - 日结缺失：查午夜脚本是否执行、`.snapshots/` 是否有原始 JSON

## 8. 恢复上下文建议阅读顺序

1. `projects/dashboard/openclaw-dashboard/README.md`
2. `MEMORY.md` 中关于“小锤子监控台”的条目
3. `projects/memory/xiaochuizi-memory/projects/openclaw-dashboard.md`
4. `projects/scripts/dashboard-midnight-journal.mjs`
5. 最近一篇 `memory/YYYY-MM-DD.md` 里的午夜日结记录

## 9. 备注

- 这是用户明确命名并长期使用的独立项目，恢复时不能误判成官方控制台。
- 凡是提到“监控台 / 小锤子监控台 / 我做的监控台”，默认先想到这个项目。
- 相关恢复入口：
  - 记忆仓库恢复：`projects/memory/xiaochuizi-memory/RECOVERY.md`
  - Apple 本地能力层恢复：`projects/apple-bridge/RECOVERY.md`
  - 当前相关任务卡：
    - `projects/_ops/tasks/2026-03-dashboard-task-event-flow.md`
    - `projects/_ops/tasks/2026-03-ai-morning-briefing-feishu-archive.md`
