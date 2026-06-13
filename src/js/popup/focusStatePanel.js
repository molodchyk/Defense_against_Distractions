// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  FOCUS_STATE_LEVELS,
  getFocusStateThresholdAdjustment,
  normalizeFocusStateSignal
} from '../shared/self-state/focusState.js';

const FOCUS_STATE_BUTTONS = [
  ['focusStateCalmButton', FOCUS_STATE_LEVELS.CALM],
  ['focusStateStrainedButton', FOCUS_STATE_LEVELS.STRAINED],
  ['focusStateVulnerableButton', FOCUS_STATE_LEVELS.VULNERABLE]
];

export function createFocusStatePanel({
  getMessage,
  sendRuntimeMessage,
  setStatus,
  onStateChange,
  onAfterChange
}) {
  let latestSignal = normalizeFocusStateSignal();

  function getLabel(level) {
    if (level === FOCUS_STATE_LEVELS.VULNERABLE) {
      return getMessage('popupFocusStateVulnerable');
    }

    if (level === FOCUS_STATE_LEVELS.STRAINED) {
      return getMessage('popupFocusStateStrained');
    }

    return getMessage('popupFocusStateCalm');
  }

  function formatExpiry(signal) {
    if (!signal.activeUntil) {
      return getMessage('popupFocusStateNoExpiry');
    }

    const date = new Date(signal.activeUntil);
    if (!Number.isFinite(date.getTime())) {
      return getMessage('popupFocusStateNoExpiry');
    }

    return getMessage('popupFocusStateUntil', [date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })]);
  }

  function setButtonsDisabled(disabled) {
    FOCUS_STATE_BUTTONS.forEach(([elementId]) => {
      const button = document.getElementById(elementId);
      if (button) {
        button.disabled = Boolean(disabled);
      }
    });
  }

  function render(signal = latestSignal) {
    latestSignal = normalizeFocusStateSignal(signal);
    const badge = document.getElementById('focusStateBadge');
    const detail = document.getElementById('focusStateDetail');
    const thresholdAdjustment = getFocusStateThresholdAdjustment(latestSignal);

    if (badge) {
      badge.textContent = getLabel(latestSignal.level);
      badge.dataset.state = latestSignal.level;
    }

    if (detail) {
      detail.textContent = thresholdAdjustment > 0
        ? getMessage('popupFocusStateStrictness', [String(thresholdAdjustment), formatExpiry(latestSignal)])
        : formatExpiry(latestSignal);
    }

    FOCUS_STATE_BUTTONS.forEach(([elementId, level]) => {
      const button = document.getElementById(elementId);
      if (!button) return;
      button.setAttribute('aria-pressed', String(latestSignal.level === level));
    });

    onStateChange?.(latestSignal);
  }

  async function refresh() {
    const response = await sendRuntimeMessage({ action: 'getFocusStateSignal' });
    render(response?.focusStateSignal);
    return latestSignal;
  }

  async function setLevel(level) {
    setButtonsDisabled(true);
    try {
      const response = await sendRuntimeMessage({
        action: 'setFocusStateSignal',
        level
      });
      render(response?.focusStateSignal);
      setStatus(response?.status === 'saved'
        ? getMessage('popupFocusStateSaved')
        : getMessage('popupFocusStateFailed'));
      if (response?.status === 'saved') {
        await onAfterChange?.();
      }
    } finally {
      setButtonsDisabled(false);
    }
  }

  function getSnapshot() {
    return latestSignal;
  }

  function getSummary(signal = latestSignal) {
    const normalizedSignal = normalizeFocusStateSignal(signal);
    const thresholdAdjustment = getFocusStateThresholdAdjustment(normalizedSignal);

    return {
      state: thresholdAdjustment > 0 ? 'ready' : 'idle',
      text: thresholdAdjustment > 0
        ? `${getLabel(normalizedSignal.level)} +${thresholdAdjustment}`
        : getLabel(normalizedSignal.level),
      thresholdAdjustment,
      level: normalizedSignal.level,
      activeUntil: normalizedSignal.activeUntil
    };
  }

  return {
    getSnapshot,
    getSummary,
    refresh,
    render,
    setLevel
  };
}
