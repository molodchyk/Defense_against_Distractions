// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

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
} from '../../shared/schedules/scheduleGrid.js';
import { createScheduleInspector } from './scheduleBoardInspector.js';
import {
  cloneSchedule,
  cloneSchedules,
  getSelectedSchedule,
  getTodayDateString
} from './scheduleBoardModel.js';
import { summarizeSchedules } from './scheduleBoardSummary.js';

const DRAG_THRESHOLD_PX = 4;

export { cloneSchedule, cloneSchedules, isScheduleDraftComplete } from './scheduleBoardModel.js';

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
  workspace.appendChild(createScheduleInspector({
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
  }));
  return workspace;

  function createScheduleBoard() {
    const boardPanel = document.createElement('section');
    boardPanel.className = 'schedule-board-panel';

    const header = document.createElement('div');
    header.className = 'schedule-board-header';

    const title = document.createElement('h3');
    title.textContent = getMessage('scheduleWeeklyBoardTitle', 'Weekly schedule');

    const summary = document.createElement('p');
    summary.textContent = summarizeSchedules(normalizedSchedules, getMessage);

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

  function getMessage(key, fallback, substitutions) {
    return message ? message(key, fallback, substitutions) : fallback;
  }
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
