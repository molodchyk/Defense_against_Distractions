// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { timeStringToMinutes } from './scheduleTime.js';

const MINUTES_IN_DAY = 1440;

export function hasMinimumUnlockedTime(schedules, minimumUnlockedTime = 60) {
  const dailySchedules = {};

  schedules.forEach(schedule => {
    if (!schedule.isActive) {
      return;
    }

    schedule.days.forEach(day => {
      if (!dailySchedules[day]) {
        dailySchedules[day] = [];
      }

      dailySchedules[day].push({
        start: timeStringToMinutes(schedule.startTime),
        end: timeStringToMinutes(schedule.endTime)
      });
    });
  });

  for (const day in dailySchedules) {
    const totalLockedTime = dailySchedules[day].reduce((total, timeBlock) => {
      return total + timeBlock.end - timeBlock.start;
    }, 0);

    if (MINUTES_IN_DAY - totalLockedTime < minimumUnlockedTime) {
      return false;
    }
  }

  return true;
}

export function doSchedulesOverlap(schedules) {
  const dayTimeRanges = {};

  schedules.forEach(schedule => {
    schedule.days.forEach(day => {
      if (!dayTimeRanges[day]) {
        dayTimeRanges[day] = [];
      }

      dayTimeRanges[day].push({
        start: timeStringToMinutes(schedule.startTime),
        end: timeStringToMinutes(schedule.endTime)
      });
    });
  });

  for (const day in dayTimeRanges) {
    const ranges = dayTimeRanges[day];

    for (let currentIndex = 0; currentIndex < ranges.length; currentIndex++) {
      for (let nextIndex = currentIndex + 1; nextIndex < ranges.length; nextIndex++) {
        if (rangesOverlap(ranges[currentIndex], ranges[nextIndex])) {
          return true;
        }
      }
    }
  }

  return false;
}

export function isScheduleMoreStrict(original, next) {
  if (!original.days.every(day => next.days.includes(day))) {
    return false;
  }

  if (isTimeLater(original.startTime, next.startTime) ||
      isTimeEarlier(original.endTime, next.endTime)) {
    return false;
  }

  return !original.isActive || next.isActive;
}

function rangesOverlap(range1, range2) {
  return range1.start < range2.end && range1.end > range2.start;
}

function isTimeLater(time1, time2) {
  return timeStringToMinutes(time1) < timeStringToMinutes(time2);
}

function isTimeEarlier(time1, time2) {
  return timeStringToMinutes(time1) > timeStringToMinutes(time2);
}
