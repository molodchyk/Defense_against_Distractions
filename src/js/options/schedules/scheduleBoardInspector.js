// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { formatScheduleTime } from '../../shared/schedules/scheduleForm.js';
import { SCHEDULE_GRID_DAYS } from '../../shared/schedules/scheduleGrid.js';
import {
  MAX_WEEK_INTERVAL,
  WEEKDAY_DAYS,
  WEEKEND_DAYS,
  getTodayDateString,
  hasValidScheduleTimeRange,
  isScheduleDraftComplete,
  normalizeDateInput,
  normalizeWeekInterval
} from './scheduleBoardModel.js';

export function createScheduleInspector({
  selectedSchedule,
  isCreateMode,
  showScheduleNames,
  readOnly,
  message,
  onDraftChange,
  onSave,
  onCancel,
  onDelete,
  canDeleteSchedule,
  canDeselectDay
}) {
  const getMessage = (key, fallback, substitutions) => (
    message ? message(key, fallback, substitutions) : fallback
  );

  const inspector = document.createElement('section');
  inspector.className = 'schedule-inspector';

  if (!selectedSchedule) {
    inspector.appendChild(createEmptyTitle(isCreateMode, getMessage));
    inspector.appendChild(createEmptyMessage(isCreateMode, getMessage));
    return inspector;
  }

  inspector.appendChild(createHeader(getMessage));

  if (showScheduleNames) {
    inspector.appendChild(createTextField({
      labelKey: 'scheduleNameLabel',
      fallback: 'Schedule Name',
      value: selectedSchedule.name,
      readOnly,
      getMessage,
      onChange: value => onDraftChange?.({
        ...selectedSchedule,
        name: value
      })
    }));
  }

  inspector.appendChild(createTimeFields({
    schedule: selectedSchedule,
    readOnly,
    getMessage,
    onDraftChange
  }));
  inspector.appendChild(createRecurrenceFields({
    schedule: selectedSchedule,
    readOnly,
    getMessage,
    onDraftChange
  }));
  inspector.appendChild(createDayPicker({
    schedule: selectedSchedule,
    readOnly,
    getMessage,
    onDraftChange,
    canDeselectDay
  }));

  const validationMessage = getScheduleValidationMessage(selectedSchedule, getMessage);
  if (validationMessage) {
    const warning = document.createElement('p');
    warning.className = 'schedule-validation-message';
    warning.textContent = validationMessage;
    inspector.appendChild(warning);
  }

  inspector.appendChild(createScheduleActions({
    schedule: selectedSchedule,
    readOnly,
    getMessage,
    onSave,
    onCancel,
    onDelete,
    canDeleteSchedule
  }));

  return inspector;
}

function createEmptyTitle(isCreateMode, getMessage) {
  const title = document.createElement('h3');
  title.textContent = isCreateMode
    ? getMessage('scheduleCreateTitle', 'New time block')
    : getMessage('scheduleSelectedTitle', 'Selected schedule');
  return title;
}

function createEmptyMessage(isCreateMode, getMessage) {
  const empty = document.createElement('p');
  empty.className = 'schedule-inspector-empty';
  empty.textContent = isCreateMode
    ? getMessage('scheduleCreateInstructionMessage', 'Click and drag on the weekly grid to draft the new time block. It is saved only after you press Save.')
    : getMessage(
      'scheduleEmptySelectionMessage',
      'Click and drag in the weekly grid to create a time block, or select an existing block to edit it.'
    );
  return empty;
}

function createHeader(getMessage) {
  const header = document.createElement('div');
  header.className = 'schedule-inspector-header';

  const title = document.createElement('h3');
  title.textContent = getMessage('scheduleSelectedTitle', 'Selected schedule');
  header.appendChild(title);

  return header;
}

function createTextField({ labelKey, fallback, value, readOnly, getMessage, onChange }) {
  const field = document.createElement('label');
  field.className = 'schedule-inspector-field';

  const label = document.createElement('span');
  label.textContent = getMessage(labelKey, fallback);

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.disabled = readOnly;
  input.addEventListener('change', () => onChange(input.value.trim()));

  field.appendChild(label);
  field.appendChild(input);
  return field;
}

function createTimeFields({ schedule, readOnly, getMessage, onDraftChange }) {
  const grid = document.createElement('div');
  grid.className = 'schedule-time-fields';

  grid.appendChild(createTimeField({
    labelKey: 'startTimeLabel',
    fallback: 'Start Time',
    value: schedule.startTime,
    readOnly,
    getMessage,
    onChange: value => onDraftChange?.({
      ...schedule,
      startTime: value
    })
  }));

  grid.appendChild(createTimeField({
    labelKey: 'endTimeLabel',
    fallback: 'End Time',
    value: schedule.endTime,
    readOnly,
    getMessage,
    onChange: value => onDraftChange?.({
      ...schedule,
      endTime: value
    })
  }));

  return grid;
}

function createRecurrenceFields({ schedule, readOnly, getMessage, onDraftChange }) {
  const grid = document.createElement('div');
  grid.className = 'schedule-time-fields schedule-recurrence-fields';

  const intervalField = document.createElement('label');
  intervalField.className = 'schedule-inspector-field';

  const intervalLabel = document.createElement('span');
  intervalLabel.textContent = getMessage('scheduleWeekIntervalLabel', 'Repeat every N weeks');

  const intervalInput = document.createElement('input');
  intervalInput.type = 'number';
  intervalInput.min = '1';
  intervalInput.max = String(MAX_WEEK_INTERVAL);
  intervalInput.step = '1';
  intervalInput.value = String(normalizeWeekInterval(schedule.weekInterval));
  intervalInput.disabled = readOnly;
  intervalInput.addEventListener('change', () => {
    onDraftChange?.({
      ...schedule,
      weekInterval: normalizeWeekInterval(intervalInput.value),
      anchorDate: schedule.anchorDate || getTodayDateString()
    });
  });

  intervalField.appendChild(intervalLabel);
  intervalField.appendChild(intervalInput);
  grid.appendChild(intervalField);

  const anchorField = document.createElement('label');
  anchorField.className = 'schedule-inspector-field';

  const anchorLabel = document.createElement('span');
  anchorLabel.textContent = getMessage('scheduleAnchorWeekLabel', 'Starting week');

  const anchorInput = document.createElement('input');
  anchorInput.type = 'date';
  anchorInput.value = normalizeDateInput(schedule.anchorDate) || getTodayDateString();
  anchorInput.disabled = readOnly;
  anchorInput.addEventListener('change', () => {
    onDraftChange?.({
      ...schedule,
      anchorDate: normalizeDateInput(anchorInput.value) || getTodayDateString()
    });
  });

  anchorField.appendChild(anchorLabel);
  anchorField.appendChild(anchorInput);
  grid.appendChild(anchorField);

  return grid;
}

function createTimeField({ labelKey, fallback, value, readOnly, getMessage, onChange }) {
  const field = document.createElement('label');
  field.className = 'schedule-inspector-field';

  const label = document.createElement('span');
  label.textContent = getMessage(labelKey, fallback);

  const input = document.createElement('input');
  input.type = 'time';
  input.value = formatScheduleTime(value);
  input.disabled = readOnly;
  input.addEventListener('change', () => onChange(formatScheduleTime(input.value)));

  field.appendChild(label);
  field.appendChild(input);
  return field;
}

function createDayPicker({ schedule, readOnly, getMessage, onDraftChange, canDeselectDay }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'schedule-day-picker';

  const label = document.createElement('span');
  label.className = 'schedule-day-picker-label';
  label.textContent = getMessage('scheduleDaysLabel', 'Days');
  wrapper.appendChild(label);

  const dayGrid = document.createElement('div');
  dayGrid.className = 'schedule-day-picker-grid';

  SCHEDULE_GRID_DAYS.forEach(day => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `day-button${schedule.days.includes(day) ? ' selected' : ''}`;
    button.textContent = getMessage(day, day);
    button.disabled = readOnly;
    button.addEventListener('click', () => toggleDraftDay({
      day,
      schedule,
      readOnly,
      onDraftChange,
      canDeselectDay
    }));
    dayGrid.appendChild(button);
  });

  wrapper.appendChild(dayGrid);

  const presets = document.createElement('div');
  presets.className = 'schedule-day-presets';
  presets.appendChild(createPresetButton({
    label: getMessage('scheduleWorkdaysPreset', 'Workdays'),
    days: WEEKDAY_DAYS,
    schedule,
    readOnly,
    onDraftChange
  }));
  presets.appendChild(createPresetButton({
    label: getMessage('scheduleWeekendPreset', 'Weekend'),
    days: WEEKEND_DAYS,
    schedule,
    readOnly,
    onDraftChange
  }));
  presets.appendChild(createPresetButton({
    label: getMessage('scheduleEveryDayPreset', 'Every day'),
    days: SCHEDULE_GRID_DAYS,
    schedule,
    readOnly,
    onDraftChange
  }));
  presets.appendChild(createPresetButton({
    label: getMessage('scheduleClearPreset', 'Clear'),
    days: [],
    schedule,
    readOnly,
    onDraftChange
  }));
  wrapper.appendChild(presets);

  return wrapper;
}

function createPresetButton({ label, days, schedule, readOnly, onDraftChange }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'schedule-preset-button';
  button.textContent = label;
  button.disabled = readOnly;
  button.addEventListener('click', () => {
    onDraftChange?.({
      ...schedule,
      days: SCHEDULE_GRID_DAYS.filter(day => days.includes(day))
    });
  });
  return button;
}

function toggleDraftDay({ day, schedule, readOnly, onDraftChange, canDeselectDay }) {
  if (readOnly) {
    return;
  }

  const isSelected = schedule.days.includes(day);
  if (isSelected && canDeselectDay && !canDeselectDay(day, schedule)) {
    return;
  }

  onDraftChange?.({
    ...schedule,
    days: isSelected
      ? schedule.days.filter(selectedDay => selectedDay !== day)
      : [...schedule.days, day]
  });
}

function createScheduleActions({
  schedule,
  readOnly,
  getMessage,
  onSave,
  onCancel,
  onDelete,
  canDeleteSchedule
}) {
  const actions = document.createElement('div');
  actions.className = 'schedule-actions';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-button schedule-delete-button';
  appendTrashIcon(deleteButton);
  const deleteText = document.createElement('span');
  deleteText.textContent = getMessage('deleteButtonLabel', 'Delete');
  deleteButton.appendChild(deleteText);
  deleteButton.disabled = readOnly || (canDeleteSchedule ? !canDeleteSchedule(schedule) : false);
  deleteButton.addEventListener('click', () => onDelete?.());

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'edit-button-schedule';
  cancelButton.textContent = getMessage('cancelLabel', 'Cancel');
  cancelButton.disabled = readOnly;
  cancelButton.addEventListener('click', () => onCancel?.());

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'save-button-schedule';
  saveButton.textContent = getMessage('saveButtonLabel', 'Save');
  saveButton.disabled = readOnly || !isScheduleDraftComplete(schedule);
  saveButton.addEventListener('click', () => onSave?.());

  actions.appendChild(deleteButton);
  actions.appendChild(cancelButton);
  actions.appendChild(saveButton);
  return actions;
}

function appendTrashIcon(button) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 6h18M8 6V4h8v2m-1 5v6M9 11v6m-1 4h8a2 2 0 0 0 2-2V6H6v13a2 2 0 0 0 2 2Z');
  svg.appendChild(path);
  button.appendChild(svg);
}

function getScheduleValidationMessage(schedule, getMessage) {
  if (!Array.isArray(schedule.days) || schedule.days.length === 0) {
    return getMessage('scheduleNeedsDayError', 'Select at least one day before saving this schedule.');
  }

  if (!hasValidScheduleTimeRange(schedule)) {
    return getMessage('endTimeAfterStartTimeError', 'End time must be after start time.');
  }

  return '';
}
