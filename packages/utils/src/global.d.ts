import type * as GroveController from "@mercuryworkshop/grove-controller";

declare global {
	const $grove: typeof import("@mercuryworkshop/grove");
	const $groveController: typeof GroveController;
}

export {};
