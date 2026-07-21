import { copyFile, lstat, mkdir, readdir, rm, utimes } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "assets");
const publicRoot = resolve(root, "public");
const destination = resolve(publicRoot, "assets");

const stats = {
  copied: 0,
  skipped: 0,
  removed: 0,
  createdDirectories: 0
};

function isInside(parent, child) {
  const relativePath = relative(parent, child);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function assertInsideRoot(path) {
  if (!isInside(root, path)) {
    throw new Error(`Refusing to write outside the workspace: ${path}`);
  }
}

async function readEntries(path) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function ensureDirectory(path) {
  assertInsideRoot(path);

  const existing = await lstat(path).catch((error) => {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  });

  if (existing?.isDirectory()) {
    return;
  }

  if (existing) {
    await rm(path, { force: true, recursive: true });
    stats.removed += 1;
  }

  await mkdir(path, { recursive: true });
  stats.createdDirectories += 1;
}

async function removeObsolete(path) {
  assertInsideRoot(path);
  await rm(path, { force: true, recursive: true });
  stats.removed += 1;
}

function shouldCopyFile(sourceStats, destinationStats) {
  if (!destinationStats?.isFile()) {
    return true;
  }

  const mtimeDelta = Math.abs(sourceStats.mtimeMs - destinationStats.mtimeMs);
  return sourceStats.size !== destinationStats.size || mtimeDelta > 1000;
}

async function syncFile(sourcePath, destinationPath) {
  assertInsideRoot(destinationPath);

  const sourceStats = await lstat(sourcePath);
  const destinationStats = await lstat(destinationPath).catch((error) => {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  });

  if (!shouldCopyFile(sourceStats, destinationStats)) {
    stats.skipped += 1;
    return;
  }

  if (destinationStats && !destinationStats.isFile()) {
    await removeObsolete(destinationPath);
  }

  await copyFile(sourcePath, destinationPath);
  await utimes(destinationPath, sourceStats.atime, sourceStats.mtime);
  stats.copied += 1;
}

async function syncDirectory(sourceDirectory, destinationDirectory) {
  await ensureDirectory(destinationDirectory);

  const sourceEntries = await readEntries(sourceDirectory);
  const destinationEntries = await readEntries(destinationDirectory);
  const sourceNames = new Set(sourceEntries.map((entry) => entry.name));

  for (const entry of destinationEntries) {
    if (!sourceNames.has(entry.name)) {
      await removeObsolete(join(destinationDirectory, entry.name));
    }
  }

  for (const entry of sourceEntries) {
    const sourcePath = join(sourceDirectory, entry.name);
    const destinationPath = join(destinationDirectory, entry.name);

    if (entry.isDirectory()) {
      await syncDirectory(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile()) {
      await syncFile(sourcePath, destinationPath);
    }
  }
}

if (!isInside(root, destination) || destination === root) {
  throw new Error(`Refusing to write outside the workspace: ${destination}`);
}

const sourceStats = await lstat(source).catch((error) => {
  if (error.code === "ENOENT") {
    throw new Error(`Missing assets directory: ${source}`);
  }

  throw error;
});

if (!sourceStats.isDirectory()) {
  throw new Error(`Assets path is not a directory: ${source}`);
}

await ensureDirectory(publicRoot);
await syncDirectory(source, destination);

console.log(
  `Synced assets -> ${destination} (${stats.copied} copied, ${stats.skipped} unchanged, ${stats.removed} removed, ${stats.createdDirectories} directories created)`
);
