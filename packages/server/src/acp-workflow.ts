import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { readFileRegionLines } from './session-parser.js';

const MAX_RECENT_SESSIONS = 6;
const MAX_STREAM_BYTES = 1024 * 1024;

export type AcpWorkflowPhase = 'init' | 'prompt' | 'plan' | 'tool' | 'respond' | 'done' | 'error';
export type AcpWorkflowNodeStatus = 'idle' | 'seen' | 'active' | 'error';

export interface AcpWorkflowSnapshot {
  timestamp: number;
  available: boolean;
  error?: string;
  stats: AcpWorkflowStats;
  sessions: AcpWorkflowSession[];
}

export interface AcpWorkflowStats {
  totalSessions: number;
  activeSessions: number;
  openToolCalls: number;
  transitions: number;
  avgTurnMs: number | null;
  avgToolMs: number | null;
}

export interface AcpWorkflowSession {
  id: string;
  recordId: string;
  acpSessionId: string | null;
  name: string;
  cwd: string;
  closed: boolean;
  status: 'active' | 'closed' | 'error';
  currentPhase: AcpWorkflowPhase;
  lastEvent: string;
  startedAt: string | null;
  promptAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  currentModeId: string | null;
  modelId: string | null;
  nodes: AcpWorkflowNode[];
  transitions: AcpWorkflowTransition[];
  latency: AcpWorkflowLatency;
  toolStats: AcpWorkflowToolStats;
}

export interface AcpWorkflowNode {
  id: AcpWorkflowPhase;
  label: string;
  status: AcpWorkflowNodeStatus;
  count?: number;
}

export interface AcpWorkflowTransition {
  from: AcpWorkflowPhase;
  to: AcpWorkflowPhase;
  count: number;
}

export interface AcpWorkflowLatency {
  queuedMs: number | null;
  turnMs: number | null;
  idleMs: number | null;
  firstResponseMs: number | null;
}

export interface AcpWorkflowToolStats {
  total: number;
  running: number;
  avgDurationMs: number | null;
  slowestDurationMs: number | null;
}

interface AcpIndexEntry {
  file?: string;
  acpxRecordId?: string;
  acpSessionId?: string;
  cwd?: string;
  name?: string;
  closed?: boolean;
  lastUsedAt?: string;
}

interface AcpSessionMeta {
  acpx_record_id?: string;
  acp_session_id?: string;
  cwd?: string;
  name?: string;
  created_at?: string;
  last_used_at?: string;
  last_prompt_at?: string;
  closed?: boolean;
  closed_at?: string;
  agent_started_at?: string;
  event_log?: {
    active_path?: string;
  };
}

interface PhaseVisit {
  phase: AcpWorkflowPhase;
}

const WORKFLOW_NODES: Array<{ id: AcpWorkflowPhase; label: string }> = [
  { id: 'init', label: 'Init' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'plan', label: 'Plan' },
  { id: 'tool', label: 'Tools' },
  { id: 'respond', label: 'Respond' },
  { id: 'done', label: 'Done' },
];

export async function collectAcpWorkflow(now = Date.now()): Promise<AcpWorkflowSnapshot> {
  try {
    const indexPath = path.join(config.acpxSessionsDir, 'index.json');
    const indexRaw = fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(indexRaw) as { entries?: AcpIndexEntry[] };
    const entries = [...(index.entries ?? [])].sort((a, b) => Date.parse(b.lastUsedAt ?? '') - Date.parse(a.lastUsedAt ?? ''));

    const sessions = dedupeWorkflowSessions(
      entries.map((entry) => buildWorkflowSession(entry, now)).filter(Boolean) as AcpWorkflowSession[],
    ).slice(0, MAX_RECENT_SESSIONS);
    const turnValues = sessions.map((session) => session.latency.turnMs).filter((value): value is number => value != null);
    const toolValues = sessions
      .map((session) => session.toolStats.avgDurationMs)
      .filter((value): value is number => value != null);

    return {
      timestamp: now,
      available: true,
      stats: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter((session) => session.status === 'active').length,
        openToolCalls: sessions.reduce((sum, session) => sum + session.toolStats.running, 0),
        transitions: sessions.reduce((sum, session) => sum + session.transitions.reduce((acc, step) => acc + step.count, 0), 0),
        avgTurnMs: average(turnValues),
        avgToolMs: average(toolValues),
      },
      sessions,
    };
  } catch (error) {
    return {
      timestamp: now,
      available: false,
      error: (error as Error).message,
      stats: {
        totalSessions: 0,
        activeSessions: 0,
        openToolCalls: 0,
        transitions: 0,
        avgTurnMs: null,
        avgToolMs: null,
      },
      sessions: [],
    };
  }
}

export function dedupeWorkflowSessions(sessions: AcpWorkflowSession[]): AcpWorkflowSession[] {
  const winners = new Map<string, AcpWorkflowSession>();

  for (const session of sessions) {
    const existing = winners.get(session.name);
    if (!existing || shouldReplaceWorkflowSession(existing, session)) {
      winners.set(session.name, session);
    }
  }

  return [...winners.values()].sort(compareWorkflowSessionRecency);
}

function buildWorkflowSession(entry: AcpIndexEntry, now: number): AcpWorkflowSession | null {
  if (!entry.file) return null;

  const metaPath = path.join(config.acpxSessionsDir, entry.file);
  const metaRaw = fs.readFileSync(metaPath, 'utf8');
  const meta = JSON.parse(metaRaw) as AcpSessionMeta;
  const streamPath = meta.event_log?.active_path ?? metaPath.replace(/\.json$/, '.stream.ndjson');

  const phaseVisits: PhaseVisit[] = [];
  const transitions = new Map<string, AcpWorkflowTransition>();
  const toolDurations: number[] = [];
  const toolStatus = new Map<string, string>();

  let currentPhase: AcpWorkflowPhase = meta.closed ? 'done' : 'init';
  let lastEvent = meta.closed ? 'session closed' : 'waiting for updates';
  let firstResponseSeen = false;
  let currentModeId: string | null = null;
  let modelId: string | null = null;
  let latestPlanCount = 0;
  let totalTools = 0;
  let runningTools = 0;

  if (fs.existsSync(streamPath)) {
    for (const line of readRecentStreamLines(streamPath)) {
      let parsed: any;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      const method = parsed?.method;
      if (method === 'session/new') {
        currentModeId = stringOrNull(parsed?.result?.modes?.currentModeId) ?? currentModeId;
        modelId = stringOrNull(parsed?.result?.models?.currentModelId) ?? modelId;
        pushPhase('init', phaseVisits, transitions);
        currentPhase = 'init';
        lastEvent = 'session initialized';
        continue;
      }

      if (method === 'session/prompt') {
        pushPhase('prompt', phaseVisits, transitions);
        currentPhase = 'prompt';
        lastEvent = shortPrompt(parsed?.params?.prompt) ?? 'prompt received';
        continue;
      }

      if (method === 'session/update') {
        const update = parsed?.params?.update;
        const tag = update?.sessionUpdate;

        if (tag === 'plan') {
          latestPlanCount = Array.isArray(update?.entries) ? update.entries.length : latestPlanCount;
          pushPhase('plan', phaseVisits, transitions);
          currentPhase = 'plan';
          lastEvent = shortPlan(update) ?? 'plan updated';
          continue;
        }

        if (tag === 'tool_call') {
          const toolCallId = String(update?.toolCallId ?? '');
          const status = String(update?.status ?? 'in_progress');
          totalTools += 1;
          toolStatus.set(toolCallId, status);
          if (status === 'in_progress') runningTools += 1;
          pushPhase('tool', phaseVisits, transitions);
          currentPhase = 'tool';
          lastEvent = String(update?.title ?? 'tool call');
          continue;
        }

        if (tag === 'tool_call_update') {
          const toolCallId = String(update?.toolCallId ?? '');
          const nextStatus = String(update?.status ?? '');
          const prevStatus = toolStatus.get(toolCallId);
          if (prevStatus === 'in_progress' && nextStatus && nextStatus !== 'in_progress') {
            runningTools = Math.max(0, runningTools - 1);
          }
          if (nextStatus) toolStatus.set(toolCallId, nextStatus);

          const toolMs = readDurationMs(update?.rawOutput?.duration);
          if (toolMs != null) toolDurations.push(toolMs);

          if (nextStatus === 'failed') {
            pushPhase('error', phaseVisits, transitions);
            currentPhase = 'error';
            lastEvent = 'tool failed';
          } else {
            pushPhase('tool', phaseVisits, transitions);
            currentPhase = 'tool';
            lastEvent = `tool ${nextStatus || 'updated'}`;
          }
          continue;
        }

        if (tag === 'agent_message_chunk' || tag === 'agent_thought_chunk') {
          pushPhase('respond', phaseVisits, transitions);
          currentPhase = 'respond';
          if (!firstResponseSeen) firstResponseSeen = true;
          lastEvent = tag === 'agent_thought_chunk' ? 'agent thinking' : 'agent responding';
          continue;
        }

        if (tag === 'current_mode_update') {
          currentModeId = stringOrNull(update?.currentModeId ?? update?.modeId ?? update?.mode);
          continue;
        }

        if (tag === 'config_option_update') {
          const id = String(update?.id ?? update?.configOptionId ?? '');
          if (id === 'model') {
            modelId = stringOrNull(update?.currentValue ?? update?.value ?? update?.optionValue);
          }
          if (id === 'mode') {
            currentModeId = stringOrNull(update?.currentValue ?? update?.value ?? update?.optionValue);
          }
          continue;
        }

        if (tag === 'session_info_update') {
          lastEvent = stringOrNull(update?.summary ?? update?.message) ?? lastEvent;
          continue;
        }
      }

      if (parsed?.error?.message === 'Resource not found') {
        continue;
      }

      if (parsed?.error) {
        pushPhase('error', phaseVisits, transitions);
        currentPhase = 'error';
        lastEvent = String(parsed.error?.data?.message ?? parsed.error?.message ?? 'session error');
        continue;
      }

      if (parsed?.result?.stopReason) {
        pushPhase('done', phaseVisits, transitions);
        currentPhase = 'done';
        lastEvent = `stop: ${String(parsed.result.stopReason)}`;
      }
    }
  }

  if (meta.closed && currentPhase !== 'error') {
    pushPhase('done', phaseVisits, transitions);
    currentPhase = 'done';
  }

  const promptAt = meta.last_prompt_at ?? null;
  const startedAt = meta.agent_started_at ?? meta.created_at ?? null;
  const updatedAt = meta.last_used_at ?? entry.lastUsedAt ?? null;
  const closedAt = meta.closed_at ?? null;
  const turnMs = diffMs(promptAt, closedAt ?? updatedAt);
  const idleMs = updatedAt ? Math.max(0, now - Date.parse(updatedAt)) : null;
  const queuedMs = diffMs(meta.created_at ?? null, promptAt);
  const firstResponseMs = firstResponseSeen ? diffMs(promptAt, updatedAt) : null;
  const status: AcpWorkflowSession['status'] =
    currentPhase === 'error' ? 'error' : meta.closed ? 'closed' : 'active';

  return {
    id: meta.name ?? entry.name ?? entry.acpxRecordId ?? entry.file,
    recordId: meta.acpx_record_id ?? entry.acpxRecordId ?? entry.file.replace(/\.json$/, ''),
    acpSessionId: meta.acp_session_id ?? entry.acpSessionId ?? null,
    name: meta.name ?? entry.name ?? 'ACP Session',
    cwd: meta.cwd ?? entry.cwd ?? '',
    closed: Boolean(meta.closed ?? entry.closed),
    status,
    currentPhase,
    lastEvent,
    startedAt,
    promptAt,
    updatedAt,
    closedAt,
    currentModeId,
    modelId,
    nodes: WORKFLOW_NODES.map((node) => buildNode(node.id, currentPhase, phaseVisits, {
      planCount: latestPlanCount,
      toolCount: totalTools,
    })),
    transitions: [...transitions.values()],
    latency: {
      queuedMs,
      turnMs,
      idleMs,
      firstResponseMs,
    },
    toolStats: {
      total: totalTools,
      running: runningTools,
      avgDurationMs: average(toolDurations),
      slowestDurationMs: toolDurations.length ? Math.max(...toolDurations) : null,
    },
  };
}

function buildNode(
  phase: AcpWorkflowPhase,
  currentPhase: AcpWorkflowPhase,
  visits: PhaseVisit[],
  counts: { planCount: number; toolCount: number },
): AcpWorkflowNode {
  const seen = visits.some((visit) => visit.phase === phase);
  const status: AcpWorkflowNodeStatus =
    currentPhase === phase ? (phase === 'error' ? 'error' : 'active') : seen ? 'seen' : 'idle';

  return {
    id: phase,
    label: WORKFLOW_NODES.find((node) => node.id === phase)?.label ?? phase,
    status,
    count: phase === 'plan' ? counts.planCount || undefined : phase === 'tool' ? counts.toolCount || undefined : undefined,
  };
}

function pushPhase(phase: AcpWorkflowPhase, visits: PhaseVisit[], transitions: Map<string, AcpWorkflowTransition>): void {
  const prev = visits[visits.length - 1]?.phase;
  if (prev === phase) return;
  visits.push({ phase });
  if (!prev) return;

  const key = `${prev}:${phase}`;
  const existing = transitions.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }

  transitions.set(key, { from: prev, to: phase, count: 1 });
}

function readRecentStreamLines(streamPath: string): string[] {
  const stat = fs.statSync(streamPath);
  if (stat.size <= MAX_STREAM_BYTES) {
    return fs.readFileSync(streamPath, 'utf8').split(/\r?\n/).filter(Boolean);
  }

  const lines = readFileRegionLines(streamPath, stat.size - MAX_STREAM_BYTES, MAX_STREAM_BYTES);
  return lines.slice(1);
}

function shortPrompt(prompt: unknown): string | null {
  if (!Array.isArray(prompt)) return null;
  const text = prompt
    .map((item) => (item && typeof item === 'object' ? String((item as Record<string, unknown>).text ?? '') : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, 96) : null;
}

function shortPlan(update: Record<string, unknown>): string | null {
  const entries = Array.isArray(update.entries) ? update.entries : [];
  const first = entries.find((entry) => entry && typeof entry === 'object') as Record<string, unknown> | undefined;
  const content = typeof first?.content === 'string' ? first.content.trim() : '';
  return content ? `plan: ${content.slice(0, 72)}` : null;
}

function readDurationMs(duration: unknown): number | null {
  if (!duration || typeof duration !== 'object') return null;
  const secs = Number((duration as Record<string, unknown>).secs ?? 0);
  const nanos = Number((duration as Record<string, unknown>).nanos ?? 0);
  if (!Number.isFinite(secs) || !Number.isFinite(nanos)) return null;
  return Math.round(secs * 1000 + nanos / 1_000_000);
}

function diffMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, endMs - startMs);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function shouldReplaceWorkflowSession(current: AcpWorkflowSession, candidate: AcpWorkflowSession): boolean {
  const currentRank = workflowSessionPriority(current);
  const candidateRank = workflowSessionPriority(candidate);

  if (candidateRank !== currentRank) {
    return candidateRank > currentRank;
  }

  return compareIsoDesc(candidate.updatedAt, current.updatedAt) < 0;
}

function workflowSessionPriority(session: AcpWorkflowSession): number {
  if (session.status === 'active') return 2;
  if (session.status === 'error') return 1;
  return 0;
}

function compareWorkflowSessionRecency(a: AcpWorkflowSession, b: AcpWorkflowSession): number {
  const priorityDelta = workflowSessionPriority(b) - workflowSessionPriority(a);
  if (priorityDelta !== 0) return priorityDelta;
  return compareIsoDesc(a.updatedAt, b.updatedAt);
}

function compareIsoDesc(a: string | null, b: string | null): number {
  return (Date.parse(b ?? '') || 0) - (Date.parse(a ?? '') || 0);
}
