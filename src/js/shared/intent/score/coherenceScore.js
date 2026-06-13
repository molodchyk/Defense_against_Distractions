// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { DEFAULT_INTENT_SETTINGS } from '../constants.js';
import { normalizeIntentSettings } from '../settings.js';
import { clamp } from '../utils.js';

export function getIntentRiskState(coherenceScore, settings = DEFAULT_INTENT_SETTINGS) {
  const normalizedSettings = normalizeIntentSettings(settings);
  if (!normalizedSettings.enabled) {
    return 'clear';
  }

  if (coherenceScore <= normalizedSettings.lockedThreshold) return 'locked';
  if (coherenceScore <= normalizedSettings.interventionThreshold) return 'intervene';
  if (coherenceScore >= 80) return 'clear';
  if (coherenceScore >= 60) return 'watch';
  return 'drift';
}

export function calculateIntentCoherence(metrics = {}) {
  const visitCount = Number(metrics.visitCount || 0);
  const originAnchorStrength = clamp(Number(metrics.originAnchorStrength ?? 1), 0, 1);
  const originDrift = (1 - Number(metrics.originSimilarity ?? 1)) * (8 + originAnchorStrength * 12);
  const localDrift = (1 - Number(metrics.localSimilarity ?? 1)) * 10;
  const entropyDrift = visitCount >= 3 ? Number(metrics.domainEntropy || 0) * 15 : 0;
  const passiveDrift = Number(metrics.passiveMediaLoad || 0) * 15;
  const passiveInteractionDrift = Number(metrics.passiveInteractionLoad || 0) * 10;
  const linkDrift = Number(metrics.linkDensity || 0) * 10;
  const domainChangeDrift = Math.min(Math.max(Number(metrics.domainChanges || 0) - 1, 0) * 3, 15);
  const tabBranchDrift = Math.min(Math.max(Number(metrics.tabCount || 0) - 3, 0) * 4, 12);
  const tabPressureDrift = Number(metrics.tabPressureLoad || 0) * 6;
  const tabSwitchDrift = Number(metrics.tabSwitchLoad || 0) * 8;
  const lineageDrift = Math.min(Number(metrics.branchCount || 0) * 1.5, 8);
  const driftDescendantDrift = metrics.latestIsDriftDescendant ? 8 : 0;
  const passiveTimeDrift = Number(metrics.passiveTimeLoad || 0) * 8;
  const longSessionDrift = Number(metrics.longSessionLoad || 0) * 6;
  const interactionVelocityDrift = Number(metrics.interactionVelocityLoad || 0) * 8;
  const dynamicContentDrift = Number(metrics.dynamicContentLoad || 0) * 6;
  const lowAgencyDrift = Number(metrics.lowAgencyLoad || 0) * 6;
  const recommenderDrift = Number(metrics.recommenderClickLoad || 0) * 12;
  const feedCommentDrift = Number(metrics.feedCommentInteractionLoad || 0) * 5;
  const redirectTransitionDrift = Number(metrics.redirectTransitionLoad || 0) * 5;
  const navigationLoopDrift = Number(metrics.navigationLoopLoad || 0) * 8;
  const searchRefinementDrift = Number(metrics.searchRefinementLoad || 0) * 7;
  const deliberateStalenessDrift = Number(metrics.deliberateStalenessLoad || 0) * 6;
  const unanchoredDrift = Number(metrics.unanchoredSessionLoad || 0) * 8;
  const originDecayDrift = Number(metrics.originDecayLoad || 0) * 7;
  const mediaChainDrift = Number(metrics.mediaChainLoad || 0) * 7;
  const lowReturnDrift = Number(metrics.lowReturnLoad || 0) * 8;
  const agencyRecovery = Number(metrics.activeInputLoad || 0) * 4;
  const dwellRecovery = Number(metrics.constructiveDwell || 0) * 4;
  const directNavigationRecovery = Number(metrics.directNavigationRecovery || 0) * 4;

  return Math.round(clamp(
    100
      - originDrift
      - localDrift
      - entropyDrift
      - passiveDrift
      - passiveInteractionDrift
      - linkDrift
      - domainChangeDrift
      - tabBranchDrift
      - tabPressureDrift
      - tabSwitchDrift
      - lineageDrift
      - driftDescendantDrift
      - passiveTimeDrift
      - longSessionDrift
      - interactionVelocityDrift
      - dynamicContentDrift
      - lowAgencyDrift
      - recommenderDrift
      - feedCommentDrift
      - redirectTransitionDrift
      - navigationLoopDrift
      - searchRefinementDrift
      - deliberateStalenessDrift
      - unanchoredDrift
      - originDecayDrift
      - mediaChainDrift
      - lowReturnDrift
      + agencyRecovery
      + dwellRecovery
      + directNavigationRecovery,
    0,
    100
  ));
}
