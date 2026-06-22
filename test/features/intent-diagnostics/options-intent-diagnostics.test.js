// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  getIntentDiagnosticsLocalizationFailures,
  intentDiagnosticsLocalizedMessageKeys
} from '../../../scripts/playbook/localization.mjs';

describe('options intent diagnostics localization', () => {
  it('routes JavaScript-rendered diagnostic labels through localized messages', () => {
    const source = [
      readFileSync('src/js/options/intentDiagnostics.js', 'utf8'),
      readFileSync('src/js/options/intent-diagnostics/messages.js', 'utf8')
    ].join('\n');
    const englishMessages = JSON.parse(readFileSync('_locales/en/messages.json', 'utf8'));

    assert.deepEqual(
      getIntentDiagnosticsLocalizationFailures({
        englishMessages,
        intentDiagnosticsModule: source
      }),
      []
    );

    for (const key of intentDiagnosticsLocalizedMessageKeys) {
      assert.match(source, new RegExp(key));
      assert.equal(typeof englishMessages[key]?.message, 'string');
    }
  });
});
