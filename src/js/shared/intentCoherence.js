// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export {
  DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS,
  DEFAULT_INTENT_OPTIONS,
  DEFAULT_INTENT_SETTINGS,
  INTENT_INTERVENTION_ACTIONS,
  INTENT_INTERVENTION_RISK_STATES,
  INTENT_POMODORO_INFLUENCE_MODES,
  INTENT_TRAJECTORY_STORAGE_KEY,
  MAX_INTENT_CONTINUE_REASON_LENGTH
} from './intent/constants.js';
export {
  isIntentSettingsAtLeastAsStrict,
  normalizeIntentSettings
} from './intent/settings.js';
export {
  calculateTokenSimilarity,
  calculateWeightedTokenSimilarity,
  extractIntentTokens,
  extractWeightedIntentTokens,
  normalizeIntentNavigationTransition,
  normalizePageSignalForIntent
} from './intent/signals.js';
export {
  createIntentTrajectoryState,
  detachIntentTabLineageEntries,
  getIntentChainReturnTabIds,
  getIntentDriftDescendantTabIds,
  getIntentTabLineageEntry
} from './intent/state.js';
export {
  applyIntentFeedbackCalibration,
  deriveIntentFeedbackCalibration,
  summarizeIntentFeedback
} from './intent/feedback.js';
export { calculateIntentCoherence, getIntentRiskState } from './intent/score/coherenceScore.js';
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
  getLastCoherentIntentVisit,
  shouldFreezeIntentNewTabs
} from './intent/interventions.js';
export {
  createIntentLineageGraph,
  getIntentCoherentHostSummary,
  getIntentDriftDescendantHostSummary
} from './intent/graph.js';
