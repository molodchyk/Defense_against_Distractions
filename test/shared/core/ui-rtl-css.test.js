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

describe('RTL UI CSS', () => {
  it('mirrors the options schedule board fixed inline edges', () => {
    const css = readFileSync('src/css/options/schedule.css', 'utf8');

    const cornerRule = getCssRule(css, '[dir="rtl"] .schedule-grid-corner');
    assert.match(cornerRule, /right:\s*0/);
    assert.match(cornerRule, /left:\s*auto/);
    assert.match(cornerRule, /border-left:\s*1px solid var\(--border\)/);

    const axisRule = getCssRule(css, '[dir="rtl"] .schedule-time-axis');
    assert.match(axisRule, /right:\s*0/);
    assert.match(axisRule, /left:\s*auto/);
    assert.match(axisRule, /border-left:\s*1px solid var\(--border\)/);

    const blockRule = getCssRule(css, '[dir="rtl"] .schedule-board-block');
    assert.match(blockRule, /text-align:\s*right/);
  });

  it('mirrors popup Pomodoro value alignment', () => {
    const css = readFileSync('src/css/popup/pomodoro.css', 'utf8');

    const timerRule = getCssRule(css, '[dir="rtl"] .pomodoro-timer-row span');
    assert.match(timerRule, /text-align:\s*left/);

    const timelineRule = getCssRule(css, '[dir="rtl"] .pomodoro-timeline-list dd');
    assert.match(timelineRule, /text-align:\s*left/);
  });

  it('mirrors the injected intent prompt for right-to-left languages', () => {
    const source = readFileSync('src/js/content/intent/style.js', 'utf8');

    const promptRule = getCssRule(source, '#${PROMPT_ID}[dir="rtl"]');
    assert.match(promptRule, /right:\s*auto/);
    assert.match(promptRule, /left:\s*18px/);
    assert.match(promptRule, /text-align:\s*right/);

    const bulletRule = getCssRule(source, '#${PROMPT_ID}[dir="rtl"] [data-dad-intent-reasons] li::before');
    assert.match(bulletRule, /margin-right:\s*0/);
    assert.match(bulletRule, /margin-left:\s*7px/);
  });
});
