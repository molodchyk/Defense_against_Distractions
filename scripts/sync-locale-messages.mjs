// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const localesDir = path.join(rootDir, '_locales');
const defaultLocale = 'en';
const newline = '\n';

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

function orderLikeDefault(defaultMessages, localeMessages) {
  const orderedMessages = {};

  for (const key of Object.keys(defaultMessages)) {
    orderedMessages[key] = Object.hasOwn(localeMessages, key)
      ? localeMessages[key]
      : defaultMessages[key];
  }

  return orderedMessages;
}

const defaultMessages = await readMessages(defaultLocale);
const locales = await getLocaleDirectories();
let updatedCount = 0;

for (const locale of locales) {
  if (locale === defaultLocale) {
    continue;
  }

  const messages = await readMessages(locale);
  const orderedMessages = orderLikeDefault(defaultMessages, messages);
  const currentText = JSON.stringify(messages, null, 4);
  const nextText = JSON.stringify(orderedMessages, null, 4);

  if (currentText !== nextText) {
    await writeFile(path.join(localesDir, locale, 'messages.json'), `${nextText}${newline}`, 'utf8');
    updatedCount += 1;
  }
}

console.log(`Locale message sync complete: ${updatedCount} locale files updated from ${defaultLocale}.`);
