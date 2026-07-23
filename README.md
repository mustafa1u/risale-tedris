# Rissor Ağ Uygulaması

Static Astro application for browsing book parts and downloading grade-specific document assets.

## Architecture

- `assets/` is the source of truth for books, grades, part text files, DOCX files, and generated PDFs.
- `scripts/generate-manifest.mjs` scans `assets/` and writes `src/data/library.generated.ts`.
- `scripts/sync-assets.mjs` mirrors `assets/` to `public/assets/` so Astro can serve downloads in dev and production builds.
- `src/config/themes.ts` contains the single `ACTIVE_THEME` variable used by the app.
- PDFs are generated ahead of time into `pdf-normal/` and `pdf-mobile-6in/` folders. The app never converts files during a download request.
- Personal augmentations are local IndexedDB projects. The static site sends only a versioned recipe to a separate export worker when the visitor requests documents.

## Fresh Clone Setup

### Choose the required mode

| Capability | Required software and data |
| --- | --- |
| Browse the static site, search, study, and download existing files | Git, a supported Node.js LTS release, npm, and the complete `assets/` directory |
| Run `Belgeleri hazırla` locally | Everything above, plus the .NET 9 SDK and LibreOffice; the compiled QAGeneratorLib package is included in this repository |
| Generate or regenerate PDFs | Everything in the static mode, plus LibreOffice |
| Run browser tests locally | Everything in the static mode, plus Google Chrome |

### Install prerequisites

Install:

1. [Git](https://git-scm.com/downloads).
2. [Node.js](https://nodejs.org/en/download) 22 LTS or a newer supported LTS release. npm is included with Node.js.
   - Astro currently accepts Node `18.20.8`, `20.3+`, or `22+`, but Node 18 and 20 are no longer recommended for a new machine.
   - This checkout was last verified with Node `20.20.0` and npm `10.8.2`; Node 22 LTS is the conservative supported choice for a fresh installation.
3. For the complete augmentation workflow, install the [.NET 9 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0), not only the runtime. The worker projects target `net9.0`.
4. For document conversion or generation, install [LibreOffice](https://www.libreoffice.org/download/download-libreoffice/).

Verify the command-line tools in a new terminal:

```powershell
git --version
node --version
npm --version
dotnet --version
& "C:\Program Files\LibreOffice\program\soffice.exe" --version
```

Only `git`, `node`, and `npm` are required for the static-only mode.

### Clone and install JavaScript dependencies

```powershell
git clone <rissor-ag-repository-url>
cd rissor-ag
npm ci
```

Use `npm ci` for a fresh clone so `package-lock.json` is installed exactly. Use `npm install` only when intentionally changing dependencies.

### Restore the asset bundle

The repository does not carry the large generated document collection in Git. Obtain a version-matched ZIP containing the complete `assets/` directory and extract it into the repository root.

The resulting paths must look like this:

```text
<project>/
  assets/
    augmentation-catalog.json
    ayetul-kubra/
      book.json
      part-labels.json
      parcalar/
      question-bank/
      augmentation-bank/
      2-sinif/
        docx/
        pdf-normal/
        pdf-mobile-6in/
      ...
    kucuk-sozler/
    meyve-risalesi/
    tabiat-risalesi/
```

Avoid an accidental extra directory such as `<project>/assets/assets/...`.

After extraction, generate the application data and public download mirror:

```powershell
npm run refresh
```

`npm run refresh` copies `assets/` to the ignored `public/assets/` directory, regenerates the lightweight TypeScript library data, study index, and hashed search assets. Do not distribute or manually maintain a separate `public/assets/` ZIP.

Validate a supposedly complete document bundle with:

```powershell
npm run pdf:validate:strict
```

If the archive omits DOCX or PDF files, the site can still display the available text and metadata, but the corresponding download actions will be unavailable and strict validation will fail. The asset archive should come from the same application/catalog revision; a stale augmentation catalog or bank can be rejected by the export worker.

### Run the static web application

```powershell
npm run dev:web
```

Open the URL printed by Astro, normally `http://127.0.0.1:4321/`. Search is automatically enabled in development. The augmentation interface is visible, but `Belgeleri hazırla` needs either the local worker described below or an explicitly configured compatible remote worker.

### Run the complete local application

QAGeneratorLib source code is not required. Version `4.1.13` is committed as `packages/QAGeneratorLib.4.1.13.nupkg`, and the root `NuGet.config` makes that repository-local feed available to both .NET consumers. `dotnet restore`, which is invoked automatically by `dotnet run`, restores QAGeneratorLib from this package and its declared third-party dependencies from NuGet.org.

```powershell
$env:SOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
npm run dev
```

`npm run dev` starts the .NET 9 worker on `http://127.0.0.1:5098`, waits for `/health/ready`, then starts Astro with a same-origin `/api/augmentation` proxy. `SOFFICE_PATH` applies to the current PowerShell session and must be set again in a new session unless configured permanently. If LibreOffice is installed at the standard Windows path, the worker detects it automatically and the variable may be omitted.

Developers actively modifying QAGeneratorLib can still override the compiled package explicitly:

```powershell
$env:QAGENERATOR_LIB_PROJECT = "C:\path\to\QAGeneratorLib.csproj"
npm run dev
```

When this variable is unset, no QAGeneratorSolution checkout or user-specific source path is used.

On Linux or macOS, LibreOffice is normally discovered from `PATH`:

```bash
export SOFFICE_PATH="$(command -v soffice)"
npm run dev
```

For a standard macOS application install, `SOFFICE_PATH` is usually `/Applications/LibreOffice.app/Contents/MacOS/soffice`.

### Build, test, and preview

```powershell
npm run refresh
npm test
npm run check
npm run build
npm run preview
```

The production build automatically runs asset synchronization, manifest generation, and PDF validation through `prebuild`.

Local browser tests use installed Google Chrome:

```powershell
npm run test:browser
```

In CI, install Playwright Chromium first:

```powershell
npx playwright install chromium
```

## Common Commands

```bash
npm ci
npm run refresh
npm run dev
npm run dev:web
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

`npm run dev` starts the accountless export worker, waits for `/health/ready`, and then starts Astro with a same-origin API proxy. The .NET 9 SDK, LibreOffice, and the repository-local QAGeneratorLib package are therefore required for the complete development command. The package is already part of the clone; no QAGeneratorSolution source checkout is needed. To run only the static web interface without document export, use `npm run dev:web`.

The worker can also be run separately:

```powershell
$env:SOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
npm run augmentation:worker
```

Set `QAGENERATOR_LIB_PROJECT` only when intentionally testing against a local QAGeneratorLib source checkout.

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
QAGeneratorLib package to apply the same dependency-aware flashcard selection
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
