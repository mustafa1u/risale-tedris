import { assertBookSearchShardV1 } from "./searchContracts.js";
import { analyzeSearchRecord, searchAnalyzedBooks } from "./searchEngine.js";

export class SearchWorkerCoreError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "SearchWorkerCoreError";
    this.code = code;
  }
}

function semanticShard(shard) {
  return {
    schemaVersion: shard.schemaVersion,
    bookSlug: shard.bookSlug,
    bookTitle: shard.bookTitle,
    records: shard.records
  };
}

async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) {
    throw new SearchWorkerCoreError("CRYPTO_UNAVAILABLE", "SHA-256 validation is unavailable in this worker");
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function validateShardHash(shard) {
  const actualHash = await sha256Hex(JSON.stringify(semanticShard(shard)));
  if (actualHash !== shard.contentHash) {
    throw new SearchWorkerCoreError(
      "HASH_MISMATCH",
      `Search shard content hash mismatch for ${shard.bookSlug}: expected ${shard.contentHash}, received ${actualHash}`
    );
  }
}

export function createSearchWorkerCore({ analyzeRecord = analyzeSearchRecord } = {}) {
  const analyzedByKey = new Map();
  const currentKeyByBook = new Map();
  const bookOrder = [];
  let disposed = false;

  function assertActive() {
    if (disposed) {
      throw new SearchWorkerCoreError("DISPOSED", "Search worker core has been disposed");
    }
  }

  function getReadiness(selectedBookSlugs = bookOrder) {
    const books = selectedBookSlugs.map((bookSlug) => {
      const key = currentKeyByBook.get(bookSlug);
      if (!key) {
        return { bookSlug, state: "idle" };
      }
      return {
        bookSlug,
        state: "ready",
        contentHash: analyzedByKey.get(key).contentHash
      };
    });
    const readyBookCount = books.filter((book) => book.state === "ready").length;
    return {
      selectedBookCount: books.length,
      readyBookCount,
      complete: books.length > 0 && readyBookCount === books.length,
      books
    };
  }

  async function initialize(shards) {
    assertActive();
    if (!Array.isArray(shards) || shards.length === 0) {
      throw new SearchWorkerCoreError("INVALID_SHARD", "At least one search shard is required");
    }

    const seenBooks = new Set();
    for (const [index, shard] of shards.entries()) {
      if (seenBooks.has(shard?.bookSlug)) {
        throw new SearchWorkerCoreError("DUPLICATE_SHARD", `Duplicate search shard: ${shard?.bookSlug ?? "unknown"}`);
      }
      seenBooks.add(shard?.bookSlug);
      try {
        assertBookSearchShardV1(shard, `shards[${index}]`);
      } catch (cause) {
        throw new SearchWorkerCoreError("INVALID_SHARD", `Invalid search shard at index ${index}`, { cause });
      }
    }

    await Promise.all(shards.map((shard) => validateShardHash(shard)));
    for (const shard of shards) {
      const key = `${shard.bookSlug}:${shard.contentHash}`;
      if (!analyzedByKey.has(key)) {
        analyzedByKey.set(key, {
          bookSlug: shard.bookSlug,
          bookTitle: shard.bookTitle,
          contentHash: shard.contentHash,
          records: shard.records.map((record) => analyzeRecord(record))
        });
      }
      if (!currentKeyByBook.has(shard.bookSlug)) {
        bookOrder.push(shard.bookSlug);
      }
      currentKeyByBook.set(shard.bookSlug, key);
    }
    return getReadiness();
  }

  function getAnalyzedBook(bookSlug) {
    assertActive();
    const key = currentKeyByBook.get(bookSlug);
    return key ? analyzedByKey.get(key) : null;
  }

  function search(request) {
    assertActive();
    const books = request.selectedBookSlugs
      .map((bookSlug) => getAnalyzedBook(bookSlug))
      .filter(Boolean);
    return {
      ...searchAnalyzedBooks(books, request),
      readiness: getReadiness(request.selectedBookSlugs)
    };
  }

  function dispose() {
    disposed = true;
    analyzedByKey.clear();
    currentKeyByBook.clear();
    bookOrder.length = 0;
  }

  return {
    dispose,
    getAnalyzedBook,
    getReadiness,
    initialize,
    search
  };
}
