import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, relative } from "node:path";

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
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

function sourcePath(root, absPath) {
  return toPosixPath(relative(root, absPath));
}

function assetUrl(root, absPath) {
  return `/${sourcePath(root, absPath)}`;
}

export async function collectStudyDeckAssets({ root, bookSlug, bookPath }) {
  const deckRoot = join(bookPath, "question-bank");
  const files = (await listFilesRecursive(deckRoot))
    .filter((file) => extname(file).toLowerCase() === ".json")
    .sort((a, b) => sourcePath(root, a).localeCompare(sourcePath(root, b), "en"));
  const decks = [];

  for (const filePath of files) {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (parsed.bookSlug !== bookSlug || !parsed.gradeSlug || !parsed.partNo) {
      continue;
    }

    decks.push({
      key: `${parsed.gradeSlug}:${parsed.partNo}`,
      fileName: filePath.split(/[\\/]/).at(-1),
      sourcePath: sourcePath(root, filePath),
      url: assetUrl(root, filePath),
      gradeSlug: parsed.gradeSlug,
      partNo: parsed.partNo,
      title: parsed.title || parsed.partNo.toUpperCase(),
      cardCount: Number(parsed.cardCount) || 0
    });
  }

  return decks;
}
