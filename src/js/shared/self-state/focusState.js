// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  normalizeIntentSettings
} from '../intentCoherence.js';

export const FOCUS_STATE_STORAGE_KEY = 'focusStateSignal';
export const FOCUS_STATE_LEVELS = {
  CALM: 'calm',
  STRAINED: 'strained',
  VULNERABLE: 'vulnerable'
};
export const DEFAULT_FOCUS_STATE_DURATION_MS = 2 * 60 * 60 * 1000;
export const FOCUS_STATE_THRESHOLD_ADJUSTMENTS = {
  [FOCUS_STATE_LEVELS.CALM]: 0,
  [FOCUS_STATE_LEVELS.STRAINED]: 8,
  [FOCUS_STATE_LEVELS.VULNERABLE]: 16
};

const MIN_FOCUS_STATE_DURATION_MS = 5 * 60 * 1000;
const MAX_FOCUS_STATE_DURATION_MS = 8 * 60 * 60 * 1000;

function getNowMs(options = {}) {
  const nowValue = typeof options.now === 'function' ? options.now() : options.now;
  const now = Number(nowValue ?? Date.now());
  return Number.isFinite(now) ? now : Date.now();
}

function clampDuration(value) {
  const duration = Number(value);
  if (!Number.isFinite(duration)) {
    return DEFAULT_FOCUS_STATE_DURATION_MS;
  }

  return Math.min(Math.max(duration, MIN_FOCUS_STATE_DURATION_MS), MAX_FOCUS_STATE_DURATION_MS);
}

function normalizeLevel(value) {
  return Object.values(FOCUS_STATE_LEVELS).includes(value)
    ? value
    : FOCUS_STATE_LEVELS.CALM;
}

function parseTimeMs(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : null;
}

function createCalmFocusState(nowMs) {
  return {
    level: FOCUS_STATE_LEVELS.CALM,
    updatedAt: new Date(nowMs).toISOString(),
    activeUntil: null
  };
}

export function createFocusStateSignal(level, options = {}) {
  const nowMs = getNowMs(options);
  const normalizedLevel = normalizeLevel(level);

  if (normalizedLevel === FOCUS_STATE_LEVELS.CALM) {
    return createCalmFocusState(nowMs);
  }

  return {
    level: normalizedLevel,
    updatedAt: new Date(nowMs).toISOString(),
    activeUntil: new Date(nowMs + clampDuration(options.durationMs)).toISOString()
  };
}

export function normalizeFocusStateSignal(signal = {}, options = {}) {
  const nowMs = getNowMs(options);
  const level = normalizeLevel(signal?.level);
  const updatedAtMs = parseTimeMs(signal?.updatedAt) || nowMs;
  const activeUntilMs = parseTimeMs(signal?.activeUntil);

  if (level === FOCUS_STATE_LEVELS.CALM) {
    return {
      level,
      updatedAt: new Date(updatedAtMs).toISOString(),
      activeUntil: null
    };
  }

  if (!activeUntilMs || activeUntilMs <= nowMs) {
    return createCalmFocusState(nowMs);
  }

  return {
    level,
    updatedAt: new Date(updatedAtMs).toISOString(),
    activeUntil: new Date(activeUntilMs).toISOString()
  };
}

export function getFocusStateThresholdAdjustment(signal = {}, options = {}) {
  const normalizedSignal = normalizeFocusStateSignal(signal, options);
  return FOCUS_STATE_THRESHOLD_ADJUSTMENTS[normalizedSignal.level] || 0;
}

export function applyFocusStateToIntentPolicy(intentPolicy = {}, focusStateSignal = {}, options = {}) {
  const normalizedSignal = normalizeFocusStateSignal(focusStateSignal, options);
  const thresholdAdjustment = getFocusStateThresholdAdjustment(normalizedSignal, options);
  const currentSettings = intentPolicy.settings || {};
  const adjustedSettings = thresholdAdjustment > 0
    ? normalizeIntentSettings({
      ...currentSettings,
      interventionThreshold: Number(currentSettings.interventionThreshold || 0) + thresholdAdjustment,
      lockedThreshold: Number(currentSettings.lockedThreshold || 0) + thresholdAdjustment
    })
    : normalizeIntentSettings(currentSettings);

  return {
    ...intentPolicy,
    settings: {
      ...adjustedSettings,
      calibration: currentSettings.calibration
    },
    focusState: {
      ...normalizedSignal,
      thresholdAdjustment
    }
  };
}
