// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_OVERLAY_ID
  } = contentBlocking.constants;
  const getLocalizedMessage = contentBlocking.overlayMessages?.getLocalizedMessage || ((key, fallback) => fallback);
  const POMODORO_BREAK_PHASES = new Set(['shortBreak', 'longBreak']);

  function createElement() {
    const wrapper = document.createElement('div');
    wrapper.dataset.dadPomodoro = 'true';
    wrapper.hidden = true;

    const title = document.createElement('p');
    title.dataset.dadPomodoroTitle = 'true';
    title.textContent = getLocalizedMessage('popupPomodoroTitle', 'Pomodoro');

    const timer = document.createElement('span');
    timer.dataset.dadPomodoroTime = 'true';
    timer.textContent = '0:00';

    const message = document.createElement('span');
    message.dataset.dadPomodoroMessage = 'true';

    wrapper.appendChild(title);
    wrapper.appendChild(timer);
    wrapper.appendChild(message);
    return wrapper;
  }

  function requestState(callback) {
    global.DAD.safeRuntimeSendMessage({ action: 'getPomodoroState' }, callback);
  }

  function getBlockedPageMessage(payload) {
    const phase = payload?.timerStatus?.phase;
    const planName = payload?.plan?.name || 'active plan';
    const phaseLabel = payload?.timerStatus?.phaseLabel || 'Pomodoro';

    if (phase === 'shortBreak' || phase === 'longBreak') {
      return getLocalizedMessage(
        'blockedPomodoroBreakMessage',
        '$1: $2 active. Return when this reaches zero.',
        [planName, phaseLabel.toLowerCase()]
      );
    }

    return '';
  }

  function clearElement(wrapper) {
    wrapper.hidden = true;
    const time = wrapper.querySelector('[data-dad-pomodoro-time]');
    const message = wrapper.querySelector('[data-dad-pomodoro-message]');
    if (time) {
      time.textContent = '';
    }
    if (message) {
      message.textContent = '';
    }
  }

  function isStrictBreakPayload(payload) {
    return Boolean(
      payload?.plan?.pomodoro?.strictBreaks
        && payload.plan.active
        && POMODORO_BREAK_PHASES.has(payload?.timerStatus?.phase)
    );
  }

  function renderState(overlay, payload) {
    const wrapper = overlay.querySelector('[data-dad-pomodoro]');
    if (!wrapper) {
      return;
    }

    const shouldShow = Boolean(payload?.plan && isStrictBreakPayload(payload));
    wrapper.hidden = !shouldShow;
    if (!shouldShow) {
      clearElement(wrapper);
      return;
    }

    wrapper.querySelector('[data-dad-pomodoro-time]').textContent = payload.timerStatus.remainingText || '0:00';
    wrapper.querySelector('[data-dad-pomodoro-message]').textContent = getBlockedPageMessage(payload);
  }

  function isStrictBreakDiagnostics() {
    return global.blockDiagnostics?.pomodoroStrictBreak === true;
  }

  function hasRecordedContentBlockTrigger() {
    const triggers = Array.isArray(global.blockDiagnostics?.triggers) ? global.blockDiagnostics.triggers : [];
    return triggers.some(trigger => trigger?.source !== 'pomodoro') && !isStrictBreakDiagnostics();
  }

  function hasAnyBlockTrigger() {
    return Array.isArray(global.blockDiagnostics?.triggers) && global.blockDiagnostics.triggers.length > 0;
  }

  function clearStalePomodoroOnlyBlock(payload) {
    const hasOverlay = Boolean(document.getElementById(BLOCK_OVERLAY_ID));
    if ((!global.pageBlocked && !hasOverlay) || isStrictBreakPayload(payload)) {
      return false;
    }

    if (hasRecordedContentBlockTrigger()) {
      return false;
    }

    if (!isStrictBreakDiagnostics() && hasAnyBlockTrigger()) {
      return false;
    }

    global.pomodoroStrictBreakBlockActive = false;
    global.DAD.resetPageState();
    global.DAD.ContentBlocking?.siteCheck?.performSiteCheck?.();
    return true;
  }

  function updatePanel(overlay) {
    requestState(payload => {
      if (clearStalePomodoroOnlyBlock(payload)) {
        return;
      }

      renderState(overlay, payload);
    });
  }

  contentBlocking.overlayPomodoro = {
    createElement,
    isStrictBreakPayload,
    renderState,
    updatePanel
  };
})(window);
