// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp } from '../utils.js';

const RECENT_MEDIA_WINDOW = 6;

function isMediaVisit(visit = {}) {
  const media = visit.signals?.media || {};
  const activity = visit.signals?.activity || {};
  return Number(media.videoCount || 0) > 0
    || Number(media.audioCount || 0) > 0
    || Number(activity.mediaPlaybackMs || 0) > 0
    || Number(activity.mediaPlayEvents || 0) > 0
    || Number(activity.mediaEndEvents || 0) > 0
    || Number(activity.mediaSourceChangeEvents || 0) > 0;
}

function countConsecutiveMediaVisits(visits = []) {
  let count = 0;
  for (let index = visits.length - 1; index >= 0; index -= 1) {
    if (!isMediaVisit(visits[index])) {
      break;
    }
    count += 1;
  }
  return count;
}

function getMediaChainContextLoad(metrics = {}) {
  const lowAgencyLoad = Number(metrics.lowAgencyLoad || 0);
  return Math.max(
    Number(metrics.recommenderClickLoad || 0),
    Number(metrics.feedCommentInteractionLoad || 0),
    Number(metrics.originDecayLoad || 0),
    lowAgencyLoad >= 0.45 ? lowAgencyLoad : 0,
    Number(metrics.deliberateStalenessLoad || 0),
    Number(metrics.navigationLoopLoad || 0),
    Number(metrics.unanchoredSessionLoad || 0)
  );
}

export function calculateMediaChainSignals(visits = [], contextMetrics = {}) {
  const recentVisits = Array.isArray(visits) ? visits.slice(-RECENT_MEDIA_WINDOW) : [];
  if (recentVisits.length < 3) {
    return {
      recentMediaVisitCount: recentVisits.filter(isMediaVisit).length,
      consecutiveMediaVisitCount: countConsecutiveMediaVisits(recentVisits),
      mediaChainLoad: 0
    };
  }

  const recentMediaVisitCount = recentVisits.filter(isMediaVisit).length;
  const consecutiveMediaVisitCount = countConsecutiveMediaVisits(recentVisits);
  const recentMediaLoad = clamp((recentMediaVisitCount - 1) / 4, 0, 1);
  const consecutiveMediaLoad = clamp((consecutiveMediaVisitCount - 1) / 3, 0, 1);
  const chainPressure = clamp(consecutiveMediaLoad * 0.65 + recentMediaLoad * 0.35, 0, 1);
  const mediaChainLoad = chainPressure * getMediaChainContextLoad(contextMetrics);

  return {
    recentMediaVisitCount,
    consecutiveMediaVisitCount,
    mediaChainLoad: mediaChainLoad < 0.05 ? 0 : clamp(mediaChainLoad, 0, 1)
  };
}

export function formatMediaChainMetrics(signals = {}) {
  return {
    recentMediaVisitCount: signals.recentMediaVisitCount || 0,
    consecutiveMediaVisitCount: signals.consecutiveMediaVisitCount || 0,
    mediaChainLoad: Number(Number(signals.mediaChainLoad || 0).toFixed(3))
  };
}
