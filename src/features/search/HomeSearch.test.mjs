import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./HomeSearch.jsx", import.meta.url);

describe("homepage search island source contract", () => {
  it("uses shared state, worker, scheduler, and intent-triggered manifest loading", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /createGlobalSearchState/);
    assert.match(source, /searchReducer/);
    assert.match(source, /createSearchWorkerClient/);
    assert.match(source, /createSearchShardLoader/);
    assert.match(source, /createSearchQueryScheduler/);
    assert.match(source, /fetch\(manifestUrl/);
    assert.match(source, /await import\("\.\/searchBrowserWorker\.js"\)/);
    assert.match(source, /createBrowserSearchWorker\(\)/);
    assert.doesNotMatch(source, /useEffect\(\(\) => \{\s*ensureResources\(\)/);
  });

  it("renders all modes, all field scopes, book selection, status, actions, and cross-book result links", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /SEARCH_MODES\.map/);
    assert.match(source, /SEARCH_SCOPES\.map/);
    assert.match(source, /BOOLEAN_OPERATORS/);
    assert.match(source, /serializeBooleanRows/);
    assert.match(source, /text\.search\.booleanBuilder/);
    assert.match(source, /const modeExamples = text\.search\.help\.examples\[state\.mode\] \?\? \[\]/);
    assert.match(source, /search-mode-examples/);
    assert.match(source, /books\.map/);
    assert.match(source, /data-global-search-input/);
    assert.match(source, /data-search-result-count/);
    assert.match(source, /result\.bookTitle/);
    assert.match(source, /result\.partNo/);
    assert.match(source, /result\.title/);
    assert.match(source, /localizedPath\(locale, `\/books\/\$\{result\.bookSlug\}\/parts\/\$\{result\.partNo\}\/`\)/);
    assert.match(source, /text\.search\.actions\.clear/);
    assert.match(source, /text\.search\.actions\.close/);
  });
});
