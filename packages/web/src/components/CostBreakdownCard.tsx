import { fmtCost } from '../lib/format';
import type { ResourceState, UsageTotals } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface CostBreakdownCardProps {
  totals?: UsageTotals;
  state: ResourceState;
  onRetry?: () => void;
}

const COST_ITEMS = [
  { label: '缓存写入', key: 'cacheWriteCost' as const, color: '#8493ff' },
  { label: '缓存读取', key: 'cacheReadCost' as const, color: '#72d0c8' },
  { label: '输出', key: 'outputCost' as const, color: '#7ed9a4' },
  { label: '输入', key: 'inputCost' as const, color: '#d8b56f' },
];

export function CostBreakdownCard({ totals, state, onRetry }: CostBreakdownCardProps) {
  const items = COST_ITEMS.map((item) => ({
    ...item,
    value: totals?.[item.key] ?? 0,
  }));
  const max = Math.max(...items.map((i) => i.value), 0.01);
  const hasSnapshot = Boolean(totals);

  return (
    <div className="card card-cost">
      <div className="card-header">
        <span className="card-icon">💰</span>
        <span className="card-title">成本构成（人民币）</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步成本构成"
            detail="输入、输出与缓存成本会跟随核心指标快照一起更新。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="成本构成暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新成本构成" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '成本构成刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="cost-bars">
              {items.map((item) => (
                <div className="cost-bar-item" key={item.key}>
                  <div className="cost-bar-header">
                    <span>{item.label}</span>
                    <span>{fmtCost(item.value)}</span>
                  </div>
                  <div className="cost-bar-track">
                    <div
                      className="cost-bar-fill"
                      style={{
                        width: `${((item.value / max) * 100).toFixed(1)}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
