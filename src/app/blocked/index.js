// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  safeRuntimeSendMessage,
  safeStorageOnChangedAddListener,
  safeSyncStorageGet
} from '../../features/content-blocking/blocked-page/chromeApi.js';
import { initBlockedPageLocalization } from '../../features/content-blocking/blocked-page/localization.js';
import { initBlockedPageCustomMessage } from '../../features/content-blocking/blocked-page/customMessage.js';
import { initBlockedPageTheme } from '../../features/content-blocking/blocked-page/theme.js';
import { initBlockedPomodoroPanel } from '../../features/content-blocking/blocked-page/pomodoroPanel.js';

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
