// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatUsageCount,
  formatUsageDuration,
  formatUsagePercent,
  getUsageStatsViewModel
} from '../../../src/js/popup/usage/usageStatsPanel.js';

describe('popup usage stats panel helpers', () => {
  const formatted1200 = new Intl.NumberFormat().format(1200);
  const formatted3400 = new Intl.NumberFormat().format(3400);

  const getMessage = (key, fallbackOrSubstitutions, maybeSubstitutions) => {
    const fallback = maybeSubstitutions === undefined ? key : fallbackOrSubstitutions;
    const substitutions = maybeSubstitutions === undefined ? fallbackOrSubstitutions : maybeSubstitutions;
    return String(fallback).replace(/\$(\d+)/g, (match, index) => (
      Array.isArray(substitutions) && substitutions[Number(index) - 1] !== undefined
        ? substitutions[Number(index) - 1]
        : match
    ));
  };

  it('formats bounded counts and durations for compact popup display', () => {
    assert.equal(formatUsageCount(1200.4), formatted1200);
    assert.equal(formatUsageCount(-3), '0');
    assert.equal(formatUsageDuration(3725 * 1000), '1h 2m');
    assert.equal(formatUsageDuration(125 * 1000), '2m 5s');
    assert.equal(formatUsageDuration(800), '1s');
    assert.equal(formatUsagePercent(24.6), '25%');
    assert.equal(formatUsagePercent(120), '100%');
  });

  it('builds a compact view model from the local usage summary', () => {
    const viewModel = getUsageStatsViewModel({
      summary: {
        retentionDays: 14,
        today: {
          visits: 9,
          activeMs: 90 * 60 * 1000,
          blockedActiveMs: 15 * 60 * 1000,
          allowedActiveMs: 75 * 60 * 1000,
          blockedWordCount: 1200,
          allowedWordCount: 3400,
          outcomeShares: {
            blockedActivePercent: 17,
            blockedVisitPercent: 22
          },
          domainCount: 4,
          topDomains: [
            {
              hostname: 'example.com',
              activeMs: 30 * 60 * 1000,
              blockedVisits: 2,
              allowedVisits: 3
            }
          ]
        }
      }
    }, getMessage);

    assert.equal(viewModel.statusText, 'Local aggregates - 14d retention');
    assert.equal(viewModel.visitsText, '9');
    assert.equal(viewModel.activeText, '1h 30m');
    assert.equal(viewModel.blockedActiveText, '15m 0s');
    assert.equal(viewModel.allowedActiveText, '1h 15m');
    assert.equal(viewModel.blockedShareText, '17% active / 22% visits');
    assert.equal(viewModel.domainsText, '4');
    assert.equal(viewModel.wordsText, `${formatted1200} blocked / ${formatted3400} allowed`);
    assert.deepEqual(viewModel.domainItems, [{
      hostname: 'example.com',
      meta: '30m 0s active - 2 blocked / 3 allowed visits'
    }]);
  });

  it('returns a zeroed empty state when usage stats are unavailable', () => {
    const viewModel = getUsageStatsViewModel(null, getMessage);

    assert.equal(viewModel.statusText, 'popupNoLocalUsageStats');
    assert.equal(viewModel.visitsText, '0');
    assert.equal(viewModel.activeText, '0s');
    assert.equal(viewModel.blockedShareText, '0% active / 0% visits');
    assert.equal(viewModel.domainItems.length, 0);
  });
});
