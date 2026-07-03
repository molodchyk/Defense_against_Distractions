// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const PAGE_SIGNALS_PATH = 'src/js/content/pageSignals.js';

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('content page-signal snapshot messages', () => {
  it('includes the active selected-text candidate without storing it', () => {
    let runtimeMessageListener = null;
    const window = {
      DAD: {
        ChromePlatform: {
          addRuntimeMessageListener(listener) {
            runtimeMessageListener = listener;
          }
        },
        PageSignalsActivity: {
          installActivitySignalListeners() {},
          resetActivitySignals() {},
          updateActivePageTime() {}
        },
        PageSignalsReporter: {
          collectPageSignals: () => ({ url: 'https://example.com/page' }),
          installHistoryHooks() {},
          installMutationSignalObserver() {},
          scheduleIfUrlChanged() {},
          schedulePageSignalReport() {},
          sendPageSignals() {}
        },
        PageSignalSelectionCandidate: {
          getActiveSelectionCandidate: () => ({
            text: 'Selected target',
            normalizedText: 'selected target',
            tokens: ['selected', 'target'],
            source: 'userSelection'
          })
        }
      },
      document: {
        readyState: 'complete',
        addEventListener() {}
      },
      addEventListener() {}
    };
    window.window = window;
    vm.createContext(window);
    vm.runInContext(readFileSync(PAGE_SIGNALS_PATH, 'utf8'), window);

    let response = null;
    runtimeMessageListener({ action: 'getPageSignalSnapshot' }, {}, value => {
      response = value;
    });

    assert.deepEqual(toPlainObject(response), {
      status: 'ok',
      signals: {
        url: 'https://example.com/page'
      },
      selectionCandidate: {
        text: 'Selected target',
        normalizedText: 'selected target',
        tokens: ['selected', 'target'],
        source: 'userSelection'
      }
    });
  });
});
