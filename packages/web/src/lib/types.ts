// ── Dashboard Metrics Types ────────────────────────────────

export interface DashboardMetrics {
  timestamp: number;
  gwConnected: boolean;
  health?: HealthData;
  status?: StatusData;
  presence?: PresenceItem[];
  usageCost?: UsageCostData;
  ledger?: LifetimeLedger;
  system: SystemSnapshot;
  activity: ActivitySnapshot;
}

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

export type AcpWorkflowPhase = 'init' | 'prompt' | 'plan' | 'tool' | 'respond' | 'done' | 'error';
export type AcpWorkflowNodeStatus = 'idle' | 'seen' | 'active' | 'error';

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

export interface LifetimeLedger {
  sessionCount: number;
  assistantTurns: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCost: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  activeDays: number;
}

export interface SystemSnapshot {
  cpuPercent?: number;
  memPercent: number;
}

export interface HealthData {
  ok: boolean;
  channels?: Record<string, ChannelHealth>;
  channelLabels?: Record<string, string>;
}

export interface ChannelHealth {
  probe?: { ok: boolean };
  configured?: boolean;
}

export interface StatusData {
  runtimeVersion?: string;
  sessions?: {
    recent?: SessionItem[];
  };
}

export interface SessionItem {
  key: string;
  totalTokens?: number;
  percentUsed?: number;
  age?: number;
  label?: string;
  kind?: string;
}

export interface UsageCostData {
  totals?: UsageTotals;
  daily?: DailyUsage[];
}

export interface UsageTotals {
  totalTokens?: number;
  totalCost?: number;
  output?: number;
  input?: number;
  cacheRead?: number;
  cacheWrite?: number;
  inputCost?: number;
  outputCost?: number;
  cacheReadCost?: number;
  cacheWriteCost?: number;
}

export interface DailyUsage {
  date: string;
  totalTokens?: number;
  totalCost?: number;
  output?: number;
  cacheRead?: number;
}

export interface ActivitySnapshot {
  recent: ActivityItem[];
  stats: ActivityStats;
  hourlyActivity: number[];
  tasks: TaskItem[];
}

export interface ActivityItem {
  type: 'tool_call' | 'message' | 'user_message';
  ts: string;
  session: string;
  icon: string;
  seq: number;
  text?: string;
  tool?: string;
}

export interface ActivityStats {
  messages: number;
  toolCalls: number;
  errors: number;
  lastActivityAt: string | null;
}

export interface TaskItem {
  key: string;
  title: string;
  task: string;
  startedAt: string;
  lastActivityAt: string;
  isActive: boolean;
  toolCount: number;
  result: string | null;
  sessionFile: string;
}

export interface PresenceItem {
  reason?: string;
  host?: string;
  deviceId?: string;
}
