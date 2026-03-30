import { fmtTime } from '../lib/format';
import type { ResourceState, TaskEventItem } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface TaskEventsCardProps {
  events: TaskEventItem[];
  state: ResourceState;
  onRetry?: () => void;
}

export function TaskEventsCard({ events, state, onRetry }: TaskEventsCardProps) {
  const hasSnapshot = state.updatedAt != null || state.status === 'ready' || events.length > 0;

  return (
    <div className="card card-task-events">
      <div className="card-header">
        <span className="card-icon">🪄</span>
        <span className="card-title">任务事件流</span>
        <span className="badge pulse">{events.length}</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步任务事件"
            detail="事件类型、摘要和严重级别会在首轮事件快照返回后补齐。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="任务事件暂不可用"
            detail={state.error ?? '任务事件请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新任务事件" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '任务事件刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="task-events-feed">
              {events.length === 0 ? (
                <div className="empty">暂无任务事件</div>
              ) : (
                events.slice(0, 8).map((event) => <TaskEventRow key={event.eventId} event={event} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TaskEventRow({ event }: { event: TaskEventItem }) {
  return (
    <div className={`task-event-item severity-${event.severity}`}>
      <div className="task-event-top">
        <span className="task-event-time">{fmtTime(event.time)}</span>
        <span className="task-event-type">{labelForType(event.type)}</span>
      </div>
      <div className="task-event-label">{event.label}</div>
      <div className="task-event-summary" title={event.summary}>
        {event.summary}
      </div>
      <div className="task-event-meta">{event.taskId}</div>
    </div>
  );
}

function labelForType(type: TaskEventItem['type']): string {
  switch (type) {
    case 'task_created':
      return '任务创建';
    case 'progress_update':
      return '进展更新';
    case 'blocker_detected':
      return '发现卡点';
    case 'decision_made':
      return '形成决策';
    case 'artifact_created':
      return '产出文件';
    case 'automation_linked':
      return '关联自动化';
    case 'handoff_prepared':
      return '准备交接';
    case 'task_completed':
      return '任务完成';
    default:
      return type;
  }
}
