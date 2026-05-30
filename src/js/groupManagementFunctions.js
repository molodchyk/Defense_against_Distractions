// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { adjustTextareaHeight,  adjustTextareaWidth, addEnterFunctionalityToField} from './utilityFunctions.js';
import { updateGroupsUI } from './uiFunctions.js';
import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';
import {
  areKeywordChangesValid,
  areWebsiteChangesValid,
  getNextUnnamedGroupName,
  getStoredGroups,
  validateKeywordEntry
} from './shared/groupRules.js';
import { stripUrlPrefix } from './shared/url.js';



export function migrateToNewGroupStorage() {
  chrome.storage.sync.get('websiteGroups', async ({ websiteGroups }) => {
    if (!websiteGroups) {
      console.log('No existing groups to migrate.');
      return;
    }

    // Handling group migrations synchronously to ensure unique IDs
    for (const group of websiteGroups) {
      await new Promise((resolve, reject) => {
        generateGroupId(async groupId => {
          const newGroupData = { ...group, id: groupId };
          await chrome.storage.sync.set({ [groupId]: newGroupData }, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to migrate group:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log(`Group ${group.groupName} migrated to ID ${groupId}.`);
              resolve();
            }
          });
        });
      });
    }
    
    console.log('All groups migrated successfully.');
    // Optionally remove old storage format data
    chrome.storage.sync.remove('websiteGroups', () => {
      console.log('Old group data format removed.');
      updateGroupsUI(); // Update UI to reflect new storage format
    });
  });
}


export function generateGroupId(callback) {
  chrome.storage.sync.get({ groupCounter: 0 }, (items) => {
    let newCounter = items.groupCounter + 1;
    try {
      chrome.storage.sync.set({ groupCounter: newCounter }, () => {
        callback(`group_${newCounter}`);
      });
    } catch (error) {
      console.error('Error setting groupCounter:', error);
      if (error.message.includes('QUOTA_BYTES_PER_ITEM')) {
        alert('Storage quota exceeded. Try removing some groups or reducing data size.');
      } else {
        alert('Failed to generate group ID: ' + error.message);
      }
    }
  });
}

export function addGroup() {
  let groupNameInput = document.getElementById('groupNameInput');
  let groupName = groupNameInput.value.trim();

  chrome.storage.sync.get(null, (items) => {
    const allGroups = getStoredGroups(items);
    if (!groupName) {
      groupName = getNextUnnamedGroupName(allGroups, chrome.i18n.getMessage("unnamedGroupPrefix"));
    } else if (allGroups.some(group => group.groupName.toLowerCase() === groupName.toLowerCase())) {
      alert(chrome.i18n.getMessage("groupNameExists"));
      return;
    }

    generateGroupId((groupId) => {
      const newGroup = { id: groupId, groupName, websites: [], keywords: [] };
      try {
        chrome.storage.sync.set({ [groupId]: newGroup }, () => {
          console.log(`Group ${groupName} added with ID ${groupId}.`);
          updateGroupsUI(); // Implement this function to update your UI accordingly
          groupNameInput.value = ''; // Clear input field
        });
      } catch (error) {
        if (error && error.message.includes('QUOTA_BYTES_PER_ITEM')) {
          alert('Error: Data size too large. Try reducing the amount of data or split into smaller items.');
        } else {
          console.error('Error adding new group:', error);
          alert('Failed to add group: ' + error.message);
        }
      }
    });
  });
}

export function removeGroup(groupId) {
  // First, check if any restrictions apply before removing the group.
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    if (isCurrentTimeInAnySchedule(schedules)) {
      alert(chrome.i18n.getMessage("cannotDeleteGroupActiveSchedule"));
      return;
    }

    // Proceed with deletion if no schedules prevent it.
    chrome.storage.sync.remove(groupId, () => {
      console.log(`Group ${groupId} removed.`);
      updateGroupsUI(); // Refresh the UI to reflect the removal.
    });
  });
}

export function toggleFieldEdit(fieldId, index) {
  const field = document.getElementById(fieldId);
  const editButton = field.nextElementSibling;
  const saveButton = editButton.nextElementSibling;
  const isReadOnly = field.readOnly;

  const fieldName = fieldId.split('-')[0];

  if (isReadOnly) {
    console.log(`Clicked button Edit, editing field: ${fieldName}, Current Text: '${field.value}'`);
    field.readOnly = false;
    field.style.height = 'auto';
    editButton.textContent = chrome.i18n.getMessage("cancelLabel");
    saveButton.disabled = false;
    field.setAttribute('data-initial-value', field.value);

    if (field.tagName.toLowerCase() === 'textarea') {
      adjustTextareaHeight(field);
      adjustTextareaWidth(field);
    }

    if (fieldId.startsWith('websites-')) {
      addEnterFunctionalityToField(field);
    }
  } else {
    console.log(`Edit canceled for field: ${fieldName}, Original Text: '${field.getAttribute('data-initial-value')}'`);
    field.readOnly = true;
    field.value = field.getAttribute('data-initial-value'); // Restore original value
    editButton.textContent = chrome.i18n.getMessage("editLabel");
    saveButton.disabled = true;

    if (field.tagName.toLowerCase() === 'textarea') {
      adjustTextareaHeight(field);
      adjustTextareaWidth(field);
    }
  }
}

export function getSizeOfObject(object) {
  const stringifiedData = JSON.stringify(object);
  return new TextEncoder().encode(stringifiedData).length;
}

export function updateGroupField(groupId) {
  // The unique key for the group's data
  const groupKey = `${groupId}`;
  console.log("groupKey: ", groupKey);

  chrome.storage.sync.get([groupKey, 'schedules'], (data) => {
    const group = data[groupKey];
    if (!group) {
      console.log(`Group with ID ${groupId} not found.`);
      return; // Exit if the group wasn't found
    }

    const schedules = data.schedules || [];

    // Elements identified by group-specific IDs
    const groupNameField = document.getElementById(`name-${groupId}`);
    const websitesField = document.getElementById(`websites-${groupId}`);
    const keywordsField = document.getElementById(`keywords-${groupId}`);

    // Updated group data
    const newGroupName = groupNameField.value.trim();
    const newWebsites = websitesField.value.split('\n')
                          .map(site => stripUrlPrefix(site.trim()))
                          .filter(site => site !== '');
    const originalKeywords = group.keywords;
    const newKeywords = keywordsField.value.split('\n')
                          .map(keyword => keyword.trim())
                          .filter(keyword => keyword !== '');

    const isLockedSchedule = isCurrentTimeInAnySchedule(schedules);

    // Validate only new or modified keywords
    let isValid = true; // Assume all entries are valid initially
    for (let keywordEntry of newKeywords) {
      const isNewOrModified = !originalKeywords.includes(keywordEntry);
      if (isNewOrModified && !validateKeywordEntry(keywordEntry, isLockedSchedule)) {
        alert(`Invalid keyword entry: ${keywordEntry}`);
        isValid = false; // Mark as invalid
        break; // Exit loop on first invalid entry
      }
    }

    if (!isValid) return; // Stop if any keyword entries are invalid

    if (isLockedSchedule) {
      if (group.groupName.toLowerCase() !== newGroupName.toLowerCase()) {
        alert(chrome.i18n.getMessage("cannotChangeGroupNameActiveSchedule"));
        return; // Prevent the group name change if a schedule is active
      }
      if (!areKeywordChangesValid(originalKeywords, newKeywords)) {
        alert(chrome.i18n.getMessage("invalidEditOnWebsitesOrKeywords"));
        return; // Stop the update if keyword changes are invalid
      }
      if (!areWebsiteChangesValid(group.websites, newWebsites)) {
        alert(chrome.i18n.getMessage("invalidEditOnWebsitesOrKeywords"));
        return; // Stop the update if website changes are invalid
      }
    }

    // Apply updates to group
    const updatedGroup = {
      ...group,
      groupName: newGroupName,
      websites: newWebsites,
      keywords: newKeywords
    };

    const estimatedNewDataSize = getSizeOfObject(updatedGroup);

    chrome.storage.sync.getBytesInUse(null, function(bytesInUse) {
      if (bytesInUse + estimatedNewDataSize > chrome.storage.sync.QUOTA_BYTES) {
        alert('Cannot save the data: Storage quota would be exceeded.');
        return;
      }

      chrome.storage.sync.set({ [groupKey]: updatedGroup }, function() {
        if (chrome.runtime.lastError) {
          alert(`Failed to update group: ${chrome.runtime.lastError.message}`);
        } else {
          console.log(`Group ${groupId} updated.`);
          updateGroupsUI();
        }
      });
    });
  });
}

