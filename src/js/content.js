// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD.initializePageState();

  const { SITE_CHECK_MESSAGE } = global.DAD.ContentBlocking.constants;
  const { performSiteCheck } = global.DAD.ContentBlocking.siteCheck;

  function initializeContentScript() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        performSiteCheck();
      }, { once: true });
      return;
    }

    performSiteCheck();
  }

  initializeContentScript();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === SITE_CHECK_MESSAGE) {
      performSiteCheck();
      sendResponse({ status: 'Site check performed' });
    }

    if (message.action === 'startElementPicker') {
      global.DAD.startElementPicker({
        strategy: message.strategy || 'samePosition',
        minScore: message.minScore,
        ancestorDepth: message.ancestorDepth,
        labelMatch: message.labelMatch || 'prefer'
      });
      sendResponse({ status: 'Element picker started' });
    }

    if (message.action === 'forceBlockPage') {
      global.DAD.ContentBlocking.blocker.blockPage({
        fromTopFrameRequest: true,
        diagnostics: message.diagnostics
      });
      sendResponse({ status: 'Top frame blocked' });
    }

    if (message.action === 'getBlockDebugState') {
      const overlay = document.getElementById('dad-block-overlay');
      sendResponse({
        pageBlocked: Boolean(global.pageBlocked),
        pageScore: global.pageScore,
        hasOverlay: Boolean(overlay),
        overlayParent: overlay?.parentElement?.tagName || null,
        readyState: document.readyState,
        url: global.location.href,
        isTopFrame: global.top === global.self
      });
    }
  });

  global.onpageshow = function(event) {
    if (event.persisted) {
      global.DAD.resetPageState();

      document.addEventListener('DOMContentLoaded', function() {
        performSiteCheck();
      });

      const readyStateCheckInterval = global.setInterval(function() {
        if (document.readyState === 'complete') {
          global.clearInterval(readyStateCheckInterval);
          performSiteCheck();
        }
      }, 10);
    }
  };
})(window);
