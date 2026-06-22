// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isExtensionContextAvailable } from '../../../platform/chrome/runtime.js';
import { sendRuntimeMessage } from '../../../platform/chrome/runtimeMessages.js';
import { addStorageChangeListener, getSync } from '../../../platform/chrome/storage.js';

export { isExtensionContextAvailable };

export function safeSyncStorageGet(keys, callback) {
  try {
    if (!isExtensionContextAvailable()) {
      callback(null);
      return false;
    }

    getSync(keys).then(result => callback(result)).catch(() => callback(null));
    return true;
  } catch (error) {
    callback(null);
    return false;
  }
}

export function safeRuntimeSendMessage(message, callback) {
  try {
    if (!isExtensionContextAvailable()) {
      callback(null);
      return false;
    }

    sendRuntimeMessage(message).then(response => callback(response)).catch(() => callback(null));
    return true;
  } catch (error) {
    callback(null);
    return false;
  }
}

export function safeStorageOnChangedAddListener(listener) {
  try {
    if (!isExtensionContextAvailable()) {
      return false;
    }

    addStorageChangeListener(listener);
    return true;
  } catch (error) {
    return false;
  }
}
