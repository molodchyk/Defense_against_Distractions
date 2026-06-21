// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { applyUiLanguageAttributes, getUiMessage } from '../shared/ui/uiLanguage.js';

const LOCALIZED_TEXT = {
  optionsBrandName: 'popupBrandName',
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
  refreshIntentDiagnosticsButton: 'refreshButtonLabel',
  exportIntentDiagnosticsButton: 'exportJsonButtonLabel',
  clearIntentDiagnosticsButton: 'clearButtonLabel',
  optionsIntentStateLabel: 'optionsIntentStateLabel',
  optionsIntentState: 'popupNoDataLabel',
  optionsIntentCoherenceLabel: 'popupCoherenceLabel',
  optionsIntentOriginLabel: 'popupOriginLabel',
  optionsIntentLineageLabel: 'popupLineageLabel',
  intentReasonsHeading: 'intentReasonsHeading',
  intentScoreSignalsHeading: 'intentScoreSignalsHeading',
  intentGraphHeading: 'intentGraphHeading',
  intentRecentTrajectoryHeading: 'intentRecentTrajectoryHeading',
  usageStatsHeading: 'usageStatsHeading',
  usageStatsIntroText: 'usageStatsIntroText',
  usageStatsStatus: 'popupLoadingLabel',
  refreshUsageStatsButton: 'refreshButtonLabel',
  exportUsageStatsButton: 'exportJsonButtonLabel',
  clearUsageStatsButton: 'clearButtonLabel',
  usageStatsTodayVisitsLabel: 'usageStatsTodayVisitsLabel',
  usageStatsTodayActiveLabel: 'usageStatsTodayActiveLabel',
  usageStatsTodayBlockedActiveLabel: 'usageStatsTodayBlockedActiveLabel',
  usageStatsTodayAllowedActiveLabel: 'usageStatsTodayAllowedActiveLabel',
  usageStatsTodayBlockedShareLabel: 'usageStatsTodayBlockedShareLabel',
  usageStatsTodayBlockedWordsLabel: 'usageStatsTodayBlockedWordsLabel',
  usageStatsTodayAllowedWordsLabel: 'usageStatsTodayAllowedWordsLabel',
  usageStatsTodayDomainsLabel: 'usageStatsTodayDomainsLabel',
  usageStatsTodayBlockedVisitsLabel: 'usageStatsTodayBlockedVisitsLabel',
  usageStatsTodayAllowedVisitsLabel: 'usageStatsTodayAllowedVisitsLabel',
  usageStatsTodayTabMaxLabel: 'usageStatsTodayTabMaxLabel',
  usageStatsTotalSamplesLabel: 'usageStatsTotalSamplesLabel',
  usageStatsTopDomainsHeading: 'usageStatsTopDomainsHeading',
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
  billingHeading: 'billingHeading',
  supporterMonthlyButton: 'supporterMonthlyButton',
  lifetimeSupportButton: 'lifetimeSupportButton',
  manageBillingButton: 'manageBillingButton',
  elementRulesHeading: 'elementRulesLabel'
};

const LOCALIZED_PLACEHOLDERS = {
  planNameInput: 'planNamePlaceholder',
  passwordInputField: 'enterPasswordPlaceholder',
  confirmPasswordInputField: 'confirmPasswordPlaceholder',
  blockedPageMessageInput: 'blockedPageMessagePlaceholder',
  passwordInput: 'enterPasswordPlaceholder'
};

const LOCALIZED_ATTRIBUTES = {
  optionsSidebarNav: {
    'aria-label': 'optionsSectionsAriaLabel'
  },
  planNameInput: {
    'aria-label': 'planNamePlaceholder'
  },
  themeModeSelect: {
    'aria-label': 'themeModeLabel'
  },
  uiLanguageSelect: {
    'aria-label': 'uiLanguageLabel'
  }
};

const FALLBACK_MESSAGES = {
  optionsSectionsAriaLabel: 'Options sections',
  plansHeading: 'Plans',
  addPlanButton: 'Add Plan',
  planNamePlaceholder: 'Plan name',
  intentDiagnosticsNavLabel: 'Intent',
  intentDiagnosticsHeading: 'Intent diagnostics',
  intentDiagnosticsIntroText: 'Local trajectory state used by intent coherence. No raw typed input is stored.',
  optionsIntentStateLabel: 'State',
  intentReasonsHeading: 'Reasons',
  intentScoreSignalsHeading: 'Score signals',
  intentGraphHeading: 'Intent chain graph',
  intentRecentTrajectoryHeading: 'Recent trajectory',
  usageStatsNavLabel: 'Usage',
  usageStatsHeading: 'Usage stats',
  usageStatsIntroText: 'Local hostname-level aggregates. No raw text, full URLs, titles, or tokens are stored.',
  usageStatsTodayVisitsLabel: 'Today visits',
  usageStatsTodayActiveLabel: 'Today active time',
  usageStatsTodayBlockedActiveLabel: 'Blocked active today',
  usageStatsTodayAllowedActiveLabel: 'Allowed active today',
  usageStatsTodayBlockedShareLabel: 'Blocked share today',
  usageStatsTodayBlockedWordsLabel: 'Blocked page words',
  usageStatsTodayAllowedWordsLabel: 'Allowed page words',
  usageStatsTodayDomainsLabel: 'Today domains',
  usageStatsTodayBlockedVisitsLabel: 'Blocked visits today',
  usageStatsTodayAllowedVisitsLabel: 'Allowed visits today',
  usageStatsTodayTabMaxLabel: 'Max tabs today',
  usageStatsTotalSamplesLabel: 'Stored samples',
  usageStatsTopDomainsHeading: 'Top local domains',
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

  Object.entries(LOCALIZED_ATTRIBUTES).forEach(([id, attributes]) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    Object.entries(attributes).forEach(([attributeName, messageKey]) => {
      element.setAttribute(attributeName, getMessage(messageKey));
    });
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
