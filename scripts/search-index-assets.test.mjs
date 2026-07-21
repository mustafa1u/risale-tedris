import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { generateSearchAssets, validateGeneratedSearchAssets } from "./search-index-assets.mjs";

const roots = [];
const generatedAt = "2026-07-13T00:00:00.000Z";

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function makeRoot() {
  const root = await mkdtemp(join(tmpdir(), "rissor-search-assets-"));
  roots.push(root);
  return root;
}

function makePart(bookSlug, number, overrides = {}) {
  const partNo = `p${String(number).padStart(2, "0")}`;
  return {
    partNo,
    partNumber: number,
    title: `Başlık ${number}`,
    labelSlug: `baslik-${number}`,
    textSourcePath: `assets/${bookSlug}/parcalar/${bookSlug}-${partNo}.txt`,
    downloads: {
      "8-sinif": {},
      "2-sinif": {}
    },
    ...overrides
  };
}

function makeBook(slug, title, partCount = 2) {
  return {
    slug,
    title,
    parts: Array.from({ length: partCount }, (_, index) => makePart(slug, index + 1))
  };
}

async function writeBookSources(root, book, texts = []) {
  for (const [index, part] of book.parts.entries()) {
    const path = join(root, part.textSourcePath);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, texts[index] ?? `Metin ${index + 1}: iman ve nur.`, "utf8");
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readOutputFiles(outDir) {
  const names = (await readdir(outDir)).sort();
  const entries = await Promise.all(names.map(async (name) => [name, await readFile(join(outDir, name), "utf8")]));
  return Object.fromEntries(entries);
}

describe("search asset generation", () => {
  it("writes one canonical ordered shard record per manifest part", async () => {
    const root = await makeRoot();
    const outDir = join(root, "public", "assets", "search");
    const book = makeBook("fixture-book", "Fixture Kitabı");
    await writeBookSources(root, book, ["İlk metin.", "İkinci metin."]);

    const result = await generateSearchAssets({ root, outDir, books: [book], generatedAt });
    const shard = await readJson(result.shards[0].filePath);

    assert.equal(shard.schemaVersion, 1);
    assert.equal(shard.bookSlug, "fixture-book");
    assert.equal(shard.bookTitle, "Fixture Kitabı");
    assert.deepEqual(shard.records, [
      {
        partNo: "p01",
        partNumber: 1,
        title: "Başlık 1",
        labelSlug: "baslik-1",
        gradeSlugs: ["2-sinif", "8-sinif"],
        text: "İlk metin."
      },
      {
        partNo: "p02",
        partNumber: 2,
        title: "Başlık 2",
        labelSlug: "baslik-2",
        gradeSlugs: ["2-sinif", "8-sinif"],
        text: "İkinci metin."
      }
    ]);
  });

  it("preserves per-part grade coverage from study decks when document assets are unavailable", async () => {
    const root = await makeRoot();
    const outDir = join(root, "public", "assets", "search");
    const book = makeBook("fixture-book", "Fixture Kitabı", 1);
    book.parts[0].downloads = {};
    book.studyDecks = [
      { partNo: "p01", gradeSlug: "8-sinif" },
      { partNo: "p01", gradeSlug: "2-sinif" },
      { partNo: "p02", gradeSlug: "11-sinif" }
    ];
    await writeBookSources(root, book, ["İman ve nur."]);

    const result = await generateSearchAssets({ root, outDir, books: [book], generatedAt });
    const shard = await readJson(result.shards[0].filePath);

    assert.deepEqual(shard.records[0].gradeSlugs, ["2-sinif", "8-sinif"]);
  });

  it("writes a versioned ordered global manifest with complete shard metadata", async () => {
    const root = await makeRoot();
    const outDir = join(root, "public", "assets", "search");
    const zBook = makeBook("z-book", "Z Kitabı", 1);
    const aBook = makeBook("a-book", "A Kitabı", 1);
    await writeBookSources(root, zBook, ["abc"]);
    await writeBookSources(root, aBook, ["İman"]);

    const result = await generateSearchAssets({ root, outDir, books: [zBook, aBook], generatedAt });
    const manifest = await readJson(result.manifest.filePath);

    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.generatedAt, generatedAt);
    assert.deepEqual(manifest.books.map((book) => book.slug), ["a-book", "z-book"]);
    assert.deepEqual(manifest.books.map(({ title, recordCount, rawBytes }) => ({ title, recordCount, rawBytes })), [
      { title: "A Kitabı", recordCount: 1, rawBytes: 5 },
      { title: "Z Kitabı", recordCount: 1, rawBytes: 3 }
    ]);
    for (const book of manifest.books) {
      assert.match(book.contentHash, /^[a-f0-9]{64}$/);
      assert.equal(book.shardUrl, `/assets/search/${book.slug}.${book.contentHash}.v1.json`);
    }
    assert.match(result.manifest.fileName, /^manifest\.[a-f0-9]{64}\.v1\.json$/);
  });

  it("produces byte-identical JSON and hashes for identical inputs", async () => {
    const root = await makeRoot();
    const book = makeBook("fixture-book", "Fixture Kitabı");
    await writeBookSources(root, book);
    const firstOut = join(root, "first");
    const secondOut = join(root, "second");

    const first = await generateSearchAssets({ root, outDir: firstOut, books: [book], generatedAt });
    const second = await generateSearchAssets({ root, outDir: secondOut, books: [book], generatedAt });

    assert.equal(first.manifest.fileName, second.manifest.fileName);
    assert.deepEqual(await readOutputFiles(firstOut), await readOutputFiles(secondOut));
  });

  it("changes only the affected book hash and the referencing manifest hash", async () => {
    const root = await makeRoot();
    const firstBook = makeBook("first-book", "Birinci Kitap", 1);
    const secondBook = makeBook("second-book", "İkinci Kitap", 1);
    await writeBookSources(root, firstBook, ["değişmeyen metin"]);
    await writeBookSources(root, secondBook, ["ilk metin"]);

    const first = await generateSearchAssets({ root, outDir: join(root, "first"), books: [firstBook, secondBook], generatedAt });
    await writeBookSources(root, secondBook, ["değişen metin"]);
    const second = await generateSearchAssets({ root, outDir: join(root, "second"), books: [firstBook, secondBook], generatedAt });
    const firstEntries = Object.fromEntries(first.manifest.document.books.map((book) => [book.slug, book]));
    const secondEntries = Object.fromEntries(second.manifest.document.books.map((book) => [book.slug, book]));

    assert.equal(firstEntries["first-book"].contentHash, secondEntries["first-book"].contentHash);
    assert.notEqual(firstEntries["second-book"].contentHash, secondEntries["second-book"].contentHash);
    assert.notEqual(first.manifest.fileName, second.manifest.fileName);
  });

  it("does not touch byte-identical files and reports raw and gzip sizes", async () => {
    const root = await makeRoot();
    const outDir = join(root, "search");
    const book = makeBook("fixture-book", "Fixture Kitabı");
    await writeBookSources(root, book);

    const first = await generateSearchAssets({ root, outDir, books: [book], generatedAt });
    const fixedTime = new Date("2001-01-01T00:00:00.000Z");
    const paths = [first.manifest.filePath, ...first.shards.map((shard) => shard.filePath)];
    await Promise.all(paths.map((path) => utimes(path, fixedTime, fixedTime)));

    const second = await generateSearchAssets({ root, outDir, books: [book], generatedAt });
    const mtimes = await Promise.all(paths.map(async (path) => (await stat(path)).mtimeMs));

    assert.deepEqual(mtimes, paths.map(() => fixedTime.getTime()));
    assert.equal(second.shards[0].written, false);
    assert.equal(second.manifest.written, false);
    assert.ok(second.shards[0].assetBytes > 0);
    assert.ok(second.shards[0].gzipBytes > 0);
    assert.equal(second.totals.rawTextBytes, second.shards[0].rawBytes);
    assert.equal(second.totals.assetBytes, second.shards[0].assetBytes + second.manifest.assetBytes);
    assert.equal(second.totals.gzipBytes, second.shards[0].gzipBytes + second.manifest.gzipBytes);
  });

  it("rejects on-disk coverage, hash, and URL drift", async () => {
    const root = await makeRoot();
    const outDir = join(root, "search");
    const book = makeBook("fixture-book", "Fixture Kitabı");
    await writeBookSources(root, book);
    const result = await generateSearchAssets({ root, outDir, books: [book], generatedAt });
    const manifest = await readJson(result.manifest.filePath);
    manifest.books[0].shardUrl = "/assets/search/wrong.json";
    await writeFile(result.manifest.filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    await assert.rejects(
      validateGeneratedSearchAssets({ books: [book], result }),
      (error) => error.code === "VALIDATION_FAILED" && /shard URL/.test(error.message)
    );
  });

  it("fails on missing, unreadable, empty, and duplicate canonical text", async () => {
    const root = await makeRoot();
    const missing = makeBook("missing-book", "Eksik Kitap", 1);
    await assert.rejects(
      generateSearchAssets({ root, outDir: join(root, "missing"), books: [missing], generatedAt }),
      (error) => error.code === "SOURCE_READ_FAILED" && /missing-book.*p01/.test(error.message)
    );

    const unreadable = makeBook("unreadable-book", "Okunamayan Kitap", 1);
    await assert.rejects(
      generateSearchAssets({
        root,
        outDir: join(root, "unreadable"),
        books: [unreadable],
        generatedAt,
        readText: async () => {
          const error = new Error("permission denied");
          error.code = "EACCES";
          throw error;
        }
      }),
      (error) => error.code === "SOURCE_READ_FAILED" && error.cause?.code === "EACCES"
    );

    const empty = makeBook("empty-book", "Boş Kitap", 1);
    await writeBookSources(root, empty, ["   \r\n"]);
    await assert.rejects(
      generateSearchAssets({ root, outDir: join(root, "empty"), books: [empty], generatedAt }),
      (error) => error.code === "SOURCE_TEXT_EMPTY"
    );

    const duplicate = makeBook("duplicate-book", "Tekrarlı Kitap", 2);
    duplicate.parts[1] = { ...duplicate.parts[1], partNo: "p01" };
    await writeBookSources(root, duplicate);
    await assert.rejects(
      generateSearchAssets({ root, outDir: join(root, "duplicate"), books: [duplicate], generatedAt }),
      (error) => error.code === "DUPLICATE_PART" && /duplicate-book.*p01/.test(error.message)
    );
  });
});
