import type { SessionItem } from './types';
import { detectChannel } from './format';

export interface SessionMeta {
  shortKey: string;
  project: string;
  note: string;
  level: 'main' | 'automation' | 'chat' | 'system';
}

function normalizeSessionKey(sessionKey: string): string {
  return sessionKey.replace(/^agent:[^:]+:/, '');
}

function shortSessionKey(sessionKey: string): string {
  return normalizeSessionKey(sessionKey)
    .replace(/:[a-f0-9-]{20,}/g, '')
    .replace(/:\d{6,}/g, '');
}

export function getSessionMeta(session: SessionItem): SessionMeta {
  const key = normalizeSessionKey(session.key);
  const ch = detectChannel(session.key);
  const shortKey = shortSessionKey(session.key);

  if (key === 'main') {
    return {
      shortKey: 'main',
      project: '大爷主会话',
      note: '当前主聊天窗口，日常协作都在这里。',
      level: 'main',
    };
  }

  if (ch === 'cron') {
    if (/heartbeat/i.test(key)) {
      return {
        shortKey,
        project: '定时巡检',
        note: '系统按计划拉起的 heartbeat / 巡检类会话。',
        level: 'automation',
      };
    }
    return {
      shortKey,
      project: '定时任务',
      note: 'cron 定时会话，一般用于巡检、备份、同步或提醒。',
      level: 'automation',
    };
  }

  if (ch === 'feishu') {
    return {
      shortKey,
      project: '飞书消息',
      note: '来自飞书的聊天会话或会话分支。',
      level: 'chat',
    };
  }

  if (ch === 'telegram') {
    return {
      shortKey,
      project: 'Telegram 消息',
      note: '来自 Telegram 的聊天会话或通知分支。',
      level: 'chat',
    };
  }

  if (ch === 'discord') {
    return {
      shortKey,
      project: 'Discord 消息',
      note: '来自 Discord 的聊天会话或线程分支。',
      level: 'chat',
    };
  }

  if (ch === 'wecom') {
    return {
      shortKey,
      project: '企微消息',
      note: '来自企业微信的聊天会话。',
      level: 'chat',
    };
  }

  if (ch === 'webchat') {
    return {
      shortKey,
      project: '网页会话',
      note: '来自 WebChat / 本地网页入口的会话。',
      level: 'chat',
    };
  }

  return {
    shortKey,
    project: '未分类会话',
    note: '暂未识别具体用途，后续可继续补备注规则。',
    level: 'system',
  };
}
