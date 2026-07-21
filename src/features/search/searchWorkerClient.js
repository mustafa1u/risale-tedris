import {
  SEARCH_WORKER_PROTOCOL_VERSION,
  assertSearchWorkerRequestV1,
  assertSearchWorkerResponseV1
} from "./searchContracts.js";

export class SearchWorkerClientError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "SearchWorkerClientError";
    this.code = code;
  }
}

export function createSearchWorkerClient({ worker }) {
  let nextRequestId = 1;
  let latestSearchRequestId = null;
  let disposed = false;
  const pending = new Map();

  function rejectPending(requestId, error) {
    const request = pending.get(requestId);
    if (!request) return;
    pending.delete(requestId);
    request.reject(error);
  }

  function onMessage(event) {
    if (disposed) return;
    const requestId = event?.data?.requestId;
    const request = pending.get(requestId);
    if (!request) return;

    let response;
    try {
      response = assertSearchWorkerResponseV1(event.data);
    } catch (cause) {
      rejectPending(requestId, new SearchWorkerClientError("INVALID_RESPONSE", "Search worker returned an invalid response", { cause }));
      return;
    }

    pending.delete(requestId);
    if (latestSearchRequestId === requestId) latestSearchRequestId = null;
    if (response.type === "error") {
      request.reject(new SearchWorkerClientError(response.errorCode, response.message ?? response.errorCode));
    } else {
      request.resolve(response);
    }
  }

  function onError(event) {
    const error = new SearchWorkerClientError("WORKER_ERROR", event?.message ?? "Search worker failed");
    for (const requestId of [...pending.keys()]) rejectPending(requestId, error);
  }

  worker.addEventListener("message", onMessage);
  worker.addEventListener?.("error", onError);

  function send(type, payload = {}) {
    if (disposed) {
      return Promise.reject(new SearchWorkerClientError("DISPOSED", "Search worker client has been disposed"));
    }
    if (type === "search" && latestSearchRequestId !== null) {
      rejectPending(
        latestSearchRequestId,
        new SearchWorkerClientError("SUPERSEDED", "Search request was superseded by a newer query")
      );
    }

    const requestId = nextRequestId++;
    const request = {
      protocolVersion: SEARCH_WORKER_PROTOCOL_VERSION,
      type,
      requestId,
      ...payload
    };
    try {
      assertSearchWorkerRequestV1(request);
    } catch (cause) {
      return Promise.reject(new SearchWorkerClientError("INVALID_REQUEST", "Search worker request is invalid", { cause }));
    }

    if (type === "search") latestSearchRequestId = requestId;
    const promise = new Promise((resolve, reject) => pending.set(requestId, { resolve, reject, type }));
    worker.postMessage(request);
    return promise;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    worker.removeEventListener("message", onMessage);
    worker.removeEventListener?.("error", onError);
    const error = new SearchWorkerClientError("DISPOSED", "Search worker client has been disposed");
    for (const requestId of [...pending.keys()]) rejectPending(requestId, error);
    worker.terminate();
  }

  return {
    dispose,
    initialize: (shards) => send("initialize", { shards }),
    search: (payload) => send("search", payload)
  };
}
