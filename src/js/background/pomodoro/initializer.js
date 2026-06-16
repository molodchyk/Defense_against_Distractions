// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { PLANS_STORAGE_KEY } from '../../shared/plans.js';
import { addStorageChangeListener } from '../../../platform/chrome/storage.js';
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
  if (!chrome.idle) {
    return;
  }

  chrome.idle.setDetectionInterval(POMODORO_IDLE_DETECTION_SECONDS);
  chrome.idle.onStateChanged.addListener(handleSystemStateChange);
  chrome.idle.queryState(POMODORO_IDLE_DETECTION_SECONDS, handleSystemStateChange);
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

  chrome.runtime.onMessage.addListener(handlePomodoroMessage);

  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== POMODORO_ALARM_NAME) {
      return;
    }

    getPomodoroPayload().catch(error => {
      console.error('Failed to advance Pomodoro alarm:', error);
    });
  });

  chrome.runtime.onStartup.addListener(() => {
    getPomodoroPayload().catch(error => {
      console.error('Failed to restore Pomodoro alarm on startup:', error);
    });
  });

  chrome.runtime.onInstalled.addListener(() => {
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

  chrome.tabs.onActivated.addListener(() => {
    recordActivity({ reason: 'tabActivated' }).catch(error => {
      console.error('Failed to record Pomodoro tab activity:', error);
    });
  });

  if (chrome.windows?.onFocusChanged) {
    chrome.windows.onFocusChanged.addListener(windowId => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
      }

      recordActivity({ reason: 'windowFocus' }).catch(error => {
        console.error('Failed to record Pomodoro window activity:', error);
      });
    });
  }
}
