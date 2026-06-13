// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}${result.stderr}`;
}

describe('audit scripts', () => {
  it('reports file-size audit scope and budget coverage', () => {
    const output = runNodeScript('scripts/audit-file-sizes.mjs');

    assert.match(output, /File-size audit/);
    assert.match(output, /Scope: \.js, \.mjs, \.css, \.html files outside \.git, dist, node_modules\./);
    assert.match(output, /Coverage: \d+ budgeted \/ \d+ matching files; \d+ matching files are outside configured budgets; \d+ ignored directories\./);
  });

  it('reports folder-density audit scope and budget coverage', () => {
    const output = runNodeScript('scripts/audit-folder-density.mjs');

    assert.match(output, /Folder-density audit/);
    assert.match(output, /Scope: folders containing \.css, \.html, \.js, \.mjs files outside \.git, dist, node_modules\./);
    assert.match(output, /Coverage: \d+ budgeted \/ \d+ matching folders; \d+ matching folders are outside configured budgets; \d+ ignored directories\./);
  });

  it('verifies locale message key coverage', () => {
    const output = runNodeScript('scripts/check-locale-coverage.mjs');

    assert.match(output, /Locale coverage check passed:/);
    assert.match(output, /\d+ locales match \d+ en message keys\./);
  });
});
