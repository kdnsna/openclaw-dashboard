import { fmtTokens, fmtCost, fmtPct } from '../lib/format';
import type { ResourceState, UsageCostData, LifetimeLedger } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';
import { UsageChart } from './UsageChart';

interface TokenUsageCardProps {
  usageCost?: UsageCostData;
  ledger?: LifetimeLedger;
  state: ResourceState;
  onRetry?: () => void;
}

export function TokenUsageCard({ usageCost, ledger, state, onRetry }: TokenUsageCardProps) {
  const t = usageCost?.totals;
  const daily = usageCost?.daily ?? [];
  const hasSnapshot = Boolean(usageCost || ledger);

  const billableWindowTotal = t?.totalTokens;
  const ledgerGrandTotal = ledger?.totalTokens;
  const totalIn = (t?.input ?? 0) + (t?.cacheRead ?? 0) + (t?.cacheWrite ?? 0);
  const cacheRate = totalIn > 0 ? ((t?.cacheRead ?? 0) / totalIn) * 100 : 0;

  return (
    <div className="card card-token">
      <div className="card-header">
        <span className="card-icon">📊</span>
        <span className="card-title">令牌概览（近 30 天）</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步令牌与账本快照"
            detail="首屏会先拉取一轮 REST 数据，再持续接入实时更新。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="令牌概览暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice
                tone="loading"
                compact
                title="正在刷新令牌与账本快照"
              />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '核心指标刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="metrics-row">
              <div className="metric">
                <div className="metric-value">{fmtTokens(billableWindowTotal)}</div>
                <div className="metric-label">近 30 天总量</div>
              </div>
              <div className="metric">
                <div className="metric-value accent-green">{fmtCost(t?.totalCost)}</div>
                <div className="metric-label">近 30 天成本</div>
              </div>
              <div className="metric">
                <div className="metric-value accent-cyan">{fmtPct(t ? cacheRate : undefined)}</div>
                <div className="metric-label">缓存命中率</div>
              </div>
              <div className="metric">
                <div className="metric-value accent-purple">{fmtTokens(t?.output)}</div>
                <div className="metric-label">近 30 天输出</div>
              </div>
            </div>
            <div className="chart-container">
              <UsageChart daily={daily} />
            </div>
            <div className="mini-ledger">
              <div className="mini-ledger-title">累计账本</div>
              <div className="mini-ledger-grid">
                <div className="mini-ledger-item">
                  <span className="mini-ledger-key">累计成本</span>
                  <span className="mini-ledger-value accent-green">{fmtCost(ledger?.totalCost)}</span>
                </div>
                <div className="mini-ledger-item">
                  <span className="mini-ledger-key">累计总量（含缓存）</span>
                  <span className="mini-ledger-value accent-purple">{fmtTokens(ledgerGrandTotal)}</span>
                </div>
                <div className="mini-ledger-item">
                  <span className="mini-ledger-key">累计输入输出</span>
                  <span className="mini-ledger-value">{fmtTokens((ledger?.inputTokens ?? 0) + (ledger?.outputTokens ?? 0))}</span>
                </div>
                <div className="mini-ledger-item">
                  <span className="mini-ledger-key">累计缓存读取</span>
                  <span className="mini-ledger-value accent-cyan">{fmtTokens(ledger?.cacheReadTokens)}</span>
                </div>
                <div className="mini-ledger-item">
                  <span className="mini-ledger-key">会话数</span>
                  <span className="mini-ledger-value">{ledger?.sessionCount ?? '--'}</span>
                </div>
                <div className="mini-ledger-item">
                  <span className="mini-ledger-key">累计天数</span>
                  <span className="mini-ledger-value">{ledger?.activeDays ?? '--'} 天</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
