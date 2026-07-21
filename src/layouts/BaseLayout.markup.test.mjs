import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./BaseLayout.astro", import.meta.url);

describe("BaseLayout markup contract", () => {
  it("keeps the brand before a native, focusable grid-menu trigger", async () => {
    const source = await readFile(sourcePath, "utf8");
    const brandIndex = source.indexOf('<a class="brand"');
    const menuIndex = source.indexOf('<details class="site-menu" data-site-menu>');

    assert.equal(brandIndex >= 0, true);
    assert.equal(menuIndex > brandIndex, true);
    assert.match(source, /<summary class="site-menu__toggle" data-site-menu-trigger>/);
    assert.match(source, /<span class="site-menu__icon" aria-hidden="true">/);
  });

  it("inserts the optional homepage search island immediately before the native menu", async () => {
    const source = await readFile(sourcePath, "utf8");
    const searchIndex = source.indexOf("data-home-search-host");
    const menuIndex = source.indexOf('<details class="site-menu" data-site-menu>');

    assert.doesNotMatch(source, /client:(?:load|only)/);
    assert.equal(searchIndex >= 0, true);
    assert.equal(menuIndex > searchIndex, true);
    assert.match(source, /data-home-search-host/);
    assert.match(source, /data-global-search-trigger/);
    assert.match(source, /import "@\/features\/search\/mountHomeSearch\.jsx"/);
    assert.match(source, /document\.addEventListener\("rissor:search-open"/);
    assert.match(source, /new CustomEvent\("rissor:menu-open"/);
  });

  it("keeps English locale infrastructure but hides the language switch while only Turkish material is available", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /const VISIBLE_LOCALES: Locale\[] = \[DEFAULT_LOCALE\];/);
    assert.match(source, /VISIBLE_LOCALES\.length > 1/);
    assert.match(source, /VISIBLE_LOCALES\.map\(\(optionLocale\) =>/);
    assert.doesNotMatch(source, /import .*LOCALES/);
    assert.doesNotMatch(source, /\{LOCALES\.map/);
  });

  it("renders theme selection in the menu and keeps its label synchronized", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /themes: text\.nav\.themes\(\{ theme: text\.themes\.names\[ACTIVE_THEME\] \}\)/);
    assert.match(source, /<span data-theme-nav-link={item\.id === "themes" \? "true" : undefined}>/);
    assert.match(source, /document\.querySelectorAll\("\[data-theme-nav-link\]"\)/);
  });
});
