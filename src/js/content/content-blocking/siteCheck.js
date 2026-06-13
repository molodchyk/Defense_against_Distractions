// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    calculateScore,
    observeMutations,
    scanTextNodes
  } = contentBlocking.keywords;
  const {
    scanStructuralTriggers
  } = contentBlocking.structuralTriggers;
  const BREAK_PHASES = new Set(['shortBreak', 'longBreak']);
  const POMODORO_RUNTIME_STORAGE_KEY = 'pomodoroRuntimeState';
  const POMODORO_INACTIVE_REASON = 'pomodoroInactive';
  const STRUCTURAL_TIME_TRIGGER_INTERVAL_MS = 1000;
  let pomodoroRuntimeStorageListenerInstalled = false;

  function requestPomodoroState(callback) {
    global.DAD.safeRuntimeSendMessage({ action: 'getPomodoroState' }, callback);
  }

  function shouldBlockForPomodoroBreak(payload) {
    return Boolean(
      payload?.plan?.pomodoro?.strictBreaks
        && payload.plan.active
        && BREAK_PHASES.has(payload?.timerStatus?.phase)
    );
  }

  function getPomodoroBreakDiagnostics(payload) {
    const phaseLabel = payload?.timerStatus?.phaseLabel || 'Pomodoro break';
    const planName = payload?.plan?.name || 'active plan';

    return {
      pomodoroStrictBreak: true,
      triggers: [{
        keyword: phaseLabel,
        operation: '+',
        value: 0,
        contextText: `${planName}: ${phaseLabel}`,
        scoreAfter: 0,
        source: 'pomodoro'
      }],
      blockedAt: new Date().toISOString(),
      finalScore: 0
    };
  }

  function isPomodoroStrictBreakDiagnostics() {
    return global.blockDiagnostics?.pomodoroStrictBreak === true;
  }

  function hasRecordedContentBlockTrigger() {
    const triggers = Array.isArray(global.blockDiagnostics?.triggers) ? global.blockDiagnostics.triggers : [];
    return triggers.some(trigger => trigger?.source !== 'pomodoro') && !isPomodoroStrictBreakDiagnostics();
  }

  function hasBlockedPageOverlay() {
    return Boolean(global.document.getElementById('dad-block-overlay'));
  }

  function hasVisiblePomodoroBlockPanel() {
    const panel = global.document.querySelector('#dad-block-overlay [data-dad-pomodoro]');
    return Boolean(panel && !panel.hidden);
  }

  function isBreakPhase(phase) {
    return BREAK_PHASES.has(phase);
  }

  function isBreakRuntime(runtime) {
    return isBreakPhase(runtime?.phase);
  }

  function isBreakOrPausedBreakRuntime(runtime) {
    return Boolean(
      isBreakRuntime(runtime)
        || (runtime?.phase === 'paused' && isBreakPhase(runtime?.pausedPhase))
    );
  }

  function markPomodoroBreakBlock(payload) {
    global.pomodoroStrictBreakBlockActive = true;

    if (!isPomodoroStrictBreakDiagnostics() && !hasRecordedContentBlockTrigger()) {
      global.blockDiagnostics = getPomodoroBreakDiagnostics(payload);
    }
  }

  function shouldClearStalePomodoroBlock(reason) {
    const hasPomodoroOnlyEvidence = Boolean(
      global.pomodoroStrictBreakBlockActive
        || isPomodoroStrictBreakDiagnostics()
        || hasVisiblePomodoroBlockPanel()
    );

    if (reason === POMODORO_INACTIVE_REASON) {
      return Boolean(
        (global.pageBlocked || hasBlockedPageOverlay())
          && !hasRecordedContentBlockTrigger()
          && hasPomodoroOnlyEvidence
      );
    }

    return Boolean(
      reason === 'reset'
        && (global.pageBlocked || hasBlockedPageOverlay())
        && !hasRecordedContentBlockTrigger()
    );
  }

  function restorePomodoroBreakBlockSideEffects(reason = null) {
    const hadPomodoroStrictBreakBlock = Boolean(global.pomodoroStrictBreakBlockActive);
    const hasPomodoroDiagnostics = isPomodoroStrictBreakDiagnostics();
    const hasContentBlockTrigger = hasRecordedContentBlockTrigger();
    const shouldClearStaleBlock = shouldClearStalePomodoroBlock(reason);
    const hasOverlay = hasBlockedPageOverlay();
    const shouldForceReset = Boolean(
      reason === 'reset'
        && (global.pageBlocked || hasOverlay)
    );
    const shouldRestore = Boolean(
      shouldForceReset
        || hadPomodoroStrictBreakBlock
        || hasPomodoroDiagnostics
        || shouldClearStaleBlock
    );
    if (!shouldRestore) {
      return false;
    }

    global.pomodoroStrictBreakBlockActive = false;

    if (
      shouldForceReset
        || (
          (global.pageBlocked || hasOverlay)
            && (hasPomodoroDiagnostics || shouldClearStaleBlock || (hadPomodoroStrictBreakBlock && !hasContentBlockTrigger))
        )
    ) {
      global.DAD.resetPageState();
      return true;
    }

    if (hasContentBlockTrigger) {
      return true;
    }

    contentBlocking.media.restorePageMedia('pomodoroBreakEnded');
    global.DAD.safeRuntimeSendMessage({ action: 'restoreBlockedTabMute' });
    return true;
  }

  function installPomodoroRuntimeStorageListener() {
    if (pomodoroRuntimeStorageListenerInstalled) {
      return;
    }

    pomodoroRuntimeStorageListenerInstalled = global.DAD.safeStorageOnChangedAddListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[POMODORO_RUNTIME_STORAGE_KEY]) {
        return;
      }

      const change = changes[POMODORO_RUNTIME_STORAGE_KEY];
      if (!isBreakOrPausedBreakRuntime(change.oldValue) || isBreakRuntime(change.newValue)) {
        return;
      }

      if (restorePomodoroBreakBlockSideEffects(POMODORO_INACTIVE_REASON)) {
        performSiteCheck();
      }
    });
  }

  function runPomodoroBreakCheck(onContinue = null, reason = null) {
    requestPomodoroState(payload => {
      if (shouldBlockForPomodoroBreak(payload)) {
        markPomodoroBreakBlock(payload);
        if (!global.pageBlocked) {
          contentBlocking.blocker.blockPage({
            diagnostics: getPomodoroBreakDiagnostics(payload)
          });
        }
        return;
      }

      if (restorePomodoroBreakBlockSideEffects(reason)) {
        performSiteCheck();
        return;
      }

      if (typeof onContinue === 'function' && !global.pageBlocked) {
        onContinue();
      }
    });
  }

  function ensurePomodoroStrictBreakMonitor() {
    installPomodoroRuntimeStorageListener();

    if (global.pomodoroStrictBreakInterval) {
      return;
    }

    global.pomodoroStrictBreakInterval = global.setInterval(() => {
      runPomodoroBreakCheck();
    }, 1000);
  }

  function syncPomodoroBreakState(reason = null) {
    ensurePomodoroStrictBreakMonitor();
    runPomodoroBreakCheck(null, reason);
  }

  function clearPomodoroStrictBreakBlock() {
    if (restorePomodoroBreakBlockSideEffects('reset')) {
      performSiteCheck();
      return true;
    }

    return false;
  }

  function performSiteCheck() {
    if (global.pageBlocked) return;
    ensurePomodoroStrictBreakMonitor();

    runPomodoroBreakCheck(() => global.DAD.safeSyncStorageGet(null, items => {
      if (!items) {
        return;
      }

      const fullUrl = global.location.href;
      const normalizedUrl = global.DAD.normalizeUrl(fullUrl);
      const allKeywords = global.DAD.Plans.getEffectiveKeywordsForUrl(items, normalizedUrl);

      const whitelistedSites = items.whitelistedSites || [];
      const isWhitelisted = whitelistedSites.some(whitelistedUrl => normalizedUrl.includes(whitelistedUrl));
      if (isWhitelisted) return;
      global.DAD.applyElementBlockRules();

      if (allKeywords.length > 0) {
        global.parsedKeywords = allKeywords.map(global.DAD.parseKeyword);
        const rootElement = document.querySelector('body');
        if (!rootElement) {
          return;
        }
        scanStructuralTriggers(global.parsedKeywords, calculateScore, document);
        syncStructuralTimeTriggerMonitor(global.parsedKeywords);
        scanTextNodes(rootElement, calculateScore);
        observeMutations(allKeywords || []);
      } else {
        syncStructuralTimeTriggerMonitor([]);
      }
    }));
  }

  function syncStructuralTimeTriggerMonitor(parsedKeywords = []) {
    const hasTimeTrigger = contentBlocking.structuralTriggers?.hasTimeStructuralTrigger?.(parsedKeywords);
    if (!hasTimeTrigger || global.pageBlocked) {
      clearStructuralTimeTriggerMonitor();
      return;
    }

    if (global.structuralTimeTriggerInterval) {
      return;
    }

    global.structuralTimeTriggerInterval = global.setInterval(() => {
      if (global.pageBlocked) {
        clearStructuralTimeTriggerMonitor();
        return;
      }

      scanStructuralTriggers(global.parsedKeywords, calculateScore, document);
    }, STRUCTURAL_TIME_TRIGGER_INTERVAL_MS);
  }

  function clearStructuralTimeTriggerMonitor() {
    if (global.structuralTimeTriggerInterval) {
      global.clearInterval(global.structuralTimeTriggerInterval);
      global.structuralTimeTriggerInterval = null;
    }
  }

  contentBlocking.siteCheck = {
    clearStructuralTimeTriggerMonitor,
    clearPomodoroStrictBreakBlock,
    performSiteCheck,
    syncPomodoroBreakState
  };
})(window);
