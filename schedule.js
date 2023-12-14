import {
  createScheduleField,
  createDayButtons,
  refreshScheduleItemUIWithTempState,
  createSaveButton,
  updateSchedulesUI
} from './uiScheduleFunctions.js';

let isEditing = {};

document.addEventListener('DOMContentLoaded', function() {
  const scheduleNameInput = document.getElementById('scheduleNameInput');
  scheduleNameInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      addSchedule();
    }
  });

  document.getElementById('addScheduleButton').addEventListener('click', addSchedule);

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
      updateSchedulesUI(schedules);
  });
});


function toggleFieldEditability(index, isEditable) {
  const fields = [
    document.getElementById(`schedule-name-${index}`),
    document.getElementById(`schedule-startTime-${index}`),
    document.getElementById(`schedule-endTime-${index}`)
  ];

  fields.forEach(field => {
    if (field) {
      field.readOnly = !isEditable;
    }
  });
}


export function toggleScheduleEdit(index) {
  isEditing[index] = !isEditing[index]; // Toggle editing state globally

  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  const dayButtons = document.querySelectorAll(`#dayButtons-${index} .day-button`);
  const activeToggle = document.querySelector(`#active-toggle-${index}`);

  const editButtonId = `edit-button-schedule-${index}`;
  const saveButtonId = `save-button-schedule-${index}`;


  // Log the current state when entering edit mode
  if (isEditing[index]) {
    console.log(`Editing schedule ${index}`);
    if (scheduleNameField) console.log(`Name: ${scheduleNameField.value}`);
    if (startTimeField) console.log(`Start Time: ${startTimeField.value}`);
    if (endTimeField) console.log(`End Time: ${endTimeField.value}`);
    if (activeToggle) console.log(`Active: ${activeToggle.classList.contains('active')}`);

    let selectedDays = [];
    dayButtons.forEach(button => {
        if (button && button.classList.contains('selected')) {
            selectedDays.push(button.textContent);
        }
    });
    console.log(`Selected Days: ${selectedDays.join(', ')}`);

    // Log day buttons
    console.log('Day buttons found:', dayButtons.length);
    dayButtons.forEach(button => console.log(`${button.textContent}: ${button.classList.contains('selected')}`));

    // Log active toggle state
    if (activeToggle) {
      console.log(`Active Toggle State: ${activeToggle.classList.contains('active')}`);
    } else {
      console.log('Active Toggle not found');
    }
  }

  // Check if elements are not null before accessing dataset
  if (isEditing[index]) {
    if(scheduleNameField) scheduleNameField.dataset.original = scheduleNameField.value;
    if(startTimeField) startTimeField.dataset.original = startTimeField.value;
    if(endTimeField) endTimeField.dataset.original = endTimeField.value;
    
    dayButtons.forEach(button => {
      if(button) button.dataset.original = button.classList.contains('selected').toString();
    });
    
    if(activeToggle) activeToggle.dataset.original = activeToggle.classList.contains('active').toString();
  }

  const editButton = document.getElementById(editButtonId);
  const saveButton = document.getElementById(saveButtonId);

  // Debugging: log the elements to see if they are being selected correctly
  console.log(`Edit Button ID: ${editButtonId}, Element: `, editButton);
  console.log(`Save Button ID: ${saveButtonId}, Element: `, saveButton);

  // Check if the buttons are found
  if (!editButton || !saveButton) {
    console.error(`Buttons not found for schedule index ${index}`);
    return;
  }

  // Determine current editing state
  const isCurrentlyEditing = editButton.textContent === 'Edit';

  // Toggle button text and field states
  editButton.textContent = isCurrentlyEditing ? 'Cancel' : 'Edit';
  saveButton.disabled = !isCurrentlyEditing;

  // Toggle field editability
  [scheduleNameField, startTimeField, endTimeField].forEach(field => {
    if (field) field.readOnly = !isEditing[index];
  });

  // Toggle day buttons and active toggle button, only if in edit mode
  dayButtons.forEach(button => {
    button.onclick = isEditing[index] ? () => button.classList.toggle('selected') : null;
  });
  if (activeToggle) {
    activeToggle.onclick = isEditing[index] ? () => {
      activeToggle.classList.toggle('active');
      activeToggle.textContent = activeToggle.classList.contains('active') ? 'Active' : 'Inactive';
    } : null;
  }

  if (!isEditing[index] && editButton.textContent === 'Cancel') {
    // Revert to the original state
    chrome.storage.sync.get('schedules', ({ schedules }) => {
      if (schedules && schedules.length > index) {
        refreshScheduleItemUIWithTempState(index, schedules[index]);
      }
    });
    console.log(`Edit canceled, reverted to original state for schedule ${index}`);
  }

  // Add console log for debugging
  console.log(`Toggled edit mode for schedule ${index}: ${isEditing[index]}`);
}


// Removes a schedule from the storage and updates the UI
export function removeSchedule(index) {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    schedules.splice(index, 1);
    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules); // Update the UI to reflect the removal
    });
  });
}


let tempSchedules = {}; // Temporary state to hold schedules during editing

// Updates the schedule with new values from the fields
export function updateSchedule(index) {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    const nameField = document.getElementById(`schedule-name-${index}`);
    const selectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`)).map(button => button.textContent);
    const startTimeField = document.getElementById(`schedule-startTime-${index}`);
    const endTimeField = document.getElementById(`schedule-endTime-${index}`);

    // Update the temporary schedule object with new values
    tempSchedules[index] = {
      name: nameField.value,
      days: selectedDays,
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      isActive: schedules[index].isActive
    };

     // Optionally, refresh UI for the current item
    refreshScheduleItemUIWithTempState(index, tempSchedules[index]);
  });
}

// Function to save the schedule permanently
export function saveSchedule(index) {
  if (tempSchedules[index]) {
    chrome.storage.sync.get('schedules', ({ schedules }) => {
      schedules[index] = tempSchedules[index];
      chrome.storage.sync.set({ schedules }, () => {
        updateSchedulesUI(schedules);
        isEditing[index] = false;
        toggleFieldEditability(index, false);
        delete tempSchedules[index]; // Clear temporary state
      });
    });
  }
}

function addSchedule() {
  const scheduleName = document.getElementById('scheduleNameInput').value.trim();
  if (!scheduleName) {
    alert("Schedule name cannot be empty.");
    return;
  }

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
    if (schedules.some(schedule => schedule.name.toLowerCase() === scheduleName.toLowerCase())) {
      alert("A schedule with this name already exists.");
      return;
    }

    // Add new schedule
    schedules.push({
      name: scheduleName,
      days: [],
      startTime: '00:00',
      endTime: '23:59',
      isActive: false // Initially, the schedule is not active
    });
    console.log("New schedule added:", scheduleName);

    chrome.storage.sync.set({ schedules }, () => {
      updateSchedulesUI(schedules);
      document.getElementById('scheduleNameInput').value = ''; // Clear input field
    });
  });
}
