param(
  [string]$OutputDirectory = "dist"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifestPath = Join-Path $projectRoot "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$releaseName = "Defense_against_Distractions-v$version"
$packagePath = Join-Path $projectRoot "package.json"
$packageJson = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json

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

function Get-ZipEntries {
  param([string]$ZipPath)

  Assert-Condition (Test-Path -LiteralPath $ZipPath) "Missing release archive: $ZipPath"

  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    return @($zip.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })
  }
  finally {
    $zip.Dispose()
  }
}

function Get-ZipByteEntry {
  param(
    [string]$ZipPath,
    [string]$EntryName,
    [string]$ArchiveName
  )

  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $EntryName } | Select-Object -First 1
    Assert-Condition ($null -ne $entry) "$ArchiveName is missing $EntryName"

    $entryStream = $entry.Open()
    $memoryStream = New-Object System.IO.MemoryStream
    try {
      $entryStream.CopyTo($memoryStream)
      return $memoryStream.ToArray()
    }
    finally {
      $entryStream.Dispose()
      $memoryStream.Dispose()
    }
  }
  finally {
    $zip.Dispose()
  }
}

function Assert-ZipEntryMatchesProjectFile {
  param(
    [string]$ZipPath,
    [string]$ArchiveName,
    [string]$EntryName
  )

  $rootEntryPath = Join-Path $projectRoot $EntryName.Replace("/", "\")
  Assert-Condition (Test-Path -LiteralPath $rootEntryPath -PathType Leaf) "$ArchiveName contains an entry with no root project file: $EntryName"

  $rootEntryBytes = [System.IO.File]::ReadAllBytes($rootEntryPath)
  $archiveEntryBytes = Get-ZipByteEntry -ZipPath $ZipPath -EntryName $EntryName -ArchiveName $ArchiveName
  $bytesMatch = $rootEntryBytes.Length -eq $archiveEntryBytes.Length

  for ($index = 0; $bytesMatch -and $index -lt $rootEntryBytes.Length; $index++) {
    if ($rootEntryBytes[$index] -ne $archiveEntryBytes[$index]) {
      $bytesMatch = $false
    }
  }

  Assert-Condition $bytesMatch "$ArchiveName $EntryName does not match the root $EntryName"
}

function Assert-ZipFileEntriesMatchProjectFiles {
  param(
    [string]$ZipPath,
    [string]$ArchiveName,
    [string[]]$Entries
  )

  foreach ($entry in ($Entries | Where-Object { !$_.EndsWith("/") })) {
    Assert-ZipEntryMatchesProjectFile -ZipPath $ZipPath -ArchiveName $ArchiveName -EntryName $entry
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

function Assert-ProjectFileExists {
  param([string]$RelativePath)

  $absolutePath = Join-Path $projectRoot $RelativePath
  Assert-Condition (Test-Path -LiteralPath $absolutePath) "Project file does not exist: $RelativePath"
}

function Assert-ImageDimensions {
  param(
    [string]$RelativePath,
    [int]$ExpectedWidth,
    [int]$ExpectedHeight
  )

  $absolutePath = Join-Path $projectRoot $RelativePath
  Assert-Condition (Test-Path -LiteralPath $absolutePath) "Store image does not exist: $RelativePath"

  $image = [System.Drawing.Image]::FromFile($absolutePath)
  try {
    Assert-Condition ($image.Width -eq $ExpectedWidth -and $image.Height -eq $ExpectedHeight) `
      "Store image has wrong dimensions: $RelativePath is $($image.Width)x$($image.Height), expected ${ExpectedWidth}x${ExpectedHeight}"
  }
  finally {
    $image.Dispose()
  }
}

function Normalize-ZipPath {
  param([string]$RelativePath)

  return $RelativePath.Replace("\", "/")
}

Add-Type -AssemblyName System.Drawing

Assert-Condition ($packageJson.version -eq $manifest.version) "package.json version does not match manifest.json version"
Assert-Condition ($packageJson.license -eq "GPL-3.0-only") "package.json license must be GPL-3.0-only"

Push-Location $projectRoot
try {
  node --test "test/**/*.test.js"
  Assert-Condition ($LASTEXITCODE -eq 0) "Unit test suite failed"
  node scripts/check-manifest-references.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Manifest reference verification failed"
  node scripts/check-relative-imports.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Relative import verification failed"
  node scripts/check-browser-extension-playbook.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Browser extension playbook verification failed"
  node scripts/check-research-quality.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Research quality verification failed"
  node scripts/audit-file-sizes.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "File-size audit failed"
  node scripts/audit-folder-density.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Folder-density audit failed"
  node scripts/check-locale-coverage.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Locale coverage verification failed"
  node scripts/check-static-localization.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Static localization verification failed"
}
finally {
  Pop-Location
}

$manifestIconPaths = @()
$manifest.icons.PSObject.Properties | ForEach-Object { $manifestIconPaths += $_.Value }
$manifest.action.default_icon.PSObject.Properties | ForEach-Object { $manifestIconPaths += $_.Value }

foreach ($relativePath in ($manifestIconPaths | Select-Object -Unique)) {
  Assert-ProjectFileExists -RelativePath $relativePath
}

$expectedIconDimensions = @{
  "assets/icons/extension-icon-16.png" = 16
  "assets/icons/extension-icon-32.png" = 32
  "assets/icons/extension-icon-48.png" = 48
  "assets/icons/extension-icon-64.png" = 64
  "assets/icons/extension-icon-128.png" = 128
}

foreach ($iconPath in $expectedIconDimensions.Keys) {
  $expectedSize = $expectedIconDimensions[$iconPath]
  Assert-ImageDimensions -RelativePath $iconPath -ExpectedWidth $expectedSize -ExpectedHeight $expectedSize
}

Assert-ProjectFileExists -RelativePath $manifest.action.default_popup
Assert-ProjectFileExists -RelativePath $manifest.options_page
Assert-ProjectFileExists -RelativePath $manifest.background.service_worker

$manifestScriptPaths = @()
foreach ($contentScript in $manifest.content_scripts) {
  foreach ($scriptPath in $contentScript.js) {
    $manifestScriptPaths += $scriptPath
    Assert-ProjectFileExists -RelativePath $scriptPath
  }
}

$webAccessibleResourcePaths = @()
foreach ($resourceGroup in $manifest.web_accessible_resources) {
  foreach ($resourcePath in $resourceGroup.resources) {
    $webAccessibleResourcePaths += $resourcePath
    Assert-ProjectFileExists -RelativePath $resourcePath
  }
}

$extensionEntries = Get-ZipEntries -ZipPath $extensionZipPath
$sourceEntries = Get-ZipEntries -ZipPath $sourceZipPath

$expectedZipNames = @(
  "$releaseName-extension.zip",
  "$releaseName-source.zip"
)
$actualZipNames = @(Get-ChildItem -LiteralPath $distPath -File -Filter "*.zip" | ForEach-Object { $_.Name })
foreach ($zipName in $actualZipNames) {
  Assert-Condition ($expectedZipNames -contains $zipName) "dist contains a stale or unexpected package zip: $zipName"
}
foreach ($zipName in $expectedZipNames) {
  Assert-Condition ($actualZipNames -contains $zipName) "dist is missing expected package zip: $zipName"
}

$unexpectedDistDirectories = @(Get-ChildItem -LiteralPath $distPath -Directory)
Assert-Condition ($unexpectedDistDirectories.Count -eq 0) `
  "dist should contain only current package zip files, but found directory: $($unexpectedDistDirectories[0].Name)"

$temporaryPackageRoot = Join-Path ([System.IO.Path]::GetTempPath()) "dad-release-package-check-$([System.Guid]::NewGuid().ToString("N"))"
try {
  New-Item -ItemType Directory -Force -Path $temporaryPackageRoot | Out-Null
  Expand-Archive -LiteralPath $extensionZipPath -DestinationPath $temporaryPackageRoot -Force

  Push-Location $projectRoot
  try {
    node scripts/check-package-output.mjs --package-root $temporaryPackageRoot --project-root $projectRoot
    Assert-Condition ($LASTEXITCODE -eq 0) "Package output verification failed"
  }
  finally {
    Pop-Location
  }
}
finally {
  Remove-TemporaryDirectory -Path $temporaryPackageRoot -ExpectedPrefix "dad-release-package-check-"
}

$requiredExtensionEntries = @(
  "manifest.json",
  "src/blocked.html",
  "src/instructions.html",
  "src/options.html",
  "src/popup.html",
  "assets/icons/extension-icon-16.png",
  "assets/icons/extension-icon-32.png",
  "assets/icons/extension-icon-48.png",
  "assets/icons/extension-icon-64.png",
  "assets/icons/extension-icon-128.png"
)

foreach ($entry in $requiredExtensionEntries) {
  Assert-ZipContains -Entries $extensionEntries -EntryName $entry -ArchiveName "Extension archive"
}

foreach ($prefix in @("_locales/", "src/app/", "src/css/", "src/features/", "src/js/", "src/platform/")) {
  Assert-ZipContainsPrefix -Entries $extensionEntries -Prefix $prefix -ArchiveName "Extension archive"
}

foreach ($entry in (($manifestScriptPaths + $webAccessibleResourcePaths) | Select-Object -Unique)) {
  Assert-ZipContains -Entries $extensionEntries -EntryName (Normalize-ZipPath -RelativePath $entry) -ArchiveName "Extension archive"
}

$forbiddenExtensionPrefixes = @(
  "research/",
  "docs/",
  "test/",
  "scripts/",
  "store/"
)

foreach ($prefix in $forbiddenExtensionPrefixes) {
  Assert-ZipExcludesPrefix -Entries $extensionEntries -Prefix $prefix -ArchiveName "Extension archive"
}

Assert-Condition (!($extensionEntries -contains "assets/icons/extension-icon-source.svg")) "Extension archive should not contain the source SVG icon"
Assert-ZipFileEntriesMatchProjectFiles -ZipPath $extensionZipPath -ArchiveName "Extension archive" -Entries $extensionEntries

$requiredSourceEntries = @(
  "ABOUT.md",
  "CHANGELOG.md",
  "docs/chrome-web-store-additional-fields.md",
  "docs/chrome-web-store-category.md",
  "docs/chrome-web-store-privacy-form.md",
  "docs/claim-traceability.md",
  "docs/code-structure.md",
  "docs/content-script-load-order.md",
  "docs/decision-records.md",
  "docs/extension-architecture-research.md",
  "docs/extension-modularization-playbook.md",
  "docs/localization.md",
  "docs/modularization-roadmap.md",
  "docs/permission-audit.md",
  "docs/potential-functionality.md",
  "docs/release-checklist.md",
  "docs/release-notes.md",
  "docs/release-readiness.md",
  "docs/release-verification-record.md",
  "docs/reviewer-notes.md",
  "docs/selected-text-quick-add.md",
  "docs/browser-extension-playbook-compliance.md",
  "docs/browser-extension-playbook-requirements.md",
  "docs/storepilot-automation.md",
  "docs/store-media-review.md",
  "docs/storage-ownership.md",
  "docs/triggered-actions.md",
  "LICENSE",
  "manifest.json",
  "package.json",
  "PRIVACY.md",
  "README.md",
  "scripts/check-browser-extension-playbook.mjs",
  "scripts/check-locale-coverage.mjs",
  "scripts/check-manifest-references.mjs",
  "scripts/check-package-output.mjs",
  "scripts/check-platform-boundaries.mjs",
  "scripts/check-research-quality.mjs",
  "scripts/check-relative-imports.mjs",
  "scripts/check-static-localization.mjs",
  "scripts/audit-file-sizes.mjs",
  "scripts/audit-folder-density.mjs",
  "scripts/package-extension.ps1",
  "scripts/playbook/architecture/docs.mjs",
  "scripts/playbook/constants.mjs",
  "scripts/playbook/manifestAudit.mjs",
  "scripts/playbook/playbookCompliance.mjs",
  "scripts/playbook/product/specs.mjs",
  "scripts/playbook/release/releaseDocs.mjs",
  "scripts/playbook/release/releaseSafety.mjs",
  "scripts/playbook/storeAutomation.mjs",
  "scripts/playbook/storeMediaReview.mjs",
  "scripts/playbook-utils.mjs",
  "scripts/research/registry.mjs",
  "scripts/verify-package-output.ps1",
  "scripts/verify-release.ps1",
  "research/README.md",
  "research/pipeline.md",
  "research/quality-bar.md",
  "research/questions.md",
  "store/store-listing/en.txt",
  "assets/icons/extension-icon-source.svg"
)

foreach ($entry in $requiredSourceEntries) {
  Assert-ZipContains -Entries $sourceEntries -EntryName $entry -ArchiveName "Source archive"
}

foreach ($prefix in @("assets/", "docs/", "research/", "store/", "test/", "_locales/", "scripts/", "src/")) {
  Assert-ZipContainsPrefix -Entries $sourceEntries -Prefix $prefix -ArchiveName "Source archive"
}
Assert-ZipFileEntriesMatchProjectFiles -ZipPath $sourceZipPath -ArchiveName "Source archive" -Entries $sourceEntries

$rootChangelog = Get-Content -LiteralPath (Join-Path $projectRoot "CHANGELOG.md") -Raw
$escapedVersion = [System.Text.RegularExpressions.Regex]::Escape($version)
$versionHeadingPattern = "Version\s+{0}:" -f $escapedVersion
Assert-Condition ($rootChangelog -match $versionHeadingPattern) "Root CHANGELOG.md is missing an entry for version $version"

$storeListingRoot = Join-Path $projectRoot "store\store-listing"
$localeDirectories = Get-ChildItem -LiteralPath (Join-Path $projectRoot "_locales") -Directory
foreach ($localeDirectory in $localeDirectories) {
  Assert-Condition ($localeDirectory.Name -notmatch "-") "Locale directory must use Chrome underscore locale codes, not hyphens: $($localeDirectory.Name)"

  $localeListingPath = Join-Path $storeListingRoot "$($localeDirectory.Name).txt"
  $relativeLocaleListingPath = "store/store-listing/$($localeDirectory.Name).txt"
  Assert-Condition (Test-Path -LiteralPath $localeListingPath) "Missing store listing for locale: $($localeDirectory.Name)"

  $storeListing = Get-Content -LiteralPath $localeListingPath -Raw
  $firstStoreListingLine = ($storeListing -split "\r?\n" | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -First 1)
  Assert-Condition ($storeListing -notmatch "[#*\[\]]") "Store listing should stay plain text, not Markdown-formatted text: $($localeDirectory.Name).txt"
  Assert-Condition ($null -ne $firstStoreListingLine -and $firstStoreListingLine.Length -gt 0) "Store listing should not be empty: $($localeDirectory.Name).txt"
  Assert-Condition ($firstStoreListingLine -notmatch "^(?i:defen[sc]e against distractions)\b") "Store listing should not start with the extension name: $($localeDirectory.Name).txt"
  Assert-Condition ($firstStoreListingLine -notmatch "^(?i:name|summary|description|detailed description)\s*:") "Store listing should not start with a Chrome Web Store field label: $($localeDirectory.Name).txt"
  Assert-Condition ($storeListing -match "https://github.com/molodchyk/Defense_against_Distractions") "Store listing is missing project URL: $($localeDirectory.Name).txt"
  Assert-Condition ($storeListing -match "GPL-3\.0") "Store listing is missing GPL-3.0 license disclosure: $($localeDirectory.Name).txt"
}

foreach ($screenshotPath in Get-ChildItem -LiteralPath (Join-Path $projectRoot "store\screenshots") -Filter "*.png") {
  $relativeScreenshotPath = "store/screenshots/$($screenshotPath.Name)"
  Assert-ImageDimensions -RelativePath $relativeScreenshotPath -ExpectedWidth 1280 -ExpectedHeight 800
}

$screenshotCount = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot "store\screenshots") -Filter "*.png").Count
Assert-Condition ($screenshotCount -eq 5) "Store screenshots folder should contain exactly 5 PNG screenshots"

foreach ($promoAsset in @(
  @{ Path = "store/promo/small-promo-440x280.png"; Width = 440; Height = 280 },
  @{ Path = "store/promo/marquee-promo-1400x560.png"; Width = 1400; Height = 560 }
)) {
  Assert-ImageDimensions -RelativePath $promoAsset.Path -ExpectedWidth $promoAsset.Width -ExpectedHeight $promoAsset.Height
}

$defaultLocale = $manifest.default_locale
$defaultLocalePath = Join-Path $projectRoot "_locales\$defaultLocale\messages.json"
Assert-Condition (Test-Path -LiteralPath $defaultLocalePath) "Default locale messages file is missing: _locales/$defaultLocale/messages.json"
$defaultMessages = Get-Content -LiteralPath $defaultLocalePath -Raw | ConvertFrom-Json
Assert-Condition ($null -ne $defaultMessages.description.message) "Default locale is missing description.message"

Write-Output "Release verification passed for $releaseName"
exit 0
