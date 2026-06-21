// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { PLANS_STORAGE_KEY } from '../../shared/plans.js';
import { addAlarmListener } from '../../../platform/chrome/alarms.js';
import {
  addIdleStateChangeListener,
  hasIdleApi,
  queryIdleState,
  setIdleDetectionInterval
} from '../../../platform/chrome/idle.js';
import {
  addInstalledListener,
  addRuntimeMessageListener,
  addStartupListener
} from '../../../platform/chrome/runtime.js';
import { addStorageChangeListener } from '../../../platform/chrome/storage.js';
import { addTabActivatedListener } from '../../../platform/chrome/tabs.js';
import {
  addWindowFocusChangedListener,
  getNoFocusedWindowId
} from '../../../platform/chrome/windows.js';
import { POMODORO_IDLE_DETECTION_SECONDS } from '../../shared/pomodoro.js';
import { POMODORO_ALARM_NAME } from './constants.js';
import {
  getPomodoroPayload,
  pauseCurrentPomodoro,
  recordActivity,
  recordSystemState,
  resetCurrentPomodoro,
  resumeCurrentPomodoro,
  startPomodoro
} from './engine.js';

function handleSystemStateChange(systemState) {
  recordSystemState(systemState).catch(error => {
    console.error('Failed to reconcile Pomodoro system state:', error);
  });
}

function initializeSystemIdleDetection() {
  if (!hasIdleApi()) {
    return;
  }

  setIdleDetectionInterval(POMODORO_IDLE_DETECTION_SECONDS);
  addIdleStateChangeListener(handleSystemStateChange);
  queryIdleState(POMODORO_IDLE_DETECTION_SECONDS, handleSystemStateChange);
}

function respondAsync(sendResponse, action) {
  action()
    .then(sendResponse)
    .catch(error => {
      console.error('Pomodoro action failed:', error);
      sendResponse({ status: 'error' });
    });
}

function handlePomodoroMessage(message, sender, sendResponse) {
  if (message.action === 'getPomodoroState') {
    respondAsync(sendResponse, getPomodoroPayload);
    return true;
  }

  if (message.action === 'recordPomodoroActivity') {
    respondAsync(sendResponse, () => recordActivity({
      reason: message.reason,
      url: message.url,
      title: message.title
    }));
    return true;
  }

  if (message.action === 'startPomodoro') {
    respondAsync(sendResponse, () => startPomodoro(message.planId || null));
    return true;
  }

  if (message.action === 'pausePomodoro') {
    respondAsync(sendResponse, pauseCurrentPomodoro);
    return true;
  }

  if (message.action === 'resumePomodoro') {
    respondAsync(sendResponse, resumeCurrentPomodoro);
    return true;
  }

  if (message.action === 'resetPomodoro') {
    respondAsync(sendResponse, resetCurrentPomodoro);
    return true;
  }

  return false;
}

export function initializePomodoroRuntime() {
  initializeSystemIdleDetection();

  addRuntimeMessageListener(handlePomodoroMessage);

  addAlarmListener(alarm => {
    if (alarm.name !== POMODORO_ALARM_NAME) {
      return;
    }

    getPomodoroPayload().catch(error => {
      console.error('Failed to advance Pomodoro alarm:', error);
    });
  });

  addStartupListener(() => {
    getPomodoroPayload().catch(error => {
      console.error('Failed to restore Pomodoro alarm on startup:', error);
    });
  });

  addInstalledListener(() => {
    getPomodoroPayload().catch(error => {
      console.error('Failed to restore Pomodoro alarm on install:', error);
    });
  });

  addStorageChangeListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes[PLANS_STORAGE_KEY]) {
      return;
    }

    getPomodoroPayload().catch(error => {
      console.error('Failed to reconcile Pomodoro after plan change:', error);
    });
  });

  addTabActivatedListener(() => {
    recordActivity({ reason: 'tabActivated' }).catch(error => {
      console.error('Failed to record Pomodoro tab activity:', error);
    });
  });

  addWindowFocusChangedListener(windowId => {
    if (windowId === getNoFocusedWindowId()) {
      return;
    }

    recordActivity({ reason: 'windowFocus' }).catch(error => {
      console.error('Failed to record Pomodoro window activity:', error);
    });
  });
}
