export function flattenStudyDeckCards(deck) {
  return (deck?.sets ?? []).flatMap((set) =>
    (set.questions ?? []).map((question) => ({
      id: question.id,
      question: question.question,
      answer: question.answer
    }))
  );
}

export function selectStudyCards(cards, { count = 24 } = {}) {
  if (!Array.isArray(cards)) {
    throw new TypeError("Study cards must be an array.");
  }

  if (count <= 0 || cards.length === 0) {
    return [];
  }

  return cards.slice(0, Math.min(count, cards.length));
}

function createSessionCard(card) {
  return {
    ...card,
    studyState: card?.studyState ?? "new",
    shownCount: Number(card?.shownCount) || 0
  };
}

function showCard(card) {
  return {
    ...card,
    shownCount: (Number(card?.shownCount) || 0) + 1
  };
}

function markLearning(card) {
  return {
    ...card,
    studyState: "learning"
  };
}

function activeCards(queue) {
  return [queue?.current, ...(queue?.pending ?? [])].filter(Boolean);
}

export function createStudyQueue(cards) {
  const sessionCards = Array.isArray(cards) ? cards.map(createSessionCard) : [];
  const [current = null, ...pending] = sessionCards;

  return {
    current: current ? showCard(current) : null,
    pending,
    completed: []
  };
}

export function serializeStudyQueue(queue) {
  const cards = [queue?.current, ...(queue?.pending ?? []), ...(queue?.completed ?? [])].filter(Boolean);
  return {
    currentId: queue?.current?.id ?? null,
    pendingIds: (queue?.pending ?? []).map((card) => card.id),
    completedIds: (queue?.completed ?? []).map((card) => card.id),
    cardStateById: Object.fromEntries(cards.map((card) => [card.id, {
      studyState: card.studyState,
      shownCount: card.shownCount
    }]))
  };
}

export function restoreStudyQueue(cards, savedQueue) {
  if (!savedQueue || typeof savedQueue !== "object") return null;
  const cardsById = new Map((cards ?? []).map(createSessionCard).map((card) => [card.id, card]));
  const ids = [savedQueue.currentId, ...(savedQueue.pendingIds ?? []), ...(savedQueue.completedIds ?? [])].filter(Boolean);
  if (ids.length !== cardsById.size || new Set(ids).size !== ids.length || ids.some((id) => !cardsById.has(id))) {
    return null;
  }
  const hydrate = (id) => {
    const card = cardsById.get(id);
    const saved = savedQueue.cardStateById?.[id] ?? {};
    return { ...card, studyState: saved.studyState ?? card.studyState, shownCount: Number(saved.shownCount) || 0 };
  };
  return {
    current: savedQueue.currentId ? hydrate(savedQueue.currentId) : null,
    pending: (savedQueue.pendingIds ?? []).map(hydrate),
    completed: (savedQueue.completedIds ?? []).map(hydrate)
  };
}

export function getStudyQueueCounts(queue) {
  return activeCards(queue).reduce(
    (counts, card) => {
      if (card.studyState === "learning") {
        counts.learning += 1;
      } else if (card.studyState === "review") {
        counts.review += 1;
      } else {
        counts.new += 1;
      }

      return counts;
    },
    {
      new: 0,
      learning: 0,
      review: 0
    }
  );
}

export function rateStudyQueue(queue, rating) {
  if (!queue?.current) {
    return queue;
  }

  const current = queue.current;
  const pending = [...queue.pending];
  const completed = [...queue.completed];

  if (rating === "again") {
    const [next = null, ...rest] = pending;
    return {
      current: next ? showCard(next) : null,
      pending: next ? [markLearning(current), ...rest] : [markLearning(current)],
      completed
    };
  }

  if (rating === "hard") {
    pending.push(markLearning(current));
  } else {
    completed.push(current);
  }

  const [next = null, ...rest] = pending;
  return {
    current: next ? showCard(next) : null,
    pending: rest,
    completed
  };
}
