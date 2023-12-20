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

// Helper function to check if there's any removal or inappropriate modification
function hasArrayChanged(originalArray, newArray) {
  if (originalArray.length !== newArray.length) {
    return true;
  }
  return originalArray.some((element, index) => element !== newArray[index]);
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