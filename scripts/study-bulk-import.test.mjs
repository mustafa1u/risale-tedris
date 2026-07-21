import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import {
  parseBulkStudyImportCliArgs,
  planBulkStudyImports,
  runBulkStudyImport
} from "./study-bulk-import.mjs";

async function writeSampleAssets(root) {
  await mkdir(join(root, "assets", "kucuk-sozler", "parcalar"), { recursive: true });
  await writeFile(
    join(root, "assets", "kucuk-sozler", "part-labels.json"),
    JSON.stringify({ p01: "Part One", p02: "Part Two" }),
    "utf8"
  );
  await writeFile(
    join(root, "assets", "kucuk-sozler", "parcalar", "kucuk-sozler-p01-first.txt"),
    "first",
    "utf8"
  );
  await writeFile(
    join(root, "assets", "kucuk-sozler", "parcalar", "kucuk-sozler-p02-second.txt"),
    "second",
    "utf8"
  );
}

async function writeSampleSource(root) {
  const sourceRoot = join(root, "source");
  const preferred = join(
    sourceRoot,
    "kucuk-sozler",
    "kucuk-sozler",
    "outputs",
    "5-sinif",
    "SveC_5sinif_kucuk-sozler-p01-first.txt"
  );
  const duplicate = join(
    sourceRoot,
    "kucuk-sozler",
    "old-run",
    "outputs",
    "5-sinif",
    "SveC_5sinif_kucuk-sozler-p01-first.txt"
  );
  const second = join(
    sourceRoot,
    "kucuk-sozler",
    "kucuk-sozler",
    "outputs",
    "5-sinif",
    "SveC_5sinif_kucuk-sozler-p02-second.txt"
  );

  await mkdir(dirname(preferred), { recursive: true });
  await mkdir(dirname(duplicate), { recursive: true });
  await mkdir(dirname(second), { recursive: true });

  await writeFile(
    preferred,
    `
Set - 1
1.\tS: Preferred?\tC: Preferred answer.
`,
    "utf8"
  );
  await writeFile(
    duplicate,
    `
Set - 1
1.\tS: Duplicate?\tC: Duplicate answer.
`,
    "utf8"
  );
  await writeFile(
    second,
    `
Set - 1
1.\tS: Second?\tC: Second answer.
`,
    "utf8"
  );

  return sourceRoot;
}

async function writeSampleSelectionSource(root) {
  const sourceRoot = await writeSampleSource(root);
  const selection = join(
    sourceRoot,
    "kucuk-sozler",
    "new-run",
    "outputs",
    "5-sinif",
    "SEL_5sinif_kucuk-sozler-p01-first.json"
  );

  await mkdir(dirname(selection), { recursive: true });
  await writeFile(
    selection,
    `${JSON.stringify(
      {
        counts: {
          flashcardQuestions: 2
        },
        questionSheet: {
          questions: [
            {
              sheetQuestionIndex: 1,
              selectedSetNumber: 1,
              selectedQuestionNumber: 1,
              sourceSetNumber: 2,
              sourceQuestionNumber: 3,
              sourceQuestionId: "S2Q3",
              question: "Selected first?",
              answer: "Selected first answer."
            },
            {
              sheetQuestionIndex: 2,
              selectedSetNumber: 1,
              selectedQuestionNumber: 2,
              sourceSetNumber: 1,
              sourceQuestionNumber: 5,
              sourceQuestionId: "S1Q5",
              question: "Selected second?",
              answer: "Selected second answer."
            }
          ]
        },
        flashcards: {
          selectionRule: "fixture rule",
          questions: [
            {
              flashcardIndex: 1,
              sheetQuestionIndex: 1,
              sourceQuestionId: "S2Q3"
            },
            {
              flashcardIndex: 2,
              sheetQuestionIndex: 2,
              sourceQuestionId: "S1Q5"
            }
          ]
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return sourceRoot;
}

describe("study bulk import", () => {
  it("plans exact book, grade, and part imports with de-duplicated sources", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rissor-study-bulk-plan-"));
    try {
      await writeSampleAssets(tempRoot);
      const sourceRoot = await writeSampleSource(tempRoot);

      const plan = await planBulkStudyImports({
        sourceRoot,
        assetsRoot: join(tempRoot, "assets")
      });

      assert.equal(plan.imports.length, 2);
      assert.deepEqual(
        plan.imports.map((item) => `${item.bookSlug}:${item.gradeSlug}:${item.partNo}`),
        ["kucuk-sozler:5-sinif:p01", "kucuk-sozler:5-sinif:p02"]
      );
      assert.equal(plan.imports[0].title, "Part One");
      assert.equal(plan.imports[0].duplicateSourceCount, 2);
      assert.match(plan.imports[0].sourcePath, /kucuk-sozler[\\/]kucuk-sozler[\\/]outputs/);
      assert.equal(plan.skipped.length, 0);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it("prefers SEL selection JSON over source question text when available", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rissor-study-bulk-sel-plan-"));
    try {
      await writeSampleAssets(tempRoot);
      const sourceRoot = await writeSampleSelectionSource(tempRoot);

      const plan = await planBulkStudyImports({
        sourceRoot,
        assetsRoot: join(tempRoot, "assets")
      });

      assert.equal(plan.imports[0].sourceKind, "selection");
      assert.match(plan.imports[0].sourcePath, /SEL_5sinif_kucuk-sozler-p01-first\.json$/);
      assert.equal(plan.imports[0].duplicateSourceCount, 2);
      assert.equal(plan.imports[0].duplicateSelectionCount, 1);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it("writes parsed deck JSON files and a report", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rissor-study-bulk-run-"));
    try {
      await writeSampleAssets(tempRoot);
      const sourceRoot = await writeSampleSource(tempRoot);
      const reportPath = join(tempRoot, "report.json");

      const report = await runBulkStudyImport(
        {
          sourceRoot,
          assetsRoot: join(tempRoot, "assets"),
          reportPath,
          preselectStudyDeckJobs: async ({ jobs }) => {
            for (const job of jobs) {
              await mkdir(dirname(job.outPath), { recursive: true });
              await writeFile(
                job.outPath,
                `${JSON.stringify(
                  {
                    ...job.deck,
                    cardCount: Math.min(job.count, job.deck.cardCount),
                    selection: {
                      source: "test",
                      requestedCount: job.count,
                      seed: job.seed
                    }
                  },
                  null,
                  2
                )}\n`,
                "utf8"
              );
            }
          }
        },
        () => {}
      );

      assert.deepEqual(report, {
        planned: 2,
        written: 2,
        empty: 0,
        skipped: 0
      });

      const deck = JSON.parse(
        await readFile(
          join(tempRoot, "assets", "kucuk-sozler", "question-bank", "5-sinif", "p01.json"),
          "utf8"
        )
      );
      assert.equal(deck.title, "Part One");
      assert.equal(deck.cardCount, 1);
      assert.equal(deck.selection.source, "test");
      assert.equal(deck.sets[0].questions[0].question, "Preferred?");

      const persistedReport = JSON.parse(await readFile(reportPath, "utf8"));
      assert.equal(persistedReport.written, 2);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it("writes interactive decks from SEL flashcard selections without reselecting", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rissor-study-bulk-sel-run-"));
    try {
      await writeSampleAssets(tempRoot);
      const sourceRoot = await writeSampleSelectionSource(tempRoot);
      const reportPath = join(tempRoot, "report.json");
      let preselectorCalled = false;

      const report = await runBulkStudyImport(
        {
          sourceRoot,
          assetsRoot: join(tempRoot, "assets"),
          reportPath,
          preselectStudyDeckJobs: async () => {
            preselectorCalled = true;
          }
        },
        () => {}
      );

      assert.deepEqual(report, {
        planned: 2,
        written: 2,
        empty: 0,
        skipped: 0
      });
      assert.equal(preselectorCalled, true);

      const deck = JSON.parse(
        await readFile(
          join(tempRoot, "assets", "kucuk-sozler", "question-bank", "5-sinif", "p01.json"),
          "utf8"
        )
      );
      assert.equal(deck.selection.source, "SEL");
      assert.equal(deck.selection.rule, "fixture rule");
      assert.equal(deck.cardCount, 2);
      assert.deepEqual(
        deck.sets.flatMap((set) => set.questions.map((question) => question.id)),
        ["S2Q3", "S1Q5"]
      );
      assert.equal(deck.sets[0].questions[0].question, "Selected first?");
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it("parses CLI arguments", () => {
    assert.deepEqual(
      parseBulkStudyImportCliArgs([
        "--source-root",
        "source",
        "--assets-root",
        "assets",
        "--report",
        "report.json"
      ]),
      {
        sourceRoot: "source",
        assetsRoot: "assets",
        reportPath: "report.json"
      }
    );
  });
});
