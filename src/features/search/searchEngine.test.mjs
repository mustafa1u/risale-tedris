import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SEARCH_SCORE_WEIGHTS,
  analyzeSearchBook,
  searchAnalyzedBooks
} from "./searchEngine.js";

function makeRecord(partNo, partNumber, title, text, gradeSlugs = ["8-sinif"]) {
  return { partNo, partNumber, title, text, gradeSlugs, labelSlug: `part-${partNumber}` };
}

const books = [
  analyzeSearchBook({
    bookSlug: "first-book",
    bookTitle: "Birinci Kitap",
    contentHash: "a".repeat(64),
    records: [
      makeRecord("p01", 1, "İman ve Nur", "Rahmet yalnız metinde"),
      makeRecord("p02", 2, "Rahmet Dersi", "iman nur nur", ["5-sinif"]),
      makeRecord("p03", 3, "Ortak Başlık", "ortak"),
      makeRecord("p04", 4, "Ortak Başlık", "ortak"),
      makeRecord("p55", 55, "Hâtime", "kapanış metni")
    ]
  }),
  analyzeSearchBook({
    bookSlug: "second-book",
    bookTitle: "İkinci Kitap",
    contentHash: "b".repeat(64),
    records: [makeRecord("p01", 1, "İman", "nur")]
  })
];

function search(query, overrides = {}) {
  return searchAnalyzedBooks(books, {
    query,
    context: "global",
    mode: "all",
    scopes: ["text", "title", "partNo"],
    selectedBookSlugs: ["first-book", "second-book"],
    gradeSlug: null,
    proximityDistance: 5,
    limit: 50,
    ...overrides
  });
}

describe("default all-words search", () => {
  it("preserves canonical order for empty queries and finds one term", () => {
    const empty = search("");
    assert.deepEqual(empty.results.map((result) => `${result.bookSlug}:${result.partNo}`), [
      "first-book:p01",
      "first-book:p02",
      "first-book:p03",
      "first-book:p04",
      "first-book:p55",
      "second-book:p01"
    ]);
    assert.deepEqual(empty.results.map((result) => result.matchedFields), [[], [], [], [], [], []]);
    assert.deepEqual(search("rahmet").results.map((result) => result.partNo), ["p02", "p01"]);
  });

  it("requires every query word and respects repeated term counts", () => {
    assert.deepEqual(search("iman nur").results.map((result) => `${result.bookSlug}:${result.partNo}`), [
      "first-book:p01",
      "first-book:p02",
      "second-book:p01"
    ]);
    assert.deepEqual(search("nur nur").results.map((result) => `${result.bookSlug}:${result.partNo}`), ["first-book:p02"]);
    assert.equal(search("iman bulunmayan").total, 0);
  });
});

describe("search field scopes and filters", () => {
  it("matches text, title, and exact part number independently", () => {
    assert.deepEqual(search("kapanış", { scopes: ["text"] }).results.map((result) => result.partNo), ["p55"]);
    assert.deepEqual(search("hâtime", { scopes: ["title"] }).results.map((result) => result.partNo), ["p55"]);
    assert.deepEqual(search("P55", { scopes: ["partNo"] }).results.map((result) => result.partNo), ["p55"]);
    assert.equal(search("p5", { scopes: ["partNo"] }).total, 0);
  });

  it("excludes text-only matches when text scope is disabled", () => {
    const result = search("iman", { scopes: ["title", "partNo"] });
    assert.deepEqual(result.results.map((entry) => `${entry.bookSlug}:${entry.partNo}`), [
      "second-book:p01",
      "first-book:p01"
    ]);
  });

  it("filters selected books globally and intersects grades in book context", () => {
    assert.deepEqual(
      search("iman", { selectedBookSlugs: ["second-book"] }).results.map((result) => result.bookSlug),
      ["second-book"]
    );
    assert.deepEqual(
      search("", {
        context: "book",
        selectedBookSlugs: ["first-book"],
        gradeSlug: "5-sinif"
      }).results.map((result) => result.partNo),
      ["p02"]
    );
  });
});

describe("deterministic search ranking", () => {
  it("uses explicit part-number, exact-title, title-word, and text-word weights", () => {
    assert.equal(search("p55").results[0].score, SEARCH_SCORE_WEIGHTS.exactPartNo);
    assert.equal(search("iman ve nur").results[0].score, SEARCH_SCORE_WEIGHTS.exactTitle);
    assert.equal(search("nur iman").results[0].score, SEARCH_SCORE_WEIGHTS.titleAllWords);
    assert.equal(search("nur nur").results[0].score, SEARCH_SCORE_WEIGHTS.textAllWords);
  });

  it("uses canonical part order to break equal-score ties", () => {
    assert.deepEqual(search("ortak").results.map((result) => result.partNo), ["p03", "p04"]);
  });

  it("skips one-character text/title queries but still accepts normalized part numbers", () => {
    assert.equal(search("i", { scopes: ["text", "title"] }).total, 0);
    assert.deepEqual(search("P01", { scopes: ["partNo"] }).results.map((result) => result.partNo), ["p01", "p01"]);
  });
});

describe("advanced search modes", () => {
  it("evaluates exact phrases and boolean operators distinctly from all-words search", () => {
    assert.deepEqual(search("iman nur", { mode: "exact" }).results.map((result) => result.partNo), ["p02"]);
    assert.deepEqual(search("iman OR rahmet", { mode: "boolean" }).results.map((result) => `${result.bookSlug}:${result.partNo}`), [
      "first-book:p01",
      "first-book:p02",
      "second-book:p01"
    ]);
    assert.deepEqual(search("iman AND NOT rahmet", { mode: "boolean" }).results.map((result) => `${result.bookSlug}:${result.partNo}`), [
      "second-book:p01"
    ]);
  });

  it("supports basic wildcard tokens in wildcard mode", () => {
    assert.deepEqual(search("rah*", { mode: "wildcard" }).results.map((result) => result.partNo), ["p01", "p02"]);
    assert.deepEqual(search("n?r", { mode: "wildcard" }).results.map((result) => `${result.bookSlug}:${result.partNo}`), [
      "first-book:p01",
      "first-book:p02",
      "second-book:p01"
    ]);
  });
});
