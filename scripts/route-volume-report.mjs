import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_INDEX_PATH = resolve(process.cwd(), "src/data/library.generated.ts");
const LOCALE_COUNT = 2;
const BASE_STATIC_PAGES = 4;
const STUDY_INDEX_JSON_OUTPUTS = 1;
const PHASE_5_BUILD_SECONDS = 627.65;
const PHASE_5_PAGE_COUNT = 3864;

export function parseGeneratedLibraryIndex(source) {
  const match = source.match(/export const libraryIndex = ([\s\S]+?) satisfies LibraryIndex;/);

  if (!match) {
    throw new Error("Could not find generated libraryIndex export.");
  }

  return JSON.parse(match[1]);
}

export function getRouteVolume(libraryIndex) {
  const bookCount = libraryIndex.books.length;
  const partCount = libraryIndex.books.reduce((total, book) => total + book.partRoutes.length, 0);
  const studyDeckCount = libraryIndex.books.reduce((total, book) => total + book.studyDeckRoutes.length, 0);
  const bookPages = bookCount * LOCALE_COUNT;
  const partPages = partCount * LOCALE_COUNT;
  const perDeckStudyPages = studyDeckCount * LOCALE_COUNT;
  const shellStudyPages = LOCALE_COUNT;

  return {
    locales: LOCALE_COUNT,
    baseStaticPages: BASE_STATIC_PAGES,
    studyIndexJsonOutputs: STUDY_INDEX_JSON_OUTPUTS,
    bookPages,
    partPages,
    perDeckStudyPages,
    shellStudyPages,
    phase5TotalPages: BASE_STATIC_PAGES + bookPages + partPages + perDeckStudyPages,
    phase6ShellHtmlPages: BASE_STATIC_PAGES + bookPages + partPages + shellStudyPages,
    phase6ShellStaticOutputs: BASE_STATIC_PAGES + STUDY_INDEX_JSON_OUTPUTS + bookPages + partPages + shellStudyPages,
    removedStudyPages: perDeckStudyPages - shellStudyPages,
    bookCount,
    partCount,
    studyDeckCount
  };
}

export function formatRouteVolumeReport(volume) {
  return [
    "Route volume report",
    `Locales: ${volume.locales}`,
    `Base pages (home/theme by locale): ${volume.baseStaticPages}`,
    `Study index JSON output: ${volume.studyIndexJsonOutputs}`,
    `Book pages: ${volume.bookPages}`,
    `Part pages: ${volume.partPages}`,
    `Study pages in Phase 5 per-deck model: ${volume.perDeckStudyPages}`,
    `Study pages in Phase 6 shell model: ${volume.shellStudyPages}`,
    `Estimated HTML pages before Phase 6: ${volume.phase5TotalPages}`,
    `Estimated HTML pages after Phase 6: ${volume.phase6ShellHtmlPages}`,
    `Estimated static outputs after Phase 6: ${volume.phase6ShellStaticOutputs}`,
    `Estimated study HTML pages removed: ${volume.removedStudyPages}`,
    `Phase 5 build baseline: ${PHASE_5_PAGE_COUNT} pages in ${PHASE_5_BUILD_SECONDS}s`,
    "For separated timing, run npm run build:timed."
  ].join("\n");
}

export async function readRouteVolume({ indexPath = DEFAULT_INDEX_PATH } = {}) {
  const source = await readFile(indexPath, "utf8");
  return getRouteVolume(parseGeneratedLibraryIndex(source));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const volume = await readRouteVolume();
  console.log(formatRouteVolumeReport(volume));
}
