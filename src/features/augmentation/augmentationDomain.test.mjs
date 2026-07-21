import assert from "node:assert/strict";
import test from "node:test";
import { makePart, makeSource } from "./augmentationFixtures.js";
import {
  augmentGrade,
  buildDefaultPartOrder,
  buildQuestionLabel,
  redistributeAugmentedQuestionSets,
  moveOrderedPart,
  redistributeAugmentedQuestions,
  selectStudyQuestions
} from "./augmentationDomain.js";

function redistributionSet(...questionIds) {
  return {
    questions: questionIds.map((questionId, index) => ({
      canonicalId: questionId,
      sourceQuestionId: questionId,
      sourceQuestionNumber: index + 1,
      question: questionId,
      answer: "A",
      dependsOn: []
    }))
  };
}

function withDependencies(sourceSets, dependencies) {
  const parentByChild = new Map(dependencies.map(([child, parent]) => [child, parent]));
  return sourceSets.map((set, setIndex) => ({
    setNumber: setIndex + 1,
    questions: set.questions.map((question) => ({
      ...question,
      sourceSetNumber: setIndex + 1,
      dependsOn: parentByChild.has(question.canonicalId) ? [parentByChild.get(question.canonicalId)] : []
    }))
  }));
}

test("default order places same-book parts around the locked base and appends other books by selection", () => {
  const base = makePart({ partNo: "p08", selectionSequence: 1 });
  const selected = [
    makePart({ partNo: "p10", selectionSequence: 2 }),
    makePart({ bookSlug: "book-b", bookTitle: "Book B", partNo: "p03", selectionSequence: 3 }),
    makePart({ partNo: "p07", selectionSequence: 4 }),
    makePart({ bookSlug: "book-b", bookTitle: "Book B", partNo: "p01", selectionSequence: 5 }),
    makePart({ partNo: "p08", selectionSequence: 9 })
  ];

  assert.deepEqual(
    buildDefaultPartOrder(base, selected).map((part) => part.key),
    ["book-a:p07", "book-a:p08", "book-a:p10", "book-b:p03", "book-b:p01"]
  );
});

test("manual movement keeps the base part locked in the composition but movable in final order", () => {
  const ordered = [
    makePart({ partNo: "p07" }),
    makePart({ partNo: "p08" }),
    makePart({ partNo: "p09" })
  ];

  assert.deepEqual(
    moveOrderedPart(ordered, "book-a:p08", 1).map((part) => part.partNo),
    ["p07", "p09", "p08"]
  );
  assert.deepEqual(ordered.map((part) => part.partNo), ["p07", "p08", "p09"]);
});

test("labels use part numbers for one book and include book titles for mixed books", () => {
  const part = makePart({ partNo: "p08", bookTitle: "Küçük Sözler" });
  assert.equal(buildQuestionLabel(part, false), "p08");
  assert.equal(buildQuestionLabel(part, true), "Küçük Sözler p08");
});

test("grade augmentation normalizes to the base set count, merges in explicit order, and preserves inputs", () => {
  const base = makePart({ partNo: "p08" });
  const before = makePart({ partNo: "p07" });
  const after = makePart({ partNo: "p09" });
  const sources = [
    makeSource({ part: base, setSizes: [2, 1] }),
    makeSource({ part: before, setSizes: [3] }),
    makeSource({ part: after, setSizes: [1, 1, 1] })
  ];
  const original = structuredClone(sources);

  const result = augmentGrade({
    basePartKey: base.key,
    gradeSlug: "5-sinif",
    orderedParts: [before, base, after],
    sources
  });

  assert.equal(result.baseSetCount, 2);
  assert.deepEqual(result.mergedSets.map((set) => set.questions.length), [6, 3]);
  assert.deepEqual(
    result.mergedSets[0].questions.map((question) => question.sourcePartNo),
    ["p07", "p07", "p08", "p08", "p09", "p09"]
  );
  assert.equal(result.mergedSets[0].questions[0].displayQuestion.startsWith("(p07) "), true);
  assert.deepEqual(sources, original);
});

test("redistribution follows exact six-set and over-sixty rules including multiples of ten", () => {
  const questions = (count) => Array.from({ length: count }, (_, index) => ({
    canonicalId: `q${index + 1}`,
    sourcePartKey: index % 2 === 0 ? "book:p01" : "book:p02",
    sourcePartOrder: index % 2,
    question: `q${index + 1}`,
    answer: `a${index + 1}`,
    dependsOn: []
  }));

  for (const [total, expectedRedistributed] of [[0, 6], [1, 6], [59, 6], [60, 6], [61, 7], [69, 7], [70, 8], [79, 8], [80, 9]]) {
    const result = redistributeAugmentedQuestions(questions(total));
    assert.equal(result.totalQuestions, total);
    assert.equal(result.redistributedSetCount, expectedRedistributed, `total ${total}`);
    assert.equal(result.selectedSets.length, 6);
    const sizes = result.allSets.map((set) => set.questions.length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `balanced total ${total}`);
  }
});

test("redistribution uses source question position order across original sets", () => {
  const base = makePart({ partNo: "p01" });
  const source = makeSource({ part: base, setSizes: [3, 3] });

  const result = augmentGrade({
    basePartKey: base.key,
    gradeSlug: "5-sinif",
    orderedParts: [base],
    sources: [source]
  });

  assert.deepEqual(
    result.allSets.map((set) => set.questions.map((question) => question.sourceQuestionId)),
    [["S1Q1"], ["S2Q1"], ["S1Q2"], ["S2Q2"], ["S1Q3"], ["S2Q3"]]
  );
});

test("redistribution helper matches QAGeneratorLib position-based fallback when target set count changes", () => {
  const result = redistributeAugmentedQuestionSets([
    redistributionSet("S1Q1", "S1Q2", "S1Q3"),
    redistributionSet("S2Q1", "S2Q2", "S2Q3")
  ], { redistributedSetCount: 4 });

  assert.deepEqual(
    result.allSets.map((set) => set.questions.map((question) => question.sourceQuestionId)),
    [["S1Q1", "S1Q3"], ["S2Q1", "S2Q3"], ["S1Q2"], ["S2Q2"]]
  );
});

test("redistribution keeps selected part order inside every target set", () => {
  const questions = [
    ...Array.from({ length: 9 }, (_, index) => ({ canonicalId: `a${index}`, sourcePartKey: "book:p07", sourcePartOrder: 0 })),
    ...Array.from({ length: 9 }, (_, index) => ({ canonicalId: `b${index}`, sourcePartKey: "book:p08", sourcePartOrder: 1 })),
    ...Array.from({ length: 9 }, (_, index) => ({ canonicalId: `c${index}`, sourcePartKey: "book:p09", sourcePartOrder: 2 }))
  ];

  const result = redistributeAugmentedQuestions(questions);
  for (const set of result.selectedSets) {
    const ranks = set.questions.map((question) => question.sourcePartOrder);
    assert.deepEqual(ranks, [...ranks].sort((left, right) => left - right));
  }
});

test("redistribution keeps dependency blocks in the same target set", () => {
  const base = makePart({ partNo: "p01" });
  const source = makeSource({
    part: base,
    setSizes: [2],
    dependencies: { S1Q2: ["S1Q1"] }
  });

  const result = augmentGrade({
    basePartKey: base.key,
    gradeSlug: "5-sinif",
    orderedParts: [base],
    sources: [source]
  });
  const selected = result.selectedSets.flatMap((set) => set.questions);
  const parent = selected.find((question) => question.sourceQuestionId === "S1Q1");
  const child = selected.find((question) => question.sourceQuestionId === "S1Q2");

  assert.equal(parent?.selectedSetNumber, child?.selectedSetNumber);
  assert.equal(child?.finalDependsOn[0], parent?.finalQuestionId);
  assert.deepEqual(result.warnings, []);
});

test("redistribution skips an oversized dependency target until other sets catch up", () => {
  const sourceSets = withDependencies([
    redistributionSet("S1Q1", "S1Q2"),
    redistributionSet("S2Q1"),
    redistributionSet("S3Q1")
  ], [["S1Q2", "S1Q1"]]);

  const result = redistributeAugmentedQuestionSets(sourceSets, { redistributedSetCount: 2 });

  assert.deepEqual(
    result.allSets.map((set) => set.questions.map((question) => question.sourceQuestionId)),
    [["S1Q1", "S1Q2"], ["S2Q1", "S3Q1"]]
  );
});

test("dependency blocks use position order and balance by question count", () => {
  const sourceSets = withDependencies([
    redistributionSet("S1Q1", "S1Q2", "S1Q3", "S1Q4"),
    redistributionSet("S2Q1", "S2Q2", "S2Q3", "S2Q4"),
    redistributionSet("S3Q1", "S3Q2", "S3Q3", "S3Q4")
  ], [
    ["S1Q3", "S1Q2"],
    ["S2Q2", "S2Q1"],
    ["S2Q3", "S2Q2"]
  ]);

  const result = redistributeAugmentedQuestionSets(sourceSets, { redistributedSetCount: 4 });

  assert.deepEqual(
    result.allSets.map((set) => set.questions.map((question) => question.sourceQuestionId)),
    [
      ["S1Q1", "S3Q2", "S2Q4"],
      ["S2Q1", "S2Q2", "S2Q3"],
      ["S3Q1", "S3Q3", "S3Q4"],
      ["S1Q2", "S1Q3", "S1Q4"]
    ]
  );
});

test("dependency identities are rewritten after final selection and missing parents become warnings", () => {
  const base = makePart({ partNo: "p01" });
  const source = makeSource({
    part: base,
    setSizes: [25, 25, 25],
    dependencies: { S1Q2: ["S1Q7"], S3Q25: ["S9Q99"] }
  });

  const result = augmentGrade({
    basePartKey: base.key,
    gradeSlug: "5-sinif",
    orderedParts: [base],
    sources: [source]
  });

  const finalByCanonical = new Map(
    result.selectedSets.flatMap((set) => set.questions).map((question) => [question.canonicalId, question])
  );
  for (const question of finalByCanonical.values()) {
    for (const dependency of question.finalDependsOn) {
      assert.match(dependency, /^S\d+Q\d+$/);
    }
  }
  assert.ok(result.warnings.some((warning) => warning.code === "missing-selected-dependency"));
});

test("study selection places dependencies before dependants and caps the result at 24", () => {
  const questions = Array.from({ length: 30 }, (_, index) => ({
    canonicalId: `q${index + 1}`,
    finalQuestionId: `S1Q${index + 1}`,
    finalDependsOnCanonicalIds: index === 1 ? ["q1"] : [],
    question: `q${index + 1}`,
    answer: `a${index + 1}`
  }));
  const selected = selectStudyQuestions(questions, 24);

  assert.equal(selected.length, 24);
  assert.ok(selected.findIndex((question) => question.canonicalId === "q1") < selected.findIndex((question) => question.canonicalId === "q2"));
});
