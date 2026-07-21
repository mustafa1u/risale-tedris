import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  canOpenSourceText,
  formatStudyCardCount,
  hasStudySourceText,
  resolveStudyShellSelection,
  scrollAnswerControlsIntoView
} from "./studyPageClient.js";

const sourcePath = new URL("./studyPageClient.js", import.meta.url);

describe("study page client helpers", () => {
  it("resolves a study shell selection from query parameters and lightweight index data", () => {
    const deck = {
      gradeSlug: "8-sinif",
      partNo: "p55",
      title: "Part 55",
      url: "/assets/book/question-bank/8-sinif/p55.json",
      cardCount: 24
    };
    const libraryIndex = {
      books: [
        {
          slug: "sample-book",
          title: "Sample Book",
          studyDeckRoutes: [deck]
        }
      ]
    };

    assert.deepEqual(
      resolveStudyShellSelection({
        libraryIndex,
        searchParams: new URLSearchParams("?book=sample-book&grade=8-sinif&part=p55")
      }),
      { book: libraryIndex.books[0], deck }
    );
    assert.equal(
      resolveStudyShellSelection({
        libraryIndex,
        searchParams: new URLSearchParams("?book=sample-book&grade=8-sinif")
      }),
      null
    );
  });

  it("formats card counts through localized templates", () => {
    assert.equal(
      formatStudyCardCount({
        count: 1,
        oneTemplate: "{count} card",
        manyTemplate: "{count} cards"
      }),
      "1 card"
    );
    assert.equal(
      formatStudyCardCount({
        count: 24,
        oneTemplate: "{count} card",
        manyTemplate: "{count} cards"
      }),
      "24 cards"
    );
  });

  it("allows source text only after the answer is visible and a source dialog exists", () => {
    assert.equal(canOpenSourceText({ showingAnswer: false, hasSourceDialog: true }), false);
    assert.equal(canOpenSourceText({ showingAnswer: true, hasSourceDialog: false }), false);
    assert.equal(canOpenSourceText({ showingAnswer: true, hasSourceDialog: true }), true);
  });

  it("recognizes both URL-backed and inline study source text", () => {
    assert.equal(hasStudySourceText({ sourceUrl: "/assets/source.txt", sourceText: "" }), true);
    assert.equal(hasStudySourceText({ sourceUrl: "", sourceText: "Augmented source text." }), true);
    assert.equal(hasStudySourceText({ sourceUrl: "", sourceText: "   " }), false);
  });

  it("scrolls answer controls into view after the card is revealed", () => {
    const calls = [];
    const ratingRow = {
      scrollIntoView(options) {
        calls.push(["rating", options]);
      }
    };
    const viewSourceButton = {
      scrollIntoView(options) {
        calls.push(["source", options]);
      }
    };

    scrollAnswerControlsIntoView({ ratingRow, viewSourceButton });

    assert.deepEqual(calls, [
      [
        "rating",
        {
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        }
      ]
    ]);
  });

  it("falls back to the source button when no rating row is present", () => {
    const calls = [];
    const viewSourceButton = {
      scrollIntoView(options) {
        calls.push(options);
      }
    };

    scrollAnswerControlsIntoView({ ratingRow: undefined, viewSourceButton });

    assert.deepEqual(calls, [
      {
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      }
    ]);
  });

  it("calls the scroll helper after revealing the answer controls", async () => {
    const source = await readFile(sourcePath, "utf8");
    const showAnswerIndex = source.indexOf("const showAnswer = () =>");
    const controlsRevealIndex = source.indexOf("setHidden(ratingRow, false);", showAnswerIndex);
    const scrollIndex = source.indexOf("scrollAnswerControlsIntoView({ ratingRow, viewSourceButton });", controlsRevealIndex);

    assert.equal(showAnswerIndex > -1, true);
    assert.equal(controlsRevealIndex > showAnswerIndex, true);
    assert.equal(scrollIndex > controlsRevealIndex, true);
  });
});
