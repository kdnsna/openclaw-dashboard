import test from 'node:test';
import assert from 'node:assert/strict';
import type { AcpWorkflowSession } from './acp-workflow.js';
import { dedupeWorkflowSessions } from './acp-workflow.js';

function makeSession(overrides: Partial<AcpWorkflowSession>): AcpWorkflowSession {
  return {
    id: overrides.id ?? 'session-id',
    recordId: overrides.recordId ?? 'record-id',
    acpSessionId: overrides.acpSessionId ?? null,
    name: overrides.name ?? 'agent:codex:acp:test-agent',
    cwd: overrides.cwd ?? '/tmp',
    closed: overrides.closed ?? false,
    status: overrides.status ?? 'active',
    currentPhase: overrides.currentPhase ?? 'respond',
    lastEvent: overrides.lastEvent ?? 'agent responding',
    startedAt: overrides.startedAt ?? '2026-03-28T10:00:00.000Z',
    promptAt: overrides.promptAt ?? '2026-03-28T10:00:05.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-28T10:10:00.000Z',
    closedAt: overrides.closedAt ?? null,
    currentModeId: overrides.currentModeId ?? null,
    modelId: overrides.modelId ?? null,
    nodes: overrides.nodes ?? [],
    transitions: overrides.transitions ?? [],
    latency: overrides.latency ?? {
      queuedMs: 100,
      turnMs: 1000,
      idleMs: 0,
      firstResponseMs: 200,
    },
    toolStats: overrides.toolStats ?? {
      total: 1,
      running: 0,
      avgDurationMs: 300,
      slowestDurationMs: 300,
    },
  };
}

test('dedupeWorkflowSessions keeps the active session for the same agent name', () => {
  const sessions = [
    makeSession({
      recordId: 'closed-1',
      status: 'closed',
      closed: true,
      updatedAt: '2026-03-28T09:00:00.000Z',
    }),
    makeSession({
      recordId: 'active-1',
      status: 'active',
      closed: false,
      updatedAt: '2026-03-28T08:00:00.000Z',
    }),
  ];

  const deduped = dedupeWorkflowSessions(sessions);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.recordId, 'active-1');
  assert.equal(deduped[0]?.status, 'active');
});

test('dedupeWorkflowSessions keeps the newest session when all duplicates are historical', () => {
  const sessions = [
    makeSession({
      recordId: 'closed-old',
      status: 'closed',
      closed: true,
      updatedAt: '2026-03-28T08:00:00.000Z',
    }),
    makeSession({
      recordId: 'closed-new',
      status: 'closed',
      closed: true,
      updatedAt: '2026-03-28T09:30:00.000Z',
    }),
    makeSession({
      recordId: 'other-agent',
      name: 'agent:codex:acp:other-agent',
      status: 'closed',
      closed: true,
      updatedAt: '2026-03-28T07:00:00.000Z',
    }),
  ];

  const deduped = dedupeWorkflowSessions(sessions);

  assert.equal(deduped.length, 2);
  assert.deepEqual(
    deduped.map((session) => session.recordId),
    ['closed-new', 'other-agent'],
  );
});
