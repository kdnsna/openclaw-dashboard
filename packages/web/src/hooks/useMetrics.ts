import { useState, useEffect, useRef, useCallback } from 'react';
import type { AcpWorkflowSnapshot, DashboardMetrics } from '../lib/types';

export type WsStatus = 'connecting' | 'live' | 'offline';

export interface UseMetricsResult {
  data: DashboardMetrics | null;
  acpWorkflow: AcpWorkflowSnapshot | null;
  wsStatus: WsStatus;
}

export function useMetrics(): UseMetricsResult {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [acpWorkflow, setAcpWorkflow] = useState<AcpWorkflowSnapshot | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchFallback = useCallback(() => {
    const base = location.pathname.replace(/\/+$/, '');

    fetch(base + '/api/metrics')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});

    fetch(base + '/api/acp-workflow')
      .then((r) => r.json())
      .then(setAcpWorkflow)
      .catch(() => {});
  }, []);

  const connect = useCallback(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const base = location.pathname.replace(/\/+$/, '');
    const ws = new WebSocket(`${proto}://${location.host}${base}/ws`);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => {
      setWsStatus('live');
      clearTimeout(reconnectRef.current);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'metrics') setData(msg.data);
        if (msg.type === 'acp_workflow') setAcpWorkflow(msg.data);
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onclose = () => {
      setWsStatus('offline');
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();

    const fallback = setTimeout(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchFallback();
      }
    }, 5000);

    const polling = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchFallback();
      }
    }, 5000);

    return () => {
      clearTimeout(fallback);
      clearInterval(polling);
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect, fetchFallback]);

  return { data, acpWorkflow, wsStatus };
}
