import { updateGroupsUI } from './uiFunctions.js';

export function addGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();
  if (!groupName) {
    alert("Group name cannot be empty.");
    return;
  }
}


// Function to remove a group
export function removeGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

// Function to update an existing group
export function updateGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const groupName = document.getElementById(`name-${index}`).value.trim();
    const websites = document.getElementById(`websites-${index}`).value.split('\n').map(site => site.trim()).filter(site => site !== '');
    const keywords = document.getElementById(`keywords-${index}`).value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');

    websiteGroups[index] = { groupName, websites, keywords };
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

export function toggleFieldEdit(fieldId, index) {
  const field = document.getElementById(fieldId);
  const editButton = field.nextElementSibling;
  const saveButton = editButton.nextElementSibling;
  const isReadOnly = field.readOnly;

  // Extract field name from the id for logging purposes
  const fieldName = fieldId.split('-')[0]; // Adjusted to extract field name correctly

  if (isReadOnly) {
    console.log(`Clicked button Edit, editing field: ${fieldName}, Current Text: '${field.value}'`);
    field.readOnly = false;
    field.style.height = 'auto'; // Reset height to auto
    editButton.textContent = 'Cancel';
    saveButton.disabled = false;
    field.setAttribute('data-initial-value', field.value);

    // Adjust height for textarea fields
    if (field.tagName.toLowerCase() === 'textarea') {
      adjustTextareaHeight(field);
      adjustTextareaWidth(field);
    }

    // Add Enter key functionality for websites field
    if (fieldId.startsWith('websites-')) {
      addEnterFunctionalityToField(field);
    }
  } else {
    console.log(`Edit canceled for field: ${fieldName}, Original Text: '${field.getAttribute('data-initial-value')}'`);
    field.readOnly = true;
    field.value = field.getAttribute('data-initial-value'); // Restore original value
    editButton.textContent = 'Edit';
    saveButton.disabled = true;

    // Adjust height for textarea fields
    if (field.tagName.toLowerCase() === 'textarea') {
      adjustTextareaHeight(field);
      adjustTextareaWidth(field);
    }
  }
}



export function updateGroupField(index) {
  // Retrieve the current group's data
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const group = websiteGroups[index];

    // Update group name, websites, and keywords from the fields
    const groupNameField = document.getElementById(`name-${index}`);
    const websitesField = document.getElementById(`websites-${index}`);
    const keywordsField = document.getElementById(`keywords-${index}`);

    const initialGroupName = group.groupName;
    const initialWebsites = group.websites.join('\n');
    const initialKeywords = group.keywords.join('\n');

    group.groupName = groupNameField.value.trim(); // Update group name
    group.websites = websitesField.value.split('\n').map(site => site.trim()).filter(site => site !== '');
    group.keywords = keywordsField.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');

    // Logging changes
    console.log(`Group updated: [${index}]`);
    console.log(`Group Name: ${initialGroupName} -> ${group.groupName}`);
    console.log(`Websites: ${initialWebsites} -> ${group.websites.join('\n')}`);
    console.log(`Keywords: ${initialKeywords} -> ${group.keywords.join('\n')}`);

    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups); // Refresh the UI with updated data
    });
  });
}

// Toggle update mode for a group
function toggleUpdateGroup(index) {
  const groupNameInput = document.getElementById(`name-${index}`);
  const websitesTextarea = document.getElementById(`websites-${index}`);
  const keywordsTextarea = document.getElementById(`keywords-${index}`);
  const isReadOnly = groupNameInput.readOnly;

  groupNameInput.readOnly = !isReadOnly;
  websitesTextarea.readOnly = !isReadOnly;
  keywordsTextarea.readOnly = !isReadOnly;

  const updateButton = groupNameInput.nextElementSibling.nextElementSibling.nextElementSibling;
  updateButton.textContent = isReadOnly ? 'Save' : 'Edit';

  if (!isReadOnly) {
    updateGroup(index); // Save the updated group
  }
}