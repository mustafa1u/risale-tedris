import { gradeSourceKey, partKey } from "./augmentationContracts.js";

export function makePart({
  bookSlug = "book-a",
  bookTitle = "Book A",
  bookOrder = 0,
  partNo = "p01",
  partNumber = Number(partNo.replace(/\D/g, "")) || 1,
  title = partNo,
  labelSlug = title,
  textUrl = `/assets/${bookSlug}/parcalar/${bookSlug}-${partNo}-${labelSlug}.txt`,
  selectionSequence = 0
} = {}) {
  return {
    key: partKey(bookSlug, partNo),
    bookSlug,
    bookTitle,
    bookOrder,
    partNo,
    partNumber,
    title,
    labelSlug,
    textUrl,
    selectionSequence
  };
}

export function makeSource({
  part = makePart(),
  gradeSlug = "5-sinif",
  setSizes = [2],
  dependencies = {}
} = {}) {
  let sequence = 0;
  const sets = setSizes.map((size, setIndex) => ({
    setNumber: setIndex + 1,
    questions: Array.from({ length: size }, (_, questionIndex) => {
      sequence += 1;
      const sourceQuestionId = `S${setIndex + 1}Q${questionIndex + 1}`;
      const canonicalId = `${part.key}:${gradeSlug}:${sourceQuestionId}`;
      return {
        canonicalId,
        sourceQuestionId,
        sourceSetNumber: setIndex + 1,
        sourceQuestionNumber: questionIndex + 1,
        question: `${part.partNo} question ${sequence}`,
        answer: `${part.partNo} answer ${sequence}`,
        wordCount: sequence,
        hint: "",
        dependsOn: (dependencies[sourceQuestionId] ?? []).map(
          (id) => `${part.key}:${gradeSlug}:${id}`
        )
      };
    })
  }));

  return {
    schemaVersion: 1,
    catalogVersion: 1,
    key: gradeSourceKey(part.bookSlug, gradeSlug, part.partNo),
    bookSlug: part.bookSlug,
    bookTitle: part.bookTitle,
    gradeSlug,
    partNo: part.partNo,
    partNumber: part.partNumber,
    title: part.title,
    sourceRevision: `${part.key}-${gradeSlug}-revision`,
    sets
  };
}
