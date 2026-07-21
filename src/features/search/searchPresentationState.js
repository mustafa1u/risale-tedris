const SEARCH_EXPANDED_PREFIX = "rissor:search:expanded:";

function resolveSessionStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function storageKey(contextKey) {
  if (typeof contextKey !== "string" || contextKey.length === 0) {
    throw new TypeError("A search presentation context key is required");
  }
  return `${SEARCH_EXPANDED_PREFIX}${contextKey}`;
}

export function readSearchExpandedState(contextKey, storage = null) {
  try {
    return resolveSessionStorage(storage)?.getItem(storageKey(contextKey)) === "1";
  } catch {
    return false;
  }
}

export function writeSearchExpandedState(contextKey, expanded, storage = null) {
  if (typeof expanded !== "boolean") {
    throw new TypeError("Search expanded state must be a boolean");
  }
  try {
    resolveSessionStorage(storage)?.setItem(storageKey(contextKey), expanded ? "1" : "0");
  } catch {
    // Presentation persistence is optional when browser storage is unavailable.
  }
  return expanded;
}
