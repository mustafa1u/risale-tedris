import { readFile, readdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { join, resolve } from "node:path";

import { analyzeSearchBook, searchAnalyzedBooks } from "../src/features/search/searchEngine.js";

const root = process.cwd();
const searchAssetsDir = resolve(root, "public/assets/search");
const iterations = 100;

const names = (await readdir(searchAssetsDir).catch((cause) => {
  throw new Error("Search assets are missing; run npm run manifest:generate before benchmarking", { cause });
})).filter((name) => !name.startsWith("manifest.") && name.endsWith(".json"));
const shards = await Promise.all(
  names.map(async (name) => JSON.parse(await readFile(join(searchAssetsDir, name), "utf8")))
);

const analysisStartedAt = performance.now();
const books = shards.map(analyzeSearchBook);
const analysisMs = performance.now() - analysisStartedAt;
const baseRequest = {
  context: "global",
  mode: "all",
  scopes: ["text", "title", "partNo"],
  selectedBookSlugs: books.map((book) => book.bookSlug),
  gradeSlug: null,
  proximityDistance: 5,
  limit: 50
};

const queries = ["iman nur", "rahmet", "P55"];
const measurements = [];
for (const query of queries) {
  const request = { ...baseRequest, query };
  searchAnalyzedBooks(books, request);
  const startedAt = performance.now();
  let total = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    total = searchAnalyzedBooks(books, request).total;
  }
  measurements.push({
    query,
    total,
    meanMs: (performance.now() - startedAt) / iterations
  });
}

console.log(
  JSON.stringify(
    {
      books: books.length,
      records: books.reduce((total, book) => total + book.records.length, 0),
      analysisMs: Number(analysisMs.toFixed(2)),
      queries: measurements.map((measurement) => ({
        ...measurement,
        meanMs: Number(measurement.meanMs.toFixed(3))
      }))
    },
    null,
    2
  )
);
