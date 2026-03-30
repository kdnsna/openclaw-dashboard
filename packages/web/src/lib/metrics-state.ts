import type {
  DashboardBootState,
  DashboardResourceKey,
  ResourceState,
  ResourceStates,
} from './types.js';
import type { WsStatus } from '../hooks/useMetrics.js';

export type MetricsRuntimeAction =
  | { type: 'bootstrap_started' }
  | { type: 'bootstrap_finished' }
  | { type: 'resource_loading'; resource: DashboardResourceKey }
  | { type: 'resource_succeeded'; resource: DashboardResourceKey; updatedAt: number }
  | { type: 'resource_failed'; resource: DashboardResourceKey; error: string }
  | { type: 'ws_connecting' }
  | { type: 'ws_live' }
  | { type: 'ws_offline' };

export interface MetricsRuntimeState {
  bootstrapComplete: boolean;
  resources: ResourceStates;
  wsPhase: 'idle' | 'connecting' | 'live' | 'offline';
}

export function createInitialResourceStates(): ResourceStates {
  return {
    metrics: createLoadingState(),
    acpWorkflow: createLoadingState(),
    taskFlow: createLoadingState(),
    taskEvents: createLoadingState(),
  };
}

export function createInitialMetricsRuntimeState(): MetricsRuntimeState {
  return {
    bootstrapComplete: false,
    resources: createInitialResourceStates(),
    wsPhase: 'idle',
  };
}

export function reduceMetricsRuntimeState(
  state: MetricsRuntimeState,
  action: MetricsRuntimeAction,
): MetricsRuntimeState {
  switch (action.type) {
    case 'bootstrap_started':
      return {
        ...state,
        bootstrapComplete: false,
      };
    case 'bootstrap_finished':
      return {
        ...state,
        bootstrapComplete: true,
      };
    case 'resource_loading':
      return {
        ...state,
        resources: {
          ...state.resources,
          [action.resource]: {
            status: 'loading',
            error: null,
            updatedAt: state.resources[action.resource].updatedAt,
          },
        },
      };
    case 'resource_succeeded':
      return {
        ...state,
        resources: {
          ...state.resources,
          [action.resource]: {
            status: 'ready',
            error: null,
            updatedAt: action.updatedAt,
          },
        },
      };
    case 'resource_failed':
      return {
        ...state,
        resources: {
          ...state.resources,
          [action.resource]: {
            status: 'error',
            error: action.error,
            updatedAt: state.resources[action.resource].updatedAt,
          },
        },
      };
    case 'ws_connecting':
      return {
        ...state,
        wsPhase: 'connecting',
      };
    case 'ws_live':
      return {
        ...state,
        wsPhase: 'live',
      };
    case 'ws_offline':
      return {
        ...state,
        wsPhase: 'offline',
      };
    default:
      return state;
  }
}

export function getDashboardBootState(state: MetricsRuntimeState): DashboardBootState {
  if (!state.bootstrapComplete) return 'booting';
  return Object.values(state.resources).some((resource) => resource.status === 'error') ? 'degraded' : 'ready';
}

export function getDashboardWsStatus(state: MetricsRuntimeState): WsStatus {
  if (state.wsPhase === 'live') return 'live';
  if (!state.bootstrapComplete) return 'connecting';
  const hasReadySnapshot = Object.values(state.resources).some((resource) => resource.status === 'ready');
  return hasReadySnapshot ? 'connecting' : 'offline';
}

function createLoadingState(): ResourceState {
  return {
    status: 'loading',
    error: null,
    updatedAt: null,
  };
}
