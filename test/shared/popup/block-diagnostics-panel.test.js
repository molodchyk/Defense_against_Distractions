// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatBlockContributor,
  formatBlockContributorTrail,
  getRecentBlockTriggers
} from '../../../src/js/popup/blockDiagnosticsPanel.js';

describe('popup block diagnostics panel helpers', () => {
  const getMessage = (key, substitutions) => {
    const messages = {
      popupUnknownLabel: 'unknown',
      popupNoContributorRecorded: 'No contributors recorded',
      popupEarlierContributors: '+$1 earlier'
    };
    return String(messages[key] || key).replace(/\$(\d+)/g, (match, index) => (
      Array.isArray(substitutions) && substitutions[Number(index) - 1] !== undefined
        ? substitutions[Number(index) - 1]
        : match
    ));
  };

  it('formats a bounded score contributor without leaking context text', () => {
    assert.equal(
      formatBlockContributor({
        keyword: 'has:video',
        operation: '+',
        value: 250,
        scoreAfter: 750,
        source: 'structural',
        contextText: 'not shown'
      }, getMessage),
      'has:video · structural +25 -> 75/100'
    );
  });

  it('uses recent trigger history before falling back to the latest trigger', () => {
    const debugState = {
      blockDiagnostics: {
        latestTrigger: { keyword: 'latest', value: 100 },
        recentTriggers: [{ keyword: 'older', value: 100 }]
      }
    };

    assert.deepEqual(getRecentBlockTriggers(debugState), [{ keyword: 'older', value: 100 }]);
    assert.deepEqual(getRecentBlockTriggers({
      blockDiagnostics: {
        latestTrigger: { keyword: 'latest', value: 100 }
      }
    }), [{ keyword: 'latest', value: 100 }]);
  });

  it('formats the latest contributors first and summarizes earlier triggers', () => {
    const trail = formatBlockContributorTrail({
      blockDiagnostics: {
        triggerCount: 6,
        recentTriggers: [
          { keyword: 'first', operation: '+', value: 100, scoreAfter: 100, source: 'keyword' },
          { keyword: 'alpha', operation: '+', value: 100, scoreAfter: 500, source: 'keyword' },
          { keyword: 'beta', operation: '+', value: 200, scoreAfter: 750, source: 'keyword' },
          { keyword: 'has:video', operation: '+', value: 250, scoreAfter: 1000, source: 'structural' }
        ]
      }
    }, getMessage);

    assert.equal(
      trail,
      'has:video · structural +25 -> 100/100; beta · keyword +20 -> 75/100; alpha · keyword +10 -> 50/100; +3 earlier'
    );
  });

  it('uses an explicit empty state when no contributors exist', () => {
    assert.equal(formatBlockContributorTrail({}, getMessage), 'No contributors recorded');
  });
});
