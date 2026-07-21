import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findStudyDeck,
  findStudyDeckRoute,
  legacyStudyDeckPath,
  parseStudyDeckParams,
  studyDeckPath
} from "./studyRouting.js";

const book = {
  slug: "sample-book",
  studyDecks: [
    {
      key: "5-sinif:p01",
      gradeSlug: "5-sinif",
      partNo: "p01",
      title: "Part 1",
      url: "/assets/sample-book/question-bank/5-sinif/p01.json",
      cardCount: 12
    },
    {
      key: "8-sinif:p02",
      gradeSlug: "8-sinif",
      partNo: "p02",
      title: "Part 2",
      url: "/assets/sample-book/question-bank/8-sinif/p02.json",
      cardCount: 24
    }
  ]
};

describe("study routing", () => {
  it("builds stable study deck paths", () => {
    assert.equal(
      studyDeckPath({
        bookSlug: "sample-book",
        gradeSlug: "5-sinif",
        partNo: "p01"
      }),
      "/study/?book=sample-book&grade=5-sinif&part=p01"
    );
  });

  it("keeps the legacy per-deck path available for redirects", () => {
    assert.equal(
      legacyStudyDeckPath({
        bookSlug: "sample-book",
        gradeSlug: "5-sinif",
        partNo: "p01"
      }),
      "/books/sample-book/study/5-sinif/p01/"
    );
  });

  it("parses study deck query parameters", () => {
    assert.deepEqual(parseStudyDeckParams("?book=sample-book&grade=5-sinif&part=p01"), {
      bookSlug: "sample-book",
      gradeSlug: "5-sinif",
      partNo: "p01"
    });
    assert.equal(parseStudyDeckParams("?book=sample-book&grade=5-sinif"), null);
  });

  it("finds a study deck by grade and part", () => {
    assert.deepEqual(findStudyDeck(book, "8-sinif", "p02"), book.studyDecks[1]);
  });

  it("returns null when no matching deck exists", () => {
    assert.equal(findStudyDeck(book, "2-sinif", "p99"), null);
  });

  it("finds lightweight study deck route metadata from the library index", () => {
    const libraryIndex = {
      books: [
        {
          slug: "sample-book",
          title: "Sample Book",
          studyDeckRoutes: book.studyDecks
        }
      ]
    };

    assert.deepEqual(findStudyDeckRoute(libraryIndex, { bookSlug: "sample-book", gradeSlug: "8-sinif", partNo: "p02" }), {
      book: libraryIndex.books[0],
      deck: book.studyDecks[1]
    });
    assert.equal(findStudyDeckRoute(libraryIndex, { bookSlug: "missing", gradeSlug: "8-sinif", partNo: "p02" }), null);
  });
});
