import type { DashboardResourceKey, ResourceStates } from './types.js';

const RESOURCE_LABELS: Record<DashboardResourceKey, string> = {
  metrics: '核心指标',
  acpWorkflow: 'ACP 工作流',
  taskFlow: '任务流',
  taskEvents: '任务事件',
};

export function formatResourceLabel(resource: DashboardResourceKey): string {
  return RESOURCE_LABELS[resource];
}

export function listUnavailableResources(resourceStates: ResourceStates): string[] {
  return (Object.entries(resourceStates) as Array<[DashboardResourceKey, ResourceStates[DashboardResourceKey]]>)
    .filter(([, state]) => state.status === 'error')
    .map(([resource]) => formatResourceLabel(resource));
}
