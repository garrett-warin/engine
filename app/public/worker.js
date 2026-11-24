importScripts("/controller/controller.worker.js");

addEventListener("fetch", (event) => {
  if (self.$groveController.shouldRoute(event)) {
    event.respondWith(self.$groveController.route(event));
  }
});
