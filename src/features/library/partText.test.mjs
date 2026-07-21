import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasPartTextSectionSeparators,
  isPartTextSectionSeparator,
  isSectionedPartTextHeading,
  segmentPartText,
  splitPartText
} from "./partText.js";

describe("part text formatting", () => {
  it("splits part text into paragraph models", () => {
    const paragraphs = splitPartText("\uFEFFFirst paragraph\r\n\r\nSecond paragraph\n");

    assert.equal(paragraphs.length, 2);
    assert.equal(paragraphs[0].alignment, "start");
    assert.deepEqual(paragraphs[0].segments, [{ script: "latin", value: "First paragraph" }]);
    assert.deepEqual(paragraphs[1].segments, [{ script: "latin", value: "Second paragraph" }]);
  });

  it("marks Arabic-only paragraphs as centered", () => {
    const [paragraph] = splitPartText("بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ");

    assert.equal(paragraph.alignment, "center");
    assert.equal(paragraph.segments[0].script, "arabic");
  });

  it("segments mixed Latin and Arabic text without losing punctuation", () => {
    const segments = segmentPartText("Metin بِسْمِ اللَّهِ devam.");

    assert.deepEqual(segments, [
      { script: "latin", value: "Metin " },
      { script: "arabic", value: "بِسْمِ اللَّهِ" },
      { script: "latin", value: " devam." }
    ]);
  });

  it("identifies headings in augmented sectioned source text", () => {
    const paragraphs = splitPartText("P01 - First\n\nFirst body.\n\n---\n\nP02 - Second\n\nSecond body.");

    assert.equal(hasPartTextSectionSeparators(paragraphs), true);
    assert.equal(isSectionedPartTextHeading(paragraphs, 0), true);
    assert.equal(isSectionedPartTextHeading(paragraphs, 1), false);
    assert.equal(isPartTextSectionSeparator(paragraphs[2]), true);
    assert.equal(isSectionedPartTextHeading(paragraphs, 3), true);
    assert.equal(isSectionedPartTextHeading(splitPartText("Only a normal paragraph."), 0), false);
  });
});
