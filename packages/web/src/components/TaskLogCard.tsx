import { fmtDuration, fmtTime, timeAgo } from '../lib/format';
import type { TaskItem } from '../lib/types';

interface TaskLogCardProps {
  tasks: TaskItem[];
}

export function TaskLogCard({ tasks }: TaskLogCardProps) {
  const activeCount = tasks.filter((task) => task.isActive).length;

  return (
    <div className="card card-tasks">
      <div className="card-header">
        <span className="card-icon">📋</span>
        <span className="card-title">任务时间线</span>
        <span className="badge">{activeCount} 运行中</span>
      </div>
      <div className="card-body">
        <div className="task-log">
          {tasks.length === 0 ? (
            <div className="empty">暂无任务记录</div>
          ) : (
            tasks.map((t) => <TaskRow key={t.sessionFile + t.startedAt} task={t} />)
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task: t }: { task: TaskItem }) {
  const now = Date.now();
  const lastActivityMs = new Date(t.lastActivityAt).getTime();
  const elapsed = now - lastActivityMs;
  const hasIssue = /\b(error|failed|timeout|timed out|rate limit|服务器|异常|失败)\b/i.test(`${t.result ?? ''} ${t.task}`);
  const isActive = t.isActive;
  const isRecent = elapsed < 2 * 3600 * 1000;

  const statusClass =
    hasIssue ? 'task-issue' : isActive ? 'task-active' : isRecent ? 'task-recent' : 'task-done';
  const statusLabel =
    hasIssue ? '需关注' : isActive ? '执行中' : isRecent ? '刚完成' : '待回看';
  const durationLabel = fmtDuration(
    isActive ? now - new Date(t.startedAt).getTime() : lastActivityMs - new Date(t.startedAt).getTime(),
  );

  return (
    <div className={`task-item ${statusClass}`}>
      <div className="task-header">
        <span className="task-time">{fmtTime(t.startedAt)}</span>
        <span className="task-title">{t.title}</span>
        <span className="task-duration">持续 {durationLabel}</span>
        {t.toolCount > 0 && <span className="task-tools">工具 {t.toolCount}</span>}
        <span className="task-status">{statusLabel}</span>
      </div>
      <div className="task-desc">{t.task}</div>
      <div className="task-meta">最近活动 {timeAgo(elapsed)} · {fmtTime(t.lastActivityAt)}</div>
      {t.result && <div className="task-result">{t.result}</div>}
    </div>
  );
}
