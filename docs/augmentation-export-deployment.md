# Augmentation Export Worker Deployment

## Boundary

The Astro site remains static. Personal recipes and generated study snapshots stay in the visitor's IndexedDB. Document generation is the only server operation: the browser sends a compact versioned recipe, and the worker reloads the canonical augmentation bank, recomputes the result, invokes QAGeneratorLib, and converts DOCX files with LibreOffice.

Do not run LibreOffice in a Netlify Function. Route `/api/augmentation/*` through a same-origin reverse proxy to the long-running ASP.NET Core worker, or configure the worker's exact CORS origin and set `PUBLIC_AUGMENTATION_EXPORT_API` to its HTTPS URL.

## Runtime prerequisites

- .NET 9 runtime/SDK
- Repository-local `QAGeneratorLib` NuGet package available at build time
- LibreOffice and the fonts used by the documents
- Read-only access to the exact `assets/augmentation-catalog.json` and augmentation-bank revision deployed with the site
- A writable, ephemeral job directory

The default build restores compiled QAGeneratorLib from `packages/QAGeneratorLib.4.1.13.nupkg` through the root `NuGet.config`; no QAGeneratorSolution source checkout is required. Set `QAGENERATOR_LIB_PROJECT` (or the MSBuild property `QAGeneratorLibProject`) only to override the package while developing QAGeneratorLib itself. Set `SOFFICE_PATH` when LibreOffice is not on `PATH`.

## Configuration

ASP.NET Core environment-variable names use double underscores:

```text
Augmentation__AssetsRoot=/srv/rissor/assets
Augmentation__JobRoot=/srv/rissor/jobs
Augmentation__SofficePath=/usr/bin/soffice
Augmentation__AllowedOrigins__0=https://example.org
```

The first release uses an in-memory bounded queue and status registry. Run one worker replica with a private job root. Startup removes orphaned directories because their in-memory job tokens cannot be recovered. Horizontal scaling requires replacing both queue/status storage and artifact storage with shared durable services; merely adding replicas would make polling nondeterministic.

## Endpoints and operations

- `GET /health/live`: process liveness
- `GET /health/ready`: catalog and LibreOffice readiness
- `POST /api/augmentation/exports`: validate and enqueue a recipe; fixed-window limit is five creates per minute per ASP.NET partition
- `GET /api/augmentation/exports/{token}`: poll state
- `DELETE /api/augmentation/exports/{token}`: cancel queued/running work
- `GET /api/augmentation/exports/{token}/artifacts/{name}`: download a ready artifact

Terminate TLS at the proxy. Keep the worker private when using a same-origin proxy. Preserve request-size limits at the proxy, add an IP-aware outer rate limit, and do not log request bodies because titles may be personal. Worker logs contain job IDs and failures, not questions or answers.

Ready artifacts expire after one hour. Failed job metadata expires after fifteen minutes. Cancellation deletes partial files, periodic cleanup removes expired files, and startup removes files left by a terminated process.

## Release gate

1. Run `npm run augmentation:import` and deploy the resulting catalog/bank.
2. Run both .NET test harnesses.
3. Start the worker and verify `/health/ready`.
4. Submit a two-part, one-grade pilot; require six downloadable artifacts.
5. Validate DOCX ZIP structure and the `%PDF-` headers; inspect page layout on the target LibreOffice image.
6. Set the static site's `PUBLIC_AUGMENTATION_EXPORT_API`.
7. Enable `PUBLIC_AUGMENTATION_ENABLED=true` only after the worker and static catalog revisions match.

Pin the LibreOffice container/VM image and fonts for repeatable layout. PDF byte equality across operating systems is not a valid release assertion; use structural checks plus a representative visual/page-layout pilot.
