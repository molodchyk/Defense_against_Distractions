// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_EVENT_OPTIONS
  } = contentBlocking.constants;

  function neutralizeBeforeUnloadHandler() {
    try {
      global.onbeforeunload = null;
    } catch (error) {
      // Some pages lock down globals. The capture-phase guard still covers later listeners.
    }
  }

  function suppressBeforeUnloadPrompt(event) {
    if (!global.pageBlocked) {
      return undefined;
    }

    neutralizeBeforeUnloadHandler();
    event.stopImmediatePropagation();

    try {
      delete event.returnValue;
    } catch (error) {
      // Older browser shims can expose returnValue as non-configurable. Avoid setting it.
    }

    return undefined;
  }

  function reassertBlockedPage() {
    if (!global.pageBlocked) {
      return;
    }

    neutralizeBeforeUnloadHandler();
    contentBlocking.overlay?.renderBlockedPage?.();
    contentBlocking.media?.keepPageMediaSuspended?.();
  }

  function installBlockedPageNavigationGuards() {
    if (global.blockedPageNavigationGuardsInstalled) {
      reassertBlockedPage();
      return;
    }

    neutralizeBeforeUnloadHandler();
    global.addEventListener('beforeunload', suppressBeforeUnloadPrompt, BLOCK_EVENT_OPTIONS);
    [
      'focus',
      'hashchange',
      'pageshow',
      'popstate',
      'visibilitychange'
    ].forEach(eventName => {
      global.addEventListener(eventName, reassertBlockedPage, BLOCK_EVENT_OPTIONS);
    });
    global.blockedPageNavigationGuardsInstalled = true;
  }

  contentBlocking.navigationGuards = {
    installBlockedPageNavigationGuards,
    neutralizeBeforeUnloadHandler,
    reassertBlockedPage,
    suppressBeforeUnloadPrompt
  };
})(window);
