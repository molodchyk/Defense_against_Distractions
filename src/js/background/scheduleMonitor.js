// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { debugLog } from '../shared/logger.js';

export function initializeScheduleMonitor() {
  chrome.runtime.onStartup.addListener(checkCurrentSchedule);
  chrome.runtime.onInstalled.addListener(checkCurrentSchedule);
  chrome.alarms.create('scheduleCheck', { periodInMinutes: 1 });

  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'scheduleCheck') {
      checkCurrentSchedule();
    }
  });
}

function checkCurrentSchedule() {
  chrome.storage.sync.get('schedule', data => {
    const now = new Date();
    const day = now.toLocaleString('en-US', { weekday: 'short' });
    const currentTime = now.toTimeString().substring(0, 5);

    if (data.schedule && data.schedule.days.includes(day)) {
      if (currentTime >= data.schedule.start && currentTime <= data.schedule.end) {
        debugLog('Restrictions are active.');
      } else {
        debugLog('No restrictions currently.');
      }
    }
  });
}
