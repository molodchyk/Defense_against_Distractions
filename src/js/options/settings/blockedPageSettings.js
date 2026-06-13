// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH,
  BLOCKED_PAGE_SETTINGS_STORAGE_KEY,
  getBlockedPageSettingsStorageDefaults,
  normalizeBlockedPageSettings
} from '../../shared/blocked-page/settings.js';
import { getSync, setSync } from '../../shared/storage/chromeStorage.js';
import { getUiMessage } from '../../shared/ui/uiLanguage.js';

const ELEMENT_IDS = {
  input: 'blockedPageMessageInput',
  count: 'blockedPageMessageCount',
  status: 'blockedPageMessageStatus',
  saveButton: 'saveBlockedPageMessageButton',
  clearButton: 'clearBlockedPageMessageButton'
};

const FALLBACK_MESSAGES = {
  blockedPageSettingsSavedStatus: 'Blocked page note saved.',
  blockedPageSettingsClearedStatus: 'Blocked page note cleared.',
  blockedPageSettingsErrorStatus: 'Could not update the blocked page note.'
};

let initialized = false;

export function initializeBlockedPageSettings() {
  if (initialized) {
    return;
  }
  initialized = true;

  const input = getElement(ELEMENT_IDS.input);
  if (!input) {
    return;
  }

  input.maxLength = BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH;
  input.addEventListener('input', updateCharacterCount);

  getElement(ELEMENT_IDS.saveButton)?.addEventListener('click', () => {
    saveBlockedPageSettings(input.value);
  });

  getElement(ELEMENT_IDS.clearButton)?.addEventListener('click', () => {
    input.value = '';
    saveBlockedPageSettings('', 'blockedPageSettingsClearedStatus');
    updateCharacterCount();
  });

  loadBlockedPageSettings();
  installStorageSyncListener();
}

async function loadBlockedPageSettings() {
  try {
    const items = await getSync(getBlockedPageSettingsStorageDefaults());
    const settings = normalizeBlockedPageSettings(items?.[BLOCKED_PAGE_SETTINGS_STORAGE_KEY]);
    const input = getElement(ELEMENT_IDS.input);
    if (input) {
      input.value = settings.customMessage;
    }
    updateCharacterCount();
    setStatus('');
  } catch (error) {
    console.error('Failed to load blocked page settings:', error);
    setStatus(getMessage('blockedPageSettingsErrorStatus'));
  }
}

async function saveBlockedPageSettings(rawCustomMessage, statusKey = 'blockedPageSettingsSavedStatus') {
  try {
    const settings = normalizeBlockedPageSettings({ customMessage: rawCustomMessage });
    await setSync({ [BLOCKED_PAGE_SETTINGS_STORAGE_KEY]: settings });

    const input = getElement(ELEMENT_IDS.input);
    if (input) {
      input.value = settings.customMessage;
    }
    updateCharacterCount();
    setStatus(getMessage(statusKey));
  } catch (error) {
    console.error('Failed to save blocked page settings:', error);
    setStatus(getMessage('blockedPageSettingsErrorStatus'));
  }
}

function installStorageSyncListener() {
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes[BLOCKED_PAGE_SETTINGS_STORAGE_KEY]) {
        return;
      }

      const settings = normalizeBlockedPageSettings(changes[BLOCKED_PAGE_SETTINGS_STORAGE_KEY].newValue);
      const input = getElement(ELEMENT_IDS.input);
      if (input && input.value !== settings.customMessage) {
        input.value = settings.customMessage;
        updateCharacterCount();
      }
    });
  } catch (error) {
    // Options pages without extension APIs can still render static markup in tests/previews.
  }
}

function updateCharacterCount() {
  const input = getElement(ELEMENT_IDS.input);
  const count = getElement(ELEMENT_IDS.count);
  if (!input || !count) {
    return;
  }

  const length = input.value.length;
  count.textContent = `${length}/${BLOCKED_PAGE_CUSTOM_MESSAGE_MAX_LENGTH}`;
}

function setStatus(message) {
  const status = getElement(ELEMENT_IDS.status);
  if (status) {
    status.textContent = message;
  }
}

function getMessage(messageKey) {
  return getUiMessage(messageKey, FALLBACK_MESSAGES[messageKey] || '');
}

function getElement(id) {
  return document.getElementById(id);
}
