importScripts("/controller/controller.sw.js");

addEventListener("fetch", (e) => {
	if ($groveController.shouldRoute(e)) {
		e.respondWith($groveController.route(e));
	}
});
