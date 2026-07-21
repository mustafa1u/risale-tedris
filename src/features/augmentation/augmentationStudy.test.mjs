import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocalStudySelection,
  parseLocalStudyParams,
  resolveLocalStudySelection
} from "./augmentationStudy.js";

const project = {
  id: "project-1",
  homeBookSlug: "book-a",
  title: "P07 + P08",
  sourceText: "P07 · First part\n\nFirst source text.\n\n---\n\nP08 · Second part\n\nSecond source text.",
  orderedParts: [{ bookSlug: "book-a", bookTitle: "Book A", partNo: "p07" }],
  gradeResults: {
    "5-sinif": {
      status: "ready",
      studyQuestions: [
        {
          canonicalId: "book-a:p07:5-sinif:S1Q1",
          finalQuestionId: "S1Q1",
          selectedSetNumber: 1,
          selectedQuestionNumber: 1,
          displayQuestion: "(p07) First?",
          answer: "First answer."
        }
      ]
    },
    "8-sinif": { status: "failed", error: "missing" }
  }
};

test("local study query parameters require both project and grade", () => {
  assert.deepEqual(
    parseLocalStudyParams("?augmentation=project-1&grade=5-sinif"),
    { projectId: "project-1", gradeSlug: "5-sinif" }
  );
  assert.equal(parseLocalStudyParams("?augmentation=project-1"), null);
  assert.equal(parseLocalStudyParams("?book=book-a&grade=5-sinif&part=p01"), null);
});

test("saved augmented questions become the existing study deck shape", () => {
  const selection = buildLocalStudySelection(project, "5-sinif");
  assert.equal(selection.book.slug, "book-a");
  assert.equal(selection.deck.local, true);
  assert.equal(selection.deck.cardCount, 1);
  assert.equal(selection.deck.sourceTextUrl, "");
  assert.equal(selection.deck.sourceText, project.sourceText);
  assert.deepEqual(selection.deck.data.sets[0].questions[0], {
    id: "book-a:p07:5-sinif:S1Q1",
    setNumber: 1,
    questionNumber: 1,
    question: "(p07) First?",
    answer: "First answer."
  });
  assert.equal(buildLocalStudySelection(project, "8-sinif"), null);
});

test("local study lookup never falls back to another project or canonical deck", async () => {
  const storage = {
    async getProject(id) {
      return id === "project-1" ? project : null;
    }
  };
  assert.equal((await resolveLocalStudySelection({
    storage,
    searchParams: "?augmentation=project-1&grade=5-sinif"
  })).deck.title, "P07 + P08");
  assert.equal(await resolveLocalStudySelection({
    storage,
    searchParams: "?augmentation=missing&grade=5-sinif"
  }), null);
});
