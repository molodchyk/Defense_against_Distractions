// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

function toCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function readMessage(getMessage, key, fallback, substitutions) {
  if (typeof getMessage !== 'function') {
    return fallback;
  }

  return getMessage(key, fallback, substitutions) || fallback;
}

function formatCountPart(options, key, fallback, count) {
  return readMessage(options.getMessage, key, fallback, [String(count)]);
}

export function formatScheduleActivitySummary(counts = {}, options = {}) {
  const separator = options.separator || ' · ';
  const saved = toCount(counts.saved);
  const enabled = toCount(counts.enabled);
  const disabled = toCount(counts.disabled);
  const incomplete = toCount(counts.incomplete);
  const activeNow = toCount(counts.activeNow);
  const noSchedulesMessage = options.noSchedulesMessage || 'No schedules yet.';

  if (saved === 0) {
    return noSchedulesMessage;
  }

  const parts = [
    formatCountPart(options, 'scheduleActiveNowSummaryPart', `${activeNow} active now`, activeNow)
  ];

  if (options.includeEnabled === true) {
    parts.push(formatCountPart(
      options,
      'scheduleEnabledSummaryPart',
      `${enabled} enabled ${pluralize(enabled, 'time block', 'time blocks')}`,
      enabled
    ));
  }

  if (options.includeSaved !== false) {
    const savedSummaryKey = options.savedSummaryKey || 'scheduleSavedSummaryPart';
    const savedSummaryFallback = options.savedSummaryFallback
      || `${saved} saved ${pluralize(saved, 'time block', 'time blocks')}`;
    parts.push(formatCountPart(
      options,
      savedSummaryKey,
      savedSummaryFallback,
      saved
    ));
  }

  if (options.includeDisabled === true && disabled > 0) {
    parts.push(formatCountPart(options, 'scheduleDisabledSummaryPart', `${disabled} disabled`, disabled));
  }

  if (options.includeIncomplete !== false && incomplete > 0) {
    parts.push(formatCountPart(
      options,
      'scheduleIncompleteSummaryPart',
      `${incomplete} incomplete ignored`,
      incomplete
    ));
  }

  const summary = parts.join(separator);
  return options.trailingPeriod ? `${summary}.` : summary;
}
