# 项目说明

## 项目名称

- 中文：小锤子监控台
- 建议仓库名：`openclaw-dashboard-zh` 或 `xiaochuizi-dashboard`

## 项目定位

这是一个面向本机 OpenClaw 运行环境的实时监控屏，重点服务于：

- 查看助手是否正在干活
- 查看会话、Token、成本与活动流
- 为后续独立 GitHub 仓库做准备

## 当前状态

- 已能本地运行
- 已完成第一轮关键界面中文化
- 已接入本机 OpenClaw Gateway
- 已按工作区目录规范归档到 `projects/dashboard/openclaw-dashboard`

## 运行命令

```bash
cd projects/dashboard/openclaw-dashboard
npm install
npm run build
npm start
```

## 后续整理建议

1. 把剩余英文界面继续中文化
2. 增加一键启动 / 停止脚本
3. 增加 README 中的邮件草稿交付说明
4. 准备独立 GitHub 私有仓库并推送
