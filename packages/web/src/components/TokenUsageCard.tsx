import { fmtTokens, fmtCost, fmtPct } from '../lib/format';
import { UsageChart } from './UsageChart';
import type { UsageCostData, LifetimeLedger } from '../lib/types';

interface TokenUsageCardProps {
  usageCost?: UsageCostData;
  ledger?: LifetimeLedger;
}

export function TokenUsageCard({ usageCost, ledger }: TokenUsageCardProps) {
  const t = usageCost?.totals;
  const daily = usageCost?.daily ?? [];

  const billableWindowTotal = t?.totalTokens;
  const ledgerGrandTotal = ledger?.totalTokens;
  const totalIn = (t?.input ?? 0) + (t?.cacheRead ?? 0) + (t?.cacheWrite ?? 0);
  const cacheRate = totalIn > 0 ? ((t?.cacheRead ?? 0) / totalIn) * 100 : 0;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">📊</span>
        <span className="card-title">TOKEN 用量（近 30 天 / 账单口径）</span>
      </div>
      <div className="card-body">
        <div className="metrics-row">
          <div className="metric">
            <div className="metric-value">{fmtTokens(billableWindowTotal)}</div>
            <div className="metric-label">30天总量（含缓存）</div>
          </div>
          <div className="metric">
            <div className="metric-value accent-green">{fmtCost(t?.totalCost)}</div>
            <div className="metric-label">30天成本</div>
          </div>
          <div className="metric">
            <div className="metric-value accent-cyan">{fmtPct(t ? cacheRate : undefined)}</div>
            <div className="metric-label">缓存命中</div>
          </div>
          <div className="metric">
            <div className="metric-value accent-purple">{fmtTokens(t?.output)}</div>
            <div className="metric-label">30天输出</div>
          </div>
        </div>
        <div className="chart-container">
          <UsageChart daily={daily} />
        </div>
        <div className="mini-ledger">
          <div className="mini-ledger-title">累计账本（全历史）</div>
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
      </div>
    </div>
  );
}
