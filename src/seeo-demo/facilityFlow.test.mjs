import test from 'node:test';
import assert from 'node:assert/strict';
import { getFacilityFrame, facilityRoutes, FLOW_DURATION, reduceFacilityReplay, flowObstacles, pedestrianPath, barrierPath } from './facilityFlow.js';
import {getReplayFrame,initialReplay} from './replay.js';
test('proposed flow repeats all twelve actors with continuous cycle positions',()=>{
 const a=getFacilityFrame(0),b=getFacilityFrame(FLOW_DURATION-.001),c=getFacilityFrame(FLOW_DURATION+.001);
 assert.equal(a.actors.length,12);
 for(let i=0;i<a.actors.length;i++) assert.ok(Math.hypot(b.actors[i].x-c.actors[i].x,b.actors[i].y-c.actors[i].y)<.01);
 assert.equal(a.actors.find(a=>a.kind==='truck').motion,'docked');
});

test('whole proposed cycle clears full forklift footprints, obstacles and protected corridor',()=>{
 for(let t=0;t<FLOW_DURATION;t+=.1){
  const actors=getFacilityFrame(t).actors, forklifts=actors.filter(a=>a.kind==='forklift');
  for(const a of actors){assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));}
  for(const p of actors.filter(a=>a.kind==='person')) {
   assert.ok(p.x>=3&&p.x<=81&&p.y>=3&&p.y<=51);
   assert.ok(p.x===3||p.x===81||p.y===3||p.y===51);
  }
  // 2.7m disc encloses mast, forks, carried pallet and body at every heading.
  for(const a of forklifts){
   assert.ok(a.x-2.7>5&&a.x+2.7<79&&a.y-2.7>5&&a.y+2.7<49,`barrier clearance ${a.id} at ${t}`);
   for(const o of flowObstacles){const dx=Math.max(o.x-a.x,0,a.x-o.x-o.w),dy=Math.max(o.y-a.y,0,a.y-o.y-o.h);assert.ok(Math.hypot(dx,dy)>2.7,`obstacle ${a.id} at ${t}`);}
   for(const b of forklifts.filter(b=>b.id>a.id))assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>5.4,`circuits ${a.id}/${b.id} at ${t}`);
   for(const p of actors.filter(a=>a.kind==='person'))assert.ok(Math.hypot(a.x-p.x,a.y-p.y)>3.7);
  }
 }
 assert.deepEqual(barrierPath[0],[5,5]);assert.deepEqual(pedestrianPath[0],[3,3]);
});
test('proposed replay loops while original stops, retaining pause seek reset and speed semantics',()=>{
 const playing={...initialReplay(),playing:true,seconds:199};
 assert.deepEqual(reduceFacilityReplay(playing,{type:'tick',seconds:2}),{seconds:1,playing:true,speed:1});
 assert.equal(reduceFacilityReplay({...playing,seconds:39},{type:'tick',seconds:2},'original').playing,false);
 const paused=reduceFacilityReplay(playing,{type:'seek',seconds:140});
 assert.equal(paused.seconds,140);assert.equal(paused.playing,false);
 assert.deepEqual(reduceFacilityReplay(paused,{type:'tick',seconds:5}),paused);
 assert.deepEqual(reduceFacilityReplay(paused,{type:'reset'}),initialReplay());
 assert.equal(reduceFacilityReplay({...playing,speed:2},{type:'tick',seconds:2}).seconds,3);
 assert.deepEqual(getFacilityFrame(20,'original'),getReplayFrame(20));
});
test('movement remains gradual across every sample and forklift circuits stay active beyond40s',()=>{
 for(let t=0;t<200;t+=.1){
  const a=getFacilityFrame(t),b=getFacilityFrame(t+.1);
  a.actors.forEach((actor,i)=>assert.ok(Math.hypot(actor.x-b.actors[i].x,actor.y-b.actors[i].y)<.15));
 }
 for(const a of getFacilityFrame(40).actors.filter(a=>a.kind==='forklift'))assert.ok(Math.hypot(a.x-getFacilityFrame(45).actors.find(b=>b.id===a.id).x,a.y-getFacilityFrame(45).actors.find(b=>b.id===a.id).y)>.01);
});

import {fusionSnapshot} from './fusion.js';
test('Fusion describes the displayed proposed docked truck at the displayed cycle time',()=>{
 for(const t of [0,20,40,120,199]) {
  const snapshot=fusionSnapshot(t,[],'proposed');
  assert.equal(snapshot.time,t);
  assert.match(snapshot.context,/Truck docked.*door open.*bay occupied/);
  assert.equal(getFacilityFrame(t).actors.find(a=>a.kind==='truck').motion,'docked');
 }
 assert.match(fusionSnapshot(0).context,/Truck positioning.*door closed.*bay clear/);
});

import {workStations} from './facilityFlow.js';
import {actorMarkup} from './replayVisual.js';
test('work stations have explicit service dwell and distinguish loaded transfers from empty returns',()=>{
 for(const station of workStations){
  const pickup=getFacilityFrame(0).actors.find(a=>a.id===station.id);
  const dwell=getFacilityFrame(1).actors.find(a=>a.id===station.id);
  assert.equal(pickup.x,station.pickup[0]);assert.equal(pickup.y,station.pickup[1]);
  assert.equal(dwell.x,pickup.x);assert.equal(dwell.y,pickup.y);
  assert.match(pickup.motion,/Pickup/);assert.equal(pickup.carrying,true);
  const period=station.id==='FL-03'?100:station.id==='FL-04'?40:50;
  const drop=getFacilityFrame(period/2+.5).actors.find(a=>a.id===station.id);
  assert.ok(Math.hypot(drop.x-station.drop[0],drop.y-station.drop[1])<.001);
  assert.match(drop.motion,/Drop-off/);assert.equal(drop.carrying,false);
  const returning=getFacilityFrame(period-5).actors.find(a=>a.id===station.id);
  assert.match(returning.motion,/Empty return/);
  assert.doesNotMatch(actorMarkup({actors:[returning]}),/fill="#c39a66"/);
 }
});
