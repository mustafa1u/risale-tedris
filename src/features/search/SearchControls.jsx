import {
  SEARCH_MODES,
  SEARCH_PROXIMITY_DISTANCES,
  SEARCH_SCOPES
} from "./searchContracts.js";

export const BOOLEAN_OPERATORS = ["AND", "OR", "NOT"];

function quoteBooleanTerm(value) {
  const term = value.trim();
  if (!term) return "";
  return /\s/u.test(term) ? `"${term.replace(/"/gu, "")}"` : term;
}

export function serializeBooleanRows(rows) {
  return rows
    .map((row) => ({ operator: row.operator, term: quoteBooleanTerm(row.term) }))
    .filter((row) => row.term)
    .map((row, index) => index === 0 ? row.term : `${row.operator} ${row.term}`)
    .join(" ");
}

export default function SearchControls({
  controlName,
  text,
  state,
  books = [],
  booleanRows,
  canToggleScope,
  canToggleBook,
  onModeChange,
  onScopeToggle,
  onBookToggle,
  onSelectAllBooks,
  onClearBooks,
  onProximityChange,
  onBooleanRowChange,
  onBooleanRowAdd,
  onBooleanRowRemove
}) {
  const modeExamples = text.search.help.examples[state.mode] ?? [];
  const selectedCount = state.selectedBookSlugs.length;

  return (
    <>
      <div class="home-search__options">
        <fieldset class="search-option-group">
          <legend>{text.search.modes.label}</legend>
          <div class="search-chip-list">
            {SEARCH_MODES.map((mode) => (
              <label class={state.mode === mode ? "search-chip is-active" : "search-chip"}>
                <input
                  type="radio"
                  name={`${controlName}-search-mode`}
                  value={mode}
                  checked={state.mode === mode}
                  onChange={() => onModeChange(mode)}
                />
                <span>{text.search.modes[mode]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {modeExamples.length > 0 ? (
          <div class="search-mode-examples" aria-live="polite">
            <strong>{text.search.help.examplesLabel}</strong>
            <ul>
              {modeExamples.map((example) => (
                <li>{example}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <fieldset class="search-option-group">
          <legend>{text.search.scopes.label}</legend>
          <div class="search-chip-list">
            {SEARCH_SCOPES.map((scope) => (
              <label class={state.scopes.includes(scope) ? "search-chip is-active" : "search-chip"}>
                <input
                  type="checkbox"
                  value={scope}
                  checked={state.scopes.includes(scope)}
                  disabled={!canToggleScope(scope)}
                  onChange={() => onScopeToggle(scope)}
                />
                <span>{text.search.scopes[scope]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div class="home-search__filters">
        {state.mode === "boolean" ? (
          <fieldset class="boolean-builder">
            <legend>{text.search.booleanBuilder.label}</legend>
            <p>{text.search.booleanBuilder.description}</p>
            <div class="boolean-builder__rows">
              {booleanRows.map((row, index) => (
                <div class="boolean-builder__row" key={index}>
                  {index > 0 ? (
                    <label>
                      <span>{text.search.booleanBuilder.operation}</span>
                      <select
                        value={row.operator}
                        onChange={(event) => onBooleanRowChange(index, { operator: event.currentTarget.value })}
                      >
                        {BOOLEAN_OPERATORS.map((operator) => (
                          <option value={operator}>{text.search.booleanBuilder.operators[operator]}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label>
                    <span>{index === 0 ? text.search.booleanBuilder.firstTerm : text.search.booleanBuilder.nextTerm}</span>
                    <input
                      type="text"
                      value={row.term}
                      onInput={(event) => onBooleanRowChange(index, { term: event.currentTarget.value })}
                    />
                  </label>
                  {booleanRows.length > 1 ? (
                    <button type="button" class="button-muted" onClick={() => onBooleanRowRemove(index)}>
                      {text.search.booleanBuilder.removeRow}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button type="button" class="button-muted" onClick={onBooleanRowAdd}>
              {text.search.booleanBuilder.addRow}
            </button>
          </fieldset>
        ) : null}

        {books.length > 0 ? (
          <details class="search-book-filter">
            <summary>
              <span>{text.search.books.label}</span>
              <strong>{text.search.books.selectedCount({ count: selectedCount })}</strong>
            </summary>
            <div class="search-book-filter__actions">
              <button
                type="button"
                class="button-muted"
                disabled={selectedCount === books.length}
                onClick={onSelectAllBooks}
              >
                {text.search.books.selectAll}
              </button>
              <button
                type="button"
                class="button-muted"
                disabled={selectedCount === 1}
                onClick={onClearBooks}
              >
                {text.search.books.clearSelection}
              </button>
            </div>
            <div class="search-book-filter__options">
              {books.map((book) => (
                <label>
                  <input
                    type="checkbox"
                    checked={state.selectedBookSlugs.includes(book.slug)}
                    disabled={!canToggleBook(book.slug)}
                    onChange={() => onBookToggle(book.slug)}
                  />
                  <span>{book.title}</span>
                </label>
              ))}
            </div>
          </details>
        ) : null}

        {state.mode === "proximity" ? (
          <label class="search-proximity">
            <span>{text.search.proximity.label}</span>
            <select
              aria-label={text.search.proximity.label}
              value={state.proximityDistance}
              onChange={(event) => onProximityChange(Number(event.currentTarget.value))}
            >
              {SEARCH_PROXIMITY_DISTANCES.map((distance) => (
                <option value={distance}>{text.search.proximity.distance({ count: distance })}</option>
              ))}
            </select>
          </label>
        ) : null}

        <details class="search-help">
          <summary>{text.search.help.label}</summary>
          <p>{text.search.help[state.mode]}</p>
        </details>
      </div>
    </>
  );
}
