// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { addAlarmListener, clearAlarm, createAlarm } from '../../../src/platform/chrome/alarms.js';

describe('Chrome alarms platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('creates alarms with the requested schedule', () => {
    let requestedName = null;
    let requestedInfo = null;

    globalThis.chrome = {
      alarms: {
        create(name, alarmInfo) {
          requestedName = name;
          requestedInfo = alarmInfo;
        }
      }
    };

    createAlarm('pomodoroPhaseEnd', { when: 12345 });

    assert.equal(requestedName, 'pomodoroPhaseEnd');
    assert.deepEqual(requestedInfo, { when: 12345 });
  });

  it('resolves whether an alarm was cleared', async () => {
    globalThis.chrome = {
      runtime: { lastError: null },
      alarms: {
        clear(name, callback) {
          assert.equal(name, 'pomodoroPhaseEnd');
          callback(true);
        }
      }
    };

    assert.equal(await clearAlarm('pomodoroPhaseEnd'), true);
  });

  it('rejects clear failures from Chrome runtime errors', async () => {
    const alarmError = new Error('Alarm could not be cleared.');

    globalThis.chrome = {
      runtime: { lastError: alarmError },
      alarms: {
        clear(_name, callback) {
          callback(false);
        }
      }
    };

    await assert.rejects(() => clearAlarm('pomodoroPhaseEnd'), alarmError);
  });

  it('adds alarm listeners and returns an unsubscribe function', () => {
    let listener = null;
    let removedListener = null;

    globalThis.chrome = {
      alarms: {
        onAlarm: {
          addListener(callback) {
            listener = callback;
          },
          removeListener(callback) {
            removedListener = callback;
          }
        }
      }
    };

    const unsubscribe = addAlarmListener(() => {});
    unsubscribe();

    assert.equal(typeof listener, 'function');
    assert.equal(removedListener, listener);
  });
});
