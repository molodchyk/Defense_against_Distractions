// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function getNoFocusedWindowId() {
  return chrome.windows?.WINDOW_ID_NONE ?? -1;
}

export function addWindowFocusChangedListener(listener) {
  if (!chrome.windows?.onFocusChanged) {
    return () => {};
  }

  chrome.windows.onFocusChanged.addListener(listener);
  return () => chrome.windows.onFocusChanged.removeListener(listener);
}
