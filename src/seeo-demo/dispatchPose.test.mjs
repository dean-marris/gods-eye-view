import test from 'node:test';
import assert from 'node:assert/strict';
import { createDispatchPose } from './dispatchPose.js';
import { simulateDispatch, getDispatchFrame } from './dispatch.js';

test('renderer pose mutates a stable property backing during movement, seeks, queued and completed frames', () => {
  const run = simulateDispatch({config: {routeMode: 'bypass'}});
  const pose = createDispatchPose();
  const stable = pose.value;
  const queuedRun = simulateDispatch({workload: [{id: 'A', kind: 'vehicle', arrival: 0}, {id: 'B', kind: 'vehicle', arrival: 0}]});
  const queued = getDispatchFrame(queuedRun, .1).actors.find(a => a.status === 'queued');
  assert.ok(queued);
  pose.update(queued);
  assert.equal(stable.visible, true);
  for (const time of [12, 58.6, 20, 0, 120]) {
    const actor = getDispatchFrame(run, time).actors.find(a => a.kind === 'person');
    pose.update(actor, 1.1, .4, .7);
    assert.equal(pose.value, stable);
    assert.equal(stable.visible, ['active', 'queued'].includes(actor.status));
    assert.ok(Math.abs(stable.x - (actor.x + Math.cos(actor.heading)*1.1 - Math.sin(actor.heading)*.4)) < 1e-9);
    assert.ok(Math.abs(stable.y - (actor.y + Math.sin(actor.heading)*1.1 + Math.cos(actor.heading)*.4)) < 1e-9);
    assert.equal(stable.heading, -actor.heading);
    assert.equal(stable.z, .7);
  }
});
