const TASK_FLOW_STAGE_LABELS: Record<string, string> = {
  'drafting-schema': '拟结构',
  'verifying-write-path': '验证链路',
  'stabilizing-rule': '稳规则',
  drafting: '拟方案',
  verifying: '验证中',
  in_progress: '推进中',
};

export function formatTaskFlowStageLabel(stage: string): string {
  return TASK_FLOW_STAGE_LABELS[stage] ?? stage;
}
