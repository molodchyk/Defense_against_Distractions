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