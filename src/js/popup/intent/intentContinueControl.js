// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  INTENT_INTERVENTION_ACTIONS,
  MAX_INTENT_CONTINUE_REASON_LENGTH
} from '../../shared/intent/constants.js';
import {
  normalizeIntentFeedbackReason
} from '../../shared/intent/feedback.js';

const CONTINUE_ACTIONS = new Set([
  INTENT_INTERVENTION_ACTIONS.GRAYSCALE,
  INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE,
  INTENT_INTERVENTION_ACTIONS.PROMPT
]);

function getIntentAction(intervention = {}) {
  return String(intervention.action || intervention.settings?.action || '').trim();
}

export function normalizePopupIntentContinueReason(value) {
  return normalizeIntentFeedbackReason(value);
}

export function canContinueIntentIntervention(intervention = {}) {
  const settings = intervention?.settings || {};
  if (!settings.enabled || intervention?.shouldIntervene !== true) {
    return false;
  }

  if (intervention?.chainBlock?.active || intervention?.hardBlocked) {
    return false;
  }

  return CONTINUE_ACTIONS.has(getIntentAction(intervention));
}

export function getIntentContinueControlState({
  intervention = {},
  canActOnActiveTab = false,
  reason = ''
} = {}) {
  const normalizedReason = normalizePopupIntentContinueReason(reason);
  const available = canContinueIntentIntervention(intervention);
  let titleKey = '';

  if (!canActOnActiveTab) {
    titleKey = 'popupIntentContinueUnavailable';
  } else if (!available) {
    titleKey = 'popupIntentContinueUnavailable';
  } else if (!normalizedReason) {
    titleKey = 'popupIntentContinueReasonRequired';
  }

  return {
    available,
    disabled: Boolean(titleKey),
    maxLength: MAX_INTENT_CONTINUE_REASON_LENGTH,
    reason: normalizedReason,
    reasonLength: normalizedReason.length,
    titleKey
  };
}

export function clearIntentContinueReason() {
  const input = document.getElementById('intentContinueReasonInput');
  if (input) {
    input.value = '';
  }
}

export function renderIntentContinueControl({
  getMessage,
  intervention = {},
  canActOnActiveTab = false
}) {
  const control = document.getElementById('intentContinueReasonControl');
  const input = document.getElementById('intentContinueReasonInput');
  const count = document.getElementById('intentContinueReasonCount');
  const button = document.getElementById('continueIntentButton');
  const state = getIntentContinueControlState({
    intervention,
    canActOnActiveTab,
    reason: input?.value || ''
  });
  const title = state.titleKey ? getMessage(state.titleKey) : '';

  if (control) {
    control.hidden = !state.available;
    control.dataset.available = state.available ? 'true' : 'false';
  }

  if (input) {
    input.maxLength = state.maxLength;
    input.disabled = !state.available || !canActOnActiveTab;
    if (title && input.disabled) {
      input.title = title;
    } else {
      input.removeAttribute('title');
    }
  }

  if (count) {
    count.textContent = `${String(state.reasonLength)} / ${String(state.maxLength)}`;
  }

  if (button) {
    button.disabled = state.disabled;
    if (title) {
      button.title = title;
    } else {
      button.removeAttribute('title');
    }
  }

  return state;
}
