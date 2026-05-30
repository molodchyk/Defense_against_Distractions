param(
  [string]$OutputDirectory = "dist"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifestPath = Join-Path $projectRoot "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$releaseName = "Defense_against_Distractions-v$version"

$distPath = Join-Path $projectRoot $OutputDirectory
$extensionStagePath = Join-Path $distPath "extension"
$sourceStagePath = Join-Path $distPath "source"
$extensionZipPath = Join-Path $distPath "$releaseName-extension.zip"
$sourceZipPath = Join-Path $distPath "$releaseName-source.zip"

function Reset-Directory {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Copy-ProjectItem {
  param(
    [string]$RelativePath,
    [string]$DestinationRoot
  )

  $sourcePath = Join-Path $projectRoot $RelativePath
  $destinationPath = Join-Path $DestinationRoot $RelativePath

  if (!(Test-Path -LiteralPath $sourcePath)) {
    throw "Required package input is missing: $RelativePath"
  }

  $destinationParent = Split-Path -Parent $destinationPath
  New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null
  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse -Force
}

function New-ZipFromDirectory {
  param(
    [string]$SourceDirectory,
    [string]$DestinationZip
  )

  if (Test-Path -LiteralPath $DestinationZip) {
    Remove-Item -LiteralPath $DestinationZip -Force
  }

  Compress-Archive -Path (Join-Path $SourceDirectory "*") -DestinationPath $DestinationZip -Force
}

Reset-Directory $distPath
Reset-Directory $extensionStagePath
Reset-Directory $sourceStagePath

$runtimeFiles = @(
  "manifest.json",
  "src\blocked.html",
  "src\instructions.html",
  "src\options.html",
  "src\css",
  "src\js",
  "src\assets\icons",
  "_locales"
)

$sourceFiles = @(
  ".gitignore",
  "ABOUT.md",
  "CHANGELOG.md",
  "LICENSE.txt",
  "README.md",
  "manifest.json",
  "package.json",
  "scripts",
  "src",
  "test",
  "_locales"
)

foreach ($item in $runtimeFiles) {
  Copy-ProjectItem -RelativePath $item -DestinationRoot $extensionStagePath
}

foreach ($item in $sourceFiles) {
  Copy-ProjectItem -RelativePath $item -DestinationRoot $sourceStagePath
}

New-ZipFromDirectory -SourceDirectory $extensionStagePath -DestinationZip $extensionZipPath
New-ZipFromDirectory -SourceDirectory $sourceStagePath -DestinationZip $sourceZipPath

Write-Output "Created $extensionZipPath"
Write-Output "Created $sourceZipPath"
