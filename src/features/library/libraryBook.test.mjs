import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPartCapabilityItems } from "./libraryBook.js";

const makePart = (downloads) => ({
  partNo: "p01",
  title: "Part One",
  textUrl: "/assets/sample/part-one.txt",
  downloads
});

describe("book page helpers", () => {
  it("derives part capability badges from available downloads", () => {
    const part = makePart({
      "2-sinif": {
        BK: { docx: { url: "/bk.docx" } },
        SK: { pdfNormal: { url: "/sk.pdf" } }
      },
      "5-sinif": {
        BK: { pdfMobile: { url: "/bk-mobile.pdf" } }
      }
    });

    assert.deepEqual(getPartCapabilityItems(part), [
      { key: "text" },
      { key: "gradeLevels", count: 2 },
      { key: "flashcards" },
      { key: "questionSheets" }
    ]);
  });

  it("omits badges for missing capabilities", () => {
    const part = makePart({
      "8-sinif": {
        SK: { docx: { url: "/sk.docx" } }
      }
    });
    part.textUrl = "";

    assert.deepEqual(getPartCapabilityItems(part), [
      { key: "gradeLevels", count: 1 },
      { key: "questionSheets" }
    ]);
  });
});
