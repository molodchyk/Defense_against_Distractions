// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_ACTIVITY_STORAGE_KEY,
  POMODORO_HISTORY_STORAGE_KEY,
  POMODORO_IDLE_DETECTION_SECONDS,
  POMODORO_PHASES,
  POMODORO_SYSTEM_STATES,
  creditPomodoroRestForSystemState,
  POMODORO_RUNTIME_STORAGE_KEY,
  completePomodoroPhase,
  completePomodoroWorkIfRestSatisfied,
  createIdlePomodoroRuntime,
  getPomodoroActivityStatus,
  getPomodoroRemainingMs,
  getPomodoroRequiredRestMs,
  getPomodoroRestCreditMs,
  getPomodoroStatus,
  isPomodoroActive,
  normalizePomodoroActivityState,
  normalizePomodoroHistoryState,
  normalizePomodoroRuntime,
  pausePomodoro,
  recordPomodoroHistoryEvent,
  recordPomodoroActivity,
  recordPomodoroSystemState,
  resetPomodoro,
  resumePomodoro,
  resumePomodoroFromSystemPause,
  startPomodoroWork
} from '../shared/pomodoro.js';
import {
  PLANS_STORAGE_KEY,
  isInProtectedSchedule,
  isPlanActive,
  normalizePlans
} from '../shared/plans.js';

const POMODORO_ALARM_NAME = 'pomodoroPhaseEnd';
const POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY = 'pomodoroAutoStartSuppressedUntil';
const POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY = 'pomodoroAutoStartSuppressedPlanId';
const POMODORO_LOCKED_SCHEDULE_REASON = 'Cannot pause or reset Pomodoro during an active protected schedule.';
const SUPPRESS_ALL_AUTO_START_PLANS = '*';
let autoStartSuppressedUntil = 0;
let autoStartSuppressedPlanId = null;

function didRuntimeChange(before, after) {
  return JSON.stringify(normalizePomodoroRuntime(before)) !== JSON.stringify(normalizePomodoroRuntime(after));
}

async function getAutoStartSuppression() {
  const cachedSuppressedUntil = Number(autoStartSuppressedUntil || 0);
  const result = await getLocal({
    [POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY]: 0,
    [POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]: null
  });
  const storedSuppressedUntil = Number(result?.[POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY] || 0);
  const storedSuppressedPlanId = typeof result?.[POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY] === 'string'
    ? result[POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]
    : null;
  const suppressedUntil = Math.max(cachedSuppressedUntil, storedSuppressedUntil);
  autoStartSuppressedUntil = suppressedUntil;
  autoStartSuppressedPlanId = autoStartSuppressedPlanId || storedSuppressedPlanId;
  return {
    planId: autoStartSuppressedPlanId,
    until: suppressedUntil
  };
}

async function isAutoStartSuppressedForActivity(planId, activity = {}, now = Date.now()) {
  const suppression = await getAutoStartSuppression();
  if (suppression.planId) {
    return suppression.planId === SUPPRESS_ALL_AUTO_START_PLANS
      || suppression.planId === planId;
  }

  if (suppression.until > 0 && now < suppression.until) {
    return true;
  }

  if (suppression.until > 0) {
    await clearAutoStartSuppression();
  }

  return false;
}

async function suppressAutoStartAfterManualReset() {
  autoStartSuppressedUntil = 0;
  autoStartSuppressedPlanId = SUPPRESS_ALL_AUTO_START_PLANS;
  await setLocal({
    [POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY]: autoStartSuppressedUntil,
    [POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]: autoStartSuppressedPlanId
  });
}

async function clearAutoStartSuppression() {
  autoStartSuppressedUntil = 0;
  autoStartSuppressedPlanId = null;
  await setLocal({
    [POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY]: 0,
    [POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]: null
  });
}

function notifyPomodoroRuntimeChanged(reason) {
  chrome.tabs.query({}, tabs => {
    if (chrome.runtime.lastError) {
      return;
    }

    tabs.forEach(tab => {
      if (tab.id === undefined) {
        return;
      }

      const message = {
        action: 'pomodoroRuntimeChanged',
        reason
      };
      sendPomodoroTabMessage(tab.id, message);
      sendPomodoroTabMessage(tab.id, message, { frameId: 0 });
    });
  });
}

function notifyPomodoroStrictBreakReset() {
  chrome.tabs.query({}, tabs => {
    if (chrome.runtime.lastError) {
      return;
    }

    tabs.forEach(tab => {
      if (tab.id === undefined) {
        return;
      }

      const message = {
        action: 'clearPomodoroStrictBreakBlock'
      };
      sendPomodoroTabMessage(tab.id, message);
      sendPomodoroTabMessage(tab.id, message, { frameId: 0 });
    });
  });
}

function sendPomodoroTabMessage(tabId, message, options = null) {
  const callback = () => {
    if (chrome.runtime.lastError) {
      return;
    }
    // Tabs without the content script are expected. The notification is
    // best-effort because popup/options state already comes from storage.
  };

  if (options) {
    chrome.tabs.sendMessage(tabId, message, options, callback);
    return;
  }

  chrome.tabs.sendMessage(tabId, message, callback);
}

function getSync(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

function getLocal(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

function setLocal(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

function clearPomodoroAlarm() {
  return new Promise(resolve => {
    chrome.alarms.clear(POMODORO_ALARM_NAME, () => resolve());
  });
}

async function getPlans() {
  const items = await getSync(PLANS_STORAGE_KEY);
  return normalizePlans(items[PLANS_STORAGE_KEY]);
}

async function isProtectedScheduleActive() {
  return isInProtectedSchedule(await getSync(null));
}

async function getRuntime() {
  const items = await getLocal(POMODORO_RUNTIME_STORAGE_KEY);
  return normalizePomodoroRuntime(items[POMODORO_RUNTIME_STORAGE_KEY]);
}

async function getActivityState() {
  const items = await getLocal(POMODORO_ACTIVITY_STORAGE_KEY);
  return normalizePomodoroActivityState(items[POMODORO_ACTIVITY_STORAGE_KEY]);
}

async function getHistory(now = Date.now()) {
  const items = await getLocal(POMODORO_HISTORY_STORAGE_KEY);
  return normalizePomodoroHistoryState(items[POMODORO_HISTORY_STORAGE_KEY], now);
}

async function saveRuntime(runtime) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  await setLocal({ [POMODORO_RUNTIME_STORAGE_KEY]: normalizedRuntime });
  await schedulePomodoroAlarm(normalizedRuntime);
  return normalizedRuntime;
}

async function saveActivityState(activityState) {
  const normalizedState = normalizePomodoroActivityState(activityState);
  await setLocal({ [POMODORO_ACTIVITY_STORAGE_KEY]: normalizedState });
  return normalizedState;
}

async function saveHistory(history, now = Date.now()) {
  const normalizedHistory = normalizePomodoroHistoryState(history, now);
  await setLocal({ [POMODORO_HISTORY_STORAGE_KEY]: normalizedHistory });
  return normalizedHistory;
}

async function recordHistoryEvent(event, now = Date.now()) {
  const history = await getHistory(now);
  return saveHistory(recordPomodoroHistoryEvent(history, event, now), now);
}

async function schedulePomodoroAlarm(runtime) {
  await clearPomodoroAlarm();

  if (!isPomodoroActive(runtime) || runtime.phase === POMODORO_PHASES.PAUSED || !runtime.phaseEndsAt) {
    return;
  }

  const when = Date.parse(runtime.phaseEndsAt);
  if (Number.isFinite(when)) {
    chrome.alarms.create(POMODORO_ALARM_NAME, { when: Math.max(when, Date.now() + 1000) });
  }
}

function findPlanById(plans, planId) {
  return plans.find(plan => plan.id === planId) || null;
}

function findStartablePlan(plans, requestedPlanId = null) {
  const requestedPlan = requestedPlanId ? findPlanById(plans, requestedPlanId) : null;
  if (requestedPlan && isPlanActive(requestedPlan) && requestedPlan.pomodoro.enabled) {
    return requestedPlan;
  }

  return plans.find(plan => isPlanActive(plan) && plan.pomodoro.enabled) || null;
}

function findAutoStartPlan(plans) {
  return plans.find(plan => (
    isPlanActive(plan)
      && plan.pomodoro.enabled
      && plan.pomodoro.autoStart
  )) || null;
}

function findRuntimePlan(plans, runtime) {
  return runtime.activePlanId ? findPlanById(plans, runtime.activePlanId) : null;
}

function getElapsedMs(startValue, endValue) {
  const start = Date.parse(startValue || '');
  const end = Number.isFinite(Number(endValue)) ? Number(endValue) : Date.parse(endValue || '');
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  return Math.max(0, Math.round(end - start));
}

function getHistoryPlanDetails(plan) {
  return {
    planId: plan?.id || null,
    planName: plan?.name || null
  };
}

async function recordPomodoroTransitionHistory(beforeRuntime, plan, afterRuntime, now, reason) {
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

async function startNextWorkIfReady(runtime, plans, now = Date.now(), reason = 'activityStartedNextWork') {
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

async function refreshExpiredRuntime(runtime, plans) {
  if (!isPomodoroActive(runtime) && !runtime.activePlanId) {
    await schedulePomodoroAlarm(runtime);
    return runtime;
  }

  const runtimePlan = findRuntimePlan(plans, runtime);
  if (!runtimePlan || !runtimePlan.enabled || !runtimePlan.pomodoro.enabled || !isPlanActive(runtimePlan)) {
    return saveRuntime(resetPomodoro());
  }

  let nextRuntime = runtime;
  let guard = 0;
  while (
    isPomodoroActive(nextRuntime)
      && nextRuntime.phase !== POMODORO_PHASES.PAUSED
      && getPomodoroRemainingMs(nextRuntime) <= 0
      && guard < 4
  ) {
    const phaseEndsAt = Date.parse(nextRuntime.phaseEndsAt || '');
    const transitionAt = Number.isFinite(phaseEndsAt) && phaseEndsAt <= Date.now()
      ? phaseEndsAt
      : Date.now();
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

async function getPomodoroPayload() {
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

async function recordActivity(activity = {}) {
  const now = Date.now();
  const plans = await getPlans();
  const activityState = await saveActivityState(recordPomodoroActivity(await getActivityState(), activity, now));
  let runtime = await getRuntime();
  const resumedRuntime = resumePomodoroFromSystemPause(runtime, now);
  if (didRuntimeChange(runtime, resumedRuntime)) {
    runtime = await saveRuntime(resumedRuntime);
  }

  runtime = await refreshExpiredRuntime(runtime, plans);
  runtime = await startNextWorkIfReady(runtime, plans, now, 'activityStartedNextWork');

  if (!isPomodoroActive(runtime)) {
    const autoStartPlan = findAutoStartPlan(plans);
    if (autoStartPlan && !(await isAutoStartSuppressedForActivity(autoStartPlan.id, activity, now))) {
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

async function startPomodoro(planId = null) {
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

async function pauseCurrentPomodoro() {
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

async function resumeCurrentPomodoro() {
  await clearAutoStartSuppression();
  const runtime = await saveRuntime(resumePomodoro(await getRuntime()));
  notifyPomodoroRuntimeChanged('resumed');
  return {
    status: 'resumed',
    ...(await getPomodoroPayload()),
    runtime
  };
}

async function resetCurrentPomodoro() {
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

async function recordSystemState(systemState) {
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

    runtime = await refreshExpiredRuntime(runtime, plans);
    runtime = await startNextWorkIfReady(runtime, plans, now, 'systemReturnedNextWork');
  } else {
    runtime = await refreshExpiredRuntime(runtime, plans);
    const creditedRuntime = creditPomodoroRestForSystemState(runtime, systemState, now);
    if (didRuntimeChange(runtime, creditedRuntime)) {
      runtime = await saveRuntime(creditedRuntime);
    }
  }

  return {
    status: 'systemStateRecorded',
    systemState,
    runtime,
    activityStatus: getPomodoroActivityStatus(activityState)
  };
}

function handleSystemStateChange(systemState) {
  recordSystemState(systemState).catch(error => {
    console.error('Failed to reconcile Pomodoro system state:', error);
  });
}

function initializeSystemIdleDetection() {
  if (!chrome.idle) {
    return;
  }

  chrome.idle.setDetectionInterval(POMODORO_IDLE_DETECTION_SECONDS);
  chrome.idle.onStateChanged.addListener(handleSystemStateChange);
  chrome.idle.queryState(POMODORO_IDLE_DETECTION_SECONDS, handleSystemStateChange);
}

function respondAsync(sendResponse, action) {
  action()
    .then(sendResponse)
    .catch(error => {
      console.error('Pomodoro action failed:', error);
      sendResponse({ status: 'error' });
    });
}

export function initializePomodoroRuntime() {
  initializeSystemIdleDetection();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPomodoroState') {
      respondAsync(sendResponse, getPomodoroPayload);
      return true;
    }

    if (message.action === 'recordPomodoroActivity') {
      respondAsync(sendResponse, () => recordActivity({
        reason: message.reason,
        url: message.url,
        title: message.title
      }));
      return true;
    }

    if (message.action === 'startPomodoro') {
      respondAsync(sendResponse, () => startPomodoro(message.planId || null));
      return true;
    }

    if (message.action === 'pausePomodoro') {
      respondAsync(sendResponse, pauseCurrentPomodoro);
      return true;
    }

    if (message.action === 'resumePomodoro') {
      respondAsync(sendResponse, resumeCurrentPomodoro);
      return true;
    }

    if (message.action === 'resetPomodoro') {
      respondAsync(sendResponse, resetCurrentPomodoro);
      return true;
    }

    return false;
  });

  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== POMODORO_ALARM_NAME) {
      return;
    }

    getPomodoroPayload().catch(error => {
      console.error('Failed to advance Pomodoro alarm:', error);
    });
  });

  chrome.runtime.onStartup.addListener(() => {
    getPomodoroPayload().catch(error => {
      console.error('Failed to restore Pomodoro alarm on startup:', error);
    });
  });

  chrome.runtime.onInstalled.addListener(() => {
    getPomodoroPayload().catch(error => {
      console.error('Failed to restore Pomodoro alarm on install:', error);
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes[PLANS_STORAGE_KEY]) {
      return;
    }

    getPomodoroPayload().catch(error => {
      console.error('Failed to reconcile Pomodoro after plan change:', error);
    });
  });

  chrome.tabs.onActivated.addListener(() => {
    recordActivity({ reason: 'tabActivated' }).catch(error => {
      console.error('Failed to record Pomodoro tab activity:', error);
    });
  });

  if (chrome.windows?.onFocusChanged) {
    chrome.windows.onFocusChanged.addListener(windowId => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
      }

      recordActivity({ reason: 'windowFocus' }).catch(error => {
        console.error('Failed to record Pomodoro window activity:', error);
      });
    });
  }
}
