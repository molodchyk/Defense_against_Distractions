// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { initializeDefaultSettings } from './background/defaults.js';
import { initializeScheduleMonitor } from './background/scheduleMonitor.js';

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'updateBadge') {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }

    chrome.action.setBadgeText({ text: String(message.score), tabId });
  }
});

initializeDefaultSettings();
initializeScheduleMonitor();

