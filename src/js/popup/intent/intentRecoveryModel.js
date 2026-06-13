// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  INTENT_INTERVENTION_ACTIONS
} from '../../shared/intent/constants.js';
import {
  formatShortDuration,
  getHostnameLabel
} from '../format.js';

const DEFAULT_TIMELINE_MAX_ITEMS = 4;

export function formatReturnedChainStatus(returnedCount, getMessage) {
  const count = Math.max(0, Number(returnedCount || 0));
  if (count <= 0) {
    return getMessage('popupIntentReturned');
  }

  const tabNoun = count === 1
    ? getMessage('popupIntentTabSingular')
    : getMessage('popupIntentTabPlural');
  return getMessage('popupIntentReturnedChain', [String(count), tabNoun]);
}

export function countKnownDriftDescendantTabs(debugState = {}, currentTabId) {
  const tabId = Number(currentTabId);
  const lineage = Array.isArray(debugState?.state?.tabLineage) ? debugState.state.tabLineage : [];
  const currentLineage = Number.isFinite(tabId)
    ? lineage.find(entry => Number(entry.tabId) === tabId)
    : null;
  const rootTabId = Number(currentLineage?.rootTabId);
  const countedTabIds = new Set();

  lineage.forEach(entry => {
    const entryTabId = Number(entry?.tabId);
    if (entry?.driftDescendant !== true || !Number.isFinite(entryTabId) || entryTabId === tabId) {
      return;
    }

    if (Number.isFinite(rootTabId) && Number(entry.rootTabId) !== rootTabId) {
      return;
    }

    countedTabIds.add(entryTabId);
  });

  return countedTabIds.size;
}

export function formatDriftDescendantTabCount(driftDescendantCount, getMessage) {
  const count = Math.max(0, Number(driftDescendantCount || 0));
  if (count <= 0) {
    return getMessage('popupNoneDetectedTitleCase');
  }

  const tabNoun = count === 1
    ? getMessage('popupIntentTabSingular')
    : getMessage('popupIntentTabPlural');
  return `${count} ${tabNoun}`;
}

export function getIntentRecoveryTimeline(visits = [], options = {}) {
  const normalizedVisits = Array.isArray(visits) ? visits.filter(Boolean) : [];
  if (normalizedVisits.length === 0) {
    return [];
  }

  const requestedMaxItems = Number(options.maxItems);
  const maxItems = Math.max(2, Math.min(6, Math.round(
    Number.isFinite(requestedMaxItems) ? requestedMaxItems : DEFAULT_TIMELINE_MAX_ITEMS
  )));
  const lastIndex = normalizedVisits.length - 1;
  const firstDriftVisitId = options.firstDriftVisitId || null;
  const firstDriftIndex = firstDriftVisitId
    ? normalizedVisits.findIndex(visit => visit?.id === firstDriftVisitId)
    : -1;
  const selectedIndexes = new Set([0, lastIndex]);

  if (firstDriftIndex > -1) {
    selectedIndexes.add(firstDriftIndex);
  }

  for (let index = lastIndex; index >= 0 && selectedIndexes.size < maxItems; index -= 1) {
    selectedIndexes.add(index);
  }

  const orderedIndexes = Array.from(selectedIndexes)
    .filter(index => index >= 0 && index <= lastIndex)
    .sort((a, b) => a - b);

  let previousIndex = -1;
  return orderedIndexes.map(index => {
    const visit = normalizedVisits[index] || {};
    const markers = [];
    if (index === 0) {
      markers.push('origin');
    }
    if (firstDriftVisitId && visit.id === firstDriftVisitId) {
      markers.push('firstDrift');
    }
    if (visit.driftDescendant) {
      markers.push('driftDescendant');
    }
    if (index === lastIndex) {
      markers.push('current');
    }

    const skippedBefore = Math.max(0, index - previousIndex - 1);
    previousIndex = index;

    return {
      id: visit.id || null,
      index,
      label: getHostnameLabel(visit),
      markers,
      skippedBefore,
      startedAt: visit.startedAt || null,
      activeMs: visit.activeMs ?? visit.signals?.activity?.activePageMs ?? null,
      transitionType: visit.transitionType || ''
    };
  });
}

export function getIntentRecoverySummary(riskState, intervention = {}, getMessage) {
  if (intervention.chainBlock?.active) return getMessage('popupIntentChainBlockedSummary');
  if (riskState === 'locked') return getMessage('popupIntentLockedSummary');
  if (riskState === 'intervene') return getMessage('popupIntentInterveneSummary');
  if (riskState === 'drift') return getMessage('popupIntentDriftSummary');
  if (riskState === 'watch') return getMessage('popupIntentWatchSummary');
  if (riskState === 'clear') return getMessage('popupIntentClearSummary');
  return getMessage('popupIntentNoTrajectorySummary');
}

const ACTION_MESSAGE_KEYS = Object.freeze({
  [INTENT_INTERVENTION_ACTIONS.WARN]: 'popupIntentActionWarnLabel',
  [INTENT_INTERVENTION_ACTIONS.GRAYSCALE]: 'popupIntentActionGrayscaleLabel',
  [INTENT_INTERVENTION_ACTIONS.REDUCE_NOISE]: 'popupIntentActionReduceNoiseLabel',
  [INTENT_INTERVENTION_ACTIONS.PROMPT]: 'popupIntentActionPromptLabel',
  [INTENT_INTERVENTION_ACTIONS.BLOCK]: 'popupIntentActionBlockLabel'
});

function getActionLabel(action, getMessage) {
  const messageKey = ACTION_MESSAGE_KEYS[action];
  return messageKey ? getMessage(messageKey) : String(action || '--');
}

function formatChainBlockStatus(chainBlock = {}, getMessage) {
  const parts = [getMessage('popupIntentChainQuarantineLabel')];
  if (chainBlock.mode === 'driftDescendant') {
    parts.push(getMessage('popupIntentDriftDescendantLabel'));
  } else if (chainBlock.mode === 'lockedChain') {
    parts.push(getMessage('popupIntentLockedChainLabel'));
  }

  if (chainBlock.cooldownActive) {
    const messageKey = chainBlock.autoCloseCurrentTab
      ? 'popupIntentAutoCloseIn'
      : 'popupIntentAutoReturnIn';
    parts.push(getMessage(messageKey, [formatShortDuration(chainBlock.cooldownRemainingMs)]));
  } else if (Number(chainBlock.cooldownMs || 0) > 0) {
    parts.push(getMessage(chainBlock.autoCloseCurrentTab
      ? 'popupIntentAutoCloseReady'
      : 'popupIntentAutoReturnReady'));
  }

  return parts.join(' - ');
}

export function formatIntentInterventionStatus(intervention = {}, getMessage) {
  const settings = intervention?.settings || {};
  if (!settings.enabled) {
    return getMessage('popupIntentInterventionInactive');
  }

  if (intervention?.chainBlock?.active) {
    return formatChainBlockStatus(intervention.chainBlock, getMessage);
  }

  if (!intervention?.shouldIntervene) {
    return getMessage('popupIntentInterventionInactive');
  }

  const actionLabel = getActionLabel(intervention.action || settings.action, getMessage);
  const riskState = String(intervention.riskState || '').trim();
  return riskState ? `${actionLabel} - ${riskState}` : actionLabel;
}

function formatSignedDelta(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number === 0) {
    return '0';
  }

  return number > 0 ? `+${number}` : String(number);
}

export function formatIntentPolicyStatus(intervention = {}) {
  const settings = intervention?.settings || {};
  if (!settings.enabled) {
    return '--';
  }

  const threshold = Number.isFinite(Number(settings.interventionThreshold))
    ? `<= ${settings.interventionThreshold}`
    : '<= --';
  const calibration = settings.calibration || {};
  const parts = [`${settings.action || '--'} ${threshold}`];
  const delta = Number(calibration.thresholdDelta || 0);

  if (calibration.actionEscalated) {
    parts.push(`${calibration.baselineAction || '--'} -> ${calibration.effectiveAction || settings.action || '--'}`);
  }

  if (delta !== 0) {
    parts.push(`threshold ${formatSignedDelta(delta)}`);
  }

  if (Number(calibration.outcomeTotal || 0) > 0) {
    parts.push(`${Math.round(Number(calibration.outcomeTotal))} outcomes`);
  }

  return parts.join(' - ');
}
