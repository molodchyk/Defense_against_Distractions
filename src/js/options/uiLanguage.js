// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_UI_LANGUAGE,
  UI_LANGUAGE_STORAGE_KEY,
  getAvailableUiLanguages,
  getPreferredUiLanguage,
  getUiMessage,
  initializeUiLanguage,
  setUiLanguagePreference
} from '../shared/ui/uiLanguage.js';
import { addStorageChangeListener } from '../../platform/chrome/storage.js';

export function initializeUiLanguageControl(onLanguageChanged) {
  const languageSelect = document.getElementById('uiLanguageSelect');
  if (!languageSelect) {
    return;
  }

  populateUiLanguageOptions(languageSelect);
  languageSelect.value = getPreferredUiLanguage() || DEFAULT_UI_LANGUAGE;

  languageSelect.addEventListener('change', async () => {
    const selectedLanguage = languageSelect.value || DEFAULT_UI_LANGUAGE;
    languageSelect.disabled = true;

    try {
      const languageState = await setUiLanguagePreference(selectedLanguage);
      populateUiLanguageOptions(languageSelect);
      languageSelect.value = languageState.preferred;
      await onLanguageChanged?.();
    } catch (error) {
      console.error('Failed to save UI language:', error);
    } finally {
      languageSelect.disabled = false;
    }
  });

  addStorageChangeListener(async (changes, areaName) => {
    if (areaName !== 'sync' || !changes[UI_LANGUAGE_STORAGE_KEY]) {
      return;
    }

    try {
      const languageState = await initializeUiLanguage();
      populateUiLanguageOptions(languageSelect);
      languageSelect.value = languageState.preferred;
      await onLanguageChanged?.();
    } catch (error) {
      console.error('Failed to sync UI language:', error);
    }
  });
}

function populateUiLanguageOptions(languageSelect) {
  getAvailableUiLanguages().forEach(language => {
    let option = languageSelect.querySelector(`option[value="${language.code}"]`);
    if (!option) {
      option = document.createElement('option');
      option.value = language.code;
      languageSelect.appendChild(option);
    }

    option.textContent = language.code === DEFAULT_UI_LANGUAGE
      ? getUiMessage('uiLanguageSystemOption', language.label)
      : language.label;
  });
}
