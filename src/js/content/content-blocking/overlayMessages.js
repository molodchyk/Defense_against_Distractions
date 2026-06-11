// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};

  function getLocalizedMessage(messageKey, fallback, substitutions) {
    const selectedLanguageMessage = global.DAD.UiLanguage?.getMessage?.(messageKey, fallback, substitutions);
    if (selectedLanguageMessage) {
      return selectedLanguageMessage;
    }

    try {
      return chrome.i18n.getMessage(messageKey, substitutions) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  contentBlocking.overlayMessages = {
    getLocalizedMessage
  };
})(window);
