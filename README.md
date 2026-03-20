# 小锤子监控台

> 当前版本：**v1.0.0**

一个运行在本机的 OpenClaw 实时监控屏，基于 `xingrz/openclaw-dashboard` 启发整理，并按大爷的工作流做了本地化、中文化以及移动端/PWA 适配。

![监控屏截图](assets/screenshot.png)

## 当前版本亮点（v1.0.0）

- 桌面端实时监控台可用
- 成本统一以**人民币**显示
- Token 卡片内已整合**累计账本摘要**
- 支持基础 **PWA / 移动端访问**
- 可添加到手机主屏幕，按 App 方式打开

## 这个项目现在能做什么

- 查看最近 30 天 Token 用量与成本
- 查看今日统计、输出量、缓存读取和活动时间线
- 查看成本拆分
- 查看当前活跃会话
- 查看任务日志与实时活动流
- 查看通道 / 设备 / 健康状态
- 查看累计账本摘要（整合在 Token 卡片内）

## 当前本地访问地址

- `http://127.0.0.1:3210`

## 手机使用方式

### 局域网访问
确保手机和 Mac mini 在同一网络下，然后通过 Mac mini 的局域网地址访问监控台。

### 添加到主屏幕
在手机浏览器中打开后，可将页面添加到主屏幕，作为 Web App / PWA 使用。

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

## 版本记录

- `v1.0.0`
  - 完成桌面端可用版本
  - 增加人民币成本显示
  - 增加累计账本摘要
  - 增加基础 PWA / 移动端支持

后续详细变更请见：`CHANGELOG.md`

## 来源说明

本项目最初参考：
- `xingrz/openclaw-dashboard`

当前版本不是原仓库镜像，而是面向本机 OpenClaw 工作流整理的本地版本。

## 后续建议

- 优化手机端单手操作体验
- 增加外网安全访问方案
- 增加更细的累计账本视图
- 增加提醒与通知能力

## License

沿用原项目 License，见 `LICENSE`。
