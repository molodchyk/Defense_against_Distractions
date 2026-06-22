// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('options usage stats blank state', () => {
  it('renders an explicit empty domain row instead of leaving the list blank', () => {
    const source = readFileSync('src/js/options/usageStats.js', 'utf8');
    const css = readFileSync('src/css/options/diagnostics.css', 'utf8');

    assert.match(source, /function createEmptyDomainItem/);
    assert.match(source, /usage-domain-empty/);
    assert.match(source, /popupNoLocalUsageStats/);
    assert.match(source, /replaceChildren\(\s*\.\.\.\(domainItems\.length > 0 \? domainItems : \[createEmptyDomainItem\(\)\]\)/);
    assert.match(css, /\.usage-domain-list \.usage-domain-empty/);
  });
});
