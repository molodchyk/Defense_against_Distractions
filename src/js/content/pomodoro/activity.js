// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  const ACTIVITY_REPORT_INTERVAL_MS = 15 * 1000;
  const ACTIVITY_EVENTS = [
    'click',
    'keydown',
    'pointerdown',
    'scroll',
    'touchstart'
  ];
  let lastActivityReportAt = 0;

  function isTopFrame() {
    try {
      return global.top === global.self;
    } catch (error) {
      return false;
    }
  }

  function reportPomodoroActivity(reason) {
    const now = Date.now();
    if (now - lastActivityReportAt < ACTIVITY_REPORT_INTERVAL_MS) {
      return;
    }

    lastActivityReportAt = now;
    global.DAD.safeRuntimeSendMessage({
      action: 'recordPomodoroActivity',
      reason,
      url: global.location.href,
      title: global.document.title
    });
  }

  if (!isTopFrame()) {
    return;
  }

  ACTIVITY_EVENTS.forEach(eventName => {
    global.addEventListener(eventName, () => reportPomodoroActivity(eventName), {
      capture: true,
      passive: true
    });
  });

  global.addEventListener('focus', () => reportPomodoroActivity('focus'), { capture: true });
  global.document.addEventListener('visibilitychange', () => {
    if (!global.document.hidden) {
      reportPomodoroActivity('visibility');
    }
  });

  reportPomodoroActivity('pageVisible');
})(window);
