import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./BaseLayout.astro", import.meta.url);
const bookGroupsPath = new URL("../config/bookGroups.ts", import.meta.url);
const navigationPath = new URL("../config/navigation.ts", import.meta.url);

describe("BaseLayout markup contract", () => {
  it("keeps the brand before desktop navigation, search, theme settings, and the native compact-menu trigger", async () => {
    const source = await readFile(sourcePath, "utf8");
    const brandIndex = source.indexOf('<a class="brand"');
    const desktopNavigationIndex = source.indexOf('<nav class="navbar">');
    const searchIndex = source.indexOf("data-home-search-host");
    const themeSettingsIndex = source.indexOf('class="theme-nav-control"');
    const menuIndex = source.indexOf('<details class="site-menu" data-site-menu>');

    assert.equal(brandIndex >= 0, true);
    assert.equal(desktopNavigationIndex > brandIndex, true);
    assert.equal(searchIndex > desktopNavigationIndex, true);
    assert.equal(themeSettingsIndex > searchIndex, true);
    assert.equal(menuIndex > themeSettingsIndex, true);
    assert.match(source, /<div class="site-header__controls">/);
    assert.match(source, /<summary class="site-menu__toggle" data-site-menu-trigger>/);
    assert.match(source, /<span class="site-menu__icon" aria-hidden="true">/);
  });

  it("uses Astro's resolved brand-logo URL on both top-level and nested pages", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /import rtLogo from "@\/assets\/site\/rt\.png";/);
    assert.match(source, /src=\{rtLogo\.src\}/);
    assert.doesNotMatch(source, /src="assets\/images\/rt\.png"/);
  });

  it("keeps the books dropdown and restores the other desktop items from the localized navigation model", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /const navigationItems = NAV_ITEMS\.map\(\(item\) =>/);
    assert.match(
      source,
      /navigationItems\.filter\(\(item\) => item\.id !== "books" && item\.id !== "themes"\)\.map\(\(item\) =>/
    );
    assert.equal(source.match(/compactNavigationItems\.map\(\(item\) =>/g)?.length, 1);
    assert.equal(source.match(/aria-current=\{item\.isCurrent \? "page" : undefined\}/g)?.length, 2);
    assert.match(
      source,
      /aria-current=\{currentPath\.startsWith\(localizedPath\(locale, "\/books\/"\)\) \? "page" : undefined\}/
    );
    assert.match(source, /currentPath\.startsWith\(href\)/);
  });

  it("groups every desktop book link under Small Books or Words", async () => {
    const source = await readFile(sourcePath, "utf8");
    const bookGroups = await readFile(bookGroupsPath, "utf8");

    for (const slug of [
      "ayetul-kubra",
      "kucuk-sozler",
      "meyve-risalesi",
      "tabiat-risalesi",
      "11-soz",
      "13-soz",
      "18-soz",
      "24-soz",
      "31-soz",
      "32-soz",
      "33-soz"
    ]) {
      assert.match(bookGroups, new RegExp(`"${slug}"`));
    }
    assert.match(bookGroups, /tr: "Küçük Boy Risaleler"/);
    assert.match(bookGroups, /tr: "Sözler"/);
    assert.match(source, /const bookNavigationGroups = groupBooksBySlug\(libraryIndex\.books, locale\);/);
    assert.match(source, /bookNavigationGroups\.map\(\(group\) =>/);
    assert.match(source, /group\.books\.map\(\(book\) =>/);
    assert.match(source, /localizedPath\(locale, `\/books\/\$\{book\.slug\}\/`\)/);
    assert.match(source, /class="dropdown-submenu"/);
    assert.doesNotMatch(source, /parça|sınıf seviyesi|Lise sonrası seviye/);
  });

  it("places the how-it-works page directly after books in both navigation presentations", async () => {
    const source = await readFile(sourcePath, "utf8");
    const navigation = await readFile(navigationPath, "utf8");

    assert.match(source, /const compactNavigationItems = navigationItems\.map/);
    assert.match(source, /howItWorks: text\.nav\.howItWorks/);
    assert.match(source, /compactNavigationItems\.map\(\(item\) =>/);
    assert.match(
      navigation,
      /id: "books"[\s\S]*id: "howItWorks"[\s\S]*id: "lessonFlow"/
    );
  });

  it("inserts the feature-gated global search island on every page immediately before the native menu", async () => {
    const source = await readFile(sourcePath, "utf8");
    const searchIndex = source.indexOf("data-home-search-host");
    const menuIndex = source.indexOf('<details class="site-menu" data-site-menu>');

    assert.doesNotMatch(source, /client:(?:load|only)/);
    assert.equal(searchIndex >= 0, true);
    assert.equal(menuIndex > searchIndex, true);
    assert.match(source, /data-home-search-host/);
    assert.match(source, /data-global-search-trigger/);
    assert.match(source, /import \{ SEARCH_ENABLED \} from "@\/config\/features\.js";/);
    assert.match(source, /const resolvedGlobalSearch = globalSearch \?\? \(SEARCH_ENABLED/);
    assert.match(source, /manifestUrl: libraryIndex\.search\.manifestUrl/);
    assert.match(source, /books: libraryIndex\.books\.map\(\(book\) => book\.search\)/);
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

  it("renders theme selection in both navigation presentations and keeps its label synchronized", async () => {
    const source = await readFile(sourcePath, "utf8");

    assert.match(source, /themes: text\.nav\.themes\(\{ theme: text\.themes\.names\[ACTIVE_THEME\] \}\)/);
    assert.match(source, /const themeNavigationItem = navigationItems\.find\(\(item\) => item\.id === "themes"\);/);
    assert.match(source, /class="theme-nav-control"/);
    assert.match(source, /<span class="theme-nav-control__label">\{text\.nav\.theme\}<\/span>/);
    assert.match(source, /<span data-theme-nav-link={item\.themeLink \? "true" : undefined}>/);
    assert.match(source, /document\.querySelectorAll\("\[data-theme-nav-link\]"\)/);
    assert.match(source, /themePreferenceMigration/);
    assert.match(source, /shouldMigrateLegacyDefault/);
    assert.match(source, /storedTheme === legacyDefaultTheme/);
    assert.match(source, /setTheme\(initialTheme, \{ persist: false \}\)/);
    assert.match(source, /writeStorage\(explicitPreferenceKey, "1"\)/);
  });
});
