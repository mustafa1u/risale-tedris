import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { createBookSearchState, createGlobalSearchState } from "./searchState.js";
import {
  parseSearchUrlState,
  readSearchHistorySnapshot,
  replaceSearchUrlState,
  serializeSearchUrlState,
  writeSearchHistorySnapshot
} from "./searchUrlState.js";

const availableBookSlugs = ["ayetul-kubra", "meyve-risalesi", "tabiat-risalesi"];
const availableGradeSlugs = ["2-sinif", "8-sinif", "11-sinif"];

describe("search URL state", () => {
  it("serializes global state in canonical order and excludes presentation state", () => {
    const state = {
      ...createGlobalSearchState(availableBookSlugs),
      query: "iman nur",
      selectedBookSlugs: ["meyve-risalesi", "ayetul-kubra"],
      mode: "exact",
      scopes: ["title", "text"],
      proximityDistance: 10,
      expanded: true
    };

    assert.equal(
      serializeSearchUrlState(state),
      "q=iman+nur&context=global&books=ayetul-kubra%2Cmeyve-risalesi&mode=exact&scope=text%2Ctitle&distance=10"
    );
  });

  it("round-trips book context, grade, defaults, and an empty query", () => {
    const state = createBookSearchState("meyve-risalesi", "8-sinif");
    const serialized = serializeSearchUrlState(state);

    assert.equal(
      serialized,
      "context=meyve-risalesi&mode=all&scope=text%2Ctitle%2CpartNo&distance=5&grade=8-sinif"
    );
    assert.deepEqual(parseSearchUrlState(serialized, { availableBookSlugs, availableGradeSlugs }), state);
  });

  it("keeps valid subsets while rejecting unknown URL values safely", () => {
    const parsed = parseSearchUrlState(
      "q=rahmet&context=global&books=unknown%2Cmeyve-risalesi&mode=invalid&scope=unknown%2Ctitle&distance=99&grade=invalid&extra=value",
      { availableBookSlugs, availableGradeSlugs }
    );

    assert.deepEqual(parsed, {
      ...createGlobalSearchState(availableBookSlugs),
      query: "rahmet",
      selectedBookSlugs: ["meyve-risalesi"],
      scopes: ["title"]
    });
  });

  it("falls back to the current page context when URL context is unknown", () => {
    const parsed = parseSearchUrlState("q=iman&context=missing-book", {
      availableBookSlugs,
      availableGradeSlugs,
      currentBookSlug: "ayetul-kubra",
      currentGradeSlug: "11-sinif"
    });

    assert.deepEqual(parsed, {
      ...createBookSearchState("ayetul-kubra", "11-sinif"),
      query: "iman"
    });
  });

  it("does not persist raw query text through localStorage", async () => {
    const source = await readFile(new URL("./searchUrlState.js", import.meta.url), "utf8");

    assert.doesNotMatch(source, /localStorage/);
  });

  it("replaces the current path URL canonically while preserving history state and hash", () => {
    const state = {
      ...createGlobalSearchState(availableBookSlugs),
      query: "iman nur",
      selectedBookSlugs: ["meyve-risalesi"]
    };
    const calls = [];
    const currentHistoryState = { scroll: 480 };
    const historyImpl = {
      state: currentHistoryState,
      replaceState(...args) {
        calls.push(args);
      }
    };

    assert.equal(
      replaceSearchUrlState(state, {
        historyImpl,
        locationImpl: { pathname: "/library/", hash: "#results" }
      }),
      "/library/?q=iman+nur&context=global&books=meyve-risalesi&mode=all&scope=text%2Ctitle%2CpartNo&distance=5#results"
    );
    assert.deepEqual(calls, [[
      currentHistoryState,
      "",
      "/library/?q=iman+nur&context=global&books=meyve-risalesi&mode=all&scope=text%2Ctitle%2CpartNo&distance=5#results"
    ]]);
  });

  it("round-trips an exact-state result and scroll snapshot without losing unrelated history state", () => {
    const state = { ...createGlobalSearchState(availableBookSlugs), query: "iman" };
    const historyImpl = {
      state: { astro: { index: 2 } },
      replaceState(nextState, _title, nextUrl) {
        this.state = nextState;
        this.url = nextUrl;
      }
    };
    const results = [{ bookSlug: "meyve-risalesi", partNo: "p55", title: "İman", matchedFields: ["text"] }];

    writeSearchHistorySnapshot(state, { results, total: 7, scrollY: 420 }, {
      historyImpl,
      locationImpl: { pathname: "/", search: `?${serializeSearchUrlState(state)}`, hash: "" }
    });

    assert.deepEqual(historyImpl.state.astro, { index: 2 });
    assert.deepEqual(readSearchHistorySnapshot(state, { historyImpl }), { results, total: 7, scrollY: 420 });
    assert.equal(readSearchHistorySnapshot({ ...state, query: "rahmet" }, { historyImpl }), null);
  });
});
