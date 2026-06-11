// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEntitlementCheckUrl,
  getEntitlementLabel,
  hasBillingIdentity,
  isBillingEnabled,
  isEntitlementActive,
  normalizeBillingConfig,
  normalizeBillingEntitlement,
  normalizeBillingIdentity
} from '../../../src/js/shared/billing.js';

describe('billing entitlement helpers', () => {
  it('keeps billing disabled by default', () => {
    assert.equal(isBillingEnabled(undefined), false);
    assert.deepEqual(normalizeBillingConfig({ provider: ' stripe ', enabled: true }), {
      enabled: true,
      provider: 'stripe',
      checkoutUrls: {
        supporterMonthly: '',
        lifetime: ''
      },
      portalUrl: '',
      entitlementApiBaseUrl: '',
      supportEmail: ''
    });
  });

  it('normalizes unsupported entitlement values to free inactive', () => {
    assert.deepEqual(normalizeBillingEntitlement({
      plan: 'enterprise',
      status: 'trialing',
      source: 'unknown',
      expiresAt: 'not a date',
      checkedAt: null
    }), {
      plan: 'free',
      status: 'inactive',
      source: 'local',
      expiresAt: null,
      checkedAt: null
    });
  });

  it('normalizes optional billing identity without requiring one', () => {
    assert.equal(hasBillingIdentity({}), false);
    assert.deepEqual(normalizeBillingIdentity({
      token: ' browser-token ',
      email: ' USER@Example.COM ',
      licenseKey: ' key ',
      createdAt: '2026-06-05T12:00:00.000Z'
    }), {
      token: 'browser-token',
      email: 'user@example.com',
      licenseKey: 'key',
      createdAt: '2026-06-05T12:00:00.000Z'
    });
    assert.equal(hasBillingIdentity({ licenseKey: 'key' }), true);
  });

  it('detects active paid entitlements and expired entitlements', () => {
    const now = new Date('2026-06-05T12:00:00.000Z');

    assert.equal(isEntitlementActive({
      plan: 'supporter_monthly',
      status: 'active',
      expiresAt: '2026-07-05T12:00:00.000Z'
    }, now), true);

    assert.equal(isEntitlementActive({
      plan: 'supporter_monthly',
      status: 'active',
      expiresAt: '2026-06-01T12:00:00.000Z'
    }, now), false);
  });

  it('labels entitlement states for dormant UI display', () => {
    assert.equal(getEntitlementLabel({ plan: 'lifetime', status: 'active' }), 'Lifetime supporter');
    assert.equal(getEntitlementLabel({ plan: 'supporter_monthly', status: 'past_due' }), 'Payment past due');
    assert.equal(getEntitlementLabel({ plan: 'free', status: 'inactive' }), 'Free');
  });

  it('builds backend entitlement check URLs without hard-coding a provider', () => {
    assert.equal(buildEntitlementCheckUrl({
      entitlementApiBaseUrl: 'https://billing.example.com/api/'
    }, 'browser-token'), 'https://billing.example.com/api/entitlement?token=browser-token');
  });
});
