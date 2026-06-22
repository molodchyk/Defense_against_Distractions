// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const failures = [];
const rawChromeContentApiPattern = /\b(?:global|globalThis)\.chrome\b|\bchrome\.(?:runtime|storage|i18n)\b/;

function assertCondition(condition, message) {
  if (!condition) failures.push(message);
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
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
  ].every(text => /ChromePlatform|safeRuntimeSendMessage|safeSyncStorage/.test(text) && !rawChromeContentApiPattern.test(text)),
  'Migrated classic content modules must use the Chrome content bridge instead of raw runtime/storage/i18n calls.'
);
assertCondition(
  [sharedUiLanguage, optionsUiLanguage, elementRuleStorage].every(text => !rawChromeContentApiPattern.test(text)),
  'Shared/options UI language and element-rule storage modules must use platform wrappers instead of raw Chrome storage/i18n calls.'
);

if (failures.length === 0) {
  console.log('Platform boundary check passed.');
  process.exit(0);
}

console.error('Platform boundary check failed.');
console.error('');
failures.forEach(failure => console.error(`- ${failure}`));
process.exit(1);
