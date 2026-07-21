# Flashcard Study TDD Plan

## Legend

- `[ ]` Pending
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked or needs a decision

## Goal

Add a data-first Study feature that uses structured question-bank data instead of mobile PDFs as the primary source. Each Study session should select 24 flashcards from the available question bank, show the question first, reveal the answer by clicking/tapping the card or pressing a button, then collect an Anki-like rating for the current session only.

## Constraints

- Keep the Astro app static for the first implementation.
- Do not generate new files at user study time in production.
- Generate/import static question-bank JSON ahead of time, with 24-card dependency-aware preselection done by QAGeneratorLib.
- Keep dependency sidecar parsing and selection logic out of the browser app.
- Keep long-term repetition statistics out of the first implementation.

## Phase 1: Question-Bank Data Pipeline

- `[x]` Slice 1.1: Add tests for parsing set-based `S:` / `C:` question-bank text into structured sets.
- `[x]` Slice 1.2: Implement parser/import utilities that pass those tests.
- `[x]` Slice 1.3: Add tests for deterministic 24-card selection input data, including stable question IDs.
- `[x]` Slice 1.4: Implement basic static JSON writer for imported question-bank files.
- `[x]` Slice 1.5: Extend generated library manifest/types to expose available study decks per part and grade.
- `[x]` Slice 1.6: Add a tested `study:import` command for repeatable question-bank JSON imports.
- `[x]` Slice 1.7: Add a tested bulk importer and generate all exact part-level study deck JSON files.
- `[x]` Slice 1.8: Add a QAGeneratorLib bridge that returns dependency-aware flashcard question data without generating DOCX.
- `[x]` Slice 1.9: Use the QAGeneratorLib bridge during bulk import to write only the selected 24 study cards per part.

Acceptance checks:

- Parser handles `Set - N` headers and one-line tabbed `S:` / `C:` rows.
- Output preserves `setNumber`, `questionNumber`, `id`, `question`, and `answer`.
- Import output is stable, capped to 24 cards, and suitable for browser-only study.

## Phase 2: Session Selection

- `[x]` Slice 2.1: Add tests that the browser caps imported study cards without mutating source data.
- `[x]` Slice 2.2: Implement client-safe card selection from preselected imported JSON.
- `[x]` Slice 2.3: Remove browser-side dependency expansion and preserve QAGeneratorLib's imported card order.

Acceptance checks:

- A session can select up to 24 cards without mutating source data.
- Dependency-aware selection is completed before deployment by QAGeneratorLib.
- Dependent questions preserve required parent/context order when the imported deck is displayed.

## Phase 3: Study Route And UI

- `[x]` Slice 3.1: Add tests for URL/deck resolution from book, part, grade, and document type.
- `[x]` Slice 3.2: Add `Study` buttons where imported question-bank JSON exists.
- `[x]` Slice 3.3: Build a dedicated static Study page.
- `[x]` Slice 3.4: Add front/back card behavior with click/tap on the actual card and a `Show Answer` button.
- `[x]` Slice 3.5: Add keyboard support: `Space` for answer and visible rating number keys after reveal.
- `[x]` Slice 3.6: Add an in-session source text viewer that is available only after the answer is shown.

Acceptance checks:

- The first visible side is always the question.
- Clicking/tapping the card itself reveals the answer.
- Clicking outside the card does not reveal the answer.
- Source text cannot be opened while the question side is visible.
- Opening and closing source text does not navigate away from the Study page or reset the session queue.
- The UI works on mobile and desktop widths.

## Phase 4: In-Session Anki-Like Queue

- `[x]` Slice 4.1: Add tests for session queue transitions: `Again`, `Hard`, `Good`, `Easy`.
- `[x]` Slice 4.2: Implement in-memory queue scheduling for the current study session.
- `[x]` Slice 4.3: Add completion state for a finished session.
- `[x]` Slice 4.4: Add visible progress counts without long-term persistence.
- `[x]` Slice 4.5: Add session-only Anki color categories: blue/new and red/learning, with green/review hidden until persistence exists.
- `[x]` Slice 4.6: Add honest non-time rating outcome labels above the rating buttons: `Soon`, `Later`, `Done`, `Done`.
- `[x]` Slice 4.7: Hide `Good` until timer-based scheduling makes it meaningfully different from `Easy`.

Acceptance checks:

- `Again` returns the card soon in the same session.
- `Hard` returns it later in the same session.
- `Good` and `Easy` finish the card for the session.
- Reloading/opening Study starts fresh.
- All cards start as blue/new in a fresh session.
- `Again` and `Hard` move the card into red/learning for the current session.
- Green/review cards are not shown until long-term scheduling state exists.
- Rating buttons show outcome hints without pretending to use minute/day scheduling.
- Visible rating actions are `Again`, `Hard`, and `Easy`; `Good` remains a later scheduling action.

## Phase 5: Verification And Polish

- `[x]` Slice 5.1: Add unit coverage for importer, selector, and queue modules.
- `[x]` Slice 5.2: Run `npm run check` and `npm run build`.
- `[x]` Slice 5.3: Generate real imported decks and verify static study routes build.
- `[x]` Slice 5.4: Update README with study/import workflow.
- `[x]` Slice 5.5: Verify all 1605 generated study decks contain exactly 24 QAGeneratorLib-selected cards.

Acceptance checks:

- Tests pass.
- Astro check/build pass.
- A real deck can be studied end to end.

## Later Enhancements

- `[ ]` Persist study history in localStorage or IndexedDB.
- `[ ]` Add a real spaced repetition scheduler once persistence exists.
- `[ ]` Add timer-based learning steps and truthful due labels such as `<1m`, `<10m`, `1d`, `3d`.
- `[ ]` Restore `Good` as a separate visible action once it has a different due interval than `Easy`.
- `[ ]` Add book-wide and grade-wide study modes.
- `[x]` Add an explicit bridge/export API in QAGeneratorLib so the web app does not duplicate dependency selection logic.
- `[ ]` Consider PDF or PNG fallbacks only for decks that cannot be represented as structured Q/A data.
