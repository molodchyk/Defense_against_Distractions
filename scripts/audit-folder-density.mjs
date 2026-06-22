// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const shouldFail = process.argv.includes('--fail');
const sourceExtensions = new Set(['.css', '.html', '.js', '.mjs']);
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
    name: 'runtime root',
    max: 10,
    hard: 16,
    matches(relativeDir) {
      return [
        'src/app',
        'src/js'
      ].includes(relativeDir);
    }
  },
  {
    name: 'root extension HTML shells',
    max: 8,
    hard: 12,
    matches(relativeDir) {
      return relativeDir === 'src';
    }
  },
  {
    name: 'app runtime surface',
    max: 12,
    hard: 18,
    matches(relativeDir) {
      return relativeDir.startsWith('src/app/');
    }
  },
  {
    name: 'feature root',
    max: 12,
    hard: 18,
    matches(relativeDir) {
      return relativeDir === 'src/features';
    }
  },
  {
    name: 'feature surface',
    max: 15,
    hard: 24,
    matches(relativeDir) {
      return relativeDir.startsWith('src/features/');
    }
  },
  {
    name: 'platform root',
    max: 12,
    hard: 18,
    matches(relativeDir) {
      return relativeDir === 'src/platform';
    }
  },
  {
    name: 'platform surface',
    max: 15,
    hard: 24,
    matches(relativeDir) {
      return relativeDir.startsWith('src/platform/');
    }
  },
  {
    name: 'runtime surface',
    max: 12,
    hard: 18,
    matches(relativeDir) {
      return [
        'src/js/background',
        'src/js/content',
        'src/js/options',
        'src/js/shared'
      ].includes(relativeDir);
    }
  },
  {
    name: 'feature subfolder',
    max: 15,
    hard: 24,
    matches(relativeDir) {
      return relativeDir.startsWith('src/js/') && relativeDir.split('/').length >= 4;
    }
  },
  {
    name: 'popup surface',
    max: 15,
    hard: 24,
    matches(relativeDir) {
      return relativeDir === 'src/js/popup';
    }
  },
  {
    name: 'css surface',
    max: 12,
    hard: 18,
    matches(relativeDir) {
      return relativeDir.startsWith('src/css');
    }
  },
  {
    name: 'test folder',
    max: 12,
    hard: 18,
    matches(relativeDir) {
      return relativeDir === 'test' || relativeDir.startsWith('test/');
    }
  },
  {
    name: 'project scripts',
    max: 15,
    hard: 24,
    matches(relativeDir) {
      return relativeDir === 'scripts';
    }
  },
  {
    name: 'project script support',
    max: 8,
    hard: 12,
    matches(relativeDir) {
      return relativeDir.startsWith('scripts/');
    }
  }
];

async function collectFolders(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const folders = [];
  let sourceFileCount = 0;

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        auditStats.ignoredDirectories += 1;
        continue;
      }
      folders.push(...await collectFolders(entryPath));
      continue;
    }

    const isFileEntry = entry.isFile() || (entry.isSymbolicLink() && (await stat(entryPath)).isFile());
    if (isFileEntry && sourceExtensions.has(path.extname(entry.name))) {
      sourceFileCount += 1;
    }
  }

  const relativeDir = path.relative(rootDir, directory).replaceAll('\\', '/');
  if (relativeDir && sourceFileCount > 0) {
    folders.push({ relativeDir, sourceFileCount });
  }

  return folders;
}

function getBudget(relativeDir) {
  return budgets.find(budget => budget.matches(relativeDir));
}

function pad(value, length) {
  return String(value).padEnd(length, ' ');
}

const folders = await collectFolders(rootDir);
const foldersWithBudgets = folders.map(folder => ({ ...folder, budget: getBudget(folder.relativeDir) }));
const budgetedFolderCount = foldersWithBudgets.filter(folder => folder.budget).length;
const unbudgetedFolderCount = foldersWithBudgets.length - budgetedFolderCount;
const rows = foldersWithBudgets
  .filter(folder => folder.budget)
  .map(folder => ({
    status: folder.sourceFileCount > folder.budget.hard
      ? 'hard'
      : folder.sourceFileCount > folder.budget.max
        ? 'soft'
        : 'ok',
    files: folder.sourceFileCount,
    max: folder.budget.max,
    hard: folder.budget.hard,
    category: folder.budget.name,
    folder: folder.relativeDir
  }))
  .filter(row => row.status !== 'ok')
  .sort((a, b) => {
    const statusOrder = { hard: 0, soft: 1 };
    return statusOrder[a.status] - statusOrder[b.status]
      || b.files - a.files
      || a.folder.localeCompare(b.folder);
  });

function printCoverageSummary() {
  console.log(`Scope: folders containing ${Array.from(sourceExtensions).join(', ')} files outside ${Array.from(ignoredDirs).join(', ')}.`);
  console.log(`Coverage: ${budgetedFolderCount} budgeted / ${folders.length} matching folders; ${unbudgetedFolderCount} matching folders are outside configured budgets; ${auditStats.ignoredDirectories} ignored directories.`);
}

if (rows.length === 0) {
  console.log('Folder-density audit passed.');
  printCoverageSummary();
  process.exit(0);
}

console.log('Folder-density audit found folders over the documented budgets.');
printCoverageSummary();
console.log('');
console.log(`${pad('Status', 8)}${pad('Files', 7)}${pad('Budget', 8)}${pad('Hard', 6)}${pad('Category', 18)}Folder`);
console.log(`${pad('------', 8)}${pad('-----', 7)}${pad('------', 8)}${pad('----', 6)}${pad('--------', 18)}------`);
for (const row of rows) {
  console.log(`${pad(row.status, 8)}${pad(row.files, 7)}${pad(row.max, 8)}${pad(row.hard, 6)}${pad(row.category, 18)}${row.folder}`);
}
console.log('');
console.log('Soft means split soon. Hard means folder-index debt and should not grow further.');

if (shouldFail && rows.some(row => row.status === 'hard')) {
  process.exit(1);
}
