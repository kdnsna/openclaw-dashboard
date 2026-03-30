import { fmtTokens, fmtCost } from '../lib/format';
import type { ResourceState, UsageCostData } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface TodayCardProps {
  usageCost?: UsageCostData;
  hourlyActivity?: number[];
  state: ResourceState;
  onRetry?: () => void;
}

export function TodayCard({ usageCost, hourlyActivity, state, onRetry }: TodayCardProps) {
  const daily = usageCost?.daily ?? [];
  const today = daily.length ? daily[daily.length - 1] : null;
  const hasSnapshot = Boolean(usageCost || hourlyActivity);

  const hourly = hourlyActivity ?? new Array(24).fill(0);
  const maxH = Math.max(...hourly, 1);
  const now = new Date().getHours();

  return (
    <div className="card card-today">
      <div className="card-header">
        <span className="card-icon">⚡</span>
        <span className="card-title">今日概览</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步今日用量"
            detail="今日摘要和活跃热力会在首轮快照返回后立即填充。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="今日概览暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新今日摘要" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '今日指标刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-value">{fmtTokens(today?.totalTokens)}</div>
                <div className="stat-label">令牌总量</div>
              </div>
              <div className="stat">
                <div className="stat-value accent-green">{fmtCost(today?.totalCost)}</div>
                <div className="stat-label">成本</div>
              </div>
              <div className="stat">
                <div className="stat-value accent-cyan">{fmtTokens(today?.output)}</div>
                <div className="stat-label">输出量</div>
              </div>
              <div className="stat">
                <div className="stat-value accent-yellow">{fmtTokens(today?.cacheRead)}</div>
                <div className="stat-label">缓存读取</div>
              </div>
            </div>
            <div className="hourly-heat">
              <div className="hourly-label">今日活跃时段</div>
              <div className="hourly-bars">
                {hourly.map((v, i) => {
                  const pct = (v / maxH) * 100;
                  const opacity = v > 0 ? 0.4 + 0.6 * (v / maxH) : 0.15;
                  return (
                    <div
                      key={i}
                      className={`hbar${i === now ? ' hbar-now' : ''}`}
                      style={{ height: `${Math.max(pct, 4)}%`, opacity }}
                      title={`${i}:00 · ${v} 次活动`}
                    />
                  );
                })}
              </div>
              <div className="hourly-labels">
                <span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
