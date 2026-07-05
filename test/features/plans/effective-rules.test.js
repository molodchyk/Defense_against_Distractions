// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getEffectiveTriggeredActionChainsForUrl
} from '../../../src/features/plans/core/index.js';

describe('plan effective rule helpers', () => {
  it('exposes plan-owned triggered action chains only from active non-allowed plans', () => {
    const mondayMorning = new Date(2026, 4, 25, 10, 30);
    const items = {
      plans: [{
        id: 'plan_1',
        name: 'Focus',
        enabled: true,
        triggeredActionChains: [{
          id: 'chain_1',
          hostPattern: 'example.com',
          trigger: { type: 'keywordBlock' },
          scenarios: [{
            id: 'default',
            steps: [{ type: 'hideImages', targetRuleId: 'image_scope' }]
          }]
        }]
      }, {
        id: 'plan_2',
        name: 'Allowed',
        enabled: true,
        allowedSites: ['example.com'],
        triggeredActionChains: [{
          id: 'chain_2',
          scenarios: [{ id: 'default', steps: [{ type: 'blockPage' }] }]
        }]
      }, {
        id: 'plan_3',
        enabled: false,
        triggeredActionChains: [{
          id: 'chain_3',
          scenarios: [{ id: 'default', steps: [{ type: 'blockPage' }] }]
        }]
      }]
    };

    assert.deepEqual(
      getEffectiveTriggeredActionChainsForUrl(items, 'https://example.com/watch', mondayMorning).map(chain => ({
        id: chain.id,
        planId: chain.planId,
        planName: chain.planName
      })),
      [{ id: 'chain_1', planId: 'plan_1', planName: 'Focus' }]
    );
  });
});
