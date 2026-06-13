// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const DRIFT_TAB_ACTIONS = Object.freeze({
  clean: {
    countKey: 'closedCount',
    emptyKey: 'popupIntentNoDriftTabsClosed',
    runtimeAction: 'closeIntentDriftDescendantTabs',
    status: 'closed',
    successKey: 'popupIntentCleanedTabs'
  },
  move: {
    countKey: 'movedCount',
    emptyKey: 'popupIntentNoOtherDriftTabs',
    runtimeAction: 'moveIntentDriftDescendantTabsToWindow',
    status: 'moved',
    successKey: 'popupIntentMovedTabs'
  },
  return: {
    countKey: 'returnedCount',
    emptyKey: 'popupIntentNoOtherDriftTabs',
    needsRecoveryUrl: true,
    runtimeAction: 'returnIntentDriftDescendantTabs',
    status: 'returned',
    successKey: 'popupIntentReturnedTabs'
  },
  suspend: {
    countKey: 'suspendedCount',
    emptyKey: 'popupIntentNoOtherDriftTabs',
    runtimeAction: 'suspendIntentDriftDescendantTabs',
    status: 'suspended',
    successKey: 'popupIntentSuspendedTabs'
  }
});

export function createIntentDriftTabActions({
  getActiveTab,
  getLatestActiveTab,
  getLatestDebugState,
  getMessage,
  refreshIntentState,
  sendRuntimeMessage,
  setActionsDisabled,
  setStatus
}) {
  function formatActionStatus(config, response) {
    const count = Number(response?.[config.countKey] || 0);
    const tabNoun = count === 1
      ? getMessage('popupIntentTabSingular')
      : getMessage('popupIntentTabPlural');

    return count > 0
      ? getMessage(config.successKey, [String(count), tabNoun])
      : getMessage(config.emptyKey);
  }

  async function runDriftTabAction(actionKey) {
    const config = DRIFT_TAB_ACTIONS[actionKey];
    const activeTab = getLatestActiveTab() || await getActiveTab();
    const recoveryUrl = getLatestDebugState()?.intervention?.recoveryUrl;

    if (!config || !activeTab?.id || (config.needsRecoveryUrl && !recoveryUrl)) {
      setStatus(getMessage('popupIntentActionFailed'));
      return;
    }

    setActionsDisabled(true);
    const message = {
      action: config.runtimeAction,
      tabId: activeTab.id,
      includeCurrent: false
    };
    if (config.needsRecoveryUrl) {
      message.recoveryUrl = recoveryUrl;
    }

    const response = await sendRuntimeMessage(message);
    setStatus(response?.status === config.status
      ? formatActionStatus(config, response)
      : getMessage('popupIntentActionFailed'));
    await refreshIntentState?.();
  }

  return {
    cleanDriftTabs: () => runDriftTabAction('clean'),
    moveDriftTabs: () => runDriftTabAction('move'),
    returnDriftTabs: () => runDriftTabAction('return'),
    suspendDriftTabs: () => runDriftTabAction('suspend')
  };
}
