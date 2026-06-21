// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  notifyPomodoroRuntimeChanged,
  notifyPomodoroStrictBreakReset
} from '../../../src/js/background/pomodoro/notifications.js';

describe('background Pomodoro notifications', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('broadcasts runtime changes to each tab and top frame', async () => {
    const sentMessages = [];

    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {
        query(queryInfo, callback) {
          assert.deepEqual(queryInfo, {});
          callback([{ id: 4 }, {}, { id: 9 }]);
        },
        sendMessage(...args) {
          sentMessages.push(args.slice(0, -1));
          args.at(-1)({ status: 'ok' });
        }
      }
    };

    await notifyPomodoroRuntimeChanged('started');

    assert.deepEqual(sentMessages, [
      [4, { action: 'pomodoroRuntimeChanged', reason: 'started' }],
      [4, { action: 'pomodoroRuntimeChanged', reason: 'started' }, { frameId: 0 }],
      [9, { action: 'pomodoroRuntimeChanged', reason: 'started' }],
      [9, { action: 'pomodoroRuntimeChanged', reason: 'started' }, { frameId: 0 }]
    ]);
  });

  it('broadcasts strict-break reset messages best-effort', async () => {
    const sentMessages = [];

    globalThis.chrome = {
      runtime: { lastError: null },
      tabs: {
        query(_queryInfo, callback) {
          callback([{ id: 4 }]);
        },
        sendMessage(...args) {
          sentMessages.push(args.slice(0, -1));
          args.at(-1)(undefined);
        }
      }
    };

    await notifyPomodoroStrictBreakReset();

    assert.deepEqual(sentMessages, [
      [4, { action: 'clearPomodoroStrictBreakBlock' }],
      [4, { action: 'clearPomodoroStrictBreakBlock' }, { frameId: 0 }]
    ]);
  });

  it('ignores tab query errors because notifications are best-effort', async () => {
    globalThis.chrome = {
      runtime: { lastError: new Error('Tabs unavailable.') },
      tabs: {
        query(_queryInfo, callback) {
          callback(undefined);
        }
      }
    };

    await assert.doesNotReject(() => notifyPomodoroRuntimeChanged('started'));
  });
});
