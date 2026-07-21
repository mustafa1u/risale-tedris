import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./StudyPage.astro", import.meta.url);

describe("StudyPage markup contract", () => {
  it("renders a pre-card instruction before the interactive card", async () => {
    const source = await readFile(sourcePath, "utf8");
    const instructionIndex = source.indexOf('class="study-instruction"');
    const cardIndex = source.indexOf('class="study-card"');

    assert.equal(instructionIndex > -1, true);
    assert.equal(cardIndex > instructionIndex, true);
  });

  it("shows selected school-range lede and top study instruction before the study session", async () => {
    const source = await readFile(sourcePath, "utf8");
    const instructionIndex = source.indexOf('class="study-instruction"');
    const shellIndex = source.indexOf('class="study-shell"');

    assert.doesNotMatch(source, /import { libraryIndex } from "@\/data\/library\.generated";/);
    assert.match(source, /import { getGradeExplanatoryLabel } from "@\/i18n\/libraryLabels";/);
    assert.match(source, /const gradeLabel = getGradeExplanatoryLabel\(locale, gradeSlug\);/);
    assert.match(source, /data-study-lede>{text\.study\.loading}/);
    assert.match(source, /<p class="study-instruction" data-study-instruction>{text\.study\.instruction}<\/p>/);
    assert.doesNotMatch(source, /data-study-range-note/);
    assert.doesNotMatch(source, /rangeNote/);
    assert.match(source, /data-study-index-url={studyIndexUrl}/);
    assert.match(source, /data-study-grade-context-json/);
    assert.equal(instructionIndex > -1, true);
    assert.equal(shellIndex > instructionIndex, true);
  });

  it("keeps the initial card side and source button behavior intact", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /data-study-side>{text\.study\.loading}/);
    assert.match(source, /data-question-label={text\.study\.question}/);
    assert.match(source, /data-view-source hidden/);
  });

  it("renders a static fallback for the client-driven shell", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /class="empty-state study-shell-fallback" data-study-fallback/);
    assert.match(source, /data-card-count-one={cardCountTemplates\.one}/);
    assert.match(source, /data-card-count-many={cardCountTemplates\.many}/);
  });
});
