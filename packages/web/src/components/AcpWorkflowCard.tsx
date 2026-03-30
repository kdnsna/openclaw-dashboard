import {
  fmtDateTime,
  fmtDuration,
  fmtTime,
  timeAgo,
  formatWorkflowModeLabel,
  formatWorkflowModelLabel,
  formatWorkflowPhaseLabel,
  formatWorkflowStatusLabel,
} from '../lib/format';
import {
  buildAcpSessionDisplay,
  getAcpMetricCopy,
} from '../lib/dashboard-presenters';
import type {
  AcpWorkflowNode,
  AcpWorkflowSession,
  AcpWorkflowSnapshot,
  ResourceState,
} from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface AcpWorkflowCardProps {
  workflow: AcpWorkflowSnapshot | null;
  state: ResourceState;
  onRetry?: () => void;
}

export function AcpWorkflowCard({ workflow, state, onRetry }: AcpWorkflowCardProps) {
  const sessions = workflow?.sessions ?? [];
  const hasSnapshot = Boolean(workflow);
  const turnMetricCopy = getAcpMetricCopy('turn');
  const toolMetricCopy = getAcpMetricCopy('tool');

  return (
    <div className="card workflow-card span-full">
      <div className="card-header">
        <span className="card-icon">🪄</span>
        <span className="card-title">ACP 工作流检修</span>
        <span className={`badge ${workflow?.stats.activeSessions ? 'pulse' : ''}`}>
          活跃 {workflow?.stats.activeSessions ?? 0}
        </span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步 ACP 深查"
            detail="工作流阶段、节点轨迹和耗时统计会在首轮 ACP 快照返回后补齐。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="ACP 深查暂不可用"
            detail={state.error ?? 'ACP 工作流请求失败'}
            onRetry={onRetry}
          />
        ) : !workflow?.available ? (
          <CardStateNotice
            tone="error"
            title="ACP 数据暂不可用"
            detail={workflow?.error ?? '未找到会话索引'}
            onRetry={onRetry}
          />
        ) : sessions.length === 0 ? (
          <div className="empty">暂无 ACP 工作流会话</div>
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新 ACP 深查" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? 'ACP 深查刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="workflow-summary">
              <Metric label="活跃会话" value={String(workflow.stats.activeSessions)} accent="cyan" />
              <Metric label="流转次数" value={String(workflow.stats.transitions)} accent="green" />
              <Metric label={turnMetricCopy.label} hint={turnMetricCopy.hint} value={formatMs(workflow.stats.avgTurnMs)} accent="cyan" />
              <Metric label={toolMetricCopy.label} hint={toolMetricCopy.hint} value={formatMs(workflow.stats.avgToolMs)} accent="purple" />
            </div>

            <div className="workflow-session-grid">
              {sessions.map((session) => (
                <WorkflowSessionCard key={session.recordId} session={session} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WorkflowSessionCard({ session }: { session: AcpWorkflowSession }) {
  const updatedAgo = session.updatedAt ? timeAgo(Date.now() - Date.parse(session.updatedAt)) : '--';
  const display = buildAcpSessionDisplay(session);

  return (
    <div className={`workflow-session-card state-${session.status}`}>
      <div className="workflow-session-header">
        <div className="workflow-session-main">
          <div className="workflow-session-name" title={display.technicalName}>{display.primaryName}</div>
          <div className="workflow-session-secondary" title={display.technicalName}>{display.secondaryName}</div>
          <div className="workflow-session-cwd" title={session.cwd}>{display.cwdHint}</div>
        </div>
        <div className={`workflow-session-status status-${session.status}`}>
          {formatWorkflowStatusLabel(session.status)}
        </div>
      </div>

      <div className="workflow-session-meta-top">
        <span>{session.updatedAt ? fmtTime(session.updatedAt) : '--'}</span>
        <span>{updatedAgo}</span>
        <span>阶段 {formatWorkflowPhaseLabel(session.currentPhase)}</span>
      </div>

      <div className="workflow-track-shell">
        <div className="workflow-track-row">
          {session.nodes.map((node, index) => (
            <WorkflowStep
              key={node.id}
              node={node}
              showConnector={index < session.nodes.length - 1}
              connectorSeen={hasSeenNext(session.nodes, index)}
            />
          ))}
        </div>
      </div>

      <div className="workflow-session-chips">
        <span className="workflow-chip">阶段：{formatWorkflowPhaseLabel(session.currentPhase)}</span>
        <span className="workflow-chip">{formatWorkflowModeLabel(session.currentModeId)}</span>
        <span className="workflow-chip">{formatWorkflowModelLabel(session.modelId)}</span>
        <span className="workflow-chip">工具 {session.toolStats.total} 次</span>
        <span className="workflow-chip">进行中 {session.toolStats.running}</span>
        <span className="workflow-chip">轮次 {fmtDuration(session.latency.turnMs)}</span>
        <span className="workflow-chip">首响 {fmtDuration(session.latency.firstResponseMs)}</span>
      </div>

      <div className="workflow-session-detail-grid">
        <div className="workflow-detail-item">
          <span className="workflow-detail-label">开始</span>
          <span className="workflow-detail-value">{fmtDateTime(session.startedAt)}</span>
        </div>
        <div className="workflow-detail-item">
          <span className="workflow-detail-label">最近更新</span>
          <span className="workflow-detail-value">{fmtDateTime(session.updatedAt)}</span>
        </div>
        <div className="workflow-detail-item">
          <span className="workflow-detail-label">慢工具</span>
          <span className="workflow-detail-value">{fmtDuration(session.toolStats.slowestDurationMs)}</span>
        </div>
        <div className="workflow-detail-item">
          <span className="workflow-detail-label">空闲</span>
          <span className="workflow-detail-value">{fmtDuration(session.latency.idleMs)}</span>
        </div>
      </div>

      <div className="workflow-session-event">最近事件：{session.lastEvent}</div>
    </div>
  );
}

function WorkflowStep(params: {
  node: AcpWorkflowNode;
  showConnector: boolean;
  connectorSeen: boolean;
}) {
  const { node, showConnector, connectorSeen } = params;

  return (
    <>
      <div className="workflow-step">
        <div className="workflow-step-top">
          {node.count ? <span className="workflow-step-count">{node.count}</span> : <span className="workflow-step-count placeholder" />}
          <span className={`workflow-step-dot ${node.status}`} />
        </div>
        <div className="workflow-step-label">{formatWorkflowPhaseLabel(node.id)}</div>
      </div>
      {showConnector ? <div className={`workflow-step-connector ${connectorSeen ? 'seen' : ''}`} /> : null}
    </>
  );
}

function hasSeenNext(nodes: AcpWorkflowNode[], index: number): boolean {
  const current = nodes[index];
  const next = nodes[index + 1];
  return current?.status !== 'idle' && next?.status !== 'idle';
}

function Metric({
  label,
  hint,
  value,
  accent,
}: {
  label: string;
  hint?: string;
  value: string;
  accent: 'cyan' | 'green' | 'purple';
}) {
  return (
    <div className={`workflow-metric accent-${accent}`}>
      <span className="workflow-metric-label" title={hint}>{label}</span>
      <span className="workflow-metric-value">{value}</span>
    </div>
  );
}

function formatMs(ms: number | null): string {
  return fmtDuration(ms);
}
