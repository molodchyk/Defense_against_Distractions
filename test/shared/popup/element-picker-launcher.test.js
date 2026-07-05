// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createElementPickerLauncher } from '../../../src/js/popup/elementPickerLauncher.js';

describe('popup element picker launcher', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });

  function installPickerDom() {
    const values = new Map([
      ['matchStrategySelect', 'same-position'],
      ['minimumScoreInput', '18'],
      ['ancestorDepthInput', '3'],
      ['labelMatchSelect', 'prefer-label']
    ]);

    globalThis.document = {
      getElementById(id) {
        return { value: values.get(id) };
      }
    };
  }

  it('asks the user to open a page before picking when there is no active tab', async () => {
    installPickerDom();

    const statuses = [];
    const launcher = createElementPickerLauncher({
      getActiveTab: async () => null,
      getMessage: key => key,
      setStatus: status => statuses.push(status)
    });

    await launcher();

    assert.deepEqual(statuses, ['popupOpenPageBeforePicking']);
  });

  it('reports a reload-needed state when the tab receiver is unavailable', async () => {
    installPickerDom();

    const statuses = [];
    const launcher = createElementPickerLauncher({
      getActiveTab: async () => ({ id: 7 }),
      getMessage: key => key,
      sendMessageToTab: async () => null,
      setStatus: status => statuses.push(status)
    });

    await launcher();

    assert.deepEqual(statuses, ['popupReloadBeforePicking']);
  });

  it('starts the picker with the selected settings and closes the popup', async () => {
    installPickerDom();

    let closeCount = 0;
    let sentMessage = null;
    const statuses = [];
    globalThis.window = {
      close() {
        closeCount += 1;
      }
    };

    const launcher = createElementPickerLauncher({
      getActiveTab: async () => ({ id: 7 }),
      getMessage: key => key,
      sendMessageToTab: async (_tabId, message) => {
        sentMessage = message;
        return { status: 'picker-started' };
      },
      setStatus: status => statuses.push(status)
    });

    await launcher();

    assert.deepEqual(sentMessage, {
      action: 'startElementPicker',
      strategy: 'same-position',
      minScore: 18,
      ancestorDepth: 3,
      labelMatch: 'prefer-label'
    });
    assert.deepEqual(statuses, ['picker-started']);
    assert.equal(closeCount, 1);
  });

  it('passes requested quick-add action and plan assignment to the picker', async () => {
    installPickerDom();

    let sentMessage = null;
    globalThis.window = { close() {} };
    const launcher = createElementPickerLauncher({
      getActiveTab: async () => ({ id: 7 }),
      getMessage: key => key,
      sendMessageToTab: async (_tabId, message) => {
        sentMessage = message;
        return { status: 'picker-started' };
      },
      setStatus: () => {}
    });

    await launcher({
      initialAction: 'hideImages',
      assignRuleToPlanId: 'default'
    });

    assert.deepEqual(sentMessage, {
      action: 'startElementPicker',
      strategy: 'same-position',
      minScore: 18,
      ancestorDepth: 3,
      labelMatch: 'prefer-label',
      initialAction: 'hideImages',
      assignRuleToPlanId: 'default'
    });
  });
});
