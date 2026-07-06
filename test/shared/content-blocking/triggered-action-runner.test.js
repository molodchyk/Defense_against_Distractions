// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONSTANTS_PATH = 'src/js/content/triggered-actions/constants.js';
const UTILS_PATH = 'src/js/content/triggered-actions/utils.js';
const MODEL_PATH = 'src/js/content/triggered-actions/model.js';
const RUNNER_PATH = 'src/js/content/triggered-actions/runner.js';
const PREVIEW_MESSAGE_PATH = 'src/js/content/triggered-actions/previewMessage.js';

function createWindow({
  host = 'mail.google.com',
  href = `https://${host}/mail/u/0/#inbox`,
  availableRuleIds = ['trash_rule'],
  applyResult = true
} = {}) {
  const appliedRules = [];
  const blockedCalls = [];
  const window = {
    URL,
    DAD: {
      ContentBlocking: {
        constants: { BLOCK_SCORE_THRESHOLD: 1000 },
        blocker: {
          blockPage: options => {
            window.pageBlocked = true;
            blockedCalls.push(options);
            if (options?.diagnostics) {
              window.blockDiagnostics = options.diagnostics;
            }
          }
        }
      },
      ElementBlocking: {
        actions: {
          applyElementRule: rule => {
            appliedRules.push(rule);
            return applyResult;
          },
          hasElementRuleTarget: rule => availableRuleIds.includes(rule?.id)
        },
        storage: {
          loadElementRules: callback => callback(availableRuleIds.map(id => ({
            id,
            enabled: true,
            urlPattern: host
          })))
        }
      }
    },
    document: {
      querySelector: () => null
    },
    location: {
      hostname: host,
      href
    },
    pageBlocked: false,
    blockDiagnostics: null,
    appliedRules,
    blockedCalls
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(CONSTANTS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(UTILS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(MODEL_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(RUNNER_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(PREVIEW_MESSAGE_PATH, 'utf8'), window);
  return window;
}

function createDiagnostics(overrides = {}) {
  return {
    finalScore: 1000,
    triggers: [{
      keyword: 'Rama Aurora',
      source: 'keyword',
      scoreAfter: 1000,
      triggerLocation: 'outsideEditable'
    }],
    ...overrides
  };
}

function createChain(overrides = {}) {
  return {
    id: 'delete_received',
    enabled: true,
    hostPattern: 'mail.google.com',
    trigger: {
      type: 'keywordBlock',
      keywordIds: ['Rama Aurora'],
      minimumScore: 80
    },
    scenarios: [{
      id: 'received',
      guards: [{ type: 'target', id: 'trash_rule' }],
      triggerLocation: 'outsideEditable',
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

describe('content triggered action runner', () => {
  it('previews a matching chain without mutating or blocking the page', () => {
    const window = createWindow();
    const diagnostics = createDiagnostics();
    const preview = window.DAD.TriggeredActions.runner.previewTriggeredActionChain({
      chain: createChain(),
      elementRules: [{ id: 'trash_rule', enabled: true, urlPattern: 'mail.google.com' }],
      diagnostics
    });

    assert.equal(preview.status, 'matched');
    assert.equal(preview.triggerEligible, true);
    assert.equal(preview.wouldRun, true);
    assert.equal(preview.wouldMutate, true);
    assert.equal(preview.wouldBlock, true);
    assert.deepEqual(Array.from(preview.targetAvailability, target => ({
      targetRuleId: target.targetRuleId,
      available: target.available
    })), [{
      targetRuleId: 'trash_rule',
      available: true
    }]);
    assert.deepEqual(Array.from(preview.steps, step => [step.type, step.targetRuleId, step.targetAvailable]), [
      ['clickOnce', 'trash_rule', true],
      ['blockPage', '', null]
    ]);
    assert.equal(window.pageBlocked, false);
    assert.deepEqual(window.appliedRules, []);
    assert.equal(diagnostics.triggeredActionOutcomes, undefined);
  });

  it('previews ambiguous chains without applying fallback effects', () => {
    const window = createWindow();
    const diagnostics = createDiagnostics();
    const ambiguousChain = createChain({
      scenarios: [{
        id: 'first',
        guards: [{ type: 'target', id: 'trash_rule' }],
        steps: [{ type: 'clickOnce', targetRuleId: 'trash_rule' }],
        fallback: { type: 'blockPage' }
      }, {
        id: 'second',
        guards: [{ type: 'target', id: 'trash_rule' }],
        steps: [{ type: 'clickOnce', targetRuleId: 'trash_rule' }],
        fallback: { type: 'blockPage' }
      }]
    });

    const preview = window.DAD.TriggeredActions.runner.previewTriggeredActionChain({
      chain: ambiguousChain,
      elementRules: [{ id: 'trash_rule', enabled: true, urlPattern: 'mail.google.com' }],
      diagnostics
    });

    assert.equal(preview.status, 'ambiguous');
    assert.deepEqual(Array.from(preview.matchingScenarioIds), ['first', 'second']);
    assert.equal(preview.wouldRun, false);
    assert.equal(preview.wouldMutate, false);
    assert.equal(preview.wouldBlock, true);
    assert.deepEqual(Array.from(preview.steps), []);
    assert.equal(window.pageBlocked, false);
    assert.deepEqual(window.appliedRules, []);
  });

  it('can preview scenario target state even when trigger diagnostics are not available', () => {
    const window = createWindow();
    const preview = window.DAD.TriggeredActions.runner.previewTriggeredActionChain({
      chain: createChain(),
      elementRules: [{ id: 'trash_rule', enabled: true, urlPattern: 'mail.google.com' }],
      diagnostics: null
    });

    assert.equal(preview.status, 'matched');
    assert.equal(preview.triggerEligible, null);
    assert.equal(preview.triggerDiagnosticsAvailable, false);
    assert.equal(preview.targetAvailability[0].available, true);
  });

  it('handles preview runtime messages with stored element rules without mutating', () => {
    const window = createWindow();
    window.blockDiagnostics = createDiagnostics();
    let response = null;

    const handled = window.DAD.TriggeredActions.previewMessage.handlePreviewMessage({
      action: 'previewTriggeredActionChain',
      chain: createChain()
    }, payload => {
      response = payload;
    });

    assert.equal(handled, true);
    assert.equal(response.status, 'matched');
    assert.equal(response.triggerEligible, true);
    assert.equal(response.targetAvailability[0].available, true);
    assert.equal(window.pageBlocked, false);
    assert.deepEqual(window.appliedRules, []);
  });

  it('runs a matched target action before a configured block step', () => {
    const window = createWindow();
    const diagnostics = createDiagnostics();
    const handled = window.DAD.TriggeredActions.runner.runTriggeredActionChainsForBlock({
      chains: [createChain()],
      elementRules: [{ id: 'trash_rule', enabled: true, urlPattern: 'mail.google.com' }],
      diagnostics
    });

    assert.equal(handled, true);
    assert.equal(window.pageBlocked, true);
    assert.deepEqual(Array.from(window.appliedRules, rule => [rule.id, rule.action]), [['trash_rule', 'click']]);
    assert.deepEqual(Array.from(diagnostics.triggeredActionOutcomes, event => event.result), ['ran', 'blocked']);
    assert.equal('url' in diagnostics.triggeredActionOutcomes[0], false);
    assert.equal('pageText' in diagnostics.triggeredActionOutcomes[0], false);
  });

  it('does not mutate the page when matching scenarios are ambiguous and uses fallback block', () => {
    const window = createWindow();
    const diagnostics = createDiagnostics();
    const ambiguousChain = createChain({
      scenarios: [{
        id: 'first',
        guards: [{ type: 'target', id: 'trash_rule' }],
        steps: [{ type: 'clickOnce', targetRuleId: 'trash_rule' }],
        fallback: { type: 'blockPage' }
      }, {
        id: 'second',
        guards: [{ type: 'target', id: 'trash_rule' }],
        steps: [{ type: 'clickOnce', targetRuleId: 'trash_rule' }],
        fallback: { type: 'blockPage' }
      }]
    });

    const handled = window.DAD.TriggeredActions.runner.runTriggeredActionChainsForBlock({
      chains: [ambiguousChain],
      elementRules: [{ id: 'trash_rule', enabled: true, urlPattern: 'mail.google.com' }],
      diagnostics
    });

    assert.equal(handled, true);
    assert.equal(window.pageBlocked, true);
    assert.deepEqual(Array.from(window.appliedRules), []);
    assert.deepEqual(Array.from(diagnostics.triggeredActionOutcomes, event => event.result), ['fallbackBlocked']);
  });

  it('falls back to normal blocking when a selected step cannot run safely', () => {
    const window = createWindow({ applyResult: false });
    const diagnostics = createDiagnostics();
    const handled = window.DAD.TriggeredActions.runner.runTriggeredActionChainsForBlock({
      chains: [createChain()],
      elementRules: [{ id: 'trash_rule', enabled: true, urlPattern: 'mail.google.com' }],
      diagnostics
    });

    assert.equal(handled, true);
    assert.equal(window.pageBlocked, true);
    assert.deepEqual(Array.from(window.appliedRules, rule => [rule.id, rule.action]), [['trash_rule', 'click']]);
    assert.deepEqual(Array.from(diagnostics.triggeredActionOutcomes, event => event.result), ['failed', 'fallbackBlocked']);
  });

  it('can handle a trigger with a bounded cleanup step without blocking when no block step is configured', () => {
    const window = createWindow();
    const diagnostics = createDiagnostics();
    const handled = window.DAD.TriggeredActions.runner.runTriggeredActionChainsForBlock({
      chains: [createChain({
        scenarios: [{
          id: 'quiet_page',
          guards: [{ type: 'target', id: 'trash_rule' }],
          steps: [{ type: 'hideImages', targetRuleId: 'trash_rule' }],
          fallback: { type: 'blockPage' }
        }]
      })],
      elementRules: [{ id: 'trash_rule', enabled: true, urlPattern: 'mail.google.com' }],
      diagnostics
    });

    assert.equal(handled, true);
    assert.equal(window.pageBlocked, false);
    assert.deepEqual(Array.from(window.appliedRules, rule => [rule.id, rule.action]), [['trash_rule', 'hideImages']]);
    assert.deepEqual(Array.from(diagnostics.triggeredActionOutcomes, event => event.result), ['ran']);
  });
});
