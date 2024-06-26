/*
 * Defense Against Distractions Extension
 *
 * file: uiScheduleFunctions.js
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

import {
  toggleScheduleEdit,
  removeSchedule,
  toggleFieldEditability,
  hasMinimumUnlockedTime,
  doSchedulesOverlap
} from './schedule.js';

import {
  ScheduleState
} from './ScheduleState.js';

import { 
  updateWhitelistUI 
} from './whitelistManagement.js';

import { 
  updateGroupsUI,
  checkScheduleStatus
} from './uiFunctions.js';

import { 
  isCurrentTimeInAnySchedule
} from './utilityFunctions.js';
import { updateButtonStates } from './passwordManager.js';



// Helper function to create a schedule field
function createScheduleField(container, labelKey, value, id, isReadOnly) {
  const fieldDiv = document.createElement('div');
  const labelElement = document.createElement('label');
  labelElement.textContent = chrome.i18n.getMessage(labelKey);
  const inputElement = document.createElement('input');
  inputElement.classList.add('schedule-input'); // Add this line

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

      const originalSchedule = schedules[index];
      const tempSchedule = scheduleState.tempState;

      const startTimeField = document.getElementById(`schedule-startTime-${index}`);
      const endTimeField = document.getElementById(`schedule-endTime-${index}`);

      // Convert start and end times to minutes since midnight
      const startTimeMinutes = timeStringToMinutes(startTimeField.value);
      const endTimeMinutes = timeStringToMinutes(endTimeField.value);

      // Check if end time is after start time
      if (endTimeMinutes <= startTimeMinutes) {
        alert(chrome.i18n.getMessage("endTimeAfterStartTimeError"));
        return; // Don't proceed with saving
      }

      // Create a combined list of schedules including the temporary state
      const combinedSchedules = schedules.map((schedule, idx) => 
        idx === index ? { ...schedule, ...scheduleState.tempState } : schedule
      );

      if (doSchedulesOverlap(combinedSchedules)) {
        console.log("Schedules cannot overlap.");
        alert(chrome.i18n.getMessage("schedulesOverlapError"));
        return; // Prevent saving
      }

      if (!hasMinimumUnlockedTime(combinedSchedules)) {
        console.log("Each day must have at least 1 hour of unlocked time.");
        alert(chrome.i18n.getMessage("minimumUnlockedTimeError"));
        return; // Prevent saving
      }


      // Check if the current schedule is set to active and has days selected
      const isCurrentScheduleActiveAndSetForWeek = tempSchedule.isActive && tempSchedule.days.length > 0;

      // Determine if any schedule is currently active
      const isAnyScheduleActive = isCurrentTimeInAnySchedule(schedules);

      // Apply the strictness check only if the current schedule is active and has days selected
      if (isCurrentScheduleActiveAndSetForWeek && isAnyScheduleActive && !isScheduleMoreStrict(originalSchedule, tempSchedule)) {
        console.log('Cannot relax the schedule constraints.');
        alert(chrome.i18n.getMessage("cannotRelaxConstraints"));
        return; // Prevent saving
      }

      // Update the schedule in storage with the temporary state
      schedules[index] = { ...schedules[index], ...scheduleState.tempState };
      chrome.storage.sync.set({ schedules }, () => {

        updateAddWhitelistButtonState();
        const scheduleStates = schedules.map((schedule, idx) => new ScheduleState(idx, schedule));
        updateSchedulesUI(schedules, scheduleStates);
        scheduleState.toggleEditing(); // Toggle off editing mode
        toggleFieldEditability(index, false);
        checkScheduleStatus();
        console.log('Schedules saved to storage:', schedules);

        // Fetch and update the whitelist UI
        chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
          updateWhitelistUI(whitelistedSites);
        });

        // Fetch and update the groups UI
        chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
          updateGroupsUI(websiteGroups);
        });

        updateButtonStates();
    });
    }
    console.log('Fetched schedules for saving:', schedules);
  });
}

function updateAddWhitelistButtonState() {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
      const isLocked = isCurrentTimeInAnySchedule(schedules);
      const addWhitelistButton = document.getElementById('addWhitelistButton');
      addWhitelistButton.disabled = isLocked;
  });
}

function isScheduleMoreStrict(original, temp) {
  // Log current day and time
  const now = new Date();
  console.log(`Current day: ${now.toLocaleDateString()}, Time: ${now.toLocaleTimeString()}`);

  // Check for day of week relaxation
  if (!original.days.every(day => temp.days.includes(day))) {
    console.log(`Original days: ${original.days}, Temp days: ${temp.days}`);
    return false;
  }

  // Check for time relaxation
  if (isTimeLater(original.startTime, temp.startTime) ||
      isTimeEarlier(original.endTime, temp.endTime)) {
    console.log(`Original start time: ${original.startTime}, Temp start time: ${temp.startTime}`);
    console.log(`Original end time: ${original.endTime}, Temp end time: ${temp.endTime}`);
    return false;
  }

  // Check for active to inactive
  if (original.isActive && !temp.isActive) {
    console.log(`Original active state: ${original.isActive}, Temp active state: ${temp.isActive}`);
    return false;
  }

  return true;
}


function isTimeLater(time1, time2) {
  return timeStringToMinutes(time1) < timeStringToMinutes(time2);
}

function isTimeEarlier(time1, time2) {
  return timeStringToMinutes(time1) > timeStringToMinutes(time2);
}

function createDayButtons(selectedDays, scheduleState) {
  const index = scheduleState.index;
  const dayButtonsContainer = document.createElement('div');
  dayButtonsContainer.id = `dayButtons-${index}`;

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  daysOfWeek.forEach((day, dayIndex) => {
    const dayButton = document.createElement('button');
    dayButton.id = `dayButton-${index}-${dayIndex}`;
    dayButton.textContent = chrome.i18n.getMessage(day);
    dayButton.classList.add('day-button');
    dayButton.setAttribute('data-day', day);

    if (selectedDays.includes(day)) {
      dayButton.classList.add('selected');
    }

    dayButton.addEventListener('click', function() {
      if (scheduleState.isEditing) {
        // Asynchronously fetch schedules to check current schedule status
        chrome.storage.sync.get('schedules', ({ schedules }) => {
          const isScheduleActive = scheduleState.tempState.isActive;
          const isButtonSelected = this.classList.contains('selected');
          const isAnyScheduleActive = isCurrentTimeInAnySchedule(schedules);

          // Check if the schedule is active, the button is already selected, and any schedule is currently active
          if (isScheduleActive && isButtonSelected && isAnyScheduleActive) {
            alert(chrome.i18n.getMessage("cannotDeselectDaysError"));
          } else {
            this.classList.toggle('selected');
            console.log(`Day button [${this.getAttribute('data-day')}] clicked. Selected:`, this.classList.contains('selected'));

            // Update the tempState using data-day attribute
            const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
                                            .map(selectedButton => selectedButton.getAttribute('data-day'));
            scheduleState.updateTempState({ days: updatedSelectedDays });
            console.log(`Button classList: ${this.classList}, isSelected: ${this.classList.contains('selected')}`);
          }
        });
      }
    });

    dayButtonsContainer.appendChild(dayButton);
  });

  return dayButtonsContainer;
}


function createActiveToggleButton(isActive, scheduleState) {
  // console.log('Creating active toggle for schedule', scheduleState.index);
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  const activeButton = document.createElement('button');
  activeButton.textContent = isActive ? chrome.i18n.getMessage("activeButtonText") : chrome.i18n.getMessage("inactiveButtonText");
  activeButton.classList.add('active-toggle');
  if (isActive) {
    activeButton.classList.add('active');
  }
  activeButton.id = `active-toggle-${scheduleState.index}`;

  activeButton.addEventListener('click', function() {
    console.log('Active toggle clicked for schedule', scheduleState.index);
    if (scheduleState.isEditing) {
      chrome.storage.sync.get('schedules', ({ schedules }) => {
        const isAnyScheduleActive = isCurrentTimeInAnySchedule(schedules);
        const isThisScheduleSetForActivation = scheduleState.tempState.isActive && scheduleState.tempState.days.length > 0;

        if (!isAnyScheduleActive || !isThisScheduleSetForActivation) {
          this.classList.toggle('active');
          const newIsActive = this.classList.contains('active');
          this.textContent = newIsActive ? chrome.i18n.getMessage("activeLabel") : chrome.i18n.getMessage("inactiveLabel");

          // Update the temporary state in scheduleState
          scheduleState.updateTempState({ isActive: newIsActive });
        } else {
          console.log('Cannot toggle active state under current conditions.');
          alert(chrome.i18n.getMessage("cannotToggleActiveState"));
        }
      });
    }
    console.log(`is editing for schedule ${scheduleState.index}: ${scheduleState.isEditing}`);
  });

  return activeButton;
}


function createButton(text, onClick, className, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = chrome.i18n.getMessage(text);
  button.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  button.className = className;

  if (typeof index === 'number') {
    button.id = `${className}-${index}`;
    // console.log(`Created button with ID: ${button.id}`);
  } else {
    console.log(`Index is not a number, it's: ${index}`);
  }

  return button;
}


// Function to create a save button
export function createSaveButton(index) {
  const saveButton = document.createElement('button');
  saveButton.type = 'button'; // Explicitly set the button type
  saveButton.textContent = 'Save';
  saveButton.classList.add('save-button');
  saveButton.addEventListener('click', function() {
    event.preventDefault(); // Prevent the default action
    saveSchedule(index);
  });

  return saveButton;
}

export function updateSchedulesUI(schedules, scheduleStates) {
  // console.log('updateSchedulesUI called with schedules:', schedules, 'and scheduleStates:', scheduleStates);
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = ''; // Clear the list

  schedules.forEach((schedule, index) => {
    // console.log('Processing schedule at index', index);
    const scheduleState = scheduleStates[index]; // Get the corresponding ScheduleState instance
    if (!scheduleState) {
      console.error(`No schedule state found for index ${index}`);
      return; // Skip this iteration
    }
    const li = document.createElement('li');
    li.className = 'schedule-item';

    // Schedule Name
    createScheduleField(li, 'scheduleNameLabel', schedule.name, `schedule-name-${index}`, true);

    // Days buttons
    const daysContainer = createDayButtons(schedule.days, scheduleState); // Pass scheduleState
    li.appendChild(daysContainer);

    // Start Time
    createScheduleField(li, 'startTimeLabel', schedule.startTime, `schedule-startTime-${index}`, true);

    // End Time
    createScheduleField(li, 'endTimeLabel', schedule.endTime, `schedule-endTime-${index}`, true);

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

    // const isActive = isCurrentTimeInAnySchedule([schedule]);
    const deleteButton = createDeleteButton(index, schedules[index], schedules);
    controlsContainer.appendChild(deleteButton);

    li.appendChild(controlsContainer);

    scheduleList.appendChild(li);
  });
}

// Function to create a delete button
function createDeleteButton(index, schedule, allSchedules) {
  const deleteButton = document.createElement('button');
  deleteButton.textContent = chrome.i18n.getMessage("deleteButtonLabel");
  deleteButton.classList.add('delete-button');

  const anyScheduleActive = isCurrentTimeInAnySchedule(allSchedules);
  const isThisScheduleSetForActivation = schedule.isActive && schedule.days.length > 0;

  if (anyScheduleActive && isThisScheduleSetForActivation) {
      deleteButton.disabled = true;
  } else {
      deleteButton.addEventListener('click', function() {
          removeSchedule(index);
      });
  }

  return deleteButton;
}



// Refreshes the UI for a single schedule item with temporary state
export function refreshScheduleItemUIWithTempState(index, tempSchedule) {
  console.log('Refreshing UI for schedule', index, 'with temp state:', tempSchedule);
  console.log('Refreshing UI with tempSchedule:', tempSchedule);

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
    const isSelected = tempSchedule.days.includes(button.getAttribute('data-day'));
    console.log('Updating day button:', button.id, 'Selected:', isSelected);
    button.classList.toggle('selected', isSelected);
  });

  const activeToggle = document.getElementById(`active-toggle-${index}`);
  if (activeToggle) {
    const isActive = tempSchedule.isActive;
    console.log('Updating active toggle:', activeToggle.id, 'Active:', isActive);
    activeToggle.textContent = isActive ? chrome.i18n.getMessage("activeLabel") : chrome.i18n.getMessage("inactiveLabel");
    activeToggle.classList.toggle('active', isActive);
  }
}

