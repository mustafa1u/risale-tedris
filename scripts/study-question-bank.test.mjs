import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildStudyDeck,
  defaultStudyDeckOutPath,
  flattenStudyDeckCards,
  importStudyQuestionBank,
  parseQuestionBankText,
  parseStudyQuestionBankCliArgs,
  writeStudyDeckJson
} from "./study-question-bank.mjs";

describe("study question-bank parser", () => {
  it("parses set-based one-line question and answer rows", () => {
    const bank = parseQuestionBankText(`
Set - 1

1.\tS: First question?\tC: First answer.
2.\tS: Second question?\tC: Second answer. (2 words)

Set - 2
1.\tS: Third question?\tC: Third answer.
`);

    assert.equal(bank.sets.length, 2);
    assert.deepEqual(
      bank.sets.map((set) => set.setNumber),
      [1, 2]
    );
    assert.deepEqual(bank.sets[0].questions[0], {
      id: "S1Q1",
      setNumber: 1,
      questionNumber: 1,
      question: "First question?",
      answer: "First answer.",
      wordCount: 2
    });
    assert.deepEqual(bank.sets[0].questions[1], {
      id: "S1Q2",
      setNumber: 1,
      questionNumber: 2,
      question: "Second question?",
      answer: "Second answer.",
      wordCount: 2
    });
    assert.equal(bank.sets[1].questions[0].id, "S2Q1");
  });

  it("parses two-line question and answer rows", () => {
    const bank = parseQuestionBankText(`
Set - 4
1. S: Parent question?
C: Parent answer. (2 words)
2. S: Child question?
C: Child answer. (2 words)
`);

    assert.equal(bank.sets.length, 1);
    assert.deepEqual(
      bank.sets[0].questions.map((question) => question.id),
      ["S4Q1", "S4Q2"]
    );
    assert.equal(bank.sets[0].questions[1].question, "Child question?");
    assert.equal(bank.sets[0].questions[1].answer, "Child answer.");
  });

  it("builds stable study deck JSON metadata and flattened card input", () => {
    const deck = buildStudyDeck({
      bookSlug: "sample-book",
      partNo: "p01",
      gradeSlug: "5-sinif",
      sourcePath: "sample/SveC_5sinif_sample.txt",
      text: `
Set - 1
1.\tS: First?\tC: One.
2.\tS: Second?\tC: Two.
`
    });

    assert.equal(deck.schemaVersion, 1);
    assert.equal(deck.bookSlug, "sample-book");
    assert.equal(deck.partNo, "p01");
    assert.equal(deck.gradeSlug, "5-sinif");
    assert.equal(deck.sourcePath, "sample/SveC_5sinif_sample.txt");
    assert.equal(deck.cardCount, 2);

    assert.deepEqual(flattenStudyDeckCards(deck), [
      {
        id: "S1Q1",
        sourceSetNumber: 1,
        sourceQuestionNumber: 1,
        question: "First?",
        answer: "One."
      },
      {
        id: "S1Q2",
        sourceSetNumber: 1,
        sourceQuestionNumber: 2,
        question: "Second?",
        answer: "Two."
      }
    ]);
  });

  it("writes stable study deck JSON and creates parent directories", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rissor-study-bank-"));
    try {
      const deck = buildStudyDeck({
        bookSlug: "sample-book",
        partNo: "p01",
        gradeSlug: "5-sinif",
        sourcePath: "sample/SveC_5sinif_sample.txt",
        text: `
Set - 1
1.\tS: First?\tC: One.
`
      });
      const outPath = join(tempRoot, "nested", "study-deck.json");

      await writeStudyDeckJson(deck, outPath);

      assert.equal((await stat(outPath)).isFile(), true);
      assert.equal(
        await readFile(outPath, "utf8"),
        `${JSON.stringify(deck, null, 2)}\n`
      );
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it("parses import CLI arguments", () => {
    assert.deepEqual(
      parseStudyQuestionBankCliArgs([
        "--source",
        "SveC_5sinif_sample.txt",
        "--book",
        "sample-book",
        "--grade",
        "5-sinif",
        "--part",
        "p01",
        "--title",
        "Sample Deck",
        "--out",
        "assets/sample-book/question-bank/5-sinif/p01.json"
      ]),
      {
        sourcePath: "SveC_5sinif_sample.txt",
        bookSlug: "sample-book",
        gradeSlug: "5-sinif",
        partNo: "p01",
        title: "Sample Deck",
        outPath: "assets/sample-book/question-bank/5-sinif/p01.json"
      }
    );

    assert.throws(
      () => parseStudyQuestionBankCliArgs(["--source", "sample.txt"]),
      /Missing required option: bookSlug/
    );
  });

  it("builds default import output paths under the book question-bank folder", () => {
    assert.equal(
      defaultStudyDeckOutPath({
        bookSlug: "sample-book",
        gradeSlug: "5-sinif",
        partNo: "p01"
      }),
      join("assets", "sample-book", "question-bank", "5-sinif", "p01.json")
    );
  });

  it("imports a source question-bank file into a study deck JSON file", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rissor-study-import-"));
    try {
      const sourcePath = join(tempRoot, "SveC_5sinif_sample.txt");
      const outPath = join(
        tempRoot,
        "assets",
        "sample-book",
        "question-bank",
        "5-sinif",
        "p01.json"
      );

      await writeFile(
        sourcePath,
        `
Set - 1
1.\tS: First?\tC: One.
2.\tS: Second?\tC: Two.
`,
        "utf8"
      );

      const result = await importStudyQuestionBank({
        sourcePath,
        bookSlug: "sample-book",
        gradeSlug: "5-sinif",
        partNo: "p01",
        title: "Sample Deck",
        outPath
      });

      assert.equal(result.deck.title, "Sample Deck");
      assert.equal(result.deck.cardCount, 2);
      assert.equal(result.outPath, outPath);

      const parsed = JSON.parse(await readFile(outPath, "utf8"));
      assert.equal(parsed.bookSlug, "sample-book");
      assert.equal(parsed.gradeSlug, "5-sinif");
      assert.equal(parsed.partNo, "p01");
      assert.equal(parsed.title, "Sample Deck");
      assert.equal(parsed.cardCount, 2);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
