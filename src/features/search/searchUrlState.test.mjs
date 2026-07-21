import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { createBookSearchState, createGlobalSearchState } from "./searchState.js";
import { parseSearchUrlState, serializeSearchUrlState } from "./searchUrlState.js";

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
});
