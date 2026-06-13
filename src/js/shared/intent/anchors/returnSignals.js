// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { clamp } from '../utils.js';

function getVisitHostnames(visits = []) {
  return visits
    .map(visit => String(visit?.hostname || '').replace(/^www\./i, '').toLowerCase())
    .filter(Boolean);
}

export function calculateReturnSignals(visits = [], originVisit = {}, domainEntropy = 0, branchCount = 0) {
  const hostnames = getVisitHostnames(visits);
  const originHostname = String(originVisit?.hostname || hostnames[0] || '').replace(/^www\./i, '').toLowerCase();
  const seenHostnames = new Set();
  let originReturnCount = 0;
  let domainReturnCount = 0;
  let previousHostname = '';

  hostnames.forEach((hostname, index) => {
    if (index === 0) {
      seenHostnames.add(hostname);
      previousHostname = hostname;
      return;
    }

    if (hostname !== previousHostname && hostname === originHostname) {
      originReturnCount += 1;
    }

    if (hostname !== previousHostname && seenHostnames.has(hostname)) {
      domainReturnCount += 1;
    }

    seenHostnames.add(hostname);
    previousHostname = hostname;
  });

  const returnOpportunityCount = Math.max(0, hostnames.length - 1);
  const returnRate = returnOpportunityCount > 0 ? clamp(domainReturnCount / returnOpportunityCount, 0, 1) : 1;
  const originReturnRate = returnOpportunityCount > 0 ? clamp(originReturnCount / returnOpportunityCount, 0, 1) : 1;
  const fragmented = hostnames.length >= 4 && (domainEntropy >= 0.5 || branchCount >= 2);
  const lowReturnLoad = fragmented ? clamp(1 - Math.max(returnRate, originReturnRate), 0, 1) : 0;

  return {
    originReturnCount,
    domainReturnCount,
    returnOpportunityCount,
    returnRate,
    originReturnRate,
    lowReturnLoad
  };
}
