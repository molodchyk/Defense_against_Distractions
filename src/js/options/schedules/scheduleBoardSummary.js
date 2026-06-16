// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { formatScheduleActivitySummary } from '../../../features/schedules/core/scheduleSummary.js';
import { getScheduleActivityCounts } from '../../../features/schedules/core/scheduleTime.js';

export function summarizeSchedules(currentSchedules, getMessage) {
  if (currentSchedules.length === 0) {
    return getMessage('scheduleNoSchedulesMessage', 'No schedules yet.');
  }

  const counts = getScheduleActivityCounts(currentSchedules);
  return formatScheduleActivitySummary(counts, {
    getMessage,
    includeSaved: true,
    includeEnabled: false,
    includeDisabled: false,
    includeIncomplete: false,
    savedSummaryKey: 'scheduleTimeBlocksSummaryPart',
    savedSummaryFallback: `${counts.saved} time ${counts.saved === 1 ? 'block' : 'blocks'}`,
    trailingPeriod: true
  });
}
