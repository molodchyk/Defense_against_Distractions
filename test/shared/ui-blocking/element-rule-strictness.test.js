// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isElementRulePatchAllowedDuringProtectedSchedule,
  isElementRuleRemovalAllowedDuringProtectedSchedule
} from '../../../src/js/options/element-rules/storage.js';

describe('UI element rule protected-schedule strictness', () => {
  it('rejects disabling or deleting an active UI element rule during a protected schedule', () => {
    const rule = {
      id: 'hide_feed',
      enabled: true
    };

    assert.equal(isElementRulePatchAllowedDuringProtectedSchedule(rule, { enabled: false }), false);
    assert.equal(isElementRuleRemovalAllowedDuringProtectedSchedule(rule), false);
  });

  it('allows enabling or removing already inactive UI element rules during a protected schedule', () => {
    const disabledRule = {
      id: 'hide_feed',
      enabled: false
    };

    assert.equal(isElementRulePatchAllowedDuringProtectedSchedule(disabledRule, { enabled: true }), true);
    assert.equal(isElementRuleRemovalAllowedDuringProtectedSchedule(disabledRule), true);
  });

  it('allows metadata edits that do not disable an active UI element rule', () => {
    const rule = {
      id: 'hide_feed',
      enabled: true
    };

    assert.equal(isElementRulePatchAllowedDuringProtectedSchedule(rule, { name: 'Hide feed controls' }), true);
  });
});
