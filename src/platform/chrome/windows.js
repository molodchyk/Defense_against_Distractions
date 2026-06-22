// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function getNoFocusedWindowId() {
  return chrome.windows?.WINDOW_ID_NONE ?? -1;
}

export function canCreateWindow() {
  return Boolean(chrome.windows?.create);
}

export function addWindowFocusChangedListener(listener) {
  if (!chrome.windows?.onFocusChanged) {
    return () => {};
  }

  chrome.windows.onFocusChanged.addListener(listener);
  return () => chrome.windows.onFocusChanged.removeListener(listener);
}

export function createWindow(createData) {
  return new Promise((resolve, reject) => {
    if (!canCreateWindow()) {
      reject(new Error('chrome.windows.create is unavailable.'));
      return;
    }

    chrome.windows.create(createData, createdWindow => {
      if (chrome.runtime.lastError || !Number.isFinite(Number(createdWindow?.id))) {
        reject(chrome.runtime.lastError || new Error('Window could not be created.'));
        return;
      }

      resolve(createdWindow);
    });
  });
}
