import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('renamed WASM preserves a callable realm helper and valid module layout', async () => {
  const bytes = await readFile('app/vendor/grove.wasm');
  assert.equal(WebAssembly.validate(bytes), true);
  assert.doesNotMatch(bytes.toString('latin1'), /runtimekit|groveproxy/i);
  const invocation = bytes.toString('latin1').match(/\$grove\$setrealmfn\s*\(\{\}\)/)?.[0];
  assert.ok(invocation);
  assert.equal(vm.runInNewContext(invocation, { $grove$setrealmfn: () => 'called' }), 'called');
});

test('source and shipped controller retain the existing cookie database', async () => {
  for (const file of ['packages/controller/src/index.ts', 'app/vendor/controller.api.js']) {
    assert.match(await readFile(file, 'utf8'), /__runtimekit_controller/);
  }
});

test('deployed client assets use Grove names consistently', async () => {
  for (const file of ['app/public/app.js','app/public/worker.js','app/vendor/grove.js','app/vendor/grove-utils.js','app/vendor/bootstrap-client.js','app/vendor/controller.api.js','app/vendor/controller.inject.js','app/vendor/controller.worker.js']) {
    const text = await readFile(file,'utf8');
    assert.doesNotMatch(text.replaceAll('__runtimekit_controller_channel','').replaceAll('__runtimekit_controller',''), /runtimekit|groveproxy/i, file);
  }
});
