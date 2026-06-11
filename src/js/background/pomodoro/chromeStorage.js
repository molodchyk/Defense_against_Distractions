// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_ACTIVITY_STORAGE_KEY,
  POMODORO_HISTORY_STORAGE_KEY,
  POMODORO_PHASES,
  POMODORO_RUNTIME_STORAGE_KEY,
  isPomodoroActive,
  normalizePomodoroActivityState,
  normalizePomodoroHistoryState,
  normalizePomodoroRuntime,
  recordPomodoroHistoryEvent
} from '../../shared/pomodoro.js';
import {
  PLANS_STORAGE_KEY,
  isInProtectedSchedule,
  normalizePlans
} from '../../shared/plans.js';
import { POMODORO_ALARM_NAME } from './constants.js';
import { isPastDueWorkWaitingForSystemReturn } from './runtimeReconciliation.js';

export function getSync(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

export function getLocal(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

export function setLocal(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

export function clearPomodoroAlarm() {
  return new Promise(resolve => {
    chrome.alarms.clear(POMODORO_ALARM_NAME, () => resolve());
  });
}

export async function schedulePomodoroAlarm(runtime) {
  await clearPomodoroAlarm();

  if (!isPomodoroActive(runtime) || runtime.phase === POMODORO_PHASES.PAUSED || !runtime.phaseEndsAt) {
    return;
  }

  const when = Date.parse(runtime.phaseEndsAt);
  if (isPastDueWorkWaitingForSystemReturn(runtime)) {
    return;
  }

  if (Number.isFinite(when)) {
    chrome.alarms.create(POMODORO_ALARM_NAME, { when: Math.max(when, Date.now() + 1000) });
  }
}

export async function getPlans() {
  const items = await getSync(PLANS_STORAGE_KEY);
  return normalizePlans(items[PLANS_STORAGE_KEY]);
}

export async function isProtectedScheduleActive() {
  return isInProtectedSchedule(await getSync(null));
}

export async function getRuntime() {
  const items = await getLocal(POMODORO_RUNTIME_STORAGE_KEY);
  return normalizePomodoroRuntime(items[POMODORO_RUNTIME_STORAGE_KEY]);
}

export async function getActivityState() {
  const items = await getLocal(POMODORO_ACTIVITY_STORAGE_KEY);
  return normalizePomodoroActivityState(items[POMODORO_ACTIVITY_STORAGE_KEY]);
}

export async function getHistory(now = Date.now()) {
  const items = await getLocal(POMODORO_HISTORY_STORAGE_KEY);
  return normalizePomodoroHistoryState(items[POMODORO_HISTORY_STORAGE_KEY], now);
}

export async function saveRuntime(runtime) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  await setLocal({ [POMODORO_RUNTIME_STORAGE_KEY]: normalizedRuntime });
  await schedulePomodoroAlarm(normalizedRuntime);
  return normalizedRuntime;
}

export async function saveActivityState(activityState) {
  const normalizedState = normalizePomodoroActivityState(activityState);
  await setLocal({ [POMODORO_ACTIVITY_STORAGE_KEY]: normalizedState });
  return normalizedState;
}

export async function saveHistory(history, now = Date.now()) {
  const normalizedHistory = normalizePomodoroHistoryState(history, now);
  await setLocal({ [POMODORO_HISTORY_STORAGE_KEY]: normalizedHistory });
  return normalizedHistory;
}

export async function recordHistoryEvent(event, now = Date.now()) {
  const history = await getHistory(now);
  return saveHistory(recordPomodoroHistoryEvent(history, event, now), now);
}
