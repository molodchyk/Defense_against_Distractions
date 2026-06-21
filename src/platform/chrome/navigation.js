// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function addCommittedNavigationListener(listener) {
  if (!chrome.webNavigation?.onCommitted) {
    return () => {};
  }

  chrome.webNavigation.onCommitted.addListener(listener);
  return () => chrome.webNavigation.onCommitted.removeListener(listener);
}

export function addHistoryStateUpdatedNavigationListener(listener) {
  if (!chrome.webNavigation?.onHistoryStateUpdated) {
    return () => {};
  }

  chrome.webNavigation.onHistoryStateUpdated.addListener(listener);
  return () => chrome.webNavigation.onHistoryStateUpdated.removeListener(listener);
}
