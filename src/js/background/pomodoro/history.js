// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_PHASES,
  getPomodoroRequiredRestMs,
  getPomodoroRestCreditMs
} from '../../shared/pomodoro.js';
import { recordHistoryEvent } from './chromeStorage.js';
import { getHistoryPlanDetails } from './planSelection.js';

function getElapsedMs(startValue, endValue) {
  const start = Date.parse(startValue || '');
  const end = Number.isFinite(Number(endValue)) ? Number(endValue) : Date.parse(endValue || '');
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  return Math.max(0, Math.round(end - start));
}

export async function recordPomodoroTransitionHistory(beforeRuntime, plan, afterRuntime, now, reason) {
  if (!beforeRuntime || !afterRuntime || beforeRuntime.phase === afterRuntime.phase) {
    return;
  }

  const planDetails = getHistoryPlanDetails(plan);

  if (beforeRuntime.phase === POMODORO_PHASES.WORK) {
    const creditedRestMs = getPomodoroRestCreditMs(beforeRuntime, now);
    await recordHistoryEvent({
      ...planDetails,
      type: 'workCompleted',
      phase: beforeRuntime.phase,
      nextPhase: afterRuntime.phase,
      at: new Date(now).toISOString(),
      reason,
      workMs: getElapsedMs(beforeRuntime.phaseStartedAt, now),
      requiredRestMs: getPomodoroRequiredRestMs(beforeRuntime, plan?.pomodoro || {}),
      creditedRestMs,
      restReason: beforeRuntime.restCreditReason,
      skippedBreak: afterRuntime.phase === POMODORO_PHASES.COMPLETED
    }, now);
    return;
  }

  if ([POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(beforeRuntime.phase)) {
    await recordHistoryEvent({
      ...planDetails,
      type: 'breakCompleted',
      phase: beforeRuntime.phase,
      nextPhase: afterRuntime.phase,
      at: new Date(now).toISOString(),
      reason,
      breakMs: getElapsedMs(beforeRuntime.phaseStartedAt, now)
    }, now);
  }
}
