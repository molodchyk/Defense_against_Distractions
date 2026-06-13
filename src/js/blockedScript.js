// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  safeRuntimeSendMessage,
  safeStorageOnChangedAddListener,
  safeSyncStorageGet
} from './blocked/chromeApi.js';
import { initBlockedPageLocalization } from './blocked/localization.js';
import { initBlockedPageCustomMessage } from './blocked/customMessage.js';
import { initBlockedPageTheme } from './blocked/theme.js';
import { initBlockedPomodoroPanel } from './blocked/pomodoroPanel.js';

const localizer = initBlockedPageLocalization({
  safeSyncStorageGet,
  safeStorageOnChangedAddListener
});

initBlockedPageTheme({
  safeSyncStorageGet,
  safeStorageOnChangedAddListener
});

initBlockedPageCustomMessage({
  safeSyncStorageGet,
  safeStorageOnChangedAddListener
});

initBlockedPomodoroPanel({
  safeRuntimeSendMessage,
  getMessage: localizer.getMessage
});
