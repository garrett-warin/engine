# Grove engine naming

This checkout uses Grove for engine-owned names: GroveClient, GroveConfig,
$grove, $groveController, $groveUtils, grove.js, grove.wasm, and grove-utils.js.
The application, worker, build configuration, workspace references, tests,
and asset filenames use the matching names. The app generator is create-grove-app.

Third-party dependencies, native browser APIs, original author/license information,
and upstream links are retained. The cookie database and cross-tab channel retain
their existing names so saved state is not silently discarded. Registry-download
identifiers retain their original package names; this change does not publish
new packages to the public registry.

## Build and verification

Use Node 22 and the pinned pnpm 10.12.1.

    pnpm install --frozen-lockfile
    node scripts/build-grove-client.mjs
    CI=1 pnpm exec rspack build --mode production
    node --test tests/*.test.mjs

The committed WASM contains two hardcoded branding strings. The checked migration
in scripts/migrate-wasm-names.mjs accepts only the original pinned binary hash.
It replaces those data strings without moving addresses: trailing spaces are
valid JavaScript whitespace for the emitted realm helper, and harmless padding
for the error label. The generated module validates and instantiates with the
matching glue. Rust sources use the new strings directly for subsequent rebuilds.
The migration was reproduced byte-for-byte against the original committed binary.

Verification performed:

- Full Rspack build completed. It reports declaration-generation diagnostics and
  one dynamic-import warning; this is not a clean TypeScript type-check claim.
- 38 Node tests passed, including HTTP assets, WASM import/glue matching, executable
  rewrites, preserved cookie database, and renamed runtime references.
- Fresh headless Chrome passed Google loading, navigation to Example Domain,
  reload, cookie persistence, and localStorage persistence, with no page errors.
- Original deploy tests were checked first: two failed because they expected an
  obsolete iframe ID and initial destination. Those expectations now match the
  unchanged app behavior.

This is a local engine checkout, not a live Grove deployment. Consumers that use
old API names or file paths must be updated together with these assets. Do not mix
old and new runtime/controller/worker files. Clear or version deployment asset
caches on rollout. Public package-download/bootstrap paths were not exercised.
