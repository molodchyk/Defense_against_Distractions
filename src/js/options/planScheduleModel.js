// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function normalizePlanScheduleWeekInterval(value) {
  const interval = Number.parseInt(value, 10);
  return Number.isFinite(interval) ? Math.min(Math.max(interval, 1), 12) : 1;
}

export function normalizePlanScheduleAnchorDate(value) {
  const text = String(value || '').trim();
  if (isValidLocalDateString(text)) {
    return text;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidLocalDateString(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(yearNumber, monthNumber - 1, dayNumber);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === yearNumber
    && date.getMonth() === monthNumber - 1
    && date.getDate() === dayNumber;
}
