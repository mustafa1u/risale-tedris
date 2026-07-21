import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./searchBrowserWorker.js", import.meta.url);

describe("browser search worker entry", () => {
  it("keeps Vite's worker import behind a browser-only factory module", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /import SearchWorker from "\.\/searchWorker\.js\?worker"/);
    assert.match(source, /export function createBrowserSearchWorker/);
    assert.match(source, /return new SearchWorker\(\)/);
  });
});
