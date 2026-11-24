// NOTE: this is the entrypoint for grove.bundle.js
// as such it exports everything in grove
// the entry point for grove.all.js (what most sites wil use) is entry.ts

import "./global.d";
import { atob } from "@/shared/snapshot";
import { setWasm } from "@rewriters/wasm";
import { GroveVersionInfo, GroveConfig } from "./types";

declare const VERSION: string;
declare const COMMITHASH: string;
declare const BUILDDATE: string;
export const versionInfo: GroveVersionInfo = {
	version: VERSION,
	build: COMMITHASH,
	date: BUILDDATE,
};

export const defaultConfig: GroveConfig = {
	globals: {
		wrapfn: "$grove$wrap",
		wrappropertybase: "$grove__",
		wrappropertyfn: "$grove$prop",
		cleanrestfn: "$grove$clean",
		importfn: "$grove$import",
		rewritefn: "$grove$rewrite",
		metafn: "$grove$meta",
		wrappostmessagefn: "$grove$wrappostmessage",
		pushsourcemapfn: "$grove$pushsourcemap",
		trysetfn: "$grove$tryset",
		templocid: "$grove$temploc",
		tempunusedid: "$grove$tempunused",
	},
	flags: {
		syncxhr: false,
		disableComputedWrap: false,
		rewriterLogs: false,
		captureErrors: false,
		cleanErrors: false,
		scramitize: false,
		sourcemaps: true,
		destructureRewrites: true,
		allowInvalidJs: true,
		debugTrampolines: false,
		allowFailedIntercepts: false,
		encapsulateWorkers: true,
		debugSourceURL: false,
	},
	siteFlags: {},
	maskedfiles: [],
};

export const defaultConfigDev: GroveConfig = {
	...defaultConfig,
	flags: {
		...defaultConfig.flags,
		rewriterLogs: false,
		captureErrors: true,
		cleanErrors: false,
		debugTrampolines: true,
		debugSourceURL: true,
		allowInvalidJs: false,
	},
};

declare const REWRITERWASM: string | undefined;
// bundled build will have the wasm binary inlined as a base64 string
if (REWRITERWASM) {
	setWasm(Uint8Array.from(atob(REWRITERWASM), (c) => c.charCodeAt(0)));
}

export * from "./symbols";
export * from "./types";
export * from "./Tap";
export * from "./shared";
export * from "./fetch";
export { BareResponse as ChannelResponse } from "@mercuryworkshop/proxy-transports";
export * from "./client";
