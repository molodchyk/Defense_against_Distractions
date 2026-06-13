// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};

  const INTENT_MESSAGES = {
    intentPromptDriftChainBlockedTitle: 'Drift chain blocked',
    intentPromptDriftBlockedTitle: 'Intent drift blocked',
    intentPromptDriftDetectedTitle: 'Intent drift detected',
    intentPromptChainQuarantineSummary: 'This tab is part of a drift chain that this plan is quarantining. Return to the last coherent page or isolate this page as a new chain.',
    intentPromptBlockSummary: 'This plan is preventing this drift chain from continuing.',
    intentPromptGrayscaleSummary: 'This page has been desaturated because this browsing chain appears to have detached from where it started.',
    intentPromptReduceNoiseSummary: 'Recommendation, feed, and comment areas are hidden because this browsing chain appears to be drifting.',
    intentPromptDetectedSummary: 'This browsing chain appears to have detached from where it started.',
    intentPromptCoherenceLabel: 'Coherence:',
    intentPromptOriginLabel: 'Origin:',
    intentPromptRecoveryLabel: 'Last coherent:',
    intentPromptFirstDriftLabel: 'First drift:',
    intentPromptCurrentLabel: 'Current:',
    intentPromptDriftTabsLabel: 'Drift tabs:',
    intentPromptDriftTabsNone: 'No other known drift tabs in this chain.',
    intentPromptDriftTabsScope: '$1 other drift $2 in this chain. Return chain also affects this tab.',
    intentPromptCooldownLabel: 'Cooldown:',
    intentPromptCooldownActive: '$1 before isolation is available. Return is available now.',
    intentPromptCooldownComplete: 'complete. Isolation is available if this page is intentional.',
    intentPromptCooldownAutoCloseActive: '$1 before this quarantined tab closes. Return is available now.',
    intentPromptCooldownAutoCloseComplete: 'complete. This quarantined tab is closing.',
    intentPromptReturnTabsFailed: 'Could not return other drift tabs. Return and isolate are still available.',
    intentPromptReturnChainFailed: 'Could not return the full chain. Return and isolate are still available.',
    intentPromptCloseTabsFailed: 'Could not close other drift tabs. Return and isolate are still available.',
    intentPromptSuspendTabsFailed: 'Could not suspend other drift tabs. Return and isolate are still available.',
    intentPromptReturnedOtherTabs: 'Returned $1 other drift $2 to the last coherent page. Return or isolate this tab next.',
    intentPromptClosedOtherTabs: 'Closed $1 other drift $2 in this chain. Return or isolate this tab next.',
    intentPromptSuspendedOtherTabs: 'Suspended $1 other drift $2 in this chain. Return or isolate this tab next.',
    intentPromptMovedOtherTabs: 'Moved $1 other drift $2 to a separate window. Return or isolate this tab next.',
    intentPromptNoOtherDriftTabs: 'No other drift descendant tabs are currently open in this chain. Return or isolate this tab next.',
    intentPromptTabSingular: 'tab',
    intentPromptTabPlural: 'tabs',
    intentPromptGotItButton: 'Got it',
    intentPromptIsolateButton: 'Isolate',
    intentPromptReturnOtherDriftTabsButton: 'Return other drift tabs',
    intentPromptReturnChainButton: 'Return chain',
    intentPromptMoveOtherDriftTabsButton: 'Move drift tabs',
    intentPromptSuspendOtherDriftTabsButton: 'Suspend other drift tabs',
    intentPromptCloseOtherDriftTabsButton: 'Close other drift tabs',
    intentPromptIsolateAsNewChainButton: 'Isolate as new chain',
    intentPromptTrustShiftButton: 'Trust this shift',
    intentPromptCooldownUnavailableTitle: 'Available after the chain cooldown.',
    intentPromptReturnButton: 'Return',
    intentPromptContinueButton: 'Continue',
    intentPromptShowGraphButton: 'Show graph',
    intentPromptShowGraphFailed: 'Could not open intent diagnostics. Return and isolate are still available.',
    intentPromptMoveTabsFailed: 'Could not move other drift tabs. Return and isolate are still available.',
    intentPromptNewTabsFrozen: 'New tabs are paused while this drift intervention is active. Use the prompt controls first.',
    intentPromptContinueReasonLabel: 'Reason to continue',
    intentPromptContinueReasonPlaceholder: 'What makes this page intentional now?',
    intentPromptContinueReasonRequired: 'Enter a short reason to continue.'
  };

  function getIntentMessage(key, fallbackOrSubstitutions, maybeSubstitutions) {
    const hasExplicitFallback = maybeSubstitutions !== undefined;
    const fallback = hasExplicitFallback ? fallbackOrSubstitutions : (INTENT_MESSAGES[key] || key);
    const substitutions = hasExplicitFallback ? maybeSubstitutions : fallbackOrSubstitutions;
    const localizedMessage = global.DAD.UiLanguage?.getMessage?.(key, INTENT_MESSAGES[key] || fallback, substitutions);
    if (localizedMessage) {
      return localizedMessage;
    }

    return interpolatePositionalPlaceholders(INTENT_MESSAGES[key] || fallback, substitutions);
  }

  function interpolatePositionalPlaceholders(message, substitutions) {
    return normalizeSubstitutions(substitutions).reduce((text, value, index) => (
      text.replace(new RegExp(`\\$${index + 1}`, 'g'), String(value))
    ), String(message || ''));
  }

  function normalizeSubstitutions(substitutions) {
    return Array.isArray(substitutions)
      ? substitutions.map(value => String(value))
      : (substitutions === undefined ? [] : [String(substitutions)]);
  }

  intent.messages = {
    getIntentMessage
  };
})(window);
