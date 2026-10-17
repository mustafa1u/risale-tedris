param(
    [string]$FinalRoot = 'C:\Users\musta\OneDrive\Belgeler\Risale 10\hazirlayici\build\qa-dependency-first\supreme-sign\20261016-american-english\final-merged-outputs',
    [string]$EditorRepo = 'C:\Users\musta\source\repos\TextDataEditor'
)

$ErrorActionPreference = 'Stop'
$bookId = 'supreme-sign'
$title = 'Supreme Sign'
$grades = @('2-sinif','5-sinif','8-sinif','11-sinif','lisans')
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$stamp = [DateTime]::UtcNow.ToString('o')
$target = Join-Path $EditorRepo "sourceLib\data\Words\$bookId\outputs"

foreach ($grade in $grades) {
    $sourceGrade = Join-Path $FinalRoot $grade
    $sourceDeps = Join-Path $FinalRoot "_dependencies\$grade"
    if (@(Get-ChildItem -LiteralPath $sourceGrade -File -Filter 'SveC_*.txt').Count -ne 116) { throw "Expected 116 Q&A files in $sourceGrade" }
    if (@(Get-ChildItem -LiteralPath $sourceDeps -File -Filter '*.dependencies.json').Count -ne 116) { throw "Expected 116 dependency files in $sourceDeps" }
    $targetGrade = Join-Path $target $grade
    $targetDeps = Join-Path $target "_dependencies\$grade"
    New-Item -ItemType Directory -Force -Path $targetGrade,$targetDeps | Out-Null
    Get-ChildItem -LiteralPath $sourceGrade -File -Filter 'SveC_*.txt' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $targetGrade -Force }
    Get-ChildItem -LiteralPath $sourceDeps -File -Filter '*.dependencies.json' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $targetDeps -Force }
}

$chapters = @()
foreach ($grade in $grades) {
    $chapterId = "ch-$bookId-$grade"
    $parts = @()
    $index = 0
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $target $grade) -File -Filter 'SveC_*.txt' | Sort-Object Name) {
        $index++
        $partId = '{0}-part-{1:d3}' -f $chapterId,$index
        $parts += $partId
        $relative = "sourceLib/data/Words/$bookId/outputs/$grade/$($file.Name)"
        $part = [ordered]@{
            schemaVersion = 1; partId = $partId; chapterId = $chapterId; sourceFile = $relative; fileType = 'txt'
            import = [ordered]@{ questionMarker = 'S: '; answerMarker = 'C: '; wordForWords = 'word(s)'; includeHints = $false; setOfQuestions = $true; setString = 'Set - ' }
            checksumSha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash; updatedAtUtc = $stamp
        }
        [System.IO.File]::WriteAllText((Join-Path $EditorRepo "sourceLib\parts\$partId.json"), ($part | ConvertTo-Json -Depth 10), $utf8NoBom)
    }
    $chapter = [ordered]@{
        schemaVersion = 1; chapterId = $chapterId; bookId = $bookId; title = (($grade -replace '2-sinif','2nd Grade' -replace '5-sinif','5th Grade' -replace '8-sinif','8th Grade' -replace '11-sinif','11th Grade' -replace 'lisans','College') + ' - ' + $title)
        configProfile = 'ENG'; setPolicy = [ordered]@{ mode = 'ForceSetsOf10'; setPrefix = 'Set - ' }; partOrder = $parts; updatedAtUtc = $stamp
    }
    [System.IO.File]::WriteAllText((Join-Path $EditorRepo "sourceLib\chapters\$chapterId.json"), ($chapter | ConvertTo-Json -Depth 10), $utf8NoBom)
    $chapters += $chapterId
}

$book = [ordered]@{ schemaVersion = 1; bookId = $bookId; title = $title; language = 'ENG'; chapterOrder = $chapters; updatedAtUtc = $stamp }
$bookDir = Join-Path $EditorRepo "sourceLib\books\$bookId"
New-Item -ItemType Directory -Force -Path $bookDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $bookDir 'book.json'), ($book | ConvertTo-Json -Depth 10), $utf8NoBom)

$booksPath = Join-Path $EditorRepo 'sourceLib\books.json'
$index = [System.IO.File]::ReadAllText($booksPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
$index.books = @($index.books | Where-Object { $_.bookId -ne $bookId }) + [pscustomobject]$book
[System.IO.File]::WriteAllText($booksPath, ($index | ConvertTo-Json -Depth 20), $utf8NoBom)

$program = Join-Path $EditorRepo 'artifacts\KucukSozlerBatchGenerate\Program.cs'
$text = [System.IO.File]::ReadAllText($program, [Text.Encoding]::UTF8)
if ($text -notmatch 'BookId: "supreme-sign"') {
    $shortWordsId = $text.IndexOf('BookId: "short-words",', [StringComparison]::Ordinal)
    if ($shortWordsId -lt 0) { throw 'Could not find Short Words generator configuration.' }
    $insertAt = $text.LastIndexOf('    new BookConfig(', $shortWordsId, [StringComparison]::Ordinal)
    if ($insertAt -lt 0) { throw 'Could not find the Short Words BookConfig start.' }
    $config = '    new BookConfig(' + [Environment]::NewLine + '        BookId: "supreme-sign",' + [Environment]::NewLine + '        DisplayName: "Supreme Sign",' + [Environment]::NewLine + '        SourceRoot: Path.Combine(repoRoot, "sourceLib", "data", "Words", "supreme-sign", "outputs"),' + [Environment]::NewLine + '        OutputRoot: @"C:\supreme-sign",' + [Environment]::NewLine + '        DependencyLayout: DependencyLayout.OutputDependencies),' + [Environment]::NewLine
    [System.IO.File]::WriteAllText($program, $text.Insert($insertAt, $config), $utf8NoBom)
}

[pscustomobject]@{ Book=$bookId; QandA=580; Dependencies=580; Parts=580; Chapters=5; Target=$target } | ConvertTo-Json
