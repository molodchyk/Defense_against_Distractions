/*
 * Defense Against Distractions Extension
 *
 * This file is part of the Defense Against Distractions Extension.
 *
 * Defense Against Distractions Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Defense Against Distractions Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Defense Against Distractions Extension. If not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Oleksandr Molodchyk
 * Copyright (C) 2023 Oleksandr Molodchyk
 */

import { 
  updateGroupsUI 
} from './uiFunctions.js';

import { 
  addGroup
} from './groupManagementFunctions.js';

import { 
  checkScheduleStatus,
  enableUIElements
} from './uiFunctions.js';

// Event listener for adding group on Enter key press
document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addGroup();
    event.preventDefault();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('title').textContent = chrome.i18n.getMessage("optionsTitle");
  document.getElementById('groupsHeading').textContent = chrome.i18n.getMessage("groupsHeading");
  document.getElementById('whitelistHeading').textContent = chrome.i18n.getMessage("whitelistHeading");
  document.getElementById('schedulesHeading').textContent = chrome.i18n.getMessage("schedulesHeading");


  document.getElementById('groupNameInput').placeholder = chrome.i18n.getMessage("groupNamePlaceholder");
  document.getElementById('whitelistInput').placeholder = chrome.i18n.getMessage("enterWebsiteURLPlaceholder");
  document.getElementById('addWhitelistButton').textContent = chrome.i18n.getMessage("addToWhitelistButtonLabel");
  document.getElementById('scheduleNameInput').placeholder = chrome.i18n.getMessage("scheduleNamePlaceholder");
  document.getElementById('addScheduleButton').textContent = chrome.i18n.getMessage("addScheduleButtonLabel");


  document.querySelector('h2[data-i18n="passwordManagementHeader"]').textContent = chrome.i18n.getMessage("passwordManagementHeader");
  document.getElementById('passwordInputField').placeholder = chrome.i18n.getMessage("enterPasswordPlaceholder");
  document.getElementById('confirmPasswordInputField').placeholder = chrome.i18n.getMessage("confirmPasswordPlaceholder");
  document.getElementById('setPasswordButton').textContent = chrome.i18n.getMessage("setPasswordButton");
  document.getElementById('deletePasswordButton').textContent = chrome.i18n.getMessage("deletePasswordButton");
  document.querySelector('label[data-i18n="enterPasswordToAccessLabel"]').textContent = chrome.i18n.getMessage("enterPasswordToAccessLabel");
  document.getElementById('passwordInput').placeholder = chrome.i18n.getMessage("enterPasswordPlaceholder");
  document.querySelector('#passwordForm button[type="submit"]').textContent = chrome.i18n.getMessage("submitButton");
  document.getElementById('instructionGuideLink').textContent = chrome.i18n.getMessage("instructionGuideLink");

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    updateGroupsUI(websiteGroups);
  });

  // Localize button text
  document.getElementById('addGroupButton').textContent = chrome.i18n.getMessage("addGroupButtonText");

  document.getElementById('addGroupButton').addEventListener('click', addGroup);
  document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addGroup();
      event.preventDefault();
    }
  });

  // Initialize checking schedule status
  checkScheduleStatus();
});