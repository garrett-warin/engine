// this file is both a service worker and client library, to minimize the number of files

import { init, loadRest } from "./client";
import { loadScript, registerSw } from "./clientcommon";
import {
	BootstrapOptions,
	defaultConfig,
	GROVE_CONTROLLER_PACKAGE_NAME,
	GROVE_CONTROLLER_PINNED_MAJOR_VERSION,
	GROVE_PACKAGE_NAME,
	HTTP_ENGINE_TRANSPORT_PACKAGE_NAME,
	HTTP_ENGINE_TRANSPORT_PINNED_MAJOR_VERSION,
	SOCKET_ENGINE_TRANSPORT_PACKAGE_NAME,
	SOCKET_ENGINE_TRANSPORT_PINNED_MAJOR_VERSION,
} from "./common";

const isSw = "ServiceWorkerGlobalScope" in globalThis;

const CDN_URL = "https://cdn.jsdelivr.net/npm/";
const DB_NAME = "grove-bootstrap";
const DB_VERSION = 1;
const STORE_NAME = "files";

type StaticBootstrapOptions = BootstrapOptions & {
	filePath?: string;
};

type FileEntry = {
	path: string;
	content: ArrayBuffer;
	contentType: string;
	version: string;
	timestamp: number;
};

type InitMessage = {
	config: BootstrapOptions;
};

type InitDoneMessage = {
	ready: boolean;
};

// IndexedDB helper functions
async function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: "path" });
				store.createIndex("version", "version", { unique: false });
				store.createIndex("timestamp", "timestamp", { unique: false });
			}
		};
	});
}

async function getFile(path: string): Promise<FileEntry | null> {
	if (!path) {
		throw new Error("Path is required for getFile");
	}
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const request = store.get(path);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result || null);

		tx.onerror = () => reject(tx.error);
	});
}

async function saveFile(entry: FileEntry): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		const request = store.put(entry);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();

		tx.onerror = () => reject(tx.error);
	});
}

async function findLatestVersion(
	packageName: string,
	majorVersion: string
): Promise<string> {
	// Use jsdelivr API to find latest version
	const response = await fetch(
		`https://data.jsdelivr.com/v1/packages/npm/${packageName}?a`
	);
	if (!response.ok) {
		throw new Error(`Failed to fetch package info: ${response.statusText}`);
	}

	const data = await response.json();
	const versions = data.versions.filter((v: any) =>
		v.version.startsWith(`${majorVersion}.`)
	);

	if (versions.length === 0) {
		throw new Error(
			`No versions found for ${packageName} with major version ${majorVersion}`
		);
	}

	// Versions are already sorted by jsdelivr
	return versions[0].version;
}

async function downloadFile(
	packageName: string,
	version: string,
	filePath: string
): Promise<ArrayBuffer> {
	const url = `${CDN_URL}${packageName}@${version}${filePath}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to download ${url}: ${response.statusText}`);
	}

	return await response.arrayBuffer();
}

async function ensureFile(
	packageName: string,
	version: string,
	filePath: string,
	contentType: string,
	routePath: string
): Promise<void> {
	const cached = await getFile(routePath);

	if (cached && cached.version === version) {
		console.log(`Using cached ${routePath} (${version})`);
		return;
	}

	console.log(`Downloading ${routePath} from ${packageName}@${version}...`);
	const content = await downloadFile(packageName, version, filePath);

	await saveFile({
		path: routePath,
		content,
		contentType,
		version,
		timestamp: Date.now(),
	});

	console.log(`Cached ${routePath} (${version})`);
}

if (isSw) {
	let config: BootstrapOptions;
	let groveControllerLoaded = false;

	// Set up message listener immediately on initial evaluation
	addEventListener("message", (event) => {
		if (typeof event.data !== "object" || event.data === null) return;

		if (event.data.type === "init-bootstrap") {
			initBootstrapSw(event.data.message);
		}

		if (event.data.type === "SKIP_WAITING") {
			(self as any).skipWaiting();
		}
	});

	// Set up fetch listener immediately on initial evaluation
	addEventListener("fetch", (event: any) => {
		const url = new URL(event.request.url);
		const path = url.pathname;

		// Only intercept requests if we have a config
		if (!config || !path) {
			return; // Fall through to normal fetch
		}

		event.respondWith(
			(async () => {
				// If grove controller is loaded, check if it should handle this request
				if (groveControllerLoaded && (self as any).$groveController) {
					const controller = (self as any).$groveController;
					if (controller.shouldRoute(event)) {
						return controller.route(event);
					}
				}

				// Try to serve bootstrap files from cache
				const cached = await getFile(path);
				if (cached) {
					return new Response(cached.content, {
						headers: {
							"Content-Type": cached.contentType,
							"Cache-Control": "public, max-age=31536000",
						},
					});
				}

				// Fall through to network
				return fetch(event.request);
			})()
		);
	});

	async function initBootstrapSw(opts: InitMessage) {
		// Merge with defaults
		config = { ...defaultConfig, ...opts.config } as BootstrapOptions;

		try {
			// Find latest versions
			const controllerVersion = await findLatestVersion(
				GROVE_CONTROLLER_PACKAGE_NAME,
				config.groveControllerVersionPin ||
					GROVE_CONTROLLER_PINNED_MAJOR_VERSION
			);

			console.log(controllerVersion);
			// Fetch controller to get grove dependency version
			const controllerPkgUrl = `${CDN_URL}${GROVE_CONTROLLER_PACKAGE_NAME}@${controllerVersion}/package.json`;
			const controllerPkgResponse = await fetch(controllerPkgUrl);
			const controllerPkg = await controllerPkgResponse.json();

			console.log(controllerPkg);
			const groveVersion = controllerPkg.dependencies[
				GROVE_PACKAGE_NAME
			].replace(/^[\^~]/, "");

			// Download grove files
			await ensureFile(
				GROVE_PACKAGE_NAME,
				groveVersion,
				"/dist/grove.js",
				"application/javascript",
				config.groveBundlePath
			);

			await ensureFile(
				GROVE_PACKAGE_NAME,
				groveVersion,
				"/dist/grove.wasm",
				"application/wasm",
				config.groveWasmPath
			);

			// Download controller files
			await ensureFile(
				GROVE_CONTROLLER_PACKAGE_NAME,
				controllerVersion,
				"/dist/controller.api.js",
				"application/javascript",
				config.groveControllerApiPath
			);

			await ensureFile(
				GROVE_CONTROLLER_PACKAGE_NAME,
				controllerVersion,
				"/dist/controller.inject.js",
				"application/javascript",
				config.groveControllerInjectPath
			);

			await ensureFile(
				GROVE_CONTROLLER_PACKAGE_NAME,
				controllerVersion,
				"/dist/controller.sw.js",
				"application/javascript",
				config.groveControllerSwPath
			);

			// Download transport files
			if (config.transport === "http") {
				const httpengineVersion = await findLatestVersion(
					HTTP_ENGINE_TRANSPORT_PACKAGE_NAME,
					config.httpengineTransportVersionPin ||
						HTTP_ENGINE_TRANSPORT_PINNED_MAJOR_VERSION
				);

				await ensureFile(
					HTTP_ENGINE_TRANSPORT_PACKAGE_NAME,
					httpengineVersion,
					"/dist/index.js",
					"application/javascript",
					config.httpengineClientPath
				);
			} else if (config.transport === "socket") {
				const socketengineVersion = await findLatestVersion(
					SOCKET_ENGINE_TRANSPORT_PACKAGE_NAME,
					config.socketengineTransportVersionPin ||
						SOCKET_ENGINE_TRANSPORT_PINNED_MAJOR_VERSION
				);

				await ensureFile(
					SOCKET_ENGINE_TRANSPORT_PACKAGE_NAME,
					socketengineVersion,
					"/dist/index.js",
					"application/javascript",
					config.socketengineClientPath
				);
			}

			console.log("Bootstrap initialization complete");

			// Import grove controller SW script
			try {
				// Fetch the controller script from IndexedDB cache
				const cachedController = await getFile(config.groveControllerSwPath);
				if (cachedController) {
					// Convert ArrayBuffer to string
					const decoder = new TextDecoder();
					const scriptContent = decoder.decode(cachedController.content);

					// Directly evaluate the script instead of using importScripts
					// This avoids the issue with adding event listeners after initial evaluation
					(0, eval)(scriptContent);

					groveControllerLoaded = true;
					console.log("Grove controller loaded");
				} else {
					console.error("Grove controller not found in cache");
				}
			} catch (error) {
				console.error("Failed to load grove controller:", error);
			}

			// Send init done message
			(self as any).clients.matchAll().then((clients: any[]) => {
				clients.forEach((client: any) => {
					client.postMessage({
						type: "init-bootstrap-done",
						message: { ready: true } as InitDoneMessage,
					});
				});
			});
		} catch (error) {
			console.error("Bootstrap initialization failed:", error);
			throw error;
		}
	}
} else {
	const currentScript = document.currentScript as HTMLScriptElement | null;
	async function initBootstrap(opts: StaticBootstrapOptions) {
		let filePath = opts.filePath;
		if (!filePath) {
			if (currentScript && currentScript.src) {
				filePath = currentScript.src;
			}
			if (!filePath) {
				throw new Error(
					"Could not determine bootstrap file path and none was provided!"
				);
			}
		}

		const sw = await registerSw(filePath);

		// Merge with defaults before sending to SW and using in loadRest
		const fullConfig = { ...defaultConfig, ...opts } as BootstrapOptions;

		const message: InitMessage = {
			config: fullConfig,
		};
		sw.postMessage({
			type: "init-bootstrap",
			message,
		});

		const initDone = await new Promise<InitDoneMessage>((resolve) => {
			const onMessage = (event: MessageEvent) => {
				if (typeof event.data !== "object" || event.data === null) return;
				if (event.data.type === "init-bootstrap-done") {
					navigator.serviceWorker.removeEventListener("message", onMessage);
					resolve(event.data.message);
				}
			};
			navigator.serviceWorker.addEventListener("message", onMessage);
		});
		console.log(initDone);

		return await loadRest(sw, fullConfig);
	}

	(window as any).initBootstrap = initBootstrap;
}
