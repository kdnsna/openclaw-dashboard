import {
  fmtDuration,
  formatWorkflowPhaseLabel,
  formatWorkflowStatusLabel,
} from '../lib/format';
import type { AcpWorkflowSession, AcpWorkflowSnapshot } from '../lib/types';

interface AcpWorkflowSummaryCardProps {
  workflow: AcpWorkflowSnapshot | null;
}

export function AcpWorkflowSummaryCard({ workflow }: AcpWorkflowSummaryCardProps) {
  const sessions = [...(workflow?.sessions ?? [])].sort(compareWorkflowSession).slice(0, 3);

  return (
    <div className="card card-workflow-summary">
      <div className="card-header">
        <span className="card-icon">🪄</span>
        <span className="card-title">ACP 工作流摘要</span>
      </div>
      <div className="card-body">
        {!workflow ? (
          <div className="empty">正在加载 ACP 工作流…</div>
        ) : !workflow.available ? (
          <div className="empty">ACP 数据暂不可用：{workflow.error ?? '未找到会话索引'}</div>
        ) : (
          <>
            <div className="summary-grid compact">
              <div className="summary-stat tone-good">
                <div className="summary-stat-value">{workflow.stats.activeSessions}</div>
                <div className="summary-stat-label">活跃会话</div>
              </div>
              <div className="summary-stat tone-warn">
                <div className="summary-stat-value">{workflow.stats.openToolCalls}</div>
                <div className="summary-stat-label">工具进行中</div>
              </div>
              <div className="summary-stat tone-good">
                <div className="summary-stat-value">{fmtDuration(workflow.stats.avgTurnMs)}</div>
                <div className="summary-stat-label">平均轮次</div>
              </div>
              <div className="summary-stat tone-good">
                <div className="summary-stat-value">{fmtDuration(workflow.stats.avgToolMs)}</div>
                <div className="summary-stat-label">平均工具耗时</div>
              </div>
            </div>
            <div className="workflow-focus-list">
              {sessions.map((session) => (
                <div key={session.recordId} className={`workflow-focus-item status-${session.status}`}>
                  <div className="workflow-focus-top">
                    <span className="workflow-focus-name">{shortName(session.name)}</span>
                    <span className={`workflow-focus-status status-${session.status}`}>
                      {formatWorkflowStatusLabel(session.status)}
                    </span>
                  </div>
                  <div className="workflow-focus-meta">
                    <span>阶段 {formatWorkflowPhaseLabel(session.currentPhase)}</span>
                    <span>工具中 {session.toolStats.running}</span>
                    <span>轮次 {fmtDuration(session.latency.turnMs)}</span>
                  </div>
                  <div className="workflow-focus-event">{session.lastEvent}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function compareWorkflowSession(a: AcpWorkflowSession, b: AcpWorkflowSession): number {
  const scoreDelta = workflowScore(b) - workflowScore(a);
  if (scoreDelta !== 0) return scoreDelta;
  return Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? '');
}

function workflowScore(session: AcpWorkflowSession): number {
  let score = 0;
  if (session.status === 'error') score += 100;
  if (session.status === 'active') score += 40;
  score += session.toolStats.running * 12;
  score += session.currentPhase === 'tool' ? 10 : 0;
  return score;
}

function shortName(name: string): string {
  return name.replace(/^agent:[^:]+:acp:/, '').slice(0, 28);
}
