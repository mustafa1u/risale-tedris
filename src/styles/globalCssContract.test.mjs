import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourcePath = new URL("./global.css", import.meta.url);

async function readCssSource() {
  const source = await readFile(sourcePath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

function getBlock(source, selector) {
  const selectorPattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`);
  const selectorMatch = source.match(selectorPattern);
  assert.notEqual(selectorMatch, null, `Expected selector ${selector}`);

  const selectorIndex = selectorMatch.index ?? -1;
  const blockStart = source.indexOf("{", selectorIndex);
  const blockEnd = source.indexOf("}", blockStart);

  assert.notEqual(blockStart, -1, `Expected block start for ${selector}`);
  assert.notEqual(blockEnd, -1, `Expected block end for ${selector}`);

  return source.slice(selectorIndex, blockEnd + 1);
}

function assertBlockIncludes(source, selector, snippets) {
  const block = getBlock(source, selector);

  for (const snippet of snippets) {
    assert.equal(block.includes(snippet), true, `Expected ${selector} to include ${snippet}`);
  }
}

describe("global UX CSS contract", () => {
  it("styles the Phase 6 UX surfaces and controls explicitly", async () => {
    const source = await readCssSource();
    const requiredSelectors = [
      ".home-value-card",
      ".lesson-flow li",
      ".home-grade-context",
      ".home-grade-chip-list",
      ".home-grade-chip",
      ".home-mixed-age-note",
      ".home-flow-detail",
      ".guidance-panel",
      ".part-row__capabilities .pill",
      ".download-panel__note",
      ".download-group__summary",
      ".download-group__summary-arrow",
      ".download-grid",
      ".part-text-section-heading",
      ".augmentation-export-status",
      ".augmentation-export-status__spinner",
      ".study-instruction"
    ];

    for (const selector of requiredSelectors) {
      assert.notEqual(source.indexOf(selector), -1, `Expected ${selector} styles`);
    }
  });

  it("keeps card and panel radii at the established 8px value", async () => {
    const source = await readCssSource();
    const radiusSelectors = [
      ".home-value-card",
      ".home-note",
      ".guidance-panel",
      ".part-step",
      ".part-text",
      ".study-card",
      ".study-source-dialog__panel",
      ".empty-state"
    ];

    for (const selector of radiusSelectors) {
      assertBlockIncludes(source, selector, ["border-radius: 8px;"]);
    }

    assert.match(
      source,
      /\.book-card,\s*\.part-row,\s*\.download-panel,\s*\.theme-sample\s*{[^}]*border-radius:\s*8px;/s
    );
  });

  it("defines keyboard focus states for form, link, and disclosure controls", async () => {
    const source = await readCssSource();
    const requiredFocusSelectors = [
      ".field input:focus-visible",
      ".field select:focus-visible",
      ".breadcrumb a:focus-visible",
      ".part-row__title:focus-visible",
      ".download-group__summary:focus-visible"
    ];

    for (const selector of requiredFocusSelectors) {
      assert.notEqual(source.indexOf(selector), -1, `Expected ${selector} focus styles`);
    }
  });

  it("keeps new UX surfaces variable-driven across the existing theme system", async () => {
    const source = await readCssSource();
    const themeSelectors = [
      '[data-theme="risaleTedris"]',
      '[data-theme="slate"]',
      '[data-theme="field"]',
      '[data-theme="ink"]',
      '[data-theme="school"]'
    ];

    for (const selector of themeSelectors) {
      assertBlockIncludes(source, selector, ["--surface:", "--surface-muted:", "--accent:", "--warn:", "--ok:"]);
    }

    assertBlockIncludes(source, ".home-value-card", ["background: var(--surface);"]);
    assertBlockIncludes(source, ".lesson-flow li", [
      "border-left: 3px solid var(--accent);",
      "background: var(--surface-muted);"
    ]);
    assertBlockIncludes(source, ".guidance-panel", ["background: var(--surface);"]);
    assertBlockIncludes(source, ".study-instruction", ["color: var(--text-muted);"]);
    assertBlockIncludes(source, ".study-status-pill--new", ["--study-status-color: #2563eb;"]);
    assertBlockIncludes(source, ".study-status-pill--learning", ["--study-status-color: #dc2626;"]);
  });

  it("supports the five-card mixed-age homepage layout", async () => {
    const source = await readCssSource();

    assertBlockIncludes(source, ".home-value-grid", ["repeat(auto-fit, minmax(190px, 1fr))"]);
    assertBlockIncludes(source, ".home-grade-context", ["display: grid;", "gap: 6px;"]);
    assertBlockIncludes(source, ".home-grade-chip-list", [
      "display: grid;",
      "repeat(auto-fit, minmax(170px, 1fr))",
      "list-style: none;"
    ]);
    assertBlockIncludes(source, ".home-grade-chip", [
      "grid-template-columns: 1fr;",
      "align-items: start;",
      "gap: 2px;",
      "border-radius: 8px;",
      "background: var(--surface);"
    ]);
    assertBlockIncludes(source, ".home-grade-chip__level", ["font-weight: 760;"]);
    assertBlockIncludes(source, ".home-grade-chip__range", ["color: var(--text-muted);"]);
    assert.doesNotMatch(source, /home-grade-chip__separator/);
    assertBlockIncludes(source, ".home-grade-line", ["overflow-wrap: break-word;"]);
    assert.doesNotMatch(source, /\.home-grade-note/);
    assertBlockIncludes(source, ".home-mixed-age-note", ["overflow-wrap: anywhere;"]);
    assertBlockIncludes(source, ".home-flow-detail", ["border: 1px solid var(--border);"]);
  });

  it("protects compact controls from long Turkish and English labels", async () => {
    const source = await readCssSource();

    assertBlockIncludes(source, ".nav a,\n.button,\n.button-secondary,\n.button-muted", [
      "overflow-wrap: break-word;",
      "word-break: normal;",
      "text-align: center;"
    ]);
    assert.match(source, /\.button-muted\s*\{[^}]*cursor: pointer;/s);
    assert.match(source, /\.button-muted:disabled,\nspan\.button-muted\s*\{[^}]*cursor: not-allowed;/s);
    assertBlockIncludes(source, ".pill", ["max-width: 100%;", "overflow-wrap: anywhere;"]);
    assertBlockIncludes(source, ".download-panel__note", ["overflow-wrap: anywhere;", "line-height: 1.5;"]);
    assertBlockIncludes(source, ".download-group__summary", ["list-style: none;"]);
    assertBlockIncludes(source, ".download-group__summary::-webkit-details-marker", ["display: none;"]);
    assertBlockIncludes(source, ".download-group__summary-label", ["min-width: 0;", "overflow-wrap: anywhere;"]);
    assertBlockIncludes(source, ".download-group__summary-arrow", [
      "flex: 0 0 auto;",
      "transition: transform 160ms ease;",
      "transform: rotate(0deg);"
    ]);
    assertBlockIncludes(source, ".download-group[open] .download-group__summary-arrow", ["transform: rotate(90deg);"]);
    assertBlockIncludes(source, ".download-grid a,\n.download-grid span", ["overflow-wrap: anywhere;"]);
    assertBlockIncludes(source, ".part-text-section-heading", ["font-size: 1.14em;", "font-weight: 800;"]);
    assertBlockIncludes(source, ".augmentation-export-status", ["display: flex;", "overflow-wrap: anywhere;"]);
    assertBlockIncludes(source, ".augmentation-export-status__spinner", ["border-top-color: var(--accent);", "animation: augmentation-export-spin 850ms linear infinite;"]);
    assertBlockIncludes(source, ".personal-augmentation-source", ["grid-column: 1;", "display: grid;", "gap: 10px;"]);
    assertBlockIncludes(source, ".personal-augmentation-downloads", ["grid-column: 2;", "grid-row: 1 / span 2;"]);
    assertBlockIncludes(source, ".study-instruction", [
      "margin: 0;",
      "overflow-wrap: anywhere;",
      "line-height: 1.55;",
      "text-align: left;"
    ]);
    assertBlockIncludes(source, ".part-row__title", ["overflow-wrap: break-word;"]);
  });

  it("keeps short homepage book actions on one line", async () => {
    const source = await readCssSource();

    assertBlockIncludes(source, ".book-card__header > div", ["min-width: 0;"]);
    assertBlockIncludes(source, ".book-card__header .button", ["flex: 0 0 auto;", "white-space: nowrap;"]);
  });

  it("lets longer school-range filter labels fit narrow toolbars", async () => {
    const source = await readCssSource();

    assertBlockIncludes(source, ".field", ["min-width: 0;"]);
    assertBlockIncludes(source, ".field label", ["overflow-wrap: anywhere;"]);
    assertBlockIncludes(source, ".field input,\n.field select", ["min-width: 0;", "overflow-wrap: break-word;"]);
  });

  it("keeps the narrow header and homepage hero from forcing horizontal scroll", async () => {
    const source = await readCssSource();

    assertBlockIncludes(source, "body", ["min-width: 0;"]);
    assertBlockIncludes(source, ".page-title", ["min-width: 0;"]);
    assertBlockIncludes(source, "h1", ["width: 100%;", "min-width: 0;", "max-width: min(840px, 100%);", "overflow-wrap: break-word;"]);
    assert.match(
      source,
      /@media \(max-width: 640px\) \{[\s\S]*\.site-actions,\s*\.nav\s*\{[\s\S]*width:\s*100%;[\s\S]*\}/
    );
    assert.match(
      source,
      /@media \(max-width: 640px\) \{[\s\S]*h1\s*\{[\s\S]*font-size:\s*1\.45rem;[\s\S]*line-height:\s*1\.18;[\s\S]*word-break:\s*break-word;[\s\S]*\}/
    );
  });

  it("keeps the flashcard answer controls reachable on phone-sized screens", async () => {
    const source = await readCssSource();

    assert.match(
      source,
      /@media \(max-width: 640px\) \{[\s\S]*\.study-shell\s*\{[\s\S]*gap:\s*10px;[\s\S]*\}/
    );
    assert.match(
      source,
      /@media \(max-width: 640px\) \{[\s\S]*\.study-card\s*\{[\s\S]*min-height:\s*clamp\(150px, 28vh, 220px\);[\s\S]*max-height:\s*30vh;[\s\S]*overflow:\s*auto;[\s\S]*\}/
    );
    assert.match(
      source,
      /@media \(max-width: 640px\) \{[\s\S]*\.study-card__text\s*\{[\s\S]*font-size:\s*clamp\(1\.05rem, 5vw, 1\.45rem\);[\s\S]*\}/
    );
    assert.match(
      source,
      /@media \(max-width: 640px\) \{[\s\S]*\.study-controls\s*\{[\s\S]*align-items:\s*flex-end;[\s\S]*\}/
    );
    assert.match(
      source,
      /@media \(max-width: 640px\) \{[\s\S]*\.study-rating-row\s*\{[\s\S]*align-items:\s*center;[\s\S]*\}/
    );
  });
});
