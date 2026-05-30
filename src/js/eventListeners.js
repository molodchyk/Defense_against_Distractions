// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { 
  initializeScheduleStatusPolling,
  updateGroupsUI
} from './uiFunctions.js';

import { 
  addGroup,
  migrateToNewGroupStorage
} from './groupManagementFunctions.js';

import { localizeOptionsPage } from './options/localization.js';
import { initializeStorageTransfer } from './options/storageTransfer.js';
import { initializeThemeModeControl } from './options/theme.js';

document.addEventListener('DOMContentLoaded', () => {
  localizeOptionsPage();
  initializeThemeModeControl();
  migrateToNewGroupStorage();
  updateGroupsUI();

  document.getElementById('addGroupButton').addEventListener('click', addGroup);
  document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addGroup();
      event.preventDefault();
    }
  });

  initializeScheduleStatusPolling();
  initializeStorageTransfer();
});
