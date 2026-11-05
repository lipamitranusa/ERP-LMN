<#
  Rasterisasi beberapa halaman PDF menjadi PNG untuk pemeriksaan visual.
  Memakai Windows.Data.Pdf (WinRT) sehingga tidak butuh Ghostscript/ImageMagick.

    powershell -File scripts/pdf-preview.ps1 -Pdf docs/manual/ERP-...-Manual.pdf -Pages 1,2,4
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Pdf,
  [int[]]$Pages = @(1, 2, 3),
  [string]$OutDir = 'docs/manual/.build/preview',
  [uint32]$Width = 1240
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($op, $type) {
  $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $task.Wait(-1) | Out-Null
  $task.Result
}

$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.FullName -eq 'Windows.Foundation.IAsyncAction'
})[0]

function AwaitAction($op) {
  $task = $asTaskAction.Invoke($null, @($op))
  $task.Wait(-1) | Out-Null
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.FileIO, Windows.Storage, ContentType = WindowsRuntime] | Out-Null

$pdfPath = (Resolve-Path $Pdf).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }
$outDirPath = (Resolve-Path $OutDir).Path

$srcFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath)) ([Windows.Storage.StorageFile])
$pdfDoc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($srcFile)) ([Windows.Data.Pdf.PdfDocument])
Write-Host "Halaman PDF: $($pdfDoc.PageCount)"

$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($outDirPath)) ([Windows.Storage.StorageFolder])

foreach ($n in $Pages) {
  if ($n -lt 1 -or $n -gt $pdfDoc.PageCount) { continue }
  $page = $pdfDoc.GetPage($n - 1)
  $name = "page-{0:d3}.png" -f $n
  $target = Await ($folder.CreateFileAsync($name, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $stream = Await ($target.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = $Width
  AwaitAction ($page.RenderToStreamAsync($stream, $opts))
  $stream.Dispose()
  Write-Host "$name"
}
