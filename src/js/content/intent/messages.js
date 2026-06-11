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
    intentPromptDetectedSummary: 'This browsing chain appears to have detached from where it started.',
    intentPromptCoherenceLabel: 'Coherence:',
    intentPromptOriginLabel: 'Origin:',
    intentPromptCurrentLabel: 'Current:',
    intentPromptCooldownLabel: 'Cooldown:',
    intentPromptCooldownActive: '$1 before isolation is available. Return is available now.',
    intentPromptCooldownComplete: 'complete. Isolation is available if this page is intentional.',
    intentPromptCloseTabsFailed: 'Could not close other drift tabs. Return and isolate are still available.',
    intentPromptClosedOtherTabs: 'Closed $1 other drift $2 in this chain. Return or isolate this tab next.',
    intentPromptNoOtherDriftTabs: 'No other drift descendant tabs are currently open in this chain. Return or isolate this tab next.',
    intentPromptTabSingular: 'tab',
    intentPromptTabPlural: 'tabs',
    intentPromptGotItButton: 'Got it',
    intentPromptIsolateButton: 'Isolate',
    intentPromptCloseOtherDriftTabsButton: 'Close other drift tabs',
    intentPromptIsolateAsNewChainButton: 'Isolate as new chain',
    intentPromptTrustShiftButton: 'Trust this shift',
    intentPromptCooldownUnavailableTitle: 'Available after the chain cooldown.',
    intentPromptReturnButton: 'Return',
    intentPromptContinueButton: 'Continue'
  };

  function getIntentMessage(key, fallbackOrSubstitutions, maybeSubstitutions) {
    const hasExplicitFallback = maybeSubstitutions !== undefined;
    const fallback = hasExplicitFallback ? fallbackOrSubstitutions : (INTENT_MESSAGES[key] || key);
    const substitutions = hasExplicitFallback ? maybeSubstitutions : fallbackOrSubstitutions;
    return global.DAD.UiLanguage?.getMessage?.(key, INTENT_MESSAGES[key] || fallback, substitutions)
      || INTENT_MESSAGES[key]
      || fallback;
  }

  intent.messages = {
    getIntentMessage
  };
})(window);
