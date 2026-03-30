import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTaskFlowStageLabel } from './task-flow-display.js';

test('formatTaskFlowStageLabel maps known internal stage slugs to product-friendly Chinese labels', () => {
  assert.equal(formatTaskFlowStageLabel('drafting-schema'), '拟结构');
  assert.equal(formatTaskFlowStageLabel('verifying-write-path'), '验证链路');
  assert.equal(formatTaskFlowStageLabel('stabilizing-rule'), '稳规则');
  assert.equal(formatTaskFlowStageLabel('in_progress'), '推进中');
});

test('formatTaskFlowStageLabel falls back to the original stage for unknown values', () => {
  assert.equal(formatTaskFlowStageLabel('custom-stage'), 'custom-stage');
});
