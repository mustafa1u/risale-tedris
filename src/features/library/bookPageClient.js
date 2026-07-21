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

function partRowData(row) {
  return {
    partNo: row.getAttribute("data-part-no") ?? "",
    searchText: row.getAttribute("data-search") ?? "",
    gradeSlugs: (row.getAttribute("data-grades") ?? "").split(" ").filter(Boolean)
  };
}

export function createPartRowPresenter(root = globalThis.document) {
  const partList = root?.querySelector?.("[data-part-list]");
  const status = root?.querySelector?.("[data-filter-status]");
  const emptyState = root?.querySelector?.("[data-filter-empty]");
  const originalRows = Array.from(root?.querySelectorAll?.("[data-part-row]") ?? []);
  const rowsByPartNo = new Map(
    originalRows
      .map((row) => [row.getAttribute("data-part-no") ?? "", row])
      .filter(([partNo]) => partNo.length > 0)
  );

  function updateStatus(visibleCount) {
    if (status) {
      status.textContent =
        status
          .getAttribute(`data-count-${visibleCount === 1 ? "one" : "many"}`)
          ?.replace("{count}", String(visibleCount)) ?? String(visibleCount);
    }
    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }
    return {
      visibleCount,
      hasNoResults: visibleCount === 0
    };
  }

  function presentOrderedPartNos(orderedPartNos) {
    const orderedRows = [];
    const visibleRows = new Set();
    for (const partNo of orderedPartNos ?? []) {
      const row = rowsByPartNo.get(partNo);
      if (row && !visibleRows.has(row)) {
        visibleRows.add(row);
        orderedRows.push(row);
      }
    }

    for (const row of orderedRows) {
      row.toggleAttribute("hidden", false);
      partList?.append?.(row);
    }
    for (const row of originalRows) {
      if (visibleRows.has(row)) continue;
      row.toggleAttribute("hidden", true);
      partList?.append?.(row);
    }

    return updateStatus(orderedRows.length);
  }

  function presentMetadata(filters) {
    const metadata = originalRows.map(partRowData);
    const result = getPartFilterResult(metadata, filters);
    const orderedPartNos = metadata
      .filter((_, index) => result.matches[index])
      .map((row) => row.partNo);
    return presentOrderedPartNos(orderedPartNos);
  }

  function reset() {
    return presentOrderedPartNos(originalRows.map((row) => row.getAttribute("data-part-no") ?? ""));
  }

  return {
    presentMetadata,
    presentOrderedPartNos,
    reset
  };
}

export function initPartFilters(root = globalThis.document) {
  const toolbar = root?.querySelector?.("[data-part-toolbar]");
  if (!toolbar) {
    return;
  }

  const searchInput = toolbar.querySelector("[data-part-search]");
  const gradeFilter = toolbar.querySelector("[data-grade-filter]");
  const presenter = createPartRowPresenter(root);

  const applyFilters = () => {
    const searchValue = searchInput instanceof HTMLInputElement ? searchInput.value : "";
    const gradeValue = gradeFilter instanceof HTMLSelectElement ? gradeFilter.value : "";
    presenter.presentMetadata({ searchValue, gradeValue });
  };

  searchInput?.addEventListener("input", applyFilters);
  gradeFilter?.addEventListener("change", applyFilters);
  applyFilters();
}
