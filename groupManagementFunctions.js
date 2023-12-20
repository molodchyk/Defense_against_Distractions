import { adjustTextareaHeight,  adjustTextareaWidth, addEnterFunctionalityToField} from './utilityFunctions.js';
import { updateGroupsUI } from './uiFunctions.js';
import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';

export function addGroup() {
  let groupName = document.getElementById('groupNameInput').value.trim();

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    // Generate a group name if empty
    if (!groupName) {
      const existingNames = new Set(websiteGroups.map(group => group.groupName.toLowerCase()));
      const possibleNames = ["Group 1", "Group 2", "Group 3", "Group 4", "Group 5"];
      const availableName = possibleNames.find(name => !existingNames.has(name.toLowerCase()));

      if (availableName) {
        groupName = availableName;
      } else {
        alert("Maximum number of unnamed groups reached.");
        return;
      }
    }

    // Check if a group with this name already exists
    if (websiteGroups.some(group => group.groupName.toLowerCase() === groupName.toLowerCase())) {
      alert("A group with this name already exists.");
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
      alert("Cannot delete groups during active schedule.");
      return;
    }

    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

export function updateGroup(index) {
  chrome.storage.sync.get(['websiteGroups', 'schedules'], ({ websiteGroups, schedules }) => {
    const group = websiteGroups[index];

    const groupNameField = document.getElementById(`name-${index}`);
    const websitesField = document.getElementById(`websites-${index}`);
    const keywordsField = document.getElementById(`keywords-${index}`);
    const timerCountField = document.getElementById(`timerCount-${index}`);
    const timerDurationField = document.getElementById(`timerDuration-${index}`);

    const newGroupName = groupNameField.value.trim();
    const newWebsites = websitesField.value.split('\n').map(site => site.trim()).filter(site => site !== '');
    const newKeywords = keywordsField.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');
    const newTimerCount = parseInt(timerCountField.value, 10) || 0;
    const newTimerDuration = parseInt(timerDurationField.value, 10) || 20;

    if (isCurrentTimeInAnySchedule(schedules)) {
      // Check for removal or inappropriate modification in websites and keywords
      if (hasArrayChanged(group.websites, newWebsites) || hasArrayChanged(group.keywords, newKeywords)) {
        alert("Websites or Keywords entries have been edited or removed, change cannot be saved.");
        return; // Prevent saving
      }

      // Check timer settings
      if (newTimerCount > group.timer.count || newTimerDuration > group.timer.duration) {
        alert("Cannot increase the number of Timer Count or Timer Duration during active schedule.");
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
    editButton.textContent = 'Cancel';
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
    editButton.textContent = 'Edit';
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
    const timerCountField = document.getElementById(`timerCount-${index}`);
    const timerDurationField = document.getElementById(`timerDuration-${index}`);

    const newGroupName = groupNameField.value.trim();
    const newKeywords = keywordsField.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');

    const newWebsites = websitesField.value.split('\n')
    .map(site => normalizeURL(site.trim()))
    .filter(site => site !== '');

    if (isCurrentTimeInAnySchedule(schedules)) {
      // Log current field values
      console.log("Current Websites:", group.websites);
      console.log("New Websites:", newWebsites);
      console.log("Current Keywords:", group.keywords); //line 173
      console.log("New Keywords:", newKeywords);// line 174

      // Check for removal or inappropriate modification in websites and keywords
      if (hasArrayChanged(group.websites, newWebsites) || hasArrayChanged(group.keywords, newKeywords)) {
        console.log("change cannot be saved");
        alert("Websites or Keywords entries have been edited or removed, change cannot be saved.");
        return; // Prevent saving
      }


      const lockedScheduleValidation = validateKeywords(newKeywords, true);
      if (!lockedScheduleValidation.isValid) {
        console.log(`Invalid keyword value for locked schedule: ${lockedScheduleValidation.invalidKeyword}`);
        alert(`Invalid keyword value for locked schedule: ${lockedScheduleValidation.invalidKeyword}`);
        return; // Prevent saving
      }
      } else {
        const validation = validateKeywords(newKeywords, false);
        if (!validation.isValid) {
          alert(`Invalid keyword value: ${validation.invalidKeyword}`);
          return; // Prevent saving
      }


    }

    // Update group properties
    group.groupName = newGroupName;
    group.websites = newWebsites;
    group.keywords = newKeywords;
    group.timer = {
      count: parseInt(timerCountField.value, 10) || 0,
      duration: parseInt(timerDurationField.value, 10) || 20,
      usedToday: group.timer ? group.timer.usedToday : 0
    };

    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
    });
  });
}


// Function to validate keyword values and return the first invalid keyword
function validateKeywords(keywords, isLockedSchedule) {
  for (let keywordStr of keywords) {
    const { keyword, operation, value } = parseKeyword(keywordStr);

    if (operation === '+' && ((isLockedSchedule && value <= 0) || (!isLockedSchedule && (value < -1000 || value > 1000 || value === 0)))) {
      return { isValid: false, invalidKeyword: keywordStr };
    }
    if (operation === '*' && ((isLockedSchedule && value <= 1) || (!isLockedSchedule && (value <= 0 || value > 1000)))) {
      return { isValid: false, invalidKeyword: keywordStr };
    }
  }
  return { isValid: true };
}

// Helper function to parse a keyword string
function parseKeyword(keywordStr) {
  const parts = keywordStr.split(/(?<!\\),/).map(part => part.trim());
  let keyword = parts[0];
  let operation = '+';
  let value = 1000;

  if (parts.length === 1) {
    // Only keyword is provided, defaults are used for operation and value
    return { keyword, operation, value };
  }

  if (parts.length === 2) {
    // Keyword and value are provided, default is used for operation
    value = parseFloat(parts[1]);
    return { keyword, operation, value };
  }

  if (parts.length === 3) {
    // All three parts are provided
    operation = parts[1];
    value = parseFloat(parts[2]);
    return { keyword, operation, value };
  }

  // Invalid format, return defaults
  return { keyword, operation, value };
}
