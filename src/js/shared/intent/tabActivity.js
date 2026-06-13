// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import { DEFAULT_INTENT_OPTIONS } from './constants.js';
import { normalizeTabActivations } from './state.js';
import { normalizeTabId, parseTimestamp } from './utils.js';

function getMaxTabActivationEntries(options = {}) {
  const maxEntries = Number(options.maxTabActivationEntries ?? DEFAULT_INTENT_OPTIONS.maxTabActivationEntries);
  return Number.isFinite(maxEntries)
    ? Math.max(1, Math.round(maxEntries))
    : DEFAULT_INTENT_OPTIONS.maxTabActivationEntries;
}

export function calculateRecentTabActivity(tabActivations = [], now = Date.now(), options = {}) {
  const rawWindowMs = Number(options.tabSwitchWindowMs ?? DEFAULT_INTENT_OPTIONS.tabSwitchWindowMs);
  const windowMs = Number.isFinite(rawWindowMs)
    ? Math.max(30 * 1000, rawWindowMs)
    : DEFAULT_INTENT_OPTIONS.tabSwitchWindowMs;
  const cutoff = now - windowMs;
  const recentActivations = normalizeTabActivations(tabActivations, options.maxTabActivationEntries)
    .filter(entry => {
      const activatedAtMs = parseTimestamp(entry.activatedAt);
      return activatedAtMs !== null && activatedAtMs >= cutoff && activatedAtMs <= now;
    });
  const uniqueTabIds = new Set(recentActivations.map(entry => entry.tabId));
  let switchCount = 0;
  let loopCount = 0;

  for (let index = 1; index < recentActivations.length; index += 1) {
    if (recentActivations[index].tabId !== recentActivations[index - 1].tabId) {
      switchCount += 1;
    }

    if (
      index >= 2
        && recentActivations[index].tabId === recentActivations[index - 2].tabId
        && recentActivations[index].tabId !== recentActivations[index - 1].tabId
    ) {
      loopCount += 1;
    }
  }

  return {
    windowMs,
    switchCount,
    loopCount,
    uniqueTabCount: uniqueTabIds.size,
    switchRatePerMinute: Number((switchCount / (windowMs / (60 * 1000))).toFixed(3)),
    lastActivatedAt: recentActivations.at(-1)?.activatedAt || null
  };
}

export function recordTabActivationState(state = {}, tabId, now = Date.now(), options = {}) {
  const normalizedTabId = normalizeTabId(tabId);

  if (!Number.isFinite(normalizedTabId)) {
    return {
      ...state,
      updatedAt: new Date(now).toISOString()
    };
  }

  const previousActivation = state.tabActivations?.at(-1);
  const shouldRecordActivation = previousActivation?.tabId !== normalizedTabId;
  const tabActivations = shouldRecordActivation
    ? [
        ...(Array.isArray(state.tabActivations) ? state.tabActivations : []),
        {
          tabId: normalizedTabId,
          sessionId: state.activeSessionId || null,
          activatedAt: new Date(now).toISOString()
        }
      ].slice(-getMaxTabActivationEntries(options))
    : state.tabActivations;

  return {
    ...state,
    activeTabId: normalizedTabId,
    tabActivations,
    updatedAt: new Date(now).toISOString()
  };
}
