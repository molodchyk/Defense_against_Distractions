// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  safeRuntimeSendMessage,
  safeStorageOnChangedAddListener,
  safeSyncStorageGet
} from '../../js/blocked/chromeApi.js';
import { initBlockedPageLocalization } from '../../js/blocked/localization.js';
import { initBlockedPageCustomMessage } from '../../js/blocked/customMessage.js';
import { initBlockedPageTheme } from '../../js/blocked/theme.js';
import { initBlockedPomodoroPanel } from '../../js/blocked/pomodoroPanel.js';

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
