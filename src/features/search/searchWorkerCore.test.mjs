import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { createSearchWorkerCore } from "./searchWorkerCore.js";

const generatedAt = "2026-07-13T00:00:00.000Z";

function hashSemanticShard(shard) {
  const semantic = {
    schemaVersion: shard.schemaVersion,
    bookSlug: shard.bookSlug,
    bookTitle: shard.bookTitle,
    records: shard.records
  };
  return createHash("sha256").update(JSON.stringify(semantic), "utf8").digest("hex");
}

function makeShard(bookSlug, text = "İman ve nur") {
  const shard = {
    schemaVersion: 1,
    generatedAt,
    bookSlug,
    bookTitle: `${bookSlug} kitabı`,
    contentHash: "0".repeat(64),
    records: [
      {
        partNo: "p01",
        partNumber: 1,
        title: "İman",
        labelSlug: "iman",
        gradeSlugs: ["8-sinif"],
        text
      }
    ]
  };
  shard.contentHash = hashSemanticShard(shard);
  return shard;
}

describe("search worker core initialization", () => {
  it("initializes one or several valid shards with explicit readiness", async () => {
    const core = createSearchWorkerCore();
    const first = makeShard("first-book");
    const second = makeShard("second-book", "Rahmet ve hikmet");

    assert.deepEqual(await core.initialize([first]), {
      selectedBookCount: 1,
      readyBookCount: 1,
      complete: true,
      books: [{ bookSlug: "first-book", state: "ready", contentHash: first.contentHash }]
    });
    const readiness = await core.initialize([second]);
    assert.equal(readiness.selectedBookCount, 2);
    assert.equal(readiness.readyBookCount, 2);
    assert.equal(readiness.complete, true);
    assert.deepEqual(readiness.books.map((book) => book.bookSlug), ["first-book", "second-book"]);
  });

  it("does not analyze an unchanged shard twice or when switching selected context", async () => {
    let analysisCount = 0;
    const core = createSearchWorkerCore({
      analyzeRecord(record) {
        analysisCount += 1;
        return { record };
      }
    });
    const shard = makeShard("cached-book");

    await core.initialize([shard]);
    await core.initialize([structuredClone(shard)]);
    const globalReadiness = core.getReadiness(["cached-book"]);
    const bookReadiness = core.getReadiness(["cached-book"]);

    assert.equal(analysisCount, 1);
    assert.deepEqual(globalReadiness, bookReadiness);
    assert.equal(core.getAnalyzedBook("cached-book").records[0].record.text, "İman ve nur");
  });

  it("rejects duplicate shards, invalid schemas, and mismatched content hashes", async () => {
    const core = createSearchWorkerCore();
    const valid = makeShard("fixture-book");

    await assert.rejects(
      core.initialize([valid, structuredClone(valid)]),
      (error) => error.code === "DUPLICATE_SHARD"
    );
    await assert.rejects(
      core.initialize([{ ...valid, schemaVersion: 2 }]),
      (error) => error.code === "INVALID_SHARD" && error.cause?.path === "shards[0].schemaVersion"
    );
    await assert.rejects(
      core.initialize([{ ...valid, contentHash: "f".repeat(64) }]),
      (error) => error.code === "HASH_MISMATCH" && /fixture-book/.test(error.message)
    );
  });
});
