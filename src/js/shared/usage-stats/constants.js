// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const USAGE_STATS_STORAGE_KEY = 'usageStats';
export const USAGE_STATS_SCHEMA_VERSION = 2;
export const USAGE_STATS_EXPORT_SCHEMA = 'dad.usageStats.v2';

export const DEFAULT_USAGE_STATS_RETENTION_DAYS = 14;
export const DEFAULT_MAX_DOMAINS_PER_DAY = 80;
export const DEFAULT_MAX_CONTEXTS = 160;
export const CONTEXT_STALE_MS = 20 * 60 * 1000;

export const TEXT_KEYS = ['sampleLength', 'wordCount', 'emojiCount'];
export const MEDIA_KEYS = ['imageCount', 'videoCount', 'audioCount', 'audibleMediaCount', 'gifCount', 'iframeCount'];
export const INTERACTION_KEYS = ['linkCount', 'buttonCount', 'inputCount', 'formCount'];
export const STRUCTURE_KEYS = ['elementCount', 'feedCount', 'recommendationRegionCount', 'commentSectionCount', 'shortFormMediaCount'];
