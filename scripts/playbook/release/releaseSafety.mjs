// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const browserLoadTriggerPattern = /check-unpacked-extension-load\.ps1|verify:browser-load|--load-extension|--user-data-dir|Start-Process/i;
export const staticPackageScriptNames = ['package', 'verify:package', 'verify:release'];
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
  const failures = [];

  if (!/automated gates are static repository and archive checks[\s\S]+must not invoke `npm run verify:browser-load`/i.test(releaseReadiness)) {
    failures.push('Release readiness must state automated gates do not invoke browser-load smoke checks.');
  }
  if (!/## Current Verification State[\s\S]+Browser-load status:\s+not fully browser-verified[\s\S]+isolated Chromium-based browser\/profile/i.test(releaseReadiness)) {
    failures.push('Release readiness must explicitly mark browser-load as not fully browser-verified until the isolated smoke check runs.');
  }
  if (!/`npm run verify:browser-load` is not an automated gate[\s\S]+isolated target-browser smoke check is required before publishing[\s\S]+not fully browser-verified/i.test(releaseReadiness)) {
    failures.push('Release readiness must keep browser-load as a required isolated target-browser check before publishing.');
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
