// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  PLANS_STORAGE_KEY,
  getEffectiveGroupsForUrl,
  isPlanActive,
  normalizePlans
} from '../shared/plans.js';
import {
  normalizeUrl
} from '../shared/url.js';
import {
  setTextWithTitle
} from './dom.js';

export function createProtectionSummaryPanel({
  getMessage,
  getSyncStorage,
  isExtensionPage,
  getBlockDebugState,
  getPomodoroSummary,
  getIntentSummary
}) {
  let cachedPlans = [];
  let latestActiveTab = null;

  function getActivePlans() {
    return cachedPlans.filter(plan => isPlanActive(plan));
  }

  function summarizeNames(names, emptyText, maxVisible = 2) {
    const visibleNames = Array.isArray(names)
      ? names.map(name => String(name || '').trim()).filter(Boolean)
      : [];

    if (visibleNames.length === 0) {
      return emptyText;
    }

    if (visibleNames.length <= maxVisible) {
      return visibleNames.join(', ');
    }

    return `${visibleNames.slice(0, maxVisible).join(', ')} +${visibleNames.length - maxVisible}`;
  }

  function getPageSummary(activeTab = latestActiveTab) {
    const blockDebugState = getBlockDebugState();

    if (!activeTab?.url || isExtensionPage(activeTab.url)) {
      return {
        state: 'idle',
        text: getMessage('popupNoWebPage')
      };
    }

    if (blockDebugState?.pageBlocked || blockDebugState?.hasOverlay) {
      const trigger = blockDebugState?.blockDiagnostics?.latestTrigger;
      return {
        state: 'active',
        text: trigger?.keyword
          ? getMessage('popupBlockedWithKeyword', [trigger.keyword])
          : getMessage('popupBlockedOverlayActive')
      };
    }

    const normalizedUrl = normalizeUrl(activeTab.url);
    const activePlans = getActivePlans();
    const matchingGroups = getEffectiveGroupsForUrl({ [PLANS_STORAGE_KEY]: cachedPlans }, normalizedUrl);
    const allowedPlans = activePlans.filter(plan => plan.allowedSites.some(site => normalizedUrl.includes(site)));

    if (allowedPlans.length > 0) {
      return {
        state: 'idle',
        text: getMessage('popupAllowedByPlans', [summarizeNames(allowedPlans.map(plan => plan.name), 'plan')])
      };
    }

    if (matchingGroups.length > 0) {
      return {
        state: 'active',
        text: getMessage(
          'popupMatchedGroups',
          [summarizeNames(matchingGroups.map(group => group.groupName || group.name), `${matchingGroups.length} groups`)]
        )
      };
    }

    if (activePlans.length > 0) {
      return {
        state: 'ready',
        text: getMessage('popupNoMatchingRule')
      };
    }

    return {
      state: 'idle',
      text: getMessage('popupNoActivePlan')
    };
  }

  function getOverallState(summaries, activePlans) {
    if (summaries.some(summary => summary.state === 'active')) {
      return {
        state: 'active',
        text: getMessage('popupActiveState')
      };
    }

    if (activePlans.length > 0 || summaries.some(summary => summary.state === 'ready')) {
      return {
        state: 'ready',
        text: getMessage('popupReadyState')
      };
    }

    return {
      state: 'idle',
      text: getMessage('popupIdleState')
    };
  }

  function getSummaries() {
    const activePlans = getActivePlans();
    const pageSummary = getPageSummary();
    const pomodoroSummary = getPomodoroSummary();
    const intentSummary = getIntentSummary();
    const overall = getOverallState([pageSummary, pomodoroSummary, intentSummary], activePlans);

    return {
      activePlans,
      pageSummary,
      pomodoroSummary,
      intentSummary,
      overall
    };
  }

  function render() {
    const {
      activePlans,
      pageSummary,
      pomodoroSummary,
      intentSummary,
      overall
    } = getSummaries();
    const badge = document.getElementById('protectionStatusBadge');

    badge.textContent = overall.text;
    badge.dataset.state = overall.state;
    setTextWithTitle('activePlansText', cachedPlans.length === 0
      ? getMessage('popupNoPlansConfigured')
      : activePlans.length === 0
        ? getMessage('popupActivePlansSummary', ['0', cachedPlans.length])
        : summarizeNames(activePlans.map(plan => plan.name), getMessage('popupActivePlansFallback', [activePlans.length])));
    setTextWithTitle('currentProtectionText', pageSummary.text);
    setTextWithTitle('pomodoroProtectionText', pomodoroSummary.text);
    setTextWithTitle('intentProtectionText', intentSummary.text);
  }

  async function refreshPlans() {
    const items = await getSyncStorage({ [PLANS_STORAGE_KEY]: [] });
    setPlans(items?.[PLANS_STORAGE_KEY]);
  }

  function setPlans(plans) {
    cachedPlans = normalizePlans(plans);
    render();
  }

  function setActiveTab(activeTab) {
    latestActiveTab = activeTab || null;
  }

  function getActiveTabSnapshot() {
    return latestActiveTab;
  }

  function getDiagnosticsSnapshot() {
    const {
      activePlans,
      pageSummary,
      pomodoroSummary,
      intentSummary
    } = getSummaries();

    return {
      activeTab: latestActiveTab ? {
        id: latestActiveTab.id ?? null,
        url: latestActiveTab.url || null,
        title: latestActiveTab.title || null
      } : null,
      protection: {
        badge: {
          text: document.getElementById('protectionStatusBadge')?.textContent || '',
          state: document.getElementById('protectionStatusBadge')?.dataset.state || null
        },
        plans: {
          activeCount: activePlans.length,
          activeNames: activePlans.map(plan => plan.name),
          totalCount: cachedPlans.length,
          text: document.getElementById('activePlansText')?.textContent || ''
        },
        page: {
          ...pageSummary,
          text: document.getElementById('currentProtectionText')?.textContent || pageSummary.text
        },
        pomodoro: {
          ...pomodoroSummary,
          text: document.getElementById('pomodoroProtectionText')?.textContent || pomodoroSummary.text
        },
        intent: {
          ...intentSummary,
          text: document.getElementById('intentProtectionText')?.textContent || intentSummary.text
        }
      }
    };
  }

  return {
    getActivePlans,
    getActiveTabSnapshot,
    getDiagnosticsSnapshot,
    getPageSummary,
    refreshPlans,
    render,
    setActiveTab,
    setPlans
  };
}
