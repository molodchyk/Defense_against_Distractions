// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getResolvedUiLanguage, getUiMessage } from '../shared/ui/uiLanguage.js';

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
  usageStatsHeading: 'usageStatsHeading',
  usageStatsIntroText: 'usageStatsIntroText',
  refreshUsageStatsButton: 'refreshButtonLabel',
  exportUsageStatsButton: 'exportJsonButtonLabel',
  clearUsageStatsButton: 'clearButtonLabel',
  settingsHeading: 'settingsHeading',
  settingsIntroText: 'settingsIntroText',
  appearanceSettingsHeading: 'appearanceSettingsHeading',
  configurationSettingsHeading: 'configurationSettingsHeading',
  setPasswordButton: 'setPasswordButton',
  deletePasswordButton: 'deletePasswordButton',
  instructionGuideLink: 'instructionGuideLink',
  exportButton: 'exportButton',
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
  passwordInput: 'enterPasswordPlaceholder'
};

const FALLBACK_MESSAGES = {
  plansHeading: 'Plans',
  addPlanButton: 'Add Plan',
  planNamePlaceholder: 'Plan name',
  intentDiagnosticsNavLabel: 'Intent',
  intentDiagnosticsHeading: 'Intent diagnostics',
  intentDiagnosticsIntroText: 'Local trajectory state used by intent coherence. No raw typed input is stored.',
  usageStatsNavLabel: 'Usage',
  usageStatsHeading: 'Usage stats',
  usageStatsIntroText: 'Local hostname-level aggregates. No raw text, full URLs, titles, or tokens are stored.',
  refreshButtonLabel: 'Refresh',
  exportJsonButtonLabel: 'Export JSON',
  clearButtonLabel: 'Clear',
  settingsHeading: 'Settings',
  settingsIntroText: 'Global extension controls that apply outside individual plans.',
  appearanceSettingsHeading: 'Appearance',
  configurationSettingsHeading: 'Configuration',
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
  document.documentElement.lang = getResolvedUiLanguage();

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
