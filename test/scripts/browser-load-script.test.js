// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

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
});
