// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  global.DAD.isExtensionContextAvailable = function() {
    try {
      return Boolean(global.chrome?.runtime?.id);
    } catch (error) {
      return false;
    }
  };

  global.DAD.safeRuntimeSendMessage = function(message, callback = null) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.runtime?.sendMessage) {
        if (callback) callback(null);
        return false;
      }

      global.chrome.runtime.sendMessage(message, response => {
        let hasLastError = false;
        try {
          hasLastError = Boolean(global.chrome?.runtime?.lastError);
        } catch (error) {
          hasLastError = true;
        }

        if (callback) callback(hasLastError ? null : response);
      });
      return true;
    } catch (error) {
      if (callback) callback(null);
      return false;
    }
  };

  global.DAD.safeSyncStorageGet = function(keys, callback) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.storage?.sync?.get) {
        callback(null);
        return false;
      }

      global.chrome.storage.sync.get(keys, result => {
        let hasLastError = false;
        try {
          hasLastError = Boolean(global.chrome?.runtime?.lastError);
        } catch (error) {
          hasLastError = true;
        }

        callback(hasLastError ? null : result);
      });
      return true;
    } catch (error) {
      callback(null);
      return false;
    }
  };

  global.DAD.safeSyncStorageSet = function(items, callback = null) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.storage?.sync?.set) {
        if (callback) callback(false);
        return false;
      }

      global.chrome.storage.sync.set(items, () => {
        let hasLastError = false;
        try {
          hasLastError = Boolean(global.chrome?.runtime?.lastError);
        } catch (error) {
          hasLastError = true;
        }

        if (callback) callback(!hasLastError);
      });
      return true;
    } catch (error) {
      if (callback) callback(false);
      return false;
    }
  };

  global.DAD.safeSyncStorageRemove = function(keys, callback = null) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.storage?.sync?.remove) {
        if (callback) callback(false);
        return false;
      }

      global.chrome.storage.sync.remove(keys, () => {
        let hasLastError = false;
        try {
          hasLastError = Boolean(global.chrome?.runtime?.lastError);
        } catch (error) {
          hasLastError = true;
        }

        if (callback) callback(!hasLastError);
      });
      return true;
    } catch (error) {
      if (callback) callback(false);
      return false;
    }
  };

  global.DAD.safeSyncStorageGetBytesInUse = function(keys, callback) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.storage?.sync?.getBytesInUse) {
        callback(null);
        return false;
      }

      global.chrome.storage.sync.getBytesInUse(keys, bytesInUse => {
        let hasLastError = false;
        try {
          hasLastError = Boolean(global.chrome?.runtime?.lastError);
        } catch (error) {
          hasLastError = true;
        }

        callback(hasLastError ? null : bytesInUse);
      });
      return true;
    } catch (error) {
      callback(null);
      return false;
    }
  };

  global.DAD.safeLocalStorageGet = function(keys, callback) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.storage?.local?.get) {
        callback(null);
        return false;
      }

      global.chrome.storage.local.get(keys, result => {
        let hasLastError = false;
        try {
          hasLastError = Boolean(global.chrome?.runtime?.lastError);
        } catch (error) {
          hasLastError = true;
        }

        callback(hasLastError ? null : result);
      });
      return true;
    } catch (error) {
      callback(null);
      return false;
    }
  };

  global.DAD.safeLocalStorageSet = function(items, callback = null) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.storage?.local?.set) {
        if (callback) callback(false);
        return false;
      }

      global.chrome.storage.local.set(items, () => {
        let hasLastError = false;
        try {
          hasLastError = Boolean(global.chrome?.runtime?.lastError);
        } catch (error) {
          hasLastError = true;
        }

        if (callback) callback(!hasLastError);
      });
      return true;
    } catch (error) {
      if (callback) callback(false);
      return false;
    }
  };

  global.DAD.safeStorageOnChangedAddListener = function(listener) {
    try {
      if (!global.DAD.isExtensionContextAvailable() || !global.chrome?.storage?.onChanged?.addListener) {
        return false;
      }

      global.chrome.storage.onChanged.addListener(listener);
      return true;
    } catch (error) {
      return false;
    }
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
    if (typeof global.pomodoroStrictBreakBlockActive === 'undefined') {
      global.pomodoroStrictBreakBlockActive = false;
    }
    if (typeof global.blockedPageEventGuardsInstalled === 'undefined') {
      global.blockedPageEventGuardsInstalled = false;
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
    global.parsedKeywords = [];
    global.blockDiagnostics = {
      triggers: [],
      blockedAt: null,
      finalScore: 0
    };
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
