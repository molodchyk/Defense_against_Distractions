/*
 * Defense Against Distractions Extension
 *
 * file: uiFunctions.js
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
import { toggleFieldEdit, updateGroupField, removeGroup, migrateToNewGroupStorage } from './groupManagementFunctions.js';

import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';
import { updateButtonStates } from './passwordManager.js';

export function updateGroupsUI() {
  const list = document.getElementById('groupList');
  list.innerHTML = '';

  // Fetch all items from chrome.storage.sync
  chrome.storage.sync.get(null, (items) => {
    const schedules = items.schedules || [];
    const isInSchedule = isCurrentTimeInAnySchedule(schedules);

    // Filter out and process only group items
    Object.entries(items).forEach(([key, value]) => {
      if (key.startsWith('group_')) {
        const group = value;

        const li = document.createElement('li');
        li.className = 'group-item';

        // Group Name
        createGroupField(li, 'groupNameLabel', group.groupName, `name-${group.id}`, true, group.id);

        // Websites
        createGroupField(li, 'websitesLabel', group.websites.join('\n'), `websites-${group.id}`, true, group.id);

        // Keywords
        createGroupField(li, 'keywordsLabel', group.keywords.join('\n'), `keywords-${group.id}`, true, group.id);

        // Delete button - passing the group's unique ID for deletion
        const deleteButton = createButton('Delete', () => removeGroup(group.id), 'delete-button');
        li.appendChild(deleteButton);

        // Disable delete button and any edit functionalities if in schedule
        if (isInSchedule) {
          deleteButton.disabled = true;
        }

        list.appendChild(li);
      }
    });

    // After appending all items to the list, adjust their textareas' height
    document.querySelectorAll('.group-item textarea').forEach(adjustTextareaHeight);
  });
}



function createGroupField(container, labelKey, value, id, isReadOnly, index) {
  const fieldDiv = document.createElement('div');
  const labelElement = document.createElement('label');
  labelElement.textContent = chrome.i18n.getMessage(labelKey);

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

function createButton(textKey, onClick, className) {
  const button = document.createElement('button');
  button.textContent = chrome.i18n.getMessage(textKey);
  // button.addEventListener('click', onClick);
  button.addEventListener('click', function(event) {
    event.preventDefault(); // Prevent the default action
    onClick(); // Call the original click handler function
  });
  button.className = className;

  // Assign additional class for group save buttons
  if (className === 'save-button-group') {
    button.classList.add('save-button-group');
  }

  return button;
}

export function checkScheduleStatus() {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    const isInActiveSchedule = isCurrentTimeInAnySchedule(schedules);
    const importButton = document.getElementById('importButton');
    if (importButton) {
      importButton.disabled = isInActiveSchedule;
    }

    if (!isInActiveSchedule) {
      enableUIElements();
      updateButtonStates();
    }
  });
}

// Initialize and set the interval for checking the schedule status
document.addEventListener('DOMContentLoaded', function() {
  checkScheduleStatus(); // Initial check
  migrateToNewGroupStorage();
  setInterval(checkScheduleStatus, 15000); // Recheck every 15 seconds
});


export function enableUIElements() {
  const buttonsToEnable = document.querySelectorAll('button:disabled:not(.save-button):not(.password-management-button):not(.password-set-button)');

  buttonsToEnable.forEach(button => {
    button.disabled = false;
  });
}

