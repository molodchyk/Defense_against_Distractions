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
$extensionZipPath = Join-Path $distPath "$releaseName-extension.zip"
$sourceZipPath = Join-Path $distPath "$releaseName-source.zip"
$stageRootPath = Join-Path ([System.IO.Path]::GetTempPath()) "dad-package-stage-$([System.Guid]::NewGuid().ToString("N"))"
$extensionStagePath = Join-Path $stageRootPath "extension"
$sourceStagePath = Join-Path $stageRootPath "source"

function Assert-GeneratedProjectPath {
  param([string]$Path)

  $resolvedProjectRoot = [System.IO.Path]::GetFullPath("$projectRoot\")
  $resolvedPath = [System.IO.Path]::GetFullPath($Path)

  if (!$resolvedPath.StartsWith($resolvedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to reset a generated path outside the project root: $resolvedPath"
  }
}

function Remove-TemporaryDirectory {
  param(
    [string]$Path,
    [string]$ExpectedPrefix
  )

  if (!(Test-Path -LiteralPath $Path)) {
    return
  }

  $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  $resolvedPath = [System.IO.Path]::GetFullPath($Path)
  $leaf = Split-Path -Leaf $resolvedPath

  if (!$resolvedPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove a temporary directory outside the system temp directory: $resolvedPath"
  }

  if ($leaf -notlike "$ExpectedPrefix*") {
    throw "Refusing to remove an unexpected temporary directory: $resolvedPath"
  }

  Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

function Reset-Directory {
  param([string]$Path)

  Assert-GeneratedProjectPath -Path $Path

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
New-Item -ItemType Directory -Force -Path $extensionStagePath | Out-Null
New-Item -ItemType Directory -Force -Path $sourceStagePath | Out-Null

$runtimeFiles = @(
  "manifest.json",
  "src\blocked.html",
  "src\instructions.html",
  "src\options.html",
  "src\popup.html",
  "src\app",
  "src\css",
  "src\features",
  "src\js",
  "src\platform",
  "assets\icons\extension-icon-16.png",
  "assets\icons\extension-icon-32.png",
  "assets\icons\extension-icon-48.png",
  "assets\icons\extension-icon-64.png",
  "assets\icons\extension-icon-128.png",
  "_locales"
)

$sourceFiles = @(
  ".gitignore",
  "ABOUT.md",
  "CHANGELOG.md",
  "assets",
  "docs",
  "LICENSE",
  "README.md",
  "manifest.json",
  "package.json",
  "scripts",
  "store",
  "src",
  "test",
  "_locales"
)

try {
  foreach ($item in $runtimeFiles) {
    Copy-ProjectItem -RelativePath $item -DestinationRoot $extensionStagePath
  }

  foreach ($item in $sourceFiles) {
    Copy-ProjectItem -RelativePath $item -DestinationRoot $sourceStagePath
  }

  New-ZipFromDirectory -SourceDirectory $extensionStagePath -DestinationZip $extensionZipPath
  New-ZipFromDirectory -SourceDirectory $sourceStagePath -DestinationZip $sourceZipPath
}
finally {
  Remove-TemporaryDirectory -Path $stageRootPath -ExpectedPrefix "dad-package-stage-"
}

Write-Output "Created $extensionZipPath"
Write-Output "Created $sourceZipPath"
