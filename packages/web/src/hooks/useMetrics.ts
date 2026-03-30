import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  createInitialMetricsRuntimeState,
  getDashboardBootState,
  getDashboardWsStatus,
  reduceMetricsRuntimeState,
} from '../lib/metrics-state.js';
import type {
  AcpWorkflowSnapshot,
  DashboardBootState,
  DashboardMetrics,
  DashboardResourceKey,
  ResourceStates,
  TaskEventItem,
  TaskFlowSnapshot,
} from '../lib/types.js';

const RESOURCE_KEYS: DashboardResourceKey[] = ['metrics', 'acpWorkflow', 'taskFlow', 'taskEvents'];
const RECONNECT_INTERVAL_MS = 3000;
const POLL_INTERVAL_MS = 10000;

export type WsStatus = 'connecting' | 'live' | 'offline';

export interface UseMetricsResult {
  data: DashboardMetrics | null;
  acpWorkflow: AcpWorkflowSnapshot | null;
  taskFlow: TaskFlowSnapshot | null;
  taskEvents: TaskEventItem[];
  wsStatus: WsStatus;
  bootState: DashboardBootState;
  resourceStates: ResourceStates;
  refreshAll: () => Promise<void>;
}

export function useMetrics(): UseMetricsResult {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [acpWorkflow, setAcpWorkflow] = useState<AcpWorkflowSnapshot | null>(null);
  const [taskFlow, setTaskFlow] = useState<TaskFlowSnapshot | null>(null);
  const [taskEvents, setTaskEvents] = useState<TaskEventItem[]>([]);
  const [runtimeState, dispatch] = useReducer(
    reduceMetricsRuntimeState,
    undefined,
    createInitialMetricsRuntimeState,
  );
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  const applySnapshot = useCallback(
    (
      resource: DashboardResourceKey,
      payload: DashboardMetrics | AcpWorkflowSnapshot | TaskFlowSnapshot | TaskEventItem[],
      updatedAt = Date.now(),
    ) => {
      switch (resource) {
        case 'metrics':
          setData(payload as DashboardMetrics);
          break;
        case 'acpWorkflow':
          setAcpWorkflow(payload as AcpWorkflowSnapshot);
          break;
        case 'taskFlow':
          setTaskFlow(payload as TaskFlowSnapshot);
          break;
        case 'taskEvents':
          setTaskEvents(payload as TaskEventItem[]);
          break;
      }

      dispatch({ type: 'resource_succeeded', resource, updatedAt });
    },
    [],
  );

  const fetchResource = useCallback(
    async (resource: DashboardResourceKey, options?: { markLoading?: boolean }) => {
      const markLoading = options?.markLoading ?? true;
      if (markLoading) {
        dispatch({ type: 'resource_loading', resource });
      }

      try {
        const base = getBasePath();

        switch (resource) {
          case 'metrics': {
            const payload = await fetchJson<DashboardMetrics>(`${base}/api/metrics`);
            if (disposedRef.current) return false;
            applySnapshot(resource, payload);
            break;
          }
          case 'acpWorkflow': {
            const payload = await fetchJson<AcpWorkflowSnapshot>(`${base}/api/acp-workflow`);
            if (disposedRef.current) return false;
            applySnapshot(resource, payload);
            break;
          }
          case 'taskFlow': {
            const payload = await fetchJson<TaskFlowSnapshot>(`${base}/api/task-flow`);
            if (disposedRef.current) return false;
            applySnapshot(resource, payload);
            break;
          }
          case 'taskEvents': {
            const payload = await fetchJson<{ events?: TaskEventItem[] }>(`${base}/api/task-events`);
            if (disposedRef.current) return false;
            applySnapshot(resource, payload?.events ?? []);
            break;
          }
        }

        return true;
      } catch (error) {
        if (!disposedRef.current) {
          dispatch({
            type: 'resource_failed',
            resource,
            error: getErrorMessage(error),
          });
        }
        return false;
      }
    },
    [applySnapshot],
  );

  const refreshResources = useCallback(
    async (options?: { markLoading?: boolean }) => {
      await Promise.allSettled(RESOURCE_KEYS.map((resource) => fetchResource(resource, options)));
    },
    [fetchResource],
  );

  const connect = useCallback(() => {
    if (disposedRef.current) return;

    const current = wsRef.current;
    if (current && (current.readyState === WebSocket.CONNECTING || current.readyState === WebSocket.OPEN)) {
      return;
    }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const base = getBasePath();
    const ws = new WebSocket(`${proto}://${location.host}${base}/ws`);
    wsRef.current = ws;
    dispatch({ type: 'ws_connecting' });

    ws.onopen = () => {
      if (disposedRef.current) return;

      dispatch({ type: 'ws_live' });
      if (reconnectRef.current != null) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      if (disposedRef.current) return;

      try {
        const message = JSON.parse(event.data);
        const updatedAt = Date.now();

        if (message.type === 'metrics') {
          applySnapshot('metrics', message.data, updatedAt);
        }
        if (message.type === 'acp_workflow') {
          applySnapshot('acpWorkflow', message.data, updatedAt);
        }
        if (message.type === 'task_flow') {
          applySnapshot('taskFlow', message.data, updatedAt);
        }
        if (message.type === 'task_events') {
          applySnapshot('taskEvents', message.data?.events ?? [], updatedAt);
        }
      } catch {
        // Ignore malformed websocket messages.
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (disposedRef.current) return;

      dispatch({ type: 'ws_offline' });
      if (reconnectRef.current != null) {
        clearTimeout(reconnectRef.current);
      }
      reconnectRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_INTERVAL_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [applySnapshot]);

  const refreshAll = useCallback(async () => {
    await refreshResources({ markLoading: true });
  }, [refreshResources]);

  useEffect(() => {
    disposedRef.current = false;
    dispatch({ type: 'bootstrap_started' });

    void refreshResources({ markLoading: false }).finally(() => {
      if (disposedRef.current) return;
      dispatch({ type: 'bootstrap_finished' });
      connect();
    });

    const polling = setInterval(() => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        void refreshResources({ markLoading: false });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      disposedRef.current = true;
      clearInterval(polling);
      if (reconnectRef.current != null) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }

      const socket = wsRef.current;
      wsRef.current = null;
      socket?.close();
    };
  }, [connect, refreshResources]);

  return {
    data,
    acpWorkflow,
    taskFlow,
    taskEvents,
    wsStatus: getDashboardWsStatus(runtimeState),
    bootState: getDashboardBootState(runtimeState),
    resourceStates: runtimeState.resources,
    refreshAll,
  };
}

function getBasePath(): string {
  return location.pathname.replace(/\/+$/, '');
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }
  return response.json() as Promise<T>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '请求失败';
}
