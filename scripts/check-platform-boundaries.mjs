// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const failures = [];
const rawChromeApiPattern = /\b(?:global|globalThis)\.chrome\b|\bchrome\.(?:runtime|storage|i18n|tabs|action|alarms|idle|contextMenus|webNavigation|downloads|windows)\b|\bruntime\.lastError\b/;
const sourceRoot = 'src';
const platformChromeRoot = path.join('src', 'platform', 'chrome');

function assertCondition(condition, message) {
  if (!condition) failures.push(message);
}

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function getSourceJavascriptFiles(relativeDirectory = sourceRoot) {
  const absoluteDirectory = path.join(rootDir, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getSourceJavascriptFiles(relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(normalizePath(relativePath));
    }
  }

  return files;
}

async function getRawChromeApiViolations() {
  const sourceFiles = await getSourceJavascriptFiles();
  const violations = [];

  for (const sourceFile of sourceFiles) {
    if (sourceFile.startsWith(`${normalizePath(platformChromeRoot)}/`)) {
      continue;
    }

    const text = await readText(sourceFile);
    if (rawChromeApiPattern.test(text)) {
      violations.push(sourceFile);
    }
  }

  return violations;
}

const [
  manifest,
  contentBridge,
  appContent,
  contentState,
  contentUiLanguage,
  contentPageSignals,
  contentContinueMessage,
  contentOverlayMessages,
  contentMiniPanel,
  contentMiniPanelLayout,
  contentMiniPanelRender,
  contentUiBlockingStorage,
  sharedUiLanguage,
  optionsUiLanguage,
  elementRuleStorage
] = await Promise.all([
  readJson('manifest.json'),
  readText('src/platform/chrome/contentBridge.js'),
  readText('src/app/content/index.js'),
  readText('src/js/content/state.js'),
  readText('src/js/content/uiLanguage.js'),
  readText('src/js/content/pageSignals.js'),
  readText('src/js/content/intent/continueMessage.js'),
  readText('src/js/content/content-blocking/overlayMessages.js'),
  readText('src/js/content/pomodoro/miniPanel.js'),
  readText('src/js/content/pomodoro/miniPanelLayout.js'),
  readText('src/js/content/pomodoro/miniPanelRender.js'),
  readText('src/js/content/ui-blocking/storage.js'),
  readText('src/js/shared/ui/uiLanguage.js'),
  readText('src/js/options/uiLanguage.js'),
  readText('src/js/options/element-rules/storage.js')
]);
const rawChromeApiViolations = await getRawChromeApiViolations();

assertCondition(
  manifest.content_scripts?.[0]?.js?.[0] === 'src/platform/chrome/contentBridge.js',
  'Manifest content scripts must load the Chrome content bridge before feature scripts.'
);
assertCondition(
  /runtime.*sendMessage/.test(contentBridge)
    && /runtime.*onMessage/.test(contentBridge)
    && /runtime.*getURL/.test(contentBridge)
    && /storage.*sync/.test(contentBridge)
    && /storage.*local/.test(contentBridge)
    && /chrome\?\.i18n|chrome\.i18n/.test(contentBridge)
    && /lastError/.test(contentBridge),
  'Chrome content bridge must own classic content-script runtime, storage, URL, and i18n access.'
);
assertCondition(
  [
    appContent,
    contentState,
    contentUiLanguage,
    contentPageSignals,
    contentContinueMessage,
    contentOverlayMessages,
    contentMiniPanel,
    contentMiniPanelLayout,
    contentMiniPanelRender,
    contentUiBlockingStorage
  ].every(text => /ChromePlatform|safeRuntimeSendMessage|safeSyncStorage/.test(text) && !rawChromeApiPattern.test(text)),
  'Migrated classic content modules must use the Chrome content bridge instead of raw runtime/storage/i18n calls.'
);
assertCondition(
  [sharedUiLanguage, optionsUiLanguage, elementRuleStorage].every(text => !rawChromeApiPattern.test(text)),
  'Shared/options UI language and element-rule storage modules must use platform wrappers instead of raw Chrome storage/i18n calls.'
);
assertCondition(
  rawChromeApiViolations.length === 0,
  `Source modules outside src/platform/chrome must not use raw Chrome APIs: ${rawChromeApiViolations.join(', ')}`
);

if (failures.length === 0) {
  console.log('Platform boundary check passed.');
  process.exit(0);
}

console.error('Platform boundary check failed.');
console.error('');
failures.forEach(failure => console.error(`- ${failure}`));
process.exit(1);
