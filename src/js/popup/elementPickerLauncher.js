// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

function readPickerSettings() {
  return {
    strategy: document.getElementById('matchStrategySelect').value,
    minScore: Number.parseInt(document.getElementById('minimumScoreInput').value, 10),
    ancestorDepth: Number.parseInt(document.getElementById('ancestorDepthInput').value, 10),
    labelMatch: document.getElementById('labelMatchSelect').value
  };
}

export function createElementPickerLauncher({
  getActiveTab,
  getMessage,
  setStatus
}) {
  return async function startElementPicker() {
    const settings = readPickerSettings();
    const activeTab = await getActiveTab();

    if (!activeTab?.id) {
      setStatus(getMessage('popupOpenPageBeforePicking'));
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, {
      action: 'startElementPicker',
      ...settings
    }, response => {
      if (chrome.runtime.lastError) {
        setStatus(getMessage('popupReloadBeforePicking'));
        return;
      }

      setStatus(response?.status || getMessage('popupElementPickerStarted'));
      window.close();
    });
  };
}
