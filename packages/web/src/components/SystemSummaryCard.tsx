import { fmtPct } from '../lib/format';
import { listUnavailableResources } from '../lib/resource-state-copy';
import type {
  AcpWorkflowSnapshot,
  DashboardBootState,
  DashboardMetrics,
  ResourceStates,
} from '../lib/types';
import type { WsStatus } from '../hooks/useMetrics';

interface SystemSummaryCardProps {
  data: DashboardMetrics | null;
  workflow: AcpWorkflowSnapshot | null;
  bootState: DashboardBootState;
  resourceStates: ResourceStates;
  wsStatus: WsStatus;
}

export function SystemSummaryCard({ data, workflow, bootState, resourceStates, wsStatus }: SystemSummaryCardProps) {
  const channels = Object.values(data?.health?.channels ?? {});
  const healthyChannels = channels.filter((channel) => channel.probe?.ok || channel.configured).length;
  const sessions = data?.status?.sessions?.recent ?? [];
  const tasks = data?.activity?.tasks ?? [];
  const activeTasks = tasks.filter((task) => task.isActive).length;
  const highCtxSessions = sessions.filter((session) => (session.percentUsed ?? 0) >= 75).length;
  const unavailableResources = listUnavailableResources(resourceStates);

  const summaryItems = [
    {
      label: '网关',
      value: !data ? (bootState === 'booting' ? '同步中' : '暂不可用') : data.gwConnected ? '已连接' : '离线',
      tone: !data ? 'warn' : data.gwConnected ? 'good' : 'danger',
    },
    {
      label: '实时链路',
      value:
        bootState === 'booting'
          ? '首轮同步'
          : wsStatus === 'live'
            ? 'Live'
            : wsStatus === 'connecting'
              ? '重连中'
              : 'Offline',
      tone: wsStatus === 'live' ? 'good' : 'warn',
    },
    {
      label: '通道健康',
      value: data ? `${healthyChannels}/${channels.length || 0}` : '--',
      tone: data && healthyChannels === channels.length ? 'good' : 'warn',
    },
    {
      label: '活跃任务',
      value: data ? `${activeTasks}/${tasks.length}` : '--',
      tone: !data ? 'warn' : activeTasks > 3 ? 'warn' : 'good',
    },
    {
      label: '高压会话',
      value: data ? `${highCtxSessions}` : '--',
      tone: !data ? 'warn' : highCtxSessions > 0 ? 'danger' : 'good',
    },
    {
      label: 'ACP 工具中',
      value: workflow ? `${workflow.stats.openToolCalls}` : '--',
      tone: !workflow ? 'warn' : (workflow?.stats.openToolCalls ?? 0) > 0 ? 'warn' : 'good',
    },
  ];

  const summaryNote =
    bootState === 'booting'
      ? '正在连接监控源并同步首轮快照，首屏不会再把短暂启动波动误判为离线故障。'
      : bootState === 'degraded' && unavailableResources.length > 0
        ? `部分监控源暂未到位：${unavailableResources.join(' / ')}。其余卡片继续展示最近一次成功快照。`
        : `主机负载 CPU ${fmtPct(data?.system.cpuPercent)}，内存 ${fmtPct(data?.system.memPercent)}，最近活动 ${
            data?.activity?.stats.lastActivityAt ? new Date(data.activity.stats.lastActivityAt).toLocaleTimeString('zh-CN') : '--'
          }。`;

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
        <div className="summary-note">{summaryNote}</div>
      </div>
    </div>
  );
}
