import fs from 'fs';
import path from 'path';

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

const OPENCLAW_HOME = path.join(process.env.HOME ?? '', '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_HOME, 'agents');
const CACHE_TTL_MS = 60_000;

let cache: { expiresAt: number; data: LifetimeLedger } | null = null;

function emptyLedger(): LifetimeLedger {
  return {
    sessionCount: 0,
    assistantTurns: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalCost: 0,
    firstSeenAt: null,
    lastSeenAt: null,
    activeDays: 0,
  };
}

function walkJsonlFiles(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walkJsonlFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.jsonl')) out.push(fullPath);
  }

  return out;
}

function touchRange(ledger: LifetimeLedger, timestamp?: string): void {
  if (!timestamp) return;
  if (!ledger.firstSeenAt || timestamp < ledger.firstSeenAt) ledger.firstSeenAt = timestamp;
  if (!ledger.lastSeenAt || timestamp > ledger.lastSeenAt) ledger.lastSeenAt = timestamp;
}

function finalizeLedger(ledger: LifetimeLedger): LifetimeLedger {
  if (ledger.firstSeenAt && ledger.lastSeenAt) {
    const start = new Date(ledger.firstSeenAt).getTime();
    const end = new Date(ledger.lastSeenAt).getTime();
    const diffDays = Math.floor((end - start) / 86_400_000) + 1;
    ledger.activeDays = Math.max(diffDays, 1);
  }
  ledger.totalCost = Number(ledger.totalCost.toFixed(6));
  return ledger;
}

export function collectLifetimeLedger(): LifetimeLedger {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const ledger = emptyLedger();
  const files = walkJsonlFiles(AGENTS_DIR);

  for (const file of files) {
    ledger.sessionCount += 1;

    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }

      if (obj?.type !== 'message') {
        touchRange(ledger, obj?.timestamp);
        continue;
      }

      const msg = obj.message ?? {};
      touchRange(ledger, obj?.timestamp ?? msg?.timestamp);

      if (msg?.role !== 'assistant') continue;

      const usage = msg?.usage ?? {};
      if (!usage || typeof usage !== 'object') continue;

      ledger.assistantTurns += 1;
      ledger.inputTokens += Number(usage.input ?? 0);
      ledger.outputTokens += Number(usage.output ?? 0);
      ledger.totalTokens += Number(usage.totalTokens ?? 0);
      ledger.cacheReadTokens += Number(usage.cacheRead ?? 0);
      ledger.cacheWriteTokens += Number(usage.cacheWrite ?? 0);
      ledger.totalCost += Number(usage.cost?.total ?? 0);
    }
  }

  const data = finalizeLedger(ledger);
  cache = { expiresAt: Date.now() + CACHE_TTL_MS, data };
  return data;
}
