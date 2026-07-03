// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const script = readFileSync('scripts/chrome-web-store-api.ps1', 'utf8');
const docs = readFileSync('docs/chrome-web-store-api.md', 'utf8');
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const releaseVerifier = readFileSync('scripts/verify-release.ps1', 'utf8');

describe('Chrome Web Store API script safety', () => {
  it('requires an exact publish confirmation token before real publish calls', () => {
    assert.match(script, /\[string\]\$PublishConfirmation = \$env:CWS_CONFIRM_PUBLISH/);
    assert.match(script, /function Get-PublishConfirmationToken[\s\S]+publish:\$\(\$ExtensionId\):v\$\(Get-ManifestVersion\)/);
    assert.match(script, /function Assert-PublishConfirmed[\s\S]+if \(\$DryRun\)[\s\S]+return/);
    assert.match(script, /Assert-Value[\s\S]+-Name "CWS_CONFIRM_PUBLISH"[\s\S]+final human approval/);
    assert.match(script, /\$PublishConfirmation -ne \$expectedConfirmation[\s\S]+throw "CWS_CONFIRM_PUBLISH does not match/);
    assert.match(script, /"publish" \{[\s\S]+Assert-PublishConfirmed[\s\S]+Invoke-CwsRequest -Method "Post" -Uri "\$\{itemUri\}:publish"/);
  });

  it('documents the current-version confirmation token in the CWS API guide', () => {
    const expectedVersionToken = `publish:$env:CWS_EXTENSION_ID:v${manifest.version}`;

    assert.match(docs, /Publishing has an extra local safety gate/);
    assert.match(docs, /The version suffix must match `manifest\.json`/);
    assert.ok(docs.includes(`$env:CWS_CONFIRM_PUBLISH = "${expectedVersionToken}"`));
    assert.match(docs, /set `CWS_CONFIRM_PUBLISH` for the exact item\/version/);
  });

  it('requires upload packages to be the current extension ZIP', () => {
    const expectedPackageName = `Defense_against_Distractions-v${manifest.version}-extension.zip`;

    assert.match(script, /function Get-ExpectedExtensionPackageName[\s\S]+Defense_against_Distractions-v\$\(Get-ManifestVersion\)-extension\.zip/);
    assert.match(script, /function Assert-UploadPackageMatchesManifest[\s\S]+Split-Path -Leaf \$ResolvedPackagePath/);
    assert.match(script, /CWS upload package must be the current extension ZIP/);
    assert.match(script, /"upload" \{[\s\S]+\$resolvedPackagePath = \(Resolve-Path -LiteralPath \$PackagePath\)\.Path[\s\S]+Assert-UploadPackageMatchesManifest -ResolvedPackagePath \$resolvedPackagePath[\s\S]+Invoke-CwsRequest -Method "Post" -Uri "\$\{uploadUri\}:upload"/);
    assert.ok(docs.includes(`dist/${expectedPackageName}`));
    assert.match(docs, /refuses stale version ZIPs, source archives, and arbitrary custom package names/);
  });

  it('keeps CWS publish automation evidence in the source archive requirements', () => {
    assert.match(releaseVerifier, /"docs\/chrome-web-store-api\.md"/);
    assert.match(releaseVerifier, /"scripts\/chrome-web-store-api\.ps1"/);
    assert.match(releaseVerifier, /"test\/scripts\/chrome-web-store-api-script\.test\.js"/);
  });
});
