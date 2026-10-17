import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDispatch, signedSaving, countForkliftLoads } from './dispatchSummary.js';
const actor = (id, kind, distance, status = 'active', waiting = 0) => ({id, kind, distance, status, waiting});
test('walking distance and moving time count people independently of forklift travel and retain unfinished work', () => {
  const summary = summarizeDispatch({jobs: [{}, {}, {}], duration: 10, frames: [
    {time: 0, actors: [actor('P','person',0), actor('F','vehicle',0), actor('Q','person',0,'pending')]},
    {time: 2, actors: [actor('P','person',3), actor('F','vehicle',6), actor('Q','person',0,'pending')]},
    {time: 5, actors: [actor('P','person',3,'complete'), actor('F','vehicle',6,'active',3), actor('Q','person',0,'pending')]},
  ]});
  assert.deepEqual(summary, {personDistance: 3, personMovingSeconds: 2, vehicleDistance: 6, vehicleMovingSeconds: 2, vehicleWaiting: 3, completed: 1, unfinished: 2, total: 3, window: 10, completionSeconds: null});
});
test('lower walking or waiting reports a positive saving', () => {
  assert.deepEqual(signedSaving(12, 7), {value: 5, label: 'saved'});
});
test('longer walking or waiting reports added cost with a negative saving', () => {
  assert.deepEqual(signedSaving(7, 12), {value: -5, label: 'added'});
});
test('identical trials report unchanged without a signed negative zero', () => {
  assert.deepEqual(signedSaving(12, 12), {value: 0, label: 'unchanged'});
});
test('elapsed completion is available only when all original jobs finish', () => {
  const summary = summarizeDispatch({jobs: [{}], duration: 10, frames: [
    {time: 0, actors: [actor('P','person',0)]},
    {time: 4, actors: [actor('P','person',5,'complete')]},
    {time: 10, actors: [actor('P','person',5,'complete')]},
  ]});
  assert.equal(summary.completionSeconds, 4);
  assert.equal(summary.personMovingSeconds, 4);
});

test('simulated load milestones exclude people, queued and future forklifts', () => {
  assert.deepEqual(countForkliftLoads({actors: [
    actor('P','person',16,'complete'), actor('Q','vehicle',0,'queued'),
    actor('F','vehicle',0,'pending'), actor('A','vehicle',9,'active'),
    actor('D','vehicle',48,'complete'),
  ]}), {picked: 2, delivered: 1, remaining: 3});
});
