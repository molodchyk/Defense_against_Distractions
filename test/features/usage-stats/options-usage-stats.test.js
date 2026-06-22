// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const localizedUsageStatsKeys = [
  'usageStatsLocalAggregatesStatus',
  'usageStatsBlockedShareValue',
  'usageStatsDomainVisitsMeta',
  'usageStatsDomainActiveMeta',
  'usageStatsDomainBlockedActiveShareMeta',
  'usageStatsDomainBlockedVisitsMeta',
  'usageStatsDomainBlockedActiveMeta',
  'usageStatsDomainBlockedWordsMeta',
  'usageStatsDomainAllowedVisitsMeta',
  'usageStatsDomainAllowedWordsMeta',
  'usageStatsDomainTabsMaxMeta',
  'usageStatsDomainVideosMeta',
  'usageStatsDomainAudioMeta',
  'usageStatsDomainAudibleMeta',
  'usageStatsDomainGifsMeta',
  'usageStatsDomainLinksMeta'
];

describe('options usage stats blank state', () => {
  it('renders an explicit empty domain row instead of leaving the list blank', () => {
    const source = readFileSync('src/js/options/usageStats.js', 'utf8');
    const css = readFileSync('src/css/options/diagnostics.css', 'utf8');

    assert.match(source, /function createEmptyDomainItem/);
    assert.match(source, /usage-domain-empty/);
    assert.match(source, /popupNoLocalUsageStats/);
    assert.match(source, /replaceChildren\(\s*\.\.\.\(domainItems\.length > 0 \? domainItems : \[createEmptyDomainItem\(\)\]\)/);
    assert.match(css, /\.usage-domain-list \.usage-domain-empty/);
  });

  it('routes JavaScript-rendered domain metadata through localized messages', () => {
    const source = readFileSync('src/js/options/usageStats.js', 'utf8');
    const englishMessages = JSON.parse(readFileSync('_locales/en/messages.json', 'utf8'));

    for (const key of localizedUsageStatsKeys) {
      assert.match(source, new RegExp(key));
      assert.match(englishMessages[key]?.message || '', /\$1/);
    }

    assert.match(englishMessages.usageStatsBlockedShareValue.message, /\$2/);
    assert.match(source, /function formatUsageMetric/);
    assert.equal(source.includes('`${formatCount(domain.visits)} visits`'), false);
    assert.equal(source.includes('`Local aggregates · ${summary.retentionDays || 14}d retention`'), false);
    assert.equal(source.includes("'0% active / 0% visits'"), false);
  });
});
