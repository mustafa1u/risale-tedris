import assert from "node:assert/strict";
import test from "node:test";
import { makePart, makeSource } from "./augmentationFixtures.js";
import {
  buildAugmentedSourceText,
  buildAugmentationTitle,
  buildAugmentationProject,
  catalogPartToDomain,
  findCatalogContext,
  getNeighborPartKeys,
  hydrateProjectSourceText,
  loadAugmentationCatalog,
  loadPartTexts,
  loadRecipeSources
} from "./augmentationProject.js";

function catalogFixture() {
  return {
    schemaVersion: 1,
    catalogVersion: 1,
    catalogRevision: "catalog-1",
    books: [
      {
        slug: "book-a",
        title: "Book A",
        bookOrder: 0,
        parts: ["p07", "p08", "p09"].map((partNo, index) => ({
          key: `book-a:${partNo}`,
          partNo,
          partNumber: index + 7,
          title: partNo,
          labelSlug: `${partNo}-first-second-third-fourth-fifth-sixth`,
          grades: {
            "5-sinif": { url: `/assets/book-a/${partNo}.json`, sourceRevision: `${partNo}-5` },
            ...(partNo === "p09" ? {} : { "8-sinif": { url: `/assets/book-a/8/${partNo}.json`, sourceRevision: `${partNo}-8` } })
          }
        }))
      }
    ]
  };
}

test("catalog context resolves a base part and its immediate neighbours", () => {
  const catalog = catalogFixture();
  const context = findCatalogContext(catalog, "book-a", "p08");
  assert.equal(context.book.title, "Book A");
  assert.equal(context.part.key, "book-a:p08");
  assert.deepEqual(
    {
      labelSlug: catalogPartToDomain(context.book, context.part).labelSlug,
      textUrl: catalogPartToDomain(context.book, context.part).textUrl
    },
    {
      labelSlug: "p08-first-second-third-fourth-fifth-sixth",
      textUrl: "/assets/book-a/parcalar/book-a-p08-p08-first-second-third-fourth-fifth-sixth.txt"
    }
  );
  assert.deepEqual(getNeighborPartKeys(context.book, context.part.key), ["book-a:p07", "book-a:p09"]);
  assert.equal(findCatalogContext(catalog, "book-a", "p99"), null);
});

test("default augmentation titles use each existing slug's first five tokens", () => {
  assert.equal(
    buildAugmentationTitle([
      makePart({
        partNo: "p05",
        labelSlug: "2-meselenin-hulasasi-temsilin-tatbiki-ve-peygamber"
      }),
      makePart({
        partNo: "p06",
        labelSlug: "2-meselenin-hulasasi-iki-yol-kiyasi-ve-mahpuslara"
      })
    ]),
    "P05 2-meselenin-hulasasi-temsilin-tatbiki + P06 2-meselenin-hulasasi-iki-yol"
  );
});

test("recipe source loading is lazy, deduplicated, and reports HTTP failures by grade", async () => {
  const catalog = catalogFixture();
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    if (url.includes("/8/p08")) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    const partNo = url.includes("p07") ? "p07" : "p08";
    const grade = url.includes("/8/") ? "8" : "5";
    return {
      ok: true,
      status: 200,
      json: async () => ({ schemaVersion: 1, sourceRevision: `${partNo}-${grade}`, url })
    };
  };

  const loaded = await loadRecipeSources({
    catalog,
    orderedPartKeys: ["book-a:p07", "book-a:p08", "book-a:p07"],
    gradeSlugs: ["5-sinif", "8-sinif"],
    fetch
  });

  assert.equal(calls.length, 4);
  assert.equal(loaded.sourcesByGrade["5-sinif"].length, 2);
  assert.equal(loaded.failuresByGrade["8-sinif"].length, 1);
});

test("catalog and source loaders forward cancellation instead of recording it as a failed grade", async () => {
  const controller = new AbortController();
  let receivedSignal;
  await loadAugmentationCatalog({
    signal: controller.signal,
    fetch: async (_url, options) => {
      receivedSignal = options.signal;
      return { ok: true, json: async () => catalogFixture() };
    }
  });
  assert.equal(receivedSignal, controller.signal);

  const aborted = new Error("cancelled");
  aborted.name = "AbortError";
  await assert.rejects(
    loadRecipeSources({
      catalog: catalogFixture(),
      orderedPartKeys: ["book-a:p08"],
      gradeSlugs: ["5-sinif"],
      signal: controller.signal,
      fetch: async () => { throw aborted; }
    }),
    (error) => error.name === "AbortError"
  );
});

test("part text loading is ordered, deduplicated, and non-blocking for missing text", async () => {
  const first = makePart({ partNo: "p01", textUrl: "/assets/book-a/p01.txt" });
  const second = makePart({ partNo: "p02", textUrl: "/assets/book-a/p02.txt" });
  const calls = [];
  const loaded = await loadPartTexts({
    orderedParts: [first, second, first, makePart({ partNo: "p03", textUrl: "" })],
    fetch: async (url) => {
      calls.push(url);
      if (url.endsWith("p02.txt")) {
        return { ok: false, status: 404, text: async () => "" };
      }
      return { ok: true, text: async () => `Text for ${url}` };
    }
  });

  assert.deepEqual(calls, ["/assets/book-a/p01.txt", "/assets/book-a/p02.txt"]);
  assert.deepEqual(loaded.sourceTextByPartKey, {
    [first.key]: "Text for /assets/book-a/p01.txt"
  });
  assert.equal(loaded.textFailures.length, 2);
});

test("augmented source text follows the selected part order and labels mixed books", () => {
  const first = makePart({ bookSlug: "book-a", bookTitle: "Book A", partNo: "p01", title: "First" });
  const second = makePart({ bookSlug: "book-b", bookTitle: "Book B", partNo: "p02", title: "Second" });

  assert.equal(
    buildAugmentedSourceText([first, second], {
      [first.key]: "  First source text.\n",
      [second.key]: "Second source text."
    }),
    "Book A · P01 · First\n\nFirst source text.\n\n---\n\nBook B · P02 · Second\n\nSecond source text."
  );
});

test("saved projects without source text are hydrated from the current catalog", async () => {
  const catalog = catalogFixture();
  const oldPart = {
    key: "book-a:p08",
    bookSlug: "book-a",
    bookTitle: "Book A",
    partNo: "p08",
    title: "Old stored title",
    labelSlug: "old-label"
  };
  const hydrated = await hydrateProjectSourceText({
    project: {
      id: "project-1",
      orderedParts: [oldPart],
      sourceText: ""
    },
    catalog,
    fetch: async (url) => ({
      ok: true,
      text: async () => `Loaded from ${url}`
    })
  });

  assert.equal(
    hydrated.sourceText,
    "P08 · Old stored title\n\nLoaded from /assets/book-a/parcalar/book-a-p08-p08-first-second-third-fourth-fifth-sixth.txt"
  );
  assert.equal(
    hydrated.orderedParts[0].textUrl,
    "/assets/book-a/parcalar/book-a-p08-p08-first-second-third-fourth-fifth-sixth.txt"
  );
});

test("project creation records ready and failed grades without losing successful snapshots", () => {
  const base = makePart({ partNo: "p08" });
  const next = makePart({ partNo: "p09" });
  const sourcesByGrade = {
    "5-sinif": [
      makeSource({ part: base, gradeSlug: "5-sinif", setSizes: [2, 2] }),
      makeSource({ part: next, gradeSlug: "5-sinif", setSizes: [2] })
    ],
    "8-sinif": [makeSource({ part: base, gradeSlug: "8-sinif", setSizes: [2] })]
  };

  const project = buildAugmentationProject({
    id: "project-1",
    title: "P08 + P09",
    catalogRevision: "catalog-1",
    basePart: base,
    orderedParts: [base, next],
    gradeSlugs: ["5-sinif", "8-sinif"],
    sourcesByGrade,
    sourceTextByPartKey: {
      [base.key]: "Base source text.",
      [next.key]: "Next source text."
    },
    failuresByGrade: { "8-sinif": [{ key: "book-a:8-sinif:p09", error: "missing" }] }
  });

  assert.equal(project.schemaVersion, 1);
  assert.equal(project.homeBookSlug, "book-a");
  assert.equal(project.gradeResults["5-sinif"].status, "ready");
  assert.equal(project.gradeResults["5-sinif"].studyQuestions.length, 6);
  assert.equal(project.sourceText, "P08 · p08\n\nBase source text.\n\n---\n\nP09 · p09\n\nNext source text.");
  assert.equal(project.gradeResults["8-sinif"].status, "failed");
  assert.match(project.gradeResults["8-sinif"].error, /missing/);
});
