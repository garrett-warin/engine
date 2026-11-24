// Rebuild JavaScript against the committed matching WASM/glue.
// Rust changes first use build-grove-wasm.mjs to update both binary and glue.
import { cp, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { sanitize, prepareAssets } from "./prepare-client-assets.mjs";
const wasm = await readFile("app/vendor/grove.wasm");
const hash = createHash("sha256").update(wasm).digest("hex");
if (hash !== "e67f37e81fa28533406fd8ed12db3f42ca892966646d14817fa8b9bceb2de670") throw Error("Matching WASM required");
await mkdir("packages/core/dist", { recursive: true });
await cp("app/vendor/grove.wasm", "packages/core/dist/grove.wasm");
await cp("app/build-support/wasm", "packages/core/rewriter/wasm/out", { recursive: true });
const env = { ...process.env, CI: "1", SOURCE_DATE_EPOCH: "1791936000", BUILD_SOURCE_COMMIT: "e3d2ee13" };
for (const config of ["grove-iife", "grove-bootstrap"]) {
  execFileSync("pnpm", ["exec", "rspack", "build", "--mode", "production", "--configName", config], { env, stdio: "inherit" });
}
await sanitize("packages/core/dist/grove.js", "app/vendor/grove.js");
await prepareAssets(true);
console.log("JS_ASSETS_REBUILT_MATCHING_WASM=" + hash);
