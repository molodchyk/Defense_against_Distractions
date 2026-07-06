// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function addActionClickedListener(listener) {
  chrome.action.onClicked.addListener(listener);
  return () => chrome.action.onClicked.removeListener(listener);
}

export function setBadgeText(details) {
  try {
    chrome.action.setBadgeText(details);
    return true;
  } catch (error) {
    return false;
  }
}

export async function openActionPopup(options = undefined) {
  try {
    if (!chrome.action?.openPopup) {
      return false;
    }

    await chrome.action.openPopup(options);
    return true;
  } catch (error) {
    return false;
  }
}
