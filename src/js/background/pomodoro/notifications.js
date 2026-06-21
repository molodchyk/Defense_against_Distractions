// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { queryTabs, sendTabMessage } from '../../../platform/chrome/tabs.js';

async function notifyAllPomodoroTabs(message) {
  try {
    const tabs = await queryTabs({});
    await Promise.all(tabs.flatMap(tab => {
      if (tab.id === undefined) {
        return [];
      }

      return [
        sendTabMessage(tab.id, message),
        sendTabMessage(tab.id, message, { frameId: 0 })
      ];
    }));
  } catch {
    // Tabs without the content script are expected. The notification is
    // best-effort because popup/options state already comes from storage.
  }
}

export function notifyPomodoroRuntimeChanged(reason) {
  return notifyAllPomodoroTabs({
    action: 'pomodoroRuntimeChanged',
    reason
  });
}

export function notifyPomodoroStrictBreakReset() {
  return notifyAllPomodoroTabs({
    action: 'clearPomodoroStrictBreakBlock'
  });
}
