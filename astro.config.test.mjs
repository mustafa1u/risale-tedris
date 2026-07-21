import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./astro.config.mjs", import.meta.url), "utf8");

test("externalizes the Preact SSR renderer from Vite's dev module transport", () => {
  assert.match(source, /ssr:\s*\{\s*external:\s*\["@astrojs\/preact"\]/s);
});
