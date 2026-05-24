// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { 
  updateGroupsUI 
} from './uiFunctions.js';

import { 
  addGroup
} from './groupManagementFunctions.js';

import { 
  checkScheduleStatus
} from './uiFunctions.js';
import { localizeOptionsPage } from './options/localization.js';
import { initializeStorageTransfer } from './options/storageTransfer.js';

document.addEventListener('DOMContentLoaded', () => {
  localizeOptionsPage();

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    updateGroupsUI(websiteGroups);
  });

  document.getElementById('addGroupButton').addEventListener('click', addGroup);
  document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addGroup();
      event.preventDefault();
    }
  });

  // Initialize checking schedule status
  checkScheduleStatus();
  initializeStorageTransfer();
});

