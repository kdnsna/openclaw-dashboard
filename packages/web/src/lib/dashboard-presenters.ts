import type {
  AcpSessionDisplayModel,
  AcpWorkflowSession,
  AutomationJob,
  AutomationSnapshot,
  MetricCopy,
  SessionDisplayModel,
  SessionItem,
} from './types.js';
import { detectChannel } from './format.js';

const ACP_METRIC_COPY: Record<'turn' | 'tool', MetricCopy> = {
  turn: {
    label: '平均处理时长',
    hint: '从接令到结束或最近更新',
  },
  tool: {
    label: '平均工具耗时',
    hint: '仅统计已记录耗时的工具调用',
  },
};

export function buildSessionDisplay(
  session: SessionItem,
  automation?: AutomationSnapshot | null,
): SessionDisplayModel {
  const technicalKey = session.key;
  const normalizedKey = normalizeSessionKey(technicalKey);
  const shortTechnicalKey = shortSessionKey(technicalKey);
  const matchedJob = matchAutomationJob(technicalKey, automation);

  if (normalizedKey === 'main') {
    return {
      displayName: '大爷主会话',
      projectLabel: '主会话',
      note: '当前主聊天窗口，日常协作都在这里。',
      technicalKey,
      shortTechnicalKey,
      level: 'main',
    };
  }

  if (normalizedKey === 'dashboard-task-summarizer') {
    return {
      displayName: '任务标题整理器',
      projectLabel: '系统助手',
      note: '负责把原始任务诉求整理成监控台可读的小标题。',
      technicalKey,
      shortTechnicalKey,
      level: 'system',
    };
  }

  const channel = detectChannel(technicalKey);

  if (channel === 'cron') {
    if (matchedJob) {
      return {
        displayName: matchedJob.name,
        projectLabel: '定时任务',
        note: `Cron 自动化：${matchedJob.name}`,
        technicalKey,
        shortTechnicalKey,
        level: 'automation',
      };
    }

    if (/heartbeat/i.test(normalizedKey)) {
      return {
        displayName: '心跳巡检',
        projectLabel: '定时任务',
        note: '系统按计划拉起的 heartbeat / 巡检类会话。',
        technicalKey,
        shortTechnicalKey,
        level: 'automation',
      };
    }

    return {
      displayName: 'Cron 会话',
      projectLabel: '定时任务',
      note: 'Cron 自动化会话，通常用于巡检、提醒、备份或同步。',
      technicalKey,
      shortTechnicalKey,
      level: 'automation',
    };
  }

  if (channel === 'feishu') {
    return {
      displayName: isDirectSession(normalizedKey) ? '飞书直连会话' : '飞书消息会话',
      projectLabel: '飞书消息',
      note: '来自飞书的聊天会话或会话分支。',
      technicalKey,
      shortTechnicalKey,
      level: 'chat',
    };
  }

  if (channel === 'weixin') {
    return {
      displayName: isDirectSession(normalizedKey) ? '微信直连会话' : '微信消息会话',
      projectLabel: '微信消息',
      note: '来自微信的聊天会话或通知分支。',
      technicalKey,
      shortTechnicalKey,
      level: 'chat',
    };
  }

  if (channel === 'telegram') {
    return {
      displayName: isDirectSession(normalizedKey) ? 'Telegram 直连会话' : 'Telegram 消息会话',
      projectLabel: 'Telegram 消息',
      note: '来自 Telegram 的聊天会话或通知分支。',
      technicalKey,
      shortTechnicalKey,
      level: 'chat',
    };
  }

  if (channel === 'discord') {
    return {
      displayName: 'Discord 会话',
      projectLabel: 'Discord 消息',
      note: '来自 Discord 的频道或线程会话。',
      technicalKey,
      shortTechnicalKey,
      level: 'chat',
    };
  }

  if (channel === 'wecom') {
    return {
      displayName: '企业微信会话',
      projectLabel: '企微消息',
      note: '来自企业微信的聊天会话。',
      technicalKey,
      shortTechnicalKey,
      level: 'chat',
    };
  }

  if (channel === 'webchat') {
    return {
      displayName: '网页会话',
      projectLabel: '网页入口',
      note: '来自本地网页入口的会话。',
      technicalKey,
      shortTechnicalKey,
      level: 'chat',
    };
  }

  if (normalizedKey.startsWith('codex:acp:') || normalizedKey.startsWith('acp:')) {
    return {
      displayName: 'ACP 会话',
      projectLabel: 'ACP',
      note: '来自 Codex / ACP 的工作流会话。',
      technicalKey,
      shortTechnicalKey,
      level: 'system',
    };
  }

  return {
    displayName: shortTechnicalKey || '未分类会话',
    projectLabel: '未分类会话',
    note: '暂未识别具体用途，后续可继续补备注规则。',
    technicalKey,
    shortTechnicalKey,
    level: 'system',
  };
}

export function buildAcpSessionDisplay(session: AcpWorkflowSession): AcpSessionDisplayModel {
  const workspaceName = resolveWorkspaceName(session.cwd);

  return {
    primaryName: `ACP · ${workspaceName}`,
    secondaryName: shortAcpId(session.name),
    technicalName: session.name,
    cwdHint: shortCwd(session.cwd),
  };
}

export function getAcpMetricCopy(metric: 'turn' | 'tool'): MetricCopy {
  return ACP_METRIC_COPY[metric];
}

function normalizeSessionKey(sessionKey: string): string {
  return sessionKey.replace(/^agent:[^:]+:/, '');
}

function shortSessionKey(sessionKey: string): string {
  return normalizeSessionKey(sessionKey)
    .replace(/:run:[^:]+$/i, ':run')
    .replace(/:direct:[^:]+$/i, ':direct')
    .replace(/:[a-f0-9-]{20,}/gi, '')
    .replace(/:\d{6,}/g, '')
    .replace(/^feishu:direct:?/, 'feishu:direct')
    .replace(/^telegram:direct:?/, 'telegram:direct')
    .replace(/^discord:direct:?/, 'discord:direct')
    .replace(/^openclaw-weixin:direct:?/, 'openclaw-weixin:direct');
}

function matchAutomationJob(
  sessionKey: string,
  automation?: AutomationSnapshot | null,
): AutomationJob | undefined {
  const normalizedKey = normalizeSessionKey(sessionKey);
  const baseKey = sessionKey.replace(/:run:[^:]+$/, '');
  const normalizedBaseKey = normalizeSessionKey(baseKey);

  return automation?.jobs.find((job) => {
    const jobIdCandidates = [
      `cron:${job.id}`,
      `main:cron:${job.id}`,
      `agent:main:cron:${job.id}`,
    ];
    const sessionKeyCandidates = job.sessionKey
      ? [job.sessionKey, normalizeSessionKey(job.sessionKey)]
      : [];

    return [...sessionKeyCandidates, ...jobIdCandidates].some((candidate) =>
      candidate === sessionKey ||
      candidate === normalizedKey ||
      candidate === baseKey ||
      candidate === normalizedBaseKey,
    );
  });
}

function isDirectSession(normalizedKey: string): boolean {
  return normalizedKey.includes(':direct:');
}

function resolveWorkspaceName(cwd: string): string {
  const normalized = cwd.replace(/\/+$/, '');
  if (!normalized) return '未知工作区';
  if (/\.openclaw\/workspace$/.test(normalized)) return '主工作区';

  const projectTail = normalized.split('/projects/')[1];
  if (projectTail) {
    const segments = projectTail.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1]!;
    }
  }

  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '未知工作区';
}

function shortAcpId(name: string): string {
  const stripped = name.replace(/^agent:[^:]+:acp:/, '');
  return stripped.slice(0, 12) || '未命名';
}

function shortCwd(cwd: string): string {
  return cwd
    .replace(/^.*\.openclaw\/workspace\//, '')
    .replace(/^\/Users\/[^/]+\//, '~/')
    .replace(/\/+$/, '')
    .slice(0, 40);
}
