import fs from 'fs';
import path from 'path';

export interface TaskEventItem {
  eventId: string;
  taskId: string;
  time: string;
  type:
    | 'task_created'
    | 'progress_update'
    | 'blocker_detected'
    | 'decision_made'
    | 'artifact_created'
    | 'automation_linked'
    | 'handoff_prepared'
    | 'task_completed';
  label: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  source?: {
    kind?: string;
    ref?: string;
  };
}

const ROOT = process.cwd();
const SAMPLE_EVENTS_FILE = path.join(ROOT, 'docs', 'TASK-EVENTS-SAMPLE.jsonl');
const TASKS_DIR = path.join(ROOT, '..', '..', '..', 'projects', '_ops', 'tasks');
const OPS_EVENTS_FILE = path.join(TASKS_DIR, 'events.jsonl');

export async function collectTaskEvents(): Promise<{ generatedAt: string; source: string; events: TaskEventItem[] }> {
  const [opsEvents, sampleEvents, derivedEvents] = await Promise.all([
    loadJsonlEvents(OPS_EVENTS_FILE),
    loadJsonlEvents(SAMPLE_EVENTS_FILE),
    deriveEventsFromTaskCards(),
  ]);
  const merged = dedupeEvents([...opsEvents, ...derivedEvents, ...sampleEvents]).sort(compareTaskEvents);

  return {
    generatedAt: new Date().toISOString(),
    source: 'projects/_ops/tasks/events.jsonl + task cards + docs/TASK-EVENTS-SAMPLE.jsonl',
    events: merged,
  };
}

async function loadJsonlEvents(filePath: string): Promise<TaskEventItem[]> {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TaskEventItem);
  } catch {
    return [];
  }
}

async function deriveEventsFromTaskCards(): Promise<TaskEventItem[]> {
  const files = await fs.promises.readdir(TASKS_DIR);
  const taskFiles = files.filter(
    (file) => file.endsWith('.md') && file !== 'README.md' && file !== 'TEMPLATE.md' && !file.endsWith('.README.md'),
  );

  const all = await Promise.all(
    taskFiles.map(async (file) => {
      const fullPath = path.join(TASKS_DIR, file);
      const raw = await fs.promises.readFile(fullPath, 'utf8');
      const stat = await fs.promises.stat(fullPath);
      return deriveTaskCardEvents(file, raw, stat.mtime);
    }),
  );

  return all.flat();
}

function deriveTaskCardEvents(file: string, raw: string, mtime: Date): TaskEventItem[] {
  const taskId = file.replace(/\.md$/, '');
  const title = pickInlineValue(raw, '# 任务：') || taskId;
  const startedAt = normalizeDate(pickListValue(raw, '发起时间'), mtime, 'start') || new Date().toISOString();
  const updatedAt = normalizeDate(pickListValue(raw, '最近更新时间'), mtime, 'update') || startedAt;
  const blocker = firstBulletUnderHeading(raw, '风险 / 阻塞');
  const nextStep = firstBulletUnderHeading(raw, '下一步');
  const progress = bulletsUnderHeading(raw, '当前进展');
  const decisions = bulletsUnderHeading(raw, '决策记录');

  const events: TaskEventItem[] = [
    {
      eventId: `derived-${taskId}-created`,
      taskId,
      time: startedAt,
      type: 'task_created',
      label: `建立任务：${title}`,
      summary: pickListValue(raw, '目标') || `开始推进任务：${title}`,
      severity: 'low',
      source: { kind: 'task_card', ref: fullPathFor(file) },
    },
  ];

  if (progress.length > 0) {
    events.push({
      eventId: `derived-${taskId}-progress`,
      taskId,
      time: updatedAt,
      type: 'progress_update',
      label: `任务有新进展：${title}`,
      summary: progress[0],
      severity: 'low',
      source: { kind: 'task_card', ref: fullPathFor(file) },
    });
  }

  if (blocker) {
    events.push({
      eventId: `derived-${taskId}-blocker`,
      taskId,
      time: updatedAt,
      type: 'blocker_detected',
      label: `发现卡点：${title}`,
      summary: blocker,
      severity: 'medium',
      source: { kind: 'task_card', ref: fullPathFor(file) },
    });
  }

  if (nextStep) {
    events.push({
      eventId: `derived-${taskId}-handoff`,
      taskId,
      time: updatedAt,
      type: 'handoff_prepared',
      label: `明确下一步：${title}`,
      summary: nextStep,
      severity: 'low',
      source: { kind: 'task_card', ref: fullPathFor(file) },
    });
  }

  if (decisions.length > 0) {
    events.push({
      eventId: `derived-${taskId}-decision`,
      taskId,
      time: updatedAt,
      type: 'decision_made',
      label: `形成决策：${title}`,
      summary: decisions[0],
      severity: 'low',
      source: { kind: 'task_card', ref: fullPathFor(file) },
    });
  }

  return events;
}

function dedupeEvents(events: TaskEventItem[]): TaskEventItem[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();

  return events.filter((event) => {
    const idKey = `${event.eventId}::${event.taskId}`;
    if (seenIds.has(idKey)) return false;
    seenIds.add(idKey);

    const contentKey = [
      event.taskId,
      event.type,
      event.time,
      normalizeForDedupe(event.label),
      normalizeForDedupe(event.summary),
    ].join('::');

    if (seenContent.has(contentKey)) return false;
    seenContent.add(contentKey);
    return true;
  });
}

function fullPathFor(file: string): string {
  return `projects/_ops/tasks/${file}`;
}

function pickInlineValue(raw: string, prefix: string): string | null {
  const line = raw.split('\n').find((item) => item.startsWith(prefix));
  if (!line) return null;
  return line.slice(prefix.length).trim();
}

function pickListValue(raw: string, key: string): string | null {
  const regex = new RegExp(`^-\\s+${escapeRegExp(key)}：(.+)$`, 'm');
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? null;
}

function bulletsUnderHeading(raw: string, heading: string): string[] {
  const section = sectionBody(raw, heading);
  if (!section) return [];
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => cleanInlineText(line.slice(2).trim()))
    .filter(Boolean);
}

function firstBulletUnderHeading(raw: string, heading: string): string {
  return bulletsUnderHeading(raw, heading)[0] ?? '';
}

function sectionBody(raw: string, heading: string): string {
  const escaped = escapeRegExp(heading);
  const regex = new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = raw.match(regex);
  return match?.[1]?.trim() ?? '';
}

function normalizeDate(input: string | null, mtime?: Date, mode: 'start' | 'update' = 'update'): string | null {
  if (!input) return mtime ? mtime.toISOString() : null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    if (mode === 'update' && mtime) return mtime.toISOString();
    return `${input}T09:00:00+08:00`;
  }
  return input;
}

function cleanInlineText(value: string): string {
  return value.replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForDedupe(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function compareTaskEvents(a: TaskEventItem, b: TaskEventItem): number {
  const timeDiff = Date.parse(b.time) - Date.parse(a.time);
  if (Math.abs(timeDiff) > 6 * 60 * 60 * 1000) return timeDiff;

  const priorityDiff = eventPriority(a) - eventPriority(b);
  if (priorityDiff !== 0) return priorityDiff;

  const severityDiff = severityRank(a.severity) - severityRank(b.severity);
  if (severityDiff !== 0) return severityDiff;

  return timeDiff;
}

function eventPriority(event: TaskEventItem): number {
  switch (event.type) {
    case 'blocker_detected':
      return 0;
    case 'decision_made':
      return 1;
    case 'artifact_created':
      return 2;
    case 'handoff_prepared':
      return 3;
    case 'progress_update':
      return 4;
    case 'automation_linked':
      return 5;
    case 'task_completed':
      return 6;
    case 'task_created':
      return 7;
    default:
      return 9;
  }
}

function severityRank(severity: TaskEventItem['severity']): number {
  switch (severity) {
    case 'high':
      return 0;
    case 'medium':
      return 1;
    default:
      return 2;
  }
}
