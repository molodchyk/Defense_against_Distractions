// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { debugLog } from '../shared/logger.js';
import { createAlarm, addAlarmListener } from '../../platform/chrome/alarms.js';
import { addInstalledListener, addStartupListener } from '../../platform/chrome/runtime.js';
import { getSync } from '../../platform/chrome/storage.js';

const SCHEDULE_CHECK_ALARM_NAME = 'scheduleCheck';

export function initializeScheduleMonitor() {
  addStartupListener(runScheduleCheck);
  addInstalledListener(runScheduleCheck);
  createAlarm(SCHEDULE_CHECK_ALARM_NAME, { periodInMinutes: 1 });

  addAlarmListener(alarm => {
    if (alarm.name === SCHEDULE_CHECK_ALARM_NAME) {
      runScheduleCheck();
    }
  });
}

function runScheduleCheck() {
  checkCurrentSchedule().catch(error => {
    console.error('Failed to check current schedule:', error);
  });
}

export async function checkCurrentSchedule() {
  const data = await getSync('schedule');
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
}
