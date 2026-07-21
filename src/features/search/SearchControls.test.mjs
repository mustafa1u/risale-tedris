import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const controlsPath = new URL("./SearchControls.jsx", import.meta.url);
const homePath = new URL("./HomeSearch.jsx", import.meta.url);
const bookPath = new URL("./BookSearch.jsx", import.meta.url);

describe("shared search controls source contract", () => {
  it("owns the shared modes, scopes, Boolean builder, proximity, and help controls", async () => {
    const source = await readFile(controlsPath, "utf8");

    assert.match(source, /SEARCH_MODES\.map/);
    assert.match(source, /SEARCH_SCOPES\.map/);
    assert.match(source, /BOOLEAN_OPERATORS/);
    assert.match(source, /text\.search\.booleanBuilder/);
    assert.match(source, /text\.search\.proximity/);
    assert.match(source, /text\.search\.help/);
    assert.match(source, /text\.search\.books\.selectAll/);
    assert.match(source, /text\.search\.books\.clearSelection/);
    assert.match(source, /onSelectAllBooks/);
    assert.match(source, /onClearBooks/);
  });

  it("is rendered by both global and fixed-book search islands", async () => {
    const [homeSource, bookSource] = await Promise.all([
      readFile(homePath, "utf8"),
      readFile(bookPath, "utf8")
    ]);

    assert.match(homeSource, /import SearchControls.*from "\.\/SearchControls\.jsx"/);
    assert.match(bookSource, /import SearchControls.*from "\.\/SearchControls\.jsx"/);
    assert.match(homeSource, /<SearchControls/);
    assert.match(bookSource, /<SearchControls/);
  });
});
