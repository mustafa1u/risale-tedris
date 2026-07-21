import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SEARCH_SCHEMA_VERSION,
  SEARCH_WORKER_PROTOCOL_VERSION,
  assertBookSearchShardV1,
  assertGlobalSearchManifestV1,
  assertHighlightRangeV1,
  assertParserErrorV1,
  assertPartialFailureV1,
  assertSearchReadinessV1,
  assertSearchResultV1,
  assertSearchWorkerRequestV1,
  assertSearchWorkerResponseV1
} from "./searchContracts.js";

const contentHash = "a".repeat(64);

function makeShard() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-13T00:00:00.000Z",
    bookSlug: "arama-fixture",
    bookTitle: "Arama Deneme Kitabı",
    contentHash,
    records: [
      {
        partNo: "p01",
        partNumber: 1,
        title: "İman ve nur",
        labelSlug: "iman-ve-nur",
        gradeSlugs: ["8-sinif"],
        text: "İman ve nur birlikte anılır."
      }
    ]
  };
}

function makeReadiness() {
  return {
    selectedBookCount: 1,
    readyBookCount: 1,
    complete: true,
    books: [
      { bookSlug: "arama-fixture", state: "ready", contentHash }
    ]
  };
}

function makeResult() {
  return {
    bookSlug: "arama-fixture",
    bookTitle: "Arama Deneme Kitabı",
    partNo: "p01",
    partNumber: 1,
    title: "İman ve nur",
    score: 42,
    matchedFields: ["title", "text"],
    excerpt: "İman ve nur birlikte anılır.",
    highlightRanges: [{ start: 0, end: 4 }]
  };
}

describe("search data contracts", () => {
  it("accepts a versioned global manifest and book shard", () => {
    const manifest = {
      schemaVersion: 1,
      generatedAt: "2026-07-13T00:00:00.000Z",
      books: [
        {
          slug: "arama-fixture",
          title: "Arama Deneme Kitabı",
          shardUrl: `/assets/search/arama-fixture.${contentHash}.v1.json`,
          contentHash,
          recordCount: 1,
          rawBytes: 64
        }
      ]
    };
    const shard = makeShard();

    assert.equal(SEARCH_SCHEMA_VERSION, 1);
    assert.equal(assertGlobalSearchManifestV1(manifest), manifest);
    assert.equal(assertBookSearchShardV1(shard), shard);
  });

  it("rejects future schemas and malformed shard records with useful paths", () => {
    assert.throws(
      () => assertGlobalSearchManifestV1({ schemaVersion: 2, generatedAt: "now", books: [] }),
      /manifest\.schemaVersion/
    );
    const shard = makeShard();
    delete shard.records[0].text;
    assert.throws(() => assertBookSearchShardV1(shard), /shard\.records\[0\]\.text/);
  });
});

describe("search result and status contracts", () => {
  it("accepts safe excerpt ranges, results, readiness, partial failure, and parser errors", () => {
    const range = { start: 0, end: 4 };
    const result = makeResult();
    const readiness = makeReadiness();
    const partialFailure = {
      protocolVersion: 1,
      type: "partial-failure",
      requestId: 4,
      readiness: {
        selectedBookCount: 2,
        readyBookCount: 1,
        complete: false,
        books: [
          { bookSlug: "arama-fixture", state: "ready", contentHash },
          { bookSlug: "missing-book", state: "failed", errorCode: "SHARD_FETCH_FAILED" }
        ]
      },
      failedBooks: [{ bookSlug: "missing-book", errorCode: "SHARD_FETCH_FAILED" }],
      results: [result],
      total: 1
    };
    const parserError = {
      protocolVersion: 1,
      type: "parser-error",
      requestId: 5,
      code: "UNEXPECTED_TOKEN",
      position: 4,
      length: 1
    };

    assert.equal(assertHighlightRangeV1(range), range);
    assert.equal(assertSearchResultV1(result), result);
    assert.equal(assertSearchReadinessV1(readiness), readiness);
    assert.equal(assertPartialFailureV1(partialFailure), partialFailure);
    assert.equal(assertParserErrorV1(parserError), parserError);
  });

  it("rejects unsafe ranges, unknown fields/states, and invalid parser positions", () => {
    assert.throws(() => assertHighlightRangeV1({ start: 4, end: 4 }), /range\.end/);
    assert.throws(
      () => assertSearchResultV1({ ...makeResult(), matchedFields: ["unknown"] }),
      /result\.matchedFields\[0\]/
    );
    const readiness = makeReadiness();
    readiness.books[0].state = "unknown";
    assert.throws(() => assertSearchReadinessV1(readiness), /readiness\.books\[0\]\.state/);
    assert.throws(
      () => assertParserErrorV1({ protocolVersion: 1, type: "parser-error", requestId: 1, code: "BAD", position: -1, length: 1 }),
      /parserError\.position/
    );
  });
});

describe("search worker protocol contracts", () => {
  it("accepts initialize/search requests and readiness/results responses", () => {
    const initializeRequest = {
      protocolVersion: 1,
      type: "initialize",
      requestId: 1,
      shards: [makeShard()]
    };
    const searchRequest = {
      protocolVersion: 1,
      type: "search",
      requestId: 2,
      query: "iman nur",
      context: "global",
      mode: "all",
      scopes: ["text", "title", "partNo"],
      selectedBookSlugs: ["arama-fixture"],
      gradeSlug: null,
      proximityDistance: 5,
      limit: 50
    };
    const readinessResponse = {
      protocolVersion: 1,
      type: "readiness",
      requestId: 1,
      readiness: makeReadiness()
    };
    const resultsResponse = {
      protocolVersion: 1,
      type: "results",
      requestId: 2,
      readiness: makeReadiness(),
      results: [makeResult()],
      total: 1
    };

    assert.equal(SEARCH_WORKER_PROTOCOL_VERSION, 1);
    assert.equal(assertSearchWorkerRequestV1(initializeRequest), initializeRequest);
    assert.equal(assertSearchWorkerRequestV1(searchRequest), searchRequest);
    assert.equal(assertSearchWorkerResponseV1(readinessResponse), readinessResponse);
    assert.equal(assertSearchWorkerResponseV1(resultsResponse), resultsResponse);
  });

  it("rejects unknown request types and empty scopes", () => {
    assert.throws(
      () => assertSearchWorkerRequestV1({ protocolVersion: 1, type: "unknown", requestId: 1 }),
      /request\.type/
    );
    assert.throws(
      () => assertSearchWorkerRequestV1({
        protocolVersion: 1,
        type: "search",
        requestId: 2,
        query: "iman",
        context: "global",
        mode: "all",
        scopes: [],
        selectedBookSlugs: ["arama-fixture"],
        gradeSlug: null,
        proximityDistance: 5,
        limit: 50
      }),
      /request\.scopes/
    );
  });
});
