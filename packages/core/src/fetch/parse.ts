import { Object_entries, Object_keys, _URL, Error } from "@/shared/snapshot";
import { unrewriteUrl, parseImportMapRoute, URLMeta } from "@rewriters/url";
import {
	GroveFetchHandler,
	GroveFetchParsed,
	GroveFetchRequest,
	GroveFetchTrackedClient,
} from ".";

export const QP = {
	referrerPolicy: "$rfp",
	referrerSource: "$rfs",
	isModule: "$module",
	nativeFragment: "$nf",
	topFrame: "$tf",
	parentFrame: "$pf",
	isIframe: "$iframe",
	mode: "$mode",
	credentials: "$cred",
	destination: "$dest",
	initiatorOrigin: "$io",
	fetchSite: "$fs",
	crossSiteRedirect: "$csr",
	fakeDataURL: "$fakedataurl",
} as const;

export type QueryParamKey = keyof typeof QP;

export type QueryParams = Partial<Record<QueryParamKey, string>>;

const QP_INVERSE: Record<string, QueryParamKey> = (() => {
	const inv: Record<string, QueryParamKey> = {};
	for (const key of Object_keys(QP) as QueryParamKey[]) {
		inv[QP[key]] = key;
	}
	return inv;
})();

export function parseQueryParams(searchParams: URLSearchParams): {
	params: QueryParams;
	extras: Record<string, string>;
} {
	const params: QueryParams = {};
	const extras: Record<string, string> = {};
	for (const [key, value] of [...searchParams.entries()]) {
		const logical = QP_INVERSE[key];
		if (logical) {
			params[logical] = value;
		} else {
			dbg.warn(
				`extraneous query parameter ${key}=${value}. Assuming <form> element`
			);
			extras[key] = value;
		}
	}
	return { params, extras };
}

export function parseRequest(
	request: GroveFetchRequest,
	handler: GroveFetchHandler
): GroveFetchParsed {
	const strippedUrl = new _URL(request.rawUrl.href);
	const { params, extras } = parseQueryParams(request.rawUrl.searchParams);
	const moduleRoute = parseImportMapRoute(request.rawUrl, handler.context);
	if (moduleRoute) {
		Object.assign(params, parseQueryParams(new URLSearchParams(moduleRoute.params)).params);
	}
	strippedUrl.search = "";
	if (params.nativeFragment === "1") strippedUrl.searchParams.set(QP.nativeFragment, "1");

	const hadExtraParams = Object_keys(extras).length > 0;

	if (!_URL.canParse(unrewriteUrl(strippedUrl, handler.context))) {
		throw new Error(`unable to parse rewritten url: ${strippedUrl.href}`);
	}
	const url = new _URL(unrewriteUrl(strippedUrl, handler.context));

	if (url.origin === new _URL(request.rawUrl).origin) {
		// uh oh!
		throw new Error(
			"attempted to fetch from same origin - this means the site has obtained a reference to the real origin, aborting"
		);
	}

	for (const [key, value] of Object_entries(extras)) {
		url.searchParams.set(key, value);
	}

	const clientId = request.clientId;
	let trackedClient: GroveFetchTrackedClient | undefined;
	if (clientId) {
		trackedClient = handler.trackedClients.get(clientId);
		if (!trackedClient) {
			trackedClient = new GroveFetchTrackedClient(clientId);
			handler.trackedClients.set(clientId, trackedClient);
		}
	}

	const referrerSourceUrl =
		params.referrerSource === undefined
			? undefined
			: params.referrerSource
				? new _URL(params.referrerSource)
				: null;

	const fetchSiteState =
		params.fetchSite === "same-origin" ||
		params.fetchSite === "same-site" ||
		params.fetchSite === "cross-site"
			? params.fetchSite
			: undefined;

	const fetchMode = ["cors", "no-cors", "same-origin", "navigate"].includes(
		params.mode
	)
		? params.mode
		: undefined;
	const destination =
		(params.destination as RequestDestination | undefined) ||
		request.rawDestination;

	const meta: URLMeta = {
		origin: url,
		base: url,
		topFrameName: params.topFrame,
		parentFrameName: params.parentFrame,
		referrerPolicy: params.referrerPolicy,
	};

	const parsed: GroveFetchParsed = {
		meta,
		url,
		isModule: params.isModule === "module",
		referrerPolicy: params.referrerPolicy,
		referrerSourceUrl,
		trackedClient,
		hadExtraParams,
		crossSiteRedirect: params.crossSiteRedirect === "1",
		fetchSiteState,
		fetchInitiatorOrigin: params.initiatorOrigin || undefined,
		// TODO: should really just be a boolean
		fetchCredentialsInclude: params.credentials === "include",
		fetchCredentials: ["omit", "same-origin", "include"].includes(params.credentials) ? params.credentials as RequestCredentials : undefined,
		fetchMode,
		destination,
		isIframe: params.isIframe === "1",
		isFakeDataURL: params.fakeDataURL === "1",
	};

	if (request.rawClientUrl) {
		parsed.clientUrl = new _URL(
			unrewriteUrl(request.rawClientUrl, handler.context)
		);
	}

	return parsed;
}
