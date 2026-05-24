// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const LOCALIZED_TEXT = {
  title: 'optionsTitle',
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
  addGroupButton: 'addGroupButtonText'
};

const LOCALIZED_PLACEHOLDERS = {
  groupNameInput: 'groupNamePlaceholder',
  whitelistInput: 'enterWebsiteURLPlaceholder',
  scheduleNameInput: 'scheduleNamePlaceholder',
  passwordInputField: 'enterPasswordPlaceholder',
  confirmPasswordInputField: 'confirmPasswordPlaceholder',
  passwordInput: 'enterPasswordPlaceholder'
};

export function localizeOptionsPage() {
  Object.entries(LOCALIZED_TEXT).forEach(([id, messageKey]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = chrome.i18n.getMessage(messageKey);
    }
  });

  Object.entries(LOCALIZED_PLACEHOLDERS).forEach(([id, messageKey]) => {
    const element = document.getElementById(id);
    if (element) {
      element.placeholder = chrome.i18n.getMessage(messageKey);
    }
  });

  const passwordHeading = document.querySelector('h2[data-i18n="passwordManagementHeader"]');
  if (passwordHeading) {
    passwordHeading.textContent = chrome.i18n.getMessage('passwordManagementHeader');
  }

  const passwordOverlayLabel = document.querySelector('label[data-i18n="enterPasswordToAccessLabel"]');
  if (passwordOverlayLabel) {
    passwordOverlayLabel.textContent = chrome.i18n.getMessage('enterPasswordToAccessLabel');
  }

  const passwordSubmitButton = document.querySelector('#passwordForm button[type="submit"]');
  if (passwordSubmitButton) {
    passwordSubmitButton.textContent = chrome.i18n.getMessage('submitButton');
  }
}
