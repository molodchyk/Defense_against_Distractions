// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectActiveTriggeredActionChains,
  formatTriggeredActionPreview,
  formatTriggeredActionPreviewTitle,
  getCompactTriggeredActionPreviewItem
} from '../../../src/js/popup/triggered-actions/previewPanel.js';

const messages = {
  planActionStepLabel: 'Action',
  planActionTargetLabel: 'Target UI rule',
  popupBlockedState: 'blocked',
  popupClearState: 'clear',
  popupPageLabel: 'Page',
  popupTriggerLabel: 'Trigger',
  popupTriggeredActionResultMatched: 'matched',
  popupTriggeredActionResultNotMatched: 'not matched',
  popupTriggeredActionStepBlockPage: 'block page',
  popupTriggeredActionStepClickOnce: 'click once',
  popupUnavailableLabel: 'Unavailable',
  popupUnknownLabel: 'unknown'
};

function getMessage(key) {
  return messages[key] || key;
}

function createChain(overrides = {}) {
  return {
    id: 'chain_1',
    name: 'Clean inbox',
    enabled: true,
    hostPattern: 'mail.example.com',
    trigger: { type: 'blockScore', minimumScore: 80 },
    scenarios: [{
      id: 'default',
      guards: [{ type: 'target', id: 'trash_rule' }],
      steps: [
        { type: 'clickOnce', targetRuleId: 'trash_rule' },
        { type: 'blockPage' }
      ],
      fallback: { type: 'blockPage' }
    }],
    fallback: { type: 'blockPage' },
    ...overrides
  };
}

describe('popup triggered action preview panel helpers', () => {
  it('collects enabled chains from active plans only', () => {
    const chains = collectActiveTriggeredActionChains([{
      id: 'active_plan',
      name: 'Active plan',
      enabled: true,
      triggeredActionChains: [
        createChain(),
        createChain({ id: 'disabled_chain', enabled: false })
      ]
    }, {
      id: 'disabled_plan',
      name: 'Disabled plan',
      enabled: false,
      triggeredActionChains: [createChain({ id: 'ignored' })]
    }]);

    assert.equal(chains.length, 1);
    assert.equal(chains[0].planName, 'Active plan');
    assert.equal(chains[0].chain.id, 'chain_1');
  });

  it('formats a bounded current-tab preview without raw page data', () => {
    const item = {
      planName: 'Work',
      chain: createChain(),
      preview: {
        status: 'matched',
        triggerEligible: true,
        triggerDiagnosticsAvailable: true,
        targetAvailability: [{ targetRuleId: 'trash_rule', available: true }],
        steps: [
          { type: 'clickOnce', targetRuleId: 'trash_rule', targetAvailable: true },
          { type: 'blockPage', targetRuleId: '', targetAvailable: null }
        ],
        wouldRun: true,
        wouldBlock: true,
        url: 'https://mail.example.com/private',
        pageText: 'not shown'
      }
    };

    assert.equal(formatTriggeredActionPreviewTitle(item), 'Clean inbox · Work');
    assert.equal(
      formatTriggeredActionPreview(item, getMessage),
      'matched · Trigger: matched · Target UI rule: 1/1 · Action: click once, block page · Page: blocked'
    );
    assert.equal(formatTriggeredActionPreview(item, getMessage).includes('private'), false);
    assert.equal(formatTriggeredActionPreview(item, getMessage).includes('not shown'), false);
  });

  it('creates compact diagnostics without names, page text, or URLs', () => {
    const compact = getCompactTriggeredActionPreviewItem({
      planId: 'plan_1',
      chain: createChain(),
      preview: {
        status: 'matched',
        triggerEligible: false,
        triggerDiagnosticsAvailable: true,
        targetAvailability: [{ targetRuleId: 'trash_rule', available: false }],
        steps: [{ type: 'clickOnce', targetRuleId: 'trash_rule', targetAvailable: false }],
        wouldRun: true,
        wouldBlock: false,
        url: 'https://mail.example.com/private',
        pageText: 'not shown'
      }
    });

    assert.deepEqual(compact, {
      planId: 'plan_1',
      chainId: 'chain_1',
      status: 'matched',
      triggerEligible: false,
      triggerDiagnosticsAvailable: true,
      targetAvailableCount: 0,
      targetCount: 1,
      stepTypes: ['clickOnce'],
      wouldRun: true,
      wouldBlock: false
    });
  });
});
