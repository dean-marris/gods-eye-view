import test from 'node:test';
import assert from 'node:assert/strict';
import { fusionSources, fusionNetworks, fusionHub, fusionSnapshot, fusionPathPoint, fusionFrame, resolveFusionPick } from './fusion.js';
import { cameras } from './data.js';
test('representative fusion streams share camera availability and respect unavailable monitoring', () => {
 assert.equal(fusionSources.length, 10);
 assert.equal(new Set(fusionSources.map(s=>s.id)).size,10);
 assert.ok(fusionSources.every(s=>/^[A-Z0-9-]+$/.test(s.id)&&fusionNetworks.some(n=>n.id===s.network)));
 for(const camera of cameras) assert.equal(fusionSources.find(s=>s.id===camera.id).available,camera.active);
 assert.equal(fusionSnapshot(0).active,9);
 assert.equal(fusionFrame(0,0).packets.some(p=>p.source==='C04'),false);
 assert.equal(fusionNetworks.length,2);
});
import { resolveFacilityHits } from './sceneInteraction.js';
test('selection resolves explicit fusion nodes without swallowing camera and coverage picks',()=>{
 assert.deepEqual(resolveFacilityHits(['fusion-flow:C05','fusion:C05','camera:C01']),{type:'fusion',id:'C05'});
 assert.deepEqual(resolveFusionPick('fusion:hub'),{type:'fusion',id:'hub'});
 assert.deepEqual(resolveFusionPick('fusion-core:hub'),{type:'fusion',id:'hub'});
 assert.deepEqual(resolveFusionPick('fusion:AP-W'),{type:'fusion',id:'AP-W'});
 assert.equal(resolveFusionPick('fusion:missing'),null);
 assert.deepEqual(resolveFacilityHits(['fusion-flow:C05','camera:C01']),{type:'camera',id:'C01',area:'crossing'});
});
test('paths pass through the assigned network hop to the central hub with bounded deterministic frames',()=>{
 assert.deepEqual(fusionPathPoint('PLC-P',0),[43,7.2,1.8]);
 assert.deepEqual(fusionPathPoint('PLC-P',.5),[24,20,6]);
 assert.deepEqual(fusionPathPoint('PLC-P',1),fusionHub.position);
 assert.throws(()=>fusionPathPoint('missing',0),RangeError);
 assert.throws(()=>fusionPathPoint('C01',Infinity),RangeError);
 assert.throws(()=>fusionPathPoint('C01',-.01),RangeError);
 assert.throws(()=>fusionPathPoint('C01',1.01),RangeError);
 assert.equal(fusionPathPoint('PLC-P',.25)[0],33.5);
 assert.ok(Math.abs(fusionPathPoint('PLC-P',.25)[1]-13.6)<1e-10);
 assert.deepEqual(fusionPathPoint('PLC-P',.75).slice(0,2),[40.5,17.5]);
 assert.throws(()=>fusionFrame(0,NaN),RangeError);
 for(const seconds of [0,1,18,40,100000]) {
  const frame=fusionFrame(28,seconds);
  assert.deepEqual(frame,fusionFrame(28,seconds));
  for(const p of frame.packets) assert.ok(p.position.every(n=>Number.isFinite(n)&&n>=0&&n<=120));
 }
 assert.notDeepEqual(fusionFrame(0,0).packets[0].position,fusionFrame(0,1).packets[0].position);
});
test('dropout removes transport and honestly makes required dock fusion incomplete, re-enable restores it',()=>{
 assert.equal(fusionSnapshot(28).complete,true);
 assert.deepEqual(fusionSnapshot(28).contributions.map(c=>c.type),['camera','plc','sensor']);
 assert.equal(fusionSnapshot(40).context,'Truck docked + door open + bay occupied');
 assert.equal(fusionSnapshot(0).context,'Truck positioning + door closed + bay clear');
 assert.equal(fusionSnapshot(28).context,'Truck reversing + door open + bay occupied');
 const frame=fusionFrame(28,2,['C05','C04']);
 assert.equal(frame.active,8); assert.equal(frame.excluded,1);
 assert.equal(frame.complete,false); assert.deepEqual(frame.missing,['C05']);
 assert.ok(frame.context.includes('C05')); assert.ok(!frame.packets.some(p=>p.source==='C05'));
 assert.equal(fusionSnapshot(28,[]).active,9);
 assert.equal(fusionSources.find(s=>s.id==='PLC-P').area,'Packing conveyor');
});
