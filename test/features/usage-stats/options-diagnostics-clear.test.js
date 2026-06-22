// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('options local diagnostics clearing', () => {
  it('requires explicit localized confirmation before clearing local diagnostic stores', () => {
    const usageSource = readFileSync('src/js/options/usageStats.js', 'utf8');
    const intentSource = readFileSync('src/js/options/intentDiagnostics.js', 'utf8');
    const englishMessages = JSON.parse(readFileSync('_locales/en/messages.json', 'utf8'));

    assert.match(usageSource, /globalThis\.confirm\?\.\(getUiMessage\(\s*'clearUsageStatsConfirm'/);
    assert.match(intentSource, /globalThis\.confirm\?\.\(getMessage\(\s*'clearIntentDiagnosticsConfirm'/);
    assert.match(intentSource, /getIntentDiagnosticMessage as getMessage/);
    assert.match(usageSource, /clearUsageStatsFailed/);
    assert.match(intentSource, /clearIntentDiagnosticsFailed/);
    assert.match(intentSource, /clearDiagnosticsClearedStatus/);

    assert.match(englishMessages.clearUsageStatsConfirm.message, /Clear local usage stats\?/);
    assert.match(englishMessages.clearUsageStatsConfirm.message, /Export first/);
    assert.match(englishMessages.clearIntentDiagnosticsConfirm.message, /Clear local intent diagnostics\?/);
    assert.match(englishMessages.clearIntentDiagnosticsConfirm.message, /Export first/);
  });
});
