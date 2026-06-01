// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

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
import {
  createDefaultSchedule,
  formatScheduleTime,
  getNextUnnamedScheduleName,
  normalizeScheduleTimeInput
} from './shared/scheduleForm.js';
import { saveSchedulesWithPriority } from './shared/criticalScheduleStorage.js';
import { debugLog } from './shared/logger.js';
export {
  doSchedulesOverlap,
  hasMinimumUnlockedTime
} from './shared/scheduleRules.js';

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
    updateSchedulesUI(schedules, scheduleStates);
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
  bindScheduleFieldListeners(scheduleState, scheduleNameField, startTimeField, endTimeField);

  const editButtonId = `edit-button-schedule-${index}`;
  const saveButtonId = `save-button-schedule-${index}`;

  const editButton = document.getElementById(editButtonId);
  const saveButton = document.getElementById(saveButtonId);

  if (!editButton || !saveButton) {
    console.error(`Buttons not found for schedule index ${index}`);
    return;
  }

  editButton.textContent = isCurrentlyEditing ? 
    chrome.i18n.getMessage("cancelLabel") : chrome.i18n.getMessage("editButtonLabel");
  saveButton.disabled = !isCurrentlyEditing;

  [scheduleNameField, startTimeField, endTimeField].forEach(field => {
    if (field) field.readOnly = !isCurrentlyEditing;
  });

  if (!isCurrentlyEditing && editButton.textContent === chrome.i18n.getMessage("editButtonLabel")) {
    chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      updateSchedulesUI(schedules, scheduleStates);
    });
  }
  debugLog(`Toggled edit mode for schedule ${index}: ${isCurrentlyEditing}`);
}

function bindScheduleFieldListeners(scheduleState, scheduleNameField, startTimeField, endTimeField) {
  if (scheduleNameField && !scheduleNameField.dataset.scheduleChangeBound) {
    scheduleNameField.addEventListener('change', function() {
      scheduleState.updateTempState({ name: this.value });
    });
    scheduleNameField.dataset.scheduleChangeBound = 'true';
  }

  [startTimeField, endTimeField].forEach(field => {
    if (!field || field.dataset.scheduleTimeBound) {
      return;
    }

    field.addEventListener('change', function() {
      const formattedTime = formatScheduleTime(this.value);
      const fieldName = this.id.includes('startTime') ? 'startTime' : 'endTime';
      scheduleState.updateTempState({ [fieldName]: formattedTime });
    });

    field.addEventListener('input', function(event) {
      handleTimeInput(this, event);
    });

    field.dataset.scheduleTimeBound = 'true';
  });
}

function handleTimeInput(inputElement, event) {
  const previousValue = inputElement.dataset.previousValue || '';
  const value = normalizeScheduleTimeInput(inputElement.value, previousValue, event.data);

  inputElement.value = value;
  inputElement.dataset.previousValue = value;
}

export function removeSchedule(index) {
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    if (isCurrentTimeInAnySchedule([schedules[index]])) {
      alert(chrome.i18n.getMessage("cannotDeleteActiveSchedule"));
      return;
    }

    schedules.splice(index, 1);
    saveSchedulesWithPriority(schedules).then(() => {
      // After updating the schedules in storage, recreate the scheduleStates
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      updateSchedulesUI(schedules, scheduleStates);
      debugLog('Schedule removed', index);
    }).catch(error => {
      console.error('Failed to remove schedule:', error);
      alert('Could not save the schedule change.');
    });
  });
}

export function updateSchedule(scheduleState) {
  if (!scheduleState) {
    console.error('scheduleState is not defined');
    return;
  }

  const index = scheduleState.index;

  chrome.storage.sync.get('schedules', ({ schedules }) => {
    const nameField = document.getElementById(`schedule-name-${index}`);
    const selectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
                              .map(button => button.getAttribute('data-day'));
    const startTimeField = document.getElementById(`schedule-startTime-${index}`);
    const endTimeField = document.getElementById(`schedule-endTime-${index}`);
    const activeToggle = document.getElementById(`active-toggle-${index}`); // Ensure activeToggle is defined here


    let isActive = false;
    if (activeToggle && activeToggle.classList.contains('active')) {
      isActive = true;
    }

    scheduleState.updateTempState({
      name: nameField.value,
      days: selectedDays,
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      isActive: isActive
    });
    refreshScheduleItemUIWithTempState(index, scheduleState.tempState);
  });
}


function addSchedule() {
  let scheduleName = document.getElementById('scheduleNameInput').value.trim();

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
    if (!scheduleName) {
      scheduleName = getNextUnnamedScheduleName(schedules, chrome.i18n.getMessage("unnamedSchedulePrefix"));
    }

    if (schedules.some(schedule => schedule.name.toLowerCase() === scheduleName.toLowerCase())) {
      alert(chrome.i18n.getMessage("scheduleNameExists"));
      return;
    }

    const newSchedule = createDefaultSchedule(scheduleName);

    schedules.push(newSchedule);
    debugLog('Adding new schedule to storage:', newSchedule);

    const newScheduleState = new ScheduleState(schedules.length - 1, newSchedule);

    // Save the updated schedules to Chrome storage
    saveSchedulesWithPriority(schedules).then(() => {
      chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
        const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
        updateSchedulesUI(schedules, scheduleStates);
        document.getElementById('scheduleNameInput').value = '';
      });
    }).catch(error => {
      console.error('Failed to add schedule:', error);
      alert('Could not save the schedule.');
    });
  });
}

