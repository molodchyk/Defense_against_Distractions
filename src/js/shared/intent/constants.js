// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


export const INTENT_TRAJECTORY_STORAGE_KEY = 'intentTrajectoryState';
export const DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS = 45 * 1000;

export const INTENT_INTERVENTION_ACTIONS = {
  WARN: 'warn',
  GRAYSCALE: 'grayscale',
  PROMPT: 'prompt',
  BLOCK: 'block'
};

export const INTENT_POMODORO_INFLUENCE_MODES = {
  IGNORE: 'ignore',
  WORK_STRICTER: 'workStricter',
  BREAK_LENIENT: 'breakLenient',
  BOTH: 'both'
};

export const DEFAULT_INTENT_SETTINGS = {
  enabled: true,
  action: INTENT_INTERVENTION_ACTIONS.PROMPT,
  interventionThreshold: 40,
  lockedThreshold: 20,
  pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BOTH,
  diagnosticsRetentionDays: 7,
  autoCalibration: true
};

export const DEFAULT_INTENT_OPTIONS = {
  idleResetMs: 15 * 60 * 1000,
  maxSessions: 6,
  maxVisitsPerSession: 80,
  maxTabLineageEntries: 120,
  maxFeedbackEntries: 80,
  chainBlockCooldownMs: DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS,
  intentSettings: DEFAULT_INTENT_SETTINGS,
  now: () => Date.now()
};

export const INTENT_INTERVENTION_RISK_STATES = ['intervene', 'locked'];

export const TOKEN_LIMIT = 40;
export const TEXT_TOKEN_LIMIT = 24;
export const MIN_RATE_WINDOW_MS = 30 * 1000;
export const MAX_RATE_PER_MINUTE = 600;
export const MIN_DIAGNOSTICS_RETENTION_DAYS = 1;
export const MAX_DIAGNOSTICS_RETENTION_DAYS = 30;
export const MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION = 5;
export const HELPFUL_INTERVENTION_THRESHOLD_DELTA = 6;
export const TOO_SENSITIVE_THRESHOLD_DELTA = -6;
export const INTENT_TRANSITION_TYPES = new Set([
  'link',
  'typed',
  'auto_bookmark',
  'auto_subframe',
  'manual_subframe',
  'generated',
  'auto_toplevel',
  'form_submit',
  'reload',
  'keyword',
  'keyword_generated'
]);
export const INTENT_TRANSITION_QUALIFIERS = new Set([
  'client_redirect',
  'server_redirect',
  'forward_back',
  'from_address_bar'
]);
export const INTENT_FEEDBACK_ACTIONS = new Set([
  'acknowledge',
  'continue',
  'isolate',
  'return',
  'dismiss'
]);
export const INTENT_FEEDBACK_RECOMMENDATIONS = {
  INSUFFICIENT_DATA: 'insufficientData',
  INTERVENTIONS_HELPFUL: 'interventionsHelpful',
  TOO_SENSITIVE: 'tooSensitive',
  MIXED: 'mixed'
};
export const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'com',
  'de',
  'der',
  'die',
  'das',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'mit',
  'of',
  'on',
  'or',
  'the',
  'to',
  'und',
  'von',
  'what',
  'www'
]);