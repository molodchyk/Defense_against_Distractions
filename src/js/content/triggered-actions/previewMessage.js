// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const triggeredActions = global.DAD.TriggeredActions = global.DAD.TriggeredActions || {};

  const PREVIEW_TRIGGERED_ACTION_CHAIN_MESSAGE = 'previewTriggeredActionChain';

  function handlePreviewMessage(message, sendResponse) {
    if (message?.action !== PREVIEW_TRIGGERED_ACTION_CHAIN_MESSAGE) {
      return undefined;
    }

    const previewChain = elementRules => {
      const preview = triggeredActions.runner?.previewTriggeredActionChain?.({
        chain: message.chain,
        elementRules,
        diagnostics: global.blockDiagnostics || null
      });
      sendResponse(preview || { status: 'unavailable' });
    };

    const loadElementRules = global.DAD.ElementBlocking?.storage?.loadElementRules;
    if (typeof loadElementRules === 'function') {
      loadElementRules(previewChain);
      return true;
    }

    previewChain(global.DAD.activeElementBlockRules || []);
    return false;
  }

  triggeredActions.previewMessage = {
    PREVIEW_TRIGGERED_ACTION_CHAIN_MESSAGE,
    handlePreviewMessage
  };
})(window);
