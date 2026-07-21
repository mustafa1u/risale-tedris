import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createStudyQueue,
  flattenStudyDeckCards,
  getStudyQueueCounts,
  rateStudyQueue,
  selectStudyCards
} from "./studySession.js";

function makeCards(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `card-${index + 1}`,
    question: `Question ${index + 1}`,
    answer: `Answer ${index + 1}`
  }));
}

describe("study session selection", () => {
  it("flattens study deck JSON into selectable cards", () => {
    const cards = flattenStudyDeckCards({
      sets: [
        {
          setNumber: 1,
          questions: [
            { id: "S1Q1", question: "Question 1", answer: "Answer 1" }
          ]
        },
        {
          setNumber: 2,
          questions: [
            { id: "S2Q1", question: "Question 2", answer: "Answer 2" }
          ]
        }
      ]
    });

    assert.deepEqual(cards, [
      { id: "S1Q1", question: "Question 1", answer: "Answer 1" },
      { id: "S2Q1", question: "Question 2", answer: "Answer 2" }
    ]);
  });

  it("selects at most 24 cards without mutating source cards", () => {
    const cards = makeCards(30);
    const originalIds = cards.map((card) => card.id);
    const selected = selectStudyCards(cards, { count: 24 });

    assert.equal(selected.length, 24);
    assert.deepEqual(cards.map((card) => card.id), originalIds);
    assert.equal(new Set(selected.map((card) => card.id)).size, 24);
  });

  it("returns all cards when fewer than requested are available", () => {
    const cards = makeCards(3);
    const selected = selectStudyCards(cards, { count: 24 });

    assert.equal(selected.length, 3);
    assert.equal(new Set(selected.map((card) => card.id)).size, 3);
  });

  it("preserves imported study deck order", () => {
    const cards = makeCards(12);
    const selected = selectStudyCards(cards, { count: 6 });

    assert.deepEqual(
      selected.map((card) => card.id),
      ["card-1", "card-2", "card-3", "card-4", "card-5", "card-6"]
    );
  });

  it("keeps dependency handling outside the browser selector", () => {
    const cards = makeCards(3);
    const selected = selectStudyCards(cards, {
      count: 2,
      dependencies: [{ questionId: "card-2", parentIds: ["card-1"] }]
    });

    assert.equal(selected.length, 2);
    assert.deepEqual(
      selected.map((card) => card.id),
      ["card-1", "card-2"]
    );
  });
});

describe("study session queue", () => {
  it("creates a queue with the first card current", () => {
    const queue = createStudyQueue(makeCards(2));

    assert.equal(queue.current.id, "card-1");
    assert.equal(queue.current.studyState, "new");
    assert.deepEqual(
      queue.pending.map((card) => card.id),
      ["card-2"]
    );
    assert.equal(queue.completed.length, 0);
  });

  it("starts every active card as a blue new card", () => {
    const queue = createStudyQueue(makeCards(3));

    assert.deepEqual(getStudyQueueCounts(queue), {
      new: 3,
      learning: 0,
      review: 0
    });
  });

  it("returns Again cards soon in the same session", () => {
    let queue = createStudyQueue(makeCards(3));
    queue = rateStudyQueue(queue, "again");

    assert.equal(queue.current.id, "card-2");
    assert.deepEqual(
      queue.pending.map((card) => card.id),
      ["card-1", "card-3"]
    );
    assert.equal(queue.pending[0].studyState, "learning");
    assert.deepEqual(getStudyQueueCounts(queue), {
      new: 2,
      learning: 1,
      review: 0
    });
  });

  it("returns Hard cards later in the same session", () => {
    let queue = createStudyQueue(makeCards(3));
    queue = rateStudyQueue(queue, "hard");

    assert.equal(queue.current.id, "card-2");
    assert.deepEqual(
      queue.pending.map((card) => card.id),
      ["card-3", "card-1"]
    );
    assert.equal(queue.pending[1].studyState, "learning");
    assert.deepEqual(getStudyQueueCounts(queue), {
      new: 2,
      learning: 1,
      review: 0
    });
  });

  it("finishes Good and Easy cards for the session", () => {
    let queue = createStudyQueue(makeCards(2));
    queue = rateStudyQueue(queue, "good");
    queue = rateStudyQueue(queue, "easy");

    assert.equal(queue.current, null);
    assert.deepEqual(
      queue.completed.map((card) => card.id),
      ["card-1", "card-2"]
    );
    assert.deepEqual(getStudyQueueCounts(queue), {
      new: 0,
      learning: 0,
      review: 0
    });
  });

  it("finishes a red learning card when it is later rated Good", () => {
    let queue = createStudyQueue(makeCards(2));
    queue = rateStudyQueue(queue, "again");
    queue = rateStudyQueue(queue, "good");

    assert.equal(queue.current.id, "card-1");
    assert.equal(queue.current.studyState, "learning");
    assert.deepEqual(getStudyQueueCounts(queue), {
      new: 0,
      learning: 1,
      review: 0
    });

    queue = rateStudyQueue(queue, "good");

    assert.equal(queue.current, null);
    assert.deepEqual(getStudyQueueCounts(queue), {
      new: 0,
      learning: 0,
      review: 0
    });
  });
});
