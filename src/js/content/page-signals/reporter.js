// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const SIGNAL_SEND_DELAY_MS = 500;
  const DUPLICATE_REPORT_WINDOW_MS = 5000;

  let pendingSignalTimer = null;
  let lastReportedUrl = '';
  let lastReportedSignature = '';
  let lastReportedAt = 0;
  let pageSignalObserver = null;

  function getBlockSource(diagnostics = {}) {
    const triggers = Array.isArray(diagnostics.triggers) ? diagnostics.triggers : [];

    if (diagnostics.pomodoroStrictBreak === true) {
      return 'pomodoro';
    }

    if (triggers.some(trigger => trigger?.source === 'pomodoro')) {
      return 'pomodoro';
    }

    if (triggers.length > 0) {
      return 'keyword';
    }

    return 'content';
  }

  function collectProtectionSignals() {
    const overlay = global.document?.getElementById?.('dad-block-overlay');
    const diagnostics = global.blockDiagnostics || {};
    const blocked = Boolean(global.pageBlocked || overlay || diagnostics.blockedAt);

    return {
      blocked,
      blockSource: blocked ? getBlockSource(diagnostics) : 'none'
    };
  }

  function collectPageSignals(root = global.document, options = {}) {
    return {
      ...global.DAD.PageSignalsCollector.collectPageSignals(root, options),
      protection: collectProtectionSignals()
    };
  }

  function sendPageSignals(options = {}) {
    if (global.top !== global.self) {
      return;
    }

    if (!global.DAD?.safeRuntimeSendMessage) {
      return;
    }

    const signals = collectPageSignals();
    const signature = `${signals.url}\n${signals.title}\n${signals.protection?.blocked ? 'blocked' : 'allowed'}`;
    const now = Date.now();

    if (!options.force && signature === lastReportedSignature && now - lastReportedAt < DUPLICATE_REPORT_WINDOW_MS) {
      return;
    }

    lastReportedUrl = signals.url;
    lastReportedSignature = signature;
    lastReportedAt = now;

    global.DAD.safeRuntimeSendMessage({
      action: 'recordIntentPageSignals',
      signals
    });
  }

  function schedulePageSignalReport() {
    if (pendingSignalTimer) {
      global.clearTimeout(pendingSignalTimer);
    }

    pendingSignalTimer = global.setTimeout(() => {
      pendingSignalTimer = null;
      sendPageSignals();
    }, SIGNAL_SEND_DELAY_MS);
  }

  function scheduleIfUrlChanged() {
    const currentUrl = String(global.location?.href || '');
    if (currentUrl !== lastReportedUrl) {
      global.DAD.PageSignalsActivity.resetActivitySignals();
      schedulePageSignalReport();
    }
  }

  function installHistoryHooks() {
    const history = global.history;
    if (!history || history.__dadIntentHooksInstalled) {
      return;
    }

    ['pushState', 'replaceState'].forEach(methodName => {
      const originalMethod = history[methodName];
      if (typeof originalMethod !== 'function') {
        return;
      }

      history[methodName] = function(...args) {
        const result = originalMethod.apply(this, args);
        scheduleIfUrlChanged();
        return result;
      };
    });

    history.__dadIntentHooksInstalled = true;
  }

  function installMutationSignalObserver() {
    if (pageSignalObserver || !global.MutationObserver || !global.document.documentElement) {
      return;
    }

    pageSignalObserver = new global.MutationObserver(records => {
      global.DAD.PageSignalsActivity.recordDomMutationBatch(records);
      schedulePageSignalReport();
    });
    pageSignalObserver.observe(global.document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  global.DAD.PageSignalsReporter = {
    collectPageSignals,
    installHistoryHooks,
    installMutationSignalObserver,
    scheduleIfUrlChanged,
    schedulePageSignalReport,
    sendPageSignals
  };
})(window);
