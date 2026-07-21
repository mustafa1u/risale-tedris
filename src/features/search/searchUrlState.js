import {
  SEARCH_MODES,
  SEARCH_PROXIMITY_DISTANCES,
  SEARCH_SCOPES
} from "./searchContracts.js";
import {
  createBookSearchState,
  createGlobalSearchState
} from "./searchState.js";

function asSearchParams(input) {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }
  if (typeof input === "string") {
    return new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);
  }
  return new URLSearchParams();
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))];
}

function parseCsv(value) {
  return typeof value === "string"
    ? uniqueStrings(value.split(",").map((item) => item.trim()).filter(Boolean))
    : [];
}

function canonicalSelection(selectedValues, availableValues) {
  const selected = new Set(selectedValues);
  return availableValues.filter((value) => selected.has(value));
}

function safeQuery(value) {
  return typeof value === "string" && [...value].length <= 256 ? value : "";
}

export function serializeSearchUrlState(state) {
  const params = new URLSearchParams();

  if (state.query) {
    params.set("q", state.query);
  }

  params.set("context", state.context === "book" ? state.currentBookSlug : "global");

  if (state.context === "global") {
    const books = canonicalSelection(state.selectedBookSlugs, state.availableBookSlugs);
    params.set("books", books.join(","));
  }

  params.set("mode", SEARCH_MODES.includes(state.mode) ? state.mode : "all");

  const scopes = canonicalSelection(state.scopes, SEARCH_SCOPES);
  params.set("scope", (scopes.length > 0 ? scopes : SEARCH_SCOPES).join(","));

  params.set(
    "distance",
    String(SEARCH_PROXIMITY_DISTANCES.includes(state.proximityDistance) ? state.proximityDistance : 5)
  );

  if (state.context === "book" && state.gradeSlug) {
    params.set("grade", state.gradeSlug);
  }

  return params.toString();
}

export function parseSearchUrlState(input, {
  availableBookSlugs,
  availableGradeSlugs = [],
  currentBookSlug = null,
  currentGradeSlug = null
} = {}) {
  const books = uniqueStrings(availableBookSlugs ?? []);
  if (books.length === 0) {
    throw new TypeError("availableBookSlugs must contain at least one book");
  }

  const grades = uniqueStrings(availableGradeSlugs);
  const params = asSearchParams(input);
  const requestedContext = params.get("context");
  const fallbackBookSlug = books.includes(currentBookSlug) ? currentBookSlug : null;
  const contextBookSlug = books.includes(requestedContext) ? requestedContext : fallbackBookSlug;
  const useGlobalContext = requestedContext === "global" || contextBookSlug === null;
  const initialGrade = contextBookSlug === fallbackBookSlug && grades.includes(currentGradeSlug)
    ? currentGradeSlug
    : null;
  const state = useGlobalContext
    ? createGlobalSearchState(books)
    : createBookSearchState(contextBookSlug, initialGrade);

  state.query = safeQuery(params.get("q") ?? "");

  const requestedMode = params.get("mode");
  if (SEARCH_MODES.includes(requestedMode)) {
    state.mode = requestedMode;
  }

  const requestedScopes = canonicalSelection(parseCsv(params.get("scope")), SEARCH_SCOPES);
  if (requestedScopes.length > 0) {
    state.scopes = requestedScopes;
  }

  const requestedDistance = Number(params.get("distance"));
  if (SEARCH_PROXIMITY_DISTANCES.includes(requestedDistance)) {
    state.proximityDistance = requestedDistance;
  }

  if (state.context === "global") {
    const requestedBooks = canonicalSelection(parseCsv(params.get("books")), books);
    if (requestedBooks.length > 0) {
      state.selectedBookSlugs = requestedBooks;
    }
  } else {
    const requestedGrade = params.get("grade");
    if (grades.includes(requestedGrade)) {
      state.gradeSlug = requestedGrade;
    }
  }

  return state;
}
