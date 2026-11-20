const STORAGE_PREFIX = "rissor:study-session:v1:";

function resolveLocalStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function studySessionStorageKey(deck) {
  const parts = [deck?.bookSlug, deck?.gradeSlug, deck?.partNo].map((value) => String(value ?? "").trim());
  return parts.every(Boolean) ? `${STORAGE_PREFIX}${parts.join(":")}` : null;
}

export function readStudySession(key, storage = null) {
  if (!key) return null;
  try {
    const value = resolveLocalStorage(storage)?.getItem(key);
    const session = value ? JSON.parse(value) : null;
    return session?.version === 1 ? session : null;
  } catch {
    return null;
  }
}

export function writeStudySession(key, session, storage = null) {
  if (!key || !session || typeof session !== "object") return false;
  try {
    const target = resolveLocalStorage(storage);
    if (!target) return false;
    target.setItem(key, JSON.stringify({ ...session, version: 1 }));
    return true;
  } catch {
    return false;
  }
}

export function clearStudySession(key, storage = null) {
  if (!key) return false;
  try {
    const target = resolveLocalStorage(storage);
    if (!target) return false;
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
