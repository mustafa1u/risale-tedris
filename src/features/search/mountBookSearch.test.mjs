import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./mountBookSearch.jsx", import.meta.url);

describe("book search client mount", () => {
  it("mounts only inside dedicated book hosts and restores the metadata fallback on failure", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /querySelectorAll\("\[data-book-search-host\]"\)/);
    assert.match(source, /const fallbackNodes = Array\.from\(host\.childNodes/);
    assert.match(source, /render\(\s*<BookSearch/);
    assert.match(source, /host\.replaceChildren\(\.\.\.fallbackNodes\)/);
    assert.match(source, /initPartFilters\(document\)/);
  });
});
