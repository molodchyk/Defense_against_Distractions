import { 
  updateGroupsUI 
} from './uiFunctions.js';

import { 
  addGroup
} from './groupManagementFunctions.js';

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
});