import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import { GatewayClient } from './gateway-client.js';
import { ActivityTracker } from './activity-tracker.js';
import { collectMetrics, type DashboardMetrics } from './metrics.js';
import { collectAcpWorkflow, type AcpWorkflowSnapshot } from './acp-workflow.js';
import { collectTaskFlow, type TaskFlowSnapshot } from './task-flow.js';
import { collectTaskEvents, type TaskEventItem } from './task-events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPDATE_INTERVAL_MS = 10000;
const ACP_UPDATE_INTERVAL_MS = 3000;

// ── Express & WebSocket Setup ──────────────────────────────

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.static(path.join(__dirname, 'public')));

// ── Services ───────────────────────────────────────────────

const gw = new GatewayClient();
const tracker = new ActivityTracker();

// ── REST API ───────────────────────────────────────────────

app.get('/api/metrics', async (_req, res) => {
  try {
    res.json(await collectMetrics(gw, tracker));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/acp-workflow', async (_req, res) => {
  try {
    res.json(await collectAcpWorkflow());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/task-flow', async (_req, res) => {
  try {
    res.json(await collectTaskFlow());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/task-events', async (_req, res) => {
  try {
    res.json(await collectTaskEvents());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── WebSocket Push ─────────────────────────────────────────

let latestMetrics: DashboardMetrics | null = null;
let latestAcpWorkflow: AcpWorkflowSnapshot | null = null;
let latestTaskFlow: TaskFlowSnapshot | null = null;
let latestTaskEvents: { generatedAt: string; source: string; events: TaskEventItem[] } | null = null;

wss.on('connection', (ws) => {
  if (latestMetrics) {
    ws.send(JSON.stringify({ type: 'metrics', data: latestMetrics }));
  }
  if (latestAcpWorkflow) {
    ws.send(JSON.stringify({ type: 'acp_workflow', data: latestAcpWorkflow }));
  }
  if (latestTaskFlow) {
    ws.send(JSON.stringify({ type: 'task_flow', data: latestTaskFlow }));
  }
  if (latestTaskEvents) {
    ws.send(JSON.stringify({ type: 'task_events', data: latestTaskEvents }));
  }
});

function broadcast(data: { type: string; data: unknown }): void {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// ── Update Loop ────────────────────────────────────────────

async function updateLoop(): Promise<void> {
  try {
    latestMetrics = await collectMetrics(gw, tracker);
    broadcast({ type: 'metrics', data: latestMetrics });
  } catch (err) {
    console.error('[update]', (err as Error).message);
  }
  setTimeout(updateLoop, UPDATE_INTERVAL_MS);
}

async function updateAcpWorkflowLoop(): Promise<void> {
  try {
    latestAcpWorkflow = await collectAcpWorkflow();
    broadcast({ type: 'acp_workflow', data: latestAcpWorkflow });
  } catch (err) {
    console.error('[acp-workflow]', (err as Error).message);
  }
  setTimeout(updateAcpWorkflowLoop, ACP_UPDATE_INTERVAL_MS);
}

async function updateTaskFlowLoop(): Promise<void> {
  try {
    latestTaskFlow = await collectTaskFlow();
    broadcast({ type: 'task_flow', data: latestTaskFlow });
  } catch (err) {
    console.error('[task-flow]', (err as Error).message);
  }
  setTimeout(updateTaskFlowLoop, UPDATE_INTERVAL_MS);
}

async function updateTaskEventsLoop(): Promise<void> {
  try {
    latestTaskEvents = await collectTaskEvents();
    broadcast({ type: 'task_events', data: latestTaskEvents });
  } catch (err) {
    console.error('[task-events]', (err as Error).message);
  }
  setTimeout(updateTaskEventsLoop, UPDATE_INTERVAL_MS);
}

// ── Error Handling ─────────────────────────────────────────

process.on('uncaughtException', (err) => console.error('[fatal]', err.message));
process.on('unhandledRejection', (err) => console.error('[rejection]', (err as Error)?.message ?? err));

// ── Start ──────────────────────────────────────────────────

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[dashboard] 🦐 http://0.0.0.0:${config.port}`);
  gw.connect();
  tracker.start();
  void updateLoop();
  void updateAcpWorkflowLoop();
  void updateTaskFlowLoop();
  void updateTaskEventsLoop();
});
