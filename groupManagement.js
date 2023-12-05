// Function to update the UI for groups
function updateGroupsUI(websiteGroups) {
  const list = document.getElementById('groupList');
  list.innerHTML = '';
  websiteGroups.forEach((group, index) => {
    const li = document.createElement('li');
    li.className = 'group-item';

    // Group Name
    createGroupField(li, 'Group Name:', group.groupName, `name-${index}`, true);

    // Websites
    createGroupField(li, 'Websites:', group.websites.join('\n'), `websites-${index}`, false);

    // Keywords
    createGroupField(li, 'Keywords:', group.keywords.join('\n'), `keywords-${index}`, false);

    // Delete button
    const deleteButton = createButton('Delete', () => removeGroup(index), 'delete-button');
    li.appendChild(deleteButton);

    list.appendChild(li);
  });
}

function createGroupField(container, label, value, id, isReadOnly) {
  const fieldDiv = document.createElement('div');
  const labelElement = document.createElement('label');
  labelElement.textContent = label;
  const inputElement = isReadOnly ? document.createElement('input') : document.createElement('textarea');
  inputElement.value = value;
  inputElement.id = id;
  inputElement.readOnly = isReadOnly;
  fieldDiv.appendChild(labelElement);
  fieldDiv.appendChild(inputElement);

  if (!isReadOnly) {
    const updateButton = createButton('Edit', () => toggleFieldEdit(id), 'update-button');
    fieldDiv.appendChild(updateButton);
  }

  container.appendChild(fieldDiv);
}

function toggleFieldEdit(fieldId) {
  const field = document.getElementById(fieldId);
  const button = field.nextElementSibling;
  const isReadOnly = field.readOnly;

  field.readOnly = !isReadOnly;
  field.style.height = isReadOnly ? 'auto' : '1em'; // Expand the textarea
  button.textContent = isReadOnly ? 'Save' : 'Edit';
  button.classList.toggle('save-button', isReadOnly);

  if (!isReadOnly) {
    updateGroupField(fieldId.split('-')[1]); // Save the updated field
  }
}

function updateGroupField(index) {
  // Retrieve the current group's data
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const group = websiteGroups[index];

    // Update websites and keywords from the textarea fields
    const websitesField = document.getElementById(`websites-${index}`);
    const keywordsField = document.getElementById(`keywords-${index}`);

    // Splitting by newline and trimming each line to get individual entries
    group.websites = websitesField.value.split('\n').map(site => site.trim()).filter(site => site !== '');
    group.keywords = keywordsField.value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');

    // Save the updated group data
    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups); // Refresh the UI with updated data
    });
  });
}

function createButton(text, onClick, className) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  button.className = className;
  return button;
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

// Function to add a new group
function addGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();

  if (!groupName) {
    alert("Group name cannot be empty.");
    return;
  }

  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    if (websiteGroups.some(group => group.groupName.toLowerCase() === groupName.toLowerCase())) {
      alert("A group with this name already exists.");
      return;
    }

    websiteGroups.push({ groupName, websites: [], keywords: [] });
    chrome.storage.sync.set({ websiteGroups }, () => {
      updateGroupsUI(websiteGroups);
      document.getElementById('groupNameInput').value = ''; // Clear input field
    });
  });
}

// Function to update an existing group
function updateGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const groupName = document.getElementById(`name-${index}`).value.trim();
    const websites = document.getElementById(`websites-${index}`).value.split(',').map(site => site.trim());
    const keywords = document.getElementById(`keywords-${index}`).value.split(',').map(keyword => keyword.trim());

    websiteGroups[index] = { groupName, websites, keywords };
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

// Function to remove a group
function removeGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}


document.addEventListener('DOMContentLoaded', () => {
  // Initialize groups UI
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
    updateGroupsUI(websiteGroups);
  });

  // Add group functionality
  document.getElementById('addGroupButton').addEventListener('click', addGroup);
  document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      addGroup();
      event.preventDefault();
    }
  });
});
