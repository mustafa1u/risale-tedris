# Development Pipeline Improvement Plan

## Goal

Make local development fast even as more books and generated documents are added, while keeping the deployed website static, simple, and fast.

## Status

- Phase 1 implemented: `npm run dev` starts Astro directly without `predev`.
- Phase 2 implemented: build/deploy still runs asset sync, manifest generation, and PDF validation.
- Phase 3 implemented: `assets:sync` is now incremental.
- Phase 4 remains optional for local development if asset work is still too slow.
- Phase 5 implemented: generated library data is split into a small index plus per-book modules.
- Phase 6 implemented: per-deck study pages were replaced with a static study shell.

## Original Problem

`npm run dev` used to run the full asset preparation path before Astro started. The expensive part was `assets:sync`, which deleted and recopied the whole `assets` tree into `public/assets`.

That meant a small UI or text change still paid the cost of copying thousands of PDF, Word, and text files. This cost would grow as new books were added.

## Phase 1: Make Dev Startup Immediate

Status: implemented.

Remove the automatic `predev` step.

Recommended scripts:

```json
"dev": "astro dev --host 127.0.0.1",
"refresh": "npm run assets:sync && npm run manifest:generate"
```

Reasoning:

- Most UI, styling, i18n, and routing changes do not require recopying assets.
- Developers should be able to start the app immediately.
- Asset refresh should be explicit when files are added, removed, renamed, or regenerated.

Tradeoff:

- After changing assets, the developer must run `npm run refresh`.

## Phase 2: Keep Full Validation for Build and Deploy

Status: implemented.

Keep the heavier checks in the build path.

Recommended scripts:

```json
"prebuild": "npm run assets:sync && npm run manifest:generate && npm run pdf:validate",
"build": "astro build"
```

Reasoning:

- Build/deploy should remain strict.
- Missing PDFs or stale generated data should be caught before deployment.
- Local dev should stay fast, but production output should remain reliable.

Tradeoff:

- Build remains slower than dev, which is acceptable because it is less frequent and higher stakes.

## Phase 3: Replace Full Asset Copy with Incremental Sync

Status: implemented.

Change `scripts/sync-assets.mjs` so it copies only changed files and removes only obsolete files.

Reasoning:

- The old sync deleted `public/assets` and copied everything again.
- Incremental sync scales much better with thousands of files.
- This improves both manual refresh and build/deploy time.

Tradeoff:

- The script becomes more complex and needs careful handling for deletions.

## Phase 4: Consider a Local Dev Junction for Assets

Status: optional, not implemented.

For Windows local development, `public/assets` can point directly to `assets` through a directory junction.

Reasoning:

- This avoids copying assets during local development.
- It keeps the browser URL shape unchanged.
- It is especially useful while the asset library is large and mostly static.

Tradeoff:

- Junctions are OS-specific.
- Build/deploy should still use real copied assets, not rely only on the junction.

## Phase 5: Split Generated Library Data by Book

Status: implemented.

Refactor generated data from one large `library.generated.ts` file into a smaller index plus per-book generated files.

Possible shape:

```text
src/data/library.generated.ts
src/data/books/ayetul-kubra.generated.ts
src/data/books/kucuk-sozler.generated.ts
src/data/books/meyve-risalesi.generated.ts
src/data/books/tabiat-risalesi.generated.ts
```

Slices:

- `[X]` Slice 5.1: Change `scripts/generate-manifest.mjs` to emit one per-book generated module and a small `library.generated.ts` index.
- `[X]` Slice 5.2: Add generated index metadata that is cheap to import: global stats plus book summaries with slug, title, source path, grade stats, part count, study deck count, and static route metadata.
- `[X]` Slice 5.3: Add generated data-access helpers for loading one book by slug and, when needed, loading the full library.
- `[X]` Slice 5.4: Update the homepage to use the small generated index where full part/download/deck data is not needed.
- `[X]` Slice 5.5: Update book, part, and study route generation/rendering to use index route metadata and load only the relevant per-book data.
- `[X]` Slice 5.6: Add regression tests for generated file shape, book summary counts, per-book modules, and route metadata coverage.
- `[X]` Slice 5.7: Run `npm run manifest:generate`, focused tests, `npm test`, `npm run check`, `npm run build`, and `npm run smoke:html`.
- `[X]` Slice 5.8: Record the migration and verification notes in `ilerleme.md`.

Reasoning:

- More books will make one generated file increasingly large.
- Book pages should only need their own book data.
- This structure is better for future features such as custom document generation, per-book search, and extra tabs/functions.

Tradeoff:

- Static build still has to render every generated route, so build remains much slower than dev.
- The generated index intentionally carries lightweight route metadata for parts and study decks; full download payloads live only in per-book modules.

Verification notes:

- `npm run manifest:generate` generated `src/data/library.generated.ts` and 4 per-book modules.
- The generated index is about 224 KB and no longer contains full `"downloads"` payloads; full per-book generated modules hold the heavy book data.
- `node --test src\data\library.generated.test.mjs src\features\library\libraryHome.test.mjs` passed: 2 suites and 6 tests.
- `npm test` passed: 19 suites and 86 tests.
- `npm run check` passed: 0 errors, 0 warnings, 0 hints.
- First `npm run build` attempt timed out at 240 seconds after asset sync, manifest generation, and PDF validation had passed.
- Re-run `npm run build` with a longer timeout passed: 3864 pages built, with 6420/6420 PDFs validated.
- `npm run smoke:html` passed after the fresh build.

## Phase 6: Reduce Static Route Volume

Status: implemented.

Reduce build time by avoiding full static HTML generation for routes that can be represented by a smaller shell plus client-loaded data, while keeping the public site static, simple, and fast.

Primary target:

- Study pages currently dominate route count: 1605 study decks per locale, or about 3210 generated study pages.
- Most study pages render the same interactive shell and differ mainly by book, grade, part, and deck JSON URL.
- Book and part pages should remain static first because they contain source text, download links, and discovery/navigation content.

Slices:

- `[X]` Slice 6.1: Add a route-volume report that counts generated routes by family: homepage/theme, book pages, part pages, study pages, and locale duplication.
- `[X]` Slice 6.2: Add a build-time timing note or script output that separates prebuild time, Astro static entrypoint time, and static route generation time.
- `[X]` Slice 6.3: Decide the study-route model before coding: keep all study routes static, move study to one static query/hash route, or use adapter-backed on-demand rendering for study only.
- `[X]` Slice 6.4: If keeping the site fully static, design a single study shell route such as `/study/` or `/books/study/` that loads deck metadata from query parameters and existing JSON assets.
- `[X]` Slice 6.5: Update part-page Study links through the existing `studyDeckPath` helper so the route shape can change in one place.
- `[X]` Slice 6.6: Add tests for study routing compatibility: URL generation, parameter parsing, missing deck behavior, localized labels, and no broken Study links from part pages.
- `[X]` Slice 6.7: Preserve or intentionally redirect old study URLs. For static Netlify deploys, evaluate a wildcard redirect from `/books/:bookSlug/study/:gradeSlug/:partNo/` and `/en/books/:bookSlug/study/:gradeSlug/:partNo/` to the new shell route.
- `[X]` Slice 6.8: Refactor `StudyPage` so the static shell can initialize from route/query data and fetch the selected deck without requiring one generated Astro page per deck.
- `[X]` Slice 6.9: Keep accessibility and no-JavaScript expectations explicit: if study becomes JS-required, show a useful static fallback with the selected deck title and source/download links where possible.
- `[X]` Slice 6.10: Re-run focused study routing/client tests, `npm test`, `npm run check`, `npm run build`, and `npm run smoke:html`; compare page count and build time against the Phase 5 baseline.
- `[X]` Slice 6.11: Record the route-count change, build-time result, tradeoffs, and any redirected URL behavior in `ilerleme.md`.

Implementation notes:

- The selected model keeps the site static and replaces per-deck Astro study pages with `/study/` and `/en/study/`.
- Study deck selection now uses query parameters: `/study/?book=<bookSlug>&grade=<gradeSlug>&part=<partNo>`.
- A compact generated study index is emitted at `src/data/study-index.generated.json` and exposed as `/assets/study-index.generated.json`.
- Legacy study URLs are redirected through `public/_redirects` to the new shell route.

Acceptance checks:

- `[X]` Build output page count drops substantially, eliminating per-deck study HTML pages.
- `[X]` Book and part pages remain static and keep their current URLs.
- `[X]` Study links from part pages still open the correct deck in Turkish and English.
- `[X]` Existing deck JSON assets remain cacheable static files under `/assets/...`.
- `[X]` Static deploy remains viable; no server runtime or adapter was added.
- `[X]` The measured build time improves enough to justify the route-model change.

Verification notes:

- `npm run routes:report`: Phase 5 baseline was 3864 HTML pages; Phase 6 estimates 656 HTML pages plus 1 JSON output, removing 3208 study HTML pages.
- `npm test` passed: 20 suites and 98 tests.
- `npm run check` passed: 0 errors, 0 warnings, 0 hints.
- `npm run build:timed` passed: 656 pages built; total timed pipeline 339.27 seconds, including assets sync 7.73s, manifest generation 3.20s, PDF validation 3.25s, and Astro build 325.09s.
- Astro's internal build output reported static entrypoints in 184.14s and static route generation in 9.82s.
- `npm run smoke:html` passed after the fresh build.

Tradeoff:

- A single study shell is more client-driven than the current per-deck static pages.
- Preserving old per-deck study URLs may require Netlify redirect rules or temporary compatibility pages.
- On-demand rendering would reduce build work but would move the site away from pure static hosting for those routes.

## Recommended Bundle

Phases 1, 2, 3, 5, and 6 have been implemented.

Use phase 4 if local asset work remains slow after incremental sync.

For the next wave of books, use `npm run refresh` after adding assets and confirm the generated per-book module appears under `src/data/books/`.
