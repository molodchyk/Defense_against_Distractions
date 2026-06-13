// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp } from '../utils.js';
import { getTransitionAnchorStrength } from '../transitions/navigationIntent.js';

const ANCHOR_THRESHOLD = 0.45;
const TOPIC_SOURCES = new Set(['search', 'title', 'heading', 'description', 'clickedLink', 'selectedText']);

function getWeightedEntries(originVisit = {}, fallbackVisit = {}) {
  return Array.isArray(originVisit.weightedMetadataTokens)
    ? originVisit.weightedMetadataTokens
    : (Array.isArray(fallbackVisit.weightedMetadataTokens) ? fallbackVisit.weightedMetadataTokens : []);
}

function countSourceTokens(entries = [], source) {
  return new Set(entries.filter(entry => entry?.source === source && entry.token).map(entry => entry.token)).size;
}

function countTopicTokens(entries = []) {
  return new Set(entries.filter(entry => TOPIC_SOURCES.has(entry?.source) && entry.token).map(entry => entry.token)).size;
}

function countTextTokens(originVisit = {}, fallbackVisit = {}) {
  const tokens = Array.isArray(originVisit.textTokens)
    ? originVisit.textTokens
    : (Array.isArray(fallbackVisit.textTokens) ? fallbackVisit.textTokens : []);
  return new Set(tokens.filter(Boolean)).size;
}

function getActivityAnchorStrength(visit = {}) {
  const activity = visit.signals?.activity || {};
  const eventStrength = clamp((Number(activity.inputEvents || 0) * 1.5 + Number(activity.keyEvents || 0)) / 12, 0, 1);
  const durationStrength = clamp(Number(activity.activeInputMs || 0) / (2 * 60 * 1000), 0, 1);
  return Math.max(eventStrength, durationStrength);
}

export function calculateOriginAnchorSignals(originVisit = {}, fallbackVisit = {}) {
  const entries = getWeightedEntries(originVisit, fallbackVisit);
  const searchTokenCount = countSourceTokens(entries, 'search');
  const topicTokenCount = countTopicTokens(entries);
  const textTokenCount = countTextTokens(originVisit, fallbackVisit);
  const searchStrength = clamp(searchTokenCount / 3, 0, 1) * 0.35;
  const topicStrength = clamp(topicTokenCount / 6, 0, 1) * 0.45;
  const textStrength = clamp(textTokenCount / 6, 0, 1) * 0.35;
  const activityStrength = getActivityAnchorStrength(fallbackVisit) * 0.35;
  const transitionStrength = getTransitionAnchorStrength(fallbackVisit) * 0.35;
  const originAnchorStrength = clamp(Math.max(searchStrength, activityStrength, transitionStrength) + topicStrength + textStrength, 0, 1);

  return {
    originAnchorStrength,
    missingOriginAnchorLoad: clamp((ANCHOR_THRESHOLD - originAnchorStrength) / ANCHOR_THRESHOLD, 0, 1),
    originAnchorTokenCount: topicTokenCount,
    originSearchTokenCount: searchTokenCount,
    originDirectNavigation: getTransitionAnchorStrength(fallbackVisit) > 0
  };
}

export function calculateUnanchoredSessionLoad(metrics = {}, anchorSignals = {}) {
  if (Number(metrics.visitCount || 0) < 3) {
    return 0;
  }

  const fragmentationLoad = Math.max(
    Number(metrics.domainEntropy || 0),
    clamp((Number(metrics.domainChanges || 0) - 1) / 3, 0, 1),
    clamp(Number(metrics.branchCount || 0) / 3, 0, 1),
    Number(metrics.tabSwitchLoad || 0),
    Number(metrics.tabPressureLoad || 0)
  );
  const passiveLoad = Math.max(
    Number(metrics.passiveMediaLoad || 0),
    Number(metrics.passiveInteractionLoad || 0),
    Number(metrics.passiveTimeLoad || 0),
    Number(metrics.recommenderClickLoad || 0),
    Number(metrics.lowAgencyLoad || 0),
    Number(metrics.deliberateStalenessLoad || 0),
    Number(metrics.navigationLoopLoad || 0),
    Number(metrics.searchRefinementLoad || 0)
  );

  return clamp(Number(anchorSignals.missingOriginAnchorLoad || 0) * Math.max(fragmentationLoad, passiveLoad), 0, 1);
}

export function calculateOriginAnchorSessionSignals({
  visits = [],
  originVisit = {},
  domainEntropy = 0,
  domainChanges = 0,
  branchCount = 0,
  tabPressureLoad = 0,
  tabSwitchLoad = 0,
  passiveMediaLoad = 0,
  passiveInteractionLoad = 0,
  passiveTimeLoad = 0,
  recommenderClickLoad = 0,
  agencySignals = {},
  timingSignals = {},
  navigationLoopSignals = {},
  searchRefinementSignals = {}
} = {}) {
  const anchorSignals = calculateOriginAnchorSignals(originVisit, visits[0]);
  return {
    ...anchorSignals,
    unanchoredSessionLoad: calculateUnanchoredSessionLoad({
      visitCount: visits.length,
      domainEntropy,
      domainChanges,
      branchCount,
      tabPressureLoad,
      tabSwitchLoad,
      passiveMediaLoad,
      passiveInteractionLoad,
      passiveTimeLoad,
      recommenderClickLoad,
      lowAgencyLoad: agencySignals.lowAgencyLoad,
      deliberateStalenessLoad: timingSignals.deliberateStalenessLoad,
      navigationLoopLoad: navigationLoopSignals.navigationLoopLoad,
      searchRefinementLoad: searchRefinementSignals.searchRefinementLoad
    }, anchorSignals)
  };
}

export function formatOriginAnchorMetrics(signals = {}) {
  return {
    originAnchorStrength: Number(Number(signals.originAnchorStrength || 0).toFixed(3)),
    missingOriginAnchorLoad: Number(Number(signals.missingOriginAnchorLoad || 0).toFixed(3)),
    originAnchorTokenCount: signals.originAnchorTokenCount || 0,
    originSearchTokenCount: signals.originSearchTokenCount || 0,
    originDirectNavigation: signals.originDirectNavigation === true,
    unanchoredSessionLoad: Number(Number(signals.unanchoredSessionLoad || 0).toFixed(3))
  };
}
