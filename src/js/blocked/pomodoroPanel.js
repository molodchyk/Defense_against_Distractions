// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const POMODORO_BREAK_PHASES = new Set(['shortBreak', 'longBreak']);

export function initBlockedPomodoroPanel({
  safeRuntimeSendMessage,
  getMessage
}) {
  function requestPomodoroState(callback) {
    safeRuntimeSendMessage({ action: 'getPomodoroState' }, callback);
  }

  function getPomodoroBlockedPageMessage(payload) {
    const phase = payload?.timerStatus?.phase;
    const planName = payload?.plan?.name || 'active plan';
    const phaseLabel = payload?.timerStatus?.phaseLabel || 'Pomodoro';

    if (phase === 'shortBreak' || phase === 'longBreak') {
      return getMessage(
        'blockedPomodoroBreakMessage',
        '$1: $2 active. Return when this reaches zero.',
        [planName, phaseLabel.toLowerCase()]
      );
    }

    return '';
  }

  function clearPomodoroBlockPanel(panel) {
    setText('pomodoroBlockPhase', '');
    setText('pomodoroBlockTimer', '');
    setText('pomodoroBlockMessage', '');
    panel.hidden = true;
  }

  function renderPomodoroState(payload) {
    const panel = document.getElementById('pomodoroBlockPanel');
    if (!panel) {
      return;
    }

    const phase = payload?.timerStatus?.phase || 'idle';
    const shouldShow = Boolean(
      payload?.plan?.pomodoro?.strictBreaks
        && payload.plan.active
        && POMODORO_BREAK_PHASES.has(phase)
    );
    panel.hidden = !shouldShow;

    if (!shouldShow) {
      clearPomodoroBlockPanel(panel);
      return;
    }

    setText('pomodoroBlockPhase', payload.timerStatus.phaseLabel || 'Pomodoro');
    setText('pomodoroBlockTimer', payload.timerStatus.remainingText || '0:00');
    setText('pomodoroBlockMessage', getPomodoroBlockedPageMessage(payload));
  }

  function refreshPomodoroState() {
    requestPomodoroState(renderPomodoroState);
  }

  refreshPomodoroState();
  return globalThis.setInterval(refreshPomodoroState, 1000);
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}
