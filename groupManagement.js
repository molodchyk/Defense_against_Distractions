function updateGroupsUI(websiteGroups) {
  const list = document.getElementById('groupList');
  list.innerHTML = '';
  websiteGroups.forEach((group, index) => {
    const li = document.createElement('li');
    li.className = 'group-item';

    // Group Name
    createGroupField(li, 'Group Name:', group.groupName, `name-${index}`, true, index);

    // Websites
    createGroupField(li, 'Websites:', group.websites.join('\n'), `websites-${index}`, true, index);

    // Keywords
    createGroupField(li, 'Keywords:', group.keywords.join('\n'), `keywords-${index}`, true, index);

    // Delete button
    const deleteButton = createButton('Delete', () => removeGroup(index), 'delete-button');
    li.appendChild(deleteButton);

    list.appendChild(li);
    document.querySelectorAll('.group-item textarea').forEach(adjustTextareaHeight);
  });
}

function adjustTextareaWidth(textarea) {
  const tempSpan = document.createElement('span');
  document.body.appendChild(tempSpan);

  // Copy font styles to the temporary span
  const styles = window.getComputedStyle(textarea);
  tempSpan.style.font = styles.font;
  tempSpan.style.letterSpacing = styles.letterSpacing;
  tempSpan.style.whiteSpace = 'pre-wrap';
  tempSpan.style.wordWrap = 'break-word';
  tempSpan.style.visibility = 'hidden';

  tempSpan.textContent = textarea.value || textarea.placeholder;

  // Calculate and set new width
  const padding = parseInt(styles.paddingLeft) + parseInt(styles.paddingRight);
  textarea.style.width = (tempSpan.offsetWidth + padding) + 'px';

  document.body.removeChild(tempSpan);
}



function addEnterFunctionalityToField(field) {
  if (field.dataset.enterFunctionalityAdded) {
    return; // Exit if already added
  }

  field.addEventListener('keypress', function(event) {
    console.log('Keypress detected:', event.key);
    if (event.key === 'Enter' && !field.readOnly) {
      console.log('Enter key pressed in editable field');
      event.preventDefault();
      event.stopPropagation(); // Prevent event propagation
      const cursorPosition = field.selectionStart;
      // Insert a newline and a bullet point
      field.setRangeText('\n• ', cursorPosition, cursorPosition, 'end');
      field.selectionStart = field.selectionEnd = cursorPosition + 3; // Adjust cursor position

      adjustTextareaHeight(field); // Adjust the height after adding a newline
      adjustTextareaWidth(field);
    }
  });

  field.dataset.enterFunctionalityAdded = 'true'; // Set flag to indicate event listener added
}


function formatTextareaContent(textarea) {
  let lines = textarea.value.split('\n');
  let formattedLines = lines.map(line => {
    // Add a bullet point only if it's not already there
    return line.trim().startsWith('•') ? line : '• ' + line;
  });
  textarea.value = formattedLines.join('\n');
}

function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto'; // Reset height to recalculate
  textarea.style.height = textarea.scrollHeight + 'px'; // Set height to scroll height
}

function createGroupField(container, label, value, id, isReadOnly, index) {
  const fieldDiv = document.createElement('div');
  const labelElement = document.createElement('label');
  labelElement.textContent = label;

  let inputElement;
  if (!isReadOnly) {
    inputElement = document.createElement('input');
    inputElement.addEventListener('input', () => adjustTextareaHeight(inputElement));
    adjustTextareaHeight(inputElement); // Initial adjustment
  } else {
    inputElement = document.createElement('textarea');
    inputElement.placeholder = "Enter each website on a new line"; // Set placeholder text
    if (id.startsWith('websites-')) {
      addEnterFunctionalityToField(inputElement);
    }
  }
  inputElement.value = value;
  inputElement.id = id;
  inputElement.readOnly = isReadOnly;

  fieldDiv.appendChild(labelElement);
  fieldDiv.appendChild(inputElement);

  // Add Edit and Save buttons
  const editButton = createButton('Edit', () => toggleFieldEdit(id, index), 'edit-button');
  const saveButton = createButton('Save', () => updateGroupField(index), 'save-button');
  saveButton.disabled = true; // Initially disable the Save button

  fieldDiv.appendChild(editButton);
  fieldDiv.appendChild(saveButton);

  container.appendChild(fieldDiv);
  // Adjust both width and height for textareas
  if (inputElement.tagName.toLowerCase() === 'textarea') {
    inputElement.addEventListener('input', function() {
        adjustTextareaHeight(inputElement);
        adjustTextareaWidth(inputElement);
    });
    adjustTextareaHeight(inputElement);
    adjustTextareaWidth(inputElement);
  }
}


function toggleFieldEdit(fieldId, index) {
  const field = document.getElementById(fieldId);
  const editButton = field.nextElementSibling;
  const saveButton = editButton.nextElementSibling;
  const isReadOnly = field.readOnly;

  // Extract field name from the id for logging purposes
  const fieldName = fieldId.split('-')[0]; // Adjusted to extract field name correctly

  if (isReadOnly) {
    formatTextareaContent(field);
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
  }
  if (field.tagName.toLowerCase() === 'textarea') {
    adjustTextareaHeight(field);
    adjustTextareaWidth(field);
  }
}


// Function to update an existing group
function updateGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    const groupName = document.getElementById(`name-${index}`).value.trim();
    const websites = document.getElementById(`websites-${index}`).value.split('\n').map(site => site.trim()).filter(site => site !== '');
    const keywords = document.getElementById(`keywords-${index}`).value.split('\n').map(keyword => keyword.trim()).filter(keyword => keyword !== '');

    websiteGroups[index] = { groupName, websites, keywords };
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

function updateGroupField(index) {
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

  // Check if group already exists
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
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

// Function to remove a group
function removeGroup(index) {
  chrome.storage.sync.get('websiteGroups', ({ websiteGroups }) => {
    websiteGroups.splice(index, 1);
    chrome.storage.sync.set({ websiteGroups }, () => updateGroupsUI(websiteGroups));
  });
}

// Event listener for adding group on Enter key press
document.getElementById('groupNameInput').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addGroup();
    event.preventDefault();
  }
});

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