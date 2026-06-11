// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { timeStringToMinutes } from '../shared/schedules/scheduleTime.js';

export const WEEKDAY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const WEEKEND_DAYS = ['Sat', 'Sun'];
export const MAX_WEEK_INTERVAL = 12;

export function cloneSchedule(schedule = {}) {
  return {
    ...schedule,
    days: Array.isArray(schedule.days) ? [...schedule.days] : []
  };
}

export function cloneSchedules(schedules = []) {
  return schedules.map(cloneSchedule);
}

export function getSelectedSchedule(schedules, selectedIndex, draftSchedule) {
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

export function isScheduleDraftComplete(schedule = {}) {
  return Array.isArray(schedule.days)
    && schedule.days.length > 0
    && hasValidScheduleTimeRange(schedule);
}

export function normalizeWeekInterval(value) {
  const interval = Number.parseInt(value, 10);
  return Number.isFinite(interval) ? Math.min(Math.max(interval, 1), MAX_WEEK_INTERVAL) : 1;
}

export function normalizeDateInput(value) {
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

export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hasValidScheduleTimeRange(schedule = {}) {
  const startMinutes = timeStringToMinutes(schedule.startTime);
  const endMinutes = timeStringToMinutes(schedule.endTime);
  return Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes > startMinutes;
}
