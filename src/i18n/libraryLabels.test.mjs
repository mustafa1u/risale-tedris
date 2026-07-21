import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./libraryLabels.ts", import.meta.url);

async function readSource() {
  return readFile(sourcePath, "utf8");
}

function assertGradeBlock(source, locale, slug, snippets) {
  const pattern = new RegExp(`${locale}:\\s*{[\\s\\S]*?${JSON.stringify(slug)}:\\s*{([\\s\\S]*?)\\n\\s*}`, "m");
  const match = source.match(pattern);

  assert.notEqual(match, null, `Expected ${locale} ${slug} grade-range block`);

  const block = match[1];
  for (const snippet of snippets) {
    assert.equal(block.includes(snippet), true, `Expected ${locale} ${slug} block to include ${snippet}`);
  }
}

describe("library grade labels", () => {
  it("defines centralized school grade range labels for every current grade slug", async () => {
    const source = await readSource();
    const slugs = ['"2-sinif"', '"5-sinif"', '"8-sinif"', '"11-sinif"', '"lisans"'];

    for (const slug of slugs) {
      assert.match(source, new RegExp(`${slug}:\\s*{[\\s\\S]*?shortLabel:`));
      assert.match(source, new RegExp(`${slug}:\\s*{[\\s\\S]*?levelLabel:`));
      assert.match(source, new RegExp(`${slug}:\\s*{[\\s\\S]*?rangeLabel:`));
      assert.match(source, new RegExp(`${slug}:\\s*{[\\s\\S]*?explanatoryLabel:`));
    }
  });

  it("maps Turkish labels to school grade ranges without changing internal slugs", async () => {
    const source = await readSource();

    assertGradeBlock(source, "tr", "2-sinif", [
      'shortLabel: "2-3. okul sınıfları"',
      'levelLabel: "2. sınıf seviyesi"',
      'rangeLabel: "2-3. sınıflar"',
      'explanatoryLabel: "2. sınıf seviyesi - 2-3. okul sınıfları için"'
    ]);
    assertGradeBlock(source, "tr", "lisans", [
      'shortLabel: "Lise sonrası"',
      'levelLabel: "Lise sonrası seviye"',
      'rangeLabel: "lise mezunu ve üzeri"',
      'explanatoryLabel: "Lise sonrası seviye - lise mezunu ve üzeri için"'
    ]);
  });

  it("maps English labels to school grade ranges and post-high-school wording", async () => {
    const source = await readSource();

    assertGradeBlock(source, "en", "8-sinif", [
      'shortLabel: "grades 7-9"',
      'levelLabel: "8th-grade level"',
      'rangeLabel: "school grades 7-9"',
      'explanatoryLabel: "8th-grade level - for school grades 7-9"'
    ]);
    assertGradeBlock(source, "en", "lisans", [
      'shortLabel: "post-high-school"',
      'levelLabel: "Post-high-school level"',
      'rangeLabel: "high-school graduates and above"',
      'explanatoryLabel: "Post-high-school level - for high-school graduates and above"'
    ]);
    assert.doesNotMatch(source, /Undergraduate/);
  });

  it("keeps the legacy getGradeLabel API backed by the level label", async () => {
    const source = await readSource();

    assert.match(source, /export function getGradeLabel/);
    assert.match(source, /return getGradeRangeDisplay\(locale, slug, fallback\)\.levelLabel;/);
  });
});
