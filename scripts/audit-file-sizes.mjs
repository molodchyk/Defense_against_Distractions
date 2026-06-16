// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const shouldFail = process.argv.includes('--fail');
const extensions = new Set(['.js', '.mjs', '.css', '.html']);
const ignoredDirs = new Set([
  '.git',
  'dist',
  'node_modules'
]);
const auditStats = {
  ignoredDirectories: 0
};

const budgets = [
  {
    name: 'runtime entry',
    max: 150,
    hard: 300,
    matches(relativePath) {
      return [
        'src/app/background/index.js',
        'src/app/content/index.js',
        'src/app/popup/index.js',
        'src/app/options/index.js',
        'src/app/instructions/index.js',
        'src/app/blocked/index.js'
      ].includes(relativePath.replaceAll('\\', '/'));
    }
  },
  {
    name: 'content script adapter',
    max: 350,
    hard: 700,
    matches(relativePath) {
      const normalized = relativePath.replaceAll('\\', '/');
      return normalized.startsWith('src/js/content/') && normalized.endsWith('.js');
    }
  },
  {
    name: 'popup module',
    max: 450,
    hard: 900,
    matches(relativePath) {
      const normalized = relativePath.replaceAll('\\', '/');
      return normalized.startsWith('src/js/popup/') && normalized.endsWith('.js');
    }
  },
  {
    name: 'options module',
    max: 450,
    hard: 900,
    matches(relativePath) {
      const normalized = relativePath.replaceAll('\\', '/');
      return normalized.startsWith('src/js/options/') && normalized.endsWith('.js');
    }
  },
  {
    name: 'shared core module',
    max: 300,
    hard: 600,
    matches(relativePath) {
      const normalized = relativePath.replaceAll('\\', '/');
      return normalized.startsWith('src/js/shared/') && normalized.endsWith('.js');
    }
  },
  {
    name: 'background module',
    max: 350,
    hard: 700,
    matches(relativePath) {
      const normalized = relativePath.replaceAll('\\', '/');
      return normalized.startsWith('src/js/background/') && normalized.endsWith('.js');
    }
  },
  {
    name: 'feature module',
    max: 450,
    hard: 900,
    matches(relativePath) {
      const normalized = relativePath.replaceAll('\\', '/');
      return normalized.startsWith('src/features/') && normalized.endsWith('.js');
    }
  },
  {
    name: 'CSS surface',
    max: 500,
    hard: 900,
    matches(relativePath) {
      return relativePath.replaceAll('\\', '/').startsWith('src/css/') && relativePath.endsWith('.css');
    }
  },
  {
    name: 'test file',
    max: 500,
    hard: 900,
    matches(relativePath) {
      return relativePath.replaceAll('\\', '/').startsWith('test/') && relativePath.endsWith('.js');
    }
  }
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        auditStats.ignoredDirectories += 1;
        continue;
      }
      files.push(...await collectFiles(path.join(directory, entry.name)));
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

function lineCount(contents) {
  if (!contents) {
    return 0;
  }
  return contents.split(/\r\n|\r|\n/).length;
}

function budgetFor(relativePath) {
  return budgets.find(budget => budget.matches(relativePath)) || null;
}

function formatRelative(filePath) {
  return path.relative(rootDir, filePath).replaceAll('\\', '/');
}

const files = await collectFiles(rootDir);
const rows = [];
let budgetedFileCount = 0;
let unbudgetedFileCount = 0;

for (const filePath of files) {
  const relativePath = formatRelative(filePath);
  const budget = budgetFor(relativePath);
  if (!budget) {
    unbudgetedFileCount += 1;
    continue;
  }
  budgetedFileCount += 1;

  const contents = await readFile(filePath, 'utf8');
  const lines = lineCount(contents);
  const status = lines > budget.hard ? 'hard' : lines > budget.max ? 'soft' : 'ok';

  if (status !== 'ok') {
    rows.push({
      relativePath,
      lines,
      budget: budget.max,
      hard: budget.hard,
      category: budget.name,
      status
    });
  }
}

rows.sort((left, right) => right.lines - left.lines || left.relativePath.localeCompare(right.relativePath));

function printCoverageSummary() {
  console.log(`Scope: ${Array.from(extensions).join(', ')} files outside ${Array.from(ignoredDirs).join(', ')}.`);
  console.log(`Coverage: ${budgetedFileCount} budgeted / ${files.length} matching files; ${unbudgetedFileCount} matching files are outside configured budgets; ${auditStats.ignoredDirectories} ignored directories.`);
}

if (rows.length === 0) {
  console.log('File-size audit passed: no files exceed the documented budgets.');
  printCoverageSummary();
  process.exit(0);
}

console.log('File-size audit found files over the documented budgets.');
printCoverageSummary();
console.log('');
console.log('Status  Lines  Budget  Hard  Category                File');
console.log('------  -----  ------  ----  ----------------------  ----');

for (const row of rows) {
  console.log([
    row.status.padEnd(6),
    String(row.lines).padStart(5),
    String(row.budget).padStart(6),
    String(row.hard).padStart(4),
    row.category.padEnd(22),
    row.relativePath
  ].join('  '));
}

console.log('');
console.log('Soft means split soon. Hard means architecture debt and should not grow further.');

if (shouldFail && rows.some(row => row.status === 'hard')) {
  process.exit(1);
}
