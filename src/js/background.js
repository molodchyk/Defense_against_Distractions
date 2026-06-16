// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { initializeDefaultSettings } from './background/defaults.js';
import { initializeIntentCoherence } from './background/intentCoherence.js';
import { initializePomodoroRuntime } from './background/pomodoro.js';
import { initializeReleaseBackupNoticeEligibility } from './background/releaseNotice.js';
import { initializeScheduleMonitor } from './background/scheduleMonitor.js';
import { createContentBlockingBackgroundRuntime } from '../features/content-blocking/background/runtime.js';

const contentBlockingRuntime = createContentBlockingBackgroundRuntime(chrome);

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html') });
});

chrome.runtime.onMessage.addListener(contentBlockingRuntime.handleRuntimeMessage);
chrome.tabs.onUpdated.addListener(contentBlockingRuntime.handleTabUpdated);
chrome.tabs.onRemoved.addListener(contentBlockingRuntime.handleTabRemoved);

initializeDefaultSettings();
initializeIntentCoherence();
initializePomodoroRuntime();
initializeReleaseBackupNoticeEligibility();
initializeScheduleMonitor();

