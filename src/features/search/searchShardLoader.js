export class SearchShardLoadError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "SearchShardLoadError";
    this.code = code;
  }
}

function readinessFor(references, states) {
  const books = references.map((reference) => states.get(reference.slug) ?? { bookSlug: reference.slug, state: "idle" });
  const readyBookCount = books.filter((book) => book.state === "ready").length;
  return {
    selectedBookCount: books.length,
    readyBookCount,
    complete: books.length > 0 && readyBookCount === books.length,
    books
  };
}

export function createSearchShardLoader({
  fetchImpl = globalThis.fetch,
  concurrency = 2,
  onReadiness = () => {}
} = {}) {
  const concurrencyLimit = Math.max(1, Math.floor(concurrency));
  let activeLoad = null;
  let nextLoadId = 1;
  let disposed = false;

  function emit(load) {
    if (!disposed && activeLoad === load) {
      onReadiness(readinessFor(load.references, load.states));
    }
  }

  async function load(references) {
    if (disposed) throw new SearchShardLoadError("DISPOSED", "Search shard loader has been disposed");
    if (activeLoad) {
      activeLoad.abortCode = "SUPERSEDED";
      activeLoad.controller.abort();
    }

    const seenBooks = new Set();
    for (const reference of references) {
      if (seenBooks.has(reference.slug)) {
        throw new SearchShardLoadError("DUPLICATE_SHARD", `Duplicate search shard reference: ${reference.slug}`);
      }
      seenBooks.add(reference.slug);
    }

    const current = {
      id: nextLoadId++,
      references: [...references],
      states: new Map(references.map((reference) => [reference.slug, { bookSlug: reference.slug, state: "loading" }])),
      controller: new AbortController(),
      abortCode: null,
      shards: new Array(references.length),
      nextIndex: 0
    };
    activeLoad = current;
    emit(current);

    async function loadNext() {
      while (current.nextIndex < current.references.length) {
        const index = current.nextIndex++;
        const reference = current.references[index];
        try {
          const response = await fetchImpl(reference.shardUrl, { signal: current.controller.signal });
          if (!response?.ok) {
            throw new SearchShardLoadError("HTTP_ERROR", `Search shard request failed for ${reference.slug}`);
          }
          const shard = await response.json();
          if (shard?.bookSlug !== reference.slug || shard?.contentHash !== reference.contentHash) {
            throw new SearchShardLoadError("SHARD_MISMATCH", `Search shard identity mismatch for ${reference.slug}`);
          }
          if (activeLoad !== current || disposed) continue;
          current.shards[index] = shard;
          current.states.set(reference.slug, {
            bookSlug: reference.slug,
            state: "ready",
            contentHash: reference.contentHash
          });
          emit(current);
        } catch (cause) {
          if (current.controller.signal.aborted) {
            throw new SearchShardLoadError(
              current.abortCode ?? (disposed ? "DISPOSED" : "SUPERSEDED"),
              disposed ? "Search shard loader has been disposed" : "Search shard load was superseded",
              { cause }
            );
          }
          if (activeLoad !== current || disposed) continue;
          current.states.set(reference.slug, {
            bookSlug: reference.slug,
            state: "failed",
            errorCode: cause?.code ?? "SHARD_LOAD_FAILED"
          });
          emit(current);
        }
      }
    }

    try {
      await Promise.all(
        Array.from({ length: Math.min(concurrencyLimit, references.length) }, () => loadNext())
      );
      if (activeLoad !== current) {
        throw new SearchShardLoadError(current.abortCode ?? "SUPERSEDED", "Search shard load was superseded");
      }
      return {
        shards: current.shards.filter(Boolean),
        readiness: readinessFor(current.references, current.states)
      };
    } finally {
      if (activeLoad === current) activeLoad = null;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (activeLoad) {
      activeLoad.abortCode = "DISPOSED";
      activeLoad.controller.abort();
    }
  }

  return { dispose, load };
}
