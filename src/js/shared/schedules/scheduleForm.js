// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function formatScheduleTime(timeStr) {
  if (!timeStr.includes(':')) {
    return `${timeStr.padStart(2, '0')}:00`;
  }

  const [hours, minutes] = timeStr.split(':').map(part => part.padStart(2, '0'));
  return `${hours}:${minutes}`;
}

export function normalizeScheduleTimeInput(value, previousValue = '', inputType = '') {
  const keyValue = inputType || 'backspace';
  let normalizedValue = value.replace(/[^0-9:]/g, '');
  let [hours, minutes] = normalizedValue.split(':');

  if (keyValue === ':') {
    if (hours.length === 1 || hours.length === 2) {
      normalizedValue = `${hours}:`;
    }
  } else if (keyValue === 'backspace') {
    if (previousValue.endsWith(':')) {
      hours = hours.substring(0, hours.length - 1);
      normalizedValue = hours;
    } else {
      normalizedValue = normalizedValue.substring(0, normalizedValue.length - 1);
    }
  }

  [hours, minutes] = normalizedValue.split(':');

  hours = Math.min(Math.max(Number.parseInt(hours, 10) || 0, 0), 23);
  minutes = minutes ? Math.min(Math.max(Number.parseInt(minutes, 10), 0), 59) : '';

  if (minutes !== '') {
    return `${hours}:${minutes}`;
  }

  if (normalizedValue.endsWith(':') || hours >= 10) {
    return `${hours}:`;
  }

  return `${hours}`;
}

export function getNextUnnamedScheduleName(schedules, unnamedSchedulePrefix) {
  const existingNames = new Set(schedules.map(schedule => schedule.name.toLowerCase()));
  let scheduleNumber = 1;

  while (existingNames.has(`${unnamedSchedulePrefix.toLowerCase()}${scheduleNumber}`)) {
    scheduleNumber++;
  }

  return `${unnamedSchedulePrefix}${scheduleNumber}`;
}

export function createDefaultSchedule(name) {
  return {
    name,
    days: [],
    startTime: '00:00',
    endTime: '23:59',
    weekInterval: 1,
    anchorDate: '',
    isActive: false
  };
}
