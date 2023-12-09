import { adjustTextareaHeight,  adjustTextareaWidth, addEnterFunctionalityToField} from './utilityFunctions.js';
import { toggleFieldEdit, updateGroupField } from './groupManagementFunctions.js';

// Function to update the UI for groups
export function updateGroupsUI(websiteGroups) {
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

function createButton(text, onClick, className) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  button.className = className;
  return button;
}
