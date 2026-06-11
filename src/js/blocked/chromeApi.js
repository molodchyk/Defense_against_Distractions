// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function isExtensionContextAvailable() {
  try {
    return Boolean(globalThis.chrome?.runtime?.id);
  } catch (error) {
    return false;
  }
}

export function safeSyncStorageGet(keys, callback) {
  try {
    if (!isExtensionContextAvailable() || !globalThis.chrome?.storage?.sync?.get) {
      callback(null);
      return false;
    }

    globalThis.chrome.storage.sync.get(keys, result => {
      callback(hasRuntimeLastError() ? null : result);
    });
    return true;
  } catch (error) {
    callback(null);
    return false;
  }
}

export function safeRuntimeSendMessage(message, callback) {
  try {
    if (!isExtensionContextAvailable() || !globalThis.chrome?.runtime?.sendMessage) {
      callback(null);
      return false;
    }

    globalThis.chrome.runtime.sendMessage(message, response => {
      callback(hasRuntimeLastError() ? null : response);
    });
    return true;
  } catch (error) {
    callback(null);
    return false;
  }
}

export function safeStorageOnChangedAddListener(listener) {
  try {
    if (!isExtensionContextAvailable() || !globalThis.chrome?.storage?.onChanged?.addListener) {
      return false;
    }

    globalThis.chrome.storage.onChanged.addListener(listener);
    return true;
  } catch (error) {
    return false;
  }
}

function hasRuntimeLastError() {
  try {
    return Boolean(globalThis.chrome?.runtime?.lastError);
  } catch (error) {
    return true;
  }
}
