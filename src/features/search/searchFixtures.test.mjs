import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SEARCH_FIXTURE_BOOK, SEARCH_FIXTURE_EXPECTATIONS } from "./searchFixtures.js";

describe("search fixture book", () => {
  it("contains Turkish dotted/dotless i, combining marks, Arabic, and punctuation", () => {
    const source = SEARCH_FIXTURE_BOOK.records.map((record) => `${record.title} ${record.text}`).join("\n");

    assert.match(source, /İ/);
    assert.match(source, /ı/);
    assert.match(source, /I\u0307/u);
    assert.match(source, /[\u0600-\u06ff]/u);
    assert.match(source, /[“”'—،.?!;]/u);
  });

  it("keeps repeated terms at known token positions for proximity tests", () => {
    const proximity = SEARCH_FIXTURE_EXPECTATIONS.proximity;
    const record = SEARCH_FIXTURE_BOOK.records.find((candidate) => candidate.partNo === proximity.partNo);
    const tokens = record.text.toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}\p{M}]+/gu);
    const positions = (term) => tokens.flatMap((token, index) => token === term ? [index] : []);

    assert.deepEqual(positions(proximity.leftTerm), proximity.leftPositions);
    assert.deepEqual(positions(proximity.rightTerm), proximity.rightPositions);
    assert.equal(proximity.nearestTokenDistance, 3);
  });
});
