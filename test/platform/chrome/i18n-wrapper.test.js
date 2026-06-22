// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getMessage, getUILanguage } from '../../../src/platform/chrome/i18n.js';

describe('Chrome i18n platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('wraps UI language and localized message access', () => {
    const calls = [];

    globalThis.chrome = {
      i18n: {
        getUILanguage() {
          return 'fa';
        },
        getMessage(messageKey, substitutions) {
          calls.push([messageKey, substitutions]);
          return substitutions?.length ? `${messageKey}: ${substitutions.join(', ')}` : messageKey;
        }
      }
    };

    assert.equal(getUILanguage(), 'fa');
    assert.equal(getMessage('contentBlockedTitle'), 'contentBlockedTitle');
    assert.equal(getMessage('blockedPomodoroBreakMessage', ['Plan', 'break']), 'blockedPomodoroBreakMessage: Plan, break');
    assert.deepEqual(calls, [
      ['contentBlockedTitle', undefined],
      ['blockedPomodoroBreakMessage', ['Plan', 'break']]
    ]);
  });

  it('falls back to empty strings when i18n is unavailable', () => {
    globalThis.chrome = {};

    assert.equal(getUILanguage(), '');
    assert.equal(getMessage('contentBlockedTitle'), '');
  });
});
