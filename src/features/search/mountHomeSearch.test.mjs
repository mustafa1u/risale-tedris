import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./mountHomeSearch.jsx", import.meta.url);

describe("homepage search client mount", () => {
  it("mounts only inside the dedicated host without hydrating the header", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /from "preact"/);
    assert.match(source, /from "\.\/HomeSearch\.jsx"/);
    assert.match(source, /querySelectorAll\("\[data-home-search-host\]"\)/);
    assert.match(source, /const fallbackNodes = Array\.from\(host\.childNodes/);
    assert.match(source, /host\.replaceChildren\(\);\s*render\(/);
    assert.match(source, /render\(\s*<HomeSearch/);
    assert.match(source, /host\.replaceChildren\(\.\.\.fallbackNodes\)/);
    assert.doesNotMatch(source, /site-header/);
  });
});
