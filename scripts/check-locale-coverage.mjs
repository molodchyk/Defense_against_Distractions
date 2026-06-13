// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const localesDir = path.join(rootDir, '_locales');
const defaultLocale = 'en';

async function readMessages(locale) {
  return JSON.parse(await readFile(path.join(localesDir, locale, 'messages.json'), 'utf8'));
}

async function getLocaleDirectories() {
  const entries = await readdir(localesDir);
  const locales = [];

  for (const entry of entries) {
    const entryPath = path.join(localesDir, entry);
    if ((await stat(entryPath)).isDirectory()) {
      locales.push(entry);
    }
  }

  return locales.sort((left, right) => left.localeCompare(right));
}

function getPlaceholderNames(entry = {}) {
  return Object.keys(entry.placeholders || {}).sort();
}

function formatKeyList(keys) {
  const shown = keys.slice(0, 8).join(', ');
  return keys.length > 8 ? `${shown}, +${keys.length - 8} more` : shown;
}

const defaultMessages = await readMessages(defaultLocale);
const defaultKeys = Object.keys(defaultMessages);
const defaultKeySet = new Set(defaultKeys);
const locales = await getLocaleDirectories();
const failures = [];

for (const locale of locales) {
  const messages = await readMessages(locale);
  const keys = Object.keys(messages);
  const keySet = new Set(keys);
  const missing = defaultKeys.filter(key => !keySet.has(key));
  const extra = keys.filter(key => !defaultKeySet.has(key));

  if (missing.length > 0) {
    failures.push(`${locale}: missing ${missing.length} keys (${formatKeyList(missing)})`);
  }

  if (extra.length > 0) {
    failures.push(`${locale}: has ${extra.length} keys not present in ${defaultLocale} (${formatKeyList(extra)})`);
  }

  for (const key of defaultKeys) {
    const entry = messages[key];
    if (!entry || typeof entry.message !== 'string') {
      failures.push(`${locale}: ${key} is missing a string message`);
      continue;
    }

    const expectedPlaceholders = getPlaceholderNames(defaultMessages[key]);
    const actualPlaceholders = getPlaceholderNames(entry);
    if (expectedPlaceholders.join('\0') !== actualPlaceholders.join('\0')) {
      failures.push(
        `${locale}: ${key} placeholders differ from ${defaultLocale}; expected [${expectedPlaceholders.join(', ')}], got [${actualPlaceholders.join(', ')}]`
      );
    }
  }
}

if (failures.length === 0) {
  console.log(`Locale coverage check passed: ${locales.length} locales match ${defaultKeys.length} ${defaultLocale} message keys.`);
  process.exit(0);
}

console.error('Locale coverage check failed.');
console.error('');
failures.forEach(failure => console.error(`- ${failure}`));
process.exit(1);
