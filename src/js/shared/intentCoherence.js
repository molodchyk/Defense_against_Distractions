// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export {
  DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS,
  DEFAULT_INTENT_OPTIONS,
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_INTERVENTION_RISK_STATES,
  INTENT_POMODORO_INFLUENCE_MODES,
  INTENT_TRAJECTORY_STORAGE_KEY
} from './intent/constants.js';
export { normalizeIntentSettings } from './intent/settings.js';
export {
  calculateTokenSimilarity,
  extractIntentTokens,
  normalizeIntentNavigationTransition,
  normalizePageSignalForIntent
} from './intent/signals.js';
export {
  createIntentTrajectoryState,
  getIntentDriftDescendantTabIds,
  getIntentTabLineageEntry
} from './intent/state.js';
export {
  applyIntentFeedbackCalibration,
  deriveIntentFeedbackCalibration,
  summarizeIntentFeedback
} from './intent/feedback.js';
export { calculateIntentCoherence, getIntentRiskState } from './intent/scoring.js';
export {
  getActiveIntentSession,
  getIntentSessionForTab,
  recordIntentFeedback,
  recordIntentNavigationTransition,
  recordIntentPageVisit,
  recordIntentTabActivation,
  recordIntentTabCreated,
  recordIntentTabRemoved
} from './intent/trajectory.js';
export {
  createIntentInterventionId,
  getIntentInterventionDecision,
  getIntentReasonLines,
  getLastCoherentIntentVisit
} from './intent/interventions.js';
