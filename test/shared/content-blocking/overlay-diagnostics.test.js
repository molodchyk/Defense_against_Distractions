// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const OVERLAY_DIAGNOSTICS_PATH = 'src/js/content/content-blocking/overlayDiagnostics.js';

function createWindow() {
  const messages = {
    blockedActionLabel: 'Action:',
    popupTriggeredActionOutcomeEntry: '$1: $2',
    popupTriggeredActionStepBlockPage: 'block page',
    popupTriggeredActionStepClickOnce: 'click once',
    popupTriggeredActionStepFallback: 'fallback',
    popupTriggeredActionStepHideImages: 'hide images',
    popupTriggeredActionResultBlocked: 'blocked',
    popupTriggeredActionResultFallbackBlocked: 'fallback blocked',
    popupTriggeredActionResultRan: 'ran',
    popupUnknownLabel: 'unknown'
  };
  const window = {
    DAD: {
      ContentBlocking: {
        constants: { BLOCK_SCORE_THRESHOLD: 1000 },
        overlayMessages: {
          getLocalizedMessage(key, fallback, substitutions) {
            const template = messages[key] || fallback;
            return String(template).replace(/\$(\d+)/g, (match, index) => (
              Array.isArray(substitutions) && substitutions[Number(index) - 1] !== undefined
                ? substitutions[Number(index) - 1]
                : match
            ));
          }
        }
      }
    },
    blockDiagnostics: null,
    pageScore: 0
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(OVERLAY_DIAGNOSTICS_PATH, 'utf8'), window);
  return window;
}

describe('blocked overlay diagnostics', () => {
  it('formats legacy block scores on the user-facing 100-point scale', () => {
    const window = createWindow();
    const diagnostics = window.DAD.ContentBlocking.overlayDiagnostics;

    assert.equal(diagnostics.formatBlockedScore({
      finalScore: 1005,
      operation: '+',
      value: 15
    }), '100/100 (+2/100)');

    assert.equal(diagnostics.formatBlockedScore({
      finalScore: 500,
      operation: '-',
      value: 250
    }), '50/100 (-25/100)');

    assert.equal(diagnostics.formatBlockedScore({
      finalScore: 1000,
      operation: '*',
      value: 2
    }), '100/100 (*2)');
  });

  it('formats triggered action outcomes without raw page details', () => {
    const window = createWindow();
    const diagnostics = window.DAD.ContentBlocking.overlayDiagnostics;

    const text = diagnostics.formatTriggeredActionOutcomeTrail([{
      chainId: 'chain_1',
      scenarioId: 'received',
      stepType: 'clickOnce',
      result: 'ran',
      host: 'mail.google.com',
      url: 'https://mail.google.com/mail/u/0/#inbox',
      pageText: 'not shown'
    }, {
      stepType: 'blockPage',
      result: 'blocked'
    }]);

    assert.equal(text, 'block page: blocked; click once: ran');
    assert.equal(text.includes('mail.google.com'), false);
    assert.equal(text.includes('not shown'), false);
  });

  it('keeps recent action outcomes with blocked-page diagnostics', () => {
    const window = createWindow();
    window.blockDiagnostics = {
      finalScore: 1000,
      triggers: [{
        keyword: 'has:video',
        operation: '+',
        value: 250,
        scoreAfter: 1000
      }],
      triggeredActionOutcomes: [
        { stepType: 'hideImages', result: 'ran' },
        { stepType: 'clickOnce', result: 'ran' },
        { stepType: 'blockPage', result: 'blocked' },
        { fallbackType: 'blockPage', result: 'fallbackBlocked' }
      ]
    };

    const diagnostics = window.DAD.ContentBlocking.overlayDiagnostics.getBlockedPageDiagnostics();

    assert.deepEqual(diagnostics.triggeredActionOutcomes, [
      { stepType: 'clickOnce', result: 'ran' },
      { stepType: 'blockPage', result: 'blocked' },
      { fallbackType: 'blockPage', result: 'fallbackBlocked' }
    ]);
  });
});
