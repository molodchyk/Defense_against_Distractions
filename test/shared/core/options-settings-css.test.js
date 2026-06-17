// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function getCssRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  return match?.[1] || '';
}

describe('options settings CSS', () => {
  it('keeps compact appearance controls inside the card for localized labels', () => {
    const css = readFileSync('src/css/options/settings.css', 'utf8');

    const gridRule = getCssRule(css, '.settings-grid');
    assert.match(gridRule, /minmax\(min\(100%,\s*340px\),\s*1fr\)/);

    const controlRule = getCssRule(css, '.theme-mode-control');
    assert.match(controlRule, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    assert.match(controlRule, /align-items:\s*start/);

    const selectRule = getCssRule(css, '.theme-mode-control select');
    assert.match(selectRule, /width:\s*100%/);
    assert.match(selectRule, /max-width:\s*100%/);
    assert.match(selectRule, /min-width:\s*0/);
  });

  it('exposes the reset extension data path as a separated destructive settings action', () => {
    const html = readFileSync('src/options.html', 'utf8');
    const css = readFileSync('src/css/options/settings.css', 'utf8');

    assert.match(html, /id="resetExtensionButton"[^>]*class="delete-button"/);
    assert.match(html, /id="resetExtensionHint"/);
    assert.match(html, /id="resetExtensionStatus"[^>]*aria-live="polite"/);

    const dangerZoneRule = getCssRule(css, '.settings-danger-zone');
    assert.match(dangerZoneRule, /border-top:\s*1px\s+solid\s+var\(--border\)/);

    const resetButtonRule = getCssRule(css, '.settings-danger-zone .delete-button');
    assert.match(resetButtonRule, /justify-self:\s*start/);
  });
});
