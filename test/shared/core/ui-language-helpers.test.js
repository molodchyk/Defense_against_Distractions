// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatLocalizedMessage,
  normalizeUiLanguage
} from '../../../src/js/shared/uiLanguage.js';

describe('UI language helpers', () => {
  it('normalizes supported browser locale codes', () => {
    assert.equal(normalizeUiLanguage('system'), 'system');
    assert.equal(normalizeUiLanguage('de-DE'), 'de');
    assert.equal(normalizeUiLanguage('pt-BR'), 'pt_BR');
    assert.equal(normalizeUiLanguage('es-419'), 'es_419');
    assert.equal(normalizeUiLanguage('unknown-locale'), 'system');
  });

  it('formats Chrome-style named and positional placeholders', () => {
    assert.equal(formatLocalizedMessage({
      message: 'Selected $LANGUAGE$ for $1',
      placeholders: {
        language: { content: '$2' }
      }
    }, ['DaD', 'Deutsch']), 'Selected Deutsch for DaD');
  });
});
