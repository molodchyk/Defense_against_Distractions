// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONSTANTS_PATH = 'src/js/content/intent/constants.js';
const CONTINUE_MESSAGE_PATH = 'src/js/content/intent/continueMessage.js';

function loadContinueMessage() {
  const listeners = [];
  const window = {
    clearTimeout,
    Date,
    document: {
      getElementById() {
        return null;
      }
    },
    DAD: {
      ChromePlatform: {
        addRuntimeMessageListener(listener) {
          listeners.push(listener);
          return true;
        }
      },
      IntentIntervention: {
        effects: {},
        media: {}
      }
    },
    sessionStorage: {
      setItem() {}
    },
    setTimeout
  };
  window.window = window;

  vm.createContext(window);
  vm.runInContext(readFileSync(CONSTANTS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(CONTINUE_MESSAGE_PATH, 'utf8'), window);

  return {
    continueMessage: window.DAD.IntentIntervention.continueMessage,
    listeners
  };
}

describe('intent Continue content message', () => {
  it('allows prompt-style interventions and rejects hard chain quarantine', () => {
    const { continueMessage, listeners } = loadContinueMessage();

    assert.equal(listeners.length, 1);
    assert.equal(continueMessage.canContinueDecision({
      shouldIntervene: true,
      action: 'prompt'
    }), true);
    assert.equal(continueMessage.canContinueDecision({
      shouldIntervene: true,
      action: 'grayscale'
    }), true);
    assert.equal(continueMessage.canContinueDecision({
      shouldIntervene: true,
      action: 'reduceNoise'
    }), true);
    assert.equal(continueMessage.canContinueDecision({
      shouldIntervene: true,
      action: 'warn'
    }), false);
    assert.equal(continueMessage.canContinueDecision({
      shouldIntervene: true,
      action: 'block',
      chainBlock: { active: true }
    }), false);
  });

  it('normalizes Continue reasons before recording feedback', () => {
    const { continueMessage } = loadContinueMessage();
    const normalized = continueMessage.normalizeContinueReason(`  ${'task '.repeat(50)}  `);

    assert.equal(normalized.length, 160);
    assert.equal(/\s{2,}/.test(normalized), false);
    assert.equal(normalized.startsWith('task task'), true);
  });
});
