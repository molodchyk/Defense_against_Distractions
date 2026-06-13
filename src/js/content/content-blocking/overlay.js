// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_OVERLAY_ID
  } = contentBlocking.constants;

  const overlayMessages = contentBlocking.overlayMessages || {};
  const overlayStyle = contentBlocking.overlayStyle || {};
  const overlayTheme = contentBlocking.overlayTheme || {};
  const overlayDiagnostics = contentBlocking.overlayDiagnostics || {};
  const overlayPomodoro = contentBlocking.overlayPomodoro || {};
  const overlayEvents = contentBlocking.overlayEvents || {};
  const overlayCustomization = contentBlocking.overlayCustomization || {};
  const getLocalizedMessage = overlayMessages.getLocalizedMessage || ((key, fallback) => fallback);

  function applyOverlayLanguage(overlay) {
    global.DAD.UiLanguage?.applyDirection?.(overlay);
  }

  function createBlockedOverlay() {
    overlayTheme.install?.();

    const overlay = document.createElement('div');
    overlay.id = BLOCK_OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    applyOverlayLanguage(overlay);
    overlayStyle.applyHostStyle?.(overlay);
    overlayTheme.apply?.(overlay);

    const title = getLocalizedMessage('contentBlockedTitle', 'Content Blocked');
    const message = getLocalizedMessage(
      'contentBlockedMessage',
      'This page contains restricted content and has been blocked for your protection.'
    );
    const diagnostics = overlayDiagnostics.getBlockedPageDiagnostics?.();

    const content = document.createElement('div');
    content.style.cssText = [
      'box-sizing:border-box',
      'width:min(620px,100%)',
      'padding:30px 34px',
      'border:1px solid var(--dad-block-border)',
      'border-radius:8px',
      'background:var(--dad-block-surface)',
      'box-shadow:var(--dad-block-shadow)'
    ].join(';');

    const heading = document.createElement('h1');
    heading.dataset.dadBlockTitle = 'true';
    heading.style.cssText = 'margin:0 0 16px;color:var(--dad-block-heading);font:700 32px/1.2 Arial,sans-serif';
    heading.textContent = title;

    const paragraph = document.createElement('p');
    paragraph.dataset.dadBlockMessage = 'true';
    paragraph.style.cssText = 'margin:0;color:var(--dad-block-muted);font:18px/1.45 Arial,sans-serif';
    paragraph.textContent = message;

    const customMessage = overlayCustomization.createElement?.();

    content.appendChild(heading);
    content.appendChild(paragraph);
    if (customMessage) {
      content.appendChild(customMessage);
    }
    content.appendChild(overlayDiagnostics.createElement?.(diagnostics) || document.createElement('div'));
    content.appendChild(overlayPomodoro.createElement?.() || document.createElement('div'));
    overlay.appendChild(content);

    return overlay;
  }

  function updateBlockedOverlayText(overlay) {
    const title = overlay.querySelector('[data-dad-block-title]');
    const message = overlay.querySelector('[data-dad-block-message]');
    const triggerLabel = overlay.querySelector('[data-dad-block-trigger-label]');
    const scoreLabel = overlay.querySelector('[data-dad-block-score-label]');
    const contextLabel = overlay.querySelector('[data-dad-block-context-label]');
    const pomodoroTitle = overlay.querySelector('[data-dad-pomodoro-title]');

    if (title) {
      title.textContent = getLocalizedMessage('contentBlockedTitle', 'Content Blocked');
    }
    if (message) {
      message.textContent = getLocalizedMessage(
        'contentBlockedMessage',
        'This page contains restricted content and has been blocked for your protection.'
      );
    }
    if (triggerLabel) {
      triggerLabel.textContent = getLocalizedMessage('blockedTriggeredByLabel', 'Triggered by:');
    }
    if (scoreLabel) {
      scoreLabel.textContent = getLocalizedMessage('blockedScoreLabel', 'Score:');
    }
    if (contextLabel) {
      contextLabel.textContent = getLocalizedMessage('blockedContextLabel', 'Context:');
    }
    if (pomodoroTitle) {
      pomodoroTitle.textContent = getLocalizedMessage('popupPomodoroTitle', 'Pomodoro');
    }
  }

  function renderBlockedPage() {
    if (!document.documentElement) {
      return;
    }

    overlayTheme.install?.();

    let overlay = document.getElementById(BLOCK_OVERLAY_ID);
    if (!overlay) {
      try {
        overlay = createBlockedOverlay();
      } catch (error) {
        console.error('Failed to create blocked overlay with diagnostics:', error);
        overlay = document.createElement('div');
        overlay.id = BLOCK_OVERLAY_ID;
        applyOverlayLanguage(overlay);
        overlayStyle.applyHostStyle?.(overlay);
        overlay.textContent = getLocalizedMessage(
          'contentBlockedMessage',
          'This page contains restricted content and has been blocked for your protection.'
        );
      }
      document.documentElement.appendChild(overlay);
    } else {
      applyOverlayLanguage(overlay);
      overlayStyle.applyHostStyle?.(overlay);
      overlayTheme.apply?.(overlay);
      updateBlockedOverlayText(overlay);
      overlayCustomization.refreshOverlay?.(overlay);
      if (overlay.parentElement !== document.documentElement) {
        document.documentElement.appendChild(overlay);
      }
    }

    document.documentElement.style.overflow = 'hidden';
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }

    overlayPomodoro.updatePanel?.(overlay);
    overlayCustomization.refreshOverlay?.(overlay);

    if (!global.blockedPagePomodoroInterval) {
      global.blockedPagePomodoroInterval = global.setInterval(() => {
        if (!global.pageBlocked) {
          return;
        }

        const currentOverlay = document.getElementById(BLOCK_OVERLAY_ID);
        if (currentOverlay) {
          overlayPomodoro.updatePanel?.(currentOverlay);
        }
      }, 1000);
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
    installBlockedPageEventGuards: overlayEvents.installBlockedPageEventGuards || (() => {}),
    keepBlockedPageRendered,
    renderBlockedPage
  };

  global.DAD.UiLanguage?.onChange?.(() => {
    applyOverlayLanguage(document.getElementById(BLOCK_OVERLAY_ID));
  });
})(window);
