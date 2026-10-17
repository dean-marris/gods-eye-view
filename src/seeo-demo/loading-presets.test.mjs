import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLoadingPresets } from './loading-presets.js';
import { compareLoading } from './loading.js';

test('equal then proposed restores the proposed schedule without changing demand or trial window', () => {
  const form = {elements: {staging: {value: '12'}, checker: {value: '4'}, order: {value: '24'}, window: {value: '600'}}};
  const equal = new EventTarget(), proposed = new EventTarget();
  let comparison, runs = 0;
  const rerun = () => {
    runs++;
    const e = form.elements;
    comparison = compareLoading({order: +e.order.value, window: +e.window.value, proposal: {staging: +e.staging.value, checker: +e.checker.value}});
  };
  registerLoadingPresets({form, equal, proposed, rerun});
  for (let i = 0; i < 2; i++) {
    equal.dispatchEvent(new Event('click'));
    assert.equal(comparison.baseline.metrics.completionTime, comparison.proposal.metrics.completionTime);
    proposed.dispatchEvent(new Event('click'));
    assert.equal(form.elements.staging.value, '12');
    assert.equal(form.elements.checker.value, '4');
    assert.ok(comparison.proposal.metrics.completionTime < comparison.baseline.metrics.completionTime);
  }
  assert.equal(runs, 4);
  assert.equal(form.elements.order.value, '24');
  assert.equal(form.elements.window.value, '600');
});
