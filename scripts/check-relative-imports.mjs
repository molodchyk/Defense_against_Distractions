// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const sourceExtensions = new Set(['.js', '.mjs']);
const ignoredDirs = new Set([
  '.git',
  'dist',
  'node_modules'
]);

const staticImportPattern = /\b(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
const dynamicImportPattern = /\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      files.push(...await collectSourceFiles(path.join(directory, entry.name)));
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getRelativeImports(source) {
  return [
    ...source.matchAll(staticImportPattern),
    ...source.matchAll(dynamicImportPattern)
  ].map(match => match[1]);
}

const files = await collectSourceFiles(rootDir);
const missing = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const specifier of getRelativeImports(source)) {
    const target = path.resolve(path.dirname(file), specifier);
    if (!await exists(target)) {
      missing.push({
        file: path.relative(rootDir, file).replaceAll('\\', '/'),
        specifier
      });
    }
  }
}

if (missing.length === 0) {
  console.log(`Relative import check passed: ${files.length} files scanned.`);
  process.exit(0);
}

console.error('Relative import check failed.');
for (const entry of missing) {
  console.error(`${entry.file} -> ${entry.specifier}`);
}
process.exit(1);
