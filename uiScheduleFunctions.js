import {
    toggleScheduleEdit,
    removeSchedule,
    updateSchedule,
    toggleFieldEditability
  } from './schedule.js';

import {
  ScheduleState
} from './ScheduleState.js';

import { 
  updateWhitelistUI 
} from './whitelistManagement.js';

import { 
  updateGroupsUI
} from './uiFunctions.js'; // Adjust the path as necessary



// Helper function to create a schedule field
function createScheduleField(container, label, value, id, isReadOnly) {
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

// Helper function to convert time string to minutes since midnight
function timeStringToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function saveSchedule(scheduleState) {
  console.log('saveSchedule called for scheduleState:', scheduleState);
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  const index = scheduleState.index;

  chrome.storage.sync.get('schedules', ({ schedules }) => {
    if (schedules && schedules.length > index) {
      const startTimeField = document.getElementById(`schedule-startTime-${index}`);
      const endTimeField = document.getElementById(`schedule-endTime-${index}`);

      // Convert start and end times to minutes since midnight
      const startTimeMinutes = timeStringToMinutes(startTimeField.value);
      const endTimeMinutes = timeStringToMinutes(endTimeField.value);

      // Check if end time is after start time
      if (endTimeMinutes <= startTimeMinutes) {
        alert('End time must be after start time.');
        return; // Don't proceed with saving
      }

      // Update the schedule in storage with the temporary state
      schedules[index] = { ...schedules[index], ...scheduleState.tempState };
      chrome.storage.sync.set({ schedules }, () => {
        const scheduleStates = schedules.map((schedule, idx) => new ScheduleState(idx, schedule));
        updateSchedulesUI(schedules, scheduleStates);
        scheduleState.toggleEditing(); // Toggle off editing mode
        toggleFieldEditability(index, false);

        // Fetch and update the whitelist UI
        chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
          updateWhitelistUI(whitelistedSites);
        });

        // Fetch and update the groups UI
        chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
          updateGroupsUI(websiteGroups);
        });
    });
    }
    console.log('Fetched schedules for saving:', schedules);
  });
}


function createDayButtons(selectedDays, scheduleState) {
  const index = scheduleState.index;
  const dayButtonsContainer = document.createElement('div');
  dayButtonsContainer.id = `dayButtons-${index}`;

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
        console.log('Day button clicked:', this.textContent, 'Selected:', this.classList.contains('selected'));

        // Update the tempState here
        const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
                                        .map(selectedButton => selectedButton.textContent);
        scheduleState.updateTempState({ days: updatedSelectedDays });
      }
    });

    dayButtonsContainer.appendChild(dayButton);
  });

  return dayButtonsContainer;
}


function createActiveToggleButton(isActive, scheduleState) {
  console.log('Creating active toggle for schedule', scheduleState.index);
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  const activeButton = document.createElement('button');
  activeButton.textContent = isActive ? 'Active' : 'Inactive';
  activeButton.classList.add('active-toggle');
  // Add 'active' class if isActive is true
  if (isActive) {
    activeButton.classList.add('active');
  }
  activeButton.id = `active-toggle-${scheduleState.index}`; // Using scheduleState for ID

  activeButton.addEventListener('click', function() {
    console.log('Active toggle clicked for schedule', scheduleState.index);
    if (scheduleState.isEditing) {
      this.classList.toggle('active');
      const newIsActive = this.classList.contains('active');
      this.textContent = newIsActive ? 'Active' : 'Inactive';

      // Update the temporary state in scheduleState
      scheduleState.updateTempState({ isActive: newIsActive });
    }
    console.log(`is editing for schedule ${scheduleState.index}: ${scheduleState.isEditing}`);
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
  console.log('updateSchedulesUI called with schedules:', schedules, 'and scheduleStates:', scheduleStates);
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = ''; // Clear the list

  schedules.forEach((schedule, index) => {
    console.log('Processing schedule at index', index);
    const scheduleState = scheduleStates[index]; // Get the corresponding ScheduleState instance//line 142
    if (!scheduleState) {
      console.error(`No schedule state found for index ${index}`);
      return; // Skip this iteration
    }
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
  console.log('Refreshing UI for schedule', index, 'with temp state:', tempSchedule);
  
  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  console.log('Updating schedule name field:', scheduleNameField.id, 'New value:', tempSchedule.name);
  scheduleNameField.value = tempSchedule.name;

  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  console.log('Updating start time field:', startTimeField.id, 'New value:', tempSchedule.startTime);
  startTimeField.value = tempSchedule.startTime;

  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  console.log('Updating end time field:', endTimeField.id, 'New value:', tempSchedule.endTime);
  endTimeField.value = tempSchedule.endTime;

  const dayButtons = document.querySelectorAll(`#dayButtons-${index} .day-button`);
  dayButtons.forEach(button => {
    const isSelected = tempSchedule.days.includes(button.textContent);
    console.log('Updating day button:', button.id, 'Selected:', isSelected);
    button.classList.toggle('selected', isSelected);
  });

  const activeToggle = document.getElementById(`active-toggle-${index}`);
  if (activeToggle) {
    const isActive = tempSchedule.isActive;
    console.log('Updating active toggle:', activeToggle.id, 'Active:', isActive);
    activeToggle.textContent = isActive ? 'Active' : 'Inactive';
    activeToggle.classList.toggle('active', isActive);
  }
}
