// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { formatScheduleTime } from '../shared/scheduleForm.js';
import {
  createScheduleRangeFromAnchor,
  getScheduleRange,
  minutesFromGridOffset,
  moveScheduleRange,
  resizeScheduleRange,
  scheduleHeightPixels,
  scheduleTopPixels,
  SCHEDULE_GRID_DAYS,
  SCHEDULE_GRID_HOUR_HEIGHT
} from '../shared/scheduleGrid.js';
import { getScheduleActivityCounts, timeStringToMinutes } from '../shared/scheduleTime.js';
import { formatScheduleActivitySummary } from '../shared/scheduleSummary.js';

const WEEKDAY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKEND_DAYS = ['Sat', 'Sun'];
const DRAG_THRESHOLD_PX = 4;
const MAX_WEEK_INTERVAL = 12;

export function cloneSchedule(schedule = {}) {
  return {
    ...schedule,
    days: Array.isArray(schedule.days) ? [...schedule.days] : []
  };
}

export function cloneSchedules(schedules = []) {
  return schedules.map(cloneSchedule);
}

export function createScheduleBoardWorkspace({
  schedules = [],
  selectedIndex = null,
  draftSchedule = null,
  message,
  onSelect,
  onDraftChange,
  onSave,
  onCancel,
  onDelete,
  onCreateFromGrid,
  canDeleteSchedule,
  canDeselectDay,
  showScheduleNames = true,
  readOnly = false
}) {
  const normalizedSchedules = cloneSchedules(schedules);
  const selectedSchedule = getSelectedSchedule(normalizedSchedules, selectedIndex, draftSchedule);
  const hasNewDraftSchedule = selectedIndex < 0 && draftSchedule;
  const isCreateMode = selectedIndex < 0 && !draftSchedule;
  let dragState = null;

  const workspace = document.createElement('div');
  workspace.className = 'schedule-workspace';
  if (isCreateMode) {
    workspace.classList.add('schedule-workspace-create-mode');
  }
  if (readOnly) {
    workspace.classList.add('schedule-workspace-readonly');
  }
  workspace.appendChild(createScheduleBoard());
  workspace.appendChild(createScheduleInspector());
  return workspace;

  function createScheduleBoard() {
    const boardPanel = document.createElement('section');
    boardPanel.className = 'schedule-board-panel';

    const header = document.createElement('div');
    header.className = 'schedule-board-header';

    const title = document.createElement('h3');
    title.textContent = getMessage('scheduleWeeklyBoardTitle', 'Weekly schedule');

    const summary = document.createElement('p');
    summary.textContent = summarizeSchedules(normalizedSchedules);

    header.appendChild(title);
    header.appendChild(summary);
    boardPanel.appendChild(header);

    const scroller = document.createElement('div');
    scroller.className = 'schedule-board-scroller';

    const board = document.createElement('div');
    board.className = 'schedule-board';
    board.style.setProperty('--schedule-hour-height', `${SCHEDULE_GRID_HOUR_HEIGHT}px`);

    const corner = document.createElement('div');
    corner.className = 'schedule-grid-corner';
    corner.textContent = getMessage('scheduleBoardTimeLabel', 'Time');
    board.appendChild(corner);

    SCHEDULE_GRID_DAYS.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'schedule-day-header';
      dayHeader.textContent = getMessage(day, day);
      board.appendChild(dayHeader);
    });

    const timeAxis = document.createElement('div');
    timeAxis.className = 'schedule-time-axis';
    for (let hour = 0; hour < 24; hour++) {
      const label = document.createElement('span');
      label.style.top = `${hour * SCHEDULE_GRID_HOUR_HEIGHT}px`;
      label.textContent = `${String(hour).padStart(2, '0')}:00`;
      timeAxis.appendChild(label);
    }
    board.appendChild(timeAxis);

    SCHEDULE_GRID_DAYS.forEach(day => {
      board.appendChild(createDayColumn(day));
    });

    scroller.appendChild(board);
    boardPanel.appendChild(scroller);
    return boardPanel;
  }

  function createDayColumn(day) {
    const column = document.createElement('div');
    column.className = 'schedule-day-column';
    column.dataset.day = day;

    for (let hour = 0; hour < 24; hour++) {
      const line = document.createElement('span');
      line.className = 'schedule-hour-line';
      line.style.top = `${hour * SCHEDULE_GRID_HOUR_HEIGHT}px`;
      column.appendChild(line);
    }

    normalizedSchedules.forEach((schedule, index) => {
      const visibleSchedule = index === selectedIndex && draftSchedule ? draftSchedule : schedule;
      if (!visibleSchedule.days.includes(day)) {
        return;
      }

      column.appendChild(createScheduleBlock(visibleSchedule, index, day));
    });

    if (hasNewDraftSchedule && draftSchedule.days.includes(day)) {
      column.appendChild(createScheduleBlock(draftSchedule, selectedIndex, day));
    }

    if (isCurrentScheduleDay(day)) {
      column.appendChild(createCurrentTimeMarker(getMessage('scheduleNowLabel', 'Now')));
    }

    if (!readOnly) {
      column.addEventListener('pointerdown', event => {
        if (event.target.closest('.schedule-board-block')) {
          return;
        }

        startColumnRangeDrag(event, column, day);
      });
    }

    return column;
  }

  function createScheduleBlock(schedule, index, day) {
    const block = document.createElement('button');
    block.type = 'button';
    block.className = 'schedule-board-block';
    block.dataset.index = String(index);
    block.dataset.day = day;
    block.style.top = `${scheduleTopPixels(schedule)}px`;
    block.style.height = `${scheduleHeightPixels(schedule)}px`;
    if (readOnly) {
      block.tabIndex = -1;
      block.setAttribute('aria-disabled', 'true');
    }

    if (index === selectedIndex) {
      block.classList.add('selected');
    }

    const time = document.createElement('span');
    time.textContent = `${schedule.startTime} to ${schedule.endTime}`;

    const topHandle = document.createElement('span');
    topHandle.className = 'schedule-resize-handle schedule-resize-handle-top';
    topHandle.dataset.edge = 'start';

    const bottomHandle = document.createElement('span');
    bottomHandle.className = 'schedule-resize-handle schedule-resize-handle-bottom';
    bottomHandle.dataset.edge = 'end';

    block.appendChild(topHandle);
    if (showScheduleNames) {
      const name = document.createElement('strong');
      name.textContent = schedule.name || getMessage('unnamedSchedulePrefix', 'Schedule');
      block.appendChild(name);
    }
    block.appendChild(time);
    block.appendChild(bottomHandle);

    if (!readOnly) {
      block.addEventListener('pointerdown', event => {
        event.preventDefault();
        if (index >= 0 && index !== selectedIndex) {
          onSelect?.(index);
          return;
        }
        startScheduleDrag(event, index, event.target.dataset.edge || 'move', schedule);
      });
    }

    return block;
  }

  function startScheduleDrag(event, index, mode, schedule) {
    if (readOnly) {
      return;
    }

    dragState = {
      index,
      mode,
      startY: event.clientY,
      schedule: cloneSchedule(schedule)
    };

    document.addEventListener('pointermove', handleScheduleDragMove);
    document.addEventListener('pointerup', stopScheduleDrag, { once: true });
  }

  function handleScheduleDragMove(event) {
    if (!dragState) {
      return;
    }

    const deltaMinutes = ((event.clientY - dragState.startY) / SCHEDULE_GRID_HOUR_HEIGHT) * 60;
    const range = dragState.mode === 'move'
      ? moveScheduleRange(dragState.schedule, deltaMinutes)
      : resizeScheduleRange(dragState.schedule, dragState.mode, deltaMinutes);

    onDraftChange?.({
      ...dragState.schedule,
      ...range
    });
  }

  function stopScheduleDrag() {
    dragState = null;
    document.removeEventListener('pointermove', handleScheduleDragMove);
  }

  function startColumnRangeDrag(event, column, day) {
    if (readOnly) {
      return;
    }

    if (selectedIndex === null || !selectedSchedule) {
      startNewColumnRangeDrag(event, column, day);
      return;
    }

    event.preventDefault();
    const rect = column.getBoundingClientRect();
    const clickMinutes = minutesFromGridOffset(event.clientY - rect.top);
    const days = selectedSchedule.days.includes(day)
      ? [...selectedSchedule.days]
      : [...selectedSchedule.days, day];

    dragState = {
      mode: 'column-range',
      rect,
      startY: event.clientY,
      hasMoved: false,
      anchorMinutes: getColumnDragAnchorMinutes(selectedSchedule, clickMinutes, day),
      schedule: {
        ...selectedSchedule,
        days
      }
    };

    handleColumnRangeDragMove(event);
    document.addEventListener('pointermove', handleColumnRangeDragMove);
    document.addEventListener('pointerup', stopColumnRangeDrag, { once: true });
  }

  function startNewColumnRangeDrag(event, column, day) {
    if (readOnly) {
      return;
    }

    if (typeof onCreateFromGrid !== 'function') {
      return;
    }

    event.preventDefault();
    const rect = column.getBoundingClientRect();
    const clickMinutes = minutesFromGridOffset(event.clientY - rect.top);
    const schedule = {
      name: '',
      days: [day],
      isActive: true,
      weekInterval: 1,
      anchorDate: getTodayDateString(),
      ...createScheduleRangeFromAnchor(clickMinutes, clickMinutes)
    };
    const previewBlock = createScheduleCreationPreview(schedule);
    previewBlock.hidden = true;
    column.appendChild(previewBlock);

    dragState = {
      mode: 'new-column-range',
      rect,
      startY: event.clientY,
      hasMoved: false,
      anchorMinutes: clickMinutes,
      schedule,
      previewBlock
    };

    handleColumnRangeDragMove(event);
    document.addEventListener('pointermove', handleColumnRangeDragMove);
    document.addEventListener('pointerup', stopColumnRangeDrag, { once: true });
  }

  function getColumnDragAnchorMinutes(schedule, clickMinutes, day) {
    if (!schedule.days.includes(day)) {
      return clickMinutes;
    }

    const range = getScheduleRange(schedule);
    return clickMinutes <= range.start ? range.end : range.start;
  }

  function handleColumnRangeDragMove(event) {
    if (!dragState || !['column-range', 'new-column-range'].includes(dragState.mode)) {
      return;
    }

    if (!dragState.hasMoved) {
      const distance = Math.abs(event.clientY - dragState.startY);
      if (distance < DRAG_THRESHOLD_PX) {
        return;
      }

      dragState.hasMoved = true;
      if (dragState.previewBlock) {
        dragState.previewBlock.hidden = false;
      }
    }

    const currentMinutes = minutesFromGridOffset(event.clientY - dragState.rect.top);
    const range = createScheduleRangeFromAnchor(dragState.anchorMinutes, currentMinutes);
    const nextSchedule = {
      ...dragState.schedule,
      ...range
    };

    if (dragState.mode === 'new-column-range') {
      dragState.schedule = nextSchedule;
      updateScheduleCreationPreview(dragState.previewBlock, nextSchedule);
      return;
    }

    onDraftChange?.(nextSchedule);
  }

  function createScheduleCreationPreview(schedule) {
    const block = document.createElement('div');
    block.className = 'schedule-board-block creating';
    block.setAttribute('aria-hidden', 'true');

    const time = document.createElement('span');
    block.appendChild(time);
    updateScheduleCreationPreview(block, schedule);
    return block;
  }

  function updateScheduleCreationPreview(block, schedule) {
    if (!block) {
      return;
    }

    block.style.top = `${scheduleTopPixels(schedule)}px`;
    block.style.height = `${scheduleHeightPixels(schedule)}px`;
    const time = block.querySelector('span');
    if (time) {
      time.textContent = `${schedule.startTime} to ${schedule.endTime}`;
    }
  }

  function stopColumnRangeDrag() {
    const completedDrag = dragState;
    dragState = null;
    document.removeEventListener('pointermove', handleColumnRangeDragMove);
    if (completedDrag?.mode === 'new-column-range') {
      completedDrag.previewBlock?.remove();
      if (completedDrag.hasMoved) {
        runOptionalAsync(onCreateFromGrid, completedDrag.schedule);
      }
    }
  }

  function createScheduleInspector() {
    const inspector = document.createElement('section');
    inspector.className = 'schedule-inspector';

    if (!selectedSchedule) {
      const title = document.createElement('h3');
      title.textContent = isCreateMode
        ? getMessage('scheduleCreateTitle', 'New time block')
        : getMessage('scheduleSelectedTitle', 'Selected schedule');
      const empty = document.createElement('p');
      empty.className = 'schedule-inspector-empty';
      empty.textContent = isCreateMode
        ? getMessage('scheduleCreateInstructionMessage', 'Click and drag on the weekly grid to draft the new time block. It is saved only after you press Save.')
        : getMessage(
          'scheduleEmptySelectionMessage',
          'Click and drag in the weekly grid to create a time block, or select an existing block to edit it.'
        );
      inspector.appendChild(title);
      inspector.appendChild(empty);
      return inspector;
    }

    const header = document.createElement('div');
    header.className = 'schedule-inspector-header';

    const title = document.createElement('h3');
    title.textContent = getMessage('scheduleSelectedTitle', 'Selected schedule');

    header.appendChild(title);
    inspector.appendChild(header);

    if (showScheduleNames) {
      inspector.appendChild(createTextField('scheduleNameLabel', 'Schedule Name', selectedSchedule.name, value => {
        onDraftChange?.({
          ...selectedSchedule,
          name: value
        });
      }));
    }

    inspector.appendChild(createTimeFields(selectedSchedule));
    inspector.appendChild(createRecurrenceFields(selectedSchedule));
    inspector.appendChild(createDayPicker(selectedSchedule));
    const validationMessage = getScheduleValidationMessage(selectedSchedule);
    if (validationMessage) {
      const warning = document.createElement('p');
      warning.className = 'schedule-validation-message';
      warning.textContent = validationMessage;
      inspector.appendChild(warning);
    }
    inspector.appendChild(createScheduleActions(selectedSchedule));
    return inspector;
  }

  function createTextField(labelKey, fallback, value, onChange) {
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

  function createTimeFields(schedule) {
    const grid = document.createElement('div');
    grid.className = 'schedule-time-fields';

    grid.appendChild(createTimeField('startTimeLabel', 'Start Time', schedule.startTime, value => {
      onDraftChange?.({
        ...schedule,
        startTime: value
      });
    }));

    grid.appendChild(createTimeField('endTimeLabel', 'End Time', schedule.endTime, value => {
      onDraftChange?.({
        ...schedule,
        endTime: value
      });
    }));

    return grid;
  }

  function createRecurrenceFields(schedule) {
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

  function createTimeField(labelKey, fallback, value, onChange) {
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

  function createDayPicker(schedule) {
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
      button.addEventListener('click', () => toggleDraftDay(day, schedule));
      dayGrid.appendChild(button);
    });

    wrapper.appendChild(dayGrid);

    const presets = document.createElement('div');
    presets.className = 'schedule-day-presets';
    presets.appendChild(createPresetButton(getMessage('scheduleWorkdaysPreset', 'Workdays'), WEEKDAY_DAYS));
    presets.appendChild(createPresetButton(getMessage('scheduleWeekendPreset', 'Weekend'), WEEKEND_DAYS));
    presets.appendChild(createPresetButton(getMessage('scheduleEveryDayPreset', 'Every day'), SCHEDULE_GRID_DAYS));
    presets.appendChild(createPresetButton(getMessage('scheduleClearPreset', 'Clear'), []));
    wrapper.appendChild(presets);

    return wrapper;
  }

  function createPresetButton(label, days) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'schedule-preset-button';
    button.textContent = label;
    button.disabled = readOnly;
    button.addEventListener('click', () => {
      onDraftChange?.({
        ...selectedSchedule,
        days: SCHEDULE_GRID_DAYS.filter(day => days.includes(day))
      });
    });
    return button;
  }

  function toggleDraftDay(day, schedule) {
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

  function createScheduleActions(schedule) {
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

  function summarizeSchedules(currentSchedules) {
    if (currentSchedules.length === 0) {
      return getMessage('scheduleNoSchedulesMessage', 'No schedules yet.');
    }

    const counts = getScheduleActivityCounts(currentSchedules);
    return formatScheduleActivitySummary(counts, {
      getMessage,
      includeSaved: true,
      includeEnabled: false,
      includeDisabled: false,
      includeIncomplete: false,
      savedSummaryKey: 'scheduleTimeBlocksSummaryPart',
      savedSummaryFallback: `${counts.saved} time ${counts.saved === 1 ? 'block' : 'blocks'}`,
      trailingPeriod: true
    });
  }

  function getMessage(key, fallback, substitutions) {
    return message ? message(key, fallback, substitutions) : fallback;
  }

  function getScheduleValidationMessage(schedule) {
    if (!Array.isArray(schedule.days) || schedule.days.length === 0) {
      return getMessage('scheduleNeedsDayError', 'Select at least one day before saving this schedule.');
    }

    if (!hasValidScheduleTimeRange(schedule)) {
      return getMessage('endTimeAfterStartTimeError', 'End time must be after start time.');
    }

    return '';
  }
}

export function isScheduleDraftComplete(schedule = {}) {
  return Array.isArray(schedule.days)
    && schedule.days.length > 0
    && hasValidScheduleTimeRange(schedule);
}

function isCurrentScheduleDay(day) {
  return day === new Date().toLocaleString('en-US', { weekday: 'short' });
}

function createCurrentTimeMarker(labelText) {
  const now = new Date();
  const marker = document.createElement('span');
  marker.className = 'schedule-now-marker';
  marker.style.top = `${((now.getHours() * 60 + now.getMinutes()) / 60) * SCHEDULE_GRID_HOUR_HEIGHT}px`;

  const dot = document.createElement('span');
  dot.className = 'schedule-now-dot';

  const label = document.createElement('span');
  label.className = 'schedule-now-label';
  label.textContent = labelText || 'Now';

  marker.append(dot, label);
  return marker;
}

function normalizeWeekInterval(value) {
  const interval = Number.parseInt(value, 10);
  return Number.isFinite(interval) ? Math.min(Math.max(interval, 1), MAX_WEEK_INTERVAL) : 1;
}

function normalizeDateInput(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }

  const [, year, month, day] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(yearNumber, monthNumber - 1, dayNumber);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === yearNumber
    && date.getMonth() === monthNumber - 1
    && date.getDate() === dayNumber
    ? text
    : '';
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hasValidScheduleTimeRange(schedule = {}) {
  const startMinutes = timeStringToMinutes(schedule.startTime);
  const endMinutes = timeStringToMinutes(schedule.endTime);
  return Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes > startMinutes;
}

function runOptionalAsync(callback, ...args) {
  if (typeof callback !== 'function') {
    return;
  }

  try {
    const result = callback(...args);
    if (result && typeof result.catch === 'function') {
      result.catch(error => console.error('Schedule board action failed:', error));
    }
  } catch (error) {
    console.error('Schedule board action failed:', error);
  }
}

function getSelectedSchedule(schedules, selectedIndex, draftSchedule) {
  if (selectedIndex === null) {
    return null;
  }

  if (selectedIndex < 0) {
    return draftSchedule ? cloneSchedule(draftSchedule) : null;
  }

  if (selectedIndex >= schedules.length) {
    return null;
  }

  return draftSchedule ? cloneSchedule(draftSchedule) : cloneSchedule(schedules[selectedIndex]);
}
