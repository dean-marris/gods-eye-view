import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dispatchGeometry, simulateDispatch } from './dispatch.js';

test('dispatch UI defaults to bypass and shares engine geometry in both renderers', () => {
  const html = readFileSync(new URL('../../dispatch-comparison.html', import.meta.url), 'utf8');
  assert.match(html, /value="bypass" selected/);
  for (const file of ['dispatch-main.js', 'dispatch-scene.js']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /run\.geometry/);
  }
  for (const mode of ['bypass', 'crossing']) {
    const geometry = dispatchGeometry({routeMode: mode});
    for (const [x,y] of geometry.personPath) {
      assert.ok(x >= geometry.bounds.x && x <= geometry.bounds.x + geometry.bounds.width);
      assert.ok(y >= geometry.bounds.y && y <= geometry.bounds.y + geometry.bounds.height);
    }
  }
});

test('moving 3D shapes use dynamic Cesium pose properties, avoiding constant-geometry rebuilds', () => {
  const source = readFileSync(new URL('dispatch-scene.js', import.meta.url), 'utf8');
  assert.match(source, /CallbackPositionProperty/);
  assert.match(source, /CallbackProperty/);
  assert.doesNotMatch(source, /p\.body\.position = point/);
  const run = simulateDispatch({config: {routeMode: 'bypass'}});
  assert.ok(run.frames.some(f => f.actors.some(a => a.speed > 0)));
});

test('bypass speed control resets to baseline before disabling, and legacy mode re-enables it', () => {
  const source = readFileSync(new URL('dispatch-main.js', import.meta.url), 'utf8');
  assert.match(source, /if \(bypass\) speed\.value = String\(BASELINE\.speed\)/);
  assert.match(source, /speed\.disabled = bypass/);
  assert.match(source, /speed: \+\$\("settings"\)\.elements\.speed\.value/);
});
