// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const TRIGGERED_ACTION_CHAIN_VERSION = 1;

export const TRIGGERED_ACTION_TRIGGER_TYPES = Object.freeze({
  KEYWORD_BLOCK: 'keywordBlock',
  BLOCK_SCORE: 'blockScore',
  STRUCTURAL: 'structural'
});

export const TRIGGERED_ACTION_STEP_TYPES = Object.freeze({
  CLICK_ONCE: 'clickOnce',
  CLEAR_FIELD: 'clearField',
  PAUSE_MEDIA: 'pauseMedia',
  HIDE_ELEMENT: 'hideElement',
  HIDE_IMAGES: 'hideImages',
  DISABLE_CONTROLS: 'disableControls',
  BLOCK_PAGE: 'blockPage',
  WAIT_FOR_ELEMENT: 'waitForElement',
  STOP: 'stop'
});

export const TRIGGERED_ACTION_RESULTS = Object.freeze({
  MATCHED: 'matched',
  NOT_MATCHED: 'notMatched',
  AMBIGUOUS: 'ambiguous',
  DISABLED: 'disabled',
  HOST_MISMATCH: 'hostMismatch',
  RAN: 'ran',
  FAILED: 'failed',
  FALLBACK_BLOCKED: 'fallbackBlocked',
  BLOCKED: 'blocked'
});

export const allowedTriggeredActionTriggerTypes = new Set(Object.values(TRIGGERED_ACTION_TRIGGER_TYPES));
export const allowedTriggeredActionStepTypes = new Set(Object.values(TRIGGERED_ACTION_STEP_TYPES));
export const allowedTriggeredActionResults = new Set(Object.values(TRIGGERED_ACTION_RESULTS));

export const destructiveTriggeredActionStepTypes = new Set([
  TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE,
  TRIGGERED_ACTION_STEP_TYPES.CLEAR_FIELD
]);

export const triggeredActionStepStrictnessRank = {
  [TRIGGERED_ACTION_STEP_TYPES.STOP]: 0,
  [TRIGGERED_ACTION_STEP_TYPES.WAIT_FOR_ELEMENT]: 1,
  [TRIGGERED_ACTION_STEP_TYPES.HIDE_ELEMENT]: 2,
  [TRIGGERED_ACTION_STEP_TYPES.HIDE_IMAGES]: 2,
  [TRIGGERED_ACTION_STEP_TYPES.DISABLE_CONTROLS]: 2,
  [TRIGGERED_ACTION_STEP_TYPES.PAUSE_MEDIA]: 2,
  [TRIGGERED_ACTION_STEP_TYPES.CLEAR_FIELD]: 3,
  [TRIGGERED_ACTION_STEP_TYPES.CLICK_ONCE]: 3,
  [TRIGGERED_ACTION_STEP_TYPES.BLOCK_PAGE]: 4
};
