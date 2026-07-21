import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildAugmentationCatalog,
  buildAugmentationSource,
  parseJsonDocument,
  parseDependencyPayload,
  writeJsonIfChanged
} from "./augmentation-bank.mjs";

test("JSON input accepts a UTF-8 BOM from legacy library manifests", () => {
  assert.deepEqual(parseJsonDocument("\uFEFF{\"schemaVersion\":1}"), { schemaVersion: 1 });
});

const questionText = `
Sample title
Set - 1
1. S: Parent?
C: Parent answer. (2 words)
2. S: Child?
C: Child answer. (2 words)
Set - 2
1. S: Other?
C: Other answer. (2 words)
`;

const dependencyPayload = {
  schema_version: 1,
  sets: [
    {
      set_number: 1,
      direct_dependencies: [
        {
          question_id: "S1Q2",
          depends_on: [{ question_id: "S1Q1", dependency_type: "question_reference" }]
        }
      ]
    }
  ]
};

test("dependency payloads become direct source-id mappings", () => {
  assert.deepEqual(parseDependencyPayload(dependencyPayload), new Map([
    ["S1Q2", ["S1Q1"]]
  ]));
});

test("full augmentation sources preserve every printed question and namespace identities", () => {
  const source = buildAugmentationSource({
    bookSlug: "sample-book",
    bookTitle: "Sample Book",
    gradeSlug: "5-sinif",
    partNo: "p08",
    partNumber: 8,
    title: "Sample Part",
    sourcePath: "source/SveC_5sinif_sample-book-p08-title.txt",
    questionText,
    dependencyPayload
  });

  assert.equal(source.schemaVersion, 1);
  assert.equal(source.setCount, 2);
  assert.equal(source.questionCount, 3);
  assert.match(source.sourceRevision, /^[a-f0-9]{64}$/);
  assert.deepEqual(source.sets[0].questions[1], {
    canonicalId: "sample-book:p08:5-sinif:S1Q2",
    sourceQuestionId: "S1Q2",
    sourceSetNumber: 1,
    sourceQuestionNumber: 2,
    question: "Child?",
    answer: "Child answer.",
    wordCount: 2,
    hint: "",
    dependsOn: ["sample-book:p08:5-sinif:S1Q1"]
  });
});

test("augmentation catalog is compact, ordered, and exposes lazy grade URLs", () => {
  const sourceP08 = buildAugmentationSource({
    bookSlug: "sample-book",
    bookTitle: "Sample Book",
    gradeSlug: "5-sinif",
    partNo: "p08",
    partNumber: 8,
    title: "Part Eight",
    sourcePath: "source/SveC_5sinif_sample-book-p08-first-second-third-fourth-fifth-sixth.txt",
    questionText
  });
  const sourceP07 = buildAugmentationSource({
    bookSlug: "sample-book",
    bookTitle: "Sample Book",
    gradeSlug: "8-sinif",
    partNo: "p07",
    partNumber: 7,
    title: "Part Seven",
    sourcePath: "source/SveC_8sinif_sample-book-p07-alpha-beta-gamma-delta-epsilon-zeta.txt",
    questionText
  });

  const catalog = buildAugmentationCatalog([sourceP08, sourceP07]);
  assert.equal(catalog.books.length, 1);
  assert.deepEqual(catalog.books[0].parts.map((part) => part.partNo), ["p07", "p08"]);
  assert.deepEqual(
    catalog.books[0].parts.map((part) => part.labelSlug),
    [
      "alpha-beta-gamma-delta-epsilon-zeta",
      "first-second-third-fourth-fifth-sixth"
    ]
  );
  assert.deepEqual(
    catalog.books[0].parts.map((part) => part.textUrl),
    [
      "/assets/sample-book/parcalar/sample-book-p07-alpha-beta-gamma-delta-epsilon-zeta.txt",
      "/assets/sample-book/parcalar/sample-book-p08-first-second-third-fourth-fifth-sixth.txt"
    ]
  );
  assert.deepEqual(Object.keys(catalog.books[0].parts[0].grades), ["8-sinif"]);
  assert.equal(
    catalog.books[0].parts[0].grades["8-sinif"].url,
    "/assets/sample-book/augmentation-bank/8-sinif/p07.json"
  );
  assert.match(catalog.catalogRevision, /^[a-f0-9]{64}$/);
});

test("JSON writer avoids touching unchanged generated data", async () => {
  const root = await mkdtemp(join(tmpdir(), "rissor-augmentation-bank-"));
  try {
    const path = join(root, "nested", "source.json");
    assert.equal(await writeJsonIfChanged(path, { value: 1 }), true);
    const before = await readFile(path, "utf8");
    assert.equal(await writeJsonIfChanged(path, { value: 1 }), false);
    assert.equal(await readFile(path, "utf8"), before);
    await writeFile(path, "{}\n", "utf8");
    assert.equal(await writeJsonIfChanged(path, { value: 1 }), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
