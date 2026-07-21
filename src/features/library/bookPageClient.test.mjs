import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPartRowPresenter,
  getPartFilterResult,
  normalizePartSearchText,
  partRowMatchesFilters
} from "./bookPageClient.js";

function createPresenterFixture() {
  const attributes = new Map([
    ["p01", { "data-part-no": "p01", "data-search": "p01 Birinci parça iman", "data-grades": "2-sinif" }],
    ["p02", { "data-part-no": "p02", "data-search": "p02 İkinci parça ahiret", "data-grades": "8-sinif" }],
    ["p03", { "data-part-no": "p03", "data-search": "p03 Üçüncü parça iman", "data-grades": "8-sinif" }]
  ]);
  const rows = [...attributes].map(([partNo, rowAttributes]) => ({
    partNo,
    hidden: false,
    linkIdentity: `/books/fixture/parts/${partNo}/`,
    getAttribute(name) {
      return rowAttributes[name] ?? null;
    },
    toggleAttribute(name, enabled) {
      if (name === "hidden") this.hidden = enabled;
    }
  }));
  const list = {
    children: [...rows],
    append(row) {
      this.children = this.children.filter((candidate) => candidate !== row);
      this.children.push(row);
    }
  };
  const status = {
    textContent: "",
    getAttribute(name) {
      return name === "data-count-one" ? "{count} sonuç bulundu" : "{count} sonuç bulundu";
    }
  };
  const empty = { hidden: true };
  const root = {
    querySelector(selector) {
      return selector === "[data-part-list]" ? list : selector === "[data-filter-status]" ? status : empty;
    },
    querySelectorAll() {
      return rows;
    }
  };
  return { empty, list, root, rows, status };
}

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

  it("reorders existing canonical rows from ordered worker part identifiers without cloning them", () => {
    const fixture = createPresenterFixture();
    const originalRows = [...fixture.rows];
    const presenter = createPartRowPresenter(fixture.root);

    const result = presenter.presentOrderedPartNos(["p03", "p01"]);

    assert.deepEqual(result, { visibleCount: 2, hasNoResults: false });
    assert.deepEqual(fixture.list.children.map((row) => row.partNo), ["p03", "p01", "p02"]);
    assert.equal(fixture.list.children[0], originalRows[2]);
    assert.equal(fixture.list.children[1], originalRows[0]);
    assert.deepEqual(fixture.rows.map((row) => row.hidden), [false, true, false]);
    assert.deepEqual(fixture.rows.map((row) => row.linkIdentity), [
      "/books/fixture/parts/p01/",
      "/books/fixture/parts/p02/",
      "/books/fixture/parts/p03/"
    ]);
    assert.equal(fixture.status.textContent, "2 sonuç bulundu");
    assert.equal(fixture.empty.hidden, true);
  });

  it("uses the same presenter for combined metadata query and grade fallback", () => {
    const fixture = createPresenterFixture();
    const presenter = createPartRowPresenter(fixture.root);

    assert.deepEqual(
      presenter.presentMetadata({ searchValue: "iman", gradeValue: "8-sinif" }),
      { visibleCount: 1, hasNoResults: false }
    );
    assert.deepEqual(fixture.list.children.map((row) => row.partNo), ["p03", "p01", "p02"]);
    assert.deepEqual(fixture.rows.map((row) => row.hidden), [true, true, false]);

    assert.deepEqual(
      presenter.presentMetadata({ searchValue: "bulunmayan", gradeValue: "" }),
      { visibleCount: 0, hasNoResults: true }
    );
    assert.equal(fixture.status.textContent, "0 sonuç bulundu");
    assert.equal(fixture.empty.hidden, false);
  });
});
