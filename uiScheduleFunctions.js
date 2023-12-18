import {
    toggleScheduleEdit,
    removeSchedule,
    updateSchedule
  } from './schedule.js';

import {
  ScheduleState
} from './ScheduleState.js';


// Helper function to create a schedule field
export function createScheduleField(container, label, value, id, isReadOnly) {
  const fieldDiv = document.createElement('div');
  const labelElement = document.createElement('label');
  labelElement.textContent = label;
  const inputElement = document.createElement('input');

  inputElement.value = value;
  inputElement.id = id;
  inputElement.readOnly = isReadOnly;

  fieldDiv.appendChild(labelElement);
  fieldDiv.appendChild(inputElement);

  container.appendChild(fieldDiv);
}

// Function to save the schedule permanently
export function saveSchedule(scheduleState) {
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  const index = scheduleState.index;

  chrome.storage.sync.get('schedules', ({ schedules }) => {
    if (schedules && schedules.length > index) {
      schedules[index] = { ...schedules[index], ...scheduleState.tempState };
      chrome.storage.sync.set({ schedules }, () => {
        updateSchedulesUI(schedules);
        scheduleState.toggleEditing(); // Toggle off editing mode
        toggleFieldEditability(index, false);
      });
    }
  });
}


export function createDayButtons(selectedDays, scheduleState) {
  const index = scheduleState.index;
  const dayButtonsContainer = document.createElement('div');
  dayButtonsContainer.id = `dayButtons-${index}`;
  console.log(`day buttons container id: ${dayButtonsContainer.id}`);

  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((day, dayIndex) => {
    const dayButton = document.createElement('button');
    dayButton.id = `dayButton-${index}-${dayIndex}`;
    dayButton.textContent = day;
    dayButton.classList.add('day-button');
    if (selectedDays.includes(day)) {
      dayButton.classList.add('selected');
    }

    dayButton.addEventListener('click', function() {
      if (scheduleState.isEditing) {
        this.classList.toggle('selected');
        updateSchedule(scheduleState); // Pass the correct scheduleState
      }
      console.log(`is editing for schedule ${index}: ${scheduleState.isEditing}`);
    });

    dayButtonsContainer.appendChild(dayButton);
    console.log(`day: ${day}, id: ${dayButton.id}`);
  });

  return dayButtonsContainer;
}

function createActiveToggleButton(isActive, index) {
  const activeButton = document.createElement('button');
  activeButton.textContent = isActive ? 'Active' : 'Inactive';
  activeButton.classList.add('active-toggle');
  activeButton.id = `active-toggle-${index}`; // Ensuring correct ID
  console.log(`active button id: ${activeButton.id}`);
  activeButton.addEventListener('click', function() {
    if (isEditing[index]) {
      this.classList.toggle('active');
      this.textContent = this.classList.contains('active') ? 'Active' : 'Inactive';
    }
    console.log(`is editing[index] active toggle button: ${isEditing[index]}`);
  });

  return activeButton;
}


function createButton(text, onClick, className, index) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  button.className = className;
  
  if (typeof index === 'number') {
    button.id = `${className}-${index}`;
    console.log(`Created button with ID: ${button.id}`);
  } else {
    console.log(`Index is not a number, it's: ${index}`);
  }

  return button;
}


// Function to create a save button
export function createSaveButton(index) {
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.classList.add('save-button');
  saveButton.addEventListener('click', function() {
    saveSchedule(index);
  });

  return saveButton;
}

export function updateSchedulesUI(schedules, scheduleStates) {
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = ''; // Clear the list

  schedules.forEach((schedule, index) => {
    const scheduleState = scheduleStates[index]; // Get the corresponding ScheduleState instance
    const li = document.createElement('li');
    li.className = 'schedule-item';

    // Schedule Name
    createScheduleField(li, 'Schedule Name:', schedule.name, `schedule-name-${index}`, true);

    // Days buttons
    const daysContainer = createDayButtons(schedule.days, scheduleState); // Pass scheduleState
    li.appendChild(daysContainer);

    // Start Time
    createScheduleField(li, 'Start Time:', schedule.startTime, `schedule-startTime-${index}`, true);

    // End Time
    createScheduleField(li, 'End Time: ', schedule.endTime, `schedule-endTime-${index}`, true);

    // Active toggle button
    const activeToggleButton = createActiveToggleButton(schedule.isActive, scheduleState); // Pass scheduleState
    li.appendChild(activeToggleButton);

    // Control buttons container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';

    // Edit button
    const editButton = createButton('Edit', () => toggleScheduleEdit(scheduleState), 'edit-button-schedule', index); // Pass scheduleState
    controlsContainer.appendChild(editButton);

    // Save button
    const saveButton = createButton('Save', () => saveSchedule(scheduleState), 'save-button-schedule', index); // Pass scheduleState
    controlsContainer.appendChild(saveButton);

    // Delete button
    const deleteButton = createButton('Delete', () => removeSchedule(index), 'delete-button-schedule', index);
    controlsContainer.appendChild(deleteButton);

    li.appendChild(controlsContainer);

    scheduleList.appendChild(li);
  });
}

// Refreshes the UI for a single schedule item with temporary state
export function refreshScheduleItemUIWithTempState(index, tempSchedule) {
  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  const dayButtons = document.querySelectorAll(`#dayButtons-${index} .day-button`);
  const activeToggle = document.getElementById(`active-toggle-${index}`);

  // Update the fields with the temporary state
  scheduleNameField.value = tempSchedule.name;
  startTimeField.value = tempSchedule.startTime;
  endTimeField.value = tempSchedule.endTime;
  dayButtons.forEach(button => {
    button.classList.toggle('selected', tempSchedule.days.includes(button.textContent));
  });
  if (activeToggle) {
    activeToggle.textContent = tempSchedule.isActive ? 'Active' : 'Inactive';
    activeToggle.classList.toggle('active', tempSchedule.isActive);
  }
}
