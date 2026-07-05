// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { sendTabMessage } from '../../platform/chrome/tabs.js';

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
  sendMessageToTab = sendTabMessage,
  setStatus
}) {
  return async function startElementPicker(options = {}) {
    const settings = readPickerSettings();
    const activeTab = await getActiveTab();

    if (!activeTab?.id) {
      setStatus(getMessage('popupOpenPageBeforePicking'));
      return;
    }

    const message = {
      action: 'startElementPicker',
      ...settings
    };
    if (options.initialAction) {
      message.initialAction = options.initialAction;
    }
    if (options.assignRuleToPlanId) {
      message.assignRuleToPlanId = options.assignRuleToPlanId;
    }

    const response = await sendMessageToTab(activeTab.id, message);

    if (response === null) {
      setStatus(getMessage('popupReloadBeforePicking'));
      return;
    }

    setStatus(response?.status || getMessage('popupElementPickerStarted'));
    window.close();
  };
}
