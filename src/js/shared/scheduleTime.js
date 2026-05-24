// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function timeStringToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isCurrentTimeInAnySchedule(schedules, now = new Date()) {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return false;
  }

  const currentDay = now.toLocaleString('en-US', { weekday: 'short' });
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  return schedules.some(schedule => {
    if (!schedule.isActive || !schedule.days.includes(currentDay)) {
      return false;
    }

    const startMinutes = timeStringToMinutes(schedule.startTime);
    const endMinutes = timeStringToMinutes(schedule.endTime);

    return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
  });
}
