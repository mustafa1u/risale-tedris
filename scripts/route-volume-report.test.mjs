import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatRouteVolumeReport, getRouteVolume, parseGeneratedLibraryIndex } from "./route-volume-report.mjs";

const libraryIndex = {
  books: [
    {
      slug: "book-a",
      partRoutes: [{ partNo: "p01" }, { partNo: "p02" }],
      studyDeckRoutes: [
        { gradeSlug: "2-sinif", partNo: "p01" },
        { gradeSlug: "5-sinif", partNo: "p01" },
        { gradeSlug: "2-sinif", partNo: "p02" }
      ]
    },
    {
      slug: "book-b",
      partRoutes: [{ partNo: "p01" }],
      studyDeckRoutes: [{ gradeSlug: "2-sinif", partNo: "p01" }]
    }
  ]
};

describe("route volume report", () => {
  it("parses the generated library index from TypeScript source", () => {
    const source = `export const libraryIndex = ${JSON.stringify(libraryIndex)} satisfies LibraryIndex;`;

    assert.deepEqual(parseGeneratedLibraryIndex(source), libraryIndex);
  });

  it("counts static route families and the Phase 6 study-shell reduction", () => {
    assert.deepEqual(getRouteVolume(libraryIndex), {
      locales: 2,
      baseStaticPages: 4,
      studyIndexJsonOutputs: 1,
      bookPages: 4,
      partPages: 6,
      perDeckStudyPages: 8,
      shellStudyPages: 2,
      phase5TotalPages: 22,
      phase6ShellHtmlPages: 16,
      phase6ShellStaticOutputs: 17,
      removedStudyPages: 6,
      bookCount: 2,
      partCount: 3,
      studyDeckCount: 4
    });
  });

  it("formats a report with the build-timing follow-up command", () => {
    const report = formatRouteVolumeReport(getRouteVolume(libraryIndex));

    assert.match(report, /Study pages in Phase 5 per-deck model: 8/);
    assert.match(report, /Study pages in Phase 6 shell model: 2/);
    assert.match(report, /Estimated HTML pages after Phase 6: 16/);
    assert.match(report, /Estimated static outputs after Phase 6: 17/);
    assert.match(report, /npm run build:timed/);
  });
});
