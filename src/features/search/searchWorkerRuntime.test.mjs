import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { createSearchWorkerClient } from "./searchWorkerClient.js";
import { createSearchWorkerCore } from "./searchWorkerCore.js";
import { handleSearchWorkerRequest } from "./searchWorkerRuntime.js";

function makeShard(bookSlug = "fixture-book") {
  const shard = {
    schemaVersion: 1,
    generatedAt: "2026-07-13T00:00:00.000Z",
    bookSlug,
    bookTitle: "Fixture Kitabı",
    contentHash: "0".repeat(64),
    records: [{
      partNo: "p01",
      partNumber: 1,
      title: "İman",
      labelSlug: "iman",
      gradeSlugs: ["8-sinif"],
      text: "İman ve nur"
    }]
  };
  const semantic = {
    schemaVersion: shard.schemaVersion,
    bookSlug: shard.bookSlug,
    bookTitle: shard.bookTitle,
    records: shard.records
  };
  shard.contentHash = createHash("sha256").update(JSON.stringify(semantic), "utf8").digest("hex");
  return shard;
}

function makeSearchPayload() {
  return {
    query: "iman",
    context: "global",
    mode: "all",
    scopes: ["text", "title", "partNo"],
    selectedBookSlugs: ["fixture-book"],
    gradeSlug: null,
    proximityDistance: 5,
    limit: 50
  };
}

class FakeWorker {
  constructor() {
    this.listeners = new Set();
    this.messages = [];
    this.terminated = false;
  }

  addEventListener(type, listener) {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(type, listener) {
    if (type === "message") this.listeners.delete(listener);
  }

  postMessage(message) {
    this.messages.push(message);
  }

  emit(data) {
    for (const listener of this.listeners) listener({ data });
  }

  terminate() {
    this.terminated = true;
  }
}

describe("search worker runtime", () => {
  it("echoes request IDs through readiness and controlled errors", async () => {
    const core = createSearchWorkerCore();
    const shard = makeShard();
    const ready = await handleSearchWorkerRequest(core, {
      protocolVersion: 1,
      type: "initialize",
      requestId: 41,
      shards: [shard]
    });
    const failed = await handleSearchWorkerRequest(createSearchWorkerCore(), {
      protocolVersion: 1,
      type: "initialize",
      requestId: 42,
      shards: [{ ...shard, contentHash: "f".repeat(64) }]
    });

    assert.equal(ready.type, "readiness");
    assert.equal(ready.requestId, 41);
    assert.equal(ready.readiness.complete, true);
    assert.deepEqual(failed, {
      protocolVersion: 1,
      type: "error",
      requestId: 42,
      errorCode: "HASH_MISMATCH",
      message: failed.message
    });
    assert.match(failed.message, /fixture-book/);
  });

  it("executes the default all-words engine through the worker protocol", async () => {
    const core = createSearchWorkerCore();
    await core.initialize([makeShard()]);

    const response = await handleSearchWorkerRequest(core, {
      protocolVersion: 1,
      type: "search",
      requestId: 43,
      ...makeSearchPayload()
    });

    assert.equal(response.type, "results");
    assert.equal(response.requestId, 43);
    assert.equal(response.total, 1);
    assert.equal(response.results[0].partNo, "p01");
    assert.deepEqual(response.results[0].matchedFields, ["text", "title"]);
  });
});

describe("search worker client", () => {
  it("assigns request IDs and suppresses stale search responses", async () => {
    const worker = new FakeWorker();
    const client = createSearchWorkerClient({ worker });
    const first = client.search(makeSearchPayload());
    const firstRejection = assert.rejects(first, (error) => error.code === "SUPERSEDED");
    const second = client.search({ ...makeSearchPayload(), query: "nur" });

    assert.deepEqual(worker.messages.map((message) => message.requestId), [1, 2]);
    worker.emit({
      protocolVersion: 1,
      type: "results",
      requestId: 1,
      readiness: { selectedBookCount: 1, readyBookCount: 1, complete: true, books: [{ bookSlug: "fixture-book", state: "ready", contentHash: "a".repeat(64) }] },
      results: [],
      total: 0
    });
    worker.emit({
      protocolVersion: 1,
      type: "results",
      requestId: 2,
      readiness: { selectedBookCount: 1, readyBookCount: 1, complete: true, books: [{ bookSlug: "fixture-book", state: "ready", contentHash: "a".repeat(64) }] },
      results: [],
      total: 0
    });

    await firstRejection;
    assert.equal((await second).requestId, 2);
  });

  it("rejects pending work and ignores late responses after disposal", async () => {
    const worker = new FakeWorker();
    const client = createSearchWorkerClient({ worker });
    const pending = client.search(makeSearchPayload());
    const rejection = assert.rejects(pending, (error) => error.code === "DISPOSED");

    client.dispose();
    worker.emit({ protocolVersion: 1, type: "error", requestId: 1, errorCode: "LATE" });

    await rejection;
    assert.equal(worker.terminated, true);
    assert.equal(worker.listeners.size, 0);
  });
});
