import {
  refreshScheduleItemUIWithTempState,
  updateSchedulesUI
} from './uiScheduleFunctions.js';

import {
  ScheduleState
} from './ScheduleState.js';

import {
  isCurrentTimeInAnySchedule
} from './utilityFunctions.js';

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
  scheduleNameField.addEventListener('change', function() {
    console.log('Schedule name changed:', this.value);
    // Update the tempState here
    scheduleState.updateTempState({ name: this.value });
  });

  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  startTimeField.addEventListener('change', function() {
    console.log('Start time changed:', this.value);
    const formattedTime = formatTime(this.value);
    scheduleState.updateTempState({ startTime: formattedTime });
  });

  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  endTimeField.addEventListener('change', function() {
    console.log('End time changed:', this.value);
    const formattedTime = formatTime(this.value);
    scheduleState.updateTempState({ endTime: formattedTime });
  });

  startTimeField.addEventListener('input', function(event) {
    handleTimeInput(this, event);
  });

  endTimeField.addEventListener('input', function(event) {
      handleTimeInput(this, event);
  });


  const dayButtons = document.querySelectorAll(`#dayButtons-${index} .day-button`);
  dayButtons.forEach(button => {
    button.addEventListener('click', function() {
      if (isCurrentlyEditing) {
        console.log(`Day button ${button.textContent} clicked for schedule ${index}`);
        this.classList.toggle('selected');
        const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
                                          .map(selectedButton => selectedButton.textContent);
        scheduleState.updateTempState({ days: updatedSelectedDays });
        console.log('Updated selected days:', updatedSelectedDays);
      }
    });
  });

  const activeToggle = document.querySelector(`#active-toggle-${index}`);
  if (activeToggle) {
    // Remove any existing click listeners to avoid multiple bindings
    activeToggle.removeEventListener('click', activeToggleClickHandler);

    // Define a new click handler
    function activeToggleClickHandler() {
      console.log(`Before click: Active toggle classList for schedule ${index}:`, activeToggle.classList.toString());
      this.classList.toggle('active');
      const isActive = this.classList.contains('active');
      scheduleState.updateTempState({ isActive: isActive });
      console.log('After click: Active state updated:', isActive, 'classList:', activeToggle.classList.toString());
    }

    // Add the new click listener
    activeToggle.addEventListener('click', activeToggleClickHandler);
  }

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
  editButton.textContent = isCurrentlyEditing ? 
    chrome.i18n.getMessage("cancelLabel") : chrome.i18n.getMessage("editButtonLabel");
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
      activeToggle.textContent = activeToggle.classList.contains('active') ? 
        chrome.i18n.getMessage("activeLabel") : chrome.i18n.getMessage("inactiveLabel");
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

function handleTimeInput(inputElement, event) {
  const previousValue = inputElement.dataset.previousValue || '';
  const keyValue = event.data || 'backspace';

  console.log(`Previous state: ${previousValue}, Key pressed: ${keyValue}`);

  let value = inputElement.value;

  // Remove non-numeric and non-colon characters
  value = value.replace(/[^0-9:]/g, '');

  // Split the value into hours and minutes
  let parts = value.split(':');
  let hours = parts[0];
  let minutes = parts[1];

  // Adjust for colon input and backspaces
  if (keyValue === ':') {
      if (hours.length === 1 || hours.length === 2) {
          value = `${hours}:`;
      }
  } else if (keyValue === 'backspace') {
      if (previousValue.endsWith(':')) {
          // Remove last digit of hours if backspacing over colon
          hours = hours.substring(0, hours.length - 1);
          value = hours;
      } else {
          // Standard backspace handling if not over colon
          value = value.substring(0, value.length - 1);
      }
  }

  // Re-split the value after backspace handling
  parts = value.split(':');
  hours = parts[0];
  minutes = parts[1];

  // Ensure hours and minutes are within their bounds
  hours = Math.min(Math.max(parseInt(hours, 10) || 0, 0), 23);
  minutes = minutes ? Math.min(Math.max(parseInt(minutes, 10), 0), 59) : '';

  // Format the value correctly
  if (minutes !== '') {
      value = `${hours}:${minutes}`;
  } else if (value.endsWith(':') || hours >= 10) {
      value = `${hours}:`;
  } else {
      value = `${hours}`;
  }

  // Update the input value
  inputElement.value = value;
  console.log(`New state: ${value}`);

  // Store the current value for future reference
  inputElement.dataset.previousValue = value;
}

function formatTime(timeStr) {
  if (!timeStr.includes(':')) {
    // If only hours or minutes are provided, add the missing part
    return timeStr.padStart(2, '0') + ":00";
  }
  let [hours, minutes] = timeStr.split(':').map(str => str.padStart(2, '0'));
  return `${hours}:${minutes}`;
}

// Removes a schedule from the storage and updates the UI
export function removeSchedule(index) {
  console.log('removeSchedule called for index:', index);
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    if (isCurrentTimeInAnySchedule([schedules[index]])) {
      alert(chrome.i18n.getMessage("cannotDeleteActiveSchedule"));
      return;
    }

    // Proceed with schedule removal
    schedules.splice(index, 1);
    chrome.storage.sync.set({ schedules }, () => {
      // After updating the schedules in storage, recreate the scheduleStates
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      updateSchedulesUI(schedules, scheduleStates);
      console.log('Schedules after removal:', schedules);
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
  let scheduleName = document.getElementById('scheduleNameInput').value.trim();

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
    // Generate a schedule name if empty
    if (!scheduleName) {
      const existingNames = new Set(schedules.map(s => s.name.toLowerCase()));
      let scheduleNumber = 1;
      while (existingNames.has(chrome.i18n.getMessage("unnamedSchedulePrefix") + scheduleNumber)) {
        scheduleNumber++;
      }
      scheduleName = chrome.i18n.getMessage("unnamedSchedulePrefix") + scheduleNumber;
    }

    // Check if a schedule with this name already exists
    if (schedules.some(schedule => schedule.name.toLowerCase() === scheduleName.toLowerCase())) {
      alert(chrome.i18n.getMessage("scheduleNameExists"));
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

export function hasMinimumUnlockedTime(schedules, minimumUnlockedTime = 60) {
  const minutesInDay = 1440; // Total minutes in a day

  // Convert time string to minutes since midnight
  function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Aggregate all active schedules for each day
  const dailySchedules = {};
  schedules.forEach(schedule => {
    if (schedule.isActive) {  // Only consider active schedules
      schedule.days.forEach(day => {
        if (!dailySchedules[day]) {
          dailySchedules[day] = [];
        }
        dailySchedules[day].push({
          start: timeToMinutes(schedule.startTime),
          end: timeToMinutes(schedule.endTime)
        });
      });
    }
  });

  // Check for each day
  for (const day in dailySchedules) {
    let totalLockedTime = 0;
    dailySchedules[day].forEach(timeBlock => {
      totalLockedTime += timeBlock.end - timeBlock.start;
    });

    if (minutesInDay - totalLockedTime < minimumUnlockedTime) {
      return false; // Not enough unlocked time
    }
  }
  return true; // All days have enough unlocked time
}


export function doSchedulesOverlap(schedules) {
  // Convert time string to minutes since midnight
  function timeToMinutes(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
  }

  // Create a map to hold arrays of time ranges for each day
  const dayTimeRanges = {};

  schedules.forEach(schedule => {
      schedule.days.forEach(day => {
          if (!dayTimeRanges[day]) {
              dayTimeRanges[day] = [];
          }
          dayTimeRanges[day].push({
              start: timeToMinutes(schedule.startTime),
              end: timeToMinutes(schedule.endTime)
          });
      });
  });

  // Function to check if two time ranges overlap
  function rangesOverlap(range1, range2) {
      return range1.start < range2.end && range1.end > range2.start;
  }

  // Check for overlaps in each day's schedule
  for (const day in dayTimeRanges) {
      const ranges = dayTimeRanges[day];
      for (let i = 0; i < ranges.length; i++) {
          for (let j = i + 1; j < ranges.length; j++) {
              if (rangesOverlap(ranges[i], ranges[j])) {
                  return true; // Found an overlap
              }
          }
      }
  }

  return false; // No overlaps found
}
