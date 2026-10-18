import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from 'cesium';
import { createFacilitySolids } from './facility-solids.js';
import { fusionHub, fusionProcessor } from './fusion.js';

test('fixed facility boxes build synchronously without geometry-worker tasks and retain pick IDs', () => {
  const mounted = [];
  const primitives = {add: p => (mounted.push(p), p), remove: p => {mounted.splice(mounted.indexOf(p), 1); return true;}};
  const solids = createFacilitySolids(primitives);
  solids.box('floor', C.Cartesian3.fromDegrees(0, 0), C.Quaternion.IDENTITY, new C.Cartesian3(84,54,.5), C.Color.WHITE);
  solids.commit();
  assert.equal(mounted.length, 2);
  for (const primitive of mounted) {
    assert.equal(primitive.asynchronous, false);
    assert.equal(primitive.geometryInstances[0].id.id, 'floor');
  }
  const geometry = C.BoxGeometry.createGeometry(mounted[0].geometryInstances[0].geometry);
  assert.ok(geometry.attributes.position.values.length > 0);
  solids.clear();
  assert.equal(mounted.length, 0, 'full layout rebuild releases only its owned primitives');
});

test('hub and Fusion sit in the logical margin outside the warehouse and truck yard', () => {
  for(const node of [fusionHub,fusionProcessor]) assert.ok(node.position[1] <= -10, `${node.id} must not cover facility work areas`);
  assert.ok(fusionProcessor.position[0] - fusionHub.position[0] >= 26, 'central cards have separate label space');
});
