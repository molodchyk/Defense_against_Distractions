// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const usageStatsLocalizedMessageKeys = [
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

export function getUsageStatsLocalizationFailures({ englishMessages, usageStatsModule }) {
  const missingMessages = usageStatsLocalizedMessageKeys
    .filter(key => !englishMessages[key]?.message);
  const missingModuleReferences = usageStatsLocalizedMessageKeys
    .filter(key => !usageStatsModule.includes(key));
  const missingValuePlaceholder = usageStatsLocalizedMessageKeys
    .filter(key => !/\$1/.test(englishMessages[key]?.message || ''));
  const failures = [];

  if (
    missingMessages.length > 0
    || missingModuleReferences.length > 0
    || missingValuePlaceholder.length > 0
    || !/\$2/.test(englishMessages.usageStatsBlockedShareValue?.message || '')
    || !/function formatUsageMetric/.test(usageStatsModule)
    || /`\$\{formatCount\(domain\.visits\)\} visits`/.test(usageStatsModule)
    || /`Local aggregates · \$\{summary\.retentionDays \|\| 14\}d retention`/.test(usageStatsModule)
    || /'0% active \/ 0% visits'/.test(usageStatsModule)
  ) {
    failures.push(
      'Options usage stats dynamic labels must use localized messages, including domain metadata, retention status, and blocked-share ratios.'
    );
  }

  return failures;
}
