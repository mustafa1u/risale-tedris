import { readFile, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { getPartFilterResult } from "../src/features/library/bookPageClient.js";

export const REPRESENTATIVE_ROUTES = Object.freeze([
  "/",
  "/books/",
  "/books/ayetul-kubra/",
  "/books/tabiat-risalesi/",
  "/books/meyve-risalesi/parts/p55/",
  "/en/",
  "/en/books/",
  "/en/books/ayetul-kubra/",
  "/en/books/tabiat-risalesi/",
  "/en/books/meyve-risalesi/parts/p55/"
]);

async function listDirectories(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
}

async function listTextFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLocaleLowerCase("en").endsWith(".txt"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
}

export async function measureCorpus(assetsRoot) {
  const books = [];

  for (const bookSlug of await listDirectories(assetsRoot)) {
    const partsRoot = resolve(assetsRoot, bookSlug, "parcalar");
    const fileNames = await listTextFiles(partsRoot).catch(() => []);

    if (fileNames.length === 0) {
      continue;
    }

    const fileStats = await Promise.all(fileNames.map((fileName) => stat(resolve(partsRoot, fileName))));
    books.push({
      bookSlug,
      partCount: fileNames.length,
      rawTextBytes: fileStats.reduce((total, file) => total + file.size, 0)
    });
  }

  return {
    books,
    partCount: books.reduce((total, book) => total + book.partCount, 0),
    rawTextBytes: books.reduce((total, book) => total + book.rawTextBytes, 0)
  };
}

function routeToHtmlPath(distRoot, route) {
  const routeWithoutSlashes = route.replace(/^\/+|\/+$/g, "");
  return routeWithoutSlashes
    ? resolve(distRoot, routeWithoutSlashes, "index.html")
    : resolve(distRoot, "index.html");
}

async function listFilesRecursively(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(root, entry.name);
    return entry.isDirectory() ? listFilesRecursively(entryPath) : [entryPath];
  }));

  return nestedFiles.flat();
}

export async function measureBuiltOutput(distRoot, routes = REPRESENTATIVE_ROUTES) {
  const routeHtml = await Promise.all(routes.map(async (route) => ({
    route,
    bytes: (await stat(routeToHtmlPath(distRoot, route))).size
  })));
  const emittedJavaScriptFiles = (await listFilesRecursively(resolve(distRoot, "_astro")))
    .filter((filePath) => extname(filePath).toLocaleLowerCase("en") === ".js");
  const emittedJavaScriptStats = await Promise.all(emittedJavaScriptFiles.map((filePath) => stat(filePath)));

  return {
    routeHtml,
    emittedJavaScript: {
      fileCount: emittedJavaScriptFiles.length,
      bytes: emittedJavaScriptStats.reduce((total, file) => total + file.size, 0)
    }
  };
}

export function benchmarkMetadataFilter(rows, filters, { iterations = 1000, now = performance.now.bind(performance) } = {}) {
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new TypeError("iterations must be a positive integer");
  }

  const startedAt = now();
  let result;

  for (let index = 0; index < iterations; index += 1) {
    result = getPartFilterResult(rows, filters);
  }

  const elapsedMilliseconds = now() - startedAt;

  return {
    rowCount: rows.length,
    iterations,
    elapsedMilliseconds: Number(elapsedMilliseconds.toFixed(3)),
    averageMilliseconds: Number((elapsedMilliseconds / iterations).toFixed(6)),
    finalVisibleCount: result.visibleCount
  };
}

export async function readGeneratedBookRows(bookModulePath) {
  const source = await readFile(bookModulePath, "utf8");
  const match = source.match(/export const book = ([\s\S]+) satisfies LibraryBook;\s*$/);

  if (!match) {
    throw new Error(`Unable to parse generated book module: ${bookModulePath}`);
  }

  const book = JSON.parse(match[1]);
  return book.parts.map((part) => ({
    searchText: `${part.partNo} ${part.title} ${part.labelSlug}`,
    gradeSlugs: Object.keys(part.downloads)
  }));
}

export async function createBaselineReport({
  assetsRoot = resolve("assets"),
  distRoot = resolve("dist"),
  benchmarkBookModule = resolve("src/data/books/ayetul-kubra.generated.ts")
} = {}) {
  const benchmarkRows = await readGeneratedBookRows(benchmarkBookModule);

  return {
    measuredAt: new Date().toISOString(),
    representativeRoutes: [...REPRESENTATIVE_ROUTES],
    corpus: await measureCorpus(assetsRoot),
    builtOutput: await measureBuiltOutput(distRoot),
    metadataFilter: benchmarkMetadataFilter(
      benchmarkRows,
      { searchValue: "p55", gradeValue: "" },
      { iterations: 1000 }
    )
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await createBaselineReport(), null, 2));
}
