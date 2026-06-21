// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isInProtectedSchedule } from '../shared/plans.js';
import { download } from '../../platform/chrome/downloads.js';
import { clearLocal, clearSync, getSync, removeSync, setSync } from '../../platform/chrome/storage.js';
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
  lockedScheduleErrorMessage: 'Cannot weaken protection during an active protected schedule.',
  resetExtensionConfirm: 'Reset all DaD settings, rules, schedules, local diagnostics, timers, and runtime state? Export first if you want a backup. This cannot be undone.',
  resetExtensionLockedError: 'Cannot reset extension data during an active protected schedule.',
  resetExtensionFailed: 'Could not reset extension data.',
  resetExtensionStatus: 'Extension data reset. Reloading.'
};

export function initializeStorageTransfer() {
  const exportButton = document.getElementById('exportButton');
  const exportRulesetButton = document.getElementById('exportRulesetButton');
  const importButton = document.getElementById('importButton');
  const resetButton = document.getElementById('resetExtensionButton');
  const fileInput = document.getElementById('fileInput');

  if (!exportButton || !importButton || !fileInput) {
    return;
  }

  fileInput.accept = 'application/json,.json';
  exportButton.addEventListener('click', exportSettings);
  exportRulesetButton?.addEventListener('click', exportRuleset);
  fileInput.addEventListener('change', importSettings);
  importButton.addEventListener('click', () => fileInput.click());
  resetButton?.addEventListener('click', resetExtensionData);
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

async function resetExtensionData() {
  const resetButton = document.getElementById('resetExtensionButton');
  const status = document.getElementById('resetExtensionStatus');

  try {
    if (resetButton) {
      resetButton.disabled = true;
    }
    const currentItems = await getSync(null);
    if (isInProtectedSchedule(currentItems)) {
      alert(getMessage('resetExtensionLockedError'));
      return;
    }

    if (!confirm(getMessage('resetExtensionConfirm'))) {
      return;
    }

    await Promise.all([
      clearSync(),
      clearLocal()
    ]);

    if (status) {
      status.textContent = getMessage('resetExtensionStatus');
    }
    window.location.reload();
  } catch (error) {
    console.error('Failed to reset extension data:', error);
    alert(getMessage('resetExtensionFailed'));
  } finally {
    if (resetButton) {
      resetButton.disabled = false;
    }
  }
}

function downloadJsonPayload(payload, filenamePrefix) {
  const result = JSON.stringify(payload, null, 2);
  const url = `data:text/json;charset=utf-8,${encodeURIComponent(result)}`;
  const dateString = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}-${dateString}.json`;

  return download({ url, filename });
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
