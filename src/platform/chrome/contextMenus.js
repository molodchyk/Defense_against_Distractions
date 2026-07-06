// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function canUseContextMenus() {
  try {
    return Boolean(chrome.contextMenus?.create && chrome.contextMenus?.onClicked);
  } catch (error) {
    return false;
  }
}

export function createContextMenu(details) {
  return new Promise((resolve, reject) => {
    try {
      let menuId = details?.id;
      menuId = chrome.contextMenus.create(details, () => {
        if (chrome.runtime?.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve(menuId);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function removeAllContextMenus() {
  return new Promise((resolve, reject) => {
    try {
      chrome.contextMenus.removeAll(() => {
        if (chrome.runtime?.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function addContextMenuClickedListener(listener) {
  chrome.contextMenus.onClicked.addListener(listener);
  return () => chrome.contextMenus.onClicked.removeListener(listener);
}
