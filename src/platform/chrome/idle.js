// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function hasIdleApi() {
  return Boolean(globalThis.chrome?.idle);
}

export function setIdleDetectionInterval(seconds) {
  globalThis.chrome.idle.setDetectionInterval(seconds);
}

export function addIdleStateChangeListener(listener) {
  globalThis.chrome.idle.onStateChanged.addListener(listener);

  return () => {
    globalThis.chrome.idle.onStateChanged.removeListener(listener);
  };
}

export function queryIdleState(seconds, callback) {
  globalThis.chrome.idle.queryState(seconds, callback);
}
