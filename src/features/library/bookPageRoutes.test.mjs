import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const routePaths = [
  new URL("../../pages/books/[bookSlug]/index.astro", import.meta.url),
  new URL("../../pages/en/books/[bookSlug]/index.astro", import.meta.url)
];

describe("localized book page routes", () => {
  it("pass the generated current-book shard reference and all book slugs to the shared page", async () => {
    for (const routePath of routePaths) {
      const source = await readFile(routePath, "utf8");

      assert.match(source, /const bookSummary = libraryIndex\.books\.find\(\(candidate\) => candidate\.slug === bookSlug\)/);
      assert.match(source, /<BookPage\s+book={book}\s+searchReference={bookSummary\.search}\s+availableBookSlugs={libraryIndex\.books\.map\(\(candidate\) => candidate\.slug\)}/s);
    }
  });
});
