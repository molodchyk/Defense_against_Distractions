// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}${result.stderr}`;
}

function runNodeScriptFailureInCwd(scriptPath, cwd) {
  const result = spawnSync(process.execPath, [path.join(process.cwd(), scriptPath)], {
    cwd,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0, 'Expected script to fail.');
  return `${result.stdout}${result.stderr}`;
}

async function writeText(root, relativePath, text) {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text);
}

describe('audit scripts', () => {
  it('reports file-size audit scope and budget coverage', () => {
    const output = runNodeScript('scripts/audit-file-sizes.mjs');

    assert.match(output, /File-size audit/);
    assert.match(output, /Scope: \.js, \.mjs, \.css, \.html files outside \.git, dist, node_modules\./);
    assert.match(output, /Coverage: \d+ budgeted \/ \d+ matching files; \d+ matching files are outside configured budgets; \d+ ignored directories\./);
    assert.match(output, /0 matching files are outside configured budgets/);
  });

  it('reports folder-density audit scope and budget coverage', () => {
    const output = runNodeScript('scripts/audit-folder-density.mjs');

    assert.match(output, /Folder-density audit/);
    assert.match(output, /Scope: folders containing \.css, \.html, \.js, \.mjs files outside \.git, dist, node_modules\./);
    assert.match(output, /Coverage: \d+ budgeted \/ \d+ matching folders; \d+ matching folders are outside configured budgets; \d+ ignored directories\./);
    assert.match(output, /0 matching folders are outside configured budgets/);
  });

  it('verifies locale message key coverage', () => {
    const output = runNodeScript('scripts/check-locale-coverage.mjs');

    assert.match(output, /Locale coverage check passed:/);
    assert.match(output, /\d+ locales match \d+ en message keys\./);
    assert.match(output, /Store listing coverage passed:/);
    assert.match(output, /\d+ locale listing files match _locales\./);
  });

  it('rejects locale coverage when store listing files do not match locale folders', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-locale-coverage-'));

    try {
      const messages = JSON.stringify({ description: { message: 'Fixture description.' } }, null, 2);
      await writeText(projectRoot, '_locales/en/messages.json', messages);
      await writeText(projectRoot, '_locales/de/messages.json', messages);
      await writeText(projectRoot, 'store/store-listing/en.txt', 'Fixture listing.\n');
      await writeText(projectRoot, 'docs/localization.md', `# Localization

## Chrome Web Store Visible Languages

- \`en\` - English
- \`de\` - Deutsch
`);

      const output = runNodeScriptFailureInCwd('scripts/check-locale-coverage.mjs', projectRoot);

      assert.match(output, /Missing store listing for locale: de\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('rejects locale coverage when locale folders are missing from localization docs', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-locale-doc-coverage-'));

    try {
      const messages = JSON.stringify({ description: { message: 'Fixture description.' } }, null, 2);
      await writeText(projectRoot, '_locales/en/messages.json', messages);
      await writeText(projectRoot, '_locales/de/messages.json', messages);
      await writeText(projectRoot, 'store/store-listing/en.txt', 'Fixture listing.\n');
      await writeText(projectRoot, 'store/store-listing/de.txt', 'Fixture listing.\n');
      await writeText(projectRoot, 'docs/localization.md', `# Localization

## Chrome Web Store Visible Languages

- \`en\` - English
`);

      const output = runNodeScriptFailureInCwd('scripts/check-locale-coverage.mjs', projectRoot);

      assert.match(output, /de: missing from docs\/localization\.md visible or extra locale lists\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('verifies static extension surface localization coverage', () => {
    const output = runNodeScript('scripts/check-static-localization.mjs');

    assert.match(output, /Static localization check passed:/);
    assert.match(output, /\d+ extension HTML surfaces scanned\./);
  });

  it('verifies browser extension playbook metadata', () => {
    const output = runNodeScript('scripts/check-browser-extension-playbook.mjs');

    assert.match(output, /Browser extension playbook check passed:/);
    assert.match(output, /\d+ localized store listings verified\./);
  });

  it('verifies platform boundary ownership', () => {
    const output = runNodeScript('scripts/check-platform-boundaries.mjs');

    assert.match(output, /Platform boundary check passed\./);
  });

});
