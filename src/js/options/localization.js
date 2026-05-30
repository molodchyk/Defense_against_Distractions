// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const LOCALIZED_TEXT = {
  title: 'optionsTitle',
  appTitle: 'optionsTitle',
  groupsHeading: 'groupsHeading',
  whitelistHeading: 'whitelistHeading',
  schedulesHeading: 'schedulesHeading',
  addWhitelistButton: 'addToWhitelistButtonLabel',
  addScheduleButton: 'addScheduleButtonLabel',
  setPasswordButton: 'setPasswordButton',
  deletePasswordButton: 'deletePasswordButton',
  instructionGuideLink: 'instructionGuideLink',
  exportButton: 'exportButton',
  importButton: 'importButton',
  addGroupButton: 'addGroupButtonText',
  themeModeLabel: 'themeModeLabel',
  themeModeSystemOption: 'themeModeSystemOption',
  themeModeDarkOption: 'themeModeDarkOption',
  themeModeLightOption: 'themeModeLightOption'
};

const LOCALIZED_PLACEHOLDERS = {
  groupNameInput: 'groupNamePlaceholder',
  whitelistInput: 'enterWebsiteURLPlaceholder',
  scheduleNameInput: 'scheduleNamePlaceholder',
  passwordInputField: 'enterPasswordPlaceholder',
  confirmPasswordInputField: 'confirmPasswordPlaceholder',
  passwordInput: 'enterPasswordPlaceholder'
};

const FALLBACK_MESSAGES = {
  themeModeLabel: 'UI Mode',
  themeModeSystemOption: 'System',
  themeModeDarkOption: 'Dark',
  themeModeLightOption: 'Light'
};

function getMessage(messageKey) {
  return chrome.i18n.getMessage(messageKey) || FALLBACK_MESSAGES[messageKey] || '';
}

export function localizeOptionsPage() {
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

  const passwordHeading = document.querySelector('h2[data-i18n="passwordManagementHeader"]');
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
