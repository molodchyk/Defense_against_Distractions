param(
  [string]$ExtensionPath = "",
  [string]$BrowserPath = "",
  [int]$TimeoutSeconds = 10,
  [switch]$KeepProfile,
  [switch]$AllowBrowserManagementTools
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Assert-Condition {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (!$Condition) {
    throw $Message
  }
}

function Get-DefaultExtensionPath {
  $packagedExtensionPath = Join-Path $projectRoot "dist\extension"
  $packagedManifestPath = Join-Path $packagedExtensionPath "manifest.json"

  if (Test-Path -LiteralPath $packagedManifestPath) {
    return $packagedExtensionPath
  }

  return $projectRoot
}

function Get-DefaultExtensionZipPath {
  $manifestPath = Join-Path $projectRoot "manifest.json"
  Assert-Condition (Test-Path -LiteralPath $manifestPath) "Project manifest is missing: $manifestPath"

  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $releaseName = "Defense_against_Distractions-v$($manifest.version)"
  return Join-Path $projectRoot "dist\$releaseName-extension.zip"
}

function Resolve-ExtensionRoot {
  param([string]$RequestedPath)

  if ([string]::IsNullOrWhiteSpace($RequestedPath)) {
    $RequestedPath = Get-DefaultExtensionPath
  }

  $resolvedPath = (Resolve-Path -LiteralPath $RequestedPath).Path
  $manifestPath = Join-Path $resolvedPath "manifest.json"
  Assert-Condition (Test-Path -LiteralPath $manifestPath) "Extension path does not contain manifest.json: $resolvedPath"

  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  Assert-Condition ($manifest.manifest_version -eq 3) "Unpacked extension smoke expects a Manifest V3 extension."
  Assert-Condition (![string]::IsNullOrWhiteSpace($manifest.version)) "Manifest is missing version."

  return @{
    Path = $resolvedPath
    Name = $manifest.name
    Version = $manifest.version
  }
}

function Remove-TemporaryExtensionDirectory {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path) -or !(Test-Path -LiteralPath $Path)) {
    return
  }

  $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  $resolvedPath = [System.IO.Path]::GetFullPath($Path)
  $leaf = Split-Path -Leaf $resolvedPath

  Assert-Condition `
    ($resolvedPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) `
    "Refusing to remove a temporary extension directory outside the system temp directory: $resolvedPath"
  Assert-Condition `
    ($leaf -like "dad-unpacked-extension-*") `
    "Refusing to remove an unexpected temporary extension directory: $resolvedPath"

  Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

function Get-BrowserExecutable {
  param([string]$RequestedPath)

  $candidates = @()

  if (![string]::IsNullOrWhiteSpace($RequestedPath)) {
    $candidates += $RequestedPath
  }

  if (![string]::IsNullOrWhiteSpace($env:DAD_CHROME_PATH)) {
    $candidates += $env:DAD_CHROME_PATH
  }

  $runningBrowserPaths = Get-Process chrome, msedge -ErrorAction SilentlyContinue |
    Where-Object { ![string]::IsNullOrWhiteSpace($_.Path) } |
    Select-Object -ExpandProperty Path -Unique
  $candidates += $runningBrowserPaths

  $candidates += @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
  )

  foreach ($commandName in @("chrome.exe", "msedge.exe", "chromium.exe")) {
    $command = Get-Command $commandName -ErrorAction SilentlyContinue
    if ($null -ne $command) {
      $candidates += $command.Source
    }
  }

  foreach ($candidate in ($candidates | Where-Object { ![string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "Could not find Chrome, Edge, or Chromium. Set DAD_CHROME_PATH or pass -BrowserPath."
}

function Get-BrowserManagementProcesses {
  return @(
    Get-CimInstance Win32_Process |
      Where-Object {
        $processText = "$($_.Name) $($_.CommandLine)"
        $processText -match "(?i)cold\s*turkey|coldturkey"
      } |
      Select-Object ProcessId, Name
  )
}

function Assert-BrowserLoadEnvironmentSafe {
  param([switch]$AllowBrowserManagementTools)

  if ($AllowBrowserManagementTools -or $env:DAD_ALLOW_BROWSER_LOAD_WITH_BROWSER_MANAGEMENT -eq "1") {
    return
  }

  $browserManagementProcesses = @(Get-BrowserManagementProcesses)
  if ($browserManagementProcesses.Count -eq 0) {
    return
  }

  $processSummary = ($browserManagementProcesses | ForEach-Object { "$($_.Name)($($_.ProcessId))" }) -join ", "
  throw "Refusing to run browser-load while browser-management or blocker software is running: $processSummary. Run this check in an isolated browser environment where no active browser windows or unsaved work can be affected. To override only in a safe disposable environment, pass -AllowBrowserManagementTools or set DAD_ALLOW_BROWSER_LOAD_WITH_BROWSER_MANAGEMENT=1."
}

function New-ArgumentWithPath {
  param(
    [string]$Name,
    [string]$Value
  )

  return "$Name=`"$Value`""
}

function Get-ProfileProcesses {
  param([string]$ProfileLeaf)

  return @(
    Get-CimInstance Win32_Process |
      Where-Object {
        ($_.Name -eq "chrome.exe" -or $_.Name -eq "msedge.exe" -or $_.Name -eq "chromium.exe") `
          -and ![string]::IsNullOrWhiteSpace($_.CommandLine) `
          -and $_.CommandLine.Contains($ProfileLeaf)
      }
  )
}

function Stop-ProfileProcesses {
  param([string]$ProfileLeaf)

  foreach ($profileProcess in (Get-ProfileProcesses -ProfileLeaf $ProfileLeaf)) {
    Stop-Process -Id $profileProcess.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

function Wait-ProfileProcessesStopped {
  param(
    [string]$ProfileLeaf,
    [int]$MaxAttempts = 20
  )

  for ($attempt = 0; $attempt -lt $MaxAttempts; $attempt++) {
    $profileProcesses = @(Get-ProfileProcesses -ProfileLeaf $ProfileLeaf)
    if ($profileProcesses.Count -eq 0) {
      return
    }

    Stop-ProfileProcesses -ProfileLeaf $ProfileLeaf
    Start-Sleep -Milliseconds 250
  }
}

function Remove-TemporaryProfile {
  param([string]$ProfilePath)

  if (!(Test-Path -LiteralPath $ProfilePath)) {
    return
  }

  $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  $resolvedProfilePath = [System.IO.Path]::GetFullPath($ProfilePath)
  $profileLeaf = Split-Path -Leaf $resolvedProfilePath

  Assert-Condition `
    ($resolvedProfilePath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) `
    "Refusing to remove a temporary profile outside the system temp directory: $resolvedProfilePath"
  Assert-Condition `
    ($profileLeaf -like "dad-unpacked-load-*") `
    "Refusing to remove an unexpected temporary profile directory: $resolvedProfilePath"

  $lastError = $null
  for ($attempt = 0; $attempt -lt 12; $attempt++) {
    try {
      Remove-Item -LiteralPath $resolvedProfilePath -Recurse -Force
      return
    }
    catch {
      $lastError = $_
      Start-Sleep -Milliseconds 250
    }
  }

  throw $lastError
}

Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:$AllowBrowserManagementTools

$extensionPathToLoad = $ExtensionPath
$temporaryExtensionPath = ""

if ([string]::IsNullOrWhiteSpace($extensionPathToLoad)) {
  $packagedExtensionPath = Join-Path $projectRoot "dist\extension"
  $packagedManifestPath = Join-Path $packagedExtensionPath "manifest.json"

  if (Test-Path -LiteralPath $packagedManifestPath) {
    $extensionPathToLoad = $packagedExtensionPath
  }
  else {
    $extensionZipPath = Get-DefaultExtensionZipPath

    if (Test-Path -LiteralPath $extensionZipPath) {
      $temporaryExtensionPath = Join-Path ([System.IO.Path]::GetTempPath()) "dad-unpacked-extension-$([System.Guid]::NewGuid().ToString("N"))"
      New-Item -ItemType Directory -Force -Path $temporaryExtensionPath | Out-Null
      Expand-Archive -LiteralPath $extensionZipPath -DestinationPath $temporaryExtensionPath -Force
      $extensionPathToLoad = $temporaryExtensionPath
    }
  }
}

$extension = Resolve-ExtensionRoot -RequestedPath $extensionPathToLoad
$browser = Get-BrowserExecutable -RequestedPath $BrowserPath
$profilePath = Join-Path ([System.IO.Path]::GetTempPath()) "dad-unpacked-load-$([System.Guid]::NewGuid().ToString("N"))"
$profileLeaf = Split-Path -Leaf $profilePath

New-Item -ItemType Directory -Force -Path $profilePath | Out-Null

$browserArguments = @(
  (New-ArgumentWithPath -Name "--user-data-dir" -Value $profilePath),
  (New-ArgumentWithPath -Name "--disable-extensions-except" -Value $extension.Path),
  (New-ArgumentWithPath -Name "--load-extension" -Value $extension.Path),
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-sync",
  "--disable-background-networking",
  "--disable-component-update",
  "about:blank"
)

try {
  Start-Process -FilePath $browser -ArgumentList $browserArguments -WindowStyle Hidden | Out-Null

  $deadline = (Get-Date).ToUniversalTime().AddSeconds($TimeoutSeconds)
  $profileProcesses = @()

  do {
    Start-Sleep -Milliseconds 500
    $profileProcesses = @(Get-ProfileProcesses -ProfileLeaf $profileLeaf)
  } while ($profileProcesses.Count -eq 0 -and (Get-Date).ToUniversalTime() -lt $deadline)

  Assert-Condition ($profileProcesses.Count -gt 0) "Browser did not stay alive with the unpacked extension loaded."

  Start-Sleep -Seconds 2
  $profileProcesses = @(Get-ProfileProcesses -ProfileLeaf $profileLeaf)
  Assert-Condition ($profileProcesses.Count -gt 0) "Browser exited shortly after loading the unpacked extension."

  Write-Output "Unpacked extension load smoke passed: $($extension.Name) $($extension.Version) loaded from $($extension.Path) in $browser."
}
finally {
  Stop-ProfileProcesses -ProfileLeaf $profileLeaf
  Wait-ProfileProcessesStopped -ProfileLeaf $profileLeaf

  if (!$KeepProfile) {
    Remove-TemporaryProfile -ProfilePath $profilePath
  }
  else {
    Write-Output "Kept temporary browser profile: $profilePath"
  }

  Remove-TemporaryExtensionDirectory -Path $temporaryExtensionPath
}
