import { partKey } from "./augmentationContracts.js";

function cloneQuestion(question) {
  return {
    ...question,
    dependsOn: [...(question?.dependsOn ?? [])],
    finalDependsOn: [...(question?.finalDependsOn ?? [])],
    finalDependsOnCanonicalIds: [...(question?.finalDependsOnCanonicalIds ?? [])]
  };
}

function clonePart(part) {
  return { ...part };
}

function sourcePartKey(source) {
  return partKey(source?.bookSlug ?? "", source?.partNo ?? "");
}

function uniqueParts(parts) {
  const seen = new Set();
  const result = [];
  for (const part of parts ?? []) {
    if (!part?.key || seen.has(part.key)) {
      continue;
    }
    seen.add(part.key);
    result.push(clonePart(part));
  }
  return result;
}

export function buildDefaultPartOrder(basePart, selectedParts = []) {
  if (!basePart?.key) {
    throw new TypeError("A base part with a stable key is required.");
  }

  const selected = uniqueParts([basePart, ...selectedParts]);
  const sameBook = selected
    .filter((part) => part.bookSlug === basePart.bookSlug)
    .sort((left, right) =>
      (left.partNumber ?? Number.MAX_SAFE_INTEGER) - (right.partNumber ?? Number.MAX_SAFE_INTEGER)
      || String(left.partNo).localeCompare(String(right.partNo), "en")
    );
  const otherBooks = selected
    .filter((part) => part.bookSlug !== basePart.bookSlug)
    .sort((left, right) =>
      (left.selectionSequence ?? Number.MAX_SAFE_INTEGER) - (right.selectionSequence ?? Number.MAX_SAFE_INTEGER)
    );

  return [...sameBook, ...otherBooks];
}

export function moveOrderedPart(orderedParts, targetKey, delta) {
  const result = uniqueParts(orderedParts);
  const currentIndex = result.findIndex((part) => part.key === targetKey);
  if (currentIndex < 0 || !Number.isInteger(delta) || delta === 0) {
    return result;
  }

  const targetIndex = Math.max(0, Math.min(result.length - 1, currentIndex + delta));
  if (targetIndex === currentIndex) {
    return result;
  }

  const [moving] = result.splice(currentIndex, 1);
  result.splice(targetIndex, 0, moving);
  return result;
}

export function buildQuestionLabel(part, includeBookName) {
  const partNo = String(part?.partNo ?? "").trim();
  if (!includeBookName) {
    return partNo;
  }

  return [String(part?.bookTitle ?? "").trim(), partNo].filter(Boolean).join(" ");
}

function flattenSourceQuestions(source) {
  return (source?.sets ?? []).flatMap((set) =>
    (set?.questions ?? []).map((question) => cloneQuestion(question))
  );
}

export function normalizeSourceToSetCount(source, targetSetCount) {
  if (!Number.isInteger(targetSetCount) || targetSetCount < 1) {
    throw new RangeError("Target set count must be a positive integer.");
  }

  const sourceSets = source?.sets ?? [];
  if (sourceSets.length === targetSetCount) {
    return sourceSets.map((set, index) => ({
      setNumber: index + 1,
      questions: (set?.questions ?? []).map(cloneQuestion)
    }));
  }

  const result = Array.from({ length: targetSetCount }, (_, index) => ({
    setNumber: index + 1,
    questions: []
  }));
  for (const [index, question] of flattenSourceQuestions(source).entries()) {
    result[index % targetSetCount].questions.push(question);
  }
  return result;
}

function decorateQuestion(question, part, partOrder, includeBookName) {
  const label = buildQuestionLabel(part, includeBookName);
  return {
    ...cloneQuestion(question),
    sourcePartKey: part.key,
    sourceBookSlug: part.bookSlug,
    sourceBookTitle: part.bookTitle,
    sourcePartNo: part.partNo,
    sourcePartTitle: part.title,
    sourcePartOrder: partOrder,
    displayLabel: label,
    displayQuestion: label ? `(${label}) ${question?.question ?? ""}` : question?.question ?? ""
  };
}

function assertUniqueQuestionIds(questions) {
  const seen = new Set();
  for (const question of questions) {
    if (!question?.canonicalId) {
      throw new TypeError("Every augmentation question requires a canonicalId.");
    }
    if (seen.has(question.canonicalId)) {
      throw new Error(`Duplicate canonical question id: ${question.canonicalId}`);
    }
    seen.add(question.canonicalId);
  }
}

function cloneWithoutInternalFields(question) {
  const clone = cloneQuestion(question);
  delete clone.__allocationIndex;
  return clone;
}

function normalizeQuestionSets(questionSets = []) {
  return (questionSets ?? []).map((set, index) => ({
    setNumber: set?.setNumber ?? index + 1,
    questions: (set?.questions ?? []).filter(Boolean).map(cloneQuestion)
  }));
}

function flattenByQuestionPosition(questionSets) {
  const maxCount = questionSets.length === 0
    ? 0
    : Math.max(...questionSets.map((set) => set.questions.length));
  const flat = [];
  for (let questionIndex = 0; questionIndex < maxCount; questionIndex += 1) {
    for (const set of questionSets) {
      if (questionIndex < set.questions.length) {
        flat.push(set.questions[questionIndex]);
      }
    }
  }
  return flat;
}

function questionIdentity(question) {
  return String(question?.canonicalId ?? "").trim();
}

function ensureGraphEntry(map, id) {
  if (!map.has(id)) {
    map.set(id, new Set());
  }
}

function buildDependencyGraph(questionSets) {
  const questionIds = new Set();
  const parentsByQuestion = new Map();
  const dependentsByQuestion = new Map();
  let hasDependencies = false;

  for (const question of questionSets.flatMap((set) => set.questions)) {
    const id = questionIdentity(question);
    if (!id) {
      continue;
    }
    questionIds.add(id);
    ensureGraphEntry(parentsByQuestion, id);
    ensureGraphEntry(dependentsByQuestion, id);
  }

  for (const question of questionSets.flatMap((set) => set.questions)) {
    const childId = questionIdentity(question);
    if (!childId) {
      continue;
    }
    for (const parentId of question.dependsOn ?? []) {
      const normalizedParentId = String(parentId ?? "").trim();
      if (!normalizedParentId) {
        continue;
      }
      hasDependencies = true;
      ensureGraphEntry(parentsByQuestion, childId);
      ensureGraphEntry(dependentsByQuestion, normalizedParentId);
      ensureGraphEntry(parentsByQuestion, normalizedParentId);
      ensureGraphEntry(dependentsByQuestion, childId);
      questionIds.add(normalizedParentId);
      parentsByQuestion.get(childId).add(normalizedParentId);
      dependentsByQuestion.get(normalizedParentId).add(childId);
    }
  }

  return { hasDependencies, questionIds, parentsByQuestion, dependentsByQuestion };
}

function graphNeighbors(adjacency, questionId, allowedIds) {
  return [...(adjacency.get(questionId) ?? [])].filter((id) => !allowedIds || allowedIds.has(id));
}

function getConnectedComponentIncludingSelf(questionId, allowedIds, graph) {
  const result = new Set();
  if (!questionId || (allowedIds && !allowedIds.has(questionId))) {
    return result;
  }

  const stack = [questionId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (result.has(current)) {
      continue;
    }
    result.add(current);
    stack.push(...graphNeighbors(graph.parentsByQuestion, current, allowedIds));
    stack.push(...graphNeighbors(graph.dependentsByQuestion, current, allowedIds));
  }
  return result;
}

function buildBlocksByQuestionPosition(questionSets, graph) {
  if (!graph.hasDependencies) {
    return flattenByQuestionPosition(questionSets).map((question) => ({ questions: [question] }));
  }

  const blocks = [];
  const visitedIds = new Set();
  const idsBySet = questionSets.map((set) =>
    new Set(set.questions.map(questionIdentity).filter(Boolean))
  );
  const maxCount = questionSets.length === 0
    ? 0
    : Math.max(...questionSets.map((set) => set.questions.length));

  for (let questionIndex = 0; questionIndex < maxCount; questionIndex += 1) {
    for (let setIndex = 0; setIndex < questionSets.length; setIndex += 1) {
      const questions = questionSets[setIndex].questions;
      if (questionIndex >= questions.length) {
        continue;
      }

      const question = questions[questionIndex];
      const id = questionIdentity(question);
      if (!id) {
        blocks.push({ questions: [question] });
        continue;
      }
      if (visitedIds.has(id)) {
        continue;
      }

      const allowedIds = idsBySet[setIndex];
      const componentIds = graph.questionIds.has(id)
        ? getConnectedComponentIncludingSelf(id, allowedIds, graph)
        : new Set([id]);
      if (componentIds.size === 0) {
        componentIds.add(id);
      }
      for (const componentId of componentIds) {
        visitedIds.add(componentId);
      }

      blocks.push({
        questions: questions.filter((candidate) => componentIds.has(questionIdentity(candidate)))
      });
    }
  }

  return blocks;
}

function getNextBalancedTargetIndex(result, nextTargetIndex) {
  const minimumCount = Math.min(...result.map((set) => set.questions.length));
  for (let offset = 0; offset < result.length; offset += 1) {
    const candidateIndex = (nextTargetIndex + offset) % result.length;
    if (result[candidateIndex].questions.length === minimumCount) {
      return candidateIndex;
    }
  }
  return nextTargetIndex;
}

function redistributeBlocksBalanced(blocks, targetSetCount) {
  const result = Array.from({ length: targetSetCount }, (_, index) => ({
    setNumber: index + 1,
    questions: []
  }));
  let nextTargetIndex = 0;

  for (const block of blocks) {
    if ((block.questions ?? []).length === 0) {
      continue;
    }
    const targetIndex = getNextBalancedTargetIndex(result, nextTargetIndex);
    result[targetIndex].questions.push(...block.questions.map(cloneQuestion));
    nextTargetIndex = (targetIndex + 1) % targetSetCount;
  }

  return result;
}

export function redistributeAugmentedQuestionSets(questionSets = [], { redistributedSetCount: overrideSetCount } = {}) {
  const sourceSets = normalizeQuestionSets(questionSets);
  const flat = flattenByQuestionPosition(sourceSets);
  assertUniqueQuestionIds(flat);
  const totalQuestions = flat.length;
  const redistributedSetCount = Number.isInteger(overrideSetCount)
    ? Math.max(1, overrideSetCount)
    : totalQuestions <= 60
      ? 6
      : Math.floor(totalQuestions / 10) + 1;
  const graph = buildDependencyGraph(sourceSets);
  const blocks = buildBlocksByQuestionPosition(sourceSets, graph);
  const allSets = redistributeBlocksBalanced(blocks, redistributedSetCount);

  const selectedSets = allSets.slice(0, 6).map((set) => ({
    setNumber: set.setNumber,
    questions: set.questions.map(cloneWithoutInternalFields)
  }));
  const selectedQuestions = selectedSets.flatMap((set) => set.questions);
  const finalIdByCanonicalId = new Map();
  const canonicalByFinalId = new Map();
  const warnings = [];

  for (const set of selectedSets) {
    set.questions = set.questions.map((question, questionIndex) => {
      const finalQuestionId = `S${set.setNumber}Q${questionIndex + 1}`;
      if (canonicalByFinalId.has(finalQuestionId)) {
        throw new Error(`Duplicate final question id: ${finalQuestionId}`);
      }
      finalIdByCanonicalId.set(question.canonicalId, finalQuestionId);
      canonicalByFinalId.set(finalQuestionId, question.canonicalId);
      return {
        ...question,
        selectedSetNumber: set.setNumber,
        selectedQuestionNumber: questionIndex + 1,
        finalQuestionId
      };
    });
  }

  for (const set of selectedSets) {
    set.questions = set.questions.map((question) => {
      const finalDependsOn = [];
      const finalDependsOnCanonicalIds = [];
      for (const dependencyId of question.dependsOn ?? []) {
        const finalDependencyId = finalIdByCanonicalId.get(dependencyId);
        if (!finalDependencyId) {
          warnings.push({
            code: "missing-selected-dependency",
            questionId: question.canonicalId,
            dependencyId
          });
          continue;
        }
        finalDependsOn.push(finalDependencyId);
        finalDependsOnCanonicalIds.push(dependencyId);
      }
      return { ...question, finalDependsOn, finalDependsOnCanonicalIds };
    });
  }

  return {
    totalQuestions,
    redistributedSetCount,
    allSets,
    selectedSets,
    selectedQuestionCount: selectedQuestions.length,
    warnings
  };
}

export function redistributeAugmentedQuestions(questions = []) {
  return redistributeAugmentedQuestionSets([
    {
      setNumber: 1,
      questions
    }
  ]);
}

export function selectStudyQuestions(questions = [], limit = 24) {
  const maximum = Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 24);
  const byId = new Map(questions.map((question) => [question.canonicalId, question]));
  const selected = [];
  const selectedIds = new Set();

  const buildClosure = (question, visiting = new Set(), closure = []) => {
    if (!question?.canonicalId || selectedIds.has(question.canonicalId)) {
      return closure;
    }
    if (visiting.has(question.canonicalId)) {
      return closure;
    }
    visiting.add(question.canonicalId);
    for (const dependencyId of question.finalDependsOnCanonicalIds ?? []) {
      buildClosure(byId.get(dependencyId), visiting, closure);
    }
    visiting.delete(question.canonicalId);
    if (!selectedIds.has(question.canonicalId) && !closure.some((item) => item.canonicalId === question.canonicalId)) {
      closure.push(question);
    }
    return closure;
  };

  for (const question of questions) {
    if (selected.length >= maximum) {
      break;
    }
    const closure = buildClosure(question).filter((item) => !selectedIds.has(item.canonicalId));
    if (selected.length + closure.length > maximum) {
      continue;
    }
    for (const item of closure) {
      selected.push(cloneQuestion(item));
      selectedIds.add(item.canonicalId);
    }
  }
  return selected;
}

export function augmentGrade({ basePartKey, gradeSlug, orderedParts, sources }) {
  const parts = uniqueParts(orderedParts);
  if (parts.length === 0) {
    throw new Error("At least one ordered part is required.");
  }
  if (!parts.some((part) => part.key === basePartKey)) {
    throw new Error("The locked base part must remain in the ordered composition.");
  }

  const sourceMap = new Map(
    (sources ?? [])
      .filter((source) => source?.gradeSlug === gradeSlug)
      .map((source) => [sourcePartKey(source), source])
  );
  const baseSource = sourceMap.get(basePartKey);
  if (!baseSource || (baseSource.sets ?? []).length === 0) {
    throw new Error(`Base part data is unavailable for grade '${gradeSlug}'.`);
  }
  const missingParts = parts.filter((part) => !sourceMap.has(part.key));
  if (missingParts.length > 0) {
    throw new Error(`Part data is unavailable for grade '${gradeSlug}': ${missingParts.map((part) => part.key).join(", ")}`);
  }

  const baseSetCount = baseSource.sets.length;
  const includeBookName = new Set(parts.map((part) => part.bookSlug)).size > 1;
  const mergedSets = Array.from({ length: baseSetCount }, (_, index) => ({
    setNumber: index + 1,
    questions: []
  }));

  parts.forEach((part, partOrder) => {
    const normalized = normalizeSourceToSetCount(sourceMap.get(part.key), baseSetCount);
    normalized.forEach((set, setIndex) => {
      mergedSets[setIndex].questions.push(
        ...set.questions.map((question) => decorateQuestion(question, part, partOrder, includeBookName))
      );
    });
  });

  const redistribution = redistributeAugmentedQuestionSets(mergedSets);
  const finalQuestions = redistribution.selectedSets.flatMap((set) => set.questions);
  const studyQuestions = selectStudyQuestions(finalQuestions, 24);

  return {
    gradeSlug,
    basePartKey,
    baseSetCount,
    sourceRevisions: Object.fromEntries(parts.map((part) => [part.key, sourceMap.get(part.key).sourceRevision])),
    orderedParts: parts,
    mergedSets,
    ...redistribution,
    studyQuestions
  };
}
