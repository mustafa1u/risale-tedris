import { AUGMENTATION_SCHEMA_VERSION } from "./augmentationContracts.js";
import { augmentGrade } from "./augmentationDomain.js";

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function catalogPartTextUrl(bookSlug, part) {
  if (part?.textUrl) {
    return part.textUrl;
  }
  if (!bookSlug || !part?.partNo || !part?.labelSlug) {
    return "";
  }
  return `/assets/${bookSlug}/parcalar/${bookSlug}-${part.partNo}-${part.labelSlug}.txt`;
}

export function catalogPartToDomain(book, part, selectionSequence = 0) {
  return {
    key: part.key,
    bookSlug: book.slug,
    bookTitle: book.title,
    bookOrder: book.bookOrder ?? 0,
    partNo: part.partNo,
    partNumber: part.partNumber,
    title: part.title,
    labelSlug: part.labelSlug,
    textUrl: catalogPartTextUrl(book.slug, part),
    selectionSequence
  };
}

export function buildAugmentationTitle(orderedParts, slugTokenLimit = 5) {
  return (orderedParts ?? []).map((part) => {
    const partNo = String(part?.partNo ?? "").toUpperCase();
    const slugSummary = String(part?.labelSlug ?? "")
      .split("-")
      .filter(Boolean)
      .slice(0, slugTokenLimit)
      .join("-");
    return [partNo, slugSummary].filter(Boolean).join(" ");
  }).filter(Boolean).join(" + ");
}

export function findCatalogContext(catalog, bookSlug, partNo) {
  const book = catalog?.books?.find((item) => item.slug === bookSlug);
  const part = book?.parts?.find((item) => item.partNo === partNo);
  return book && part ? { book, part } : null;
}

export function findCatalogPartByKey(catalog, key) {
  for (const book of catalog?.books ?? []) {
    const part = book.parts?.find((item) => item.key === key);
    if (part) {
      return { book, part };
    }
  }
  return null;
}

export function getNeighborPartKeys(book, partKey) {
  const parts = book?.parts ?? [];
  const index = parts.findIndex((part) => part.key === partKey);
  if (index < 0) {
    return [];
  }
  return [parts[index - 1]?.key, parts[index + 1]?.key].filter(Boolean);
}

export async function loadAugmentationCatalog({
  fetch = globalThis.fetch,
  url = "/assets/augmentation-catalog.json",
  signal
} = {}) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Augmentation catalog request failed: ${response.status}.`);
  }
  const catalog = await response.json();
  if (catalog?.schemaVersion !== AUGMENTATION_SCHEMA_VERSION || !Array.isArray(catalog.books)) {
    throw new Error("Augmentation catalog has an unsupported schema.");
  }
  return catalog;
}

export async function loadRecipeSources({
  catalog,
  orderedPartKeys,
  gradeSlugs,
  fetch = globalThis.fetch,
  signal
}) {
  const uniquePartKeys = [...new Set(orderedPartKeys ?? [])];
  const sourcesByGrade = Object.fromEntries((gradeSlugs ?? []).map((grade) => [grade, []]));
  const failuresByGrade = Object.fromEntries((gradeSlugs ?? []).map((grade) => [grade, []]));
  const jobs = [];

  for (const gradeSlug of gradeSlugs ?? []) {
    for (const key of uniquePartKeys) {
      const context = findCatalogPartByKey(catalog, key);
      const grade = context?.part?.grades?.[gradeSlug];
      if (!context || !grade?.url) {
        failuresByGrade[gradeSlug].push({ key: `${key}:${gradeSlug}`, error: "Grade data is unavailable." });
        continue;
      }
      jobs.push((async () => {
        try {
          const response = await fetch(grade.url, { signal });
          if (!response.ok) {
            throw new Error(`Question source request failed: ${response.status}.`);
          }
          const source = await response.json();
          if (source?.schemaVersion !== AUGMENTATION_SCHEMA_VERSION) {
            throw new Error("Question source has an unsupported schema.");
          }
          if (source.sourceRevision !== grade.sourceRevision) {
            throw new Error("Question source revision does not match the catalog.");
          }
          sourcesByGrade[gradeSlug].push(source);
        } catch (error) {
          if (error.name === "AbortError") {
            throw error;
          }
          failuresByGrade[gradeSlug].push({ key: `${key}:${gradeSlug}`, error: error.message });
        }
      })());
    }
  }

  await Promise.all(jobs);
  return { sourcesByGrade, failuresByGrade };
}

export async function loadPartTexts({
  orderedParts,
  fetch = globalThis.fetch,
  signal
}) {
  const sourceTextByPartKey = {};
  const textFailures = [];
  const seen = new Set();
  const jobs = [];

  for (const part of orderedParts ?? []) {
    if (!part?.key || seen.has(part.key)) {
      continue;
    }
    seen.add(part.key);
    if (!part.textUrl) {
      textFailures.push({ key: part.key, error: "Part text is unavailable." });
      continue;
    }

    jobs.push((async () => {
      try {
        const response = await fetch(part.textUrl, { signal });
        if (!response.ok) {
          throw new Error(`Part text request failed: ${response.status}.`);
        }
        sourceTextByPartKey[part.key] = await response.text();
      } catch (error) {
        if (error.name === "AbortError") {
          throw error;
        }
        textFailures.push({ key: part.key, error: error.message });
      }
    })());
  }

  await Promise.all(jobs);
  return { sourceTextByPartKey, textFailures };
}

export function buildAugmentedSourceText(orderedParts, sourceTextByPartKey = {}) {
  const parts = orderedParts ?? [];
  const includeBookName = new Set(parts.map((part) => part?.bookSlug).filter(Boolean)).size > 1;
  return parts.map((part) => {
    const sourceText = String(sourceTextByPartKey?.[part?.key] ?? "").trim();
    if (!part?.key || !sourceText) {
      return null;
    }
    const label = [
      includeBookName ? part.bookTitle : "",
      String(part.partNo ?? "").toUpperCase(),
      part.title
    ].filter(Boolean).join(" · ");
    return `${label}\n\n${sourceText}`;
  }).filter(Boolean).join("\n\n---\n\n");
}

function resolveOrderedPartsWithTextUrls(orderedParts, catalog) {
  return (orderedParts ?? []).map((part, index) => {
    if (part?.textUrl) {
      return part;
    }
    const context = catalog ? findCatalogPartByKey(catalog, part?.key) : null;
    if (!context) {
      return part;
    }
    return {
      ...catalogPartToDomain(context.book, context.part, part.selectionSequence ?? index),
      ...part,
      textUrl: catalogPartToDomain(context.book, context.part, part.selectionSequence ?? index).textUrl
    };
  });
}

export async function hydrateProjectSourceText({
  project,
  catalog,
  fetch = globalThis.fetch,
  signal
}) {
  if (!project || String(project.sourceText ?? "").trim()) {
    return project;
  }
  const orderedParts = resolveOrderedPartsWithTextUrls(project.orderedParts, catalog);
  const loaded = await loadPartTexts({ orderedParts, fetch, signal });
  const sourceText = buildAugmentedSourceText(orderedParts, loaded.sourceTextByPartKey);
  if (!sourceText) {
    return project;
  }
  return {
    ...project,
    orderedParts: clone(orderedParts),
    sourceText
  };
}

function readyGradeSnapshot(result) {
  return {
    status: "ready",
    gradeSlug: result.gradeSlug,
    baseSetCount: result.baseSetCount,
    totalQuestions: result.totalQuestions,
    redistributedSetCount: result.redistributedSetCount,
    selectedQuestionCount: result.selectedQuestionCount,
    sourceRevisions: clone(result.sourceRevisions),
    selectedSets: clone(result.selectedSets),
    studyQuestions: clone(result.studyQuestions),
    warnings: clone(result.warnings)
  };
}

export function buildAugmentationProject({
  id = crypto.randomUUID(),
  title,
  catalogRevision,
  basePart,
  orderedParts,
  gradeSlugs,
  sourcesByGrade,
  sourceTextByPartKey = {},
  failuresByGrade = {}
}) {
  if (!basePart?.key || !orderedParts?.some((part) => part.key === basePart.key)) {
    throw new Error("The augmentation project requires its locked base part.");
  }
  const gradeResults = {};
  for (const gradeSlug of gradeSlugs ?? []) {
    const loadFailures = failuresByGrade[gradeSlug] ?? [];
    if (loadFailures.length > 0) {
      gradeResults[gradeSlug] = {
        status: "failed",
        gradeSlug,
        error: loadFailures.map((failure) => `${failure.key}: ${failure.error}`).join("; ")
      };
      continue;
    }
    try {
      gradeResults[gradeSlug] = readyGradeSnapshot(augmentGrade({
        basePartKey: basePart.key,
        gradeSlug,
        orderedParts,
        sources: sourcesByGrade[gradeSlug] ?? []
      }));
    } catch (error) {
      gradeResults[gradeSlug] = { status: "failed", gradeSlug, error: error.message };
    }
  }

  return {
    schemaVersion: AUGMENTATION_SCHEMA_VERSION,
    id,
    homeBookSlug: basePart.bookSlug,
    basePartKey: basePart.key,
    title: title?.trim()
      || buildAugmentationTitle(orderedParts)
      || `${basePart.partNo.toUpperCase()} kişisel artırma`,
    catalogRevision,
    policy: {
      normalizeToBaseSetCount: true,
      randomize: false,
      smallTotalSetCount: 6,
      largeTotalRule: "floor(total / 10) + 1",
      selectedSetCount: 6,
      questionSourceLabels: true
    },
    sourceText: buildAugmentedSourceText(orderedParts, sourceTextByPartKey),
    orderedParts: clone(orderedParts),
    selectedGrades: [...new Set(gradeSlugs ?? [])],
    gradeResults
  };
}
