import test from 'node:test';
import assert from 'node:assert/strict';
import { getHeaderCollapseProgress, resolveHeaderCollapsed } from './headerCollapseState.js';

test('keeps header expanded below enter threshold', () => {
  assert.equal(resolveHeaderCollapsed(24, false, { enterThreshold: 40, exitThreshold: 12 }), false);
});

test('collapses after the enter threshold', () => {
  assert.equal(resolveHeaderCollapsed(48, false, { enterThreshold: 40, exitThreshold: 12 }), true);
});

test('uses hysteresis while scroll position is between enter and exit thresholds', () => {
  assert.equal(resolveHeaderCollapsed(20, true, { enterThreshold: 40, exitThreshold: 12 }), true);
  assert.equal(resolveHeaderCollapsed(10, true, { enterThreshold: 40, exitThreshold: 12 }), false);
});

test('clamps collapse progress to the 0-1 range', () => {
  assert.equal(getHeaderCollapseProgress(-20, 120), 0);
  assert.equal(getHeaderCollapseProgress(60, 120), 0.5);
  assert.equal(getHeaderCollapseProgress(240, 120), 1);
});
