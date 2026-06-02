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
    try {
      chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to send runtime message:', error);
    }
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

  function requestTopFrameBlock() {
    sendRuntimeMessage({
      action: 'blockTopFrame',
      diagnostics: getBlockDiagnosticsSnapshot()
    });
  }

  function blockPage(options = {}) {
    if (global.pageBlocked) return;

    if (!options.fromTopFrameRequest && !isTopFrame()) {
      requestTopFrameBlock();
    }

    if (options.diagnostics) {
      global.blockDiagnostics = options.diagnostics;
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
