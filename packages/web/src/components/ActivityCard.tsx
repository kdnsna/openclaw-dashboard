import { fmtTime, formatActivityLabel } from '../lib/format';
import type { ActivityItem, ResourceState } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface ActivityCardProps {
  recent: ActivityItem[];
  state: ResourceState;
  onRetry?: () => void;
}

export function ActivityCard({ recent, state, onRetry }: ActivityCardProps) {
  const hasSnapshot = state.updatedAt != null || state.status === 'ready' || recent.length > 0;

  return (
    <div className="card card-activity">
      <div className="card-header">
        <span className="card-icon">⚡</span>
        <span className="card-title">实时动态</span>
        <span className="badge pulse">{recent.length}</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步实时动态"
            detail="会话消息、工具调用和近期活动会在首轮快照后填充。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="实时动态暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新实时动态" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '实时动态刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="activity-feed">
              {recent.length === 0 ? (
                <div className="empty">等待新的动态…</div>
              ) : (
                recent.map((activity) => <ActivityRow key={activity.seq} activity={activity} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity: a }: { activity: ActivityItem }) {
  const text = a.text || a.tool || formatActivityLabel(a.type);
  const typeClass =
    a.type === 'tool_call'
      ? 'activity-tool'
      : a.type === 'user_message'
        ? 'activity-user'
        : 'activity-assistant';

  return (
    <div className={`activity-item ${typeClass}`} data-ts={a.ts}>
      <span className="activity-icon">{a.icon || '📌'}</span>
      <span className="activity-time">{fmtTime(a.ts)}</span>
      <span className="activity-text" title={text}>
        {text}
      </span>
    </div>
  );
}
