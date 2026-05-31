// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  global.DAD.initializePageState = function() {
    if (typeof global.pageScore === 'undefined') {
      global.pageScore = 0;
    }
    if (typeof global.parsedKeywords === 'undefined') {
      global.parsedKeywords = [];
    }
    if (typeof global.pageBlocked === 'undefined') {
      global.pageBlocked = false;
    }
    if (typeof global.processedNodes === 'undefined') {
      global.processedNodes = new Set();
    }
    if (typeof global.keywordObserver === 'undefined') {
      global.keywordObserver = null;
    }
    if (typeof global.blockedPageRenderInterval === 'undefined') {
      global.blockedPageRenderInterval = null;
    }
    if (typeof global.blockedPageEventGuardsInstalled === 'undefined') {
      global.blockedPageEventGuardsInstalled = false;
    }
  };

  global.DAD.resetPageState = function() {
    global.pageBlocked = false;
    global.pageScore = 0;
    global.processedNodes.clear();
    global.parsedKeywords = [];
    global.DAD.disconnectKeywordObserver();
    global.DAD.removeBlockedPageOverlay();
  };

  global.DAD.disconnectKeywordObserver = function() {
    if (global.keywordObserver) {
      global.keywordObserver.disconnect();
      global.keywordObserver = null;
    }
  };

  global.DAD.removeBlockedPageOverlay = function() {
    const overlay = global.document.getElementById('dad-block-overlay');
    if (overlay) {
      overlay.remove();
    }

    global.document.documentElement.style.overflow = '';
    if (global.document.body) {
      global.document.body.style.overflow = '';
    }

    if (global.blockedPageRenderInterval) {
      global.clearInterval(global.blockedPageRenderInterval);
      global.blockedPageRenderInterval = null;
    }
  };
})(window);
