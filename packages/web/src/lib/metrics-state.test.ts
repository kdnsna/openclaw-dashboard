import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialMetricsRuntimeState,
  getDashboardBootState,
  getDashboardWsStatus,
  reduceMetricsRuntimeState,
  type MetricsRuntimeAction,
} from './metrics-state.js';

function applyActions(actions: MetricsRuntimeAction[]) {
  return actions.reduce(reduceMetricsRuntimeState, createInitialMetricsRuntimeState());
}

test('initial metrics runtime stays in booting mode while websocket is still connecting', () => {
  const state = createInitialMetricsRuntimeState();

  assert.equal(getDashboardBootState(state), 'booting');
  assert.equal(getDashboardWsStatus(state), 'connecting');
});

test('bootstrap becomes degraded when at least one resource fails but a partial snapshot is available', () => {
  const state = applyActions([
    { type: 'resource_succeeded', resource: 'metrics', updatedAt: 1 },
    { type: 'resource_succeeded', resource: 'taskFlow', updatedAt: 2 },
    { type: 'resource_failed', resource: 'acpWorkflow', error: 'gateway timeout' },
    { type: 'resource_succeeded', resource: 'taskEvents', updatedAt: 3 },
    { type: 'bootstrap_finished' },
    { type: 'ws_offline' },
  ]);

  assert.equal(getDashboardBootState(state), 'degraded');
  assert.equal(getDashboardWsStatus(state), 'connecting');
});

test('dashboard is only marked offline after bootstrap finishes and no resource snapshot is available', () => {
  const state = applyActions([
    { type: 'resource_failed', resource: 'metrics', error: 'ECONNREFUSED' },
    { type: 'resource_failed', resource: 'acpWorkflow', error: 'ECONNREFUSED' },
    { type: 'resource_failed', resource: 'taskFlow', error: 'ECONNREFUSED' },
    { type: 'resource_failed', resource: 'taskEvents', error: 'ECONNREFUSED' },
    { type: 'bootstrap_finished' },
    { type: 'ws_offline' },
  ]);

  assert.equal(getDashboardBootState(state), 'degraded');
  assert.equal(getDashboardWsStatus(state), 'offline');
});

test('resource recovery moves the dashboard back to ready once every resource has recovered', () => {
  const state = applyActions([
    { type: 'resource_succeeded', resource: 'metrics', updatedAt: 1 },
    { type: 'resource_succeeded', resource: 'acpWorkflow', updatedAt: 2 },
    { type: 'resource_succeeded', resource: 'taskFlow', updatedAt: 3 },
    { type: 'resource_failed', resource: 'taskEvents', error: 'temporary timeout' },
    { type: 'bootstrap_finished' },
    { type: 'resource_succeeded', resource: 'taskEvents', updatedAt: 4 },
    { type: 'ws_live' },
  ]);

  assert.equal(getDashboardBootState(state), 'ready');
  assert.equal(getDashboardWsStatus(state), 'live');
});

test('manual retry returns the resource to loading while preserving the last successful snapshot time', () => {
  const state = applyActions([
    { type: 'resource_succeeded', resource: 'taskFlow', updatedAt: 42 },
    { type: 'resource_loading', resource: 'taskFlow' },
  ]);

  assert.equal(state.resources.taskFlow.status, 'loading');
  assert.equal(state.resources.taskFlow.updatedAt, 42);
  assert.equal(state.resources.taskFlow.error, null);
});
