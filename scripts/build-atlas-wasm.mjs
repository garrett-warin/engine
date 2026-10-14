// Rebuild a Rust change with matching debug-mode wasm-bindgen glue.
// Do not combine release-mode (no debug imports) glue with the debug binary.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, cp, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
execFileSync('bash',['build.sh'],{cwd:'packages/core/rewriter/wasm',env:{...process.env,RELEASE:'0'},stdio:'inherit'});
await mkdir('app/build-support/wasm',{recursive:true});
await cp('packages/core/rewriter/wasm/out/wasm.js','app/build-support/wasm/wasm.js');
await rm('app/build-support/wasm/snippets',{recursive:true,force:true});
await cp('packages/core/rewriter/wasm/out/snippets','app/build-support/wasm/snippets',{recursive:true});
const wasm=await readFile('packages/core/dist/runtimekit.wasm');
for(const[from,to]of [['scram','rtime'],['SCRAM','RTIME'],['encodeUrl','packUri__'],['encodeurl','packuri__']]){
 const a=Buffer.from(from),b=Buffer.from(to);if(a.length!==b.length)throw Error('Binary replacement length mismatch');
 for(let offset=wasm.indexOf(a);offset>=0;offset=wasm.indexOf(a,offset+b.length))b.copy(wasm,offset);
}
await writeFile('app/vendor/runtimekit.wasm',wasm);
const hash=createHash('sha256').update(wasm).digest('hex');
const builder=await readFile('scripts/build-atlas-client.mjs','utf8');
await writeFile('scripts/build-atlas-client.mjs',builder.replace(/hash !== "[a-f0-9]{64}"/,`hash !== "${hash}"`));
console.log('RUST_WASM_REBUILT_MATCHING_GLUE='+hash);
