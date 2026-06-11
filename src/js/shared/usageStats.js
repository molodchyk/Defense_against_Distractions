// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export {
  DEFAULT_USAGE_STATS_RETENTION_DAYS,
  USAGE_STATS_EXPORT_SCHEMA,
  USAGE_STATS_SCHEMA_VERSION,
  USAGE_STATS_STORAGE_KEY
} from './usage-stats/constants.js';
export {
  createUsageStatsState,
  normalizeUsageStats
} from './usage-stats/state.js';
export {
  recordUsagePageSignal
} from './usage-stats/record.js';
export {
  buildUsageStatsExportPayload,
  summarizeUsageStats
} from './usage-stats/summary.js';
