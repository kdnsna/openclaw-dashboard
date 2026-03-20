# 小锤子监控台

一个运行在本机的 OpenClaw 实时监控屏，基于 `xingrz/openclaw-dashboard` 启发整理，并按大爷的工作流做了本地化与中文化处理。

![监控屏截图](assets/screenshot.png)

## 这个项目现在能做什么

- 查看最近 30 天 Token 用量与成本
- 查看今日统计、输出量、缓存读取和活动时间线
- 查看成本拆分
- 查看当前活跃会话
- 查看任务日志与实时活动流
- 查看通道 / 设备 / 健康状态

## 当前本地访问地址

- `http://127.0.0.1:3210`

## 项目目录

```text
packages/
  server/    后端服务（Express + WebSocket）
  web/       前端界面（React + Vite）
docs/        项目说明与后续计划
assets/      设计资源与截图（可按需补充）
```

## 运行要求

- Node.js 18+
- 本机已经运行 OpenClaw Gateway

默认连接：
- Dashboard 端口：`3210`
- Gateway 端口：`18789`

## 安装与构建

```bash
npm install
npm run build
```

## 启动

```bash
npm start
```

启动后默认监听：
- `http://127.0.0.1:3210`

## 开发模式

```bash
# 后端
npm run dev:server

# 前端
npm run dev:web
```

## 已做的本地化整理

- 关键界面文案已中文化
- 顶部标题改为「小锤子监控台」
- 页脚与状态文案已改成中文
- 项目已纳入工作区固定目录规范

## 来源说明

本项目最初参考：
- `xingrz/openclaw-dashboard`

当前版本不是原仓库镜像，而是面向本机 OpenClaw 工作流整理的本地版本。

## 后续建议

- 增加更完整的中文化
- 增加项目级配置说明
- 增加一键启动脚本
- 增加成品图导出与邮件草稿流程

## License

沿用原项目 License，见 `LICENSE`。
