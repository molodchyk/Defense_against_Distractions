// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { browserLoadTriggerPattern, staticPackageScriptNames, staticReleaseScriptPaths } from '../../scripts/playbook/release/releaseSafety.mjs';

const SCRIPT_PATH = 'scripts/check-unpacked-extension-load.ps1';

describe('unpacked extension browser-load smoke script', () => {
  it('uses an isolated temporary browser profile and only stops that profile', () => {
    const script = readFileSync(SCRIPT_PATH, 'utf8');

    assert.match(script, /dad-unpacked-load-\$\(\[System\.Guid\]::NewGuid\(\)\.ToString\("N"\)\)/);
    assert.match(script, /New-ArgumentWithPath -Name "--user-data-dir" -Value \$profilePath/);
    assert.match(script, /Get-ProfileProcesses -ProfileLeaf \$profileLeaf/);
    assert.match(script, /\.CommandLine\.Contains\(\$ProfileLeaf\)/);
    assert.match(script, /Stop-Process -Id \$profileProcess\.ProcessId -Force/);
    assert.match(script, /Refusing to remove a temporary profile outside the system temp directory/);
    assert.match(script, /\$profileLeaf -like "dad-unpacked-load-\*"/);
    assert.doesNotMatch(script, /\btaskkill\b/i);
  });

  it('refuses to launch when browser-management blockers are detected', () => {
    const script = readFileSync(SCRIPT_PATH, 'utf8');

    assert.match(script, /\[switch\]\$AllowBrowserManagementTools/);
    assert.match(script, /DAD_ALLOW_BROWSER_LOAD_WITH_BROWSER_MANAGEMENT/);
    assert.match(script, /Get-BrowserManagementProcesses/);
    assert.match(script, /cold\\s\*turkey\|coldturkey/i);
    assert.match(script, /Refusing to run browser-load while browser-management or blocker software is running/);
    assert.match(script, /Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+\$extensionPathToLoad = \$ExtensionPath/);
    assert.match(script, /Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+Expand-Archive/);
    assert.match(script, /Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+\$browser = Get-BrowserExecutable/);
    assert.match(script, /Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+New-Item -ItemType Directory -Force -Path \$profilePath/);
    assert.match(script, /Assert-BrowserLoadEnvironmentSafe[\s\S]+Start-Process/);
  });

  it('keeps browser-load out of package and release gates', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

    for (const scriptName of staticPackageScriptNames) {
      assert.doesNotMatch(packageJson.scripts[scriptName], browserLoadTriggerPattern, `${scriptName} must stay static`);
    }

    for (const scriptPath of staticReleaseScriptPaths) {
      const script = readFileSync(scriptPath, 'utf8');
      assert.doesNotMatch(script, browserLoadTriggerPattern, `${scriptPath} must not launch browser-load`);
    }

    const releaseVerifier = readFileSync('scripts/verify-release.ps1', 'utf8');
    assert.match(releaseVerifier, /\$unitTestOutput\s*=\s*@\(node --test "test\/\*\*\/\*\.test\.js" 2>&1\)/);
    assert.match(releaseVerifier, /\\btests\\s\+\(\\d\+\)\\s\*\$/);
    assert.match(releaseVerifier, /Unit test suite output did not report a test count/);
    assert.match(releaseVerifier, /docs\\release-verification-record\.md/);
    assert.match(releaseVerifier, /Release verification record unit test count does not match current npm test output/);
  });

  it('keeps browser-load required but isolated in release readiness', () => {
    const releaseReadiness = readFileSync('docs/release-readiness.md', 'utf8');

    assert.match(releaseReadiness, /Release Verification Record/i);
    assert.match(releaseReadiness, /browser-load and manual browser QA marked as pending/i);
    assert.match(releaseReadiness, /automated gates are static repository and archive checks[\s\S]+must not invoke `npm run verify:browser-load`/i);
    assert.match(releaseReadiness, /`npm run verify:browser-load` is not an automated gate[\s\S]+isolated target-browser smoke check is required before publishing[\s\S]+not fully browser-verified/i);
    assert.match(releaseReadiness, /refuses to launch when browser-management or blocker software such as Cold Turkey is running/i);
  });

  it('keeps browser-load command status separate from manual QA evidence', () => {
    const releaseRecord = readFileSync('docs/release-verification-record.md', 'utf8');

    assert.match(releaseRecord, /Static verification status:\s+passed[\s\S]+`npm run package`[\s\S]+`npm run verify:package`[\s\S]+`npm run verify:release`/i);
    assert.match(releaseRecord, /## Static Gate Evidence[\s\S]+Current result:\s+passed[\s\S]+`npm test`[\s\S]+\d+ unit tests passed/i);
    assert.match(releaseRecord, /`npm run verify:locales`[\s\S]+locales match[\s\S]+English message keys[\s\S]+store listing files match `_locales`/i);
    assert.match(releaseRecord, /`npm run verify:release`[\s\S]+Passed for `Defense_against_Distractions-v1\.6\.1`/i);
    assert.match(releaseRecord, /## Browser-Only Evidence[\s\S]+`npm run verify:browser-load`[\s\S]+Not run[\s\S]+isolated Chromium-based browser\/profile/i);
    assert.match(releaseRecord, /Manual QA from `docs\/release-checklist\.md`[\s\S]+User-reported pass on 2026-06-25/i);
    assert.match(releaseRecord, /## Manual QA Evidence[\s\S]+Manual QA result:\s+user reported that manual QA looks working/i);
  });

  it('documents the explicit dist archive policy', () => {
    const releaseReadiness = readFileSync('docs/release-readiness.md', 'utf8');

    assert.match(releaseReadiness, /## Release Archive Policy/);
    assert.match(releaseReadiness, /`dist\/` folder is disposable release output[\s\S]+`npm run package` resets it before packaging/i);
    assert.match(releaseReadiness, /Defense_against_Distractions-vX\.Y\.Z-extension\.zip[\s\S]+Chrome Web Store upload package/i);
    assert.match(releaseReadiness, /Defense_against_Distractions-vX\.Y\.Z-source\.zip[\s\S]+matching source archive/i);
    assert.match(releaseReadiness, /No staging folders[\s\S]+stale version ZIPs/i);
  });
});
