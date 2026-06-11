// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

function sendPomodoroTabMessage(tabId, message, options = null) {
  const callback = () => {
    if (chrome.runtime.lastError) {
      return;
    }
    // Tabs without the content script are expected. The notification is
    // best-effort because popup/options state already comes from storage.
  };

  if (options) {
    chrome.tabs.sendMessage(tabId, message, options, callback);
    return;
  }

  chrome.tabs.sendMessage(tabId, message, callback);
}

function notifyAllPomodoroTabs(message) {
  chrome.tabs.query({}, tabs => {
    if (chrome.runtime.lastError) {
      return;
    }

    tabs.forEach(tab => {
      if (tab.id === undefined) {
        return;
      }

      sendPomodoroTabMessage(tab.id, message);
      sendPomodoroTabMessage(tab.id, message, { frameId: 0 });
    });
  });
}

export function notifyPomodoroRuntimeChanged(reason) {
  notifyAllPomodoroTabs({
    action: 'pomodoroRuntimeChanged',
    reason
  });
}

export function notifyPomodoroStrictBreakReset() {
  notifyAllPomodoroTabs({
    action: 'clearPomodoroStrictBreakBlock'
  });
}
