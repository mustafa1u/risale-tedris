# Rissor Ağ Uygulaması

Static Astro application for browsing book parts and downloading grade-specific document assets.

## Architecture

- `assets/` is the source of truth for books, grades, part text files, DOCX files, and generated PDFs.
- `scripts/generate-manifest.mjs` scans `assets/` and writes `src/data/library.generated.ts`.
- `scripts/sync-assets.mjs` mirrors `assets/` to `public/assets/` so Astro can serve downloads in dev and production builds.
- `src/config/themes.ts` contains the single `ACTIVE_THEME` variable used by the app.
- PDFs are generated ahead of time into `pdf-normal/` and `pdf-mobile-6in/` folders. The app never converts files during a download request.
- Personal augmentations are local IndexedDB projects. The static site sends only a versioned recipe to a separate export worker when the visitor requests documents.

## Commands

```bash
npm install
npm run dev
npm run test
npm run check
npm run build
```

## Personal Part Augmentation

Generate the full, lazy-loaded question bank after the Text Data Editor sources change:

```bash
npm run augmentation:import
npm run assets:sync
```

Augmentation is enabled automatically by `npm run dev`. Production builds remain gated: set `PUBLIC_AUGMENTATION_ENABLED=true` only when the catalog and export worker use compatible revisions. `PUBLIC_AUGMENTATION_EXPORT_API` defaults to the same-origin `/api/augmentation` proxy; it can point directly to a worker during local development.

`npm run dev` starts the accountless export worker, waits for `/health/ready`, and then starts Astro with a same-origin API proxy. .NET 9, QAGeneratorLib, and LibreOffice are therefore required for the complete development command. To run only the static web interface without document export, use `npm run dev:web`.

The worker can also be run separately:

```powershell
$env:QAGENERATOR_LIB_PROJECT = "C:\Users\you\source\repos\QAGeneratorLib\QAGeneratorLib.csproj"
$env:SOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
npm run augmentation:worker
```

The normal development flow does not require CORS because Astro proxies `/api/augmentation` to `AUGMENTATION_EXPORT_WORKER_URL` (default `http://127.0.0.1:5098`). Direct cross-origin calls require setting `PUBLIC_AUGMENTATION_EXPORT_API` and adding the Astro origin to `Augmentation__AllowedOrigins__0`. Production topology, limits, health checks, and proxy rules are documented in `docs/augmentation-export-deployment.md`.

## Study Deck Import

Study mode uses structured question-bank JSON instead of mobile PDFs. Import a source
`SveC_*.txt` file ahead of time, then regenerate the manifest:

```bash
npm run study:import -- --source "path/to/SveC_5sinif_sample.txt" --book kucuk-sozler --grade 5-sinif --part p02 --title "1. Soz"
npm run manifest:generate
npm run assets:sync
```

Import all exact part-level decks from the local `hazirlayici` divider output:

```bash
npm run study:import:bulk
npm run manifest:generate
npm run assets:sync
```

The bulk importer writes preselected 24-card decks to
`assets/<book>/question-bank/<grade>/<part>.json` by default. It uses the local
QAGeneratorLib project to apply the same dependency-aware flashcard selection
used by document generation, but it writes JSON instead of DOCX. The generated
manifest exposes those decks, and each part page shows a `Study Flashcards`
button below the Flashcard download buttons when imported deck JSON exists for
that grade and part.

At study time the app stays static: it fetches the already selected deck JSON,
preserves its imported order, shows the question first, reveals the answer from
the card click/tap or `Show Answer`, and keeps Anki-like ratings only for the
current session.

## PDF Generation

Generate every missing normal and mobile PDF:

```bash
npm run pdf:generate
npm run manifest:generate
npm run assets:sync
```

Generate a smaller batch while testing:

```bash
npm run pdf:generate -- --book tabiat-risalesi --grade 2-sinif --type BK --limit 1
```

Validate PDF readiness:

```bash
npm run pdf:validate
npm run pdf:validate:strict
```

`pdf:generate` auto-detects LibreOffice at `C:\Program Files\LibreOffice\program\soffice.exe` on Windows. Override paths when needed:

```bash
$env:SOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
$env:LIBREOFFICE_PYTHON = "C:\Program Files\LibreOffice\program\python.exe"
```

Mobile PDFs use a 6-inch diagonal 9:16 portrait page model with 4 mm margins.
