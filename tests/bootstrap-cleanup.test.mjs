import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScript } from '../packages/bootstrap/src/clientcommon.ts';
for(const event of ['onload','onerror']) test(`bootstrap cleans only its own script after ${event}`,async()=>{
 let removed=0,created;
 globalThis.document={createElement(){return {remove(){removed++}}},head:{appendChild(element){created=element;queueMicrotask(()=>element[event]())}}};
 try {
  const promise=loadScript('/fixture-owned.js');
  if(event==='onload')await promise;else await assert.rejects(promise,/Failed to load script/);
  assert.equal(created.src,'/fixture-owned.js');assert.equal(removed,1);
 }finally{delete globalThis.document;}
});
