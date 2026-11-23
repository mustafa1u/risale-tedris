# Question, DOCX, PDF, and App-Asset Refresh Procedure

This runbook converts a reviewed source document into dependency-safe Q&A, library
data, DOCX, PDFs, study decks, and local app assets. Examples use `tabiat-risalesi`;
replace book-specific values consistently. Run stages in sequence.

## Core invariants

1. Detect dependencies on complete, unfiltered Q&A files.
2. Preserve printed question and set numbers; gaps are valid after filtering.
3. Never overwrite pre-elimination Q&A or dependency files.
4. Back up before removing generated output; resolve and verify every delete target.

Use explicit UTF-8 when reading or writing Turkish JSON:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
```

## 1. Partition and review source text

Partition the DOCX, resume until final, and validate its canonical division JSON:

```powershell
Set-Location 'C:\Users\musta\OneDrive\Belgeler\Risale 10\hazirlayici'
python divide_soz.py run --source-file 'docs\24. Söz.docx' --work-id 24SOZ --model-pass-1 gpt-4o --model-pass-2 gpt-5.4
$dividerRun = Get-Content 'build\divider_runs\24-soz\latest-run.txt'
$sourceDir = "build\divider_runs\24-soz\$dividerRun"
python divide_soz.py resume-run --run-root $sourceDir --poll-interval 20
python divide_soz.py validate --json-path "$sourceDir\24-soz.division.json"
```

Review the division JSON, combined Markdown, order of parts, individual `pNN` files,
and review report before generating Q&A.

If a reviewed partition changes after a completed run, reuse only divisions whose text
matches old text exactly after collapsing whitespace. Renumbering and line-break changes
are allowed; moved, added, removed, or merged text requires full regeneration. Create a
separate reuse tree, then compose reusable and regenerated results into a new root:

```powershell
python tools\qa_partition_revision.py prepare-reused --old-division-json "$oldSourceDir\31-soz.division.json" --new-division-json "$newSourceDir\31-soz.division.json" --source-root $oldFinalRoot --target-root "$revisionRoot\reused-unchanged-outputs" --report-dir "$revisionRoot\comparison"
python tools\qa_partition_revision.py compose --division-json "$newSourceDir\31-soz.division.json" --source "reused=$revisionRoot\reused-unchanged-outputs" --source "regenerated=$revisionRoot\changed-final-outputs" --target-root "$revisionRoot\final-merged-outputs"
```

## 2. Generate complete Q&A and dependencies

Generate every grade with neighboring division context, explicitly marking the target.
Use a complete, stable Q&A tree before dependency work.

```powershell
$book = 'tabiat-risalesi'
$qaRun = '20260724-tabiat-dependency-first-qa'
$qaRoot = "$sourceDir\outputs"
python tools\qa_dependency_first_workflow.py qa-submit --book $book --source-dir $sourceDir --output-root $qaRoot --source-code TABIAT --run-id $qaRun --model gpt-5.4
python tools\qa_dependency_first_workflow.py qa-collect --book $book --source-dir $sourceDir --output-root $qaRoot --source-code TABIAT --run-id $qaRun --model gpt-5.4 --wait --poll-interval 30

$dependencyRun = '20260724-tabiat-pre-elimination-dependencies'
python tools\qa_dependency_first_workflow.py dependency-submit --output-root $qaRoot --run-id $dependencyRun --model gpt-5-mini
python tools\qa_dependency_first_workflow.py dependency-collect --output-root $qaRoot --run-id $dependencyRun --wait --poll-interval 30
python batch_generate_soz.py validate-dependencies --output-root $qaRoot
```

Retry failed generation or dependency jobs before classification. `invalid_file_count`
must be zero. If a partial batch expires, inspect it but retry unresolved jobs; never
compensate for missing dependencies by filtering first.

## 3. Classify and eliminate with dependency closure

Classification says whether a question is target-grounded; dependency sidecars identify
its prerequisites. They are independent facts. Filtering first can hide a neighboring
prerequisite and cause an unrelated dependency match.

```powershell
$filterRun = 'build\qa-dependency-first\tabiat-risalesi\20260724-target-classification'
python tools\qa_dependency_first_workflow.py filter-submit --book $book --source-dir $sourceDir --output-root $qaRoot --run-dir $filterRun
python tools\qa_dependency_first_workflow.py filter-collect --run-dir $filterRun

$retainedRoot = 'build\qa-dependency-first\tabiat-risalesi\20260724-retained-outputs'
python tools\qa_dependency_first_workflow.py eliminate --book $book --question-root $qaRoot --filter-run-dir $filterRun --retained-output-root $retainedRoot
python batch_generate_soz.py validate-dependencies --output-root $retainedRoot
```

Retry malformed classification responses. If a response omits only decision keys and
has no extra keys, the documented repair is conservative: add `drop` decisions and
record repair metadata.

Elimination first drops off-target items, then repeatedly drops every item that directly
depends on something dropped. It writes retained Q&A and pruned sidecars in a new root,
plus audit reports. It does not renumber IDs or alter the pre-elimination tree.

Run the post-elimination quality audit:

```powershell
$qualityRoot = 'build\qa-dependency-first\tabiat-risalesi\20260725-quality-review'
python tools\qa_dependency_first_workflow.py quality-audit --book $book --source-dir $sourceDir --question-root $qaRoot --retained-output-root $retainedRoot --report-dir "$qualityRoot\initial-audit"
```

Rule 1: regenerate a grade/division if its smallest retained set count (including zero
sets) is less than source-word-count divided by 36. For that pair, perform at most three
complete cycles: Q&A, dependencies, classification, and elimination. If all fail,
select the nonempty candidate with smallest `(max - min) / min`; ties prefer more
retained questions, then stable path.

Rule 2: after Rule 1, if that spread exceeds 0.20, run three fresh classification and
elimination attempts, then select using the same tie-breaker. Record selections without
copying. After review approval, merge originals and winners into a new final tree,
copying matching sidecars and rewriting their source paths. Completion requires valid
classifications, equal Q&A/sidecar counts by grade, valid sidecars, and recorded quality
decisions. `tools\Invoke-QaWorkflow.ps1` can safely resume a run using the same work
root and tag.

## 4. Refresh `sourceLib`

Copy the final retained tree to the active TextDataEditor library. Confirm source and
target counts and the target dependency layout first.

```powershell
$editorRepo = 'C:\Users\musta\source\repos\TextDataEditor'
$sourceOutputs = $retainedRoot
$libraryOutputs = Join-Path $editorRepo 'sourceLib\data\Lemalar\tabiat-risalesi\outputs'
$grades = @('2-sinif','5-sinif','8-sinif','11-sinif','lisans')
foreach ($grade in $grades) {
  $dstGrade = Join-Path $libraryOutputs $grade
  $dstDeps = Join-Path $libraryOutputs "_dependencies\$grade"
  New-Item -ItemType Directory -Force -Path $dstGrade,$dstDeps | Out-Null
  Get-ChildItem (Join-Path $sourceOutputs $grade) -File -Filter 'SveC_*.txt' | ForEach-Object { Copy-Item $_.FullName $dstGrade -Force }
  Get-ChildItem (Join-Path $sourceOutputs "_dependencies\$grade") -File -Filter '*.dependencies.json' | ForEach-Object { Copy-Item $_.FullName $dstDeps -Force }
}
```

Some targets need sidecars beside question files rather than under `_dependencies`; use
the target's configured layout. Never pair Q&A with sidecars from a different revision.
If names changed, update chapter and part manifests. A new book also needs its book
manifest and one `books.json` entry with ordered chapters before **Open from Library**
will show it.

Recompute every relevant part checksum from its exact `sourceFile`, then validate
manifest paths and checksums. Hash-check copied source and destination files, and load
every Q&A/sidecar pair through the same settings as **Open from Library**. Missing IDs,
duplicates, cross-set dependencies, and cycles block DOCX generation.

## 5. Configure, pilot, and generate DOCX/SEL

Configure the book in
`artifacts\KucukSozlerBatchGenerate\Program.cs` (book ID, display name, source root,
output root, and sidecar layout), then build and pilot:

```powershell
Set-Location $editorRepo
dotnet build artifacts\KucukSozlerBatchGenerate\KucukSozlerBatchGenerate.csproj --no-restore
dotnet run --project artifacts\KucukSozlerBatchGenerate\KucukSozlerBatchGenerate.csproj --no-build -- --pilot-count 2 --book $book
```

Review all pilot types. Always redistribute before sheets: six sets when total questions
are at most 60, otherwise integer `(total / 10) + 1`; use the first six sets. Create
`SEL_` after redistribution. Select up to 24 dependency-aware cards, used identically
by normal and mobile flashcards.

Back up `C:\<book>` as `backup-old-<timestamp>` before cleanup. Clean only resolved
grade folders below that root; preserve backups, `parcalar`, and other top-level data.
Then generate the full batch:

```powershell
dotnet run --project artifacts\KucukSozlerBatchGenerate\KucukSozlerBatchGenerate.csproj --no-build -- --all --book $book
```

Each division must produce two standard DOCX (`SK_`, `BK_`), two mobile DOCX (`SK6_`,
`BK6_`), and one `SEL_` JSON. `SK6_` is A5 portrait and `BK6_` A7 landscape; both use
720-twip margins. Inspect `generated-files.txt` and a mobile DOCX package before moving
on. Use `--targets sk,sk6,json` for a constrained retry.

## 6. Generate PDFs and sync DOCX/PDF assets

In `C:\dev\rissor-ag-github-initial`, count DOCX source files in `C:\<book>\<grade>` and `mobile`.
Ignore backup folders. Remove only PDFs from resolved folders below
`assets\<book>\<grade>\pdf-normal` and `pdf-mobile-6in`, then generate per book:

```powershell
Set-Location 'C:\dev\rissor-ag-github-initial'
npm run pdf:generate -- --book $book --docx-root C:\ --mode all --force
npm run pdf:generate -- --book $book --grade 2-sinif --docx-root C:\ --mode all --limit 2 --force
```

The second command is an optional smoke test. LibreOffice normally resides at
`C:\Program Files\LibreOffice\program\soffice.exe`; set `$env:SOFFICE_PATH` if needed.

Mirror `pdf-normal` and `pdf-mobile-6in` from `assets` to `public\assets`, pruning
destination-only PDF names after confirming paths remain under their asset roots. Sync
normal and mobile DOCX similarly to both `assets` and `public\assets`; prune stale
destination DOCX and the legacy `mobile\docx` folder only after path verification.

## 7. Regenerate study decks and finalize

Import decks from the generated `SEL_` files so browser cards exactly match flashcard
documents and their order, then mirror the question bank to public assets:

```powershell
npm run study:import:bulk -- --source-root "C:\$book" --assets-root assets --report "build\study-import-$book-sel-report.json"
Copy-Item "assets\$book\question-bank" "public\assets\$book" -Recurse -Force
npm run manifest:generate
npm run pdf:validate
npm test
```

Affected deck JSON should state `selection.source: SEL`; a deck can contain fewer than
24 cards only when its `SEL_` file selected fewer. Run `npm run build` if app code
changed. Generated DOCX, PDF, and public assets are normally ignored; stage only tracked
metadata, source data, scripts, and code:

```powershell
git add -A
git status --short
git diff --cached --stat
```

If Word locks a DOCX, close it and rerun only needed targets. If a PDF conversion is
partial, rerun with `--force`, prune after naming changes, and run `pdf:validate`. If
`npm run refresh` hangs, stop only verified project refresh Node processes and use the
targeted sync steps above; do not stop unrelated processes.
