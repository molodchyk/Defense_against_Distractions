// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const triggeredActions = global.DAD.TriggeredActions = global.DAD.TriggeredActions || {};

  const STEP_TYPES = {
    CLICK_ONCE: 'clickOnce',
    CLEAR_FIELD: 'clearField',
    PAUSE_MEDIA: 'pauseMedia',
    HIDE_ELEMENT: 'hideElement',
    HIDE_IMAGES: 'hideImages',
    DISABLE_CONTROLS: 'disableControls',
    BLOCK_PAGE: 'blockPage',
    WAIT_FOR_ELEMENT: 'waitForElement',
    STOP: 'stop'
  };

  const TRIGGER_TYPES = {
    KEYWORD_BLOCK: 'keywordBlock',
    BLOCK_SCORE: 'blockScore',
    STRUCTURAL: 'structural'
  };

  const RESULTS = {
    MATCHED: 'matched',
    NOT_MATCHED: 'notMatched',
    AMBIGUOUS: 'ambiguous',
    DISABLED: 'disabled',
    HOST_MISMATCH: 'hostMismatch',
    RAN: 'ran',
    FAILED: 'failed',
    FALLBACK_BLOCKED: 'fallbackBlocked',
    BLOCKED: 'blocked'
  };

  triggeredActions.constants = {
    MAX_OUTCOME_EVENTS: 12,
    NORMALIZED_SCORE_THRESHOLD: 100,
    RESULTS,
    STEP_TO_ELEMENT_ACTION: {
      [STEP_TYPES.CLICK_ONCE]: 'click',
      [STEP_TYPES.CLEAR_FIELD]: 'clear',
      [STEP_TYPES.PAUSE_MEDIA]: 'pauseMedia',
      [STEP_TYPES.HIDE_ELEMENT]: 'hide',
      [STEP_TYPES.HIDE_IMAGES]: 'hideImages',
      [STEP_TYPES.DISABLE_CONTROLS]: 'disableControls'
    },
    STEP_TYPES,
    TRIGGER_TYPES,
    supportedStepTypes: new Set(Object.values(STEP_TYPES)),
    supportedTriggerTypes: new Set(Object.values(TRIGGER_TYPES))
  };
})(window);
