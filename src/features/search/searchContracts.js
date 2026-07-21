export const SEARCH_SCHEMA_VERSION = 1;
export const SEARCH_WORKER_PROTOCOL_VERSION = 1;

export const SEARCH_MODES = Object.freeze(["all", "exact", "boolean", "wildcard", "proximity"]);
export const SEARCH_SCOPES = Object.freeze(["text", "title", "partNo"]);
export const SEARCH_CONTEXTS = Object.freeze(["global", "book"]);
export const SEARCH_PROXIMITY_DISTANCES = Object.freeze([3, 5, 10, 20]);
export const SEARCH_BOOK_STATES = Object.freeze(["idle", "loading", "ready", "failed"]);
export const SEARCH_MATCHED_FIELDS = SEARCH_SCOPES;

export class SearchContractError extends TypeError {
  constructor(path, expectation) {
    super(`${path}: ${expectation}`);
    this.name = "SearchContractError";
    this.path = path;
  }
}

function fail(path, expectation) {
  throw new SearchContractError(path, expectation);
}

function assertObject(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "expected an object");
  }
  return value;
}

function assertArray(value, path, { minLength = 0 } = {}) {
  if (!Array.isArray(value)) {
    fail(path, "expected an array");
  }
  if (value.length < minLength) {
    fail(path, `expected at least ${minLength} item(s)`);
  }
  return value;
}

function assertString(value, path, { allowEmpty = false, maxCodePoints } = {}) {
  if (typeof value !== "string") {
    fail(path, "expected a string");
  }
  if (!allowEmpty && value.trim().length === 0) {
    fail(path, "expected a non-empty string");
  }
  if (maxCodePoints !== undefined && [...value].length > maxCodePoints) {
    fail(path, `expected no more than ${maxCodePoints} Unicode code points`);
  }
  return value;
}

function assertInteger(value, path, { minimum = Number.MIN_SAFE_INTEGER, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(path, `expected an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function assertFiniteNumber(value, path, { minimum = -Infinity } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    fail(path, `expected a finite number no smaller than ${minimum}`);
  }
  return value;
}

function assertBoolean(value, path) {
  if (typeof value !== "boolean") {
    fail(path, "expected a boolean");
  }
  return value;
}

function assertEnum(value, allowedValues, path) {
  if (!allowedValues.includes(value)) {
    fail(path, `expected one of: ${allowedValues.join(", ")}`);
  }
  return value;
}

function assertVersion(value, expectedVersion, path) {
  if (value !== expectedVersion) {
    fail(path, `expected version ${expectedVersion}`);
  }
  return value;
}

function assertContentHash(value, path) {
  assertString(value, path);
  if (!/^[a-f0-9]{64}$/.test(value)) {
    fail(path, "expected a lowercase SHA-256 hex digest");
  }
  return value;
}

function assertGeneratedAt(value, path) {
  assertString(value, path);
  if (!Number.isFinite(Date.parse(value))) {
    fail(path, "expected an ISO-compatible date-time string");
  }
  return value;
}

function assertUniqueStrings(value, path, { allowedValues, minLength = 0 } = {}) {
  const items = assertArray(value, path, { minLength });
  const seen = new Set();

  items.forEach((item, index) => {
    assertString(item, `${path}[${index}]`);
    if (allowedValues) {
      assertEnum(item, allowedValues, `${path}[${index}]`);
    }
    if (seen.has(item)) {
      fail(`${path}[${index}]`, "expected a unique value");
    }
    seen.add(item);
  });

  return items;
}

function assertProtocolEnvelope(value, expectedType, path) {
  const envelope = assertObject(value, path);
  assertVersion(envelope.protocolVersion, SEARCH_WORKER_PROTOCOL_VERSION, `${path}.protocolVersion`);
  if (expectedType) {
    assertEnum(envelope.type, [expectedType], `${path}.type`);
  } else {
    assertString(envelope.type, `${path}.type`);
  }
  assertInteger(envelope.requestId, `${path}.requestId`, { minimum: 0 });
  return envelope;
}

function assertBookManifestEntryV1(value, path) {
  const entry = assertObject(value, path);
  assertString(entry.slug, `${path}.slug`);
  assertString(entry.title, `${path}.title`);
  assertString(entry.shardUrl, `${path}.shardUrl`);
  if (!entry.shardUrl.startsWith("/assets/search/") || !entry.shardUrl.endsWith(".json")) {
    fail(`${path}.shardUrl`, "expected a root-relative JSON search asset URL");
  }
  assertContentHash(entry.contentHash, `${path}.contentHash`);
  assertInteger(entry.recordCount, `${path}.recordCount`, { minimum: 0 });
  assertInteger(entry.rawBytes, `${path}.rawBytes`, { minimum: 0 });
  return entry;
}

function assertBookSearchRecordV1(value, path) {
  const record = assertObject(value, path);
  assertString(record.partNo, `${path}.partNo`);
  assertInteger(record.partNumber, `${path}.partNumber`, { minimum: 0 });
  assertString(record.title, `${path}.title`);
  assertString(record.labelSlug, `${path}.labelSlug`);
  assertUniqueStrings(record.gradeSlugs, `${path}.gradeSlugs`);
  assertString(record.text, `${path}.text`, { allowEmpty: true });
  return record;
}

export function assertGlobalSearchManifestV1(value, path = "manifest") {
  const manifest = assertObject(value, path);
  assertVersion(manifest.schemaVersion, SEARCH_SCHEMA_VERSION, `${path}.schemaVersion`);
  assertGeneratedAt(manifest.generatedAt, `${path}.generatedAt`);
  const books = assertArray(manifest.books, `${path}.books`);
  books.forEach((book, index) => assertBookManifestEntryV1(book, `${path}.books[${index}]`));
  return manifest;
}

export function assertBookSearchShardV1(value, path = "shard") {
  const shard = assertObject(value, path);
  assertVersion(shard.schemaVersion, SEARCH_SCHEMA_VERSION, `${path}.schemaVersion`);
  assertGeneratedAt(shard.generatedAt, `${path}.generatedAt`);
  assertString(shard.bookSlug, `${path}.bookSlug`);
  assertString(shard.bookTitle, `${path}.bookTitle`);
  assertContentHash(shard.contentHash, `${path}.contentHash`);
  const records = assertArray(shard.records, `${path}.records`);
  records.forEach((record, index) => assertBookSearchRecordV1(record, `${path}.records[${index}]`));
  return shard;
}

export function assertHighlightRangeV1(value, path = "range") {
  const range = assertObject(value, path);
  assertInteger(range.start, `${path}.start`, { minimum: 0 });
  assertInteger(range.end, `${path}.end`, { minimum: 0 });
  if (range.end <= range.start) {
    fail(`${path}.end`, "expected end to be greater than start");
  }
  return range;
}

export function assertSearchResultV1(value, path = "result") {
  const result = assertObject(value, path);
  assertString(result.bookSlug, `${path}.bookSlug`);
  assertString(result.bookTitle, `${path}.bookTitle`);
  assertString(result.partNo, `${path}.partNo`);
  assertInteger(result.partNumber, `${path}.partNumber`, { minimum: 0 });
  assertString(result.title, `${path}.title`);
  assertFiniteNumber(result.score, `${path}.score`, { minimum: 0 });
  assertUniqueStrings(result.matchedFields, `${path}.matchedFields`, {
    allowedValues: SEARCH_MATCHED_FIELDS
  });

  if (result.excerpt !== undefined) {
    assertString(result.excerpt, `${path}.excerpt`, { allowEmpty: true });
  }
  if (result.highlightRanges !== undefined) {
    if (result.excerpt === undefined) {
      fail(`${path}.highlightRanges`, "expected excerpt when highlight ranges are present");
    }
    const ranges = assertArray(result.highlightRanges, `${path}.highlightRanges`);
    let previousEnd = 0;
    ranges.forEach((range, index) => {
      assertHighlightRangeV1(range, `${path}.highlightRanges[${index}]`);
      if (range.start < previousEnd) {
        fail(`${path}.highlightRanges[${index}].start`, "expected ordered, non-overlapping ranges");
      }
      if (range.end > result.excerpt.length) {
        fail(`${path}.highlightRanges[${index}].end`, "expected range within excerpt bounds");
      }
      previousEnd = range.end;
    });
  }
  return result;
}

function assertBookReadinessV1(value, path) {
  const book = assertObject(value, path);
  assertString(book.bookSlug, `${path}.bookSlug`);
  assertEnum(book.state, SEARCH_BOOK_STATES, `${path}.state`);

  if (book.contentHash !== undefined) {
    assertContentHash(book.contentHash, `${path}.contentHash`);
  }
  if (book.state === "ready" && book.contentHash === undefined) {
    fail(`${path}.contentHash`, "expected a content hash for a ready book");
  }
  if (book.errorCode !== undefined) {
    assertString(book.errorCode, `${path}.errorCode`);
  }
  if (book.state === "failed" && book.errorCode === undefined) {
    fail(`${path}.errorCode`, "expected an error code for a failed book");
  }
  return book;
}

export function assertSearchReadinessV1(value, path = "readiness") {
  const readiness = assertObject(value, path);
  assertInteger(readiness.selectedBookCount, `${path}.selectedBookCount`, { minimum: 0 });
  assertInteger(readiness.readyBookCount, `${path}.readyBookCount`, { minimum: 0 });
  assertBoolean(readiness.complete, `${path}.complete`);
  const books = assertArray(readiness.books, `${path}.books`);
  books.forEach((book, index) => assertBookReadinessV1(book, `${path}.books[${index}]`));

  const actualReadyCount = books.filter((book) => book.state === "ready").length;
  if (readiness.selectedBookCount !== books.length) {
    fail(`${path}.selectedBookCount`, "expected the number of readiness book entries");
  }
  if (readiness.readyBookCount !== actualReadyCount) {
    fail(`${path}.readyBookCount`, "expected the number of ready books");
  }
  if (readiness.complete !== (books.length > 0 && actualReadyCount === books.length)) {
    fail(`${path}.complete`, "expected true only when every selected book is ready");
  }
  return readiness;
}

function assertFailedBookV1(value, path) {
  const failure = assertObject(value, path);
  assertString(failure.bookSlug, `${path}.bookSlug`);
  assertString(failure.errorCode, `${path}.errorCode`);
  return failure;
}

export function assertPartialFailureV1(value, path = "partialFailure") {
  const response = assertProtocolEnvelope(value, "partial-failure", path);
  assertSearchReadinessV1(response.readiness, `${path}.readiness`);
  if (response.readiness.complete) {
    fail(`${path}.readiness.complete`, "expected partial readiness");
  }
  const failedBooks = assertArray(response.failedBooks, `${path}.failedBooks`, { minLength: 1 });
  failedBooks.forEach((failure, index) => assertFailedBookV1(failure, `${path}.failedBooks[${index}]`));
  const results = assertArray(response.results, `${path}.results`);
  results.forEach((result, index) => assertSearchResultV1(result, `${path}.results[${index}]`));
  assertInteger(response.total, `${path}.total`, { minimum: results.length });
  return response;
}

export function assertParserErrorV1(value, path = "parserError") {
  const response = assertProtocolEnvelope(value, "parser-error", path);
  assertString(response.code, `${path}.code`);
  assertInteger(response.position, `${path}.position`, { minimum: 0 });
  assertInteger(response.length, `${path}.length`, { minimum: 1 });
  return response;
}

function assertInitializeRequestV1(request, path) {
  const shards = assertArray(request.shards, `${path}.shards`, { minLength: 1 });
  shards.forEach((shard, index) => assertBookSearchShardV1(shard, `${path}.shards[${index}]`));
  return request;
}

function assertSearchRequestV1(request, path) {
  assertString(request.query, `${path}.query`, { allowEmpty: true, maxCodePoints: 256 });
  assertEnum(request.context, SEARCH_CONTEXTS, `${path}.context`);
  assertEnum(request.mode, SEARCH_MODES, `${path}.mode`);
  assertUniqueStrings(request.scopes, `${path}.scopes`, { allowedValues: SEARCH_SCOPES, minLength: 1 });
  assertUniqueStrings(request.selectedBookSlugs, `${path}.selectedBookSlugs`, { minLength: 1 });
  if (request.gradeSlug !== null) {
    assertString(request.gradeSlug, `${path}.gradeSlug`);
  }
  assertEnum(request.proximityDistance, SEARCH_PROXIMITY_DISTANCES, `${path}.proximityDistance`);
  assertInteger(request.limit, `${path}.limit`, { minimum: 1, maximum: 200 });
  if (request.context === "book" && request.selectedBookSlugs.length !== 1) {
    fail(`${path}.selectedBookSlugs`, "expected exactly one selected book in book context");
  }
  return request;
}

export function assertSearchWorkerRequestV1(value, path = "request") {
  const request = assertProtocolEnvelope(value, undefined, path);
  assertEnum(request.type, ["initialize", "search", "dispose"], `${path}.type`);

  if (request.type === "initialize") {
    return assertInitializeRequestV1(request, path);
  }
  if (request.type === "search") {
    return assertSearchRequestV1(request, path);
  }
  return request;
}

function assertResultsResponseV1(response, path) {
  assertSearchReadinessV1(response.readiness, `${path}.readiness`);
  const results = assertArray(response.results, `${path}.results`);
  results.forEach((result, index) => assertSearchResultV1(result, `${path}.results[${index}]`));
  assertInteger(response.total, `${path}.total`, { minimum: results.length });
  return response;
}

function assertErrorResponseV1(response, path) {
  assertString(response.errorCode, `${path}.errorCode`);
  if (response.message !== undefined) {
    assertString(response.message, `${path}.message`);
  }
  return response;
}

export function assertSearchWorkerResponseV1(value, path = "response") {
  const response = assertProtocolEnvelope(value, undefined, path);
  assertEnum(response.type, ["readiness", "results", "partial-failure", "parser-error", "error"], `${path}.type`);

  switch (response.type) {
    case "readiness":
      assertSearchReadinessV1(response.readiness, `${path}.readiness`);
      return response;
    case "results":
      return assertResultsResponseV1(response, path);
    case "partial-failure":
      return assertPartialFailureV1(response, path);
    case "parser-error":
      return assertParserErrorV1(response, path);
    case "error":
      return assertErrorResponseV1(response, path);
    default:
      return response;
  }
}
