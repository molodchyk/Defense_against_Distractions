// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const activity = global.DAD.PageSignalsActivity;
  const reporter = global.DAD.PageSignalsReporter;

  function collectPageSignals(root = global.document, options = {}) {
    return reporter.collectPageSignals(root, options);
  }

  function schedulePageSignalReport() {
    reporter.schedulePageSignalReport();
  }

  function initializePageSignalReporting() {
    activity.resetActivitySignals();
    reporter.installHistoryHooks();
    reporter.installMutationSignalObserver();
    activity.installActivitySignalListeners(schedulePageSignalReport);

    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', () => {
        reporter.installMutationSignalObserver();
        schedulePageSignalReport();
      }, { once: true });
    } else {
      schedulePageSignalReport();
    }

    global.addEventListener('pageshow', schedulePageSignalReport);
    global.addEventListener('popstate', reporter.scheduleIfUrlChanged);
    global.document.addEventListener('visibilitychange', () => {
      activity.updateActivePageTime();
      if (global.document.visibilityState === 'visible') {
        reporter.scheduleIfUrlChanged();
        schedulePageSignalReport();
      } else {
        reporter.sendPageSignals({ force: true });
      }
    });
  }

  global.DAD.PageSignals = {
    collectPageSignals,
    schedulePageSignalReport
  };

  global.DAD.ChromePlatform.addRuntimeMessageListener((message, sender, sendResponse) => {
    if (message.action === 'reportIntentPageSignals') {
      reporter.sendPageSignals({ force: true });
      sendResponse({ status: 'reported' });
      return false;
    }

    if (message.action === 'getPageSignalSnapshot') {
      sendResponse({
        status: 'ok',
        signals: collectPageSignals()
      });
      return false;
    }

    return false;
  });

  initializePageSignalReporting();
})(window);
