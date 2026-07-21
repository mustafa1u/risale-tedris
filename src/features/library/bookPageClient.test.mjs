import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPartFilterResult, normalizePartSearchText, partRowMatchesFilters } from "./bookPageClient.js";

describe("book page filter client helpers", () => {
  it("normalizes Turkish search text for part filtering", () => {
    assert.equal(normalizePartSearchText("İman-ı Billahın Âhireti"), "iman-i billahin ahireti");
    assert.equal(normalizePartSearchText("P55"), "p55");
  });

  it("matches rows by normalized search text and grade", () => {
    const row = {
      searchText: "p55 9. Mes'ele / 1. Nokta: İman-ı billahın âhireti isbatı",
      gradeSlugs: ["2-sinif", "8-sinif"]
    };

    assert.equal(partRowMatchesFilters(row, { searchValue: "iman ahiret", gradeValue: "" }), false);
    assert.equal(partRowMatchesFilters(row, { searchValue: "İman-ı", gradeValue: "" }), true);
    assert.equal(partRowMatchesFilters(row, { searchValue: "P55", gradeValue: "8-sinif" }), true);
    assert.equal(partRowMatchesFilters(row, { searchValue: "P55", gradeValue: "lisans" }), false);
  });

  it("keeps grade filtering tied to stable internal slugs, not visible range labels", () => {
    const row = {
      searchText: "p12 sample part",
      gradeSlugs: ["5-sinif"]
    };

    assert.equal(partRowMatchesFilters(row, { searchValue: "", gradeValue: "5-sinif" }), true);
    assert.equal(partRowMatchesFilters(row, { searchValue: "", gradeValue: "4-6. okul sınıfları" }), false);
    assert.equal(partRowMatchesFilters(row, { searchValue: "", gradeValue: "grades 4-6" }), false);
  });

  it("reports the visible rows, result count, and no-results state together", () => {
    const rows = [
      { searchText: "p01 Birinci parça iman", gradeSlugs: ["2-sinif"] },
      { searchText: "p02 İkinci parça ahiret", gradeSlugs: ["8-sinif"] }
    ];

    assert.deepEqual(getPartFilterResult(rows, { searchValue: "P02", gradeValue: "8-sinif" }), {
      matches: [false, true],
      visibleCount: 1,
      hasNoResults: false
    });
    assert.deepEqual(getPartFilterResult(rows, { searchValue: "bulunmayan", gradeValue: "" }), {
      matches: [false, false],
      visibleCount: 0,
      hasNoResults: true
    });
  });
});
