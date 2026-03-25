import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { parseJsonLines, readFileRegionLines } from './session-parser.js';

const RUN_TAIL_BYTES = 64 * 1024;
const OVERDUE_GRACE_MS = 15 * 60 * 1000;
const LONG_RUNNING_MS = 5 * 60 * 1000;

export interface AutomationSnapshot {
  timestamp: number;
  available: boolean;
  error?: string;
  totalJobs: number;
  enabledJobs: number;
  healthyJobs: number;
  warningJobs: number;
  failingJobs: number;
  nextRunAt: number | null;
  jobs: AutomationJob[];
}

export interface AutomationJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string | null;
  sessionKey: string | null;
  lastRunAt: number | null;
  nextRunAt: number | null;
  lastRunStatus: string | null;
  lastDurationMs: number | null;
  consecutiveErrors: number;
  summary: string | null;
  health: 'healthy' | 'warning' | 'failing' | 'disabled';
}

interface CronJobsFile {
  jobs?: CronJobRecord[];
}

interface CronJobRecord {
  id?: string;
  name?: string;
  enabled?: boolean;
  sessionKey?: string;
  schedule?: {
    kind?: string;
    expr?: string;
    tz?: string;
  };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastRunStatus?: string;
    lastStatus?: string;
    lastDurationMs?: number;
    consecutiveErrors?: number;
  };
  payload?: {
    kind?: string;
    message?: string;
    text?: string;
  };
}

interface CronRunRecord {
  status?: string;
  summary?: string;
  error?: string;
  durationMs?: number;
  runAtMs?: number;
  nextRunAtMs?: number;
}

export function collectAutomationStatus(now = Date.now()): AutomationSnapshot {
  try {
    const jobsPath = path.join(config.cronDir, 'jobs.json');
    const raw = fs.readFileSync(jobsPath, 'utf8');
    const parsed = JSON.parse(raw) as CronJobsFile;
    const jobs = (parsed.jobs ?? [])
      .map((job) => buildAutomationJob(job, now))
      .filter(Boolean) as AutomationJob[];

    return {
      timestamp: now,
      available: true,
      totalJobs: jobs.length,
      enabledJobs: jobs.filter((job) => job.enabled).length,
      healthyJobs: jobs.filter((job) => job.health === 'healthy').length,
      warningJobs: jobs.filter((job) => job.health === 'warning').length,
      failingJobs: jobs.filter((job) => job.health === 'failing').length,
      nextRunAt: jobs
        .filter((job) => job.enabled && job.nextRunAt != null)
        .map((job) => job.nextRunAt as number)
        .sort((a, b) => a - b)[0] ?? null,
      jobs: jobs.sort(compareJobs),
    };
  } catch (error) {
    return {
      timestamp: now,
      available: false,
      error: (error as Error).message,
      totalJobs: 0,
      enabledJobs: 0,
      healthyJobs: 0,
      warningJobs: 0,
      failingJobs: 0,
      nextRunAt: null,
      jobs: [],
    };
  }
}

function buildAutomationJob(job: CronJobRecord, now: number): AutomationJob | null {
  const id = stringOrNull(job.id);
  if (!id) return null;

  const lastRun = readLastRunRecord(id);
  const enabled = Boolean(job.enabled);
  const lastRunStatus = stringOrNull(lastRun?.status) ?? stringOrNull(job.state?.lastStatus) ?? stringOrNull(job.state?.lastRunStatus);
  const consecutiveErrors = finiteNumber(job.state?.consecutiveErrors) ?? 0;
  const lastRunAt = finiteNumber(lastRun?.runAtMs) ?? finiteNumber(job.state?.lastRunAtMs) ?? null;
  const nextRunAt = finiteNumber(lastRun?.nextRunAtMs) ?? finiteNumber(job.state?.nextRunAtMs) ?? null;
  const lastDurationMs = finiteNumber(lastRun?.durationMs) ?? finiteNumber(job.state?.lastDurationMs) ?? null;

  return {
    id,
    name: stringOrNull(job.name) ?? id,
    enabled,
    schedule: formatSchedule(job.schedule),
    sessionKey: stringOrNull(job.sessionKey),
    lastRunAt,
    nextRunAt,
    lastRunStatus,
    lastDurationMs,
    consecutiveErrors,
    summary: summarizeRun(job, lastRun),
    health: classifyHealth({
      enabled,
      lastRunStatus,
      consecutiveErrors,
      lastDurationMs,
      nextRunAt,
      now,
    }),
  };
}

function readLastRunRecord(jobId: string): CronRunRecord | null {
  try {
    const filePath = path.join(config.cronDir, 'runs', `${jobId}.jsonl`);
    const stat = fs.statSync(filePath);
    const offset = Math.max(0, stat.size - RUN_TAIL_BYTES);
    const lines = readFileRegionLines(filePath, offset, RUN_TAIL_BYTES);
    const parsed = parseJsonLines(lines);
    const last = parsed[parsed.length - 1] as CronRunRecord | undefined;
    return last ?? null;
  } catch {
    return null;
  }
}

function summarizeRun(job: CronJobRecord, run: CronRunRecord | null): string | null {
  const raw =
    stringOrNull(run?.summary) ??
    stringOrNull(run?.error) ??
    stringOrNull(job.payload?.text) ??
    stringOrNull(job.payload?.message);

  if (!raw) return null;
  return raw.replace(/\s+/g, ' ').trim().slice(0, 120);
}

function formatSchedule(
  schedule: CronJobRecord['schedule'] | undefined,
): string | null {
  if (!schedule?.expr) return null;
  const tzSuffix = schedule.tz ? ` · ${schedule.tz}` : '';
  return `${schedule.expr}${tzSuffix}`;
}

function classifyHealth(params: {
  enabled: boolean;
  lastRunStatus: string | null;
  consecutiveErrors: number;
  lastDurationMs: number | null;
  nextRunAt: number | null;
  now: number;
}): AutomationJob['health'] {
  const { enabled, lastRunStatus, consecutiveErrors, lastDurationMs, nextRunAt, now } = params;
  if (!enabled) return 'disabled';
  if (lastRunStatus === 'error' || consecutiveErrors > 0) return 'failing';
  if (nextRunAt != null && nextRunAt + OVERDUE_GRACE_MS < now) return 'warning';
  if (lastDurationMs != null && lastDurationMs >= LONG_RUNNING_MS) return 'warning';
  return 'healthy';
}

function compareJobs(a: AutomationJob, b: AutomationJob): number {
  const healthRank = rankHealth(a.health) - rankHealth(b.health);
  if (healthRank !== 0) return healthRank;
  const nextRunDelta = (a.nextRunAt ?? Number.MAX_SAFE_INTEGER) - (b.nextRunAt ?? Number.MAX_SAFE_INTEGER);
  if (nextRunDelta !== 0) return nextRunDelta;
  return (b.lastRunAt ?? 0) - (a.lastRunAt ?? 0);
}

function rankHealth(health: AutomationJob['health']): number {
  if (health === 'failing') return 0;
  if (health === 'warning') return 1;
  if (health === 'healthy') return 2;
  return 3;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function finiteNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
