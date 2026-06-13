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

Push-Location $projectRoot
try {
  node scripts/check-locale-coverage.mjs
  Assert-Condition ($LASTEXITCODE -eq 0) "Locale coverage verification failed"
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

foreach ($entry in (($manifestScriptPaths + $webAccessibleResourcePaths) | Select-Object -Unique)) {
  Assert-ZipContains -Entries $extensionEntries -EntryName (Normalize-ZipPath -RelativePath $entry) -ArchiveName "Extension archive"
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
  "ABOUT.md",
  "CHANGELOG.md",
  "LICENSE.txt",
  "manifest.json",
  "package.json",
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

$storeListingRoot = Join-Path $projectRoot "src\store-assets\store-listing"
$localeDirectories = Get-ChildItem -LiteralPath (Join-Path $projectRoot "_locales") -Directory
foreach ($localeDirectory in $localeDirectories) {
  Assert-Condition ($localeDirectory.Name -notmatch "-") "Locale directory must use Chrome underscore locale codes, not hyphens: $($localeDirectory.Name)"

  $localeListingPath = Join-Path $storeListingRoot "$($localeDirectory.Name).txt"
  Assert-Condition (Test-Path -LiteralPath $localeListingPath) "Missing store listing for locale: $($localeDirectory.Name)"

  $storeListing = Get-Content -LiteralPath $localeListingPath -Raw
  Assert-Condition ($storeListing -notmatch "[#*\[\]]") "Store listing should stay plain text, not Markdown-formatted text: $($localeDirectory.Name).txt"
  Assert-Condition ($storeListing -match "https://github.com/molodchyk/Defense_against_Distractions") "Store listing is missing project URL: $($localeDirectory.Name).txt"
}

foreach ($screenshotPath in Get-ChildItem -LiteralPath (Join-Path $projectRoot "src\store-assets\screenshots") -Filter "*.png") {
  $relativeScreenshotPath = "src/store-assets/screenshots/$($screenshotPath.Name)"
  Assert-ImageDimensions -RelativePath $relativeScreenshotPath -ExpectedWidth 1280 -ExpectedHeight 800
}

$screenshotCount = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot "src\store-assets\screenshots") -Filter "*.png").Count
Assert-Condition ($screenshotCount -eq 5) "Store screenshots folder should contain exactly 5 PNG screenshots"

Assert-ImageDimensions -RelativePath "src/store-assets/promo/small-promo-440x280.png" -ExpectedWidth 440 -ExpectedHeight 280
Assert-ImageDimensions -RelativePath "src/store-assets/promo/marquee-promo-1400x560.png" -ExpectedWidth 1400 -ExpectedHeight 560

$defaultLocale = $manifest.default_locale
$defaultLocalePath = Join-Path $projectRoot "_locales\$defaultLocale\messages.json"
Assert-Condition (Test-Path -LiteralPath $defaultLocalePath) "Default locale messages file is missing: _locales/$defaultLocale/messages.json"
$defaultMessages = Get-Content -LiteralPath $defaultLocalePath -Raw | ConvertFrom-Json
Assert-Condition ($null -ne $defaultMessages.description.message) "Default locale is missing description.message"

Write-Output "Release verification passed for $releaseName"
exit 0
