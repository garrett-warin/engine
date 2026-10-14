// Rebuild JavaScript against the committed matching WASM/glue.
// Rust changes first use build-atlas-wasm.mjs to update both binary and glue.
import { cp, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { sanitize, prepareAssets } from "./prepare-client-assets.mjs";
const wasm = await readFile("app/vendor/runtimekit.wasm");
const hash = createHash("sha256").update(wasm).digest("hex");
if (hash !== "70445fc746f539eee672f99c534b217f4d71c95cfd5422fbb9b7be7e40d4815f") throw Error("Matching WASM required");
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
