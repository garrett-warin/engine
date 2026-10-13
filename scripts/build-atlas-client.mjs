// Rebuild JavaScript-only changes against the committed matching WASM/glue.
// Rust/WASM sources and binary are unchanged by this release.
import { cp, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { sanitize, prepareAssets } from "./prepare-client-assets.mjs";
const wasm = await readFile("app/vendor/runtimekit.wasm");
const hash = createHash("sha256").update(wasm).digest("hex");
if (hash !== "ab66f90ecb60b6923655d47c2a4b95c5066819a2e5caf0d6798a00f55a148ef7") throw Error("Matching WASM required");
await mkdir("packages/core/dist", { recursive: true });
await cp("app/vendor/runtimekit.wasm", "packages/core/dist/runtimekit.wasm");
await cp("app/build-support/wasm", "packages/core/rewriter/wasm/out", { recursive: true });
const env = { ...process.env, CI: "1", SOURCE_DATE_EPOCH: "1791936000", BUILD_SOURCE_COMMIT: "e3d2ee13" };
for (const config of ["runtimekit-iife", "runtimekit-bootstrap"]) {
  execFileSync("pnpm", ["exec", "rspack", "build", "--mode", "production", "--configName", config], { env, stdio: "inherit" });
}
await sanitize("packages/core/dist/runtimekit.js", "app/vendor/runtimekit.js");
await prepareAssets(true);
console.log("JS_ASSETS_REBUILT_MATCHING_WASM=" + hash);
