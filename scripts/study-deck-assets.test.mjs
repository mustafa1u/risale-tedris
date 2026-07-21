import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { collectStudyDeckAssets } from "./study-deck-assets.mjs";

describe("study deck asset scanner", () => {
  it("collects study deck summaries from book question-bank JSON files", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rissor-study-assets-"));
    try {
      const bookPath = join(tempRoot, "assets", "sample-book");
      const deckPath = join(bookPath, "question-bank", "5-sinif");
      await mkdir(deckPath, { recursive: true });
      await writeFile(
        join(deckPath, "p01.json"),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            bookSlug: "sample-book",
            partNo: "p01",
            gradeSlug: "5-sinif",
            title: "Part 1 Study",
            cardCount: 24,
            sets: []
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const decks = await collectStudyDeckAssets({
        root: tempRoot,
        bookSlug: "sample-book",
        bookPath
      });

      assert.deepEqual(decks, [
        {
          key: "5-sinif:p01",
          fileName: "p01.json",
          sourcePath: "assets/sample-book/question-bank/5-sinif/p01.json",
          url: "/assets/sample-book/question-bank/5-sinif/p01.json",
          gradeSlug: "5-sinif",
          partNo: "p01",
          title: "Part 1 Study",
          cardCount: 24
        }
      ]);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
