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

  function blockPage() {
    if (global.pageBlocked) return;

    global.pageBlocked = true;
    global.DAD.disconnectKeywordObserver();
    sendRuntimeMessage({ action: 'muteBlockedTab' });
    keepPageMediaSuspended();
    installBlockedPageEventGuards();
    keepBlockedPageRendered();
  }

  contentBlocking.blocker = {
    blockPage,
    sendRuntimeMessage
  };
})(window);
