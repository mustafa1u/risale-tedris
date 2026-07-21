import { useEffect, useReducer, useRef, useState } from "preact/hooks";

import { createPartRowPresenter } from "@/features/library/bookPageClient.js";
import { getUi } from "@/i18n";
import { getGradeShortLabel } from "@/i18n/libraryLabels";
import SearchControls, { serializeBooleanRows } from "./SearchControls.jsx";
import { createSearchQueryScheduler } from "./searchQueryScheduler.js";
import { createSearchShardLoader } from "./searchShardLoader.js";
import {
  canToggleSearchScope,
  createBookSearchState,
  searchReducer,
  transferSearchContext
} from "./searchState.js";
import { parseSearchUrlState, serializeSearchUrlState } from "./searchUrlState.js";
import { createSearchWorkerClient } from "./searchWorkerClient.js";

const MAX_RESULTS = 200;

function createInitialBookSearchState({ book, grades, availableBookSlugs, urlSearch }) {
  try {
    const parsed = parseSearchUrlState(urlSearch, {
      availableBookSlugs,
      availableGradeSlugs: grades.map((grade) => grade.slug),
      currentBookSlug: book.slug
    });
    if (parsed.context === "book" && parsed.currentBookSlug === book.slug) return parsed;
    return transferSearchContext(parsed, { context: "book", currentBookSlug: book.slug });
  } catch {
    return createBookSearchState(book.slug);
  }
}

function toWorkerRequest(state, book) {
  return {
    query: state.query,
    context: "book",
    mode: state.mode,
    scopes: state.scopes,
    selectedBookSlugs: [book.slug],
    gradeSlug: state.gradeSlug,
    proximityDistance: state.proximityDistance,
    limit: MAX_RESULTS
  };
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export default function BookSearch({
  locale,
  book,
  grades,
  availableBookSlugs,
  globalSearchUrl,
  root = globalThis.document
}) {
  const text = getUi(locale);
  const [state, dispatch] = useReducer(searchReducer, {
    book,
    grades,
    availableBookSlugs,
    urlSearch: globalThis.location?.search ?? ""
  }, createInitialBookSearchState);
  const [open, setOpen] = useState(() => Boolean(state.query || state.gradeSlug));
  const [status, setStatus] = useState("idle");
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
  const initialUrlIntentRef = useRef(Boolean(state.query || state.gradeSlug));
  const presenterRef = useRef(null);
  const schedulerRef = useRef(null);

  if (presenterRef.current === null) {
    presenterRef.current = createPartRowPresenter(root);
  }
  if (schedulerRef.current === null) {
    schedulerRef.current = createSearchQueryScheduler({
      run: (request) => executeRef.current?.(request)
    });
  }

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => () => {
    schedulerRef.current?.dispose();
    shardLoaderRef.current?.dispose();
    workerClientRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function presentMetadataFallback(nextState) {
    presenterRef.current?.presentMetadata({
      searchValue: nextState.query,
      gradeValue: nextState.gradeSlug ?? ""
    });
  }

  async function executeSearch(nextState) {
    if (!readyRef.current || !workerClientRef.current) {
      if (status === "error") presentMetadataFallback(nextState);
      return;
    }
    try {
      const response = await workerClientRef.current.search(toWorkerRequest(nextState, book));
      presenterRef.current?.presentOrderedPartNos(response.results.map((result) => result.partNo));
    } catch (error) {
      if (error?.code === "SUPERSEDED") return;
      readyRef.current = false;
      setStatus("error");
      setErrorMessage(error?.message ?? text.search.status.bookFailure({ bookTitle: book.title }));
      presentMetadataFallback(nextState);
    }
  }
  executeRef.current = executeSearch;

  function updateState(action, timing = "immediate") {
    const nextState = searchReducer(stateRef.current, action);
    stateRef.current = nextState;
    dispatch(action);
    if (!readyRef.current) {
      if (status === "error") presentMetadataFallback(nextState);
      return nextState;
    }
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
    updateState({ type: "set-query", query: serializeBooleanRows(safeRows) }, "debounced");
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
      const { createBrowserSearchWorker } = await import("./searchBrowserWorker.js");
      const workerClient = createSearchWorkerClient({ worker: createBrowserSearchWorker() });
      const shardLoader = createSearchShardLoader({ concurrency: 1 });
      workerClientRef.current = workerClient;
      shardLoaderRef.current = shardLoader;
      const loaded = await shardLoader.load([book]);
      if (loaded.shards.length !== 1) {
        throw new Error(text.search.status.bookFailure({ bookTitle: book.title }));
      }
      await workerClient.initialize(loaded.shards);
      readyRef.current = true;
      setStatus("ready");
      await executeSearch(stateRef.current);
    })().catch((error) => {
      readyRef.current = false;
      setStatus("error");
      setErrorMessage(error?.message ?? text.search.status.bookFailure({ bookTitle: book.title }));
      presentMetadataFallback(stateRef.current);
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
    void ensureResources().catch(() => {});
  }, []);

  function openSearch() {
    setOpen(true);
    void ensureResources().catch(() => {});
  }

  function closeSearch() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function clearSearch() {
    const nextState = updateState({ type: "set-query", query: "" });
    schedulerRef.current.clear(nextState);
    inputRef.current?.focus();
  }

  function retry() {
    releaseResources();
    void ensureResources().catch(() => {});
  }

  const statusMessage = status === "loading"
    ? text.search.status.loading
    : status === "ready"
      ? text.search.status.ready
      : status === "error"
        ? errorMessage
        : "";
  const globalSearchState = transferSearchContext(state, {
    context: "global",
    availableBookSlugs
  });
  const globalSearchHref = `${globalSearchUrl}?${serializeSearchUrlState(globalSearchState)}`;

  return (
    <div class="book-search" data-open={open ? "true" : "false"}>
      <button
        ref={triggerRef}
        class="book-search__trigger"
        type="button"
        aria-expanded={open}
        aria-controls={`book-search-panel-${book.slug}`}
        data-book-search-trigger
        onClick={() => open ? closeSearch() : openSearch()}
      >
        <SearchIcon />
        <span>{text.search.triggers.book}</span>
      </button>

      {open ? (
        <section
          id={`book-search-panel-${book.slug}`}
          class="book-search__panel"
          aria-label={text.search.triggers.book}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeSearch();
            }
          }}
        >
          <div class="home-search__inner">
            <div class="home-search__bar">
              <SearchIcon />
              <input
                ref={inputRef}
                type="search"
                value={state.query}
                placeholder={text.search.placeholders.book}
                aria-label={text.search.triggers.book}
                data-book-search-input
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
              <button class="home-search__close" type="button" onClick={closeSearch}>
                {text.search.actions.close}
              </button>
            </div>

            <label class="field book-search__grade">
              <span>{text.book.gradeLabel}</span>
              <select
                value={state.gradeSlug ?? ""}
                data-book-grade-filter
                onChange={(event) => updateState({
                  type: "set-grade",
                  gradeSlug: event.currentTarget.value || null
                })}
              >
                <option value="">{text.book.allGrades}</option>
                {grades.map((grade) => (
                  <option value={grade.slug}>{getGradeShortLabel(locale, grade.slug, grade.label)}</option>
                ))}
              </select>
            </label>

            <SearchControls
              controlName="book"
              text={text}
              state={state}
              booleanRows={booleanRows}
              canToggleScope={(scope) => canToggleSearchScope(state, scope)}
              canToggleBook={() => false}
              onModeChange={updateMode}
              onScopeToggle={(scope) => updateState({ type: "toggle-scope", scope })}
              onBookToggle={() => {}}
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

            <div class="book-search__actions">
              <a class="button-muted" href={globalSearchHref} data-global-search-action>
                {text.search.actions.globalSearch}
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
