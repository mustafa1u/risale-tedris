import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseQuestionBankText } from "./study-question-bank.mjs";

const SCHEMA_VERSION = 1;
const CATALOG_VERSION = 1;
const DEFAULT_LIBRARY_ROOT =
  process.env.TEXT_DATA_EDITOR_LIBRARY_ROOT
  ?? "C:\\Users\\musta\\source\\repos\\TextDataEditor\\sourceLib";
const DEFAULT_ASSETS_ROOT = "assets";
const TARGET_BOOKS = new Set([
  "ayetul-kubra",
  "kucuk-sozler",
  "meyve-risalesi",
  "tabiat-risalesi"
]);
const SOURCE_FILE_PATTERN =
  /^SveC_(2sinif|5sinif|8sinif|11sinif|lisans)_(ayetul-kubra|kucuk-sozler|meyve-risalesi|tabiat-risalesi)-(p\d+)-.*\.txt$/i;
const GRADE_SLUGS = new Map([
  ["2sinif", "2-sinif"],
  ["5sinif", "5-sinif"],
  ["8sinif", "8-sinif"],
  ["11sinif", "11-sinif"],
  ["lisans", "lisans"]
]);

function normalizeText(value) {
  return String(value ?? "").replace(/\r\n?/gu, "\n");
}

export function parseJsonDocument(text) {
  return JSON.parse(String(text ?? "").replace(/^\uFEFF/u, ""));
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

function canonicalQuestionId(bookSlug, partNo, gradeSlug, sourceQuestionId) {
  return `${bookSlug}:${partNo}:${gradeSlug}:${sourceQuestionId}`;
}

function labelSlugFromSourcePath(source) {
  const fileName = basename(source?.sourcePath ?? "").replace(/\.txt$/iu, "");
  const marker = `${source?.bookSlug}-${source?.partNo}-`;
  const markerIndex = fileName.toLowerCase().indexOf(marker.toLowerCase());
  return markerIndex < 0 ? "" : fileName.slice(markerIndex + marker.length);
}

function partTextUrl(bookSlug, partNo, labelSlug) {
  return labelSlug ? `/assets/${bookSlug}/parcalar/${bookSlug}-${partNo}-${labelSlug}.txt` : "";
}

export function parseDependencyPayload(payload) {
  const result = new Map();
  for (const set of payload?.sets ?? []) {
    for (const dependency of set?.direct_dependencies ?? set?.directDependencies ?? []) {
      const questionId = dependency?.question_id ?? dependency?.questionId;
      if (!questionId) {
        continue;
      }
      const parents = (dependency?.depends_on ?? dependency?.dependsOn ?? [])
        .map((item) => item?.question_id ?? item?.questionId)
        .filter(Boolean);
      result.set(questionId, [...new Set(parents)]);
    }
  }
  return result;
}

export function buildAugmentationSource({
  bookSlug,
  bookTitle,
  bookOrder = 0,
  gradeSlug,
  partNo,
  partNumber,
  title,
  sourcePath,
  questionText,
  dependencyPayload
}) {
  if (!bookSlug || !gradeSlug || !partNo) {
    throw new Error("bookSlug, gradeSlug, and partNo are required.");
  }
  const parsed = parseQuestionBankText(questionText);
  if (parsed.sets.length === 0) {
    throw new Error(`No question sets were parsed for ${bookSlug}:${gradeSlug}:${partNo}.`);
  }
  const dependencies = parseDependencyPayload(dependencyPayload);
  const seenQuestionIds = new Set();
  const sets = parsed.sets.map((set) => ({
    setNumber: set.setNumber,
    questions: set.questions.map((question) => {
      if (seenQuestionIds.has(question.id)) {
        throw new Error(`Duplicate source question id '${question.id}' in ${sourcePath}.`);
      }
      seenQuestionIds.add(question.id);
      return {
        canonicalId: canonicalQuestionId(bookSlug, partNo, gradeSlug, question.id),
        sourceQuestionId: question.id,
        sourceSetNumber: question.setNumber,
        sourceQuestionNumber: question.questionNumber,
        question: question.question,
        answer: question.answer,
        wordCount: question.wordCount,
        hint: question.hint ?? "",
        dependsOn: (dependencies.get(question.id) ?? []).map((dependencyId) =>
          canonicalQuestionId(bookSlug, partNo, gradeSlug, dependencyId)
        )
      };
    })
  }));
  const questionCount = sets.reduce((total, set) => total + set.questions.length, 0);
  const revisionInput = `${normalizeText(questionText)}\n${stableJson(dependencyPayload ?? {})}`;

  return {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion: CATALOG_VERSION,
    key: `${bookSlug}:${gradeSlug}:${partNo}`,
    bookSlug,
    bookTitle,
    bookOrder,
    gradeSlug,
    partNo,
    partNumber,
    title,
    sourcePath: toPosixPath(sourcePath ?? ""),
    sourceRevision: sha256(revisionInput),
    setCount: sets.length,
    questionCount,
    sets
  };
}

export function buildAugmentationCatalog(sources) {
  const bookMap = new Map();
  const sortedSources = [...(sources ?? [])].sort((left, right) =>
    (left.bookOrder ?? 0) - (right.bookOrder ?? 0)
    || left.bookSlug.localeCompare(right.bookSlug, "en")
    || left.partNumber - right.partNumber
    || left.gradeSlug.localeCompare(right.gradeSlug, "en")
  );

  for (const source of sortedSources) {
    const labelSlug = labelSlugFromSourcePath(source);
    const book = bookMap.get(source.bookSlug) ?? {
      slug: source.bookSlug,
      title: source.bookTitle,
      bookOrder: source.bookOrder ?? bookMap.size,
      parts: new Map()
    };
    const part = book.parts.get(source.partNo) ?? {
      key: `${source.bookSlug}:${source.partNo}`,
      partNo: source.partNo,
      partNumber: source.partNumber,
      title: source.title,
      labelSlug,
      textUrl: partTextUrl(source.bookSlug, source.partNo, labelSlug),
      grades: {}
    };
    if (part.labelSlug && labelSlug && part.labelSlug !== labelSlug) {
      throw new Error(`Conflicting label slugs for ${source.bookSlug}:${source.partNo}.`);
    }
    if (!part.labelSlug) {
      part.labelSlug = labelSlug;
      part.textUrl = partTextUrl(source.bookSlug, source.partNo, labelSlug);
    }
    part.grades[source.gradeSlug] = {
      url: `/assets/${source.bookSlug}/augmentation-bank/${source.gradeSlug}/${source.partNo}.json`,
      sourceRevision: source.sourceRevision,
      setCount: source.setCount,
      questionCount: source.questionCount
    };
    book.parts.set(source.partNo, part);
    bookMap.set(source.bookSlug, book);
  }

  const books = [...bookMap.values()]
    .sort((left, right) => left.bookOrder - right.bookOrder || left.slug.localeCompare(right.slug, "en"))
    .map((book) => {
      const parts = [...book.parts.values()].sort((left, right) => left.partNumber - right.partNumber);
      return {
        slug: book.slug,
        title: book.title,
        bookOrder: book.bookOrder,
        partCount: parts.length,
        parts
      };
    });
  const catalogRevision = sha256(stableJson(
    sortedSources.map((source) => ({ key: source.key, revision: source.sourceRevision }))
  ));

  return {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion: CATALOG_VERSION,
    catalogRevision,
    books
  };
}

export async function writeJsonIfChanged(path, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const existing = await readFile(path, "utf8").catch(() => null);
  if (existing === content) {
    return false;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return true;
}

async function listJsonFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => join(directory, entry.name));
}

function parseSourceIdentity(sourceFile) {
  const match = basename(sourceFile ?? "").match(SOURCE_FILE_PATTERN);
  if (!match) {
    return null;
  }
  const [, sourceGrade, bookSlug, partNo] = match;
  return {
    bookSlug: bookSlug.toLowerCase(),
    gradeSlug: GRADE_SLUGS.get(sourceGrade.toLowerCase()),
    partNo: partNo.toLowerCase()
  };
}

function resolveLibrarySourcePath(libraryRoot, sourceFile) {
  const normalized = String(sourceFile ?? "").replaceAll("/", "\\");
  if (/^[A-Za-z]:\\/u.test(normalized)) {
    return normalized;
  }
  if (normalized.toLowerCase().startsWith("sourcelib\\")) {
    return resolve(dirname(libraryRoot), normalized);
  }
  return resolve(libraryRoot, normalized);
}

function dependencyCandidates(sourcePath, gradeSlug) {
  const dependencyName = `${basename(sourcePath, ".txt")}.dependencies.json`;
  const sourceDirectory = dirname(sourcePath);
  return [
    join(sourceDirectory, dependencyName),
    join(dirname(sourceDirectory), "_dependencies", gradeSlug, dependencyName),
    join(dirname(sourceDirectory), "_dependencies", gradeSlug.replace("-sinif", "sinif"), dependencyName)
  ];
}

async function readOptionalJson(paths) {
  for (const path of paths) {
    if (existsSync(path)) {
      return { path, value: parseJsonDocument(await readFile(path, "utf8")) };
    }
  }
  return { path: "", value: null };
}

async function readBookMetadata(assetsRoot, bookSlug) {
  const bookPath = join(assetsRoot, bookSlug, "book.json");
  const labelsPath = join(assetsRoot, bookSlug, "part-labels.json");
  const book = parseJsonDocument(await readFile(bookPath, "utf8"));
  const labels = parseJsonDocument(await readFile(labelsPath, "utf8"));
  return { title: book.title ?? bookSlug, labels };
}

function chooseManifest(existing, candidate) {
  if (!existing) {
    return candidate;
  }
  const existingTime = Date.parse(existing.manifest.updatedAtUtc ?? 0) || 0;
  const candidateTime = Date.parse(candidate.manifest.updatedAtUtc ?? 0) || 0;
  return candidateTime >= existingTime ? candidate : existing;
}

export async function planAugmentationImports({
  libraryRoot = DEFAULT_LIBRARY_ROOT,
  assetsRoot = DEFAULT_ASSETS_ROOT,
  bookSlug
} = {}) {
  const manifests = await listJsonFiles(join(libraryRoot, "parts"));
  const metadata = new Map();
  const bookOrder = new Map([...TARGET_BOOKS].map((slug, index) => [slug, index]));
  for (const slug of TARGET_BOOKS) {
    if (!bookSlug || slug === bookSlug) {
      metadata.set(slug, await readBookMetadata(assetsRoot, slug));
    }
  }
  const jobs = new Map();
  const skipped = [];

  for (const manifestPath of manifests) {
    const manifest = parseJsonDocument(await readFile(manifestPath, "utf8"));
    const identity = parseSourceIdentity(manifest.sourceFile);
    if (!identity || !TARGET_BOOKS.has(identity.bookSlug) || (bookSlug && identity.bookSlug !== bookSlug)) {
      continue;
    }
    const bookMetadata = metadata.get(identity.bookSlug);
    if (!bookMetadata?.labels?.[identity.partNo]) {
      skipped.push({ manifestPath, sourceFile: manifest.sourceFile, reason: "No matching app part" });
      continue;
    }
    const key = `${identity.bookSlug}:${identity.gradeSlug}:${identity.partNo}`;
    jobs.set(key, chooseManifest(jobs.get(key), {
      key,
      ...identity,
      manifest,
      manifestPath,
      bookTitle: bookMetadata.title,
      bookOrder: bookOrder.get(identity.bookSlug) ?? 0,
      partNumber: Number(identity.partNo.slice(1)),
      title: bookMetadata.labels[identity.partNo],
      sourcePath: resolveLibrarySourcePath(libraryRoot, manifest.sourceFile),
      outPath: join(assetsRoot, identity.bookSlug, "augmentation-bank", identity.gradeSlug, `${identity.partNo}.json`)
    }));
  }

  return {
    jobs: [...jobs.values()].sort((left, right) => left.key.localeCompare(right.key, "en")),
    skipped
  };
}

export async function importAugmentationBank({
  libraryRoot = DEFAULT_LIBRARY_ROOT,
  assetsRoot = DEFAULT_ASSETS_ROOT,
  bookSlug,
  limit
} = {}) {
  const plan = await planAugmentationImports({ libraryRoot, assetsRoot, bookSlug });
  const jobs = Number.isInteger(limit) && limit > 0 ? plan.jobs.slice(0, limit) : plan.jobs;
  const sources = [];
  const failures = [];
  let written = 0;
  let unchanged = 0;

  for (const job of jobs) {
    try {
      const questionText = await readFile(job.sourcePath, "utf8");
      const dependency = await readOptionalJson(dependencyCandidates(job.sourcePath, job.gradeSlug));
      const source = buildAugmentationSource({ ...job, questionText, dependencyPayload: dependency.value });
      if (await writeJsonIfChanged(job.outPath, source)) {
        written += 1;
      } else {
        unchanged += 1;
      }
      sources.push(source);
    } catch (error) {
      failures.push({ key: job.key, sourcePath: job.sourcePath, error: error.message });
    }
  }

  const catalog = buildAugmentationCatalog(sources);
  const catalogPath = join(assetsRoot, "augmentation-catalog.json");
  await writeJsonIfChanged(catalogPath, catalog);
  return { planned: jobs.length, written, unchanged, failures, skipped: plan.skipped, catalog, catalogPath };
}

export function parseAugmentationCliArgs(args) {
  const result = {};
  const map = new Map([
    ["--library-root", "libraryRoot"],
    ["--assets-root", "assetsRoot"],
    ["--book", "bookSlug"],
    ["--limit", "limit"]
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const key = map.get(args[index]);
    if (!key) {
      throw new Error(`Unknown option: ${args[index]}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${args[index]}`);
    }
    result[key] = key === "limit" ? Number(value) : value;
    index += 1;
  }
  if (result.bookSlug && !TARGET_BOOKS.has(result.bookSlug)) {
    throw new Error(`Unsupported book: ${result.bookSlug}`);
  }
  return result;
}

export async function runAugmentationCli(args, logger = console.log) {
  const result = await importAugmentationBank(parseAugmentationCliArgs(args));
  logger(`Augmentation bank: ${result.written} written, ${result.unchanged} unchanged, ${result.failures.length} failed.`);
  if (result.failures.length > 0) {
    throw new Error(`Augmentation import failed for ${result.failures.length} source(s).`);
  }
  return result;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runAugmentationCli(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
