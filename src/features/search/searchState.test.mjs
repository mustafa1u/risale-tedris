import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canToggleSearchBook,
  canToggleSearchScope,
  createBookSearchState,
  createGlobalSearchState,
  searchReducer,
  transferSearchContext
} from "./searchState.js";

const defaultSharedState = {
  query: "",
  mode: "all",
  scopes: ["text", "title", "partNo"],
  gradeSlug: null,
  proximityDistance: 5,
  expanded: false
};

describe("search state defaults", () => {
  it("selects every available book in the default global state", () => {
    assert.deepEqual(createGlobalSearchState(["ayetul-kubra", "meyve-risalesi"]), {
      context: "global",
      availableBookSlugs: ["ayetul-kubra", "meyve-risalesi"],
      selectedBookSlugs: ["ayetul-kubra", "meyve-risalesi"],
      currentBookSlug: null,
      ...defaultSharedState
    });
  });

  it("fixes book context to the current book and preserves an optional current grade", () => {
    assert.deepEqual(createBookSearchState("meyve-risalesi", "8-sinif"), {
      context: "book",
      availableBookSlugs: ["meyve-risalesi"],
      selectedBookSlugs: ["meyve-risalesi"],
      currentBookSlug: "meyve-risalesi",
      ...defaultSharedState,
      gradeSlug: "8-sinif"
    });
    assert.equal(createBookSearchState("meyve-risalesi").gradeSlug, null);
  });
});

describe("search state reducer", () => {
  it("updates shared state immutably while preserving explicit context", () => {
    const initial = createBookSearchState("meyve-risalesi");
    const queried = searchReducer(initial, { type: "set-query", query: "iman nur" });
    const exact = searchReducer(queried, { type: "set-mode", mode: "exact" });
    const ranged = searchReducer(exact, { type: "set-proximity-distance", distance: 10 });
    const graded = searchReducer(ranged, { type: "set-grade", gradeSlug: "11-sinif" });
    const expanded = searchReducer(graded, { type: "set-expanded", expanded: true });

    assert.equal(initial.query, "");
    assert.equal(expanded.context, "book");
    assert.equal(expanded.currentBookSlug, "meyve-risalesi");
    assert.equal(expanded.query, "iman nur");
    assert.equal(expanded.mode, "exact");
    assert.equal(expanded.proximityDistance, 10);
    assert.equal(expanded.gradeSlug, "11-sinif");
    assert.equal(expanded.expanded, true);
  });

  it("prevents removing the last scope and exposes the guard to controls", () => {
    const initial = createGlobalSearchState(["ayetul-kubra"]);
    const withoutText = searchReducer(initial, { type: "toggle-scope", scope: "text" });
    const lastScope = searchReducer(withoutText, { type: "toggle-scope", scope: "title" });

    assert.deepEqual(lastScope.scopes, ["partNo"]);
    assert.equal(canToggleSearchScope(lastScope, "partNo"), false);
    assert.equal(searchReducer(lastScope, { type: "toggle-scope", scope: "partNo" }), lastScope);
  });

  it("prevents removing the last global book and keeps book context fixed", () => {
    const global = createGlobalSearchState(["ayetul-kubra", "meyve-risalesi"]);
    const oneBook = searchReducer(global, { type: "toggle-book", bookSlug: "ayetul-kubra" });
    const book = createBookSearchState("meyve-risalesi");

    assert.deepEqual(oneBook.selectedBookSlugs, ["meyve-risalesi"]);
    assert.equal(canToggleSearchBook(oneBook, "meyve-risalesi"), false);
    assert.equal(searchReducer(oneBook, { type: "toggle-book", bookSlug: "meyve-risalesi" }), oneBook);
    assert.equal(canToggleSearchBook(book, "meyve-risalesi"), false);
    assert.equal(searchReducer(book, { type: "toggle-book", bookSlug: "meyve-risalesi" }), book);
  });
});

describe("search context transfer", () => {
  it("narrows a global query to the chosen current book without losing search semantics", () => {
    const global = {
      ...createGlobalSearchState(["ayetul-kubra", "meyve-risalesi"]),
      query: "iman nur",
      mode: "proximity",
      scopes: ["text", "title"],
      proximityDistance: 10,
      expanded: true
    };

    assert.deepEqual(
      transferSearchContext(global, {
        context: "book",
        currentBookSlug: "meyve-risalesi",
        currentGradeSlug: "8-sinif"
      }),
      {
        ...createBookSearchState("meyve-risalesi", "8-sinif"),
        query: "iman nur",
        mode: "proximity",
        scopes: ["text", "title"],
        proximityDistance: 10,
        expanded: true
      }
    );
    assert.equal(global.context, "global");
  });

  it("broadens book search only through an explicit global transfer and restores all books", () => {
    const book = {
      ...createBookSearchState("meyve-risalesi", "8-sinif"),
      query: "rahmet",
      mode: "exact",
      scopes: ["text"]
    };

    assert.deepEqual(
      transferSearchContext(book, {
        context: "global",
        availableBookSlugs: ["ayetul-kubra", "meyve-risalesi", "tabiat-risalesi"]
      }),
      {
        ...createGlobalSearchState(["ayetul-kubra", "meyve-risalesi", "tabiat-risalesi"]),
        query: "rahmet",
        mode: "exact",
        scopes: ["text"]
      }
    );
  });
});
