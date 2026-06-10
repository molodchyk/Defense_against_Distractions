// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  setTextWithTitle
} from './dom.js';

const BLOCK_DIAGNOSTIC_TEXT_IDS = [
  'blockPageStateText',
  'blockOverlayStateText',
  'blockMediaStateText',
  'blockTabMuteStateText',
  'blockTriggerText',
  'blockScoreText'
];

export function createBlockDiagnosticsPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendTabMessage,
  onActiveTabChange,
  onStateChange
}) {
  let latestDebugState = null;

  function setUnavailable(message = getMessage('popupUnavailableLabel')) {
    latestDebugState = null;
    const status = document.getElementById('blockDiagnosticsStatus');
    status.textContent = message;
    status.dataset.state = 'idle';

    BLOCK_DIAGNOSTIC_TEXT_IDS.forEach(elementId => {
      setTextWithTitle(elementId, '--');
    });

    onStateChange?.(latestDebugState);
  }

  function formatBlockStateLabel(active, activeText, inactiveText = getMessage('popupClearState')) {
    return active ? activeText : inactiveText;
  }

  function formatBlockMediaState(media = {}) {
    const suspendedMediaCount = Number(media.suspendedMediaCount || 0);
    const suspendedFrameCount = Number(media.suspendedFrameCount || 0);
    const currentMediaElementCount = Number(media.currentMediaElementCount || 0);
    const currentEmbeddedFrameCount = Number(media.currentEmbeddedFrameCount || 0);
    const suspendedTotal = suspendedMediaCount + suspendedFrameCount;
    const currentTotal = currentMediaElementCount + currentEmbeddedFrameCount;

    if (suspendedTotal > 0) {
      return getMessage('popupMediaSuspendedSummary', [suspendedMediaCount, suspendedFrameCount]);
    }

    if (media.lastRestoreSummary) {
      return getMessage('popupMediaRestoredSummary', [
        media.lastRestoreSummary.restoredMediaCount || 0,
        media.lastRestoreSummary.restoredFrameCount || 0
      ]);
    }

    return currentTotal > 0
      ? getMessage('popupMediaCapableElements', [currentTotal])
      : getMessage('popupNoneDetected');
  }

  function formatTabMuteState(tabMute = {}) {
    if (tabMute.tracked) {
      return tabMute.originalMuted === true ? getMessage('popupMutedOriginallyMuted') : getMessage('popupMutedByDad');
    }

    if (tabMute.lastAction === 'restored') {
      return tabMute.restoredMutedState ? getMessage('popupRestoredMutedState') : getMessage('popupRestoredUnmutedState');
    }

    if (tabMute.lastAction === 'restoreSkipped') {
      return getMessage('popupRestoreSkipped');
    }

    return getMessage('popupNotTracked');
  }

  function formatBlockTrigger(debugState = {}) {
    const trigger = debugState.blockDiagnostics?.latestTrigger;
    if (!trigger) {
      return getMessage('popupNoTriggerRecorded');
    }

    const keyword = trigger.keyword || getMessage('popupUnknownLabel');
    const source = trigger.source ? ` · ${trigger.source}` : '';
    return `${keyword}${source}`;
  }

  function formatBlockScore(debugState = {}) {
    const diagnosticsScore = debugState.blockDiagnostics?.finalScore;
    const pageScore = debugState.pageScore;
    const score = diagnosticsScore ?? pageScore;
    if (!Number.isFinite(Number(score))) {
      return '--';
    }

    const trigger = debugState.blockDiagnostics?.latestTrigger;
    const delta = trigger ? ` · ${trigger.operation || '+'}${trigger.value ?? 0}` : '';
    return `${Math.round(Number(score))}${delta}`;
  }

  function render(debugState) {
    latestDebugState = debugState || null;
    const status = document.getElementById('blockDiagnosticsStatus');

    if (!debugState) {
      setUnavailable();
      return;
    }

    const active = Boolean(debugState.pageBlocked || debugState.hasOverlay);
    status.textContent = active ? getMessage('popupBlockedState') : getMessage('popupClearButton');
    status.dataset.state = active ? 'active' : 'ready';

    setTextWithTitle('blockPageStateText', formatBlockStateLabel(debugState.pageBlocked, getMessage('popupBlockedState')));
    setTextWithTitle(
      'blockOverlayStateText',
      formatBlockStateLabel(debugState.hasOverlay, getMessage('popupBlockedOverlayIn', [debugState.overlayParent || getMessage('popupPageLabel')]))
    );
    setTextWithTitle('blockMediaStateText', formatBlockMediaState(debugState.media));
    setTextWithTitle('blockTabMuteStateText', formatTabMuteState(debugState.tabMute));
    setTextWithTitle('blockTriggerText', formatBlockTrigger(debugState));
    setTextWithTitle('blockScoreText', formatBlockScore(debugState));
    onStateChange?.(latestDebugState);
  }

  async function refresh() {
    const activeTab = await getActiveTab();
    onActiveTabChange?.(activeTab || null);

    if (!activeTab?.id || isExtensionPage(activeTab.url)) {
      setUnavailable(getMessage('popupNoPageLabel'));
      return null;
    }

    const debugState = await sendTabMessage(activeTab.id, { action: 'getBlockDebugState' });
    if (!debugState) {
      setUnavailable(getMessage('popupNoScriptLabel'));
      return null;
    }

    render(debugState);
    return latestDebugState;
  }

  function getDebugState() {
    return latestDebugState;
  }

  return {
    getDebugState,
    refresh,
    render,
    setUnavailable
  };
}
