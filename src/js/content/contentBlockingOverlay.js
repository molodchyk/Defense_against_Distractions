// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_OVERLAY_ID,
    BLOCK_EVENT_OPTIONS
  } = contentBlocking.constants;

  function getLocalizedMessage(messageKey, fallback) {
    return chrome.i18n.getMessage(messageKey) || fallback;
  }

  function createBlockedOverlay() {
    const overlay = document.createElement('div');
    overlay.id = BLOCK_OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    applyOverlayHostStyle(overlay);
    const title = getLocalizedMessage('contentBlockedTitle', 'Content Blocked');
    const message = getLocalizedMessage(
      'contentBlockedMessage',
      'This page contains restricted content and has been blocked for your protection.'
    );
    const diagnostics = getBlockedPageDiagnostics();

    const content = document.createElement('div');
    content.style.cssText = [
      'box-sizing:border-box',
      'width:min(620px,100%)',
      'padding:30px 34px',
      'border:1px solid #323b4b',
      'border-radius:8px',
      'background:#171b22',
      'box-shadow:0 18px 44px rgba(0,0,0,.28)'
    ].join(';');

    const heading = document.createElement('h1');
    heading.style.cssText = 'margin:0 0 16px;color:#ff4444;font:700 32px/1.2 Arial,sans-serif';
    heading.textContent = title;

    const paragraph = document.createElement('p');
    paragraph.style.cssText = 'margin:0;color:#c3cad6;font:18px/1.45 Arial,sans-serif';
    paragraph.textContent = message;

    content.appendChild(heading);
    content.appendChild(paragraph);
    content.appendChild(createDiagnosticsElement(diagnostics));
    overlay.appendChild(content);

    return overlay;
  }

  function applyOverlayHostStyle(overlay) {
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'box-sizing:border-box',
      'background:#101216',
      'color:#ffffff',
      'font:16px/1.5 Arial,sans-serif',
      'text-align:center',
      'pointer-events:auto'
    ].join(';');
    overlay.hidden = false;
  }

  function createDiagnosticsElement(diagnostics) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'margin-top:18px',
      'padding-top:14px',
      'border-top:1px solid #323b4b',
      'color:#d7e0e7',
      'font:15px/1.45 Arial,sans-serif',
      'text-align:left'
    ].join(';');

    if (!diagnostics) {
      wrapper.hidden = true;
      return wrapper;
    }

    const trigger = document.createElement('div');
    trigger.innerHTML = '<strong style="color:#fff">Triggered by:</strong> ';
    trigger.appendChild(document.createTextNode(diagnostics.keyword || 'unknown'));

    const score = document.createElement('div');
    score.innerHTML = '<strong style="color:#fff">Score:</strong> ';
    score.appendChild(document.createTextNode(`${Math.round(diagnostics.finalScore)} (${diagnostics.operation}${diagnostics.value})`));

    const context = document.createElement('div');
    context.style.cssText = 'margin-top:8px;color:#d7e0e7;overflow-wrap:anywhere';
    context.textContent = diagnostics.contextText ? `Context: ${diagnostics.contextText}` : '';

    wrapper.appendChild(trigger);
    wrapper.appendChild(score);
    wrapper.appendChild(context);
    return wrapper;
  }

  function getBlockedPageDiagnostics() {
    const diagnostics = global.blockDiagnostics;
    const triggers = Array.isArray(diagnostics?.triggers) ? diagnostics.triggers : [];
    const latestTrigger = triggers[triggers.length - 1];

    if (!latestTrigger) {
      return null;
    }

    return {
      keyword: latestTrigger.keyword,
      operation: latestTrigger.operation,
      value: latestTrigger.value,
      contextText: latestTrigger.contextText,
      finalScore: diagnostics.finalScore || global.pageScore || latestTrigger.scoreAfter
    };
  }

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

  function renderBlockedPage() {
    if (!document.documentElement) {
      return;
    }

    let overlay = document.getElementById(BLOCK_OVERLAY_ID);
    if (!overlay) {
      try {
        overlay = createBlockedOverlay();
      } catch (error) {
        console.error('Failed to create blocked overlay with diagnostics:', error);
        overlay = document.createElement('div');
        overlay.id = BLOCK_OVERLAY_ID;
        applyOverlayHostStyle(overlay);
        overlay.textContent = getLocalizedMessage(
          'contentBlockedMessage',
          'This page contains restricted content and has been blocked for your protection.'
        );
      }
      document.documentElement.appendChild(overlay);
    } else {
      applyOverlayHostStyle(overlay);
      if (overlay.parentElement !== document.documentElement) {
        document.documentElement.appendChild(overlay);
      }
    }

    document.documentElement.style.overflow = 'hidden';
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }
  }

  function keepBlockedPageRendered() {
    renderBlockedPage();

    if (global.blockedPageRenderInterval) {
      return;
    }

    global.blockedPageRenderInterval = global.setInterval(() => {
      if (global.pageBlocked) {
        renderBlockedPage();
      }
    }, 500);
  }

  contentBlocking.overlay = {
    installBlockedPageEventGuards,
    keepBlockedPageRendered,
    renderBlockedPage
  };
})(window);
