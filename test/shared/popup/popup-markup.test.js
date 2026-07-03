// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const popupHtml = readFileSync('src/popup.html', 'utf8');

describe('popup markup', () => {
  it('groups session coherence actions by recovery scope', () => {
    const primaryIndex = popupHtml.indexOf('popupIntentPrimaryActionsLabel');
    const currentIndex = popupHtml.indexOf('popupIntentCurrentActionsLabel');
    const driftIndex = popupHtml.indexOf('popupIntentDriftActionsLabel');
    const closeIndex = popupHtml.indexOf('cleanIntentDriftTabsButton');

    assert.ok(primaryIndex > -1);
    assert.ok(currentIndex > primaryIndex);
    assert.ok(driftIndex > currentIndex);
    assert.ok(closeIndex > driftIndex);
    assert.match(popupHtml, /intent-action-group-primary[\s\S]+returnIntentChainButton[\s\S]+returnIntentButton/);
    assert.match(popupHtml, /intent-action-group-drift[\s\S]+returnIntentDriftTabsButton[\s\S]+cleanIntentDriftTabsButton/);
  });

  it('shows effective intent policy in the session coherence details', () => {
    const driftTabsIndex = popupHtml.indexOf('intentRecoveryDriftTabsText');
    const interventionIndex = popupHtml.indexOf('intentRecoveryInterventionText');
    const policyIndex = popupHtml.indexOf('intentRecoveryPolicyText');

    assert.ok(interventionIndex > driftTabsIndex);
    assert.ok(policyIndex > interventionIndex);
    assert.match(popupHtml, /popupIntentInterventionLabel[\s\S]+intentRecoveryInterventionText/);
    assert.match(popupHtml, /popupIntentPolicyLabel[\s\S]+intentRecoveryPolicyText/);
  });

  it('shows a compact session path before recovery reasons', () => {
    const detailsIndex = popupHtml.indexOf('intentRecoveryPolicyText');
    const timelineIndex = popupHtml.indexOf('intentRecoveryTimelineList');
    const reasonsIndex = popupHtml.indexOf('intentRecoveryReasonList');

    assert.ok(timelineIndex > detailsIndex);
    assert.ok(reasonsIndex > timelineIndex);
    assert.match(popupHtml, /intentRecoveryTimelineList[\s\S]+popupIntentRecoveryTimelineAriaLabel/);
  });

  it('requires a popup Continue reason before current-page intent actions', () => {
    const currentActionsIndex = popupHtml.indexOf('popupIntentCurrentActionsLabel');
    const reasonIndex = popupHtml.indexOf('intentContinueReasonInput');
    const continueIndex = popupHtml.indexOf('continueIntentButton');
    const isolateIndex = popupHtml.indexOf('isolateIntentButton');

    assert.ok(reasonIndex > currentActionsIndex);
    assert.ok(continueIndex > reasonIndex);
    assert.ok(isolateIndex > continueIndex);
    assert.match(popupHtml, /intentContinueReasonInput[\s\S]+popupIntentContinueReasonPlaceholder/);
    assert.match(popupHtml, /continueIntentButton[\s\S]+popupIntentContinueButton/);
  });

  it('shows compact intent score signals before intent reasons', () => {
    const detailsIndex = popupHtml.indexOf('intentLineageText');
    const signalsIndex = popupHtml.indexOf('intentSignalOriginText');
    const reasonsIndex = popupHtml.indexOf('intentReasonList');

    assert.ok(signalsIndex > detailsIndex);
    assert.ok(reasonsIndex > signalsIndex);
    assert.match(popupHtml, /popupIntentSignalsAriaLabel[\s\S]+popupIntentSignalOriginLabel[\s\S]+intentSignalOriginText/);
    assert.match(popupHtml, /popupIntentSignalPassiveLabel[\s\S]+intentSignalPassiveText[\s\S]+popupIntentSignalNavigationLabel[\s\S]+intentSignalNavigationText/);
  });

  it('keeps feedback-with-diagnostics in the Inspect action bar', () => {
    const inspectBarIndex = popupHtml.indexOf('inspect-action-bar');
    const copyIndex = popupHtml.indexOf('copyDiagnosticsButton');
    const feedbackIndex = popupHtml.indexOf('copyDiagnosticsFeedbackButton');

    assert.ok(copyIndex > inspectBarIndex);
    assert.ok(feedbackIndex > copyIndex);
    assert.match(popupHtml, /copyDiagnosticsFeedbackButton[\s\S]+popupCopyDiagnosticsFeedbackButton/);
  });

  it('shows blocked outcome share in the Today usage card', () => {
    const blockedActiveIndex = popupHtml.indexOf('usageSummaryBlockedText');
    const blockedShareIndex = popupHtml.indexOf('usageSummaryBlockedShareText');
    const domainsIndex = popupHtml.indexOf('usageSummaryDomainsText');

    assert.ok(blockedShareIndex > blockedActiveIndex);
    assert.ok(domainsIndex > blockedShareIndex);
    assert.match(popupHtml, /popupBlockedShareLabel[\s\S]+usageSummaryBlockedShareText/);
  });

  it('shows recent block contributors in Block Diagnostics', () => {
    const triggerIndex = popupHtml.indexOf('blockTriggerText');
    const scoreIndex = popupHtml.indexOf('blockScoreText');
    const contributorIndex = popupHtml.indexOf('blockContributorText');

    assert.ok(scoreIndex > triggerIndex);
    assert.ok(contributorIndex > scoreIndex);
    assert.match(popupHtml, /popupContributorsLabel[\s\S]+blockContributorText/);
  });

  it('shows audible media and current-page keyword ideas in Page Signals', () => {
    const pageSignalsIndex = popupHtml.indexOf('pageSignalsTitle');
    const audioIndex = popupHtml.indexOf('pageSignalAudioCount');
    const audibleIndex = popupHtml.indexOf('pageSignalAudibleMediaCount');
    const passiveRegionsIndex = popupHtml.indexOf('pageSignalPassiveRegions');
    const selectedTextIndex = popupHtml.indexOf('pageSignalSelectedTextCandidate');
    const quickAddIndex = popupHtml.indexOf('selectedTextQuickAddPanel');
    const addRuleIndex = popupHtml.indexOf('addSelectedTextRuleButton');
    const keywordIdeasIndex = popupHtml.indexOf('pageSignalKeywordIdeasText');
    const copySelectedIndex = popupHtml.indexOf('copySelectedTextButton');
    const copyIndex = popupHtml.indexOf('copyKeywordIdeasButton');

    assert.ok(audioIndex > pageSignalsIndex);
    assert.ok(audibleIndex > audioIndex);
    assert.ok(passiveRegionsIndex > audibleIndex);
    assert.ok(selectedTextIndex > passiveRegionsIndex);
    assert.ok(keywordIdeasIndex > selectedTextIndex);
    assert.ok(quickAddIndex > keywordIdeasIndex);
    assert.ok(addRuleIndex > quickAddIndex);
    assert.ok(copySelectedIndex > addRuleIndex);
    assert.ok(copyIndex > copySelectedIndex);
    assert.ok(copyIndex > keywordIdeasIndex);
    assert.match(popupHtml, /popupAudibleMediaLabel[\s\S]+pageSignalAudibleMediaCount/);
    assert.match(popupHtml, /popupPassiveRegionsLabel[\s\S]+pageSignalPassiveRegions/);
    assert.match(popupHtml, /popupSelectedTextLabel[\s\S]+pageSignalSelectedTextCandidate/);
    assert.match(popupHtml, /popupKeywordIdeasLabel[\s\S]+pageSignalKeywordIdeasText/);
    assert.match(popupHtml, /selectedTextQuickAddPanel[\s\S]+popupQuickAddSelectedTextTitle[\s\S]+selectedTextQuickAddPlanSelect[\s\S]+selectedTextQuickAddEntrySelect[\s\S]+selectedTextQuickAddScoreInput/);
    assert.match(popupHtml, /addSelectedTextRuleButton[\s\S]+popupQuickAddAddRuleButton/);
    assert.match(popupHtml, /copySelectedTextButton[\s\S]+popupCopySelectedTextButton/);
    assert.match(popupHtml, /copyKeywordIdeasButton[\s\S]+popupCopyKeywordIdeasButton/);
  });
});
