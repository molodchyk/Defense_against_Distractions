// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isInProtectedSchedule } from '../shared/plans.js';
import { getSync, removeSync, setSync } from '../shared/storage/chromeStorage.js';
import { getUiMessage } from '../shared/ui/uiLanguage.js';
import {
  buildRulesetExportPayload,
  buildSettingsExportPayload,
  getImportReplacementKeys,
  parseSettingsImportPayload
} from './storage-transfer/model.js';

const FALLBACK_MESSAGES = {
  importSettingsConfirm: 'Import $1 configuration items from this file? Current DaD configuration will be replaced.',
  importRulesetConfirm: 'Import $1 shared ruleset items from this file? Current plans, groups, schedules, allowed sites, and UI cleanup rules will be replaced. Local UI settings, passwords, billing, runtime state, and diagnostics stay unchanged.',
  importSettingsLockedError: 'Cannot import settings during an active protected schedule.',
  importSettingsFailed: 'Could not import settings. Check that the file is a DaD settings or ruleset export.',
  lockedScheduleErrorMessage: 'Cannot weaken protection during an active protected schedule.'
};

export function initializeStorageTransfer() {
  const exportButton = document.getElementById('exportButton');
  const exportRulesetButton = document.getElementById('exportRulesetButton');
  const importButton = document.getElementById('importButton');
  const fileInput = document.getElementById('fileInput');

  if (!exportButton || !importButton || !fileInput) {
    return;
  }

  fileInput.accept = 'application/json,.json';
  exportButton.addEventListener('click', exportSettings);
  exportRulesetButton?.addEventListener('click', exportRuleset);
  fileInput.addEventListener('change', importSettings);
  importButton.addEventListener('click', () => fileInput.click());
}

export async function exportSettings() {
  try {
    const items = await getSync(null);
    await downloadJsonPayload(buildSettingsExportPayload(items), 'DaD-extension-data');
  } catch (error) {
    console.error('Failed to export settings:', error);
    throw error;
  }
}

export async function exportRuleset() {
  try {
    const items = await getSync(null);
    await downloadJsonPayload(buildRulesetExportPayload(items), 'DaD-ruleset');
  } catch (error) {
    console.error('Failed to export ruleset:', error);
    throw error;
  }
}

async function importSettings(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    const currentItems = await getSync(null);
    if (isInProtectedSchedule(currentItems)) {
      alert(getMessage('importSettingsLockedError'));
      return;
    }

    const importResult = parseSettingsImportPayload(await readTextFile(file));
    const confirmKey = importResult.importKind === 'ruleset'
      ? 'importRulesetConfirm'
      : 'importSettingsConfirm';
    const confirmed = confirm(getMessage(confirmKey, [String(importResult.importedKeys.length)]));
    if (!confirmed) {
      return;
    }

    const replacedKeys = getImportReplacementKeys(currentItems, importResult.importKind);
    if (replacedKeys.length > 0) {
      await removeSync(replacedKeys);
    }

    await setSync(importResult.items);
    window.location.reload();
  } catch (error) {
    console.error('Failed to import settings:', error);
    alert(getMessage('importSettingsFailed'));
  } finally {
    input.value = '';
  }
}

function downloadJsonPayload(payload, filenamePrefix) {
  const result = JSON.stringify(payload, null, 2);
  const url = `data:text/json;charset=utf-8,${encodeURIComponent(result)}`;
  const dateString = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}-${dateString}.json`;

  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename }, downloadId => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(downloadId);
    });
  });
}

function readTextFile(file) {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result || '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

function getMessage(key, substitutions) {
  return getUiMessage(key, FALLBACK_MESSAGES[key] || key, substitutions);
}
