// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import { DEFAULT_INTENT_SETTINGS } from './constants.js';
import { normalizeIntentSettings } from './settings.js';
import { calculateTokenSimilarity } from './signals.js';
import { clamp } from './utils.js';

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

function calculatePassiveMediaLoad(signal) {
  const mediaScore = (
    signal.media.videoCount * 10 +
    signal.media.audioCount * 6 +
    signal.media.gifCount * 3 +
    Math.min(signal.media.imageCount, 40) * 0.5 +
    Math.min(signal.structure.feedCount, 5) * 8
  );
  return clamp(mediaScore / 35, 0, 1);
}

function calculateLinkDensity(signal) {
  if (signal.structure.elementCount <= 0) {
    return 0;
  }

  return clamp(signal.interaction.linkCount / signal.structure.elementCount, 0, 1);
}

function calculatePassiveInteractionLoad(signal) {
  const activity = signal.activity || {};
  const scrollLoad = clamp(Number(activity.scrollEvents || 0) / 30, 0, 1);
  const clickLoad = clamp(Number(activity.clickEvents || 0) / 24, 0, 1);
  const scrollDepth = clamp(Number(activity.maxScrollDepthRatio || 0), 0, 1);
  const activeInputLoad = calculateActiveInputLoad(signal);
  return clamp((scrollLoad * 0.45 + scrollDepth * 0.3 + clickLoad * 0.25) * (1 - activeInputLoad * 0.55), 0, 1);
}

function calculateActiveInputLoad(signal) {
  const activity = signal.activity || {};
  const inputEvents = Number(activity.inputEvents || 0);
  const keyEvents = Number(activity.keyEvents || 0);
  return clamp((inputEvents * 1.5 + keyEvents) / 18, 0, 1);
}

function calculateInteractionVelocityLoad(signal) {
  const activity = signal.activity || {};
  const activeInputLoad = calculateActiveInputLoad(signal);
  const scrollVelocity = clamp(Number(activity.scrollRatePerMinute || 0) / 60, 0, 1);
  const clickVelocity = clamp(Number(activity.clickRatePerMinute || 0) / 30, 0, 1);
  const inputVelocity = clamp(
    (Number(activity.inputRatePerMinute || 0) + Number(activity.keyRatePerMinute || 0) * 0.4) / 24,
    0,
    1
  );
  const passiveInputVelocity = Math.max(0, inputVelocity - activeInputLoad * 0.6);

  return clamp(scrollVelocity * 0.45 + clickVelocity * 0.4 + passiveInputVelocity * 0.15, 0, 1);
}

function calculateRecommenderClickLoad(signal) {
  const activity = signal.activity || {};
  const clickEvents = Number(activity.clickEvents || 0);
  const recommenderClickEvents = Number(activity.recommenderClickEvents || 0);
  if (recommenderClickEvents <= 0) {
    return 0;
  }

  const countLoad = clamp(recommenderClickEvents / 4, 0, 1);
  const rateLoad = clamp(Number(activity.recommenderClickRatePerMinute || 0) / 8, 0, 1);
  const dominanceLoad = clickEvents > 0 ? clamp(recommenderClickEvents / clickEvents, 0, 1) : 0;
  return clamp(countLoad * 0.4 + rateLoad * 0.35 + dominanceLoad * 0.25, 0, 1);
}

function calculateConstructiveDwell(signal) {
  const activity = signal.activity || {};
  const activeMinutes = Number(activity.activePageMs ?? activity.pageAgeMs ?? 0) / (60 * 1000);
  const textVolume = Number(signal.text?.wordCount || 0);
  const mediaLoad = calculatePassiveMediaLoad(signal);
  const activeInputLoad = calculateActiveInputLoad(signal);
  const readingLoad = textVolume >= 250 && mediaLoad < 0.35
    ? clamp(activeMinutes / 6, 0, 1)
    : 0;

  return clamp(Math.max(readingLoad, activeInputLoad), 0, 1);
}

function calculatePassiveTimeLoad(signal) {
  const activity = signal.activity || {};
  const activeMinutes = Number(activity.activePageMs ?? activity.pageAgeMs ?? 0) / (60 * 1000);
  if (activeMinutes <= 2) {
    return 0;
  }

  const passivePressure = Math.max(
    calculatePassiveMediaLoad(signal),
    calculatePassiveInteractionLoad(signal),
    calculateLinkDensity(signal)
  );
  return clamp(((activeMinutes - 2) / 8) * passivePressure, 0, 1);
}

function hasRedirectTransition(visit = {}) {
  const qualifiers = Array.isArray(visit.transitionQualifiers) ? visit.transitionQualifiers : [];
  return qualifiers.includes('client_redirect') || qualifiers.includes('server_redirect');
}

function calculateRedirectTransitionLoad(visits = []) {
  if (visits.length === 0) {
    return 0;
  }

  const redirectCount = visits.filter(hasRedirectTransition).length;
  if (redirectCount === 0) {
    return 0;
  }

  const recentRedirectCount = visits.slice(-4).filter(hasRedirectTransition).length;
  const chainShare = redirectCount / visits.length;
  return clamp(chainShare * 0.45 + (recentRedirectCount / 3) * 0.55, 0, 1);
}

function getVisitDurationMs(visit = {}, key) {
  return Math.max(0, Number(visit.signals?.activity?.[key] || visit[key] || 0));
}

function calculateDurationTotals(visits = []) {
  const durationByPage = new Map();
  visits.forEach((visit, index) => {
    const key = [
      Number.isFinite(visit.tabId) ? visit.tabId : 'tab',
      visit.url || visit.hostname || `visit-${index}`
    ].join('|');
    const current = durationByPage.get(key) || { dwellMs: 0, activeMs: 0 };
    durationByPage.set(key, {
      dwellMs: Math.max(current.dwellMs, getVisitDurationMs(visit, 'pageAgeMs')),
      activeMs: Math.max(current.activeMs, getVisitDurationMs(visit, 'activePageMs'))
    });
  });

  return Array.from(durationByPage.values()).reduce((totals, duration) => ({
    dwellMs: totals.dwellMs + duration.dwellMs,
    activeMs: totals.activeMs + duration.activeMs
  }), { dwellMs: 0, activeMs: 0 });
}

export function calculateVisitSimilarity(firstVisit = {}, secondVisit = {}) {
  const metadataSimilarity = calculateTokenSimilarity(firstVisit.metadataTokens || firstVisit.tokens, secondVisit.metadataTokens || secondVisit.tokens);
  const firstTextTokens = firstVisit.textTokens || firstVisit.signals?.text?.topTokens || [];
  const secondTextTokens = secondVisit.textTokens || secondVisit.signals?.text?.topTokens || [];
  const hasTextSignals = firstTextTokens.length > 0 && secondTextTokens.length > 0;
  const textSimilarity = hasTextSignals ? calculateTokenSimilarity(firstTextTokens, secondTextTokens) : null;
  const combinedSimilarity = calculateTokenSimilarity(firstVisit.tokens, secondVisit.tokens);

  if (!hasTextSignals) {
    return {
      similarity: Number(combinedSimilarity.toFixed(3)),
      metadataSimilarity: Number(metadataSimilarity.toFixed(3)),
      textSimilarity: null
    };
  }

  return {
    similarity: Number((metadataSimilarity * 0.35 + textSimilarity * 0.55 + combinedSimilarity * 0.1).toFixed(3)),
    metadataSimilarity: Number(metadataSimilarity.toFixed(3)),
    textSimilarity: Number(textSimilarity.toFixed(3))
  };
}

export function calculateSessionMetrics(visits, originVisit) {
  const domains = visits.map(visit => visit.hostname).filter(Boolean);
  const uniqueDomains = new Set(domains);
  const tabIds = visits.map(visit => visit.tabId).filter(Number.isFinite);
  const uniqueTabIds = new Set(tabIds);
  let domainChanges = 0;
  for (let index = 1; index < domains.length; index += 1) {
    if (domains[index] !== domains[index - 1]) {
      domainChanges += 1;
    }
  }

  const latestVisit = visits[visits.length - 1];
  const previousVisit = visits[visits.length - 2] || latestVisit;
  const originSimilarityResult = latestVisit
    ? calculateVisitSimilarity(originVisit, latestVisit)
    : { similarity: 1, metadataSimilarity: 1, textSimilarity: null };
  const localSimilarityResult = latestVisit && previousVisit
    ? calculateVisitSimilarity(previousVisit, latestVisit)
    : { similarity: 1, metadataSimilarity: 1, textSimilarity: null };
  const passiveMediaLoad = latestVisit ? calculatePassiveMediaLoad(latestVisit.signals) : 0;
  const passiveInteractionLoad = latestVisit ? calculatePassiveInteractionLoad(latestVisit.signals) : 0;
  const activeInputLoad = latestVisit ? calculateActiveInputLoad(latestVisit.signals) : 0;
  const interactionVelocityLoad = latestVisit ? calculateInteractionVelocityLoad(latestVisit.signals) : 0;
  const recommenderClickLoad = latestVisit ? calculateRecommenderClickLoad(latestVisit.signals) : 0;
  const constructiveDwell = latestVisit ? calculateConstructiveDwell(latestVisit.signals) : 0;
  const passiveTimeLoad = latestVisit ? calculatePassiveTimeLoad(latestVisit.signals) : 0;
  const latestActivity = latestVisit?.signals?.activity || {};
  const linkDensity = latestVisit ? calculateLinkDensity(latestVisit.signals) : 0;
  const domainEntropy = domains.length <= 1 ? 0 : clamp(uniqueDomains.size / domains.length, 0, 1);
  const branchCount = visits.filter(visit => visit.parentVisitId).length;
  const driftDescendantCount = visits.filter(visit => visit.driftDescendant).length;
  const redirectTransitionCount = visits.filter(hasRedirectTransition).length;
  const redirectTransitionLoad = calculateRedirectTransitionLoad(visits);
  const durationTotals = calculateDurationTotals(visits);

  return {
    visitCount: visits.length,
    uniqueDomainCount: uniqueDomains.size,
    tabCount: uniqueTabIds.size,
    branchCount,
    driftDescendantCount,
    latestIsDriftDescendant: latestVisit?.driftDescendant === true,
    domainChanges,
    originSimilarity: originSimilarityResult.similarity,
    localSimilarity: localSimilarityResult.similarity,
    metadataOriginSimilarity: originSimilarityResult.metadataSimilarity,
    metadataLocalSimilarity: localSimilarityResult.metadataSimilarity,
    textOriginSimilarity: originSimilarityResult.textSimilarity,
    textLocalSimilarity: localSimilarityResult.textSimilarity,
    passiveMediaLoad: Number(passiveMediaLoad.toFixed(3)),
    passiveInteractionLoad: Number(passiveInteractionLoad.toFixed(3)),
    activeInputLoad: Number(activeInputLoad.toFixed(3)),
    interactionVelocityLoad: Number(interactionVelocityLoad.toFixed(3)),
    recommenderClickLoad: Number(recommenderClickLoad.toFixed(3)),
    constructiveDwell: Number(constructiveDwell.toFixed(3)),
    passiveTimeLoad: Number(passiveTimeLoad.toFixed(3)),
    latestDwellMs: latestVisit ? getVisitDurationMs(latestVisit, 'pageAgeMs') : 0,
    latestActiveMs: latestVisit ? getVisitDurationMs(latestVisit, 'activePageMs') : 0,
    totalDwellMs: Math.round(durationTotals.dwellMs),
    totalActiveMs: Math.round(durationTotals.activeMs),
    scrollRatePerMinute: Number(Number(latestActivity.scrollRatePerMinute || 0).toFixed(3)),
    clickRatePerMinute: Number(Number(latestActivity.clickRatePerMinute || 0).toFixed(3)),
    recommenderClickEvents: Number(latestActivity.recommenderClickEvents || 0),
    recommenderClickRatePerMinute: Number(Number(latestActivity.recommenderClickRatePerMinute || 0).toFixed(3)),
    keyRatePerMinute: Number(Number(latestActivity.keyRatePerMinute || 0).toFixed(3)),
    inputRatePerMinute: Number(Number(latestActivity.inputRatePerMinute || 0).toFixed(3)),
    latestTransitionType: latestVisit?.transitionType || null,
    latestTransitionQualifiers: Array.isArray(latestVisit?.transitionQualifiers) ? latestVisit.transitionQualifiers : [],
    latestTransitionSource: latestVisit?.transitionSource || null,
    redirectTransitionCount,
    redirectTransitionLoad: Number(redirectTransitionLoad.toFixed(3)),
    linkDensity: Number(linkDensity.toFixed(3)),
    domainEntropy: Number(domainEntropy.toFixed(3))
  };
}

export function calculateIntentCoherence(metrics = {}) {
  const visitCount = Number(metrics.visitCount || 0);
  const originDrift = (1 - Number(metrics.originSimilarity ?? 1)) * 20;
  const localDrift = (1 - Number(metrics.localSimilarity ?? 1)) * 10;
  const entropyDrift = visitCount >= 3 ? Number(metrics.domainEntropy || 0) * 15 : 0;
  const passiveDrift = Number(metrics.passiveMediaLoad || 0) * 15;
  const passiveInteractionDrift = Number(metrics.passiveInteractionLoad || 0) * 10;
  const linkDrift = Number(metrics.linkDensity || 0) * 10;
  const domainChangeDrift = Math.min(Math.max(Number(metrics.domainChanges || 0) - 1, 0) * 3, 15);
  const tabBranchDrift = Math.min(Math.max(Number(metrics.tabCount || 0) - 3, 0) * 4, 12);
  const lineageDrift = Math.min(Number(metrics.branchCount || 0) * 1.5, 8);
  const driftDescendantDrift = metrics.latestIsDriftDescendant ? 8 : 0;
  const passiveTimeDrift = Number(metrics.passiveTimeLoad || 0) * 8;
  const interactionVelocityDrift = Number(metrics.interactionVelocityLoad || 0) * 8;
  const recommenderDrift = Number(metrics.recommenderClickLoad || 0) * 12;
  const redirectTransitionDrift = Number(metrics.redirectTransitionLoad || 0) * 5;
  const agencyRecovery = Number(metrics.activeInputLoad || 0) * 4;
  const dwellRecovery = Number(metrics.constructiveDwell || 0) * 4;

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
      - lineageDrift
      - driftDescendantDrift
      - passiveTimeDrift
      - interactionVelocityDrift
      - recommenderDrift
      - redirectTransitionDrift
      + agencyRecovery
      + dwellRecovery,
    0,
    100
  ));
}