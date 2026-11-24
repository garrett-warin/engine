import {
	BareCompatibleClient as ChannelCompatibleClient,
	BareResponse as ChannelResponse,
	ProxyTransport,
	BareRequestInit as ChannelRequestInit,
} from "@mercuryworkshop/proxy-transports";

import { type URLMeta } from "@rewriters/url";
import { type GroveRequestMode } from "./parse";
import { GroveHeaders } from "@/shared/headers";
import { HtmlRewriterHooks, GroveContext } from "@/shared";
import { Tap, TapInstance } from "@/Tap";
import { doHandleFetch } from "./fetch";
import { _URL, _Map } from "@/shared/snapshot";

export interface GroveFetchRequest {
	rawUrl: URL;
	rawReferrer: string | null;
	// use parsed.destination instead
	rawDestination: RequestDestination;
	mode: RequestMode;
	referrer: string;
	method: string;
	body: BodyType | null;
	cache: RequestCache;

	initialHeaders: GroveHeaders;

	rawClientUrl?: URL;

	/** The service worker FetchEvent.clientId that originated this request. */
	clientId: string;
}

export interface GroveFetchParsed {
	url: _URL;
	clientUrl?: _URL;
	referrerSourceUrl?: _URL | null;
	hadExtraParams: boolean;
	crossSiteRedirect: boolean;

	// track the worst case Sec-Fetch-Site classification through redirects
	fetchSiteState?: "same-origin" | "same-site" | "cross-site";

	// origin of the page that initialized the request
	// specifically for tracking Sec-Fetch-Site, don't use for anything else, it will diverge from clientUrl in some cases
	fetchInitiatorOrigin?: string;

	// was the request made with credentials=include?
	fetchCredentialsInclude?: boolean;
	fetchCredentials?: RequestCredentials;

	// tracks RequestInit.mode if set
	fetchMode?: GroveRequestMode;

	// was this request made by an iframe? (grove's definition of an iframe, not the browser's)
	isIframe?: boolean;

	// request.destination, but is overridden by $dest
	destination: RequestDestination;

	meta: URLMeta;
	isModule: boolean;
	isFakeDataURL: boolean;
	referrerPolicy?: string;
	trackedClient?: GroveFetchTrackedClient;
}

export interface GroveFetchResponse {
	body: BodyType;
	headers: GroveHeaders;
	status: number;
	statusText: string;
}

export type CookieSyncEntry = {
	url: URL;
	cookie: string;
};

export type CookieSyncOptions = {
	clear?: boolean;
	destination?: RequestDestination;
};

export type FetchHandlerInit = {
	transport: ProxyTransport;
	context: GroveContext;
	crossOriginIsolated?: boolean;

	sendSetCookie: (
		cookies: CookieSyncEntry[],
		options?: CookieSyncOptions
	) => Promise<void>;
	fetchDataUrl(dataUrl: string): Promise<ChannelResponse>;
	fetchBlobUrl(blobUrl: string): Promise<ChannelResponse>;
};

export type TrackedHistoryState = {
	url: string;
	refererPolicy?: string;
};
export class GroveFetchTrackedClient {
	history: TrackedHistoryState[] = [];
	constructor(public clientId: string) {}
}

// eslint-disable-next-line grove-core/no-globals
export class GroveFetchHandler extends EventTarget {
	public client: ChannelCompatibleClient;
	public crossOriginIsolated: boolean = false;
	public context: GroveContext;

	public trackedClients = new _Map<string, GroveFetchTrackedClient>();

	public hooks: {
		rewriter: {
			html: TapInstance<HtmlRewriterHooks>;
		};
		fetch: TapInstance<FetchHooks>;
	};

	public fetchDataUrl: (dataUrl: string) => Promise<Response>;
	public fetchBlobUrl: (blobUrl: string) => Promise<Response>;
	public sendSetCookie: (
		cookies: CookieSyncEntry[],
		options?: CookieSyncOptions
	) => Promise<void>;

	constructor(init: FetchHandlerInit) {
		super();
		this.client = new ChannelCompatibleClient(init.transport);
		this.context = init.context;
		this.crossOriginIsolated = init.crossOriginIsolated || false;
		this.sendSetCookie = init.sendSetCookie;
		this.fetchDataUrl = init.fetchDataUrl;
		this.fetchBlobUrl = init.fetchBlobUrl;
		this.hooks = {
			rewriter: {
				html: Tap.create<HtmlRewriterHooks>(),
			},
			fetch: Tap.create<FetchHooks>(),
		};
		this.context.hooks = {
			rewriter: this.hooks.rewriter,
		};
	}

	async handleFetch(
		request: GroveFetchRequest
	): Promise<GroveFetchResponse> {
		return doHandleFetch(this, request);
	}
}
export type FetchHooks = {
	intercept: {
		context: {
			request: GroveFetchRequest;
			parsed: GroveFetchParsed;
		};
		props: {
			response?: GroveFetchResponse;
		};
	};
	request: {
		context: {
			request: GroveFetchRequest;
			parsed: GroveFetchParsed;
			client: ChannelCompatibleClient;
		};
		props: {
			init: ChannelRequestInit;
			url: URL;
			earlyResponse?: ChannelResponse;
		};
	};
	preresponse: {
		context: {
			request: GroveFetchRequest;
			parsed: GroveFetchParsed;
		};
		props: {
			response: ChannelResponse;
		};
	};
	response: {
		context: {
			request: GroveFetchRequest;
			parsed: GroveFetchParsed;
		};
		props: {
			response: GroveFetchResponse;
		};
	};
};

export type BodyType = string | ArrayBuffer | Blob | ReadableStream<any>;
