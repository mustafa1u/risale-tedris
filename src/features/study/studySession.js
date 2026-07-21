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
    studyState: card?.studyState ?? "new"
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
    current,
    pending,
    completed: []
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
      current: next,
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
    current: next,
    pending: rest,
    completed
  };
}
