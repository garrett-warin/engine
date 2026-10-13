import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { sanitize } from "../scripts/prepare-client-assets.mjs";
test("committed build-support glue satisfies every unchanged WASM import", async () => {
  const temp = await mkdtemp(join(tmpdir(), "atlas-glue-test-"));
  try {
    await cp("app/build-support/wasm", temp, { recursive: true });
    await writeFile(join(temp, "package.json"), '{"type":"module"}');
    await sanitize(join(temp, "wasm.js"), join(temp, "wasm.mjs"));
    const snippet = join(temp, "snippets/wasm-4b0f351a8e6eeb46/inline0.js");
    await sanitize(snippet, snippet);
    const glue = await import(pathToFileURL(join(temp, "wasm.mjs")));
    const module = new WebAssembly.Module(await readFile("app/vendor/runtimekit.wasm"));
    assert.equal(WebAssembly.Module.imports(module).length, 20);
    assert.doesNotThrow(() => glue.initSync({ module }));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
