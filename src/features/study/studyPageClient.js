import {
  createStudyQueue,
  flattenStudyDeckCards,
  getStudyQueueCounts,
  rateStudyQueue,
  selectStudyCards
} from "./studySession.js";
import { findStudyDeckRoute, parseStudyDeckParams } from "./studyRouting.js";
import {
  hasPartTextSectionSeparators,
  isPartTextSectionSeparator,
  isSectionedPartTextHeading,
  segmentPartText,
  splitPartText
} from "../library/partText.js";
import { createAugmentationStorage } from "../augmentation/augmentationStorage.js";
import {
  parseLocalStudyParams,
  resolveLocalStudySelection
} from "../augmentation/augmentationStudy.js";

function getElement(root, selector) {
  return root.querySelector(selector);
}

function setHidden(element, hidden) {
  if (element instanceof HTMLElement) {
    element.hidden = hidden;
  }
}

export function canOpenSourceText({ hasSourceDialog }) {
  return Boolean(hasSourceDialog);
}

export function hasStudySourceText({ sourceUrl, sourceText }) {
  return Boolean(String(sourceUrl ?? "").trim() || String(sourceText ?? "").trim());
}

export function scrollAnswerControlsIntoView({ ratingRow, viewSourceButton }) {
  const target = ratingRow ?? viewSourceButton;
  if (target && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest"
    });
  }
}

function readJsonScript(root, selector, fallback) {
  const script = getElement(root, selector);
  if (!script?.textContent) {
    return fallback;
  }

  try {
    return JSON.parse(script.textContent);
  } catch {
    return fallback;
  }
}

function localizedPath(locale, pathname) {
  if (locale !== "en") {
    return pathname.replace(/^\/books\//u, "/soru-bankalari/");
  }

  return pathname === "/" ? "/en/" : `/en${pathname.replace(/^\/soru-bankalari\//u, "/books/")}`;
}

function formatFromTemplate(template, count) {
  return (template || "{count}").replace("{count}", String(count));
}

const evidenceTokenPattern = /[\p{L}\p{N}_]+/gu;

export function findEvidenceForStudyCard({ manifest, deck, card }) {
  if (!manifest || !deck || !card || !Array.isArray(manifest.annotations)) return null;
  return manifest.annotations.find((annotation) => {
    const reference = annotation?.card_ref;
    return reference?.book_slug === deck.bookSlug && reference?.grade_slug === deck.gradeSlug
      && reference?.part_no === deck.partNo && reference?.question_id === card.id;
  }) ?? null;
}

export function evidenceRangesForParagraph({ paragraph, fragments }) {
  const tokens = [...String(paragraph ?? "").matchAll(evidenceTokenPattern)];
  const ranges = [];
  (fragments ?? []).forEach((fragment, index) => {
    const startToken = Number(fragment?.start_token);
    const endToken = Number(fragment?.end_token);
    if (!Number.isInteger(startToken) || !Number.isInteger(endToken) || startToken < 0 || endToken <= startToken || endToken > tokens.length) return;
    const start = tokens[startToken].index;
    const end = tokens[endToken - 1].index + tokens[endToken - 1][0].length;
    if (String(paragraph).slice(start, end) === fragment.exact_text) {
      ranges.push({ start, end, label: Number(fragment.evidence_label) || index + 1 });
    }
  });
  return ranges.sort((left, right) => left.start - right.start);
}

export function formatStudyCardCount({ count, oneTemplate, manyTemplate }) {
  return formatFromTemplate(count === 1 ? oneTemplate : manyTemplate, count);
}

export function resolveStudyShellSelection({ libraryIndex, searchParams }) {
  const params = parseStudyDeckParams(searchParams);

  return params ? findStudyDeckRoute(libraryIndex, params) : null;
}

function renderSourceText(container, value, evidence) {
  const paragraphs = splitPartText(value);
  const hasSectionSeparators = hasPartTextSectionSeparators(paragraphs);
  container.replaceChildren();

  paragraphs.forEach((paragraph, index) => {
    const paragraphElement = document.createElement("p");
    paragraphElement.className = [
      "part-paragraph",
      `part-paragraph--${paragraph.alignment}`,
      isSectionedPartTextHeading(paragraphs, index, hasSectionSeparators) ? "part-text-section-heading" : "",
      isPartTextSectionSeparator(paragraph) ? "part-text-section-separator" : ""
    ].filter(Boolean).join(" ");

    const paragraphValue = paragraph.segments.map((segment) => segment.value).join("");
    let evidenceLabel = 0;
    const fragments = (evidence?.evidence_sets ?? []).flatMap((set) => (set?.fragments ?? []).map((fragment) => ({
      ...fragment,
      evidence_label: ++evidenceLabel
    }))).filter((fragment) => Number(fragment?.paragraph_index) === index + 1);
    const ranges = evidenceRangesForParagraph({ paragraph: paragraphValue, fragments });
    if (ranges.length) paragraphElement.classList.add("part-paragraph--evidence");
    let cursor = 0;
    const appendText = (text) => segmentPartText(text).forEach((segment) => {
      const segmentElement = document.createElement("span");
      segmentElement.className = `part-script part-script--${segment.script}`;
      segmentElement.textContent = segment.value;
      paragraphElement.append(segmentElement);
    });
    ranges.forEach((range) => {
      if (range.start < cursor) return;
      appendText(paragraphValue.slice(cursor, range.start));
      const mark = document.createElement("mark");
      mark.className = "part-evidence-span";
      mark.dataset.evidenceLabel = String(range.label);
      mark.textContent = paragraphValue.slice(range.start, range.end);
      paragraphElement.append(mark);
      cursor = range.end;
    });
    appendText(paragraphValue.slice(cursor));

    container.append(paragraphElement);
  });
}

function initRoot(root) {
  const locale = root.getAttribute("data-study-locale") ?? "tr";
  const studyIndexUrl = root.getAttribute("data-study-index-url");
  const gradeContexts = readJsonScript(root, "[data-study-grade-context-json]", {});
  const title = document.querySelector("[data-study-title]");
  const lede = document.querySelector("[data-study-lede]");
  const bookLink = document.querySelector("[data-study-book-link]");
  const bookSeparator = document.querySelector("[data-study-book-separator]");
  const sourceTitle = getElement(root, "[data-source-title]");
  const fallback = getElement(root, "[data-study-fallback]");
  let deckUrl = "";
  let sourceUrl = "";
  let inlineSourceText = "";
  let activeDeck = null;
  let evidenceManifest = null;
  let sourceValue = "";
  const cardButton = getElement(root, "[data-study-card]");
  const sideLabel = getElement(root, "[data-study-side]");
  const cardText = getElement(root, "[data-study-card-text]");
  const showAnswerButton = getElement(root, "[data-show-answer]");
  const viewSourceButton = getElement(root, "[data-view-source]");
  const sourceDialog = getElement(root, "[data-source-dialog]");
  const sourceText = getElement(root, "[data-source-text]");
  const sourceLoading = getElement(root, "[data-source-loading]");
  const sourceError = getElement(root, "[data-source-error]");
  const ratingRow = getElement(root, "[data-rating-row]");
  const progress = getElement(root, "[data-study-progress]");
  const statusRow = getElement(root, "[data-study-status-row]");
  const newCount = getElement(root, "[data-study-new-count]");
  const learningCount = getElement(root, "[data-study-learning-count]");
  const complete = getElement(root, "[data-study-complete]");
  const error = getElement(root, "[data-study-error]");

  let queue = createStudyQueue([]);
  let totalCount = 0;
  let showingAnswer = false;
  let sourceLoaded = false;
  let sourceLoadingInProgress = false;

  setHidden(fallback, true);

  const applyResolvedSelection = (resolvedSelection) => {
    const { book, deck } = resolvedSelection;
    const gradeContext = gradeContexts[deck.gradeSlug] ?? { label: deck.gradeSlug };
    const cardCount = formatStudyCardCount({
      count: deck.cardCount,
      oneTemplate: root.getAttribute("data-card-count-one"),
      manyTemplate: root.getAttribute("data-card-count-many")
    });

    deckUrl = deck.url ?? "";
    sourceUrl = deck.sourceTextUrl ?? "";
    inlineSourceText = deck.sourceText ?? "";
    root.setAttribute("data-deck-url", deckUrl);
    if (sourceUrl) {
      root.setAttribute("data-source-url", sourceUrl);
    }
    if (title) {
      title.textContent = deck.title;
    }
    if (lede) {
      lede.textContent = `${gradeContext.label} · ${cardCount}`;
    }
    if (bookLink instanceof HTMLAnchorElement) {
      bookLink.textContent = book.title;
      bookLink.href = localizedPath(locale, `/books/${book.slug}/`);
      setHidden(bookLink, false);
      setHidden(bookSeparator, false);
    }
    if (sourceTitle) {
      sourceTitle.textContent = deck.sourceTitle ?? deck.title;
    }
    document.title = `${root.getAttribute("data-page-title-prefix") ?? ""}${deck.title}`;
  };

  const setProgress = () => {
    if (progress) {
      const activeCount = queue.current ? 1 : 0;
      const currentCount = Math.min(queue.completed.length + activeCount, totalCount);
      progress.textContent = totalCount > 0 ? `${currentCount} / ${totalCount}` : "";
    }
  };

  const setStatusCounts = () => {
    const counts = getStudyQueueCounts(queue);
    if (newCount) {
      newCount.textContent = String(counts.new);
    }
    if (learningCount) {
      learningCount.textContent = String(counts.learning);
    }
    setHidden(statusRow, totalCount === 0);
  };

  const isSourceTextOpen = () => sourceDialog?.hasAttribute("open") ?? false;

  const renderCurrentSourceText = () => {
    if (!sourceText || !sourceValue) return;
    renderSourceText(
      sourceText,
      sourceValue,
      showingAnswer
        ? findEvidenceForStudyCard({ manifest: evidenceManifest, deck: activeDeck, card: queue.current })
        : null
    );
  };

  const loadSourceText = () => {
    if (
      sourceLoaded
      || sourceLoadingInProgress
      || !sourceText
      || !hasStudySourceText({ sourceUrl, sourceText: inlineSourceText })
    ) {
      if (sourceLoaded) renderCurrentSourceText();
      return;
    }

    if (String(inlineSourceText).trim()) {
      sourceValue = inlineSourceText;
      renderCurrentSourceText();
      sourceLoaded = true;
      return;
    }

    sourceLoadingInProgress = true;
    setHidden(sourceLoading, false);
    setHidden(sourceError, true);

    fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Source text request failed: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        sourceValue = text;
        renderCurrentSourceText();
        sourceLoaded = true;
      })
      .catch(() => {
        setHidden(sourceError, false);
      })
      .finally(() => {
        sourceLoadingInProgress = false;
        setHidden(sourceLoading, true);
      });
  };

  const closeSourceText = () => {
    if (typeof HTMLDialogElement !== "undefined" && sourceDialog instanceof HTMLDialogElement && sourceDialog.open) {
      sourceDialog.close();
      return;
    }

    sourceDialog?.removeAttribute("open");
  };

  const openSourceText = () => {
    if (!canOpenSourceText({ hasSourceDialog: Boolean(sourceDialog) })) {
      return;
    }

    loadSourceText();

    if (
      typeof HTMLDialogElement !== "undefined" &&
      sourceDialog instanceof HTMLDialogElement &&
      typeof sourceDialog.showModal === "function"
    ) {
      if (!sourceDialog.open) {
        sourceDialog.showModal();
      }
      return;
    }

    sourceDialog.setAttribute("open", "");
  };

  const showCurrentCard = () => {
    if (!queue.current) {
      if (cardButton instanceof HTMLElement) {
        delete cardButton.dataset.studyCardState;
      }
      setHidden(cardButton, true);
      setHidden(showAnswerButton, true);
      setHidden(viewSourceButton, true);
      setHidden(ratingRow, true);
      setHidden(complete, false);
      closeSourceText();
      setProgress();
      setStatusCounts();
      return;
    }

    showingAnswer = false;
    const card = queue.current;
    if (cardButton instanceof HTMLElement) {
      cardButton.dataset.studyCardState = card.studyState ?? "new";
    }
    if (sideLabel) {
      sideLabel.textContent = root.getAttribute("data-question-label") ?? "Question";
    }
    if (cardText) {
      cardText.textContent = card.question;
    }
    setHidden(cardButton, false);
    setHidden(showAnswerButton, false);
    setHidden(viewSourceButton, !hasStudySourceText({ sourceUrl, sourceText: inlineSourceText }));
    setHidden(ratingRow, true);
    setHidden(complete, true);
    closeSourceText();
    setProgress();
    setStatusCounts();
  };

  const showAnswer = () => {
    if (showingAnswer || !queue.current) {
      return;
    }

    showingAnswer = true;
    const card = queue.current;
    if (sideLabel) {
      sideLabel.textContent = root.getAttribute("data-answer-label") ?? "Answer";
    }
    if (cardText) {
      cardText.textContent = card.answer;
    }
    setHidden(showAnswerButton, true);
    setHidden(viewSourceButton, !hasStudySourceText({ sourceUrl, sourceText: inlineSourceText }));
    setHidden(ratingRow, false);
    if (sourceLoaded) renderCurrentSourceText();
    scrollAnswerControlsIntoView({ ratingRow, viewSourceButton });
  };

  const rateCurrentCard = (rating) => {
    if (!showingAnswer || isSourceTextOpen()) {
      return;
    }

    queue = rateStudyQueue(queue, rating);
    showCurrentCard();
  };

  cardButton?.addEventListener("click", showAnswer);
  showAnswerButton?.addEventListener("click", showAnswer);
  viewSourceButton?.addEventListener("click", openSourceText);
  sourceDialog?.addEventListener("click", (event) => {
    if (event.target === sourceDialog) {
      closeSourceText();
    }
  });
  root.querySelectorAll("[data-close-source]").forEach((trigger) => {
    trigger.addEventListener("click", closeSourceText);
  });
  ratingRow?.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-rating]") : null;
    if (trigger) {
      rateCurrentCard(trigger.getAttribute("data-rating"));
    }
  });
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) {
      return;
    }

    if (event.code === "Space" && !showingAnswer) {
      event.preventDefault();
      showAnswer();
      return;
    }

    if (!showingAnswer) {
      return;
    }

    if (isSourceTextOpen()) {
      return;
    }

    const ratingByKey = {
      "1": "again",
      "2": "hard",
      "3": "easy"
    };
    const rating = ratingByKey[event.key];
    if (rating) {
      event.preventDefault();
      rateCurrentCard(rating);
    }
  });

  const showLoadError = () => {
    setHidden(cardButton, true);
    setHidden(showAnswerButton, true);
    setHidden(viewSourceButton, !hasStudySourceText({ sourceUrl, sourceText: inlineSourceText }));
    setHidden(ratingRow, true);
    setHidden(statusRow, true);
    setHidden(error, false);
  };

  const applyDeckData = (deck) => {
    activeDeck = deck;
    const selectedCards = selectStudyCards(flattenStudyDeckCards(deck), {
      count: 24
    });
    queue = createStudyQueue(selectedCards);
    totalCount = selectedCards.length;
    showCurrentCard();
  };

  const loadEvidenceManifest = (deck) => {
    const evidenceUrl = String(deck?.evidenceUrl ?? "").trim();
    if (!evidenceUrl) { evidenceManifest = null; return; }
    fetch(evidenceUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Evidence manifest request failed: ${response.status}`);
        return response.json();
      })
      .then((manifest) => { evidenceManifest = manifest; renderCurrentSourceText(); })
      .catch(() => { evidenceManifest = null; });
  };

  const loadDeck = () => {
    if (!deckUrl) {
      showLoadError();
      return;
    }

    fetch(deckUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Study deck request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((deck) => { applyDeckData(deck); loadEvidenceManifest(deck); })
      .catch(showLoadError);
  };

  const searchParams = new URLSearchParams(window.location.search);
  if (parseLocalStudyParams(searchParams)) {
    const storage = createAugmentationStorage();
    resolveLocalStudySelection({ storage, searchParams })
      .then((resolvedSelection) => {
        if (!resolvedSelection) {
          throw new Error("Local augmentation study deck could not be resolved.");
        }
        applyResolvedSelection(resolvedSelection);
        applyDeckData(resolvedSelection.deck.data);
      })
      .catch(showLoadError)
      .finally(() => storage.close());
    return;
  }

  if (!studyIndexUrl) {
    showLoadError();
    return;
  }

  fetch(studyIndexUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Study index request failed: ${response.status}`);
      }
      return response.json();
    })
    .then((libraryIndex) => {
      const resolvedSelection = resolveStudyShellSelection({
        libraryIndex,
        searchParams
      });

      if (!resolvedSelection) {
        throw new Error("Study deck route could not be resolved.");
      }

      applyResolvedSelection(resolvedSelection);
      loadDeck();
    })
    .catch(showLoadError);
}

export function initStudyPage() {
  document.querySelectorAll("[data-study-root]").forEach(initRoot);
}
