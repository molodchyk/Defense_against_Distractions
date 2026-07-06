// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPlanViewFromOptionsHash } from '../../../src/js/options/plans/controller.js';

describe('plan controller deep links', () => {
  it('parses plan Actions deep links from the options hash', () => {
    assert.deepEqual(
      getPlanViewFromOptionsHash('#plansPanel?planId=default%20plan&view=actions'),
      {
        planId: 'default plan',
        view: 'actions'
      }
    );
  });

  it('ignores unrelated or unsupported options hashes', () => {
    assert.equal(getPlanViewFromOptionsHash('#settingsPanel'), null);
    assert.equal(getPlanViewFromOptionsHash('#plansPanel?view=actions'), null);
    assert.equal(getPlanViewFromOptionsHash('#plansPanel?planId=default&view=unknown'), null);
  });
});
