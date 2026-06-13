// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};

  intent.constants = {
    PROMPT_ID: 'dad-intent-intervention',
    STYLE_ID: 'dad-intent-intervention-style',
    GRAYSCALE_ACTION: 'grayscale',
    REDUCE_NOISE_ACTION: 'reduceNoise',
    GRAYSCALE_ATTRIBUTE: 'data-dad-intent-grayscale',
    THEME_STORAGE_KEY: 'uiThemeMode',
    DEFAULT_THEME_MODE: 'system',
    THEME_QUERY: '(prefers-color-scheme: dark)',
    CHECK_INTERVAL_MS: 4500,
    FIRST_CHECK_DELAY_MS: 1600,
    DISMISS_DURATION_MS: 30 * 60 * 1000,
    CONTINUE_REASON_MAX_LENGTH: 160
  };
})(window);
