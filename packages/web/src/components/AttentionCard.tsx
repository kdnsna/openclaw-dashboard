import { fmtCost, fmtTokens } from '../lib/format';
import { listUnavailableResources } from '../lib/resource-state-copy';
import type {
  AcpWorkflowSnapshot,
  DashboardBootState,
  DashboardMetrics,
  ResourceStates,
} from '../lib/types';
import type { WsStatus } from '../hooks/useMetrics';

interface AttentionCardProps {
  data: DashboardMetrics | null;
  workflow: AcpWorkflowSnapshot | null;
  bootState: DashboardBootState;
  resourceStates: ResourceStates;
  wsStatus: WsStatus;
}

type AttentionLevel = 'high' | 'medium' | 'low';

interface AttentionItem {
  level: AttentionLevel;
  title: string;
  detail: string;
}

export function AttentionCard({ data, workflow, bootState, resourceStates, wsStatus }: AttentionCardProps) {
  const items = buildAttentionItems(data, workflow, bootState, resourceStates, wsStatus);
  const highCount = items.filter((item) => item.level === 'high').length;
  const headline = highCount > 0 ? '需要立即关注' : items.some((item) => item.level === 'medium') ? '建议稍后处理' : '当前整体平稳';

  return (
    <div className="card card-attention">
      <div className="card-header">
        <span className="card-icon">🚨</span>
        <span className="card-title">注意事项</span>
        <span className={`badge badge-${highCount > 0 ? 'danger' : 'ok'}`}>{headline}</span>
      </div>
      <div className="card-body">
        <div className="attention-summary">
          <span>高优 {highCount}</span>
          <span>自动化异常 {data?.automation?.failingJobs ?? 0}</span>
          <span>ACP 异常 {workflow?.sessions.filter((session) => session.status === 'error').length ?? 0}</span>
        </div>
        <div className="attention-list">
          {items.map((item, index) => (
            <div key={`${item.title}-${index}`} className={`attention-item level-${item.level}`}>
              <div className="attention-item-title">
                <span className={`attention-pill level-${item.level}`}>{levelLabel(item.level)}</span>
                <span>{item.title}</span>
              </div>
              <div className="attention-item-detail">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildAttentionItems(
  data: DashboardMetrics | null,
  workflow: AcpWorkflowSnapshot | null,
  bootState: DashboardBootState,
  resourceStates: ResourceStates,
  wsStatus: WsStatus,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const sessions = data?.status?.sessions?.recent ?? [];
  const tasks = data?.activity?.tasks ?? [];
  const dailyUsage = data?.usageCost?.daily ?? [];
  const today = dailyUsage.length > 0 ? dailyUsage[dailyUsage.length - 1] : undefined;
  const failingJobs = data?.automation?.failingJobs ?? 0;
  const warningJobs = data?.automation?.warningJobs ?? 0;
  const highCtxSessions = sessions.filter((session) => (session.percentUsed ?? 0) >= 75);
  const hotSessions = sessions.filter((session) => (session.age ?? Number.POSITIVE_INFINITY) <= 15 * 60 * 1000);
  const activeTasks = tasks.filter((task) => task.isActive);
  const workflowErrors = workflow?.sessions.filter((session) => session.status === 'error') ?? [];
  const unavailableResources = listUnavailableResources(resourceStates);
  const avgDailyCost = average(
    (data?.usageCost?.daily ?? [])
      .slice(-7)
      .map((day) => day.totalCost ?? 0)
      .filter((value) => value > 0),
  );

  if (bootState === 'booting') {
    items.push({
      level: 'medium',
      title: '正在同步首轮快照',
      detail: '启动阶段会先拉取一轮 REST 快照，再接入实时推送；此时不视为高优故障。',
    });
  } else if (wsStatus === 'offline') {
    items.push({
      level: 'high',
      title: '监控链路暂时离线',
      detail:
        unavailableResources.length > 0
          ? `当前不可用的数据源：${unavailableResources.join(' / ')}。建议先确认 3210 与网关侧链路状态。`
          : '当前前端或网关链路未处于 live 状态，建议先确认 3210 与网关侧连接。',
    });
  } else if (wsStatus === 'connecting') {
    items.push({
      level: 'medium',
      title: '实时链路正在重连',
      detail: '指标会在 fallback 轮询里继续刷新，但实时推送暂时不稳定。',
    });
  }

  if (bootState === 'degraded' && unavailableResources.length > 0) {
    items.push({
      level: 'medium',
      title: '部分数据源暂未同步成功',
      detail: `当前仍可查看已成功快照，未到位的数据源包括：${unavailableResources.join(' / ')}。`,
    });
  }

  if (bootState !== 'booting' && data && !data.gwConnected) {
    items.push({
      level: 'high',
      title: '网关连接未建立',
      detail: '当前主监控快照已返回，但网关仍显示未连接，建议同时检查官方 Dashboard 与底层进程。',
    });
  }

  if (data?.health && !data.health.ok) {
    items.push({
      level: 'high',
      title: '底层通道健康降级',
      detail: '官方网关健康检查未通过，建议打开官方 Dashboard 的 Overview / Logs 深入排查。',
    });
  }

  if (failingJobs > 0) {
    items.push({
      level: 'high',
      title: `有 ${failingJobs} 个自动化任务失败`,
      detail: '自动化摘要已经识别到 failing 状态，优先检查最近报错和连续失败次数。',
    });
  } else if (warningJobs > 0) {
    items.push({
      level: 'medium',
      title: `有 ${warningJobs} 个自动化任务待关注`,
      detail: '存在超时、过长或临近 overdue 的任务，适合进入检修视图追踪。',
    });
  }

  if (workflowErrors.length > 0) {
    items.push({
      level: 'high',
      title: `ACP 工作流出现 ${workflowErrors.length} 个异常会话`,
      detail: `异常会话最近事件包括：${workflowErrors[0]?.lastEvent ?? '未知错误'}。`,
    });
  } else if ((workflow?.stats.openToolCalls ?? 0) >= 4) {
    items.push({
      level: 'medium',
      title: 'ACP 工具调用堆积',
      detail: `当前有 ${workflow?.stats.openToolCalls ?? 0} 个工具调用仍在执行，建议留意是否卡在工具阶段。`,
    });
  }

  if (highCtxSessions.length > 0) {
    const hottest = highCtxSessions[0];
    items.push({
      level: highCtxSessions.length >= 2 ? 'high' : 'medium',
      title: `${highCtxSessions.length} 个会话上下文逼近上限`,
      detail: `${hottest.key} 已使用 ${hottest.percentUsed ?? 0}% 上下文，适合优先清理或切新会话。`,
    });
  }

  if (activeTasks.length >= 4) {
    items.push({
      level: 'medium',
      title: '并行任务较多',
      detail: `当前有 ${activeTasks.length} 个进行中任务，建议关注抢占上下文和工具资源的会话。`,
    });
  }

  if (today?.totalCost != null && avgDailyCost != null && today.totalCost > avgDailyCost * 1.6) {
    items.push({
      level: 'medium',
      title: '今日成本高于近 7 日均值',
      detail: `今日成本 ${fmtCost(today.totalCost)}，明显高于近期日均 ${fmtCost(avgDailyCost)}。`,
    });
  }

  if (hotSessions.length >= 3) {
    items.push({
      level: 'low',
      title: '当前会话活跃度很高',
      detail: `最近 15 分钟内活跃会话 ${hotSessions.length} 个，总令牌压力约 ${fmtTokens(
        hotSessions.reduce((sum, session) => sum + (session.totalTokens ?? 0), 0),
      )}。`,
    });
  }

  if (items.length === 0) {
    items.push({
      level: 'low',
      title: '暂无明显风险',
      detail: `今日成本 ${fmtCost(today?.totalCost)}，自动化和 ACP 暂未出现高优警报。`,
    });
  }

  return items.sort((a, b) => levelRank(a.level) - levelRank(b.level)).slice(0, 5);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function levelRank(level: AttentionLevel): number {
  if (level === 'high') return 0;
  if (level === 'medium') return 1;
  return 2;
}

function levelLabel(level: AttentionLevel): string {
  if (level === 'high') return '立即';
  if (level === 'medium') return '关注';
  return '观察';
}
