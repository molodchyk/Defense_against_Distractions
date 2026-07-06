// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { createContentBlockingBackgroundRuntime } from '../../features/content-blocking/background/runtime.js';
import { initializeDefaultSettings } from '../../js/background/defaults.js';
import { initializeIntentCoherence } from '../../js/background/intentCoherence.js';
import { initializePomodoroRuntime } from '../../js/background/pomodoro.js';
import { initializeReleaseBackupNoticeEligibility } from '../../js/background/releaseNotice.js';
import { initializeScheduleMonitor } from '../../js/background/scheduleMonitor.js';
import { createSelectedTextQuickAddBackgroundRuntime } from '../../js/background/selectedTextQuickAdd.js';
import { addActionClickedListener } from '../../platform/chrome/action.js';
import { addRuntimeMessageListener, getExtensionUrl } from '../../platform/chrome/runtime.js';
import {
  addTabRemovedListener,
  addTabUpdatedListener,
  createTab
} from '../../platform/chrome/tabs.js';

const contentBlockingRuntime = createContentBlockingBackgroundRuntime();
const selectedTextQuickAddRuntime = createSelectedTextQuickAddBackgroundRuntime();

addActionClickedListener(() => {
  createTab({ url: getExtensionUrl('src/options.html') }).catch(() => {});
});

addRuntimeMessageListener(contentBlockingRuntime.handleRuntimeMessage);
addRuntimeMessageListener(selectedTextQuickAddRuntime.handleRuntimeMessage);
addTabUpdatedListener(contentBlockingRuntime.handleTabUpdated);
addTabRemovedListener(contentBlockingRuntime.handleTabRemoved);

initializeDefaultSettings();
initializeIntentCoherence();
initializePomodoroRuntime();
initializeReleaseBackupNoticeEligibility();
initializeScheduleMonitor();
selectedTextQuickAddRuntime.initialize();

