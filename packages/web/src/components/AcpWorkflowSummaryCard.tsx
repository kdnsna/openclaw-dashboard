import {
  fmtDuration,
  formatWorkflowPhaseLabel,
  formatWorkflowStatusLabel,
} from '../lib/format';
import {
  buildAcpSessionDisplay,
  getAcpMetricCopy,
} from '../lib/dashboard-presenters';
import type { AcpWorkflowSession, AcpWorkflowSnapshot, ResourceState } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface AcpWorkflowSummaryCardProps {
  workflow: AcpWorkflowSnapshot | null;
  state: ResourceState;
  onRetry?: () => void;
}

export function AcpWorkflowSummaryCard({ workflow, state, onRetry }: AcpWorkflowSummaryCardProps) {
  const sessions = [...(workflow?.sessions ?? [])].sort(compareWorkflowSession).slice(0, 3);
  const hasSnapshot = Boolean(workflow);
  const turnMetricCopy = getAcpMetricCopy('turn');
  const toolMetricCopy = getAcpMetricCopy('tool');

  return (
    <div className="card card-workflow-summary">
      <div className="card-header">
        <span className="card-icon">🪄</span>
        <span className="card-title">ACP 工作流摘要</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步 ACP 工作流"
            detail="会话状态、阶段和平均耗时会在首轮 ACP 快照返回后补齐。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="ACP 工作流暂不可用"
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
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新 ACP 工作流" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? 'ACP 工作流刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
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
                <div className="summary-stat-label" title={turnMetricCopy.hint}>{turnMetricCopy.label}</div>
              </div>
              <div className="summary-stat tone-good">
                <div className="summary-stat-value">{fmtDuration(workflow.stats.avgToolMs)}</div>
                <div className="summary-stat-label" title={toolMetricCopy.hint}>{toolMetricCopy.label}</div>
              </div>
            </div>
            <div className="workflow-focus-list">
              {sessions.map((session) => {
                const display = buildAcpSessionDisplay(session);

                return (
                  <div key={session.recordId} className={`workflow-focus-item status-${session.status}`}>
                    <div className="workflow-focus-top">
                      <div className="workflow-focus-heading">
                        <span className="workflow-focus-name" title={session.name}>
                          {display.primaryName}
                        </span>
                        <span className="workflow-focus-secondary" title={session.name}>
                          {display.secondaryName}
                        </span>
                      </div>
                      <span className={`workflow-focus-status status-${session.status}`}>
                        {formatWorkflowStatusLabel(session.status)}
                      </span>
                    </div>
                    <div className="workflow-focus-meta">
                      <span title={session.cwd}>{display.cwdHint}</span>
                      <span>阶段 {formatWorkflowPhaseLabel(session.currentPhase)}</span>
                      <span>工具中 {session.toolStats.running}</span>
                      <span>轮次 {fmtDuration(session.latency.turnMs)}</span>
                    </div>
                    <div className="workflow-focus-event" title={session.lastEvent}>{session.lastEvent}</div>
                  </div>
                );
              })}
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
