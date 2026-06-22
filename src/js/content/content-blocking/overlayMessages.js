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

    return global.DAD.ChromePlatform?.getI18nMessage?.(messageKey, substitutions) || fallback;
  }

  contentBlocking.overlayMessages = {
    getLocalizedMessage
  };
})(window);
