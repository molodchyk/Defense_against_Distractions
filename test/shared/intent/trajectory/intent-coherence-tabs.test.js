// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detachIntentTabLineageEntries,
  getActiveIntentSession,
  getIntentChainReturnTabIds,
  getIntentDriftDescendantTabIds,
  getIntentInterventionDecision,
  getIntentSessionForTab,
  getIntentTabLineageEntry,
  INTENT_INTERVENTION_ACTIONS,
  recordIntentNavigationTransition,
  recordIntentPageVisit,
  recordIntentTabActivation,
  recordIntentTabCreated,
  recordIntentTabRemoved
} from '../../../../src/js/shared/intentCoherence.js';

describe('intent coherence tab lineage', () => {
  function pageSignal(overrides = {}) {
    return {
      url: 'https://docs.example.com/pde5-mechanism',
      hostname: 'docs.example.com',
      title: 'PDE5 inhibitor mechanism',
      text: {
        sampleLength: 1000,
        wordCount: 120,
        emojiCount: 0,
        topTokens: ['pde5', 'inhibitor', 'mechanism', 'sildenafil']
      },
      media: {
        imageCount: 1,
        videoCount: 0,
        audioCount: 0,
        gifCount: 0,
        iframeCount: 0
      },
      interaction: {
        linkCount: 12,
        buttonCount: 2,
        inputCount: 1,
        formCount: 0
      },
      structure: {
        elementCount: 160,
        feedCount: 0
      },
      activity: {
        pageAgeMs: 0,
        activePageMs: 0,
        scrollEvents: 0,
        clickEvents: 0,
        recommenderClickEvents: 0,
        keyEvents: 0,
        inputEvents: 0,
        recommenderClickRatePerMinute: 0,
        maxScrollDepthRatio: 0
      },
      ...overrides
    };
  }

  it('records active tab changes separately from page visits', () => {
    let state = recordIntentTabActivation(null, 42, { now: () => 1000 });
    state = recordIntentTabActivation(state, 42, { now: () => 1500 });
    state = recordIntentTabActivation(state, 43, { now: () => 2000 });

    assert.equal(state.activeTabId, 43);
    assert.equal(state.sessions.length, 0);
    assert.deepEqual(state.tabActivations.map(entry => entry.tabId), [42, 43]);
    assert.equal(state.tabActivations[0].activatedAt, new Date(1000).toISOString());
  });

  it('records tab lineage and connects a child tab to its opener session', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    const parentSession = getActiveIntentSession(state);
    const parentVisit = parentSession.visits[0];

    state = recordIntentTabCreated(state, {
      id: 2,
      openerTabId: 1
    }, { now: () => 1500 });

    const lineage = getIntentTabLineageEntry(state, 2);
    assert.equal(lineage.openerTabId, 1);
    assert.equal(lineage.rootTabId, 1);
    assert.equal(lineage.parentSessionId, parentSession.id);
    assert.equal(lineage.parentVisitId, parentVisit.id);
    assert.equal(getIntentSessionForTab(state, 2).id, parentSession.id);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://wikipedia.org/wiki/PDE5',
      hostname: 'wikipedia.org',
      title: 'PDE5 mechanism and sildenafil',
      text: {
        sampleLength: 1200,
        wordCount: 160,
        emojiCount: 0,
        topTokens: ['pde5', 'mechanism', 'sildenafil', 'inhibitor']
      }
    }), {
      now: () => 2000,
      tabId: 2
    });

    const activeSession = getActiveIntentSession(state);
    const childVisit = activeSession.visits[1];
    assert.equal(state.sessions.length, 1);
    assert.equal(childVisit.parentVisitId, parentVisit.id);
    assert.equal(childVisit.openerTabId, 1);
    assert.equal(childVisit.rootTabId, 1);
    assert.equal(activeSession.metrics.tabCount, 2);
    assert.equal(activeSession.metrics.branchCount, 1);
  });

  it('records top-frame navigation transitions and attaches matching visits', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });

    state = recordIntentNavigationTransition(state, {
      tabId: 1,
      frameId: 0,
      url: 'https://video.example.com/recommended-chain#comment',
      transitionType: 'link',
      transitionQualifiers: ['server_redirect', 'from_address_bar', 'unsupported']
    }, { now: () => 1500 });

    const lineage = getIntentTabLineageEntry(state, 1);
    assert.equal(lineage.transitionType, 'link');
    assert.deepEqual(lineage.transitionQualifiers, ['server_redirect', 'from_address_bar']);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/recommended-chain',
      hostname: 'video.example.com',
      title: 'Recommended clips chain'
    }), {
      now: () => 2000,
      tabId: 1
    });

    const activeSession = getActiveIntentSession(state);
    const latestVisit = activeSession.visits.at(-1);
    assert.equal(latestVisit.transitionType, 'link');
    assert.deepEqual(latestVisit.transitionQualifiers, ['server_redirect', 'from_address_bar']);
    assert.equal(activeSession.metrics.latestTransitionType, 'link');
    assert.equal(activeSession.metrics.redirectTransitionCount, 1);
    assert.ok(activeSession.metrics.redirectTransitionLoad > 0);
  });

  it('ignores non-top-frame navigation transitions', () => {
    const state = recordIntentNavigationTransition(null, {
      tabId: 5,
      frameId: 2,
      url: 'https://ads.example.com/',
      transitionType: 'link'
    }, { now: () => 1000 });

    assert.equal(getIntentTabLineageEntry(state, 5), null);
    assert.equal(state.sessions.length, 0);
  });

  it('marks child tabs opened from drifted visits as drift descendants', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), {
      now: () => 2000,
      tabId: 1
    });

    state = recordIntentTabCreated(state, {
      id: 3,
      openerTabId: 1
    }, { now: () => 2500 });

    assert.equal(getIntentTabLineageEntry(state, 3).driftDescendant, true);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 3000,
      tabId: 3
    });

    const childVisit = getActiveIntentSession(state).visits.at(-1);
    assert.equal(childVisit.driftDescendant, true);
    assert.equal(getActiveIntentSession(state).metrics.latestIsDriftDescendant, true);
    assert.ok(getIntentInterventionDecision(getActiveIntentSession(state)).reasonLines.includes(
      'Current tab descends from an already drifted chain'
    ));

  });

  it('marks block-action drift descendants as chain quarantine targets', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), {
      now: () => 2000,
      tabId: 1
    });
    state = recordIntentTabCreated(state, {
      id: 3,
      openerTabId: 1
    }, { now: () => 2500 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 3000,
      tabId: 3
    });

    const intervention = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 10
      },
      chainBlockCooldownMs: 5000,
      now: () => 4000
    });

    assert.equal(intervention.shouldIntervene, true);
    assert.equal(intervention.hardBlocked, true);
    assert.equal(intervention.chainBlock.active, true);
    assert.equal(intervention.chainBlock.mode, 'driftDescendant');
    assert.equal(intervention.chainBlock.driftDescendant, true);
    assert.equal(intervention.chainBlock.startedAt, new Date(3000).toISOString());
    assert.equal(intervention.chainBlock.cooldownActive, true);
    assert.equal(intervention.chainBlock.cooldownRemainingMs, 4000);
    assert.ok(intervention.reasonLines.includes('Current tab descends from a drifted chain'));

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 6000,
      tabId: 3
    });

    const afterRepeatedReport = getIntentInterventionDecision(getActiveIntentSession(state), {
      intentSettings: {
        action: INTENT_INTERVENTION_ACTIONS.BLOCK,
        interventionThreshold: 80,
        lockedThreshold: 10
      },
      chainBlockCooldownMs: 5000,
      now: () => 8000
    });

    assert.equal(afterRepeatedReport.chainBlock.active, true);
    assert.equal(afterRepeatedReport.chainBlock.startedAt, new Date(3000).toISOString());
    assert.equal(afterRepeatedReport.chainBlock.cooldownActive, false);
    assert.equal(afterRepeatedReport.chainBlock.cooldownRemainingMs, 0);
  });

  it('detaches a drift descendant from opener lineage when isolating the current tab', () => {
    let state = recordIntentPageVisit(null, pageSignal(), {
      now: () => 1000,
      tabId: 1
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/celebrity-reaction-feed',
      hostname: 'video.example.com',
      title: 'Celebrity drama reaction clips',
      text: {
        sampleLength: 2000,
        wordCount: 300,
        emojiCount: 8,
        topTokens: ['celebrity', 'drama', 'reaction', 'clips']
      },
      media: {
        imageCount: 40,
        videoCount: 4,
        audioCount: 0,
        gifCount: 4,
        iframeCount: 2
      },
      interaction: {
        linkCount: 260,
        buttonCount: 80,
        inputCount: 0,
        formCount: 0
      },
      structure: {
        elementCount: 320,
        feedCount: 3
      }
    }), {
      now: () => 2000,
      tabId: 1
    });
    state = recordIntentTabCreated(state, {
      id: 3,
      openerTabId: 1
    }, { now: () => 2500 });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://video.example.com/next-reaction',
      hostname: 'video.example.com',
      title: 'Next celebrity reaction clip'
    }), {
      now: () => 3000,
      tabId: 3
    });

    assert.equal(getIntentTabLineageEntry(state, 3).driftDescendant, true);

    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://docs.example.com/focused-note',
      hostname: 'docs.example.com',
      title: 'Focused note'
    }), {
      now: () => 4000,
      tabId: 3,
      forceNewSession: true,
      isolateTab: true
    });

    const isolatedSession = getActiveIntentSession(state);
    const isolatedVisit = isolatedSession.visits[0];
    assert.equal(getIntentTabLineageEntry(state, 3), null);
    assert.equal(isolatedSession.origin.hostname, 'docs.example.com');
    assert.equal(isolatedVisit.driftDescendant, false);
    assert.equal(isolatedVisit.parentVisitId, null);
    assert.equal(isolatedVisit.openerTabId, null);
    assert.equal(isolatedVisit.rootTabId, 3);
    assert.equal(isolatedSession.metrics.latestIsDriftDescendant, false);
    assert.equal(getIntentSessionForTab(state, 3).id, isolatedSession.id);
    assert.equal(getIntentInterventionDecision(isolatedSession).reasonLines.includes(
      'Current tab descends from an already drifted chain'
    ), false);
  });

  it('removes tab lineage when a tab closes', () => {
    let state = recordIntentTabCreated(null, {
      id: 4,
      openerTabId: 1
    }, { now: () => 1000 });

    assert.notEqual(getIntentTabLineageEntry(state, 4), null);
    state = recordIntentTabRemoved(state, 4, { now: () => 2000 });
    assert.equal(getIntentTabLineageEntry(state, 4), null);
  });

  it('selects only same-chain drift descendants for chain cleanup', () => {
    const state = {
      tabLineage: [
        { tabId: 1, rootTabId: 1, driftDescendant: false },
        { tabId: 2, rootTabId: 1, driftDescendant: true },
        { tabId: 3, rootTabId: 1, driftDescendant: true },
        { tabId: 4, rootTabId: 4, driftDescendant: true },
        { tabId: 5, rootTabId: 1, driftDescendant: false }
      ]
    };

    assert.deepEqual(getIntentDriftDescendantTabIds(state, { currentTabId: 2 }), [3]);
    assert.deepEqual(getIntentDriftDescendantTabIds(state, { currentTabId: 2, includeCurrent: true }), [2, 3]);
    assert.deepEqual(getIntentDriftDescendantTabIds(state, { currentTabId: 1 }), [2, 3]);
    assert.deepEqual(getIntentDriftDescendantTabIds(state, {}), []);
    assert.deepEqual(getIntentChainReturnTabIds(state, { currentTabId: 1 }), [1, 2, 3]);
    assert.deepEqual(getIntentChainReturnTabIds(state, { currentTabId: 2 }), [2, 3]);
    assert.deepEqual(getIntentChainReturnTabIds(state, {}), []);
  });

  it('uses the current tab as the chain root when the root tab has no lineage entry', () => {
    const state = {
      tabLineage: [
        { tabId: 2, rootTabId: 1, driftDescendant: true },
        { tabId: 3, rootTabId: 1, driftDescendant: true },
        { tabId: 4, rootTabId: 4, driftDescendant: true }
      ]
    };

    assert.deepEqual(getIntentDriftDescendantTabIds(state, { currentTabId: 1 }), [2, 3]);
    assert.deepEqual(getIntentChainReturnTabIds(state, { currentTabId: 1 }), [1, 2, 3]);
  });

  it('detaches only selected returned drift tabs from tab lineage', () => {
    const state = {
      activeTabId: 1,
      activeSessionId: null,
      updatedAt: new Date(1000).toISOString(),
      sessions: [],
      feedback: [],
      tabLineage: [
        { tabId: 1, rootTabId: 1, driftDescendant: false },
        { tabId: 2, rootTabId: 1, driftDescendant: true },
        { tabId: 3, rootTabId: 1, driftDescendant: true },
        { tabId: 4, rootTabId: 4, driftDescendant: true }
      ]
    };

    const nextState = detachIntentTabLineageEntries(state, [2, 4], { now: () => 2000 });

    assert.deepEqual(nextState.tabLineage.map(entry => entry.tabId), [1, 3]);
    assert.equal(nextState.activeTabId, 1);
    assert.equal(nextState.updatedAt, new Date(2000).toISOString());
  });

  it('finds the latest session that belongs to a tab', () => {
    let state = recordIntentPageVisit(null, pageSignal({
      url: 'https://tab-one.example.com/',
      hostname: 'tab-one.example.com'
    }), {
      now: () => 1000,
      tabId: 1,
      idleResetMs: 1000
    });
    state = recordIntentPageVisit(state, pageSignal({
      url: 'https://tab-two.example.com/',
      hostname: 'tab-two.example.com'
    }), {
      now: () => 3000,
      tabId: 2,
      idleResetMs: 1000
    });

    assert.equal(getIntentSessionForTab(state, 1).origin.hostname, 'tab-one.example.com');
    assert.equal(getIntentSessionForTab(state, 2).origin.hostname, 'tab-two.example.com');
  });
});
