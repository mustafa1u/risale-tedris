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
  const shardCache = new Map();

  function cacheKey(reference) {
    return `${reference.slug}:${reference.contentHash}`;
  }

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

    const cachedShards = references.map((reference) => shardCache.get(cacheKey(reference)) ?? null);
    const current = {
      id: nextLoadId++,
      references: [...references],
      states: new Map(references.map((reference, index) => [
        reference.slug,
        cachedShards[index]
          ? { bookSlug: reference.slug, state: "ready", contentHash: reference.contentHash }
          : { bookSlug: reference.slug, state: "loading" }
      ])),
      controller: new AbortController(),
      abortCode: null,
      shards: cachedShards,
      newShardIndexes: new Set(),
      nextIndex: 0
    };
    activeLoad = current;
    emit(current);

    async function loadNext() {
      while (current.nextIndex < current.references.length) {
        const index = current.nextIndex++;
        const reference = current.references[index];
        if (current.shards[index]) continue;
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
          shardCache.set(cacheKey(reference), shard);
          current.shards[index] = shard;
          current.newShardIndexes.add(index);
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
        newShards: current.shards.filter((shard, index) => shard && current.newShardIndexes.has(index)),
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
    shardCache.clear();
  }

  return { dispose, load };
}
