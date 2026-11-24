export const REGISTRY_URL = "https://registry.npmjs.org/";
export const GROVE_PACKAGE_NAME = "@mercuryworkshop/runtimekit";

export const GROVE_CONTROLLER_PACKAGE_NAME =
	"@mercuryworkshop/runtimekit-controller";
export const GROVE_CONTROLLER_PINNED_MAJOR_VERSION = "0";

export const GROVE_UTILS_PACKAGE_NAME = "@mercuryworkshop/runtimekit-utils";
export const GROVE_UTILS_PINNED_MAJOR_VERSION = "0";

export const SOCKET_ENGINE_TRANSPORT_PACKAGE_NAME = "@mercuryworkshop/epoxy-transport";
export const SOCKET_ENGINE_TRANSPORT_PINNED_MAJOR_VERSION = "3";

export const HTTP_ENGINE_TRANSPORT_PACKAGE_NAME =
	"@mercuryworkshop/libcurl-transport";
export const HTTP_ENGINE_TRANSPORT_PINNED_MAJOR_VERSION = "2";

export type TransportOptions = "socket" | "http" | "channel";

export type BootstrapOptions = {
	transport: TransportOptions;
	swPath: string;

	streamRelayPath: string;

	groveBundlePath: string;
	groveWasmPath: string;
	groveUtilsBundlePath: string;

	socketengineClientPath: string;
	httpengineClientPath: string;
	channelClientPath: string;
	groveControllerApiPath: string;
	groveControllerInjectPath: string;
	groveControllerSwPath: string;

	bootstrapApiPath: string;
	bootstrapInitPath: string;

	groveVersionPin?: string;
	groveControllerVersionPin?: string;
	groveUtilsVersionPin?: string;
	socketengineTransportVersionPin?: string;
	httpengineTransportVersionPin?: string;
	channelTransportVersionPin?: string;
};

export const defaultConfig: Partial<BootstrapOptions> = {
	transport: "http",
	swPath: "/sw.js",
	streamRelayPath: "/streamRelay/",

	socketengineClientPath: "/clients/socketengine-client.js",
	httpengineClientPath: "/clients/httpengine-client.js",
	channelClientPath: "/clients/channel-client.js",
	bootstrapInitPath: "/bootstrap-init.js",

	groveControllerApiPath: "/controller/controller.api.js",
	groveControllerInjectPath: "/controller/controller.inject.js",
	groveControllerSwPath: "/controller/controller.sw.js",
	groveBundlePath: "/runtime/grove.js",
	groveWasmPath: "/runtime/grove.wasm",
	groveUtilsBundlePath: "/runtime/grove-utils.js",
};
