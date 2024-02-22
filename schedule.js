/*
 * Defense Against Distractions Extension
 *
 * file: schedule.js
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
                  .map(selectedButton => selectedButton.getAttribute('data-day'));
        scheduleState.updateTempState({ days: updatedSelectedDays });
        console.log('Updated selected days array:', updatedSelectedDays);
      }
    });
  });

  const activeToggle = document.querySelector(`#active-toggle-${index}`);
  if (activeToggle) {
    activeToggle.removeEventListener('click', activeToggleClickHandler);

    function activeToggleClickHandler() {
      console.log(`Before click: Active toggle classList for schedule ${index}:`, activeToggle.classList.toString());
      this.classList.toggle('active');
      const isActive = this.classList.contains('active');
      scheduleState.updateTempState({ isActive: isActive });
      console.log('After click: Active state updated:', isActive, 'classList:', activeToggle.classList.toString());
    }

    activeToggle.addEventListener('click', activeToggleClickHandler);
  }

  const editButtonId = `edit-button-schedule-${index}`;
  const saveButtonId = `save-button-schedule-${index}`;

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
        selectedDays.push(button.getAttribute('data-day'));
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

  editButton.textContent = isCurrentlyEditing ? 
    chrome.i18n.getMessage("cancelLabel") : chrome.i18n.getMessage("editButtonLabel");
  console.log('isCurrentlyEditing:', isCurrentlyEditing);
  saveButton.disabled = !isCurrentlyEditing;

  [scheduleNameField, startTimeField, endTimeField].forEach(field => {
    if (field) field.readOnly = !isCurrentlyEditing;
  });

  dayButtons.forEach(button => {
    button.onclick = isCurrentlyEditing ? () => {
      button.classList.toggle('selected');
      const updatedSelectedDays = Array.from(document.querySelectorAll(`#dayButtons-${index} .day-button.selected`))
      .map(selectedButton => selectedButton.getAttribute('data-day')); // Use data-day attribute
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

  if (!isCurrentlyEditing && editButton.textContent === chrome.i18n.getMessage("editButtonLabel")) {
    console.log('Exiting edit mode for schedule', index);
    chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      console.log('Calling updateSchedulesUI before exiting edit mode', scheduleStates);
      updateSchedulesUI(schedules, scheduleStates);
      console.log('updateSchedulesUI called');
    });
    console.log(`Edit canceled, reverted to original state for schedule ${index}`);
  }
  console.log(`Toggled edit mode for schedule ${index}: ${isCurrentlyEditing}`);
}

function handleTimeInput(inputElement, event) {
  const previousValue = inputElement.dataset.previousValue || '';
  const keyValue = event.data || 'backspace';

  console.log(`Previous state: ${previousValue}, Key pressed: ${keyValue}`);

  let value = inputElement.value;

  value = value.replace(/[^0-9:]/g, '');

  let parts = value.split(':');
  let hours = parts[0];
  let minutes = parts[1];

  if (keyValue === ':') {
      if (hours.length === 1 || hours.length === 2) {
          value = `${hours}:`;
      }
  } else if (keyValue === 'backspace') {
      if (previousValue.endsWith(':')) {
          hours = hours.substring(0, hours.length - 1);
          value = hours;
      } else {
          value = value.substring(0, value.length - 1);
      }
  }

  parts = value.split(':');
  hours = parts[0];
  minutes = parts[1];

  hours = Math.min(Math.max(parseInt(hours, 10) || 0, 0), 23);
  minutes = minutes ? Math.min(Math.max(parseInt(minutes, 10), 0), 59) : '';

  if (minutes !== '') {
      value = `${hours}:${minutes}`;
  } else if (value.endsWith(':') || hours >= 10) {
      value = `${hours}:`;
  } else {
      value = `${hours}`;
  }

  inputElement.value = value;
  console.log(`New state: ${value}`);

  inputElement.dataset.previousValue = value;
}

function formatTime(timeStr) {
  if (!timeStr.includes(':')) {
    return timeStr.padStart(2, '0') + ":00";
  }
  let [hours, minutes] = timeStr.split(':').map(str => str.padStart(2, '0'));
  return `${hours}:${minutes}`;
}

export function removeSchedule(index) {
  console.log('removeSchedule called for index:', index);
  chrome.storage.sync.get('schedules', ({ schedules }) => {
    if (isCurrentTimeInAnySchedule([schedules[index]])) {
      alert(chrome.i18n.getMessage("cannotDeleteActiveSchedule"));
      return;
    }

    schedules.splice(index, 1);
    chrome.storage.sync.set({ schedules }, () => {
      // After updating the schedules in storage, recreate the scheduleStates
      const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
      updateSchedulesUI(schedules, scheduleStates);
      console.log('Schedules after removal:', schedules);
    });
  });
}

export function updateSchedule(scheduleState) {
  console.log('updateSchedule called with scheduleState:', scheduleState);
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

    console.log('Updating tempState of schedule', index);
    scheduleState.updateTempState({
      name: nameField.value,
      days: selectedDays,
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      isActive: isActive
    });
    console.log('updateSchedule: ', scheduleState);
    console.log('Updating schedule with state:', {
      name: nameField.value,
      days: selectedDays,
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      isActive: isActive
    });
    refreshScheduleItemUIWithTempState(index, scheduleState.tempState);
    console.log('Fetched schedules for update:', schedules);
  });
}


function addSchedule() {
  console.log('addSchedule called');
  let scheduleName = document.getElementById('scheduleNameInput').value.trim();

  chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
    if (!scheduleName) {
      const existingNames = new Set(schedules.map(s => s.name.toLowerCase()));
      let scheduleNumber = 1;
      while (existingNames.has(chrome.i18n.getMessage("unnamedSchedulePrefix").toLowerCase() + scheduleNumber)) {
        scheduleNumber++;
      }
      scheduleName = chrome.i18n.getMessage("unnamedSchedulePrefix") + scheduleNumber;
    }

    if (schedules.some(schedule => schedule.name.toLowerCase() === scheduleName.toLowerCase())) {
      alert(chrome.i18n.getMessage("scheduleNameExists"));
      return;
    }

    const newSchedule = {
      name: scheduleName,
      days: [],
      startTime: '00:00',
      endTime: '23:59',
      isActive: false
    };

    schedules.push(newSchedule);
    console.log('Adding new schedule to storage:', newSchedule);

    const newScheduleState = new ScheduleState(schedules.length - 1, newSchedule);

    // Save the updated schedules to Chrome storage
    chrome.storage.sync.set({ schedules }, () => {
      chrome.storage.sync.get('schedules', ({ schedules = [] }) => {
        const scheduleStates = schedules.map((schedule, index) => new ScheduleState(index, schedule));
        updateSchedulesUI(schedules, scheduleStates);
        document.getElementById('scheduleNameInput').value = '';
      });
    });
  });
}

export function hasMinimumUnlockedTime(schedules, minimumUnlockedTime = 60) {
  const minutesInDay = 1440;

  function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  const dailySchedules = {};
  schedules.forEach(schedule => {
    if (schedule.isActive) {
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

  for (const day in dailySchedules) {
    let totalLockedTime = 0;
    dailySchedules[day].forEach(timeBlock => {
      totalLockedTime += timeBlock.end - timeBlock.start;
    });

    if (minutesInDay - totalLockedTime < minimumUnlockedTime) {
      return false;
    }
  }
  return true;
}


export function doSchedulesOverlap(schedules) {
  function timeToMinutes(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
  }

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

  function rangesOverlap(range1, range2) {
      return range1.start < range2.end && range1.end > range2.start;
  }

  for (const day in dayTimeRanges) {
      const ranges = dayTimeRanges[day];
      for (let i = 0; i < ranges.length; i++) {
          for (let j = i + 1; j < ranges.length; j++) {
              if (rangesOverlap(ranges[i], ranges[j])) {
                  return true;
              }
          }
      }
  }

  return false;
}
