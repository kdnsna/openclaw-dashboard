import { fmtDateTime, fmtDuration, formatAutomationHealthLabel } from '../lib/format';
import type { AutomationSnapshot, ResourceState } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface AutomationStatusCardProps {
  automation?: AutomationSnapshot | null;
  state: ResourceState;
  onRetry?: () => void;
}

export function AutomationStatusCard({ automation, state, onRetry }: AutomationStatusCardProps) {
  const jobs = automation?.jobs ?? [];
  const hasSnapshot = Boolean(automation);

  return (
    <div className="card card-automation">
      <div className="card-header">
        <span className="card-icon">⏱️</span>
        <span className="card-title">自动化状态</span>
        <span className={`badge ${(automation?.failingJobs ?? 0) > 0 ? 'badge-danger' : 'badge-ok'}`}>
          异常 {automation?.failingJobs ?? 0}
        </span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步自动化摘要"
            detail="启动阶段会先补齐一轮 cron 快照，再接入实时变化。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="自动化摘要暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : !automation?.available ? (
          <CardStateNotice
            tone="error"
            title="自动化数据暂不可用"
            detail={automation?.error ?? '未发现 cron 数据目录'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新自动化摘要" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '自动化摘要刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="summary-grid compact">
              <div className="summary-stat tone-good">
                <div className="summary-stat-value">{automation.enabledJobs}</div>
                <div className="summary-stat-label">启用任务</div>
              </div>
              <div className="summary-stat tone-good">
                <div className="summary-stat-value">{automation.healthyJobs}</div>
                <div className="summary-stat-label">健康</div>
              </div>
              <div className="summary-stat tone-warn">
                <div className="summary-stat-value">{automation.warningJobs}</div>
                <div className="summary-stat-label">待关注</div>
              </div>
              <div className="summary-stat tone-danger">
                <div className="summary-stat-value">{automation.failingJobs}</div>
                <div className="summary-stat-label">失败</div>
              </div>
            </div>
            <div className="summary-note">
              下一次计划执行：{automation.nextRunAt ? fmtDateTime(automation.nextRunAt) : '暂无'}。
            </div>
            <div className="automation-job-list">
              {jobs.slice(0, 4).map((job) => (
                <div key={job.id} className={`automation-job health-${job.health}`}>
                  <div className="automation-job-top">
                    <span className="automation-job-name">{job.name}</span>
                    <span className={`automation-job-health health-${job.health}`}>
                      {formatAutomationHealthLabel(job.health)}
                    </span>
                  </div>
                  <div className="automation-job-meta">
                    <span>{job.schedule ?? '未配置计划'}</span>
                    <span>最近运行 {job.lastRunAt ? fmtDateTime(job.lastRunAt) : '--'}</span>
                    <span>耗时 {fmtDuration(job.lastDurationMs)}</span>
                  </div>
                  {job.summary ? (
                    <div className="automation-job-summary" title={job.summary}>
                      {job.summary}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
