import { init } from "/bootstrap/bootstrap-client.js";

const iframe = document.querySelector("#frame");

async function initialize() {
  const controller = await init({
    transport: "http",
    workerPath: "/worker.js",
    streamRelayPath: "/relay/",
    httpengineClientPath: "/clients/httpengine-client.js",
    socketengineClientPath: "/clients/httpengine-client.js",
    channelClientPath: "/clients/httpengine-client.js",
    groveBundlePath: "/runtime/grove.js",
    groveWasmPath: "/runtime/grove.wasm",
    groveUtilsBundlePath: "/runtime/grove-utils.js",
    groveControllerApiPath: "/controller/controller.api.js",
    groveControllerInjectPath: "/controller/controller.inject.js",
    groveControllerWorkerPath: "/controller/controller.worker.js",
    bootstrapApiPath: "/bootstrap/bootstrap-client.js",
    bootstrapInitPath: "/app.js",
  });
  await controller.wait();
  const frame = controller.createFrame(iframe);
  frame.go("https://google.com/");
}

initialize().catch(console.error);
