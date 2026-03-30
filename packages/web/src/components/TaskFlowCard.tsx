import { timeAgo } from '../lib/format';
import { formatTaskFlowStageLabel } from '../lib/task-flow-display';
import type { ResourceState, TaskFlowItem } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface TaskFlowCardProps {
  tasks: TaskFlowItem[];
  state: ResourceState;
  onRetry?: () => void;
}

export function TaskFlowCard({ tasks, state, onRetry }: TaskFlowCardProps) {
  const attentionTasks = tasks.filter((task) => task.riskLevel !== 'low' || task.status === 'blocked');
  const hasSnapshot = state.updatedAt != null || state.status === 'ready' || tasks.length > 0;

  return (
    <div className="card card-task-flow">
      <div className="card-header">
        <span className="card-icon">🧭</span>
        <span className="card-title">重点任务</span>
        <span className="badge">{tasks.length} 项</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步任务流"
            detail="重点任务、阶段和当前卡点会在首轮任务快照返回后补齐。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="任务流暂不可用"
            detail={state.error ?? '任务流请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新任务流" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '任务流刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="task-flow-list">
              {tasks.length === 0 ? (
                <div className="empty">暂无任务流数据</div>
              ) : (
                tasks.slice(0, 6).map((task) => <TaskFlowRow key={task.taskId} task={task} />)
              )}
            </div>
            <div className="task-flow-attention">
              <div className="task-flow-attention-title">需要关注</div>
              {attentionTasks.length === 0 ? (
                <div className="task-flow-attention-empty">当前没有高风险任务</div>
              ) : (
                attentionTasks.slice(0, 3).map((task) => (
                  <div key={task.taskId} className="task-flow-attention-item">
                    <div className="task-flow-attention-name">{task.title}</div>
                    <div className="task-flow-attention-meta">
                      {labelForStatus(task.status)} · {labelForRisk(task.riskLevel)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TaskFlowRow({ task }: { task: TaskFlowItem }) {
  const updatedAgo = task.updatedAt ? timeAgo(Date.now() - new Date(task.updatedAt).getTime()) : '未知';

  return (
    <div className={`task-flow-item task-flow-${task.riskLevel}`}>
      <div className="task-flow-head">
        <div className="task-flow-title" title={task.title}>
          {task.title}
        </div>
        <div className="task-flow-badges">
          <span className="task-pill">{labelForStatus(task.status)}</span>
          <span className="task-pill task-pill-stage" title={task.stage}>
            {formatTaskFlowStageLabel(task.stage)}
          </span>
        </div>
      </div>
      {task.currentBlocker && (
        <div className="task-flow-blocker" title={task.currentBlocker}>
          卡点：{task.currentBlocker}
        </div>
      )}
      {task.nextStep && (
        <div className="task-flow-next" title={task.nextStep}>
          下一步：{task.nextStep}
        </div>
      )}
      <div className="task-flow-meta">
        <span>{labelForPriority(task.priority)}</span>
        <span>最近更新 {updatedAgo}</span>
      </div>
    </div>
  );
}

function labelForStatus(status: TaskFlowItem['status']): string {
  switch (status) {
    case 'not_started':
      return '未开始';
    case 'blocked':
      return '阻塞';
    case 'waiting_confirmation':
      return '待确认';
    case 'completed':
      return '已完成';
    case 'paused':
      return '已暂停';
    default:
      return '进行中';
  }
}

function labelForPriority(priority: TaskFlowItem['priority']): string {
  switch (priority) {
    case 'low':
      return '低优先级';
    case 'medium':
      return '中优先级';
    default:
      return '高优先级';
  }
}

function labelForRisk(risk: TaskFlowItem['riskLevel']): string {
  switch (risk) {
    case 'high':
      return '高风险';
    case 'medium':
      return '中风险';
    default:
      return '低风险';
  }
}
