// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_PHASES,
  POMODORO_SYSTEM_STATES,
  completePomodoroPhase,
  completePomodoroWorkIfRestSatisfied,
  creditPomodoroRestForSystemState,
  getPomodoroActivityStatus,
  getPomodoroRemainingMs,
  getPomodoroRestCreditMs,
  getPomodoroStatus,
  isPomodoroActive,
  normalizePomodoroRuntime,
  pausePomodoro,
  recordPomodoroActivity,
  recordPomodoroSystemState,
  resetPomodoro,
  resumePomodoro,
  resumePomodoroFromSystemPause,
  startPomodoroWork
} from '../../shared/pomodoro.js';
import {
  PLANS_STORAGE_KEY,
  isInProtectedSchedule,
  isPlanActive,
  normalizePlans
} from '../../shared/plans.js';
import {
  POMODORO_LOCKED_SCHEDULE_REASON,
  SUPPRESS_ALL_AUTO_START_PLANS
} from './constants.js';
import {
  getActivityState,
  getHistory,
  getPlans,
  getRuntime,
  getSync,
  isProtectedScheduleActive,
  recordHistoryEvent,
  saveActivityState,
  saveRuntime,
  schedulePomodoroAlarm
} from './chromeStorage.js';
import {
  clearAutoStartSuppression,
  getAutoStartSuppression,
  isAutoStartSuppressedForActivity,
  suppressAutoStartAfterManualReset
} from './autoStartSuppression.js';
import {
  findAutoStartPlan,
  findRuntimePlan,
  findStartablePlan,
  getHistoryPlanDetails
} from './planSelection.js';
import {
  notifyPomodoroRuntimeChanged,
  notifyPomodoroStrictBreakReset
} from './notifications.js';
import { recordPomodoroTransitionHistory } from './history.js';
import { didRuntimeChange, getPhaseTransitionAt, isWaitingForSystemReturn } from './runtimeReconciliation.js';

export async function startNextWorkIfReady(runtime, plans, now = Date.now(), reason = 'activityStartedNextWork') {
  const runtimePlan = findRuntimePlan(plans, runtime);
  if (!runtimePlan || !runtimePlan.enabled || !runtimePlan.pomodoro.enabled || !isPlanActive(runtimePlan)) {
    return runtime;
  }

  let nextRuntime = runtime;

  if (nextRuntime.phase === POMODORO_PHASES.WORK) {
    const completedRuntime = completePomodoroWorkIfRestSatisfied(nextRuntime, runtimePlan.pomodoro, now);
    if (didRuntimeChange(nextRuntime, completedRuntime)) {
      await recordPomodoroTransitionHistory(nextRuntime, runtimePlan, completedRuntime, now, reason);
      nextRuntime = await saveRuntime(completedRuntime);
    }
  }

  if (nextRuntime.phase !== POMODORO_PHASES.COMPLETED) {
    return nextRuntime;
  }

  const startedRuntime = startPomodoroWork(runtimePlan.id, runtimePlan.pomodoro, now, nextRuntime);
  await recordHistoryEvent({
    ...getHistoryPlanDetails(runtimePlan),
    type: 'workStarted',
    startType: 'continuation',
    phase: startedRuntime.phase,
    at: new Date(now).toISOString(),
    reason
  }, now);
  notifyPomodoroRuntimeChanged(reason);
  return saveRuntime(startedRuntime);
}

export async function refreshExpiredRuntime(runtime, plans, now = Date.now()) {
  if (!isPomodoroActive(runtime) && !runtime.activePlanId) {
    await schedulePomodoroAlarm(runtime);
    return runtime;
  }

  const runtimePlan = findRuntimePlan(plans, runtime);
  if (!runtimePlan || !runtimePlan.enabled || !runtimePlan.pomodoro.enabled || !isPlanActive(runtimePlan)) {
    return saveRuntime(resetPomodoro());
  }

  let nextRuntime = runtime;
  if (isWaitingForSystemReturn(nextRuntime)) {
    await schedulePomodoroAlarm(nextRuntime);
    return nextRuntime;
  }

  let guard = 0;
  while (
    isPomodoroActive(nextRuntime)
      && nextRuntime.phase !== POMODORO_PHASES.PAUSED
      && getPomodoroRemainingMs(nextRuntime, now) <= 0
      && guard < 4
  ) {
    const transitionAt = getPhaseTransitionAt(nextRuntime, now);
    const previousRuntime = nextRuntime;
    nextRuntime = completePomodoroPhase(previousRuntime, runtimePlan.pomodoro, transitionAt);
    await recordPomodoroTransitionHistory(previousRuntime, runtimePlan, nextRuntime, transitionAt, 'phaseExpired');
    guard += 1;
  }

  if (nextRuntime !== runtime) {
    return saveRuntime(nextRuntime);
  }

  await schedulePomodoroAlarm(nextRuntime);
  return nextRuntime;
}

export async function getPomodoroPayload() {
  const items = await getSync(null);
  const plans = normalizePlans(items[PLANS_STORAGE_KEY]);
  const protectedScheduleActive = isInProtectedSchedule(items);
  const activityState = await getActivityState();
  const runtime = await refreshExpiredRuntime(await getRuntime(), plans);
  const history = await getHistory();
  const runtimePlan = findRuntimePlan(plans, runtime);
  const startablePlan = findStartablePlan(plans);
  const selectedPlan = runtimePlan || startablePlan;
  const settings = selectedPlan?.pomodoro || {};
  let suppression = await getAutoStartSuppression();
  let suppressionRemainingMs = suppression.until > 0
    ? Math.max(0, Number(suppression.until || 0) - Date.now())
    : 0;
  if (suppression.until > 0 && suppressionRemainingMs <= 0 && !suppression.planId) {
    await clearAutoStartSuppression();
    suppression = { planId: null, until: 0 };
    suppressionRemainingMs = 0;
  }
  const suppressionActive = Boolean(suppression.planId || suppressionRemainingMs > 0);
  const autoStartSuppression = {
    active: suppressionActive,
    planId: suppression.planId,
    global: suppression.planId === SUPPRESS_ALL_AUTO_START_PLANS,
    remainingMs: suppressionRemainingMs
  };

  return {
    runtime,
    timerStatus: getPomodoroStatus(runtime, settings),
    plan: selectedPlan ? {
      id: selectedPlan.id,
      name: selectedPlan.name,
      pomodoro: selectedPlan.pomodoro,
      active: isPlanActive(selectedPlan)
    } : null,
    activityStatus: getPomodoroActivityStatus(activityState),
    history,
    canStart: Boolean(startablePlan),
    protectedScheduleActive,
    autoStartSuppression
  };
}

export async function recordActivity(activity = {}) {
  const now = Date.now();
  const plans = await getPlans();
  const activityState = await saveActivityState(recordPomodoroActivity(await getActivityState(), activity, now));
  let runtime = await getRuntime();
  const resumedRuntime = resumePomodoroFromSystemPause(runtime, now);
  if (didRuntimeChange(runtime, resumedRuntime)) {
    runtime = await saveRuntime(resumedRuntime);
  }

  runtime = await refreshExpiredRuntime(runtime, plans, now);
  runtime = await startNextWorkIfReady(runtime, plans, now, 'activityStartedNextWork');

  if (!isPomodoroActive(runtime)) {
    const autoStartPlan = findAutoStartPlan(plans);
    if (autoStartPlan && !(await isAutoStartSuppressedForActivity(autoStartPlan.id, now))) {
      runtime = await saveRuntime(startPomodoroWork(autoStartPlan.id, autoStartPlan.pomodoro, now, runtime));
      await recordHistoryEvent({
        ...getHistoryPlanDetails(autoStartPlan),
        type: 'workStarted',
        startType: 'auto',
        phase: POMODORO_PHASES.WORK,
        at: new Date(now).toISOString(),
        reason: 'activityAutoStartedWork'
      }, now);
      notifyPomodoroRuntimeChanged('activityAutoStartedWork');
    }
  }

  return {
    status: 'recorded',
    runtime,
    activityStatus: getPomodoroActivityStatus(activityState)
  };
}

export async function startPomodoro(planId = null) {
  await clearAutoStartSuppression();
  const now = Date.now();
  const plans = await getPlans();
  const plan = findStartablePlan(plans, planId);
  if (!plan) {
    return {
      status: 'error',
      reason: 'No active plan has Pomodoro enabled.'
    };
  }

  const runtime = await saveRuntime(startPomodoroWork(plan.id, plan.pomodoro, now, await getRuntime()));
  await recordHistoryEvent({
    ...getHistoryPlanDetails(plan),
    type: 'workStarted',
    startType: 'manual',
    phase: POMODORO_PHASES.WORK,
    at: new Date(now).toISOString(),
    reason: 'started'
  }, now);
  notifyPomodoroRuntimeChanged('started');
  return {
    status: 'started',
    ...(await getPomodoroPayload()),
    runtime
  };
}

export async function pauseCurrentPomodoro() {
  if (await isProtectedScheduleActive()) {
    return {
      status: 'error',
      reason: POMODORO_LOCKED_SCHEDULE_REASON,
      blockedByProtectedSchedule: true,
      ...(await getPomodoroPayload())
    };
  }

  const runtime = await saveRuntime(pausePomodoro(await getRuntime()));
  notifyPomodoroRuntimeChanged('paused');
  return {
    status: 'paused',
    ...(await getPomodoroPayload()),
    runtime
  };
}

export async function resumeCurrentPomodoro() {
  await clearAutoStartSuppression();
  const runtime = await saveRuntime(resumePomodoro(await getRuntime()));
  notifyPomodoroRuntimeChanged('resumed');
  return {
    status: 'resumed',
    ...(await getPomodoroPayload()),
    runtime
  };
}

export async function resetCurrentPomodoro() {
  if (await isProtectedScheduleActive()) {
    return {
      status: 'error',
      reason: POMODORO_LOCKED_SCHEDULE_REASON,
      blockedByProtectedSchedule: true,
      ...(await getPomodoroPayload())
    };
  }

  await suppressAutoStartAfterManualReset();
  const previousRuntime = await getRuntime();
  const previousPlan = findRuntimePlan(await getPlans(), previousRuntime);
  const now = Date.now();
  await recordHistoryEvent({
    ...getHistoryPlanDetails(previousPlan),
    type: 'reset',
    phase: previousRuntime.phase,
    at: new Date(now).toISOString(),
    reason: 'manualReset'
  }, now);
  const runtime = await saveRuntime(resetPomodoro(now));
  notifyPomodoroStrictBreakReset();
  notifyPomodoroRuntimeChanged('reset');
  return {
    status: 'reset',
    ...(await getPomodoroPayload()),
    runtime
  };
}

export async function recordSystemState(systemState) {
  const now = Date.now();
  const isActiveState = systemState === POMODORO_SYSTEM_STATES.ACTIVE;
  const previousActivityState = await getActivityState();
  const nextActivityState = isActiveState
    ? recordPomodoroActivity(previousActivityState, { reason: 'systemActive' }, now)
    : recordPomodoroSystemState(previousActivityState, systemState, now);
  const activityState = await saveActivityState(nextActivityState);
  const plans = await getPlans();
  let runtime = await getRuntime();

  if (isActiveState) {
    const resumedRuntime = resumePomodoroFromSystemPause(runtime, now);
    if (didRuntimeChange(runtime, resumedRuntime)) {
      runtime = await saveRuntime(resumedRuntime);
    }

    runtime = await refreshExpiredRuntime(runtime, plans, now);
    runtime = await startNextWorkIfReady(runtime, plans, now, 'systemReturnedNextWork');
  } else {
    const creditedRuntime = creditPomodoroRestForSystemState(runtime, systemState, now);
    if (didRuntimeChange(runtime, creditedRuntime)) {
      runtime = await saveRuntime(creditedRuntime);
    } else {
      runtime = creditedRuntime;
    }

    if (!isWaitingForSystemReturn(runtime)) {
      runtime = await refreshExpiredRuntime(runtime, plans, now);
    }
  }

  return {
    status: 'systemStateRecorded',
    systemState,
    runtime,
    activityStatus: getPomodoroActivityStatus(activityState)
  };
}
