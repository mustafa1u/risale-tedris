export function normalizePartSearchText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı", "i");
}

export function partRowMatchesFilters(row, filters) {
  const searchValue = normalizePartSearchText(filters?.searchValue?.trim?.() ?? filters?.searchValue ?? "");
  const gradeValue = filters?.gradeValue ?? "";
  const searchText = normalizePartSearchText(row?.searchText ?? "");
  const gradeSlugs = row?.gradeSlugs ?? [];
  const matchesSearch = searchValue.length === 0 || searchText.includes(searchValue);
  const matchesGrade = gradeValue.length === 0 || gradeSlugs.includes(gradeValue);

  return matchesSearch && matchesGrade;
}

export function getPartFilterResult(rows, filters) {
  const matches = rows.map((row) => partRowMatchesFilters(row, filters));
  const visibleCount = matches.filter(Boolean).length;

  return {
    matches,
    visibleCount,
    hasNoResults: visibleCount === 0
  };
}

export function initPartFilters(root = globalThis.document) {
  const toolbar = root?.querySelector?.("[data-part-toolbar]");
  if (!toolbar) {
    return;
  }

  const searchInput = toolbar.querySelector("[data-part-search]");
  const gradeFilter = toolbar.querySelector("[data-grade-filter]");
  const status = root.querySelector("[data-filter-status]");
  const emptyState = root.querySelector("[data-filter-empty]");
  const rows = Array.from(root.querySelectorAll("[data-part-row]"));

  const applyFilters = () => {
    const searchValue = searchInput instanceof HTMLInputElement ? searchInput.value : "";
    const gradeValue = gradeFilter instanceof HTMLSelectElement ? gradeFilter.value : "";
    const result = getPartFilterResult(
      rows.map((row) => ({
        searchText: row.getAttribute("data-search") ?? "",
        gradeSlugs: (row.getAttribute("data-grades") ?? "").split(" ").filter(Boolean)
      })),
      { searchValue, gradeValue }
    );

    rows.forEach((row, index) => {
      const isVisible = result.matches[index];

      row.toggleAttribute("hidden", !isVisible);
    });

    if (status) {
      status.textContent =
        status
          .getAttribute(`data-count-${result.visibleCount === 1 ? "one" : "many"}`)
          ?.replace("{count}", String(result.visibleCount)) ?? String(result.visibleCount);
    }

    if (emptyState instanceof HTMLElement) {
      emptyState.hidden = !result.hasNoResults;
    }
  };

  searchInput?.addEventListener("input", applyFilters);
  gradeFilter?.addEventListener("change", applyFilters);
  applyFilters();
}
