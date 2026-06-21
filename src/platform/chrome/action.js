// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function addActionClickedListener(listener) {
  chrome.action.onClicked.addListener(listener);
  return () => chrome.action.onClicked.removeListener(listener);
}
