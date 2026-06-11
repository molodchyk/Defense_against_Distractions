// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasExistingConfiguration
} from '../../../src/js/shared/releaseBackupNotice.js';

describe('release backup notice helpers', () => {
  it('does not target fresh default configuration', () => {
    assert.equal(hasExistingConfiguration({}), false);
    assert.equal(hasExistingConfiguration({ whitelistedSites: ['example.com'] }), false);
  });

  it('targets existing user configuration', () => {
    assert.equal(hasExistingConfiguration({ group_1: { groupName: 'Focus' } }), true);
    assert.equal(hasExistingConfiguration({ plans: [{ name: 'Focus' }] }), true);
    assert.equal(hasExistingConfiguration({ schedules: [{ name: 'Work' }] }), true);
    assert.equal(hasExistingConfiguration({ whitelistedSites: ['example.com', 'school.edu'] }), true);
    assert.equal(hasExistingConfiguration({ 'elementBlockRule.abc': { name: 'button' } }), true);
    assert.equal(hasExistingConfiguration({ password: 'encrypted' }), true);
  });
});
