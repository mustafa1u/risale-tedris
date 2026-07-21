import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildStudyDeck,
  buildStudyDeckFromSelectionJson,
  writeStudyDeckJson
} from "./study-question-bank.mjs";

const DEFAULT_SOURCE_ROOT =
  "C:\\Users\\musta\\OneDrive\\Belgeler\\Risale 10\\hazirlayici\\build\\divider_runs";
const DEFAULT_ASSETS_ROOT = "assets";
const BOOK_SLUGS = new Set([
  "ayetul-kubra",
  "kucuk-sozler",
  "meyve-risalesi",
  "tabiat-risalesi"
]);
const GRADE_FROM_SOURCE = new Map([
  ["2sinif", "2-sinif"],
  ["5sinif", "5-sinif"],
  ["8sinif", "8-sinif"],
  ["11sinif", "11-sinif"],
  ["lisans", "lisans"]
]);
const SOURCE_FILE_PATTERN =
  /^SveC_(2sinif|5sinif|8sinif|11sinif|lisans)_(ayetul-kubra|kucuk-sozler|meyve-risalesi|tabiat-risalesi)-(p\d+)-.*\.txt$/i;
const SELECTION_FILE_PATTERN =
  /^SEL_(2sinif|5sinif|8sinif|11sinif|lisans)_(ayetul-kubra|kucuk-sozler|meyve-risalesi|tabiat-risalesi)-(p\d+)-.*\.json$/i;
const PRESELECTOR_PROJECT = join("scripts", "study-preselector", "StudyPreselector.csproj");
const PRESELECTION_COUNT = 24;

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

function normalizedPath(value) {
  return toPosixPath(resolve(value)).toLowerCase();
}

function deterministicSeed(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) & 0x7fffffff;
}

async function listFilesRecursive(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(path)));
      continue;
    }

    if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function parseSourceFilePath(filePath) {
  const fileName = basename(filePath);
  const selectionMatch = fileName.match(SELECTION_FILE_PATTERN);
  const match = selectionMatch ?? fileName.match(SOURCE_FILE_PATTERN);
  if (!match) {
    return null;
  }

  const [, sourceGrade, bookSlug, partNo] = match;
  const gradeSlug = GRADE_FROM_SOURCE.get(sourceGrade.toLowerCase());
  if (!gradeSlug || !BOOK_SLUGS.has(bookSlug)) {
    return null;
  }

  return {
    bookSlug,
    gradeSlug,
    partNo,
    sourceKind: selectionMatch ? "selection" : "questionText",
    key: `${bookSlug}:${gradeSlug}:${partNo}`
  };
}

async function readPartLabels(assetsRoot, bookSlug) {
  const labelsPath = join(assetsRoot, bookSlug, "part-labels.json");
  if (!existsSync(labelsPath)) {
    return {};
  }

  return JSON.parse(await readFile(labelsPath, "utf8"));
}

async function listAssetPartNos(assetsRoot, bookSlug) {
  const partRoot = join(assetsRoot, bookSlug, "parcalar");
  const files = await listFilesRecursive(partRoot);
  const partNos = new Set();

  for (const filePath of files) {
    const match = basename(filePath).match(/-p(\d+)-/i);
    if (match) {
      partNos.add(`p${match[1].padStart(2, "0")}`);
    }
  }

  return partNos;
}

function choosePreferredSourceFile(files) {
  return [...files].sort((a, b) => {
    const sizeDelta = statSync(b).size - statSync(a).size;
    if (sizeDelta !== 0) {
      return sizeDelta;
    }

    const normalizedA = normalizedPath(a);
    const normalizedB = normalizedPath(b);
    const exactBookFolderA = normalizedA.includes(
      `/divider_runs/${parseSourceFilePath(a)?.bookSlug}/${parseSourceFilePath(a)?.bookSlug}/outputs/`
    );
    const exactBookFolderB = normalizedB.includes(
      `/divider_runs/${parseSourceFilePath(b)?.bookSlug}/${parseSourceFilePath(b)?.bookSlug}/outputs/`
    );

    if (exactBookFolderA !== exactBookFolderB) {
      return exactBookFolderA ? -1 : 1;
    }

    return normalizedA.localeCompare(normalizedB, "en");
  })[0];
}

export async function planBulkStudyImports({
  sourceRoot = DEFAULT_SOURCE_ROOT,
  assetsRoot = DEFAULT_ASSETS_ROOT
} = {}) {
  const allFiles = await listFilesRecursive(sourceRoot);
  const grouped = new Map();

  for (const filePath of allFiles) {
    const parsed = parseSourceFilePath(filePath);
    if (!parsed) {
      continue;
    }

    const group = grouped.get(parsed.key) ?? {
      bookSlug: parsed.bookSlug,
      gradeSlug: parsed.gradeSlug,
      partNo: parsed.partNo,
      key: parsed.key,
      sourceFiles: [],
      selectionFiles: []
    };
    if (parsed.sourceKind === "selection") {
      group.selectionFiles.push(filePath);
    } else {
      group.sourceFiles.push(filePath);
    }
    grouped.set(parsed.key, group);
  }

  const bookPartNos = new Map();
  const bookLabels = new Map();
  for (const bookSlug of BOOK_SLUGS) {
    bookPartNos.set(bookSlug, await listAssetPartNos(assetsRoot, bookSlug));
    bookLabels.set(bookSlug, await readPartLabels(assetsRoot, bookSlug));
  }

  const imports = [];
  const skipped = [];

  for (const group of [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key, "en"))) {
    if (!bookPartNos.get(group.bookSlug)?.has(group.partNo)) {
      skipped.push({
        ...group,
        reason: "No matching app part"
      });
      continue;
    }

    const sourceKind = group.selectionFiles.length > 0 ? "selection" : "questionText";
    const sourcePath = choosePreferredSourceFile(
      sourceKind === "selection" ? group.selectionFiles : group.sourceFiles
    );
    imports.push({
      bookSlug: group.bookSlug,
      gradeSlug: group.gradeSlug,
      partNo: group.partNo,
      title: bookLabels.get(group.bookSlug)?.[group.partNo] ?? group.partNo.toUpperCase(),
      sourceKind,
      sourcePath,
      outPath: join(
        assetsRoot,
        group.bookSlug,
        "question-bank",
        group.gradeSlug,
        `${group.partNo}.json`
      ),
      duplicateSourceCount: group.sourceFiles.length,
      duplicateSelectionCount: group.selectionFiles.length
    });
  }

  return {
    imports,
    skipped
  };
}

export async function preselectStudyDeckJobs({
  jobs,
  jobsPath = join("scripts", ".tmp-study-preselection-jobs.json"),
  reportPath = join("scripts", ".tmp-study-preselection-report.json"),
  preselectorProject = PRESELECTOR_PROJECT
}) {
  await mkdir(dirname(jobsPath), { recursive: true });
  await writeFile(jobsPath, `${JSON.stringify({ jobs }, null, 2)}\n`, "utf8");

  const result = spawnSync(
    "dotnet",
    ["run", "--project", preselectorProject, "--", "--jobs", jobsPath, "--report", reportPath],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [
        "QAGeneratorLib study preselection failed.",
        result.stdout?.trim(),
        result.stderr?.trim()
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    reportPath
  };
}

export async function runBulkStudyImport(options = {}, logger = console.log) {
  const { imports, skipped } = await planBulkStudyImports(options);
  let empty = 0;
  let written = 0;
  const jobs = [];

  for (const item of imports) {
    const sourcePath = toPosixPath(relative(process.cwd(), item.sourcePath));
    const deck =
      item.sourceKind === "selection"
        ? buildStudyDeckFromSelectionJson({
            bookSlug: item.bookSlug,
            gradeSlug: item.gradeSlug,
            partNo: item.partNo,
            sourcePath,
            title: item.title,
            selectionJson: JSON.parse(await readFile(item.sourcePath, "utf8"))
          })
        : buildStudyDeck({
            bookSlug: item.bookSlug,
            gradeSlug: item.gradeSlug,
            partNo: item.partNo,
            sourcePath,
            title: item.title,
            text: await readFile(item.sourcePath, "utf8")
          });

    if (deck.cardCount === 0) {
      empty += 1;
      continue;
    }

    if (item.sourceKind === "selection") {
      await writeStudyDeckJson(deck, item.outPath);
      written += 1;
      continue;
    }

    jobs.push({
      deck,
      outPath: item.outPath,
      count: options.count ?? PRESELECTION_COUNT,
      seed: deterministicSeed(`${item.bookSlug}:${item.gradeSlug}:${item.partNo}`)
    });
  }

  if (jobs.length > 0) {
    const preselector = options.preselectStudyDeckJobs ?? preselectStudyDeckJobs;
    await preselector({
      jobs,
      jobsPath: options.jobsPath,
      reportPath: options.preselectionReportPath,
      preselectorProject: options.preselectorProject
    });
    written += jobs.length;
  }

  const report = {
    planned: imports.length,
    written,
    empty,
    skipped: skipped.length
  };

  await mkdir(dirname(join(options.reportPath ?? "study-bulk-import-report.json")), {
    recursive: true
  });
  await writeFile(
    options.reportPath ?? "study-bulk-import-report.json",
    `${JSON.stringify({ ...report, skipped }, null, 2)}\n`,
    "utf8"
  );

  logger(
    `Study bulk import: ${written}/${imports.length} decks written, ${empty} empty, ${skipped.length} skipped.`
  );

  return report;
}

export function parseBulkStudyImportCliArgs(args) {
  const options = {};
  const optionMap = new Map([
    ["--source-root", "sourceRoot"],
    ["--assets-root", "assetsRoot"],
    ["--report", "reportPath"]
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const key = optionMap.get(flag);
    if (!key) {
      throw new Error(`Unknown option: ${flag}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`);
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

const isDirectCliRun =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectCliRun) {
  const options = parseBulkStudyImportCliArgs(process.argv.slice(2));
  runBulkStudyImport(options).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
