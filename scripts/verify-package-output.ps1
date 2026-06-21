param(
  [string]$PackageRoot = "",
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

$resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path

function Assert-Condition {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (!$Condition) {
    throw $Message
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

  Assert-Condition `
    ($resolvedPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) `
    "Refusing to remove a temporary directory outside the system temp directory: $resolvedPath"
  Assert-Condition `
    ($leaf -like "$ExpectedPrefix*") `
    "Refusing to remove an unexpected temporary directory: $resolvedPath"

  Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

function Invoke-PackageOutputCheck {
  param([string]$ResolvedPackageRoot)

  Push-Location $resolvedProjectRoot
  try {
    node scripts/check-package-output.mjs --package-root $ResolvedPackageRoot --project-root $resolvedProjectRoot
    $script:PackageOutputExitCode = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }
}

if (![string]::IsNullOrWhiteSpace($PackageRoot)) {
  $resolvedPackageRoot = (Resolve-Path -LiteralPath $PackageRoot).Path
  Invoke-PackageOutputCheck -ResolvedPackageRoot $resolvedPackageRoot
  exit $script:PackageOutputExitCode
}

$manifestPath = Join-Path $resolvedProjectRoot "manifest.json"
Assert-Condition (Test-Path -LiteralPath $manifestPath) "Project manifest is missing: $manifestPath"

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$releaseName = "Defense_against_Distractions-v$($manifest.version)"
$extensionZipPath = Join-Path $resolvedProjectRoot "dist\$releaseName-extension.zip"
Assert-Condition (Test-Path -LiteralPath $extensionZipPath) "Extension package zip is missing: $extensionZipPath"

$temporaryPackageRoot = Join-Path ([System.IO.Path]::GetTempPath()) "dad-package-check-$([System.Guid]::NewGuid().ToString("N"))"

try {
  New-Item -ItemType Directory -Force -Path $temporaryPackageRoot | Out-Null
  Expand-Archive -LiteralPath $extensionZipPath -DestinationPath $temporaryPackageRoot -Force
  Invoke-PackageOutputCheck -ResolvedPackageRoot $temporaryPackageRoot
  exit $script:PackageOutputExitCode
}
finally {
  Remove-TemporaryDirectory -Path $temporaryPackageRoot -ExpectedPrefix "dad-package-check-"
}
