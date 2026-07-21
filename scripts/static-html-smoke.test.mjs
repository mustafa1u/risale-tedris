import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  assertHtmlIncludes,
  getAugmentationRouteSmokeChecks,
  getHomepageSmokeChecks,
  getRouteSmokeChecks,
  normalizeRouteToHtmlPath
} from "./static-html-smoke.mjs";

describe("static HTML smoke helpers", () => {
  it("maps static routes to built HTML files", () => {
    assert.match(normalizeRouteToHtmlPath("dist", "/"), /dist[\\/]index\.html$/);
    assert.match(normalizeRouteToHtmlPath("dist", "/en/"), /dist[\\/]en[\\/]index\.html$/);
    assert.match(
      normalizeRouteToHtmlPath("dist", "/books/meyve-risalesi/parts/p55/"),
      /dist[\\/]books[\\/]meyve-risalesi[\\/]parts[\\/]p55[\\/]index\.html$/
    );
  });

  it("throws with a useful message when expected HTML is missing", () => {
    assert.throws(
      () => assertHtmlIncludes("<main>Only old content</main>", ["New hero"], "/"),
      /Missing expected HTML in \/: New hero/
    );
  });

  it("defines homepage smoke checks for both locales", () => {
    assert.deepEqual(getHomepageSmokeChecks("tr").routePath, "/");
    assert.deepEqual(getHomepageSmokeChecks("en").routePath, "/en/");

    for (const locale of ["tr", "en"]) {
      const check = getHomepageSmokeChecks(locale);

      assert.equal(check.expectedText.length >= 8, true);
      assert.equal(check.expectedText.some((item) => item.includes("#books")), true);
      assert.equal(check.expectedText.some((item) => item.includes("#lesson-flow")), true);
    }
  });

  it("covers representative homepage, book, part, and study routes", () => {
    const checks = getRouteSmokeChecks();

    assert.equal(checks.length >= 8, true);
    assert.equal(checks.some((check) => check.routePath === "/books/meyve-risalesi/"), true);
    assert.equal(checks.some((check) => check.routePath === "/books/meyve-risalesi/parts/p55/"), true);
    assert.equal(checks.some((check) => check.routePath === "/study/?book=meyve-risalesi&grade=8-sinif&part=p55"), true);
    assert.equal(checks.some((check) => check.routePath === "/en/study/?book=meyve-risalesi&grade=8-sinif&part=p55"), true);
  });

  it("defines opt-in augmentation shell checks without changing baseline smoke", () => {
    const baseline = getRouteSmokeChecks();
    const augmentation = getAugmentationRouteSmokeChecks();

    assert.equal(baseline.some((check) => check.routePath.includes("my-augmentations")), false);
    assert.equal(augmentation.some((check) => check.routePath === "/books/kucuk-sozler/"), true);
    assert.equal(augmentation.some((check) => check.routePath === "/books/kucuk-sozler/parts/p08/"), true);
    assert.equal(augmentation.some((check) => check.routePath.includes("my-augmentations/view")), true);
  });

  it("keeps Netlify redirects for legacy per-deck study URLs", async () => {
    const redirects = await readFile(new URL("../public/_redirects", import.meta.url), "utf8");

    assert.match(
      redirects,
      /\/books\/:bookSlug\/study\/:gradeSlug\/:partNo\/\s+\/study\/\?book=:bookSlug&grade=:gradeSlug&part=:partNo\s+302/
    );
    assert.match(
      redirects,
      /\/en\/books\/:bookSlug\/study\/:gradeSlug\/:partNo\/\s+\/en\/study\/\?book=:bookSlug&grade=:gradeSlug&part=:partNo\s+302/
    );
  });
});
