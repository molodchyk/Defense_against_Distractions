// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  toggleScheduleEdit,
  removeSchedule,
  toggleFieldEditability
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
import { timeStringToMinutes } from './shared/scheduleTime.js';
import {
  doSchedulesOverlap,
  hasMinimumUnlockedTime,
  isScheduleMoreStrict
} from './shared/scheduleRules.js';
import { saveSchedulesWithPriority } from './shared/criticalScheduleStorage.js';
import { updateButtonStates } from './passwordManager.js';
import { createLocalizedButton } from './options/dom.js';
import { debugLog } from './shared/logger.js';



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

function saveSchedule(scheduleState) {
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
        debugLog("Schedules cannot overlap.");
        alert(chrome.i18n.getMessage("schedulesOverlapError"));
        return; // Prevent saving
      }

      if (!hasMinimumUnlockedTime(combinedSchedules)) {
        debugLog("Each day must have at least 1 hour of unlocked time.");
        alert(chrome.i18n.getMessage("minimumUnlockedTimeError"));
        return; // Prevent saving
      }


      // Check if the current schedule is set to active and has days selected
      const isCurrentScheduleActiveAndSetForWeek = tempSchedule.isActive && tempSchedule.days.length > 0;

      // Determine if any schedule is currently active
      const isAnyScheduleActive = isCurrentTimeInAnySchedule(schedules);

      // Apply the strictness check only if the current schedule is active and has days selected
      if (isCurrentScheduleActiveAndSetForWeek && isAnyScheduleActive && !isScheduleMoreStrict(originalSchedule, tempSchedule)) {
        debugLog('Cannot relax the schedule constraints.');
        alert(chrome.i18n.getMessage("cannotRelaxConstraints"));
        return; // Prevent saving
      }

      // Update the schedule in storage with the temporary state
      schedules[index] = { ...schedules[index], ...scheduleState.tempState };
      saveSchedulesWithPriority(schedules).then(() => {

        updateAddWhitelistButtonState();
        const scheduleStates = schedules.map((schedule, idx) => new ScheduleState(idx, schedule));
        updateSchedulesUI(schedules, scheduleStates);
        scheduleState.toggleEditing(); // Toggle off editing mode
        toggleFieldEditability(index, false);
        checkScheduleStatus();
        debugLog('Schedules saved to storage:', schedules);

        // Fetch and update the whitelist UI
        chrome.storage.sync.get('whitelistedSites', ({ whitelistedSites = [] }) => {
          updateWhitelistUI(whitelistedSites);
        });

        // Fetch and update the groups UI
        chrome.storage.sync.get('websiteGroups', ({ websiteGroups = [] }) => {
          updateGroupsUI(websiteGroups);
        });

        updateButtonStates();
      }).catch(error => {
        console.error('Failed to save schedules:', error);
        alert('Could not save the schedule.');
      });
    }
  });
}

function updateAddWhitelistButtonState() {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
      const isLocked = isCurrentTimeInAnySchedule(schedules);
      const addWhitelistButton = document.getElementById('addWhitelistButton');
      addWhitelistButton.disabled = isLocked;
  });
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

            // Update the tempState using data-day attribute
            const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
                                            .map(selectedButton => selectedButton.getAttribute('data-day'));
            scheduleState.updateTempState({ days: updatedSelectedDays });
          }
        });
      }
    });

    dayButtonsContainer.appendChild(dayButton);
  });

  return dayButtonsContainer;
}


function createActiveToggleButton(isActive, scheduleState) {
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
          debugLog('Cannot toggle active state under current conditions.');
          alert(chrome.i18n.getMessage("cannotToggleActiveState"));
        }
      });
    }
  });

  return activeButton;
}


function createButton(text, onClick, className, index) {
  if (typeof index !== 'number') {
    debugLog(`Index is not a number, it's: ${index}`);
  }

  return createLocalizedButton(text, onClick, className, {
    id: typeof index === 'number' ? `${className}-${index}` : undefined,
    stopPropagation: true
  });
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
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = ''; // Clear the list

  schedules.forEach((schedule, index) => {
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
  const scheduleNameField = document.getElementById(`schedule-name-${index}`);
  scheduleNameField.value = tempSchedule.name;

  const startTimeField = document.getElementById(`schedule-startTime-${index}`);
  startTimeField.value = tempSchedule.startTime;

  const endTimeField = document.getElementById(`schedule-endTime-${index}`);
  endTimeField.value = tempSchedule.endTime;

  const dayButtons = document.querySelectorAll(`#dayButtons-${index} .day-button`);
  dayButtons.forEach(button => {
    const isSelected = tempSchedule.days.includes(button.getAttribute('data-day'));
    button.classList.toggle('selected', isSelected);
  });

  const activeToggle = document.getElementById(`active-toggle-${index}`);
  if (activeToggle) {
    const isActive = tempSchedule.isActive;
    activeToggle.textContent = isActive ? chrome.i18n.getMessage("activeLabel") : chrome.i18n.getMessage("inactiveLabel");
    activeToggle.classList.toggle('active', isActive);
  }
}

