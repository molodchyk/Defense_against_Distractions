// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildUsageStatsExportPayload,
  createUsageStatsState,
  normalizeUsageStats,
  recordUsagePageSignal,
  summarizeUsageStats
} from '../../../src/js/shared/usageStats.js';

describe('usage stats helpers', () => {
  const baseNow = Date.parse('2026-06-09T08:00:00.000Z');

  function usageSignal(overrides = {}) {
    return {
      url: 'https://www.video.example.com/watch?v=private',
      hostname: 'www.video.example.com',
      title: 'Private browsing title',
      text: {
        sampleLength: 500,
        wordCount: 80,
        emojiCount: 2,
        topTokens: ['private', 'secret']
      },
      media: {
        imageCount: 3,
        videoCount: 1,
        audioCount: 0,
        audibleMediaCount: 1,
        gifCount: 2,
        iframeCount: 1
      },
      interaction: {
        linkCount: 20,
        buttonCount: 5,
        inputCount: 1,
        formCount: 0
      },
      structure: {
        elementCount: 100,
        feedCount: 1,
        recommendationRegionCount: 2,
        commentSectionCount: 3,
        shortFormMediaCount: 1
      },
      activity: {
        pageAgeMs: 10000,
        activePageMs: 4000
      },
      ...overrides
    };
  }

  it('records bounded hostname aggregates without raw URL, title, or tokens', () => {
    const state = recordUsagePageSignal(
      createUsageStatsState(baseNow),
      usageSignal(),
      {
        now: () => baseNow + 10000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 9,
        windowCount: 2
      }
    );
    const day = state.days[0];
    const domain = day.domains[0];
    const serialized = JSON.stringify(state);

    assert.equal(domain.hostname, 'video.example.com');
    assert.equal(domain.visits, 1);
    assert.equal(domain.activeMs, 4000);
    assert.equal(domain.allowedSamples, 1);
    assert.equal(domain.allowedVisits, 1);
    assert.equal(domain.allowedActiveMs, 4000);
    assert.equal(domain.allowedWordCount, 80);
    assert.equal(domain.allowedTextMax.wordCount, 80);
    assert.equal(domain.blockedSamples, 0);
    assert.equal(domain.blockedVisits, 0);
    assert.equal(domain.blockedActiveMs, 0);
    assert.equal(domain.blockedWordCount, 0);
    assert.equal(domain.blockedTextMax.wordCount, 0);
    assert.equal(domain.tabMax, 9);
    assert.equal(domain.windowMax, 2);
    assert.equal(day.tabMax, 9);
    assert.equal(day.windowMax, 2);
    assert.equal(day.allowedVisits, 1);
    assert.equal(day.blockedVisits, 0);
    assert.equal(domain.mediaMax.videoCount, 1);
    assert.equal(domain.mediaMax.audibleMediaCount, 1);
    assert.equal(domain.interactionMax.linkCount, 20);
    assert.equal(domain.structureMax.recommendationRegionCount, 2);
    assert.equal(domain.structureMax.commentSectionCount, 3);
    assert.equal(domain.structureMax.shortFormMediaCount, 1);
    assert.equal(serialized.includes('watch?v=private'), false);
    assert.equal(serialized.includes('Private browsing title'), false);
    assert.equal(serialized.includes('secret'), false);
  });

  it('uses activity deltas for repeated samples in one page context', () => {
    const firstState = recordUsagePageSignal(
      createUsageStatsState(baseNow),
      usageSignal(),
      {
        now: () => baseNow + 10000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 8,
        windowCount: 1
      }
    );
    const secondState = recordUsagePageSignal(
      firstState,
      usageSignal({
        activity: {
          pageAgeMs: 15000,
          activePageMs: 9000
        }
      }),
      {
        now: () => baseNow + 15000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 11,
        windowCount: 2
      }
    );
    const domain = secondState.days[0].domains[0];

    assert.equal(secondState.days[0].samples, 2);
    assert.equal(secondState.days[0].visits, 1);
    assert.equal(secondState.days[0].activeMs, 9000);
    assert.equal(secondState.days[0].dwellMs, 15000);
    assert.equal(secondState.days[0].tabMax, 11);
    assert.equal(secondState.days[0].windowMax, 2);
    assert.equal(domain.samples, 2);
    assert.equal(domain.visits, 1);
    assert.equal(domain.tabMax, 11);
  });

  it('reclassifies a visit when an observed page later becomes blocked', () => {
    const firstState = recordUsagePageSignal(
      createUsageStatsState(baseNow),
      usageSignal(),
      {
        now: () => baseNow + 10000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 8,
        windowCount: 1
      }
    );
    const blockedState = recordUsagePageSignal(
      firstState,
      usageSignal({
        protection: {
          blocked: true,
          blockSource: 'keyword'
        },
        activity: {
          pageAgeMs: 16000,
          activePageMs: 10000
        }
      }),
      {
        now: () => baseNow + 16000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 8,
        windowCount: 1
      }
    );
    const day = blockedState.days[0];
    const domain = day.domains[0];
    const summary = summarizeUsageStats(blockedState, { now: () => baseNow + 16000 });

    assert.equal(domain.visits, 1);
    assert.equal(domain.activeMs, 10000);
    assert.equal(domain.dwellMs, 16000);
    assert.equal(domain.allowedVisits, 0);
    assert.equal(domain.allowedActiveMs, 0);
    assert.equal(domain.allowedDwellMs, 0);
    assert.equal(domain.allowedWordCount, 0);
    assert.equal(domain.blockedSamples, 1);
    assert.equal(domain.blockedVisits, 1);
    assert.equal(domain.blockedActiveMs, 10000);
    assert.equal(domain.blockedDwellMs, 16000);
    assert.equal(domain.blockedWordCount, 80);
    assert.equal(domain.blockedTextMax.wordCount, 80);
    assert.equal(day.allowedVisits, 0);
    assert.equal(day.blockedVisits, 1);
    assert.equal(day.blockedActiveMs, 10000);
    assert.equal(summary.today.blockedVisits, 1);
    assert.equal(summary.today.blockedActiveMs, 10000);
    assert.equal(summary.today.blockedWordCount, 80);
    assert.equal(summary.today.blockedTextMax.wordCount, 80);
    assert.equal(summary.today.allowedVisits, 0);
    assert.equal(summary.today.allowedWordCount, 0);
    assert.equal(summary.total.blockedTextMax.wordCount, 80);
    assert.equal(summary.total.blockedWordCount, 80);
    assert.equal(summary.total.allowedWordCount, 0);
    assert.equal(summary.today.outcomeShares.blockedVisitPercent, 100);
    assert.equal(summary.today.outcomeShares.blockedActivePercent, 100);
    assert.equal(summary.today.outcomeShares.blockedWordPercent, 100);
  });

  it('summarizes blocked outcome shares without storing raw browsing strings', () => {
    const state = normalizeUsageStats(
      {
        createdAt: '2026-06-09T08:00:00.000Z',
        updatedAt: '2026-06-09T08:10:00.000Z',
        days: [{
          dayKey: '2026-06-09',
          samples: 5,
          visits: 5,
          activeMs: 4000,
          dwellMs: 9000,
          allowedVisits: 3,
          allowedActiveMs: 3000,
          allowedWordCount: 120,
          blockedVisits: 2,
          blockedActiveMs: 1000,
          blockedWordCount: 80,
          updatedAt: '2026-06-09T08:10:00.000Z',
          domains: [{
            hostname: 'mixed.example.com',
            samples: 5,
            visits: 5,
            activeMs: 4000,
            allowedVisits: 3,
            allowedActiveMs: 3000,
            allowedWordCount: 120,
            blockedVisits: 2,
            blockedActiveMs: 1000,
            blockedWordCount: 80
          }]
        }],
        contexts: []
      },
      { now: () => baseNow + 600000 }
    );
    const summary = summarizeUsageStats(state, { now: () => baseNow + 600000 });

    assert.equal(summary.today.outcomeShares.visitTotal, 5);
    assert.equal(summary.today.outcomeShares.blockedVisitPercent, 40);
    assert.equal(summary.today.outcomeShares.blockedActivePercent, 25);
    assert.equal(summary.today.outcomeShares.blockedWordPercent, 40);
    assert.equal(summary.total.outcomeShares.blockedVisitPercent, 40);
    assert.equal(summary.today.topDomains[0].outcomeShares.blockedActivePercent, 25);
  });

  it('prunes old days and caps retained domains', () => {
    const oldDay = {
      dayKey: '2026-06-01',
      samples: 1,
      visits: 1,
      activeMs: 1000,
      dwellMs: 1000,
      updatedAt: '2026-06-01T12:00:00.000Z',
      domains: [{ hostname: 'old.example.com', samples: 1, visits: 1 }]
    };
    const today = {
      dayKey: '2026-06-09',
      samples: 3,
      visits: 3,
      activeMs: 3000,
      dwellMs: 3000,
      tabMax: 12,
      windowMax: 2,
      updatedAt: '2026-06-09T12:00:00.000Z',
      domains: [
        { hostname: 'first.example.com', samples: 1, visits: 1, activeMs: 1000, tabMax: 4 },
        { hostname: 'second.example.com', samples: 1, visits: 1, activeMs: 3000, tabMax: 12 },
        { hostname: 'third.example.com', samples: 1, visits: 1, activeMs: 2000, tabMax: 8 }
      ]
    };
    const state = normalizeUsageStats(
      {
        createdAt: '2026-06-01T12:00:00.000Z',
        updatedAt: '2026-06-09T12:00:00.000Z',
        days: [oldDay, today],
        contexts: []
      },
      {
        now: () => Date.parse('2026-06-09T12:00:00.000Z'),
        retentionDays: 2,
        maxDomainsPerDay: 2
      }
    );
    const summary = summarizeUsageStats(state, {
      now: () => Date.parse('2026-06-09T12:00:00.000Z')
    });

    assert.deepEqual(state.days.map(day => day.dayKey), ['2026-06-09']);
    assert.deepEqual(
      state.days[0].domains.map(domain => domain.hostname),
      ['second.example.com', 'third.example.com']
    );
    assert.equal(summary.total.domainCount, 2);
    assert.equal(summary.today.tabMax, 12);
    assert.equal(summary.total.tabMax, 12);
  });

  it('builds an inspectable local export payload without raw browsing strings', () => {
    const state = recordUsagePageSignal(
      createUsageStatsState(baseNow),
      usageSignal(),
      {
        now: () => baseNow + 10000,
        tabId: 1,
        frameId: 0,
        documentId: 'doc-1',
        tabCount: 7,
        windowCount: 1
      }
    );
    const payload = buildUsageStatsExportPayload(state, {
      exportedAt: '2026-06-09T08:00:30.000Z',
      now: () => baseNow + 30000
    });
    const serialized = JSON.stringify(payload);

    assert.equal(payload.schema, 'dad.usageStats.v2');
    assert.equal(payload.exportedAt, '2026-06-09T08:00:30.000Z');
    assert.equal(payload.summary.today.visits, 1);
    assert.equal(payload.summary.today.tabMax, 7);
    assert.equal(payload.summary.today.allowedWordCount, 80);
    assert.equal(payload.summary.today.blockedWordCount, 0);
    assert.equal(payload.summary.today.allowedTextMax.wordCount, 80);
    assert.equal(payload.summary.today.blockedTextMax.wordCount, 0);
    assert.equal(payload.state.days[0].domains[0].hostname, 'video.example.com');
    assert.equal(payload.state.days[0].domains[0].tabMax, 7);
    assert.equal(serialized.includes('watch?v=private'), false);
    assert.equal(serialized.includes('Private browsing title'), false);
    assert.equal(serialized.includes('secret'), false);
  });
});
