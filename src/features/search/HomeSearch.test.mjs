import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./HomeSearch.jsx", import.meta.url);
const controlsSourcePath = new URL("./SearchControls.jsx", import.meta.url);

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
    const controlsSource = await readFile(controlsSourcePath, "utf8");

    assert.match(controlsSource, /SEARCH_MODES\.map/);
    assert.match(controlsSource, /SEARCH_SCOPES\.map/);
    assert.match(controlsSource, /BOOLEAN_OPERATORS/);
    assert.match(source, /serializeBooleanRows/);
    assert.match(controlsSource, /text\.search\.booleanBuilder/);
    assert.match(controlsSource, /const modeExamples = text\.search\.help\.examples\[state\.mode\] \?\? \[\]/);
    assert.match(controlsSource, /search-mode-examples/);
    assert.match(controlsSource, /books\.map/);
    assert.match(source, /type:\s*"select-all-books"/);
    assert.match(source, /type:\s*"clear-books"/);
    assert.match(source, /async function syncSelectedBooks/);
    assert.match(source, /loaded\.newShards\.length/);
    assert.match(source, /setStatus\("provisional"\)/);
    assert.match(source, /onBookToggle=.*updateBookSelection/);
    assert.match(source, /replaceSearchUrlState/);
    assert.doesNotMatch(source, /pushState/);
    assert.match(source, /data-global-search-input/);
    assert.match(source, /data-search-result-count/);
    assert.match(source, /result\.bookTitle/);
    assert.match(source, /result\.partNo/);
    assert.match(source, /result\.title/);
    assert.match(source, /localizedPath\(locale, `\/books\/\$\{result\.bookSlug\}\/parts\/\$\{result\.partNo\}\/`\)/);
    assert.match(source, /text\.search\.actions\.clear/);
    assert.match(source, /text\.search\.actions\.close/);
  });

  it("serializes current search semantics into fixed-book result links", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /transferSearchContext/);
    assert.match(source, /serializeSearchUrlState/);
    assert.match(source, /context:\s*"book"/);
    assert.match(source, /currentBookSlug:\s*result\.bookSlug/);
    assert.match(source, /bookSearchHref\(result\)/);
    assert.match(source, /data-search-within-book/);
    assert.match(source, /data-search-result-link/);
  });
});
