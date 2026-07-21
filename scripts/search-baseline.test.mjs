import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import {
  REPRESENTATIVE_ROUTES,
  benchmarkMetadataFilter,
  measureBuiltOutput,
  measureCorpus
} from "./search-baseline.mjs";

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("search baseline report", () => {
  it("records the agreed Turkish routes and their English counterparts", () => {
    assert.deepEqual(REPRESENTATIVE_ROUTES, [
      "/",
      "/books/",
      "/books/ayetul-kubra/",
      "/books/tabiat-risalesi/",
      "/books/meyve-risalesi/parts/p55/",
      "/en/",
      "/en/books/",
      "/en/books/ayetul-kubra/",
      "/en/books/tabiat-risalesi/",
      "/en/books/meyve-risalesi/parts/p55/"
    ]);
  });

  it("measures ordered per-book part counts and UTF-8 bytes without changing sources", async () => {
    const root = await mkdtemp(join(tmpdir(), "rissor-search-baseline-"));
    temporaryRoots.push(root);
    await mkdir(join(root, "z-book", "parcalar"), { recursive: true });
    await mkdir(join(root, "a-book", "parcalar"), { recursive: true });
    await writeFile(join(root, "z-book", "parcalar", "p01.txt"), "abc", "utf8");
    await writeFile(join(root, "a-book", "parcalar", "p01.txt"), "İman", "utf8");
    await writeFile(join(root, "a-book", "parcalar", "p02.txt"), "نور", "utf8");
    await writeFile(join(root, "a-book", "parcalar", "ignore.md"), "ignored", "utf8");

    assert.deepEqual(await measureCorpus(root), {
      books: [
        { bookSlug: "a-book", partCount: 2, rawTextBytes: 11 },
        { bookSlug: "z-book", partCount: 1, rawTextBytes: 3 }
      ],
      partCount: 3,
      rawTextBytes: 14
    });
  });

  it("measures representative HTML and all emitted JavaScript bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "rissor-search-dist-"));
    temporaryRoots.push(root);
    await mkdir(join(root, "books"), { recursive: true });
    await mkdir(join(root, "_astro", "nested"), { recursive: true });
    await writeFile(join(root, "index.html"), "home", "utf8");
    await writeFile(join(root, "books", "index.html"), "books", "utf8");
    await writeFile(join(root, "_astro", "entry.js"), "123", "utf8");
    await writeFile(join(root, "_astro", "nested", "worker.js"), "12345", "utf8");
    await writeFile(join(root, "_astro", "styles.css"), "ignored", "utf8");

    assert.deepEqual(await measureBuiltOutput(root, ["/", "/books/"]), {
      routeHtml: [
        { route: "/", bytes: 4 },
        { route: "/books/", bytes: 5 }
      ],
      emittedJavaScript: { fileCount: 2, bytes: 8 }
    });
  });

  it("benchmarks the current metadata filter with an injectable monotonic clock", () => {
    const rows = [
      { searchText: "p01 iman", gradeSlugs: ["2-sinif"] },
      { searchText: "p02 ahiret", gradeSlugs: ["8-sinif"] }
    ];
    const readings = [10, 16];

    assert.deepEqual(
      benchmarkMetadataFilter(rows, { searchValue: "p02", gradeValue: "8-sinif" }, {
        iterations: 3,
        now: () => readings.shift()
      }),
      {
        rowCount: 2,
        iterations: 3,
        elapsedMilliseconds: 6,
        averageMilliseconds: 2,
        finalVisibleCount: 1
      }
    );
  });
});
