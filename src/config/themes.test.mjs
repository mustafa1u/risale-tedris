import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./themes.ts", import.meta.url);

describe("theme configuration", () => {
  it("uses RisaleTedris by default while preserving the four existing themes", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /export const ACTIVE_THEME: ThemeName = "risaleTedris";/);
    assert.match(source, /export const THEMES = \{\s*risaleTedris: \{\},\s*slate: \{\},\s*field: \{\},\s*ink: \{\},\s*school: \{\}/);
  });
});
