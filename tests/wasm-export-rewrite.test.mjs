import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sanitize } from '../scripts/prepare-client-assets.mjs';
test('exported module factories and declarations receive import/meta/global rewrites', async () => {
 const temp=await mkdtemp(join(tmpdir(),'atlas-export-wasm-'));
 try {
  await cp('app/build-support/wasm',temp,{recursive:true});await writeFile(join(temp,'package.json'),'{"type":"module"}');
  await sanitize(join(temp,'wasm.js'),join(temp,'wasm.mjs'));
  const snippet=join(temp,'snippets/wasm-4b0f351a8e6eeb46/inline0.js');await sanitize(snippet,snippet);
  const {initSync,Rewriter}=await import(pathToFileURL(join(temp,'wasm.mjs')));
  initSync({module:new WebAssembly.Module(await readFile('app/vendor/grove.wasm'))});
  const config={prefix:'/fixture/',wrapfn:'$grove$wrap',wrappropertybase:'$grove__',wrappropertyfn:'$grove$prop',cleanrestfn:'$grove$clean',importfn:'$grove$import',rewritefn:'$grove$rewrite',wrappostmessagefn:'$grove$wrappostmessage',metafn:'$grove$meta',pushsourcemapfn:'$grove$pushsourcemap',trysetfn:'$grove$tryset',templocid:'$grove$temploc',tempunusedid:'$grove$tempunused'};
  const flags={sourcemaps:true,captureErrors:false,rtimeitize:false,disableComputedWrap:false,destructureRewrites:true};
  for(const source of [
   'export const __rspack_esm_id=1;export const __rspack_esm_ids=[1];export const __webpack_modules__={route:()=>import(route.module)};',
   'export async function loader(path){return await import(path)}',
   'export class Loader{load(path){return import(path)}}',
   'export const loader=path=>import(path)',
  ]) {
   const rewriter=new Rewriter();try{const out=rewriter.rewrite_js(config,flags,url=>encodeURIComponent(url),source,'https://fixture.test/','https://fixture.test/module.js',true);assert.equal(out.errors.length,0);assert.match(new TextDecoder().decode(out.js),/\$grove\$import\(/);}finally{rewriter.free();}
  }
  const rewriter=new Rewriter();try{const out=rewriter.rewrite_js(config,flags,url=>encodeURIComponent(url),'export const meta=import.meta.url;export const host=window.location.href;','https://fixture.test/','https://fixture.test/module.js',true);const text=new TextDecoder().decode(out.js);assert.match(text,/\$grove\$meta\(/);assert.match(text,/\$grove__location/);}finally{rewriter.free();}
 }finally{await rm(temp,{recursive:true,force:true});}
});
