import { SEARCH_SCOPES } from "./searchContracts.js";
import { analyzeSearchText, normalizeSearchText, tokenizeSearchText } from "./searchAnalyzer.js";

export const SEARCH_SCORE_WEIGHTS = Object.freeze({
  exactPartNo: 1000,
  exactTitle: 800,
  titleAllWords: 450,
  textAllWords: 150,
  distributedAllWords: 100,
  exactPhrase: 300,
  booleanMatch: 120,
  wildcardMatch: 110
});

export function analyzeSearchRecord(record) {
  return {
    record,
    fields: {
      partNo: analyzeSearchText(record.partNo),
      title: analyzeSearchText(record.title),
      text: analyzeSearchText(record.text)
    }
  };
}

export function analyzeSearchBook(book) {
  return {
    bookSlug: book.bookSlug,
    bookTitle: book.bookTitle,
    contentHash: book.contentHash,
    records: book.records.map(analyzeSearchRecord)
  };
}

function termCounts(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token.value, (counts.get(token.value) ?? 0) + 1);
  return counts;
}

function mergeCounts(target, source) {
  for (const [term, count] of source) target.set(term, (target.get(term) ?? 0) + count);
  return target;
}

function satisfies(counts, requirements) {
  for (const [term, requiredCount] of requirements) {
    if ((counts.get(term) ?? 0) < requiredCount) return false;
  }
  return true;
}

function hasAny(counts, requirements) {
  for (const term of requirements.keys()) {
    if ((counts.get(term) ?? 0) > 0) return true;
  }
  return false;
}

function resultFor(book, analyzed, score, matchedFields) {
  const { record } = analyzed;
  return {
    bookSlug: book.bookSlug,
    bookTitle: book.bookTitle,
    partNo: record.partNo,
    partNumber: record.partNumber,
    title: record.title,
    score,
    matchedFields
  };
}

function scoreRecord(analyzed, requirements, normalizedQuery, fieldCounts) {
  if (fieldCounts.partNo && analyzed.fields.partNo.normalized === normalizedQuery) {
    return SEARCH_SCORE_WEIGHTS.exactPartNo;
  }
  if (fieldCounts.title && analyzed.fields.title.normalized === normalizedQuery) {
    return SEARCH_SCORE_WEIGHTS.exactTitle;
  }
  if (fieldCounts.title && satisfies(fieldCounts.title, requirements)) {
    return SEARCH_SCORE_WEIGHTS.titleAllWords;
  }
  if (fieldCounts.text && satisfies(fieldCounts.text, requirements)) {
    return SEARCH_SCORE_WEIGHTS.textAllWords;
  }
  return SEARCH_SCORE_WEIGHTS.distributedAllWords;
}

function searchableFields(analyzed, scopes, normalizedQuery, canSearchWords, isPartNumberQuery) {
  const fields = {};
  if (scopes.has("text") && canSearchWords) fields.text = analyzed.fields.text;
  if (scopes.has("title") && canSearchWords) fields.title = analyzed.fields.title;
  if (
    scopes.has("partNo") &&
    isPartNumberQuery &&
    analyzed.fields.partNo.normalized === normalizedQuery
  ) {
    fields.partNo = analyzed.fields.partNo;
  }
  return fields;
}

function matchingFields(fields, predicate) {
  return SEARCH_SCOPES.filter((field) => fields[field] && predicate(fields[field]));
}

function fieldHasAllTerms(field, requirements) {
  return satisfies(termCounts(field.tokens), requirements);
}

function fieldHasPhrase(field, normalizedPhrase) {
  return field.normalized === normalizedPhrase || field.normalized.includes(normalizedPhrase);
}

function wildcardToRegExp(term) {
  const escaped = [...term].map((char) => {
    if (char === "*") return ".*";
    if (char === "?") return ".";
    return char.replace(/[|\\{}()[\]^$+?.]/u, "\\$&");
  }).join("");
  return new RegExp(`^${escaped}$`, "u");
}

function fieldHasWildcardTerms(field, wildcardTerms) {
  return wildcardTerms.every((term) => {
    const pattern = wildcardToRegExp(term);
    return field.tokens.some((token) => pattern.test(token.value));
  });
}

function tokenizeBooleanQuery(query) {
  const tokens = [];
  const source = query.trim();
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: char, value: char });
      index += 1;
      continue;
    }
    if (char === "\"") {
      let end = index + 1;
      let value = "";
      while (end < source.length && source[end] !== "\"") {
        value += source[end];
        end += 1;
      }
      tokens.push({ type: "term", value });
      index = end < source.length ? end + 1 : end;
      continue;
    }

    let end = index;
    while (end < source.length && !/\s|[()]/u.test(source[end])) end += 1;
    const value = source.slice(index, end);
    const normalized = normalizeSearchText(value);
    if (["and", "ve"].includes(normalized)) {
      tokens.push({ type: "and", value });
    } else if (["or", "veya"].includes(normalized)) {
      tokens.push({ type: "or", value });
    } else if (["not", "degil", "değil"].includes(normalized)) {
      tokens.push({ type: "not", value });
    } else {
      tokens.push({ type: "term", value });
    }
    index = end;
  }

  return tokens;
}

function parseBooleanQuery(query) {
  const tokens = tokenizeBooleanQuery(query);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(type) {
    if (peek()?.type !== type) return null;
    return tokens[index++];
  }

  function parsePrimary() {
    if (consume("(")) {
      const expression = parseOr();
      consume(")");
      return expression;
    }
    const term = consume("term");
    if (!term) return { type: "empty" };
    return { type: "term", value: term.value };
  }

  function parseNot() {
    if (consume("not")) return { type: "not", operand: parseNot() };
    return parsePrimary();
  }

  function parseAnd() {
    let node = parseNot();
    while (peek()?.type === "and" || peek()?.type === "term" || peek()?.type === "(" || peek()?.type === "not") {
      if (peek()?.type === "and") consume("and");
      node = { type: "and", left: node, right: parseNot() };
    }
    return node;
  }

  function parseOr() {
    let node = parseAnd();
    while (peek()?.type === "or") {
      consume("or");
      node = { type: "or", left: node, right: parseAnd() };
    }
    return node;
  }

  return parseOr();
}

function evaluateBooleanNode(node, fields) {
  switch (node.type) {
    case "term": {
      const normalized = normalizeSearchText(node.value);
      const terms = tokenizeSearchText(node.value);
      if (terms.length === 0) return { matches: false, fields: [] };
      const requirements = termCounts(terms);
      const predicate = terms.length > 1
        ? (field) => fieldHasPhrase(field, normalized)
        : (field) => fieldHasAllTerms(field, requirements);
      const matchedFields = matchingFields(fields, predicate);
      return { matches: matchedFields.length > 0, fields: matchedFields };
    }
    case "not": {
      const child = evaluateBooleanNode(node.operand, fields);
      return { matches: !child.matches, fields: [] };
    }
    case "and": {
      const left = evaluateBooleanNode(node.left, fields);
      const right = evaluateBooleanNode(node.right, fields);
      return {
        matches: left.matches && right.matches,
        fields: [...new Set([...left.fields, ...right.fields])]
      };
    }
    case "or": {
      const left = evaluateBooleanNode(node.left, fields);
      const right = evaluateBooleanNode(node.right, fields);
      return {
        matches: left.matches || right.matches,
        fields: [...new Set([...left.fields, ...right.fields])]
      };
    }
    default:
      return { matches: false, fields: [] };
  }
}

export function searchAnalyzedBooks(books, request) {
  const selectedBooks = new Set(request.selectedBookSlugs);
  const scopes = new Set(request.scopes);
  const normalizedQuery = normalizeSearchText(request.query);
  const queryTokens = tokenizeSearchText(request.query);
  const requirements = termCounts(queryTokens);
  const isEmptyQuery = queryTokens.length === 0;
  const isPartNumberQuery = /^p\d+$/u.test(normalizedQuery);
  const normalizedCharacterCount = [...normalizedQuery.replace(/\s/gu, "")].length;
  const canSearchWords = normalizedCharacterCount >= 2;
  const booleanQuery = request.mode === "boolean" ? parseBooleanQuery(request.query) : null;
  const wildcardTerms = request.mode === "wildcard"
    ? normalizedQuery.split(/\s+/u).filter(Boolean)
    : [];
  const candidates = [];

  for (const [bookIndex, book] of books.entries()) {
    if (!selectedBooks.has(book.bookSlug)) continue;
    for (const analyzed of book.records) {
      const { record } = analyzed;
      if (request.gradeSlug !== null && !record.gradeSlugs.includes(request.gradeSlug)) continue;

      if (isEmptyQuery) {
        candidates.push({ bookIndex, result: resultFor(book, analyzed, 0, []) });
        continue;
      }
      if (!canSearchWords && !(scopes.has("partNo") && isPartNumberQuery)) continue;

      const fields = searchableFields(analyzed, scopes, normalizedQuery, canSearchWords, isPartNumberQuery);

      if (request.mode === "exact") {
        const matchedFields = matchingFields(fields, (field) => fieldHasPhrase(field, normalizedQuery));
        if (matchedFields.length === 0) continue;
        candidates.push({ bookIndex, result: resultFor(book, analyzed, SEARCH_SCORE_WEIGHTS.exactPhrase, matchedFields) });
        continue;
      }

      if (request.mode === "boolean") {
        const evaluated = evaluateBooleanNode(booleanQuery, fields);
        if (!evaluated.matches) continue;
        candidates.push({
          bookIndex,
          result: resultFor(book, analyzed, SEARCH_SCORE_WEIGHTS.booleanMatch, evaluated.fields)
        });
        continue;
      }

      if (request.mode === "wildcard") {
        const hasWildcard = /[*?]/u.test(normalizedQuery);
        const matchedFields = matchingFields(fields, hasWildcard
          ? (field) => fieldHasWildcardTerms(field, wildcardTerms)
          : (field) => fieldHasAllTerms(field, requirements));
        if (matchedFields.length === 0) continue;
        candidates.push({ bookIndex, result: resultFor(book, analyzed, SEARCH_SCORE_WEIGHTS.wildcardMatch, matchedFields) });
        continue;
      }

      const countsByField = Object.fromEntries(Object.entries(fields).map(([field, analysis]) => [field, termCounts(analysis.tokens)]));
      const combinedCounts = Object.values(countsByField).reduce(mergeCounts, new Map());
      if (!satisfies(combinedCounts, requirements)) continue;
      const matchedFields = SEARCH_SCOPES.filter((field) => countsByField[field] && hasAny(countsByField[field], requirements));
      const score = scoreRecord(analyzed, requirements, normalizedQuery, countsByField);
      candidates.push({ bookIndex, result: resultFor(book, analyzed, score, matchedFields) });
    }
  }

  candidates.sort((left, right) =>
    right.result.score - left.result.score ||
    left.bookIndex - right.bookIndex ||
    left.result.partNumber - right.result.partNumber ||
    left.result.partNo.localeCompare(right.result.partNo)
  );
  const total = candidates.length;
  return {
    results: candidates.slice(0, request.limit).map((candidate) => candidate.result),
    total
  };
}
