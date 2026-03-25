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
import type { AcpWorkflowNode, AcpWorkflowSession, AcpWorkflowSnapshot } from '../lib/types';

interface AcpWorkflowCardProps {
  workflow: AcpWorkflowSnapshot | null;
}

export function AcpWorkflowCard({ workflow }: AcpWorkflowCardProps) {
  const sessions = workflow?.sessions ?? [];

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
        {!workflow ? (
          <div className="empty">正在加载 ACP 工作流…</div>
        ) : !workflow.available ? (
          <div className="empty">ACP 数据暂不可用：{workflow.error ?? '未找到会话索引'}</div>
        ) : sessions.length === 0 ? (
          <div className="empty">暂无 ACP 工作流会话</div>
        ) : (
          <>
            <div className="workflow-summary">
              <Metric label="活跃会话" value={String(workflow.stats.activeSessions)} accent="cyan" />
              <Metric label="流转次数" value={String(workflow.stats.transitions)} accent="green" />
              <Metric label="平均轮次耗时" value={formatMs(workflow.stats.avgTurnMs)} accent="cyan" />
              <Metric label="平均工具耗时" value={formatMs(workflow.stats.avgToolMs)} accent="purple" />
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

  return (
    <div className={`workflow-session-card state-${session.status}`}>
      <div className="workflow-session-header">
        <div className="workflow-session-main">
          <div className="workflow-session-name">{shortName(session.name)}</div>
          <div className="workflow-session-cwd">{shortCwd(session.cwd)}</div>
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

function Metric({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'green' | 'purple' }) {
  return (
    <div className={`workflow-metric accent-${accent}`}>
      <span className="workflow-metric-label">{label}</span>
      <span className="workflow-metric-value">{value}</span>
    </div>
  );
}

function formatMs(ms: number | null): string {
  return fmtDuration(ms);
}

function shortName(name: string): string {
  return name.replace(/^agent:[^:]+:acp:/, '').slice(0, 24);
}

function shortCwd(cwd: string): string {
  return cwd.replace(/^.*\.openclaw\/workspace\//, '').replace(/^\/Users\/[^/]+\//, '~/').slice(0, 36);
}
