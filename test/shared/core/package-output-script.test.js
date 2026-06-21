// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const manifest = {
  manifest_version: 3,
  name: 'Package Verifier Fixture',
  version: '1.0.0',
  action: {
    default_popup: 'popup.html',
    default_icon: {
      16: 'icons/icon-16.png'
    }
  },
  options_page: 'options.html',
  background: {
    service_worker: 'background.js',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content.js'],
      css: ['content.css']
    }
  ],
  web_accessible_resources: [
    {
      resources: ['blocked.html'],
      matches: ['<all_urls>']
    }
  ],
  icons: {
    16: 'icons/icon-16.png'
  }
};

async function writeFixtureFile(root, relativePath, contents = '') {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
}

async function createPackageFixture({
  contentCss = 'html { color-scheme: dark; }\n',
  popupHtml = '<script type="module" src="popup.js"></script>',
  popupJs = 'export const popupReady = true;\n'
} = {}) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-package-check-'));
  const packageRoot = path.join(projectRoot, 'dist', 'extension');
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

  await writeFixtureFile(projectRoot, 'manifest.json', manifestText);
  await writeFixtureFile(projectRoot, 'package.json', `${JSON.stringify({ name: 'fixture', version: manifest.version }, null, 2)}\n`);
  await writeFixtureFile(packageRoot, 'manifest.json', manifestText);
  await writeFixtureFile(packageRoot, 'popup.html', popupHtml);
  await writeFixtureFile(packageRoot, 'popup.js', popupJs);
  await writeFixtureFile(packageRoot, 'options.html', '<script type="module" src="options.js"></script>\n');
  await writeFixtureFile(packageRoot, 'options.js', 'export const optionsReady = true;\n');
  await writeFixtureFile(packageRoot, 'background.js', 'export const backgroundReady = true;\n');
  await writeFixtureFile(packageRoot, 'content.js', 'globalThis.__fixtureContentLoaded = true;\n');
  await writeFixtureFile(packageRoot, 'content.css', contentCss);
  await writeFixtureFile(packageRoot, 'blocked.html', '<main>Blocked</main>\n');
  await writeFixtureFile(packageRoot, 'icons/icon-16.png', 'not-a-real-png');

  return { packageRoot, projectRoot };
}

function runPackageCheck(projectRoot, packageRoot) {
  return spawnSync(
    process.execPath,
    [
      'scripts/check-package-output.mjs',
      '--project-root',
      projectRoot,
      '--package-root',
      packageRoot
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );
}

describe('package output verifier', () => {
  it('passes a generated extension package with local executable code', async () => {
    const { packageRoot, projectRoot } = await createPackageFixture();

    try {
      const result = runPackageCheck(projectRoot, packageRoot);

      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout, /Package output check passed: \d+ files scanned, \d+ manifest references verified\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('rejects remote executable script tags in package output', async () => {
    const { packageRoot, projectRoot } = await createPackageFixture({
      popupHtml: '<script src="https://example.com/remote.js"></script>\n'
    });

    try {
      const result = runPackageCheck(projectRoot, packageRoot);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Remote executable code detected: popup\.html: remote script tag/);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('rejects remote network access in package output', async () => {
    const { packageRoot, projectRoot } = await createPackageFixture({
      popupJs: 'fetch("https://analytics.example.com/pixel");\n'
    });

    try {
      const result = runPackageCheck(projectRoot, packageRoot);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Remote network access detected: popup\.js: unexpected fetch call/);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('rejects remote stylesheet network access in package output', async () => {
    const { packageRoot, projectRoot } = await createPackageFixture({
      contentCss: '.pixel { background-image: url("https://analytics.example.com/pixel.gif"); }\n'
    });

    try {
      const result = runPackageCheck(projectRoot, packageRoot);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Remote network access detected: content\.css: remote CSS URL/);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('rejects relative imports that are missing from package output', async () => {
    const missingImportFixture = ['import', '"./missing-feature.js";\n'].join(' ');
    const { packageRoot, projectRoot } = await createPackageFixture({
      popupJs: missingImportFixture
    });

    try {
      const result = runPackageCheck(projectRoot, packageRoot);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /popup\.js imports a missing package file: \.\/missing-feature\.js/);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });
});
