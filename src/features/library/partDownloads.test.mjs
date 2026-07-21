import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPartDownloadGroups } from "./partDownloads.js";

const book = {
  slug: "sample-book",
  grades: [
    { slug: "2-sinif", label: "2. Sinif" },
    { slug: "8-sinif", label: "8. Sinif" }
  ],
  studyDecks: [
    {
      gradeSlug: "2-sinif",
      partNo: "p01",
      url: "/assets/sample-book/question-bank/2-sinif/p01.json"
    }
  ]
};

const part = {
  partNo: "p01",
  downloads: {
    "2-sinif": {
      BK: {
        docx: { url: "/assets/sample-book/2-sinif/BK.docx" },
        pdfNormal: { url: "/assets/sample-book/2-sinif/BK.pdf" },
        pdfMobile: { url: "/assets/sample-book/2-sinif/BK6.pdf" }
      },
      SK: {
        docx: { url: "/assets/sample-book/2-sinif/SK.docx" },
        pdfNormal: { url: "/assets/sample-book/2-sinif/SK.pdf" }
      }
    },
    "8-sinif": {
      BK: {
        docx: { url: "/assets/sample-book/8-sinif/BK.docx" }
      }
    }
  }
};

describe("part download view model", () => {
  it("groups each grade by flashcard and question-sheet material", () => {
    const groups = getPartDownloadGroups({ book, part });

    assert.equal(groups.length, 2);
    assert.deepEqual(
      groups.map((group) => ({
        gradeSlug: group.gradeSlug,
        materials: group.materials.map((material) => material.docType)
      })),
      [
        { gradeSlug: "2-sinif", materials: ["BK", "SK"] },
        { gradeSlug: "8-sinif", materials: ["BK", "SK"] }
      ]
    );
    assert.equal(groups.some((group) => group.defaultOpen), false);
  });

  it("preserves download URLs and unavailable action states", () => {
    const [firstGroup, secondGroup] = getPartDownloadGroups({ book, part });
    const flashcards = firstGroup.materials[0];
    const questionSheets = firstGroup.materials[1];
    const secondQuestionSheets = secondGroup.materials[1];

    assert.deepEqual(flashcards.actions, {
      study: { available: true, href: "/study/?book=sample-book&grade=2-sinif&part=p01" },
      docx: { available: true, href: "/assets/sample-book/2-sinif/BK.docx", download: true },
      pdfNormal: { available: true, href: "/assets/sample-book/2-sinif/BK.pdf", download: true },
      pdfMobile: { available: true, href: "/assets/sample-book/2-sinif/BK6.pdf", download: true }
    });
    assert.deepEqual(questionSheets.actions.pdfMobile, { available: false });
    assert.equal(secondQuestionSheets.actions.docx.available, false);
  });

  it("keeps all material action URLs stable while display labels are page-level", () => {
    const [firstGroup, secondGroup] = getPartDownloadGroups({ book, part });

    assert.deepEqual(
      firstGroup.materials.flatMap((material) =>
        Object.entries(material.actions)
          .filter(([, action]) => action.available)
          .map(([key, action]) => `${material.docType}:${key}:${action.href}`)
      ),
      [
        "BK:study:/study/?book=sample-book&grade=2-sinif&part=p01",
        "BK:docx:/assets/sample-book/2-sinif/BK.docx",
        "BK:pdfNormal:/assets/sample-book/2-sinif/BK.pdf",
        "BK:pdfMobile:/assets/sample-book/2-sinif/BK6.pdf",
        "SK:docx:/assets/sample-book/2-sinif/SK.docx",
        "SK:pdfNormal:/assets/sample-book/2-sinif/SK.pdf"
      ]
    );
    assert.deepEqual(
      secondGroup.materials.flatMap((material) =>
        Object.entries(material.actions)
          .filter(([, action]) => action.available)
          .map(([key, action]) => `${material.docType}:${key}:${action.href}`)
      ),
      ["BK:docx:/assets/sample-book/8-sinif/BK.docx"]
    );
  });

  it("does not generate study links when no study deck exists", () => {
    const groups = getPartDownloadGroups({ book, part });

    assert.deepEqual(groups[1].materials[0].actions.study, { available: false });
  });
});
