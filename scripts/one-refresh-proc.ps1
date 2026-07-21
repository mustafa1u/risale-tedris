$ErrorActionPreference = "Stop"

$repo = "C:\dev\rissor-ag"
$procedureTimeoutSeconds = 7200
$buildTimeoutSeconds = 7200

Set-Location $repo

function Run-JobWithTimeout {
  param(
    [Parameter(Mandatory = $true)] [string] $Name,
    [Parameter(Mandatory = $true)] [scriptblock] $Script,
    [Parameter(Mandatory = $true)] [int] $TimeoutSeconds
  )

  Write-Host ""
  Write-Host "===== START: $Name ====="
  Write-Host "Timeout: $TimeoutSeconds seconds"
  Write-Host ""

  $job = Start-Job -Name $Name -ScriptBlock $Script
  $finished = Wait-Job $job -Timeout $TimeoutSeconds

  Receive-Job $job

  if (-not $finished) {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    throw "$Name timed out after $TimeoutSeconds seconds."
  }

  if ($job.State -ne "Completed") {
    $state = $job.State
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    throw "$Name failed. Job state: $state"
  }

  Remove-Job $job -Force
  Write-Host ""
  Write-Host "===== DONE: $Name ====="
}

$procedure = {
  $ErrorActionPreference = "Stop"

  Set-Location "C:\dev\rissor-ag"

  $books = @("ayetul-kubra", "kucuk-sozler", "meyve-risalesi", "tabiat-risalesi")
  $grades = @("2-sinif", "5-sinif", "8-sinif", "11-sinif", "lisans")
  $workspace = (Resolve-Path ".").Path
  $assetsRoot = Join-Path $workspace "assets"
  $publicAssets = Join-Path $workspace "public\assets"

  if (-not (Test-Path -LiteralPath "C:\Program Files\LibreOffice\program\soffice.exe")) {
    throw "LibreOffice not found at C:\Program Files\LibreOffice\program\soffice.exe"
  }

  $env:SOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"

  Write-Host "Inspecting source DOCX counts..."
  foreach ($book in $books) {
    foreach ($grade in $grades) {
      $normal = (Get-ChildItem -LiteralPath "C:\$book\$grade" -File -Filter *.docx -ErrorAction SilentlyContinue).Count
      $mobile = (Get-ChildItem -LiteralPath "C:\$book\$grade\mobile" -File -Filter *.docx -ErrorAction SilentlyContinue).Count
      [pscustomobject]@{
        Book = $book
        Grade = $grade
        NormalDocx = $normal
        MobileDocx = $mobile
      }
    }
  }

  Write-Host "Clearing old generated PDFs under assets..."
  foreach ($book in $books) {
    foreach ($grade in $grades) {
      foreach ($folder in @("pdf-normal", "pdf-mobile-6in")) {
        $target = Join-Path $assetsRoot (Join-Path (Join-Path $book $grade) $folder)
        if (Test-Path -LiteralPath $target) {
          $resolved = (Resolve-Path -LiteralPath $target).Path
          if (-not $resolved.StartsWith($assetsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to delete outside assets: $resolved"
          }
          Get-ChildItem -LiteralPath $resolved -File -Filter *.pdf -ErrorAction SilentlyContinue |
            Remove-Item -Force
        }
      }
    }
  }

  Write-Host "Generating PDFs from renewed DOCX folders..."
  foreach ($book in $books) {
    Write-Host "Generating PDFs for $book..."
    npm run pdf:generate -- --book $book --docx-root C:\ --mode all --force
    if ($LASTEXITCODE -ne 0) { throw "PDF generation failed for $book" }
  }

  Write-Host "Syncing generated PDFs to public/assets..."
  foreach ($book in $books) {
    foreach ($grade in $grades) {
      foreach ($folder in @("pdf-normal", "pdf-mobile-6in")) {
        $srcDir = Join-Path $assetsRoot (Join-Path (Join-Path $book $grade) $folder)
        $dstDir = Join-Path $publicAssets (Join-Path (Join-Path $book $grade) $folder)
        if (-not (Test-Path -LiteralPath $srcDir)) { continue }

        $srcResolved = (Resolve-Path -LiteralPath $srcDir).Path
        if (-not $srcResolved.StartsWith($assetsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
          throw "Source outside assets: $srcResolved"
        }

        if (-not (Test-Path -LiteralPath $dstDir)) {
          New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }

        $dstResolved = (Resolve-Path -LiteralPath $dstDir).Path
        if (-not $dstResolved.StartsWith($publicAssets, [System.StringComparison]::OrdinalIgnoreCase)) {
          throw "Destination outside public assets: $dstResolved"
        }

        $srcNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        Get-ChildItem -LiteralPath $srcResolved -File -Filter *.pdf |
          ForEach-Object { $srcNames.Add($_.Name) | Out-Null }

        foreach ($old in Get-ChildItem -LiteralPath $dstResolved -File -Filter *.pdf -ErrorAction SilentlyContinue) {
          if (-not $srcNames.Contains($old.Name)) {
            Remove-Item -LiteralPath $old.FullName -Force
          }
        }

        foreach ($src in Get-ChildItem -LiteralPath $srcResolved -File -Filter *.pdf) {
          Copy-Item -LiteralPath $src.FullName -Destination (Join-Path $dstResolved $src.Name) -Force
        }
      }
    }
  }

  Write-Host "Syncing renewed DOCX files into assets and public/assets..."
  foreach ($book in $books) {
    foreach ($grade in $grades) {
      $srcGrade = "C:\$book\$grade"
      $srcMobile = Join-Path $srcGrade "mobile"

      foreach ($targetRoot in @($assetsRoot, $publicAssets)) {
        $dstGrade = Join-Path $targetRoot (Join-Path $book $grade)
        $dstMobile = Join-Path $dstGrade "mobile"

        foreach ($dst in @($dstGrade, $dstMobile)) {
          if (-not (Test-Path -LiteralPath $dst)) {
            New-Item -ItemType Directory -Path $dst -Force | Out-Null
          }
          $resolved = (Resolve-Path -LiteralPath $dst).Path
          if (-not $resolved.StartsWith($targetRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to write outside target root: $resolved"
          }
        }

        $sourceNormalNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        Get-ChildItem -LiteralPath $srcGrade -File -Filter *.docx -ErrorAction SilentlyContinue |
          ForEach-Object { $sourceNormalNames.Add($_.Name) | Out-Null }

        foreach ($old in Get-ChildItem -LiteralPath $dstGrade -File -Filter *.docx -ErrorAction SilentlyContinue) {
          if (-not $sourceNormalNames.Contains($old.Name)) {
            Remove-Item -LiteralPath $old.FullName -Force
          }
        }

        foreach ($src in Get-ChildItem -LiteralPath $srcGrade -File -Filter *.docx -ErrorAction SilentlyContinue) {
          Copy-Item -LiteralPath $src.FullName -Destination (Join-Path $dstGrade $src.Name) -Force
        }

        $sourceMobileNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        Get-ChildItem -LiteralPath $srcMobile -File -Filter *.docx -ErrorAction SilentlyContinue |
          ForEach-Object { $sourceMobileNames.Add($_.Name) | Out-Null }

        foreach ($old in Get-ChildItem -LiteralPath $dstMobile -File -Filter *.docx -ErrorAction SilentlyContinue) {
          if (-not $sourceMobileNames.Contains($old.Name)) {
            Remove-Item -LiteralPath $old.FullName -Force
          }
        }

        $oldMobileDocxDir = Join-Path $dstMobile "docx"
        if (Test-Path -LiteralPath $oldMobileDocxDir) {
          $resolvedOld = (Resolve-Path -LiteralPath $oldMobileDocxDir).Path
          if (-not $resolvedOld.StartsWith($targetRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove outside target root: $resolvedOld"
          }
          Remove-Item -LiteralPath $resolvedOld -Recurse -Force
        }

        foreach ($src in Get-ChildItem -LiteralPath $srcMobile -File -Filter *.docx -ErrorAction SilentlyContinue) {
          Copy-Item -LiteralPath $src.FullName -Destination (Join-Path $dstMobile $src.Name) -Force
        }
      }
    }
  }

  Write-Host "Regenerating interactive flashcard decks from SEL files..."
  foreach ($book in $books) {
    $report = "build\study-import-$book-sel-report.json"
    npm run study:import:bulk -- --source-root "C:\$book" --assets-root assets --report $report
    if ($LASTEXITCODE -ne 0) { throw "Study import failed for $book" }
  }

  Write-Host "Syncing regenerated question-bank decks to public/assets..."
  foreach ($book in $books) {
    $src = "assets\$book\question-bank"
    $dstParent = "public\assets\$book"
    if (Test-Path -LiteralPath $src) {
      if (-not (Test-Path -LiteralPath $dstParent)) {
        New-Item -ItemType Directory -Path $dstParent -Force | Out-Null
      }
      Copy-Item -Path $src -Destination $dstParent -Recurse -Force
    }
  }

  Write-Host "Regenerating manifest..."
  npm run manifest:generate
  if ($LASTEXITCODE -ne 0) { throw "manifest:generate failed" }

  Write-Host "Validating PDFs..."
  npm run pdf:validate
  if ($LASTEXITCODE -ne 0) { throw "pdf:validate failed" }

  Write-Host "Final DOCX counts in assets/public assets..."
  foreach ($root in @("assets", "public\assets")) {
    foreach ($book in $books) {
      $normal = 0
      $mobile = 0
      foreach ($grade in $grades) {
        $normal += (Get-ChildItem -LiteralPath (Join-Path $root (Join-Path $book $grade)) -File -Filter *.docx -ErrorAction SilentlyContinue).Count
        $mobile += (Get-ChildItem -LiteralPath (Join-Path $root (Join-Path (Join-Path $book $grade) "mobile")) -File -Filter *.docx -ErrorAction SilentlyContinue).Count
      }
      [pscustomobject]@{
        Root = $root
        Book = $book
        NormalDocx = $normal
        MobileDocx = $mobile
      }
    }
  }

  Write-Host "Procedure complete."
}

$build = {
  $ErrorActionPreference = "Stop"
  Set-Location "C:\dev\rissor-ag"

  Write-Host "Starting timed production build..."
  npm run build:timed
  if ($LASTEXITCODE -ne 0) { throw "build:timed failed" }

  Write-Host "Build complete."
}

Run-JobWithTimeout -Name "DOCX/PDF refresh procedure" -Script $procedure -TimeoutSeconds $procedureTimeoutSeconds
Run-JobWithTimeout -Name "Production build" -Script $build -TimeoutSeconds $buildTimeoutSeconds

Write-Host ""
Write-Host "All done."
Write-Host "You can now inspect:"
Write-Host "  git status --short"
Write-Host "  npm run smoke:html"