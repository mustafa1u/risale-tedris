import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./index.ts", import.meta.url);

async function readI18nSource() {
  return readFile(sourcePath, "utf8");
}

function countSnippet(source, snippet) {
  return source.split(snippet).length - 1;
}

describe("UI dictionary contract", () => {
  it("defines homepage UX copy keys for the type and both locales", async () => {
    const source = await readI18nSource();
    const requiredKeys = [
      "home:",
      "hero:",
      "primaryCta:",
      "secondaryCta:",
      "gradeLine:",
      "stats:",
      "gradeLevels:",
      "formats:",
      "valueCards:",
      "lessonFlow:",
      "desktopAppNote:"
    ];

    for (const key of requiredKeys) {
      assert.equal(
        countSnippet(source, key) >= 3,
        true,
        `Expected ${key} in UiDictionary, Turkish copy, and English copy`
      );
    }

    assert.match(
      source,
      /gradeLine:\s*"Seviyeler okul sınıflarına göredir\. Sınıflar ayrı bir medrese sınıflandırması değildir\."/
    );
    assert.match(
      source,
      /gradeLine:\s*"Levels follow regular school grades\. The classes are not a separate madrasa classification\."/
    );
    assert.doesNotMatch(source, /Okul sınıf aralıkları: 2\. sınıf seviyesi/);
    assert.doesNotMatch(source, /School grade ranges: 2nd-grade level/);
    assert.doesNotMatch(source, /Buradaki sınıf ifadeleri okul sınıflarına göre yaklaşık seviye aralığını gösterir/);
    assert.doesNotMatch(source, /These labels refer to regular school grade ranges/);
  });

  it("keeps the desktop editor note out of the homepage hero contract", async () => {
    const source = await readI18nSource();

    assert.match(source, /desktopAppNote:\s*{/);
    assert.doesNotMatch(
      source,
      /hero:\s*{[^}]*heading:\s*"[^"]*(düzenle|düzenleme|edit|editor|customize|customization)/i
    );
  });

  it("defines book page guidance and part capability copy keys for both locales", async () => {
    const source = await readI18nSource();
    const requiredKeys = [
      "guide:",
      "capabilitiesLabel:",
      "capabilities:",
      "text:",
      "gradeLevels:",
      "flashcards:",
      "questionSheets:"
    ];

    for (const key of requiredKeys) {
      assert.equal(
        countSnippet(source, key) >= 3,
        true,
        `Expected ${key} in UiDictionary, Turkish copy, and English copy`
      );
    }
  });

  it("defines book page school-range filter copy for both locales", async () => {
    const source = await readI18nSource();

    assert.match(source, /gradeLabel:\s*"Okul sınıf aralığı"/);
    assert.match(source, /gradeLabel:\s*"School grade range"/);
    assert.match(source, /allGrades:\s*"Tüm okul aralıkları"/);
    assert.match(source, /allGrades:\s*"All school ranges"/);
    assert.match(source, /birden çok okul sınıf aralığı/);
    assert.match(source, /multiple school grade ranges/);
    assert.match(source, /okul aralığı/);
    assert.match(source, /school \$\{count === 1 \? "range" : "ranges"\}/);
  });

  it("defines part page workflow and download help copy keys for both locales", async () => {
    const source = await readI18nSource();
    const requiredKeys = [
      "workflow:",
      "steps:",
      "mixedAgeGuidance:",
      "studyHint:",
      "questionSheetHint:",
      "gradeSummary:",
      "openGrade:"
    ];

    for (const key of requiredKeys) {
      assert.equal(
        countSnippet(source, key) >= 3,
        true,
        `Expected ${key} in UiDictionary, Turkish copy, and English copy`
      );
    }

    assert.match(source, /farklı yaşlardan talebeler aynı parçayı/);
    assert.match(source, /Students from different ages can work on this same part/);
    assert.match(source, /Okul sınıf aralığını seçin/);
    assert.match(source, /Choose the school grade range/);
  });

  it("defines study page instruction copy for both locales", async () => {
    const source = await readI18nSource();

    assert.equal(
      countSnippet(source, "instruction:") >= 3,
      true,
      "Expected instruction in UiDictionary, Turkish copy, and English copy"
    );
    assert.doesNotMatch(source, /rangeNote:/);
    assert.doesNotMatch(source, /Bu deste şu okul aralığı için hazırlanmıştır/);
    assert.doesNotMatch(source, /This deck is prepared for this school range/);
  });

  it("defines school grade range vocabulary for both locales", async () => {
    const source = await readI18nSource();
    const requiredKeys = [
      "gradeRanges:",
      "label:",
      "mixedAgeNote:",
      "postHighSchoolLabel:"
    ];

    for (const key of requiredKeys) {
      assert.equal(
        countSnippet(source, key) >= 3,
        true,
        `Expected ${key} in UiDictionary, Turkish copy, and English copy`
      );
    }
  });

  it("uses post-high-school wording instead of Undergraduate in user-facing copy", async () => {
    const source = await readI18nSource();

    assert.match(source, /Post-high-school/);
    assert.doesNotMatch(source, /Undergraduate/);
  });

  it("defines homepage mixed-age lesson copy for both locales", async () => {
    const source = await readI18nSource();

    assert.match(source, /mixedAgeLead:\s*string;/);
    assert.match(source, /mixedAgeClass:\s*{\s*summary:\s*string;\s*body:\s*string;\s*};/s);
    assert.match(source, /title:\s*"Karışık yaş gruplarıyla aynı ders"/);
    assert.match(source, /title:\s*"Mixed-age lesson sessions"/);
    assert.match(source, /talebeyi ilgili paragrafa yönlendirsin/);
    assert.match(source, /guide each student back to the relevant paragraph/);
  });

  it("defines complete typed search copy in both locales without raw enum labels", async () => {
    const source = await readI18nSource();
    const requiredKeys = [
      "triggers:",
      "placeholders:",
      "modes:",
      "scopes:",
      "books:",
      "proximity:",
      "help:",
      "examplesLabel:",
      "booleanBuilder:",
      "status:",
      "errors:",
      "results:",
      "clear:",
      "close:",
      "retry:"
    ];

    assert.equal(countSnippet(source, "  search: {"), 3, "Expected typed, Turkish, and English search dictionaries");
    for (const key of requiredKeys) {
      assert.equal(countSnippet(source, key) >= 3, true, `Expected ${key} in all search dictionary contracts`);
    }

    assert.match(source, /global:\s*"Tüm kitaplarda ara"/);
    assert.match(source, /global:\s*"Search all books"/);
    assert.match(source, /all:\s*"Tüm kelimeler"/);
    assert.match(source, /all:\s*"All words"/);
    assert.match(source, /partNo:\s*"Parça numaraları"/);
    assert.match(source, /partNo:\s*"Part numbers"/);
    assert.match(source, /selectAll:\s*"Tümünü seç"/);
    assert.match(source, /selectAll:\s*"Select all"/);
    assert.match(source, /clearSelection:\s*"Seçimi temizle"/);
    assert.match(source, /clearSelection:\s*"Clear selection"/);
    assert.match(source, /provisional:.*Sonuçlar geçici/s);
    assert.match(source, /provisional:.*Results are provisional/s);
    assert.match(source, /restored:\s*"Önceki arama sonuçları geri yüklendi\."/);
    assert.match(source, /restored:\s*"Previous search results were restored\."/);
    assert.match(source, /iman AND nur/);
    assert.match(source, /rah\*/);
    assert.match(source, /Mantıksal arama oluşturucu/);
    assert.match(source, /Boolean search builder/);
    assert.doesNotMatch(source, /all:\s*"all"/);
    assert.doesNotMatch(source, /exact:\s*"exact"/);
    assert.doesNotMatch(source, /partNo:\s*"partNo"/);
  });
});
