// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function createAlarm(name, alarmInfo) {
  chrome.alarms.create(name, alarmInfo);
}

export function clearAlarm(name) {
  return new Promise((resolve, reject) => {
    chrome.alarms.clear(name, wasCleared => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(Boolean(wasCleared));
    });
  });
}

export function addAlarmListener(listener) {
  chrome.alarms.onAlarm.addListener(listener);

  return () => {
    chrome.alarms.onAlarm.removeListener(listener);
  };
}
