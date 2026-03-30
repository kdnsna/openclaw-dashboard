import { fmtCost, fmtTokens } from '../lib/format';
import type { LifetimeLedger, ResourceState } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface LifetimeLedgerCardProps {
  ledger?: LifetimeLedger;
  state: ResourceState;
  onRetry?: () => void;
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '--';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LifetimeLedgerCard({ ledger, state, onRetry }: LifetimeLedgerCardProps) {
  const hasSnapshot = Boolean(ledger);

  return (
    <div className="card card-lifetime-ledger">
      <div className="card-header">
        <span className="card-icon">🧾</span>
        <span className="card-title">长期账本</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步长期账本"
            detail="累计成本、会话数与活跃天数会在核心指标快照里返回。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="长期账本暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新长期账本" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '长期账本刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-value">{fmtTokens(ledger?.inputTokens)}</div>
                <div className="stat-label">输入量</div>
              </div>
              <div className="stat">
                <div className="stat-value accent-cyan">{fmtTokens(ledger?.outputTokens)}</div>
                <div className="stat-label">输出量</div>
              </div>
              <div className="stat">
                <div className="stat-value accent-purple">{fmtTokens(ledger?.totalTokens)}</div>
                <div className="stat-label">令牌总量</div>
              </div>
              <div className="stat">
                <div className="stat-value accent-green">{fmtCost(ledger?.totalCost)}</div>
                <div className="stat-label">总花费</div>
              </div>
            </div>

            <div className="ledger-list">
              <div className="ledger-row">
                <span className="ledger-key">缓存读取</span>
                <span className="ledger-value accent-yellow">{fmtTokens(ledger?.cacheReadTokens)}</span>
              </div>
              <div className="ledger-row">
                <span className="ledger-key">会话数量</span>
                <span className="ledger-value">{ledger?.sessionCount ?? '--'}</span>
              </div>
              <div className="ledger-row">
                <span className="ledger-key">助手回合</span>
                <span className="ledger-value">{ledger?.assistantTurns ?? '--'}</span>
              </div>
              <div className="ledger-row">
                <span className="ledger-key">累计天数</span>
                <span className="ledger-value">{ledger?.activeDays ?? '--'} 天</span>
              </div>
              <div className="ledger-row">
                <span className="ledger-key">起始时间</span>
                <span className="ledger-value">{fmtDateTime(ledger?.firstSeenAt)}</span>
              </div>
              <div className="ledger-row">
                <span className="ledger-key">最后更新</span>
                <span className="ledger-value">{fmtDateTime(ledger?.lastSeenAt)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
