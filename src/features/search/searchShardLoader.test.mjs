import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSearchShardLoader } from "./searchShardLoader.js";

function makeReference(bookSlug) {
  return {
    slug: bookSlug,
    title: `${bookSlug} kitabı`,
    shardUrl: `/assets/search/${bookSlug}.json`,
    contentHash: "a".repeat(64),
    recordCount: 1,
    rawBytes: 10
  };
}

function responseFor(reference) {
  return {
    ok: true,
    async json() {
      return { bookSlug: reference.slug, contentHash: reference.contentHash };
    }
  };
}

describe("search shard loader", () => {
  it("bounds concurrent homepage loading and naturally uses one request for book context", async () => {
    let active = 0;
    let maximumActive = 0;
    const references = ["one", "two", "three", "four"].map(makeReference);
    const fetchImpl = async (url) => {
      const reference = references.find((item) => item.shardUrl === url);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return responseFor(reference);
    };
    const readinessEvents = [];
    const loader = createSearchShardLoader({ fetchImpl, concurrency: 2, onReadiness: (state) => readinessEvents.push(state) });

    const global = await loader.load(references);
    assert.equal(maximumActive, 2);
    assert.equal(global.shards.length, 4);
    assert.equal(global.readiness.complete, true);
    assert.equal(readinessEvents[0].books.every((book) => book.state === "loading"), true);

    const book = await loader.load([references[0]]);
    assert.equal(book.shards.length, 1);
    assert.deepEqual(book.readiness.books.map((entry) => entry.bookSlug), ["one"]);
  });

  it("aborts superseded loads without publishing their late state", async () => {
    const oldReference = makeReference("old-book");
    const newReference = makeReference("new-book");
    const events = [];
    const fetchImpl = (url, { signal }) => {
      if (url === newReference.shardUrl) return Promise.resolve(responseFor(newReference));
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    };
    const loader = createSearchShardLoader({ fetchImpl, onReadiness: (state) => events.push(state) });
    const oldLoad = loader.load([oldReference]);
    const oldRejection = assert.rejects(oldLoad, (error) => error.code === "SUPERSEDED");
    await Promise.resolve();
    const newLoad = loader.load([newReference]);

    await oldRejection;
    assert.equal((await newLoad).readiness.complete, true);
    assert.equal(events.some((state) => state.books.some((book) => book.bookSlug === "old-book" && book.state === "failed")), false);
  });

  it("ignores network completion after disposal", async () => {
    const reference = makeReference("disposed-book");
    const events = [];
    const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
    const loader = createSearchShardLoader({ fetchImpl, onReadiness: (state) => events.push(state) });
    const load = loader.load([reference]);
    const rejection = assert.rejects(load, (error) => error.code === "DISPOSED");
    const eventCountBeforeDispose = events.length;

    loader.dispose();
    await rejection;
    await Promise.resolve();
    assert.equal(events.length, eventCountBeforeDispose);
  });
});
