import { fmtPct } from '../lib/format';
import type { AcpWorkflowSnapshot, DashboardMetrics } from '../lib/types';
import type { WsStatus } from '../hooks/useMetrics';

interface SystemSummaryCardProps {
  data: DashboardMetrics | null;
  workflow: AcpWorkflowSnapshot | null;
  wsStatus: WsStatus;
}

export function SystemSummaryCard({ data, workflow, wsStatus }: SystemSummaryCardProps) {
  const channels = Object.values(data?.health?.channels ?? {});
  const healthyChannels = channels.filter((channel) => channel.probe?.ok || channel.configured).length;
  const sessions = data?.status?.sessions?.recent ?? [];
  const tasks = data?.activity?.tasks ?? [];
  const activeTasks = tasks.filter((task) => task.isActive).length;
  const highCtxSessions = sessions.filter((session) => (session.percentUsed ?? 0) >= 75).length;

  const summaryItems = [
    { label: '网关', value: data?.gwConnected ? '已连接' : '离线', tone: data?.gwConnected ? 'good' : 'danger' },
    { label: '实时链路', value: wsStatus === 'live' ? 'Live' : wsStatus === 'connecting' ? '重连中' : 'Offline', tone: wsStatus === 'live' ? 'good' : 'warn' },
    { label: '通道健康', value: `${healthyChannels}/${channels.length || 0}`, tone: healthyChannels === channels.length ? 'good' : 'warn' },
    { label: '活跃任务', value: `${activeTasks}/${tasks.length}`, tone: activeTasks > 3 ? 'warn' : 'good' },
    { label: '高压会话', value: `${highCtxSessions}`, tone: highCtxSessions > 0 ? 'danger' : 'good' },
    { label: 'ACP 工具中', value: `${workflow?.stats.openToolCalls ?? 0}`, tone: (workflow?.stats.openToolCalls ?? 0) > 0 ? 'warn' : 'good' },
  ];

  return (
    <div className="card card-system-summary">
      <div className="card-header">
        <span className="card-icon">🛰️</span>
        <span className="card-title">系统摘要</span>
      </div>
      <div className="card-body">
        <div className="summary-grid">
          {summaryItems.map((item) => (
            <div key={item.label} className={`summary-stat tone-${item.tone}`}>
              <div className="summary-stat-value">{item.value}</div>
              <div className="summary-stat-label">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="summary-note">
          主机负载 CPU {fmtPct(data?.system.cpuPercent)}，内存 {fmtPct(data?.system.memPercent)}，最近活动
          {' '}
          {data?.activity?.stats.lastActivityAt ? new Date(data.activity.stats.lastActivityAt).toLocaleTimeString('zh-CN') : '--'}
          。
        </div>
      </div>
    </div>
  );
}
