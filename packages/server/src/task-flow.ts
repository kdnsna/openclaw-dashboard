import fs from 'fs';
import path from 'path';

export interface TaskFlowItem {
  taskId: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'waiting_confirmation' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  stage: string;
  updatedAt: string | null;
  startedAt: string | null;
  currentBlocker: string;
  nextStep: string;
  relatedPaths: string[];
  relatedSessions: string[];
  relatedCronIds: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TaskFlowSnapshot {
  generatedAt: string;
  source: string;
  tasks: TaskFlowItem[];
}

const TASKS_DIR = path.join(process.cwd(), '..', '..', '..', 'projects', '_ops', 'tasks');

export async function collectTaskFlow(): Promise<TaskFlowSnapshot> {
  const files = await fs.promises.readdir(TASKS_DIR);
  const taskFiles = files.filter(
    (file) => file.endsWith('.md') && file !== 'README.md' && file !== 'TEMPLATE.md' && !file.endsWith('.README.md'),
  );

  const tasks = await Promise.all(
    taskFiles.map(async (file) => {
      const fullPath = path.join(TASKS_DIR, file);
      const raw = await fs.promises.readFile(fullPath, 'utf8');
      const stat = await fs.promises.stat(fullPath);
      return parseTaskCard(file, raw, stat.mtime);
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    source: 'projects/_ops/tasks/*.md',
    tasks: tasks
      .filter(Boolean)
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || timeDesc(a.updatedAt, b.updatedAt)),
  };
}

function parseTaskCard(file: string, raw: string, mtime: Date): TaskFlowItem {
  const taskId = file.replace(/\.md$/, '');
  const title = pickInlineValue(raw, '# 任务：') || taskId;
  const statusCn = pickListValue(raw, '状态') || '进行中';
  const priorityCn = pickListValue(raw, '优先级') || '中';
  const startedAt = normalizeDate(pickListValue(raw, '发起时间'), mtime, 'start');
  const updatedAt = normalizeDate(pickListValue(raw, '最近更新时间'), mtime, 'update');
  const nextStep = firstBulletUnderHeading(raw, '下一步') || '';
  const currentBlocker = firstBulletUnderHeading(raw, '风险 / 阻塞') || '';
  const relatedPaths = bulletsUnderHeading(raw, '相关路径');

  return {
    taskId,
    title,
    status: mapStatus(statusCn),
    priority: mapPriority(priorityCn),
    stage: inferStage(taskId, nextStep, currentBlocker),
    updatedAt,
    startedAt,
    currentBlocker,
    nextStep,
    relatedPaths,
    relatedSessions: [],
    relatedCronIds: inferCronIds(taskId),
    riskLevel: inferRiskLevel(currentBlocker, mapPriority(priorityCn)),
  };
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

function mapStatus(value: string): TaskFlowItem['status'] {
  if (value.includes('未开始')) return 'not_started';
  if (value.includes('阻塞')) return 'blocked';
  if (value.includes('等待确认')) return 'waiting_confirmation';
  if (value.includes('已完成')) return 'completed';
  if (value.includes('暂停')) return 'paused';
  return 'in_progress';
}

function mapPriority(value: string): TaskFlowItem['priority'] {
  if (value.includes('低')) return 'low';
  if (value.includes('中')) return 'medium';
  return 'high';
}

function inferStage(taskId: string, nextStep: string, blocker: string): string {
  if (taskId.includes('feishu-archive')) return 'verifying-write-path';
  if (taskId.includes('interruption-followup')) return 'stabilizing-rule';
  if (taskId.includes('task-event-flow')) return 'drafting-schema';
  if (/验证|打通|调用路径/.test(nextStep + blocker)) return 'verifying';
  if (/脚本|模板|机制/.test(nextStep + blocker)) return 'drafting';
  return 'in_progress';
}

function inferRiskLevel(blocker: string, priority: TaskFlowItem['priority']): TaskFlowItem['riskLevel'] {
  if (priority === 'high' && blocker) return 'medium';
  if (priority === 'high') return 'low';
  return blocker ? 'medium' : 'low';
}

function inferCronIds(taskId: string): string[] {
  if (taskId.includes('ai-morning-briefing-feishu-archive')) {
    return ['f5f3eea2-6e05-43b7-b765-fb1a06b69a52'];
  }
  return [];
}

function priorityRank(priority: TaskFlowItem['priority']): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function timeDesc(a: string | null, b: string | null): number {
  return (Date.parse(b || '') || 0) - (Date.parse(a || '') || 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
