import { useEffect, useReducer, useRef, useState } from "preact/hooks";

import { getUi } from "@/i18n";
import { localizedPath } from "@/i18n/routing";
import SearchControls, { serializeBooleanRows } from "./SearchControls.jsx";
import { assertGlobalSearchManifestV1 } from "./searchContracts.js";
import { createSearchQueryScheduler } from "./searchQueryScheduler.js";
import { createSearchShardLoader } from "./searchShardLoader.js";
import {
  canToggleSearchBook,
  canToggleSearchScope,
  createGlobalSearchState,
  searchReducer,
  transferSearchContext
} from "./searchState.js";
import { parseSearchUrlState, serializeSearchUrlState } from "./searchUrlState.js";
import { createSearchWorkerClient } from "./searchWorkerClient.js";

const MAX_RESULTS = 50;

function createInitialGlobalSearchState(availableBookSlugs) {
  try {
    const parsed = parseSearchUrlState(globalThis.location?.search ?? "", { availableBookSlugs });
    return parsed.context === "global"
      ? parsed
      : transferSearchContext(parsed, { context: "global", availableBookSlugs });
  } catch {
    return createGlobalSearchState(availableBookSlugs);
  }
}

function toWorkerRequest(state) {
  return {
    query: state.query,
    context: state.context,
    mode: state.mode,
    scopes: state.scopes,
    selectedBookSlugs: state.selectedBookSlugs,
    gradeSlug: state.gradeSlug,
    proximityDistance: state.proximityDistance,
    limit: MAX_RESULTS
  };
}

function sameSearchReference(expected, actual) {
  return expected.slug === actual.slug &&
    expected.shardUrl === actual.shardUrl &&
    expected.contentHash === actual.contentHash &&
    expected.recordCount === actual.recordCount;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export default function HomeSearch({ locale, manifestUrl, books }) {
  const text = getUi(locale);
  const [state, dispatch] = useReducer(searchReducer, books.map((book) => book.slug), createInitialGlobalSearchState);
  const [open, setOpen] = useState(() => Boolean(state.query));
  const [status, setStatus] = useState("idle");
  const [readiness, setReadiness] = useState(null);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [booleanRows, setBooleanRows] = useState([
    { operator: "AND", term: "" },
    { operator: "AND", term: "" }
  ]);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const stateRef = useRef(state);
  const readyRef = useRef(false);
  const workerClientRef = useRef(null);
  const shardLoaderRef = useRef(null);
  const loadingPromiseRef = useRef(null);
  const executeRef = useRef(null);
  const initialUrlIntentRef = useRef(Boolean(state.query));
  const schedulerRef = useRef(null);

  if (schedulerRef.current === null) {
    schedulerRef.current = createSearchQueryScheduler({
      run: (request) => executeRef.current?.(request)
    });
  }

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const closeForMenu = () => setOpen(false);
    document.addEventListener("rissor:menu-open", closeForMenu);
    return () => {
      document.removeEventListener("rissor:menu-open", closeForMenu);
      schedulerRef.current?.dispose();
      shardLoaderRef.current?.dispose();
      workerClientRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  async function executeSearch(nextState) {
    if (!readyRef.current || !workerClientRef.current) return;
    if (nextState.query.trim() === "") {
      setResults([]);
      setTotal(0);
      return;
    }
    try {
      const response = await workerClientRef.current.search(toWorkerRequest(nextState));
      setResults(response.results);
      setTotal(response.total);
    } catch (error) {
      if (error?.code === "SUPERSEDED") return;
      setStatus("error");
      setErrorMessage(error?.message ?? "Search failed");
    }
  }
  executeRef.current = executeSearch;

  function updateState(action, timing = "immediate") {
    const nextState = searchReducer(stateRef.current, action);
    stateRef.current = nextState;
    dispatch(action);
    if (!readyRef.current) return nextState;
    if (timing === "debounced") {
      schedulerRef.current.schedule(nextState);
    } else {
      schedulerRef.current.submit(nextState);
    }
    return nextState;
  }

  function updateMode(mode) {
    const nextState = updateState({ type: "set-mode", mode });
    if (mode === "boolean" && !nextState.query.trim()) {
      const query = serializeBooleanRows(booleanRows);
      if (query) updateState({ type: "set-query", query }, "debounced");
    }
  }

  function updateBooleanRow(index, patch) {
    const rows = booleanRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    setBooleanRows(rows);
    const query = serializeBooleanRows(rows);
    const nextState = searchReducer({ ...stateRef.current, mode: "boolean" }, { type: "set-query", query });
    stateRef.current = nextState;
    dispatch({ type: "set-mode", mode: "boolean" });
    dispatch({ type: "set-query", query });
    if (readyRef.current) schedulerRef.current.schedule(nextState);
  }

  function addBooleanRow() {
    setBooleanRows([...booleanRows, { operator: "AND", term: "" }]);
  }

  function removeBooleanRow(index) {
    const rows = booleanRows.filter((_, rowIndex) => rowIndex !== index);
    const safeRows = rows.length === 0 ? [{ operator: "AND", term: "" }] : rows;
    setBooleanRows(safeRows);
    const query = serializeBooleanRows(safeRows);
    updateState({ type: "set-query", query }, "debounced");
  }

  function releaseResources() {
    shardLoaderRef.current?.dispose();
    workerClientRef.current?.dispose();
    shardLoaderRef.current = null;
    workerClientRef.current = null;
    loadingPromiseRef.current = null;
    readyRef.current = false;
  }

  async function ensureResources() {
    if (readyRef.current) return;
    if (loadingPromiseRef.current) return loadingPromiseRef.current;

    const load = (async () => {
      setStatus("loading");
      setErrorMessage("");
      const manifestResponse = await fetch(manifestUrl, { headers: { Accept: "application/json" } });
      if (!manifestResponse.ok) throw new Error(`Search manifest request failed (${manifestResponse.status})`);
      const manifest = assertGlobalSearchManifestV1(await manifestResponse.json());
      if (
        manifest.books.length !== books.length ||
        manifest.books.some((book, index) => !sameSearchReference(books[index], book))
      ) {
        throw new Error("Search manifest does not match the generated homepage references");
      }

      const { createBrowserSearchWorker } = await import("./searchBrowserWorker.js");
      const worker = createBrowserSearchWorker();
      const workerClient = createSearchWorkerClient({ worker });
      const shardLoader = createSearchShardLoader({
        concurrency: 2,
        onReadiness: (nextReadiness) => {
          setReadiness(nextReadiness);
          setStatus(nextReadiness.complete ? "ready" : "loading");
        }
      });
      workerClientRef.current = workerClient;
      shardLoaderRef.current = shardLoader;
      const loaded = await shardLoader.load(manifest.books);
      setReadiness(loaded.readiness);
      if (loaded.shards.length === 0) throw new Error("No search book could be loaded");

      await workerClient.initialize(loaded.shards);
      readyRef.current = true;
      const hasFailures = loaded.readiness.books.some((book) => book.state === "failed");
      setStatus(hasFailures ? "partial" : "ready");
      if (stateRef.current.query.trim()) await executeSearch(stateRef.current);
    })().catch((error) => {
      readyRef.current = false;
      setStatus("error");
      setErrorMessage(error?.message ?? "Search resources could not be loaded");
      throw error;
    }).finally(() => {
      loadingPromiseRef.current = null;
    });
    loadingPromiseRef.current = load;
    return load;
  }

  useEffect(() => {
    if (!initialUrlIntentRef.current) return;
    initialUrlIntentRef.current = false;
    document.dispatchEvent(new CustomEvent("rissor:search-open"));
    void ensureResources().catch(() => {});
  }, []);

  function openSearch() {
    document.dispatchEvent(new CustomEvent("rissor:search-open"));
    setOpen(true);
    void ensureResources().catch(() => {});
  }

  function closeSearch({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function clearSearch() {
    const nextState = searchReducer(stateRef.current, { type: "set-query", query: "" });
    stateRef.current = nextState;
    dispatch({ type: "set-query", query: "" });
    schedulerRef.current.clear(nextState);
    setResults([]);
    setTotal(0);
    inputRef.current?.focus();
  }

  function retry() {
    releaseResources();
    void ensureResources().catch(() => {});
  }

  function handlePanelKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  }

  function bookSearchHref(result) {
    const bookState = transferSearchContext(state, {
      context: "book",
      currentBookSlug: result.bookSlug
    });
    const params = serializeSearchUrlState(bookState);
    return `${localizedPath(locale, `/books/${result.bookSlug}/`)}?${params}`;
  }

  const readyCount = readiness?.readyBookCount ?? 0;
  const failedBookTitles = readiness?.books
    .filter((book) => book.state === "failed")
    .map((book) => books.find((candidate) => candidate.slug === book.bookSlug)?.title ?? book.bookSlug) ?? [];
  const statusMessage = status === "loading"
    ? (readiness ? text.search.status.progress({ ready: readyCount, total: readiness.selectedBookCount }) : text.search.status.loading)
    : status === "ready"
      ? text.search.status.ready
      : status === "partial"
        ? text.search.status.partialFailure({ books: failedBookTitles.join(", ") })
        : status === "error"
          ? errorMessage
          : "";

  return (
    <div class="home-search" data-open={open ? "true" : "false"}>
      <button
        ref={triggerRef}
        class="home-search__trigger"
        type="button"
        aria-expanded={open}
        aria-controls="global-search-panel"
        data-global-search-trigger
        onClick={() => open ? closeSearch() : openSearch()}
      >
        <SearchIcon />
        <span>{text.search.triggers.global}</span>
      </button>

      {open ? (
        <section
          id="global-search-panel"
          class="home-search__panel"
          aria-label={text.search.triggers.global}
          onKeyDown={handlePanelKeyDown}
        >
          <div class="home-search__inner">
            <div class="home-search__bar">
              <SearchIcon />
              <input
                ref={inputRef}
                type="search"
                value={state.query}
                placeholder={text.search.placeholders.global}
                aria-label={text.search.triggers.global}
                data-global-search-input
                onInput={(event) => updateState({ type: "set-query", query: event.currentTarget.value }, "debounced")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    schedulerRef.current.submit(stateRef.current);
                  }
                }}
              />
              {state.query ? (
                <button class="home-search__bar-action" type="button" onClick={clearSearch}>
                  {text.search.actions.clear}
                </button>
              ) : null}
              <button class="home-search__close" type="button" onClick={() => closeSearch()}>
                {text.search.actions.close}
              </button>
            </div>

            <SearchControls
              controlName="global"
              text={text}
              state={state}
              books={books}
              booleanRows={booleanRows}
              canToggleScope={(scope) => canToggleSearchScope(state, scope)}
              canToggleBook={(bookSlug) => canToggleSearchBook(state, bookSlug)}
              onModeChange={updateMode}
              onScopeToggle={(scope) => updateState({ type: "toggle-scope", scope })}
              onBookToggle={(bookSlug) => updateState({ type: "toggle-book", bookSlug })}
              onSelectAllBooks={() => updateState({ type: "select-all-books" })}
              onClearBooks={() => updateState({ type: "clear-books" })}
              onProximityChange={(distance) => updateState({ type: "set-proximity-distance", distance })}
              onBooleanRowChange={updateBooleanRow}
              onBooleanRowAdd={addBooleanRow}
              onBooleanRowRemove={removeBooleanRow}
            />

            <div class="home-search__status" aria-live="polite" aria-atomic="true">
              {statusMessage ? <p data-search-status={status}>{statusMessage}</p> : null}
              {status === "error" ? (
                <button class="button-muted" type="button" onClick={retry}>{text.search.actions.retry}</button>
              ) : null}
            </div>

            <div class="home-search__results">
              {state.query.trim() && status !== "loading" && status !== "error" ? (
                <p class="home-search__result-count" data-search-result-count aria-live="polite">
                  {text.search.results.count({ count: total })}
                </p>
              ) : null}

              {results.length > 0 ? (
                <ol class="search-result-list">
                  {results.map((result) => (
                    <li key={`${result.bookSlug}:${result.partNo}`}>
                      <div class="search-result-card">
                        <a
                          class="search-result__link"
                          href={localizedPath(locale, `/books/${result.bookSlug}/parts/${result.partNo}/`)}
                          data-search-result-link
                        >
                          <span class="search-result__book">{result.bookTitle}</span>
                          <span class="search-result__part">{result.partNo.toUpperCase()}</span>
                          <strong>{result.title}</strong>
                          {result.matchedFields.includes("text") ? <small>{text.search.results.fromText}</small> : null}
                        </a>
                        <a class="button-muted" href={bookSearchHref(result)} data-search-within-book>
                          {text.search.actions.searchWithinBook}
                        </a>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : state.query.trim() && status !== "loading" && status !== "error" ? (
                <div class="search-empty-state">
                  <p>{text.search.results.noResults}</p>
                  <small>{text.search.results.fewerWords}</small>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
