// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  formatCount
} from './format.js';

const PAGE_SIGNAL_COUNT_IDS = [
  'pageSignalImageCount',
  'pageSignalVideoCount',
  'pageSignalAudioCount',
  'pageSignalGifCount',
  'pageSignalEmojiCount',
  'pageSignalLinkCount'
];

export function createPageSignalsPanel({
  getMessage,
  getActiveTab,
  isExtensionPage,
  sendTabMessage,
  onActiveTabChange
}) {
  let latestSnapshot = null;

  function setUnavailable(message = getMessage('popupUnavailableLabel')) {
    latestSnapshot = null;
    document.getElementById('pageSignalsStatus').textContent = message;
    PAGE_SIGNAL_COUNT_IDS.forEach(elementId => {
      document.getElementById(elementId).textContent = '--';
    });
  }

  function render(response) {
    const signals = response?.signals;
    if (!signals) {
      setUnavailable();
      return;
    }

    latestSnapshot = response;
    document.getElementById('pageSignalsStatus').textContent = getMessage('popupCurrentTabStatus');
    document.getElementById('pageSignalImageCount').textContent = formatCount(signals.media?.imageCount);
    document.getElementById('pageSignalVideoCount').textContent = formatCount(signals.media?.videoCount);
    document.getElementById('pageSignalAudioCount').textContent = formatCount(signals.media?.audioCount);
    document.getElementById('pageSignalGifCount').textContent = formatCount(signals.media?.gifCount);
    document.getElementById('pageSignalEmojiCount').textContent = formatCount(signals.text?.emojiCount);
    document.getElementById('pageSignalLinkCount').textContent = formatCount(signals.interaction?.linkCount);
  }

  async function refresh() {
    const activeTab = await getActiveTab();
    onActiveTabChange(activeTab || null);

    if (!activeTab?.id || isExtensionPage(activeTab.url)) {
      setUnavailable(getMessage('popupNoPageLabel'));
      return null;
    }

    const response = await sendTabMessage(activeTab.id, { action: 'getPageSignalSnapshot' });
    render(response);
    return latestSnapshot;
  }

  function getSnapshot() {
    return latestSnapshot;
  }

  return {
    getSnapshot,
    refresh,
    render,
    setUnavailable
  };
}
