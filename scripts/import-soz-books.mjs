import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const workspaceRoot = process.cwd();
const assetsRoot = resolve(workspaceRoot, "assets");
const dividerRoot = resolve(
  "C:\\Users\\musta\\OneDrive\\Belgeler\\Risale 10\\hazirlayici\\build\\divider_runs"
);
const documentRoot = resolve("C:\\");
const gradeSlugs = ["2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans"];

const books = [
  { slug: "11-soz", title: "11. Söz", run: "20260726-170419-31a3c6a5-edited-2" },
  { slug: "13-soz", title: "13. Söz", run: "20260326-213026-59dc38bb-edited" },
  { slug: "18-soz", title: "18. Söz", run: "20260328-001447-c60cf73e-edited" },
  { slug: "24-soz", title: "24. Söz", run: "20260724-155454-98c98d8c" },
  { slug: "31-soz", title: "31. Söz", run: "20260725-205004-7b016007-edited" },
  { slug: "32-soz", title: "32. Söz", run: "20260726-170416-1862451a-edited" },
  { slug: "33-soz", title: "33. Söz", run: "20260726-170416-f0cd052b-edited" }
];

async function listFiles(path) {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

async function copyMatchingFiles(source, destination, pattern) {
  await mkdir(destination, { recursive: true });
  const names = (await listFiles(source)).filter((name) => pattern.test(name));

  await Promise.all(
    names.map((name) => copyFile(join(source, name), join(destination, name)))
  );

  return names.length;
}

async function importBook(book) {
  const sourceBookRoot = join(documentRoot, book.slug);
  const runRoot = join(dividerRoot, book.slug, book.run);
  const targetBookRoot = join(assetsRoot, book.slug);
  const divisionPath = join(runRoot, `${book.slug}.division.json`);
  const division = JSON.parse(await readFile(divisionPath, "utf8"));
  const partLabels = Object.fromEntries(
    division.parts.map((part) => [
      `p${String(part.index).padStart(2, "0")}`,
      part.label
    ])
  );
  const expectedPartNames = new Set(division.parts.map((part) => part.source_name));
  const availablePartNames = (await listFiles(runRoot)).filter((name) =>
    new RegExp(`^${book.slug}-p\\d+-.+\\.txt$`).test(name)
  );

  if (
    availablePartNames.length !== expectedPartNames.size ||
    availablePartNames.some((name) => !expectedPartNames.has(name))
  ) {
    throw new Error(`Canonical part files do not match ${basename(divisionPath)}`);
  }

  const partsTarget = join(targetBookRoot, "parcalar");
  await mkdir(partsTarget, { recursive: true });
  await Promise.all(
    availablePartNames.map((name) =>
      copyFile(join(runRoot, name), join(partsTarget, name))
    )
  );

  await writeFile(
    join(targetBookRoot, "book.json"),
    `${JSON.stringify({ title: book.title }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    join(targetBookRoot, "part-labels.json"),
    `${JSON.stringify(partLabels, null, 2)}\n`,
    "utf8"
  );

  let documentCount = 0;
  for (const gradeSlug of gradeSlugs) {
    const sourceGrade = join(sourceBookRoot, gradeSlug);
    const targetGrade = join(targetBookRoot, gradeSlug);
    documentCount += await copyMatchingFiles(
      sourceGrade,
      targetGrade,
      /^(?:BK|SK)_[^_]+_.+\.docx$/i
    );
    documentCount += await copyMatchingFiles(
      join(sourceGrade, "mobile"),
      join(targetGrade, "mobile"),
      /^(?:BK|SK)6_[^_]+_.+\.docx$/i
    );
  }

  return {
    slug: book.slug,
    parts: availablePartNames.length,
    documents: documentCount
  };
}

const results = [];
for (const book of books) {
  results.push(await importBook(book));
}

for (const result of results) {
  console.log(`${result.slug}: ${result.parts} parts, ${result.documents} DOCX files`);
}
