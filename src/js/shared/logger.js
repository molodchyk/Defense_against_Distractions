// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const DEBUG_STORAGE_KEY = 'debugLogging';

export function debugLog(...args) {
  if (!isDebugLoggingEnabled()) {
    return;
  }

  console.debug('[Defense against Distractions]', ...args);
}

function isDebugLoggingEnabled() {
  try {
    return globalThis.localStorage?.getItem(DEBUG_STORAGE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}
