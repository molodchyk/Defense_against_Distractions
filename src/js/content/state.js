// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  global.DAD.isExtensionContextAvailable = function() {
    return global.DAD.ChromePlatform?.isExtensionContextAvailable?.() || false;
  };

  global.DAD.safeRuntimeSendMessage = function(message, callback = null) {
    return global.DAD.ChromePlatform?.sendRuntimeMessage?.(message, callback) || false;
  };

  global.DAD.safeSyncStorageGet = function(keys, callback) {
    return global.DAD.ChromePlatform?.getSync?.(keys, callback) || false;
  };

  global.DAD.safeSyncStorageSet = function(items, callback = null) {
    return global.DAD.ChromePlatform?.setSync?.(items, callback) || false;
  };

  global.DAD.safeSyncStorageRemove = function(keys, callback = null) {
    return global.DAD.ChromePlatform?.removeSync?.(keys, callback) || false;
  };

  global.DAD.safeSyncStorageGetBytesInUse = function(keys, callback) {
    return global.DAD.ChromePlatform?.getBytesInUseSync?.(keys, callback) || false;
  };

  global.DAD.safeLocalStorageGet = function(keys, callback) {
    return global.DAD.ChromePlatform?.getLocal?.(keys, callback) || false;
  };

  global.DAD.safeLocalStorageSet = function(items, callback = null) {
    return global.DAD.ChromePlatform?.setLocal?.(items, callback) || false;
  };

  global.DAD.safeStorageOnChangedAddListener = function(listener) {
    return global.DAD.ChromePlatform?.addStorageChangeListener?.(listener) || false;
  };

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
    if (typeof global.structuralTriggerKeys === 'undefined') {
      global.structuralTriggerKeys = new Set();
    }
    if (typeof global.keywordObserver === 'undefined') {
      global.keywordObserver = null;
    }
    if (typeof global.blockedPageRenderInterval === 'undefined') {
      global.blockedPageRenderInterval = null;
    }
    if (typeof global.blockedPageMediaInterval === 'undefined') {
      global.blockedPageMediaInterval = null;
    }
    if (typeof global.blockedPagePomodoroInterval === 'undefined') {
      global.blockedPagePomodoroInterval = null;
    }
    if (typeof global.pomodoroStrictBreakInterval === 'undefined') {
      global.pomodoroStrictBreakInterval = null;
    }
    if (typeof global.structuralTimeTriggerInterval === 'undefined') {
      global.structuralTimeTriggerInterval = null;
    }
    if (typeof global.pomodoroStrictBreakBlockActive === 'undefined') {
      global.pomodoroStrictBreakBlockActive = false;
    }
    if (typeof global.blockedPageEventGuardsInstalled === 'undefined') {
      global.blockedPageEventGuardsInstalled = false;
    }
    if (typeof global.blockedPageNavigationGuardsInstalled === 'undefined') {
      global.blockedPageNavigationGuardsInstalled = false;
    }
    if (typeof global.blockDiagnostics === 'undefined') {
      global.blockDiagnostics = {
        triggers: [],
        blockedAt: null,
        finalScore: 0
      };
    }
  };

  global.DAD.resetPageState = function() {
    global.pageBlocked = false;
    global.pageScore = 0;
    global.pomodoroStrictBreakBlockActive = false;
    global.processedNodes.clear();
    global.structuralTriggerKeys.clear();
    global.parsedKeywords = [];
    global.blockDiagnostics = {
      triggers: [],
      blockedAt: null,
      finalScore: 0
    };
    global.DAD.disconnectKeywordObserver();
    global.DAD.ContentBlocking?.siteCheck?.clearStructuralTimeTriggerMonitor?.();
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

    if (global.blockedPageMediaInterval) {
      global.clearInterval(global.blockedPageMediaInterval);
      global.blockedPageMediaInterval = null;
    }

    global.DAD.ContentBlocking?.media?.restorePageMedia?.('blockEnded');
    global.DAD.safeRuntimeSendMessage({ action: 'restoreBlockedTabMute' });

    if (global.blockedPagePomodoroInterval) {
      global.clearInterval(global.blockedPagePomodoroInterval);
      global.blockedPagePomodoroInterval = null;
    }
  };
})(window);
