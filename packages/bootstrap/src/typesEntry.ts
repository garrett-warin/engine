import type { Controller } from "@mercuryworkshop/grove-controller";
declare global {
	function initBootstrap(): Promise<Controller>;
}

export * from "./server";
