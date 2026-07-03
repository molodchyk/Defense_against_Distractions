param(
  [ValidateSet("status", "upload", "publish", "cancel-submission", "set-rollout")]
  [string]$Action = "status",

  [string]$PublisherId = $env:CWS_PUBLISHER_ID,
  [string]$ExtensionId = $env:CWS_EXTENSION_ID,
  [string]$PackagePath = $env:CWS_PACKAGE_PATH,
  [string]$PublishConfirmation = $env:CWS_CONFIRM_PUBLISH,
  [double]$DeployPercentage = -1,

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifestPath = Join-Path $projectRoot "manifest.json"

function Assert-Value {
  param(
    [string]$Value,
    [string]$Name,
    [string]$Hint
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing $Name. $Hint"
  }
}

function Get-DefaultPackagePath {
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $releaseName = "Defense_against_Distractions-v$($manifest.version)"
  return Join-Path $projectRoot "dist\$releaseName-extension.zip"
}

function Get-ManifestVersion {
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  return $manifest.version
}

function Get-PublishConfirmationToken {
  return "publish:$($ExtensionId):v$(Get-ManifestVersion)"
}

function Assert-PublishConfirmed {
  if ($DryRun) {
    return
  }

  $expectedConfirmation = Get-PublishConfirmationToken
  Assert-Value `
    -Value $PublishConfirmation `
    -Name "CWS_CONFIRM_PUBLISH" `
    -Hint "After package, release verification, dashboard review, and final human approval, set it to '$expectedConfirmation'."

  if ($PublishConfirmation -ne $expectedConfirmation) {
    throw "CWS_CONFIRM_PUBLISH does not match the required publish confirmation token. Expected '$expectedConfirmation'."
  }
}

function Get-AccessToken {
  if (![string]::IsNullOrWhiteSpace($env:CWS_ACCESS_TOKEN)) {
    return $env:CWS_ACCESS_TOKEN
  }

  Assert-Value -Value $env:CWS_CLIENT_ID -Name "CWS_CLIENT_ID" -Hint "Set it to the OAuth client ID from Google Cloud."
  Assert-Value -Value $env:CWS_CLIENT_SECRET -Name "CWS_CLIENT_SECRET" -Hint "Set it to the OAuth client secret from Google Cloud."
  Assert-Value -Value $env:CWS_REFRESH_TOKEN -Name "CWS_REFRESH_TOKEN" -Hint "Set it to the refresh token generated with the chromewebstore OAuth scope."

  $body = @{
    client_id = $env:CWS_CLIENT_ID
    client_secret = $env:CWS_CLIENT_SECRET
    refresh_token = $env:CWS_REFRESH_TOKEN
    grant_type = "refresh_token"
  }

  $response = Invoke-RestMethod `
    -Uri "https://oauth2.googleapis.com/token" `
    -Method Post `
    -Body $body `
    -ContentType "application/x-www-form-urlencoded"

  if ([string]::IsNullOrWhiteSpace($response.access_token)) {
    throw "OAuth token refresh did not return an access token."
  }

  return $response.access_token
}

function Invoke-CwsRequest {
  param(
    [string]$Method,
    [string]$Uri,
    [string]$Body,
    [string]$ContentType,
    [string]$InputFile
  )

  if ($DryRun) {
    Write-Output "DRY RUN: $Method $Uri"
    if (![string]::IsNullOrWhiteSpace($InputFile)) {
      Write-Output "DRY RUN: upload file $InputFile"
    }
    if (![string]::IsNullOrWhiteSpace($Body)) {
      Write-Output "DRY RUN: body $Body"
    }
    return
  }

  $headers = @{
    Authorization = "Bearer $(Get-AccessToken)"
  }

  $parameters = @{
    Uri = $Uri
    Method = $Method
    Headers = $headers
  }

  if (![string]::IsNullOrWhiteSpace($ContentType)) {
    $parameters.ContentType = $ContentType
  }

  if (![string]::IsNullOrWhiteSpace($InputFile)) {
    $parameters.InFile = $InputFile
  }

  if (![string]::IsNullOrWhiteSpace($Body)) {
    $parameters.Body = $Body
  }

  $response = Invoke-RestMethod @parameters
  $response | ConvertTo-Json -Depth 20
}

Assert-Value -Value $PublisherId -Name "CWS_PUBLISHER_ID" -Hint "Set it to the Publisher ID from Chrome Web Store Developer Dashboard > Publisher > Settings."
Assert-Value -Value $ExtensionId -Name "CWS_EXTENSION_ID" -Hint "Set it to the Chrome Web Store item/extension ID."

$itemName = "publishers/$PublisherId/items/$ExtensionId"
$itemUri = "https://chromewebstore.googleapis.com/v2/$itemName"
$uploadUri = "https://chromewebstore.googleapis.com/upload/v2/$itemName"

switch ($Action) {
  "status" {
    Invoke-CwsRequest -Method "Get" -Uri "${itemUri}:fetchStatus"
  }

  "upload" {
    if ([string]::IsNullOrWhiteSpace($PackagePath)) {
      $PackagePath = Get-DefaultPackagePath
    }

    $resolvedPackagePath = Resolve-Path -LiteralPath $PackagePath
    Invoke-CwsRequest -Method "Post" -Uri "${uploadUri}:upload" -InputFile $resolvedPackagePath -ContentType "application/zip"
  }

  "publish" {
    Assert-PublishConfirmed
    Invoke-CwsRequest -Method "Post" -Uri "${itemUri}:publish"
  }

  "cancel-submission" {
    Invoke-CwsRequest -Method "Post" -Uri "${itemUri}:cancelSubmission"
  }

  "set-rollout" {
    if ($DeployPercentage -lt 0) {
      if ([string]::IsNullOrWhiteSpace($env:CWS_DEPLOY_PERCENTAGE)) {
        throw "Missing deploy percentage. Pass -DeployPercentage or set CWS_DEPLOY_PERCENTAGE."
      }

      $DeployPercentage = [double]$env:CWS_DEPLOY_PERCENTAGE
    }

    $body = @{
      deployPercentage = $DeployPercentage
    } | ConvertTo-Json

    Invoke-CwsRequest -Method "Post" -Uri "${itemUri}:setPublishedDeployPercentage" -Body $body -ContentType "application/json"
  }
}
