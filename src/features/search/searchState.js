import {
  SEARCH_MODES,
  SEARCH_PROXIMITY_DISTANCES,
  SEARCH_SCOPES
} from "./searchContracts.js";

export const DEFAULT_SEARCH_MODE = "all";
export const DEFAULT_SEARCH_SCOPES = Object.freeze(["text", "title", "partNo"]);
export const DEFAULT_PROXIMITY_DISTANCE = 5;

function uniqueNonEmptyStrings(values, label) {
  if (!Array.isArray(values)) {
    throw new TypeError(`${label} must be an array`);
  }

  const unique = [];
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`${label} must contain non-empty strings`);
    }
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }
  return unique;
}

function createSharedState() {
  return {
    query: "",
    mode: DEFAULT_SEARCH_MODE,
    scopes: [...DEFAULT_SEARCH_SCOPES],
    gradeSlug: null,
    proximityDistance: DEFAULT_PROXIMITY_DISTANCE,
    expanded: false
  };
}

export function createGlobalSearchState(availableBookSlugs) {
  const books = uniqueNonEmptyStrings(availableBookSlugs, "availableBookSlugs");
  if (books.length === 0) {
    throw new TypeError("availableBookSlugs must contain at least one book");
  }

  return {
    context: "global",
    availableBookSlugs: books,
    selectedBookSlugs: [...books],
    currentBookSlug: null,
    ...createSharedState()
  };
}

export function createBookSearchState(currentBookSlug, gradeSlug = null) {
  const [bookSlug] = uniqueNonEmptyStrings([currentBookSlug], "currentBookSlug");
  if (gradeSlug !== null && (typeof gradeSlug !== "string" || gradeSlug.trim().length === 0)) {
    throw new TypeError("gradeSlug must be null or a non-empty string");
  }

  return {
    context: "book",
    availableBookSlugs: [bookSlug],
    selectedBookSlugs: [bookSlug],
    currentBookSlug: bookSlug,
    ...createSharedState(),
    gradeSlug
  };
}

function toggleSelectedValue(values, value) {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

export function canToggleSearchScope(state, scope) {
  if (!SEARCH_SCOPES.includes(scope) || !Array.isArray(state?.scopes)) {
    return false;
  }
  return !state.scopes.includes(scope) || state.scopes.length > 1;
}

export function canToggleSearchBook(state, bookSlug) {
  if (
    state?.context !== "global" ||
    !Array.isArray(state.availableBookSlugs) ||
    !Array.isArray(state.selectedBookSlugs) ||
    !state.availableBookSlugs.includes(bookSlug)
  ) {
    return false;
  }
  return !state.selectedBookSlugs.includes(bookSlug) || state.selectedBookSlugs.length > 1;
}

function copyTransferableSearchState(source, target) {
  return {
    ...target,
    query: source.query,
    mode: source.mode,
    scopes: [...source.scopes],
    proximityDistance: source.proximityDistance,
    expanded: source.expanded
  };
}

export function transferSearchContext(state, target) {
  if (!target || typeof target !== "object") {
    throw new TypeError("target search context is required");
  }

  if (target.context === "book") {
    return copyTransferableSearchState(
      state,
      createBookSearchState(target.currentBookSlug, target.currentGradeSlug ?? null)
    );
  }

  if (target.context === "global") {
    return copyTransferableSearchState(
      state,
      createGlobalSearchState(target.availableBookSlugs)
    );
  }

  throw new TypeError(`Unsupported target search context: ${target.context}`);
}

export function searchReducer(state, action) {
  if (!state || typeof state !== "object" || !action || typeof action !== "object") {
    throw new TypeError("searchReducer requires state and action objects");
  }

  switch (action.type) {
    case "set-query":
      return typeof action.query === "string" ? { ...state, query: action.query } : state;
    case "set-mode":
      return SEARCH_MODES.includes(action.mode) ? { ...state, mode: action.mode } : state;
    case "set-proximity-distance":
      return SEARCH_PROXIMITY_DISTANCES.includes(action.distance)
        ? { ...state, proximityDistance: action.distance }
        : state;
    case "set-grade":
      return action.gradeSlug === null || (typeof action.gradeSlug === "string" && action.gradeSlug.length > 0)
        ? { ...state, gradeSlug: action.gradeSlug }
        : state;
    case "set-expanded":
      return typeof action.expanded === "boolean" ? { ...state, expanded: action.expanded } : state;
    case "toggle-scope": {
      if (!canToggleSearchScope(state, action.scope)) {
        return state;
      }
      const scopes = toggleSelectedValue(state.scopes, action.scope);
      return { ...state, scopes };
    }
    case "toggle-book": {
      if (!canToggleSearchBook(state, action.bookSlug)) {
        return state;
      }
      const selectedBookSlugs = toggleSelectedValue(state.selectedBookSlugs, action.bookSlug);
      return { ...state, selectedBookSlugs };
    }
    default:
      return state;
  }
}
