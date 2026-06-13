// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};

  const STORAGE_KEY = 'blockedPageSettings';
  const MAX_CUSTOM_MESSAGE_LENGTH = 280;
  const DEFAULT_SETTINGS = Object.freeze({ customMessage: '' });
  let cachedSettings = DEFAULT_SETTINGS;
  let hasLoaded = false;
  let isLoading = false;
  let listenerInstalled = false;
  let listenerInstallAttempted = false;

  function normalizeCustomMessage(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_CUSTOM_MESSAGE_LENGTH);
  }

  function normalizeSettings(settings) {
    return {
      customMessage: normalizeCustomMessage(settings?.customMessage)
    };
  }

  function createElement() {
    const element = document.createElement('p');
    element.dataset.dadBlockCustomMessage = 'true';
    element.style.cssText = [
      'margin:14px 0 0',
      'padding-top:14px',
      'border-top:1px solid var(--dad-block-border)',
      'color:var(--dad-block-text)',
      'font:16px/1.45 Arial,sans-serif',
      'white-space:pre-wrap'
    ].join(';');
    applySettingsToElement(element, cachedSettings);
    ensureLoaded();
    installStorageListener();
    return element;
  }

  function refreshOverlay(overlay) {
    const element = overlay?.querySelector?.('[data-dad-block-custom-message]');
    if (!element) {
      return;
    }

    applySettingsToElement(element, cachedSettings);
    ensureLoaded();
    installStorageListener();
  }

  function applySettingsToElement(element, settingsValue) {
    const settings = normalizeSettings(settingsValue);
    element.textContent = settings.customMessage;
    element.hidden = !settings.customMessage;
  }

  function ensureLoaded() {
    if (hasLoaded || isLoading) {
      return;
    }

    if (typeof global.DAD.safeSyncStorageGet !== 'function') {
      hasLoaded = true;
      return;
    }

    isLoading = true;
    global.DAD.safeSyncStorageGet({ [STORAGE_KEY]: DEFAULT_SETTINGS }, result => {
      cachedSettings = normalizeSettings(result?.[STORAGE_KEY]);
      hasLoaded = true;
      isLoading = false;
      refreshRenderedElements();
    });
  }

  function installStorageListener() {
    if (listenerInstalled || listenerInstallAttempted) {
      return;
    }

    listenerInstallAttempted = true;
    listenerInstalled = global.DAD.safeStorageOnChangedAddListener?.((changes, areaName) => {
      if (areaName !== 'sync' || !changes[STORAGE_KEY]) {
        return;
      }

      cachedSettings = normalizeSettings(changes[STORAGE_KEY].newValue);
      hasLoaded = true;
      refreshRenderedElements();
    }) || false;
  }

  function refreshRenderedElements() {
    document.querySelectorAll('[data-dad-block-custom-message]').forEach(element => {
      applySettingsToElement(element, cachedSettings);
    });
  }

  contentBlocking.overlayCustomization = {
    createElement,
    refreshOverlay
  };
})(window);
