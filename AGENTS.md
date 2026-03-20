# AGENTS.md

## 项目概述

本项目是一个面向 OpenClaw 的实时监控台，提供会话活动、Token 用量、成本、任务日志与系统状态的可视化界面。

界面语言当前以中文为主。

## 仓库结构

这是一个 npm workspaces 单仓库，包含两个包：

- `packages/server/` — Node.js 后端（Express + WebSocket），负责连接网关、解析会话日志、聚合指标
- `packages/web/` — React 前端（Vite 构建），负责实时数据展示

构建产物统一输出到 `dist/`，由 server 托管前端静态资源。

## 开发导引

### 后端
后端源码在 `packages/server/src/`，入口是 `server.ts`。

关键模块：
1. `gateway-client.ts` — WebSocket RPC 与网关连接
2. `identity.ts` — 设备身份与签名逻辑
3. `activity-tracker.ts` — 会话活动提取与文件监听
4. `session-parser.ts` — JSONL 日志解析与清洗
5. `metrics.ts` — 指标聚合
6. `server.ts` — HTTP / WebSocket 服务与广播逻辑

### 前端
前端源码在 `packages/web/src/`，入口是 `main.tsx`。

- `hooks/useMetrics.ts`：接收后端推送数据
- `App.tsx`：页面布局
- `components/`：各卡片组件
- `lib/types.ts`：类型定义
- `lib/format.ts`：格式化工具
- `style.css`：全局样式

## 数据流

```text
OpenClaw Gateway ←WebSocket RPC→ Server (采集+解析) ←WebSocket 推送→ Frontend (渲染)
                                    ↑
                          会话日志文件 (JSONL)
```

## 开源协作注意事项

- 不要提交私有令牌、设备身份、运行缓存或本地日志
- 不要提交带有个人绝对路径的本地备注
- 如果新增配置项，请同步更新 `README.md` 与 `.env.example`
- 若涉及公网访问，请补充 `SECURITY.md`

## 提交建议

建议使用清晰的提交信息，尽量做到：
- 一个完整功能对应一个 commit
- 修复与重构分开提交
- 文档更新与代码更新保持同步

如果项目继续维护版本号，请同步更新：
- `package.json`
- `CHANGELOG.md`
- `README.md` 中的版本记录
