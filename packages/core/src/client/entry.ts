// entrypoint for grove.client.js

import { GroveContext, GroveInterface } from "@/shared/index";
import { GROVECLIENT } from "@/symbols";
import { GroveClient } from "@client/index";
import { GroveConfig } from "@/types";

export const iswindow = "window" in globalThis && window instanceof Window;
export const isworker = "WorkerGlobalScope" in globalThis;
export const issw = "ServiceWorkerGlobalScope" in globalThis;
export const isdedicated = "DedicatedWorkerGlobalScope" in globalThis;
export const isshared = "SharedWorkerGlobalScope" in globalThis;
