import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  readSearchExpandedState,
  writeSearchExpandedState
} from "./searchPresentationState.js";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(values);
    }
  };
}

describe("search presentation state", () => {
  it("stores only an expanded flag per search context in session storage", () => {
    const storage = createStorage();

    assert.equal(readSearchExpandedState("global", storage), false);
    assert.equal(writeSearchExpandedState("global", true, storage), true);
    assert.equal(readSearchExpandedState("global", storage), true);
    assert.equal(writeSearchExpandedState("book:meyve-risalesi", false, storage), false);
    assert.deepEqual(storage.snapshot(), {
      "rissor:search:expanded:global": "1",
      "rissor:search:expanded:book:meyve-risalesi": "0"
    });
  });

  it("does not contain query or persistent local-storage behavior", async () => {
    const source = await readFile(new URL("./searchPresentationState.js", import.meta.url), "utf8");

    assert.doesNotMatch(source, /query|localStorage/);
    assert.match(source, /sessionStorage/);
  });
});
