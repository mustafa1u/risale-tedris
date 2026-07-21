import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pagePaths = {
  home: new URL("./HomePage.astro", import.meta.url),
  library: new URL("./LibraryIndex.astro", import.meta.url),
  lessonFlow: new URL("./LessonFlowPage.astro", import.meta.url),
  book: new URL("./BookPage.astro", import.meta.url),
  part: new URL("./PartPage.astro", import.meta.url),
  study: new URL("../study/StudyPage.astro", import.meta.url)
};

const augmentationIslandsPath = new URL("../augmentation/AugmentationIslands.jsx", import.meta.url);

async function readPage(name) {
  return readFile(pagePaths[name], "utf8");
}

function countSnippet(source, snippet) {
  return source.split(snippet).length - 1;
}

describe("UX page accessibility markup", () => {
  it("keeps one primary heading in each page component", async () => {
    for (const pageName of Object.keys(pagePaths)) {
      const source = await readPage(pageName);

      assert.equal(countSnippet(source, "<h1"), 1, `Expected one h1 in ${pageName}`);
    }
  });

  it("routes both homepage calls to action to dedicated pages", async () => {
    const source = await readPage("home");

    assert.match(source, /getHomepageCtas/);
    assert.match(source, /homeCtas\.booksHref/);
    assert.match(source, /homeCtas\.lessonFlowHref/);
    assert.match(source, /class="home-hero__books" aria-hidden="true"/);
    assert.doesNotMatch(source, /<article class="home-value-card">/);
  });

  it("keeps mixed-age guidance and suggested steps on the lesson-flow page", async () => {
    const source = await readPage("lessonFlow");

    assert.match(source, /import flashcardsUsageVideo/);
    assert.match(source, /const lessonFlowVideos = text\.home\.lessonFlow\.videos\.map/);
    assert.match(source, /<section class="lesson-flow-media" aria-labelledby="lesson-flow-media-heading">/);
    assert.match(source, /<video controls preload="metadata" playsinline src={video\.src}>/);
    assert.match(source, /{text\.home\.mixedAgeLead}/);
    assert.match(source, /text\.home\.lessonFlow\.steps\.map/);
    assert.match(source, /<details class="home-flow-detail" open>/);
    assert.match(source, /<summary>{text\.home\.lessonFlow\.mixedAgeClass\.summary}<\/summary>/);
    assert.match(source, /<article class="home-value-card">/);
  });

  it("shows the available books on the dedicated library page", async () => {
    const source = await readPage("library");

    assert.match(source, /libraryIndex\.books\.map/);
    assert.match(source, /class="book-grid"/);
    assert.match(source, /getGradeLabel/);
    assert.match(source, /localizedPath\(locale, `\/books\/\$\{book\.slug\}\/`\)/);
  });

  it("labels book guidance and part capability summaries", async () => {
    const source = await readPage("book");

    assert.match(source, /<section class="guidance-panel" aria-labelledby="book-guide-heading">/);
    assert.match(source, /<h2 id="book-guide-heading">/);
    assert.match(source, /class="meta-list part-row__capabilities" aria-label={text\.book\.capabilitiesLabel/);
  });

  it("uses school-range labels for the book filter while keeping grade slugs stable", async () => {
    const source = await readPage("book");

    assert.match(source, /import { getGradeShortLabel } from "@\/i18n\/libraryLabels";/);
    assert.match(source, /<label for="grade-filter">{text\.book\.gradeLabel}<\/label>/);
    assert.match(source, /<option value={grade\.slug}>{getGradeShortLabel\(locale, grade\.slug, grade\.label\)}<\/option>/);
    assert.match(source, /data-grades={gradeSlugs}/);
  });

  it("collapses the contextual book search while retaining the metadata controls", async () => {
    const source = await readPage("book");
    const disclosureIndex = source.indexOf('data-book-search-fallback');
    const toolbarIndex = source.indexOf('data-part-toolbar');

    assert.match(source, /<details class="book-search-fallback" data-book-search-fallback>/);
    assert.match(source, /<summary data-book-search-trigger>{text\.search\.triggers\.book}<\/summary>/);
    assert.equal(disclosureIndex > -1, true);
    assert.equal(toolbarIndex > disclosureIndex, true);
    assert.match(source, /data-part-search/);
    assert.match(source, /data-grade-filter/);
  });

  it("preserves stable row identifiers, canonical links, capability badges, and result counts", async () => {
    const source = await readPage("book");

    assert.match(source, /data-part-no={part\.partNo}/);
    assert.match(source, /href={localizedPath\(locale, partPath\)}/);
    assert.equal(countSnippet(source, 'href={localizedPath(locale, partPath)}'), 2);
    assert.match(source, /class="meta-list part-row__capabilities"/);
    assert.match(source, /data-filter-status/);
    assert.match(source, /text\.book\.resultCount\({ count: book\.parts\.length }\)/);
  });

  it("retains the metadata filter as the reversible full-text-search fallback", async () => {
    const source = await readPage("book");

    assert.match(source, /data-search-fallback="metadata"/);
    assert.match(source, /data-part-toolbar/);
    assert.match(source, /data-part-search/);
    assert.match(source, /data-grade-filter/);
  });

  it("labels part navigation, workflow, and download disclosure controls", async () => {
    const source = await readPage("part");

    assert.match(source, /import { getGradeExplanatoryLabel } from "@\/i18n\/libraryLabels";/);
    assert.match(source, /<nav class="part-step-nav" aria-label={text\.part\.navigationLabel}>/);
    assert.match(source, /<section class="guidance-panel part-workflow" aria-labelledby="part-workflow-heading">/);
    assert.match(source, /<aside class="download-panel" aria-label={text\.downloads\.label}>/);
    assert.match(source, /<p class="download-panel__note">{text\.downloads\.mixedAgeGuidance}<\/p>/);
    assert.match(source, /const gradeLabel = getGradeExplanatoryLabel\(locale, gradeSlug, grade\?\.label\);/);
    assert.match(source, /<summary\s+class="download-group__summary"\s+aria-label={text\.downloads\.openGrade/);
    assert.match(source, /<span class="download-group__summary-label">{text\.downloads\.gradeSummary\({ gradeLabel }\)}<\/span>/);
    assert.match(source, /<span class="download-group__summary-arrow" aria-hidden="true">›<\/span>/);
    assert.match(source, /<details class="download-group">/);
    assert.doesNotMatch(source, /<details class="download-group"[^>]*\sopen=/);
  });

  it("keeps personal augmentation grade downloads collapsed initially", async () => {
    const source = await readFile(augmentationIslandsPath, "utf8");

    assert.match(source, /<details class="download-group">/);
    assert.doesNotMatch(source, /<details class="download-group"[^>]*\sopen=/);
  });

  it("renders personal augmentation source text on the detail page", async () => {
    const source = await readFile(augmentationIslandsPath, "utf8");

    assert.match(source, /splitPartText/);
    assert.match(source, /isSectionedPartTextHeading/);
    assert.match(source, /function AugmentedSourceText/);
    assert.match(source, /class="personal-augmentation-source"/);
    assert.match(source, /part-text-section-heading/);
    assert.match(source, /<AugmentedSourceText heading={labels\.sourceTextHeading} text={project\.sourceText} \/>/);
  });

  it("keeps the study source dialog labelled and the instruction outside the card", async () => {
    const source = await readPage("study");
    const instructionIndex = source.indexOf('class="study-instruction"');
    const cardIndex = source.indexOf('class="study-card"');

    assert.match(source, /<dialog class="study-source-dialog" data-source-dialog aria-labelledby="study-source-title">/);
    assert.equal(instructionIndex > -1, true);
    assert.equal(cardIndex > instructionIndex, true);
  });
});
