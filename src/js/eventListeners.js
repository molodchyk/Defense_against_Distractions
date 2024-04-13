/*
 * Defense Against Distractions Extension
 *
 * file: eventListeners.js
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
 * Copyright (C) 2023-2024 Oleksandr Molodchyk
 */

import { 
  updateGroupsUI 
} from './uiFunctions.js';

import { 
  addGroup
} from './groupManagementFunctions.js';

import { 
  checkScheduleStatus
} from './uiFunctions.js';

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

  document.getElementById('exportButton').textContent = chrome.i18n.getMessage("exportButton");
    document.getElementById('importButton').textContent = chrome.i18n.getMessage("importButton");

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





document.addEventListener('DOMContentLoaded', function() {
  const exportButton = document.getElementById('exportButton');
  const importButton = document.getElementById('importButton');
  const fileInput = document.getElementById('fileInput');

  exportButton.addEventListener('click', function() {
    chrome.storage.sync.get(null, function(items) {
        const result = JSON.stringify(items);
        const url = 'data:text/json;charset=utf-8,' + encodeURIComponent(result);

        // Generate a date string for the filename
        const date = new Date();
        const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const filename = `DaD-extension-data-${dateString}.json`;

        chrome.downloads.download({ url, filename: filename });
    });
  });

  fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const contents = JSON.parse(e.target.result);
        
        // Clear the storage before setting new contents
        chrome.storage.sync.clear(function() {
          if (chrome.runtime.lastError) {
            console.error('Failed to clear storage:', chrome.runtime.lastError);
          } else {
            chrome.storage.sync.set(contents, function() {
              if (chrome.runtime.lastError) {
                console.error('Failed to set new storage data:', chrome.runtime.lastError);
              } else {
                // Reload the DOM after the import is finished
                window.location.reload();
              }
            });
          }
        });
      };
      reader.readAsText(file);
    }
  });

  importButton.addEventListener('click', function() {
      fileInput.click(); // Trigger file input
  });
});

