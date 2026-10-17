import test from 'node:test';
import assert from 'node:assert/strict';
import {forkliftLoadAssembly,actorPartVisible} from './forkliftAssembly.js';

test('empty forklift returns retain both tines while the pallet and cargo disappear',()=>{
 const assembly=forkliftLoadAssembly();
 const visible=assembly.filter(part=>actorPartVisible(part,{kind:'forklift',carrying:false}));
 assert.equal(visible.filter(part=>part.role==='fork').length,2,'empty forklift must retain both fork tines');
 assert.equal(visible.filter(part=>part.role==='load').length,0);
 for(const carrying of [true,undefined]) {
  const loaded=assembly.filter(part=>actorPartVisible(part,{kind:'forklift',carrying}));
  assert.equal(loaded.filter(part=>part.role==='fork').length,2);
  assert.equal(loaded.filter(part=>part.role==='load').length,2,'loaded and original replay display pallet and cargo');
 }
});
