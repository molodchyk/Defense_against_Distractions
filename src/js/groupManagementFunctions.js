/*
 * Defense Against Distractions Extension
 *
 * file: groupManagementFunctions.js
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

import { adjustTextareaHeight,  adjustTextareaWidth, addEnterFunctionalityToField} from './utilityFunctions.js';
import { updateGroupsUI } from './uiFunctions.js';
import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';



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
    const allGroups = Object.entries(items).filter(([key, _]) => key.startsWith('group_')).map(([_, value]) => value);
    if (!groupName) {
      // Generate a group name if empty
      const existingNames = new Set(allGroups.map(group => group.groupName.toLowerCase()));
      let groupNumber = 1;
      while (existingNames.has(`${chrome.i18n.getMessage("unnamedGroupPrefix").toLowerCase()} ${groupNumber}`)) {
        groupNumber++;
      }
      groupName = `${chrome.i18n.getMessage("unnamedGroupPrefix")} ${groupNumber}`;
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

// Normalize URL by removing 'http://', 'https://', and 'www.'
function normalizeURL(url) {
  return url.replace(/^(?:https?:\/\/)?(?:www\.)?/, '');
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
                          .map(site => normalizeURL(site.trim()))
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
      if (!areKeywordChangesValid(originalKeywords, newKeywords, isLockedSchedule)) {
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

function areWebsiteChangesValid(originalWebsites, newWebsites) {
  const newSet = new Set(newWebsites);
  if (newSet.size !== newWebsites.length) {
    console.log("Duplicate website entries detected.");
    return false; // There are duplicate entries in the new websites list
  }
  return originalWebsites.every(website => newWebsites.includes(website));
}

function areKeywordChangesValid(originalKeywords, newKeywords) {
  // Convert newKeywords list into a map for easier lookup
  const newKeywordMap = newKeywords.reduce((map, keywordStr) => {
    const [keyword] = parseKeyword(keywordStr);
    map[keyword] = keywordStr;
    return map;
  }, {});

  for (const originalKeywordStr of originalKeywords) {
    const [originalKeyword, originalSign, originalValue] = parseKeyword(originalKeywordStr);
    const newKeywordStr = newKeywordMap[originalKeyword];

    // Check if the original keyword exists in the new list
    if (!newKeywordStr) {
      console.log(`Keyword '${originalKeyword}' was removed or not found in the new list.`);
      return false; // Original keyword was removed or not found
    }

    const [newKeyword, sign, newValue] = parseKeyword(newKeywordStr);

    // Allow changing from "keyword, +, value" to "keyword, value"
    if (originalSign === '+' && sign === null && originalValue === newValue) {
      continue; // This specific change is allowed
    }

    // Prohibit changing from "keyword, value" to "keyword, *, value"
    if (originalSign === null && originalValue !== null && sign === '*' && newValue !== null) {
      console.log(`Changing format from '${originalKeyword}, value' to '${originalKeyword}, *, value' is not allowed.`);
      return false;
    }

    // Allow changing from "keyword, value" or "keyword, sign, value" to "keyword"
    if ((originalSign !== null || originalValue !== null) && newIsSimple(sign, newValue)) {
      continue; // This change is allowed
    }

    // Prohibit changing from "keyword" to "keyword, value" or "keyword, sign, value"
    if (originalIsSimple(originalSign, originalValue) && (sign !== null || newValue !== null)) {
      console.log(`Changing from 'keyword' to 'keyword, value' or 'keyword, sign, value' is not allowed for '${originalKeyword}'.`);
      return false; // This type of format change is not allowed
    }

    // Check for sign changes (if applicable)
    if (originalSign && sign !== originalSign && !(originalSign === '+' && sign === null)) {
      console.log(`Sign change detected for '${originalKeyword}' from '${originalSign}' to '${sign}'.`);
      return false; // Sign change is not allowed, except for the allowed case above
    }

    // Check for invalid value changes
    if (originalValue !== null && newValue !== null && newValue < originalValue) {
      console.log(`Value decrease detected for '${originalKeyword}' from ${originalValue} to ${newValue}.`);
      return false; // Decreasing value is not allowed
    }
  }

  return true;
}

// Helper functions to check if keyword format is simple
function originalIsSimple(sign, value) {
  return sign === null && value === null;
}

function newIsSimple(sign, value) {
  return sign === null && value === null;
}

/**
 * Parses a keyword string to extract the keyword, sign, and numeric value if present.
 * @param {string} keyword - The keyword string to parse.
 * @returns {Array} - An array containing the keyword, sign, and numeric value (if any).
 */
function parseKeyword(keyword) {
  const parts = keyword.split(/(?<!\\),/).map(part => part.trim().replace(/\\,/g, ','));
  const word = parts[0];
  const sign = parts.length === 3 ? parts[1] : null;
  const value = parts.length >= 2 ? parseFloat(parts[parts.length - 1]) : null;
  return [word, sign, value];
}

/**
 * Validates a keyword entry based on specified rules.
 * @param {string} entry - The keyword entry line from the input field.
 * @param {boolean} isLockedSchedule - Indicates if the locked schedule is active.
 * @returns {boolean} - True if the keyword entry is valid, false otherwise.
 */

function validateKeywordEntry(entry, isLockedSchedule) {

  console.log("Original entry:", entry);
  const components = entry.split(/(?<!\\),/).map(comp => comp.trim().replace(/\\,/g, ','));

  // Check for number of components
  if (components.length === 0 || components.length > 3) {
    console.log("Invalid due to incorrect number of components");
    return false;
  }

  // If there's only one component, it's a valid keyword
  if (components.length === 1) {
    return true;
  }

  // Extract sign and numeric value for further validation
  const sign = components.length === 3 ? components[1] : '+';
  const numericValue = parseFloat(components[components.length - 1]);

  if (sign !== '+' && sign !== '*') {
    console.log("Invalid due to incorrect sign");
    return false;
  }

  if (isNaN(numericValue)) {
    console.log("Invalid due to non-numeric value");
    return false;
  }

  if (isLockedSchedule) {
    if (sign === '+' && (numericValue <= 0 || numericValue > 1000)) return false;
    if (sign === '*' && (numericValue <= 1 || numericValue > 1000)) return false;
  } else {
    // Allow -1000 for addition when not in a locked schedule
    if (sign === '+' && (numericValue < -1000 || numericValue > 1000 || numericValue == 0)) return false;
    if (sign === '*' && (numericValue <= 0 || numericValue > 1000 || numericValue == 1)) return false;
  }

  return true;
}

