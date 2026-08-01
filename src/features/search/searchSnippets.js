import { normalizeSearchText } from "./searchAnalyzer.js";

export const SEARCH_EXCERPT_MAX_LENGTH = 220;

const BOOLEAN_OPERATORS = new Set(["and", "ve", "or", "veya", "not", "degil", "değil"]);

function wildcardToRegExp(term) {
  const escaped = [...term].map((char) => {
    if (char === "*") return ".*";
    if (char === "?") return ".";
    return char.replace(/[|\\{}()[\]^$+?.]/u, "\\$&");
  }).join("");
  return new RegExp(`^${escaped}$`, "u");
}

function getQueryTerms(query, mode) {
  return normalizeSearchText(query)
    .match(/[\p{L}\p{N}*?]+/gu)
    ?.filter((term) => /[\p{L}\p{N}]/u.test(term))
    .filter((term) => mode !== "boolean" || !BOOLEAN_OPERATORS.has(term)) ?? [];
}

function getHighlightRanges(field, query, mode) {
  const patterns = getQueryTerms(query, mode).map(wildcardToRegExp);
  return field.tokens
    .filter((token) => patterns.some((pattern) => pattern.test(token.value)))
    .map((token) => ({ start: token.start, end: token.end }));
}

function chooseSourceField(analyzed, matchedFields, query, mode) {
  for (const fieldName of ["text", "title", "partNo"]) {
    if (!matchedFields.includes(fieldName)) continue;
    const field = analyzed.fields[fieldName];
    if (field?.source) {
      return { source: field.source, ranges: getHighlightRanges(field, query, mode) };
    }
  }
  return null;
}

function trimToWordBoundary(source, start, end) {
  let nextStart = start;
  let nextEnd = end;
  if (nextStart > 0) {
    const boundary = source.lastIndexOf(" ", nextStart);
    if (boundary >= Math.max(0, nextStart - 24)) nextStart = boundary + 1;
  }
  if (nextEnd < source.length) {
    const boundary = source.indexOf(" ", nextEnd);
    if (boundary >= 0 && boundary <= nextEnd + 24) nextEnd = boundary;
  }
  return { start: nextStart, end: nextEnd };
}

export function createSearchExcerpt(analyzed, matchedFields, query, mode = "all") {
  if (!query?.trim() || !Array.isArray(matchedFields) || matchedFields.length === 0) return null;

  const selected = chooseSourceField(analyzed, matchedFields, query, mode);
  if (!selected) return null;

  const { source, ranges } = selected;
  if (source.length === 0) return null;

  let window = { start: 0, end: source.length };
  if (source.length > SEARCH_EXCERPT_MAX_LENGTH) {
    const focus = ranges[0] ?? { start: 0, end: 0 };
    const preferredStart = Math.max(0, focus.start - Math.floor(SEARCH_EXCERPT_MAX_LENGTH * 0.3));
    window = trimToWordBoundary(
      source,
      preferredStart,
      Math.min(source.length, preferredStart + SEARCH_EXCERPT_MAX_LENGTH)
    );
    if (window.end - window.start > SEARCH_EXCERPT_MAX_LENGTH) {
      window.end = window.start + SEARCH_EXCERPT_MAX_LENGTH;
    }
  }

  const prefix = window.start > 0 ? "…" : "";
  const suffix = window.end < source.length ? "…" : "";
  const excerpt = `${prefix}${source.slice(window.start, window.end)}${suffix}`;
  const offset = prefix.length;
  const highlightRanges = ranges
    .filter((range) => range.end > window.start && range.start < window.end)
    .map((range) => ({
      start: offset + Math.max(0, range.start - window.start),
      end: offset + Math.min(window.end, range.end) - window.start
    }));

  return { excerpt, highlightRanges };
}

export function getHighlightedSegments(text, ranges = []) {
  const source = String(text ?? "");
  const segments = [];
  let cursor = 0;

  for (const range of ranges) {
    const start = Math.max(cursor, Math.min(source.length, range.start));
    const end = Math.max(start, Math.min(source.length, range.end));
    if (start > cursor) segments.push({ text: source.slice(cursor, start), highlighted: false });
    if (end > start) segments.push({ text: source.slice(start, end), highlighted: true });
    cursor = end;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor), highlighted: false });
  return segments;
}

export function renderHighlightedText(container, text, ranges = []) {
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  const ownerDocument = container.ownerDocument ?? globalThis.document;
  for (const segment of getHighlightedSegments(text, ranges)) {
    if (!segment.text) continue;
    if (!segment.highlighted) {
      container.append(ownerDocument.createTextNode(segment.text));
      continue;
    }
    const mark = ownerDocument.createElement("mark");
    mark.className = "search-result__match";
    mark.textContent = segment.text;
    container.append(mark);
  }
}
