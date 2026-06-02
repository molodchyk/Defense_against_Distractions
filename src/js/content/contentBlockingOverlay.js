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
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '2147483647';
    overlay.style.pointerEvents = 'auto';

    const shadowRoot = overlay.attachShadow({ mode: 'open' });
    const title = getLocalizedMessage('contentBlockedTitle', 'Content Blocked');
    const message = getLocalizedMessage(
      'contentBlockedMessage',
      'This page contains restricted content and has been blocked for your protection.'
    );
    const diagnostics = getBlockedPageDiagnostics();

    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          inset: 0;
          z-index: 2147483647;
        }

        .block-screen {
          box-sizing: border-box;
          width: 100vw;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #333333;
          color: #ffffff;
          font: 20px/1.5 Arial, sans-serif;
          text-align: center;
        }

        .content {
          box-sizing: border-box;
          width: min(600px, 100%);
          padding: 30px;
          border-radius: 8px;
          background: #4c4c4c;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        h1 {
          margin: 0 0 16px;
          color: #ff4444;
          font-size: 32px;
          line-height: 1.2;
        }

        p {
          margin: 0;
        }

        .diagnostics {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.22);
          color: #f2f5f8;
          font-size: 15px;
          line-height: 1.45;
          text-align: left;
        }

        .diagnostics strong {
          color: #ffffff;
        }

        .context {
          margin-top: 8px;
          color: #d7e0e7;
          overflow-wrap: anywhere;
        }
      </style>
      <div class="block-screen">
        <div class="content">
          <h1></h1>
          <p></p>
          <div class="diagnostics" hidden>
            <div><strong>Triggered by:</strong> <span class="trigger"></span></div>
            <div><strong>Score:</strong> <span class="score"></span></div>
            <div class="context"></div>
          </div>
        </div>
      </div>
    `;

    shadowRoot.querySelector('h1').textContent = title;
    shadowRoot.querySelector('p').textContent = message;
    renderBlockedPageDiagnostics(shadowRoot, diagnostics);

    return overlay;
  }

  function createFallbackBlockedOverlay() {
    const overlay = document.createElement('div');
    overlay.id = BLOCK_OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'box-sizing:border-box',
      'background:#333333',
      'color:#ffffff',
      'font:20px/1.5 Arial,sans-serif',
      'text-align:center',
      'pointer-events:auto'
    ].join(';');

    const content = document.createElement('div');
    content.style.cssText = [
      'box-sizing:border-box',
      'width:min(600px,100%)',
      'padding:30px',
      'border-radius:8px',
      'background:#4c4c4c'
    ].join(';');
    content.textContent = getLocalizedMessage(
      'contentBlockedMessage',
      'This page contains restricted content and has been blocked for your protection.'
    );
    overlay.appendChild(content);
    return overlay;
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

  function renderBlockedPageDiagnostics(shadowRoot, diagnostics) {
    if (!diagnostics) return;

    const wrapper = shadowRoot.querySelector('.diagnostics');
    const trigger = shadowRoot.querySelector('.trigger');
    const score = shadowRoot.querySelector('.score');
    const context = shadowRoot.querySelector('.context');
    if (!wrapper || !trigger || !score || !context) return;

    wrapper.hidden = false;
    trigger.textContent = diagnostics.keyword || 'unknown';
    score.textContent = `${Math.round(diagnostics.finalScore)} (${diagnostics.operation}${diagnostics.value})`;
    context.textContent = diagnostics.contextText ? `Context: ${diagnostics.contextText}` : '';
  }

  function suppressBlockedPageEvent(event) {
    if (!global.pageBlocked) {
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
        overlay = createFallbackBlockedOverlay();
      }
      document.documentElement.appendChild(overlay);
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
