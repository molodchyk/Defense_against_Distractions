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

  it('keeps browser-load out of package and release gates', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

    for (const scriptName of staticPackageScriptNames) {
      assert.doesNotMatch(packageJson.scripts[scriptName], browserLoadTriggerPattern, `${scriptName} must stay static`);
    }

    for (const scriptPath of staticReleaseScriptPaths) {
      const script = readFileSync(scriptPath, 'utf8');
      assert.doesNotMatch(script, browserLoadTriggerPattern, `${scriptPath} must not launch browser-load`);
    }
  });

  it('keeps browser-load required but isolated in release readiness', () => {
    const releaseReadiness = readFileSync('docs/release-readiness.md', 'utf8');

    assert.match(releaseReadiness, /automated gates are static repository and archive checks[\s\S]+must not invoke `npm run verify:browser-load`/i);
    assert.match(releaseReadiness, /`npm run verify:browser-load` is not an automated gate[\s\S]+isolated target-browser smoke check is required before publishing[\s\S]+not fully browser-verified/i);
  });
});
