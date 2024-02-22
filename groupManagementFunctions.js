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

export function addGroup() {
  let groupName = document.getElementById('groupNameInput').value.trim();

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    // Generate a group name if empty
    if (!groupName) {
      const existingNames = new Set(websiteGroups.map(group => group.groupName.toLowerCase()));
      let groupNumber = 1;
      while (existingNames.has(chrome.i18n.getMessage("unnamedGroupPrefix").toLowerCase() + groupNumber)) {
          groupNumber++;
      }
      groupName = chrome.i18n.getMessage("unnamedGroupPrefix") + groupNumber;
  }

    // Check if a group with this name already exists
    if (websiteGroups.some(group => group.groupName.toLowerCase() === groupName.toLowerCase())) {
      alert(chrome.i18n.getMessage("groupNameExists"));
      return;
    }

    // Add new group
    websiteGroups.push({ groupName, websites: [], keywords: [] });
    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
      document.getElementById('groupNameInput').value = ''; // Clear input field
    });
  });
}

export function removeGroup(index) {
  chrome.storage.sync.get(['websiteGroups', 'schedules'], ({ websiteGroups, schedules }) => {
    if (isCurrentTimeInAnySchedule(schedules)) {
      alert(chrome.i18n.getMessage("cannotDeleteGroupActiveSchedule"));
      return;
    }

    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
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

export function updateGroupField(index) {
  chrome.storage.sync.get(['websiteGroups', 'schedules'], ({ websiteGroups, schedules }) => {
    const group = websiteGroups[index];

    const groupNameField = document.getElementById(`name-${index}`);
    const websitesField = document.getElementById(`websites-${index}`);
    const keywordsField = document.getElementById(`keywords-${index}`);

    const newGroupName = groupNameField.value.trim();

    const newWebsites = websitesField.value.split('\n')
    .map(site => normalizeURL(site.trim()))
    .filter(site => site !== '');

    const isLockedSchedule = isCurrentTimeInAnySchedule(schedules);

    const originalKeywords = group.keywords;
    const newKeywords = keywordsField.value.split('\n')
    .map(keyword => keyword.trim())
    .filter(keyword => keyword !== '');


    // Validate only new or modified keywords
    for (let keywordEntry of newKeywords) {
      const isNewOrModified = !originalKeywords.includes(keywordEntry);
      if (isNewOrModified && !validateKeywordEntry(keywordEntry, isLockedSchedule)) {
        console.log("Invalid keyword entry: " + keywordEntry);
        console.log("Current Keywords:", group.keywords);
        console.log("New Keywords:", newKeywords);
        alert(chrome.i18n.getMessage("invalidKeywordEntry") + keywordEntry);
        return; // Prevent saving the group data
      }
    }

    if (isCurrentTimeInAnySchedule(schedules)) {
      // If the group name is different and the schedule is active, restrict the change
      if (group.groupName.toLowerCase() !== newGroupName.toLowerCase()) {
        alert(chrome.i18n.getMessage("cannotChangeGroupNameActiveSchedule"));
        return; // Prevent the group name change
      }
      // Log current field values
      console.log("locked schedule active: ", isLockedSchedule);
      console.log("Current Websites:", group.websites);
      console.log("New Websites:", newWebsites);
      console.log("Current Keywords:", group.keywords);
      console.log("New Keywords:", newKeywords);

      // new function that will check if the sign for keywords was changed, or whether the values were lowered.
      // Work through every keyword from the current websites, and try to find it on the newWebsites. 
      // check if it exists in the new one
      // check if the sign if there is a sign is the same
      // check if the value if there was value is the same or higher
      // if not, put console log and alert:   console.log("change cannot be saved");    alert(chrome.i18n.getMessage("invalidEditOnWebsitesOrKeywords")); and return

      // Check for changes in keywords that are not allowed during locked schedules
      if (!areKeywordChangesValid(originalKeywords, newKeywords, isLockedSchedule)) {  //line 168
        console.log("Change cannot be saved due to invalid edits on websites or keywords.");
        alert(chrome.i18n.getMessage("invalidEditOnWebsitesOrKeywords"));
        return; // Stop the update if keyword changes are invalid
      }
    }
    
    // Update group properties
    group.groupName = newGroupName;
    group.websites = newWebsites;
    group.keywords = newKeywords;

    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
    });

  });
}










/**
 * Validates changes in keywords against original keywords to ensure compliance with rules.
 * This includes ensuring no keywords are deleted, and that signs or numeric values are not improperly changed.
 * It allows for the increase of numeric values in keywords and permits changing from "keyword, value"
 * or "keyword, sign, value" to just "keyword", but prohibits changing from "keyword" to "keyword, value"
 * or "keyword, sign, value". Specifically, it also allows changing format from "keyword, +, value" to
 * "keyword, value".
 * 
 * 
 * 
 * *! means that the test did not pass, otherwise test passed
 * test1: Allow adding new keywords
 * test2: Allow increasing keywords value if the format is "keyword, sign, value" or "keyword, value"
 * test3: allow adding new keyword between other keywords
 * test3.5: allow changing keywords places
 * test4: allow changing format from "keyword, +, value" to "keyword, value"
 * test 4.1: allow changing format from "keyword, +, value" to "keyword"
 * test4.2: allow changing format from "keyword, *, value" to "keyword"
 * test 4.5: allow changing format from "keyword, value" to "keyword"
 * test5: prohibit decreasing the value for keywords
 * test6: prohibit changing the format from "keyword" to "keyword, sign, value" or "keyword, value"
 * test7: prohibit changing format from "keyword, *, value" to "keyword, +, value" or "keyword, value"
 * test8: prohibit changing format "keyword, value" to "keyword, *, value"
 * test9: prohibit changing format "keyword, +, value" to "keyword, *, value"
 * test10: prohibit removing keywords
 * test11: prohibit changing keywords
 * 
 ** ALL TESTS PASSED
 * 
 * @param {Array<string>} originalKeywords - The original list of keywords.
 * @param {Array<string>} newKeywords - The new list of keywords proposed for update.
 * @returns {boolean} - True if all changes are valid, false otherwise.
 */
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

    const [newKeyword, newSign, newValue] = parseKeyword(newKeywordStr);

    // Allow changing from "keyword, +, value" to "keyword, value"
    if (originalSign === '+' && newSign === null && originalValue === newValue) {
      continue; // This specific change is allowed
    }

    // Prohibit changing from "keyword, value" to "keyword, *, value"
    if (originalSign === null && originalValue !== null && newSign === '*' && newValue !== null) {
      console.log(`Changing format from '${originalKeyword}, value' to '${originalKeyword}, *, value' is not allowed.`);
      return false;
    }

    // Allow changing from "keyword, value" or "keyword, sign, value" to "keyword"
    if ((originalSign !== null || originalValue !== null) && newIsSimple(newSign, newValue)) {
      continue; // This change is allowed
    }

    // Prohibit changing from "keyword" to "keyword, value" or "keyword, sign, value"
    if (originalIsSimple(originalSign, originalValue) && (newSign !== null || newValue !== null)) {
      console.log(`Changing from 'keyword' to 'keyword, value' or 'keyword, sign, value' is not allowed for '${originalKeyword}'.`);
      return false; // This type of format change is not allowed
    }

    // Check for sign changes (if applicable)
    if (originalSign && newSign !== originalSign && !(originalSign === '+' && newSign === null)) {
      console.log(`Sign change detected for '${originalKeyword}' from '${originalSign}' to '${newSign}'.`);
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
