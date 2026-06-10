// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const { keepPageMediaSuspended } = contentBlocking.media;
  const {
    installBlockedPageEventGuards,
    keepBlockedPageRendered
  } = contentBlocking.overlay;

  function sendRuntimeMessage(message) {
    global.DAD.safeRuntimeSendMessage(message);
  }

  function isTopFrame() {
    try {
      return global.top === global.self;
    } catch (error) {
      return false;
    }
  }

  function getBlockDiagnosticsSnapshot() {
    return global.blockDiagnostics ? JSON.parse(JSON.stringify(global.blockDiagnostics)) : null;
  }

  function isPomodoroStrictBreakDiagnostics(diagnostics) {
    return diagnostics?.pomodoroStrictBreak === true;
  }

  function hasContentBlockDiagnostics() {
    const diagnostics = global.blockDiagnostics;
    const triggers = Array.isArray(diagnostics?.triggers) ? diagnostics.triggers : [];
    return triggers.some(trigger => trigger?.source !== 'pomodoro') && !isPomodoroStrictBreakDiagnostics(diagnostics);
  }

  function applyBlockDiagnostics(diagnostics) {
    if (!diagnostics) {
      return;
    }

    if (isPomodoroStrictBreakDiagnostics(diagnostics)) {
      global.pomodoroStrictBreakBlockActive = true;
      if (hasContentBlockDiagnostics()) {
        return;
      }
    }

    global.blockDiagnostics = diagnostics;
  }

  function requestTopFrameBlock(diagnostics = null) {
    sendRuntimeMessage({
      action: 'blockTopFrame',
      diagnostics: diagnostics || getBlockDiagnosticsSnapshot()
    });
  }

  function blockPage(options = {}) {
    applyBlockDiagnostics(options.diagnostics);

    if (global.pageBlocked) {
      return;
    }

    if (!options.fromTopFrameRequest && !isTopFrame()) {
      requestTopFrameBlock(getBlockDiagnosticsSnapshot());
    }

    global.pageBlocked = true;
    global.DAD.disconnectKeywordObserver();
    sendRuntimeMessage({ action: 'muteBlockedTab' });
    keepBlockedPageRendered();
    keepPageMediaSuspended();
    installBlockedPageEventGuards();
  }

  contentBlocking.blocker = {
    blockPage,
    requestTopFrameBlock,
    sendRuntimeMessage
  };
})(window);
