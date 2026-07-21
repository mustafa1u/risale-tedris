import { createSearchWorkerCore } from "./searchWorkerCore.js";
import { createSearchWorkerMessageHandler } from "./searchWorkerRuntime.js";

const core = createSearchWorkerCore();
const handleMessage = createSearchWorkerMessageHandler({
  core,
  postMessage: (response) => globalThis.postMessage(response)
});

globalThis.addEventListener("message", handleMessage);
