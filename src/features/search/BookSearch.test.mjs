import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./BookSearch.jsx", import.meta.url);

describe("book search island source contract", () => {
  it("uses fixed book state and loads only the supplied current-book shard", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /createBookSearchState/);
    assert.match(source, /createSearchWorkerClient/);
    assert.match(source, /createSearchShardLoader/);
    assert.match(source, /shardLoader\.load\(\[book\]\)/);
    assert.match(source, /selectedBookSlugs:\s*\[book\.slug\]/);
    assert.doesNotMatch(source, /fetch\(manifestUrl/);
    assert.doesNotMatch(source, /toggle-book/);
  });

  it("presents ordered worker IDs and retains metadata fallback on load or worker failure", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /createPartRowPresenter/);
    assert.match(source, /presentOrderedPartNos\(response\.results\.map\(\(result\) => result\.partNo\)\)/);
    assert.match(source, /presentMetadata/);
    assert.match(source, /gradeSlug/);
    assert.match(source, /data-book-search-input/);
    assert.match(source, /data-book-grade-filter/);
  });

  it("restores transferred URL semantics in fixed context and broadens only through an explicit link", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /parseSearchUrlState/);
    assert.match(source, /transferSearchContext/);
    assert.match(source, /serializeSearchUrlState/);
    assert.match(source, /replaceSearchUrlState/);
    assert.doesNotMatch(source, /pushState/);
    assert.match(source, /availableBookSlugs/);
    assert.match(source, /text\.search\.actions\.globalSearch/);
    assert.match(source, /data-global-search-action/);
    assert.doesNotMatch(source, /onClick=.*context:\s*"global"/s);
  });
});
