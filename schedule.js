import {
  refreshScheduleItemUIWithTempState,
  updateSchedulesUI
} from './uiScheduleFunctions.js';

import {
  ScheduleState
} from './ScheduleState.js';

document.addEventListener('DOMContentLoaded', function() {
  const scheduleNameInput = document.getElementById('scheduleNameInput');
  scheduleNameInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      addSchedule();
    }
  });

  document.getElementById('addScheduleButton').addEventListener('click', addSchedule);

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
    const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
    updateSchedulesUI(schedules, scheduleStates); // Pass scheduleStates here
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

export function toggleScheduleEdit(scheduleState) {
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  scheduleState.toggleEditing();
  const index = scheduleState.index;
  const isCurrentlyEditing = scheduleState.isEditing;

  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  const dayButtons = document.querySelectorAll(`#dayButtons-${index} .day-button`);
  const activeToggle = document.querySelector(`#active-toggle-${index}`);

  const editButtonId = `edit-button-schedule-${index}`;
  const saveButtonId = `save-button-schedule-${index}`;

  // Log the current state when entering edit mode
  if (isCurrentlyEditing) {
    console.log(`Editing schedule ${index}`);
    // Log the field values
    [scheduleNameField, startTimeField, endTimeField].forEach(field => {
      if (field) console.log(`${field.id}: ${field.value}`);
    });

    if (activeToggle) {
      console.log(`Active: ${activeToggle.classList.contains('active')}`);
    }

    let selectedDays = [];
    dayButtons.forEach(button => {
      if (button.classList.contains('selected')) {
        selectedDays.push(button.textContent);
      }
    });
    console.log(`Selected Days: ${selectedDays.join(', ')}`);
  }

  const editButton = document.getElementById(editButtonId);
  const saveButton = document.getElementById(saveButtonId);

  if (!editButton || !saveButton) {
    console.error(`Buttons not found for schedule index ${index}`);
    return;
  }

  // Toggle button text and field states
  editButton.textContent = isCurrentlyEditing ? 'Cancel' : 'Edit';
  saveButton.disabled = !isCurrentlyEditing;

  // Toggle field editability
  [scheduleNameField, startTimeField, endTimeField].forEach(field => {
    if (field) field.readOnly = !isCurrentlyEditing;
  });

  // Toggle day buttons and active toggle button, only if in edit mode
  dayButtons.forEach(button => {
    button.onclick = isCurrentlyEditing ? () => button.classList.toggle('selected') : null;
  });

  if (activeToggle) {
    activeToggle.onclick = isCurrentlyEditing ? () => {
      activeToggle.classList.toggle('active');
      activeToggle.textContent = activeToggle.classList.contains('active') ? 'Active' : 'Inactive';
    } : null;
  }

  if (!isCurrentlyEditing && editButton.textContent === 'Cancel') {
    chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      updateSchedulesUI(schedules, scheduleStates);
    });
    console.log(`Edit canceled, reverted to original state for schedule ${index}`);
  }

  console.log(`Toggled edit mode for schedule ${index}: ${isCurrentlyEditing}`);
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

// Updates the schedule with new values from the fields
export function updateSchedule(scheduleState) {
  if (!scheduleState) {
    console.error('scheduleState is not defined'); //line 137
    return;
  }

  const index = scheduleState.index;

  chrome.storage.sync.get('schedules', ({ schedules }) => {
    const nameField = document.getElementById(`schedule-name-${index}`);
    const selectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`)).map(button => button.textContent);
    const startTimeField = document.getElementById(`schedule-startTime-${index}`);
    const endTimeField = document.getElementById(`schedule-endTime-${index}`);

    // Update the scheduleState's temporary state with new values
    scheduleState.updateTempState({
      name: nameField.value,
      days: selectedDays,
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      isActive: schedules[index].isActive
    });

    // Optionally, refresh UI for the current item
    refreshScheduleItemUIWithTempState(index, scheduleState.tempState);
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
