import test from 'node:test';
import assert from 'node:assert/strict';
import { fusionSources, fusionNetworks, fusionHub, fusionProcessor, fusionSnapshot, fusionPathPoint, fusionFrame, resolveFusionPick, fusionGraph } from './fusion.js';
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
 assert.deepEqual(resolveFusionPick('fusion:fusion'),{type:'fusion',id:'fusion'});
 assert.deepEqual(resolveFusionPick('fusion-core:fusion'),{type:'fusion',id:'fusion'});
 assert.deepEqual(resolveFacilityHits(['fusion-packet:hub-fusion-0','fusion-core:fusion']),{type:'fusion',id:'fusion'});
 assert.deepEqual(resolveFusionPick('fusion-core:hub'),{type:'fusion',id:'hub'});
 assert.deepEqual(resolveFusionPick('fusion:AP-W'),{type:'fusion',id:'AP-W'});
 assert.equal(resolveFusionPick('fusion:missing'),null);
 assert.deepEqual(resolveFacilityHits(['fusion-flow:C05','camera:C01']),{type:'camera',id:'C01',area:'crossing'});
 assert.deepEqual(resolveFacilityHits(['fusion-glow:hub','fusion-direction:hub-fusion','camera:C01']),{type:'camera',id:'C01',area:'crossing'});
});
test('direct logical paths reach seeoHub without routing through an AP, with bounded deterministic frames',()=>{
 assert.deepEqual(fusionPathPoint('PLC-P',0),[43,7.2,1.8]);
 assert.deepEqual(fusionPathPoint('PLC-P',.5).slice(0,2),[36.5,-4.3999999999999995]);
 assert.deepEqual(fusionPathPoint('PLC-P',1),fusionHub.position);
 assert.throws(()=>fusionPathPoint('missing',0),RangeError);
 assert.throws(()=>fusionPathPoint('C01',Infinity),RangeError);
 assert.throws(()=>fusionPathPoint('C01',-.01),RangeError);
 assert.throws(()=>fusionPathPoint('C01',1.01),RangeError);
 assert.equal(fusionPathPoint('PLC-P',.25)[0],39.75);
 assert.ok(Math.abs(fusionPathPoint('PLC-P',.25)[1]-1.4)<1e-10);
 assert.deepEqual(fusionPathPoint('PLC-P',.75).slice(0,2),[33.25,-10.2]);
 assert.throws(()=>fusionFrame(0,NaN),RangeError);
 for(const seconds of [0,1,18,40,100000]) {
  const frame=fusionFrame(28,seconds);
  assert.deepEqual(frame,fusionFrame(28,seconds));
  for(const p of frame.packets) assert.ok(p.position.every(n=>Number.isFinite(n)&&n>=-26&&n<=120));
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

test('logical topology sends devices and Wi-Fi into seeoHub then a distinct Fusion node',()=>{
 const graph=fusionGraph();
 assert.equal(graph.nodes.find(n=>n.id==='hub').name,'seeoHub');
 assert.equal(graph.nodes.find(n=>n.id==='fusion').name,'seeo Fusion');
 assert.notDeepEqual(graph.nodes.find(n=>n.id==='hub').position,graph.nodes.find(n=>n.id==='fusion').position);
 assert.deepEqual(graph.links.filter(l=>l.kind==='output').map(l=>[l.source,l.target]),[['hub','fusion']]);
 assert.deepEqual(graph.links.filter(l=>l.kind==='network').map(l=>[l.source,l.target]),[['AP-W','hub'],['AP-E','hub']]);
 assert.equal(graph.links.filter(l=>l.kind==='source').length,9);
 for(const link of graph.links.filter(l=>l.kind==='source')) assert.equal(link.target,'hub');
 assert.ok(!graph.links.some(l=>l.source==='C04'||(l.kind==='source'&&l.target==='fusion')));
 assert.equal(new Set(graph.links.map(l=>l.id)).size,12);
});

test('packets cover all active graph links and source dropout retains only honest output',()=>{
 const frame=fusionFrame(28,2,['C05']);
 assert.equal(frame.active,8);
 assert.equal(frame.unavailable,1);
 assert.deepEqual(new Set(frame.packets.map(p=>p.link)),new Set(fusionGraph(['C05']).links.map(l=>l.id)));
 assert.ok(!frame.packets.some(p=>p.source==='C05'||p.source==='C04'));
 assert.ok(frame.packets.some(p=>p.source==='AP-W'&&p.target==='hub'));
 assert.ok(frame.packets.some(p=>p.source==='hub'&&p.target==='fusion'));
 assert.deepEqual(fusionPathPoint('AP-E',0),[77,18,6]);
 assert.deepEqual(fusionPathPoint('AP-E',1),fusionHub.position);
 assert.deepEqual(fusionPathPoint('hub-fusion',0),fusionHub.position);
 assert.deepEqual(fusionPathPoint('hub-fusion',1),[72,-16,5]);
 const excluded=fusionSources.filter(s=>s.available).map(s=>s.id);
 assert.deepEqual(fusionGraph(excluded).links.map(l=>l.id),['AP-W','AP-E']);
 const empty=fusionFrame(28,2,excluded);
 assert.equal(empty.active,0);
 assert.equal(empty.complete,false);
 assert.deepEqual(empty.missing,['C05','DOOR','BAY']);
 assert.ok(empty.packets.every(p=>p.target==='hub'&&p.source.startsWith('AP-')));
});

import { fusionPlanMarkup, fusionDetailsMarkup } from './fusion-view.js';
test('Plan and inspection expose both central roles and honest source routes from the shared graph',()=>{
 const state={visible:true,selected:'hub',excluded:[]};
 const plan=fusionPlanMarkup(state);
 for(const node of ['hub','fusion']) assert.ok(plan.includes(`data-fusion="${node}"`));
 for(const link of fusionGraph().links) assert.ok(plan.includes(`data-fusion-link="${link.id}"`));
 assert.match(plan,/seeoHub/); assert.match(plan,/seeo Fusion/);
 assert.match(fusionDetailsMarkup(state,28),/Edge collection/);
 assert.match(fusionDetailsMarkup({...state,selected:'fusion'},28),/Fusion and digital twin/);
 const source=fusionDetailsMarkup({...state,selected:'C01'},28);
 assert.match(source,/C01 → seeoHub → seeo Fusion/);
 assert.doesNotMatch(source,/via AP-W/);
 assert.match(fusionDetailsMarkup({...state,selected:'AP-W'},28),/Wi-Fi.*seeoHub/);
 const excluded=fusionSources.map(s=>s.id);
 assert.ok(!fusionPlanMarkup({...state,excluded}).includes('data-fusion-link="hub-fusion"'));
 assert.ok(!fusionPlanMarkup({...state,excluded:['C05']}).includes('data-fusion-link="C05"'));
 assert.equal(fusionPlanMarkup({...state,visible:false}),'');
});

test('mobile Plan central names and roles remain readable across the whole 122-unit facility',()=>{
 const markup=fusionPlanMarkup({visible:true,selected:'hub',excluded:[]});
 // At 390px viewport the Plan has about 360px usable width: 3.8/3.5 SVG units
 // keep names above 11px and role text above 10px without zooming the facility.
 const labels=[...markup.matchAll(/<g class="fusion-central-mobile-label">([\s\S]*?)<\/g>/g)];
 assert.equal(labels.length,2);
 assert.ok(fusionProcessor.position[0] - fusionHub.position[0] >= 36,'mobile central cards do not overlap horizontally');
 for(const label of labels) {
  const name=label[1].match(/class="fusion-mobile-name"[^>]*font-size="([\d.]+)"/);
  const role=label[1].match(/class="fusion-mobile-role"[^>]*font-size="([\d.]+)"/);
  assert.ok(name&&Number(name[1])*360/122>=11);
  assert.ok(role&&Number(role[1])*360/122>=10);
 }
});
