// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};

  global.DAD.ContentBlocking.constants = {
    BLOCK_SCORE_THRESHOLD: 1000,
    DEFAULT_CONTEXT_WORDS: 15,
    DEFAULT_CONTEXT_LENGTH: 100,
    SITE_CHECK_MESSAGE: 'performSiteCheck',
    BLOCK_OVERLAY_ID: 'dad-block-overlay',
    BLOCK_EVENT_OPTIONS: { capture: true, passive: false },
    MEDIA_SUSPEND_INTERVAL_MS: 500
  };
})(window);
