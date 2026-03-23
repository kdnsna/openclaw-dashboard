import { fmtTime, formatActivityLabel } from '../lib/format';
import type { ActivityItem } from '../lib/types';

interface ActivityCardProps {
  recent: ActivityItem[];
}

export function ActivityCard({ recent }: ActivityCardProps) {
  return (
    <div className="card card-activity">
      <div className="card-header">
        <span className="card-icon">⚡</span>
        <span className="card-title">实时动态</span>
        <span className="badge pulse">{recent.length}</span>
      </div>
      <div className="card-body">
        <div className="activity-feed">
          {recent.length === 0 ? (
            <div className="empty">等待新的动态…</div>
          ) : (
            recent.map((a) => <ActivityRow key={a.seq} activity={a} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ activity: a }: { activity: ActivityItem }) {
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
      <span className="activity-text">{a.text || a.tool || formatActivityLabel(a.type)}</span>
    </div>
  );
}
