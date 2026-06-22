// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  function getRuntimeLastError() {
    try {
      return global.chrome?.runtime?.lastError || null;
    } catch (error) {
      return error;
    }
  }

  function isExtensionContextAvailable() {
    try {
      return Boolean(global.chrome?.runtime?.id);
    } catch (error) {
      return false;
    }
  }

  function sendRuntimeMessage(message, callback = null) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.runtime?.sendMessage) {
        if (callback) callback(null);
        return false;
      }

      global.chrome.runtime.sendMessage(message, response => {
        if (callback) callback(getRuntimeLastError() ? null : response);
      });
      return true;
    } catch (error) {
      if (callback) callback(null);
      return false;
    }
  }

  function addRuntimeMessageListener(listener) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.runtime?.onMessage?.addListener) {
        return false;
      }

      global.chrome.runtime.onMessage.addListener(listener);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getExtensionUrl(path = '') {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.runtime?.getURL) {
        return path;
      }

      return global.chrome.runtime.getURL(path);
    } catch (error) {
      return path;
    }
  }

  function getI18nMessage(messageKey, substitutions) {
    try {
      return global.chrome?.i18n?.getMessage?.(messageKey, substitutions) || '';
    } catch (error) {
      return '';
    }
  }

  function getUiLanguage() {
    try {
      return global.chrome?.i18n?.getUILanguage?.() || '';
    } catch (error) {
      return '';
    }
  }

  function getSync(keys, callback) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.storage?.sync?.get) {
        callback(null);
        return false;
      }

      global.chrome.storage.sync.get(keys, result => {
        callback(getRuntimeLastError() ? null : result);
      });
      return true;
    } catch (error) {
      callback(null);
      return false;
    }
  }

  function setSync(items, callback = null) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.storage?.sync?.set) {
        if (callback) callback(false);
        return false;
      }

      global.chrome.storage.sync.set(items, () => {
        if (callback) callback(!getRuntimeLastError());
      });
      return true;
    } catch (error) {
      if (callback) callback(false);
      return false;
    }
  }

  function removeSync(keys, callback = null) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.storage?.sync?.remove) {
        if (callback) callback(false);
        return false;
      }

      global.chrome.storage.sync.remove(keys, () => {
        if (callback) callback(!getRuntimeLastError());
      });
      return true;
    } catch (error) {
      if (callback) callback(false);
      return false;
    }
  }

  function getBytesInUseSync(keys, callback) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.storage?.sync?.getBytesInUse) {
        callback(null);
        return false;
      }

      global.chrome.storage.sync.getBytesInUse(keys, bytesInUse => {
        callback(getRuntimeLastError() ? null : bytesInUse);
      });
      return true;
    } catch (error) {
      callback(null);
      return false;
    }
  }

  function getSyncQuotaBytes(fallback = 0) {
    try {
      return global.chrome?.storage?.sync?.QUOTA_BYTES || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getLocal(keys, callback) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.storage?.local?.get) {
        callback(null);
        return false;
      }

      global.chrome.storage.local.get(keys, result => {
        callback(getRuntimeLastError() ? null : result);
      });
      return true;
    } catch (error) {
      callback(null);
      return false;
    }
  }

  function setLocal(items, callback = null) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.storage?.local?.set) {
        if (callback) callback(false);
        return false;
      }

      global.chrome.storage.local.set(items, () => {
        if (callback) callback(!getRuntimeLastError());
      });
      return true;
    } catch (error) {
      if (callback) callback(false);
      return false;
    }
  }

  function addStorageChangeListener(listener) {
    try {
      if (!isExtensionContextAvailable() || !global.chrome?.storage?.onChanged?.addListener) {
        return false;
      }

      global.chrome.storage.onChanged.addListener(listener);
      return true;
    } catch (error) {
      return false;
    }
  }

  global.DAD.ChromePlatform = {
    addRuntimeMessageListener,
    addStorageChangeListener,
    getBytesInUseSync,
    getExtensionUrl,
    getI18nMessage,
    getLocal,
    getSync,
    getSyncQuotaBytes,
    getUiLanguage,
    isExtensionContextAvailable,
    removeSync,
    sendRuntimeMessage,
    setLocal,
    setSync
  };
})(window);
