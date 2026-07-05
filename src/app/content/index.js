// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD.initializePageState();

  const { SITE_CHECK_MESSAGE } = global.DAD.ContentBlocking.constants;
  const { performSiteCheck } = global.DAD.ContentBlocking.siteCheck;
  const MAX_DEBUG_SCORE_TRIGGERS = 5;

  function initializeContentScript() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        performSiteCheck();
      }, { once: true });
      return;
    }

    performSiteCheck();
  }

  initializeContentScript();

  function getBlockDiagnosticsDebugState() {
    const diagnostics = global.blockDiagnostics || null;
    const triggers = Array.isArray(diagnostics?.triggers) ? diagnostics.triggers : [];
    const recentTriggers = triggers.slice(-MAX_DEBUG_SCORE_TRIGGERS).map(trigger => ({
      keyword: trigger?.keyword || '',
      operation: trigger?.operation || '+',
      value: Number(trigger?.value || 0),
      scoreAfter: Number(trigger?.scoreAfter || 0),
      source: trigger?.source || 'keyword',
      matchedAt: trigger?.matchedAt || null
    }));

    return diagnostics ? {
      pomodoroStrictBreak: Boolean(diagnostics.pomodoroStrictBreak),
      blockedAt: diagnostics.blockedAt || null,
      finalScore: diagnostics.finalScore ?? null,
      triggerCount: triggers.length,
      latestTrigger: triggers.at(-1) || null,
      recentTriggers,
      triggeredActionOutcomes: Array.isArray(diagnostics.triggeredActionOutcomes) ? diagnostics.triggeredActionOutcomes.slice(-3) : []
    } : null;
  }

  function isTopFrame() {
    try {
      return global.top === global.self;
    } catch (error) {
      return false;
    }
  }

  function buildBlockDebugState(tabMuteState = null) {
    const overlay = document.getElementById('dad-block-overlay');

    return {
      pageBlocked: Boolean(global.pageBlocked),
      pageScore: global.pageScore,
      hasOverlay: Boolean(overlay),
      overlayParent: overlay?.parentElement?.tagName || null,
      readyState: document.readyState,
      url: global.location.href,
      isTopFrame: isTopFrame(),
      pomodoroStrictBreakBlockActive: Boolean(global.pomodoroStrictBreakBlockActive),
      pomodoroStrictBreakMonitorActive: Boolean(global.pomodoroStrictBreakInterval),
      blockDiagnostics: getBlockDiagnosticsDebugState(),
      media: global.DAD.ContentBlocking.media.getMediaSuspensionDebugState?.() || null,
      tabMute: tabMuteState
    };
  }

  global.DAD.ChromePlatform.addRuntimeMessageListener((message, sender, sendResponse) => {
    if (message.action === SITE_CHECK_MESSAGE) {
      performSiteCheck();
      sendResponse({ status: 'Site check performed' });
      return false;
    }

    if (message.action === 'startElementPicker') {
      global.DAD.startElementPicker({
        strategy: message.strategy || 'samePosition',
        minScore: message.minScore,
        ancestorDepth: message.ancestorDepth,
        labelMatch: message.labelMatch || 'prefer',
        initialAction: message.initialAction,
        assignRuleToPlanId: message.assignRuleToPlanId
      });
      sendResponse({ status: 'Element picker started' });
      return false;
    }

    if (message.action === 'forceBlockPage') {
      global.DAD.ContentBlocking.blocker.blockPage({
        fromTopFrameRequest: true,
        diagnostics: message.diagnostics
      });
      sendResponse({ status: 'Top frame blocked' });
      return false;
    }

    if (message.action === 'pomodoroRuntimeChanged') {
      global.DAD.ContentBlocking.siteCheck.syncPomodoroBreakState(message.reason || null);
      sendResponse({ status: 'Pomodoro runtime synced' });
      return false;
    }

    if (message.action === 'clearPomodoroStrictBreakBlock') {
      const cleared = global.DAD.ContentBlocking.siteCheck.clearPomodoroStrictBreakBlock();
      sendResponse({ status: cleared ? 'Pomodoro block cleared' : 'No Pomodoro block to clear' });
      return false;
    }

    if (message.action === 'showPomodoroMiniPanel') {
      const opened = global.DAD.PomodoroMiniPanel?.show?.();
      sendResponse(opened
        ? { status: 'Pomodoro panel opened' }
        : { status: 'error', reason: 'Pomodoro panel is only available in the top page frame.' });
      return false;
    }

    if (message.action === 'getBlockDebugState') {
      global.DAD.safeRuntimeSendMessage({ action: 'getBlockedTabMuteDebugState' }, tabMuteState => {
        sendResponse(buildBlockDebugState(tabMuteState));
      });
      return true;
    }

    return false;
  });

  global.onpageshow = function(event) {
    if (event.persisted) {
      global.DAD.resetPageState();

      document.addEventListener('DOMContentLoaded', function() {
        performSiteCheck();
      });

      const readyStateCheckInterval = global.setInterval(function() {
        if (document.readyState === 'complete') {
          global.clearInterval(readyStateCheckInterval);
          performSiteCheck();
        }
      }, 10);
    }
  };
})(window);
