import {
  SEARCH_WORKER_PROTOCOL_VERSION,
  assertSearchWorkerRequestV1,
  assertSearchWorkerResponseV1
} from "./searchContracts.js";

function safeRequestId(request) {
  return Number.isSafeInteger(request?.requestId) && request.requestId >= 0 ? request.requestId : 0;
}

function errorResponse(request, error) {
  const response = {
    protocolVersion: SEARCH_WORKER_PROTOCOL_VERSION,
    type: "error",
    requestId: safeRequestId(request),
    errorCode: error?.code ?? (error?.name === "SearchContractError" ? "INVALID_REQUEST" : "WORKER_ERROR"),
    message: error?.message || "Search worker request failed"
  };
  assertSearchWorkerResponseV1(response);
  return response;
}

export async function handleSearchWorkerRequest(core, request) {
  try {
    assertSearchWorkerRequestV1(request);
    if (request.type === "initialize") {
      const readiness = await core.initialize(request.shards);
      const response = {
        protocolVersion: SEARCH_WORKER_PROTOCOL_VERSION,
        type: "readiness",
        requestId: request.requestId,
        readiness
      };
      assertSearchWorkerResponseV1(response);
      return response;
    }
    if (request.type === "dispose") {
      core.dispose();
      const response = {
        protocolVersion: SEARCH_WORKER_PROTOCOL_VERSION,
        type: "readiness",
        requestId: request.requestId,
        readiness: { selectedBookCount: 0, readyBookCount: 0, complete: false, books: [] }
      };
      assertSearchWorkerResponseV1(response);
      return response;
    }
    const outcome = core.search(request);
    const response = {
      protocolVersion: SEARCH_WORKER_PROTOCOL_VERSION,
      type: "results",
      requestId: request.requestId,
      readiness: outcome.readiness,
      results: outcome.results,
      total: outcome.total
    };
    assertSearchWorkerResponseV1(response);
    return response;
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function createSearchWorkerMessageHandler({ core, postMessage }) {
  return async function onSearchWorkerMessage(eventOrRequest) {
    const request = eventOrRequest?.data ?? eventOrRequest;
    postMessage(await handleSearchWorkerRequest(core, request));
  };
}
