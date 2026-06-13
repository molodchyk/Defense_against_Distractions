// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createIntentLineageGraph,
  getIntentCoherentHostSummary,
  getIntentDriftDescendantHostSummary
} from '../../../src/js/shared/intentCoherence.js';

describe('intent coherence graph', () => {
  it('labels coherent opener chains and preserves sequence/opener edges', () => {
    const session = {
      originVisitId: 'visit-1',
      visits: [
        { id: 'visit-1', hostname: 'docs.example.com', title: 'PDE5 notes', tabId: 1 },
        {
          id: 'visit-2',
          hostname: 'docs.example.com',
          title: 'Mechanism reference',
          tabId: 2,
          openerTabId: 1,
          rootTabId: 1,
          parentVisitId: 'visit-1',
          metrics: { originSimilarity: 0.8, localSimilarity: 0.7 }
        }
      ],
      metrics: { tabCount: 2, branchCount: 1 }
    };

    const graph = createIntentLineageGraph(session);

    assert.deepEqual(graph.nodes.map(node => node.coherenceState), ['coherent', 'coherent']);
    assert.equal(graph.nodes[0].coherenceLabel, 'coherent');
    assert.equal(graph.nodes[0].isOrigin, true);
    assert.equal(graph.nodes[1].isCurrent, true);
    assert.equal(graph.edges.some(edge => edge.type === 'sequence'), true);
    assert.equal(graph.edges.some(edge => edge.type === 'opener' && edge.from === 'visit-1'), true);
  });

  it('labels drift points, later uncertain visits, and drift descendants', () => {
    const session = {
      originVisitId: 'visit-1',
      firstDriftVisitId: 'visit-2',
      visits: [
        { id: 'visit-1', hostname: 'docs.example.com', title: 'PDE5 notes', tabId: 1 },
        {
          id: 'visit-2',
          hostname: 'video.example.com',
          title: 'Reaction feed',
          tabId: 1,
          metrics: { originSimilarity: 0.1, localSimilarity: 0.1 }
        },
        {
          id: 'visit-3',
          hostname: 'video.example.com',
          title: 'Next clip',
          tabId: 1,
          metrics: { originSimilarity: 0.2, localSimilarity: 0.5 }
        },
        {
          id: 'visit-4',
          hostname: 'video.example.com',
          title: 'Child clip',
          tabId: 2,
          openerTabId: 1,
          rootTabId: 1,
          parentVisitId: 'visit-2',
          driftDescendant: true
        }
      ],
      metrics: { tabCount: 2, branchCount: 1 }
    };

    const graph = createIntentLineageGraph(session);

    assert.deepEqual(graph.nodes.map(node => node.coherenceState), [
      'coherent',
      'driftPoint',
      'uncertain',
      'driftDescendant'
    ]);
    assert.deepEqual(graph.nodes.map(node => node.coherenceLabel), [
      'coherent',
      'drift point',
      'uncertain',
      'drift descendant'
    ]);
    assert.equal(graph.summary.coherentCount, 1);
    assert.equal(graph.summary.driftPointCount, 1);
    assert.equal(graph.summary.uncertainCount, 1);
    assert.equal(graph.summary.driftDescendantCount, 1);
  });

  it('summarizes drift descendant hosts without exposing paths or queries', () => {
    const session = {
      visits: [
        { id: 'visit-1', hostname: 'docs.example.com', url: 'https://docs.example.com/research' },
        { id: 'visit-2', driftDescendant: true, url: 'https://www.video.example.com/watch?v=private' },
        { id: 'visit-3', driftDescendant: true, hostname: 'www.video.example.com/shorts/private?token=secret' },
        { id: 'visit-4', driftDescendant: true, hostname: 'www.social.example.com/thread/private' },
        { id: 'visit-5', driftDescendant: true, hostname: 'www.forum.example.com/topic/private' }
      ]
    };

    const summary = getIntentDriftDescendantHostSummary(session, { maxHosts: 2 });

    assert.deepEqual(summary, [
      { hostname: 'video.example.com', count: 2 },
      { hostname: 'forum.example.com', count: 1 }
    ]);
    assert.equal(summary.some(item => /[/?#]/.test(item.hostname)), false);
    assert.equal(summary.some(item => item.hostname.includes('private')), false);
  });

  it('summarizes coherent hosts without exposing paths or drift descendants', () => {
    const session = {
      originVisitId: 'visit-1',
      firstDriftVisitId: 'visit-4',
      visits: [
        { id: 'visit-1', url: 'https://www.docs.example.com/research/private', metrics: { originSimilarity: 1, localSimilarity: 1 } },
        { id: 'visit-2', hostname: 'docs.example.com/followup?token=secret', metrics: { originSimilarity: 0.8, localSimilarity: 0.7 } },
        { id: 'visit-3', hostname: 'www.reference.example.com/wiki/private', metrics: { originSimilarity: 0.7, localSimilarity: 0.8 } },
        { id: 'visit-4', hostname: 'www.video.example.com/watch/private', metrics: { originSimilarity: 0.1, localSimilarity: 0.2 } },
        { id: 'visit-5', hostname: 'docs.example.com/back-after-drift', metrics: { originSimilarity: 0.8, localSimilarity: 0.8 } },
        { id: 'visit-6', driftDescendant: true, hostname: 'www.video.example.com/shorts/private' }
      ]
    };

    const summary = getIntentCoherentHostSummary(session, { maxHosts: 2 });

    assert.deepEqual(summary, [
      { hostname: 'docs.example.com', count: 2 },
      { hostname: 'reference.example.com', count: 1 }
    ]);
    assert.equal(summary.some(item => /[/?#]/.test(item.hostname)), false);
    assert.equal(summary.some(item => item.hostname.includes('private')), false);
    assert.equal(summary.some(item => item.hostname.includes('video.example.com')), false);
  });
});
