import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectStudyDeckAssets } from "./study-deck-assets.mjs";
import {
  prepareSearchAssets,
  validateGeneratedSearchAssets,
  writePreparedSearchAssets
} from "./search-index-assets.mjs";

const root = process.cwd();
const assetsRoot = resolve(root, "assets");
const outFile = resolve(root, "src/data/library.generated.ts");
const booksOutDir = resolve(root, "src/data/books");
const studyIndexOutFile = resolve(root, "src/data/study-index.generated.json");
const searchAssetsOutDir = resolve(root, "public/assets/search");

const gradeOrder = ["2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans"];
const gradeLabels = {
  "2-sinif": "2. Sinif",
  "5-sinif": "5. Sinif",
  "8-sinif": "8. Sinif",
  "11-sinif": "11. Sinif",
  lisans: "Lisans"
};

const docTypes = ["BK", "SK"];
const warnings = [];

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

function sourcePath(absPath) {
  return toPosixPath(relative(root, absPath));
}

function assetUrl(absPath) {
  return `/${sourcePath(absPath)}`;
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
    .join(" ");
}

function parsePartFile(bookSlug, fileName, partLabels = {}) {
  const escapedBook = bookSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = fileName.match(new RegExp(`^${escapedBook}-(p\\d+)-(.+)\\.txt$`));

  if (!match) {
    return null;
  }

  const partNo = match[1];
  const labelSlug = match[2];
  return {
    partNo,
    partNumber: Number(partNo.slice(1)),
    labelSlug,
    title: partLabels[partNo] ?? titleFromSlug(labelSlug)
  };
}

function gradeSlugFromCode(code) {
  if (code === "lisans") {
    return "lisans";
  }

  const match = code.match(/^(\d+)sinif$/);
  return match ? `${match[1]}-sinif` : null;
}

function parseDocxFile(bookSlug, fileName) {
  const header = fileName.match(/^(BK|SK)_([^_]+)_(.+)\.docx$/i);
  if (!header) {
    return null;
  }

  const docType = header[1].toUpperCase();
  const gradeSlug = gradeSlugFromCode(header[2]);
  const rest = header[3];
  const escapedBook = bookSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const part = rest.match(new RegExp(`^${escapedBook}-(p\\d+)-(.+)$`));

  if (!gradeSlug || !part || !docTypes.includes(docType)) {
    return null;
  }

  return {
    docType,
    gradeSlug,
    partNo: part[1],
    labelSlug: part[2]
  };
}

function parseMobilePdfFile(bookSlug, fileName) {
  const header = fileName.match(/^(BK|SK)6_([^_]+)_(.+)\.pdf$/i);
  if (!header) {
    return null;
  }

  const docType = header[1].toUpperCase();
  const gradeSlug = gradeSlugFromCode(header[2]);
  const rest = header[3];
  const escapedBook = bookSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const part = rest.match(new RegExp(`^${escapedBook}-(p\\d+)-(.+)$`));

  if (!gradeSlug || !part || !docTypes.includes(docType)) {
    return null;
  }

  return {
    docType,
    gradeSlug,
    partNo: part[1],
    labelSlug: part[2]
  };
}

async function listDirectories(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function listFiles(path) {
  if (!existsSync(path)) {
    return [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

async function readPartLabels(bookPath) {
  const labelsPath = join(bookPath, "part-labels.json");
  if (!existsSync(labelsPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(await readFile(labelsPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      warnings.push(`Skipped invalid part labels file: ${sourcePath(labelsPath)}`);
      return {};
    }

    return parsed;
  } catch (error) {
    warnings.push(`Skipped unreadable part labels file: ${sourcePath(labelsPath)} (${error.message})`);
    return {};
  }
}

async function readBookMetadata(bookPath) {
  const metadataPath = join(bookPath, "book.json");
  if (!existsSync(metadataPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(await readFile(metadataPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      warnings.push(`Skipped invalid book metadata file: ${sourcePath(metadataPath)}`);
      return {};
    }

    return parsed;
  } catch (error) {
    warnings.push(`Skipped unreadable book metadata file: ${sourcePath(metadataPath)} (${error.message})`);
    return {};
  }
}

async function readPreviousManifest() {
  if (!existsSync(outFile)) {
    return null;
  }

  try {
    const source = await readFile(outFile, "utf8");
    const indexMatch = source.match(/export const libraryIndex = ([\s\S]+?) satisfies LibraryIndex;/);
    if (indexMatch) {
      return JSON.parse(indexMatch[1]);
    }

    const manifestMatch = source.match(/export const library = ([\s\S]+?) satisfies LibraryManifest;/);
    return manifestMatch ? JSON.parse(manifestMatch[1]) : null;
  } catch {
    return null;
  }
}

function makeBookSummary(book, searchBySlug) {
  const parts = Array.isArray(book.parts) ? book.parts : [];
  const studyDecks = Array.isArray(book.studyDecks) ? book.studyDecks : [];
  const partByNo = new Map(parts.map((part) => [part.partNo, part]));

  const search = searchBySlug?.get(book.slug) ?? book.search;
  return {
    slug: book.slug,
    title: book.title,
    sourcePath: book.sourcePath,
    grades: book.grades,
    partCount: typeof book.partCount === "number" ? book.partCount : parts.length,
    studyDeckCount: typeof book.studyDeckCount === "number" ? book.studyDeckCount : studyDecks.length,
    partRoutes: Array.isArray(book.partRoutes)
      ? book.partRoutes
      : parts.map(({ partNo, partNumber, labelSlug, title }) => ({
          partNo,
          partNumber,
          labelSlug,
          title
        })),
    studyDeckRoutes: Array.isArray(book.studyDeckRoutes)
      ? book.studyDeckRoutes
      : studyDecks.map(({ gradeSlug, partNo, title, cardCount, url }) => {
          const sourcePart = partByNo.get(partNo);

          return {
            gradeSlug,
            partNo,
            title,
            cardCount,
            url,
            sourceTitle: sourcePart?.title,
            sourceTextUrl: sourcePart?.textUrl
          };
        }),
    ...(search ? { search } : {})
  };
}

function indexContent(manifest, searchMetadata = manifest.search) {
  const searchBooks = searchMetadata?.books ?? manifest.books.map((book) => book.search).filter(Boolean);
  const searchBySlug = new Map(searchBooks.map((book) => [book.slug, book]));
  const index = {
    stats: manifest.stats,
    books: manifest.books.map((book) => makeBookSummary(book, searchBySlug))
  };

  if (searchMetadata) {
    index.search = {
      schemaVersion: searchMetadata.schemaVersion,
      manifestUrl: searchMetadata.manifestUrl,
      manifestContentHash: searchMetadata.manifestContentHash,
      totalRawBytes: searchMetadata.totalRawBytes
    };
  }
  return index;
}

function bookModuleContent(book) {
  return `import type { LibraryBook } from "@/types/library";\n\nexport const book = ${JSON.stringify(book, null, 2)} satisfies LibraryBook;\n`;
}

function indexModuleContent(index, bookSlugs) {
  const loaderEntries = bookSlugs
    .map((bookSlug) => `  ${JSON.stringify(bookSlug)}: () => import(${JSON.stringify(`./books/${bookSlug}.generated`)})`)
    .join(",\n");

  return `import type { LibraryBook, LibraryIndex, LibraryManifest } from "@/types/library";\n\ntype BookModule = { book: LibraryBook };\n\nexport const libraryIndex = ${JSON.stringify(index, null, 2)} satisfies LibraryIndex;\n\nexport const bookSlugs = ${JSON.stringify(bookSlugs, null, 2)} as const;\n\nconst bookLoaders: Record<string, () => Promise<BookModule>> = {\n${loaderEntries}\n};\n\nexport async function loadBook(bookSlug: string): Promise<LibraryBook | null> {\n  const loadBookModule = bookLoaders[bookSlug];\n\n  if (!loadBookModule) {\n    return null;\n  }\n\n  return (await loadBookModule()).book;\n}\n\nexport async function loadLibrary(): Promise<LibraryManifest> {\n  const books = await Promise.all(bookSlugs.map((bookSlug) => loadBook(bookSlug)));\n\n  return {\n    generatedAt: libraryIndex.generatedAt,\n    stats: libraryIndex.stats,\n    books: books.filter((book): book is LibraryBook => Boolean(book))\n  };\n}\n`;
}

function studyShellIndexContent(index) {
  return {
    generatedAt: index.generatedAt,
    books: index.books.map((book) => ({
      slug: book.slug,
      title: book.title,
      studyDeckRoutes: book.studyDeckRoutes
    }))
  };
}

async function removeStaleGeneratedBookFiles(bookSlugs) {
  await mkdir(booksOutDir, { recursive: true });

  const expectedFiles = new Set(bookSlugs.map((bookSlug) => `${bookSlug}.generated.ts`));
  const existingGeneratedFiles = (await listFiles(booksOutDir)).filter((fileName) => fileName.endsWith(".generated.ts"));

  await Promise.all(
    existingGeneratedFiles
      .filter((fileName) => !expectedFiles.has(fileName))
      .map((fileName) => unlink(join(booksOutDir, fileName)))
  );
}

function makeDownloadAsset(absPath) {
  return {
    fileName: absPath.split(/[\\/]/).at(-1),
    sourcePath: sourcePath(absPath),
    url: assetUrl(absPath)
  };
}

function expectedPdfPath(bookSlug, gradeSlug, docxFileName, kind) {
  const baseName = docxFileName.replace(/\.docx$/i, ".pdf");
  const folder = kind === "mobile" ? "pdf-mobile-6in" : "pdf-normal";
  return join(assetsRoot, bookSlug, gradeSlug, folder, baseName);
}

async function collectMobilePdfMap(bookSlug, gradeSlug, gradePath) {
  const result = new Map();
  const mobilePdfRoot = join(gradePath, "pdf-mobile-6in");
  const files = (await listFiles(mobilePdfRoot)).filter((file) => extname(file).toLowerCase() === ".pdf");

  for (const fileName of files) {
    const parsed = parseMobilePdfFile(bookSlug, fileName);
    if (!parsed) {
      continue;
    }

    if (parsed.gradeSlug !== gradeSlug) {
      warnings.push(`Mobile PDF grade mismatch: folder=${gradeSlug}, filename=${parsed.gradeSlug}, file=${fileName}`);
      continue;
    }

    result.set(`${parsed.partNo}:${parsed.docType}`, join(mobilePdfRoot, fileName));
  }

  return result;
}

async function readBook(bookSlug) {
  const bookPath = join(assetsRoot, bookSlug);
  const metadata = await readBookMetadata(bookPath);
  const folders = await listDirectories(bookPath);
  const gradeSlugs = folders.filter((folder) => gradeOrder.includes(folder)).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));
  const partFiles = (await listFiles(join(bookPath, "parcalar"))).filter((file) => extname(file) === ".txt");
  const partLabels = await readPartLabels(bookPath);
  const partMap = new Map();

  for (const fileName of partFiles) {
    const parsed = parsePartFile(bookSlug, fileName, partLabels);
    if (!parsed) {
      warnings.push(`Skipped unrecognized part filename: ${bookSlug}/parcalar/${fileName}`);
      continue;
    }

    const absPath = join(bookPath, "parcalar", fileName);
    partMap.set(parsed.partNo, {
      ...parsed,
      textFileName: fileName,
      textSourcePath: sourcePath(absPath),
      textUrl: assetUrl(absPath),
      downloads: {}
    });
  }

  const gradeStats = new Map(
    gradeSlugs.map((gradeSlug) => [
      gradeSlug,
      {
        slug: gradeSlug,
        label: gradeLabels[gradeSlug],
        docxCount: 0,
        pdfNormalCount: 0,
        pdfMobileCount: 0
      }
    ])
  );

  for (const gradeSlug of gradeSlugs) {
    const gradePath = join(bookPath, gradeSlug);
    const docxRoots = [gradePath, join(gradePath, "docx")];
    const mobilePdfMap = await collectMobilePdfMap(bookSlug, gradeSlug, gradePath);

    for (const docxRoot of docxRoots) {
      const docxFiles = (await listFiles(docxRoot)).filter((file) => extname(file).toLowerCase() === ".docx");

      for (const fileName of docxFiles) {
        const parsed = parseDocxFile(bookSlug, fileName);
        if (!parsed) {
          warnings.push(`Skipped unrecognized DOCX filename: ${sourcePath(join(docxRoot, fileName))}`);
          continue;
        }

        if (parsed.gradeSlug !== gradeSlug) {
          warnings.push(`DOCX grade mismatch: folder=${gradeSlug}, filename=${parsed.gradeSlug}, file=${fileName}`);
        }

        const part = partMap.get(parsed.partNo);
        if (!part) {
          warnings.push(`DOCX has no matching text part: ${sourcePath(join(docxRoot, fileName))}`);
          continue;
        }

        if (part.labelSlug !== parsed.labelSlug) {
          warnings.push(`Part label mismatch for ${bookSlug}/${parsed.partNo}: text=${part.labelSlug}, docx=${parsed.labelSlug}`);
        }

        const gradeDownloads = (part.downloads[gradeSlug] ??= {});
        const variant = (gradeDownloads[parsed.docType] ??= {});
        const docxPath = join(docxRoot, fileName);
        const pdfNormalPath = expectedPdfPath(bookSlug, gradeSlug, fileName, "normal");
        const pdfMobilePath = mobilePdfMap.get(`${parsed.partNo}:${parsed.docType}`);

        variant.docx = makeDownloadAsset(docxPath);

        const stats = gradeStats.get(gradeSlug);
        stats.docxCount += 1;

        if (existsSync(pdfNormalPath)) {
          variant.pdfNormal = makeDownloadAsset(pdfNormalPath);
          stats.pdfNormalCount += 1;
        }

        if (pdfMobilePath && existsSync(pdfMobilePath)) {
          variant.pdfMobile = makeDownloadAsset(pdfMobilePath);
          stats.pdfMobileCount += 1;
        }
      }
    }
  }

  const parts = [...partMap.values()].sort((a, b) => a.partNumber - b.partNumber);
  const studyDecks = await collectStudyDeckAssets({
    root,
    bookSlug,
    bookPath
  });

  return {
    slug: bookSlug,
    title: typeof metadata.title === "string" && metadata.title.trim() ? metadata.title.trim() : titleFromSlug(bookSlug),
    sourcePath: sourcePath(bookPath),
    grades: gradeSlugs.map((gradeSlug) => gradeStats.get(gradeSlug)),
    parts,
    studyDecks
  };
}

async function main() {
  const assetStats = await stat(assetsRoot).catch(() => null);
  if (!assetStats?.isDirectory()) {
    throw new Error(`Missing assets directory: ${assetsRoot}`);
  }

  const bookSlugs = (await listDirectories(assetsRoot)).sort();
  const books = [];

  for (const bookSlug of bookSlugs) {
    books.push(await readBook(bookSlug));
  }

  const stats = books.reduce(
    (acc, book) => {
      acc.bookCount += 1;
      acc.partCount += book.parts.length;
      acc.studyDeckCount += book.studyDecks.length;
      for (const grade of book.grades) {
        acc.docxCount += grade.docxCount;
        acc.pdfNormalCount += grade.pdfNormalCount;
        acc.pdfMobileCount += grade.pdfMobileCount;
      }
      return acc;
    },
    {
      bookCount: 0,
      partCount: 0,
      studyDeckCount: 0,
      docxCount: 0,
      pdfNormalCount: 0,
      pdfMobileCount: 0,
      missingPdfNormalCount: 0,
      missingPdfMobileCount: 0
    }
  );

  stats.missingPdfNormalCount = Math.max(0, stats.docxCount - stats.pdfNormalCount);
  stats.missingPdfMobileCount = Math.max(0, stats.docxCount - stats.pdfMobileCount);

  const preparedSearchAssets = await prepareSearchAssets({ root, books });
  const searchMetadata = {
    schemaVersion: preparedSearchAssets.schemaVersion,
    manifestUrl: preparedSearchAssets.manifest.url,
    manifestContentHash: preparedSearchAssets.manifest.contentHash,
    totalRawBytes: preparedSearchAssets.manifest.books.reduce((total, book) => total + book.rawBytes, 0),
    books: preparedSearchAssets.manifest.books
  };
  const previousManifest = await readPreviousManifest();
  const index = indexContent({ stats, books }, searchMetadata);
  const previousIndex = previousManifest ? indexContent(previousManifest) : null;
  const generatedAt =
    previousManifest && JSON.stringify(previousIndex) === JSON.stringify(index)
      ? previousManifest.generatedAt
      : new Date().toISOString();

  const libraryIndex = {
    generatedAt,
    ...index
  };
  const generatedBookSlugs = books.map((book) => book.slug);
  const searchAssets = await writePreparedSearchAssets({
    prepared: preparedSearchAssets,
    outDir: searchAssetsOutDir,
    generatedAt
  });
  await validateGeneratedSearchAssets({ books, result: searchAssets });

  await removeStaleGeneratedBookFiles(generatedBookSlugs);
  await mkdir(dirname(outFile), { recursive: true });
  await mkdir(dirname(studyIndexOutFile), { recursive: true });
  await Promise.all(books.map((book) => writeFile(join(booksOutDir, `${book.slug}.generated.ts`), bookModuleContent(book), "utf8")));
  await writeFile(outFile, indexModuleContent(libraryIndex, generatedBookSlugs), "utf8");
  await writeFile(studyIndexOutFile, `${JSON.stringify(studyShellIndexContent(libraryIndex), null, 2)}\n`, "utf8");

  console.log(`Generated ${sourcePath(outFile)}, ${sourcePath(studyIndexOutFile)}, and ${books.length} book modules`);
  console.log(
    `Books: ${stats.bookCount}, parts: ${stats.partCount}, study decks: ${stats.studyDeckCount}, DOCX: ${stats.docxCount}, normal PDFs: ${stats.pdfNormalCount}, mobile PDFs: ${stats.pdfMobileCount}`
  );
  for (const shard of searchAssets.shards) {
    console.log(
      `Search ${shard.bookSlug}: ${shard.records.length} records, ${shard.rawBytes} text bytes, ${shard.assetBytes} JSON bytes, ${shard.gzipBytes} gzip bytes`
    );
  }
  console.log(
    `Search total: ${searchAssets.totals.rawTextBytes} text bytes, ${searchAssets.totals.assetBytes} JSON bytes, ${searchAssets.totals.gzipBytes} gzip bytes (manifest included)`
  );

  if (warnings.length > 0) {
    console.warn(`Warnings: ${warnings.length}`);
    for (const warning of warnings.slice(0, 20)) {
      console.warn(`- ${warning}`);
    }
    if (warnings.length > 20) {
      console.warn(`- ... ${warnings.length - 20} more`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
