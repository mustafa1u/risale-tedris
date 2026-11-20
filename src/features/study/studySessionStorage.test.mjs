import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clearStudySession,
  readStudySession,
  studySessionStorageKey,
  writeStudySession
} from "./studySessionStorage.js";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
}

describe("study session storage", () => {
  it("keeps sessions separate for each deck and clears only the requested session", () => {
    const storage = createStorage();
    const firstKey = studySessionStorageKey({ bookSlug: "11-soz", gradeSlug: "8-sinif", partNo: "p09" });
    const secondKey = studySessionStorageKey({ bookSlug: "11-soz", gradeSlug: "8-sinif", partNo: "p10" });

    assert.equal(writeStudySession(firstKey, { queue: { currentId: "S1Q1" } }, storage), true);
    assert.equal(writeStudySession(secondKey, { queue: { currentId: "S1Q2" } }, storage), true);
    assert.equal(readStudySession(firstKey, storage).queue.currentId, "S1Q1");
    assert.equal(clearStudySession(firstKey, storage), true);
    assert.equal(readStudySession(firstKey, storage), null);
    assert.equal(readStudySession(secondKey, storage).queue.currentId, "S1Q2");
  });
});
