// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const browserLoadTriggerPattern = /check-unpacked-extension-load\.ps1|verify:browser-load|--load-extension|--user-data-dir|Start-Process/i;
export const staticPackageScriptNames = ['package', 'verify:package', 'verify:research', 'verify:release'];
export const staticReleaseScriptPaths = [
  'scripts/package-extension.ps1',
  'scripts/verify-package-output.ps1',
  'scripts/verify-release.ps1'
];

export function getBrowserLoadTriggerFailures(scriptEntries) {
  return scriptEntries
    .filter(([, scriptText]) => browserLoadTriggerPattern.test(scriptText || ''))
    .map(([scriptPath]) => `${scriptPath} must stay static and must not launch or invoke the browser-load smoke check.`);
}

export async function getReleaseSafetyFailures(rootDir, packageJson) {
  const releaseReadiness = await readFile(path.join(rootDir, 'docs/release-readiness.md'), 'utf8');
  const releaseVerificationRecord = await readFile(path.join(rootDir, 'docs/release-verification-record.md'), 'utf8').catch(() => '');
  const browserLoadScript = await readFile(path.join(rootDir, 'scripts/check-unpacked-extension-load.ps1'), 'utf8').catch(() => '');
  const releaseVerifier = await readFile(path.join(rootDir, 'scripts/verify-release.ps1'), 'utf8').catch(() => '');
  const failures = [];

  if (!releaseVerificationRecord) {
    failures.push('Missing release verification record document.');
  }
  if (!browserLoadScript) {
    failures.push('Missing unpacked extension browser-load smoke script.');
  }
  if (!releaseVerifier) {
    failures.push('Missing release verification script.');
  }
  if (!/Release Verification Record/i.test(releaseReadiness) || !/browser-load and manual browser QA marked as pending/i.test(releaseReadiness)) {
    failures.push('Release readiness must link the release verification record and preserve pending browser-only status until isolated verification.');
  }
  if (!/automated gates are static repository and archive checks[\s\S]+must not invoke `npm run verify:browser-load`/i.test(releaseReadiness)) {
    failures.push('Release readiness must state automated gates do not invoke browser-load smoke checks.');
  }
  if (!/## Current Verification State[\s\S]+Browser-load status:\s+not fully browser-verified[\s\S]+isolated Chromium-based browser\/profile/i.test(releaseReadiness)) {
    failures.push('Release readiness must explicitly mark browser-load as not fully browser-verified until the isolated smoke check runs.');
  }
  if (!/`npm run verify:browser-load` is not an automated gate[\s\S]+isolated target-browser smoke check is required before publishing[\s\S]+not fully browser-verified/i.test(releaseReadiness)) {
    failures.push('Release readiness must keep browser-load as a required isolated target-browser check before publishing.');
  }
  if (!/refuses to launch when browser-management or blocker software such as Cold Turkey is running/i.test(releaseReadiness)) {
    failures.push('Release readiness must document the browser-load script guard for active browser-management or blocker software.');
  }
  if (!/## Release Archive Policy[\s\S]+`dist\/` folder is disposable release output[\s\S]+`npm run package` resets it before packaging[\s\S]+Defense_against_Distractions-vX\.Y\.Z-extension\.zip[\s\S]+Chrome Web Store upload package[\s\S]+Defense_against_Distractions-vX\.Y\.Z-source\.zip[\s\S]+matching source archive[\s\S]+No staging folders[\s\S]+stale version ZIPs/i.test(releaseReadiness)) {
    failures.push('Release readiness must document the explicit dist archive policy for the current extension and source ZIP outputs.');
  }
  if (!/## Browser-Only Evidence[\s\S]+`npm run verify:browser-load`[\s\S]+Not run[\s\S]+isolated Chromium-based browser\/profile[\s\S]+Manual QA from `docs\/release-checklist\.md`[\s\S]+User-reported pass on 2026-07-06[\s\S]+## Manual QA Evidence[\s\S]+Manual QA result:\s+user reported that manual QA looks working/i.test(releaseVerificationRecord)) {
    failures.push('Release verification record must keep browser-load command status separate while recording the user-reported manual QA pass.');
  }
  if (!/Static verification status:\s+passed[\s\S]+`npm run package`[\s\S]+`npm run verify:package`[\s\S]+`npm run verify:release`/i.test(releaseVerificationRecord)) {
    failures.push('Release verification record must record static gate pass status for the current package.');
  }
  if (!/## Static Gate Evidence[\s\S]+Current result:\s+passed[\s\S]+`npm test`[\s\S]+\d+ unit tests passed[\s\S]+`npm run verify:release`[\s\S]+Passed for `Defense_against_Distractions-v1\.6\.1`/i.test(releaseVerificationRecord)) {
    failures.push('Release verification record must list the static release gate evidence recorded for the current package.');
  }
  if (!/\$unitTestOutput\s*=\s*@\(node --test "test\/\*\*\/\*\.test\.js" 2>&1\)/.test(releaseVerifier) ||
      !/\\btests\\s\+\(\\d\+\)\\s\*\$/.test(releaseVerifier) ||
      !/Unit test suite output did not report a test count/.test(releaseVerifier) ||
      !/docs\\release-verification-record\.md/.test(releaseVerifier) ||
      !/Release verification record unit test count does not match current npm test output/.test(releaseVerifier)) {
    failures.push('Release verifier must bind the recorded unit test count to current node --test output.');
  }
  if (!/\[switch\]\$AllowBrowserManagementTools/.test(browserLoadScript) ||
      !/DAD_ALLOW_BROWSER_LOAD_WITH_BROWSER_MANAGEMENT/.test(browserLoadScript) ||
      !/cold\\s\*turkey\|coldturkey/i.test(browserLoadScript) ||
      !/Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+\$extensionPathToLoad = \$ExtensionPath/.test(browserLoadScript) ||
      !/Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+Expand-Archive/.test(browserLoadScript) ||
      !/Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+\$browser = Get-BrowserExecutable/.test(browserLoadScript) ||
      !/Assert-BrowserLoadEnvironmentSafe -AllowBrowserManagementTools:\$AllowBrowserManagementTools[\s\S]+Start-Process/.test(browserLoadScript)) {
    failures.push('Browser-load smoke script must refuse before extension extraction, browser discovery, and browser launch when browser-management or blocker software is detected.');
  }

  failures.push(...getBrowserLoadTriggerFailures(
    staticPackageScriptNames.map((scriptName) => [`package.json scripts.${scriptName}`, packageJson.scripts?.[scriptName] || ''])
  ));

  const releaseScriptEntries = await Promise.all(staticReleaseScriptPaths.map(async (scriptPath) => [
    scriptPath,
    await readFile(path.join(rootDir, scriptPath), 'utf8')
  ]));
  failures.push(...getBrowserLoadTriggerFailures(releaseScriptEntries));

  return failures;
}
