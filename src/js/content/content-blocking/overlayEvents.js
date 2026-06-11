// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_OVERLAY_ID,
    BLOCK_EVENT_OPTIONS
  } = contentBlocking.constants;

  function suppressBlockedPageEvent(event) {
    if (!global.pageBlocked) {
      return;
    }

    const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const isOverlayEvent = eventPath.some(target => {
      return target?.id === BLOCK_OVERLAY_ID;
    });
    if (isOverlayEvent) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function installBlockedPageEventGuards() {
    if (global.blockedPageEventGuardsInstalled) {
      return;
    }

    [
      'click',
      'dblclick',
      'auxclick',
      'contextmenu',
      'keydown',
      'keyup',
      'keypress',
      'pointerdown',
      'pointerup',
      'touchstart',
      'touchend',
      'submit'
    ].forEach(eventName => {
      global.addEventListener(eventName, suppressBlockedPageEvent, BLOCK_EVENT_OPTIONS);
    });

    global.blockedPageEventGuardsInstalled = true;
  }

  contentBlocking.overlayEvents = {
    installBlockedPageEventGuards,
    suppressBlockedPageEvent
  };
})(window);
