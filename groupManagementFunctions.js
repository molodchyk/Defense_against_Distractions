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

// Helper function to check if existing entries have been removed or inappropriately modified
function hasArrayChanged(originalArray, newArray) {
  // Check if any original entry has been modified or removed
  for (let i = 0; i < originalArray.length; i++) {
    if (newArray.length <= i || originalArray[i] !== newArray[i]) {
      return true; // Original entry is modified or removed
    }
  }
  return false; // No modifications or removals detected
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
    // const newKeywords = keywordsField.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');

    const newWebsites = websitesField.value.split('\n')
    .map(site => normalizeURL(site.trim()))
    .filter(site => site !== '');

    // Retrieve the original timer values
    const originalTimerCount = group.timer ? group.timer.count : 0;
    const originalTimerDuration = group.timer ? group.timer.duration : 20;

    // Extract the new timer values from the UI
    const newTimerCount = parseInt(document.getElementById(`timerCount-${index}`).value, 10) || 0;
    const newTimerDuration = parseInt(document.getElementById(`timerDuration-${index}`).value, 10) || 20;

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
      console.log("Current Websites:", group.websites);
      console.log("New Websites:", newWebsites);
      console.log("Current Keywords:", group.keywords);
      console.log("New Keywords:", newKeywords);

      if (originalTimerCount < newTimerCount || originalTimerDuration < newTimerDuration) {
        alert(chrome.i18n.getMessage("cannotIncreaseTimerActiveSchedule"));
        return; // Prevent saving
      }

      // Check for removal or inappropriate modification in websites and keywords
      if (hasArrayChanged(group.websites, newWebsites) || hasArrayChanged(group.keywords, newKeywords)) {
        console.log("change cannot be saved");
        alert(chrome.i18n.getMessage("invalidEditOnWebsitesOrKeywords"));
        return; // Prevent saving
      }
    }

    
    // Update group properties
    group.groupName = newGroupName;
    group.websites = newWebsites;
    group.keywords = newKeywords;
    group.timer = {
      count: newTimerCount,
      duration: newTimerDuration,
      usedToday: group.timer ? group.timer.usedToday : 0
    };

    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
    });

  });
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
