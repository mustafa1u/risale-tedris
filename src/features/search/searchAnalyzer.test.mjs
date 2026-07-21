import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeSearchText, normalizeSearchText, tokenizeSearchText } from "./searchAnalyzer.js";

describe("search text normalization", () => {
  it("normalizes Turkish casing, dotted/dotless i, diacritics, whitespace, and quotes", () => {
    assert.equal(normalizeSearchText(" I İ ı i I\u0307  KÂİNAT\t\nâlem "), "i i i i i kainat alem");
    assert.equal(normalizeSearchText("‘Kur’an’ “iman” «nur»"), "'kur'an' \"iman\" \"nur\"");
  });

  it("keeps Arabic script searchable without changing presentation text", () => {
    const source = "نُورُ الإِيمَان، قلبٌ مطمئن";
    const analysis = analyzeSearchText(source);

    assert.equal(analysis.source, source);
    assert.deepEqual(analysis.tokens.map((token) => token.value), ["نور", "الايمان", "قلب", "مطمين"]);
    assert.equal(source.slice(analysis.tokens[0].start, analysis.tokens[0].end), "نُورُ");
  });
});

describe("search token offsets", () => {
  it("returns normalized tokens with original UTF-16 offsets", () => {
    const source = "“İman” I\u0307MAN نور";
    const tokens = tokenizeSearchText(source);

    assert.deepEqual(tokens, [
      { value: "iman", start: 1, end: 5, position: 0 },
      { value: "iman", start: 7, end: 12, position: 1 },
      { value: "نور", start: 13, end: 16, position: 2 }
    ]);
    assert.deepEqual(tokens.map((token) => source.slice(token.start, token.end)), ["İman", "I\u0307MAN", "نور"]);
  });

  it("uses punctuation and emoji as boundaries while retaining repeated terms", () => {
    const source = "rahmet,rahmet—nur🙂ışık; نور/نور";
    const tokens = tokenizeSearchText(source);

    assert.deepEqual(tokens.map((token) => token.value), ["rahmet", "rahmet", "nur", "isik", "نور", "نور"]);
    assert.deepEqual(tokens.map((token) => token.position), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(tokens.map((token) => source.slice(token.start, token.end)), [
      "rahmet",
      "rahmet",
      "nur",
      "ışık",
      "نور",
      "نور"
    ]);
  });

  it("handles empty text, surrogate pairs, and standalone combining marks safely", () => {
    assert.deepEqual(tokenizeSearchText("  \t\n"), []);
    assert.deepEqual(tokenizeSearchText("\u0307\u0301"), []);

    const source = "🙂I\u0307man";
    const [token] = tokenizeSearchText(source);
    assert.deepEqual(token, { value: "iman", start: 2, end: 7, position: 0 });
    assert.equal(source.slice(token.start, token.end), "I\u0307man");
  });
});
