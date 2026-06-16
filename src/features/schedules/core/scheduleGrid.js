// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { timeStringToMinutes } from './scheduleTime.js';

export const SCHEDULE_GRID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const SCHEDULE_GRID_HOUR_HEIGHT = 48;
export const SCHEDULE_GRID_MINUTE_STEP = 15;
export const SCHEDULE_GRID_MIN_DURATION = 15;
export const SCHEDULE_GRID_MAX_END_MINUTES = 1439;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function snapMinutes(minutes, step = SCHEDULE_GRID_MINUTE_STEP) {
  return clamp(Math.round(minutes / step) * step, 0, SCHEDULE_GRID_MAX_END_MINUTES);
}

export function minutesToTimeString(minutes) {
  const clampedMinutes = clamp(Math.round(minutes), 0, SCHEDULE_GRID_MAX_END_MINUTES);
  const hours = Math.floor(clampedMinutes / 60);
  const minutePart = clampedMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutePart).padStart(2, '0')}`;
}

export function getCurrentScheduleMarker(now = new Date(), hourHeight = SCHEDULE_GRID_HOUR_HEIGHT) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const day = SCHEDULE_GRID_DAYS[(date.getDay() + 6) % 7];
  const minuteOfDay = (date.getHours() * 60) + date.getMinutes();

  return {
    day,
    minuteOfDay,
    timeText: minutesToTimeString(minuteOfDay),
    topPixels: (minuteOfDay / 60) * hourHeight
  };
}

export function getScheduleRange(schedule) {
  return {
    start: timeStringToMinutes(schedule.startTime),
    end: timeStringToMinutes(schedule.endTime)
  };
}

export function getScheduleDurationMinutes(schedule) {
  const { start, end } = getScheduleRange(schedule);
  return Math.max(SCHEDULE_GRID_MIN_DURATION, end - start);
}

export function createScheduleRangeFromStart(startMinutes, durationMinutes = 60) {
  const start = clamp(snapMinutes(startMinutes), 0, SCHEDULE_GRID_MAX_END_MINUTES - SCHEDULE_GRID_MIN_DURATION);
  const end = clamp(start + durationMinutes, start + SCHEDULE_GRID_MIN_DURATION, SCHEDULE_GRID_MAX_END_MINUTES);

  return {
    startTime: minutesToTimeString(start),
    endTime: minutesToTimeString(end)
  };
}

export function createScheduleRangeFromAnchor(anchorMinutes, currentMinutes) {
  const anchor = snapMinutes(anchorMinutes);
  const current = snapMinutes(currentMinutes);

  if (current >= anchor) {
    const end = clamp(Math.max(current, anchor + SCHEDULE_GRID_MIN_DURATION), anchor + SCHEDULE_GRID_MIN_DURATION, SCHEDULE_GRID_MAX_END_MINUTES);
    return {
      startTime: minutesToTimeString(anchor),
      endTime: minutesToTimeString(end)
    };
  }

  const start = clamp(Math.min(current, anchor - SCHEDULE_GRID_MIN_DURATION), 0, anchor - SCHEDULE_GRID_MIN_DURATION);
  return {
    startTime: minutesToTimeString(start),
    endTime: minutesToTimeString(anchor)
  };
}

export function moveScheduleRange(schedule, deltaMinutes) {
  const { start, end } = getScheduleRange(schedule);
  const duration = Math.max(SCHEDULE_GRID_MIN_DURATION, end - start);
  const nextStart = clamp(snapMinutes(start + deltaMinutes), 0, SCHEDULE_GRID_MAX_END_MINUTES - duration);
  const nextEnd = nextStart + duration;

  return {
    startTime: minutesToTimeString(nextStart),
    endTime: minutesToTimeString(nextEnd)
  };
}

export function resizeScheduleRange(schedule, edge, deltaMinutes) {
  const { start, end } = getScheduleRange(schedule);

  if (edge === 'start') {
    const nextStart = clamp(snapMinutes(start + deltaMinutes), 0, end - SCHEDULE_GRID_MIN_DURATION);
    return {
      startTime: minutesToTimeString(nextStart),
      endTime: minutesToTimeString(end)
    };
  }

  const nextEnd = clamp(snapMinutes(end + deltaMinutes), start + SCHEDULE_GRID_MIN_DURATION, SCHEDULE_GRID_MAX_END_MINUTES);

  return {
    startTime: minutesToTimeString(start),
    endTime: minutesToTimeString(nextEnd)
  };
}

export function minutesFromGridOffset(offsetPixels, hourHeight = SCHEDULE_GRID_HOUR_HEIGHT) {
  return snapMinutes((offsetPixels / hourHeight) * 60);
}

export function scheduleTopPixels(schedule, hourHeight = SCHEDULE_GRID_HOUR_HEIGHT) {
  return (timeStringToMinutes(schedule.startTime) / 60) * hourHeight;
}

export function scheduleHeightPixels(schedule, hourHeight = SCHEDULE_GRID_HOUR_HEIGHT) {
  const { start, end } = getScheduleRange(schedule);
  return Math.max(24, ((end - start) / 60) * hourHeight);
}
