// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clampNumber, getHostnameFromUrl, normalizeString, normalizeTabId } from './utils.js';

const DEFAULT_MAX_GRAPH_NODES = 12;
const MIN_GRAPH_NODES = 3;
const MAX_GRAPH_NODES = 24;
const DEFAULT_MAX_DRIFT_DESCENDANT_HOSTS = 5;
const MIN_DRIFT_DESCENDANT_HOSTS = 1;
const MAX_DRIFT_DESCENDANT_HOSTS = 12;
const MAX_DRIFT_DESCENDANT_HOST_LENGTH = 80;
const COHERENCE_LABELS = {
  coherent: 'coherent',
  uncertain: 'uncertain',
  driftPoint: 'drift point',
  driftDescendant: 'drift descendant'
};

function normalizeVisitHostnameValue(value = '') {
  const rawValue = normalizeString(value);
  if (!rawValue) {
    return '';
  }

  const parsedHostname = getHostnameFromUrl(rawValue)
    || (/^[a-z][a-z\d+.-]*:/i.test(rawValue) ? '' : getHostnameFromUrl(`https://${rawValue}`));
  const fallbackHostname = rawValue
    .replace(/^[a-z][a-z\d+.-]*:\/\//i, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '');
  const hostname = (parsedHostname || fallbackHostname)
    .replace(/^www\./i, '')
    .toLowerCase()
    .trim();

  return hostname.slice(0, MAX_DRIFT_DESCENDANT_HOST_LENGTH);
}

function getVisitHostname(visit = {}) {
  return normalizeVisitHostnameValue(visit.hostname) || normalizeVisitHostnameValue(visit.url);
}

function getVisitLabel(visit = {}) {
  const hostname = normalizeString(visit.hostname).replace(/^www\./i, '');
  const title = normalizeString(visit.title);
  if (hostname && title) {
    return `${hostname} - ${title}`;
  }

  return title || hostname || 'unknown';
}

function getVisitNodeFlags(visit = {}, session = {}, index = 0, displayedVisits = []) {
  return {
    isOrigin: visit.id === session.originVisitId || (index === 0 && displayedVisits.length === session.visits?.length),
    isFirstDrift: visit.id === session.firstDriftVisitId,
    isCurrent: index === displayedVisits.length - 1,
    isDriftDescendant: visit.driftDescendant === true
  };
}

function getVisitIndex(session = {}, visit = {}) {
  const visits = Array.isArray(session.visits) ? session.visits : [];
  return visits.findIndex(candidate => candidate?.id && candidate.id === visit.id);
}

function getVisitCoherenceState(visit = {}, session = {}, flags = {}) {
  if (flags.isDriftDescendant) return 'driftDescendant';
  if (flags.isFirstDrift) return 'driftPoint';

  const visitIndex = getVisitIndex(session, visit);
  const driftIndex = Array.isArray(session.visits)
    ? session.visits.findIndex(candidate => candidate?.id === session.firstDriftVisitId)
    : -1;
  if (driftIndex >= 0 && visitIndex > driftIndex) {
    return 'uncertain';
  }

  const metrics = visit.metrics || {};
  const originSimilarity = Number(metrics.originSimilarity);
  const localSimilarity = Number(metrics.localSimilarity);
  if (
    (Number.isFinite(originSimilarity) && originSimilarity < 0.45)
    || (Number.isFinite(localSimilarity) && localSimilarity < 0.45)
  ) {
    return 'uncertain';
  }

  return 'coherent';
}

export function getIntentDriftDescendantHostSummary(session = {}, options = {}) {
  const visits = Array.isArray(session?.visits) ? session.visits : [];
  const maxHosts = clampNumber(
    options.maxHosts,
    DEFAULT_MAX_DRIFT_DESCENDANT_HOSTS,
    MIN_DRIFT_DESCENDANT_HOSTS,
    MAX_DRIFT_DESCENDANT_HOSTS
  );
  const hostCounts = new Map();

  visits.forEach(visit => {
    if (visit?.driftDescendant !== true) {
      return;
    }

    const hostname = getVisitHostname(visit);
    if (!hostname) {
      return;
    }

    hostCounts.set(hostname, (hostCounts.get(hostname) || 0) + 1);
  });

  return Array.from(hostCounts.entries())
    .map(([hostname, count]) => ({ hostname, count }))
    .sort((left, right) => right.count - left.count || left.hostname.localeCompare(right.hostname))
    .slice(0, maxHosts);
}

export function getIntentCoherentHostSummary(session = {}, options = {}) {
  const visits = Array.isArray(session?.visits) ? session.visits : [];
  const maxHosts = clampNumber(
    options.maxHosts,
    DEFAULT_MAX_DRIFT_DESCENDANT_HOSTS,
    MIN_DRIFT_DESCENDANT_HOSTS,
    MAX_DRIFT_DESCENDANT_HOSTS
  );
  const hostCounts = new Map();

  visits.forEach((visit, index) => {
    const flags = getVisitNodeFlags(visit, session, index, visits);
    if (getVisitCoherenceState(visit, session, flags) !== 'coherent') {
      return;
    }

    const hostname = getVisitHostname(visit);
    if (!hostname) {
      return;
    }

    hostCounts.set(hostname, (hostCounts.get(hostname) || 0) + 1);
  });

  return Array.from(hostCounts.entries())
    .map(([hostname, count]) => ({ hostname, count }))
    .sort((left, right) => right.count - left.count || left.hostname.localeCompare(right.hostname))
    .slice(0, maxHosts);
}

export function createIntentLineageGraph(session = {}, options = {}) {
  const allVisits = Array.isArray(session?.visits) ? session.visits : [];
  const maxNodes = clampNumber(options.maxNodes, DEFAULT_MAX_GRAPH_NODES, MIN_GRAPH_NODES, MAX_GRAPH_NODES);
  const hiddenVisitCount = Math.max(0, allVisits.length - maxNodes);
  const displayedVisits = allVisits.slice(-maxNodes);
  const displayedVisitIds = new Set(displayedVisits.map(visit => normalizeString(visit.id)).filter(Boolean));
  const offset = hiddenVisitCount;
  const nodes = displayedVisits.map((visit, index) => {
    const flags = getVisitNodeFlags(visit, session, index, displayedVisits);
    const coherenceState = getVisitCoherenceState(visit, session, flags);
    return {
      id: normalizeString(visit.id) || `intent-graph-node-${offset + index + 1}`,
      sequence: offset + index + 1,
      label: getVisitLabel(visit),
      coherenceState,
      coherenceLabel: COHERENCE_LABELS[coherenceState] || COHERENCE_LABELS.uncertain,
      hostname: normalizeString(visit.hostname).replace(/^www\./i, ''),
      title: normalizeString(visit.title),
      startedAt: normalizeString(visit.startedAt) || null,
      tabId: normalizeTabId(visit.tabId),
      openerTabId: normalizeTabId(visit.openerTabId),
      rootTabId: normalizeTabId(visit.rootTabId),
      parentVisitId: normalizeString(visit.parentVisitId) || null,
      transitionType: normalizeString(visit.transitionType) || null,
      transitionQualifiers: Array.isArray(visit.transitionQualifiers)
        ? visit.transitionQualifiers.map(normalizeString).filter(Boolean)
        : [],
      ...flags
    };
  });

  const edges = [];
  for (let index = 1; index < nodes.length; index += 1) {
    edges.push({
      from: nodes[index - 1].id,
      to: nodes[index].id,
      type: 'sequence'
    });
  }

  nodes.forEach(node => {
    if (node.parentVisitId && displayedVisitIds.has(node.parentVisitId)) {
      edges.push({
        from: node.parentVisitId,
        to: node.id,
        type: 'opener'
      });
    }
  });

  return {
    nodes,
    edges,
    summary: {
      totalVisitCount: allVisits.length,
      hiddenVisitCount,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      driftDescendantCount: nodes.filter(node => node.isDriftDescendant).length,
      driftPointCount: nodes.filter(node => node.coherenceState === 'driftPoint').length,
      uncertainCount: nodes.filter(node => node.coherenceState === 'uncertain').length,
      coherentCount: nodes.filter(node => node.coherenceState === 'coherent').length,
      tabCount: Number(session?.metrics?.tabCount || 0),
      branchCount: Number(session?.metrics?.branchCount || 0)
    }
  };
}
