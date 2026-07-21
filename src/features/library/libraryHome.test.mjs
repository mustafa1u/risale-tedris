import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getHomepageCtas,
  getHomepageGradeRanges,
  getHomepageStats
} from "./libraryHome.js";

const makeLibrary = () => ({
  stats: {
    bookCount: 4,
    partCount: 321,
    docxCount: 3210,
    pdfNormalCount: 3210,
    pdfMobileCount: 3210
  },
  books: [
    {
      grades: [
        { slug: "2-sinif" },
        { slug: "5-sinif" },
        { slug: "8-sinif" }
      ]
    },
    {
      grades: [
        { slug: "8-sinif" },
        { slug: "11-sinif" },
        { slug: "lisans" }
      ]
    }
  ]
});

describe("library homepage helpers", () => {
  it("builds the homepage stat summary from library data", () => {
    assert.deepEqual(getHomepageStats(makeLibrary()), [
      { key: "books", value: 4 },
      { key: "parts", value: 321 },
      { key: "gradeLevels", value: 5 },
      { key: "formats", formats: ["word", "pdf", "mobilePdf"] }
    ]);
  });

  it("does not advertise unavailable output formats", () => {
    const library = makeLibrary();
    library.stats.pdfMobileCount = 0;

    assert.deepEqual(getHomepageStats(library).at(-1), {
      key: "formats",
      formats: ["word", "pdf"]
    });
  });

  it("routes homepage calls to action to their dedicated pages", () => {
    assert.deepEqual(getHomepageCtas(), {
      booksHref: "/books/",
      lessonFlowHref: "/lesson-flow/"
    });
  });

  it("builds unique homepage grade-range chips in source order", () => {
    assert.deepEqual(getHomepageGradeRanges(makeLibrary()), [
      { slug: "2-sinif" },
      { slug: "5-sinif" },
      { slug: "8-sinif" },
      { slug: "11-sinif" },
      { slug: "lisans" }
    ]);
  });
});
