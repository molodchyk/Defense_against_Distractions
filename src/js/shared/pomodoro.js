// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const POMODORO_RUNTIME_STORAGE_KEY = 'pomodoroRuntimeState';
export const POMODORO_ACTIVITY_STORAGE_KEY = 'pomodoroActivityState';
export const POMODORO_HISTORY_STORAGE_KEY = 'pomodoroHistoryState';
export const POMODORO_ACTIVITY_IDLE_MS = 2 * 60 * 1000;
export const POMODORO_IDLE_DETECTION_SECONDS = 15;
export const POMODORO_HISTORY_RECENT_LIMIT = 24;

export const POMODORO_PHASES = {
  IDLE: 'idle',
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

export const POMODORO_PAUSE_REASONS = {
  MANUAL: 'manual',
  SYSTEM_IDLE: 'systemIdle',
  SYSTEM_LOCKED: 'systemLocked'
};

export const POMODORO_SYSTEM_STATES = {
  ACTIVE: 'active',
  IDLE: 'idle',
  LOCKED: 'locked'
};

export const DEFAULT_POMODORO_SETTINGS = {
  enabled: false,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  strictBreaks: false,
  autoStart: false
};

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 24 * 60;
const MIN_SESSIONS_BEFORE_LONG_BREAK = 1;
const MAX_SESSIONS_BEFORE_LONG_BREAK = 12;
const POMODORO_HISTORY_TOTALS = {
  workSessionsStarted: 0,
  workSessionsCompleted: 0,
  breakSessionsCompleted: 0,
  workMs: 0,
  breakMs: 0,
  creditedRestMs: 0,
  idleRestCreditMs: 0,
  lockedRestCreditMs: 0,
  skippedBreaks: 0,
  manualStarts: 0,
  autoStarts: 0,
  continuationStarts: 0,
  resets: 0
};

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(number), min), max);
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toIsoString(timestamp) {
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function getUtcDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function normalizeDurationMs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function normalizeHistoryTotals(totals = {}) {
  return Object.fromEntries(Object.entries(POMODORO_HISTORY_TOTALS).map(([key, fallback]) => ([
    key,
    normalizeDurationMs(totals[key] ?? fallback)
  ])));
}

function normalizePauseReason(reason) {
  return Object.values(POMODORO_PAUSE_REASONS).includes(reason) ? reason : null;
}

function normalizeSystemState(systemState) {
  return Object.values(POMODORO_SYSTEM_STATES).includes(systemState) ? systemState : null;
}

function getSystemPauseReason(systemState) {
  if (systemState === POMODORO_SYSTEM_STATES.LOCKED) return POMODORO_PAUSE_REASONS.SYSTEM_LOCKED;
  if (systemState === POMODORO_SYSTEM_STATES.IDLE) return POMODORO_PAUSE_REASONS.SYSTEM_IDLE;
  return null;
}

export function isPomodoroSystemPauseReason(reason) {
  return [
    POMODORO_PAUSE_REASONS.SYSTEM_IDLE,
    POMODORO_PAUSE_REASONS.SYSTEM_LOCKED
  ].includes(reason);
}

export function normalizePomodoroSettings(settings = {}) {
  return {
    enabled: settings.enabled === true,
    workMinutes: clampNumber(settings.workMinutes, DEFAULT_POMODORO_SETTINGS.workMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES),
    shortBreakMinutes: clampNumber(settings.shortBreakMinutes, DEFAULT_POMODORO_SETTINGS.shortBreakMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES),
    longBreakMinutes: clampNumber(settings.longBreakMinutes, DEFAULT_POMODORO_SETTINGS.longBreakMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES),
    sessionsBeforeLongBreak: clampNumber(
      settings.sessionsBeforeLongBreak,
      DEFAULT_POMODORO_SETTINGS.sessionsBeforeLongBreak,
      MIN_SESSIONS_BEFORE_LONG_BREAK,
      MAX_SESSIONS_BEFORE_LONG_BREAK
    ),
    strictBreaks: settings.strictBreaks === true,
    autoStart: settings.autoStart === true
  };
}

export function normalizePomodoroActivityState(state = {}, now = Date.now()) {
  const dayKey = typeof state.dayKey === 'string' && state.dayKey ? state.dayKey : getUtcDayKey(now);
  const currentDayKey = getUtcDayKey(now);

  return {
    dayKey: currentDayKey,
    activeMsToday: dayKey === currentDayKey
      ? Math.max(0, Math.round(Number(state.activeMsToday || 0)))
      : 0,
    lastActivityAt: toIsoString(toTimestamp(state.lastActivityAt)),
    lastReason: typeof state.lastReason === 'string' && state.lastReason ? state.lastReason : null,
    lastUrl: typeof state.lastUrl === 'string' && state.lastUrl ? state.lastUrl : null,
    lastTitle: typeof state.lastTitle === 'string' && state.lastTitle ? state.lastTitle : null,
    systemState: normalizeSystemState(state.systemState),
    systemStateUpdatedAt: toIsoString(toTimestamp(state.systemStateUpdatedAt)),
    updatedAt: toIsoString(toTimestamp(state.updatedAt)) || new Date(now).toISOString()
  };
}

export function recordPomodoroActivity(state = {}, activity = {}, now = Date.now()) {
  const normalizedState = normalizePomodoroActivityState(state, now);
  const previousActivityAt = toTimestamp(normalizedState.lastActivityAt);
  const wasSystemAway = [
    POMODORO_SYSTEM_STATES.IDLE,
    POMODORO_SYSTEM_STATES.LOCKED
  ].includes(normalizedState.systemState);
  const activeDelta = !wasSystemAway && Number.isFinite(previousActivityAt) && now - previousActivityAt <= POMODORO_ACTIVITY_IDLE_MS
    ? Math.max(0, now - previousActivityAt)
    : 0;

  return normalizePomodoroActivityState({
    ...normalizedState,
    activeMsToday: normalizedState.activeMsToday + activeDelta,
    lastActivityAt: new Date(now).toISOString(),
    lastReason: activity.reason,
    lastUrl: activity.url,
    lastTitle: activity.title,
    systemState: POMODORO_SYSTEM_STATES.ACTIVE,
    systemStateUpdatedAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString()
  }, now);
}

export function recordPomodoroSystemState(state = {}, systemState, now = Date.now()) {
  const normalizedState = normalizePomodoroActivityState(state, now);
  const normalizedSystemState = normalizeSystemState(systemState);
  if (!normalizedSystemState) {
    return normalizedState;
  }

  return normalizePomodoroActivityState({
    ...normalizedState,
    systemState: normalizedSystemState,
    systemStateUpdatedAt: new Date(now).toISOString(),
    lastReason: `system:${normalizedSystemState}`,
    updatedAt: new Date(now).toISOString()
  }, now);
}

export function createPomodoroHistoryState(now = Date.now()) {
  return {
    dayKey: getUtcDayKey(now),
    totals: { ...POMODORO_HISTORY_TOTALS },
    recent: [],
    updatedAt: new Date(now).toISOString()
  };
}

function normalizePomodoroHistoryEvent(event = {}, now = Date.now(), index = 0) {
  const eventAt = toIsoString(toTimestamp(event.at)) || new Date(now).toISOString();
  const type = typeof event.type === 'string' && event.type ? event.type : 'unknown';

  return {
    id: typeof event.id === 'string' && event.id
      ? event.id
      : `pomodoro_${Date.parse(eventAt) || now}_${index}_${type}`,
    type,
    at: eventAt,
    planId: typeof event.planId === 'string' && event.planId ? event.planId : null,
    planName: typeof event.planName === 'string' && event.planName ? event.planName : null,
    phase: typeof event.phase === 'string' && event.phase ? event.phase : null,
    nextPhase: typeof event.nextPhase === 'string' && event.nextPhase ? event.nextPhase : null,
    reason: typeof event.reason === 'string' && event.reason ? event.reason : null,
    startType: typeof event.startType === 'string' && event.startType ? event.startType : null,
    restReason: normalizePauseReason(event.restReason),
    workMs: normalizeDurationMs(event.workMs),
    breakMs: normalizeDurationMs(event.breakMs),
    creditedRestMs: normalizeDurationMs(event.creditedRestMs),
    requiredRestMs: normalizeDurationMs(event.requiredRestMs),
    skippedBreak: event.skippedBreak === true
  };
}

export function normalizePomodoroHistoryState(history = {}, now = Date.now()) {
  const currentDayKey = getUtcDayKey(now);
  const dayKey = typeof history.dayKey === 'string' && history.dayKey ? history.dayKey : currentDayKey;
  if (dayKey !== currentDayKey) {
    return createPomodoroHistoryState(now);
  }

  const recent = Array.isArray(history.recent)
    ? history.recent
      .map((event, index) => normalizePomodoroHistoryEvent(event, now, index))
      .slice(-POMODORO_HISTORY_RECENT_LIMIT)
    : [];

  return {
    dayKey: currentDayKey,
    totals: normalizeHistoryTotals(history.totals),
    recent,
    updatedAt: toIsoString(toTimestamp(history.updatedAt)) || new Date(now).toISOString()
  };
}

export function recordPomodoroHistoryEvent(history = {}, event = {}, now = Date.now()) {
  const normalizedHistory = normalizePomodoroHistoryState(history, now);
  const normalizedEvent = normalizePomodoroHistoryEvent(event, now, normalizedHistory.recent.length);
  const totals = normalizeHistoryTotals(normalizedHistory.totals);

  if (normalizedEvent.type === 'workStarted') {
    totals.workSessionsStarted += 1;
    if (normalizedEvent.startType === 'manual') {
      totals.manualStarts += 1;
    } else if (normalizedEvent.startType === 'auto') {
      totals.autoStarts += 1;
    } else if (normalizedEvent.startType === 'continuation') {
      totals.continuationStarts += 1;
    }
  }

  if (normalizedEvent.type === 'workCompleted') {
    totals.workSessionsCompleted += 1;
    totals.workMs += normalizedEvent.workMs;
    totals.creditedRestMs += normalizedEvent.creditedRestMs;

    if (normalizedEvent.restReason === POMODORO_PAUSE_REASONS.SYSTEM_IDLE) {
      totals.idleRestCreditMs += normalizedEvent.creditedRestMs;
    }

    if (normalizedEvent.restReason === POMODORO_PAUSE_REASONS.SYSTEM_LOCKED) {
      totals.lockedRestCreditMs += normalizedEvent.creditedRestMs;
    }

    if (normalizedEvent.skippedBreak) {
      totals.skippedBreaks += 1;
    }
  }

  if (normalizedEvent.type === 'breakCompleted') {
    totals.breakSessionsCompleted += 1;
    totals.breakMs += normalizedEvent.breakMs;
  }

  if (normalizedEvent.type === 'reset') {
    totals.resets += 1;
  }

  return normalizePomodoroHistoryState({
    ...normalizedHistory,
    totals,
    recent: [...normalizedHistory.recent, normalizedEvent].slice(-POMODORO_HISTORY_RECENT_LIMIT),
    updatedAt: new Date(now).toISOString()
  }, now);
}

export function createIdlePomodoroRuntime(now = Date.now()) {
  return {
    activePlanId: null,
    phase: POMODORO_PHASES.IDLE,
    phaseStartedAt: null,
    phaseEndsAt: null,
    completedWorkSessions: 0,
    lastCompletedAt: null,
    pausedAt: null,
    pausedPhase: null,
    pausedRemainingMs: null,
    pauseReason: null,
    restCreditMs: 0,
    restCreditStartedAt: null,
    restCreditReason: null,
    previousUrl: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function normalizePomodoroRuntime(runtime = {}, now = Date.now()) {
  const phase = Object.values(POMODORO_PHASES).includes(runtime.phase)
    ? runtime.phase
    : POMODORO_PHASES.IDLE;

  return {
    activePlanId: typeof runtime.activePlanId === 'string' && runtime.activePlanId ? runtime.activePlanId : null,
    phase,
    phaseStartedAt: toIsoString(toTimestamp(runtime.phaseStartedAt)),
    phaseEndsAt: toIsoString(toTimestamp(runtime.phaseEndsAt)),
    completedWorkSessions: Math.max(0, Math.round(Number(runtime.completedWorkSessions || 0))),
    lastCompletedAt: toIsoString(toTimestamp(runtime.lastCompletedAt)),
    pausedAt: toIsoString(toTimestamp(runtime.pausedAt)),
    pausedPhase: [
      POMODORO_PHASES.WORK,
      POMODORO_PHASES.SHORT_BREAK,
      POMODORO_PHASES.LONG_BREAK
    ].includes(runtime.pausedPhase) ? runtime.pausedPhase : null,
    pausedRemainingMs: Number.isFinite(Number(runtime.pausedRemainingMs)) ? Math.max(0, Math.round(Number(runtime.pausedRemainingMs))) : null,
    pauseReason: phase === POMODORO_PHASES.PAUSED ? normalizePauseReason(runtime.pauseReason) : null,
    restCreditMs: phase === POMODORO_PHASES.WORK
      ? Math.max(0, Math.round(Number(runtime.restCreditMs || 0)))
      : 0,
    restCreditStartedAt: phase === POMODORO_PHASES.WORK ? toIsoString(toTimestamp(runtime.restCreditStartedAt)) : null,
    restCreditReason: phase === POMODORO_PHASES.WORK ? normalizePauseReason(runtime.restCreditReason) : null,
    previousUrl: typeof runtime.previousUrl === 'string' && runtime.previousUrl ? runtime.previousUrl : null,
    updatedAt: toIsoString(toTimestamp(runtime.updatedAt)) || new Date(now).toISOString()
  };
}

export function getPomodoroPhaseDurationMs(settings, phase) {
  const normalizedSettings = normalizePomodoroSettings(settings);

  if (phase === POMODORO_PHASES.WORK) {
    return normalizedSettings.workMinutes * 60 * 1000;
  }

  if (phase === POMODORO_PHASES.LONG_BREAK) {
    return normalizedSettings.longBreakMinutes * 60 * 1000;
  }

  if (phase === POMODORO_PHASES.SHORT_BREAK) {
    return normalizedSettings.shortBreakMinutes * 60 * 1000;
  }

  return 0;
}

export function getPomodoroNextBreakPhase(runtime = {}, settings = {}) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  const normalizedSettings = normalizePomodoroSettings(settings);
  const completedWorkSessions = normalizedRuntime.completedWorkSessions + 1;

  return completedWorkSessions % normalizedSettings.sessionsBeforeLongBreak === 0
    ? POMODORO_PHASES.LONG_BREAK
    : POMODORO_PHASES.SHORT_BREAK;
}

export function getPomodoroRequiredRestMs(runtime = {}, settings = {}) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime);
  if (normalizedRuntime.phase === POMODORO_PHASES.WORK) {
    return getPomodoroPhaseDurationMs(settings, getPomodoroNextBreakPhase(normalizedRuntime, settings));
  }

  if ([POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(normalizedRuntime.phase)) {
    return getPomodoroPhaseDurationMs(settings, normalizedRuntime.phase);
  }

  return 0;
}

export function startPomodoroWork(planId, settings, now = Date.now(), previousRuntime = {}) {
  const durationMs = getPomodoroPhaseDurationMs(settings, POMODORO_PHASES.WORK);
  const normalizedRuntime = normalizePomodoroRuntime(previousRuntime, now);

  return {
    ...normalizedRuntime,
    activePlanId: planId || normalizedRuntime.activePlanId,
    phase: POMODORO_PHASES.WORK,
    phaseStartedAt: new Date(now).toISOString(),
    phaseEndsAt: new Date(now + durationMs).toISOString(),
    pausedAt: null,
    pausedPhase: null,
    pausedRemainingMs: null,
    pauseReason: null,
    restCreditMs: 0,
    restCreditStartedAt: null,
    restCreditReason: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function pausePomodoro(runtime, now = Date.now(), pauseReason = POMODORO_PAUSE_REASONS.MANUAL) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (![POMODORO_PHASES.WORK, POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(normalizedRuntime.phase)) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    phase: POMODORO_PHASES.PAUSED,
    pausedAt: new Date(now).toISOString(),
    pausedPhase: normalizedRuntime.phase,
    pausedRemainingMs: getPomodoroRemainingMs(normalizedRuntime, now),
    pauseReason: normalizePauseReason(pauseReason) || POMODORO_PAUSE_REASONS.MANUAL,
    restCreditMs: 0,
    restCreditStartedAt: null,
    restCreditReason: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function creditPomodoroRestForSystemState(runtime, systemState, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  const pauseReason = getSystemPauseReason(systemState);
  if (!pauseReason || normalizedRuntime.phase !== POMODORO_PHASES.WORK) {
    return normalizedRuntime;
  }

  if (normalizedRuntime.restCreditStartedAt) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    restCreditStartedAt: new Date(now).toISOString(),
    restCreditReason: pauseReason,
    updatedAt: new Date(now).toISOString()
  };
}

export function pausePomodoroForSystemState(runtime, systemState, now = Date.now()) {
  return creditPomodoroRestForSystemState(runtime, systemState, now);
}

export function getPomodoroRestCreditMs(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.WORK) {
    return 0;
  }

  const workEndsAt = toTimestamp(normalizedRuntime.phaseEndsAt);
  const creditStartedAt = toTimestamp(normalizedRuntime.restCreditStartedAt);
  const creditEnd = Number.isFinite(workEndsAt) ? Math.min(now, workEndsAt) : now;
  const activeCreditMs = Number.isFinite(creditStartedAt)
    ? Math.max(0, creditEnd - creditStartedAt)
    : 0;

  return Math.max(0, normalizedRuntime.restCreditMs + activeCreditMs);
}

export function stopPomodoroRestCredit(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.WORK || !normalizedRuntime.restCreditStartedAt) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    restCreditMs: getPomodoroRestCreditMs(normalizedRuntime, now),
    restCreditStartedAt: null,
    restCreditReason: normalizedRuntime.restCreditReason,
    updatedAt: new Date(now).toISOString()
  };
}

export function resumePomodoro(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.PAUSED || !normalizedRuntime.pausedRemainingMs) {
    return normalizedRuntime;
  }

  return {
    ...normalizedRuntime,
    phase: normalizedRuntime.pausedPhase || POMODORO_PHASES.WORK,
    phaseStartedAt: new Date(now).toISOString(),
    phaseEndsAt: new Date(now + normalizedRuntime.pausedRemainingMs).toISOString(),
    pausedAt: null,
    pausedPhase: null,
    pausedRemainingMs: null,
    pauseReason: null,
    updatedAt: new Date(now).toISOString()
  };
}

export function resumePomodoroFromSystemPause(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase === POMODORO_PHASES.WORK && normalizedRuntime.restCreditStartedAt) {
    return stopPomodoroRestCredit(normalizedRuntime, now);
  }

  if (
    normalizedRuntime.phase !== POMODORO_PHASES.PAUSED
      || !isPomodoroSystemPauseReason(normalizedRuntime.pauseReason)
  ) {
    return normalizedRuntime;
  }

  return resumePomodoro(normalizedRuntime, now);
}

export function resetPomodoro(now = Date.now()) {
  return createIdlePomodoroRuntime(now);
}

export function isPomodoroRestSatisfied(runtime = {}, settings = {}, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase !== POMODORO_PHASES.WORK) {
    return false;
  }

  const requiredRestMs = getPomodoroRequiredRestMs(normalizedRuntime, settings);
  return requiredRestMs > 0 && getPomodoroRestCreditMs(normalizedRuntime, now) >= requiredRestMs;
}

export function completePomodoroWorkIfRestSatisfied(runtime = {}, settings = {}, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (!isPomodoroRestSatisfied(normalizedRuntime, settings, now)) {
    return normalizedRuntime;
  }

  return completePomodoroPhase(normalizedRuntime, settings, now);
}

export function completePomodoroPhase(runtime, settings, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);

  if (normalizedRuntime.phase === POMODORO_PHASES.WORK) {
    const completedWorkSessions = normalizedRuntime.completedWorkSessions + 1;
    const nextPhase = getPomodoroNextBreakPhase(normalizedRuntime, settings);
    const durationMs = getPomodoroPhaseDurationMs(settings, nextPhase);
    const remainingBreakMs = Math.max(0, durationMs - getPomodoroRestCreditMs(normalizedRuntime, now));

    if (remainingBreakMs <= 0) {
      return {
        ...normalizedRuntime,
        phase: POMODORO_PHASES.COMPLETED,
        phaseStartedAt: new Date(now).toISOString(),
        phaseEndsAt: null,
        completedWorkSessions,
        lastCompletedAt: new Date(now).toISOString(),
        pausedAt: null,
        pausedPhase: null,
        pausedRemainingMs: null,
        pauseReason: null,
        restCreditMs: 0,
        restCreditStartedAt: null,
        restCreditReason: null,
        updatedAt: new Date(now).toISOString()
      };
    }

    return {
      ...normalizedRuntime,
      phase: nextPhase,
      phaseStartedAt: new Date(now).toISOString(),
      phaseEndsAt: new Date(now + remainingBreakMs).toISOString(),
      completedWorkSessions,
      lastCompletedAt: new Date(now).toISOString(),
      pausedAt: null,
      pausedPhase: null,
      pausedRemainingMs: null,
      pauseReason: null,
      restCreditMs: 0,
      restCreditStartedAt: null,
      restCreditReason: null,
      updatedAt: new Date(now).toISOString()
    };
  }

  if ([POMODORO_PHASES.SHORT_BREAK, POMODORO_PHASES.LONG_BREAK].includes(normalizedRuntime.phase)) {
    return {
      ...normalizedRuntime,
      phase: POMODORO_PHASES.COMPLETED,
      phaseStartedAt: new Date(now).toISOString(),
      phaseEndsAt: null,
      pausedAt: null,
      pausedPhase: null,
      pausedRemainingMs: null,
      pauseReason: null,
      restCreditMs: 0,
      restCreditStartedAt: null,
      restCreditReason: null,
      updatedAt: new Date(now).toISOString()
    };
  }

  return normalizedRuntime;
}

export function getPomodoroRemainingMs(runtime, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  if (normalizedRuntime.phase === POMODORO_PHASES.PAUSED) {
    return normalizedRuntime.pausedRemainingMs || 0;
  }

  const phaseEndsAt = toTimestamp(normalizedRuntime.phaseEndsAt);
  if (!phaseEndsAt) {
    return 0;
  }

  return Math.max(0, phaseEndsAt - now);
}

export function isPomodoroActive(runtime) {
  return [
    POMODORO_PHASES.WORK,
    POMODORO_PHASES.SHORT_BREAK,
    POMODORO_PHASES.LONG_BREAK,
    POMODORO_PHASES.PAUSED
  ].includes(normalizePomodoroRuntime(runtime).phase);
}

export function getPomodoroStatus(runtime, settings, now = Date.now()) {
  const normalizedRuntime = normalizePomodoroRuntime(runtime, now);
  const remainingMs = getPomodoroRemainingMs(normalizedRuntime, now);
  const restCreditMs = getPomodoroRestCreditMs(normalizedRuntime, now);

  return {
    phase: normalizedRuntime.phase,
    phaseLabel: getPomodoroPhaseLabel(normalizedRuntime.phase),
    remainingMs,
    remainingText: formatRemainingTime(remainingMs),
    completedWorkSessions: normalizedRuntime.completedWorkSessions,
    pauseReason: normalizedRuntime.pauseReason,
    restCreditMs,
    restCreditText: formatDuration(restCreditMs),
    settings: normalizePomodoroSettings(settings)
  };
}

export function getPomodoroActivityStatus(state = {}, now = Date.now()) {
  const normalizedState = normalizePomodoroActivityState(state, now);
  const lastActivityAt = toTimestamp(normalizedState.lastActivityAt);
  const systemStateUpdatedAt = toTimestamp(normalizedState.systemStateUpdatedAt);
  const idleForMs = Number.isFinite(lastActivityAt) ? Math.max(0, now - lastActivityAt) : null;
  const isSystemAway = [
    POMODORO_SYSTEM_STATES.IDLE,
    POMODORO_SYSTEM_STATES.LOCKED
  ].includes(normalizedState.systemState);
  const isActive = !isSystemAway && Number.isFinite(idleForMs) && idleForMs <= POMODORO_ACTIVITY_IDLE_MS;

  return {
    isActive,
    stateLabel: getPomodoroActivityStateLabel(normalizedState.systemState, isActive),
    idleForMs,
    idleForText: Number.isFinite(idleForMs) ? formatDuration(idleForMs) : 'unknown',
    systemState: normalizedState.systemState,
    systemStateForMs: Number.isFinite(systemStateUpdatedAt) ? Math.max(0, now - systemStateUpdatedAt) : null,
    systemStateForText: Number.isFinite(systemStateUpdatedAt) ? formatDuration(Math.max(0, now - systemStateUpdatedAt)) : 'unknown',
    activeMsToday: normalizedState.activeMsToday,
    activeTodayText: formatDuration(normalizedState.activeMsToday),
    lastReason: normalizedState.lastReason,
    lastUrl: normalizedState.lastUrl,
    lastTitle: normalizedState.lastTitle,
    updatedAt: normalizedState.updatedAt
  };
}

function getPomodoroActivityStateLabel(systemState, isActive) {
  if (systemState === POMODORO_SYSTEM_STATES.LOCKED) return 'Locked';
  if (systemState === POMODORO_SYSTEM_STATES.IDLE) return 'Away';
  return isActive ? 'Active' : 'Away';
}

export function getPomodoroPhaseLabel(phase) {
  if (phase === POMODORO_PHASES.WORK) return 'Work';
  if (phase === POMODORO_PHASES.SHORT_BREAK) return 'Short break';
  if (phase === POMODORO_PHASES.LONG_BREAK) return 'Long break';
  if (phase === POMODORO_PHASES.PAUSED) return 'Paused';
  if (phase === POMODORO_PHASES.COMPLETED) return 'Rest satisfied';
  return 'Idle';
}

export function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
