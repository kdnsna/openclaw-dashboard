export function fmtTokens(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return '' + n;
}

const USD_TO_CNY = 7.2;

export function fmtCost(n: number | null | undefined): string {
  if (n == null) return '--';
  const cny = n * USD_TO_CNY;
  return '¥' + cny.toFixed(2);
}

export function fmtPct(n: number | null | undefined): string {
  return n == null ? '--' : n.toFixed(1) + '%';
}

export function timeAgo(ms: number | null | undefined): string {
  if (!ms && ms !== 0) return '--';
  const m = Math.floor(ms / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + '分';
  const h = Math.floor(m / 60);
  return h < 24 ? h + '小时' : Math.floor(h / 24) + '天';
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const CHANNEL_PREFIXES = ['telegram', 'wecom', 'cron', 'feishu', 'discord'] as const;
const CHANNEL_LABELS: Record<string, string> = {
  telegram: 'TG',
  webchat: '网页',
  wecom: '企微',
  cron: '定时',
  feishu: '飞书',
  discord: '频道',
  unknown: '其他',
};

const ACTIVITY_LABELS: Record<string, string> = {
  tool_call: '工具调用',
  message: '助手回复',
  user_message: '用户输入',
};

const ACP_PHASE_LABELS: Record<string, string> = {
  init: '初始化',
  prompt: '接收指令',
  plan: '生成计划',
  tool: '工具执行',
  respond: '产出回复',
  done: '完成',
  error: '异常',
};

const ACP_STATUS_LABELS: Record<string, string> = {
  active: '运行中',
  closed: '已结束',
  error: '异常',
};

export function detectChannel(sessionKey: string): string {
  const key = sessionKey.replace(/^agent:[^:]+:/, '');
  if (key === 'main' || key.startsWith('webchat')) return 'webchat';
  return CHANNEL_PREFIXES.find((ch) => key.startsWith(ch)) ?? 'unknown';
}

export function formatChannelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

export function formatActivityLabel(type: string): string {
  return ACTIVITY_LABELS[type] ?? type;
}

export function formatWorkflowPhaseLabel(phase: string): string {
  return ACP_PHASE_LABELS[phase] ?? phase;
}

export function formatWorkflowStatusLabel(status: string): string {
  return ACP_STATUS_LABELS[status] ?? status;
}

export function formatWorkflowModeLabel(modeId: string | null | undefined): string {
  if (!modeId) return '模式：--';
  const value =
    modeId === 'read-only'
      ? '只读'
      : modeId === 'auto'
        ? '默认'
        : modeId === 'full-access'
          ? '全权限'
          : modeId;
  return `模式：${value}`;
}

export function formatWorkflowModelLabel(modelId: string | null | undefined): string {
  return `模型：${modelId ?? '--'}`;
}
