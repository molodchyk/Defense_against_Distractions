import { adjustTextareaHeight,  adjustTextareaWidth, addEnterFunctionalityToField} from './utilityFunctions.js';
import { updateGroupsUI } from './uiFunctions.js';

export function addGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();
  if (!groupName) {
    alert("Group name cannot be empty.");
    return;
  }
}

export function removeGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

export function updateGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const groupName = document.getElementById(`name-${index}`).value.trim();
    const websites = document.getElementById(`websites-${index}`).value.split('\n').map(site => site.trim()).filter(site => site !== '');
    const keywords = document.getElementById(`keywords-${index}`).value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');

    websiteGroups[index].groupName = groupName;
    websiteGroups[index].websites = websites;
    websiteGroups[index].keywords = keywords;

    // Retrieve timer settings from the UI
    const timerCount = document.getElementById(`timerCount-${index}`).value;
    const timerDuration = document.getElementById(`timerDuration-${index}`).value;
    websiteGroups[index].timer = {
      count: parseInt(timerCount, 10) || 0,
      duration: parseInt(timerDuration, 10) || 20,
      usedToday: websiteGroups[index].timer ? websiteGroups[index].timer.usedToday : 0
    };

    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
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
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const group = websiteGroups[index];

    const groupNameField = document.getElementById(`name-${index}`);
    const websitesField = document.getElementById(`websites-${index}`);
    const keywordsField = document.getElementById(`keywords-${index}`);
    const timerCountField = document.getElementById(`timerCount-${index}`);
    const timerDurationField = document.getElementById(`timerDuration-${index}`);

    const initialGroupName = group.groupName;
    const initialWebsites = group.websites.join('\n');
    const initialKeywords = group.keywords.join('\n');
    const initialTimerCount = group.timer ? group.timer.count : 0;
    const initialTimerDuration = group.timer ? group.timer.duration : 20;

    group.groupName = groupNameField.value.trim(); // Update group name
    group.websites = websitesField.value.split('\n').map(site => site.trim()).filter(site => site !== '');
    group.keywords = keywordsField.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');
    group.timer = {
      count: parseInt(timerCountField.value, 10) || 0,
      duration: parseInt(timerDurationField.value, 10) || 20,
      usedToday: group.timer ? group.timer.usedToday : 0
    };

    console.log(`Group updated: [${index}]`);
    console.log(`Group Name: ${initialGroupName} -> ${group.groupName}`);
    console.log(`Websites: ${initialWebsites} -> ${group.websites.join('\n')}`);
    console.log(`Keywords: ${initialKeywords} -> ${group.keywords.join('\n')}`);
    console.log(`Timer Count: ${initialTimerCount} -> ${group.timer.count}`);
    console.log(`Timer Duration: ${initialTimerDuration} -> ${group.timer.duration}`);

    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
    });
  });
}