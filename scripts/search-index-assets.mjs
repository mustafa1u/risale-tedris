import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

import {
  SEARCH_SCHEMA_VERSION,
  assertBookSearchShardV1,
  assertGlobalSearchManifestV1
} from "../src/features/search/searchContracts.js";

const CANONICAL_GRADE_ORDER = ["2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans"];
const gradeOrder = new Map(CANONICAL_GRADE_ORDER.map((slug, index) => [slug, index]));
const generatedSearchFilePattern = /^(?:manifest|[a-z0-9-]+)\.[a-f0-9]{64}\.v\d+\.json$/;

export class SearchAssetGenerationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "SearchAssetGenerationError";
    this.code = code;
  }
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareGrades(left, right) {
  const leftOrder = gradeOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = gradeOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder || compareStrings(left, right);
}

function compareParts(left, right) {
  return left.partNumber - right.partNumber || compareStrings(left.partNo, right.partNo);
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function assertGeneratedAt(generatedAt) {
  if (typeof generatedAt !== "string" || !Number.isFinite(Date.parse(generatedAt))) {
    throw new SearchAssetGenerationError("INVALID_GENERATED_AT", "generatedAt must be an ISO-compatible date-time string");
  }
}

function validateBooks(books) {
  if (!Array.isArray(books) || books.length === 0) {
    throw new SearchAssetGenerationError("NO_BOOKS", "At least one searchable book is required");
  }

  const seenBooks = new Set();
  for (const book of books) {
    if (seenBooks.has(book.slug)) {
      throw new SearchAssetGenerationError("DUPLICATE_BOOK", `Duplicate searchable book: ${book.slug}`);
    }
    seenBooks.add(book.slug);

    const seenParts = new Set();
    for (const part of book.parts ?? []) {
      if (seenParts.has(part.partNo)) {
        throw new SearchAssetGenerationError(
          "DUPLICATE_PART",
          `Duplicate canonical part in ${book.slug}: ${part.partNo}`
        );
      }
      seenParts.add(part.partNo);
    }
  }
}

async function prepareShard({ root, book, readText }) {
  const records = [];
  let rawBytes = 0;

  for (const part of [...(book.parts ?? [])].sort(compareParts)) {
    const sourcePath = resolve(root, part.textSourcePath);
    let text;
    try {
      text = await readText(sourcePath, "utf8");
    } catch (cause) {
      throw new SearchAssetGenerationError(
        "SOURCE_READ_FAILED",
        `Cannot read canonical text for ${book.slug} ${part.partNo}: ${part.textSourcePath}`,
        { cause }
      );
    }

    if (typeof text !== "string" || text.trim().length === 0) {
      throw new SearchAssetGenerationError(
        "SOURCE_TEXT_EMPTY",
        `Canonical text is empty for ${book.slug} ${part.partNo}: ${part.textSourcePath}`
      );
    }

    rawBytes += Buffer.byteLength(text, "utf8");
    records.push({
      partNo: part.partNo,
      partNumber: part.partNumber,
      title: part.title,
      labelSlug: part.labelSlug,
      gradeSlugs: Object.keys(part.downloads ?? {}).sort(compareGrades),
      text
    });
  }

  const semanticDocument = {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    bookSlug: book.slug,
    bookTitle: book.title,
    records
  };
  const contentHash = hashJson(semanticDocument);
  const fileName = `${book.slug}.${contentHash}.v${SEARCH_SCHEMA_VERSION}.json`;
  return {
    bookSlug: book.slug,
    bookTitle: book.title,
    contentHash,
    fileName,
    rawBytes,
    records,
    url: `/assets/search/${fileName}`
  };
}

export async function prepareSearchAssets({ root = process.cwd(), books, readText = readFile }) {
  validateBooks(books);

  const shards = [];
  for (const book of [...books].sort((left, right) => compareStrings(left.slug, right.slug))) {
    shards.push(await prepareShard({ root, book, readText }));
  }

  const booksMetadata = shards.map((shard) => ({
    slug: shard.bookSlug,
    title: shard.bookTitle,
    shardUrl: shard.url,
    contentHash: shard.contentHash,
    recordCount: shard.records.length,
    rawBytes: shard.rawBytes
  }));
  const semanticManifest = {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    books: booksMetadata
  };
  const contentHash = hashJson(semanticManifest);
  const fileName = `manifest.${contentHash}.v${SEARCH_SCHEMA_VERSION}.json`;

  return {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    shards,
    manifest: {
      books: booksMetadata,
      contentHash,
      fileName,
      url: `/assets/search/${fileName}`
    }
  };
}

async function writeFileIfChanged(filePath, content) {
  const previous = await readFile(filePath, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  });

  if (previous === content) {
    return false;
  }
  await writeFile(filePath, content, "utf8");
  return true;
}

function measureJson(content) {
  const buffer = Buffer.from(content, "utf8");
  return {
    assetBytes: buffer.byteLength,
    gzipBytes: gzipSync(buffer).byteLength
  };
}

async function removeStaleGeneratedFiles(outDir, expectedFiles) {
  const existingFiles = await readdir(outDir, { withFileTypes: true });
  await Promise.all(
    existingFiles
      .filter((entry) => entry.isFile() && generatedSearchFilePattern.test(entry.name) && !expectedFiles.has(entry.name))
      .map((entry) => unlink(resolve(outDir, entry.name)))
  );
}

export async function writePreparedSearchAssets({
  prepared,
  outDir,
  generatedAt = new Date().toISOString()
}) {
  assertGeneratedAt(generatedAt);
  await mkdir(outDir, { recursive: true });

  const shards = [];
  for (const shard of prepared.shards) {
    const document = {
      schemaVersion: SEARCH_SCHEMA_VERSION,
      generatedAt,
      bookSlug: shard.bookSlug,
      bookTitle: shard.bookTitle,
      contentHash: shard.contentHash,
      records: shard.records
    };
    assertBookSearchShardV1(document);
    const content = serializeJson(document);
    const filePath = resolve(outDir, shard.fileName);
    const written = await writeFileIfChanged(filePath, content);
    shards.push({
      ...shard,
      ...measureJson(content),
      document,
      filePath,
      written
    });
  }

  const manifestDocument = {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    generatedAt,
    books: prepared.manifest.books
  };
  assertGlobalSearchManifestV1(manifestDocument);
  const manifestContent = serializeJson(manifestDocument);
  const manifestFilePath = resolve(outDir, prepared.manifest.fileName);
  const manifestWritten = await writeFileIfChanged(manifestFilePath, manifestContent);
  const manifest = {
    ...prepared.manifest,
    ...measureJson(manifestContent),
    document: manifestDocument,
    filePath: manifestFilePath,
    written: manifestWritten
  };

  const expectedFiles = new Set([manifest.fileName, ...shards.map((shard) => shard.fileName)]);
  await removeStaleGeneratedFiles(outDir, expectedFiles);

  return {
    shards,
    manifest,
    totals: {
      rawTextBytes: shards.reduce((total, shard) => total + shard.rawBytes, 0),
      assetBytes: shards.reduce((total, shard) => total + shard.assetBytes, manifest.assetBytes),
      gzipBytes: shards.reduce((total, shard) => total + shard.gzipBytes, manifest.gzipBytes)
    }
  };
}

function validationFailure(message, options) {
  return new SearchAssetGenerationError("VALIDATION_FAILED", message, options);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw validationFailure(`${message}: expected ${expected}, received ${actual}`);
  }
}

async function readJsonAsset(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (cause) {
    throw validationFailure(`Cannot read generated search asset: ${filePath}`, { cause });
  }
}

export async function validateGeneratedSearchAssets({ books, result }) {
  validateBooks(books);
  const expectedBooks = [...books].sort((left, right) => compareStrings(left.slug, right.slug));
  const manifest = await readJsonAsset(result.manifest.filePath);

  try {
    assertGlobalSearchManifestV1(manifest);
  } catch (cause) {
    throw validationFailure("Global search manifest contract is invalid", { cause });
  }

  assertEqual(manifest.books.length, expectedBooks.length, "Global search book coverage mismatch");
  const resultShards = new Map(result.shards.map((shard) => [shard.bookSlug, shard]));

  for (const [index, book] of expectedBooks.entries()) {
    const entry = manifest.books[index];
    assertEqual(entry.slug, book.slug, `Search book order mismatch at index ${index}`);
    const shardResult = resultShards.get(book.slug);
    if (!shardResult) {
      throw validationFailure(`Missing generated shard for ${book.slug}`);
    }
    assertEqual(entry.shardUrl, `/assets/search/${shardResult.fileName}`, `Search shard URL mismatch for ${book.slug}`);

    const shard = await readJsonAsset(shardResult.filePath);
    try {
      assertBookSearchShardV1(shard);
    } catch (cause) {
      throw validationFailure(`Search shard contract is invalid for ${book.slug}`, { cause });
    }

    const semanticShard = {
      schemaVersion: shard.schemaVersion,
      bookSlug: shard.bookSlug,
      bookTitle: shard.bookTitle,
      records: shard.records
    };
    const actualHash = hashJson(semanticShard);
    assertEqual(shard.contentHash, actualHash, `Search shard content hash mismatch for ${book.slug}`);
    assertEqual(entry.contentHash, actualHash, `Search manifest content hash mismatch for ${book.slug}`);
    assertEqual(shardResult.fileName, `${book.slug}.${actualHash}.v${SEARCH_SCHEMA_VERSION}.json`, `Search shard filename mismatch for ${book.slug}`);
    assertEqual(shard.records.length, book.parts.length, `Search part coverage count mismatch for ${book.slug}`);
    assertEqual(entry.recordCount, book.parts.length, `Search manifest record count mismatch for ${book.slug}`);

    const expectedPartNos = [...book.parts].sort(compareParts).map((part) => part.partNo);
    const actualPartNos = shard.records.map((record) => record.partNo);
    assertEqual(JSON.stringify(actualPartNos), JSON.stringify(expectedPartNos), `Search part coverage mismatch for ${book.slug}`);
    const actualRawBytes = shard.records.reduce((total, record) => total + Buffer.byteLength(record.text, "utf8"), 0);
    assertEqual(entry.rawBytes, actualRawBytes, `Search raw byte count mismatch for ${book.slug}`);
  }

  const semanticManifest = {
    schemaVersion: manifest.schemaVersion,
    books: manifest.books
  };
  const actualManifestHash = hashJson(semanticManifest);
  assertEqual(result.manifest.contentHash, actualManifestHash, "Global search manifest hash mismatch");
  assertEqual(
    result.manifest.fileName,
    `manifest.${actualManifestHash}.v${SEARCH_SCHEMA_VERSION}.json`,
    "Global search manifest filename mismatch"
  );
  return result;
}

export async function generateSearchAssets({
  root = process.cwd(),
  outDir = resolve(root, "public", "assets", "search"),
  books,
  generatedAt = new Date().toISOString(),
  readText = readFile
}) {
  const prepared = await prepareSearchAssets({ root, books, readText });
  const result = await writePreparedSearchAssets({ prepared, outDir, generatedAt });
  await validateGeneratedSearchAssets({ books, result });
  return result;
}
