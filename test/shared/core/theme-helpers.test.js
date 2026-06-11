// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeThemeMode,
  resolveThemeMode
} from '../../../src/js/shared/theme.js';

describe('theme helpers', () => {
  it('defaults unknown theme modes to system', () => {
    assert.equal(normalizeThemeMode('sepia'), 'system');
  });

  it('resolves system mode from the current color preference', () => {
    assert.equal(resolveThemeMode('system', true), 'dark');
    assert.equal(resolveThemeMode('system', false), 'light');
  });

  it('keeps explicit theme modes regardless of system preference', () => {
    assert.equal(resolveThemeMode('dark', false), 'dark');
    assert.equal(resolveThemeMode('light', true), 'light');
  });
});
