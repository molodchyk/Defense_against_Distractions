// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function getExtensionUrl(path = '') {
  return chrome.runtime.getURL(path);
}

export function isExtensionContextAvailable() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch (error) {
    return false;
  }
}

export function getManifest() {
  return chrome.runtime.getManifest();
}

export function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

export function addInstalledListener(listener) {
  chrome.runtime.onInstalled.addListener(listener);
  return () => chrome.runtime.onInstalled.removeListener(listener);
}

export function addStartupListener(listener) {
  chrome.runtime.onStartup.addListener(listener);
  return () => chrome.runtime.onStartup.removeListener(listener);
}

export function addRuntimeMessageListener(listener) {
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
