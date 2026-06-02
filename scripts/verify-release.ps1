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

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Assert-Condition {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (!$Condition) {
    throw $Message
  }
}

function Get-ZipEntries {
  param([string]$ZipPath)

  Assert-Condition (Test-Path -LiteralPath $ZipPath) "Missing release archive: $ZipPath"

  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    return @($zip.Entries | ForEach-Object { $_.FullName })
  }
  finally {
    $zip.Dispose()
  }
}

function Get-ZipTextEntry {
  param(
    [string]$ZipPath,
    [string]$EntryName
  )

  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $EntryName } | Select-Object -First 1
    Assert-Condition ($null -ne $entry) "Missing source archive entry: $EntryName"

    $reader = New-Object System.IO.StreamReader($entry.Open())
    try {
      return $reader.ReadToEnd()
    }
    finally {
      $reader.Dispose()
    }
  }
  finally {
    $zip.Dispose()
  }
}

function Assert-ZipContains {
  param(
    [string[]]$Entries,
    [string]$EntryName,
    [string]$ArchiveName
  )

  Assert-Condition ($Entries -contains $EntryName) "$ArchiveName is missing $EntryName"
}

function Assert-ZipContainsPrefix {
  param(
    [string[]]$Entries,
    [string]$Prefix,
    [string]$ArchiveName
  )

  $matches = @($Entries | Where-Object { $_.StartsWith($Prefix) })
  Assert-Condition ($matches.Count -gt 0) "$ArchiveName is missing files under $Prefix"
}

function Assert-ZipExcludesPrefix {
  param(
    [string[]]$Entries,
    [string]$Prefix,
    [string]$ArchiveName
  )

  $matches = @($Entries | Where-Object { $_.StartsWith($Prefix) })
  Assert-Condition ($matches.Count -eq 0) "$ArchiveName should not contain $Prefix"
}

$manifestIconPaths = @()
$manifest.icons.PSObject.Properties | ForEach-Object { $manifestIconPaths += $_.Value }
$manifest.action.default_icon.PSObject.Properties | ForEach-Object { $manifestIconPaths += $_.Value }

foreach ($relativePath in ($manifestIconPaths | Select-Object -Unique)) {
  $absolutePath = Join-Path $projectRoot $relativePath
  Assert-Condition (Test-Path -LiteralPath $absolutePath) "Manifest icon path does not exist: $relativePath"
}

$extensionEntries = Get-ZipEntries -ZipPath $extensionZipPath
$sourceEntries = Get-ZipEntries -ZipPath $sourceZipPath

$requiredExtensionEntries = @(
  "manifest.json",
  "src/blocked.html",
  "src/instructions.html",
  "src/options.html",
  "src/popup.html",
  "src/store-assets/icons/extension-icon-16.png",
  "src/store-assets/icons/extension-icon-32.png",
  "src/store-assets/icons/extension-icon-48.png",
  "src/store-assets/icons/extension-icon-64.png",
  "src/store-assets/icons/extension-icon-128.png"
)

foreach ($entry in $requiredExtensionEntries) {
  Assert-ZipContains -Entries $extensionEntries -EntryName $entry -ArchiveName "Extension archive"
}

foreach ($prefix in @("_locales/", "src/css/", "src/js/")) {
  Assert-ZipContainsPrefix -Entries $extensionEntries -Prefix $prefix -ArchiveName "Extension archive"
}

$forbiddenExtensionPrefixes = @(
  "docs/",
  "test/",
  "scripts/",
  "src/store-assets/promo/",
  "src/store-assets/screenshots/",
  "src/store-assets/store-listing/"
)

foreach ($prefix in $forbiddenExtensionPrefixes) {
  Assert-ZipExcludesPrefix -Entries $extensionEntries -Prefix $prefix -ArchiveName "Extension archive"
}

Assert-Condition (!($extensionEntries -contains "src/store-assets/icons/extension-icon-source.svg")) "Extension archive should not contain the source SVG icon"

$requiredSourceEntries = @(
  "CHANGELOG.md",
  "README.md",
  "scripts/package-extension.ps1",
  "scripts/verify-release.ps1",
  "src/store-assets/store-listing/en.txt",
  "src/store-assets/icons/extension-icon-source.svg"
)

foreach ($entry in $requiredSourceEntries) {
  Assert-ZipContains -Entries $sourceEntries -EntryName $entry -ArchiveName "Source archive"
}

foreach ($prefix in @("docs/", "test/")) {
  Assert-ZipContainsPrefix -Entries $sourceEntries -Prefix $prefix -ArchiveName "Source archive"
}

$rootChangelog = Get-Content -LiteralPath (Join-Path $projectRoot "CHANGELOG.md") -Raw
$sourceChangelog = Get-ZipTextEntry -ZipPath $sourceZipPath -EntryName "CHANGELOG.md"
Assert-Condition ($rootChangelog -eq $sourceChangelog) "Source archive CHANGELOG.md does not match the root CHANGELOG.md"

$storeListingPath = Join-Path $projectRoot "src\store-assets\store-listing\en.txt"
$storeListing = Get-Content -LiteralPath $storeListingPath -Raw
Assert-Condition ($storeListing -notmatch "[#*\[\]]") "Store listing should stay plain text, not Markdown-formatted text"

Write-Output "Release verification passed for $releaseName"
exit 0
