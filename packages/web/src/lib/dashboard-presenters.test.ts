import test from 'node:test';
import assert from 'node:assert/strict';
import type { AcpWorkflowSession, AutomationSnapshot, SessionItem } from './types.js';
import {
  buildAcpSessionDisplay,
  buildSessionDisplay,
  getAcpMetricCopy,
} from './dashboard-presenters.js';

function makeAutomation(overrides: Partial<AutomationSnapshot> = {}): AutomationSnapshot {
  return {
    timestamp: overrides.timestamp ?? Date.now(),
    available: overrides.available ?? true,
    totalJobs: overrides.totalJobs ?? 1,
    enabledJobs: overrides.enabledJobs ?? 1,
    healthyJobs: overrides.healthyJobs ?? 1,
    warningJobs: overrides.warningJobs ?? 0,
    failingJobs: overrides.failingJobs ?? 0,
    nextRunAt: overrides.nextRunAt ?? null,
    jobs: overrides.jobs ?? [],
    error: overrides.error,
  };
}

function makeSession(overrides: Partial<SessionItem> = {}): SessionItem {
  return {
    key: overrides.key ?? 'agent:main:main',
    totalTokens: overrides.totalTokens ?? 1200,
    percentUsed: overrides.percentUsed ?? 20,
    age: overrides.age ?? 60_000,
    label: overrides.label,
    kind: overrides.kind,
  };
}

function makeAcpSession(overrides: Partial<AcpWorkflowSession> = {}): AcpWorkflowSession {
  return {
    id: overrides.id ?? 'agent:codex:acp:e1145972-2f9c-43e7-8bd1-1bcc34acc5da',
    recordId: overrides.recordId ?? 'record-id',
    acpSessionId: overrides.acpSessionId ?? null,
    name: overrides.name ?? 'agent:codex:acp:e1145972-2f9c-43e7-8bd1-1bcc34acc5da',
    cwd: overrides.cwd ?? '/Users/kdnsna/.openclaw/workspace/projects/dashboard/openclaw-dashboard',
    closed: overrides.closed ?? false,
    status: overrides.status ?? 'active',
    currentPhase: overrides.currentPhase ?? 'respond',
    lastEvent: overrides.lastEvent ?? 'agent responding',
    startedAt: overrides.startedAt ?? '2026-03-30T10:00:00.000Z',
    promptAt: overrides.promptAt ?? '2026-03-30T10:01:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-30T10:05:00.000Z',
    closedAt: overrides.closedAt ?? null,
    currentModeId: overrides.currentModeId ?? null,
    modelId: overrides.modelId ?? null,
    nodes: overrides.nodes ?? [],
    transitions: overrides.transitions ?? [],
    latency: overrides.latency ?? {
      queuedMs: 100,
      turnMs: 120_000,
      idleMs: 500,
      firstResponseMs: 1_000,
    },
    toolStats: overrides.toolStats ?? {
      total: 2,
      running: 1,
      avgDurationMs: 400,
      slowestDurationMs: 900,
    },
  };
}

test('buildSessionDisplay gives dashboard-task-summarizer a product-facing alias while preserving the raw key', () => {
  const display = buildSessionDisplay(
    makeSession({ key: 'agent:main:dashboard-task-summarizer' }),
    makeAutomation(),
  );

  assert.equal(display.displayName, '任务标题整理器');
  assert.equal(display.projectLabel, '系统助手');
  assert.equal(display.technicalKey, 'agent:main:dashboard-task-summarizer');
});

test('buildSessionDisplay resolves cron sessions back to the matching automation job name when possible', () => {
  const display = buildSessionDisplay(
    makeSession({ key: 'agent:main:cron:f5f3eea2-6e05-43b7-b765-fb1a06b69a52:run:d8cc34a7-c761-45ae-b521-558dfb0cff16' }),
    makeAutomation({
      jobs: [
        {
          id: 'job-1',
          name: 'ai-morning-briefing',
          enabled: true,
          schedule: '30 7 * * *',
          sessionKey: 'agent:main:cron:f5f3eea2-6e05-43b7-b765-fb1a06b69a52',
          lastRunAt: null,
          nextRunAt: null,
          lastRunStatus: 'ok',
          lastDurationMs: 10_000,
          consecutiveErrors: 0,
          summary: null,
          health: 'healthy',
        },
      ],
    }),
  );

  assert.equal(display.displayName, 'ai-morning-briefing');
  assert.equal(display.projectLabel, '定时任务');
  assert.match(display.note, /Cron/);
});

test('buildSessionDisplay can recover cron job names from automation ids even when sessionKey is missing', () => {
  const display = buildSessionDisplay(
    makeSession({ key: 'agent:main:cron:f5f3eea2-6e05-43b7-b765-fb1a06b69a52' }),
    makeAutomation({
      jobs: [
        {
          id: 'f5f3eea2-6e05-43b7-b765-fb1a06b69a52',
          name: 'ai-morning-briefing',
          enabled: true,
          schedule: '30 7 * * *',
          sessionKey: null,
          lastRunAt: null,
          nextRunAt: null,
          lastRunStatus: 'ok',
          lastDurationMs: 10_000,
          consecutiveErrors: 0,
          summary: null,
          health: 'healthy',
        },
      ],
    }),
  );

  assert.equal(display.displayName, 'ai-morning-briefing');
  assert.equal(display.projectLabel, '定时任务');
});

test('buildAcpSessionDisplay falls back to workspace-aware naming while retaining technical identifiers', () => {
  const display = buildAcpSessionDisplay(makeAcpSession());

  assert.equal(display.primaryName, 'ACP · openclaw-dashboard');
  assert.match(display.secondaryName, /^e1145972/);
  assert.equal(display.technicalName, 'agent:codex:acp:e1145972-2f9c-43e7-8bd1-1bcc34acc5da');
  assert.match(display.cwdHint, /openclaw-dashboard/);
});

test('getAcpMetricCopy exposes explicit metric labels and hints', () => {
  assert.deepEqual(getAcpMetricCopy('turn'), {
    label: '平均处理时长',
    hint: '从接令到结束或最近更新',
  });
  assert.deepEqual(getAcpMetricCopy('tool'), {
    label: '平均工具耗时',
    hint: '仅统计已记录耗时的工具调用',
  });
});
