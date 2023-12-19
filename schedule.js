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


export function toggleFieldEditability(index, isEditable) {
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
  console.log('toggleScheduleEdit called with scheduleState:', scheduleState);
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  scheduleState.toggleEditing();
  const index = scheduleState.index;
  const isCurrentlyEditing = scheduleState.isEditing;

  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  // Add event listener for change on scheduleNameField
  scheduleNameField.addEventListener('change', function() {
    console.log('Schedule name changed:', this.value);
    // Update the tempState here
    scheduleState.updateTempState({ name: this.value });
  });
  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  const dayButtons = document.querySelectorAll(`#dayButtons-${index} .day-button`);
  const activeToggle = document.querySelector(`#active-toggle-${index}`);

  // Assuming this is inside a function where startTimeField and endTimeField are defined
  startTimeField.addEventListener('change', function() {
    console.log('Start time changed:', this.value);
    // Update the tempState with the new start time
    scheduleState.updateTempState({ startTime: this.value });
  });

  endTimeField.addEventListener('change', function() {
    console.log('End time changed:', this.value);
    // Update the tempState with the new end time
    scheduleState.updateTempState({ endTime: this.value });
  });


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
  console.log('isCurrentlyEditing:', isCurrentlyEditing);
  saveButton.disabled = !isCurrentlyEditing;

  // Toggle field editability
  [scheduleNameField, startTimeField, endTimeField].forEach(field => {
    if (field) field.readOnly = !isCurrentlyEditing;
  });

  // Toggle day buttons and active toggle button, only if in edit mode
  dayButtons.forEach(button => {
    button.onclick = isCurrentlyEditing ? () => {
      button.classList.toggle('selected');
      const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${scheduleState.index} .day-button.selected`))
                                        .map(selectedButton => selectedButton.textContent);
      scheduleState.updateTempState({ days: updatedSelectedDays });
    } : null;
  });


  if (activeToggle) {
    console.log('Entering edit mode for schedule', index);
    activeToggle.onclick = isCurrentlyEditing ? () => {
      activeToggle.classList.toggle('active');
      scheduleState.updateTempState({ isActive: activeToggle.classList.contains('active') });
      activeToggle.textContent = activeToggle.classList.contains('active') ? 'Active' : 'Inactive';
    } : null;
  }

  if (!isCurrentlyEditing && editButton.textContent === 'Edit') {
    console.log('Exiting edit mode for schedule', index);
    chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      console.log('Calling updateSchedulesUI before exiting edit mode', scheduleStates);
      updateSchedulesUI(schedules, scheduleStates);
      console.log('updateSchedulesUI called');
    });
    console.log(`Edit canceled, reverted to original state for schedule ${index}`);
  }
  console.log(`editButton.text: ${editButton.textContent}`)

  console.log(`Toggled edit mode for schedule ${index}: ${isCurrentlyEditing}`);
}


// Removes a schedule from the storage and updates the UI
export function removeSchedule(index) {
  console.log('removeSchedule called for index:', index);
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    schedules.splice(index, 1);

    chrome.storage.sync.set({ schedules }, () => {
      // After updating the schedules in storage, recreate the scheduleStates
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      updateSchedulesUI(schedules, scheduleStates); // Pass both schedules and their states
      console.log('Schedules after removal:', schedules); // Moved inside the callback
    });
  });
}



// Updates the schedule with new values from the fields
export function updateSchedule(scheduleState) {
  console.log('updateSchedule called with scheduleState:', scheduleState);
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  const index = scheduleState.index;

  chrome.storage.sync.get('schedules', ({ schedules }) => {
    const nameField = document.getElementById(`schedule-name-${index}`);
    const selectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`)).map(button => button.textContent);
    const startTimeField = document.getElementById(`schedule-startTime-${index}`);
    const endTimeField = document.getElementById(`schedule-endTime-${index}`);
    const activeToggle = document.getElementById(`active-toggle-${index}`); // Ensure activeToggle is defined here

    let isActive = false;
    if (activeToggle && activeToggle.classList.contains('active')) {
      isActive = true;
    }

    console.log('Updating tempState of schedule', index);
    scheduleState.updateTempState({
      name: nameField.value,
      days: selectedDays,
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      isActive: isActive
    });
    console.log('updateSchedule: ', scheduleState);

    // Optionally, refresh UI for the current item
    refreshScheduleItemUIWithTempState(index, scheduleState.tempState);
    console.log('Fetched schedules for update:', schedules);
  });
}


function addSchedule() {
  console.log('addSchedule called');
  const scheduleName = document.getElementById('scheduleNameInput').value.trim();
  if (!scheduleName) {
    alert("Schedule name cannot be empty.");
    return;
  }
  console.log('Checked for existing schedule name');

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
    if (schedules.some(schedule => schedule.name.toLowerCase() === scheduleName.toLowerCase())) {
      alert("A schedule with this name already exists.");
      return;
    }

    // Construct the new schedule object
    const newSchedule = {
      name: scheduleName,
      days: [],
      startTime: '00:00',
      endTime: '23:59',
      isActive: false // Initially, the schedule is not active
    };

    // Add new schedule
    schedules.push(newSchedule);
    console.log('Adding new schedule to storage:', newSchedule);

    // Create a new ScheduleState instance for the new schedule
    const newScheduleState = new ScheduleState(schedules.length - 1, newSchedule);

    // Save the updated schedules to Chrome storage
    chrome.storage.sync.set({ schedules }, () => {
      // Retrieve updated schedules and their states
      chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
        const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
        updateSchedulesUI(schedules, scheduleStates); // Pass both schedules and their states
        document.getElementById('scheduleNameInput').value = ''; // Clear input field
      });
    });
  });
}
