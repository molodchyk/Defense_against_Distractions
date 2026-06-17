// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { applyUiLanguageAttributes, getUiMessage } from '../shared/ui/uiLanguage.js';

const LOCALIZED_TEXT = {
  title: 'optionsTitle',
  appTitle: 'optionsTitle',
  optionsNavPlansLink: 'plansHeading',
  optionsNavBlockedUiLink: 'elementRulesLabel',
  optionsNavIntentLink: 'intentDiagnosticsNavLabel',
  optionsNavUsageLink: 'usageStatsNavLabel',
  optionsNavSettingsLink: 'settingsHeading',
  plansHeading: 'plansHeading',
  intentDiagnosticsHeading: 'intentDiagnosticsHeading',
  intentDiagnosticsIntroText: 'intentDiagnosticsIntroText',
  intentGraphHeading: 'intentGraphHeading',
  usageStatsHeading: 'usageStatsHeading',
  usageStatsIntroText: 'usageStatsIntroText',
  refreshUsageStatsButton: 'refreshButtonLabel',
  exportUsageStatsButton: 'exportJsonButtonLabel',
  clearUsageStatsButton: 'clearButtonLabel',
  settingsHeading: 'settingsHeading',
  settingsIntroText: 'settingsIntroText',
  appearanceSettingsHeading: 'appearanceSettingsHeading',
  blockedPageSettingsHeading: 'blockedPageSettingsHeading',
  blockedPageSettingsIntro: 'blockedPageSettingsIntro',
  blockedPageMessageLabel: 'blockedPageMessageLabel',
  blockedPageMessageHint: 'blockedPageMessageHint',
  saveBlockedPageMessageButton: 'saveButtonLabel',
  clearBlockedPageMessageButton: 'clearButtonLabel',
  configurationSettingsHeading: 'configurationSettingsHeading',
  configurationSettingsIntro: 'configurationSettingsIntro',
  resetExtensionButton: 'resetExtensionButton',
  resetExtensionHint: 'resetExtensionHint',
  setPasswordButton: 'setPasswordButton',
  deletePasswordButton: 'deletePasswordButton',
  instructionGuideLink: 'instructionGuideLink',
  exportButton: 'exportButton',
  exportRulesetButton: 'exportRulesetButton',
  importButton: 'importButton',
  addPlanButton: 'addPlanButton',
  themeModeLabel: 'themeModeLabel',
  themeModeSystemOption: 'themeModeSystemOption',
  themeModeDarkOption: 'themeModeDarkOption',
  themeModeLightOption: 'themeModeLightOption',
  uiLanguageLabel: 'uiLanguageLabel',
  uiLanguageHint: 'uiLanguageHint',
  elementRulesHeading: 'elementRulesLabel'
};

const LOCALIZED_PLACEHOLDERS = {
  planNameInput: 'planNamePlaceholder',
  passwordInputField: 'enterPasswordPlaceholder',
  confirmPasswordInputField: 'confirmPasswordPlaceholder',
  blockedPageMessageInput: 'blockedPageMessagePlaceholder',
  passwordInput: 'enterPasswordPlaceholder'
};

const FALLBACK_MESSAGES = {
  plansHeading: 'Plans',
  addPlanButton: 'Add Plan',
  planNamePlaceholder: 'Plan name',
  intentDiagnosticsNavLabel: 'Intent',
  intentDiagnosticsHeading: 'Intent diagnostics',
  intentDiagnosticsIntroText: 'Local trajectory state used by intent coherence. No raw typed input is stored.',
  intentGraphHeading: 'Intent chain graph',
  usageStatsNavLabel: 'Usage',
  usageStatsHeading: 'Usage stats',
  usageStatsIntroText: 'Local hostname-level aggregates. No raw text, full URLs, titles, or tokens are stored.',
  refreshButtonLabel: 'Refresh',
  exportJsonButtonLabel: 'Export JSON',
  clearButtonLabel: 'Clear',
  saveButtonLabel: 'Save',
  settingsHeading: 'Settings',
  settingsIntroText: 'Global extension controls that apply outside individual plans.',
  appearanceSettingsHeading: 'Appearance',
  blockedPageSettingsHeading: 'Blocked page',
  blockedPageSettingsIntro: 'Add a short note shown when DaD blocks a page.',
  blockedPageMessageLabel: 'Custom note',
  blockedPageMessageHint: 'Shown below the standard block reason. Stored locally in Chrome sync storage.',
  blockedPageMessagePlaceholder: 'Return to the task you chose before opening this page.',
  configurationSettingsHeading: 'Configuration',
  configurationSettingsIntro: 'Export a backup, restore from a DaD JSON file, or reset local extension data before uninstall.',
  exportButton: 'Export',
  exportRulesetButton: 'Export ruleset',
  importButton: 'Import',
  resetExtensionButton: 'Reset extension data',
  resetExtensionHint: 'Clears DaD settings, rules, schedules, local diagnostics, timers, and runtime state. Export first if you want a backup.',
  themeModeLabel: 'UI Mode',
  themeModeSystemOption: 'System',
  themeModeDarkOption: 'Dark',
  themeModeLightOption: 'Light',
  uiLanguageLabel: 'UI Language',
  uiLanguageSystemOption: 'System',
  uiLanguageHint: 'System follows Chrome. A selected language applies to DaD screens where translations exist.'
};

function getMessage(messageKey) {
  return getUiMessage(messageKey, FALLBACK_MESSAGES[messageKey] || '');
}

export function localizeOptionsPage() {
  applyUiLanguageAttributes();

  Object.entries(LOCALIZED_TEXT).forEach(([id, messageKey]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = getMessage(messageKey);
    }
  });

  Object.entries(LOCALIZED_PLACEHOLDERS).forEach(([id, messageKey]) => {
    const element = document.getElementById(id);
    if (element) {
      element.placeholder = getMessage(messageKey);
    }
  });

  const passwordHeading = document.querySelector('[data-i18n="passwordManagementHeader"]');
  if (passwordHeading) {
    passwordHeading.textContent = getMessage('passwordManagementHeader');
  }

  const passwordOverlayLabel = document.querySelector('label[data-i18n="enterPasswordToAccessLabel"]');
  if (passwordOverlayLabel) {
    passwordOverlayLabel.textContent = getMessage('enterPasswordToAccessLabel');
  }

  const passwordSubmitButton = document.querySelector('#passwordForm button[type="submit"]');
  if (passwordSubmitButton) {
    passwordSubmitButton.textContent = getMessage('submitButton');
  }
}
