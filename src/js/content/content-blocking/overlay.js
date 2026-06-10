// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_OVERLAY_ID,
    BLOCK_EVENT_OPTIONS
  } = contentBlocking.constants;

  const THEME_STORAGE_KEY = 'uiThemeMode';
  const DEFAULT_THEME_MODE = 'system';
  const THEME_QUERY = '(prefers-color-scheme: dark)';
  const POMODORO_BREAK_PHASES = new Set(['shortBreak', 'longBreak']);
  let blockedOverlayThemeMode = DEFAULT_THEME_MODE;
  let blockedOverlayThemeListenersInstalled = false;

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

  function normalizeThemeMode(mode) {
    return ['system', 'dark', 'light'].includes(mode) ? mode : DEFAULT_THEME_MODE;
  }

  function resolveThemeMode(mode) {
    const normalizedMode = normalizeThemeMode(mode);
    if (normalizedMode === 'system') {
      return global.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
    }

    return normalizedMode;
  }

  function applyBlockedOverlayTheme(overlay, mode = blockedOverlayThemeMode) {
    overlay.dataset.theme = resolveThemeMode(mode);
    overlay.dataset.themeMode = normalizeThemeMode(mode);
  }

  function applyBlockedOverlayThemeToExisting() {
    const overlay = document.getElementById(BLOCK_OVERLAY_ID);
    if (overlay) {
      applyBlockedOverlayTheme(overlay);
    }
  }

  function installBlockedOverlayThemeSync() {
    if (blockedOverlayThemeListenersInstalled) {
      return;
    }

    global.DAD.safeSyncStorageGet({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      if (!result) {
        return;
      }

      blockedOverlayThemeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
      applyBlockedOverlayThemeToExisting();
    });

    global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes[THEME_STORAGE_KEY]) {
        return;
      }

      blockedOverlayThemeMode = normalizeThemeMode(changes[THEME_STORAGE_KEY].newValue);
      applyBlockedOverlayThemeToExisting();
    });

    global.matchMedia(THEME_QUERY).addEventListener('change', () => {
      if (blockedOverlayThemeMode === 'system') {
        applyBlockedOverlayThemeToExisting();
      }
    });

    blockedOverlayThemeListenersInstalled = true;
  }

  function createBlockedOverlay() {
    installBlockedOverlayThemeSync();

    const overlay = document.createElement('div');
    overlay.id = BLOCK_OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    applyOverlayHostStyle(overlay);
    applyBlockedOverlayTheme(overlay);
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

    content.appendChild(heading);
    content.appendChild(paragraph);
    content.appendChild(createDiagnosticsElement(diagnostics));
    content.appendChild(createPomodoroElement());
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
      'background:var(--dad-block-bg)',
      'color:var(--dad-block-text)',
      'font:16px/1.5 Arial,sans-serif',
      'text-align:center',
      'pointer-events:auto'
    ].join(';');
    if (!document.getElementById('dad-block-overlay-theme-style')) {
      const style = document.createElement('style');
      style.id = 'dad-block-overlay-theme-style';
      style.textContent = `
        #${BLOCK_OVERLAY_ID} {
          --dad-block-bg: #101216;
          --dad-block-surface: #171b22;
          --dad-block-border: #323b4b;
          --dad-block-text: #ffffff;
          --dad-block-heading: #ff4444;
          --dad-block-muted: #c3cad6;
          --dad-block-diagnostics: #d7e0e7;
          --dad-block-accent: #3d8bfd;
          --dad-block-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
          color-scheme: dark;
        }

        #${BLOCK_OVERLAY_ID}[data-theme="light"] {
          --dad-block-bg: #f5f7fb;
          --dad-block-surface: #ffffff;
          --dad-block-border: #cfd6e2;
          --dad-block-text: #17202e;
          --dad-block-heading: #c73535;
          --dad-block-muted: #526173;
          --dad-block-diagnostics: #334155;
          --dad-block-accent: #2463d6;
          --dad-block-shadow: 0 18px 40px rgba(25, 37, 59, 0.12);
          color-scheme: light;
        }

        #${BLOCK_OVERLAY_ID} [data-dad-pomodoro] {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--dad-block-border);
          text-align: left;
        }

        #${BLOCK_OVERLAY_ID} [data-dad-pomodoro][hidden] {
          display: none;
        }

        #${BLOCK_OVERLAY_ID} [data-dad-pomodoro-title] {
          margin: 0 0 6px;
          color: var(--dad-block-text);
          font: 700 15px/1.35 Arial,sans-serif;
        }

        #${BLOCK_OVERLAY_ID} [data-dad-pomodoro-time] {
          display: inline-block;
          margin-right: 8px;
          color: var(--dad-block-accent);
          font: 700 22px/1 Arial,sans-serif;
        }

        #${BLOCK_OVERLAY_ID} [data-dad-pomodoro-message] {
          color: var(--dad-block-diagnostics);
          font: 14px/1.45 Arial,sans-serif;
        }
      `;
      document.documentElement.appendChild(style);
    }
    overlay.hidden = false;
  }

  function createDiagnosticsElement(diagnostics) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'margin-top:18px',
      'padding-top:14px',
      'border-top:1px solid var(--dad-block-border)',
      'color:var(--dad-block-diagnostics)',
      'font:15px/1.45 Arial,sans-serif',
      'text-align:left'
    ].join(';');

    if (!diagnostics) {
      wrapper.hidden = true;
      return wrapper;
    }

    const trigger = document.createElement('div');
    const triggerStrong = document.createElement('strong');
    triggerStrong.dataset.dadBlockTriggerLabel = 'true';
    triggerStrong.style.color = 'var(--dad-block-text)';
    triggerStrong.textContent = getLocalizedMessage('blockedTriggeredByLabel', 'Triggered by:');
    trigger.appendChild(triggerStrong);
    trigger.appendChild(document.createTextNode(' '));
    trigger.appendChild(document.createTextNode(diagnostics.keyword || 'unknown'));

    const score = document.createElement('div');
    const scoreStrong = document.createElement('strong');
    scoreStrong.dataset.dadBlockScoreLabel = 'true';
    scoreStrong.style.color = 'var(--dad-block-text)';
    scoreStrong.textContent = getLocalizedMessage('blockedScoreLabel', 'Score:');
    score.appendChild(scoreStrong);
    score.appendChild(document.createTextNode(' '));
    score.appendChild(document.createTextNode(`${Math.round(diagnostics.finalScore)} (${diagnostics.operation}${diagnostics.value})`));

    const context = document.createElement('div');
    context.dataset.dadBlockContext = 'true';
    context.style.cssText = 'margin-top:8px;color:var(--dad-block-diagnostics);overflow-wrap:anywhere';
    if (diagnostics.contextText) {
      const contextStrong = document.createElement('strong');
      contextStrong.dataset.dadBlockContextLabel = 'true';
      contextStrong.style.color = 'var(--dad-block-text)';
      contextStrong.textContent = getLocalizedMessage('blockedContextLabel', 'Context:');
      context.appendChild(contextStrong);
      context.appendChild(document.createTextNode(` ${diagnostics.contextText}`));
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(score);
    wrapper.appendChild(context);
    return wrapper;
  }

  function createPomodoroElement() {
    const wrapper = document.createElement('div');
    wrapper.dataset.dadPomodoro = 'true';
    wrapper.hidden = true;

    const title = document.createElement('p');
    title.dataset.dadPomodoroTitle = 'true';
    title.textContent = getLocalizedMessage('popupPomodoroTitle', 'Pomodoro');

    const timer = document.createElement('span');
    timer.dataset.dadPomodoroTime = 'true';
    timer.textContent = '0:00';

    const message = document.createElement('span');
    message.dataset.dadPomodoroMessage = 'true';

    wrapper.appendChild(title);
    wrapper.appendChild(timer);
    wrapper.appendChild(message);
    return wrapper;
  }

  function requestPomodoroState(callback) {
    global.DAD.safeRuntimeSendMessage({ action: 'getPomodoroState' }, callback);
  }

  function getPomodoroBlockedPageMessage(payload) {
    const phase = payload?.timerStatus?.phase;
    const planName = payload?.plan?.name || 'active plan';
    const phaseLabel = payload?.timerStatus?.phaseLabel || 'Pomodoro';

    if (phase === 'shortBreak' || phase === 'longBreak') {
      return getLocalizedMessage(
        'blockedPomodoroBreakMessage',
        '$1: $2 active. Return when this reaches zero.',
        [planName, phaseLabel.toLowerCase()]
      );
    }

    return '';
  }

  function clearPomodoroElement(wrapper) {
    wrapper.hidden = true;
    const time = wrapper.querySelector('[data-dad-pomodoro-time]');
    const message = wrapper.querySelector('[data-dad-pomodoro-message]');
    if (time) {
      time.textContent = '';
    }
    if (message) {
      message.textContent = '';
    }
  }

  function renderPomodoroState(overlay, payload) {
    const wrapper = overlay.querySelector('[data-dad-pomodoro]');
    if (!wrapper) {
      return;
    }

    const shouldShow = Boolean(payload?.plan && isStrictPomodoroBreakPayload(payload));
    wrapper.hidden = !shouldShow;
    if (!shouldShow) {
      clearPomodoroElement(wrapper);
      return;
    }

    wrapper.querySelector('[data-dad-pomodoro-time]').textContent = payload.timerStatus.remainingText || '0:00';
    wrapper.querySelector('[data-dad-pomodoro-message]').textContent = getPomodoroBlockedPageMessage(payload);
  }

  function isPomodoroStrictBreakDiagnostics() {
    return global.blockDiagnostics?.pomodoroStrictBreak === true;
  }

  function hasRecordedContentBlockTrigger() {
    const triggers = Array.isArray(global.blockDiagnostics?.triggers) ? global.blockDiagnostics.triggers : [];
    return triggers.some(trigger => trigger?.source !== 'pomodoro') && !isPomodoroStrictBreakDiagnostics();
  }

  function hasAnyBlockTrigger() {
    return Array.isArray(global.blockDiagnostics?.triggers) && global.blockDiagnostics.triggers.length > 0;
  }

  function isStrictPomodoroBreakPayload(payload) {
    return Boolean(
      payload?.plan?.pomodoro?.strictBreaks
        && payload.plan.active
        && POMODORO_BREAK_PHASES.has(payload?.timerStatus?.phase)
    );
  }

  function clearStalePomodoroOnlyBlock(payload) {
    const hasOverlay = Boolean(document.getElementById(BLOCK_OVERLAY_ID));
    if ((!global.pageBlocked && !hasOverlay) || isStrictPomodoroBreakPayload(payload)) {
      return false;
    }

    if (hasRecordedContentBlockTrigger()) {
      return false;
    }

    if (!isPomodoroStrictBreakDiagnostics() && hasAnyBlockTrigger()) {
      return false;
    }

    global.pomodoroStrictBreakBlockActive = false;
    global.DAD.resetPageState();
    global.DAD.ContentBlocking?.siteCheck?.performSiteCheck?.();
    return true;
  }

  function updatePomodoroPanel(overlay) {
    requestPomodoroState(payload => {
      if (clearStalePomodoroOnlyBlock(payload)) {
        return;
      }

      renderPomodoroState(overlay, payload);
    });
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

    installBlockedOverlayThemeSync();

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
      applyBlockedOverlayTheme(overlay);
      updateBlockedOverlayText(overlay);
      if (overlay.parentElement !== document.documentElement) {
        document.documentElement.appendChild(overlay);
      }
    }

    document.documentElement.style.overflow = 'hidden';
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }

    updatePomodoroPanel(overlay);

    if (!global.blockedPagePomodoroInterval) {
      global.blockedPagePomodoroInterval = global.setInterval(() => {
        if (!global.pageBlocked) {
          return;
        }

        const currentOverlay = document.getElementById(BLOCK_OVERLAY_ID);
        if (currentOverlay) {
          updatePomodoroPanel(currentOverlay);
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
    installBlockedPageEventGuards,
    keepBlockedPageRendered,
    renderBlockedPage
  };
})(window);
