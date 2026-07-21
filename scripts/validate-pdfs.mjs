import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, parse, resolve } from "node:path";

const strict = process.argv.includes("--strict") || process.env.REQUIRE_PDFS === "1";
const root = process.cwd();
const assetsRoot = resolve(root, "assets");
const gradeFolders = new Set(["2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans"]);
const options = parseArgs(process.argv.slice(2));
const explicitMobileDocxRoot = options["mobile-docx-root"] ?? process.env.MOBILE_DOCX_ROOT;
const defaultMobileDocxRoot = process.platform === "win32" ? parse(root).root : null;

function parseArgs(args) {
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith("--") || item === "--strict") {
      continue;
    }

    const key = item.slice(2);
    result[key] = args[index + 1];
    index += 1;
  }

  return result;
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

function gradeSlugFromCode(code) {
  if (code === "lisans") {
    return "lisans";
  }

  const match = code.match(/^(\d+)sinif$/);
  return match ? `${match[1]}-sinif` : null;
}

function parseDocumentFile(bookSlug, fileName, { mobile }) {
  const header = fileName.match(/^(BK|SK)(6?)_([^_]+)_(.+)\.docx$/i);
  if (!header) {
    return null;
  }

  const hasMobileSuffix = header[2] === "6";
  if (mobile !== hasMobileSuffix) {
    return null;
  }

  const gradeSlug = gradeSlugFromCode(header[3]);
  const rest = header[4];
  const escapedBook = bookSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const part = rest.match(new RegExp(`^${escapedBook}-(p\\d+)-(.+)$`));

  return gradeSlug && part ? { gradeSlug } : null;
}

function mobileDocxRoots(book, grade, gradePath) {
  const roots = [];

  if (explicitMobileDocxRoot) {
    const root = resolve(explicitMobileDocxRoot);
    roots.push(join(root, book, grade, "mobile"));
    roots.push(join(root, book, grade, "mobile", "docx"));
  }

  roots.push(join(gradePath, "mobile"));
  roots.push(join(gradePath, "mobile", "docx"));

  if (!explicitMobileDocxRoot && defaultMobileDocxRoot) {
    roots.push(join(defaultMobileDocxRoot, book, grade, "mobile"));
    roots.push(join(defaultMobileDocxRoot, book, grade, "mobile", "docx"));
  }

  return [...new Set(roots)];
}

async function collectNormalDocx() {
  const result = [];
  const books = await listDirectories(assetsRoot);

  for (const book of books) {
    const bookPath = join(assetsRoot, book);
    const grades = (await listDirectories(bookPath)).filter((folder) => gradeFolders.has(folder));

    for (const grade of grades) {
      const gradePath = join(bookPath, grade);
      const roots = [gradePath, join(gradePath, "docx")];

      for (const docxRoot of roots) {
        const files = (await listFiles(docxRoot)).filter((file) => extname(file).toLowerCase() === ".docx");
        for (const file of files) {
          const parsed = parseDocumentFile(book, file, { mobile: false });
          if (!parsed || parsed.gradeSlug !== grade) {
            continue;
          }

          result.push({
            book,
            grade,
            file
          });
        }
      }
    }
  }

  return result;
}

async function collectMobileDocx() {
  const result = [];
  const seenOutputs = new Set();
  const books = await listDirectories(assetsRoot);

  for (const book of books) {
    const bookPath = join(assetsRoot, book);
    const grades = (await listDirectories(bookPath)).filter((folder) => gradeFolders.has(folder));

    for (const grade of grades) {
      const gradePath = join(bookPath, grade);

      for (const docxRoot of mobileDocxRoots(book, grade, gradePath)) {
        const files = (await listFiles(docxRoot)).filter((file) => extname(file).toLowerCase() === ".docx");
        for (const file of files) {
          const parsed = parseDocumentFile(book, file, { mobile: true });
          if (!parsed || parsed.gradeSlug !== grade) {
            continue;
          }

          const output = join(assetsRoot, book, grade, "pdf-mobile-6in", file.replace(/\.docx$/i, ".pdf"));
          if (seenOutputs.has(output)) {
            continue;
          }

          seenOutputs.add(output);
          result.push({
            book,
            grade,
            file
          });
        }
      }
    }
  }

  return result;
}

const normalDocxFiles = await collectNormalDocx();
const mobileDocxFiles = await collectMobileDocx();
const missing = [];

for (const item of normalDocxFiles) {
  const pdfName = item.file.replace(/\.docx$/i, ".pdf");
  const normal = join(assetsRoot, item.book, item.grade, "pdf-normal", pdfName);

  if (!existsSync(normal)) {
    missing.push(`${item.book}/${item.grade}/pdf-normal/${pdfName}`);
  }
}

for (const item of mobileDocxFiles) {
  const pdfName = item.file.replace(/\.docx$/i, ".pdf");
  const mobile = join(assetsRoot, item.book, item.grade, "pdf-mobile-6in", pdfName);

  if (!existsSync(mobile)) {
    missing.push(`${item.book}/${item.grade}/pdf-mobile-6in/${pdfName}`);
  }
}

const expectedCount = normalDocxFiles.length + mobileDocxFiles.length;
const readyCount = expectedCount - missing.length;
console.log(
  `PDF readiness: ${readyCount}/${expectedCount} expected PDFs present (${normalDocxFiles.length} normal, ${mobileDocxFiles.length} mobile).`
);

if (missing.length > 0) {
  console.warn(`Missing PDFs: ${missing.length}`);
  for (const path of missing.slice(0, 20)) {
    console.warn(`- ${path}`);
  }
  if (missing.length > 20) {
    console.warn(`- ... ${missing.length - 20} more`);
  }
}

if (strict && missing.length > 0) {
  process.exitCode = 1;
}
