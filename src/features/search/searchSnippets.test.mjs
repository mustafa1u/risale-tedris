import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeSearchRecord } from "./searchEngine.js";
import {
  SEARCH_EXCERPT_MAX_LENGTH,
  createSearchExcerpt,
  getHighlightedSegments
} from "./searchSnippets.js";

function makeRecord(text) {
  return analyzeSearchRecord({
    partNo: "p01",
    partNumber: 1,
    title: "İman ve Nur",
    text,
    gradeSlugs: [],
    labelSlug: "part-1"
  });
}

describe("search result snippets", () => {
  it("keeps matching words boldable and includes surrounding context", () => {
    const result = createSearchExcerpt(
      makeRecord("Başlangıç cümlesi. İman ve nur hakkında aranan açıklama burada devam eder."),
      ["text"],
      "iman nur"
    );

    assert.ok(result);
    assert.match(result.excerpt, /İman/);
    assert.match(result.excerpt, /açıklama/);
    assert.deepEqual(
      getHighlightedSegments(result.excerpt, result.highlightRanges).filter((segment) => segment.highlighted).map((segment) => segment.text),
      ["İman", "nur"]
    );
  });

  it("limits long excerpts and marks omitted text with ellipses", () => {
    const result = createSearchExcerpt(
      makeRecord(`${"uzak metin ".repeat(45)}aranan kelime ${"sonraki metin ".repeat(45)}`),
      ["text"],
      "aranan"
    );

    assert.ok(result);
    assert.ok(result.excerpt.length <= SEARCH_EXCERPT_MAX_LENGTH + 2);
    assert.equal(result.excerpt.startsWith("…"), true);
    assert.equal(result.excerpt.endsWith("…"), true);
    assert.match(result.excerpt, /aranan/);
  });

  it("does not bold boolean operators", () => {
    const result = createSearchExcerpt(
      makeRecord("İman ve nur birlikte açıklanır."),
      ["text"],
      "iman AND nur",
      "boolean"
    );

    assert.ok(result);
    assert.deepEqual(
      getHighlightedSegments(result.excerpt, result.highlightRanges).filter((segment) => segment.highlighted).map((segment) => segment.text),
      ["İman", "nur"]
    );
  });
});
