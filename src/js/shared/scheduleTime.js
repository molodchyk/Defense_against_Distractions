// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function timeStringToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MAX_WEEK_INTERVAL = 12;

export function isCurrentTimeInAnySchedule(schedules, now = new Date()) {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return false;
  }

  const currentDay = now.toLocaleString('en-US', { weekday: 'short' });
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  return schedules.some(schedule => {
    if (
      schedule?.isActive === false
      || !Array.isArray(schedule?.days)
      || !schedule.days.includes(currentDay)
      || !isScheduleInCurrentWeek(schedule, now)
    ) {
      return false;
    }

    const startMinutes = timeStringToMinutes(schedule.startTime);
    const endMinutes = timeStringToMinutes(schedule.endTime);

    return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
  });
}

export function getScheduleActivityCounts(schedules, now = new Date()) {
  const total = Array.isArray(schedules) ? schedules.length : 0;
  const savedSchedules = Array.isArray(schedules)
    ? schedules.filter(schedule => Array.isArray(schedule?.days) && schedule.days.length > 0)
    : [];
  const enabledSchedules = savedSchedules.filter(schedule => schedule.isActive !== false);
  const activeNow = enabledSchedules.filter(schedule => isCurrentTimeInAnySchedule([schedule], now)).length;

  return {
    total,
    saved: savedSchedules.length,
    enabled: enabledSchedules.length,
    disabled: Math.max(0, savedSchedules.length - enabledSchedules.length),
    incomplete: Math.max(0, total - savedSchedules.length),
    activeNow
  };
}

export function isScheduleInCurrentWeek(schedule = {}, now = new Date()) {
  const interval = normalizeScheduleWeekInterval(schedule.weekInterval);
  if (interval <= 1) {
    return true;
  }

  const anchorDate = parseLocalDate(schedule.anchorDate);
  if (!anchorDate) {
    return true;
  }

  const currentWeekStart = getLocalWeekStart(now);
  const anchorWeekStart = getLocalWeekStart(anchorDate);
  const weekDifference = Math.floor((currentWeekStart.getTime() - anchorWeekStart.getTime()) / MS_PER_WEEK);

  return weekDifference >= 0 && weekDifference % interval === 0;
}

export function normalizeScheduleWeekInterval(value) {
  const interval = Number.parseInt(value, 10);
  return Number.isFinite(interval) ? Math.min(Math.max(interval, 1), MAX_WEEK_INTERVAL) : 1;
}

function parseLocalDate(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(yearNumber, monthNumber - 1, dayNumber);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== yearNumber
    || date.getMonth() !== monthNumber - 1
    || date.getDate() !== dayNumber
  ) {
    return null;
  }

  return date;
}

function getLocalWeekStart(date) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayOffset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
