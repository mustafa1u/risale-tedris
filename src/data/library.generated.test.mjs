import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

async function readGeneratedIndexSource() {
  return readFile(new URL("./library.generated.ts", import.meta.url), "utf8");
}

function parseGeneratedIndex(source) {
  const match = source.match(/export const libraryIndex = ([\s\S]+?) satisfies LibraryIndex;/);

  assert.ok(match, "Expected generated libraryIndex export");

  return JSON.parse(match[1]);
}

describe("generated library data split", () => {
  it("keeps the generated index free of full download payloads", async () => {
    const source = await readGeneratedIndexSource();

    assert.match(source, /export const libraryIndex = /);
    assert.match(source, /export async function loadBook/);
    assert.match(source, /export async function loadLibrary/);
    assert.doesNotMatch(source, /"downloads":/);
    assert.doesNotMatch(source, /"text":/);
  });

  it("keeps lightweight search references aligned with generated search assets", async () => {
    const index = parseGeneratedIndex(await readGeneratedIndexSource());
    const manifestPath = new URL(`../../public${index.search.manifestUrl}`, import.meta.url);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    assert.equal(index.search.schemaVersion, 1);
    assert.match(index.search.manifestContentHash, /^[a-f0-9]{64}$/);
    assert.match(index.search.manifestUrl, /^\/assets\/search\/manifest\.[a-f0-9]{64}\.v1\.json$/);
    assert.equal(manifest.books.length, index.books.length);
    assert.equal(index.search.totalRawBytes, manifest.books.reduce((total, book) => total + book.rawBytes, 0));

    for (const [position, book] of index.books.entries()) {
      const manifestBook = manifest.books[position];
      assert.deepEqual(book.search, manifestBook);
      assert.equal(book.search.slug, book.slug);
      assert.equal(book.search.recordCount, book.partCount);

      const shardPath = new URL(`../../public${book.search.shardUrl}`, import.meta.url);
      const shard = JSON.parse(await readFile(shardPath, "utf8"));
      assert.equal(shard.bookSlug, book.slug);
      assert.equal(shard.contentHash, book.search.contentHash);
      assert.equal(shard.records.length, book.partCount);
    }
  });

  it("keeps summary route metadata consistent with global stats", async () => {
    const index = parseGeneratedIndex(await readGeneratedIndexSource());
    const summaryTotals = index.books.reduce(
      (totals, book) => ({
        parts: totals.parts + book.partRoutes.length,
        studyDecks: totals.studyDecks + book.studyDeckRoutes.length
      }),
      { parts: 0, studyDecks: 0 }
    );

    assert.equal(index.stats.bookCount, index.books.length);
    assert.equal(index.stats.partCount, summaryTotals.parts);
    assert.equal(index.stats.studyDeckCount, summaryTotals.studyDecks);

    for (const book of index.books) {
      assert.equal(book.partCount, book.partRoutes.length);
      assert.equal(book.studyDeckCount, book.studyDeckRoutes.length);
    }
  });

  it("keeps lightweight study shell metadata in the generated index", async () => {
    const index = parseGeneratedIndex(await readGeneratedIndexSource());
    const deck = index.books.find((book) => book.slug === "meyve-risalesi")?.studyDeckRoutes.find(
      (item) => item.gradeSlug === "8-sinif" && item.partNo === "p55"
    );

    assert.ok(deck, "Expected representative study deck route metadata");
    assert.equal(deck.url, "/assets/meyve-risalesi/question-bank/8-sinif/p55.json");
    assert.equal(deck.cardCount, 24);
    assert.equal(typeof deck.title, "string");
    assert.equal(typeof deck.sourceTitle, "string");
    assert.match(deck.sourceTextUrl, /\/assets\/meyve-risalesi\/parcalar\/.+\.txt$/);
  });

  it("writes the compact study shell index as a static asset", async () => {
    const source = await readFile(new URL("./study-index.generated.json", import.meta.url), "utf8");
    const studyIndex = JSON.parse(source);
    const deck = studyIndex.books.find((book) => book.slug === "meyve-risalesi")?.studyDeckRoutes.find(
      (item) => item.gradeSlug === "8-sinif" && item.partNo === "p55"
    );

    assert.ok(deck, "Expected representative study deck in static study index");
    assert.equal(deck.url, "/assets/meyve-risalesi/question-bank/8-sinif/p55.json");
    assert.equal(deck.cardCount, 24);
    assert.doesNotMatch(source, /"downloads":/);
  });

  it("writes one full generated module for each indexed book", async () => {
    const index = parseGeneratedIndex(await readGeneratedIndexSource());

    for (const book of index.books) {
      const source = await readFile(new URL(`./books/${book.slug}.generated.ts`, import.meta.url), "utf8");

      assert.match(source, /import type { LibraryBook } from "@\/types\/library";/);
      assert.match(source, /export const book = /);
      assert.match(source, /satisfies LibraryBook;/);
      assert.match(source, /"downloads":/);
    }
  });
});
