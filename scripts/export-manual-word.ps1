<#
  Ekspor manual gabungan (10 bab + 63 capture) menjadi satu berkas DOCX
  dan satu berkas PDF lewat Microsoft Word (COM automation).

  Prasyarat:
    1. node scripts/build-manual.mjs   -> docs/manual/.build/manual.html
    2. Microsoft Word terpasang (Windows)

  Jalankan:
    powershell -ExecutionPolicy Bypass -File scripts/export-manual-word.ps1
#>
[CmdletBinding()]
param(
  [string]$Html,
  [string]$Manifest,
  [string]$Docx,
  [string]$Pdf,
  [switch]$SkipPdf
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
if (-not $Html) { $Html = Join-Path $Root 'docs\manual\.build\manual-word.html' }
if (-not $Manifest) { $Manifest = Join-Path $Root 'docs\manual\.build\word-manifest.json' }
if (-not $Docx) { $Docx = Join-Path $Root 'docs\manual\ERP-Akreditasi-Faskes-Manual.docx' }
if (-not $Pdf)  { $Pdf  = Join-Path $Root 'docs\manual\ERP-Akreditasi-Faskes-Manual.pdf' }

if (-not (Test-Path $Html)) {
  throw "HTML gabungan belum ada: $Html`nJalankan dulu: node scripts/build-manual.mjs"
}

Write-Host "Membuka HTML: $Html"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.Options.CheckSpellingAsYouType = $false
$word.Options.CheckGrammarAsYouType = $false
$word.Options.Pagination = $false
$word.Options.SaveInterval = 0

$doc = $null
try {
  # ConfirmConversions, ReadOnly, AddToRecentFiles
  $doc = $word.Documents.Open($Html, $false, $false, $false)

  # ------------------------------------------------------------- halaman
  $ps = $doc.PageSetup
  $ps.PageWidth    = $word.CentimetersToPoints(21)
  $ps.PageHeight   = $word.CentimetersToPoints(29.7)
  $ps.TopMargin    = $word.CentimetersToPoints(2)
  $ps.BottomMargin = $word.CentimetersToPoints(1.8)
  $ps.LeftMargin   = $word.CentimetersToPoints(2)
  $ps.RightMargin  = $word.CentimetersToPoints(1.6)

  # ------------------------------------------------- pemenggalan bab
  # Setiap judul bab (Heading 1) dimulai pada halaman baru.
  foreach ($p in $doc.Paragraphs) {
    $style = $p.Style.NameLocal
    if ($style -notlike 'Heading 1*') { continue }
    $p.Format.PageBreakBefore = $true
    $p.Format.KeepWithNext = $true
  }

  # ------------------------------------------------------------- sampul
  # Word tidak mendukung flexbox, jadi sampul diberi jarak atas manual dan
  # daftar isi dipindah ke halaman sendiri.
  $doc.Paragraphs.Item(1).Format.SpaceBefore = 210
  foreach ($p in $doc.Paragraphs) {
    $t = $p.Range.Text.Trim()
    if ($t.Length -lt 30 -and $t.StartsWith('Daftar Isi')) {
      $p.Format.PageBreakBefore = $true
      break
    }
  }

  # ------------------------------------------------------ gambar tertanam
  # Impor HTML Word membuat gambar sebagai tautan ke file di disk. Agar
  # DOCX mandiri, tiap penanda [[IMG-nnn]] diganti InlineShape yang
  # benar-benar tertanam (LinkToFile = false).
  $images = Get-Content $Manifest -Raw | ConvertFrom-Json
  $imgWidth = $word.CentimetersToPoints(16.4)
  $inserted = 0
  foreach ($prop in $images.PSObject.Properties) {
    $id = $prop.Name
    $file = Join-Path (Split-Path -Parent $Html) $prop.Value
    if (-not (Test-Path $file)) { Write-Warning "Gambar hilang: $file"; continue }

    $rng = $doc.Content
    $find = $rng.Find
    $find.ClearFormatting()
    $find.Text = "[[IMG-$id]]"
    $find.Forward = $true
    $find.Wrap = 0
    $find.MatchWildcards = $false
    if (-not $find.Execute()) { Write-Warning "Penanda [[IMG-$id]] tidak ditemukan."; continue }

    $rng.Text = ''
    $rng.ParagraphFormat.Alignment = 1        # wdAlignParagraphCenter
    $shape = $doc.InlineShapes.AddPicture($file, $false, $true, $rng)
    $shape.LockAspectRatio = -1               # msoTrue
    $shape.Width = $imgWidth
    $inserted++
  }
  Write-Host "Gambar tertanam: $inserted dari $(@($images.PSObject.Properties).Count)"

  # --------------------------------------------------- daftar isi rinci
  $rng = $doc.Content
  $find = $rng.Find
  $find.ClearFormatting()
  $find.Text = '[[TOC]]'
  $find.Forward = $true
  $find.Wrap = 0
  $find.MatchWildcards = $false
  if ($find.Execute()) {
    $rng.Text = ''
    $toc = $doc.TablesOfContents.Add($rng, $true, 1, 2, $false, [Type]::Missing, $true, $true, [Type]::Missing, $true, $true, $true)
    $toc.Update()
    Write-Host 'Daftar isi rinci (field TOC) disisipkan.'
  } else {
    Write-Warning 'Penanda [[TOC]] tidak ditemukan; daftar isi rinci dilewati.'
  }

  # ------------------------------------------------------- nomor halaman
  foreach ($section in $doc.Sections) {
    $footer = $section.Footers.Item(1)
    $footer.PageNumbers.Add(1, $true) | Out-Null
  }

  $word.Options.Pagination = $true
  $doc.Fields.Update() | Out-Null
  if ($doc.TablesOfContents.Count -gt 0) { $doc.TablesOfContents.Item(1).Update() }

  $pages = $doc.ComputeStatistics(2)   # wdStatisticPages
  Write-Host "Halaman: $pages"

  # ---------------------------------------------------------------- docx
  if (Test-Path $Docx) { Remove-Item $Docx -Force }
  $doc.SaveAs2($Docx, 16)               # wdFormatDocumentDefault (.docx)
  Write-Host "DOCX: $Docx"

  # ----------------------------------------------------------------- pdf
  if (-not $SkipPdf) {
    if (Test-Path $Pdf) { Remove-Item $Pdf -Force }
    # ExportAsFixedFormat(OutputFileName, ExportFormat=wdExportFormatPDF,
    #   OpenAfterExport, OptimizeFor=wdExportOptimizeForPrint, Range=wdExportAllDocument,
    #   From, To, Item=wdExportDocumentContent, IncludeDocProps, KeepIRM,
    #   CreateBookmarks=wdExportCreateHeadingBookmarks, DocStructureTags,
    #   BitmapMissingFonts, UseISO19005_1)
    $doc.ExportAsFixedFormat($Pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1, $true, $true, $false)
    Write-Host "PDF : $Pdf"
  }
}
finally {
  if ($doc) { $doc.Close(0) }           # wdDoNotSaveChanges
  $word.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}

foreach ($f in @($Docx, $Pdf)) {
  if (Test-Path $f) {
    $kb = [math]::Round((Get-Item $f).Length / 1KB)
    Write-Host ("{0} -> {1} KB" -f (Split-Path $f -Leaf), $kb)
  }
}
